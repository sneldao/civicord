"""Re-diff existing Wayback spike artifacts with normalized extracts.

Does not re-hit the network — reads `data/out/wayback_spike/{id}/*.bin` and
`pages.csv`, writes `diff_summary.csv` + updates docs/wayback-spike.md section.
"""

from __future__ import annotations

import csv
import json
import logging
from dataclasses import asdict
from pathlib import Path

from . import diffing, extract
from .wayback import load_april_text

logger = logging.getLogger(__name__)


def _latest_bin(person_dir: Path) -> tuple[str, Path] | None:
    bins = sorted(person_dir.glob("*.bin"))
    if not bins:
        return None
    path = bins[-1]
    return path.stem, path


def run_diff_spike(*, data_dir: Path) -> list[diffing.DiffResult]:
    spike = data_dir / "out" / "wayback_spike"
    pages = data_dir / "out" / "pages.csv"
    summary_path = spike / "spike_summary.json"
    if not spike.exists():
        raise FileNotFoundError(f"Missing {spike} — run `civicord wayback-spike` first")

    # Prefer person ids from prior spike summary (stable order).
    person_ids: list[str] = []
    meta_by_id: dict[str, dict] = {}
    if summary_path.exists():
        for row in json.loads(summary_path.read_text()):
            pid = str(row.get("person_id", ""))
            if pid:
                person_ids.append(pid)
                meta_by_id[pid] = row
    if not person_ids:
        person_ids = sorted(p.name for p in spike.iterdir() if p.is_dir() and p.name.isdigit())

    results: list[diffing.DiffResult] = []
    for pid in person_ids:
        person_dir = spike / pid
        if not person_dir.is_dir():
            continue
        picked = _latest_bin(person_dir)
        apr = load_april_text(pages, pid)
        if not picked:
            results.append(
                diffing.compare_texts(
                    person_id=pid,
                    april_text=apr,
                    wayback_text="",
                    snapshot_ts=None,
                    extractor="none",
                )
            )
            continue
        ts, bin_path = picked
        raw = bin_path.read_bytes()
        html = raw.decode("utf-8", "replace")
        # Detect which extractor produced usable text.
        try:
            import trafilatura  # noqa: F401

            wb = extract.extract_main_text(html)
            extractor = "trafilatura"
            if not wb:
                wb = extract.normalize_plaintext(extract.html_to_text_fallback(html))
                extractor = "fallback"
        except ImportError:
            wb = extract.normalize_plaintext(extract.html_to_text_fallback(html))
            extractor = "fallback"

        (person_dir / f"{ts}.norm.txt").write_text(wb + "\n", encoding="utf-8")
        (person_dir / "april.norm.txt").write_text(
            extract.normalize_plaintext(apr) + "\n", encoding="utf-8"
        )

        result = diffing.compare_texts(
            person_id=pid,
            april_text=apr,
            wayback_text=wb,
            snapshot_ts=ts,
            extractor=extractor,
        )
        results.append(result)
        logger.info(
            "%s sig=%s cov=%s sim=%s extractor=%s",
            pid,
            result.significance,
            result.coverage,
            result.similarity,
            extractor,
        )

    # Persist
    out_csv = spike / "diff_summary.csv"
    fields = list(diffing.DiffResult.__dataclass_fields__.keys())
    # Attach change_signal from spike summary when present.
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["change_signal", *fields])
        w.writeheader()
        for r in results:
            row = asdict(r)
            row["change_signal"] = meta_by_id.get(r.person_id, {}).get("change_signal", "")
            w.writerow(row)
    (spike / "diff_summary.json").write_text(
        json.dumps(
            [
                {
                    "change_signal": meta_by_id.get(r.person_id, {}).get("change_signal", ""),
                    **asdict(r),
                }
                for r in results
            ],
            indent=2,
        )
        + "\n"
    )
    return results


