// Honest before/after over the committed snapshots.
//
// claimdiff-v1 aligns sentences by exact normalized match. An edited line
// becomes one "deleted" sentence and one "added" sentence. Nothing in
// claim_diffs.json records which added sentence replaced which deleted one,
// so this module never pairs them. A disappeared sentence's after-state is
// "not found on the later homepage". New homepage sentences are listed apart.

import { AUDIT_DATE, RECORD_ORIGIN, describeWebsite, statusLabels } from "./record-copy.ts";
import { slugify } from "./slug.ts";

export const SCRAPE_LABEL = "April 2025";
export const AUDIT_ISO = AUDIT_DATE;
export const PAIRING_GAP =
  "No replacement sentence is matched. A line that only appears on the later homepage is listed on its own.";
export const NO_CHANGE_SUMMARY = "No change recorded between these snapshots";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PARKING_HOSTS = new Set([
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
  "pendingcloudflare.com",
]);

const BOILERPLATE =
  /skip to main|cookie policy|privacy policy|accessibility statement|read all news|leave this field blank|sign up for updates|unsubscribe|all rights reserved|pick up to \d/i;

const FUNCTION_WORDS = new Set([
  "a", "an", "the", "of", "to", "and", "or", "for", "in", "on", "with", "from", "by",
  "we", "our", "will", "is", "are", "was", "were", "has", "have", "had", "that", "this",
  "their", "not", "be", "as", "at", "it", "its", "into", "than", "who", "which", "but",
  "if", "they", "them", "his", "her", "he", "she",
]);

export type SiteOutcome =
  | "died"
  | "parked"
  | "redirected"
  | "surname_absent"
  | "answered"
  | "other"
  | "unaudited";

export interface SiteInput {
  url: string;
  parties?: string[];
  posts?: string[];
  changeSignal?: string;
  audit?: {
    statusClass?: string;
    statusCode?: string | number | null;
    redirected?: boolean;
    finalUrl?: string | null;
    nameFound?: boolean | null;
  } | null;
}

export interface PersonInput {
  id: string;
  name: string;
  websites: SiteInput[];
}

export interface ClaimSentence {
  text: string;
  topics?: string[];
}

export interface ClaimDiffRow {
  name?: string;
  url: string;
  checked_at: string;
  scope_note?: string;
  kept?: number;
  deleted_count?: number;
  added_count?: number;
  deleted?: ClaimSentence[];
  added?: ClaimSentence[];
}

export interface ContentDiffInput {
  significance?: string;
  coverage?: number;
  snapshotTs?: string;
  snapshotInWindow?: boolean;
  waybackUrl?: string;
  url?: string;
}

export interface ClaimPair {
  personId: string;
  personName: string;
  url: string;
  beforeLabel: string;
  afterLabel: string;
  beforeText: string;
  afterKind: "not_found";
  topics: string[];
  scopeNote: string;
  citation: string;
}

export interface UnmatchedAddition {
  text: string;
  topics: string[];
  url: string;
  afterLabel: string;
  gap: string;
}

export interface JournalistTip {
  personId: string;
  personName: string;
  url: string;
  afterDate: string;
  afterLabel: string;
  beforeText: string;
  topics: string[];
  scopeNote: string;
  citation: string;
  deletedCount: number;
}

export interface TimelineItem {
  href: string;
  name: string;
  detail: string;
  tone: string;
  externalHref?: string;
  externalLabel?: string;
}

export interface TimelineBeat {
  when: string;
  datetime?: string;
  heading: string;
  body: string;
  items: TimelineItem[];
}

export interface SeatTimeline {
  beats: TimelineBeat[];
  footnote: string;
}

export interface FollowRecord {
  fingerprint: string;
  summary: string;
  href: string;
}

export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function formatSnapshotTs(ts: string): string {
  if (!/^\d{8}/.test(ts)) return ts;
  return formatIsoDate(`${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`);
}

export const AUDIT_LABEL = formatIsoDate(AUDIT_ISO);

export function clipText(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const atWord = sliced.replace(/\s+\S*$/, "");
  const base = atWord.length >= 40 ? atWord : sliced;
  return `${base}…`;
}

