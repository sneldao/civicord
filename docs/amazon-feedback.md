# Product feedback — Amazon "Build, Ship, Shape" entry

The form asks for feedback on **every tool, API or SDK used**: what it was for,
what worked, what needs work, how onboarding felt, whether we would build with
it again. One section each, 150–250 words, specific rather than flattering —
same house style as [FEEDBACK.md](FEEDBACK.md).

Friction-log entries and feature requests live in
[amazon-submission.md](amazon-submission.md); the two overlap on purpose, since
the bonus entries want a different shape (task → expected vs actual → severity →
suggestion).

## Model Context Protocol SDK (`@modelcontextprotocol/sdk` 1.32.1) — the track's required technology

**Used for:** everything on the wire. `McpServer` + `registerTool` for the seven
read tools, `StreamableHTTPServerTransport` for sessions, and the client half in
`client-check.mjs` and `demo.mjs`.

**What worked:** the server API is small and it stayed out of the way — a tool
is a name, a zod shape, annotations and a handler, and `readOnlyHint` going into
the protocol rather than being a comment is the right design for a public
register. Session handling is genuinely delegated: we mount it inside a plain
`node:http` server, which is what "self-hosted" needs. The client is clean enough
that our contract checks read as prose.

**Needs work:** nothing tells you which spec version you are serving without
reading package internals, and the `exports` map blocks even
`require('@modelcontextprotocol/sdk/package.json')`. Examples are stdio-centric;
a Streamable-HTTP-on-an-existing-server walkthrough would have saved an evening.
`notifications/initialized` returning 400 before a session exists is technically
correct and practically confusing.

**Onboarding:** good conceptual docs, thin operational docs.

**Again?** Yes — and the version we pinned is now load-bearing for a CI
assertion, which is the strongest argument for a documented constant.

## Node type-stripping (`--experimental-strip-types`)

**Used for:** letting the server import the site's own `.ts` copy modules —
`record-copy.ts`, `change-feed.ts`, `walkback.ts`, `change-labels.ts` — so the
words an agent hears are the words a human reads.

**What worked:** it removed the option that looked obvious (a build step, or
duplicating strings in two languages) and with it the drift risk. Verified on
Node 22 with the flag and on 24 without it.

**Needs work:** the failure mode when a transitively imported module touches a
virtual module like `astro:content` is a resolution error far from its cause.
That is what forced `change-labels.ts` out of `steward.ts` — a good outcome
anyway, but discovered by accident.

**Onboarding:** one flag, no config.

**Again?** Yes, for exactly this pattern: shared prose between a static site and
a small server, without a build pipeline in the middle.

## zod 4.6.7

**Used for:** the input schemas on all seven tools, so an agent's arguments are
validated at the boundary instead of being trusted by the read functions.

**What worked:** the SDK accepts a raw shape, so a tool's schema and its handler
signature stay one object. Bad input comes back as a tool error rather than a
500 — `filter_ledger` refusing an unknown signal is a test we wrote and pass.

**Needs work:** little here. Pinning matters more than the library: the SDK
accepts `^3.25 || ^4.0`, and 3-vs-4 differences in error shapes are the kind of
thing that surfaces on someone else's machine.

**Onboarding:** instant.

**Again?** Yes.

## Astro 7 (existing frontend, extended)

**Used for:** nothing new in this window except the shared copy modules and the
`change-labels.ts` extraction. The MCP server deliberately does not import
anything that needs Astro's runtime.

**What worked:** the site's prose already lived in `.ts` modules rather than
inline in `.astro` templates, which is what made reuse possible at all.

**Needs work:** a module that mixes copy with `astro:content` is unimportable
outside the build, so the split has to be maintained by discipline. Worth a
lint rule if we keep growing surfaces that read the same sentences.

**Again?** Yes.

## Cloudflare Pages and Workers (hosting for the site, not for the server)

**Used for:** the deployed site at civicord.pages.dev. The MCP server is
self-hosted and deliberately **not** deployed — the organiser's FAQ confirms a
locally runnable repo plus a demo video is enough.

**What worked:** unchanged from prior windows; the ledger's static surfaces keep
building and deploying without new configuration.

**Needs work:** if we later serve Streamable HTTP from Cloudflare, sessions want
Durable Objects, and that is a real port rather than a flag.

**Again?** Yes for the site; not yet decided for the server.

## GitHub Actions

**Used for:** the new `mcp` job — install, start the server, poll for readiness,
run `client-check.mjs`, print the server log on failure.

**What worked:** the checks are the same command locally and in CI, which is the
only reason a contract test like "speech cannot be returned without its limits"
stays true.

**Needs work:** no lockfile for `mcp/` means `npm install` rather than `npm ci`,
so the job depends on exact pins holding.

**Again?** Yes.

## Playwright (demo recording)

**Used for:** the footage in the video — the 66-second browser-client take, the
63-second CI-run capture, and the server-source view, all driven headlessly at
1440×900.

**What worked:** the same tool that found three real bugs on the page (the
keyword router naming the wrong candidate, a top-level-await script that never
booted, a grid column blowing past the viewport) also produced the footage, so
the demo is a by-product of testing rather than a separate performance.

**Needs work:** video needs `npx playwright install ffmpeg`, and the error says
so clearly. Nothing to fix.

**Again?** Yes.

## ElevenLabs (narration and music)

**Used for:** the voiceover — 1,948 characters of the script in eight requests to
`text-to-speech/{voice}/with-timestamps` (`eleven_multilingual_v2`, voice
*Daniel — Steady Broadcaster*, stability 0.45 / similarity 0.75 / style 0.12) —
and the instrumental bed from `POST /v1/music`.

