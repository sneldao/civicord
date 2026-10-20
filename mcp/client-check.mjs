#!/usr/bin/env node
// Talks to the MCP server the way an assistant does, and fails loudly if the
// contract is not met. Run against a started server:
//   node server.mjs &  node client-check.mjs
//
// The checks are about our record, not generic MCP smoke:
//   1. the negotiated protocol version is 2025-11-25
//   2. every read tool answers, and an unknown id is an error rather than a shrug
//   3. prose an assistant could read out carries labels, never internal slugs
//   4. a spoken seat answer cannot come back without its limits attached

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ENDPOINT = process.env.MCP_URL ?? "http://127.0.0.1:8787/mcp";
const EXPECTED_PROTOCOL = "2025-11-25";
const SLUGS = ["still_attested", "repurposed_suspect", "claims_disappeared", "dns_error", "connection_error"];

// Data fields may name internal states — the public JSON API has always done it.
// Prose may not: it is what gets read out.
const PROSE_KEYS = new Set([
  "speech", "story", "detail", "body", "summary", "citation", "verdictCopy",
  "note", "footnote", "scope", "pairingGap", "heading", "when", "sentence",
]);

let failures = 0;
const prose = [];
function check(label, ok, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

function walk(value) {
  if (Array.isArray(value)) return value.forEach(walk);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string") {
      if (PROSE_KEYS.has(key)) prose.push([key, child]);
    } else {
      walk(child);
    }
  }
}

const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT));
const client = new Client({ name: "civicord-check", version: "0.1.0" });

// The handshake raw, because it is the part the track requirement is written
// about and the SDK client does not surface the initialize result.
const handshake = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: EXPECTED_PROTOCOL, capabilities: {}, clientInfo: { name: "raw-check", version: "0" } },
  }),
});
const payload = await readJsonRpc(handshake);
check(
  `initialize accepts and confirms ${EXPECTED_PROTOCOL}`,
  handshake.ok && payload?.result?.protocolVersion === EXPECTED_PROTOCOL,
  `serverInfo ${JSON.stringify(payload?.result?.serverInfo)}`,
);
check(
  "initialize returns usage instructions",
  typeof payload?.result?.instructions === "string" && payload.result.instructions.includes("explain_seat"),
);
// Close the probe session — a handshake we do not intend to use should not sit
// in the server's session table.
const probeSession = handshake.headers.get("mcp-session-id");
if (probeSession) {
  await fetch(ENDPOINT, { method: "DELETE", headers: { "mcp-session-id": probeSession } });
}

const crossOrigin = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "content-type": "application/json", origin: "http://some-other-site.example" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
});
check("a browser origin that was not configured is refused", crossOrigin.status === 403, `got ${crossOrigin.status}`);

await client.connect(transport);

async function readJsonRpc(response) {
  const body = await response.text();
  if (response.headers.get("content-type")?.includes("event-stream")) {
    const line = body.split("\n").find((l) => l.startsWith("data:"));
    return JSON.parse(line.slice(5).trim());
  }
  return JSON.parse(body);
}

const about = client.getServerVersion() ?? {};
check(
  `protocol negotiated as ${EXPECTED_PROTOCOL}`,
  transport.protocolVersion === EXPECTED_PROTOCOL,
  `${about.name} ${about.version} · session ${String(transport.sessionId).slice(0, 8)}`,
);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name);
check(
  "all seven tools registered",
  ["get_summary", "search_civicord", "get_candidate", "get_constituency", "explain_seat", "filter_ledger", "get_claim_diff"].every((n) =>
    names.includes(n),
  ),
  names.join(", "),
);
check("every tool declares itself read-only", tools.every((t) => t.annotations?.readOnlyHint === true));

async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  const blocks = (result.content ?? []).map((c) => c.text ?? "");
  const jsonBlock = blocks.find((t) => t.trimStart().startsWith("{")) ?? "{}";
  if (result.isError !== true) {
    walk(JSON.parse(jsonBlock));
    for (const block of blocks) {
      if (block.trimStart().startsWith("{") || block.trimStart().startsWith("[")) continue;
      prose.push(["block", block]);
    }
  }
  return { isError: result.isError === true, blocks, body: blocks.join("\n"), value: JSON.parse(jsonBlock) };
}

const summary = await call("get_summary", {});
check("get_summary reports the audit date", !summary.isError && summary.body.includes("2026-09-07"));
check("get_summary separates the two axes", !summary.isError && summary.value.redirected !== summary.value.changeSignals.redirected);

const found = await call("search_civicord", { query: "holloway", limit: 3 });
check("search resolves Adam Holloway to a public record URL", !found.isError && found.body.includes("civicord.pages.dev/candidates/1688"));

const person = await call("get_candidate", { id: "1688" });
check("get_candidate carries the citation", !person.isError && person.value.citation?.includes("Democracy Club person ID 1688"));
check("get_candidate states the surname heuristic as a heuristic", !person.isError && person.value.citation?.includes("heuristic only"));

const seat = await call("get_constituency", { slug: "gravesham" });
check("get_constituency returns the seat timeline", !seat.isError && seat.body.includes("What the audit found"));

const unknown = await call("get_candidate", { id: "000000" });
check("an unknown id is an error, not an empty object", unknown.isError === true);

const claimDiff = await call("get_claim_diff", { id: "19953" });
check(
  "get_claim_diff states the pairing gap",
  !claimDiff.isError && claimDiff.body.includes("No replacement sentence is matched"),
);

const filtered = await call("filter_ledger", { signal: "gone", limit: 3 });
check("filter_ledger hands back a shareable public URL", !filtered.isError && filtered.body.includes("civicord.pages.dev/browse?change=gone"));
check(
  "a capped page still reports the whole count",
  filtered.value.truncated === true && filtered.value.returned === 3 && filtered.value.matched > 3,
  `${filtered.value.returned} of ${filtered.value.matched}`,
);

const badSignal = await call("filter_ledger", { signal: "nonsense" });
check("an invalid signal is refused", badSignal.isError === true);

const dropped = await call("filter_ledger", { party: "labour", droppedSentences: true, limit: 3 });
check(
  "the claim-diff axis can be asked for on its own",
  !dropped.isError &&
    dropped.value.rows.length > 0 &&
    dropped.value.rows.every((row) => row.sentencesMissing > 0) &&
    dropped.value.note.includes("homepage fetch"),
  dropped.value.rows.map((row) => `${row.name} ${row.sentencesMissing}`).join(", "),
);

const spoken = await call("explain_seat", { slug: "gravesham" });
check("explain_seat answers in one voice-shaped block", !spoken.isError && spoken.blocks[0].includes("Gravesham"));
check(
  "the speech cannot be returned without its limits",
  spoken.blocks[1]?.startsWith("Limits:") === true &&
    spoken.blocks[1].includes("do not establish that campaign content survived"),
);

const leaked = prose.filter(([, text]) => SLUGS.some((slug) => text.includes(slug)));
check(
  `no internal slug in ${prose.length} prose strings`,
  leaked.length === 0,
  leaked.slice(0, 3).map(([key, text]) => `${key}: ${text.slice(0, 90)}`).join(" | "),
);

await client.close();

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