export function redirectHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function siteOutcome(site: SiteInput): SiteOutcome {
  const audit = site.audit;
  if (!audit?.statusClass) return "unaudited";
  if (audit.statusClass === "dns_error" || audit.statusClass === "connection_error") return "died";
  if (audit.redirected) {
    const host = redirectHost(audit.finalUrl || "");
    if (host && PARKING_HOSTS.has(host)) return "parked";
    return "redirected";
  }
  if (audit.statusClass === "live" && audit.nameFound === false) return "surname_absent";
  if (audit.statusClass === "live") return "answered";
  return "other";
}

export function siteStory(site: SiteInput): { outcome: SiteOutcome; detail: string } {
  const outcome = siteOutcome(site);
  const audit = site.audit;
  const code =
    audit?.statusCode != null && String(audit.statusCode) !== "" ? ` (HTTP ${audit.statusCode})` : "";
  const label = audit?.statusClass ? statusLabels[audit.statusClass] ?? audit.statusClass : "Not audited";
  const host = audit?.finalUrl ? redirectHost(audit.finalUrl) : "";
  const surname =
    audit?.nameFound === false ? " The surname was not in the response body." : "";
  let sentence: string;
  if (outcome === "died") {
    sentence = `No longer resolved (${label}). An outage and a removal look the same in this check.`;
  } else if (outcome === "parked") {
    sentence = `Redirected to a for-sale or parked domain (${host || "destination host not recorded"}).${surname}`;
  } else if (outcome === "redirected") {
    sentence = `Redirected${audit?.finalUrl ? ` to ${audit.finalUrl}` : ""}.${surname}`;
  } else if (outcome === "surname_absent") {
    sentence = `Answered${code}. The surname was not in the response body. That asks for review; it does not prove the site was repurposed.`;
  } else if (outcome === "answered") {
    sentence = `Answered${code}.`;
  } else if (outcome === "unaudited") {
    sentence = "No audit row for this URL.";
  } else {
    sentence = `Audit result: ${label}${code}.`;
  }
  return { outcome, detail: `${site.url} — ${sentence}` };
}

function scopeOf(diff: ClaimDiffRow): string {
  return diff.scope_note || "april site-wide vs recrawl homepage";
}

export function claimCitation(input: {
  personId: string;
  personName: string;
  url: string;
  beforeText: string;
  afterLabel: string;
  scopeNote: string;
}): string {
  return [
    `Civicord — ${input.personName} (Democracy Club person ID ${input.personId}).`,
    `Before (${SCRAPE_LABEL} scrape): ${input.beforeText}`,
    `After (${input.afterLabel} homepage fetch of ${input.url}): not found.`,
    `Gap: ${PAIRING_GAP} Scope: ${input.scopeNote}.`,
    "A missing sentence is evidence for review, not proof it was removed.",
    `Record: ${RECORD_ORIGIN}/candidates/${encodeURIComponent(input.personId)}#claims`,
  ].join("\n");
}

export function beforeAfterPairs(
  personId: string,
  personName: string,
  diff: ClaimDiffRow | null | undefined,
): ClaimPair[] {
  if (!diff?.deleted?.length) return [];
  const afterLabel = formatIsoDate(diff.checked_at);
  const scopeNote = scopeOf(diff);
  const name = personName || diff.name || personId;
  return diff.deleted
    .filter((sentence) => sentence?.text)
    .map((sentence) => {
      const beforeText = sentence.text;
      return {
        personId,
        personName: name,
        url: diff.url,
        beforeLabel: SCRAPE_LABEL,
        afterLabel,
        beforeText,
        afterKind: "not_found" as const,
        topics: sentence.topics ?? [],
        scopeNote,
        citation: claimCitation({
          personId,
          personName: name,
          url: diff.url,
          beforeText,
          afterLabel,
          scopeNote,
        }),
      };
    });
}

export function unmatchedAdditions(diff: ClaimDiffRow | null | undefined): UnmatchedAddition[] {
  if (!diff?.added?.length) return [];
  const afterLabel = formatIsoDate(diff.checked_at);
  return diff.added
    .filter((sentence) => sentence?.text)
    .map((sentence) => ({
      text: sentence.text,
      topics: sentence.topics ?? [],
      url: diff.url,
      afterLabel,
      gap: "This sentence is only on the later homepage. No April sentence is matched to it.",
    }));
}

