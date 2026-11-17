# France — the second-jurisdiction spike

Status: spike notes, 2026-11-16. Nothing built. The claim under test is the
README's "designed for any democracy" — today it's a claim, not evidence.
This page records what a French deployment would actually take so the
decision is an informed one.

## The honest correction to the framing

France's 2027 calendar is a **presidential** election (~April 2027, two
rounds) — not legislatives. The National Assembly was elected June–July
2024 after a dissolution; the next legislatives are scheduled **2029**
unless another dissolution happens (post-2024, that is a real possibility
but not a date you can plan against). Two very different deployments:

|| Scope | Candidates | Jurisdictions | When |
|---|---|---|---|
| Présidentielle | national | ~12–15 | 1 | ~Apr 2027 |
| Législatives | 577 circonscriptions | ~3,500–4,000 typical | 577 | 2029, or on dissolution |

The presidential is a *cheap* second-jurisdiction proof: a dozen
high-salience records, one jurisdiction, a real deadline — the smallest
possible honest test of "the pipeline is region-agnostic". The
legislatives is the true peer of the UK deployment and should be
dissolution-watched, not scheduled.

## The three inputs, per the region model

**1. Public roster — exists, in a different shape.**

- Ministère de l'Intérieur publishes official candidate lists and results
  at `resultats-elections.interieur.gouv.fr`, mirrored as open data on
  data.gouv.fr. Candidacies only open ~3–4 weeks before the vote — the
  roster cannot exist earlier (same constraint as everywhere).
- France has a UK-lacks artifact: **professions de foi**, the official
  campaign leaflets every candidate files — scanned PDFs published by the
  state. A candidate's own print document is a first-class record source
  the UK model doesn't have; worth treating as a parallel corpus, not
  just a website hint.
- No Democracy Club equivalent → **person IDs are the work**. Options:
  Wikidata QIDs (most sitting députés and all presidential candidates
  have them; candidates generally don't) or minted interior-ministry
  keys. Wikidata also carries `P856` official-website links for
  incumbents — partial coverage, but a seed.

**2. The crawl — the actual gap.** There is no Campaign Lab France. A
French website roster would be assembled from: Wikidata P856, party
candidate pages, URLs inside professions de foi, and search. For ~12
presidential candidates this is an afternoon of manual verification —
perfect for a first deployment. For 4,000 legislative candidates it's a
real project (which is what makes it worth a grant line).

**3. The record store — unchanged.** Pipeline, ENSv2 register
(`{id}.civicord.eth` — ID scheme to decide: QID or minted), ledger,
subgraph, map. Jurisdiction naming: the API contract already says
`?constituency=` is "the current name of a jurisdiction instance" —
circonscriptions slot in without a rename; a presidential record is one
jurisdiction of scope `national`.

## What it would prove

- Roster-agnostic: non-YNR schema → same ingest (the May-2027 spike
  already showed UK local rows fit; France tests a *non-UK* schema).
- The ENS/register is not UK-keyed (labels are minted, not YNR IDs).
- The change feed works where the "site" baseline is partly a
  profession-de-foi scan rather than a scrape — a different corpus
  shape through the same diff machinery.

## Recommendation

Track, don't build yet. The presidential roster can't exist before
~March 2027. If a dissolution is called, legislatives become the
higher-value but much heavier deployment — worth having this file's
source list ready so the response is days, not weeks. Either way the
dependency ordering is the same: vantage close-out and the May-2027
UK pass come first (cadence.md), because France reuses both.

## Open questions for whoever picks this up

- Does data.gouv.fr expose candidate contact/website fields, or only
  names/results? (Verify against the 2024 legislative dataset.)
- Profession de foi PDFs: are they text-extractable or image scans —
  and does the ministry permit redistribution of extracts?
- Wikidata licence is CC0 — clean; interior-ministry data is Licence
  Ouverte 2.0 — compatible with CC-BY-style attribution but check the
  etalab terms for the specific dataset.
