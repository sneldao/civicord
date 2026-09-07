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

const pagesByPerson = new Map();
for (const p of pages) {
  const list = pagesByPerson.get(p.person_id) ?? [];
  list.push({ key: p.page_key, chars: Number(p.char_count), snippet: (p.text || "").slice(0, 240) });
  pagesByPerson.set(p.person_id, list);
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
for (const person of persons.values()) {
  person.pages = pagesByPerson.get(person.id) ?? [];
}

const data = [...persons.values()].sort((a, b) => a.name.localeCompare(b.name));
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "candidates.json"), JSON.stringify(data));

const siteCount = data.reduce((n, p) => n + p.websites.length, 0);
console.log(`Wrote ${data.length} persons (${siteCount} websites, ${pages.length} scraped pages) -> src/data/candidates.json`);
