#!/usr/bin/env node
// Playwright-free smoke test against the built site (no browser needed):
// hits the critical routes and asserts markers exist in the HTML.
// Usage: node scripts/smoke.mjs [baseURL]   (default http://localhost:4321)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] || "http://localhost:4321";
const here = path.dirname(fileURLToPath(import.meta.url));

// Pull one real candidate + constituency id from committed data so the smoke
// test exercises real routes, not hardcoded ones.
let sampleCandidate = "9";
let sampleSeat = "st-ives";
try {
  const dataDir = path.resolve(here, "../src/data");
  const cands = JSON.parse(readFileSync(path.join(dataDir, "candidates.json"), "utf8"));
  const cons = JSON.parse(readFileSync(path.join(dataDir, "constituencies.json"), "utf8"));
  const cl = Array.isArray(cands) ? cands : cands.default ?? [];
  const sl = Array.isArray(cons) ? cons : cons.default ?? [];
  if (cl.length) sampleCandidate = cl[0].id;
  if (sl.length) sampleSeat = sl.find((s) => s.stats?.sites > 0)?.slug ?? sampleSeat;
} catch {}

const checks = [
  ["/", 200, ["skip-link", "main", "start-title", "Civicord"]],
  ["/uk", 200, ["hexmap", "q-hero-top"]],
  ["/candidates/5693", 200, ["copy-citation", "evidence", "verification", "agent-view"]],
  ["/browse", 200, ["ledger-body", "pagination", "skip-link", "filterbar"]],
  ["/methodology", 200, ["Permanence", "main"]],
  ["/cohorts/gone", 200, ["masthead", "main"]],
  [`/candidates/${sampleCandidate}`, 200, ["verdict", "main"]],
  [`/constituencies/${sampleSeat}`, 200, ["verdict", "main"]],
  ["/api/summary.json", 200, null],
  [`/api/candidates/${sampleCandidate}.json`, 200, null],
  [`/api/constituencies/${sampleSeat}.json`, 200, null],
  [`/og/constituencies/${sampleSeat}.svg`, 200, null],
  ["/search-index.json", 200, null],
  ["/robots.txt", 200, ["Sitemap"]],
  ["/llms.txt", 200, null],
  ["/openapi.yaml", 200, null],
];

let failed = 0;
for (const [route, expectStatus, markers] of checks) {
  try {
    const res = await fetch(base + route, { redirect: "manual" });
    const okStatus = res.status === expectStatus;
    let okMarkers = true;
    if (markers) {
      const body = await res.text();
      for (const m of markers) {
        if (!body.includes(m)) {
          okMarkers = false;
          console.error(`MISSING marker "${m}" on ${route}`);
        }
      }
    }
    if (okStatus && okMarkers) {
      console.log(`ok   ${route} (${res.status})`);
    } else {
      failed++;
      if (!okStatus) console.error(`FAIL ${route} — status ${res.status}, expected ${expectStatus}`);
    }
  } catch (err) {
    failed++;
    console.error(`FAIL ${route} — ${err.message}`);
  }
}

console.log(`smoke: ${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
