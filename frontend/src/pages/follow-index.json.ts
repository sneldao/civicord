import type { APIRoute } from "astro";
import candidatesRaw from "../data/candidates.json";
import constituenciesRaw from "../data/constituencies.json";
import claimDiffsRaw from "../data/claim_diffs.json";
import contentDiffsRaw from "../data/content_diffs.json";
import {
  AUDIT_ISO,
  SCRAPE_LABEL,
  candidateFollowRecord,
  seatFollowRecord,
  type ClaimDiffRow,
  type ContentDiffInput,
  type PersonInput,
} from "../lib/change-feed";

export const prerender = true;

function asPeople(raw: unknown): PersonInput[] {
  const list = Array.isArray(raw) ? raw : [];
  return list as PersonInput[];
}

function asSeats(raw: unknown): Array<{ slug: string; name: string }> {
  const list = Array.isArray(raw) ? raw : [];
  return list as Array<{ slug: string; name: string }>;
}

export const GET: APIRoute = () => {
  const people = asPeople(candidatesRaw);
  const claims = ((claimDiffsRaw as { byPerson?: Record<string, ClaimDiffRow> }).byPerson ?? {}) as Record<string, ClaimDiffRow>;
  const content = ((contentDiffsRaw as { byPerson?: Record<string, ContentDiffInput> }).byPerson ?? {}) as Record<string, ContentDiffInput>;
  const candidates: Record<string, { name: string; href: string; fingerprint: string; summary: string }> = {};
  for (const person of people) {
    const follow = candidateFollowRecord(person, claims[person.id], content[person.id]);
    candidates[person.id] = { name: person.name, ...follow };
  }
  const seats: Record<string, { name: string; href: string; fingerprint: string; summary: string }> = {};
  for (const seat of asSeats(constituenciesRaw)) {
    if (!seat?.slug || !seat?.name) continue;
    const follow = seatFollowRecord(seat.slug, seat.name, people, claims, content);
    seats[seat.slug] = { name: seat.name, ...follow };
  }
  return new Response(
    JSON.stringify({
      snapshots: { scrape: SCRAPE_LABEL, audit: AUDIT_ISO },
      candidates,
      seats,
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    },
  );
};
