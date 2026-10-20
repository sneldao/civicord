// The read side of the Civicord ledger, for the MCP server.
//
// No Astro, no HTTP, no second implementation. This loads the same committed
// snapshots the static endpoints load and answers with the same copy modules the
// human pages render with, so a tool result cannot drift from the page it cites.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUDIT_DATE,
  NOT_PROOF_COPY,
  ONCHAIN_COPY,
  RECORD_ORIGIN,
  candidateCitation,
  recordVerdictCopy,
} from "../frontend/src/lib/record-copy.ts";
import {
  AUDIT_LABEL,
  PAIRING_GAP,
  SCRAPE_LABEL,
  candidateSummary,
  changeLabels,
  clipText,
  peopleOnSeat,
  seatTimeline,
  siteStory,
} from "../frontend/src/lib/change-feed.ts";
import { pickLeadWalkback, scopeExplanation } from "../frontend/src/lib/walkback.ts";
import { CHANGE_LABELS, changeLabel } from "../frontend/src/lib/change-labels.ts";

export { CHANGE_LABELS };
export const SIGNALS = Object.keys(CHANGE_LABELS);

const DATA = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "frontend",
  "src",
  "data",
);

function load(file) {
  const parsed = JSON.parse(readFileSync(join(DATA, file), "utf8"));
  return Array.isArray(parsed) ? parsed : (parsed.default ?? parsed);
}

export const people = load("candidates.json");
export const seats = load("constituencies.json");
export const claims = load("claim_diffs.json").byPerson ?? {};
export const content = load("content_diffs.json").byPerson ?? {};

const peopleById = new Map(people.map((p) => [p.id, p]));
const seatsBySlug = new Map(seats.map((s) => [s.slug, s]));
const seatNameBySlug = new Map(seats.map((s) => [s.name, s.slug]));

// Seat membership, inverted once. constituencies.json already lists the
// candidates per seat, so this is the same join the seat page renders.
const seatByPerson = new Map();
for (const seat of seats) {
  for (const candidate of seat.candidates ?? []) {
    if (!seatByPerson.has(candidate.id)) seatByPerson.set(candidate.id, seat);
  }
}

const parties = [
  ...new Set(people.flatMap((p) => p.websites.flatMap((w) => w.parties ?? []))),
]
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b));

const recordUrl = (path) => `${RECORD_ORIGIN}${path}`;

export function notFound(kind, key) {
  return { error: `${kind} not found`, [kind]: key, hint: `Try search_civicord with part of the name.` };
}

/** Dataset totals, on the two axes we keep separate: HTTP result and change signal. */
export function totals() {
  const websites = people.flatMap((p) => p.websites);
  const audited = websites.filter((w) => w.audit);
  const changeSignals = Object.fromEntries(
    Object.keys(CHANGE_LABELS).map((key) => [key, 0]),
  );
  for (const w of websites) {
    const signal = w.changeSignal ?? "unaudited";
    changeSignals[signal] = (changeSignals[signal] ?? 0) + 1;
  }
  const seatsWithSites = seats.filter((s) => s.stats?.sites > 0).length;
  return {
    candidates: people.length,
    websites: websites.length,
    audited: audited.length,
    live: audited.filter((w) => w.audit.statusClass === "live").length,
    gone: audited.filter((w) => ["dns_error", "connection_error"].includes(w.audit.statusClass)).length,
    redirected: audited.filter((w) => w.audit.redirected).length,
    constituencies: seats.length,
    seatsWithSites,
    seatsWithoutAnyRecordedSite: seats.length - seatsWithSites,
    parties: parties.length,
    onchainRecords: people.filter((p) => p.onchain).length,
    sentenceComparisons: Object.keys(claims).length,
    textOverlapScores: Object.keys(content).length,
    changeSignals,
    changeSignalLabels: CHANGE_LABELS,
    auditedAt: AUDIT_DATE,
    limits: [
      `Liveness was checked once, on ${AUDIT_DATE}. ${NOT_PROOF_COPY}`,
      "A change signal describes what the audit could see, not what a campaign intended.",
      "The two axes disagree by design: the counts above are per HTTP response, the change signals assign exactly one label per row.",
      ONCHAIN_COPY,
    ],
    record: recordUrl("/browse"),
  };
}

