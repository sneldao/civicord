# MCP demo script — Amazon "Build, Ship, Shape" entry (2:46)

The track entry's video, separate from the site tour in
[`demo-script.md`](demo-script.md). 2:45.78 as delivered, under the 3-minute cap,
English, publicly visible on YouTube. Every frame of it is the real surface —
captured with Playwright at 1440×900, no mockups, no staged answers.

**Delivered:** `data/film/mcp-entry/renders/mcp-entry-v2.mp4` (2:46, voiced,
captions, music bed). The composition is HTML — see Assembly notes.
`data/out/mcp-demo/rough-cut.mp4` (2:16, silent) is the earlier picture-only
assembly, kept because it is what the shot list was timed against before the
narration existed.

The narration is machine-generated (ElevenLabs), as is the music bed; both are
disclosed in [amazon-submission.md](amazon-submission.md) and must be stated in
the video description.

The rule being satisfied, verbatim from the organiser's page:

> The repository must demonstrate use of your track's required technology at
> runtime in your code — imported and actually called … not just a mention in
> the README.

and, on what may be shown:

> A web page that acts as an actual MCP client (sending initialize, tools-list,
> and tools-call requests over Streamable HTTP) satisfies the requirement.

So the video's argument is one line: *the same audit result, on two surfaces.*
The human page existed before the window; the server and the client page are
the in-window work.

It opens on the problem rather than on the product, because the numbers are the
problem: four of them, each one measured, with the limit of the measurement
printed underneath.

---

## Shot list

| # | Time | Shot | Source |
|---|---|---|---|
| 1 | 0:00–0:20 | Cold open: the wordmark, then 2,375 / 17 months / 1,513 / 441 as the voice comes to each, over the audit-day caveat | `#opener` in `data/film/mcp-entry/index.html` |
| 2 | 0:20–0:31 | Question card: "What happened to the websites candidates published to?", ten ledger rows drifting behind it | `#title` |
| 3 | 0:31–0:48 | `civicord.pages.dev/candidates/1688` — Adam Holloway's record, scrolled to the verdict line | `take.mp4` 0:00–0:17 |
| 4 | 0:48–1:07 | `http://127.0.0.1:8787` — the handshake: `initialize`, the protocol version, seven tools | `take.mp4` 0:18–0:37 |
| 5 | 1:07–1:30 | The same page, pushed in: three questions put to it, then the frames panel open on raw JSON-RPC | `take.mp4` 0:37–1:01 |
| 6 | 1:30–1:55 | `mcp/server.mjs` on GitHub: the SDK import and the seven `registerTool` calls with `readOnlyHint` | `code30.mp4` 0:04–0:28 |
| 7 | 1:55–2:01 | The Actions tab on `main`, run #39 queued → in progress | `code-ci.mp4` 0:14–0:20 |
| 8 | 2:01–2:21 | CI: run #39 on `26c69e7`, python / mcp / frontend all green | `code-ci.mp4` 0:24–0:44 |
| 9 | 2:21–2:28 | Close on what the record does not say: the audit-day limit, then the read-only line | `#close` |
| 10 | 2:28–2:46 | Lockup: brand, mission, vision, and the three URLs — held complete for the last 3s | `#lockup` |

Shots 2 and 9 replace the two stills in [`demo-cards.html`](demo-cards.html),
which is kept because its wording is what the generated cards were checked
against. Shots 1 and 10 are new: the film previously opened on the question and
ended on the caveat, which left the numbers unsaid and the brand unsaid at both
ends.

Shots 4 and 5 are one continuous capture cut in two. The split is where the
narration stops describing the handshake and starts putting questions to the
server; because both halves read off the same media range the cut itself is
invisible, so the beat change is carried by a 16% push-in over shot 5.

Shot 5 carries the entry. Open the frames panel last and hold it:
`initialize → 2025-11-25` and `tools/call → explain_seat` on screen are the
evidence the track asks for, in the page rather than in a slide about the page.
Eight chips print the protocol facts, each timed to the word that introduces
it: five over shots 4–5 (`initialize`, `protocol 2025-11-25`, `tools/list → 7`,
`tools/call get_candidate`, `tools/call explain_seat`), then `AGPL-3.0` on the
title card, `readOnlyHint: true` over the source, `client-check.mjs` over the
run.

