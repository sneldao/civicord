# Amazon "Build, Ship, Shape" — submission text

Paste-ready answers for <https://amazonappdev2026.devpost.com>. Deadline
**Fri 23 Oct 2026, 12:00 PT**. Anything marked `⟨TBD⟩` is a thing only a person
can do: push the code, record and upload the video, open the pull request.
**Entrant form: individual** (decided 2026-10-20) — see
[hackathons.md](hackathons.md) for the two account loose ends that close first.

Rules text quoted here was read off the organiser's own page on 2026-10-20. The
eligibility reasoning is in [hackathons.md](hackathons.md); the video plan is in
[demo-script-mcp.md](demo-script-mcp.md).

---

## Track and mini challenge

**Primary track: Alexa+.** Self-hosted MCP server, spec **2025-11-25**,
**Streamable HTTP**, read-only. Not the simulated-experience path — a real
server, and a browser page that is a real MCP client.

**Mini challenge: Open Source.** The `mcp/` directory is a new open-source
project inside an existing AGPL-3.0 repository, contributed during the window.

We are **not** entering AWS Builder: no AWS service runs in this project, and
the rules ask for documented integrations rather than an aspiration.

## Project title

> Civicord MCP — a read-only agent surface for the UK election website ledger

## One-line summary

> The public record of what happened to 2,375 UK candidate websites, served to
> agents over MCP 2025-11-25 with the audit's own limits attached to every
> answer.

## What it does (form description)

Civicord scraped every UK parliamentary candidate's website in April 2025 and
fetched the same URLs again on 7 September 2026. 1,513 responded, 441 no longer
resolve, 659 redirect. 799 records also carry a sentence-level comparison
between the April text and a later homepage fetch.

`mcp/` serves that record to agents. A self-hosted Model Context Protocol
server, Streamable HTTP, negotiating MCP 2025-11-25, exposing seven read tools:
`get_summary`, `search_civicord`, `get_candidate`, `get_constituency`,
`explain_seat`, `filter_ledger`, `get_claim_diff`. Every tool is annotated
`readOnlyHint`; there is no write path.

Two properties are the point of the build:

- **The wording is shared, not restated.** The server imports the site's own
  TypeScript copy modules (`record-copy.ts`, `change-feed.ts`, `walkback.ts`,
  `change-labels.ts`), so an agent cannot be handed a claim the human page does
  not make.
- **A caveat cannot be separated from an answer.** `explain_seat` returns the
  spoken sentence and its limits as two content blocks, and CI fails if a
  sentence can be returned without them. An assistant can read out "this URL
  stopped resolving" — it cannot read that out without "an outage and a removal
  look the same in this check."

`GET /` on the same origin serves a browser page that is an actual MCP client:
`initialize`, `tools/list`, `tools/call`, with the raw frames expandable on
screen. No model sits in that loop — a keyword router picks the tool, so the
demo shows the server's contract rather than a model's fluency.

## How it works (repo `mcp/README.md` covers this; form answer)

Node ≥ 22.6, no framework, no database. `server.mjs` is node:http plus
`@modelcontextprotocol/sdk` 1.32.1 (`McpServer`, `StreamableHTTPServerTransport`,
one server instance per session). `ledger.mjs` loads the committed CSV/JSON
snapshots the static site already builds from and does the reads. Requests
carrying a foreign `Origin` get 403; loopback and CLI clients with no `Origin`
are allowed. Bind defaults to `127.0.0.1`.

Run it:

```bash
cd mcp && npm install && npm start     # http://127.0.0.1:8787/mcp, client at /
npm run check                          # 20 contract assertions against the wire
node demo.mjs                          # four questions, asked and answered
```

## What existed before, and what we built in the window

The rules ask for this explicitly, so here it is separated.

**Before the submission window (31 Aug 2026):** the pipeline, the audit, the
ledger, the static site, the ENSv2 records, the x402/WebMCP agent surfaces, and
the copy these tools now reuse. See the commit history before that date.

