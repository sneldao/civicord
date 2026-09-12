"""Civicord CLI: download, ingest, audit, report, changes."""

from __future__ import annotations

import argparse
import asyncio
import csv
import logging
import random
import sys
from pathlib import Path

from . import __version__, audit, campaignlab

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def cmd_download(args: argparse.Namespace) -> None:
    raw = args.data_dir / "raw" / "campaignlab"
    csv_dest = campaignlab.download_file(campaignlab.CANDIDATES_CSV, raw / "candidates.csv")
    logger.info("Downloaded %s (%d bytes)", csv_dest, csv_dest.stat().st_size)
    if args.full:
        full_dest = campaignlab.download_file(
            campaignlab.CANDIDATES_FULL_CSV, raw / "candidatesfull.csv"
        )
        logger.info("Downloaded %s (%d bytes)", full_dest, full_dest.stat().st_size)
    if args.json_limit:
        paths = campaignlab.list_json_files(limit=args.json_limit)
        logger.info("Downloading %d candidate JSONs...", len(paths))
        for p in paths:
            dest = raw / p
            if not dest.exists():
                campaignlab.download_file(p, dest)
        logger.info("JSONs saved under %s", raw / "assets" / "json")
    if args.large_json:
        # Phase-0 gap (docs/plan.md): ~1,300 candidates' full page text lives in
        # assets/large_json, not assets/json. Downloaded here so `ingest` picks
        # both directories up.
        paths = campaignlab.list_json_files(large=True)
        logger.info("Downloading %d large_json candidate JSONs...", len(paths))
        for p in paths:
            dest = raw / p
            if not dest.exists():
                campaignlab.download_file(p, dest)
        logger.info("large_json saved under %s", raw / campaignlab.LARGE_JSON_DIR)


