# Hackathon entries

Two entries we can make honestly, both open as of 2026-10-19. Dates and rule
text below were read off the organiser's own pages on that date, not from search
snippets — the eligibility lines are quoted verbatim because they are the
reasons we can enter at all.

Everything else found in the same sweep is listed under "not entering" further
down, with the one-line reason, so nobody has to re-research it.

---

## 1. Build, Ship, Shape — Amazon Developer Hackathon

Sponsor: Amazon Developer. Administrator: Devpost. Online, global.
<https://amazonappdev2026.devpost.com> · [rules](https://amazonappdev2026.devpost.com/rules)

| | |
|---|---|
| Submission period | Mon 31 Aug 2026, 10:15 PT → **Fri 23 Oct 2026, 12:00 PT** |
| Judging | Mon 9 Nov → Fri 20 Nov 2026 (both 12:00 PT) |
| Winners | on or around Thu 3 Dec 2026, 12:00 PT |
| Prize | $138,000 cash advertised (~$190k with AWS credits). Track 1st $25k + $15k credits; Open Source mini-challenge $5k + $5k credits |
| Deadline risk | **4 days from 2026-10-19.** 12:00 PT is 20:00 BST |

### Why an existing project can enter

Verbatim, §Submission Requirements:

> Projects must be either newly created by the Entrant or, if the Entrant's
> Project existed prior to the Hackathon Submission Period, must have been
> significantly updated after the start of the Hackathon Submission Period.
> Entrants must explain how their Project was significantly updated – clearly
> describe and demo the feature updates during the Submission Period.

So the shipped site is not the entry. **The work done inside the window is the
entry**, and we have to describe and demo exactly that. Judging does not care
how good the other 5,400 pages are.

Other gates, verbatim:

- Eligibility: "Individuals who are at least the age of majority where they
  reside", Teams, and Organizations. Employees, representatives, agents and
  affiliates of the promotion entities are excluded. **No team-size cap appears
  in the rules.**
- Ownership: submissions must "be the original work of the Entrant, be solely
  owned by the Entrant, and not violate the IP rights of any other person or
  entity."
- Data: "If a Project integrates any third-party SDK, APIs and/or data, Entrant
  must be authorized to use them in accordance with any terms and conditions."
- Repo: "must be either public and open source by including an open source
  license file OR private and shared with" five named Amazon GitHub accounts.
  AGPL-3.0 satisfies this.
- Materials in English; demo video publicly visible on YouTube or Vimeo.
- Required in every submission: written product feedback on the tools used.
  Optional friction logs "score higher in judging (up to 10% bonus)."

### The track we would enter

**Alexa+.** Verbatim requirement:

> A working Agent Skill or a self-hosted MCP server, implementing MCP spec
> version 2025-11-25 (or a later version, once confirmed) over Streamable HTTP.

and:

> The repository must demonstrate use of your track's required technology at
> runtime in your code — imported and actually called (a library import, an
> app/backend entry point, or a loaded agent/flow/MCP config), not just a
> mention in the README.

Fallback, if a real server does not land in time — the rules permit it:

> Alternatively, entrants may submit a simulated Alexa+ experience instead —
> built using any AI or agentic tool of their choice, no specific framework,
> SDK, or MCP-shaped surface required. This alternate path is exempt from the
> runtime-technology-hook requirement above.

We should treat the fallback as a last resort, not a plan.

### What we build

A self-hosted, Streamable-HTTP MCP server exposing the read-only ledger surface
that already exists — candidate record, seat stats, change signals, claim pairs,
constituency summary — as MCP tools. The tool definitions already exist for
WebMCP in the browser; this ports the same six reads to a server transport and
serves them from our own origin rather than a third-party gateway.

Then, to satisfy "significantly updated" honestly rather than technically:
voice-shaped answers. The same window that makes the MCP server makes the thing
the voice-assistant demo needs — a caller asks a seat question, the server
returns the audit result with its caveat sentence attached, so no answer can be
read out without its limits.

### Status, 2026-10-20

`mcp/` exists and works: a self-hosted Streamable-HTTP server that negotiates
**MCP 2025-11-25** (asserted, not assumed — `mcp/client-check.mjs` does a raw
initialize and reads the confirmed version back). Seven read tools;
`explain_seat` returns the speech and its limits as two separate content blocks,
so neither can be quoted without the other. `mcp/demo.mjs` is the scripted half of
the demo video: four questions, each showing the tool call the server answered.
`mcp/web/index.html` is the other half — a browser page that is an actual MCP
client, on the same origin, with the raw JSON-RPC frames expandable on screen.

