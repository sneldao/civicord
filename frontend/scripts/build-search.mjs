#!/usr/bin/env node
// Build a slim search index for the command palette (⌘K).
//
// 2,375 candidates + 650 jurisdictions, encoded as positional arrays with a
// shared party lookup table so the payload stays small enough to lazy-load on
// the first keypress. Visitors who never open the palette never download it.
//
// Output: frontend/public/search-index.json  (gitignored — regenerated on build)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(__dirname, "..");
const dataDir = path.join(frontendDir, "src", "data");
const publicDir = path.join(frontendDir, "public");
const outFile = path.join(publicDir, "search-index.json");

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.default)) return raw.default;
    return fallback;
  } catch {
    return fallback;
  }
}

// Must stay identical to build-map.mjs / browse.astro so seat slugs line up.
function slugify(name) {
  let s = String(name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/&/g, " and ");
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "").replace(/--+/g, "-");
  return s;
}

const people = readJson(path.join(dataDir, "candidates.json"), []);
const seats = readJson(path.join(dataDir, "constituencies.json"), []);

if (!seats.length) {
  console.warn("[build-search] no constituencies.json — writing empty index");
}

const seatByName = new Map(seats.map((s) => [s.name, s]));
const seatBySlug = new Map(seats.map((s) => [s.slug, s]));

// Deduplicate party strings — "Conservative and Unionist Party" appears
// thousands of times and is the single biggest size saving here.
const parties = [];
const partyIds = new Map();
function partyId(name) {
  const key = name || "";
  if (partyIds.has(key)) return partyIds.get(key);
  const id = parties.length;
  parties.push(key);
  partyIds.set(key, id);
  return id;
}

const seatRows = seats.map((s) => [
  s.slug,
  s.name,
  s.region || s.country || "",
  s.stats?.livePct ?? 0,
  s.stats?.sites ?? 0,
  s.stats?.live ?? 0,
]);

const peopleRows = people.map((p) => {
  const w = (p.websites || [])[0] || {};
  const party = (w.parties || [])[0] || "";
  let seatSlug = null;
  for (const name of w.posts || []) {
    const hit = seatByName.get(name) || seatBySlug.get(slugify(name));
    if (hit) {
      seatSlug = hit.slug;
      break;
    }
  }
  return [String(p.id), p.name, partyId(party), seatSlug];
});

mkdirSync(publicDir, { recursive: true });
const payload = JSON.stringify({ parties, seats: seatRows, people: peopleRows });
writeFileSync(outFile, payload);

const kb = (payload.length / 1024).toFixed(0);
console.log(
  `[build-search] wrote ${path.relative(process.cwd(), outFile)} — ` +
    `${peopleRows.length} people, ${seatRows.length} jurisdictions, ` +
    `${parties.length} parties, ${kb} KB`
);
