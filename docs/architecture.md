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

## Data model (v1 + constituency/map + gateway — 2026-09-11)

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

constituencies      # 650 Westminster seats — jurisdiction layer for the map (new)
  pcon24cd (PK)           # ONS Government Statistical Service code, e.g. E14000530
  pcon24nm                # English name, e.g. "Aldershot"
  pcon24nmw               # Welsh name where applicable (Ynys Môn / Anglesey)
  region                  # ONS region / nation (for exploded HoC toggle)
  hex_q, hex_r            # Automatic Knowledge v5 axial coords (equal-weight layout)
  buc_topo_ref            # feature id into buc-topo.json (inset + point-in-poly)

constituency_stats   # derived at build from audit × constituencies join
  pcon24cd (FK)
  sites, candidates, live, gone, redirected, onchain
  live_share              # live/sites — drives halftone dot size/density
```

Storage: SQLite/DuckDB for the audit phase → PostgreSQL when multi-writer or
public API is needed (schema stays the same; Supabase only if we want hosted
REST/Realtime, since it's Postgres underneath). For the map, the 650-row
`constituencies` + `constituency_stats` are materialised at build time as
`frontend/src/data/constituencies.json` (~90 KB) + `hex.json` (HexJSON) +
`buc-topo.json` (TopoJSON, ~45 KB) — no runtime DB, no tile server. Join key:
`websites.posts` (Democracy Club label) → `PCON24NM` literal, with ~30 manual
fixes for 2023-review renames and Welsh `PCON24NMW` fallback; fuzzy fallback
reuses the existing `fuzzyMatch` subsequence matcher (see [cartography.md](cartography.md)).

### Jurisdiction abstraction (2026-09-11)

`constituencies` is **not** a UK concept — it is one deployment of a jurisdiction
layer. A *jurisdiction* is any electoral unit a candidate stands in: a UK
constituency, a French circonscription, a US district. The map, the seat pages,
the JSON API and the Bazantic meter all key on that unit; the UK is simply the
region that currently has data. The visual encoding is deliberately generic —
one polygon, one colour, one dot density per jurisdiction, no basemap and no
tile server — so `577` circonscriptions or `435` districts would render with the
same code path.

**Nothing is renamed for the hackathon.** The live contract is unchanged:
`/constituencies/[slug]`, `/api/constituencies[/{slug}]`, `/og/constituencies/{slug}.svg`
and the Bazantic `?constituency=` pay-per-seat unit all stay as they are, because
judges, the gateway spec and every shared link depend on them. A second region
would add a `region` field to the payload and an alias `?jurisdiction=`
alongside `?constituency=` — not a new schema, and not a URL break. The landing
page (`frontend/src/pages/index.astro`) states the abstraction explicitly via a
region picker and an *“Add your region”* section.

## Pipeline phases

```
┌─────────┐   ┌────────┐   ┌─────────┐   ┌──────┐   ┌──────────┐    ┌───────┐
│  ingest  │──▶│ audit  │──▶│ wayback │──▶│ diff │──▶│  outputs │───▶│  map  │
└─────────┘   └────────┘   └─────────┘   └──────┘   └──────────┘    └───────┘
  YNR JSON,    liveness,     CDX query,    text diff,  change log site   hex + constituency
  Campaign     coverage      id_ fetch,    significance, static site,    halftone, pointillist,
  Lab JSON     stats         sha256        topic tags   Parquet/CDX export  650 pages, OG cards
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
- **map** (build-time, 2026-09-10) — JOIN `posts → PCON24CD` via ONS Names
  & Codes V2 (see Data sources), count per-constituency `live/gone/redirected`,
  render halftone hex (equal-weight, Automatic Knowledge v5) + pointillist hero
  (2,375 dots inside ONS BUC clip) as static SVG, emit 650
  `/constituencies/[slug]` pages + 650 stipple deeds `build-og.mjs`
  (1200×630 SVG from 1 template, 2.5 MB, copied via `public/og/`). Script:
  `frontend/scripts/build-map.mjs` (Node: D3 + TopoJSON + HexJSON), invoked by
  `astro build` (`prebuild` chain). No Maps API, no runtime. Design system in
  [cartography.md](cartography.md): halftone = `radial-gradient` SVG
  `<pattern>` + `mix-blend-mode: multiply` + `contrast()`, dot `r = 1.5 +
  (1-liveShare)*3.5px`, colour + size double-encoding for accessibility/print.
  Inset = ONS BUC TopoJSON. See cartography §3 for the full static stack and
  size budget (`34M` dist, `4342` files incl. 650 OG).
