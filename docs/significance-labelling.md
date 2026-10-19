# Significance labelling — calibrating "politically relevant" against "arbitrary"

The change feed can say that a page moved. It cannot yet say that the move
matters. [`change-feed.md`](change-feed.md) Phase 2 lists significance
heuristics and a fixed policy taxonomy as the unbuilt half of the chronology,
and the standing rule there is that the journalist and steward surfaces show
*where* to look, never *what* changed semantically.

Deciding what counts as significant is not a threshold we can pick from the
armchair: a campaign worker, a finance researcher and a roster steward
disagree about the same signal. So the weighting gets calibrated by asking
people who do this work to sort real records, then reading what the sorting
implies about the data.

This document is that instrument plus the measurements it surfaced. The
returned sheets, the labellers' identities and the rationale behind which
records were chosen are held privately — the second of those is the only reason
this file names no labeller.

## Data basis

Load-bearing. Every judgement below inherits these limits, and the record cards
state them to whoever sorts:

- **Liveness audit: a single day, 2026-09-07.** `live` is an HTTP-response
  class, not evidence that content survived. Temporary outages are
  indistinguishable from removals.
- **`nameFound` is a surname substring test** against the response body. Weak,
  with false positives and false negatives expected in both directions.
- **Claim diffs compare April 2025 site-wide scrape text against the 2026-09-21
  homepage-only re-crawl.** A "deleted" sentence can therefore mean "we did not
  re-fetch the page it was on", not "it was removed". Recorded per row as
  `scope_note`, and spelled out in prose on any surface that quotes a count.
- **Content diffs (Wayback vs April text) are a 174-person spike**, not the
  corpus. See [`wayback-spike.md`](wayback-spike.md).
- **Citation is the record URL.** ENS names exist for 3 of 2,375 records, so
  none of the ten below may be cited as `*.civicord.eth`.

Every card links to a public record, so a reader can check all of it.

## The ten records

Chosen to separate the axes that get conflated: a ledger signal with no content
change, a content change with no ledger signal, a deletion that is really a
scope artefact, and a thin evidential base wearing a confident score.
Neutral by construction — each states facts and asks a question without hinting
which record we expect to be material.

### R1 — person 2525 · Maria Miller · Conservative and Unionist Party · Basingstoke

- Scraped URL: `https://www.maria4basingstoke.co.uk`
- Ledger signal: **Repurposed (review needed)** — responds HTTP 200, redirects,
  surname not found in body.
- Redirect target: `https://bettingsitesuknongamstop.co/`
- Content diff vs April text: `major` (score 0.81, coverage 0.19)
- April scrape held 5 pages.
- Record: https://civicord.pages.dev/candidates/2525

### R2 — person 55842 · Jake Welsh · Green Party · Baguley

- Scraped URL: `http://jakewelsh.blogspot.co.uk`
- Ledger signal: **Redirected** — target is `jakewelsh.blogspot.com`.
- Claim diff: April 159 sentences → 155 still present, **4 deleted**, 476 added.
- Deleted text carries topic tags `climate` and `transport`, e.g. "We are in a
  climate emergency and rapidly need to reduce global greenhouse gas
  emissions…"; and high-speed rail (HS2) passages.
- Scope note: April site-wide vs re-crawl homepage. April scrape held 1 page.
- Record: https://civicord.pages.dev/candidates/55842

### R3 — person 19953 · Kate Foale · Labour Party · Beeston Central & Rylands

- Scraped URL: `https://katefoale.net`
- Ledger signal: **Responding** — HTTP 200, no redirect, surname found. Nothing
  in the ledger flags this record.
- Claim diff: April 42 sentences → 37 present, **5 deleted**, 4 added.
- Deleted text is tagged `education`: "Fighting for Families, Children, and
  Young People…", "Improving facilities for our children… play equipment at
  Leyton Crescent…".
