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


def cmd_recrawl(args: argparse.Namespace) -> None:
    """Re-crawl roster URLs storing normalized text bodies (the second corpus).

    Comparability protocol recrawl-v1: bodies are normalized with
    extract.extract_main_text (same function the Wayback diff path uses) and
    every manifest row records the protocol version. Respects robots.txt.
    """
    import datetime

    from . import recrawl

    checked_at = args.date or datetime.datetime.now(datetime.UTC).date().isoformat()
    recrawl_dir = args.data_dir / "out" / f"recrawl_{checked_at.replace('-', '')}"
    pages_dir = recrawl_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = recrawl_dir / "recrawl.csv"

    with open(args.data_dir / "out" / "websites.csv", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    targets_all = [(r["url"], r["person_id"], r["person_name"]) for r in rows]
    if args.limit and args.limit < len(targets_all):
        rng = random.Random(42)  # fixed seed: reproducible sample
        targets_all = rng.sample(targets_all, args.limit)

    done: dict[str, dict] = {}
    if not args.no_resume:
        for row in recrawl.read_manifest_rows(manifest_path):
            if row.get("url"):
                done[row["url"]] = row
    targets = [t for t in targets_all if t[0] not in done]
    logger.info(
        "Recrawling %d URLs into %s (concurrency=%d, %d already captured)...",
        len(targets),
        recrawl_dir,
        args.concurrency,
        len(done),
    )
    if targets:
        results = asyncio.run(
            recrawl.run_recrawl(
                targets,
                checked_at,
                pages_dir,
                concurrency=args.concurrency,
                timeout=args.timeout,
            )
        )
        for r in results:
            done[r.url] = recrawl.result_to_row(r)

    ordered = [done[t[0]] for t in targets_all if t[0] in done]
    recrawl.write_manifest_rows(ordered, manifest_path)

    bodies = sum(1 for r in ordered if r.get("file"))
    print(f"\nRecrawl of {len(ordered)} URLs -> {manifest_path} ({bodies} bodies stored)")
    print(f"Protocol {recrawl.PROTOCOL_VERSION}; bodies under {pages_dir}/")


def cmd_claimdiff(args: argparse.Namespace) -> None:
    """Claim-level diff: April baseline sentences vs recrawl bodies.

    April side = Campaign Lab per-candidate JSONs (site-wide text);
    recrawl side = homepage fetches. See claimdiff.SCOPE_NOTE — "deleted"
    means "in April's text but not the current homepage fetch".
    """
    from collections import Counter

    from . import claimdiff
    from .campaignlab import parse_candidate_json

    out = args.data_dir / "out"
    raw = args.data_dir / "raw" / "campaignlab"
    if args.recrawl_dir:
        recrawl_dir = out / args.recrawl_dir
    else:
        candidates = sorted((p for p in out.glob("recrawl_*") if p.is_dir()), reverse=True)
        recrawl_dir = candidates[0] if candidates else out / "recrawl_none"
    manifest_path = recrawl_dir / "recrawl.csv"
    if not manifest_path.exists():
        print(f"No manifest at {manifest_path} — run `civicord recrawl` first")
        return

    with open(manifest_path, encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r.get("file")]
    # One diff per person: a candidate with several URLs gets a single
    # alignment (April site-wide text vs concatenated recrawl bodies), so
    # person counts never double-count and the frontend join stays 1:1.
    by_person: dict[str, dict] = {}
    for r in rows:
        slot = by_person.setdefault(
            r["person_id"], {"person_name": r["person_name"], "urls": [], "rows": []}
        )
        slot["urls"].append(r["url"])
        slot["rows"].append(r)
    persons = list(by_person.items())
    if args.limit and args.limit < len(persons):
        rng = random.Random(42)  # fixed seed: reproducible sample
        persons = rng.sample(persons, args.limit)

    json_dirs = [raw / "assets" / "json", raw / "assets" / "large_json"]
    diffs = []
    missing_baseline = 0
    for person_id, slot in persons:
        april_texts = []
        for json_dir in json_dirs:
            for jf in sorted(json_dir.glob(f"{person_id}_*.json")):
                april_texts.extend(p.text for p in parse_candidate_json(jf, person_id=person_id))
        if not april_texts:
            missing_baseline += 1
            continue
        new_text = "\n".join(
            (recrawl_dir / r["file"]).read_text(encoding="utf-8") for r in slot["rows"]
        )
        diffs.append(
            claimdiff.diff_person(
                person_id,
                slot["person_name"],
                slot["urls"][0],
                april_texts,
                new_text,
                slot["rows"][0]["checked_at"],
            )
        )

    stamp = recrawl_dir.name.replace("recrawl_", "")
    claim_dir = out / f"claimdiff_{stamp}"
    claim_dir.mkdir(parents=True, exist_ok=True)
    claimdiff.write_claimdiff_csv(
        [claimdiff.row_dict(d) for d in diffs], claim_dir / "claimdiff.csv"
    )
    frontend_path = (
        Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "claim_diffs.json"
    )
    n = claimdiff.publish_frontend_snapshot(diffs, frontend_path)

    walked_back = Counter(t for d in diffs for c in d.deleted for t in c["topics"])
    new_themes = Counter(t for d in diffs for c in d.added for t in c["topics"])
    kept = sum(d.kept for d in diffs)
    print(f"\nClaim diff of {len(diffs)} persons -> {claim_dir / 'claimdiff.csv'}")
    print(f"  kept sentences: {kept}; no April baseline: {missing_baseline}")
    print(
        "  Walked back (deleted topics): "
        + (", ".join(f"{t}={n}" for t, n in walked_back.most_common(8)) or "—")
    )
    print(
        "  New themes (added topics): "
        + (", ".join(f"{t}={n}" for t, n in new_themes.most_common(8)) or "—")
    )
    print(f"  Frontend snapshot: {frontend_path} ({n} persons)")


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


def cmd_wayback_spike(args: argparse.Namespace) -> None:
    from . import wayback

    results = wayback.run_spike(
        data_dir=args.data_dir,
        limit=args.limit,
        sleep_s=args.sleep,
        resume=not args.no_resume,
    )
    findings = wayback.render_findings(results)
    out_md = args.data_dir / "out" / "wayback_spike" / "FINDINGS.md"
    out_md.write_text(findings, encoding="utf-8")
    print(findings)
    print(f"Saved: {out_md}")


def cmd_diff_spike(args: argparse.Namespace) -> None:
    from . import diff_spike

    results = diff_spike.run_diff_spike(data_dir=args.data_dir)
    findings = diff_spike.render_diff_findings(results)
    out_md = args.data_dir / "out" / "wayback_spike" / "DIFF_FINDINGS.md"
    out_md.write_text(findings, encoding="utf-8")
    docs = Path(__file__).resolve().parents[2] / "docs" / "wayback-spike.md"
    diff_spike.write_docs(results, docs)
    # Commit-friendly frontend snapshot (no HTML bodies).
    frontend_path = (
        Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "content_diffs.json"
    )
    n = diff_spike.publish_frontend_snapshot(results, frontend_path, data_dir=args.data_dir)
    print(findings)
    print(f"Saved: {out_md}")
    print(f"Docs:  {docs}")
    print(f"Frontend snapshot: {frontend_path} ({n} rows)")


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

    p = sub.add_parser(
        "recrawl",
        help="Re-crawl roster URLs storing normalized text bodies (second corpus)",
    )
    p.add_argument("--limit", type=int, default=0, help="Random sample size (0 = all)")
    p.add_argument("--concurrency", type=int, default=8)
    p.add_argument("--timeout", type=float, default=20.0)
    p.add_argument(
        "--date",
        default="",
        help="Checked-at date YYYY-MM-DD (default: today); names the output dir",
    )
    p.add_argument(
        "--no-resume",
        action="store_true",
        help="Re-fetch even when this date's manifest already has the URL",
    )
    p.set_defaults(func=cmd_recrawl)

    p = sub.add_parser(
        "claimdiff",
        help="Claim-level diff: April baseline sentences vs recrawl bodies + topic tags",
    )
    p.add_argument(
        "--recrawl-dir",
        default="",
        help="Recrawl output dir name under data/out (default: latest recrawl_*)",
    )
    p.add_argument("--limit", type=int, default=0, help="Random sample size (0 = all)")
    p.set_defaults(func=cmd_claimdiff)

    p = sub.add_parser("report", help="Render markdown audit summary")
    p.set_defaults(func=cmd_report)

    p = sub.add_parser(
        "changes",
        help="Derive change signals (gone/repurposed/redirected/…) from the liveness audit",
    )
    p.set_defaults(func=cmd_changes)

    p = sub.add_parser(
        "wayback-spike",
        help="Phase 1 spike: CDX + id_ fetch for a small gone/repurpose sample; diff vs April text",
    )
    p.add_argument("--limit", type=int, default=15, help="Number of URLs to sample (default 15)")
    p.add_argument(
        "--sleep",
        type=float,
        default=0.8,
        help="Seconds between Wayback requests (be polite)",
    )
    p.add_argument(
        "--no-resume",
        action="store_true",
        help="Re-fetch even when a cached .bin already exists for the person",
    )
    p.set_defaults(func=cmd_wayback_spike)

    p = sub.add_parser(
        "diff-spike",
        help="Offline: normalize Wayback spike bodies + score significance vs April text",
    )
    p.set_defaults(func=cmd_diff_spike)

    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