- **gateway** (static, 2026-09-11 — **LIVE**) — `openapi.yaml` (`frontend/public/openapi.yaml`,
  277 lines) + Recipe (`gateway/recipe.md`) + static API routes
  `GET /api/constituencies`, `GET /api/constituencies/{slug}` (650 prerendered
  JSON, the x402/MPP pay-per-`?constituency=` unit `100`/`200` mcents),
  `GET /api/summary` (free), `GET /og/constituencies/{slug}.svg` (free,
  1200×630 deed). No backend — Cloudflare Pages serves prerendered JSON/SVG
  (extensionless `GET /api/*` aliased via `frontend/public/_worker.js`,
  `cb09faf`, with `?country=&region=&limit=` query handling); Bazantic
  gateways the metered route at `https://civicord-aieyq.bazgateway.com`
  (handle, also `3se6sbx…bazgateway.com`, `MCP Live · 5 tools` at `/mcp`,
  Marketplace *Pending verification* `/services/3se6sbxfgjfh3fw4gjpytkcroa`,
  upstream `civicord.pages.dev`, payout `0x96F3…7446`). Humans still browse
  free at `civicord.pages.dev`. See `gateway/recipe.md` for agent binding,
  pricing, and test cURL.

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
| Automatic Knowledge WPC hex v5 (June 2024) | 650 equal hexes, one hex = one seat, `uk-wpc-hex-constitcode-v5-june-2024.geojson` (435 KB) | automaticknowledge.org/wpc-hex | OGL — **primary hex for the map** |
| ONS Westminster ParCon July 2024 Boundaries UK **BUC** (Ultra Generalised 500 m) | Inset geography + point-in-poly, 650 features | geoportal.statistics.gov.uk | OGL (OS + ONS IP) — **inset, not BFC** |
| ONS Westminster 2024 Boundaries UK **BFC** (Full resolution) | Full-res reference only (~61.8 MB GeoJSON) | data.gov.uk | OGL — **not shipped** |
| ONS Westminster Names & Codes V2 | Join table `PCON24CD/NM/NMW` (650 rows, Welsh `NMW`) | geoportal.statistics.gov.uk | OGL — **authority for `posts → PCON24CD`** |
| Open Innovations HexJSON + d3-hexjson + Hex Builder/Hexify | Hex interchange (`hex:{q,r}`) + build tooling | open-innovations.org/projects/hexmaps | MIT — **toolchain** |
| House of Commons Library uk-hex-cartograms-noncontiguous | Exploded ceremonial-county hexes (4 gpkg) — `Region` toggle alt | github.com/houseofcommonslibrary | Open Parliament Licence — **secondary** |
| topojson/topojson + topojson-client + spec | Topology-aware GeoJSON, `mesh`/`feature` at build | github.com/topojson | BSD |
| martinjc/UK-GeoJSON | Pre-generalised GeoJSON/TopoJSON from ONS BGC/BSC | github.com/martinjc/UK-GeoJSON | MIT-ish — **fallback** |
| ONSvisual/topojson_boundaries | LA-level TopoJSON including `geogHEXLA.json` | github.com/ONSvisual | — |
| ColorBrewer 2.0 (Brewer et al.) | Cartographic palettes filtered `colorblind safe + print/photocopy safe` | colorbrewer2.org | — |
| PSU GEOG 486 Visual Perception + Viz Palette | Deuteranomaly testing for palettes | courses.ems.psu.edu/geog486/node/879 | — |
| Nusser et al. cartogram good practices (arXiv 2006.00285, go-cart.io) | Linked brushing, animation, infotips, GeoJSON/SVG download for web cartograms | arxiv.org/pdf/2006.00285 | — |
| Stamen multivariate maps + ESRI dot-density (Kenneth Field) | Dot-density history, blend modes, border/inter-dot distance, dasymetric | stamen.com / esri.com/arcgis-blog | — |