- Scope note: April site-wide vs re-crawl homepage. April scrape held 1 page.
- Record: https://civicord.pages.dev/candidates/19953

### R4 — person 35041 · Shaun Hughes · Independent · Frome and East Somerset

- Scraped URL: `https://www.shaunhughes.info`
- Ledger signal: **Responding** — clean, no redirect, surname found.
- Claim diff: April 88 → 86 present, **2 deleted**, 12 added.
- Deleted sentences are about the person, not policy: "My work as a councillor
  includes: — Independent BANES Councillor for Midsomer Norton North ward —
  Group spokesperson…"; "…a real Shaun is a local entrepreneur, businessperson
  and current B&NES councillor…".
- Record: https://civicord.pages.dev/candidates/35041

### R5 — person 7364 · Terence London · Independent · Dagenham and Rainham

- Scraped URL: `http://concordia503.wordpress.com`
- Ledger signal: **Repurposed (review needed)** — surname absent from body.
- Redirect target is the same site over HTTPS (`concordia503.wordpress.com`).
- Claim diff: April 387 → 373 present, **14 deleted**, 15 added. Deleted text is
  mixed: platform boilerplate ("Unlike posts, pages are better suited for more
  timeless content…"), a contact block ("Contact us: concordiaengland@yahoo.com
  Head Office Concordia, 318 Wood Lane, Dagenham…"), and one `democracy`-tagged
  paragraph about the Conservatives.
- April scrape held 8 pages.
- Record: https://civicord.pages.dev/candidates/7364

### R6 — person 19740 · Andy Street · Conservative and Unionist Party · West Midlands Combined Authority

- Scraped URL: `https://www.andystreet.org.uk`
- Ledger signal: **Repurposed (review needed)** — surname absent from body.
- Redirect target: `https://www.conservatives.com/`
- Claim diff: April 12 → 9 present, 3 deleted, 28 added.
- Content diff vs April text: `major` (score 0.83, coverage 0.17)
- Record: https://civicord.pages.dev/candidates/19740

### R7 — person 119916 · Russell Warren Jarvis · Reform UK · Ridgeway East

- Scraped URL: `http://midbucksreform.com`
- Ledger signal: **Repurposed (review needed)** — surname absent from body.
- Redirect target: `https://midbucksreform.co.uk` (same branch site, other TLD)
- Claim diff: April 8 → 7 present, **1 deleted**, 5 added. The deleted sentence:
  "Thank you for visiting the website of our local REFORM UK branch in the newly
  created constituency of Mid-Buckinghamshire."
- Record: https://civicord.pages.dev/candidates/119916

### R8 — person 4119 · Helen Whately · Conservative and Unionist Party · Faversham and Mid Kent

- Scraped URL: `http://www.helenwhately.co.uk`
- Ledger signal: **Gone** — DNS does not resolve.
- Content diff (last Wayback capture vs April text): `transformed`
  (score 0.99, coverage 0.006). Low-confidence basis: the April scrape held
  1 page for this record.
- Record: https://civicord.pages.dev/candidates/4119

### R9 — person 1688 · Adam Holloway · Conservative and Unionist Party · Gravesham

- Scraped URL: `https://www.adamholloway.co.uk`
- Ledger signal: **Gone** — DNS does not resolve.
- No archived page text for this candidate in the April scrape, so no content
  comparison is possible. We can say the site is unreachable; we cannot say what
  it used to contain.
- Record: https://civicord.pages.dev/candidates/1688

### R10 — person 3454 · A. Gent Chinners · The Official Monster Raving Loony Party · Kingston and Surbiton

- Scraped URL: `http://www.loonyparty.com`
- Ledger signal: **Responding** — HTTP 200, surname found. Site is live.
- Claim diff: April 95 sentences → **0 present**, 95 deleted, 23 added.
- Deleted text includes a satirical cost-of-living pledge ("…we will Convert
  Numbers 10 and 11 Downing Street into a Hair salon…"), a membership pitch, and
  a donation address.
- Scope note: April site-wide vs re-crawl homepage — the re-crawl fetched one
  page of a six-page April scrape.
- Record: https://civicord.pages.dev/candidates/3454

## What the labeller records

For each of R1–R10:

| # | Materiality rank (1 = most) | Would act on it? Y/N | One line why |
|---|---|---|---|
| R1 | | | |
| R2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |
| R8 | | | |
| R9 | | | |
| R10 | | | |

Then a second pass **blinded** — same facts, candidate, party and seat hidden —
marking any record whose rank changes once the target is invisible. If the
blinded pass changes nothing, content alone drives the judgement and can be
scored without knowing who the person is. If it changes a lot, a significance
score is an aid to a reader, not a ranking, and must not be presented as one.

| Blinded | Facts shown |
|---|---|
| B1 | 200 · redirects to an unrelated betting-affiliate domain · surname absent |
| B2 | 200 · TLD-only redirect · 4 sentences deleted, tagged climate + transport |
| B3 | 200 · no redirect · 5 sentences deleted, tagged education |
| B4 | 200 · no redirect · 2 sentences deleted, both biographical |
| B5 | 200 · HTTP→HTTPS same site · 14 deleted: boilerplate + contact block + 1 political |
| B6 | 200 · personal domain now redirects to party HQ site · 3 deleted, 28 added |
| B7 | 200 · TLD-only change on a branch site · 1 sentence deleted (branch welcome text) |
| B8 | DNS does not resolve · last archive bears little resemblance to earlier text (thin basis) |
| B9 | DNS does not resolve · no archived text, comparison impossible |
| B10 | 200 · site live · 95 of 95 sentences "deleted", 6 pages vs 1 re-fetched |

Asking "would you act on this" is a materiality question, the same one a
researcher asks before filing or a journalist asks before printing. It does not
change what the record says: the public ledger is identical whatever a paid
reader concludes, per the convenience-not-privilege rule in
[`personas.md`](personas.md) §5.

## Two measurements this pass surfaced

Neither is about labeller judgement. Both are about our own signals, and both
argue for scoring over alerting.

1. **65% of `redirected` rows are same-site artefacts.** 427 of 659 keep the
   same site name — TLD moves (`.co.uk` → `.com`), `http` → `https`,
   `blogspot.co.uk` → `.com`, redirects to `about.me`, or redirects within a
   party CMS. Only 232 point at a genuinely different host. A redirect alert as
   it stands is two-thirds noise.
2. **51% of `repurposed_suspect` sits on shared party infrastructure.** 230 of
   448 records are on a domain used by more than one candidate (busiest:
   `northants.greenparty.org.uk` 44, `reformparty.uk` 37, `votelife.co.uk` 18,
   `partyof.wales` 14, `libdems.org.uk` 11, `linktr.ee` 10). "Surname absent"
   fires on branch pages, where a candidate's name legitimately does not appear,
   not only on hijacked domains.

Both are **precision** problems, not recall problems. Nothing is being missed;
too much is being raised. That distinction is the argument for a significance
score read by a human, against a notification stream that costs the reader time
to be told things twice as often as they need to hear them.

## What this does not license yet

A deletion count is not publishable as a loss metric while the re-crawl is
homepage-only. R10 is the proof case: 95 of 95 sentences "deleted" on a site
that is live and unchanged in any way we can demonstrate, because we compared
six pages against one. Two consequences we hold ourselves to:

- Deletions are only meaningful where the kept-ratio is high. A record where
  nothing survived the re-fetch tells us about our fetch, not about their edit.
- Until the re-crawl covers the whole site, the surfaces cite the scope in
  prose (`scopeExplanation` in `frontend/src/lib/walkback.ts`) rather than
  printing the internal scope slug, so no count leaves here that a reader can
  quote without its limit attached.

Shipping a deletion metric ahead of a same-scope re-crawl would be the one way
to make this dataset false.
