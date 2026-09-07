"""Liveness audit: check whether candidate websites are still live."""

from __future__ import annotations

import asyncio
import csv
import logging
import ssl
import time
from dataclasses import dataclass
from pathlib import Path

import httpx

from .campaignlab import USER_AGENT

logger = logging.getLogger(__name__)

CLASSES = [
    "live",
    "http_error",
    "dns_error",
    "timeout",
    "ssl_error",
    "connection_error",
    "other_error",
]


@dataclass
class AuditResult:
    url: str
    status_class: str
    status_code: int | None = None
    final_url: str | None = None
    redirected: bool = False
    name_found: bool | None = None  # candidate name seen in body? (content-check only)
    error: str = ""
    elapsed_ms: int = 0


def classify_error(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        return "http_error"
    if isinstance(exc, httpx.ConnectError):
        msg = str(exc).lower()
        if (
            "name or service not known" in msg
            or "nodename nor servname" in msg
            or "getaddrinfo" in msg
        ):
            return "dns_error"
        return "connection_error"
    if isinstance(exc, (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.PoolTimeout)):
        return "timeout"
    if isinstance(exc, (ssl.SSLError, httpx.ConnectError)):
        return "ssl_error"
    if isinstance(exc, asyncio.TimeoutError):
        return "timeout"
    return "other_error"


async def check_url(
    client: httpx.AsyncClient,
    url: str,
    name_hint: str | None = None,
    sem: asyncio.Semaphore | None = None,
) -> AuditResult:
    """Check a single URL. Tries HEAD first, falls back to GET for 4xx/5xx.

    If name_hint (candidate surname) is given, fetches the body and checks
    whether the name appears — a weak 'still about them' signal.
    """
    sem = sem or asyncio.Semaphore(1)
    start = time.monotonic()
    async with sem:
        method = "HEAD"
        try:
            resp = await client.request("HEAD", url)
            if resp.status_code in (403, 404, 405, 501) or name_hint:
                method = "GET"  # many sites reject HEAD; content-check needs GET
                resp = await client.request("GET", url)
            resp.raise_for_status()
            body = resp.text if (name_hint and method == "GET") else ""
            return AuditResult(
                url=url,
                status_class="live",
                status_code=resp.status_code,
                final_url=str(resp.url),
                redirected=str(resp.url) != url,
                name_found=(name_hint.lower() in body.lower()) if (name_hint and body) else None,
                elapsed_ms=int((time.monotonic() - start) * 1000),
            )
        except httpx.HTTPStatusError as exc:
            return AuditResult(
                url=url,
                status_class="http_error",
                status_code=exc.response.status_code,
                final_url=str(exc.response.url),
                redirected=str(exc.response.url) != url,
                error=f"HTTP {exc.response.status_code}",
                elapsed_ms=int((time.monotonic() - start) * 1000),
            )
        except Exception as exc:  # noqa: BLE001 — classify anything the client raises
            return AuditResult(
                url=url,
                status_class=classify_error(exc),
                error=f"{type(exc).__name__}: {exc}"[:200],
                elapsed_ms=int((time.monotonic() - start) * 1000),
            )


async def run_audit(
    targets: list[tuple[str, str | None]],
    concurrency: int = 8,
    timeout: float = 15.0,
) -> list[AuditResult]:
    """Audit (url, name_hint) pairs concurrently, preserving input order."""
    sem = asyncio.Semaphore(concurrency)
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"}
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout, headers=headers) as client:
        tasks = [check_url(client, url, name_hint=name_hint, sem=sem) for url, name_hint in targets]
        return await asyncio.gather(*tasks)


def write_audit_csv(results: list[AuditResult], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "url",
                "status_class",
                "status_code",
                "final_url",
                "redirected",
                "name_found",
                "error",
                "elapsed_ms",
            ]
        )
        for r in results:
            writer.writerow(
                [
                    r.url,
                    r.status_class,
                    r.status_code,
                    r.final_url,
                    r.redirected,
                    r.name_found,
                    r.error,
                    r.elapsed_ms,
                ]
            )


def summarize(results: list[AuditResult]) -> dict[str, int]:
    counts = {c: 0 for c in CLASSES}
    for r in results:
        counts[r.status_class] = counts.get(r.status_class, 0) + 1
    return counts