Access per phase: Phase 0 = scrape + YNR (done) · Phase 1 = Wayback CDX ·
Phase 2+ = own robots-aware, rate-limited crawler identifying as civicord.
Boundaries/hex are static OGL/MIT/Open Parliament — cached in `data/boundaries/`
(AK v5 + BUC + Names V2) and materialised at build; no live API at runtime.

## Frontend map layer (static — no tile server)

Two lenses on the same register: **Ledger = text, Map = picture.** Same filters,
same URL — `?q&party&status&constituency&page`. Toggle `[ List | Map ]` above
the ledger; no panning of a slippy map — *search + click* wins for 650 seats.

- **Hero pointillist** — static `<svg>` with `<clipPath id="uk">` from ONS BUC +
  2,375 `<circle>` jittered inside, fixed `r=1.2`, colour = status
  (`--live/--gone/--warn`). `<title>p{id}.civicord.eth — constituency — status</title>` per dot. Voids tell the story.
- **Halftone hex** — AK v5 grid, each hex fill = SVG `<pattern>`
  (`radial-gradient` dots) with `mix-blend-mode: multiply` + `contrast()`
  (Ana Tudor 3-declaration technique). `r = 1.5 + (1-liveShare)*3.5px` —
  large sparse = dying. Colour + size double-encoding survives colourblind +
  print. Legend click dims, hex click sets `?constituency`, row hover pulses
  hex (Nusser linked brushing).
- **Jurisdiction UX** — `/constituencies/[slug]` (650 static pages, one per
  `posts`) shows halftone thumb + `n/m sites live`, ENS names, `og:image`
  deed `→ /og/constituencies/{slug}.svg` (1200×630, `og:image:type image/svg+xml`). Nation pills England/Scotland/Wales/NI + fuzzy autocomplete for Welsh
  names (`Ynys Môn`). API mirrors every seat at `/api/constituencies/{slug}.json` (same payload + `ogImage`) for the Bazantic metered call. `/candidates/[id]` shows seat-context (shipped 2026-09-10,
  `frontend/src/pages/candidates/[id].astro`): hex thumb (colour + dot-size
  double-encoded via `thumbFills(livePct)`), `n of m live · gone · redirected` +
  GSS code / region / electorate, deep links to seat + `?constituency=` filtered
  ledger; multi-seat candidates list `Also stood in:`; 1,607/2,375 have a
  constituency (768 are local/PCC posts with no 650-seat mapping — expected) —
  plus party live-share compare line (`partyLiveShare()`).
- **A11y/print (must):** 4.5:1 text, 3:1 graphic neighbours, never colour-only,
  `<title>` per hex, `aria-pressed` legend, `Tab` traverses hexes,
  `prefers-reduced-motion` disables stagger, print hides sticky bar & forces
  black halftone. `/browse` remains canonical — map annotates it.

Design rationale, comparison table, and full reference list: [cartography.md](cartography.md).

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
- **Open Innovations HexJSON + ODI Leeds hex maps (MIT)** — equal-weight
  cartograms so rural Richmond doesn't dwarf Birmingham; HexJSON + `d3-hexjson`
  + Hex Builder/Hexify toolchain.
- **Automatic Knowledge WPC hex v5 + ONS BUC/BFC + ONS Names V2 (OGL)** — 2024
  canonical hex (435 KB) + generalised inset + 650-row join table.
- **House of Commons Library non-contiguous cartograms (Open Parliament)** —
  exploded county-group hexes for the `Region` toggle; their “gaps ≠ missing
  data” blurb is reused.
- **PSU GEOG 486 + ColorBrewer + JHU WCAG + Nusser cartogram practices + Stamen/ESRI
  dot-density** — accessible, print-friendly, cartogram-good-practice layer
  (see [cartography.md](cartography.md) §2.2–2.3).

See [../RESEARCH.md](../RESEARCH.md) for the full validated landscape.
