import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_DATE, RECORD_ORIGIN, candidateCitation, describeWebsite, recordVerdictCopy, statusLabels } from "./record-copy.ts";

test("live verdict copy reports HTTP responses, not content survival", () => {
  const [title, body] = recordVerdictCopy("live", "Dawn Furness");
  assert.match(body, /successful HTTP responses/);
  assert.match(body, /does not establish/);
  assert.doesNotMatch(body, /still mentions/);
  assert.doesNotMatch(`${title} ${body}`, /campaign survived/);
});

test("describeWebsite reports HTTP result, redirect and heuristic signal", () => {
  const out = describeWebsite({
    url: "https://example.org",
    audit: {
      statusClass: "live",
      statusCode: 200,
      redirected: true,
      finalUrl: "https://example.org/for-sale",
      nameFound: true,
    },
  });
  assert.match(out, /HTTP 200/);
  assert.match(out, /https:\/\/example\.org\/for-sale/);
  assert.match(out, /heuristic only/);
  assert.doesNotMatch(out, /campaign survived/);
});

test("describeWebsite handles unaudited sites", () => {
  const out = describeWebsite({ url: "https://example.org" });
  assert.match(out, /not audited/);
});

test("candidateCitation without audit says so and omits audit date", () => {
  const citation = candidateCitation({
    id: "1",
    name: "No Audit",
    websites: [{ url: "https://example.org" }],
  });
  assert.match(citation, /No audit available/);
  assert.doesNotMatch(citation, /Audit date:/);
});

test("candidateCitation cites audit date, canonical URL, sources and limits", () => {
  const citation = candidateCitation({
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
  });
  assert.match(citation, new RegExp(`Audit date: ${AUDIT_DATE}`));
  assert.match(citation, new RegExp(`${RECORD_ORIGIN.replace(/[/.]/g, "\\$&")}/candidates/5693`));
  assert.match(citation, /Campaign Lab April 2025 scrape/);
  assert.match(citation, /Sepolia testnet/);
  assert.match(citation, /full content is not stored on-chain/);
  assert.match(citation, /expireddomains\.com\/domain\/dawnfurness\.com/);
});

test("describeWebsite covers false, null and unknown signals", () => {
  const absent = describeWebsite({
    url: "https://a.example",
    audit: { statusClass: "live", statusCode: 200, redirected: false, finalUrl: null, nameFound: false },
  });
  assert.match(absent, /Surname not found/);
  const unassessed = describeWebsite({
    url: "https://b.example",
    audit: { statusClass: "live", statusCode: 200, redirected: false, finalUrl: null, nameFound: null },
  });
  assert.match(unassessed, /Not assessed/);
  const odd = describeWebsite({
    url: "https://c.example",
    audit: { statusClass: "weird_class", statusCode: null, redirected: false, finalUrl: null, nameFound: null },
  });
  assert.match(odd, /weird_class/);
});

test("candidateCitation includes every recorded website", () => {
  const citation = candidateCitation({
    id: "2",
    name: "Two Sites",
    websites: [
      { url: "https://one.example", audit: { statusClass: "live", statusCode: 200, redirected: false, finalUrl: null, nameFound: true } },
      { url: "https://two.example", audit: { statusClass: "dns_error", statusCode: null, redirected: false, finalUrl: null, nameFound: null } },
    ],
  });
  assert.match(citation, /https:\/\/one\.example/);
  assert.match(citation, /https:\/\/two\.example/);
  assert.match(citation, /DNS failure/);
});

test("statusLabels covers the live class", () => {
  assert.equal(statusLabels.live, "Responding");
});
