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
