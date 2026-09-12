# Wayback spike findings

Phase 1 spike (2026-09-12): prove we can **CDX → `id_` fetch → sha256 →
compare** against the April 2025 Campaign Lab scrape for change-signal
cohorts (`gone` + `repurposed_suspect`).

## Headline (expanded batch)

| Metric | Result |
|---|---|
| Sample | **135** URL attempts (gone + repurpose-suspect, unique persons preferred) |
| Bodies cached | **125** `.bin` files · **135** person dirs |
| Classifiable diffs | **112** unique persons (`civicord diff-spike`) |
| Published to frontend | **112** rows in `content_diffs.json` |
| Coverage (April tokens ⊂ Wayback) | min **0.00** · median **0.28** · max **1.00** |
| Significance | unchanged **16** · minor **23** · major **41** · transformed **32** · incomparable **23** |

Snapshot picker prefers `20250301–20250531`, then any 2024–2025 hit closest to
mid-April. Frontend publishes compact rows to `frontend/src/data/content_diffs.json`
(no HTML bodies); candidate pages show **Content chronology**; browse accepts
`?sig=`.

### Earlier n=14 raw-similarity spike

First pass used blunt HTML `SequenceMatcher` (median **0.03**) — that understated
overlap because Campaign Lab stores *fragments*, not full HTML. Normalized
coverage fixed the join; see the section below for the current score table.

## What this unlocks

1. **Scale CDX + `id_` further** — treat Wayback as primary for dead domains;
   next enlargement past `--limit 150` (resume-friendly; unique persons).
2. **Normalize + significance — shipped** — `civicord diff-spike` (trafilatura +
   token coverage); surface on timelines via `content_diffs.json`.
3. **Browse filter — shipped** — `/browse?sig=transformed` (etc.).
4. **On-chain next:** `snapshot_sha256` text records once we trust the body.
5. **Product next:** theme rollups over many diffs.

# Normalized diff spike

Re-diff of existing Wayback `id_` bodies vs April Campaign Lab text,
after **trafilatura** (or fallback) extraction + shared plaintext normalize.

**Pairs:** 135 · **classifiable:** 112

### Significance classes

| class | n | meaning |
| --- | --- | --- |
| unchanged | 16 | related ≥ 0.75 (coverage or similarity) |
| minor | 23 | related 0.40–0.75 |
| major | 41 | related 0.15–0.40 |
| transformed | 32 | related < 0.15 |
| incomparable | 23 | missing one side |

### Metrics (normalized)

- **Coverage** (April tokens in Wayback): min 0.00 · median 0.28 · max 1.00
- **Similarity** (SequenceMatcher): min 0.00 · median 0.03 · max 1.00

