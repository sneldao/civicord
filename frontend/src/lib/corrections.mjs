// Dev/preview + browser entry point for correction rules.
// The rules themselves live in public/corrections-rules.mjs so the Cloudflare
// Pages worker and this module can never drift apart.

export {
  QUEUE_NOTE,
  validateCorrection,
  newCorrectionId,
  buildQueuedRequest,
  publicCorrection,
  appendRequest,
  parseCorrectionBody,
} from "../../public/corrections-rules.mjs";

import { QUEUE_NOTE, publicCorrection } from "../../public/corrections-rules.mjs";

export function correctionResponse(result, accept) {
  const wantsHtml = String(accept ?? "").includes("text/html") && !String(accept ?? "").includes("application/json");
  if (!result.ok) {
    const payload = { error: result.error || "invalid", fields: result.errors || [], note: QUEUE_NOTE };
    if (wantsHtml) {
      const fields = (result.errors || [result.error || "invalid"]).join(", ");
      return {
        status: result.status || 400,
        contentType: "text/html; charset=utf-8",
        body: `<!doctype html><meta charset="utf-8"><title>Correction not queued</title><p>Not queued (${escapeHtml(fields)}). Nothing on the record was changed.</p>`,
      };
    }
    return {
      status: result.status || 400,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(payload),
    };
  }
  const pub = publicCorrection(result.request);
  if (wantsHtml) {
    return {
      status: 201,
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><meta charset="utf-8"><title>Correction queued</title><p>${escapeHtml(QUEUE_NOTE)}</p><p>Request <code>${escapeHtml(pub.id)}</code> for <a href="${escapeHtml(pub.recordUrl)}#correction">the candidate record</a>.</p>`,
    };
  }
  return {
    status: 201,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify({ ...pub, note: QUEUE_NOTE }),
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
