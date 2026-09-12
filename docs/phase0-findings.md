# Phase 0 findings — liveness audit baseline

**Date:** 2026-09-07 · **Scope:** all 2,375 unique candidate websites from Campaign Lab's
April 2025 scrape · **Method:** async httpx audit (HEAD with GET fallback; redirects
followed; 12 concurrent; optional surname content-check). Raw outputs live in
`data/out/` and regenerate via `civicord audit` + `civicord report`.

## Headline

**1,512 of 2,375 candidate websites (64%) were still live on 2026-09-07 —
roughly 17 months after the April 2025 scrape.** The other 36% are gone or broken.

| Status class | Count | Share |
| --- | --- | --- |
| live | 1,512 | 64% |
| http_error (4xx/5xx) | 372 | 16% |
| dns_error (domain gone) | 363 | 15% |
| connection_error | 78 | 3% |
| timeout | 43 | 2% |
| other_error | 7 | <1% |
| ssl_error | 0 | 0% |

- **659 audited URLs (28%) redirected somewhere else** — parked domains, party
  profile pages, new personal sites. The redirect trail is itself data: where
  does a candidate's web presence *go* after the election?
- 1,583 of the 2,375 sites belong to 2024 general-election (`parl.2024-07-04`)
  candidacies; the other 792 to other elections present in the scrape.

## Why this matters

Survival is the baseline, not the product. Phase 0 answers *whether the URL
still works*; the change feed answers *what kind of change that implies* —
see [change-feed.md](change-feed.md) for signals v0 (`gone` /
`repurposed_suspect` / `redirected` / `still_attested`) derived from this
audit. Paragraph-level diffs still need a second corpus (Wayback / re-crawl).

The US analogues (Library of Congress US Elections Web Archive, EDGI) archive
*federal* sites continuously. No UK project maintains even a **liveness
baseline** for candidates. This is the smallest publishable artifact — and it
gates everything downstream: you cannot track content change on a site that no
longer resolves.

## Reading the numbers

- **dns_error ≈ 15%** — the domain itself is gone. The Wayback Machine is now
  the *only* record of these sites → motivates Phase 1 (CDX backfill) as a
  first-class source, not a fallback.
- **http_error ≈ 16%** — domain alive, candidate pages removed or restructured.
  The April 2025 scrape text is the only pre-deletion evidence → motivates
  per-page diffing in Phase 2.
- Caveats: single-day snapshot; HEAD-with-GET-fallback can misclassify exotic
  servers; "live" means "responds", not "still about the candidate" (the
  surname content-check covers this — the 863 non-live URLs are the priority
  set for redirect inspection).

## Next

1. Current sprint: frontend restyle + ENSv2 identity layer + Subgraph/MCP
   agent — see [plan.md](plan.md).
2. Phase 1: Wayback CDX backfill — priority on the 863 non-live sites.
3. Repurposing analysis on redirect destinations (`final_url` clustering).
