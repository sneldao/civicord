# Zapier Build Week — the journalist digest, prototyped for free

> Assessed 2026-11-25 (Build Week Day 3). 250 free Zapier MCP calls/day per
> account until **5 Jan 2027, noon ET**. Not a hackathon — a zero-cost window to
> prototype the consumable artifact the outreach strategy is missing.

## The gap this closes

[change-feed.md](change-feed.md) is honest about the scorecard: the signals
exist, the steward digest shows *where* to look, and the exhibit pitch in
[outreach.md](outreach.md) says the artifact is the argument. What neither
produces is the thing a journalist or Democracy Club actually consumes: **a
plain spreadsheet row or email when something changes**. Monthly liveness
audits and quarterly recrawls already run on cadence — but their outputs land
as JSON/CSV in R2 that nobody outside the project ever opens.

Zapier MCP is an outbound rail: an agent calls it to write rows into Google
Sheets, send Gmail, post to Slack. The digest shape writes itself:

> *"Using Zapier MCP: read the latest `content_diffs.json` / change-signals
> output, append this month's new gone/redirected/repurposed rows to my tracking
> Google Sheet, and email me a summary of the top significance-scored changes."*

Run once per monthly refresh, that is ~3–5 calls — trivially inside the 250/day
cap, because Civicord's cadence is monthly, not per-user. **The cap that kills
this for consumer products is irrelevant at civicord's batch rhythm.**

## Why it's worth doing here

1. **It strengthens the unsent outreach drafts.** All four partner drafts in
   outreach.md are still unsent as of 2026-11-16 — sending them is already the
   highest-leverage non-engineering action. A draft that attaches *"here is the
   tracking sheet the digest already produces"* is a stronger pitch than one
   describing the dataset in the abstract, per the exhibit-pitch logic.
2. **It rehearses the May 2027 live exercise.** The local-election pass
   (cadence.md §May 2027) will generate the first genuinely time-sensitive
   changes — candidacy periods are when sites appear, shift and vanish fastest.
   Having the digest plumbing proven before May means the first live exercise
   produces a subscribable artifact, not just a refreshed dataset.
3. **Zero build cost.** No code: the pipeline outputs are already static JSON.
   The skill is a prompt run after each monthly refresh.

## Honest limits

- Zapier MCP is a prototyping rail, not the publication mechanism. If the digest
  proves the format is what journalists want, the durable version is a public
  append-only changes.csv/newsletter that doesn't depend on a 250-calls/day
  free tier or one person's Zapier account. Don't let the prototype become the
  product — Civicord's credibility rests on openly licensed public artifacts.
- The digest must keep the project's precision discipline: signal classes and
  significance scores are candidates, not conclusions (change-feed.md). A sheet
  row that overclaims ("deleted pledge") where the data only supports a signal
  class ("gone, cause unknown") would do active harm in front of exactly the
  audience the outreach is for.

## If we do it

1. Save the skill in the AI tool connected at mcp.zapier.com; point it at the
   R2-served `/data/` outputs.
2. Run it against the November refresh as a dry run; check the sheet rows carry
   the same caveat language the site uses.
3. Then cite the live sheet in the Democracy Club draft when it goes out.
