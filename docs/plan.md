# Plan

Delivery phases, the current sprint, and risks. Last updated 2026-09-11 23:35 BST.
(Day-of-week note: 2026-09-08 is a **Tuesday**; earlier drafts of this file
labelled it Monday — all day labels below use the corrected mapping.)

## Where we are

Phase 0 is done: a full liveness audit of all 2,375 candidate websites from
Campaign Lab's April 2025 scrape → **1,512 live (64%)**, 372 http_error,
363 dns_error, 78 connection_error, 43 timeout, 7 other; 659 URLs redirect
somewhere else. Numbers and interpretation in
[phase0-findings.md](phase0-findings.md). The pipeline CLI
(`download` / `ingest` / `audit` / `report`) is committed with tests; the Astro
frontend scaffold builds 2,376 static pages from the pipeline CSVs. Known gap:
`download` doesn't yet cover the scrape's `assets/large_json`
(~1,300 candidates' page text uningested).

## Current sprint — ETHGlobal Online hackathon

Deadline: **Sun 2026-09-13 12:00 EDT (17:00 UK)**. Submission = public repo +
2–4 min demo video; up to 3 partner prizes per project.

### Eligibility

- Track: **Classic "From Scratch"** — first commit 2026-09-07 21:52, after the
  event start (~2026-09-04; verify the exact date on the Hacker Dashboard).
  No pre-hackathon project code, so Finalist + partner prizes are fully in play.
- Rules to respect: granular commits throughout (no single big final commit),
  AI-use attribution (README has the standing note), FEEDBACK doc per sponsor,
  submit before the deadline.

### Prize card (3 max — chosen 2026-09-07)

| Partner | Prize | Why it fits |
| --- | --- | --- |
| ENS | Best Use of ENSv2 — $4.5k | Identity is civicord's core problem: one subname per candidate under our own ENSv2 registry on Sepolia; text records carry website URL, snapshot SHA-256s, and liveness status; Permissioned Resolver per-record write roles make the change log tamper-evident. Central to the product, not cosmetic. |
| The Graph | AI Tooling / AI Use Case (From Scratch) — $5k | Deploy our own Subgraph indexing the candidate-registry events (ENSv2 ships an indexing guide for exactly this); demo an agent answering natural-language questions via the Subgraph MCP: "which candidate sites went dark since April 2025? which now redirect to unrelated businesses?" |
| Bazantic | Agentify a new API — $1k | Gateway civicord's query API on bazantic.com + a Recipe so any agent can pay per query for political-web-change data. Cheapest add-on; synergises with the Graph story. |

**Fallback:** if the subgraph isn't landing by ~Wed 10, swap The Graph →
**Hedera "AI & Agentic Payments" ($6k)** — expose the same dataset as an
x402-metered feed settled via Blocky402 on Hedera testnet (a listed example
use case for that prize).

Deliberately skipped: World Selfie Check (nothing to verify — no contributor
flow — and biometric gating on political tracking is a chilling effect) and
all DeFi partners (no genuine fit). Not the Graph "Composable" track:
Substreams is blockchain ETL; web-archive data can't flow through it.

### What we're building this week (one architecture, three prizes)

1. **ENSv2 on Sepolia** — deploy the civicord subname registry (registry
   template exists); mint `{person_id}.civicord.eth` for all 2,375 candidates;
   publish url/hash/status text records via a new `civicord publish` command.
2. **Subgraph + MCP** — index registry/resolver events in Subgraph Studio;
   agent demo over the change data in natural language.
3. **Bazantic** — gateway + Recipe + screen recording of the agent flow.

### Day plan

| Day | Deliverable |
| --- | --- |
| Tue 8 | ✅ Frontend restyle — "Public Record" direction (pending sign-off) — the demo surface |
| Wed 9 | 🔄 ENSv2 registry + subname mint + `civicord publish` — parent `civicord.eth` live (civicordhq alias), proxies deployed, blast-mode publisher shipped, 348/2,375 minted; paused on deployer gas top-up |
| Wed 10 | Subgraph in Subgraph Studio + MCP agent demo — **v0.0.1 deployed but faulted** then **pruned**, **v0.0.2 redeployed 22:40 but faulted @ 11660475** (unpadded `toHexString` → `Bytes.fromHexString` throw), **v0.0.3 redeployed 23:05** (`QmUcjfa…`, `hasIndexingErrors:false` @ 8149999, syncing 3.5M blocks to 11677k) (see [ops.md](ops.md)) |
| Thu 11 | ✅ Bazantic gateway **LIVE** (`civicord-aieyq.bazgateway.com` + `3se6sbx…bazgateway.com`, `MCP Live · 5 tools`, Marketplace *Pending verification* `/services/3se6sbxfgjfh3fw4gjpytkcroa`) + Recipe + 650 stipple deeds + worker alias for extensionless `/api/*` (`cb09faf`/`68950dd3`, `100`/`200` mcents verified) |
| Thu 11 (late) | ✅ Landing reframed **region-agnostic** — mission-first hero, `Region: UK · genesis` picker, UK-as-genesis badge, decay line (`April 2025 → Sept 2026 · 64% live`), infra-homage strip (registry `0x0895…` / resolver `0x340d…` / subgraph `QmUcjfa…` / gateway), *“Built for one election. Designed for any.”* region section, public-good footer. Additive only — **no route, file or data change**; build still `3031 html + 652 api + 650 deeds`, gateway untouched |
| Fri 12 | Demo video (2–4 min) + FEEDBACK.md per sponsor, AI-attribution pass |
| Sat 13 | Buffer; submit before 12:00 EDT / 17:00 UK |

## Phases after the sprint

Product north star: a **citable change feed** over campaign websites.
The survival register (ENS + audit ledger + Graph) is the spine — see
[change-feed.md](change-feed.md).

- **Phase 0.5 — change signals v0 (now):** derive exclusive signals
  (`gone` / `repurposed_suspect` / `redirected` / `still_attested` / `other`)
  from the Sep 2026 audit; surface on candidate pages + browse `?change=`.
  No second page corpus yet — not paragraph diffs.
- **Phase 1 — historical baseline (weeks 3–6):** Wayback CDX backfill per URL
  (Apr 2025 ± 30 days; Jul 2024 GE), `id_` fetch + sha256, source per snapshot.
  **Spike (2026-09-12):** `civicord wayback-spike` — see [wayback-spike.md](wayback-spike.md).
  Dead domains often have richer Wayback coverage than live sites — treat
  Wayback as a primary source, not a fallback. Priority: the 863 non-live
  sites; then redirect-destination clustering (repurposing analysis).
- **Phase 2 — text diffs + taxonomy (weeks 6–12):** text-level diff engine
  with significance heuristics; fixed policy taxonomy; per-candidate change
  timelines on the static site; bulk Parquet + CDX-style exports (LoC-style
  data package); license resolution (**open blocker**).
- **Phase 3 — continuous monitoring (Q2):** monthly robots-aware crawl via
  GitHub Actions; change alerts for significant diffs; candidate→MP website
  transition tracking (the flagship story).
- **Phase 4 — productisation:** public API; seed-nomination flow for future
  elections (End of Term model); handoff path to Democracy Club / mySociety as
  long-term maintainers.

## Risks & blockers

| Risk | Mitigation |
| --- | --- |
| Campaign Lab scrape has no license (blocks public dataset reuse) | Raised in person 2026-09-07; get written clarification before Phase 2 publication |
| ENSv2 → subgraph indexing is the riskiest sprint item | Timebox it; pre-agreed fallback to the Hedera x402 card (above) |
| UKWA content is reading-room-only (Legal Deposit) | Verify 2024 election collection access model (outreach in progress) |
| GDPR on raw HTML | Publish derived text/diffs only; raw HTML stays access-controlled |
| Long-term maintenance burden | Partner-first; design for batch + static outputs |

## Stakeholders & delivery (added Wed 9 evening)

Audience-first framing for all frontend content, in priority order:

1. **Researchers & journalists** — need *proof*, not a dashboard: every claim links
   to the tamper-evident public record (ENS name + register link). Screenshot-grade
   evidence, citable.
2. **Candidates & parties** — represented neutrally: "recorded", never judged.
   PermissionedResolver EAC (`authorizeTextRoles` / `authorizeNameRoles`) is the
   claim path for a candidate to later correct their own text keys — proven on
   Sepolia for a demo set ([docs/ens-claim-path.md](ens-claim-path.md)).
3. **Civic-tech adopters** (mySociety, Democracy Club, Campaign Lab) — reusable
   identifiers (Democracy Club person IDs) and an open pipeline, not a one-off demo.
4. **Sponsors** — ENS as identity infrastructure; same surface as #1.
5. **General public** — one glanceable idea; they never need to see the mechanics.

Language rules: ban "blockchain/web3/mint" in user-facing copy — say "permanent
record", "public register", "verify". Reading requires no wallet or account.

Delivered (frontend — 2,381 static pages at 23:35):
- Homepage: narrative-only (no 2,375-row wall) — why-it-exists lede, 3-step "How it works" (Collect / Record / Verify), stats + 3 cohort feature cards (Gone/Redirected/Live → `/cohorts/[status]`), party survival board retargeted to `/browse?party=…`, hero search (`“Farage” / “Leeds Central” → Enter` pushes to `/browse?q=…`), primary `Browse full ledger — 2,375 entries` CTA. OG/twitter meta per page.
- New `/browse` paginated ledger: the full database lives here — 50/page (`?page=`, windowed `1 2 3 … 48`, Prev/Next), fuzzy `farrage→Farage` subsequence matcher, `?q` + `?party` + `?status` + virtual `gone`/`redirected` deep-links, legend counts, ↳ flag, party filter fixed tonight (`data-party` joined on `|` not space — `?party=labour%20party` was returning 0 rows). Live deep-links verified: `farage→115`, `gone→441`, `labour→522`, `reform→154`.
- Cohort pages (`/cohorts/{live,gone,redirected}`) + candidate pages (2,375) keep "Public record" block with `p{id}.civicord.eth`, `app.ens.domains` + Etherscan verify links (manifest-driven: `person.onchain {ens,status}`). `compare-line` + `timeline` on `/candidates/3454` + `/candidates/9`.
- `build-data.mjs` ingests `data/out/onchain_manifest.csv` (optional) into `candidates.json` as `person.onchain {ens,status}`; R2 snapshot `frontend/src/data/candidates.json` committed as fallback (`DATA_SNAPSHOT_URL`).
- Mobile: browse rows become cards `<640px` (thead hidden, `data-label` via `::before`), feature grid stacks, search-hero stacks; methodology/specimen tables keep normal layout.

Delivery/UX principles going forward: static-first (build-time data, no backend),
copy before chrome, verification one click away everywhere. Viral hook is the
content itself ("which MP sites now sell insurance") — OG tags on every candidate
page make each record individually shareable. Motion stays CSS-subtle; no JS
frameworks added.

## Frontend craft pass (Wed 9 late) — Astro primitives, Sylva discipline

Applying the MengTo Skills/Sylva craft bar: staged entrances, one shared motion
language, self-contained output, explicit reduced-motion path, zero runtime
network requests. Translated to Astro's first-party primitives:

- `<ClientRouter />` view transitions on both layouts — cross-page navigation
  feels continuous instead of a hard reload.
- `prefetch: true` — candidate links hydrate on hover; 2,375 static pages feel instant.
- `@astrojs/sitemap` — `sitemap-index.xml` for all 2,381 pages (SEO/discovery primitive).
- Entrance choreography: CSS-only staggered reveal (masthead -> stats -> how ->
  ledger), first 14 ledger rows settle with a 24ms cascade; fully disabled under
  `prefers-reduced-motion`.
- Stat count-up with cubic ease-out; skipped entirely for reduced-motion users.
- Scroll progress line over the ledger (fixed 2px recording-red rule).
- Print stylesheet — a public record must survive being printed; chrome hidden,
  rows kept whole.
- `::selection` in recording red; OG/Twitter cards already per-page.

Constraints kept: no JS frameworks, no client JS beyond the existing filter +
three small vanilla scripts, no runtime data fetching. The site remains fully
static — the Sylva lesson is craft through choreography and typography, not
dependencies.

## Map sprint — halftone hex + pointillist hero (2026-09-10 research complete)

**Brief:** [cartography.md](cartography.md) — 22 sources via 3 Parallel Search API passes (IDs `search_0a9a45…`, `search_c910f8…`, `search_43af96…`). Key generated; rate-limit note: `/v1/search` accepts `objective` + max 5 `search_queries`.

**Premise validated:** Civicord has 650 jurisdictions (`posts` = constituency) but no sense of place — everything reads as a list. The public asks “what happened in Leeds Central?”, not “how did Labour’s sites survive?”. The map closes that gap with two lenses on the same permanent register: **Ledger = text, Map = picture**. Same filters, same URL. Viral unit becomes the constituency, not the ledger row.

**UX after (one register, two lenses):**

```
/                  Hero pointillist (2,375 dots = UK silhouette) + 3 cohort cards + search
/map  [ List | Map ] toggle — same filtered ledger underneath
/browse?q=&party=&status=&constituency=   ← every filter is a shareable deep-link
/constituencies/[slug]                    ← 650 new static pages (one per posts constituency)
/candidates/[id]                          ← now shows "in Leeds Central — 2/6 sites live" + Merkle root + Verify on ENS
```

All built at `astro build` — no Maps API, no backend. State lives in the URL; map + ledger read/write `?q&party&status&constituency&page`.

* **Public** — hero pointillist (2,375 `<circle>` jittered inside a UK `clipPath` from ONS BUC, recording-red = gone) gives a 2s read: *half the dots vanished*. Tap hero or type `Leeds` → `/constituencies/leeds-central` → halftone hex thumb + `2 of 6 sites still live`, 6 names, `p{id}.civicord.eth`, `See filtered ledger →`. OG image is a stipple deed they can post.
* **Journalist** — `/map` halftone hex (equal-weight, double-encoded: colour + dot size/density), legend `Gone` dims live, click Humber void → ledger filters → `Copy filtered link` → paste. Linked brushing: hover row pulses hex (per Nusser et al. cartogram good practices).
* **Party / civic-tech** — `?party=labour%20party` now highlights that party’s hexes, not just rows. Each `/constituencies/[slug]` is a share target + `?format=svg` embed, no API key.
* **ENS / ETHGlobal** — every dot *is* `p{id}.civicord.eth`; tooltip shows ENS + status, click → `app.ens.domains` + Sepolia Etherscan. Map re-shades from the Subgraph (`text(url/status)`) — picture *is* the register.

**Recommended static stack (from research):**

* **Primary hex:** Automatic Knowledge `uk-wpc-hex-constitcode-v5-june-2024.geojson` (435 KB, OGL) — one hex = one seat, 650 equal, July 2024 boundaries, 21 Jun 2024. See [cartography.md §2.1](cartography.md#21-uk-constituency-geometry--comparison-all-2024-boundaries).
* **Hex toolchain:** Open Innovations HexJSON + `d3-hexjson` (Oli Hawkins) + Hex Builder/Hexify — MIT; `hex:{q,r}` as build interchange, render to SVG at build.
* **Region-alt:** HoC Library `uk-hex-cartograms-noncontiguous` (4 gpkg, Open Parliament Licence) — exploded ceremonial-county groups for a `Region` toggle; their docs warn *gaps ≠ missing data, needs blurb + inset* — reuse that copy.
* **True geography inset + lookup:** ONS Westminster ParCon July 2024 Boundaries UK **BUC** (Ultra Generalised 500 m, 650 rec, ~1/40 of BFC) + Names & Codes V2 (`PCON24CD/NM/NMW`, including Welsh) via ONS Open Geography Portal — OGL.
* **Topology:** `topojson/topojson` + `topojson-client` (BSD) — encode once, `mesh` borders at build.
* **Visual encoding:** PSU GEOG 486 + ColorBrewer2 (colorblind-safe + print/photocopy-safe) + JHU WCAG (4.5:1 text, 3:1 graphic, never colour-only) + Stamen/ESRI dot-density (minimum border + inter-dot distance, blend modes `multiply`/`screen`) + Ana Tudor pure-CSS halftone (`pattern + map + multiply + contrast()`) — see cartography.md §2.2–2.3.
* **Size budget:** AK 435 KB → ~28 KB gzip, BUC TopoJSON ~45 KB, 650 JSON rows ~90 KB, 650 OG stipple cards on demand. `dist` stays <18 MB.

**Build:** `candidates.json` JOIN `PCON24CD` (fuzzy `posts → PCON24NM` + ~30 manual fixes for renamed seats, Welsh via `PCON24NMW`) → `src/data/constituencies.json` (650) + `src/data/hex.json` (HexJSON) + `src/data/buc-topo.json`. New script `frontend/scripts/build-map.mjs` invoked via `astro build`. Output: inline `hex.svg` + `constituencies/[slug]` (650 pages) + OG stipple thumbnails. No runtime Maps API.

**A11y/print contract (must):** 4.5:1 text, 3:1 graphic neighbours, pattern + hue double-encoding (`gone` = large sparse red dots), `<title>` per hex with `p{id}.civicord.eth`, `prefers-reduced-motion` disables stagger, print hides sticky bar and forces black halftone. `/browse` remains canonical — map annotates it.

**8h path to demo:** `1` fetch AK v5 + ONS BUC + Names V2 → cache `data/boundaries/` · `2` write `build-map.mjs` (join + counts + TopoJSON) · `3` `index.astro` pointillist hero (static `<svg>`+`<clipPath>`+2,375 circles) · `4` `map.astro` + `constituencies/[slug].astro` halftone hex wired to existing filter state + linked brushing + `format=svg` download.

**Day plan update (live — 2026-09-11 23:05 gateway LIVE + subgraph v0.0.3 syncing):** `3031` html + `652` API json (`constituencies` × 650 + list + summary) + `650` stipple deeds (1200×630 SVG, 2.5 MB, `build-og.mjs`) — `34M` `frontend/dist`, `4342` files. `openapi.yaml` + Recipe ([gateway/recipe.md](gateway/recipe.md)) at `gateway/` — `https://civicord-aieyq.bazgateway.com` (handle, `MCP Live · 5 tools` at `/mcp`, Marketplace *Pending verification*) — pay-per-`?constituency=` (x402/MPP `100`/`200` mcents, humans browse free). Worker alias `frontend/public/_worker.js` (`cb09faf`) maps extensionless Bazantic `/api/*` → `…json` with query filtering. Subgraph `v0.0.3` `QmUcjfa…` LIVE, `hasIndexingErrors:false` @ 8149999, syncing 3.5M blocks — `v0.0.2` faulted @ 11660475 (unpadded hex), `v0.0.1` pruned. Remaining: wait for subgraph sync, then demo video.

| Thu 11 | ✅ Gateway **LIVE** + Recipe + OG deeds + handle + marketplace pending — subgraph left to you |
| Fri 12 | Demo video (2–4 min) + FEEDBACK.md — lead with map hook: “Check your constituency: 4/6 sites already gone” |

Existing Thu Bazantic slot shifts to co-deliver with the map (gateway + Recipe remain); Fri video leads with the map hook: “Check your constituency: 4/6 sites already gone.”
