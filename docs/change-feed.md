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
| Content chronology | Spike (n≈50) | Normalized Wayback vs April text → significance on candidate pages |
| Theme rollup | Later | Which topics get walked back across seats and parties? |

## Change signals v0

Derived from `audit_liveness.csv` only — **no second page-text corpus** yet.
Exclusive priority (first match wins):

1. `unaudited` — no audit row
2. `gone` — `dns_error` or `connection_error`
3. `repurposed_suspect` — `live` and surname not found in the body
4. `redirected` — `redirected=true` (including soft redirects that still mention the candidate)
5. `still_attested` — `live` (surname present or unknown)
6. `other` — `http_error`, `timeout`, residual classes

Person-level rollup = worst website signal (`gone` > `repurposed_suspect` >
`redirected` > `other` > `still_attested` > `unaudited`).

```bash
civicord changes          # → data/out/changes_v0.csv
```

Frontend build attaches `website.changeSignal` / `person.changeSignal` in
`candidates.json`. Candidate pages show a “What changed” line; browse accepts
`?change=`.

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
   pages show “Content chronology” when a row exists (see [wayback-spike.md](wayback-spike.md)).
3. **Phase 3 — Themes:** rollups over many diffs; alerts; candidate→MP transition.

License blocker for bulk public reuse of Campaign Lab scrape text remains open
— see [outreach.md](outreach.md) and [plan.md](plan.md).
