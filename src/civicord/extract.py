"""Normalize HTML / scrape text for comparable diffs.

Wayback bodies are full HTML; Campaign Lab pages are already extracted
fragments. Both sides go through the same whitespace/token normalization so
SequenceMatcher and coverage metrics are meaningful.
"""

from __future__ import annotations

import re
from html.parser import HTMLParser

_WS = re.compile(r"\s+")
_TOKEN = re.compile(r"[a-z0-9']{3,}")


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._chunks: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in ("script", "style", "noscript"):
            self._skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "noscript") and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        t = data.strip()
        if t:
            self._chunks.append(t)

    def text(self) -> str:
        return _WS.sub(" ", " ".join(self._chunks)).strip()


def html_to_text_fallback(html: str) -> str:
    p = _TextExtractor()
    try:
        p.feed(html)
        p.close()
    except Exception:  # noqa: BLE001
        return _WS.sub(" ", re.sub(r"<[^>]+>", " ", html)).strip()
    return p.text()


def extract_main_text(html: str) -> str:
    """Extract main document text from HTML (trafilatura if available)."""
    if not html or not html.strip():
        return ""
    try:
        import trafilatura

        out = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=True,
            favor_recall=True,
            output_format="txt",
        )
        if out and out.strip():
            return normalize_plaintext(out)
    except Exception:  # noqa: BLE001, S110 — optional dep / parse failures
        pass
    return normalize_plaintext(html_to_text_fallback(html))


def normalize_plaintext(text: str) -> str:
    """Normalize already-extracted text (Campaign Lab side or trafilatura)."""
    if not text:
        return ""
    t = text.replace("\u00a0", " ")
    t = _WS.sub(" ", t).strip()
    return t


def tokens(text: str) -> list[str]:
    return _TOKEN.findall(text.lower())


def token_set(text: str) -> set[str]:
    return set(tokens(text))
