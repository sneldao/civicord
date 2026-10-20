# Civicord ledger — MCP server

A self-hosted [Model Context Protocol](https://modelcontextprotocol.io) server
for the Civicord record of what happened to UK election campaign websites.

| | |
|---|---|
| Transport | Streamable HTTP, JSON-RPC 2.0 at `POST /mcp` |
| Protocol | negotiated as **`2025-11-25`** (`client-check.mjs` asserts it) |
| Data | the same committed snapshots the static site builds from |
| Writes | none. Every tool is annotated `readOnlyHint` |
| Requires | Node ≥ 22.6 (type-stripping — the server imports the site's `.ts` copy modules) |

## Run it

```bash
cd mcp
npm install
npm start          # http://127.0.0.1:8787/mcp
npm run check      # contract checks against the running server
node demo.mjs      # four scripted questions, printed as asked and answered
```

`npm install` resolves exact versions, not ranges: the server asserts the SDK's
latest protocol version is `2025-11-25`, and a minor bump could change what it
negotiates. `GET /` serves a browser MCP client that runs the same contract
against this endpoint — `initialize`, `tools/list`, `tools/call` over Streamable
HTTP in the page itself. `GET /about` is the plain-text description. There is no
key and no login, because the record it serves is already public.

### Configuration

| Variable | Default | Meaning |
|---|---|---|
| `HOST` | `127.0.0.1` | Bind address. `0.0.0.0` only behind TLS you control |
| `PORT` | `8787` | |
| `ALLOWED_ORIGINS` | *(empty)* | Comma-separated browser origins permitted to call `/mcp`. Requests carrying any other `Origin` get 403; clients with no `Origin` (CLI, assistants) are always allowed |
| `MCP_URL` | `http://127.0.0.1:8787/mcp` | Where `client-check.mjs` and `demo.mjs` connect |

## Why the wording is not written here

`ledger.mjs` imports `frontend/src/lib/change-feed.ts`, `record-copy.ts`,
`walkback.ts` and `change-labels.ts`. Those modules are what render the human
pages, so an agent is answered by the same code that writes the page it cites —
one sentence about the surname heuristic, one caveat about the homepage-fetch
scope, in both places, with no second copy to drift.

`client-check.mjs` enforces the part of that which could otherwise rot: prose
returned by the server must not contain internal slugs (`still_attested`,
`dns_error`, …), and `explain_seat` must not return speech without its limits.
Machine fields keep their stable values (`outcome: "died"`), exactly as the
public JSON API at `/api/candidates/{id}.json` always has.

## Tools

| Tool | Answers |
|---|---|
| `get_summary` | dataset totals, on both axes kept separate, with standing limits |
| `search_civicord` | a person, seat or party by name fragment |
| `get_candidate` | full record for one Democracy Club person ID |
| `get_constituency` | seat record plus the timeline the seat page renders |
| `explain_seat` | the read-out answer: a short speech block and its limits, inseparable |
| `filter_ledger` | rows by change signal, party, HTTP status — or by missing April sentences |
| `get_claim_diff` | April sentences not found in the later fetch, new ones listed apart |

## Connecting an assistant

Any Streamable-HTTP MCP client: point it at `http://127.0.0.1:8787/mcp`.

```json
{
  "mcpServers": {
    "civicord": { "type": "http", "url": "http://127.0.0.1:8787/mcp" }
  }
}
```

A real assistant needs a public HTTPS origin. This repo's host is Cloudflare
**Pages** — static files plus a routing shim — and a stateful Streamable-HTTP
session needs either a persistent process or Durable Objects, so the port is
separate work: see the note in [`docs/hackathons.md`](../docs/hackathons.md).
Until then the server runs locally, and the demo says so rather than implying a
hosted endpoint.

## Not wired in

`frontend/src/components/WebMCP.astro` registers browser tools for an agent
sitting next to a reader (`document.modelContext`). Same names, same payloads.
This server is the transport for an agent that is *not* on the page. They share
the copy modules, not the tool registry, and neither one proxies the other.
