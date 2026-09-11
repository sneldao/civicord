"""Download and parse Campaign Lab's candidate-website-scrape data.

Source: https://github.com/CampaignLab/candidate-website-scrape
- assets/data/candidates.csv  — one row per candidacy, incl. homepage_url
- assets/json/{person_id}_{Name}.json — flat dict of page-path -> extracted text
Filenames and person_id values are Democracy Club person IDs.
"""

from __future__ import annotations

import csv
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import httpx

logger = logging.getLogger(__name__)

REPO = "CampaignLab/candidate-website-scrape"
BRANCH = "main"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}"
CANDIDATES_CSV = "assets/data/candidates.csv"
CANDIDATES_FULL_CSV = "assets/data/candidatesfull_25-12-12.csv"
LARGE_JSON_DIR = "assets/large_json"

USER_AGENT = "civicord/0.1 (+https://github.com/sneldao/civicord)"


@dataclass
class Candidacy:
    person_id: str
    person_name: str
    election_id: str
    ballot_paper_id: str
    election_date: str
    party_name: str
    party_id: str
    post_label: str
    homepage_url: str


@dataclass
class Website:
    """A unique person+website pair, deduped across candidacies."""

    person_id: str
    person_name: str
    url: str
    elections: list[str] = field(default_factory=list)
    parties: list[str] = field(default_factory=list)
    posts: list[str] = field(default_factory=list)


@dataclass
class PageText:
    person_id: str
    page_key: str
    char_count: int
    text: str


def normalize_url(url: str) -> str | None:
    """Normalize a homepage URL for dedup; return None if unusable."""
    url = (url or "").strip()
    if not url or not url.startswith(("http://", "https://")):
        return None
    parts = urlsplit(url)
    if not parts.netloc:
        return None
    host = parts.netloc.lower().rstrip(".")
    path = parts.path.rstrip("/")
    return urlunsplit((parts.scheme.lower(), host, path, "", ""))


def parse_candidates_csv(path: Path) -> list[Candidacy]:
    """Parse the Campaign Lab candidates.csv into Candidacy records."""
    candidacies: list[Candidacy] = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            url = normalize_url(row.get("homepage_url", ""))
            if not url:
                continue
            candidacies.append(
                Candidacy(
                    person_id=row["person_id"].strip(),
                    person_name=row["person_name"].strip(),
                    election_id=row["election_id"].strip(),
                    ballot_paper_id=row["ballot_paper_id"].strip(),
                    election_date=row["election_date"].strip(),
                    party_name=row["party_name"].strip(),
                    party_id=row["party_id"].strip(),
                    post_label=row["post_label"].strip(),
                    homepage_url=url,
                )
            )
    return candidacies


def websites_from_candidacies(candidacies: list[Candidacy]) -> list[Website]:
    """Collapse candidacies into unique person+website rows (URLs normalized here)."""
    merged: dict[tuple[str, str], Website] = {}
    for c in candidacies:
        url = normalize_url(c.homepage_url) or c.homepage_url
        key = (c.person_id, url)
        if key not in merged:
            merged[key] = Website(person_id=c.person_id, person_name=c.person_name, url=url)
        w = merged[key]
        for bucket, value in (
            (w.elections, c.election_id),
            (w.parties, c.party_name),
            (w.posts, c.post_label),
        ):
            if value not in bucket:
                bucket.append(value)
    return list(merged.values())


def parse_candidate_json(path: Path, person_id: str | None = None) -> list[PageText]:
    """Parse one per-candidate JSON (dict of page-key -> text)."""
    person_id = person_id or path.name.split("_")[0]
    pages: list[PageText] = []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        logger.warning("Unexpected JSON shape in %s", path.name)
        return pages
    for page_key, text in data.items():
        text = (text or "").strip()
        pages.append(
            PageText(person_id=person_id, page_key=page_key, char_count=len(text), text=text)
        )
    return pages


def list_json_files(limit: int | None = None, large: bool = False) -> list[str]:
    """List per-candidate JSON paths via the GitHub git-trees API.

    large=True selects assets/large_json/ (the ~1,300 candidates' full page
    text that assets/json/ only stubs), closing the ingest coverage gap in
    docs/plan.md. Both directories use the same {person_id}_{Name}.json scheme.
    """
    prefix = f"{LARGE_JSON_DIR}/" if large else "assets/json/"
    url = f"https://api.github.com/repos/{REPO}/git/trees/{BRANCH}?recursive=1"
    resp = httpx.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    tree = resp.json().get("tree", [])
    paths = [
        entry["path"]
        for entry in tree
        if entry.get("type") == "blob"
        and entry["path"].startswith(prefix)
        and entry["path"].endswith(".json")
    ]
    paths.sort()
    return paths[:limit] if limit else paths


def wayback_cdx_url(url: str, from_ts: str = "20250401", to_ts: str = "20250501") -> str:
    """Build a Wayback CDX query URL for one page (Phase 1 backfill stub).

    Phase 1 (docs/plan.md): for the ~863 non-live sites, query the CDX API for
    snapshots around the April 2025 scrape, then fetch with the `id_` suffix to
    strip the Wayback toolbar and sha256 the body. This helper only builds the
    query — fetching/hashing lands with the Phase 1 wayback module.
    """
    from urllib.parse import quote

    return (
        "https://web.archive.org/cdx/search/cdx"
        f"?url={quote(url, safe='')}&from={from_ts}&to={to_ts}"
        "&output=json&fl=timestamp,original,statuscode,digest&filter=statuscode:200"
        "&collapse=timestamp:6"
    )


def download_file(repo_path: str, dest: Path) -> Path:
    """Download one file from the scrape repo into dest (parent dirs created)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.stream(
        "GET",
        f"{RAW_BASE}/{repo_path}",
        headers={"User-Agent": USER_AGENT},
        timeout=60,
        follow_redirects=True,
    ) as resp:
        resp.raise_for_status()
        with open(dest, "wb") as f:
            f.writelines(resp.iter_bytes())
    return dest
