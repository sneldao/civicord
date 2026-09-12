# Wayback spike findings

Phase 1 spike (2026-09-12): prove we can **CDX → `id_` fetch → sha256 →
compare** against the April 2025 Campaign Lab scrape for change-signal
cohorts (`gone` + `repurposed_suspect`).

## Headline (expanded batch)

| Metric | Result |
|---|---|
| Sample | **50** URLs (gone + repurpose-suspect, April text preferred) |
| Bodies cached | **48** `.bin` files under `data/out/wayback_spike/` |
| Classifiable diffs | **45** (`civicord diff-spike`) |
| Coverage (April tokens ⊂ Wayback) | min **0.00** · median **0.28** · max **1.00** |
| Significance | unchanged **6** · minor **8** · major **16** · transformed **15** · incomparable **5** |

Snapshot picker prefers `20250301–20250531`, then any 2024–2025 hit closest to
mid-April (avoids preferring a GE-only window that skips April). Frontend
publishes compact rows to `frontend/src/data/content_diffs.json` (no HTML bodies);
candidate pages with a row show a **Content chronology** block.

### Earlier n=14 raw-similarity spike

First pass used blunt HTML `SequenceMatcher` (median **0.03**) — that understated
overlap because Campaign Lab stores *fragments*, not full HTML. Normalized
coverage fixed the join; see the section below for the current score table.

## What this unlocks

1. **Scale CDX + `id_` further** — treat Wayback as primary for dead domains;
   enlarge past 50 (`--limit 150` in flight / resume-friendly).
2. **Normalize + significance — shipped** — `civicord diff-spike` (trafilatura +
   token coverage); surface on timelines via `content_diffs.json`.
3. **Browse filter — shipped** — `/browse?sig=transformed` (etc.).
4. **On-chain next:** `snapshot_sha256` text records once we trust the body.
5. **Product next:** theme rollups over many diffs.

# Normalized diff spike

Re-diff of existing Wayback `id_` bodies vs April Campaign Lab text,
after **trafilatura** (or fallback) extraction + shared plaintext normalize.

**Pairs:** 50 · **classifiable:** 45

### Significance classes

| class | n | meaning |
| --- | --- | --- |
| unchanged | 6 | related ≥ 0.75 (coverage or similarity) |
| minor | 8 | related 0.40–0.75 |
| major | 16 | related 0.15–0.40 |
| transformed | 15 | related < 0.15 |
| incomparable | 5 | missing one side |

### Metrics (normalized)

- **Coverage** (April tokens in Wayback): min 0.00 · median 0.28 · max 1.00
- **Similarity** (SequenceMatcher): min 0.00 · median 0.02 · max 1.00

| person_id | coverage | similarity | significance | score | extractor |
| --- | --- | --- | --- | --- | --- |
| 9688 | 0.00 | — | transformed | 1.00 | none |
| 43443 | 0.00 | — | transformed | 1.00 | none |
| 96054 | 0.00 | 0.01 | transformed | 0.99 | trafilatura |
| 99579 | 0.04 | 0.00 | transformed | 0.96 | trafilatura |
| 94344 | 0.05 | 0.00 | transformed | 0.95 | trafilatura |
| 5443 | 0.02 | 0.06 | transformed | 0.94 | trafilatura |
| 4653 | 0.02 | 0.06 | transformed | 0.94 | trafilatura |
| 98205 | 0.08 | 0.01 | transformed | 0.92 | trafilatura |
| 84208 | 0.11 | 0.01 | transformed | 0.89 | trafilatura |
| 30887 | 0.11 | 0.00 | transformed | 0.89 | trafilatura |
| 89046 | 0.11 | 0.00 | transformed | 0.89 | trafilatura |
| 2323 | 0.14 | 0.00 | transformed | 0.86 | trafilatura |
| 19504 | 0.14 | 0.08 | transformed | 0.86 | trafilatura |
| 93629 | 0.14 | 0.00 | transformed | 0.86 | trafilatura |
| 35866 | 0.15 | 0.00 | transformed | 0.85 | trafilatura |
| 7842 | 0.16 | 0.00 | major | 0.84 | trafilatura |
| 4645 | 0.17 | 0.09 | major | 0.82 | trafilatura |
| 40908 | 0.21 | 0.00 | major | 0.79 | trafilatura |
| 69698 | 0.21 | 0.01 | major | 0.79 | trafilatura |
| 64212 | 0.23 | 0.00 | major | 0.77 | trafilatura |
| 111356 | 0.23 | 0.04 | major | 0.77 | trafilatura |
| 72699 | 0.28 | 0.00 | major | 0.72 | trafilatura |
| 110639 | 0.28 | 0.00 | major | 0.72 | trafilatura |
| 11325 | 0.29 | 0.03 | major | 0.71 | trafilatura |
| 4635 | 0.29 | 0.05 | major | 0.71 | trafilatura |
| 71874 | 0.34 | 0.01 | major | 0.66 | trafilatura |
| 38153 | 0.34 | 0.10 | major | 0.66 | trafilatura |
| 73418 | 0.36 | 0.00 | major | 0.64 | trafilatura |
| 88950 | 0.37 | 0.03 | major | 0.63 | trafilatura |
| 105335 | 0.39 | 0.01 | major | 0.61 | trafilatura |
| 27013 | 0.39 | 0.01 | major | 0.61 | trafilatura |
| 108954 | 0.44 | 0.17 | minor | 0.56 | trafilatura |
| 4616 | 0.45 | 0.02 | minor | 0.55 | trafilatura |
| 1478 | 0.25 | 0.52 | minor | 0.48 | trafilatura |
| 97574 | 0.58 | 0.02 | minor | 0.42 | trafilatura |
| 84358 | 0.59 | 0.36 | minor | 0.41 | trafilatura |
| 47091 | 0.61 | 0.17 | minor | 0.39 | trafilatura |
| 35689 | 0.62 | 0.42 | minor | 0.38 | trafilatura |
| 2189 | 0.65 | 0.01 | minor | 0.35 | trafilatura |
| 109216 | 0.80 | 0.83 | unchanged | 0.17 | trafilatura |
| 74068 | 0.98 | 0.63 | unchanged | 0.02 | trafilatura |
| 5875 | 1.00 | 0.40 | unchanged | 0.00 | trafilatura |
| 25961 | 1.00 | 0.98 | unchanged | 0.00 | trafilatura |
| 36983 | 1.00 | 1.00 | unchanged | 0.00 | trafilatura |
| 7722 | 1.00 | 1.00 | unchanged | 0.00 | trafilatura |

## Read

- **Coverage** is the join metric that matters for CL fragments: how much of
  the April scrape still appears in the archived page.
- **Significance** uses `max(coverage, similarity)` so a good fragment join
  is not punished by unequal document length.
- **Product:** `content_diffs.json` → candidate “Content chronology” +
  `/api/candidates/{id}` `contentDiff` (spike sample only).

Artifacts: `data/out/wayback_spike/diff_summary.csv` (gitignored under `data/`).

## Reproduce

```bash
civicord changes
civicord wayback-spike --limit 150  # resume-friendly; caches under data/out/
civicord diff-spike                 # re-extract + significance (offline)
```
