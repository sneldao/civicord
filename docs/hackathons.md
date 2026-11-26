# Hackathon entries

> **Current opportunity stack, 2026-11-25:** TapeOut Accelerate is the only open
> build-focused timed hackathon under active consideration, and it is
> conditional backup work — see
> [tapeout-accelerate.md](tapeout-accelerate.md). The larger strategic
> opportunity remains the NLnet grant in §4. Amazon's submission window has
> passed; HackerNoon Round 2 remains open as a writing deadline; Anna remains
> an uncommitted strategic question.
> Separately — not a hackathon — Zapier Build Week's free-call window
> (250 MCP calls/day until 5 Jan 2027) is a zero-cost prototype rail for the
> journalist digest the outreach strategy needs: see
> [zapier-build-week.md](zapier-build-week.md).

Dates and rule text below were read off the organisers' own pages on the
stated dates, not from search snippets — the eligibility lines are quoted
verbatim because they are the reasons we can enter at all. Keep that
distinction: a page being open to entries is not the same as a page being a
good use of Civicord time.

Everything else found in the same sweep is listed under "not entering" further
down, with the one-line reason, so nobody has to re-research it.


---

## TapeOut Accelerate — open conditional backup (X Layer × OKX)

Time-boxed competition, assessed and researched on 2026-11-25. Canonical
strategy: [tapeout-accelerate.md](tapeout-accelerate.md).

|| |
|---|---|
| Window | **16 Oct – 7 Dec 2026, 23:59 UTC**; internal working deadline **4 Dec** |
| Prize pool | 100,000 USDT headline, community-sponsored and potentially staged/milestone-based |
| Existing projects | Allowed, but only substantial work in the window is judged |
| Fit | Conditional: a versioned **verifiable DeWEB mirror** of one small evidence cohort, not a canonical-registry migration and not a circuit-shaped gimmick |
| Default cohort | Holborn and St Pancras (seven candidates, mixed outcomes, compact bundle) |
| Status | **Published and direct-chain verified on 2026-11-25.** Holborn bundle is live at `tape://20.2.272.tape` / <https://20-2-272.tapekit.org/> under container `0xB078da6de46795656187052322Dda3A7E249C288`; all seven frozen files pass pinned-block verification against two RPC endpoints, and the canonical-site verification panel is live in Cloudflare Pages deployment `979b8859`. Remaining work is the external comprehension test, video and submission. Concise evidence pack: [tapeout-submission.md](tapeout-submission.md); public verification guide: [deweb-mirror.md](deweb-mirror.md); internal runbook: [tapeout-operations.md](tapeout-operations.md) |

The important correction from the research pass: DeWEB can provide a useful
static, hash-checked publication mirror, but it does not justify unqualified
“permanent archive” language. The current directory can be changed by the
container holder, X Layer has a thin independent-RPC set, the TapeKit stack is
young and unaudited, and gateway availability is not independent verification.
Any bundle must therefore use append-only versioned paths as a publication
policy, embed caveats and methodology, and be verified from chain state rather
than merely through `tapekit.org`.

The entry is allowed to continue only because it is creating reusable
evidence-export and verification infrastructure. It must not displace outreach,
take-the-pen, vantage close-out or NLnet. The new-work boundary is the exporter,
mirror publication, verification UX and negative-proof tests — not the
pre-existing audit pipeline, ledger, frontend, ENS registry or data. Actual
publication spend was 0.08024877 OKB across 11 successful transactions; the
full transaction inventory and verification report are in
[tapeout-accelerate.md](tapeout-accelerate.md).

---

## 1. Build, Ship, Shape — Amazon Developer Hackathon — submission window closed

This section is retained as the historical/build record. Its remaining
checklist language is not current work unless the Devpost submission state
explicitly requires post-deadline action.

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

1. **The video — done, awaiting upload.** `data/film/mcp-entry/renders/mcp-entry-v2.mp4`
   (2:46, 1440×900) is the entry cut: ten shots, voiced, with 63
   caption lines and eight protocol chips timed from the narration's own
   character alignment, a ducked music bed, and four cards built as part of the
   composition — a cold open on the four measured numbers, the question, the
   audit's limits, and a closing lockup on the brand and the mission. Narration
   and music are machine-generated (ElevenLabs) and disclosed in the submission
   and the feedback. Script, shot list and the rebuild commands:
   [demo-script-mcp.md](demo-script-mcp.md).
   Left to do: upload it publicly and paste the link into
   [amazon-submission.md](amazon-submission.md) — and say in the video
   description that the voice is synthetic.
