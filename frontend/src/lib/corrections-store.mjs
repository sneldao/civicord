import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  appendRequest,
  buildQueuedRequest,
  publicCorrection,
  validateCorrection,
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
  const validated = validateCorrection(input);
  if (!validated.ok) return validated;
  const request = buildQueuedRequest(validated.value, now);
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
