# Cartography brief — Civicord's halftone hex & pointillist map

**Date:** 2026-09-10 · **Sources:** Parallel Search API (3 passes, 22 sources) + manual verification · **Status:** ready to build
**Question:** how does Civicord show 2,375 candidate sites across 650 constituencies without reinventing cartography? Two lenses on one permanent register: **Ledger = text, Map = picture.** Same filters, same URL.

---

## 1. UX after the map — one register, two lenses

### Information architecture (fully static — no Maps API, no backend)

```
/                  Hero pointillist (2,375 dots = UK silhouette) + 3 cohort cards + search
/map  [ List | Map ] toggle — same filtered ledger underneath
/browse?q=&party=&status=&constituency=   ← every filter is a shareable deep-link
/constituencies/[slug]                    ← 650 new static pages (one per posts constituency)
/candidates/[id]                          ← now shows "in Leeds Central — 2/6 sites live"
```

All built at `astro build` from `candidates.json` JOIN boundaries. No tile server. State lives in the URL; map + ledger read/write `?q&party&status&constituency&page`.

### Four journeys (what the user feels)

**Public — "what happened *here*?" (viral hook)**
1. Lands on `/` → sees the pointillist hero: a UK silhouette *made* of 2,375 dots. Recording red = gone, paper = live. Voids where towns went dark (Humberside, Teesside), dense where London holds. Instantly: *half the dots vanished.*
2. Types `Leeds` or taps the hero → `/constituencies/leeds-central` → halftone hex thumb + `2 of 6 sites still live`, 6 names, party chips, `p{id}.civicord.eth` for each, `See filtered ledger →`.
3. Clicks `Copy link` → OG image is a stipple deed they can post: `Leeds Central — 2/6 still live — civicord.eth`.

**Journalist / researcher — patch reporting**
1. `/map` → clicks `Gone` legend chip → live hexes dim, gone glow. Clicks the Humber void → ledger filters to 14 rows.
2. Hovers a ledger row → its hex pulses (linked brushing). Clicks a hex → `?constituency=` filters the ledger. Copies the link into the article.
3. Prints: halftone prints in black without colour — the story survives on paper.

**Party / civic-tech adopter (mySociety, Democracy Club, Campaign Lab)**
1. `?party=labour%20party` now highlights that party's hexes, not just rows.
2. Each `/constituencies/[slug]` is a share target and embed: `?format=svg` returns the halftone tile — no API key, static file.

**ETHGlobal / ENS stakeholder**
1. Every dot *is* `p{id}.civicord.eth`. Hover tooltip shows ENS + status; click goes to `app.ens.domains` + Sepolia Etherscan.
2. Map re-shades from the Subgraph (`text(url/status)`) — the picture *is* the on-chain register. Footer `Sepolia #xxxx — 1,512 live` + per-constituency Merkle root.

**Interaction contract (why it stays intuitive):**
- Search + click beats panning a slippy map for 650 seats. `/` focuses search, `Esc` clears (already shipped).
- Mobile: ledger → cards at `<640px` (shipped); map → vertical hex stack + autocomplete.
- No JS = full ledger table (existing). `prefers-reduced-motion` disables stagger. Print hides sticky bar, keeps halftone in black.

---

## 2. Best-in-class sources we won't reinvent

### 2.1 UK constituency geometry — comparison (all 2024 boundaries)