| person_id | coverage | similarity | significance | score | extractor |
| --- | --- | --- | --- | --- | --- |
| 71402 | 0.00 | — | transformed | 1.00 | none |
| 5190 | 0.00 | — | transformed | 1.00 | none |
| 41937 | 0.00 | — | transformed | 1.00 | none |
| 116618 | 0.00 | — | transformed | 1.00 | none |
| 9688 | 0.00 | — | transformed | 1.00 | none |
| 34885 | 0.00 | — | transformed | 1.00 | none |
| 110111 | 0.00 | — | transformed | 1.00 | none |
| 6947 | 0.00 | — | transformed | 1.00 | none |
| 5912 | 0.01 | 0.00 | transformed | 0.99 | trafilatura |
| 4119 | 0.01 | 0.01 | transformed | 0.99 | trafilatura |
| 96054 | 0.00 | 0.01 | transformed | 0.99 | trafilatura |
| 49736 | 0.00 | 0.01 | transformed | 0.99 | trafilatura |
| 99579 | 0.04 | 0.00 | transformed | 0.96 | trafilatura |
| 19734 | 0.05 | 0.01 | transformed | 0.95 | trafilatura |
| 94344 | 0.05 | 0.00 | transformed | 0.95 | trafilatura |
| 5443 | 0.02 | 0.06 | transformed | 0.94 | trafilatura |
| 4653 | 0.02 | 0.06 | transformed | 0.94 | trafilatura |
| 98205 | 0.08 | 0.01 | transformed | 0.92 | trafilatura |
| 117470 | 0.09 | 0.04 | transformed | 0.91 | trafilatura |
| 116314 | 0.09 | 0.06 | transformed | 0.91 | trafilatura |
| 84208 | 0.11 | 0.01 | transformed | 0.89 | trafilatura |
| 48133 | 0.11 | 0.06 | transformed | 0.89 | trafilatura |
| 30887 | 0.11 | 0.00 | transformed | 0.89 | trafilatura |
| 89046 | 0.11 | 0.00 | transformed | 0.89 | trafilatura |
| 117898 | 0.12 | 0.04 | transformed | 0.88 | trafilatura |
| 34298 | 0.12 | 0.00 | transformed | 0.88 | trafilatura |
| 79308 | 0.13 | 0.00 | transformed | 0.87 | trafilatura |
| 43096 | 0.13 | 0.00 | transformed | 0.87 | trafilatura |
| 2323 | 0.14 | 0.00 | transformed | 0.86 | trafilatura |
| 19504 | 0.14 | 0.08 | transformed | 0.86 | trafilatura |
| 93629 | 0.14 | 0.00 | transformed | 0.86 | trafilatura |
| 35866 | 0.15 | 0.00 | transformed | 0.85 | trafilatura |
| 7842 | 0.16 | 0.00 | major | 0.84 | trafilatura |
| 19740 | 0.17 | 0.00 | major | 0.83 | trafilatura |
| 4645 | 0.17 | 0.09 | major | 0.82 | trafilatura |
| 18104 | 0.18 | 0.00 | major | 0.82 | trafilatura |
| 5554 | 0.17 | 0.18 | major | 0.82 | trafilatura |
| 72833 | 0.19 | 0.00 | major | 0.81 | trafilatura |
| 4018 | 0.19 | 0.00 | major | 0.81 | trafilatura |
| 105489 | 0.20 | 0.00 | major | 0.80 | trafilatura |
| 35543 | 0.20 | 0.06 | major | 0.80 | trafilatura |
| 40908 | 0.21 | 0.00 | major | 0.79 | trafilatura |
| 28184 | 0.21 | 0.01 | major | 0.79 | trafilatura |
| 69698 | 0.21 | 0.01 | major | 0.79 | trafilatura |
| 10099 | 0.21 | 0.02 | major | 0.79 | trafilatura |
| 108264 | 0.21 | 0.01 | major | 0.79 | trafilatura |
| 34617 | 0.21 | 0.00 | major | 0.79 | trafilatura |
| 53966 | 0.22 | 0.00 | major | 0.78 | trafilatura |
| 56029 | 0.23 | 0.04 | major | 0.78 | trafilatura |
| 64212 | 0.23 | 0.00 | major | 0.77 | trafilatura |
| 43443 | 0.23 | 0.00 | major | 0.77 | trafilatura |
| 111356 | 0.23 | 0.04 | major | 0.77 | trafilatura |
| 113311 | 0.24 | 0.04 | major | 0.76 | trafilatura |
| 100749 | 0.25 | 0.00 | major | 0.75 | trafilatura |
| 1689 | 0.26 | 0.00 | major | 0.74 | trafilatura |
| 94104 | 0.28 | 0.00 | major | 0.72 | trafilatura |
| 72699 | 0.28 | 0.00 | major | 0.72 | trafilatura |
| 110639 | 0.28 | 0.00 | major | 0.72 | trafilatura |
| 95430 | 0.28 | 0.07 | major | 0.72 | trafilatura |
| 117018 | 0.29 | 0.00 | major | 0.71 | trafilatura |
| 11325 | 0.29 | 0.03 | major | 0.71 | trafilatura |
| 4635 | 0.29 | 0.05 | major | 0.71 | trafilatura |
| 17546 | 0.30 | 0.00 | major | 0.70 | trafilatura |
| 71874 | 0.34 | 0.01 | major | 0.66 | trafilatura |
| 38153 | 0.34 | 0.10 | major | 0.66 | trafilatura |
| 79642 | 0.34 | 0.10 | major | 0.66 | trafilatura |
| 433 | 0.35 | 0.07 | major | 0.65 | trafilatura |
| 73418 | 0.36 | 0.00 | major | 0.64 | trafilatura |
| 88950 | 0.37 | 0.03 | major | 0.63 | trafilatura |
| 98696 | 0.37 | 0.00 | major | 0.63 | trafilatura |
| 49241 | 0.38 | 0.09 | major | 0.62 | trafilatura |
| 105335 | 0.39 | 0.01 | major | 0.61 | trafilatura |
| 27013 | 0.39 | 0.01 | major | 0.61 | trafilatura |
| 6053 | 0.42 | 0.00 | minor | 0.58 | trafilatura |
| 69989 | 0.43 | 0.20 | minor | 0.57 | trafilatura |
| 43691 | 0.43 | 0.08 | minor | 0.57 | trafilatura |
| 4366 | 0.43 | 0.14 | minor | 0.57 | trafilatura |
| 108954 | 0.44 | 0.17 | minor | 0.56 | trafilatura |
| 117457 | 0.44 | 0.15 | minor | 0.56 | trafilatura |
| 43687 | 0.45 | 0.08 | minor | 0.55 | trafilatura |
| 4616 | 0.45 | 0.02 | minor | 0.55 | trafilatura |
| 72532 | 0.47 | 0.01 | minor | 0.53 | trafilatura |
| 109888 | 0.49 | 0.04 | minor | 0.51 | trafilatura |
| 6071 | 0.49 | 0.24 | minor | 0.51 | trafilatura |
| 65537 | 0.50 | 0.00 | minor | 0.50 | trafilatura |
| 48819 | 0.50 | 0.02 | minor | 0.50 | trafilatura |
| 1478 | 0.25 | 0.52 | minor | 0.48 | trafilatura |
| 113192 | 0.55 | 0.17 | minor | 0.45 | trafilatura |
| 97574 | 0.58 | 0.02 | minor | 0.42 | trafilatura |
| 84358 | 0.59 | 0.36 | minor | 0.41 | trafilatura |
| 47091 | 0.61 | 0.17 | minor | 0.39 | trafilatura |
| 35689 | 0.62 | 0.42 | minor | 0.38 | trafilatura |
| 7513 | 0.49 | 0.63 | minor | 0.37 | trafilatura |
| 2189 | 0.65 | 0.01 | minor | 0.35 | trafilatura |
| 85732 | 0.68 | 0.63 | minor | 0.32 | trafilatura |
| 11633 | 0.72 | 0.20 | minor | 0.28 | trafilatura |
| 109216 | 0.80 | 0.83 | unchanged | 0.17 | trafilatura |
| 110150 | 0.86 | 0.85 | unchanged | 0.14 | trafilatura |
| 74068 | 0.98 | 0.63 | unchanged | 0.02 | trafilatura |
| 114520 | 0.98 | 0.96 | unchanged | 0.02 | trafilatura |
| 104 | 0.98 | 0.28 | unchanged | 0.02 | trafilatura |
| 50321 | 0.97 | 0.99 | unchanged | 0.01 | trafilatura |
| 5875 | 1.00 | 0.40 | unchanged | 0.00 | trafilatura |
| 25961 | 1.00 | 0.98 | unchanged | 0.00 | trafilatura |
| 116912 | 1.00 | 0.60 | unchanged | 0.00 | trafilatura |
| 117586 | 1.00 | 1.00 | unchanged | 0.00 | trafilatura |
| 113763 | 1.00 | 1.00 | unchanged | 0.00 | trafilatura |
| 2757 | 1.00 | 0.96 | unchanged | 0.00 | trafilatura |
| 81674 | 1.00 | 1.00 | unchanged | 0.00 | trafilatura |
| 36983 | 1.00 | 1.00 | unchanged | 0.00 | trafilatura |
| 7722 | 1.00 | 1.00 | unchanged | 0.00 | trafilatura |
| 112350 | 1.00 | 1.00 | unchanged | 0.00 | trafilatura |

## Read

- **Coverage** is the join metric that matters for CL fragments: how much of
  the April scrape still appears in the archived page.
- **Significance** uses `max(coverage, similarity)` so a good fragment join
  is not punished by unequal document length.
- **Product:** `frontend/src/data/content_diffs.json` feeds candidate
  “Content chronology” and `/api/candidates/{id}` `contentDiff`.

Artifacts: `data/out/wayback_spike/diff_summary.csv` (gitignored under `data/`).


## Reproduce

```bash
civicord changes
civicord wayback-spike --limit 150  # resume-friendly; caches under data/out/
civicord diff-spike                 # re-extract + significance (offline)
```