The decision that made this cheap: the server imports the site's own
`change-feed.ts`, `record-copy.ts`, `walkback.ts` and `change-labels.ts` instead
of restating any wording. `client-check.mjs` fails the build if an internal slug
reaches prose, or if a spoken seat answer arrives without its limits — which is
the same rule the steward export was held to, now enforced on the agent surface.
It runs as the `mcp` job in CI.

Three things the organiser's own FAQ settles, read 2026-10-20:

1. **We do not have to host it.** "A locally runnable public repo plus your demo
   video is enough — judges can download, build, and test it themselves, so
   hosting isn't required", and "your MCP server doesn't need to stay running
   after you submit."
2. **A browser page is a legitimate demo.** "A web page that acts as an actual
   MCP client (sending initialize, tools-list, and tools-call requests over
   Streamable HTTP) satisfies the requirement — this is the simulated-experience
   path… since there's no way for any participant to connect a self-hosted MCP
   server to a real Alexa+ device or developer console (that tooling is
   select-partners-only)." So the front end is the demo, not a compromise.
3. **A conversational feature counts as the update.** "A new conversational
   feature that brings new functionality to an existing app can count as a
   significant update — focus your demo on a clear before-and-after so judges
   can see what changed." That is exactly what `explain_seat` is, so the video
   is structured as before/after rather than as a tour.

Also from the FAQ: no maximum team size ("you can enter solo, as a team, or as
an organization… designate one member as your Representative"), the repo must be
on GitHub specifically, a public repo needs nothing beyond an open-source license
file, and **$150 in AWS promotional credits per registered individual** is worth
claiming whether or not we spend it.

Still open before we submit:

1. **The video — footage done, edit left.** `mcp/web/index.html` is recorded: a
   66-second silent take at `data/out/mcp-demo/take.mp4` covering the human page
   and the same question asked of the server, plus a 63-second take at
   `data/out/mcp-demo/code-ci.mp4` covering `mcp/server.mjs` on GitHub and CI run
   #39 with the `mcp` job green. Script, shot list and narration are in
   [demo-script-mcp.md](demo-script-mcp.md). What remains is the edit: narration
   audio, the title and close stills, and uploading the result publicly.
2. **The two account loose ends** at the end of the next section — the Devpost /
   GitHub / repo-owner identity, and restating the AI assistance in the entry.
3. **The Open Source mini-challenge contribution URL**, if we want the second
   prize: it needs a real upstream contribution, not our own repo.

Written, and only needing pasting into the form: the submission answers, the
per-tool feedback and the friction log
([amazon-submission.md](amazon-submission.md),
[amazon-feedback.md](amazon-feedback.md)). Entrant form is decided — see below.

### Before committing to this

- **The build day is spent; the other three are not.** The server took about a
  day and works. The web client, the video, the repo hygiene, the feedback
  answers and the friction log are what is left, and the rules pay for the last
  one specifically.
- **Entrant form: solo, decided 2026-10-20.** The rules want a submission "solely
  owned by the Entrant", and this is one person's project, so it goes in as an
  individual — no Representative designation needed, and the $150 promotional
  credit is claimable directly. Two loose ends to close before submitting:
  1. **Two accounts touch this repo.** Commits are authored as `Quincybob` (113)
     and `snel` (2), and the remote is `github.com/sneldao/civicord`. The Devpost
     account, the GitHub account named in the submission and the repo owner have
     to be recognisably the same person — otherwise add the entrant as a
     collaborator or state the relationship in the notes.
  2. **Three commits are authored by `Cursor Agent`.** That is disclosed, not
     hidden: `README.md` § AI-assisted development already says development is
     human-directed with AI assistance. Repeat the fact in the submission rather
     than letting a judge find it in `git log`, and keep the in-window MCP work
     committed under the entrant's own account.
- **Third-party data authorization** is a stated requirement. Our basis:
  Democracy Club person IDs, the Campaign Lab April 2025 scrape under the CC-BY
  arrangement recorded in the repo, and a 2026-09-21 re-crawl. That has to be
  written into the submission, not waved at.
- **Cost: nil.** The Alexa+ track needs no AWS runtime service, and the server
  does not have to be hosted. The only spend is our time; $150/person in
  promotional credits is claimable anyway.

### The mini-challenge that is nearly free

**Open Source**: "Ship a new, additional open-source project (include an
open-source license)… during the hackathon window, alongside your primary-track
submission." `mcp/` is that, under the AGPL-3.0 file already in the repo. The
answer needs the contribution URL, the repo URL, the GitHub username and a short
description of what it does and why it matters — all of which exist the moment we
commit it. $5k + $5k credits, and one extra project can win one extra prize.

