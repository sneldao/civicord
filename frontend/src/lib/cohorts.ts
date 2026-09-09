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
  };
}
