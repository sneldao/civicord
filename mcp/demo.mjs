#!/usr/bin/env node
// A scripted voice session against the running MCP server.
//
// This is the client half of the demo: it discovers the tools over tools/list,
// chooses one per question, and prints what the server said — speech and limits
// together, unedited. Any MCP-capable assistant can replace the router below;
// nothing in here knows the ledger's contents, only its tool names.
//
//   node server.mjs &  node demo.mjs

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ENDPOINT = process.env.MCP_URL ?? "http://127.0.0.1:8787/mcp";

const client = new Client({ name: "civicord-voice-demo", version: "0.1.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(ENDPOINT)));

const { tools } = await client.listTools();
console.log(`connected to ${ENDPOINT}`);
console.log(`server offers ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}\n`);

async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  const blocks = (result.content ?? []).map((c) => c.text ?? "");
  return { blocks, value: JSON.parse(blocks.find((t) => t.trimStart().startsWith("{")) ?? "{}") };
}

const GAP = "   ";
function asked(question) {
  console.log(`you   ▸ ${question}`);
}
function said(lines, tool, args) {
  console.log(`      ▸ ${tool}(${JSON.stringify(args)})`);
  for (const line of lines) console.log(`${GAP}  ${line}`);
  console.log();
}

/** Resolve a seat or person named in a question through the server's own search. */
async function resolve(fragment) {
  const { value } = await call("search_civicord", { query: fragment, limit: 1 });
  return { seat: value.constituencies?.[0], person: value.candidates?.[0] };
}

const QUESTIONS = [
  {
    q: "How many candidate websites are still responding?",
    async run() {
      const { value } = await call("get_summary", {});
      return {
        tool: "get_summary",
        args: {},
        lines: [
          `${value.candidates} candidate records, ${value.constituencies} seats, audited ${value.auditedAt}.`,
          `${value.live} responding · ${value.gone} unreachable · ${value.redirected} redirected.`,
          ...value.limits.map((limit) => `· ${limit}`),
        ],
      };
    },
  },
  {
    q: "What happened to the candidate websites in Gravesham?",
    async run() {
      const { seat } = await resolve("gravesham");
      const { blocks } = await call("explain_seat", { slug: seat.slug });
      return { tool: "explain_seat", args: { slug: seat.slug }, lines: wrap(`${blocks[0]}\n${blocks[1]}`) };
    },
  },
  {
    q: "Is Adam Holloway's page gone, or just down?",
    async run() {
      const { person } = await resolve("holloway");
      const { value } = await call("get_candidate", { id: person.id });
      return {
        tool: "get_candidate",
        args: { id: person.id },
        lines: [...value.websites.map((w) => `· ${w.story}`), `· ${value.verdictCopy[1]}`, `· ${value.record}`],
      };
    },
  },
  {
    q: "Did any Labour candidate drop a written promise?",
    async run() {
      const args = { party: "labour", droppedSentences: true, limit: 4 };
      const { value } = await call("filter_ledger", args);
      return {
        tool: "filter_ledger",
        args,
        lines: [...describe(value, { view: false }), `· ${value.note}`],
      };
    },
  },
];

function describe(value, { view = true } = {}) {
  return [
    `${value.matched} match${value.matched === 1 ? "" : "es"}${value.truncated ? ` (showing ${value.returned})` : ""}:`,
    ...value.rows.map(
      (row) => `· ${row.name}, ${row.party} — ${row.sentencesMissing} missing — "${row.summary}" — ${row.record}`,
    ),
    ...(view ? [`· same view: ${value.shareableUrl}`] : []),
  ];
}

function wrap(text, width = 96) {
  const out = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if ((line + " " + word).length > width) {
        out.push(line.trim());
        line = word;
      } else line += ` ${word}`;
    }
    out.push(line.trim());
  }
  return out.filter(Boolean);
}

for (const { q, run } of QUESTIONS) {
  asked(q);
  const { tool, args, lines } = await run();
  said(lines, tool, args);
}

await client.close();
