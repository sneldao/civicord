// Roster-steward digest derivations — build-time, single source of truth for
// /steward. Uses the exclusive change taxonomy from src/civicord/change_signal.py
// (mirrored per-website in candidates.json and browse's ?change filter), so
// group counts on /steward always agree with the filtered ledger.
import { getCollection } from "astro:content";
import contentDiffsRaw from "../data/content_diffs.json";
import claimDiffsRaw from "../data/claim_diffs.json";
import {
  candidateFollowRecord,
  formatIsoDate,
  parkedHostCount,
  type ClaimDiffRow,
  type ContentDiffInput,
  type PersonInput,
} from "./change-feed";

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
  note?: string;
  followFingerprint: string;
  followSummary: string;
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
  // When a group spans two ledger filters (major + transformed), offer one
  // button per filter so every deep link matches exactly what it opens.
  browseLinks?: Array<{ href: string; label: string }>;
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
  claims: {
    people: number;
    sentences: number;
    compared: number;
    checkedAt: string;
    parkedByHost: number;
  };
}> {
  const entries = await getCollection("candidates");
  const candidates = entries.map((e) => e.data).sort((a, b) => a.name.localeCompare(b.name));

  const diffsRoot: any = contentDiffsRaw as any;
  const significanceByPerson: Record<string, string> = {};
  const contentByPerson: Record<string, ContentDiffInput> = {};
  for (const [pid, row] of Object.entries(diffsRoot?.byPerson ?? {})) {
    const sig = (row as any)?.significance;
    if (sig) significanceByPerson[pid] = String(sig);
    contentByPerson[pid] = row as ContentDiffInput;
  }
  const claimByPerson: Record<string, ClaimDiffRow> =
    ((claimDiffsRaw as { byPerson?: Record<string, ClaimDiffRow> }).byPerson ?? {});
  const followCache = new Map<string, { fingerprint: string; summary: string }>();
  const followFor = (c: (typeof candidates)[number]) => {
    const hit = followCache.get(c.id);
    if (hit) return hit;
    const follow = candidateFollowRecord(c as PersonInput, claimByPerson[c.id], contentByPerson[c.id]);
    const next = { fingerprint: follow.fingerprint, summary: follow.summary };
    followCache.set(c.id, next);
    return next;
  };

  const rowsFor = (c: (typeof candidates)[number], w: (typeof candidates)[number]["websites"][number]): StewardRow => {
    const follow = followFor(c);
    return {
      candidateId: c.id,
      candidateName: c.name,
      party: w.parties.join(", "),
      seat: w.posts[0] ?? "",
      url: w.url,
      statusClass: w.audit?.statusClass ?? "not_audited",
      finalUrl: w.audit?.finalUrl ?? "",
      changeSignal: siteSignal(w),
      followFingerprint: follow.fingerprint,
      followSummary: follow.summary,
    };
  };

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
    // Severity earns the rank, size earns the openness: a 2-row parked
    // finding should not headline the digest expanded.
    group("parked", "Now pointing at a for-sale or parked domain", "These look like lapsed registrations rather than moves.", parked, {
      open: parked.length >= 5,
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
      caveat: `Sample of ${Object.keys(significanceByPerson).length} candidates with Wayback baselines — not the whole roster. Sentence text for these scores is not in the snapshot.`,
      browseLinks: [
        {
          href: "/browse?sig=major",
          label: `Major rewrites in the ledger (${material.filter((r) => r.significance === "major").length})`,
        },
        {
          href: "/browse?sig=transformed",
          label: `Transformed records in the ledger (${material.filter((r) => r.significance === "transformed").length})`,
        },
      ],
    }),
  ];

  const disappeared: StewardRow[] = [];
  let disappearedSentences = 0;
  const checkedDates = new Set<string>();
  for (const [pid, diff] of Object.entries(claimByPerson)) {
    const deleted = diff.deleted_count ?? 0;
    if (deleted <= 0) continue;
    disappearedSentences += deleted;
    if (diff.checked_at) checkedDates.add(diff.checked_at);
    const person = candidates.find((c) => c.id === pid);
    const website = person?.websites[0];
    const follow = person
      ? followFor(person)
      : { fingerprint: `missing|${pid}`, summary: `Sentences no longer found (${deleted})` };
    const sample = diff.deleted?.find((sentence) => sentence?.text)?.text ?? "";
    disappeared.push({
      candidateId: pid,
      candidateName: diff.name || person?.name || pid,
      party: website?.parties.join(", ") ?? "",
      seat: website?.posts[0] ?? "",
      url: diff.url || website?.url || "",
      statusClass: website?.audit?.statusClass ?? "not_audited",
      finalUrl: website?.audit?.finalUrl ?? "",
      changeSignal: "claims_disappeared",
      note: sample.length > 180 ? `${sample.slice(0, 177)}…` : sample,
      followFingerprint: follow.fingerprint,
      followSummary: follow.summary,
    });
  }
  disappeared.sort((a, b) => a.candidateName.localeCompare(b.candidateName));
  const checkedAt = checkedDates.size === 1 ? [...checkedDates][0] : CHECKED_AT;
  const checkedLabel = checkedDates.size === 1 ? formatIsoDate(checkedAt) : "the homepage fetches";
  groups.push(
    group(
      "disappeared",
      "Claims that disappeared",
      "Read the sentence that was published, and that the later homepage did not contain it. No replacement is matched.",
      disappeared,
      {
        caveat: `Present in the April 2025 site text, absent from the ${checkedLabel} homepage fetch. Evidence for review, not proof of removal. Homepage versus whole site. ${Object.keys(claimByPerson).length} records were compared.`,
        browseHref: "/themes",
        browseLabel: "Open the theme rollup",
      },
    ),
  );

  return {
    groups,
    sampleN: Object.keys(significanceByPerson).length,
    totalSites: candidates.reduce((n, c) => n + c.websites.length, 0),
    claims: {
      people: disappeared.length,
      sentences: disappearedSentences,
      compared: Object.keys(claimByPerson).length,
      checkedAt,
      parkedByHost: parkedHostCount(candidates as PersonInput[]),
    },
  };
}
