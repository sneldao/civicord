// One readable sentence from the claim-diff snapshot: present in the April
// site-wide text, absent from the later homepage fetch. Selection is
// deterministic and never synthesises wording.

export interface WalkbackPerson {
  id: string;
  changeSignal?: string;
  websites?: Array<{
    parties?: string[];
    posts?: string[];
    audit?: { statusClass?: string; redirected?: boolean; nameFound?: boolean | null } | null;
  }>;
}

export interface WalkbackClaim {
  text?: string;
  topics?: string[];
}

export interface WalkbackRow {
  name?: string;
  url?: string;
  checked_at?: string;
  scope_note?: string;
  deleted?: WalkbackClaim[];
  added?: WalkbackClaim[];
  deleted_count?: number;
  added_count?: number;
}

export type WalkbackFate = "gone" | "repurposed" | "redirected" | "live";

export interface WalkbackLead {
  personId: string;
  name: string;
  text: string;
  url: string;
  checkedAt: string;
  scopeNote: string;
  party: string;
  seat: string;
  topics: string[];
  fate: WalkbackFate;
  afterText: string;
}

const PLEDGE =
  /\b(as your (mp|candidate|member)|if elected|i will|i’ll|i pledge|pledge to|promise to)\b/i;
const NAV =
  /^(top of page|read more|my experience|about me|about |welcome|skip to|cookie|privacy|home |search this site|embedded files)\b/i;

export function isReadableWalkback(text: string): boolean {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 18 || words.length > 55) return false;
  if (t.length >= 290) return false;
  if (!/[.!?]["’”]?$/.test(t)) return false;
  if (NAV.test(t)) return false;
  if (!/^[\p{Lu}“"']/u.test(t)) return false;
  return true;
}

export function scopeExplanation(scopeNote: string): string {
  if (scopeNote === "april site-wide vs recrawl homepage") {
    return "The April text covers the whole scraped site; the later text is one homepage fetch. A sentence can be missing from that homepage and still exist on another page.";
  }
  return scopeNote;
}

function partySeat(person: WalkbackPerson | undefined): { party: string; seat: string } {
  const site = person?.websites?.[0];
  return {
    party: site?.parties?.[0] ?? "",
    seat: site?.posts?.[0] ?? "",
  };
}

function fateOf(person: WalkbackPerson | undefined): WalkbackFate {
  const site = person?.websites?.[0];
  const status = site?.audit?.statusClass;
  if (person?.changeSignal === "gone" || (status && status !== "live")) return "gone";
  if (person?.changeSignal === "repurposed_suspect") return "repurposed";
  if (person?.changeSignal === "redirected" || site?.audit?.redirected) return "redirected";
  return "live";
}

// A short, self-explanatory added text can stand in for the "after" panel —
// e.g. a default server page where the campaign site used to be.
function pickAfterText(row: WalkbackRow): string {
  for (const claim of row.added ?? []) {
    const t = String(claim.text ?? "").trim().replace(/\s+/g, " ");
    if (t.length >= 12 && t.length <= 160 && /^[\p{L}\p{N}“"']/u.test(t)) return t;
  }
  return "";
}

interface Hit extends WalkbackLead {
  fateRank: number;
  tier: number;
}

export function pickLeadWalkback(
  claimDiffs: { byPerson?: Record<string, WalkbackRow> } | null | undefined,
  people: WalkbackPerson[],
): WalkbackLead | null {
  const byPerson = claimDiffs?.byPerson ?? {};
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const hits: Hit[] = [];

  for (const [personId, row] of Object.entries(byPerson)) {
    const person = peopleById.get(personId);
    const { party, seat } = partySeat(person);
    const fate = fateOf(person);
    // Structural disappearances (dead or repurposed domains) outrank
    // sentence-level ones — the record speaks for itself without a caveat.
    const fateRank = fate === "gone" || fate === "repurposed" ? 0 : 1;
    for (const claim of row.deleted ?? []) {
      const text = String(claim.text ?? "").trim();
      if (!text || !isReadableWalkback(text)) continue;
      const topics = (claim.topics ?? []).filter(Boolean);
      const pledged = PLEDGE.test(text);
      if (!pledged && topics.length === 0) continue;
      hits.push({
        fateRank,
        tier: pledged && topics.length > 0 ? 0 : pledged ? 1 : 2,
        personId,
        name: row.name || personId,
        text,
        url: row.url || "",
        checkedAt: row.checked_at || "",
        scopeNote: row.scope_note || "",
        party,
        seat,
        topics,
        fate,
        afterText: pickAfterText(row),
      });
    }
  }

  hits.sort(
    (a, b) =>
      a.fateRank - b.fateRank ||
      a.tier - b.tier ||
      Number(a.personId) - Number(b.personId) ||
      a.text.localeCompare(b.text),
  );
  if (!hits.length) return null;
  const { fateRank: _fateRank, tier: _tier, ...lead } = hits[0];
  return lead;
}
