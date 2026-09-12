# Civicord — Competing/Adjacent Projects Research

_Researched 2026-09-07 via Parallel Search API. Status: preliminary — items marked ⚠️ need manual verification._

## Direct precedents (validated)

### 1. EDGI Web Monitoring (US) — **closest open-source project; build on this**
- Repo: https://github.com/edgi-govdata-archiving/web-monitoring ("Scanner")
- Monitors changes on US government websites at scale (founded during 2016 transition)
- Pipeline architecture: crawl → archive versions → diff → human/AI significance annotation → public web UI
- Lesson: their biggest pain was **version management + diff UX**, exactly our Phase 3-4. Reuse their data model and diffing approach; avoid their scaling mistakes (ask them).

### 2. Library of Congress — US Elections Web Archive (US)
- 20+ years of candidate campaign websites (presidential/gubernatorial/congressional)
- Publishes open data packages: **CDX index files + metadata.csv of all candidate websites** — see blog posts "Candidates, Campaigns, and CDX Files" (2022) and "New U.S. Elections Web Archive Data Resources" (2024) at blogs.loc.gov
- Their `metadata.csv` + CDX structure is a ready-made **schema template** for our websites/snapshots tables.

### 3. End of Term Web Archive (US) — process model
- eotarchive.org — consortium archiving of .gov sites at administration changes
- Steal: seed-nomination model, bulk WARC downloads, multi-org cost sharing.

### 4. UK Web Archive (British Library) — the key UK player ⚠️
- Blogs confirm they collect election websites during UK general elections (2017, 2019 posts: "What websites do we collect during UK General Elections?", "Web Archiving the UK General Election 2019")
- **Critical caveat: Legal Deposit Regulations 2013** — most UKWA content is viewable only in UK legal deposit libraries (reading-room access), not bulk-downloadable. Verify what's accessible for 2024.
- Opportunity: civicord as seed nominator + publicly-accessible complement.

### 5. Politwoops / ProPublica (US) — accountability precedent, now defunct
- Tracked 500k+ deleted tweets from politicians since 2012; shut down 2023/24
- Lesson: "deleted statements" framing has proven public/journalist value; also shows maintenance/funding risk of ongoing monitoring.

## Adjacent UK infrastructure (complementary, not competing)

- **Democracy Club Candidates** (candidates.democracyclub.org.uk): canonical roster, free researcher downloads, social media links, election statements. No website-change tracking. **Use their person/candidate IDs as our primary keys.**
- **TheyWorkForYou (mySociety)**: MP activity records; no website monitoring.
- **Campaign Lab candidate-website-scrape**: our baseline (April 2025 scrape, JSON per candidate in `assets/json`). **Reuse OK** (CC-BY + credit) — Campaign Lab agreed 2026-09-12.
- **British Election Study**: 2024 constituency results + candidate data (DOI 10.48420/284306) — good for won/lost status enrichment.

## The gap (provisional finding)

No UK project does **candidate-level longitudinal website change tracking** (per-candidate diffs, deleted claims, topic shifts, alerts) as open data. Precedents exist only in the US (EDGI for gov sites, LoC for candidate *archiving* without change analysis).

## Recommended stack decisions informed by research

1. Adopt **LoC's CDX + metadata.csv** data model for our snapshot/change schema.
2. Study **EDGI web-monitoring** before writing diff infrastructure; potentially contribute upstream rather than rebuild.
3. Use **Wayback CDX API** as historical baseline (Campaign Lab scrape is April 2025, not July 2024).
4. Output format target: **bulk WARC/Parquet downloads + CDX indexes** like LoC/EOT, not just a portal.
5. Partner-first: Democracy Club (IDs + distribution), UK Web Archive (nominations + future crawls), mySociety (patterns + audience).

## Cartography & constituency map — deep research (2026-09-10, Parallel Search API)

*Method:* 3 Parallel passes (`/v1/search`, `objective` + max 5 `search_queries`, mode `fast`; IDs `search_0a9a45…`, `search_c910f8…`, `search_43af96…`; `.env:PARALLEL_AI_API_KEY` verified 40 chars). Full brief with UX flows and citations: [docs/cartography.md](docs/cartography.md).

### UK constituency geometry — comparison (all July 2024 boundaries)

