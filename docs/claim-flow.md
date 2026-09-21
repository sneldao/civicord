# Take the pen — candidate claim flow (design)

Status: design spike, not built. Ownership settled 2026-09-21: candidate
updates are ours and the candidates' to design; Campaign Lab is distribution,
not owner.

## Problem

Candidates are the only persona with a selfish reason to return ("that's my
page, it moved") — and therefore the freshness mechanism every other persona
depends on. Today a candidate who spots an error has no path except GitHub.

## Flow (Google-Business-Profile style, chain invisible)

1. **Claim:** from a candidate record page, "Is this your record? Claim it."
   Claimant proves candidacy: email from the campaign domain, or a check
   against the Democracy Club record, else a manual review queue. Never
   self-serve on assertion alone.
2. **Propose:** claimant submits a correction (URL moved, site relaunched,
   record misattributed). Proposal is a *suggestion*, not an edit.
3. **Review + publish:** maintainer (or Campaign Lab, as distributor) accepts;
   the ledger records the correction as a new auditable fact with provenance
   (who claimed, what changed, when) — history is appended, never rewritten.
4. **Verify:** the on-chain permission layer (ENSv2 Permissioned Resolver,
   delegate writes per record) exists precisely to hand a candidate write
   authority over one record without controlling the namespace. Sell the
   outcome ("only you can update your record"), not the mechanism.

## Abuse model (must design before building)

* Opponents filing false corrections or claiming rivals' records → identity
  check + public proposal log (sunlight is the control).
* Candidates whitewashing the record (deleting embarrassing history) →
  corrections append; the audit trail and prior snapshots stay citable.
* Spam volume → manual queue is fine at this scale (2,375 records); automate
  only if it hurts.

## MVP scope

Correction-request form → review queue (email or tracker, not a bespoke
dashboard) → accepted corrections published as ledger facts with provenance
→ Campaign Lab distributes the "claim your record" path to candidates.
On-chain delegate writes follow once the off-chain loop works — chain as
verifiability, not as the application.