def render_diff_findings(results: list[diffing.DiffResult]) -> str:
    n = len(results)
    usable = [r for r in results if r.significance != "incomparable"]
    by_sig: dict[str, int] = {}
    for r in results:
        by_sig[r.significance] = by_sig.get(r.significance, 0) + 1
    covs = [r.coverage for r in usable if r.coverage is not None]
    sims = [r.similarity for r in usable if r.similarity is not None]

    def med(xs: list[float]) -> float:
        s = sorted(xs)
        return s[len(s) // 2]

    lines = [
        "# Normalized diff spike",
        "",
        "Re-diff of existing Wayback `id_` bodies vs April Campaign Lab text,",
        "after **trafilatura** (or fallback) extraction + shared plaintext normalize.",
        "",
        f"**Pairs:** {n} · **classifiable:** {len(usable)}",
        "",
        "### Significance classes",
        "",
        "| class | n | meaning |",
        "| --- | --- | --- |",
        f"| unchanged | {by_sig.get('unchanged', 0)} | related ≥ 0.75 (coverage or similarity) |",
        f"| minor | {by_sig.get('minor', 0)} | related 0.40–0.75 |",
        f"| major | {by_sig.get('major', 0)} | related 0.15–0.40 |",
        f"| transformed | {by_sig.get('transformed', 0)} | related < 0.15 |",
        f"| incomparable | {by_sig.get('incomparable', 0)} | missing one side |",
        "",
    ]
    if covs:
        lines += [
            "### Metrics (normalized)",
            "",
            (
                f"- **Coverage** (April tokens in Wayback): "
                f"min {min(covs):.2f} · median {med(covs):.2f} · max {max(covs):.2f}"
            ),
        ]
    if sims:
        lines.append(
            f"- **Similarity** (SequenceMatcher): min {min(sims):.2f} · "
            f"median {med(sims):.2f} · max {max(sims):.2f}"
        )
    lines += [
        "",
        "| person_id | coverage | similarity | significance | score | extractor |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for r in sorted(usable, key=lambda x: x.significance_score, reverse=True):
        cov = f"{r.coverage:.2f}" if r.coverage is not None else "—"
        sim = f"{r.similarity:.2f}" if r.similarity is not None else "—"
        lines.append(
            f"| {r.person_id} | {cov} | {sim} | "
            f"{r.significance} | {r.significance_score:.2f} | {r.extractor} |"
        )
    lines += [
        "",
        "## Read",
        "",
        "- **Coverage** is the join metric that matters for CL fragments: how much of",
        "  the April scrape still appears in the archived page.",
        "- **Significance** uses `max(coverage, similarity)` so a good fragment join",
        "  is not punished by unequal document length.",
        "- **Product:** `frontend/src/data/content_diffs.json` feeds candidate",
        "  “Content chronology” and `/api/candidates/{id}` `contentDiff`.",
        "",
        "Artifacts: `data/out/wayback_spike/diff_summary.csv` (gitignored under `data/`).",
        "",
    ]
    return "\n".join(lines) + "\n"


def publish_frontend_snapshot(
    results: list[diffing.DiffResult],
    path: Path,
    *,
    data_dir: Path,
) -> int:
    """Write a compact JSON map person_id → significance for the frontend build."""
    spike = data_dir / "out" / "wayback_spike" / "spike_summary.json"
    meta: dict[str, dict] = {}
    if spike.exists():
        for row in json.loads(spike.read_text()):
            meta[str(row.get("person_id", ""))] = row

    payload = {
        "generatedAt": "2026-09-12",
        "source": "civicord diff-spike (Wayback id_ vs Campaign Lab April text)",
        "docs": "https://github.com/sneldao/civicord/blob/main/docs/wayback-spike.md",
        "byPerson": {},
    }
    for r in results:
        if r.significance == "incomparable":
            continue
        m = meta.get(r.person_id, {})
        payload["byPerson"][r.person_id] = {
            "significance": r.significance,
            "significanceScore": r.significance_score,
            "coverage": r.coverage,
            "similarity": r.similarity,
            "snapshotTs": r.snapshot_ts,
            "changeSignal": m.get("change_signal"),
            "url": m.get("url"),
            "waybackUrl": (
                f"https://web.archive.org/web/{r.snapshot_ts}id_/{m['url']}"
                if r.snapshot_ts and m.get("url")
                else None
            ),
            "extractor": r.extractor,
        }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return len(payload["byPerson"])


def write_docs(results: list[diffing.DiffResult], docs_path: Path) -> None:
    """Merge normalized-diff section into docs/wayback-spike.md (preserve header)."""
    new_section = render_diff_findings(results)
    reproduce = (
        "\n## Reproduce\n\n"
        "```bash\n"
        "civicord changes\n"
        "civicord wayback-spike --limit 150  # resume-friendly; caches under data/out/\n"
        "civicord diff-spike                 # re-extract + significance (offline)\n"
        "```\n"
    )
    if docs_path.exists():
        old = docs_path.read_text(encoding="utf-8")
        marker = "# Normalized diff spike"
        if marker in old:
            head = old.split(marker)[0].rstrip() + "\n\n"
        else:
            head = old.split("## Reproduce")[0].rstrip() + "\n\n"
        docs_path.write_text(head + new_section + reproduce, encoding="utf-8")
    else:
        docs_path.write_text(new_section + reproduce, encoding="utf-8")