---

## 2. Decentralize AI Hackathon — HackerNoon × Nosana × Arweave × MEXC

Online, global. <https://decentralizeai.tech> ·
[prizes](https://decentralizeai.tech/prizes) · [faq](https://decentralizeai.tech/faq)

| | |
|---|---|
| Round 1 | Jun – Oct 2026 (closed) |
| **Round 2** | **Nov 2026 – Feb 2027**, overall campaign ends 27 Feb 2027 |
| Entry | "Write a Blog Post on HackerNoon to Enter" — publish, tag, done |
| Judging | "Based on readership and quality, judges create a shortlist and then vote on top HackerNoon posts" |
| Criteria | Technical depth ("is this a real implementation?"), originality, impact, verifiable evidence |
| Eligibility | "Individual developers and early-stage startups are both welcome" |
| Re-entry | "Enter as many times as you want — in either round" |

### Why an existing project can enter

Verbatim:

> concept-stage ideas with clear technical direction are just as welcome as
> shipped products.

### The prize is not what the headline says

"$51,750+ Total Prize Pool" is mostly **not cash and mostly not a winner
prize**. Per their own FAQ: $41,750 of it is Nosana GPU credits — $70 each to
the first 500 eligible participants — plus $2,500 Arweave storage credits,
$2,500 in AR cash, and $5,000 in MEXC MX token rewards. Fifteen winners get an
additional $450 in compute credits. The genuine grand prize is the
decentralizeai.tech domain and its open-source codebase, transferred to one
winner.

Realistic read: **~$2,500 cash + ~$5,000 in tokens across all winners, and free
GPU credits for entering.** That is worth an afternoon, not a month.

### Why it is still worth doing

The entry is a written technical account of something we have already built and
already documented: why 65% of redirect alerts are same-site artefacts, why
"surname absent" fires on branch pages, and how a read-only public ledger is
served to both humans and paying agents over x402 without the two seeing
different data. Writing that post is the same work as publishing our
significance findings, and the hackathon just gives it a deadline and an
audience. Enter Round 2 in November.

### Status, 2026-10-20

Drafted: [hackernoon-decentralize-ai.md](hackernoon-decentralize-ai.md) — the
precision measurements, the 95-of-95 scope artefact, the ten-record instrument
and the four-transport design, with the reproduction commands at the end. Unpublished,
and deliberately not claiming the labelling results we do not have yet.

---

## Not entering

| Event | Reason |
|---|---|
| Kiroween 2026 (AWS/Kiro, $100k) | "Only new projects created during the submission period will be eligible." |
| Solana x402 Hackathon, Cronos x402 | Closed. Best technical fit of anything found — worth watching for a repeat. |
| GSA MCP / AI-Agent Government Hackathon | Registration closed; federal-open-data scope. |
| Council of Europe / EU Civic Tech hackathons | Both ran in June 2026; 2027 calls unconfirmed; in-person finals. |
| Colosseum Eternal | Confirmed "Eternal is paused. New Eternal sprints are closed." Also wants a crypto startup, not a public ledger. |
| Vultr Agent Rush, AMD AI League (lablab.ai) | Rule book: "Submissions must be original and MIT-compliant." Civicord is AGPL-3.0. Splitting an MIT layer off an AGPL codebase is a legal question, not a gitignore. |
| AssemblyAI Voice Hackathon Week (ends ~23 Oct) | $2,000 across 20 winners, rules gated inside their Discord, eligibility unconfirmed. The voice idea is better spent inside the Amazon entry. |
| ETHGlobal Mumbai (5–7 Nov) | Continuity Track genuinely fits — "may build on an existing codebase… must clearly document what work existed before" — but in-person. Deferred to the next online edition. |
| Netlify, Fastly, Akamai, Deno, Bun, Neon, Filecoin | No open hackathon found in the window. |
| Reuters / GIJN / Knight / IPI / Global Voices / AI for Media | Fellowships, awards and conferences, not hackathons; AI for Media applications closed 24 Sep. |

## Standing rules for any entry

1. The public record does not change because a competition is judging it. Every
   surface we demo for an organiser is the same one
   [`personas.md`](personas.md) §5 promises parties — convenience, not privilege.
2. We do not describe pre-existing work as built during a window. Amazon's own
   rule asks us to separate the two, and getting that line wrong is the fastest
   way to make the project look worse than it is.
3. Prize money never decides what we claim the data supports. A judge's
   preference is not evidence, and the significance findings above still stand
   unpublished if no event wants them.
