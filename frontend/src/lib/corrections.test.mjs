import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { once } from "node:events";
import { QUEUE_NOTE, validateCorrection, validateDecision } from "./corrections.mjs";
import {
  decisionsFileFor,
  listCorrections,
  listDecisions,
  submitCorrection,
  submitDecision,
} from "./corrections-store.mjs";
import { handleCorrectionRequest } from "./corrections-plugin.mjs";

const good = {
  personId: "38841",
  personName: "Margaret Mullane",
  whatIsWrong: "The record still shows a sentence the campaign says was from a draft page.",
  proposedCorrection: "Note that the sentence was on the April 2025 about page, not the current homepage.",
  sourceUrl: "https://margaretmullane.co.uk/about",
  contact: "ada@example.com",
};

test("a sourced correction is queued and does not drop the source", () => {
  const result = validateCorrection(good);
  assert.equal(result.ok, true);
  assert.equal(result.value.sourceUrl, good.sourceUrl);
  assert.equal(result.value.recordUrl, "/candidates/38841");
});

test("unsourced or unsafe corrections are refused", () => {
  assert.equal(validateCorrection({ ...good, sourceUrl: "" }).ok, false);
  assert.equal(validateCorrection({ ...good, sourceUrl: "javascript:alert(1)" }).ok, false);
  assert.equal(validateCorrection({ ...good, sourceUrl: "https://user:pass@example.com/a" }).ok, false);
  assert.equal(validateCorrection({ ...good, whatIsWrong: "too short" }).ok, false);
  assert.equal(validateCorrection({ ...good, fax_number: "spam" }).ok, false);
});

test("the queue stores a request and leaves it unapplied", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "civicord-corrections-"));
  const file = path.join(dir, "queue.json");
  const saved = await submitCorrection(file, good, new Date("2026-10-04T12:00:00Z"));
  assert.equal(saved.ok, true);
  assert.equal(saved.request.status, "queued");
  assert.equal(saved.request.effect, "request");
  const listed = await listCorrections(file, "38841");
  assert.equal(listed.length, 1);
  assert.equal(listed[0].sourceUrl, good.sourceUrl);
  assert.equal(listed[0].proposedCorrection, good.proposedCorrection);
  assert.equal("contact" in listed[0], false);
  assert.equal(listed[0].contactProvided, true);
  const raw = JSON.parse(await readFile(file, "utf8"));
  assert.equal(raw[0].contact, good.contact);
  assert.equal(raw[0].status, "queued");
  const other = await listCorrections(file, "5693");
  assert.equal(other.length, 0);
});

test("POST /api/corrections persists and GET returns the same request", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "civicord-corrections-"));
  const file = path.join(dir, "queue.json");
  const server = createServer((req, res) => {
    handleCorrectionRequest(req, res, file).then((handled) => {
      if (!handled) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  try {
    const posted = await fetch(`http://127.0.0.1:${port}/api/corrections`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(good),
    });
    assert.equal(posted.status, 201);
    const body = await posted.json();
    assert.equal(body.status, "queued");
    assert.equal(body.effect, "request");
    assert.equal(body.note, QUEUE_NOTE);
    assert.equal(body.contact, undefined);
    const unscoped = await fetch(`http://127.0.0.1:${port}/api/corrections`);
    assert.equal(unscoped.status, 400);
    assert.equal((await unscoped.json()).error, "personId_required");
    const listed = await fetch(`http://127.0.0.1:${port}/api/corrections?personId=38841`);
    const queue = await listed.json();
    assert.equal(queue.requests.length, 1);
    assert.equal(queue.requests[0].id, body.id);
    assert.equal(queue.effect, "request");
  } finally {
    server.close();
  }
});

const goodClaim = {
  kind: "claim",
  personId: "55924",
  personName: "Lenny Rolles",
  claimantName: "Lenny Rolles",
  contact: "lenny@lennyrolles.org.uk",
  role: "candidate",
  proofNote: "I can email you from the campaign domain address listed on the site footer.",
};

test("a claim is queued as a claim-request, contact stripped from the public view", async () => {
  const { validateClaim, buildQueuedClaim, publicCorrection } = await import("./corrections.mjs");
  const validated = validateClaim(goodClaim);
  assert.equal(validated.ok, true);
  const row = buildQueuedClaim(validated.value, new Date("2026-10-22T12:00:00Z"));
  assert.equal(row.kind, "claim");
  assert.equal(row.effect, "claim-request");
  assert.equal(row.status, "queued");
  assert.match(row.id, /^clm_/);
  const pub = publicCorrection(row);
  assert.equal("contact" in pub, false);
  assert.equal(pub.contactProvided, true);
  assert.equal(pub.claimantName, goodClaim.claimantName);
});

test("claims without a verifiable contact or proof are refused", async () => {
  const { validateClaim } = await import("./corrections.mjs");
  assert.equal(validateClaim({ ...goodClaim, contact: "not-an-email" }).ok, false);
  assert.equal(validateClaim({ ...goodClaim, contact: "" }).ok, false);
  assert.equal(validateClaim({ ...goodClaim, proofNote: "trust me" }).ok, false);
  assert.equal(validateClaim({ ...goodClaim, claimantName: "" }).ok, false);
  assert.equal(validateClaim({ ...goodClaim, fax_number: "spam" }).ok, false);
});

test("claim submissions flow through the store as claims", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "civicord-claims-"));
  const file = path.join(dir, "queue.json");
  const saved = await submitCorrection(file, goodClaim, new Date("2026-10-22T12:00:00Z"));
  assert.equal(saved.ok, true);
  assert.equal(saved.request.kind, "claim");
  const listed = await listCorrections(file, "55924");
  assert.equal(listed.length, 1);
  assert.equal(listed[0].kind, "claim");
  assert.equal("contact" in listed[0], false);
});

