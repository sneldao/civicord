# Outreach Strategy & Draft Emails

Partnership-first: the research (see [../RESEARCH.md](../RESEARCH.md)) shows the
data layer already exists — civicord's value comes from joining it. These
conversations should happen **before** writing the diff engine. Change signals
v0 (audit-derived gone / repurpose / redirect classes) already shipped — see
[change-feed.md](change-feed.md); full text diffs still wait on T₁ bodies +
Campaign Lab license clarity.

## Priority order

1. **Democracy Club** — IDs, distribution, possible institutional home
2. **UK Web Archive / British Library** — 2024 collection access + seed nominations
3. **EDGI** — reuse of web-monitoring components
4. **mySociety** — patterns, audience, possible integration surface

## Draft: Democracy Club

> Subject: Candidate website tracker — reusing your data, seeking your input
>
> Hi [name],
>
> We're building Civicord, an open project that turns one-off candidate website
> snapshots into a longitudinal dataset — tracking which sites stay live, what
> changes, and which claims get quietly deleted after elections. It builds on
> Campaign Lab's April 2025 candidate website scrape.
>
> We'd like to key everything on your person IDs and join against the YNR
> exports. Longer-term, we think a "website status + change feed" could be a
> natural extension of the Candidates database itself.
>
> Two questions:
> 1. Is this something Democracy Club would be interested in as a partner or
>    eventual home for the dataset?
> 2. Does the YNR API reliably expose candidate website/homepage URLs today?
>
> Happy to share our research and architecture docs. Would a 30-minute call work?

## Draft: UK Web Archive (British Library)

> Subject: Candidate website tracking — 2024 GE collection access + future collaboration
>
> Hi [name],
>
> We're building Civicord, an open longitudinal tracker of UK candidate and MP
> websites, building on Campaign Lab's 2025 scrape. We saw your election web
> archiving work (2017, 2019) and have two questions:
> 1. Does the UKWA hold a 2024 general election collection including candidate
>    websites, and what is the access model under the Legal Deposit regulations?
> 2. Would the UKWA be interested in civicord acting as a seed nominator for
>    candidate websites at future elections, in the spirit of the US End of Term
>    Web Archive's nomination model?
>
> We'd also welcome a conversation about making any restricted archived
> candidate-site content more accessible to researchers via derived,
> publicly-shareable datasets (text/diffs rather than raw captures).

## Draft: EDGI

> Subject: Reusing web-monitoring for UK candidate websites
>
> Hi [name],
>
> We're starting Civicord — a longitudinal tracker of UK political candidate
> websites (change logs, deleted claims, message shifts), building on Campaign
> Lab's scrape. EDGI's web-monitoring project is the closest prior art we've
> found, and we'd rather build on your architecture than reinvent it.
>
> Questions:
> 1. Is web-monitoring active/maintained, and is any of it reusable for a UK
>    candidate-site context?
> 2. Would you be open to a short call about your version/diff data model and
>    what you'd do differently today?
>
> We're happy to contribute learnings (and code) upstream.

## Draft: mySociety

> Subject: Tracking candidate/MP websites over time — overlap with your work?
>
> Hi [name],
>
> We're building Civicord, an open longitudinal tracker of UK candidate and
> representative websites — snapshot diffs, deleted claims, messaging shifts
> across the candidate→MP boundary. It complements TheyWorkForYou's activity
> record rather than duplicating it.
>
> We wanted to check: (1) has mySociety explored website monitoring for MPs, or
> does anything in your portfolio overlap? (2) any interest in sharing patterns,
> or integrating a change feed into MP profile pages down the line?

## Log

| Date | Org | Contact | Outcome |
| --- | --- | --- | --- |
| 2026-09-07 | Campaign Lab | In-person visit | Scrape license + metadata questions raised (see plan.md blockers) |
