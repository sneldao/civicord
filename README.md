# Civicord

**A permanent, verifiable public record of what political campaigns published** —
which sites are still live, what content changed, and which claims quietly
disappeared. Built as a public good: free to read, openly licensed, and designed
to work for **any democracy**. The **United Kingdom is the genesis dataset**
(2,375 candidates, 650 jurisdictions); the pipeline itself is region-agnostic.

Built on [Campaign Lab's April 2025 candidate-website scrape](https://github.com/CampaignLab/candidate-website-scrape),
keyed on [Democracy Club](https://candidates.democracyclub.org.uk/) person IDs,
and extended backwards via the Wayback Machine. The UK has the canonical roster
and a national election web crawl, but nobody joins them into per-candidate,
longitudinal change tracking as open data. The US analogues are EDGI's
web-monitoring and the Library of Congress's Elections Web Archive — see
[RESEARCH.md](RESEARCH.md).

## Status

**2026-09-12 · Change feed + Wayback significance spike.** Product north star:
a **citable change feed** ([docs/change-feed.md](docs/change-feed.md)).
Audit-derived signals (`gone` / `repurposed_suspect` / `redirected` /
`still_attested`) on records + browse `?change=`. Wayback CDX spike (~135
persons, 112 scored) → `content_diffs.json`, candidate **Content chronology**,
browse `?sig=` ([docs/wayback-spike.md](docs/wayback-spike.md)). Survival
register (ENS + ledger + Graph) remains the spine. Full-corpus diffs + policy
taxonomy still open.

**2026-09-11 · Phase 0 + map + seat context + gateway LIVE (3,031 html + 652 json + 650 deeds).** Liveness audit of all 2,375 scraped candidate
websites: **64% still live ~17 months after the scrape** — 363 domains gone
entirely, 372 serving HTTP errors, 659 URLs redirect elsewhere ([docs/phase0-findings.md](docs/phase0-findings.md)). Homepage is narrative-only with cohort cards and hero search →
`/browse` (paginated ledger, 50/page, deep-linkable filters); the 2,375-row wall is gone. Disclosure stack:
`summary → cohort → filtered ledger → record → archived pages`. Cartography research (Parallel Search API, 22 sources) in [docs/cartography.md](docs/cartography.md) — now **shipped**: halftone hex (Automatic Knowledge v5, 435 KB, OGL) on `/` and `/browse` (650 hexes, colour + dot-size double-encoded), 650 `/constituencies/[slug]` pages, ledger↔map sync via `?constituency`, and candidate→seat linkage on 1,607 records (hex thumb + `n of m live` + deep links to seat + filtered ledger). **Gateway LIVE** ([gateway/recipe.md](gateway/recipe.md), `openapi.yaml`) — `https://civicord-aieyq.bazgateway.com` (handle, also `3se6sbx…bazgateway.com`, `MCP Live · 5 tools` at `/mcp`, Marketplace *Pending verification* `/services/3se6sbxfgjfh3fw4gjpytkcroa`, upstream `civicord.pages.dev`, payout `0x96F3…7446`): static `GET /api/constituencies[/{slug}]` + `/api/summary` + 650 stipple deeds `GET /og/constituencies/{slug}.svg` (1200×630) with `og:image` on every seat page — the `?constituency=` query is Bazantic's pay-per-seat unit (`100`/`200` mcents, humans browse free at `civicord.pages.dev`). Build: `3031` html pages + `652` API json + `650` deeds, no backend, no Maps API. What's next: [docs/plan.md](docs/plan.md).

### Region model (added 2026-09-11)

The unit of the project is a **jurisdiction** — any electoral area a candidate
stands in (a UK constituency today; a French circonscription or a US district
would work identically). The landing page, the map and the data model are built
around that abstraction; `Civicord` is the protocol, `UK 2024–25` is deployment #1.

Nothing was renamed for the hackathon: `/constituencies/[slug]`,
`/api/constituencies[/{slug}]` and the Bazantic pay-per-seat `?constituency=`
unit are the **live contract, unchanged**. `constituency` is simply the current
name of a jurisdiction instance. Adding a region needs three inputs — a public
roster, a crawl, and the same record store — and is discussed on the landing
page under *“Built for one election. Designed for any.”*

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
civicord changes                  # change signals → data/out/changes_v0.csv
civicord wayback-spike --limit 310 # Phase 1 CDX+id_ sample → data/out/wayback_spike/
civicord diff-spike               # normalize extracts + significance (offline)
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
| [docs/architecture.md](docs/architecture.md) | System design, data model, data sources, pipeline, map layer |
| [docs/cartography.md](docs/cartography.md) | **New** — halftone hex + pointillist map UX, hex comparison, visual-encoding & a11y methods (Parallel research, 22 sources) |
| [gateway/recipe.md](gateway/recipe.md) + [`frontend/public/openapi.yaml`](frontend/public/openapi.yaml) | Bazantic Recipe + OpenAPI — the agent gateway (pay-per-`?constituency=` query, x402/MPP) |
| [`/api/constituencies/{slug}.json`](frontend/src/pages/api/constituencies/[slug].json.ts) · [`/api/summary.json`](frontend/src/pages/api/summary.json.ts) | Static jurisdiction API (metered by Bazantic, free on the site) |
| [`/og/constituencies/{slug}.svg`](frontend/scripts/build-og.mjs) | 650 stipple-deed share cards (1200×630 SVG from one template) |
| [skills/civicord-graph/SKILL.md](skills/civicord-graph/SKILL.md) | Agent skill — live Subgraph Studio queries + ledger join |
| [docs/phase0-findings.md](docs/phase0-findings.md) | Phase 0 liveness-audit baseline (64% live) |
| [docs/change-feed.md](docs/change-feed.md) | North star: change signals v0 + content chronology roadmap |
| [docs/wayback-spike.md](docs/wayback-spike.md) | Wayback CDX spike findings + significance classes |
| [docs/outreach.md](docs/outreach.md) | Partner strategy and draft outreach emails |
| [RESEARCH.md](RESEARCH.md) | Adjacent projects, validated gaps, prior art |

## Continuity (ETHGlobal / The Graph)

Civicord predates the AI×Graph deepening. **Pre-existing:** ENSv2 registry, static audit ledger, Subgraph Studio deploy, Bazantic x402 gateway. **During Continuity work:** live Studio consumption in WebMCP (`compare_onchain_to_ledger`), same-origin `/api/graph` proxy, AgentView “Query The Graph”, `skills/civicord-graph/SKILL.md`, and subgraph **v0.0.4** (namehash fix so `TextChanged` joins candidates). Demo checklist: [docs/demo-checklist.md](docs/demo-checklist.md).

## AI-assisted development

Development is human-directed with AI coding assistance (Cline): pipeline
implementation, frontend scaffolding, and docs drafting. Architecture, data
and design decisions, and project direction are human calls. Noted for
transparency per hackathon rules.

## License

Code: [AGPL-3.0](LICENSE) (aligning with Democracy Club's approach).
Datasets: CC-BY for Civicord-derived outputs; Campaign Lab April 2025 scrape
text reusable with credit (CC-BY) — agreed 2026-09-12.
