#!/usr/bin/env node
// Civicord ledger as a self-hosted MCP server.
//
// Transport: Streamable HTTP, MCP 2025-11-25. Served from our own origin — no
// third-party gateway in front of a read-only public record.
//
// Every answer comes from ./ledger.mjs, which is the site's own copy modules
// over the site's own committed snapshots. There is deliberately no second
// implementation of the wording here.

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as ledger from "./ledger.mjs";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 8787);

// A browser tab must not be able to drive a ledger server sitting on someone's
// localhost. CLI and assistant clients send no Origin, so only Origin-bearing
// requests are checked — against an allowlist that is empty by default, plus
// this server's own origin so web/index.html can call /mcp.
const SELF_ORIGINS = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const originAllowed = (req) => {
  const origin = req.headers.origin;
  return !origin || ALLOWED_ORIGINS.has(origin) || SELF_ORIGINS.has(origin);
};

const INSTRUCTIONS = [
  "Civicord is a public ledger of what happened to UK election campaign websites.",
  "Answers come from one HTTP audit day (7 September 2026) compared with an April 2025 scrape.",
  "Use explain_seat for anything a person will read out: it returns speech and its limits together.",
  "Never present a change signal as proof of removal or of intent — the tools attach the qualifying sentence, keep it.",
].join(" ");

const SIGNALS = ledger.SIGNALS;

