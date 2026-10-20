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

**Used for:** the 66-second demo take — driving the browser client, typing the
questions, opening the frame panel, recording at 1440×900.

**What worked:** the same tool that found three real bugs on the page (the
keyword router naming the wrong candidate, a top-level-await script that never
booted, a grid column blowing past the viewport) also produced the footage, so
the demo is a by-product of testing rather than a separate performance.

**Needs work:** video needs `npx playwright install ffmpeg`, and the error says
so clearly. Nothing to fix.

**Again?** Yes.

## Data sources, not tools — but the form asks about authorisation

Democracy Club candidate data (person IDs and seat keys, open terms); the
Campaign Lab April 2025 scrape (reuse with credit, CC-BY, agreed 2026-09-12);
our own September 2026 fetches of public campaign sites, robots-aware and
rate-limited. No AWS service is used anywhere in this project, which is why we
are not entering the AWS Builder mini-challenge.
