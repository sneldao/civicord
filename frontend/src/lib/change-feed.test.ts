import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NO_CHANGE_SUMMARY,
  PAIRING_GAP,
  beforeAfterPairs,
  candidateFollowRecord,
  correctionIssueDraft,
  journalistTips,
  listGap,
  seatFollowRecord,
  seatTimeline,
  siteOutcome,
  unmatchedAdditions,
} from "./change-feed.ts";

const here = dirname(fileURLToPath(import.meta.url));

test("a disappeared sentence is before/after with an explicit gap", () => {
  const pairs = beforeAfterPairs("1", "Ada Example", {
    url: "https://ada.example",
    checked_at: "2026-09-21",
    scope_note: "april site-wide vs recrawl homepage",
    deleted_count: 1,
    added_count: 0,
    deleted: [{ text: "We will fund the NHS and cut waiting lists this year.", topics: ["nhs"] }],
    added: [],
  });
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].afterKind, "not_found");
  assert.equal(pairs[0].beforeLabel, "April 2025");
  assert.equal(pairs[0].afterLabel, "21 September 2026");
  assert.match(pairs[0].citation, /We will fund the NHS/);
  assert.match(pairs[0].citation, /https:\/\/ada\.example/);
  assert.match(pairs[0].citation, /not found/);
  assert.match(pairs[0].citation, /2026-09-21|21 September 2026/);
  assert.match(pairs[0].citation, new RegExp(PAIRING_GAP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal("replacement" in pairs[0], false);
});

test("added sentences are not treated as the replacement", () => {
  const diff = {
    url: "https://ada.example",
    checked_at: "2026-09-21",
    scope_note: "april site-wide vs recrawl homepage",
    deleted_count: 1,
    added_count: 1,
    deleted: [{ text: "We will build affordable homes in this town.", topics: ["housing"] }],
    added: [{ text: "Brand new homepage slogan about lower taxes today.", topics: ["tax"] }],
  };
  const pairs = beforeAfterPairs("1", "Ada Example", diff);
  const additions = unmatchedAdditions(diff);
  assert.equal(pairs[0].afterKind, "not_found");
  assert.doesNotMatch(pairs[0].citation, /lower taxes/);
  assert.match(additions[0].gap, /No April sentence is matched/);
  assert.equal(additions[0].text.includes("lower taxes"), true);
});

test("list gap admits when the snapshot quotes only some sentences", () => {
  const gap = listGap({
    url: "https://ada.example",
    checked_at: "2026-09-21",
    deleted_count: 30,
    deleted: [{ text: "One stored sentence about housing supply here.", topics: ["housing"] }],
  });
  assert.match(gap ?? "", /1 of 30/);
});

test("journalist tips quote a real deleted sentence and skip boilerplate", () => {
  const tips = journalistTips({
    "1": {
      name: "Ada Example",
      url: "https://ada.example",
      checked_at: "2026-09-21",
      scope_note: "april site-wide vs recrawl homepage",
      deleted_count: 2,
      deleted: [
        { text: "Skip to main content and read all news stories from the campaign office today.", topics: ["democracy"] },
        { text: "We will recruit more nurses and cut NHS waiting lists in this term.", topics: ["nhs"] },
      ],
      added: [{ text: "A totally different added sentence about tax cuts for workers.", topics: ["tax"] }],
    },
    "2": {
      name: "No Topic",
      url: "https://no.example",
      checked_at: "2026-09-21",
      deleted_count: 1,
      deleted: [{ text: "This sentence is long enough to look like a claim but has no topic tag at all.", topics: [] }],
    },
  });
  assert.equal(tips.length, 1);
  assert.equal(tips[0].personId, "1");
  assert.match(tips[0].beforeText, /NHS/);
  assert.match(tips[0].citation, /not found/);
  assert.doesNotMatch(tips[0].citation, /tax cuts/);
  assert.equal(tips[0].url, "https://ada.example");
});

test("seat timeline uses audit outcomes and does not invent a claim pairing", () => {
  const people = [
    {
      id: "9",
      name: "Pat Died",
      websites: [
        {
          url: "https://pat.example",
          parties: ["Independent"],
          posts: ["Example Seat"],
          audit: { statusClass: "dns_error", statusCode: null, redirected: false, finalUrl: null, nameFound: null },
        },
      ],
    },
    {
      id: "10",
      name: "Dawn Example",
      websites: [
        {
          url: "https://dawn.example",
          parties: ["Independent"],
          posts: ["Example Seat"],
          audit: {
            statusClass: "live",
            statusCode: 200,
            redirected: true,
            finalUrl: "https://expireddomains.com/domain/dawn.example",
            nameFound: true,
          },
        },
      ],
    },
    {
      id: "11",
      name: "Other Seat",
      websites: [
        {
          url: "https://other.example",
          parties: ["Labour Party"],
          posts: ["Somewhere Else"],
          audit: { statusClass: "live", statusCode: 200, redirected: false, finalUrl: null, nameFound: true },
        },
      ],
    },
  ];
  const timeline = seatTimeline(
    { name: "Example Seat", slug: "example-seat" },
    people,
    {
      "10": {
        name: "Dawn Example",
        url: "https://dawn.example",
        checked_at: "2026-09-21",
        scope_note: "april site-wide vs recrawl homepage",
        deleted_count: 1,
        added_count: 1,
        deleted: [{ text: "We will keep the library open on Sundays in this town.", topics: ["democracy"] }],
        added: [{ text: "Unrelated new homepage sentence about a shop opening soon.", topics: [] }],
      },
    },
    {
      "9": {
        significance: "major",
        coverage: 0.2,
        snapshotTs: "20250318070836",
        snapshotInWindow: true,
        waybackUrl: "https://web.archive.org/web/20250318070836id_/https://pat.example",
      },
    },
  );
  const flat = JSON.stringify(timeline);
  assert.match(flat, /Pat Died/);
  assert.match(flat, /Dawn Example/);
  assert.doesNotMatch(flat, /Other Seat/);
  assert.match(flat, /for-sale or parked domain/);
  assert.match(flat, /No longer resolved/);
  assert.match(flat, /library open on Sundays/);
  assert.doesNotMatch(flat, /shop opening soon/);
  assert.match(timeline.footnote, /No replacement sentence is matched/);
  assert.match(flat, /Sentence text for this comparison is absent/);
  assert.match(flat, /7 September 2026/);
  assert.match(flat, /April 2025/);
});

