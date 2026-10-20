# MCP demo script — Amazon "Build, Ship, Shape" entry (2:16)

The track entry's video, separate from the site tour in
[`demo-script.md`](demo-script.md). 2:16 as cut, under the 3-minute cap,
English, publicly visible on YouTube or Vimeo. Recorded with Playwright at
1440×900, so every frame is the real surface — no mockups, no staged answers.

Footage: `data/out/mcp-demo/rough-cut.mp4` (2:16, silent) is all six shots in
order — `take.mp4` (66 s) for the human page and the client, `code-ci.mp4`
(63 s) for the code and CI, and the two stills rendered from
[`demo-cards.html`](demo-cards.html). What is left is the narration track and a
public upload; nothing needs re-recording.

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
| 1 | 0:00–0:12 | Title card: what the ledger is, one sentence, plus "before / after" | `demo-cards.html#title` |
| 2 | 0:12–0:30 | `civicord.pages.dev/candidates/1688` — Adam Holloway's record, scrolled to the verdict line | `take.mp4` 0:00–0:18 |
| 3 | 0:30–1:18 | `http://127.0.0.1:8787` — the same question, then three more, then the frames panel open on raw JSON-RPC | `take.mp4` 0:18–1:06 |
| 4 | 1:18–1:32 | `mcp/server.mjs` on GitHub: the SDK import and the seven `registerTool` calls with `readOnlyHint` | `code-ci.mp4` 0:00–0:14 |
| 5 | 1:32–2:06 | CI: run #39 on `main`, python / mcp / frontend all green | `code-ci.mp4` 0:24–0:58 |
| 6 | 2:06–2:16 | Close on the caveat sentence, then the repo URL | `demo-cards.html#close` |

Shot 3 carries the entry. Open the frames panel last and hold it:
`initialize → 2025-11-25` and `tools/call → explain_seat` on screen are the
evidence the track asks for, in the page rather than in a slide about the page.

Shot 5 shows the run, not the job log — GitHub asks anonymous visitors to sign
in before opening a log, so `client-check.mjs`'s "all checks passed" is spoken
in (5) and printed in the submission, not shown. If a frame of it is wanted,
capture it signed-out from the commit status check tooltip instead.

## Narration

~330 words at reading pace.

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

- Capture with Playwright `recordVideo`, then
  `ffmpeg -c:v libx264 -pix_fmt yuv420p -crf 21 -preset slow -movflags +faststart`.
- The cut is `split` → `trim` → `concat` at 30 fps, stills held with
  `-loop 1 -t`, so the edit points above are reproducible:

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

- The take is silent by design: narration goes underneath, so pacing can be
  trimmed without re-recording the demo.
- If the narration is machine-generated, say so in the friction log. The entry
  asks for feedback on the tools used; hiding which ones were used reads badly
  later.
