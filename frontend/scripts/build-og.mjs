// Builds 650 stipple-deed OG images (1200×630 SVG) for /og/constituencies/[slug].svg
// One SVG template × 650 renders at build time — cheap virality, no runtime rendering.
// Each deed uses the same halftone language as the site: coloured hex thumb + paper dots.
// Static SVGs proxy to PNG via Cloudflare edge if needed; SVG alone is fine for og:image.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(here, "../src/data/constituencies.json");
const hexPath = path.resolve(here, "../src/data/hexes.json");
// Two outputs: committed build artifact (for Astro to copy) lives under public/og/;
// dist copy is created by Astro's static copy of public/. We write to public so
// `astro build` copies them automatically. No extra integration needed.
const outDir = path.resolve(here, "../public/og/constituencies");

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fillFor(livePct, sites) {
  if (!sites) return "#f2eddf";
  if (livePct >= 66) return "#227a4b";
  if (livePct >= 40) return "#a36a00";
  return "#b4361e";
}

function dotMeta(livePct, sites) {
  if (!sites) return { n: 0, r: 0, opacity: 0 };
  if (livePct < 40) return { n: 3, r: 6.5, opacity: 0.88 };
  if (livePct < 66) return { n: 2, r: 5, opacity: 0.52 };
  return { n: 1, r: 3.6, opacity: 0.45 };
}

if (!existsSync(dataPath)) {
  console.log(`build-og: no ${dataPath} — skipping OG cards (run after build-map.mjs)`);
  process.exit(0);
}

const constituencies = JSON.parse(readFileSync(dataPath, "utf8"));
const hexesRaw = existsSync(hexPath) ? JSON.parse(readFileSync(hexPath, "utf8")) : { hexes: [] };
const hexBySlug = new Map((hexesRaw.hexes ?? []).map((h) => [h.slug, h]));

mkdirSync(outDir, { recursive: true });

const W = 1200, H = 630;
let wrote = 0;