/** Free-text over people, seats and parties. Same shape the site's search index uses. */
export function search(query, limit = 5) {
  const q = String(query ?? "").toLowerCase().trim();
  if (!q) return { error: "query required" };
  const max = Math.min(Math.max(Number(limit) || 5, 1), 20);
  const hit = (s) => String(s ?? "").toLowerCase().includes(q);

  return {
    query,
    candidates: people
      .filter((p) => hit(p.name))
      .slice(0, max)
      .map((p) => {
        const seat = seatByPerson.get(p.id);
        return {
          id: p.id,
          name: p.name,
          party: p.websites.flatMap((w) => w.parties ?? []).filter(Boolean)[0] ?? "",
          seat: seat?.name ?? "",
          changeSignal: p.changeSignal ?? null,
          signalLabel: p.changeSignal ? changeLabel(p.changeSignal) : "Unaudited",
          record: recordUrl(`/candidates/${encodeURIComponent(p.id)}`),
        };
      }),
    constituencies: seats
      .filter((s) => hit(s.name) || hit(s.altName))
      .slice(0, max)
      .map((s) => ({
        slug: s.slug,
        name: s.name,
        region: s.region,
        stats: s.stats,
        record: recordUrl(`/constituencies/${encodeURIComponent(s.slug)}`),
      })),
    parties: parties
      .filter(hit)
      .slice(0, max)
      .map((name) => ({ name, record: recordUrl(`/browse?party=${encodeURIComponent(name.toLowerCase())}`) })),
  };
}

export function seatRecord(slugOrName) {
  const seat =
    seatsBySlug.get(slugOrName) ?? seatsBySlug.get(seatNameKey(slugOrName)) ?? null;
  if (!seat) return notFound("constituency", slugOrName);

  const onSeat = peopleOnSeat(people, seat.name, seat.slug);
  const timeline = seatTimeline(seat, people, claims, content);
  return {
    ...seat,
    candidatesTracked: onSeat.length,
    timeline: timeline.beats.map((beat) => ({
      when: beat.when,
      heading: beat.heading,
      body: beat.body,
      items: beat.items.map((item) => ({
        name: item.name,
        detail: item.detail,
        record: recordUrl(item.href),
      })),
    })),
    footnote: timeline.footnote,
    record: recordUrl(`/constituencies/${encodeURIComponent(seat.slug)}`),
  };
}

function seatNameKey(input) {
  const wanted = String(input).toLowerCase().replace(/-/g, " ");
  for (const [name, slug] of seatNameBySlug) {
    if (name.toLowerCase() === wanted) return slug;
  }
  return input;
}

function verdictOf(person) {
  const sites = person.websites ?? [];
  if (!sites.length) return "unknown";
  if (sites.every((w) => w.audit?.statusClass === "live")) return "live";
  if (sites.some((w) => w.audit?.statusClass === "live")) return "mixed";
  if (sites.every((w) => ["dns_error", "connection_error"].includes(w.audit?.statusClass ?? ""))) return "gone";
  return "unknown";
}

