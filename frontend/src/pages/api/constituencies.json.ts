import type { APIRoute } from "astro";
import constituenciesRaw from "../../data/constituencies.json";

export const prerender = true;

// One file at /api/constituencies.json — the Recipe's listConstituencies op.
// Bazantic gateways this as $0.001/call. Humans still fetch it free from Pages.
// Agent filter: /api/constituencies?region=South%20West&country=England etc. is
// better done client-side (650 rows, ~90KB); we return the full list and let
// the CDN cache it. No backend needed.

export const GET: APIRoute = async ({ url }) => {
  const raw: any = (constituenciesRaw as any);
  const list: any[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.default) ? (raw as any).default : [];

  const summaries = list.map((c) => ({
    slug: c.slug,
    name: c.name,
    gssCode: c.gssCode,
    region: c.region ?? null,
    country: c.country ?? null,
    type: c.type ?? null,
    electorate: c.electorate ?? null,
    altName: c.altName ?? null,
    stats: c.stats,
    href: c.href ?? `/constituencies/${c.slug}`,
    ogImage: `/og/constituencies/${c.slug}.svg`,
  }));

  // Optional server-side trimming (not required — agents should filter cached list).
  let out: typeof summaries = summaries;
  const country = url.searchParams.get("country");
  const region = url.searchParams.get("region");
  const limitRaw = url.searchParams.get("limit");
  if (country) out = out.filter((c) => (c.country ?? "").toLowerCase() === country.toLowerCase());
  if (region) out = out.filter((c) => (c.region ?? "").toLowerCase() === region.toLowerCase());
  const limit = limitRaw ? Math.min(650, Math.max(1, Number(limitRaw) || 650)) : 650;
  if (out.length > limit) out = out.slice(0, limit);

  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
};
