#!/usr/bin/env node
// Link-check the built site (frontend/dist):
//   1. every internal href/src in HTML resolves to a file in dist
//   2. /og/constituencies/{slug}.svg exists for every constituency
//   3. /api/*.json endpoints exist for every candidate + constituency
// Exits 1 on any broken link — CI gate alongside `astro check`.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "../dist");

if (!existsSync(distDir)) {
  console.error("check-links: dist/ missing — run `npm run build` first");
  process.exit(1);
}

// Walk dist once, recording files and collecting .html files to scan.
const files = new Set(); // relative paths, e.g. "/candidates/3454/index.html"
const htmlFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = "/" + path.relative(distDir, full).split(path.sep).join("/");
    if (entry.isDirectory()) walk(full);
    else {
      files.add(rel);
      if (rel.endsWith(".html")) htmlFiles.push(full);
    }
  }
})(distDir);

const attrRe = /(?:href|src)=["']([^"'#]+)["']/g;
let broken = 0;
let checked = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const pageDir = path.dirname(file);
  // Strip <script> blocks first — inline JS legitimately contains template
  // literals like `/candidates/${id}` that are not literal hrefs.
  const htmlNoScript = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  for (const m of htmlNoScript.matchAll(attrRe)) {
    const raw = m[1].trim();
    if (!raw) continue;
    // skip external, anchors, protocol links, data URIs, template artifacts
    if (/^(https?:)?\/\//.test(raw) || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("data:")) continue;
    if (raw.includes("${")) continue;
    checked++;
    // Query strings on static routes: /browse?status=gone resolves to /browse —
    // the query is runtime filter state, not a file. Same for ?format=svg etc.
    const pathname = raw.split("?")[0];
    if (!pathname || pathname === "") continue;
    let target;
    if (pathname.startsWith("/")) {
      target = path.join(distDir, pathname);
    } else {
      target = path.resolve(pageDir, pathname);
    }
    // candidate file or candidate directory-route (…/index.html)
    if (existsSync(target)) continue;
    const asDirIndex = target.endsWith("/") ? path.join(target, "index.html") : target + "/index.html";
    const asFileHtml = target.endsWith(".html") ? target : target + ".html";
    if (existsSync(asDirIndex) || existsSync(asFileHtml)) continue;
    broken++;
    if (broken <= 20) console.error(`BROKEN in ${path.relative(distDir, file)}: ${raw}`);
  }
}

// OG + API existence checks — driven by the same JSON the site is built from.
const dataDir = path.resolve(here, "../src/data");
const ogDir = path.join(distDir, "og/constituencies");
let ogMissing = 0;
let apiMissing = 0;
try {
  const raw = JSON.parse(readFileSync(path.join(dataDir, "constituencies.json"), "utf8"));
  const list = Array.isArray(raw) ? raw : raw.default ?? [];
  for (const c of list) {
    if (!existsSync(path.join(ogDir, `${c.slug}.svg`))) {
      ogMissing++;
      if (ogMissing <= 5) console.error(`OG MISSING: /og/constituencies/${c.slug}.svg`);
    }
    if (!files.has(`/api/constituencies/${c.slug}.json`) && !files.has(`/api/constituencies/${c.slug}/index.html`)) {
      apiMissing++;
      if (apiMissing <= 5) console.error(`API MISSING: /api/constituencies/${c.slug}.json`);
    }
  }
} catch {}
try {
  const raw = JSON.parse(readFileSync(path.join(dataDir, "candidates.json"), "utf8"));
  const list = Array.isArray(raw) ? raw : raw.default ?? [];
  for (const c of list) {
    if (!files.has(`/api/candidates/${c.id}.json`) && !files.has(`/api/candidates/${c.id}/index.html`)) {
      apiMissing++;
      if (apiMissing <= 5) console.error(`API MISSING: /api/candidates/${c.id}.json`);
    }
  }
} catch {}

console.log(`check-links: ${checked} internal links in ${htmlFiles.length} pages — ${broken} broken; OG missing ${ogMissing}/650; API missing ${apiMissing}`);
if (broken || ogMissing || apiMissing) process.exit(1);
