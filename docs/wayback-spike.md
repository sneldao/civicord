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
2. **Diff engine must normalize both sides** — trafilatura (or CL-shaped
   section extract) on Wayback HTML before difflib; don’t compare raw homepage
   HTML to CL fragment corpora.
3. **Tighten snapshot picking** — prefer `20250301–20250531` strictly; only
   then fall back to GE 2024 / earlier (avoid 2022 and post-audit snaps).
4. **On-chain next:** `snapshot_sha256` text records once we trust the body.

## Reproduce

```bash
civicord changes
civicord wayback-spike --limit 15
```

CLI: `src/civicord/wayback.py`. Artifacts (gitignored): `data/out/wayback_spike/`
(`*.bin`, `*.txt`, `sha256.txt`, `spike_summary.csv`).
