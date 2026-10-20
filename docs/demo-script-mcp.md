# MCP demo script — Amazon "Build, Ship, Shape" entry (~2:20)

The track entry's video, separate from the site tour in
[`demo-script.md`](demo-script.md). Target 2:20, under the 3-minute cap,
English, publicly visible on YouTube or Vimeo. Recorded with Playwright at
1440×900, so every frame is the real surface — no mockups, no staged answers.

Footage so far: `data/out/mcp-demo/take.mp4` (66 s, silent) covers shots 2 and
3. Shots 1, 4, 5 and 6 are still to make; shot 4 needs the code pushed first.

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
| 1 | 0:00–0:12 | Title card: what the ledger is, one sentence, plus "before / after" | still |
| 2 | 0:12–0:28 | `civicord.pages.dev/candidates/1688` — Adam Holloway's record, scrolled to the verdict line | `take.mp4` 0:00–0:16 |
| 3 | 0:28–1:26 | `http://127.0.0.1:8787` — the same question, then three more, then the frames panel open on raw JSON-RPC | `take.mp4` 0:16–1:06 |
| 4 | 1:26–1:50 | `mcp/server.mjs` on GitHub: the SDK import and the seven `registerTool` calls with `readOnlyHint` | needs push |
| 5 | 1:50–2:10 | CI: the `mcp` job green, `client-check.mjs` reporting "all checks passed" | Actions run |
| 6 | 2:10–2:20 | Close on the caveat sentence, then the repo URL | still |

Shot 3 carries the entry. Open the frames panel last and hold it:
`initialize → 2025-11-25` and `tools/call → explain_seat` on screen are the
evidence the track asks for, in the page rather than in a slide about the page.

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
> **(4)** The server is about three hundred lines. It imports the same
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
- The take is silent by design: narration goes underneath, so pacing can be
  trimmed without re-recording the demo.
- If the narration is machine-generated, say so in the friction log. The entry
  asks for feedback on the tools used; hiding which ones were used reads badly
  later.
