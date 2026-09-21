// Roster-steward digest derivations — build-time, single source of truth for
// /steward. Uses the exclusive change taxonomy from src/civicord/change_signal.py
// (mirrored per-website in candidates.json and browse's ?change filter), so
// group counts on /steward always agree with the filtered ledger.
import { getCollection } from "astro:content";
import contentDiffsRaw from "../data/content_diffs.json";

export const CHECKED_AT = "2026-09-07";

// DNS/connection failure only — never claim a site was "deleted".
export const GONE = new Set(["dns_error", "connection_error"]);

// Domain-marketplace / parking destinations we can identify from the redirect
// host alone. Detected by the destination's domain, not by reading the page.
export const PARKING_HOSTS = new Set([
  "expireddomains.com",
  "expireddomains.co.uk",
  "domainnamemarketplace.com",
  "dan.com",
  "sedo.com",
  "sedoparking.com",
  "aftermarket.com",
  "afternic.com",
  "parkingcrew.net",
  "teaminternet.com",
  "parklogic.com",
  "domainnamesales.com",
  "4.cn",
  "afterdays.com",
  "pendingcloudflare.com", // registrar-pending, not a campaign page
]);

export const REDIRECT_HOST = (u: string): string => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

// Verbatim from browse.astro's statusLabels so taxonomy language never diverges.
export const STATUS_LABELS: Record<string, string> = {
  live: "Responding",
  gone: "Unreachable",
  redirected: "Redirected ↳",
  http_error: "HTTP error",
  dns_error: "DNS failure",
  connection_error: "Conn. failed",
  timeout: "Timed out",
  ssl_error: "SSL error",
  other_error: "Error",
  not_audited: "Not audited",
};

export interface StewardRow {
  candidateId: string;
  candidateName: string;
  party: string;
  seat: string;
  url: string;
  statusClass: string;
  finalUrl: string;
  changeSignal: string;
  significance?: string;
}

export interface StewardGroup {
  key: string;
  title: string;
  action: string;
  caveat?: string;
  open: boolean;
  rows: StewardRow[];
  candidates: number;
  parties: Array<{ party: string; count: number }>;
  seats: Array<{ seat: string; count: number }>;
  // Value for /browse's ?change= filter this group maps to ("" = no single filter).
  changeParam: string;
  browseHref?: string;
  browseLabel?: string;
}

// Rolls a group's rows up by any value a row carries (a site can list several
// parties — browse's ?party= also matches any, so counts must agree).
function rollup(
  rows: StewardRow[],
  pick: (r: StewardRow) => string[],
  limit: number,
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    for (const k of pick(r)) {
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

const siteSignal = (w: { changeSignal?: string; audit?: { statusClass: string } | null }) =>
  w.changeSignal ?? (GONE.has(w.audit?.statusClass ?? "") ? "gone" : "");

export async function stewardGroups(): Promise<{
  groups: StewardGroup[];
  sampleN: number;
  totalSites: number;
}> {
  const entries = await getCollection("candidates");
  const candidates = entries.map((e) => e.data).sort((a, b) => a.name.localeCompare(b.name));

  const diffsRoot: any = contentDiffsRaw as any;
  const significanceByPerson: Record<string, string> = {};
  for (const [pid, row] of Object.entries(diffsRoot?.byPerson ?? {})) {
    const sig = (row as any)?.significance;
    if (sig) significanceByPerson[pid] = String(sig);
  }

  const rowsFor = (c: (typeof candidates)[number], w: (typeof candidates)[number]["websites"][number]): StewardRow => ({
    candidateId: c.id,
    candidateName: c.name,
    party: w.parties.join(", "),
    seat: w.posts[0] ?? "",
    url: w.url,
    statusClass: w.audit?.statusClass ?? "not_audited",
    finalUrl: w.audit?.finalUrl ?? "",
    changeSignal: siteSignal(w),
  });

  const died: StewardRow[] = [];
  const parked: StewardRow[] = [];
  const repurposed: StewardRow[] = [];
  const redirectedElsewhere: StewardRow[] = [];
  for (const c of candidates) {
    for (const w of c.websites) {
      const row = rowsFor(c, w);
      const sig = row.changeSignal;
      if (sig === "gone") {
        died.push(row);
      } else if (sig === "repurposed_suspect") {
        repurposed.push(row);
      } else if (sig === "redirected") {
        if (row.finalUrl && PARKING_HOSTS.has(REDIRECT_HOST(row.finalUrl))) {
          parked.push(row);
        } else {
          redirectedElsewhere.push(row);
        }
      }
    }
  }

  const material: StewardRow[] = [];
  for (const c of candidates) {
    const sig = significanceByPerson[c.id];
    if (sig === "major" || sig === "transformed") {
      const w = c.websites[0];
      if (!w) continue;
      material.push({
        ...rowsFor(c, w),
        significance: sig,
      });
    }
  }

  const group = (
    key: string,
    title: string,
    action: string,
    rows: StewardRow[],
    opts: Partial<StewardGroup> = {},
  ): StewardGroup => ({
    key,
    title,
    action,
    rows,
    open: false,
    changeParam: "",
    candidates: new Set(rows.map((r) => r.candidateId)).size,
    parties: rollup(rows, (r) => r.party ? r.party.split(", ") : [], 6).map((x) => ({ party: x.name, count: x.count })),
    seats: rollup(rows, (r) => r.seat ? [r.seat] : [], 5).map((x) => ({ seat: x.name, count: x.count })),
    ...opts,
  });

  const groups = [
    group("died", "Sites that died", "First thing to check: are these real removals or temporary outages?", died, {
      open: true,
      changeParam: "gone",
      caveat: `DNS or connection failures at the ${CHECKED_AT} audit — this does not prove permanent removal.`,
      browseHref: "/browse?change=gone",
      browseLabel: "Open unreachable filter in the ledger",
    }),
    group("parked", "Now pointing at a for-sale or parked domain", "These look like lapsed registrations rather than moves.", parked, {
      open: true,
      changeParam: "redirected",
      caveat: "Detected by the destination's domain, not by reading the page.",
      browseHref: "/browse?change=redirected",
      browseLabel: "Open all redirects in the ledger",
    }),
    group("repurposed", "Surname absent (review needed)", "The page still responds but no longer mentions the candidate.", repurposed, {
      changeParam: "repurposed_suspect",
      caveat: "Surname matching is a heuristic — absent means review, not repurposed.",
      browseHref: "/browse?change=repurposed_suspect",
      browseLabel: "Review these in the ledger",
    }),
    group("redirected", "Redirected elsewhere", "A redirect may be a legitimate move or a change of use.", redirectedElsewhere, {
      changeParam: "redirected",
      browseHref: "/browse?change=redirected",
      browseLabel: "Review redirects in the ledger",
    }),
    group("material", "Content changed materially", "Wayback before/after with a normalized text diff.", material, {
      changeParam: "",
      caveat: `Sample of ${Object.keys(significanceByPerson).length} candidates with Wayback baselines — not the whole roster.`,
      browseHref: "/browse?sig=transformed",
      browseLabel: "See transformed records in the ledger",
    }),
  ];

  return { groups, sampleN: Object.keys(significanceByPerson).length, totalSites: candidates.reduce((n, c) => n + c.websites.length, 0) };
}