Shot 8 shows the run, not the job log — GitHub asks anonymous visitors to sign
in before opening a log, so `client-check.mjs`'s "all checks passed" is spoken
in (6) and printed in the submission, not shown. If a frame of it is wanted,
capture it signed-out from the commit status check tooltip instead.

## Narration

Eight blocks, 1,948 characters, 156.1 s of speech over 165.78 s of picture.
Machine-generated (ElevenLabs, `eleven_multilingual_v2`, voice *Daniel — Steady
Broadcaster*); the block boundaries below are the rendered take — each one is
where that voice actually lands, not where a reading pace was estimated. The
source of truth is `data/film/mcp-entry/tools/vo-blocks.json`, quoted here
verbatim.

> **(1)** Every UK parliamentary candidate published a website in April 2025. We scraped all 2,375, and went back seventeen months later. 1,513 answered. 441 no longer resolve.
>
> **(2)** Civicord is an auditable public record of what political campaigns published — which URLs still respond, where they redirect, and what changed.
>
> **(3)** This part already existed: a candidate's page. Adam Holloway's recorded URL failed to resolve at the audit. The page says so — and says what the check cannot say: that an outage and a removal look the same to us.
>
> **(4)** What was built in this window is the same record, answering an agent. This page is an MCP client: it sends `initialize`, negotiates protocol version 2025-11-25, lists seven tools and calls them over Streamable HTTP. Ask it "is Adam Holloway's page gone, or just down?" and it calls `get_candidate`. Ask about a constituency and it calls `explain_seat`, which will not return its answer without the limits attached. Look at the calls behind the answer: that is the protocol on the wire, not a description of it.
>
> **(5)** Nine hundred lines: a 344-line server, a 386-line read side, and 192 lines of contract checks. The server imports the same TypeScript copy modules the site's pages import, so an agent cannot be told something the human page does not say. Every tool is annotated read-only. There is no write path: a caller cannot change the record, and a party cannot ask for a softer answer than the public gets.
>
> **(6)** The contract is tested, not assumed. CI negotiates the protocol version, asserts all seven tools, checks that a capped page still reports the whole count, walks every prose field for internal slugs, and fails if a sentence can be returned without its limits.
>
> **(7)** The record is public, the server is read-only, and the caveats travel with the answer.
>
> **(8)** Civicord. An auditable public record of what political campaigns published — free to read, openly licensed, and built to work for any democracy. The United Kingdom is where it starts.

Block (1)'s four numbers are the record's, taken from the same JSON the site and
the MCP server serve (`live: 1513`, `gone: 441`, `redirected: 659`, 2,375
audited on 2026-09-07); `gone` is 363 `dns_error` + 78 `connection_error`, which
is why the card says "no longer resolve" rather than "domains gone".
`docs/phase0-findings.md` reports the same audit as 1,512 live with 43 timeouts —
one row is classified differently there than in the shipped record. The film
quotes the record because that is what a judge can diff against a running server.
The redirect count is deliberately not on this card: 427 of its 659 rows keep the
same site — "a redirect alert as it stands is two-thirds noise", in that doc's
words — which is a finding rather than a headline, and a four-up stat row is no
place to say so. It is made properly in
[`significance-labelling.md`](significance-labelling.md), where it argues for
scoring over alerting.

## What the video must not claim

- Not "integrated with Alexa+". There is no Alexa+ integration. It is an MCP
  server Alexa+ can connect to, which is what the track asks for.
- Not "built during the hackathon" where it wasn't. The site, the pipeline and
  the ledger predate the window; the server, the browser client, the shared-copy
  refactor and the contract checks are the in-window work, and the narration
  names them that way.
- Nothing that implies a DNS failure means a candidate stopped campaigning. The
  sentence on screen is the one the audit supports.
- No number on screen that the record does not carry, and no number rounded up
  into a stronger claim than the measurement — which is why the gap is
  seventeen months, not eighteen.

