#!/usr/bin/env python3
"""Build and verify a versioned Civicord evidence bundle for X Layer DeWEB.

The builder reads the committed frontend data snapshot and emits a static,
self-contained bundle. The verifier is deliberately independent of the builder's
HTML generation details: it checks schema, required caveat/methodology material,
file hashes, cohort consistency, and static-content constraints.

Usage:
  python scripts/tapeout/evidence_bundle.py build
  python scripts/tapeout/evidence_bundle.py verify data/out/deweb/... --self-test
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "frontend" / "src" / "data"
DEFAULT_OUT_ROOT = REPO_ROOT / "data" / "out" / "deweb"

SCHEMA = "civicord-evidence-bundle/0.1"
METHODOLOGY_VERSION = "civicord-methodology/2026-11-25"
DEFAULT_SEAT_SLUG = "holborn-and-st-pancras"
DEFAULT_AUDIT_DATE = "2026-09-07"
MAX_FILE_BYTES = 350 * 24_000

SCOPE_EXPLANATIONS = {
    "april site-wide vs recrawl homepage": (
        "The April text covers the whole scraped site; the later text is one homepage "
        "fetch. A sentence can be missing from that homepage and still exist on another page."
    )
}

CAVEAT_PHRASES = [
    "HTTP-response class",
    "not evidence of intent",
    "surname matching is a heuristic",
    "scope mismatch",
]

REQUIRED_PAYLOAD_FILES = {
    "index.html",
    "candidates.json",
    "methodology.md",
    "caveats.md",
    "sources.json",
    "verify.html",
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text, encoding="utf-8")


def write_json(path: Path, value: Any) -> None:
    write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def git_state() -> dict[str, Any]:
    def run(args: list[str]) -> str:
        try:
            return subprocess.check_output(
                ["git", *args], cwd=REPO_ROOT, text=True, stderr=subprocess.DEVNULL
            ).strip()
        except (OSError, subprocess.SubprocessError):
            return ""

    return {
        "commit": run(["rev-parse", "HEAD"]),
        "workingTreeDirty": bool(run(["status", "--porcelain"])),
    }


def source_hashes() -> dict[str, str]:
    return {
        "candidates.json": sha256_file(DATA_DIR / "candidates.json"),
        "constituencies.json": sha256_file(DATA_DIR / "constituencies.json"),
        "claim_diffs.json": sha256_file(DATA_DIR / "claim_diffs.json"),
    }


def input_data() -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    people = load_json(DATA_DIR / "candidates.json")
    seats = load_json(DATA_DIR / "constituencies.json")
    claim_diffs = load_json(DATA_DIR / "claim_diffs.json").get("byPerson", {})
    return people, seats, claim_diffs


def seat_by_slug(seats: list[dict[str, Any]], slug: str) -> dict[str, Any]:
    for seat in seats:
        if seat.get("slug") == slug:
            return seat
    raise SystemExit(f"seat slug not found: {slug}")


def excerpt_pages(person: dict[str, Any], limit: int = 3) -> list[dict[str, Any]]:
    pages = []
    for page in person.get("pages") or []:
        pages.append(
            {
                "key": page.get("key"),
                "chars": page.get("chars"),
                "snippet": page.get("snippet"),
                "source": "Campaign Lab April 2025 scrape, extracted text, CC-BY with credit",
            }
        )
        if len(pages) >= limit:
            break
    return pages


def cohort_records(people: list[dict[str, Any]], seat: dict[str, Any]) -> list[dict[str, Any]]:
    people_by_id = {str(person.get("id")): person for person in people}
    records = []
    for row in seat.get("candidates") or []:
        person_id = str(row["id"])
        person = people_by_id.get(person_id)
        if not person:
            raise SystemExit(f"candidate {person_id} from seat data missing in candidates.json")
        website = (person.get("websites") or [{}])[0]
        audit = website.get("audit") or {}
        records.append(
            {
                "personId": person_id,
                "name": person.get("name") or row.get("name"),
                "party": row.get("party"),
                "url": row.get("url"),
                "elections": website.get("elections") or [],
                "posts": website.get("posts") or [],
                "audit": {
                    "statusClass": audit.get("statusClass"),
                    "statusCode": audit.get("statusCode"),
                    "redirected": audit.get("redirected"),
                    "finalUrl": audit.get("finalUrl"),
                    "nameFound": audit.get("nameFound"),
                },
                "changeSignal": person.get("changeSignal") or row.get("changeSignal"),
                "canonicalUrl": f"https://civicord.pages.dev/candidates/{person_id}",
                "archivedExcerpts": excerpt_pages(person),
            }
        )
    return records


def methodology_text(seat: dict[str, Any], audit_date: str, generated_at: str) -> str:
    return f"""# Methodology — Civicord evidence bundle