| Source | Size / records | License | Role in Civicord |
| --- | --- | --- | --- |
| **Automatic Knowledge `uk-wpc-hex-constitcode-v5-june-2024.geojson`** ([automaticknowledge.org/wpc-hex](https://automaticknowledge.org/wpc-hex/)) — one hex = one seat, 650 equal hexes, pointy-topped, 21 Jun 2024 | 435 KB GeoJSON (336 KB gpkg) | OGL | **Primary hex** — tiny, 2024-canonical |
| **Open Innovations HexJSON + d3-hexjson + Hex Builder/Hexify** ([open-innovations.org/projects/hexmaps](https://open-innovations.org/projects/hexmaps/), [blog 2017-05-08](https://open-innovations.org/blog/2017-05-08-mapping-election-with-hexes)) — thesis: *every seat same visual weight* (rural Richmond shouldn't dwarf Birmingham) | Varies | **MIT** | **Toolchain** — `hex:{q,r}` interchange, render to SVG at build |
| **HoC Library uk-hex-cartograms-noncontiguous** ([github.com/houseofcommonslibrary/uk-hex-cartograms-noncontiguous](https://github.com/houseofcommonslibrary/uk-hex-cartograms-noncontiguous)) — exploded ceremonial-county hexes, 4 gpkg | 4 gpkg | Open Parliament | **Secondary `Region` toggle** — reuse their *gaps ≠ missing data* blurb + inset |
| **ONS Westminster July 2024 Boundaries UK BUC** ([geoportal — BUC](https://geoportal.statistics.gov.uk/datasets/ons::westminster-parliamentary-constituencies-july-2024-boundaries-uk-buc-2/about)) — Ultra Generalised (500 m) clipped, 650 rec | ~1/40 of BFC | OGL (OS + ONS IP) | **Inset + point-in-poly** |
| **ONS Westminster BFC** ([data.gov.uk — BFC](https://www.data.gov.uk/dataset/78e0c4f0-237f-41be-a81e-9888a8d93f28/westminster-parliamentary-constituencies-july-2024-boundaries-uk-bfc)) — Full resolution | ~61.8 MB GeoJSON | OGL | Reference only — not shipped |
| **ONS Names & Codes V2** ([geoportal — PCON24CD/NM/NMW](https://geoportal.statistics.gov.uk/datasets/9a876e4777bc47e392e670a7b8bc3f5c_0/explore)) — join table `E14000530 = Aldershot`, Welsh `NMW` | 650 rows | OGL | **Authority for `posts → PCON24CD`** |
| **martinjc/UK-GeoJSON** ([github.com/martinjc/UK-GeoJSON](https://github.com/martinjc/UK-GeoJSON)) — pre-generalised TopoJSON/GeoJSON | Varies | MIT-ish | Fallback |
| **topojson/topojson + client + spec** ([github.com/topojson/topojson-specification](https://github.com/topojson/topojson-specification)) — topology-aware GeoJSON, `mesh`/`feature` | — | BSD | Encode once at build |

*Decision:* Ship AK v5 as primary (equal weight, OGL). BUC TopoJSON as the inset (~45 KB). HexJSON as build interchange so OI tools still open it.

### Visual encoding & a11y — methods we won't reinvent

- **History:** Stamen *Some Thoughts on Multivariate Maps* — dot-density was invented for *black-ink print*; vary *density*, not just hue; univariate halftone beats bucketed choropleth for subtle variation.
- **CSS halftone (Ana Tudor):** *3 declarations* — `pattern layer + map layer, multiply blend, contrast()` → greys to black/white via `radial-gradient` / `repeating-radial-gradient` SVG `<pattern>` — our halftone hex (`r = 1.5 + (1-liveShare)*3.5px`).
- **ESRI dot-density (Kenneth Field, 2 parts):** minimum border + inter-dot distance, don't place dots on edges, draw-order matters, blend modes `multiply`/`screen`, dasymetric variants.
- **Accessible & print-friendly:** PSU GEOG 486 + Viz Palette (deuteranomaly) + ColorBrewer2 (`colorblind safe + print/photocopy safe`) + JHU WCAG (4.5:1 text, 3:1 graphic, never colour-only). Cartogram web best practices: Nusser et al. (arXiv 2006.00285) — linked brushing, animation geo↔cartogram, infotips, GeoJSON/SVG download.
- **Static at build:** D3 + TopoJSON in `build-map.mjs` at `astro build` — no Maps API, no runtime tiles.

See [docs/cartography.md §2.2–2.4](docs/cartography.md) for the full methodology and 14-reference list.

## Open questions / manual verification needed

- [ ] Does UKWA hold 2024 GE candidate site crawls? What access model?
- [x] Campaign Lab scrape license + per-candidate scrape timestamps — reuse OK (CC-BY + credit), 2026-09-12; timestamps still TBD if needed
- [ ] Democracy Club: does YNR API expose website/homepage fields reliably?
- [ ] Contact EDGI about reusing web-monitoring components
- [ ] Any academic UK candidate-website datasets (Google Scholar pass still to do)
- [ ] ~30 manual `posts → PCON24NM` join fixes for 2023-review renames (list in `build-map.mjs` before commit)
- [ ] Halftone density steps — test 3 vs 5 levels for legibility at 240 px thumb vs full map
- [ ] Confirm the ~30 manual join fixes and 435 KB AK v5 + BUC cache in `data/boundaries/` before the hex lands in `dist`
