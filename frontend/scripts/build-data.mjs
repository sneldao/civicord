// Builds src/data/candidates.json from the civicord pipeline outputs.
// Run via `npm run prebuild` / `predev` (automatic) — requires ../data/out/*.csv,
// i.e. `.venv/bin/civicord ingest` (and optionally `audit`) from the repo root.
import { parse } from "csv-parse/sync";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../../data/out");
const outDir = path.resolve(here, "../src/data");

// Deploy environments (e.g. Vercel) have no pipeline outputs — the pipeline is
// Python-only and `data/` is gitignored. If a committed candidates.json exists,
// deploy with that instead of failing.
if (!existsSync(dataDir)) {
  const committed = path.join(outDir, "candidates.json");
  if (existsSync(committed)) {
    console.log("No data/out CSVs — deploying with the committed src/data/candidates.json");
    process.exit(0);
  }
  console.error(`Missing ${dataDir}. From the repo root run: .venv/bin/civicord ingest`);
  process.exit(1);
}

function readCsv(name, { required = true } = {}) {
  const file = path.join(dataDir, name);
  if (!existsSync(file)) {
    if (required) {
      console.error(`Missing ${file}. From the repo root run: .venv/bin/civicord ingest`);
      process.exit(1);
    }
    return [];
  }
  return parse(readFileSync(file, "utf8"), { columns: true, skip_empty_lines: true });
}

const websites = readCsv("websites.csv");
const auditRows = readCsv("audit_liveness.csv", { required: false });
const pages = readCsv("pages.csv", { required: false });

const auditByUrl = new Map(auditRows.map((r) => [r.url, r]));

// Keep the "Archived scrape" evidence table sane: the raw scrape has ~72k
// pages (154M chars). Committing/rendering all of them would bloat the repo
// (~29MB JSON) and the built HTML (~40MB dist). Cap at the 8 most substantial
// pages per candidate, 120-char snippets — enough to evidence the capture.
const MAX_PAGES_PER_PERSON = 8;
const SNIPPET_CHARS = 120;

// Slice without splitting UTF-16 surrogate pairs (emoji) — a lone surrogate
// would be escaped into the JSON and break Vite's JSON parse at build time.
const clip = (s, n) =>
  s
    .slice(0, n)
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");

const pagesByPerson = new Map();
for (const p of pages) {
  const list = pagesByPerson.get(p.person_id) ?? [];
  list.push({ key: p.page_key, chars: Number(p.char_count), snippet: clip(p.text || "", SNIPPET_CHARS) });
  pagesByPerson.set(p.person_id, list);
}
for (const [pid, list] of pagesByPerson) {
  list.sort((a, b) => b.chars - a.chars);
  pagesByPerson.set(pid, list.slice(0, MAX_PAGES_PER_PERSON));
}

const persons = new Map();
for (const w of websites) {
  if (!persons.has(w.person_id)) {
    persons.set(w.person_id, { id: w.person_id, name: w.person_name, websites: [] });
  }
  const person = persons.get(w.person_id);
  const a = auditByUrl.get(w.url);
  person.websites.push({
    url: w.url,
    elections: w.elections ? w.elections.split(";") : [],
    parties: w.parties ? w.parties.split(";") : [],
    posts: w.posts ? w.posts.split(";") : [],
    audit: a
      ? {
          statusClass: a.status_class,
          statusCode: a.status_code || null,
          redirected: a.redirected === "True",
          finalUrl: a.final_url || null,
          nameFound: a.name_found === "" ? null : a.name_found === "True",
        }
      : null,
  });
}
// On-chain ENS records (optional — written at the end of a publish run)
const manifestRows = readCsv("onchain_manifest.csv", { required: false });
const onchainByPerson = new Map();
for (const r of manifestRows) {
  if (r.person_id && r.ens_name) {
    onchainByPerson.set(r.person_id, { ens: r.ens_name, status: r.status || null });
  }
}
for (const person of persons.values()) {
  person.pages = pagesByPerson.get(person.id) ?? [];
  person.onchain = onchainByPerson.get(person.id) ?? null;
}

const data = [...persons.values()].sort((a, b) => a.name.localeCompare(b.name));
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "candidates.json"), JSON.stringify(data));

const siteCount = data.reduce((n, p) => n + p.websites.length, 0);
console.log(`Wrote ${data.length} persons (${siteCount} websites, ${pages.length} scraped pages) -> src/data/candidates.json`);