Methodology version: `{METHODOLOGY_VERSION}`
Generated: `{generated_at}`

## Scope

This bundle is a versioned publication mirror for the Civicord public record
covering the UK parliamentary constituency of **{seat["name"]}**. It is derived
from the committed Civicord frontend data snapshot, itself derived from the
Campaign Lab April 2025 candidate-website scrape, Democracy Club person IDs,
and Civicord's audit pipeline. The audit baseline represented here is
`{audit_date}` unless a row carries a more specific timestamp in the source data.

This is not a new crawl, a new judgement, or a replacement canonical register.
It is a static export of already-public Civicord records plus the methodology
and caveats needed to interpret them.

## What the audit classes mean

- `live` means the URL returned a successful HTTP response during the audit. It
  does not prove that the original campaign content survived.
- `dns_error` means DNS did not resolve during the audit. It does not prove why
  the domain disappeared.
- `http_error` means the server returned an HTTP error. Bot blocking, temporary
  failure and genuine removal can look alike from one vantage point.
- Redirects are destinations observed by the audit. Many redirects are same-site
  or platform artefacts; they are not automatically evidence of repurposing.
- `repurposed_suspect` is a heuristic label. Surname matching is a heuristic
  against the response body and can be wrong in both directions.

## Evidence hierarchy

The canonical Civicord record URLs, stable Democracy Club person IDs, source
scrape, audit outputs and methodology are the system of reference. This mirror
is a secondary publication surface. It must be versioned and must not overwrite
a cited snapshot in place.

## Claim diffs

Bulk claim-diff rows are omitted by default because the April site-wide text
and later homepage-only re-crawl have a scope mismatch. If `claim-diffs.json`
is present, every row must carry its scope explanation, and counts must not be
quoted as proven losses without that scope attached.

## Licence and attribution

Civicord-derived outputs are CC-BY. Campaign Lab April 2025 extracted scrape
text may be reused and redistributed with credit under the CC-BY arrangement
recorded in the Civicord repository. Democracy Club person IDs and roster
labels remain attributed to Democracy Club.
"""


def caveats_text() -> str:
    return """# Caveats — read before citing

These caveats are part of the evidence bundle. Do not quote a row without them.

1. `live` is an HTTP-response class, not proof of content survival.
2. `gone`, `redirected`, `repurposed_suspect` and related labels are ledger
   heuristics, not evidence of intent.
3. A DNS or HTTP failure is not proof that a campaign deliberately removed a
   site. Temporary outages, hosting errors, bot blocking and configuration
   problems can produce similar observations.
4. Redirects are noisy. Many are same-site TLD changes, HTTP-to-HTTPS moves,
   party CMS moves or platform artefacts.
5. Surname matching is a heuristic. Shared party infrastructure and branch
   pages can produce false positives and false negatives.
6. Claim deletion counts are especially sensitive to scope mismatch: the
   April scrape can cover a whole site while the later crawl may cover only a
   homepage. A missing sentence in that comparison is not proof that it was
   deleted from the site.
7. Absence of evidence in this bundle is represented as unknown or absent; it
   must not be smoothed over for narrative clarity.