test("decision validation refuses bad ids and unknown outcomes", () => {
  assert.equal(validateDecision({ id: "cor_abc_1", decision: "accepted" }).ok, true);
  assert.equal(validateDecision({ id: "clm_abc_1", decision: "rejected", note: "duplicate" }).ok, true);
  assert.equal(validateDecision({ id: "cor_abc_1", decision: "maybe" }).ok, false);
  assert.equal(validateDecision({ id: "not-an-id", decision: "accepted" }).ok, false);
  assert.equal(validateDecision({ id: "", decision: "accepted" }).ok, false);
});

test("a decision flips the row once and lands in the public log", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "civicord-decisions-"));
  const file = path.join(dir, "correction-queue.json");
  const decisionsFile = decisionsFileFor(file);
  const saved = await submitCorrection(file, good, new Date("2026-11-16T12:00:00Z"));
  const id = saved.request.id;

  const bad = await submitDecision(file, decisionsFile, { id: "cor_missing_1", decision: "accepted" });
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 404);

  const decided = await submitDecision(
    file,
    decisionsFile,
    { id, decision: "accepted", note: "verified against the campaign domain" },
    new Date("2026-11-16T13:00:00Z"),
  );
  assert.equal(decided.ok, true);
  assert.equal(decided.decision.id, id);
  assert.equal("contact" in decided.decision, false);

  const rows = await listCorrections(file, "38841");
  assert.equal(rows[0].status, "accepted");
  const again = await submitDecision(file, decisionsFile, { id, decision: "rejected" });
  assert.equal(again.ok, false);
  assert.equal(again.status, 409);
  assert.equal(again.current, "accepted");

  const log = await listDecisions(decisionsFile);
  assert.equal(log.length, 1);
  assert.equal(log[0].decision, "accepted");
  assert.equal(log[0].note, "verified against the campaign domain");
});

test("POST /api/corrections/decide needs the review token", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "civicord-decide-"));
  const file = path.join(dir, "correction-queue.json");
  const saved = await submitCorrection(file, good);
  const server = createServer((req, res) => {
    handleCorrectionRequest(req, res, file).then((handled) => {
      if (!handled) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  const post = (headers) =>
    fetch(`http://127.0.0.1:${port}/api/corrections/decide`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ id: saved.request.id, decision: "accepted" }),
    });
  const prev = process.env.CIVICORD_REVIEW_TOKEN;
  try {
    delete process.env.CIVICORD_REVIEW_TOKEN;
    assert.equal((await post({})).status, 501);
    process.env.CIVICORD_REVIEW_TOKEN = "test-token";
    assert.equal((await post({})).status, 401);
    const ok = await post({ authorization: "Bearer test-token" });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).decision, "accepted");
    const log = await fetch(`http://127.0.0.1:${port}/api/corrections/decisions`);
    const body = await log.json();
    assert.equal(body.decisions.length, 1);
    assert.equal(body.decisions[0].id, saved.request.id);
  } finally {
    if (prev === undefined) delete process.env.CIVICORD_REVIEW_TOKEN;
    else process.env.CIVICORD_REVIEW_TOKEN = prev;
    server.close();
  }
});