**What worked:** the alignment payload is the feature. Character start and end
times come back with the audio, so caption and chip timings are *derived* from
the take instead of eyeballed: `tools/build-timeline.py` walks the alignment,
rejoins identifiers the voice reads as separate words ("get candidate" →
`get_candidate`), and emits the windows the composition prints. That is the
difference between subtitles that match a narration and subtitles that happen to
arrive near it. Music needed no second vendor or key.

**Needs work:** `seed` and `prompt` are mutually exclusive on `/v1/music`; the
422 does say so, but nothing prepares you for it. There is no documented maximum
length for one generation (we generated 180s and trimmed to 150s). Account
reporting is coarse — the subscription endpoint gives characters used, not what
each call cost.

**Onboarding:** one env var, one `curl`.

**Again?** Yes. The narration is machine-generated, and this entry says so; the
video description has to as well.

## HyperFrames (composition and render)

**Used for:** the finished cut — `data/film/mcp-entry/`, one 165.78-second
composition at 1440×900/30: four designed cards, six footage segments, six
lower-thirds, eight protocol chips, 63 caption lines, the ducked bed and the
narration mix, rendered with `npx hyperframes render`.

**What worked:** a composition is HTML, so repo discipline applies to the film.
`index.html` is generated from the voiceover-derived timings, which keeps the
words on screen diffable against the words on the surfaces — no second script to
drift. `check` is the gate that matters: it reported five `content_overlap`
findings where a caption's tail printed over the next line, and a
`canvas_overflow` where a decorative data column drifted off-canvas. Neither is
visible in a preview scrub; both are permanent in a render. Contrast (46/46 WCAG
AA) is measured, not assumed.

**Needs work:** a lint *error* switches off the layout and contrast audits, and
`check` then reports "0 sample(s)" — which reads as clean. `init` refuses a
non-empty directory (the assets have to move out first) and takes
`--non-interactive`, not `--yes`. And the gate that matters most is missing: a
composition authored against the generic `serif` family rendered its first ~90
seconds in a grotesque and its last card in a real serif, with `lint` quiet,
`check` at 0 findings, and every Studio snapshot showing the correct face — the
defect existed only in the MP4. Generic families should be resolved once per
render and the resolved name reported. 4,974 frames took 5m33s on one worker
(screenshot capture, hardware GPU).

**Again?** Yes, for anything where the text on screen must be the text in the
repo.

## ffmpeg (audio assembly)

**Used for:** everything between the API responses and the two files the
composition plays — `loudnorm` on the narration, the bed trimmed and normalised
before a `sidechaincompress` keyed by that narration, `amix` into the final
mixes, a 5s `acrossfade` loop of the bed once the film outgrew one generated
take, and one capture re-timed to 30fps.

**What worked:** every stage is one reproducible command in
`tools/build-audio.py`, so re-recording a line is a re-run, not a re-edit.

**Needs work:** `sidechaincompress` ends its output when the *sidechain* ends,
which silently truncated the bed to the length of the loudness pass. The fix
(`apad` then `atrim`) is in the documentation but nothing warns you on the way
in. The build script now asserts the output length against the composition
because the failure was inaudible on a spot check — and the pad turned out to be
the trap a second time: it stretches a too-short source to the requested length,
so the assertion passes over 15 seconds of silence. Assert the source, not just
the result. `acrossfade` has two of its own: it needs both inputs on the same
sample format (`aformat=sample_fmts=fltp:…` first) or it hands the encoder a
frame it cannot pad, and `libmp3lame` refuses its output outright, so the loop
has to be written as WAV.

**Onboarding:** the man page, as ever.

**Again?** Yes.


## Coding agents (Qoder, Devin, Claude, Codex, Cursor)

**Used for:** most of the writing in the window — the audit and pipeline work,
the Astro frontend, the MCP server and its contract checks, the demo
composition, and a great deal of these docs. One person directed throughout, and
that is the part the rules care about.

**What worked:** on surfaces where correctness is checkable, they are fast and
the checks hold. Project rules written down travel well: this repo carries
`skills/civicord-graph/SKILL.md`, and the film project carries `AGENTS.md` and
`CLAUDE.md` — byte-identical, one file per vendor, same content. The instruction
surface is the right idea; the per-vendor duplication is the part that stinks.

**Needs work:** provenance. Five tools, one stamped author: three commits read
`Cursor Agent <cursoragent@cursor.com>` and one branch reads
`cursor/meaningful-session-5605`; everything else landed under the maintainer's
name. So `git log` looks like a one-author project with three anomalies, and a
rule that asks whether the work is yours cannot be answered from history without
the entrant publishing session logs. A trailer convention would fix that.

Second: agents do not look at the output. Two defects this week — a narration
line saying eighteen months where the record says seventeen, and a composition
that rendered its first 90 seconds in a sans and its last card in a serif — were
both reported as finished by the agent that made them, and found by checking
prose against data and pulling frames off the MP4.

**Onboarding:** no setup worth mentioning; the cost is in reviewing.

**Again?** Yes, with the verification pass as the unit of work rather than the
commit.


## Data sources, not tools — but the form asks about authorisation

Democracy Club candidate data (person IDs and seat keys, open terms); the
Campaign Lab April 2025 scrape (reuse with credit, CC-BY, agreed 2026-09-12);
our own September 2026 fetches of public campaign sites, robots-aware and
rate-limited. No AWS service is used anywhere in this project, which is why we
are not entering the AWS Builder mini-challenge.

Generated, not collected: the demo's narration and music bed are machine-made
(ElevenLabs, sections above) and are labelled as such wherever the video
appears. Nothing a judge hears in the voiceover is presented as a human
statement, and no synthetic audio is used for any candidate, party, or source.