def cmd_ingest(args: argparse.Namespace) -> None:
    raw = args.data_dir / "raw" / "campaignlab"
    out = args.data_dir / "out"
    out.mkdir(parents=True, exist_ok=True)

    candidacies = campaignlab.parse_candidates_csv(raw / "candidates.csv")
    with open(out / "candidacies.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "person_id",
                "person_name",
                "election_id",
                "ballot_paper_id",
                "election_date",
                "party_name",
                "party_id",
                "post_label",
                "homepage_url",
            ]
        )
        for c in candidacies:
            w.writerow(
                [
                    c.person_id,
                    c.person_name,
                    c.election_id,
                    c.ballot_paper_id,
                    c.election_date,
                    c.party_name,
                    c.party_id,
                    c.post_label,
                    c.homepage_url,
                ]
            )

    websites = campaignlab.websites_from_candidacies(candidacies)
    with open(out / "websites.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["person_id", "person_name", "url", "elections", "parties", "posts"])
        for web in websites:
            w.writerow(
                [
                    web.person_id,
                    web.person_name,
                    web.url,
                    ";".join(web.elections),
                    ";".join(web.parties),
                    ";".join(web.posts),
                ]
            )

    json_dirs = [raw / "assets" / "json", raw / campaignlab.LARGE_JSON_DIR]
    page_count = 0
    seen_page_keys: set[tuple[str, str]] = set()
    with open(out / "pages.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["person_id", "page_key", "char_count", "text"])
        for json_dir in json_dirs:
            if not json_dir.exists():
                continue
            for jf in sorted(json_dir.glob("*.json")):
                person_id = jf.name.split("_")[0]
                for page in campaignlab.parse_candidate_json(jf, person_id=person_id):
                    # large_json supersedes the stubbed assets/json entry for the
                    # same person+page — dedupe on (person_id, page_key), last wins.
                    key = (page.person_id, page.page_key)
                    if key in seen_page_keys:
                        continue
                    seen_page_keys.add(key)
                    w.writerow([page.person_id, page.page_key, page.char_count, page.text])
                    page_count += 1

    print(
        f"Ingested: {len(candidacies)} candidacies -> {len(websites)} unique person+website rows; {page_count} scraped pages"
    )
    print(f"Outputs: {out}/candidacies.csv, {out}/websites.csv, {out}/pages.csv")


def cmd_audit(args: argparse.Namespace) -> None:
    websites_csv = args.data_dir / "out" / "websites.csv"
    with open(websites_csv, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    targets_all = [
        (r["url"], r["person_name"].split()[-1] if args.content_check else None, r) for r in rows
    ]
    if args.limit and args.limit < len(targets_all):
        rng = random.Random(42)  # fixed seed: reproducible sample
        targets_all = rng.sample(targets_all, args.limit)
    logger.info(
        "Auditing %d URLs (concurrency=%d, content_check=%s)...",
        len(targets_all),
        args.concurrency,
        args.content_check,
    )
    results = asyncio.run(
        audit.run_audit(
            [(u, h) for u, h, _ in targets_all], concurrency=args.concurrency, timeout=args.timeout
        )
    )

    out_csv = args.data_dir / "out" / "audit_liveness.csv"
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "url",
                "person_id",
                "person_name",
                "status_class",
                "status_code",
                "final_url",
                "redirected",
                "name_found",
                "error",
                "elapsed_ms",
            ]
        )
        for (url, _hint, r), res in zip(targets_all, results):
            w.writerow(
                [
                    url,
                    r["person_id"],
                    r["person_name"],
                    res.status_class,
                    res.status_code,
                    res.final_url,
                    res.redirected,
                    res.name_found,
                    res.error,
                    res.elapsed_ms,
                ]
            )

    counts = audit.summarize(results)
    total = len(results)
    print(f"\nAudit of {total} URLs -> {out_csv}")
    for cls, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        pct = f" ({n / total:.0%})" if total else ""
        print(f"  {cls:<18} {n:>5}{pct}")
    live = counts.get("live", 0)
    print(f"Liveness: {live}/{total} live ({live / total:.0%})" if total else "No URLs audited")


def cmd_report(args: argparse.Namespace) -> None:
    audit_csv = args.data_dir / "out" / "audit_liveness.csv"
    with open(audit_csv, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    total = len(rows)
    counts = audit.summarize(
        [audit.AuditResult(url=r["url"], status_class=r["status_class"]) for r in rows]
    )
    with open(args.data_dir / "out" / "websites.csv", encoding="utf-8") as f:
        websites = {r["url"]: r for r in csv.DictReader(f)}
    parl = sum(
        1
        for r in rows
        if any(
            e.startswith("parl.")
            for e in websites.get(r["url"], {}).get("elections", "").split(";")
            if e
        )
    )
    redirected = sum(1 for r in rows if r["redirected"] == "True")

    lines = ["# Civicord liveness audit (sample)", "", f"- URLs audited: **{total}**"]
    if total:
        lines.append(f"- Live: **{counts.get('live', 0)}** ({counts.get('live', 0) / total:.0%})")
    lines += [
        f"- Redirected somewhere else: {redirected}",
        f"- Parliamentary-election websites in sample: {parl}",
        "",
        "| Status class | Count |",
        "| --- | --- |",
    ]
    for cls in audit.CLASSES:
        lines.append(f"| {cls} | {counts.get(cls, 0)} |")
    report = "\n".join(lines) + "\n"
    out_md = args.data_dir / "out" / "audit_report.md"
    out_md.write_text(report, encoding="utf-8")
    print(report)
    print(f"Saved: {out_md}")


def cmd_changes(args: argparse.Namespace) -> None:
    """Derive change signals from audit_liveness.csv → changes_v0.csv.

    Joins websites.csv when present so counts match frontend build-data.mjs.
    """
    from . import change_signal

    out = args.data_dir / "out"
    audit_csv = out / "audit_liveness.csv"
    with open(audit_csv, encoding="utf-8") as f:
        audit_by_url = {r["url"]: r for r in csv.DictReader(f)}

    websites_csv = out / "websites.csv"
    if websites_csv.exists():
        with open(websites_csv, encoding="utf-8") as f:
            site_rows = list(csv.DictReader(f))
        audit_rows = []
        for w in site_rows:
            a = audit_by_url.get(w["url"])
            if a:
                audit_rows.append(a)
            else:
                audit_rows.append(
                    {
                        "person_id": w.get("person_id", ""),
                        "person_name": w.get("person_name", ""),
                        "url": w["url"],
                        "status_class": "",
                        "status_code": "",
                        "redirected": "False",
                        "final_url": "",
                        "name_found": "",
                        "_unaudited": "1",
                    }
                )
        rows = []
        for r in audit_rows:
            if r.get("_unaudited") == "1":
                rows.append(
                    {
                        "person_id": r["person_id"],
                        "person_name": r["person_name"],
                        "url": r["url"],
                        "change_signal": "unaudited",
                        "status_class": "",
                        "status_code": "",
                        "redirected": "False",
                        "final_url": "",
                        "name_found": "",
                        "checked_at": change_signal.CHECKED_AT,
                        "label": change_signal.LABELS["unaudited"],
                    }
                )
            else:
                rows.extend(change_signal.rows_from_audit([r]))
    else:
        with open(audit_csv, encoding="utf-8") as f:
            rows = change_signal.rows_from_audit(list(csv.DictReader(f)))

    out_csv = out / "changes_v0.csv"
    change_signal.write_changes_csv(rows, out_csv)
    counts = change_signal.summarize(rows)
    print(f"Wrote {len(rows)} rows → {out_csv}")
    for sig in change_signal.SIGNALS:
        n = counts.get(sig, 0)
        if n:
            print(f"  {sig:<22} {n:>5}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="civicord", description="Civicord: UK candidate website tracker"
    )
    parser.add_argument("--version", action="version", version=f"civicord {__version__}")
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("download", help="Download Campaign Lab scrape data")
    p.add_argument(
        "--json-limit", type=int, default=0, help="Also download first N candidate JSONs (0 = none)"
    )
    p.add_argument(
        "--large-json",
        action="store_true",
        help="Also download assets/large_json (full page text for ~1,300 candidates)",
    )
    p.add_argument("--full", action="store_true", help="Also download the ~30MB candidatesfull CSV")
    p.set_defaults(func=cmd_download)

    p = sub.add_parser("ingest", help="Parse raw data into tidy CSVs")
    p.set_defaults(func=cmd_ingest)

    p = sub.add_parser("audit", help="Check liveness of ingested website URLs")
    p.add_argument("--limit", type=int, default=0, help="Random sample size (0 = all)")
    p.add_argument("--concurrency", type=int, default=8)
    p.add_argument("--timeout", type=float, default=15.0)
    p.add_argument(
        "--content-check",
        action="store_true",
        help="GET bodies and check candidate surname appears",
    )
    p.set_defaults(func=cmd_audit)

    p = sub.add_parser("report", help="Render markdown audit summary")
    p.set_defaults(func=cmd_report)

    p = sub.add_parser(
        "changes",
        help="Derive change signals (gone/repurposed/redirected/…) from the liveness audit",
    )
    p.set_defaults(func=cmd_changes)

    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
