# Roadmap

## Phase 0 — Data audit (weeks 1–3) ← *we are here*

Goal: find out what we actually have before building anything.

- [ ] Ingest Campaign Lab scrape (`assets/json`, `assets/large_json`) into a tidy table
      — note: scrape date is **April 2025**, not July 2024 as sometimes assumed.
- [ ] Join against Democracy Club YNR export (person IDs, party, constituency, won/lost)
      — use BES 2024 constituency+candidate dataset as cross-check.
- [ ] Liveness pass: HEAD/GET every URL → report live / redirect / dead / repurposed.
- [ ] Deliverable: **audit report + tidy CSV**. The liveness number alone is a
      publishable finding and gates everything downstream.

## Phase 1 — Historical baseline (weeks 3–6)

- [ ] Wayback CDX queries per URL (windows: April 2025 scrape ± 30 days; July 2024 GE)
- [ ] Fetch snapshots with `id_` flag; sha256 + store; record source per snapshot
- [ ] Note: **dead domains often have richer Wayback coverage than live sites** —
      treat Wayback as a primary source, not a fallback
- [ ] Deliverable: per-website snapshot timeline table

## Phase 2 — MVP dataset + static site (weeks 6–12)

- [ ] Diff engine (text-level, significance heuristics)
- [ ] Fixed policy taxonomy classification per section
- [ ] Per-candidate change timelines as a static site (GitHub Pages)
- [ ] Bulk Parquet + CDX-style index exports (LoC-style data package)
- [ ] License resolved (Campaign Lab scrape reuse terms — **open blocker**)

## Phase 3 — Continuous monitoring (quarter 2)

- [ ] Monthly live crawl via GitHub Actions (httpx + trafilatura, robots-aware, rate-limited)
- [ ] Change alerts (webhook → Slack/Discord) for significant changes
- [ ] Candidate→MP website transition tracking (the campaign-promises →
      office-holder messaging shift is the flagship story)

## Phase 4 — Productisation (ongoing)

- [ ] Searchable archive UI, public API (Postgres/Supabase)
- [ ] Seed-nomination flow for future elections (End of Term model)
- [ ] Partnership handoff path: Democracy Club / mySociety as long-term maintainers
      (Politwoops' shutdown shows ongoing monitoring needs an institutional home)

## Open blockers / risks

| Risk | Mitigation |
| --- | --- |
| Campaign Lab scrape has no license | Ask in person (done 2026-09-07 visit); get written clarification |
| UKWA content is reading-room-only (Legal Deposit) | Verify 2024 election collection access model |
| GDPR on raw HTML | Publish derived text/diffs; restrict raw HTML |
| Long-term maintenance burden | Partner-first; design for batch + static outputs |
