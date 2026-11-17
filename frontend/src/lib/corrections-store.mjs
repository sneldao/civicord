import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  appendRequest,
  buildDecision,
  buildQueuedClaim,
  buildQueuedRequest,
  markDecided,
  publicCorrection,
  validateClaim,
  validateCorrection,
  validateDecision,
} from "./corrections.mjs";

export async function readQueue(file) {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
}

export async function writeQueue(file, queue) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(queue, null, 2) + "\n", "utf8");
}

export async function submitCorrection(file, input, now = new Date()) {
  const isClaim = input && String(input.kind ?? "") === "claim";
  const validated = isClaim ? validateClaim(input) : validateCorrection(input);
  if (!validated.ok) return validated;
  const request = isClaim
    ? buildQueuedClaim(validated.value, now)
    : buildQueuedRequest(validated.value, now);
  const queue = appendRequest(await readQueue(file), request);
  await writeQueue(file, queue);
  return { ok: true, request };
}

export async function listCorrections(file, personId) {
  const queue = await readQueue(file);
  const id = String(personId ?? "").trim();
  const rows = id ? queue.filter((r) => r.personId === id) : queue;
  return rows.map(publicCorrection);
}

// Dev/preview decisions file — sibling of the queue file, mirrors the
// worker's corrections-decisions-v1 KV key. Falls back to a .decisions.json
// suffix so a custom CIVICORD_CORRECTION_QUEUE path can never be clobbered.
export function decisionsFileFor(queueFile) {
  if (/correction-queue(\.json)?$/.test(queueFile)) {
    return queueFile.replace(/correction-queue(\.json)?$/, "correction-decisions$1");
  }
  return `${queueFile.replace(/\.json$/, "")}.decisions.json`;
}

export async function submitDecision(queueFile, decisionsFile, input, now = new Date()) {
  const validated = validateDecision(input);
  if (!validated.ok) return { ok: false, status: 400, errors: validated.errors };
  const queue = await readQueue(queueFile);
  const row = queue.find((r) => r.id === validated.value.id);
  if (!row) return { ok: false, status: 404, error: "not_found" };
  if (row.status && row.status !== "queued") {
    return { ok: false, status: 409, error: "already_decided", current: row.status };
  }
  markDecided(row, validated.value, now);
  await writeQueue(queueFile, queue);
  const decision = buildDecision(row, validated.value, now);
  const log = appendRequest(await readQueue(decisionsFile), decision);
  await writeQueue(decisionsFile, log);
  return { ok: true, decision };
}

export async function listDecisions(decisionsFile) {
  return (await readQueue(decisionsFile)).slice().reverse();
}