export function listGap(diff: ClaimDiffRow | null | undefined): string | null {
  if (!diff) return null;
  const shown = diff.deleted?.length ?? 0;
  const total = diff.deleted_count ?? shown;
  if (total > shown) {
    return `The snapshot lists ${shown} of ${total} sentences that were not found. The rest are counted, not quoted here.`;
  }
  return null;
}

function functionWordCount(text: string): number {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => FUNCTION_WORDS.has(word)).length;
}

export function eligibleTipSentence(text: string, topics: string[]): boolean {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length < 10) return false;
  if (!topics?.length || topics.length >= 8) return false;
  if (BOILERPLATE.test(text)) return false;
  const hashes = text.match(/#/g)?.length ?? 0;
  if (hashes > 6) return false;
  // Navigation dumps hit many topic keywords and almost no ordinary prose words.
  if (functionWordCount(text) < 4) return false;
  return true;
}

function tipScore(text: string, topics: string[]): number {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  const hashes = text.match(/#/g)?.length ?? 0;
  let score = Math.min(words, 70) + Math.min(topics.length, 3) * 15 + functionWordCount(text);
  if (topics.length >= 6) score -= 30;
  if (hashes > 2) score -= 80;
  if (/https?:\/\//i.test(text)) score -= 40;
  return score;
}

export function journalistTips(
  byPerson: Record<string, ClaimDiffRow>,
  limit = 12,
): JournalistTip[] {
  const ranked: Array<JournalistTip & { score: number }> = [];
  for (const [personId, diff] of Object.entries(byPerson)) {
    let best: { score: number; sentence: ClaimSentence } | null = null;
    for (const sentence of diff.deleted ?? []) {
      const topics = sentence.topics ?? [];
      if (!sentence?.text || !eligibleTipSentence(sentence.text, topics)) continue;
      const score = tipScore(sentence.text, topics);
      if (!best || score > best.score) best = { score, sentence };
    }
    if (!best) continue;
    const afterLabel = formatIsoDate(diff.checked_at);
    const scopeNote = scopeOf(diff);
    const personName = diff.name || personId;
    const beforeText = best.sentence.text;
    ranked.push({
      score: best.score,
      personId,
      personName,
      url: diff.url,
      afterDate: diff.checked_at,
      afterLabel,
      beforeText,
      topics: best.sentence.topics ?? [],
      scopeNote,
      deletedCount: diff.deleted_count ?? diff.deleted?.length ?? 0,
      citation: claimCitation({
        personId,
        personName,
        url: diff.url,
        beforeText,
        afterLabel,
        scopeNote,
      }),
    });
  }
  ranked.sort((a, b) => b.score - a.score || a.personId.localeCompare(b.personId));
  return ranked.slice(0, limit).map(({ score: _score, ...tip }) => tip);
}

export function websiteOnSeat(site: SiteInput, seatName: string, seatSlug: string): boolean {
  return (site.posts ?? []).some((post) => post === seatName || slugify(post) === seatSlug);
}

export function peopleOnSeat(people: PersonInput[], seatName: string, seatSlug: string): PersonInput[] {
  return people.filter((person) => person.websites.some((site) => websiteOnSeat(site, seatName, seatSlug)));
}

const SIGNIFICANCE_PLAIN: Record<string, string> = {
  unchanged: "High text overlap with the compared archived page",
  minor: "Small text difference from the compared archived page",
  major: "Substantial text difference from the compared archived page",
  transformed: "Low text overlap with the compared archived page",
};

function countBits(counts: Map<SiteOutcome, number>): string {
  const order: Array<[SiteOutcome, string]> = [
    ["died", "no longer resolved"],
    ["parked", "pointing at a for-sale or parked domain"],
    ["redirected", "redirected"],
    ["surname_absent", "answered with the surname absent"],
    ["answered", "answered"],
    ["other", "with another HTTP result"],
    ["unaudited", "not audited"],
  ];
  const parts: string[] = [];
  for (const [key, label] of order) {
    const n = counts.get(key) ?? 0;
    if (n) parts.push(`${n} ${label}`);
  }
  return parts.join(", ");
}

function exampleSentence(diff: ClaimDiffRow): string {
  const list = diff.deleted ?? [];
  const good = list.find((sentence) => sentence?.text && eligibleTipSentence(sentence.text, sentence.topics ?? []));
  return (good ?? list.find((sentence) => sentence?.text))?.text ?? "";
}

export function seatTimeline(
  seat: { name: string; slug: string },
  people: PersonInput[],
  claims: Record<string, ClaimDiffRow>,
  content: Record<string, ContentDiffInput>,
): SeatTimeline {
  const onSeat = peopleOnSeat(people, seat.name, seat.slug);
  const sites = onSeat.flatMap((person) =>
    person.websites
      .filter((site) => websiteOnSeat(site, seat.name, seat.slug))
      .map((site) => ({ person, site })),
  );

  if (!sites.length) {
    return {
      beats: [
        {
          when: SCRAPE_LABEL,
          datetime: "2025-04",
          heading: "What was recorded",
          body: `No candidate website for ${seat.name} is in the April 2025 scrape, so the later audit had no URL here to check.`,
          items: [],
        },
      ],
      footnote: "",
    };
  }

  const aprilItems: TimelineItem[] = sites
    .map(({ person, site }) => ({
      href: `/candidates/${encodeURIComponent(person.id)}`,
      name: person.name,
      detail: `${(site.parties ?? []).filter(Boolean).join(", ") || "Party not recorded"} — ${site.url}`,
      tone: "recorded",
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.detail.localeCompare(b.detail));

  const counts = new Map<SiteOutcome, number>();
  const auditItems: TimelineItem[] = sites
    .map(({ person, site }) => {
      const story = siteStory(site);
      counts.set(story.outcome, (counts.get(story.outcome) ?? 0) + 1);
      return {
        href: `/candidates/${encodeURIComponent(person.id)}`,
        name: person.name,
        detail: story.detail,
        tone: story.outcome,
      };
    })
    .sort((a, b) => a.tone.localeCompare(b.tone) || a.name.localeCompare(b.name));

  const beats: TimelineBeat[] = [
    {
      when: SCRAPE_LABEL,
      datetime: "2025-04",
      heading: "What was recorded",
      body: `The April 2025 scrape recorded ${sites.length} candidate website${sites.length === 1 ? "" : "s"} for ${seat.name}.`,
      items: aprilItems,
    },
    {
      when: AUDIT_LABEL,
      datetime: AUDIT_ISO,
      heading: "What the audit found",
      body: `On ${AUDIT_LABEL} those URLs were requested again — ${countBits(counts)}. An HTTP success means the server answered. It does not establish that the campaign page survived.`,
      items: auditItems,
    },
  ];

  const claimPeople = onSeat.filter((person) => claims[person.id]);
  const footnotes: string[] = [];
  if (claimPeople.length) {
    const dates = [...new Set(claimPeople.map((person) => claims[person.id].checked_at).filter(Boolean))];
    const when = dates.length === 1 ? formatIsoDate(dates[0]) : "Homepage fetches";
    const datetime = dates.length === 1 ? dates[0] : undefined;
    const items: TimelineItem[] = claimPeople
      .map((person) => {
        const diff = claims[person.id];
        const deleted = diff.deleted_count ?? diff.deleted?.length ?? 0;
        const kept = diff.kept ?? 0;
        let detail: string;
        if (deleted > 0) {
          const sample = exampleSentence(diff);
          const quote = sample ? ` Example from the April text: “${clipText(sample, 160)}”` : "";
          detail = `${deleted} sentence${deleted === 1 ? "" : "s"} from the April text ${deleted === 1 ? "was" : "were"} not found on the homepage fetch of ${diff.url}.${quote}`;
        } else {
          detail = `The homepage comparison recorded no missing sentence (${kept} still present) at ${diff.url}.`;
        }
        return {
          href: `/candidates/${encodeURIComponent(person.id)}#claims`,
          name: person.name,
          detail,
          tone: deleted > 0 ? "disappeared" : "kept",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    beats.push({
      when,
      datetime,
      heading: "What happened to the words",
      body: `A homepage fetch was compared with the April site text for ${claimPeople.length} of the ${onSeat.length} candidate${onSeat.length === 1 ? "" : "s"} here. A sentence missing from that fetch is not matched to a replacement.`,
      items,
    });
    footnotes.push(PAIRING_GAP);
    const missing = onSeat.length - claimPeople.length;
    if (missing > 0) {
      footnotes.push(
        `${missing} candidate${missing === 1 ? "" : "s"} on this seat ${missing === 1 ? "has" : "have"} no sentence comparison in the snapshot.`,
      );
    }
  } else {
    footnotes.push("No sentence comparison is stored for the candidates on this seat.");
  }

  const contentPeople = onSeat.filter((person) => content[person.id]?.significance);
  if (contentPeople.length) {
    const items: TimelineItem[] = contentPeople
      .map((person) => {
        const diff = content[person.id];
        const sig = diff.significance || "unscored";
        const plain = SIGNIFICANCE_PLAIN[sig] ?? sig;
        const when = diff.snapshotTs ? formatSnapshotTs(diff.snapshotTs) : "an undated capture";
        const windowNote =
          diff.snapshotInWindow === false ? " The capture sits outside the April 2025 scrape window." : "";
        const coverage =
          typeof diff.coverage === "number" ? ` ${(diff.coverage * 100).toFixed(0)}% of April tokens were still found.` : "";
        return {
          href: `/candidates/${encodeURIComponent(person.id)}`,
          name: person.name,
          detail: `${plain} against the ${when} archive.${coverage}${windowNote} Sentence text for this comparison is absent from the snapshot.`,
          tone: sig === "major" || sig === "transformed" ? "material" : "minor",
          externalHref: diff.waybackUrl,
          externalLabel: diff.waybackUrl ? "Open the archive" : undefined,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    beats.push({
      when: "Archive sample",
      heading: "Text overlap, where it was scored",
      body: "A separate Wayback comparison scored text overlap for some candidates. It kept the score and an archive URL.",
      items,
    });
  }

  return { beats, footnote: footnotes.join(" ") };
}

function outcomeCounts(websites: SiteInput[]): Record<SiteOutcome, number> {
  const counts: Record<SiteOutcome, number> = {
    died: 0,
    parked: 0,
    redirected: 0,
    surname_absent: 0,
    answered: 0,
    other: 0,
    unaudited: 0,
  };
  for (const site of websites) counts[siteOutcome(site)] += 1;
  return counts;
}

export function changeLabels(
  websites: SiteInput[],
  claim: ClaimDiffRow | null | undefined,
  content: ContentDiffInput | null | undefined,
): string[] {
  const counts = outcomeCounts(websites);
  const labels: string[] = [];
  if (counts.died) labels.push("Site no longer resolved");
  if (counts.parked) labels.push("For-sale or parked domain");
  if (counts.redirected) labels.push("Redirected");
  if (counts.surname_absent) labels.push("Surname absent from the response");
  if (counts.other) labels.push("Other HTTP result");
  const sig = content?.significance;
  if (sig === "major" || sig === "transformed") labels.push(`Material content change (${sig})`);
  const deleted = claim?.deleted_count ?? 0;
  const added = claim?.added_count ?? 0;
  if (deleted > 0) labels.push(`Sentences no longer found (${deleted})`);
  else if (added > 0) labels.push(`New homepage sentences (${added}), not matched to a removed line`);
  return labels;
}

export function candidateSummary(
  person: PersonInput,
  claim: ClaimDiffRow | null | undefined,
  content: ContentDiffInput | null | undefined,
): string {
  const labels = changeLabels(person.websites, claim, content);
  return labels.length ? labels.join(" · ") : NO_CHANGE_SUMMARY;
}

export function candidateFingerprint(
  person: PersonInput,
  claim: ClaimDiffRow | null | undefined,
  content: ContentDiffInput | null | undefined,
): string {
  const counts = outcomeCounts(person.websites);
  const sig = content?.significance === "major" || content?.significance === "transformed" ? content.significance : "";
  return [
    "v1",
    `audit=${AUDIT_ISO}`,
    `claims=${claim?.checked_at ?? "-"}`,
    `died=${counts.died}`,
    `parked=${counts.parked}`,
    `redirected=${counts.redirected}`,
    `answered=${counts.answered}`,
    `surname=${counts.surname_absent}`,
    `other=${counts.other}`,
    `unaudited=${counts.unaudited}`,
    `material=${sig}`,
    `deleted=${claim?.deleted_count ?? 0}`,
    `added=${claim?.added_count ?? 0}`,
  ].join("|");
}

export function candidateFollowRecord(
  person: PersonInput,
  claim: ClaimDiffRow | null | undefined,
  content: ContentDiffInput | null | undefined,
): FollowRecord {
  return {
    fingerprint: candidateFingerprint(person, claim, content),
    summary: candidateSummary(person, claim, content),
    href: `/candidates/${encodeURIComponent(person.id)}`,
  };
}

export function seatWebsites(person: PersonInput, seatName: string, seatSlug: string): SiteInput[] {
  return person.websites.filter((site) => websiteOnSeat(site, seatName, seatSlug));
}

export function seatFollowRecord(
  slug: string,
  name: string,
  people: PersonInput[],
  claims: Record<string, ClaimDiffRow>,
  content: Record<string, ContentDiffInput>,
): FollowRecord {
  const onSeat = peopleOnSeat(people, name, slug);
  const websites = onSeat.flatMap((person) => seatWebsites(person, name, slug));
  let deleted = 0;
  let added = 0;
  let checked = "-";
  const significances: string[] = [];
  for (const person of onSeat) {
    const claim = claims[person.id];
    if (claim) {
      deleted += claim.deleted_count ?? 0;
      added += claim.added_count ?? 0;
      if (checked === "-" && claim.checked_at) checked = claim.checked_at;
    }
    const sig = content[person.id]?.significance;
    if (sig) significances.push(sig);
  }
  const material = significances.includes("transformed")
    ? "transformed"
    : significances.includes("major")
      ? "major"
      : "";
  const fakePerson: PersonInput = { id: slug, name, websites };
  const fakeClaim: ClaimDiffRow = {
    url: "",
    checked_at: checked,
    deleted_count: deleted,
    added_count: added,
  };
  const fakeContent: ContentDiffInput | null = material ? { significance: material } : null;
  return {
    fingerprint: `seat|${slug}|${candidateFingerprint(fakePerson, fakeClaim, fakeContent)}`,
    summary: candidateSummary(fakePerson, fakeClaim, fakeContent),
    href: `/constituencies/${slug}`,
  };
}

export function correctionIssueDraft(
  person: PersonInput,
  claim: ClaimDiffRow | null | undefined,
): { title: string; body: string; href: string } {
  const lines = [
    "This is a suggestion about a Civicord public record. Filing it does not edit the record. The April 2025 scrape and the later checks stay citable.",
    "",
    `Candidate: ${person.name}`,
    `Democracy Club person ID: ${person.id}`,
    `Record: ${RECORD_ORIGIN}/candidates/${encodeURIComponent(person.id)}`,
    "",
    "What the record currently says:",
    ...person.websites.map((site) => {
      const audit = site.audit?.statusClass
        ? {
            statusClass: site.audit.statusClass,
            statusCode: site.audit.statusCode,
            redirected: site.audit.redirected,
            finalUrl: site.audit.finalUrl,
            nameFound: site.audit.nameFound,
          }
        : null;
      return `- ${describeWebsite({ url: site.url, audit })}`;
    }),
  ];
  if (claim && ((claim.deleted_count ?? 0) > 0 || (claim.added_count ?? 0) > 0)) {
    lines.push(
      "",
      `Sentence comparison (${formatIsoDate(claim.checked_at)} homepage of ${claim.url}): ${claim.deleted_count ?? 0} April sentences were not found; ${claim.added_count ?? 0} later sentences are not matched to them.`,
    );
    const sample = claim.deleted?.find((sentence) => sentence?.text)?.text;
    if (sample) lines.push(`Example no longer found: ${clipText(sample, 240)}`);
  } else {
    lines.push("", "No sentence-level before/after is stored for this record.");
  }
  lines.push(
    "",
    "What looks wrong:",
    "",
    "Who is replying (candidate or agent). A campaign-domain email helps a maintainer check. This page does not send email.",
    "",
  );
  const title = `Record reply: ${person.name} (${person.id})`;
  const body = lines.join("\n");
  const url = new URL("https://github.com/sneldao/civicord/issues/new");
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  return { title, body, href: url.toString() };
}

export function parkedHostCount(people: PersonInput[]): number {
  let n = 0;
  for (const person of people) {
    for (const site of person.websites) {
      if (siteOutcome(site) === "parked") n += 1;
    }
  }
  return n;
}
