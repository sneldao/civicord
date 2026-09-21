"""Body-storing re-crawl: the second corpus.

The Sep 2026 audit kept HTTP observations only — no page bodies — so nothing
semantic (deleted claims, message shifts, new priorities) is computable from
it. This module re-fetches every roster URL and stores *normalized text* per
(url, checked_at), producing the comparable second snapshot the brief needs.

Comparability protocol (ours to define — Campaign Lab will not re-scrape):
normalization is pinned to `extract.extract_main_text`, the same function the
Wayback diff path uses, and every manifest row records PROTOCOL_VERSION. If
extraction ever changes, old and new rows are still joinable by version.

Storage (gitignored under data/):
    data/out/recrawl_<YYYYMMDD>/recrawl.csv      manifest, one row per URL
    data/out/recrawl_<YYYYMMDD>/pages/<pid>__<n>.txt   normalized text bodies

Only normalized text is stored — never raw HTML (size + GDPR: derived
text/diffs only). Robots.txt is respected per host (cached in memory).
"""

from __future__ import annotations

import asyncio
import csv
import hashlib
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from urllib import robotparser
from urllib.parse import urlsplit

import httpx

from . import extract
from .audit import classify_error
from .campaignlab import USER_AGENT

logger = logging.getLogger(__name__)

# Bump when the fetch/normalize pipeline changes in a way that breaks
# comparability with earlier recrawls. Recorded on every manifest row.
PROTOCOL_VERSION = "recrawl-v1"


@dataclass
class RecrawlResult:
    url: str
    person_id: str
    person_name: str
    checked_at: str  # YYYY-MM-DD
    protocol: str
    status_class: str = ""  # audit classes + "robot_denied"
    status_code: int | None = None
    final_url: str | None = None
    redirected: bool = False
    name_found: bool | None = None
    sha256: str | None = None  # of the normalized text
    char_count: int = 0
    file: str = ""  # relative path under the recrawl dir, "" when no body
    error: str = ""
    elapsed_ms: int = 0


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class RobotsCache:
    """Per-host robots.txt gate, fetched once and held in memory."""

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client
        self._parsers: dict[str, robotparser.RobotFileParser | None] = {}

    async def allowed(self, url: str) -> bool:
        try:
            host = urlsplit(url).netloc.lower()
        except ValueError:
            return False
        if host not in self._parsers:
            self._parsers[host] = await self._fetch(host)
        parser = self._parsers[host]
        if parser is None:  # robots.txt unreachable — fail open, audit still classifies
            return True
        return parser.can_fetch(USER_AGENT, url)

    async def _fetch(self, host: str) -> robotparser.RobotFileParser | None:
        for scheme in ("https", "http"):
            try:
                resp = await self._client.get(f"{scheme}://{host}/robots.txt", timeout=10)
                if resp.status_code == 200:
                    parser = robotparser.RobotFileParser()
                    parser.parse(resp.text.splitlines())
                    return parser
                if resp.status_code in (401, 403):
                    return None  # fail open; the page fetch will classify itself
            except Exception as exc:  # noqa: BLE001 — fall through to next scheme / fail open
                logger.debug("robots.txt fetch failed for %s: %s", host, exc)
                continue
        return None


def _safe_stem(person_id: str, index: int) -> str:
    safe = "".join(c if c.isalnum() else "_" for c in person_id)[:40] or "unknown"
    return f"{safe}__{index}.txt"


