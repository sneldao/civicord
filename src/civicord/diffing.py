"""Compare normalized snapshot texts and score change significance.

Designed for Campaign Lab fragment corpora vs Wayback/main-text extracts:
coverage (how much of April text still appears) matters more than raw
SequenceMatcher similarity on unequal shapes.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from difflib import SequenceMatcher

from .extract import normalize_plaintext, token_set, tokens

SIGNIFICANCE_LABELS = (
    "unchanged",
    "minor",
    "major",
    "transformed",
    "incomparable",
)


@dataclass
class DiffResult:
    """One pair comparison (April scrape vs Wayback extract)."""

    person_id: str
    snapshot_ts: str | None
    apr_chars: int
    wayback_chars: int
    similarity: float | None  # SequenceMatcher on normalized text
    coverage: float | None  # fraction of April tokens found in Wayback
    jaccard: float | None  # token Jaccard
    length_ratio: float | None  # min/max char lengths
    significance: str  # unchanged|minor|major|transformed|incomparable
    significance_score: float  # 0 = same, 1 = maximally changed
    extractor: str  # trafilatura|fallback|plaintext


def _ratio(a: str, b: str) -> float | None:
    if not a or not b:
        return None
    aa, bb = a[:80_000], b[:80_000]
    return SequenceMatcher(None, aa, bb).ratio()


def _coverage(apr: str, other: str) -> float | None:
    """Share of April tokens that appear in the other text."""
    a = tokens(apr)
    if not a:
        return None
    o = token_set(other)
    if not o:
        return 0.0
    hit = sum(1 for t in a if t in o)
    return hit / len(a)


def _jaccard(a: str, b: str) -> float | None:
    sa, sb = token_set(a), token_set(b)
    if not sa and not sb:
        return None
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def classify_significance(
    *,
    similarity: float | None,
    coverage: float | None,
) -> tuple[str, float]:
    """Return (label, score) where score ∈ [0,1] = how much changed.

    Prefer coverage when available (CL fragments ⊂ page). Fall back to similarity.
    """
    if similarity is None and coverage is None:
        return "incomparable", 1.0

    # Join quality signal: max of the two "still related" metrics.
    related = max(similarity or 0.0, coverage or 0.0)
    score = round(1.0 - related, 4)

    if related >= 0.75:
        return "unchanged", score
    if related >= 0.40:
        return "minor", score
    if related >= 0.15:
        return "major", score
    return "transformed", score


def compare_texts(
    *,
    person_id: str,
    april_text: str,
    wayback_text: str,
    snapshot_ts: str | None = None,
    extractor: str = "plaintext",
) -> DiffResult:
    apr = normalize_plaintext(april_text)
    wb = normalize_plaintext(wayback_text)
    sim = _ratio(apr, wb)
    cov = _coverage(apr, wb)
    jac = _jaccard(apr, wb)
    if apr and wb:
        length_ratio = min(len(apr), len(wb)) / max(len(apr), len(wb))
    else:
        length_ratio = None
    label, score = classify_significance(similarity=sim, coverage=cov)
    return DiffResult(
        person_id=person_id,
        snapshot_ts=snapshot_ts,
        apr_chars=len(apr),
        wayback_chars=len(wb),
        similarity=round(sim, 4) if sim is not None else None,
        coverage=round(cov, 4) if cov is not None else None,
        jaccard=round(jac, 4) if jac is not None else None,
        length_ratio=round(length_ratio, 4) if length_ratio is not None else None,
        significance=label,
        significance_score=score,
        extractor=extractor,
    )


def result_dict(r: DiffResult) -> dict:
    return asdict(r)
