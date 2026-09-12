# Wayback spike findings

Phase 1 spike (2026-09-12): prove we can **CDX → `id_` fetch → sha256 →
compare** against the April 2025 Campaign Lab scrape for change-signal
cohorts (`gone` + `repurposed_suspect`).

## Headline

| Metric | Result |
|---|---|
| Sample | **14** URLs (7 gone + 7 repurpose-suspect, April text preferred) |
| CDX hit | **14/14** |
| Fetched HTTP 200 body | **14/14** |
| Similarity vs April scrape (SequenceMatcher) | min **0.00** · median **0.03** · max **0.89** |

**Coverage is excellent; naïve text join is not.** Wayback has the pages.
Matching Campaign Lab’s *extracted section text* to a full homepage HTML body
with a blunt `SequenceMatcher` understates overlap — CL JSON is page-fragment
text, not the full document. One high match (0.89) shows the join *can* work
when the snapshot and scrape align; the long low tail is mostly extract-shape
mismatch plus genuine content churn / wrong-timestamp picks.

## Per-URL

| person_id | signal | snapshot | similarity | note |
| --- | --- | --- | --- | --- |
| 2323 | repurposed_suspect | `20250324230720` | 0.00 | ok |
| 96054 | repurposed_suspect | `20250307215155` | 0.00 | ok |
| 30887 | gone | `20221231135251` | 0.01 | ok (old fallback snap) |
| 84208 | gone | `20250916154711` | 0.01 | ok (post-scrape snap) |
| 47091 | gone | `20250405094323` | 0.01 | ok |
| 93629 | repurposed_suspect | `20240703111218` | 0.01 | ok |
| 105335 | repurposed_suspect | `20250420200121` | 0.01 | ok |
| 4653 | gone | `20250310035816` | 0.03 | ok |
| 19504 | gone | `20250423014516` | 0.10 | ok |
| 108954 | repurposed_suspect | `20250401110016` | 0.13 | ok |
| 84358 | gone | `20250513163936` | 0.24 | ok |
| 1478 | gone | `20240715134130` | 0.34 | ok |
| 74068 | repurposed_suspect | `20250427171450` | 0.39 | ok |
| 36983 | repurposed_suspect | `20250326081435` | 0.89 | ok |

## What this unlocks

1. **Scale CDX + `id_` for the gone cohort** — coverage is good enough to treat
   Wayback as a primary source for dead domains.
2. **Normalize + significance — done** — `civicord diff-spike` (trafilatura +
   token coverage). Coverage median **0.25** (was similarity median 0.03);
   2/14 `unchanged`, 4 `minor`, 1 `major`, 7 `transformed`.
3. **Tighten snapshot picking** — prefer `20250301–20250531` strictly; only
   then fall back to GE 2024 / earlier (avoid 2022 and post-audit snaps).
4. **On-chain next:** `snapshot_sha256` text records once we trust the body.
5. **Product next:** surface `significance` on candidate timelines; larger CDX batch.

# Normalized diff spike

Re-diff of existing Wayback `id_` bodies vs April Campaign Lab text,
after **trafilatura** (or fallback) extraction + shared plaintext normalize.

**Pairs:** 14 · **classifiable:** 14

### Significance classes

| class | n | meaning |
| --- | --- | --- |
| unchanged | 2 | related ≥ 0.75 (coverage or similarity) |
| minor | 4 | related 0.40–0.75 |
| major | 1 | related 0.15–0.40 |
| transformed | 7 | related < 0.15 |
| incomparable | 0 | missing one side |

### Metrics (normalized)

- **Coverage** (April tokens in Wayback): min 0.00 · median 0.25 · max 1.00
- **Similarity** (SequenceMatcher): min 0.00 · median 0.08 · max 1.00

| person_id | coverage | similarity | significance | score | extractor |
| --- | --- | --- | --- | --- | --- |
| 96054 | 0.00 | 0.01 | transformed | 0.99 | trafilatura |
| 4653 | 0.02 | 0.06 | transformed | 0.94 | trafilatura |
| 84208 | 0.11 | 0.01 | transformed | 0.89 | trafilatura |
| 30887 | 0.11 | 0.00 | transformed | 0.89 | trafilatura |
| 2323 | 0.14 | 0.00 | transformed | 0.86 | trafilatura |
| 19504 | 0.14 | 0.08 | transformed | 0.86 | trafilatura |
| 93629 | 0.14 | 0.00 | transformed | 0.86 | trafilatura |
| 105335 | 0.39 | 0.01 | major | 0.61 | trafilatura |
| 108954 | 0.44 | 0.17 | minor | 0.56 | trafilatura |
| 1478 | 0.25 | 0.52 | minor | 0.48 | trafilatura |
| 84358 | 0.59 | 0.36 | minor | 0.41 | trafilatura |
| 47091 | 0.61 | 0.17 | minor | 0.39 | trafilatura |
| 74068 | 0.98 | 0.63 | unchanged | 0.02 | trafilatura |
| 36983 | 1.00 | 1.00 | unchanged | 0.00 | trafilatura |

## Read

- **Coverage** is the join metric that matters for CL fragments: how much of
  the April scrape still appears in the archived page.
- **Significance** uses `max(coverage, similarity)` so a good fragment join
  is not punished by unequal document length.
- Scale next: apply the same normalize+score path to a larger CDX batch,
  then surface `significance` on candidate timelines.

Artifacts: `data/out/wayback_spike/diff_summary.csv` (gitignored under `data/`).


## Reproduce

```bash
civicord changes
civicord wayback-spike --limit 15   # once; caches bodies under data/out/
civicord diff-spike                 # re-extract + significance (offline)
```
