// Builds constituency hex + stats from AK v5 + pipeline CSVs.
// Run via `npm run prebuild` after build-data.mjs — requires data/out/*.csv and data/boundaries/ak-v5.geojson.
// Output: frontend/src/data/constituencies.json (650) + frontend/src/data/hexes.json (650 transformed) + frontend/src/data/constituency-index.json (slug -> name map)
// All fully static — no runtime DB, no tile server.
import { parse } from "csv-parse/sync";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const boundariesDir = path.resolve(here, "../../data/boundaries");
const dataDir = path.resolve(here, "../../data/out");
const outDir = path.resolve(here, "../src/data");

const akPath = path.join(boundariesDir, "ak-v5.geojson");

// --- helpers ---
function normalizeUrl(url) {
  url = (url || "").trim();
  if (!url || !(url.startsWith("http://") || url.startsWith("https://"))) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    let p = u.pathname.replace(/\/+$/, "");
    if (!p) p = "";
    // keep query? campaignlab strips query/fragment — we do same: no search/hash
    return `${u.protocol.toLowerCase()}//${host}${p}`;
  } catch {
    return null;
  }
}

function slugify(name) {
  // NFD to strip accents (Ynys Môn → ynys-mon), & → and, etc.
  let s = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/&/g, " and ");
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "").replace(/--+/g, "-");
  return s;
}

function readCsv(name, { required = true } = {}) {
  const file = path.join(dataDir, name);
  if (!existsSync(file)) {
    if (required) {
      console.error(`Missing ${file}`);
      process.exit(1);
    }
    return [];
  }
  return parse(readFileSync(file, "utf8"), { columns: true, skip_empty_lines: true });
}

function loadCommittedCandidates() {
  const candidatesPath = path.join(outDir, "candidates.json");
  if (!existsSync(candidatesPath)) return [];
  try {
    const raw = JSON.parse(readFileSync(candidatesPath, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// One page per post name on the committed candidate snapshot. Used when the
// Westminster hex file is absent, so seat timelines still render from
// candidates.json. Local and parliamentary posts are both included; GSS codes
// stay blank until the hex build can name the official 650 seats.
function seatsFromPosts(candidates) {
  const bySlug = new Map();
  for (const person of candidates) {
    for (const w of person.websites || []) {
      const seen = new Set();
      for (const post of w.posts || []) {
        if (!post || seen.has(post)) continue;
        seen.add(post);
        const slug = slugify(post);
        if (!slug) continue;
        if (!bySlug.has(slug)) {
          bySlug.set(slug, {
            slug,
            name: post,
            gssCode: "",
            region: "",
            country: "",
            type: "",
            electorate: null,
            altName: null,
            stats: {
              sites: 0,
              candidates: 0,
              live: 0,
              gone: 0,
              http_error: 0,
              timeout: 0,
              other: 0,
              redirected: 0,
              onchain: 0,
              liveShare: 0,
              livePct: 0,
              gonePct: 0,
            },
            candidates: [],
            href: `/constituencies/${slug}`,
            _ids: new Set(),
          });
        }
        const seat = bySlug.get(slug);
        const audit = w.audit || null;
        const status = audit?.statusClass || "not_audited";
        const redirected = Boolean(audit?.redirected);
        seat.stats.sites++;
        seat._ids.add(person.id);
        if (status === "live") seat.stats.live++;
        else if (status === "dns_error" || status === "connection_error") seat.stats.gone++;
        else if (status === "http_error") seat.stats.http_error++;
        else if (status === "timeout") seat.stats.timeout++;
        else if (status === "ssl_error" || status === "other_error") seat.stats.other++;
        if (redirected) seat.stats.redirected++;
        if (person.onchain) seat.stats.onchain++;
        seat.candidates.push({
          id: person.id,
          name: person.name,
          party: (w.parties && w.parties[0]) || "",
          url: w.url,
          statusClass: status,
          statusCode: audit?.statusCode || null,
          redirected,
          finalUrl: audit?.finalUrl || null,
          nameFound: audit?.nameFound === true ? true : audit?.nameFound === false ? false : null,
          onchain: person.onchain || null,
        });
      }
    }
  }
  const list = [...bySlug.values()];
  for (const c of list) {
    c.stats.candidates = c._ids.size;
    c.stats.liveShare = c.stats.sites ? c.stats.live / c.stats.sites : 0;
    c.stats.livePct = c.stats.sites ? Math.round((c.stats.live / c.stats.sites) * 100) : 0;
    c.stats.gonePct = c.stats.sites ? Math.round((c.stats.gone / c.stats.sites) * 100) : 0;
    c.candidates.sort((a, b) => a.name.localeCompare(b.name));
    delete c._ids;
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function writeDerivedMap(constituencies) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "constituencies.json"), JSON.stringify(constituencies));
  writeFileSync(
    path.join(outDir, "hexes.json"),
    JSON.stringify({ viewBox: "0 0 700 1000", width: 700, height: 1000, hexes: [] }),
  );
  writeFileSync(
    path.join(outDir, "constituency-index.json"),
    JSON.stringify(Object.fromEntries(constituencies.map((c) => [c.slug, c.name]))),
  );
}

// --- guard ---
const committedConstituencies = path.join(outDir, "constituencies.json");
const committedHexes = path.join(outDir, "hexes.json");
if (!existsSync(akPath)) {
  if (existsSync(committedConstituencies) && existsSync(committedHexes)) {
    console.log("No boundaries GeoJSON — keeping committed src/data map outputs");
    process.exit(0);
  }
  const candidates = loadCommittedCandidates();
  if (!candidates.length) {
    console.error(`Missing ${akPath} — run from repo root: mkdir -p data/boundaries && curl -L -o data/boundaries/ak-v5.geojson https://automaticknowledge.org/wpc-hex/uk-wpc-hex-constitcode-v5-june-2024.geojson`);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "constituencies.json"), JSON.stringify([], null, 2));
    writeFileSync(path.join(outDir, "hexes.json"), JSON.stringify({ viewBox: "0 0 700 1000", hexes: [] }, null, 2));
    process.exit(0);
  }
  const seats = seatsFromPosts(candidates);
  writeDerivedMap(seats);
  console.log(`build-map: no hex file — derived ${seats.length} seat pages from candidates.json posts`);  process.exit(0);
}

// --- load AK ---
const ak = JSON.parse(readFileSync(akPath, "utf8"));
const features = ak.features; // 650
// compute bounds in EPSG3857
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const f of features) {
  for (const poly of f.geometry.coordinates) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
}
const W = maxX - minX;
const H = maxY - minY;
// SVG transform: (x', y') = (x - minX, maxY - y)  → flips Y, origin top-left
function transformCoord([x, y]) {
  return [x - minX, maxY - y];
}