"""


def sources_json(seat: dict[str, Any], audit_date: str) -> dict[str, Any]:
    return {
        "sources": [
            {
                "name": "Campaign Lab candidate-website scrape",
                "url": "https://github.com/CampaignLab/candidate-website-scrape",
                "use": "April 2025 candidate URLs and extracted page text snippets",
                "license": "CC-BY with credit, per Civicord-recorded reuse agreement",
            },
            {
                "name": "Democracy Club Candidates",
                "url": "https://candidates.democracyclub.org.uk/",
                "use": "stable person IDs, party and roster labels",
                "license": "open data with attribution",
            },
            {
                "name": "Civicord liveness audit",
                "url": "https://civicord.pages.dev/methodology",
                "use": f"HTTP status, redirect and heuristic labels for the {audit_date} audit baseline",
                "license": "CC-BY Civicord-derived output",
            },
        ],
        "seat": {
            "name": seat.get("name"),
            "slug": seat.get("slug"),
            "gssCode": seat.get("gssCode"),
            "region": seat.get("region"),
            "country": seat.get("country"),
            "electorate": seat.get("electorate"),
        },
    }


def html_status(record: dict[str, Any]) -> str:
    audit = record["audit"]
    bits = [html.escape(str(audit.get("statusClass") or "unknown"))]
    if audit.get("statusCode") is not None:
        bits.append(f"({audit['statusCode']})")
    if audit.get("redirected"):
        bits.append("· redirected")
    return " ".join(bits)


def render_index(
    seat: dict[str, Any], records: list[dict[str, Any]], audit_date: str, generated_at: str
) -> str:
    rows = []
    cards = []
    for record in records:
        audit = record["audit"]
        final_url = audit.get("finalUrl")
        final_html = (
            f'<br><span class="muted">final URL:</span> '
            f'<a href="{html.escape(final_url)}">{html.escape(final_url)}</a>'
            if final_url
            else ""
        )
        rows.append(
            "<tr>"
            f'<td><a href="#p{record["personId"]}">{html.escape(record["name"])}</a></td>'
            f"<td>{html.escape(str(record.get('party') or ''))}</td>"
            f"<td><code>{html.escape(str(audit.get('statusClass') or 'unknown'))}</code></td>"
            f"<td>{'yes' if audit.get('redirected') else 'no'}</td>"
            f"<td><code>{html.escape(str(record.get('changeSignal') or 'unknown'))}</code></td>"
            "</tr>"
        )
        excerpts = []
        for page in record.get("archivedExcerpts") or []:
            snippet = page.get("snippet")
            if snippet:
                excerpts.append(
                    "<blockquote>"
                    + html.escape(snippet)
                    + "…<cite>Campaign Lab scrape excerpt, CC-BY</cite></blockquote>"
                )
        excerpt_html = "".join(excerpts) or '<p class="muted">No archived excerpt included.</p>'
        cards.append(
            f"""
<section class="card" id="p{record["personId"]}">
  <h2>{html.escape(record["name"])}</h2>
  <p class="meta">Democracy Club person ID <code>{record["personId"]}</code> ·
  {html.escape(str(record.get("party") or ""))}</p>
  <p><span class="label">Observed URL</span><br>
    <a href="{html.escape(record["url"])}">{html.escape(record["url"])}</a>{final_html}</p>
  <p><span class="label">Audit class</span> {html_status(record)}<br>
     <span class="label">Ledger signal</span> <code>{html.escape(str(record.get("changeSignal") or "unknown"))}</code></p>
  <p><a href="{html.escape(record["canonicalUrl"])}">Canonical Civicord record</a></p>
  {excerpt_html}