export function personRecord(id) {
  const person = peopleById.get(String(id));
  if (!person) return notFound("candidate", id);
  const claim = claims[person.id] ?? null;
  const overlap = content[person.id] ?? null;
  const seat = seatByPerson.get(person.id) ?? null;
  const verdict = verdictOf(person);
  return {
    id: person.id,
    name: person.name,
    parties: [...new Set(person.websites.flatMap((w) => w.parties ?? []))].filter(Boolean),
    elections: [...new Set(person.websites.flatMap((w) => w.elections ?? []))].filter(Boolean),
    verdict,
    verdictCopy: recordVerdictCopy(verdict, person.name),
    summary: candidateSummary(person, claim, overlap),
    labels: changeLabels(person.websites, claim, overlap),
    changeSignal: person.changeSignal ?? null,
    signalLabel: person.changeSignal ? changeLabel(person.changeSignal) : "Unaudited",
    seat: seat ? { slug: seat.slug, name: seat.name, electorate: seat.electorate ?? null } : null,
    ens: person.onchain?.ens ?? `p${person.id}.civicord.eth`,
    onchain: person.onchain
      ? { ens: person.onchain.ens, status: person.onchain.status ?? null, node: person.onchain.node ?? null }
      : { ens: `p${person.id}.civicord.eth`, status: null, node: null },
    websites: person.websites.map((w) => {
      const story = siteStory(w);
      return {
        url: w.url,
        outcome: story.outcome,
        story: story.detail,
        status: w.audit?.statusClass ?? "unknown",
        statusCode: w.audit?.statusCode ?? null,
        redirected: w.audit?.redirected ?? false,
        finalUrl: w.audit?.finalUrl ?? w.url,
        nameFound: w.audit?.nameFound ?? null,
        changeSignal: w.changeSignal ?? null,
        signalLabel: w.changeSignal ? changeLabel(w.changeSignal) : "Unaudited",
        parties: (w.parties ?? []).filter(Boolean),
        posts: (w.posts ?? []).filter(Boolean),
      };
    }),
    claimDiff: claim ? claimDiffBody(claim) : null,
    textOverlap: overlap,
    citation: candidateCitation(person),
    record: recordUrl(`/candidates/${encodeURIComponent(person.id)}`),
  };
}

function claimDiffBody(claim) {
  return {
    url: claim.url,
    checkedAt: claim.checked_at,
    aprilSentences: claim.april_sentences ?? null,
    newSentences: claim.new_sentences ?? null,
    kept: claim.kept ?? 0,
    deletedCount: claim.deleted_count ?? (claim.deleted?.length ?? 0),
    addedCount: claim.added_count ?? (claim.added?.length ?? 0),
    deleted: (claim.deleted ?? []).slice(0, 12),
    added: (claim.added ?? []).slice(0, 12),
    scope: scopeExplanation(claim.scope_note ?? ""),
  };
}

export function personClaims(id) {
  const person = peopleById.get(String(id));
  if (!person) return notFound("candidate", id);
  const claim = claims[person.id] ?? null;
  if (!claim) {
    return {
      id: person.id,
      name: person.name,
      comparison: null,
      note: `No sentence comparison is stored for this record. ${Object.keys(claims).length} of ${people.length} candidates have one.`,
      record: recordUrl(`/candidates/${encodeURIComponent(person.id)}`),
    };
  }
  return { id: person.id, name: person.name, comparison: claimDiffBody(claim), pairingGap: PAIRING_GAP, record: recordUrl(`/candidates/${encodeURIComponent(person.id)}#claims`) };
}

export function ledgerFilter({ signal, party, status, query, droppedSentences, limit = 10 } = {}) {
  if (signal && !CHANGE_LABELS[signal]) {
    return { error: `unknown signal "${signal}"`, validSignals: SIGNALS };
  }
  const max = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const q = String(query ?? "").toLowerCase().trim();
  const rows = [];
  for (const person of people) {
    const personParty = person.websites.flatMap((w) => w.parties ?? []).filter(Boolean)[0] ?? "";
    if (signal && (person.changeSignal ?? "unaudited") !== signal) continue;
    if (party && !personParty.toLowerCase().includes(String(party).toLowerCase())) continue;
    if (q && !person.name.toLowerCase().includes(q)) continue;
    if (status) {
      const statuses = new Set(person.websites.map((w) => w.audit?.statusClass ?? "unknown"));
      if (!statuses.has(status)) continue;
    }
    const claim = claims[person.id] ?? null;
    const missing = claim?.deleted_count ?? claim?.deleted?.length ?? 0;
    // The claim-diff axis, asked on its own terms. Records here can carry a
    // clean site signal — the site answered, the surname was there — and still
    // have April sentences absent from the September fetch.
    if (droppedSentences && missing < 1) continue;
    const seat = seatByPerson.get(person.id);
    rows.push({
      id: person.id,
      name: person.name,
      party: personParty,
      seat: seat?.name ?? "",
      signalLabel: person.changeSignal ? changeLabel(person.changeSignal) : "Unaudited",
      sentencesMissing: missing,
      summary: candidateSummary(person, claim, content[person.id] ?? null),
      record: recordUrl(`/candidates/${encodeURIComponent(person.id)}`),
    });
  }
  return {
    // Matched is the whole answer; returned is this page of it. An agent that
    // reads "10" as "10 exist" would be reporting a filter, not a count.
    matched: rows.length,
    returned: Math.min(rows.length, max),
    limit: max,
    truncated: rows.length > max,
    rows: rows.slice(0, max),
    note: droppedSentences
      ? `Sentences counted as missing were compared against one homepage fetch, not the whole site. ${scopeExplanation("april site-wide vs recrawl homepage")}`
      : undefined,
    shareableUrl: browseUrl({ signal, party, status, query }),
  };
}

