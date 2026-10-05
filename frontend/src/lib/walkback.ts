// One readable sentence from the claim-diff snapshot: present in the April
// site-wide text, absent from the later homepage fetch. Selection is
// deterministic and never synthesises wording.

export interface WalkbackPerson {
  id: string;
  websites?: Array<{ parties?: string[]; posts?: string[] }>;
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
}

const PROMISE = /\b(As your MP I will|If elected I will|As an MP I will)\b/;
const NAV =
  /^(top of page|read more|my experience|about me|about |welcome|skip to|cookie|privacy|home )\b/i;

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

interface Hit extends WalkbackLead {
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
    for (const claim of row.deleted ?? []) {
      const text = String(claim.text ?? "").trim();
      if (!text || !isReadableWalkback(text)) continue;
      const topics = (claim.topics ?? []).filter(Boolean);
      const promised = PROMISE.test(text);
      if (!promised && topics.length === 0) continue;
      hits.push({
        tier: promised && topics.length > 0 ? 0 : promised ? 1 : 2,
        personId,
        name: row.name || personId,
        text,
        url: row.url || "",
        checkedAt: row.checked_at || "",
        scopeNote: row.scope_note || "",
        party,
        seat,
        topics,
      });
    }
  }

  hits.sort(
    (a, b) =>
      a.tier - b.tier ||
      Number(a.personId) - Number(b.personId) ||
      a.text.localeCompare(b.text),
  );
  if (!hits.length) return null;
  const { tier: _tier, ...lead } = hits[0];
  return lead;
}