for (const c of constituencies) {
  const stats = c.stats ?? {};
  const sites = stats.sites ?? 0;
  const live = stats.live ?? 0;
  const gone = stats.gone ?? 0;
  const livePct = stats.livePct ?? 0;
  const redirected = stats.redirected ?? 0;
  const fill = fillFor(livePct, sites);
  const dots = dotMeta(livePct, sites);
  const name = c.name ?? c.slug;
  const gss = c.gssCode ?? "";
  const region = c.region ?? c.country ?? "";
  const electorate = c.electorate ? `${Number(c.electorate).toLocaleString("en-GB")} electorate` : "";
  const shareLine = sites ? `${live} of ${sites} responding (${livePct}%)` : "no scraped site";
  const detailLine = sites ? `${gone} unreachable · ${redirected} redirected` : "17 seats had no candidate site in the April 2025 scrape";
  const altLine = c.altName && c.altName !== name ? ` · ${escXml(c.altName)}` : "";

  const hex = hexBySlug.get(c.slug);
  // Normalize hex points to 120×120 viewBox for the deed thumb (top-right corner)
  let polyPoints = "";
  if (hex?.points?.length) {
    const pts = hex.points;
    const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX || 1, h = maxY - minY || 1;
    polyPoints = pts.map(([x, y]) => `${((x - minX) / w) * 110 + 5},${((y - minY) / h) * 110 + 5}`).join(" ");
  } else {
    // Fallback hexagon if hex data missing
    polyPoints = "60,8 104,34 104,86 60,112 16,86 16,34";
  }

  // Stipple dots inside the hex (paper-coloured, same language as site)
  const dotSvg = Array.from({ length: dots.n }).map((_, i) => {
    const offs = [[0, 0], [10, 14], [-10, -14]];
    const [ox, oy] = offs[i] ?? [0, 0];
    return `<circle cx="${60 + ox}" cy="${60 + oy}" r="${dots.r}" fill="#faf7f0" opacity="${dots.opacity}" />`;
  }).join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <title>${escXml(name)} — ${escXml(shareLine)} — Civicord</title>
  <defs>
    <clipPath id="paper-clip"><rect x="0" y="0" width="${W}" height="${H}" rx="0" /></clipPath>
  </defs>
  <!-- paper -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#faf7f0"/>
  <!-- hairline top rule — Civicord wordmark language -->
  <rect x="48" y="40" width="${W - 96}" height="3" fill="#1c2434"/>
  <text x="48" y="88" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#1c2434" letter-spacing="-0.02em">Civicord<tspan fill="#c73a1d">.</tspan></text>
  <text x="48" y="112" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#5b6472" letter-spacing="0.08em">POLITICAL WEBSITE AUDIT · SEPOLIA TESTNET PROTOTYPE  ·  civicord.pages.dev</text>

  <!-- left: constituency identity -->
  <text x="48" y="210" font-family="Georgia, serif" font-size="56" font-weight="700" fill="#1c2434" letter-spacing="-0.02em">${escXml(name)}</text>
  <text x="48" y="248" font-family="ui-monospace, SFMono-Regular, monospace" font-size="13" fill="#5b6472" letter-spacing="0.06em">${escXml(gss)}${region ? ` · ${escXml(region)}` : ""}${altLine} · ${escXml(electorate)}</text>

  <!-- verdict line — mirrors page verdict -->
  <g transform="translate(48, 285)">
    <rect x="0" y="0" width="4" height="56" rx="2" fill="${fill}"/>
    <text x="18" y="20" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#1c2434">${sites === 0 ? "No scraped site" : livePct >= 66 ? "Mostly responding" : livePct >= 40 ? "Mixed HTTP results" : "Low response rate"} — <tspan fill="#1c2434" font-weight="700">${escXml(shareLine)}</tspan></text>
    <text x="18" y="42" font-family="system-ui, sans-serif" font-size="13" fill="#5b6472">${escXml(detailLine)}</text>
  </g>

  <!-- context line -->
  <text x="48" y="395" font-family="system-ui, sans-serif" font-size="13" fill="#5b6472">Audit fields on ENS Sepolia: each candidate is <tspan font-family="ui-monospace, monospace" fill="#1c2434">p{id}.civicord.eth</tspan> — verify at app.ens.domains</text>

  <!-- CTA pills (purely decorative in image) -->
  <g transform="translate(48, 430)">
    <rect x="0" y="0" width="290" height="42" rx="21" fill="#1c2434"/>
    <text x="145" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#ffffff">View ${escXml(name)} →</text>
    <rect x="308" y="0" width="300" height="42" rx="21" fill="none" stroke="#e2dccd" stroke-width="1.5"/>
    <text x="458" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#1c2434">civicord.pages.dev/constituencies/${escXml(c.slug)}</text>
  </g>

  <!-- right: halftone hex deed — 220×220 card -->
  <g transform="translate(${W - 280}, 150)">
    <rect x="-18" y="-18" width="256" height="256" rx="12" fill="#ffffff" stroke="#e2dccd" stroke-width="1.2"/>
    <svg x="0" y="0" width="220" height="220" viewBox="0 0 120 120" role="img" aria-label="Halftone hex for ${escXml(name)}">
      <polygon points="${polyPoints}" fill="${fill}" fill-opacity="${sites === 0 ? "0.32" : "0.92"}" stroke="#1c2434" stroke-width="1.2" stroke-linejoin="round"/>
      ${sites === 0 ? `<circle cx="60" cy="60" r="8" fill="#1c2434" opacity="0.18"/>` : dotSvg}
    </svg>
    <text x="110" y="245" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#5b6472" letter-spacing="0.04em">${escXml(gss)} · halftone: more / larger dots = lower response rate</text>
  </g>

  <!-- bottom rule -->
  <rect x="48" y="${H - 52}" width="${W - 96}" height="1" fill="#e2dccd"/>
  <text x="48" y="${H - 24}" font-family="system-ui, sans-serif" font-size="11" fill="#5b6472">Data: Campaign Lab April 2025 · Democracy Club IDs · Audit 2026-09-07 · Map: AK v5 (OGL) + ONS BUC · AGPL-3.0</text>
  <text x="${W - 48}" y="${H - 24}" text-anchor="end" font-family="ui-monospace, monospace" font-size="11" fill="#5b6472">og/constituencies/${escXml(c.slug)}.svg</text>
</svg>
`;
  writeFileSync(path.join(outDir, `${c.slug}.svg`), svg);
  wrote++;
}

console.log(`build-og: wrote ${wrote} SVGs → public/og/constituencies/ (1200×630)`);
