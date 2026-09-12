// Per-candidate JSON — same data as /candidates/{id} on the site, served as
// static JSON so agents (WebMCP get_candidate, gateway) read deterministically
// instead of scraping the DOM. Democracy Club person ID is the stable key.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import constituenciesRaw from "../../../data/constituencies.json";

export const prerender = true;

// Same resolution logic the candidate page uses: seat display names are messy,
// so match against constituency names, then slugified names.
function slugifyConstituency(name: string): string {
  let s = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/&/g, " and ");
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "").replace(/--+/g, "-");
  return s;
}

function verdictOf(p: any): string {
  if (!p.websites || p.websites.length === 0) return "unknown";
  if (p.websites.every((w: any) => w.audit?.statusClass === "live")) return "live";
  if (p.websites.some((w: any) => w.audit?.statusClass === "live")) return "mixed";
  if (p.websites.every((w: any) => ["dns_error", "connection_error"].includes(w.audit?.statusClass ?? ""))) return "gone";
  return "unknown";
}

function verdictCopy(verdict: string, name: string): [string, string] {
  const n = name ?? "this candidate";
  const copies: Record<string, [string, string]> = {
    live: ["Still live \u2713", n + "'s campaign site responds and still mentions them \u2014 checked September 2026."],
    mixed: ["Partly live ~", "Some of " + n + "'s recorded sites are live, others are gone or broken \u2014 checked September 2026."],
    gone: ["Gone \u2715", n + "'s recorded campaign sites no longer resolve \u2014 checked September 2026."],
    unknown: ["Archived record", "Civicord holds what " + n + " published \u2014 scraped April 2025, permanence recorded on-chain."],
  };
  return copies[verdict] ?? ["Unknown", "Civicord holds what " + n + " published."];
}

function seatInfo(p: any): { name: string; constituency: { slug: string; name: string } | null; electorate?: number | null } | null {
  const raw: any = constituenciesRaw as any;
  const arr: any[] = Array.isArray(raw) ? raw : (raw?.default ?? []);
  const byName = new Map<string, any>(arr.map((c: any) => [c.name, c]));
  const bySlug = new Map<string, any>(arr.map((c: any) => [c.slug, c]));
  const names = new Set<string>(p.websites.flatMap((w: any) => (w.posts ?? []).filter(Boolean)));
  for (const name of names) {
    const c = byName.get(name) ?? bySlug.get(slugifyConstituency(name)) ?? null;
    if (c) return { name, constituency: { slug: c.slug, name: c.name }, electorate: c.electorate ?? null };
  }
  return null;
}

export async function getStaticPaths() {
  const all = await getCollection("candidates");
  return all.map((e) => ({ params: { id: e.data.id } }));
}

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";
  const all = await getCollection("candidates");
  const person = all.find((e) => e.data.id === id);
  if (!person) {
    return new Response(JSON.stringify({ error: "candidate not found", id }, null, 2), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60", "access-control-allow-origin": "*" },
    });
  }
  const p = person.data;
  const parties = [...new Set(p.websites.flatMap((w: any) => w.parties ?? []).filter(Boolean))];
  const elections = [...new Set(p.websites.flatMap((w: any) => w.elections ?? []).filter(Boolean))];
  const verdict = verdictOf(p);
  const ens = p.onchain?.ens ?? ("p" + p.id + ".civicord.eth");
  const body = {
    id: p.id,
    name: p.name,
    parties,
    elections,
    verdict,
    verdictCopy: verdictCopy(verdict, p.name),
    seat: seatInfo(p),
    ens,
    onchain: p.onchain
      ? { ens: p.onchain.ens, status: p.onchain.status ?? null, node: p.onchain.node ?? null }
      : { ens, status: null, node: null },
    verifyOnchain: "/api/ens?id=" + p.id,
    changeSignal: p.changeSignal ?? null,
    websites: p.websites.map((w: any) => ({
      url: w.url,
      status: w.audit?.statusClass ?? "unknown",
      statusCode: w.audit?.statusCode ?? null,
      nameFound: w.audit?.nameFound ?? null,
      redirected: w.audit?.redirected ?? false,
      finalUrl: w.audit?.finalUrl ?? w.url,
      changeSignal: w.changeSignal ?? null,
      elections: w.elections ?? [],
      parties: (w.parties ?? []).filter(Boolean),
      posts: (w.posts ?? []).filter(Boolean),
    })),
    pages: p.pages ?? [],
    recordUrl: "/candidates/" + p.id,
    ogImage: p.onchain ? ("https://civicord.pages.dev/og/candidates/" + p.id + ".svg") : null,
    source: "Campaign Lab April 2025 + Democracy Club IDs; audited September 2026",
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", "access-control-allow-origin": "*" },
  });
};
