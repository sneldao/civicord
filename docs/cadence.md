# Refresh cadence

Decision (2026-09-22): re-scrape ownership and cadence are ours (Campaign
Lab will not re-crawl). The loop that makes Civicord tracking rather than a
two-snapshot exhibit:

| Pass | Cadence | Command | Cost |
|---|---|---|---|
| Liveness audit + change signals | Monthly (1st, 06:00 UTC) | `download → ingest → audit --content-check → changes` | Minutes, static outputs |
| Body re-crawl + claim diff | Quarterly + pre-election | `recrawl → claimdiff` | ~15 min crawl, offline diff |

Snapshots refresh via pull request (human-reviewed, never direct to main);
Pages deploy stays manual per [ops.md](ops.md). Automation lives in
`.github/workflows/refresh.yml` — `workflow_dispatch` with `full: true`
runs the quarterly pass on demand.

Election timing overrides the calendar: a called election triggers an
immediate full pass (baseline) plus a post-election pass (the flagship
candidate→MP transition story).

**Vantage requirement (2026-10-22):** audits must run from a residential/proxy
vantage — the Oct 22 CI run flipped 374 sites live→error; 330 still answered 200
from residential (88% bot-block artifact). The audit classes 403/429 as
`inconclusive_blocked` and is two-stage: cheap CI pass, then
`civicord audit --status inconclusive_blocked` via `CIVICORD_PROXY` re-checks
only blocked rows and merges them back into `audit_liveness.csv` in place.
`--status` lands with the two-stage refresh workflow 2026-11-16.

## May 2027 local elections — the first live exercise

The election-override clause gets its first real test on **Thursday 6 May
2027** (English local elections; any called by-elections run on the same
machinery). Two things make it more than a re-run of the current roster:

1. **A second roster, not just a second snapshot.** Democracy Club's
   candidates.democracyclub.org.uk covers local-election candidacies, so the
   ingest can widen from the 2024 GE roster to May 2027 candidacies — the
   first proof that the pipeline is roster-agnostic, not just region-agnostic
   in name. Spike findings (2026-11-16):
   - **The schema already fits.** The Campaign Lab candidates.csv the ingest
     reads today carries 993 `local.*` rows (984 with homepage_url), plus
     `mayor.`/`gla.`/`pcc.` — nothing in ingest or audit keys on `parl.`
     except one report counter. The work is a new roster *source*, not new
     ingest logic.
   - **YNR API is auth-gated now** (`/api/v0.9/` and `/api/next/` both 401
     without credentials). May-2027 roster access needs an API key or a
     current export — another concrete reason the Democracy Club outreach
     matters.
   - Licence note: YNR data is **CC-BY-SA** (share-alike), not the plain
     CC-BY the Campaign Lab scrape was cleared under — attribution *and*
     share-alike terms need checking before a YNR-derived roster is
     republished in bulk.
2. **The flagship transition story at low stakes.** GE-2024 candidates who
   stood again locally, plus new faces — the candidate→representative
   transition is exercised here before any general election forces it.

### Timeline to hold

|| When | Pass | Notes |
|---|---|---|---|
| ~Mar 2027 | Roster spike | Confirm YNR local-election URL coverage; decide ingest scope (all-May-2027 vs. English-local subset) |
| Candidate lists close (~early Apr 2027) | **Baseline full pass** | `download → ingest (new roster) → audit → recrawl → claimdiff` — the pre-election corpus |
| Election week (3–7 May) | Nothing scheduled | Let results land in YNR |
| +2–4 weeks | **Post-election pass** | Full re-run; the transition stories live in the claim diffs and site-fate changes |

Election night itself changes nothing technically — the record is about the
web, and the web moves on a slower clock than the count.
