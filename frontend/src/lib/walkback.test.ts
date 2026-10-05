import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isReadableWalkback, pickLeadWalkback, scopeExplanation } from "./walkback.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

test("readable walk-back sentences are complete and not navigation chrome", () => {
  assert.equal(
    isReadableWalkback(
      "As your MP I will champion council housing as I have always done, and put the community at its heart.",
    ),
    true,
  );
  assert.equal(isReadableWalkback("Read More short."), false);
  assert.equal(isReadableWalkback("Too short to be a sentence."), false);
});

test("lead sentence is taken from a deleted claim, not invented", () => {
  const claims = JSON.parse(readFileSync(path.join(here, "../data/claim_diffs.json"), "utf8"));
  const people = JSON.parse(readFileSync(path.join(here, "../data/candidates.json"), "utf8"));
  const lead = pickLeadWalkback(claims, people);
  assert.ok(lead);
  const row = claims.byPerson[lead.personId];
  assert.ok(row, "lead person exists in claim diffs");
  assert.equal(lead.url, row.url);
  assert.equal(lead.name, row.name);
  assert.ok(
    (row.deleted ?? []).some((c) => c.text === lead.text),
    "lead text is a stored deleted sentence",
  );
  assert.match(lead.text, /\b(As your MP I will|If elected I will|As an MP I will)\b/);
  assert.ok(lead.party);
  assert.ok(lead.seat);
  assert.equal(scopeExplanation(lead.scopeNote).includes("homepage"), true);
});

test("picker prefers the lowest person id inside the strictest tier", () => {
  const claims = {
    byPerson: {
      "20": {
        name: "Later",
        url: "https://later.example",
        checked_at: "2026-09-21",
        scope_note: "april site-wide vs recrawl homepage",
        deleted: [
          {
            text: "If elected I will fund the local clinic, keep the library open, and publish a surgery diary every month.",
            topics: ["nhs"],
          },
        ],
      },
      "3": {
        name: "Earlier",
        url: "https://earlier.example",
        checked_at: "2026-09-21",
        scope_note: "april site-wide vs recrawl homepage",
        deleted: [
          {
            text: "As your MP I will keep the weekly surgery, answer casework in public, and report the constituency grants.",
            topics: ["democracy"],
          },
        ],
      },
    },
  };
  const people = [
    { id: "20", websites: [{ parties: ["Labour Party"], posts: ["Later Seat"] }] },
    { id: "3", websites: [{ parties: ["Green Party"], posts: ["Earlier Seat"] }] },
  ];
  const lead = pickLeadWalkback(claims, people);
  assert.equal(lead?.personId, "3");
  assert.equal(lead?.party, "Green Party");
  assert.equal(lead?.seat, "Earlier Seat");
  assert.equal(lead?.text.includes("weekly surgery"), true);
});
