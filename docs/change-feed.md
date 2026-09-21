# Change feed

Civicord’s **north star** is a citable record of **what changed** on political
campaign websites over time — deleted claims, redirected destinations,
repurposed domains, message shifts — not only whether a URL still answers.

The permanent register (ENS names, audit ledger, The Graph index) is the
**spine**. Without it, a change feed is just another disposable scrape. With it,
every delta can point at a public name and an auditable fact.

## Layers

| Layer | Status | What it answers |
|---|---|---|
| Survival register | Shipped | Is the site live / gone / redirected? Can I cite `p{id}.civicord.eth`? |
| **Change signals v0** | **Shipped** | What *kind* of change does the Apr 2025 → Sep 2026 audit imply? |
| Content chronology | Spike (174 scored / 287 targets) | Normalized Wayback vs April text → significance on candidate pages + browse `?sig=` |
| Second corpus (recrawl-v1) | Shipped 2026-09-21 | Re-crawled all 2,375 roster URLs storing normalized bodies: 1,457 texts (6.9 MB), robots-aware, protocol versioned — the comparable second snapshot claim-level diffing builds on |
| Theme rollup | Later | Which topics get walked back across seats and parties? |

## Against the original brief

The founding ask: revisit Campaign Lab's scraped sites, compare what changed,
and produce a dataset of message shifts, deleted claims, new priorities and
campaign evolution — via scraping, archiving, data comparison, text analysis.
Honest scorecard (2026-09-21):

| Brief item | Status |
|---|---|
| Scraping (re-visit) | Partial — Sep 2026 audit was liveness-only, no bodies stored; ~1,300 candidates' `large_json` text uningested; no continuous re-crawl |
| Archiving | Thin — 8 excerpts × 120 chars per candidate; Wayback spike bodies cached locally, not published |
| Data comparison | Shipped at HTTP level (signals v0); content comparison on a 174/2,375 sample |
| Text analysis | Claim-level diffs on a 799-person corpus (claimdiff-v1: kept/deleted/added sentences + keyword topic tags); full-corpus + policy taxonomy still open |
| Message shifts / deleted claims / new priorities | Candidates, not conclusions — per-person top claims with a homepage-vs-site scope caveat; theme rollup is Later |
| Campaign evolution | Partial — per-candidate chronology on the spike sample |

The steward digest and journalist surfaces show *where* to look; none can yet
say *what* changed semantically. Don't demo otherwise — the project's
credibility rests on precise language.

## Change signals v0

Derived from `audit_liveness.csv` only — **no second page-text corpus** yet.
Exclusive priority (first match wins):

1. `unaudited` — no audit row
2. `gone` — `dns_error` or `connection_error`
3. `repurposed_suspect` — `live` and surname not found in the body
4. `redirected` — `redirected=true` (including soft redirects that still mention the candidate)
5. `still_attested` — `live` (surname present or unknown)
6. `other` — `http_error`, `timeout`, residual classes

Signals are audit heuristics, not content judgements: `repurposed_suspect` only
means the surname was absent from the response body, and `live` means an HTTP
success — the UI labels these “Responding” and “Surname absent (review needed)”.

Person-level rollup = worst website signal (`gone` > `repurposed_suspect` >
`redirected` > `other` > `still_attested` > `unaudited`).

```bash
civicord changes          # → data/out/changes_v0.csv
```

Frontend build attaches `website.changeSignal` / `person.changeSignal` in
`candidates.json`. Candidate pages show a “What changed” line; browse accepts
`?change=` and (for the Wayback spike sample) `?sig=` for content significance
(`unchanged` / `minor` / `major` / `transformed`).

### What v0 cannot claim

- Paragraph- or claim-level deletions (Sep 2026 did not store page bodies)
- Continuous monitoring (single audit day: **2026-09-07**)
- Perfect repurposing detection (`name_found` is a surname substring check)

### Caveats (one line each)

- Single-day audit — not a continuous feed yet.
- `name_found` is weak; false positives/negatives expected.
- `other` ≠ “unchanged”; it means “couldn’t classify usefully.”
- April 2025 `pages.csv` is evidence of the scrape, not a second live corpus.

## Roadmap

1. **Phase 1 — Wayback / re-crawl:** CDX + `id_` bodies for gone and
   repurpose-suspect URLs; sha256 per snapshot. **Spike shipped:**
   `civicord wayback-spike` — see [wayback-spike.md](wayback-spike.md).
2. **Phase 2 — Text diffs:** significance heuristics + fixed policy taxonomy;
   per-candidate timelines (see [architecture.md](architecture.md)).
   **Spike shipped:** `civicord diff-spike` → `content_diffs.json`; candidate
   pages show “Content chronology” when a row exists; browse `?sig=` filters
   by significance (see [wayback-spike.md](wayback-spike.md)).
3. **Phase 3 — Themes:** rollups over many diffs; alerts; candidate→MP transition.

Campaign Lab agreed (2026-09-12) that extracted scrape text may be publicly
reused and redistributed with credit (CC-BY). Attribute on bulk text/diff
releases — see [outreach.md](outreach.md).
