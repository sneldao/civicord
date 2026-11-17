# Take the pen — candidate claim flow (design)

Status (2026-11-16): the review queue now takes decisions. Corrections AND
claim requests are queued from the candidate record (`POST /api/corrections`,
KV-bound via `CORRECTIONS_KV` — bound in prod). `/review` is actionable:
a maintainer pastes a reviewer token, writes an optional public note, and
accepts or rejects each row. `POST /api/corrections/decide` (Bearer
`REVIEW_TOKEN` Pages secret; 501 when unset, 401 on mismatch, 409 on a
second decision) flips the row's status and appends to the public
decisions log — `GET /api/corrections/decisions`, newest first, no
claimant contact. Sunlight is the abuse control: the queue view and the
log are both public; only the write is gated.

Applying an accepted correction remains a deliberate maintainer act: the
queue never edits the audit, the scrape, or the on-chain record — an
accepted row is input to the next publish/audit cycle, logged. The
ENSv2 delegate path exists as `scripts/publish/grant.py` (grant/revoke
`ROLE_SET_TEXT` on one text key to one account) — with the documented
scoping caveat: a setter grant covers that key on **every** name on the
resolver, so it suits namespace-shared keys or trusted delegates until
per-candidate resolver instances exist.

Storage: local dev/preview writes `frontend/.data/correction-queue.json`
+ `correction-decisions.json`; dev token env is `CIVICORD_REVIEW_TOKEN`.
Ownership settled 2026-09-21: candidate updates are ours and the candidates'
to design; Campaign Lab is distribution, not owner.

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
