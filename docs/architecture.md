# Architecture

## Design principles

1. **Aggregate the archivers — don't rebuild the archive.** Wayback, UK Web
   Archive, and Campaign Lab's scrape are the data layer. Civicord's innovation
   is identity resolution and change extraction, not crawling infrastructure.
2. **Batch before realtime.** Monthly crawls and diff jobs beat always-on
   monitoring for a project at this stage. GitHub Actions cron is enough for v1.
3. **Every fact traceable to a source.** Each snapshot/change record carries
   (source, URL, timestamp, method) — Democracy Club's attribution model.
4. **Proven schemas over invented ones.** Mirror the Library of Congress's
   Elections Web Archive data package structure (metadata.csv + CDX indexes)
   so civicord is legible to web-archive researchers from day one.
5. **Privacy-aware.** Candidate sites are personal data (GDPR). Publish derived
   text/diffs openly; keep raw HTML access-controlled.

## Data model (v1)

```
candidates          # one row per person, Democracy Club person_id as key
  person_id (PK)          # stable across elections (Democracy Club)
  name, party, constituency
  election_status         # won / lost / not_standing
  elected_date

websites            # one row per website a person has had
  website_id (PK)
  person_id (FK)
  url
  first_seen, last_checked
  is_live
  source              # campaign_lab | democracy_club | discovered

snapshots           # one row per captured version of a website/page
  snapshot_id (PK)
  website_id (FK)
  captured_at
  source              # campaign_lab_scrape | wayback | live_crawl
  content_hash (sha256)
  raw_html_path       # local/WARC pointer, access-controlled
  wayback_url

changes             # diffs between consecutive snapshots
  change_id (PK)
  website_id (FK)
  from_snapshot_id, to_snapshot_id
  change_type           # added | removed | modified | page_gone
  section, old_text, new_text
  significance_score    # heuristic first, model later
  topic_tags[]
  detected_at

sources             # attribution for every ingested fact
  source_id (PK), kind, url, retrieved_at, license
```

Storage: SQLite/DuckDB for the audit phase → PostgreSQL when multi-writer or
public API is needed (schema stays the same; Supabase only if we want hosted
REST/Realtime, since it's Postgres underneath).

## Pipeline phases

```
┌─────────┐   ┌────────┐   ┌─────────┐   ┌──────┐   ┌──────────┐
│  ingest  │──▶│ audit  │──▶│ wayback │──▶│ diff │──▶│  outputs │
└─────────┘   └────────┘   └─────────┘   └──────┘   └──────────┘
  YNR JSON,    liveness,     CDX query,    text diff,  change log site
  Campaign     coverage      id_ fetch,    significance, static site,
  Lab JSON     stats         sha256        topic tags   Parquet/CDX export
```

- **ingest** — Campaign Lab `assets/json` + Democracy Club YNR export → tidy
  candidates/websites tables.
- **audit** — HEAD/GET every URL; measure live rate, redirects, repurposing.
  *This number decides how much of the rest is worth building.*
- **wayback** — CDX API per URL around (a) the April 2025 scrape date and
  (b) the July 2024 GE; fetch with `id_` suffix to strip toolbar; hash + store.
- **diff** — text-level diff (trafilatura-extracted markdown + difflib) between
  consecutive snapshots; significance heuristics (% changed, section weight,
  page type). LLM claim-extraction is a later, optional pass.
- **outputs** — static per-candidate timelines (GitHub Pages, like Campaign
  Lab's), plus bulk Parquet + CDX-style index exports.

## Data sources

| Source | What it gives us | Access | License/status |
| --- | --- | --- | --- |
| Campaign Lab candidate-website-scrape | April 2025 per-candidate scrape (per-section text + source URLs) | GitHub repo, public | ⚠️ No license file — clarify before public reuse |
| Democracy Club Candidates (YNR) | Canonical roster: person IDs (stable across elections), party, constituency, results | Free downloads + API | Open (attribution) |
| Wayback Machine (CDX API) | Historical snapshots incl. dead domains; `id_` suffix strips toolbar | Free API | Public |
| UK Web Archive (British Library) | Election web collections (2024 access ⚠️ to verify) | Legal Deposit — mostly reading-room | Restricted |
| Library of Congress US Elections Web Archive | CDX indexes + metadata.csv — schema template, not data | Bulk download | Public |
| EDGI web-monitoring | Open-source crawl→version→diff pipeline | GitHub | Open source |
| End of Term Web Archive | Seed-nomination + consortium operating model | eotarchive.org | Public |
| British Election Study | 2024 results + candidate data (won/lost cross-check) | Free download | Academic |
| TheyWorkForYou (mySociety) | MP activity/offices for candidate→MP joins | API | Open |
| electionresults.uk / Electoral Commission | Result validation | CSV | Open (OGL) |

Access per phase: Phase 0 = scrape + YNR (done) · Phase 1 = Wayback CDX ·
Phase 2+ = own robots-aware, rate-limited crawler identifying as civicord.

## What we deliberately did NOT choose (v1)

- **changedetection.io / n8n** — UI-centric products; awkward to drive
  programmatically at 3k+ URLs. A plain httpx crawler + GitHub Actions wins.
- **Supabase** — operational surface we don't need yet; Postgres later.
- **LDA/BERTopic** — topic mush on homepage text. A fixed policy taxonomy
  (economy/NHS/immigration/climate/…) classified per section is more useful
  for the journalist/researcher user stories.
- **Visual diffs** — nice-to-have; text diffs are the dataset.

## Prior art we build on

- **EDGI web-monitoring** — study their version/diff data model and diff UX
  before writing ours; consider contributing upstream.
- **Library of Congress US Elections Web Archive** — metadata.csv + CDX package
  structure; bulk-download ethos.
- **End of Term Web Archive** — seed nomination + consortium operating model.

See [../RESEARCH.md](../RESEARCH.md) for the full validated landscape.