</section>"""
        )

    stats = seat.get("stats") or {}
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Civicord evidence mirror — {html.escape(seat["name"])}</title>
<style>
:root{{color-scheme:light;--ink:#17202a;--muted:#5d6b7a;--line:#d8e0e7;--paper:#fff;--wash:#f5f7f8;--red:#a61b1b}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font:17px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}}
main{{max-width:1040px;margin:auto;padding:48px 22px 80px}}header{{border-bottom:4px solid var(--ink);padding-bottom:28px;margin-bottom:28px}}
h1{{font-size:clamp(2rem,5vw,4rem);line-height:1;margin:.2rem 0 1rem;letter-spacing:-.04em}}h2{{margin-top:0}}a{{color:#064f8c}}
.notice{{border-left:5px solid var(--red);background:#fff7f7;padding:16px 18px;margin:22px 0}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:24px 0}}
.stat{{background:var(--wash);padding:16px}}.stat strong{{display:block;font-size:2rem}}table{{width:100%;border-collapse:collapse;margin:22px 0;font-size:.95rem}}th,td{{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}}th{{background:var(--wash)}}
.card{{border:1px solid var(--line);padding:22px;margin:20px 0}}.meta,.muted{{color:var(--muted)}}.label{{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}}code{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}}
blockquote{{margin:12px 0;padding:10px 14px;border-left:3px solid var(--line);color:#303b45}}cite{{display:block;font-size:.8rem;color:var(--muted);margin-top:6px}}nav a{{margin-right:16px}}footer{{margin-top:38px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:.92rem}}
</style>
</head>
<body><main>
<header>
<p class="meta">Civicord verifiable evidence mirror · versioned snapshot · generated {html.escape(generated_at)}</p>
<h1>{html.escape(seat["name"])}</h1>
<p>Seven candidate records from the published Civicord snapshot derived from the
{html.escape(audit_date)} audit baseline. This bundle carries its own methodology,
caveats, source attribution and hashes so it can be interpreted without relying
on the ordinary Civicord host.</p>
<nav><a href="methodology.md">methodology.md</a><a href="caveats.md">caveats.md</a><a href="candidates.json">candidates.json</a><a href="sources.json">sources.json</a><a href="manifest.json">manifest.json</a><a href="verify.html">verify.html</a></nav>
</header>

<div class="notice"><strong>Read before citing:</strong> every status here is an
HTTP-response class or audit heuristic, not evidence of intent. Surname matching
is a heuristic. Redirects are often technical or same-site artefacts. Claim
deletion counts are affected by scope mismatch and are omitted by default in
this v0 bundle.</div>

<div class="grid">
<div class="stat"><strong>{stats.get("candidates")}</strong>candidates</div>
<div class="stat"><strong>{stats.get("live")}</strong>HTTP-live rows</div>
<div class="stat"><strong>{stats.get("gone")}</strong>DNS-error rows</div>
<div class="stat"><strong>{stats.get("redirected")}</strong>redirected rows</div>
</div>

<h2>Cohort summary</h2>
<table><thead><tr><th>Candidate</th><th>Party</th><th>HTTP class</th><th>Redirected</th><th>Ledger signal</th></tr></thead><tbody>
{"".join(rows)}
</tbody></table>

{"".join(cards)}

<footer>
<p>Civicord-derived outputs: CC-BY. Campaign Lab extracted scrape text: reused
with credit under the documented CC-BY arrangement. Democracy Club roster/person
IDs: attributed open data. This mirror is a publication surface, not a new
canonical register.</p>
</footer>
</main></body></html>
"""


