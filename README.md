# Civicord

**A longitudinal tracker of UK political candidate and representative websites.**

Civicord turns one-off snapshots of candidate websites into a living, queryable
dataset: which sites are still live, what content has changed, which pages and
claims have disappeared, and how messaging shifts after elections, scandals,
office changes and local events.

It builds directly on [Campaign Lab's candidate-website-scrape](https://github.com/CampaignLab/candidate-website-scrape)
(April 2025 scrape) and extends it forward — and backwards via the Wayback
Machine — into an open, maintained record of political messaging change.

## Why

- **The gap:** The US has both halves of this (the Library of Congress's 20-year
  [US Elections Web Archive](https://www.loc.gov/collections/united-states-elections-web-archive/about-this-collection/)
  and EDGI's open-source
  [web-monitoring](https://github.com/edgi-govdata-archiving/web-monitoring)).
  The UK has a canonical roster ([Democracy Club](https://candidates.democracyclub.org.uk/))
  and a national election web crawl ([UK Web Archive](https://www.webarchive.org.uk/)),
  but **no one joins them into per-candidate, longitudinal change tracking** as open data.
- **The precedent:** "Politicians quietly deleting things" has proven public value
  (ProPublica's Politwoops archived 500k+ deleted tweets before it shut down).
- **The maintenance problem:** candidate websites rot, get repurposed, or vanish
  after elections. Nobody currently maintains a database of *who has what website,
  and what happened to it*.

## What we're building

An open dataset + lightweight product with three layers:

1. **Identity layer** — a maintained database of candidates and representatives,
   keyed on Democracy Club person IDs, joined to their websites over time.
2. **Archive layer** — snapshots from three sources stitched together per site:
   Campaign Lab's April 2025 scrape, Wayback Machine CDX history, and our own
   periodic live crawls.
3. **Change layer** — text-level diffs between snapshots with significance
   scoring, topic tags, deleted-claim detection, and per-candidate change logs.

Outputs: searchable archive, per-candidate change timelines, topic-shift analysis
over time, and alerts for meaningful changes on candidate/MP websites.

## Documentation

| Doc | Purpose |
| --- | --- |
| [RESEARCH.md](RESEARCH.md) | Adjacent projects, validated gaps, prior art |
| [docs/architecture.md](docs/architecture.md) | System design, data model, pipeline phases |
| [docs/roadmap.md](docs/roadmap.md) | Phased delivery plan (audit → MVP → monitoring) |
| [docs/outreach.md](docs/outreach.md) | Partner strategy and draft outreach emails |
| [docs/data-sources.md](docs/data-sources.md) | Every data source, access method, and license status |

## Development

```bash
git clone https://github.com/your-org/civicord.git
cd civicord
cp .env.example .env   # add your keys (never commit .env)
pre-commit install     # secrets scanning + linting on every commit
```

- **Secrets:** `.env` is gitignored; gitleaks runs in a pre-commit hook and
  blocks commits containing credentials.
- **Linting:** ruff (lint + format) via pre-commit.
- **Search API:** Parallel Search (key in `.env` as `PARALLEL_AI_API_KEY`).

## Status

Pre-code. Currently: research complete, architecture drafted, first partner
conversations underway (Campaign Lab, Democracy Club, UK Web Archive, EDGI).
First milestone: the **data audit** (see [docs/roadmap.md](docs/roadmap.md)).

## License

Code: [AGPL-3.0](LICENSE) (aligning with Democracy Club's approach).
Datasets: CC-BY (TBC — blocked on Campaign Lab clarifying the scrape's license).