## Assembly notes

The delivered video is rendered from a composition, not edited in a timeline
app, so it rebuilds end to end from the narration text:

```
python3 tools/build-vo.py 0 4        # ElevenLabs → audio/vo-N.mp3 + align-N.json
python3 tools/build-timeline.py      # alignment → film-data.json
python3 tools/build-audio.py         # VO blocks + ducked bed → assets/*.mp3
python3 tools/build-index.py         # film-data.json → index.html
npx hyperframes check
npx hyperframes render -o renders/mcp-entry-v2.mp4 --quality delivery
```

The `tools/` and `audio/` directories sit under `data/`, which this repository
gitignores on purpose: media and generated takes are not committed. The
composition is therefore reproducible from the script above plus the narration
quoted in full in this file — every caption, chip and card time in the film
derives from measured audio, so retyping the blocks rebuilds the cut.

- Caption and chip times are derived from the narration's character alignment,
  never typed in: re-record a line and the text moves with it. The alignment
  gives character offsets, so `build-timeline.py` carries a table that rejoins
  the identifiers a voice reads as separate words (`get candidate` →
  `get_candidate`).
- Graphics land on spoken words through one helper that fails the build when a
  block stops saying its anchor — a reveal keyed to a word the voice no longer
  says does not error, it just never appears.
- Audio: speech `loudnorm`ed to −16 LUFS, the bed normalised to −27 *before* a
  `sidechaincompress` keyed by that speech (a static gain made the music louder
  than the voice on the first pass). The bed is one 150s generated take and the
  film outgrew it, so `build-audio.py` crossfade-loops two passes with a 5s
  triangle overlap rather than hard-looping under the closing line. It then
  asserts every file against 165.78s, because `sidechaincompress` ends with its
  sidechain and a truncated bed is inaudible on a spot check.
- Type is pinned to named families in a same-class stack, never the bare
  generics: on this machine a `font-family: serif` composition rendered its first
  90 seconds in a sans and its last card in a serif, and no Studio snapshot
  showed it. Compare an early frame with a late one after any render.
- The render is 1440×900 at 30 fps, 4,974 frames, −16.7 LUFS integrated
  (measured on the MP4 with `ebur128`), 63 captions, 14/14 text checks passing
  WCAG AA.
- Captures come from Playwright `recordVideo`, then
  `ffmpeg -c:v libx264 -pix_fmt yuv420p -crf 21 -preset slow -movflags +faststart`.
- The earlier picture-only cut is still reproducible — `split` → `trim` →
  `concat` at 30 fps, stills held with `-loop 1 -t`:

  ```
  ffmpeg -loop 1 -t 12 -i card-title.png -i take.mp4 -i code-ci.mp4 \
         -loop 1 -t 10 -i card-close.png -filter_complex \
    "[0:v]fps=30,scale=1440:900,setsar=1,format=yuv420p[a0];
     [1:v]split=2[t1][t2];
     [t1]trim=0:18,setpts=PTS-STARTPTS,fps=30,format=yuv420p,setsar=1[a1];
     [t2]trim=18:66,setpts=PTS-STARTPTS,fps=30,format=yuv420p,setsar=1[a2];
     [2:v]split=2[c1][c2];
     [c1]trim=0:14,setpts=PTS-STARTPTS,fps=30,format=yuv420p,setsar=1[a3];
     [c2]trim=24:58,setpts=PTS-STARTPTS,fps=30,format=yuv420p,setsar=1[a4];
     [3:v]fps=30,scale=1440:900,setsar=1,format=yuv420p[a5];
     [a0][a1][a2][a3][a4][a5]concat=n=6:v=1:a=0[v]" \
    -map "[v]" -c:v libx264 -pix_fmt yuv420p -crf 21 -movflags +faststart rough-cut.mp4
  ```

- The takes are silent by design: narration goes underneath, so pacing can be
  retimed without re-recording the demo.
- Narration and music are machine-generated, and are named as such in the
  per-tool feedback and friction log. The entry asks for feedback on the tools
  used; hiding which ones were used reads badly later.