test("empty seat states the gap instead of a blank audit", () => {
  const timeline = seatTimeline({ name: "Empty Seat", slug: "empty-seat" }, [], {}, {});
  assert.match(timeline.beats[0].body, /No candidate website/);
  assert.equal(timeline.beats.length, 1);
});

test("parking host is for-sale even when the surname is absent", () => {
  assert.equal(
    siteOutcome({
      url: "https://gina.example",
      audit: {
        statusClass: "live",
        statusCode: 200,
        redirected: true,
        finalUrl: "https://www.expireddomains.com/domain/gina.example",
        nameFound: false,
      },
    }),
    "parked",
  );
});

test("follow summary and reply link stay inside the snapshots", () => {
  const person = {
    id: "5693",
    name: "Dawn Furness",
    websites: [
      {
        url: "https://dawnfurness.com",
        audit: {
          statusClass: "live",
          statusCode: 200,
          redirected: true,
          finalUrl: "https://expireddomains.com/domain/dawnfurness.com",
          nameFound: true,
        },
      },
    ],
  };
  const follow = candidateFollowRecord(person, null, null);
  assert.match(follow.summary, /For-sale or parked domain/);
  assert.match(follow.fingerprint, /parked=1/);
  assert.equal(follow.href, "/candidates/5693");
  const quiet = candidateFollowRecord(
    {
      id: "1",
      name: "Still There",
      websites: [
        {
          url: "https://still.example",
          audit: { statusClass: "live", statusCode: 200, redirected: false, finalUrl: null, nameFound: true },
        },
      ],
    },
    null,
    null,
  );
  assert.equal(quiet.summary, NO_CHANGE_SUMMARY);

  const draft = correctionIssueDraft(person, null);
  const url = new URL(draft.href);
  assert.equal(url.hostname, "github.com");
  assert.equal(url.pathname, "/sneldao/civicord/issues/new");
  assert.match(url.searchParams.get("body") ?? "", /5693/);
  assert.match(url.searchParams.get("body") ?? "", /does not edit the record/);
  assert.doesNotMatch(draft.href, /mailto:/i);
  assert.doesNotMatch(draft.body, /mailto:/i);
});

test("seat follow fingerprint changes when a disappeared claim is added", () => {
  const people = [
    {
      id: "3",
      name: "Sam",
      websites: [
        {
          url: "https://sam.example",
          posts: ["Seat"],
          audit: { statusClass: "live", statusCode: 200, redirected: false, finalUrl: null, nameFound: true },
        },
      ],
    },
  ];
  const before = seatFollowRecord("seat", "Seat", people, {}, {});
  const after = seatFollowRecord(
    "seat",
    "Seat",
    people,
    {
      "3": {
        url: "https://sam.example",
        checked_at: "2026-09-21",
        deleted_count: 4,
        added_count: 0,
        deleted: [],
      },
    },
    {},
  );
  assert.notEqual(before.fingerprint, after.fingerprint);
  assert.match(after.summary, /Sentences no longer found \(4\)/);
  assert.equal(before.summary, NO_CHANGE_SUMMARY);
});

test("real claim snapshot: disappeared text is cited and the added line is not the after", () => {
  const claims = JSON.parse(readFileSync(join(here, "../data/claim_diffs.json"), "utf8")).byPerson;
  const thewliss = claims["5784"];
  assert.ok(thewliss, "expected person 5784 in claim_diffs.json");
  const pairs = beforeAfterPairs("5784", thewliss.name, thewliss);
  assert.ok(pairs.length > 0);
  assert.equal(pairs[0].afterKind, "not_found");
  assert.equal(pairs[0].url, thewliss.url);
  assert.match(pairs[0].citation, /21 September 2026/);
  assert.match(pairs[0].citation, /not found/);
  assert.ok(pairs[0].citation.includes(pairs[0].beforeText));

  const both = claims["3454"];
  const bothPairs = beforeAfterPairs("3454", both.name, both);
  const added = both.added?.[0]?.text ?? "";
  assert.ok(added.length > 40);
  assert.equal(bothPairs[0].afterKind, "not_found");
  assert.equal(bothPairs.some((pair) => pair.citation.includes(added)), false);

  const tips = journalistTips(claims, 12);
  assert.equal(tips.length, 12);
  for (const tip of tips) {
    const row = claims[tip.personId];
    assert.ok((row.deleted ?? []).some((sentence: { text: string }) => sentence.text === tip.beforeText));
    assert.match(tip.citation, /not found/);
    assert.match(tip.citation, /No replacement sentence is matched/);
    for (const sentence of row.added ?? []) {
      assert.equal(tip.citation.includes(sentence.text), false);
    }
  }
});
