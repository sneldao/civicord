# Plan

Delivery phases, the current sprint, and risks. Last updated 2026-09-09.

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
| Mon 8 | ✅ Frontend restyle — "Public Record" direction (pending sign-off) — the demo surface |
| Tue 9 | 🔄 ENSv2 registry + subname mint + `civicord publish` — parent `civicord.eth` live (civicordhq alias), proxies deployed, blast-mode publisher shipped, 348/2,375 minted; paused on deployer gas top-up |
| Wed 10 | Subgraph in Subgraph Studio + MCP agent demo (go/no-go vs fallback) |
| Thu 11 | Bazantic gateway + Recipe |
| Fri 12 | Demo video (2–4 min), FEEDBACK.md per sponsor, AI-attribution pass |
| Sat 13 | Buffer; submit before 12:00 EDT / 17:00 UK |

## Phases after the sprint

- **Phase 1 — historical baseline (weeks 3–6):** Wayback CDX backfill per URL
  (Apr 2025 ± 30 days; Jul 2024 GE), `id_` fetch + sha256, source per snapshot.
  Dead domains often have richer Wayback coverage than live sites — treat
  Wayback as a primary source, not a fallback. Priority: the 863 non-live
  sites; then redirect-destination clustering (repurposing analysis).
- **Phase 2 — MVP dataset + static site (weeks 6–12):** text-level diff engine
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