async def recrawl_url(
    client: httpx.AsyncClient,
    robots: RobotsCache,
    url: str,
    person_id: str,
    person_name: str,
    name_hint: str | None,
    checked_at: str,
    pages_dir: Path,
    index: int,
    sem: asyncio.Semaphore | None = None,
    timeout: float = 20.0,
) -> RecrawlResult:
    """Fetch one URL, normalize the body, and persist the text file."""
    sem = sem or asyncio.Semaphore(1)
    start = time.monotonic()
    base = RecrawlResult(
        url=url,
        person_id=person_id,
        person_name=person_name,
        checked_at=checked_at,
        protocol=PROTOCOL_VERSION,
    )
    async with sem:
        if not await robots.allowed(url):
            base.status_class = "robot_denied"
            base.error = "Disallowed by robots.txt"
            base.elapsed_ms = int((time.monotonic() - start) * 1000)
            return base
        try:
            resp = await client.get(url, timeout=timeout)
            final_url = str(resp.url)
            redirected = final_url != url
            if resp.status_code >= 400:
                base.status_class = "http_error"
                base.status_code = resp.status_code
                base.final_url = final_url
                base.redirected = redirected
                base.error = f"HTTP {resp.status_code}"
                base.elapsed_ms = int((time.monotonic() - start) * 1000)
                return base
            text = extract.extract_main_text(resp.text)
            digest = sha256_text(text)
            filename = _safe_stem(person_id, index)
            (pages_dir / filename).write_text(text, encoding="utf-8")
            surname = (name_hint or "").strip().lower()
            base.status_class = "live"
            base.status_code = resp.status_code
            base.final_url = final_url
            base.redirected = redirected
            base.name_found = (surname in text.lower()) if surname and text else None
            base.sha256 = digest
            base.char_count = len(text)
            base.file = f"pages/{filename}"
            base.elapsed_ms = int((time.monotonic() - start) * 1000)
            return base
        except Exception as exc:  # noqa: BLE001 — classify anything the client raises
            base.status_class = classify_error(exc)
            base.error = f"{type(exc).__name__}: {exc}"[:200]
            base.elapsed_ms = int((time.monotonic() - start) * 1000)
            return base


MANIFEST_COLUMNS = [
    "person_id",
    "person_name",
    "url",
    "checked_at",
    "protocol",
    "status_class",
    "status_code",
    "final_url",
    "redirected",
    "name_found",
    "sha256",
    "char_count",
    "file",
    "error",
    "elapsed_ms",
]


def result_to_row(r: RecrawlResult) -> dict[str, str | int]:
    return {
        "person_id": r.person_id,
        "person_name": r.person_name,
        "url": r.url,
        "checked_at": r.checked_at,
        "protocol": r.protocol,
        "status_class": r.status_class,
        "status_code": r.status_code or "",
        "final_url": r.final_url or "",
        "redirected": "True" if r.redirected else "False",
        "name_found": "" if r.name_found is None else str(r.name_found),
        "sha256": r.sha256 or "",
        "char_count": r.char_count,
        "file": r.file,
        "error": r.error,
        "elapsed_ms": r.elapsed_ms,
    }


def write_manifest(results: list[RecrawlResult], path: Path) -> None:
    write_manifest_rows([result_to_row(r) for r in results], path)


def write_manifest_rows(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=MANIFEST_COLUMNS)
        w.writeheader()
        w.writerows(rows)


def read_manifest_rows(path: Path) -> list[dict[str, str]]:
    """Existing manifest rows as plain dicts (resume support)."""
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def read_manifest_urls(path: Path) -> set[str]:
    """URLs already captured in an existing manifest (resume support)."""
    return {r["url"] for r in read_manifest_rows(path) if r.get("url")}


async def run_recrawl(
    targets: list[tuple[str, str, str]],
    checked_at: str,
    pages_dir: Path,
    concurrency: int = 8,
    timeout: float = 20.0,
    transport: httpx.BaseTransport | None = None,
) -> list[RecrawlResult]:
    """Recrawl (url, person_id, person_name) triples, preserving input order."""
    pages_dir.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(concurrency)
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"}
    async with httpx.AsyncClient(
        follow_redirects=True, timeout=timeout, headers=headers, transport=transport
    ) as client:
        robots = RobotsCache(client)
        tasks = [
            recrawl_url(
                client,
                robots,
                url,
                person_id,
                person_name,
                person_name.split()[-1],
                checked_at,
                pages_dir,
                index,
                sem=sem,
                timeout=timeout,
            )
            for index, (url, person_id, person_name) in enumerate(targets)
        ]
        return list(await asyncio.gather(*tasks))