2. **The two account loose ends — closed 2026-10-20.** One person behind the
   Devpost account, both author names and the repo owner, and the AI toolchain is
   named in the README and the entry. Written up below.
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
  credit is claimable directly. Both loose ends this raised are closed, and are
  recorded here because the entry now says the same thing out loud:
  1. **One person, three names.** `Quincybob` (118 commits), `snel` (2 merge
     commits) and the `sneldao` repo owner are all the entrant, as is the Devpost
     account. Said in the submission rather than left for a judge to infer from
     the remote and the author field.
  2. **The AI toolchain is named, in the README and in the entry.** Qoder, Devin,
     Claude, Codex and Cursor. Three commits carry a `Cursor Agent` author
     (`9f65865`, `bf97c0d`, `f13216b`) and one PR branch carries its name
     (`cursor/meaningful-session-5605`); the rest of the log is the entrant's own
     account, so the author field is not a count of who wrote what. The README
     said "Cline" until 2026-10-20, which was both wrong and contradicted by the
     log — fixed there, and restated in [amazon-submission.md](amazon-submission.md).
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

## 3. Anna Founding Builder Program — Anima × DoraHacks

A recurring monthly grant for published Anna Marketplace apps, **not a prize**.
Program: <https://dorahacks.io/hackathon/2349/detail> · rules:
[forum topic 205](https://forum.anna.partners/t/turn-your-ai-agents-apps-into-recurring-monthly-grants-join-the-anna-ai-os-founding-builder-program-up-to-80k-month-pool/205)
(read 2026-11-16; the 16 November entry here was written from a summary and
had the window, the money and the multi-app rule wrong — corrected below).

| | |
|---|---|
| Window | **1 Sep 2026 – 31 Mar 2027.** "Reach at least 200 Qualified App MAU (Tier E) in any single calendar month during the window." 30 November is not a cutoff |
| Money | Tier E 200+ MAU **$50/mo** · D 500+ $100 · C 1,000+ $200 · B 4,000+ $1,000 · A 10,000+ $2,500 · S 20,000+ $5,000. "You only receive the grant for the highest tier reached in that calendar month." The $5,000 figure needs 20,000 users |
| Multiple apps | From 1 Oct: "Users who appear in more than one App are counted only once, while users who are unique to different Apps are added together." and "Each Builder may receive no more than one grant per calendar month." |
| Qualified run | "It successfully executes the App's declared primary function and returns a meaningful, non-trivial result." Not counted: opening or installing, failed runs, and "usage from developer, team, or internal QA test accounts" |
| Review | "We only approve complete, independently usable Apps—not raw scripts, bare MCP servers, or technical demos." Criteria include "**AI-Native Core**: Primary value must depend on AI reasoning or workflows" and operating "without broken external dependencies" |
| Upkeep | "At least one meaningful maintenance or product improvement activity" each month |

### What the earlier read got wrong about us

It said `mcp/` "is already the portable core". Three things in the rules and
in a sibling project's six review rounds on Anna (Brume, same builder) say
otherwise:

1. **A bare MCP server is named as not approvable.** The entry would be a
   new UI bundle, not the server.
2. **`explain_seat` is deterministic by design** — speech and limits come out
   of `change-feed.ts` and `record-copy.ts`, which is the whole point of it.
   A lookup that returns our own sentences is not an AI-native core, and
   Brume was rejected for exactly that shape (a fixed function with an AI
   line on the end).
3. **A run only counts if the server can see it.** For an app without a
   tool process that means a successful `llm.complete` producing the result;
   a read of our public JSON leaves nothing in Anna's logs.

So qualifying requires a model to *write* something about a candidate's
record. That is the one thing standing rule 3 and `mcp/client-check.mjs` exist
to prevent: a change signal paraphrased into "removed" or "deleted" by a
model the user picked and we cannot pin.

### The only shape that would be honest

Recorded so nobody re-derives it, not as a commitment:

- Bundle-only app; `external_origins: ["https://civicord.pages.dev"]`; it
  reads the same static JSON the site serves, so there is no server of ours
  to break. Needs a CORS header on `/api/*` and one new build output: the
  `seatAnswer` result per constituency as static JSON, generated from the
  same copy modules.
- The model does one job: turn a free question ("what happened to the
  Reform candidate's site in Clacton?") into a seat or candidate from a
  closed list the bundle supplies from `search-index.json`. Code validates
  the pick; a miss asks the person to choose.
- The answer on screen is our speech and our limits, verbatim. If a model
  sentence is shown at all it passes the `client-check` rules in the bundle
  first: no internal slugs, no figure or name absent from the record, none
  of the intent verbs, and the limits are appended by code, never written.

That is defensible as a product and weak as an "AI-native core": a reviewer
can fairly call it a lookup with routing.

### Verdict: last of three, and not submitted before Anna answers one question

Not a deadline problem any more — the window is open until March. The
reasons are these:

- The grant is per builder. Civicord would be the third app in a portfolio
  with Brume and Doorknock, adding only its distinct users, to move a $50
  tier toward a $100 one.
- Our audience is UK stewards and journalists. An Anna sign-in is heavier
  than a pageview, and none of them is there today.
- The only qualifying design puts model-written prose next to named
  candidates. One bad paraphrase costs the ledger more than the grant pays
  in a year.

Reopen if: Doorknock passes review and shows that marketplace users arrive
without our own push; **and** a UK election event gives people a reason to
ask seat questions; **and** the routing-only design is accepted by Anna
staff as AI-native when asked on the forum before any build.

Worth doing regardless, because the site and `mcp/` both gain: the per-seat
answer as static JSON (`/api/constituencies/{slug}/answer.json`), which is
`explain_seat` for any client that cannot hold an MCP session.

### Status, 2026-11-16

Built locally at the owner's direction, in the routing-only shape above with
one change: the app ships a **snapshot inside its bundle** (2.8 MB, 650 seat
answers generated from `mcp/ledger.mjs` by `anna/scripts/build-snapshot.mjs`)
instead of calling the site, so it needs no CORS header, no new endpoint and
no deploy. A re-audit means regenerating the snapshot and cutting a version.

- The model returns a seat slug, candidate indexes and one of three focus
  values, each validated against a closed list. No model-written text is
  rendered or saved; `anna/test/render.mjs` holds that line.
- Limits are always shown directly under the speech. The words block is
  `leadLine`, now exported from `mcp/ledger.mjs` and used by `seatAnswer`
  itself, so the MCP tool and the app speak one sentence. `npm run check` in
  `mcp/` passed after the change.
- 19 tests + 11 smoke checks, `anna-app validate --strict`, one run through
  the local dev harness. Uncommitted; nothing published or submitted.

The verdict above stands on priority: third of three. The AI-native question
has been posted but remains unanswered; do not spend a review round until
Anna staff answer whether closed-set routing counts as an AI-native core.

**Posted 2026-11-17** as topic 594 in Developers:
<https://forum.anna.partners/t/review-criteria-question-does-closed-set-model-routing-count-as-an-ai-native-core/594>
(the Announcements thread is staff-reply-only — a reply there was not an
option). Text as posted:

> Review-criteria question before we spend a review round. Our app looks
> like this: the model's only job is routing — it reads a free-text
> question (e.g. "what happened to candidate X's website?") and returns a
> pick from a closed list (a seat slug + candidate indexes) that code
> validates. All rendered text is precomputed copy served from a bundled
> snapshot; **no model-written text is ever displayed or stored**. Does
> closed-set routing of this kind qualify as an "AI-Native Core" under
> the review criteria — where the AI reasoning determines which record
> the user sees — or is it reviewed as a deterministic lookup with an AI
> front-end? We want to submit only if the honest shape of the app is
> what you're counting.

---

## 4. NLnet — Open Internet Stack (OIS Restack) open call

Not a hackathon — a grant, like §3 but bigger. Assessed 2026-11-16.
<https://nlnet.nl/funding> · <https://nlnet.nl/news/2026/20261103-call.html> ·
<https://ngi.eu/opencalls/>

|| |
|---|---|
| Deadline | **3 Jan 2027, 12:00 noon CET** (calls recur every odd month — 3 Mar is the next if missed) |
| Money | **€5,000–50,000**, scalable if the project proves out; cost-recovery basis, not commercial rates |
| Eligibility | Anyone: individuals, non-profits, public institutions, companies. No team or org requirement |
| Conditions | All outcomes open — code under a recognised FOSS licence, open data/standards. AGPL-3.0 + CC-BY already satisfies this |
| Scope watch-out | Call page states **"AI-related projects are not within scope"** (>1M-user exception). Pitch the audit/record/claim-flow commons, not the agent surfaces — see nlnet-ois.md |
| Shape | Rolling open call; short proposal form by design ("low-threshold… so as not to waste your time"). Working draft: **docs/nlnet-ois.md** |

### Why this out-ranks every prize on this page

Every hackathon entry above is judged on what fits the sponsor; this fund is
judged on what we already are. The portfolio definition — "deliver, mature and
scale operational internet commons… open source software, open data, open
standards… that improve openness, trustworthiness, resilience and user
autonomy" — describes Civicord almost verbatim: an AGPL pipeline publishing a
CC-BY longitudinal public record, with an institutional-home succession plan
already written down (personas.md §Governance). The ask writes itself: fund
the two-stage audit vantage, the claim flow, and a second jurisdiction as the
maturity work the grant exists to pay for.

One grant at the floor (€5k) exceeds the combined realistic cash EV of every
entry on this page. The recurring deadline means a weak first attempt costs a
re-application, not the opportunity.

### Status, 2026-11-25

Working draft exists in [nlnet-ois.md](nlnet-ois.md); not submitted. Before
submitting: pick the final work package (vantage + claim flow + May-2027
election pass is one coherent "mature the commons" narrative),
read 2–3 funded proposals in the same space for tone, and check whether
applying as an individual vs. through Campaign Lab changes anything.

---

## Watching (not open today)

|| Event | Trigger to re-open |
|---|---|---|
| Next ETHGlobal online edition | All 2027 events are in-person (Cannes Apr, New York Jun, Tokyo Aug, Lisbon Oct) — watch ethglobal.com/events for the next async; Continuity Track was the genuine fit |
| Solana x402 hackathon repeat | Best technical fit found in the Sept sweep; closed, worth re-checking if re-run |
| Colosseum | No open hackathon (program runs ~2×/year; Eternal paused); wants crypto startups, not public ledgers — re-check only if a public-goods track appears |

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
