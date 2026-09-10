import type { APIRoute } from "astro";
import constituenciesRaw from "../../data/constituencies.json";
import candidatesRaw from "../../data/candidates.json";

export const prerender = true;

export const GET: APIRoute = async () => {
  const raw: any = (constituenciesRaw as any);
  const list: any[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.default) ? (raw as any).default : [];
  const withSites = list.filter((c) => c.stats?.sites > 0).length;
  const emptySeats = list.length - withSites;

  const candRaw: any = (candidatesRaw as any);
  const candidates: any[] = Array.isArray(candRaw) ? candRaw : Array.isArray(candRaw?.default) ? candRaw.default : [];
  const websites = candidates.flatMap((c: any) => c.websites ?? []);
  const audited = websites.filter((w: any) => w.audit);
  const live = audited.filter((w: any) => w.audit?.statusClass === "live");
  const gone = audited.filter((w: any) => ["dns_error","connection_error"].includes(w.audit?.statusClass ?? ""));
  const redirected = audited.filter((w: any) => w.audit?.redirected);
  const onchain = candidates.filter((c: any) => c.onchain);

  const body = {
    candidates: candidates.length,
    websites: websites.length,
    audited: audited.length,
    live: live.length,
    gone: gone.length,
    redirected: redirected.length,
    constituencies: list.length,
    withSites,
    emptySeats,
    onchain: onchain.length,
    auditedAt: "2026-09-07",
    source: "Campaign Lab April 2025 + Democracy Club IDs",
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
};