def verify_html(bundle_version: str, cohort_slug: str) -> str:
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verify this Civicord bundle</title>
<style>body{{max-width:840px;margin:40px auto;padding:0 20px;font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}}code,pre{{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}}pre{{background:#f5f7f8;padding:14px;overflow:auto}}</style>
</head><body>
<h1>Verify this Civicord bundle</h1>
<p>Bundle version: <code>{html.escape(bundle_version)}</code></p>
<p>This directory is a static evidence bundle. Its files are useful only if the
bytes match the hashes in <code>manifest.json</code> and, after publication, the
SHA-256 values recorded by the X Layer <code>SiteRegistry</code>.</p>
<h2>Local verification</h2>
<pre>python scripts/tapeout/evidence_bundle.py verify /path/to/bundle --self-test</pre>
<h2>Chain verification after publication</h2>
<p>Run the read-only direct-chain verifier with the published container address:</p>
<pre>python scripts/tapeout/verify_deweb.py /path/to/bundle \\
  --container &lt;container&gt; \\
  --prefix civicord/uk-2024-25/{html.escape(cohort_slug)}/{html.escape(bundle_version)}</pre>
<p>It pins one block, requires agreement between independent RPC operators,
checks the pinned <code>SiteRegistry</code> implementation, reads every file,
and verifies byte length plus SHA-256. It fails closed on disagreement. A manual
spot check can compare one file with:</p>
<pre>cast call &lt;SiteRegistry&gt; 'fileInfo(address,string)(uint32,string,bytes32,uint40,uint256)' &lt;container&gt; &lt;path&gt; --rpc-url https://rpc.xlayer.tech</pre>
</body></html>
"""


def content_type_for(path: str) -> str:
    suffix = Path(path).suffix.lower()
    return {
        ".html": "text/html; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
    }.get(suffix, "application/octet-stream")


def build(args: argparse.Namespace) -> Path:
    people, seats, claim_diffs = input_data()
    seat = seat_by_slug(seats, args.seat_slug)
    records = cohort_records(people, seat)
    export_tag = args.export_tag or datetime.now(UTC).strftime("%Y-%m")
    bundle_version = f"audit-{args.audit_date}-export-{export_tag}"
    out = args.out or DEFAULT_OUT_ROOT / seat["slug"] / bundle_version
    out = out.resolve()
    if out.exists():
        if not args.force:
            raise SystemExit(f"output exists: {out} (use --force for a local rebuild)")
        shutil.rmtree(out)
    out.mkdir(parents=True)

    generated_at = args.generated_at or utc_now()
    write_json(out / "candidates.json", {"cohort": records})
    write_json(out / "sources.json", sources_json(seat, args.audit_date))
    write_text(out / "methodology.md", methodology_text(seat, args.audit_date, generated_at))
    write_text(out / "caveats.md", caveats_text())
    write_text(out / "index.html", render_index(seat, records, args.audit_date, generated_at))
    write_text(out / "verify.html", verify_html(bundle_version, seat["slug"]))

    included_claims: dict[str, Any] = {}
    if args.include_claim_diffs:
        for record in records:
            person_id = record["personId"]
            row = claim_diffs.get(person_id)
            if row:
                copied = dict(row)
                copied["scopeExplanation"] = SCOPE_EXPLANATIONS.get(
                    copied.get("scope_note"), copied.get("scope_note")
                )
                included_claims[person_id] = copied
        write_json(out / "claim-diffs.json", {"claims": included_claims})

    file_entries = []
    for path in sorted(p for p in out.iterdir() if p.is_file() and p.name != "manifest.json"):
        rel = path.name
        data = path.read_bytes()
        file_entries.append(
            {
                "path": rel,
                "bytes": len(data),
                "sha256": sha256_bytes(data),
                "contentType": content_type_for(rel),
            }
        )

    person_ids = [record["personId"] for record in records]
    manifest = {
        "schema": SCHEMA,
        "generatedAt": generated_at,
        "bundleVersion": bundle_version,
        "methodologyVersion": METHODOLOGY_VERSION,
        "auditBaseline": args.audit_date,
        "cohort": {
            "kind": "uk-parliamentary-constituency",
            "name": seat.get("name"),
            "slug": seat.get("slug"),
            "gssCode": seat.get("gssCode"),
            "personIds": person_ids,
        },
        "canonicalUrls": {
            person_id: f"https://civicord.pages.dev/candidates/{person_id}"
            for person_id in person_ids
        },
        "sourceSnapshot": {
            "hashes": source_hashes(),
            "git": git_state(),
        },
        "publicationPolicy": {
            "versioned": True,
            "overwritePublishedSnapshot": False,
            "mirrorRole": "secondary publication surface; canonical records remain the reference",
        },
        "caveats": CAVEAT_PHRASES,
        "licence": {
            "civicordDerivedOutputs": "CC-BY",
            "campaignLabExtractedText": "CC-BY with credit",
        },
        "claimDiffsIncluded": bool(included_claims),
        "files": file_entries,
    }
    write_json(out / "manifest.json", manifest)

    print(f"built {out}")
    print(f"files={len(file_entries) + 1} payload_bytes={sum(f['bytes'] for f in file_entries)}")
    print(f"manifest_sha256={sha256_file(out / 'manifest.json')}")
    return out


def normalise_rel(path: str) -> str | None:
    if not path or path.startswith("/") or "\\" in path:
        return None
    parts = Path(path).parts
    if any(part in ("", ".", "..") for part in parts):
        return None
    return str(Path(path))


def verify_bundle(path: Path) -> tuple[list[str], list[str], dict[str, Any]]:
    errors: list[str] = []
    warnings: list[str] = []
    report: dict[str, Any] = {"bundle": str(path)}
    manifest_path = path / "manifest.json"
    if not manifest_path.exists():
        return ["missing manifest.json"], warnings, report
    try:
        manifest = load_json(manifest_path)
    except (json.JSONDecodeError, OSError, UnicodeDecodeError) as exc:
        return [f"manifest.json is not valid JSON: {exc}"], warnings, report

    if manifest.get("schema") != SCHEMA:
        errors.append(f"wrong schema: {manifest.get('schema')!r}")
    if manifest.get("methodologyVersion") != METHODOLOGY_VERSION:
        errors.append(f"wrong methodologyVersion: {manifest.get('methodologyVersion')!r}")
    if manifest.get("publicationPolicy", {}).get("overwritePublishedSnapshot") is not False:
        errors.append("publicationPolicy.overwritePublishedSnapshot must be false")

    entries = manifest.get("files")
    if not isinstance(entries, list) or not entries:
        errors.append("manifest.files must be a non-empty list")
        entries = []

    seen = set()
    for entry in entries:
        rel = normalise_rel(str(entry.get("path", "")))
        if not rel:
            errors.append(f"unsafe or missing path in manifest entry: {entry!r}")
            continue
        if rel in seen:
            errors.append(f"duplicate manifest path: {rel}")
        seen.add(rel)
        file_path = path / rel
        if not file_path.exists():
            errors.append(f"missing file: {rel}")
            continue
        data = file_path.read_bytes()
        if len(data) != entry.get("bytes"):
            errors.append(f"byte length mismatch: {rel}")
        if sha256_bytes(data) != entry.get("sha256"):
            errors.append(f"sha256 mismatch: {rel}")
        if len(data) > MAX_FILE_BYTES:
            errors.append(f"file exceeds DeWEB per-file limit: {rel}")
        if entry.get("contentType") != content_type_for(rel):
            errors.append(f"unexpected contentType for {rel}: {entry.get('contentType')!r}")

    missing_required = REQUIRED_PAYLOAD_FILES - seen
    if missing_required:
        errors.append(f"required payload files absent from manifest: {sorted(missing_required)}")

    actual = {str(p.relative_to(path)) for p in path.rglob("*") if p.is_file()}
    expected = set(seen) | {"manifest.json"}
    extras = actual - expected
    missing = expected - actual
    if extras:
        errors.append(f"unexpected files in bundle: {sorted(extras)}")
    if missing:
        errors.append(f"manifest files missing on disk: {sorted(missing)}")

    methodology = (
        (path / "methodology.md").read_text(encoding="utf-8")
        if (path / "methodology.md").exists()
        else ""
    )
    caveats = (
        (path / "caveats.md").read_text(encoding="utf-8") if (path / "caveats.md").exists() else ""
    )
    index = (
        (path / "index.html").read_text(encoding="utf-8") if (path / "index.html").exists() else ""
    )
    caveat_haystack = (methodology + caveats + index).lower()
    for phrase in CAVEAT_PHRASES:
        if phrase.lower() not in caveat_haystack:
            errors.append(f"required caveat phrase missing: {phrase}")

    if re.search(r"<script[^>]+src\s*=", index, re.IGNORECASE):
        errors.append("index.html references an external or separate script")
    if re.search(r"<link[^>]+href\s*=", index, re.IGNORECASE):
        errors.append("index.html references an external stylesheet or resource link")
    if re.search(r"<img[^>]+src\s*=", index, re.IGNORECASE):
        errors.append("index.html references an image resource")
    if re.search(r"<iframe\b", index, re.IGNORECASE):
        errors.append("index.html contains an iframe")

    try:
        candidates = load_json(path / "candidates.json")["cohort"]
        candidate_ids = [str(row["personId"]) for row in candidates]
        manifest_ids = [str(x) for x in manifest.get("cohort", {}).get("personIds", [])]
        if candidate_ids != manifest_ids:
            errors.append("cohort personIds do not match candidates.json order/content")
        canonical = manifest.get("canonicalUrls", {})
        for person_id in candidate_ids:
            if canonical.get(person_id) != f"https://civicord.pages.dev/candidates/{person_id}":
                errors.append(f"canonicalUrl mismatch for person {person_id}")
    except (json.JSONDecodeError, OSError, KeyError, TypeError, UnicodeDecodeError) as exc:
        errors.append(f"candidates.json cohort validation failed: {exc}")

    if manifest.get("claimDiffsIncluded"):
        claim_path = path / "claim-diffs.json"
        if not claim_path.exists():
            errors.append("claimDiffsIncluded=true but claim-diffs.json is missing")
        else:
            try:
                claims = load_json(claim_path).get("claims", {})
                for person_id, row in claims.items():
                    if not row.get("scopeExplanation"):
                        errors.append(f"claim diff lacks scopeExplanation: {person_id}")
            except (json.JSONDecodeError, OSError, TypeError, UnicodeDecodeError) as exc:
                errors.append(f"claim-diffs.json validation failed: {exc}")
    elif (path / "claim-diffs.json").exists():
        warnings.append("claim-diffs.json exists but manifest says claim diffs are not included")

    report.update(
        {
            "schema": manifest.get("schema"),
            "bundleVersion": manifest.get("bundleVersion"),
            "fileCount": len(entries) + 1,
            "manifestSha256": sha256_file(manifest_path),
            "errors": len(errors),
            "warnings": len(warnings),
        }
    )
    return errors, warnings, report


def negative_copy_test(src: Path, mutate) -> bool:
    with tempfile.TemporaryDirectory() as td:
        dst = Path(td) / "bundle"
        shutil.copytree(src, dst)
        mutate(dst)
        errors, _, _ = verify_bundle(dst)
        return bool(errors)


def self_test(path: Path) -> list[str]:
    failures = []

    original_errors, _, _ = verify_bundle(path)
    if original_errors:
        failures.append("original bundle does not verify")

    def corrupt_candidates(dst: Path) -> None:
        target = dst / "candidates.json"
        target.write_bytes(target.read_bytes() + b" ")

    def remove_methodology(dst: Path) -> None:
        (dst / "methodology.md").unlink()

    def corrupt_schema(dst: Path) -> None:
        manifest = load_json(dst / "manifest.json")
        manifest["schema"] = "wrong"
        write_json(dst / "manifest.json", manifest)

    def remove_caveat_text(dst: Path) -> None:
        write_text(dst / "caveats.md", "# Caveats\n\nRemoved.\n")

    cases = {
        "altered candidates.json bytes": corrupt_candidates,
        "missing methodology.md": remove_methodology,
        "wrong schema": corrupt_schema,
        "caveat text removed": remove_caveat_text,
    }
    for name, mutate in cases.items():
        if not negative_copy_test(path, mutate):
            failures.append(f"negative test did not fail closed: {name}")
    return failures


def verify(args: argparse.Namespace) -> int:
    path = args.bundle.resolve()
    errors, warnings, report = verify_bundle(path)
    if args.self_test:
        failures = self_test(path)
        errors.extend(f"self-test: {failure}" for failure in failures)
        report["selfTested"] = True
    report["errors"] = len(errors)
    report["warnings"] = len(warnings)
    if args.json:
        print(json.dumps({"report": report, "errors": errors, "warnings": warnings}, indent=2))
    else:
        print(f"bundle={path}")
        print(f"schema={report.get('schema')} version={report.get('bundleVersion')}")
        print(f"manifest_sha256={report.get('manifestSha256')}")
        if errors:
            print("errors:")
            for error in errors:
                print(f"  - {error}")
        if warnings:
            print("warnings:")
            for warning in warnings:
                print(f"  - {warning}")
        if not errors:
            print("verification passed")
    return 1 if errors else 0


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    sub = root.add_subparsers(dest="command", required=True)

    build_p = sub.add_parser("build", help="build a versioned evidence bundle")
    build_p.add_argument("--seat-slug", default=DEFAULT_SEAT_SLUG)
    build_p.add_argument("--audit-date", default=DEFAULT_AUDIT_DATE)
    build_p.add_argument("--export-tag", default=None)
    build_p.add_argument("--generated-at", default=None)
    build_p.add_argument("--out", type=Path, default=None)
    build_p.add_argument("--include-claim-diffs", action="store_true")
    build_p.add_argument("--force", action="store_true", help="replace a local generated output")
    build_p.set_defaults(func=build)

    verify_p = sub.add_parser("verify", help="verify a bundle")
    verify_p.add_argument("bundle", type=Path)
    verify_p.add_argument("--self-test", action="store_true")
    verify_p.add_argument("--json", action="store_true")
    verify_p.set_defaults(func=verify)
    return root


def main() -> int:
    args = parser().parse_args()
    result = args.func(args)
    return result if isinstance(result, int) else 0


if __name__ == "__main__":
    sys.exit(main())
