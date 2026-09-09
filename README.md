# Civicord

**An open, longitudinal tracker of UK candidate and MP websites** — which sites
are still live, what content changed, and which claims quietly disappeared.

Built on [Campaign Lab's April 2025 candidate-website scrape](https://github.com/CampaignLab/candidate-website-scrape),
keyed on [Democracy Club](https://candidates.democracyclub.org.uk/) person IDs,
and extended backwards via the Wayback Machine. The UK has the canonical roster
and a national election web crawl, but nobody joins them into per-candidate,
longitudinal change tracking as open data. The US analogues are EDGI's
web-monitoring and the Library of Congress's Elections Web Archive — see
[RESEARCH.md](RESEARCH.md).

## Status

**2026-09-09 · Phase 0 + progressive disclosure split complete.** Liveness audit of all 2,375 scraped candidate
websites: **64% still live ~17 months after the scrape** — 363 domains gone
entirely, 372 serving HTTP errors, 659 URLs redirect elsewhere ([docs/phase0-findings.md](docs/phase0-findings.md)). Homepage is now narrative-only with cohort cards and hero search →
`/browse` (paginated ledger, 50/page, deep-linkable filters); the 2,375-row wall is gone. Disclosure stack:
`summary → cohort → filtered ledger → record → archived pages`. What's next: [docs/plan.md](docs/plan.md).

## Development

```bash
git clone https://github.com/sneldao/civicord.git && cd civicord
cp .env.example .env     # keys never committed; gitleaks runs in pre-commit
pre-commit install       # secrets scanning + ruff lint/format

# Pipeline (Python)
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
civicord download --full          # Campaign Lab scrape → data/raw/
civicord ingest                   # → data/out/{candidacies,websites,pages}.csv
civicord audit --content-check    # liveness pass → data/out/audit_liveness.csv
civicord report                   # → data/out/audit_report.md
pytest

# Frontend (Astro 7, fully static — reads pipeline CSVs at build time)
cd frontend && npm install && npm run dev
```

The frontend works out of the box on a fresh clone: a prebuilt
`frontend/src/data/candidates.json` snapshot is committed and used whenever
`data/out/*.csv` is absent. Run the pipeline first if you want the frontend
rebuilt from your own audit outputs.

Deployed via Cloudflare Pages (https://civicord.pages.dev); see
[docs/ops.md](docs/ops.md) for the deploy/data-refresh runbook.

## Documentation

| Doc | Purpose |
| --- | --- |
| [docs/plan.md](docs/plan.md) | Delivery plan, current sprint, risks & blockers |
| [docs/ops.md](docs/ops.md) | Internal runbook: Cloudflare accounts, deploys, data snapshots, gotchas |
| [docs/architecture.md](docs/architecture.md) | System design, data model, data sources, pipeline |
| [docs/phase0-findings.md](docs/phase0-findings.md) | Phase 0 liveness-audit baseline (64% live) |
| [docs/outreach.md](docs/outreach.md) | Partner strategy and draft outreach emails |
| [RESEARCH.md](RESEARCH.md) | Adjacent projects, validated gaps, prior art |

## AI-assisted development

Development is human-directed with AI coding assistance (Cline): pipeline
implementation, frontend scaffolding, and docs drafting. Architecture, data
and design decisions, and project direction are human calls. Noted for
transparency per hackathon rules.

## License

Code: [AGPL-3.0](LICENSE) (aligning with Democracy Club's approach).
Datasets: CC-BY (TBC — blocked on Campaign Lab clarifying the scrape's license).
