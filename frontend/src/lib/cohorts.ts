// Shared cohort stats — one build-time computation used by both index.astro
// (party leaderboard, OG tags) and methodology.astro. Imported as a module
// so the numbers can't drift between pages.
import { getCollection } from "astro:content";

export interface PartyRow {
  party: string;
  sites: number;
  candidates: number;
  live: number;
  gone: number;
  redirected: number;
  onchain: number;
  livePct: number;
}

export interface CohortStats {
  persons: number;
  sites: number;
  live: number;
  gone: number;
  redirected: number;
  onchain: number;
  parties: PartyRow[];
  elections: Array<{ election: string; sites: number; live: number; livePct: number }>;
  // Overall live-share, for "candidate vs average" compare lines.
  liveShare: number;
}

export interface StatusCohort {
  slug: "live" | "gone" | "redirected";
  title: string;
  lede: string;
  sites: number;
  share: number; // of all audited sites
  // Top redirect destinations (redirected cohort only).
  destinations: Array<{ url: string; count: number }>;
}

const GONE = new Set(["dns_error", "connection_error"]);

export async function cohortStats(): Promise<CohortStats> {
  const entries = await getCollection("candidates");
  const candidates = entries.map((e) => e.data);
  const websites = candidates.flatMap((c) =>
    c.websites.map((w) => ({ ...w, candidateId: c.id, onchain: !!c.onchain }))
  );
  const live = websites.filter((w) => w.audit?.statusClass === "live").length;
  const gone = websites.filter((w) => GONE.has(w.audit?.statusClass ?? "")).length;
  const redirected = websites.filter((w) => w.audit?.redirected).length;
  const onchain = candidates.filter((c) => c.onchain).length;

  const byParty = new Map<string, PartyRow & { _c: Set<string> }>();
  for (const w of websites) {
    for (const p of w.parties) {
      const row = byParty.get(p) ?? {
        party: p, sites: 0, candidates: 0, live: 0, gone: 0,
        redirected: 0, onchain: 0, livePct: 0, _c: new Set<string>(),
      };
      row.sites++;
      row._c.add(w.candidateId);
      if (w.audit?.statusClass === "live") row.live++;
      if (GONE.has(w.audit?.statusClass ?? "")) row.gone++;
      if (w.audit?.redirected) row.redirected++;
      if (w.onchain) row.onchain++;
      byParty.set(p, row);
    }
  }
  const parties: PartyRow[] = [...byParty.values()]
    .map((r) => ({
      party: r.party, sites: r.sites, candidates: r._c.size, live: r.live,
      gone: r.gone, redirected: r.redirected, onchain: r.onchain,
      livePct: r.sites ? Math.round((r.live / r.sites) * 100) : 0,
    }))
    .filter((r) => r.sites >= 5)
    .sort((a, b) => b.sites - a.sites);

  const byElection = new Map<string, { sites: number; live: number }>();
  for (const w of websites) {
    for (const e of w.elections) {
      const row = byElection.get(e) ?? { sites: 0, live: 0 };
      row.sites++;
      if (w.audit?.statusClass === "live") row.live++;
      byElection.set(e, row);
    }
  }
  const elections = [...byElection.entries()]
    .map(([election, r]) => ({
      election, sites: r.sites, live: r.live,
      livePct: r.sites ? Math.round((r.live / r.sites) * 100) : 0,
    }))
    .sort((a, b) => b.sites - a.sites);

  return {
    persons: candidates.length, sites: websites.length,
    live, gone, redirected, onchain, parties, elections,
    liveShare: websites.length ? live / websites.length : 0,
  };
}

const REDIRECT_HOST = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/** Status cohort pages: the graveyard, the redirects, the survivors. */
export async function statusCohorts(): Promise<StatusCohort[]> {
  const entries = await getCollection("candidates");
  const websites = entries.flatMap((e) => e.data.websites);
  const audited = websites.filter((w) => w.audit);
  const share = (n: number) => (audited.length ? Math.round((n / audited.length) * 100) : 0);

  const liveRows = audited.filter((w) => w.audit?.statusClass === "live");
  const goneRows = audited.filter((w) => GONE.has(w.audit?.statusClass ?? ""));
  const redirRows = audited.filter((w) => w.audit?.redirected && w.audit?.finalUrl);

  const destCount = new Map<string, number>();
  for (const w of redirRows) {
    const host = REDIRECT_HOST(w.audit!.finalUrl!);
    destCount.set(host, (destCount.get(host) ?? 0) + 1);
  }
  const destinations = [...destCount.entries()]
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return [
    {
      slug: "gone",
      title: "Unreachable URLs",
      lede: "URLs with DNS or connection failures at the audit. Temporary failures do not prove permanent removal.",
      sites: goneRows.length,
      share: share(goneRows.length),
      destinations: [],
    },
    {
      slug: "redirected",
      title: "Redirected URLs",
      lede: "URLs whose destinations differed at the audit. A redirect may be a legitimate move or a change of use.",
      sites: redirRows.length,
      share: share(redirRows.length),
      destinations,
    },
    {
      slug: "live",
      title: "Responding URLs",
      lede: "URLs returning successful HTTP responses at the audit. Response success does not establish that campaign content survived.",
      sites: liveRows.length,
      share: share(liveRows.length),
      destinations: [],
    },
  ];
}

/** Per-party live-share lookup for "candidate vs average" compare lines. */
export async function partyLiveShare(): Promise<Map<string, number>> {
  const stats = await cohortStats();
  return new Map(stats.parties.map((p) => [p.party, p.sites ? p.live / p.sites : 0]));
}
