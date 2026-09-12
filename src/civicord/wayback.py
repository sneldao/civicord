"""Wayback Machine CDX + id_ fetch (Phase 1 spike).

Queries the CDX API for snapshots around the April 2025 scrape (and optionally
the July 2024 GE), fetches toolbar-stripped bodies via the `id_` URL form,
hashes them, and extracts rough plaintext for diffing against Campaign Lab
April page text.

See docs/wayback-spike.md and docs/change-feed.md.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import quote

import httpx

from .campaignlab import USER_AGENT, wayback_cdx_url

logger = logging.getLogger(__name__)

CDX_BASE = "https://web.archive.org/cdx/search/cdx"
# Prefer snapshots near the Campaign Lab scrape window.
DEFAULT_FROM = "20250301"
DEFAULT_TO = "20250531"


@dataclass
class CdxHit:
    timestamp: str
    original: str
    statuscode: str
    digest: str


@dataclass
class SpikeResult:
    person_id: str
    person_name: str
    url: str
    change_signal: str
    cdx_hits: int
    snapshot_ts: str | None
    wayback_url: str | None
    http_status: int | None
    sha256: str | None
    char_count: int
    apr2025_chars: int
    similarity: float | None  # SequenceMatcher ratio vs April scrape text
    note: str


def html_to_text(html: str) -> str:
    """Backward-compatible wrapper — prefer extract.extract_main_text for new code."""
    from .extract import extract_main_text

    return extract_main_text(html)


def id_url(timestamp: str, original: str) -> str:
    """Toolbar-stripped Wayback replay URL."""
    return f"https://web.archive.org/web/{timestamp}id_/{original}"


def query_cdx(
    client: httpx.Client,
    url: str,
    *,
    from_ts: str = DEFAULT_FROM,
    to_ts: str = DEFAULT_TO,
) -> list[CdxHit]:
    """Return CDX hits (status 200 preferred via query filter)."""
    q = wayback_cdx_url(url, from_ts=from_ts, to_ts=to_ts)
    # Expand filter: also try without status filter if empty — handled by caller.
    resp = client.get(q, timeout=45.0)
    resp.raise_for_status()
    data = resp.json()
    if not data or len(data) < 2:
        return []
    # First row is header.
    hits: list[CdxHit] = []
    for row in data[1:]:
        if len(row) < 4:
            continue
        hits.append(
            CdxHit(timestamp=row[0], original=row[1], statuscode=str(row[2]), digest=row[3])
        )
    return hits


def query_cdx_fallback(client: httpx.Client, url: str) -> list[CdxHit]:
    """CDX: Apr scrape window first, then 2024–2025 (pick_snapshot prefers Apr), then any."""
    hits = query_cdx(client, url, from_ts=DEFAULT_FROM, to_ts=DEFAULT_TO)
    if hits:
        return hits
    time.sleep(0.4)
    hits = query_cdx(client, url, from_ts="20240101", to_ts="20251231")
    if hits:
        return hits
    time.sleep(0.4)
    # Last resort: unfiltered CDX (may include non-200).
    q = (
        f"{CDX_BASE}?url={quote(url, safe='')}&output=json"
        f"&fl=timestamp,original,statuscode,digest&collapse=timestamp:8&limit=20"
    )
    resp = client.get(q, timeout=45.0)
    if resp.status_code != 200:
        return []
    data = resp.json()
    if not data or len(data) < 2:
        return []
    hits = []
    for row in data[1:]:
        if len(row) < 4:
            continue
        if str(row[2]) not in ("200", "301", "302"):
            continue
        hits.append(
            CdxHit(timestamp=row[0], original=row[1], statuscode=str(row[2]), digest=row[3])
        )
    return hits


def pick_snapshot(
    hits: list[CdxHit],
    prefer_ts: str = "20250415",
    *,
    window_from: str = DEFAULT_FROM,
    window_to: str = DEFAULT_TO,
) -> CdxHit | None:
    """Prefer HTTP 200 snapshots inside the scrape window, else closest overall."""
    if not hits:
        return None
    good = [h for h in hits if h.statuscode == "200"] or hits

    def in_window(h: CdxHit) -> bool:
        try:
            day = h.timestamp[:8]
            return window_from[:8] <= day <= window_to[:8]
        except Exception:  # noqa: BLE001
            return False

    def dist(h: CdxHit) -> int:
        try:
            return abs(int(h.timestamp[:8]) - int(prefer_ts))
        except ValueError:
            return 10**9

    in_win = [h for h in good if in_window(h)]
    pool = in_win or good
    return min(pool, key=dist)


def fetch_id_body(client: httpx.Client, hit: CdxHit) -> tuple[int, bytes]:
    url = id_url(hit.timestamp, hit.original)
    resp = client.get(url, timeout=60.0, follow_redirects=True)
    return resp.status_code, resp.content


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_april_text(pages_csv: Path, person_id: str, max_chars: int = 200_000) -> str:
    """Concatenate April 2025 page texts for a person (longest pages first)."""
    if not pages_csv.exists():
        return ""
    import csv
    import sys

    csv.field_size_limit(min(sys.maxsize, 32 * 1024 * 1024))

    rows = []
    with open(pages_csv, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            if r.get("person_id") == person_id:
                rows.append(r)
    rows.sort(key=lambda r: int(r.get("char_count") or 0), reverse=True)
    parts: list[str] = []
    total = 0
    for r in rows[:12]:
        t = (r.get("text") or "").strip()
        if not t:
            continue
        parts.append(t)
        total += len(t)
        if total >= max_chars:
            break
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def similarity(a: str, b: str) -> float | None:
    if not a or not b:
        return None
    from difflib import SequenceMatcher

    # Cap for speed on long pages.
    aa, bb = a[:80_000], b[:80_000]
    return SequenceMatcher(None, aa, bb).ratio()


def select_spike_targets(
    changes_csv: Path,
    *,
    pages_csv: Path | None = None,
    limit: int = 15,
    signals: tuple[str, ...] = ("gone", "repurposed_suspect"),
) -> list[dict[str, str]]:
    import csv

    with_pages: set[str] = set()
    if pages_csv and pages_csv.exists():
        import sys

        csv.field_size_limit(min(sys.maxsize, 32 * 1024 * 1024))
        with open(pages_csv, encoding="utf-8", newline="") as f:
            for r in csv.DictReader(f):
                with_pages.add(r["person_id"])

    wanted: dict[str, list[dict[str, str]]] = {s: [] for s in signals}
    with open(changes_csv, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            sig = r.get("change_signal", "")
            if sig not in wanted:
                continue
            # Prefer persons with April scrape text.
            if with_pages and r.get("person_id") not in with_pages:
                continue
            wanted[sig].append(r)
    # If preference emptied a bucket, fall back without pages filter.
    if with_pages and any(not wanted[s] for s in signals):
        with open(changes_csv, encoding="utf-8", newline="") as f:
            for r in csv.DictReader(f):
                sig = r.get("change_signal", "")
                if sig in wanted and not any(x["url"] == r["url"] for x in wanted[sig]):
                    wanted[sig].append(r)

    half = max(1, limit // 2)
    out: list[dict[str, str]] = []
    seen: set[str] = set()

    def take(sig: str, n: int) -> None:
        added = 0
        for r in wanted[sig]:
            if added >= n:
                return
            pid = r.get("person_id", "")
            if not pid or pid in seen:
                continue
            seen.add(pid)
            out.append(r)
            added += 1

    for sig in signals:
        take(sig, half)
    # Top up to limit from either bucket if a signal ran short.
    if len(out) < limit:
        for sig in signals:
            for r in wanted[sig]:
                pid = r.get("person_id", "")
                if not pid or pid in seen:
                    continue
                seen.add(pid)
                out.append(r)
                if len(out) >= limit:
                    break
            if len(out) >= limit:
                break
    return out[:limit]


def run_spike(
    *,
    data_dir: Path,
    limit: int = 15,
    sleep_s: float = 0.8,
    resume: bool = True,
) -> list[SpikeResult]:
    out_dir = data_dir / "out" / "wayback_spike"
    out_dir.mkdir(parents=True, exist_ok=True)
    changes = data_dir / "out" / "changes_v0.csv"
    pages = data_dir / "out" / "pages.csv"
    if not changes.exists():
        raise FileNotFoundError(f"Missing {changes} — run `civicord changes` first")

    targets = select_spike_targets(changes, pages_csv=pages, limit=limit)
    results: list[SpikeResult] = []

    headers = {"User-Agent": USER_AGENT, "Accept": "application/json,text/html,*/*"}
    with httpx.Client(headers=headers, follow_redirects=True) as client:
        for i, t in enumerate(targets, 1):
            pid = t["person_id"]
            url = t["url"]
            name = t.get("person_name", "")
            sig = t.get("change_signal", "")
            person_dir = out_dir / pid
            person_dir.mkdir(parents=True, exist_ok=True)
            apr = load_april_text(pages, pid)

            existing = sorted(person_dir.glob("*.bin"))
            if resume and existing:
                ts = existing[-1].stem
                body = existing[-1].read_bytes()
                digest = sha256_bytes(body)
                text = html_to_text(body.decode("utf-8", "replace"))
                meta_path = person_dir / "cdx.json"
                cdx_hits = 0
                if meta_path.exists():
                    try:
                        cdx_hits = int(json.loads(meta_path.read_text()).get("cdx_hits") or 0)
                    except Exception:  # noqa: BLE001
                        cdx_hits = 0
                logger.info("[%d/%d] %s resume %s", i, len(targets), pid, ts)
                results.append(
                    SpikeResult(
                        person_id=pid,
                        person_name=name,
                        url=url,
                        change_signal=sig,
                        cdx_hits=cdx_hits,
                        snapshot_ts=ts,
                        wayback_url=id_url(ts, url),
                        http_status=200,
                        sha256=digest,
                        char_count=len(text),
                        apr2025_chars=len(apr),
                        similarity=(round(similarity(text, apr), 4) if apr and text else None),
                        note="resumed",
                    )
                )
                continue

            logger.info("[%d/%d] %s %s (%s)", i, len(targets), pid, url, sig)
            note = ""
            try:
                hits = query_cdx_fallback(client, url)
            except Exception as e:  # noqa: BLE001
                note = f"cdx_error:{e!s}"[:180]
                hits = []
            hit = pick_snapshot(hits)
            meta = {
                "person_id": pid,
                "url": url,
                "change_signal": sig,
                "cdx_hits": len(hits),
                "picked": asdict(hit) if hit else None,
            }
            (person_dir / "cdx.json").write_text(json.dumps(meta, indent=2) + "\n")

            if not hit:
                results.append(
                    SpikeResult(
                        person_id=pid,
                        person_name=name,
                        url=url,
                        change_signal=sig,
                        cdx_hits=len(hits),
                        snapshot_ts=None,
                        wayback_url=None,
                        http_status=None,
                        sha256=None,
                        char_count=0,
                        apr2025_chars=len(apr),
                        similarity=None,
                        note=note or "no_cdx_hit",
                    )
                )
                time.sleep(sleep_s)
                continue

            wb = id_url(hit.timestamp, hit.original)
            try:
                status, body = fetch_id_body(client, hit)
            except Exception as e:  # noqa: BLE001
                results.append(
                    SpikeResult(
                        person_id=pid,
                        person_name=name,
                        url=url,
                        change_signal=sig,
                        cdx_hits=len(hits),
                        snapshot_ts=hit.timestamp,
                        wayback_url=wb,
                        http_status=None,
                        sha256=None,
                        char_count=0,
                        apr2025_chars=len(apr),
                        similarity=None,
                        note=f"fetch_error:{e!s}"[:180],
                    )
                )
                time.sleep(sleep_s)
                continue

            digest = sha256_bytes(body)
            (person_dir / f"{hit.timestamp}.bin").write_bytes(body)
            text = html_to_text(body.decode("utf-8", "replace"))
            (person_dir / f"{hit.timestamp}.txt").write_text(text + "\n", encoding="utf-8")
            (person_dir / "sha256.txt").write_text(f"{digest}  {hit.timestamp}\n")
            sim = similarity(text, apr)
            results.append(
                SpikeResult(
                    person_id=pid,
                    person_name=name,
                    url=url,
                    change_signal=sig,
                    cdx_hits=len(hits),
                    snapshot_ts=hit.timestamp,
                    wayback_url=wb,
                    http_status=status,
                    sha256=digest,
                    char_count=len(text),
                    apr2025_chars=len(apr),
                    similarity=round(sim, 4) if sim is not None else None,
                    note="ok" if status == 200 else f"http_{status}",
                )
            )
            time.sleep(sleep_s)

    # Write summary CSV + JSON
    import csv

    summary_csv = out_dir / "spike_summary.csv"
    fields = list(SpikeResult.__dataclass_fields__.keys())
    with open(summary_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in results:
            w.writerow(asdict(r))
    (out_dir / "spike_summary.json").write_text(
        json.dumps([asdict(r) for r in results], indent=2) + "\n"
    )
    return results


def render_findings(results: list[SpikeResult]) -> str:
    n = len(results)
    with_hit = sum(1 for r in results if r.snapshot_ts)
    with_body = sum(1 for r in results if r.sha256 and r.http_status == 200)
    with_sim = [r for r in results if r.similarity is not None]
    lines = [
        "# Wayback spike findings",
        "",
        f"**Sample:** {n} URLs (gone + repurposed_suspect, with April text preferred).",
        f"**CDX hit:** {with_hit}/{n} · **Fetched 200 body:** {with_body}/{n}",
        "",
    ]
    if with_sim:
        sims = [r.similarity for r in with_sim if r.similarity is not None]
        lines += [
            f"**Similarity vs April scrape** (SequenceMatcher, n={len(sims)}):",
            f"- min {min(sims):.2f} · median {sorted(sims)[len(sims) // 2]:.2f} · max {max(sims):.2f}",
            "",
            "| person_id | signal | snapshot | similarity | note |",
            "| --- | --- | --- | --- | --- |",
        ]
        for r in sorted(with_sim, key=lambda x: x.similarity or 0):
            lines.append(
                f"| {r.person_id} | {r.change_signal} | `{r.snapshot_ts}` | "
                f"{r.similarity:.2f} | {r.note} |"
            )
    no_hit = [r for r in results if not r.snapshot_ts]
    if no_hit:
        lines += ["", "## No CDX coverage", ""]
        for r in no_hit:
            lines.append(f"- `{r.person_id}` {r.url} ({r.note})")
    lines += [
        "",
        "## Read",
        "",
        "- High similarity ≈ Wayback body close to Campaign Lab April text (good join).",
        "- Low similarity with a 200 body ≈ content moved before/after scrape, or extract noise.",
        "- No CDX hit ≈ Wayback never captured the URL — live re-crawl or give up for that site.",
        "",
        "Raw artifacts: `data/out/wayback_spike/` (gitignored under `data/`).",
        "",
    ]
    return "\n".join(lines) + "\n"
