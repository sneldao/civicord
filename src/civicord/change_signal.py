"""Derive change signals from the Sep 2026 liveness audit.

Exclusive taxonomy (first match wins) — keep in sync with
frontend/scripts/build-data.mjs classifyChangeSignal().
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

# Website-level signals (exported for tests / CLI).
SIGNALS = (
    "gone",
    "repurposed_suspect",
    "redirected",
    "still_attested",
    "other",
    "unaudited",
)

# Worst-first for person rollup.
SEVERITY = {
    "gone": 0,
    "repurposed_suspect": 1,
    "redirected": 2,
    "other": 3,
    "still_attested": 4,
    "unaudited": 5,
}

LABELS = {
    "gone": "Domain no longer resolves",
    "repurposed_suspect": (
        "Page responds, but the candidate's surname is absent — may have been repurposed"
    ),
    "redirected": "URL now redirects elsewhere",
    "still_attested": "Still live; surname still present",
    "other": "Audited, but not a clean survival/repurpose class",
    "unaudited": "No audit yet",
}

GONE_CLASSES = frozenset({"dns_error", "connection_error"})
CHECKED_AT = "2026-09-07"


def classify_change_signal(
    *,
    status_class: str | None,
    redirected: bool,
    name_found: bool | None,
    has_audit: bool,
) -> str:
    """Return the exclusive change signal for one website audit row."""
    if not has_audit:
        return "unaudited"
    sc = (status_class or "").strip()
    if sc in GONE_CLASSES:
        return "gone"
    if sc == "live" and name_found is False:
        return "repurposed_suspect"
    if redirected:
        return "redirected"
    if sc == "live":
        return "still_attested"
    return "other"


def parse_bool(raw: str | None) -> bool:
    return (raw or "").strip() in ("True", "true", "1", "yes")


def parse_name_found(raw: str | None) -> bool | None:
    v = (raw or "").strip()
    if v == "":
        return None
    if v in ("True", "true", "1"):
        return True
    if v in ("False", "false", "0"):
        return False
    return None


def rollup_person(signals: list[str]) -> str:
    if not signals:
        return "unaudited"
    return min(signals, key=lambda s: SEVERITY.get(s, 99))


def rows_from_audit(audit_rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in audit_rows:
        redirected = parse_bool(r.get("redirected"))
        name_found = parse_name_found(r.get("name_found"))
        signal = classify_change_signal(
            status_class=r.get("status_class"),
            redirected=redirected,
            name_found=name_found,
            has_audit=True,
        )
        out.append(
            {
                "person_id": r.get("person_id", ""),
                "person_name": r.get("person_name", ""),
                "url": r.get("url", ""),
                "change_signal": signal,
                "status_class": r.get("status_class", ""),
                "status_code": r.get("status_code", ""),
                "redirected": "True" if redirected else "False",
                "final_url": r.get("final_url", ""),
                "name_found": r.get("name_found", ""),
                "checked_at": CHECKED_AT,
                "label": LABELS[signal],
            }
        )
    return out


def write_changes_csv(rows: list[dict[str, Any]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "person_id",
        "person_name",
        "url",
        "change_signal",
        "status_class",
        "status_code",
        "redirected",
        "final_url",
        "name_found",
        "checked_at",
        "label",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k in fields})


def summarize(rows: list[dict[str, Any]]) -> dict[str, int]:
    counts = {s: 0 for s in SIGNALS}
    for r in rows:
        sig = r["change_signal"]
        counts[sig] = counts.get(sig, 0) + 1
    return counts