// --- guard: pipeline CSVs (fresh clones have none — data/ is gitignored) ---
// Same philosophy as build-data.mjs: prefer pipeline outputs, fall back to
// the committed src/data snapshots, and never fail the build for missing input.
if (!existsSync(path.join(dataDir, "candidacies.csv"))) {
  if (existsSync(committedConstituencies) && existsSync(committedHexes)) {
    console.log("No pipeline CSVs (data/out absent) — keeping committed src/data map outputs");
    process.exit(0);
  }
  console.log("No pipeline CSVs and no committed map outputs — writing empty map outputs");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "constituencies.json"), JSON.stringify([], null, 2));
  writeFileSync(path.join(outDir, "hexes.json"), JSON.stringify({ viewBox: "0 0 700 1000", hexes: [] }, null, 2));
  process.exit(0);
}

// --- load pipeline ---
const candidacies = readCsv("candidacies.csv");
const auditRows = readCsv("audit_liveness.csv", { required: false });
const onchainRows = readCsv("onchain_manifest.csv", { required: false });

const auditByUrl = new Map(auditRows.map((r) => [r.url, r]));
const onchainByPerson = new Map();
for (const r of onchainRows) {
  if (r.person_id && r.ens_name) {
    onchainByPerson.set(r.person_id, {
      ens: r.ens_name,
      status: r.status || null,
      node: r.node || null,
    });
  }
}

// Map (person_id, normalized_url) -> {postLabel, partyName, personName, url} for parl only
// Use candidacies where election_id == parl.2024-07-04
const parlMap = new Map();
for (const c of candidacies) {
  if (c.election_id !== "parl.2024-07-04") continue;
  const norm = normalizeUrl(c.homepage_url);
  if (!norm) continue;
  const key = `${c.person_id}\t${norm}`;
  // Should be unique per earlier check (0 dups)
  parlMap.set(key, {
    person_id: c.person_id,
    person_name: c.person_name,
    party_name: c.party_name,
    post_label: c.post_label,
    url: norm,
  });
}

// Distinct parl post_labels set (633)
const distinctParlPosts = new Set([...parlMap.values()].map((v) => v.post_label));

// Build lookup BCName -> feature
const bcToFeature = new Map();
const slugToName = new Map();
const gssToSlug = new Map();
const constituencies = [];