function browseUrl({ signal, party, status, query }) {
  const params = new URLSearchParams();
  if (signal) params.set("change", signal);
  if (party) params.set("party", String(party).toLowerCase());
  if (status) params.set("status", status);
  if (query) params.set("q", query);
  return recordUrl(`/browse${params.toString() ? `?${params}` : ""}`);
}

/**
 * The answer an assistant can read out. Composed from the timeline beats the
 * seat page renders, so the spoken version and the page version are the same
 * sentences. Limits travel attached, never as a separate optional field.
 */
export function seatAnswer(slugOrName) {
  const seat =
    seatsBySlug.get(slugOrName) ?? seatsBySlug.get(seatNameKey(slugOrName)) ?? null;
  if (!seat) return notFound("constituency", slugOrName);

  const onSeat = peopleOnSeat(people, seat.name, seat.slug);
  const timeline = seatTimeline({ name: seat.name, slug: seat.slug }, onSeat, claims, content);
  const auditBeat = timeline.beats.find((b) => b.datetime === AUDIT_DATE) ?? null;
  const wordsBeat = timeline.beats.find((b) => b.heading === "What happened to the words") ?? null;
  // Restricted to this seat: pickLeadWalkback reads every row it is handed, and
  // the ledger holds sentence comparisons for people who never stood here.
  const seatClaims = Object.fromEntries(
    onSeat.filter((p) => claims[p.id]).map((p) => [p.id, claims[p.id]]),
  );
  const lead = pickLeadWalkback({ byPerson: seatClaims }, onSeat);

  const speech = [
    `${seat.name}: ${onSeat.length} candidate${onSeat.length === 1 ? "" : "s"} on the ledger.`,
    auditBeat ? auditBeat.body : timeline.beats[0]?.body ?? "",
    lead ? `${lead.name} carried this in the April text, and it was not found in the September fetch: "${clipText(lead.text, 220)}"` : "",
  ].filter(Boolean).join(" ");

  const limits = [
    `All HTTP results are from one audit day, ${AUDIT_LABEL}.`,
    NOT_PROOF_COPY,
    wordsBeat ? scopeExplanation(lead?.scopeNote ?? "april site-wide vs recrawl homepage") : PAIRING_GAP,
    "This is a public ledger of what an automated check could see. It is not a finding about anyone's conduct.",
  ].filter(Boolean);

  return {
    seat: { slug: seat.slug, name: seat.name, region: seat.region, stats: seat.stats },
    speech,
    limits,
    perCandidate: (seat.candidates ?? []).map((c) => {
      const story = siteStory({ url: c.url, audit: c });
      return { name: c.name, party: c.party, outcome: story.outcome, story: story.detail };
    }),
    recordedSentencesMissing: wordsBeat
      ? wordsBeat.items.filter((i) => i.tone === "disappeared").length
      : 0,
    lead,
    record: recordUrl(`/constituencies/${encodeURIComponent(seat.slug)}`),
    source: `${SCRAPE_LABEL} scrape + ${AUDIT_LABEL} audit`,
  };
}