**Inside the window (31 Aug – 23 Oct 2026):** 118 commits, and the MCP work is
the newest slice of them.

| Work | Where |
|---|---|
| The MCP server: sessions, Streamable HTTP routing, origin guard, shutdown | `mcp/server.mjs` |
| Seven read tools and the seat/party/claim reads behind them | `mcp/server.mjs`, `mcp/ledger.mjs` |
| Voice-shaped seat answer, speech and limits as separate blocks | `explain_seat` |
| A browser MCP client that shows its own frames | `mcp/web/index.html` |
| Shared-copy refactor so neither surface can drift: `change-labels.ts` extracted, `NOT_PROOF_COPY` / `ONCHAIN_COPY` named | `frontend/src/lib/` |
| 20 contract assertions, run in CI as the `mcp` job | `mcp/client-check.mjs`, `.github/workflows/ci.yml` |
| This directory, its README and the demo script | `mcp/`, `docs/` |

Also inside the window, from the same period and unrelated to the track: the
significance-labelling instrument, the claim-diff scope notes, the rewindable
ledger filters and the plain-language scope copy — see
[significance-labelling.md](significance-labelling.md) and the commit log.

**Entrant:** individual. Development is human-directed with AI coding
assistance, which `README.md` § AI-assisted development states; three commits in
the log are authored by an AI agent, and the MCP work is committed under the
entrant's own GitHub account. ⟨TBD — list the MCP commit SHAs after the push⟩.

## Third-party data authorization

Required by the rules, so stated rather than waved at:

- **Candidate identities and seat keys** are Democracy Club person IDs, from
  Democracy Club's open candidate data, used under their open terms.
- **April 2025 campaign text** is the Campaign Lab scrape. Reuse with credit was
  agreed with Campaign Lab on 2026-09-12 (CC-BY); recorded in `README.md`
  § License.
- **September 2026 fetches** are our own requests against public campaign
  websites, robots-aware, rate-limited, resumable — the crawler is in the repo
  (`civicord recrawl`), and the corpus is derived from those fetches, not from a
  third party's archive.
- **Code** is AGPL-3.0 (`LICENSE`), which satisfies the public-repo requirement.
- Civicord stores no personal data about voters, and no credentials. The server
  has no key because the record it serves is already public.

## Standing rules we kept while doing this

1. The agent surface answers from the same record the public pages do. A
   candidate, a party or a judge gets the same sentence as anyone else —
   convenience, not privilege.
2. No surface states more than the audit supports. That is enforced by tests,
   not by care.
3. Prize considerations did not change what we claim the data shows.

## What's next

- Serve the same tools over a public origin with TLS, once we want assistants
  other than our own to reach it. The rules do not require hosting, so this is
  a product decision, not a submission one.
- A write path for corrections over MCP — deliberately absent today, because a
  public record that an agent can edit is a different product, and we would want
  the party-facing review flow to be the thing that decides.
- Sentence-level coverage: 799 records have a comparison and 174 have a
  text-overlap score. Widening that is pipeline work, not server work.

## Accomplishments / what we learned

- The honest unit of "what changed" is smaller than a page. 65% of redirect
  alerts in the earlier spike were same-site artefacts, and "surname absent"
  fires on branch pages — so the tools report what the check saw and name its
  limits, rather than upgrading a signal to a finding.
- Two of the honesty bugs were found by probing our own edge cases: a seat
  answer once quoted a sentence from someone who never stood in that seat, and a
  filtered page once reported its page size (10) as the match count (441). Both
  are now CI assertions.
- MCP's read-only annotation is a good fit for a public register: the surface an
  agent gets can be generous without being dangerous.
- Node type-stripping let a plain Node server import the Astro frontend's pure
  `.ts` modules directly, which is what keeps the wording shared. It works up to
  the point a module touches `astro:content` — that is why `change-labels.ts`
  exists as its own file.

