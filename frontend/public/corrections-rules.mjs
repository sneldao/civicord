// Single source of truth for correction acceptance rules.
// Imported by the Cloudflare Pages worker (./_worker.js), the dev/preview
// server plugin (../src/lib/corrections.mjs), and the browser form.
// A valid submission is queued for review; it is never an edit of the
// audit, the scrape, or the on-chain record.

export const QUEUE_NOTE =
  "Queued for review. This request does not change the audit, the scrape, the sentence comparison, or the on-chain record.";

const TEXT_MIN = 20;
const TEXT_MAX = 2000;
const CONTACT_MAX = 200;
const NAME_MAX = 200;
const QUEUE_MAX = 500;
const BODY_MAX = 20_000;

export function validateCorrection(input) {
  const errors = [];
  const body = input && typeof input === "object" ? input : {};
  if (String(body.fax_number ?? "").trim()) {
    return { ok: false, errors: ["rejected"] };
  }

  const personId = String(body.personId ?? "").trim();
  if (!/^\d{1,12}$/.test(personId)) errors.push("personId");

  const whatIsWrong = String(body.whatIsWrong ?? "").trim();
  if (whatIsWrong.length < TEXT_MIN || whatIsWrong.length > TEXT_MAX) errors.push("whatIsWrong");

  const proposedCorrection = String(body.proposedCorrection ?? "").trim();
  if (proposedCorrection.length < TEXT_MIN || proposedCorrection.length > TEXT_MAX) {
    errors.push("proposedCorrection");
  }

  const sourceUrl = String(body.sourceUrl ?? "").trim();
  let parsed = null;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    parsed = null;
  }
  const protocolOk = parsed && (parsed.protocol === "http:" || parsed.protocol === "https:");
  const hostOk = parsed && parsed.hostname.includes(".") && !parsed.username && !parsed.password;
  if (!protocolOk || !hostOk) errors.push("sourceUrl");

  const contact = String(body.contact ?? "").trim();
  if (contact.length > CONTACT_MAX) errors.push("contact");

  const personName = String(body.personName ?? "").trim().slice(0, NAME_MAX);

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      personId,
      personName,
      recordUrl: `/candidates/${personId}`,
      whatIsWrong,
      proposedCorrection,
      sourceUrl,
      contact,
    },
  };
}

export function newCorrectionId(now = new Date()) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `cor_${now.getTime().toString(36)}_${rand}`;
}

export function buildQueuedRequest(value, now = new Date()) {
  return {
    id: newCorrectionId(now),
    status: "queued",
    effect: "request",
    receivedAt: now.toISOString(),
    personId: value.personId,
    personName: value.personName,
    recordUrl: value.recordUrl,
    whatIsWrong: value.whatIsWrong,
    proposedCorrection: value.proposedCorrection,
    sourceUrl: value.sourceUrl,
    contact: value.contact,
  };
}

export function publicCorrection(request) {
  const { contact, ...rest } = request;
  return { ...rest, contactProvided: Boolean(contact) };
}

export function appendRequest(queue, request) {
  const next = [...(Array.isArray(queue) ? queue : []), request];
  if (next.length > QUEUE_MAX) return next.slice(next.length - QUEUE_MAX);
  return next;
}

export function parseCorrectionBody(raw, contentType) {
  const type = String(contentType ?? "");
  const text = String(raw ?? "");
  if (text.length > BODY_MAX) return { ok: false, error: "too_large" };
  try {
    if (type.includes("application/json")) {
      const parsed = JSON.parse(text || "null");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "invalid_json" };
      }
      return { ok: true, value: parsed };
    }
    const params = new URLSearchParams(text);
    return { ok: true, value: Object.fromEntries(params.entries()) };
  } catch {
    return { ok: false, error: "invalid_body" };
  }
}
