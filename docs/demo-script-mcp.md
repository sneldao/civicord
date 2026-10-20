# MCP demo script — Amazon "Build, Ship, Shape" entry (2:21)

The track entry's video, separate from the site tour in
[`demo-script.md`](demo-script.md). 2:21 as delivered, under the 3-minute cap,
English, publicly visible on YouTube. Every frame of it is the real surface —
captured with Playwright at 1440×900, no mockups, no staged answers.

**Delivered:** `data/film/mcp-entry/renders/mcp-entry.mp4` (2:21, voiced,
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

---

## Shot list

| # | Time | Shot | Source |
|---|---|---|---|
| 1 | 0:00–0:17 | Title card: the question, one-sentence lede, ten ledger rows drifting behind it | `#title` in `data/film/mcp-entry/index.html` |
| 2 | 0:17–0:34 | `civicord.pages.dev/candidates/1688` — Adam Holloway's record, scrolled to the verdict line | `take.mp4` 0:00–0:17 |
| 3 | 0:34–1:21 | `http://127.0.0.1:8787` — the same question, then three more, then the frames panel open on raw JSON-RPC | `take.mp4` 0:18–1:06 |
| 4 | 1:21–1:46 | `mcp/server.mjs` on GitHub: the SDK import and the seven `registerTool` calls with `readOnlyHint` | `code30.mp4` 0:04–0:28 |
| 5 | 1:46–1:52 | The Actions tab on `main`, run #39 queued → in progress | `code-ci.mp4` 0:14–0:20 |
| 6 | 1:52–2:12 | CI: run #39 on `26c69e7`, python / mcp / frontend all green | `code-ci.mp4` 0:24–0:44 |
| 7 | 2:12–2:21 | Close on the caveat sentence, the read-only line, then the repo URL | `#close` in the same file |

Shots 1 and 7 replaced the stills in [`demo-cards.html`](demo-cards.html), which
is kept because its wording is what the generated cards were checked against.

Shot 3 carries the entry. Open the frames panel last and hold it:
`initialize → 2025-11-25` and `tools/call → explain_seat` on screen are the
evidence the track asks for, in the page rather than in a slide about the page.
Eight chips print the protocol facts, each timed to the word that introduces
it: five over shot 3 (`initialize`, `protocol 2025-11-25`, `tools/list → 7`,
`tools/call get_candidate`, `tools/call explain_seat`), then `AGPL-3.0` on the
title card, `readOnlyHint: true` over the source, `client-check.mjs` over the
run.

Shot 6 shows the run, not the job log — GitHub asks anonymous visitors to sign
in before opening a log, so `client-check.mjs`'s "all checks passed" is spoken
in (5) and printed in the submission, not shown. If a frame of it is wanted,
capture it signed-out from the commit status check tooltip instead.

## Narration

Six blocks, 1,772 characters, 134.5 s of speech over 141.04 s of picture.
Machine-generated (ElevenLabs, `eleven_multilingual_v2`, voice *Daniel — Steady
Broadcaster*); the block boundaries below are the rendered take — each one is
where that voice actually lands, not where a reading pace was estimated.

> **(1)** Civicord is a public record of what happened to UK election campaign
> websites. Twenty-three hundred and seventy-five candidates, scraped in April
> 2025, fetched again in September 2026.
>
> **(2)** This part already existed: a candidate's page. Adam Holloway's
> recorded URL failed to resolve at the audit. The page says so — and says what
> the check cannot say: that an outage and a removal look the same to us.
>
> **(3)** What was built in this window is the same record, answering an agent.
> This page is an MCP client: it sends `initialize`, negotiates protocol
> version 2025-11-25, lists seven tools and calls them over Streamable HTTP.
> Self-hosted, from our own origin, with no third-party gateway.
>
> Ask it "is Adam Holloway's page gone, or just down?" and it calls
> `get_candidate`. Ask about a constituency and it calls `explain_seat`, which
> answers in one block of speech — and refuses to return that speech without
> its limits attached. Look at the calls behind the answer: that is the protocol
> on the wire, not a description of it.
>
> **(4)** Nine hundred lines: a 344-line server, a 386-line read side, and 192
> lines of contract checks. The server imports the same
> TypeScript copy modules the site's pages import, so an agent cannot be told
> something the human page does not say. Every tool is annotated read-only.
> There is no write path: a caller cannot change the record, and a party cannot
> ask for a softer answer than the public gets.
>
> **(5)** The contract is tested, not assumed. CI negotiates the protocol
> version, asserts all seven tools, checks that a capped page still reports the
> whole count, walks every prose field for internal slugs, and fails if a
> sentence can be returned without its limits.
>
> **(6)** The record is public, the server is read-only, and the caveats travel
> with the answer. github.com/sneldao/civicord.

## What the video must not claim

- Not "integrated with Alexa+". There is no Alexa+ integration. It is an MCP
  server Alexa+ can connect to, which is what the track asks for.
- Not "built during the hackathon" where it wasn't. The site, the pipeline and
  the ledger predate the window; the server, the browser client, the shared-copy
  refactor and the contract checks are the in-window work, and the narration
  names them that way.
- Nothing that implies a DNS failure means a candidate stopped campaigning. The
  sentence on screen is the one the audit supports.

## Assembly notes

The delivered video is rendered from a composition, not edited in a timeline
app, so the whole thing rebuilds from files in the repo:

```
python3 tools/build-timeline.py   # ElevenLabs alignment → film-data.json
python3 tools/build-audio.py      # VO blocks + ducked bed → assets/*.mp3
python3 tools/build-index.py      # film-data.json → index.html
npx hyperframes check
npx hyperframes render -o renders/mcp-entry.mp4 --quality delivery
```

- Caption and chip times are derived from the narration's character alignment,
  never typed in: re-record a line and the text moves with it. The alignment
  gives character offsets, so `build-timeline.py` carries a table that rejoins
  the identifiers a voice reads as separate words (`get candidate` →
  `get_candidate`).
- Audio: speech `loudnorm`ed to −16 LUFS, the bed normalised to −27 *before* a
  `sidechaincompress` keyed by that speech (a static gain made the music louder
  than the voice on the first pass), then padded to the composition length.
  `build-audio.py` asserts every file against 141.04s, because
  `sidechaincompress` ends with its sidechain and a truncated bed is inaudible
  on a spot check.
- The render is 1440×900 at 30 fps, 4,232 frames, −16.6 LUFS integrated,
  captions 46/46 on WCAG AA contrast.
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