for (const f of features) {
  const p = f.properties;
  const name = p.BCName;
  const gss = p.GSScode;
  const slug = slugify(name);
  // ensure unique
  if (slugToName.has(slug)) {
    console.warn(`duplicate slug ${slug} for ${name} vs ${slugToName.get(slug)}`);
  }
  slugToName.set(slug, name);
  gssToSlug.set(gss, slug);
  bcToFeature.set(name, f);

  // transformed polygon
  const polys = f.geometry.coordinates; // MultiPolygon
  const tPolys = polys.map((poly) => poly.map((ring) => ring.map(transformCoord)));
  // center
  let cx = 0, cy = 0, n = 0;
  for (const ring of tPolys[0]) {
    for (const [x, y] of ring) { cx += x; cy += y; n++; }
  }
  cx /= n; cy /= n;

  constituencies.push({
    slug,
    name,
    gssCode: gss,
    region: p.CTR_REG || p.Country || "",
    country: p.Country || "",
    type: p.Type || "",
    electorate: Number(p.Electorate) || null,
    altName: p.AltName || null,
    // transformed geometry (for hexes.json)
    _tPolys: tPolys,
    _center: [cx, cy],
    // stats placeholder
    stats: { sites: 0, candidates: 0, live: 0, gone: 0, http_error: 0, timeout: 0, other: 0, redirected: 0, onchain: 0, liveShare: 0 },
    candidates: [],
    _candidateIds: new Set(),
  });
}

// helper to get constituency by BCName
const constByName = new Map(constituencies.map((c) => [c.name, c]));

// Aggregate per-constituency from parlMap + audit
for (const v of parlMap.values()) {
  const cons = constByName.get(v.post_label);
  if (!cons) {
    console.warn(`No hex for parl post_label ${v.post_label}`);
    continue;
  }
  const audit = auditByUrl.get(v.url);
  const status = audit?.status_class || "not_audited";
  const redirected = audit?.redirected === "True";
  const onchain = onchainByPerson.get(v.person_id) || null;

  cons.stats.sites++;
  cons._candidateIds.add(v.person_id);
  if (status === "live") cons.stats.live++;
  else if (status === "dns_error" || status === "connection_error") cons.stats.gone++;
  else if (status === "http_error") cons.stats.http_error++;
  else if (status === "timeout") cons.stats.timeout++;
  else if (status === "ssl_error" || status === "other_error") cons.stats.other++;

  if (redirected) cons.stats.redirected++;
  if (onchain) cons.stats.onchain++;

  cons.candidates.push({
    id: v.person_id,
    name: v.person_name,
    party: v.party_name,
    url: v.url,
    statusClass: status,
    statusCode: audit?.status_code || null,
    redirected,
    finalUrl: audit?.final_url || null,
    nameFound: audit?.name_found === "" ? null : audit?.name_found === "True" ? true : audit?.name_found === "False" ? false : null,
    onchain,
  });
}

// finalize stats: candidates count, liveShare, sort candidates
for (const c of constituencies) {
  c.stats.candidates = c._candidateIds.size;
  c.stats.liveShare = c.stats.sites ? c.stats.live / c.stats.sites : 0;
  // share as pct for UI
  c.stats.livePct = c.stats.sites ? Math.round((c.stats.live / c.stats.sites) * 100) : 0;
  c.stats.gonePct = c.stats.sites ? Math.round((c.stats.gone / c.stats.sites) * 100) : 0;
  c.candidates.sort((a, b) => a.name.localeCompare(b.name));
  // extra convenience: slug already, add url
  c.href = `/constituencies/${c.slug}`;
  delete c._candidateIds;
}

// hexes.json: transformed polygons + centers + stats (for client interactivity)
const hexes = constituencies.map((c) => ({
  slug: c.slug,
  name: c.name,
  gssCode: c.gssCode,
  region: c.region,
  country: c.country,
  points: c._tPolys[0][0], // outer ring only (hex is convex, no holes) — array of [x,y]
  center: c._center,
  stats: c.stats,
}));

// constituencies.json: full (without raw polys _tPolys duplicated for API)
const outConstituencies = constituencies.map((c) => {
  const { _tPolys, _center, ...rest } = c;
  return rest;
});

// write
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "constituencies.json"), JSON.stringify(outConstituencies, null, 2));
writeFileSync(path.join(outDir, "hexes.json"), JSON.stringify({ viewBox: `0 0 ${W} ${H}`, width: W, height: H, minX, maxX, minY, maxY, hexes }, null, 2));
writeFileSync(path.join(outDir, "constituency-index.json"), JSON.stringify(Object.fromEntries(slugToName), null, 2));

const withSites = outConstituencies.filter((c) => c.stats.sites > 0).length;
const withoutSites = 650 - withSites;
console.log(`build-map: wrote ${outConstituencies.length} constituencies (${withSites} with sites, ${withoutSites} empty), ${hexes.length} hexes — viewBox ${W.toFixed(0)}×${H.toFixed(0)} (${distinctParlPosts.size} distinct parl posts, 633 matched AK)`);