| Source | What it is | Size / records | License | Verdict |
|---|---|---|---|---|
| **Automatic Knowledge `uk-wpc-hex-constitcode-v5-june-2024.geojson`** · [automaticknowledge.org/wpc-hex](https://automaticknowledge.org/wpc-hex/) | One hex = one constituency, 650 equal hexes, pointy-topped, aligned to July 2024 | **435 KB GeoJSON** (also `.gpkg` 336 KB) | OGL | **Use as primary.** Tiny, canonical, 2024-ready. Updated 21 Jun 2024. |
| `open-innovations/uk-wards-2024` + earlier constituency HexJSON · [open-innovations.org/projects/hexmaps](https://open-innovations.org/projects/hexmaps/) · [blog 2017-05-08](https://open-innovations.org/blog/2017-05-08-mapping-election-with-hexes) | HexJSON (`{q,r}` axial) + `d3-hexjson` (Oli Hawkins) + Hex Builder / Hexify tools. Thesis: *"every constituency same visual weight"* — rural Richmond shouldn't dwarf Birmingham. | Varies | **MIT** | **Use the toolchain.** HexJSON as interchange, `d3-hexjson` to render to SVG at build. v2017 layout is stale — prefer AK v5 geometry but keep OI tooling. |
| `houseofcommonslibrary/uk-hex-cartograms-noncontiguous` · [github.com/houseofcommonslibrary/uk-hex-cartograms-noncontiguous](https://github.com/houseofcommonslibrary/uk-hex-cartograms-noncontiguous) | Non-contiguous ("exploded") cartograms: ceremonial-county groups separated with gaps, 4 `.gpkg` templates (including Westminster). Pop-scaled, reshaped to resemble UK. | 4 gpkgs | Open Parliament Licence | **Use as secondary `Region` toggle.** Their docs warn: *gaps ≠ missing data, needs blurb + inset geo map* — steal that copy. |
| **ONS Westminster Parliamentary Constituencies July 2024 Boundaries UK BUC** · [geoportal.statistics.gov.uk — BUC](https://geoportal.statistics.gov.uk/datasets/ons::westminster-parliamentary-constituencies-july-2024-boundaries-uk-buc-2/about) | Ultra Generalised (500 m) clipped to coastline, 650 features | BUC ≈ 1/40 of BFC | OGL (OS + ONS IP) | **Use for the inset + point-in-poly lookup.** |
| **ONS Westminster 2024 Boundaries UK BFC** · [data.gov.uk — BFC](https://www.data.gov.uk/dataset/78e0c4f0-237f-41be-a81e-9888a8d93f28/westminster-parliamentary-constituencies-july-2024-boundaries-uk-bfc) | Full resolution clipped | ~61.8 MB GeoJSON | OGL | Don't ship — too large. Reference only. |
| **ONS Westminster Names & Codes V2** · [geoportal — PCON24CD/NM/NMW](https://geoportal.statistics.gov.uk/datasets/9a876e4777bc47e392e670a7b8bc3f5c_0/explore) | Lookup table `E14000530 = Aldershot` etc., including Welsh `PCON24NMW` | 650 rows | OGL | **Use as join table** for `posts → PCON24CD`. Solves `Ynys Môn / Anglesey`. |
| `martinjc/UK-GeoJSON` · [github.com/martinjc/UK-GeoJSON](https://github.com/martinjc/UK-GeoJSON) | Pre-generalised GeoJSON + TopoJSON from ONS BGC/BSC | Varies | MIT-ish | **Use if you want simplified TopoJSON now** before generating your own. |
| `ONSvisual/topojson_boundaries` · [github.com/ONSvisual/topojson_boundaries](https://github.com/ONSvisual/topojson_boundaries) | TopoJSON including `geogHEXLA.json` (hex LAs) | — | — | Useful for LA-level hex, not 650 constituencies directly. |
| `evanodell/parlitools` `west_hex_map` · [rdrr.io](https://rdrr.io/github/evanodell/parlitools/man/maps.html) | R `sf` hex cartogram, 650 elements, from Ben Flanagan ESRI shapefile (Ynys Môn moved) | R pkg | — | R-native; not needed for static SVG but validates the hex approach. |
| `topojson/topojson` + `topojson-client` + spec · [github.com/topojson/topojson-specification](https://github.com/topojson/topojson-specification) | Topology-aware GeoJSON extension; `mesh` for borders, `feature` for extraction | — | BSD | **Use to encode once, extract at build.** |

**Decision:** Ship AK v5 as primary hex (equal weight, 435 KB, OGL). Encode the BUC inset as TopoJSON at build (~45 KB). Keep HexJSON as the build interchange (OI's format) so OI tools still open it.

### 2.2 Halftone / stipple / dot-density — visual encoding

**History matters:** Stamen's *Some Thoughts on Multivariate Maps* notes dot-density was invented for *black-ink print* when nuanced colour was expensive — vary *density*, not just hue; it communicates subtle variation better than bucketed choropleth. That's why halftone fits Civicord's "public record" brand — it's literally a printed record.

**Techniques to copy:**
- **Pure CSS halftone in 3 declarations (Ana Tudor, CodePen):** `1) pattern layer + map layer, 2) mix-blend-mode: multiply, 3) contrast() to push greys to black/white`. Use `radial-gradient` / `repeating-radial-gradient` as an SVG `<pattern>`. That's our hex fill: `r = 1.5 + (1 - liveShare) * 3.5px`, dot colour = status, size = magnitude — prints without colour.
- **ESRI *Experiments with dot density* (Kenneth Field, 2 parts):** Keep *minimum border distance + inter-dot distance*, don't place dots on polygon edges; draw order sets visual predominance; use **blend modes** (`multiply`/`screen`) not just opacity; consider dasymetric variants (re-allocate dots away from uninhabited land).
- **Flo Ledermann dot-density-maps-with-d3 (Observable):** random points inside polygon with settlement constraints — adapt to *jittered dots inside each hex*, fixed radius, no collision with hex stroke.
- **Woodruff-style halftone:** export a grayscale choropleth and cut it with an SVG halftone pattern — the classic print separation technique.

**Encoding for Civicord hexes:**
- Double-encode: dot **colour** (live = `--live #227a4b`, gone = `--gone #b4361e`, error = `--warn #a36a00`) + dot **size/density** (large sparse = dying). Survives colourblind + photocopy.
- For the hero pointillist: 2,375 `<circle>` jittered inside a UK `<clipPath>` from BUC, fixed `r=1.2` — no data encoding beyond colour; the silhouette's voids tell the story.

### 2.3 Accessible & print-friendly cartography

- **PSU GEOG 486 — Visual Perception Constraints:** test every palette through *Viz Palette* for deuteranomaly (most common colourblindness); *"a map for emergency management must be more accessible than one for entertainment"* — Civicord is closer to the former.
- **ColorBrewer 2.0 (Brewer et al.):** filter palettes by `colorblind safe + print friendly + photocopy safe`. Cite it — it's the standard.
- **JHU *Designing for All* / WCAG:** text 4.5:1, graphic neighbours 3:1, *never colour-only* — provide pattern alternative + data table + `aria-label`/`title`.
- **Cartogram good practices (Nusser et al., arXiv 2006.00285, go-cart.io):** when cartograms are on the web, add *linked brushing*, *animation between equal-area and cartogram*, *infotips*, and *download as GeoJSON/SVG* plus a *tutorial blurb*. That's our `/map` spec.

### 2.4 Static-site generation patterns

- **TopoJSON at build:** one `topojson-client` encode, then `topojson.feature` + `topojson.mesh` (gist: `borders = topojson meshes`) for borders — ships one file.
- **HexJSON at build:** `d3-hexjson` renders `q,r` to SVG `<path>`; no runtime layout.
- **D3 at build, not client:** D3 + TopoJSON run in `build-data.mjs` / a new `build-map.mjs` invoked via `astro build` — output is static SVG + `constituencies.json`. Zero client JS for the picture; only ~2 KB vanilla for sync.
- **Constituency lookup:** ONS Names & Codes CSV is the authority. Join `posts` (Democracy Club label) → `PCON24NM` literal, with ~30 manual fixes for renamed seats (2023 review). Welsh names via `PCON24NMW`. Fuzzy fallback uses existing `fuzzyMatch` subsequence matcher.

---

## 3. Recommended static stack

```
sources                         build                                     output (static)
──────                          ─────                                     ──────
AK v5 GeoJSON (435KB OGL) ─┐
ONS BUC (inset) ───────────┼─→ build-map.mjs (Node: D3 + TopoJSON) ─→  hex.svg (inline) + TopoJSON inset (~45KB)
ONS Names V2 (PCON24CD) ───┘      + build-data.mjs JOIN (posts→PCON24CD)  constituencies.json (650) + /constituencies/[slug] (650 pages)
                                                    ↘ candidates.json already            ↘ OG stipple cards (650 SVG/PNG, on-demand)
```

**CSS:** existing `--paper/--ink/--accent/--live/--gone/--warn` tokens + SVG `<pattern id="halftone-gone">` etc. `<pattern>` dot size controlled by CSS variable.

**Size budget:** AK 435 KB → ~28 KB gzip, BUC TopoJSON ~45 KB, 650 JSON rows ~90 KB, 650 OG cards generated on demand (not in `dist` unless we want). `dist` stays <18 MB. No Maps API, no tile server.

**A11y/print checklist (must):**
- [ ] 4.5:1 text, 3:1 graphic — run Viz Palette + ColorBrewer photocopy test
- [ ] Pattern + hue double-encoding (gone = large sparse red dots, not just red)
- [ ] Keyboard: `Tab` traverses hexes, legend buttons `aria-pressed`, map `role="img"` + `<title>` per hex
- [ ] `prefers-reduced-motion` disables stagger; print stylesheet hides sticky bar, forces black halftone
- [ ] Data table fallback is always reachable (`/browse` is canonical — map annotates it)

---

## 4. What to build next (8h path to demo)

1. **Fetch:** AK v5 GeoJSON + ONS BUC + Names V2 (verify OGL, cache in `data/boundaries/`).
2. **`frontend/scripts/build-map.mjs`:** join `posts → PCON24CD/NM`, count `live/gone/redirected` per constituency, emit `src/data/constituencies.json` + `src/data/hex.json` (HexJSON) + `src/data/buc-topo.json`.
3. **`index.astro` hero:** pointillist UK = `<svg>` with `<clipPath id="uk">` from BUC + 2,375 `<circle>` (jittered, colour by status), `<title>p{id}.civicord.eth — constituency — gone`.
4. **`map.astro` + `constituencies/[slug].astro`:** halftone hex grid wired to existing filter state (`data-party` / `data-status` reveal), linked brushing, `format=svg` download, per-constituency OG stipple thumbnail.

**Open questions before commit:** confirm the ~30 manual `posts → PCON24NM` fixes (list in `build-map.mjs` comments); choose final halftone density steps (test 3 vs 5 levels).

---

## References (Parallel-searched, verifiable)

- Automatic Knowledge — UK constituency hex & geo files, v5 June 2024 (435 KB GeoJSON, OGL). https://automaticknowledge.org/wpc-hex/
- Open Innovations — The World of Hex Maps; Election hex mapping (2017-05-08) — MIT, HexJSON + d3-hexjson, Hex Builder/Hexify. https://open-innovations.org/projects/hexmaps/ , https://open-innovations.org/blog/2017-05-08-mapping-election-with-hexes
- House of Commons Library — uk-hex-cartograms-noncontiguous (4 gpkgs, Open Parliament Licence). https://github.com/houseofcommonslibrary/uk-hex-cartograms-noncontiguous
- ONS Open Geography Portal — Westminster ParCon July 2024 Boundaries UK BUC (Ultra Generalised 500 m, 650 rec). https://geoportal.statistics.gov.uk/datasets/ons::westminster-parliamentary-constituencies-july-2024-boundaries-uk-buc-2/about
- ONS — Westminster 2024 Boundaries UK BFC (Full resolution, data.gov.uk). https://www.data.gov.uk/dataset/78e0c4f0-237f-41be-a81e-9888a8d93f28/westminster-parliamentary-constituencies-july-2024-boundaries-uk-bfc
- ONS — Westminster Names & Codes V2 (PCON24CD/NM/NMW, 650 rows). https://geoportal.statistics.gov.uk/datasets/9a876e4777bc47e392e670a7b8bc3f5c_0/explore
- martinjc/UK-GeoJSON — generalised TopoJSON/GeoJSON. https://github.com/martinjc/UK-GeoJSON
- ONSvisual/topojson_boundaries — TopoJSON hex LAs. https://github.com/ONSvisual/topojson_boundaries
- topojson spec / client. https://github.com/topojson/topojson-specification , https://github.com/topojson/topojson-client
- Nusser et al. — Cartogram good practices (arXiv 2006.00285, go-cart.io): linked brushing, animation, infotips, GeoJSON/SVG download. https://arxiv.org/pdf/2006.00285
- PSU GEOG 486 — Visual Perception Constraints; Viz Palette; ColorBrewer colorblind-safe. https://courses.ems.psu.edu/geog486/node/879
- ColorBrewer 2.0 — Brewer et al. http://colorbrewer2.org/
- JHU — Designing for All: WCAG 4.5:1 / 3:1, colour + pattern. https://accessibility.jhu.edu/wp-content/uploads/sites/31/AccessibleDataVisualizationPresentation.pdf
- Stamen — Some Thoughts on Multivariate Maps (dot density = black-ink history, blend modes). https://stamen.com/some-thoughts-on-multivariate-maps-ffe364342415/
- ESRI — Experiments with dot density, Parts One/Two (Kenneth Field, 2021): border distance, blend modes, dasymetric. https://www.esri.com/arcgis-blog/products/arcgis-pro/mapping/experiments-with-dot-density-part-one
- Flo Ledermann — Dot Density Maps with D3 (Observable). https://observablehq.com/@floledermann/dot-density-maps-with-d3
- Ana Tudor — Pure CSS halftone in 3 declarations (pattern + map + multiply + contrast). https://mastodon.ameo.dev/tags/CodePen
- evanodell/parlitools — west_hex_map (R, 650 hexes, Ben Flanagan). https://rdrr.io/github/evanodell/parlitools/man/maps.html

*API note:* Parallel's `/v1/search` accepts `objective` + up to 5 `search_queries`; mode `fast` (~700 ms) used for 3 passes (IDs `search_0a9a45…`, `search_c910f8…`, `search_43af96…`). `.env:PARALLEL_AI_API_KEY` present (40 chars) — verified 2026-09-10.