## Notes for judges

- Fastest path to "is this real?": open `http://127.0.0.1:8787` after
  `npm start`, ask a question, expand *the MCP calls behind this answer*. The
  `initialize` frame carries `protocolVersion: "2025-11-25"`.
- `npm run check` asserts the negotiated version, all seven tools,
  `readOnlyHint` on each, that a capped page still reports the whole count, that
  the claim-diff axis can be asked for on its own, that speech cannot arrive
  without its limits, and that no internal slug leaks into prose.
- Deliberate limitation, stated so it isn't mistaken for an oversight: the
  browser client routes with keywords, not a model. A model would demo better
  and prove less about this server.

## Video

`⟨YouTube link — paste after upload⟩` — 2:21, public, English, inside the
3-minute cap.

The cut is a HyperFrames composition rather than an edited sequence: two
designed cards, five footage segments captured by Playwright, 57 caption lines
and eight on-screen chips, all timed from the narration's own character
alignment so the text arrives with the word rather than near it. The
composition is generated from `tools/build-index.py` inside
`data/film/mcp-entry/`, so the wording on screen is diffable against the wording
on the surfaces. **The narration and the music bed are machine-generated
(ElevenLabs)** and the video description says so. Script, shot list and the
reproducible build: [demo-script-mcp.md](demo-script-mcp.md).

## Optional: feature requests

Urgency is our opinion about someone else's roadmap, so it is marked as such.

| Ask | Why it matters | Urgency |
|---|---|---|
| A documented way to assert the negotiated protocol version from the server side (not by reading SDK internals) | The track requirement names a spec version; the only way to be sure what you serve is to read `node_modules` | Important |
| A reference **browser** client for Streamable HTTP in the docs/examples | Nearly every example is stdio. A self-hosted author has to work out session ids, `Accept` negotiation and SSE-vs-JSON parsing alone | Important |
| Loopback origin guidance in the transport docs | Browsers send `Origin` even same-origin on `127.0.0.1`, so a correct-looking origin guard locks out your own demo page | Nice-to-have (we hit it, worked around it in four lines) |

## Optional: friction log

Each entry: task → steps → expected vs actual → severity → workaround → suggestion.

1. **Confirm which spec version the server negotiates.** Read the track
   requirement (`2025-11-25`), installed `@modelcontextprotocol/sdk`, looked for
   the supported versions in the docs. *Expected:* a documented constant.
   *Actual:* the value lives in `server/index.js` (`LATEST_PROTOCOL_VERSION`)
   and is only visible by reading the package source; the package `exports` map
   does not expose `package.json`, so even `require('…/package.json')` fails.
   *Severity:* medium — it is checkable, just not officially. *Workaround:*
   asserted the version on the wire from the client instead, which is the
   stronger test anyway. *Suggestion:* export the supported versions from the
   server entry point.
2. **Serve Streamable HTTP from a plain `node:http` server.** Registered tools,
   then wired `POST /mcp` for `initialize` versus subsequent session requests.
   *Expected:* one handler. *Actual:* three shapes — a session id only on the
   initialize response, 400 for a bare notification before a session exists, and
   responses that may be `application/json` or `text/event-stream` depending on
   headers. *Severity:* medium. *Workaround:* the client in `client-check.mjs`
   parses both shapes; the browser client does the same. *Suggestion:* a worked
   "mount on an existing HTTP server" example, since "self-hosted" is the whole
   point of the track.
3. **Let our own demo page call our own server.** Added an `Origin` allowlist.
   *Expected:* same-origin requests pass a same-origin guard. *Actual:* the
   browser sends `Origin` on `127.0.0.1` POSTs, and the guard rejected the page
   the server itself had just served. *Severity:* low, but it looks like a
   transport bug for ten minutes. *Workaround:* `SELF_ORIGINS` derived from the
   bound host and port. *Suggestion:* document loopback behaviour.
