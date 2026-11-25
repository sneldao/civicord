# Methodology — Civicord evidence bundle

Methodology version: `civicord-methodology/2026-11-25`
Generated: `2026-11-25T17:36:13Z`

## Scope

This bundle is a versioned publication mirror for the Civicord public record
covering the UK parliamentary constituency of **Holborn and St Pancras**. It is derived
from the committed Civicord frontend data snapshot, itself derived from the
Campaign Lab April 2025 candidate-website scrape, Democracy Club person IDs,
and Civicord's audit pipeline. The audit baseline represented here is
`2026-09-07` unless a row carries a more specific timestamp in the source data.

This is not a new crawl, a new judgement, or a replacement canonical register.
It is a static export of already-public Civicord records plus the methodology
and caveats needed to interpret them.

## What the audit classes mean

- `live` means the URL returned a successful HTTP response during the audit. It
  does not prove that the original campaign content survived.
- `dns_error` means DNS did not resolve during the audit. It does not prove why
  the domain disappeared.
- `http_error` means the server returned an HTTP error. Bot blocking, temporary
  failure and genuine removal can look alike from one vantage point.
- Redirects are destinations observed by the audit. Many redirects are same-site
  or platform artefacts; they are not automatically evidence of repurposing.
- `repurposed_suspect` is a heuristic label. Surname matching is a heuristic
  against the response body and can be wrong in both directions.

## Evidence hierarchy

The canonical Civicord record URLs, stable Democracy Club person IDs, source
scrape, audit outputs and methodology are the system of reference. This mirror
is a secondary publication surface. It must be versioned and must not overwrite
a cited snapshot in place.

## Claim diffs

Bulk claim-diff rows are omitted by default because the April site-wide text
and later homepage-only re-crawl have a scope mismatch. If `claim-diffs.json`
is present, every row must carry its scope explanation, and counts must not be
quoted as proven losses without that scope attached.

## Licence and attribution

Civicord-derived outputs are CC-BY. Campaign Lab April 2025 extracted scrape
text may be reused and redistributed with credit under the CC-BY arrangement
recorded in the Civicord repository. Democracy Club person IDs and roster
labels remain attributed to Democracy Club.
