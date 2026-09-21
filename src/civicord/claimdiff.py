"""Claim-level diffing: April baseline sentences vs recrawl bodies.

For each person with both an April baseline (Campaign Lab JSONs) and a
recrawl body, split both sides into sentences, normalize, and align by exact
normalized match:

- kept: present in both (still saying it)
- deleted: April-only (stopped saying it — a *candidate* deleted claim)
- added: recrawl-only (new since the scrape)

Scope caveat (recorded on every row): the re-crawl fetches homepages while
the April baseline spans whole sites, so "deleted" means "in April's
site-wide text but not in the current homepage fetch" — evidence for review,
not proof of removal. Edited-but-similar sentences surface as one deleted +
one added pair; v1 does not pair them.

Noise control: sentences under MIN_WORDS are dropped (nav chrome, headings),
matching is set-based (repetition doesn't inflate counts), and stored claims
are capped per person for the frontend snapshot.
"""

from __future__ import annotations

import csv
import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

from . import extract, taxonomy

logger = logging.getLogger(__name__)

PROTOCOL_VERSION = "claimdiff-v1"
MIN_WORDS = 6
MAX_CLAIM_CHARS = 300
MAX_CLAIMS_PER_PERSON = 5
SCOPE_NOTE = "april site-wide vs recrawl homepage"


_SENT_SPLIT = re.compile(r"(?<=[.!?…])\s+(?=[A-Z0-9\"'“(\[])|\n+")


def split_sentences(text: str) -> list[str]:
    """Split plaintext into candidate claim sentences."""
    parts = [p.strip() for p in _SENT_SPLIT.split(text) if p and p.strip()]
    return parts


def normalize_sentence(sentence: str) -> str:
    """Canonical form for matching: lowercase, collapsed whitespace, no edge quotes."""
    t = extract.normalize_plaintext(sentence).lower().strip("\"'“”‘’")
    return t


@dataclass
class ClaimDiff:
    person_id: str
    person_name: str
    url: str
    checked_at: str
    protocol: str = PROTOCOL_VERSION
    scope_note: str = SCOPE_NOTE
    april_sentences: int = 0
    new_sentences: int = 0
    kept: int = 0
    deleted: list[dict] = field(default_factory=list)
    added: list[dict] = field(default_factory=list)

    @property
    def deleted_count(self) -> int:
        return len(self.deleted)

    @property
    def added_count(self) -> int:
        return len(self.added)


def _tag(text: str) -> list[str]:
    return taxonomy.tag_claim(text)


def _cap(claims: list[dict]) -> list[dict]:
    """Keep the longest claims (most substantive), capped per person."""
    claims = sorted(claims, key=lambda c: -len(c["text"]))
    return claims[:MAX_CLAIMS_PER_PERSON]


def diff_person(
    person_id: str,
    person_name: str,
    url: str,
    april_texts: list[str],
    new_text: str,
    checked_at: str,
) -> ClaimDiff:
    """Align one person's April baseline against their recrawl body."""
    april_norm: dict[str, str] = {}
    for text in april_texts:
        for s in split_sentences(extract.normalize_plaintext(text)):
            if len(s.split()) < MIN_WORDS:
                continue
            key = normalize_sentence(s)
            if key and key not in april_norm:
                april_norm[key] = s[:MAX_CLAIM_CHARS]

    new_norm: dict[str, str] = {}
    for s in split_sentences(extract.normalize_plaintext(new_text)):
        if len(s.split()) < MIN_WORDS:
            continue
        key = normalize_sentence(s)
        if key and key not in new_norm:
            new_norm[key] = s[:MAX_CLAIM_CHARS]

    kept = sum(1 for k in april_norm if k in new_norm)
    deleted = [
        {"text": april_norm[k], "topics": _tag(april_norm[k])}
        for k in april_norm
        if k not in new_norm
    ]
    added = [
        {"text": new_norm[k], "topics": _tag(new_norm[k])} for k in new_norm if k not in april_norm
    ]
    return ClaimDiff(
        person_id=person_id,
        person_name=person_name,
        url=url,
        checked_at=checked_at,
        april_sentences=len(april_norm),
        new_sentences=len(new_norm),
        kept=kept,
        deleted=deleted,
        added=added,
    )


CLAIMDIFF_COLUMNS = [
    "person_id",
    "person_name",
    "url",
    "checked_at",
    "protocol",
    "scope_note",
    "april_sentences",
    "new_sentences",
    "kept",
    "deleted_count",
    "added_count",
    "deleted_topics",
    "added_topics",
]


def _topic_tally(claims: list[dict]) -> str:
    from collections import Counter

    counts = Counter(t for c in claims for t in c["topics"])
    return ";".join(f"{t}={n}" for t, n in counts.most_common())


def row_dict(d: ClaimDiff) -> dict:
    return {
        "person_id": d.person_id,
        "person_name": d.person_name,
        "url": d.url,
        "checked_at": d.checked_at,
        "protocol": d.protocol,
        "scope_note": d.scope_note,
        "april_sentences": d.april_sentences,
        "new_sentences": d.new_sentences,
        "kept": d.kept,
        "deleted_count": d.deleted_count,
        "added_count": d.added_count,
        "deleted_topics": _topic_tally(d.deleted),
        "added_topics": _topic_tally(d.added),
    }


def write_claimdiff_csv(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CLAIMDIFF_COLUMNS)
        w.writeheader()
        w.writerows(rows)


def publish_frontend_snapshot(diffs: list[ClaimDiff], path: Path) -> int:
    """Compact per-person top claims for the site (capped lists only)."""
    by_person = {
        d.person_id: {
            "name": d.person_name,
            "url": d.url,
            "checked_at": d.checked_at,
            "april_sentences": d.april_sentences,
            "new_sentences": d.new_sentences,
            "kept": d.kept,
            "scope_note": d.scope_note,
            "deleted_count": len(d.deleted),
            "added_count": len(d.added),
            "deleted": _cap(d.deleted),
            "added": _cap(d.added),
        }
        for d in diffs
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"byPerson": by_person}), encoding="utf-8")
    return len(by_person)