4. **Keep the wording identical on both surfaces.** First draft of the server
   restated the caveat sentence. *Expected:* nothing hard about that. *Actual:*
   two copies of one sentence, which is exactly how a public record starts
   contradicting itself. *Severity:* high, for us. *Workaround:* named the
   strings in `record-copy.ts`, extracted `change-labels.ts` out of `steward.ts`
   so Node can import it without pulling in `astro:content`, and added a check
   that walks every prose field. *Suggestion:* none for Amazon — this is our
   bug, not their tool's.
5. **Reproducible install with no committed lockfile.** CI used `npm install`.
   *Expected:* a pinned minor range is fine. *Actual:* the server's behaviour
   depends on the SDK's latest protocol version, so a minor bump could change
   what a judge's clone negotiates. *Severity:* low. *Workaround:* exact
   versions in `mcp/package.json`. *Suggestion:* say in the track page whether
   judges pin or resolve.
6. **Get a screen recording out of Playwright.** `recordVideo` in a headless
   context. *Expected:* it works like `screenshot`. *Actual:* needs a separate
   `npx playwright install ffmpeg`, and the failure names the missing binary
   clearly. *Severity:* low. *Workaround:* installed it. *Suggestion:* none —
   good error message.
7. **Make the captions fit the voice that says them.** Generated the narration
   with `with-timestamps` and parsed the alignment to place each line.
   *Expected:* word-level timings, or a documented route to them. *Actual:* the
   API returns *character* offsets, so every word boundary is a lookup — and a
   voice that reads `get_candidate` as "get candidate" splits one identifier
   into two words that then have to be rejoined by hand or the caption prints
   the tool name wrong. *Severity:* medium, ours to solve. *Workaround:*
   `tools/build-timeline.py` carries a rejoin table and derives all 57 caption
   windows from the alignment. *Suggestion:* offer word-level alignment; it is
   the shape every captioning consumer actually wants.
8. **Generate a music bed of a stated length.** One `POST /v1/music` call with a
   prompt. *Expected:* `duration_seconds` honoured, and the ceiling documented
   where you are looking. *Actual:* `seed` and `prompt` are mutually exclusive
   (a 422 that does say so), and no length limit is stated on the page that
   describes the parameters. *Severity:* low. *Workaround:* generated 180s,
   trimmed to 150s. *Suggestion:* publish the per-request ceiling and what a
   music request costs in characters, next to the endpoint.
9. **Trust a clean-looking validation report.** `npx hyperframes check` on a
   composition with a lint error. *Expected:* the error plus the audit results.
   *Actual:* the error switches the layout and contrast audits off, and the run
   then reports `0 sample(s)` and `0/0 text checks` — indistinguishable from a
   file that passed everything. *Severity:* high, for anyone using it as a gate.
   *Workaround:* read the error count before the sample count. *Suggestion:*
   print "audits skipped: N lint errors" rather than a zero.
10. **Ship an audio mix that is 3 seconds short.** Ducking the bed under the
    narration with ffmpeg `sidechaincompress`. *Expected:* the bed runs to the
    end of the film. *Actual:* the filter ends its output when the *sidechain*
    ends, so the music stopped at 138.1s of a 141.04s composition — inaudible in
    a spot check, visible only as a silent hole under the closing card.
    *Severity:* medium, and our bug rather than a track problem. *Workaround:*
    `apad` + `atrim`, plus a build assertion that every audio file matches the
    composition length. *Suggestion:* none for Amazon — filed because a
    self-hosted build will hit exactly this class of silent truncation.

## Per-tool product feedback

Required on **every** tool, API or SDK used. Format per the form: what it was
used for, what worked, what needs work, how onboarding felt, whether we would
build with it again. Written out in
[amazon-feedback.md](amazon-feedback.md) — copy each section into its field.
