# Personas — who Civicord is for

North star: Civicord is shaped by the people who would use it repeatedly,
not by the system's internal model. Every surface should answer one of their
questions before it explains itself. The wedge is adoption by
Campaign-Lab-class stewards — orgs that maintain rosters of candidate
websites and need the record to keep itself honest.

Each persona below lists their cadence, the job they're doing, what we ship
for them, and current status. Roadmap work is re-derived from this page.

## 1. Roster stewards (election-transparency staff)

**Cadence:** weekly. **Status: building — `/steward`.**

They look after a roster of hundreds of candidate websites (Candidate
Central, party digital teams-in-trust, fact-checking desks). Their job is
not to browse a ledger; it is to notice what changed and act: nudge a
candidate, fix a record, flag a dead site. They should barely have to visit
the site — the digest groups records by *action needed*, worst-first, with
per-group CSV export and deep links into the filtered ledger. The experience
is "here's your week's work," not "here's our data model."

## 2. Candidates and their agents

**Cadence:** episodic (when something is wrong with their own record).
**Status: deferred keystone bet.**

The only persona with a personal, selfish reason to return: "that's my
page, it moved." A claim-and-update flow — Google-Business-Profile style,
*take the pen*, chain invisible — is the mechanism that keeps the whole
record fresh for every other persona. The on-chain permission layer
(ENSv2 Permissioned Resolver, delegate writes) exists precisely to hand a
candidate or their agent write authority over one record without
controlling the namespace; we sell the outcome, not the mechanism. Deferred
pending the Campaign Lab conversation about who should own candidate
updates.

## 3. Journalists

**Cadence:** sporadic, news-driven. **Status: orienting — `/journalists`.**

The change feed is a tip line: which losing candidates' sites now serve
gambling ads, which domains were put up for sale, which seat has lost every
candidate site since 2024. They need the story surfaced fast and citations
they can stand behind — every record already carries a Copy citation, and
filtered ledger views carry a copyable permalink. The orientation page
frames the three pre-filtered leads and the worked examples.

## 4. Researchers and archivists

**Cadence:** quarterly. **Status: served.**

They want longitudinal data with stable IDs and honest methodology — the
record pages, citations, `?change=`/`?sig=` filters, bulk CSVs, and the
CC-BY dataset already fit. No new surface this pass; keep IDs stable forever
and keep labels precise (`live` is an HTTP-response class, not content
survival).

## 5. Parties and campaign HQ

**Cadence:** continuous. **Status: noted, not built.**

The stickiest potential users — monitoring their own candidates' sites
before opponents find the dead ones. Building a party-branded self-serve
view pressures the neutrality framing ("an auditable public record"), so
any work here must keep the public record identical to what parties see;
parties would get convenience, not privilege.

## 6. AI agents

**Cadence:** every query, eventually. **Status: keep, don't build for yet.**

The MCP/WebMCP tools, Bazantic x402 gateway and Graph subgraph are live.
Demand is real but unproven; they stay reachable (Agent view, `/mcp`)
without being homepage-primary.

## Continuity principle

Value here compounds with time. One audit is a curiosity; twelve audits
across two election cycles would be the only longitudinal record of
campaign-web decay that exists anywhere. The moat is continuity: keep the
re-audit pipeline running at near-zero cost (static build + CSVs can
survive on nothing), keep IDs stable forever, and never break a citation.

## Governance (open question)

Who operates this in 2029? If the answer is "the authors, forever," it is a
hobby. The sustainable shape is a custodian org (Campaign Lab / Democracy
Club, a university, an electoral-reform body) adopting it as infrastructure
they publish their name to — which is why the steward path leads the
roadmap and the on-chain layer is presented as verifiability, not
ideology.