function text(result) {
  if (result && typeof result === "object" && result.error) {
    return { isError: true, content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

export function createLedgerServer() {
  const server = new McpServer(
    { name: "civicord-ledger", version: "0.1.0" },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "get_summary",
    {
      title: "Ledger totals",
      description:
        "Dataset totals on both axes we keep separate: HTTP result (live / gone / redirected) and change signal. Includes the audit date and the standing limits. Start here.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => text(ledger.totals()),
  );

  server.registerTool(
    "search_civicord",
    {
      title: "Search the record",
      description:
        "Find candidates, constituencies and parties by fragment of name — 'holloway', 'ynys mon', 'green party'. Returns canonical record URLs, not paths.",
      inputSchema: {
        query: z.string().describe("Fragment of a person, seat or party name."),
        limit: z.number().int().min(1).max(20).optional().describe("Max hits per kind (default 5)."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, limit }) => text(ledger.search(query, limit)),
  );

  server.registerTool(
    "get_candidate",
    {
      title: "Candidate record",
      description:
        "Full ledger record for one Democracy Club person ID: per-site audit outcome in plain words, change signal with its label, seat, ENS name, sentence comparison, citation.",
      inputSchema: {
        id: z.string().describe("Democracy Club person ID, e.g. '1688'."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => text(ledger.personRecord(id)),
  );

  server.registerTool(
    "get_constituency",
    {
      title: "Constituency record",
      description:
        "Seat record plus the same timeline the seat page renders: what was recorded in April 2025, what the audit found, what happened to the words.",
      inputSchema: {
        slug: z.string().describe("Constituency slug ('st-ives') or exact name ('St Ives')."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ slug }) => text(ledger.seatRecord(slug)),
  );

  server.registerTool(
    "explain_seat",
    {
      title: "Read-out answer for a seat",
      description:
        "The answer a voice assistant can read out for one constituency: a short speech block, and the limits that must be spoken with it. Use this whenever a person asked a question rather than asked for data.",
      inputSchema: {
        slug: z.string().describe("Constituency slug or exact name."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ slug }) => {
      const answer = ledger.seatAnswer(slug);
      if (answer.error) return text(answer);
      return {
        content: [
          { type: "text", text: answer.speech },
          { type: "text", text: `Limits: ${answer.limits.join(" ")}` },
          {
            type: "text",
            text: JSON.stringify(
              { seat: answer.seat, perCandidate: answer.perCandidate, record: answer.record, source: answer.source },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "filter_ledger",
    {
      title: "Filter the ledger",
      description:
        `Rows for one change signal — ${SIGNALS.join(", ")} — optionally narrowed by party, HTTP status or name. Set droppedSentences to use the other axis: records whose April sentences were not found in September, whatever the site signal says. Returns a shareable URL on the public site for the same view.`,
      inputSchema: {
        signal: z.enum(SIGNALS).optional().describe("Change signal slug."),
        party: z.string().optional().describe("Substring of the party name."),
        status: z.enum(["live", "dns_error", "connection_error", "http_error", "timeout", "ssl_error", "other_error"]).optional(),
        query: z.string().optional().describe("Substring of the candidate name."),
        droppedSentences: z.boolean().optional().describe("Only records with at least one April sentence missing from the homepage fetch."),
        limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 10)."),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => text(ledger.ledgerFilter(args)),
  );

  server.registerTool(
    "get_claim_diff",
    {
      title: "Sentence comparison for a candidate",
      description:
        "April 2025 sentences not found on the later homepage fetch, and new homepage sentences listed apart. Never pairs a deletion to a replacement — the pairing gap is in the result.",
      inputSchema: {
        id: z.string().describe("Democracy Club person ID."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => text(ledger.personClaims(id)),
  );

  return server;
}

const sessions = new Map();

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 4 * 1024 * 1024) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve(undefined);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const LANDING = [
  "Civicord ledger — MCP server.",
  "",
  "Endpoint: POST /mcp (Streamable HTTP, JSON-RPC 2.0).",
  "Protocol: MCP 2025-11-25, negotiated at initialize.",
  "Browser client: GET / — a page that is an actual MCP client.",
  "",
  "Tools: get_summary, search_civicord, get_candidate, get_constituency,",
  "        explain_seat, filter_ledger, get_claim_diff.",
  "",
  "Read-only. The record it serves is the record at https://civicord.pages.dev,",
  "and the caveats attached to each answer are the ones printed on that site.",
  "",
  "Methodology: https://civicord.pages.dev/methodology",
  "Audit date: 2026-09-07.",
  "",
].join("\n");

const HERE = fileURLToPath(new URL("./web/index.html", import.meta.url));
let clientHtml = "";
try {
  clientHtml = readFileSync(HERE, "utf8");
} catch {
  clientHtml = "";
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.has(origin) || SELF_ORIGINS.has(origin))) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
  }
  res.setHeader("access-control-allow-headers", "content-type, mcp-session-id, mcp-protocol-version, accept");
  res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("access-control-expose-headers", "mcp-session-id, mcp-protocol-version");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  if (url.pathname === "/mcp" && !originAllowed(req)) {
    res.writeHead(403, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "origin not allowed", allowed: [...ALLOWED_ORIGINS, ...SELF_ORIGINS] }));
    return;
  }

  if (url.pathname !== "/mcp") {
    if (req.method === "GET" && url.pathname === "/" && clientHtml) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(clientHtml);
      return;
    }
    if (req.method === "GET" && (url.pathname === "/about" || url.pathname === "/health")) {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end(LANDING);
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found", endpoint: "/mcp", client: "/" }));
    return;
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }));
      return;
    }
    const sessionId = req.headers["mcp-session-id"];
    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId).handleRequest(req, res, body);
      return;
    }
    if (!sessionId && isInitializeRequest(body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, transport);
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      req.on("close", () => {
        if (!transport.closed) transport.close().catch(() => {});
      });
      const server = createLedgerServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
      return;
    }
    res.writeHead(400, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: no valid session id, and this is not an initialize request." },
        id: null,
      }),
    );
    return;
  }

  // GET opens the server-to-client stream; DELETE ends the session.
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !sessions.has(sessionId)) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Missing or unknown mcp-session-id" }));
    return;
  }
  await sessions.get(sessionId).handleRequest(req, res);
}

const http = createServer((req, res) => {
  handle(req, res).catch((err) => {
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal", message: String(err?.message ?? err) }));
    console.error("[civicord-mcp]", err);
  });
});

http.listen(PORT, HOST, () => {
  const t = ledger.totals();
  console.log(
    `[civicord-mcp] http://${HOST}:${PORT}/mcp · ${t.candidates} candidates · ${t.live} responding · ${t.gone} unreachable · audit ${t.auditedAt}`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    for (const transport of sessions.values()) transport.close().catch(() => {});
    http.close(() => process.exit(0));
  });
}
