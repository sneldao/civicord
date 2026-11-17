import {
  correctionResponse,
  parseCorrectionBody,
  DECISION_NOTE,
  QUEUE_NOTE,
} from "./corrections.mjs";
import {
  decisionsFileFor,
  listCorrections,
  listDecisions,
  submitCorrection,
  submitDecision,
} from "./corrections-store.mjs";
import path from "node:path";

export function correctionQueueFile(frontendRoot) {
  if (process.env.CIVICORD_CORRECTION_QUEUE) return process.env.CIVICORD_CORRECTION_QUEUE;
  return path.join(frontendRoot, ".data", "correction-queue.json");
}

export function correctionsQueuePlugin(frontendRoot) {
  const file = correctionQueueFile(frontendRoot);
  return {
    name: "civicord-corrections-queue",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        handleCorrectionRequest(req, res, file).then((handled) => {
          if (!handled) next();
        }, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        handleCorrectionRequest(req, res, file).then((handled) => {
          if (!handled) next();
        }, next);
      });
    },
  };
}

function pathnameOf(req) {
  const raw = req.url || "/";
  return raw.split("?")[0];
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

// Dev parity for the worker's REVIEW_TOKEN gate: CIVICORD_REVIEW_TOKEN in
// the environment authorizes POST /api/corrections/decide; unset → 501.
function reviewAuthorizedDev(req) {
  const token = process.env.CIVICORD_REVIEW_TOKEN || "";
  if (!token) return { ok: false, status: 501, error: "review_not_configured" };
  if ((req.headers.authorization || "") !== `Bearer ${token}`) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}

export async function handleCorrectionRequest(req, res, file) {
  const pathname = pathnameOf(req);
  if (pathname === "/api/corrections/decisions") {
    res.setHeader("cache-control", "no-store");
    res.setHeader("access-control-allow-origin", "*");
    if (req.method !== "GET") {
      return sendJson(res, 405, { error: "method_not_allowed", note: DECISION_NOTE }), true;
    }
    const decisions = await listDecisions(decisionsFileFor(file));
    return sendJson(res, 200, { decisions, effect: "review-log", note: DECISION_NOTE }), true;
  }
  if (pathname === "/api/corrections/decide") {
    res.setHeader("cache-control", "no-store");
    res.setHeader("access-control-allow-origin", "*");
    if (req.method !== "POST") {
      return sendJson(res, 405, { error: "method_not_allowed", note: DECISION_NOTE }), true;
    }
    const auth = reviewAuthorizedDev(req);
    if (!auth.ok) return sendJson(res, auth.status, { error: auth.error, note: DECISION_NOTE }), true;
    const raw = await readBody(req);
    const parsed = parseCorrectionBody(raw, req.headers["content-type"] || "");
    if (!parsed.ok) return sendJson(res, 400, { error: parsed.error, note: DECISION_NOTE }), true;
    const result = await submitDecision(file, decisionsFileFor(file), parsed.value);
    if (!result.ok) {
      return sendJson(
        res,
        result.status || 400,
        { error: result.error || "invalid", fields: result.errors, note: DECISION_NOTE },
      ), true;
    }
    return sendJson(res, 200, { ...result.decision, note: DECISION_NOTE }), true;
  }
  if (pathname !== "/api/corrections") return false;

  res.setHeader("cache-control", "no-store");
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type, accept");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }

  if (req.method === "GET") {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const personId = (url.searchParams.get("personId") || "").trim();
    if (url.searchParams.get("all") === "1") {
      const requests = await listCorrections(file, "");
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ requests, stored: "queue", effect: "request", note: QUEUE_NOTE }));
      return true;
    }
    if (!/^\d{1,12}$/.test(personId)) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "personId_required", note: QUEUE_NOTE }));
      return true;
    }
    const requests = await listCorrections(file, personId);
    const body = JSON.stringify({ requests, stored: "queue", effect: "request", note: QUEUE_NOTE });
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(body);
    return true;
  }

  if (req.method === "POST") {
    const raw = await readBody(req);
    const contentType = req.headers["content-type"] || "";
    const accept = req.headers.accept || "";
    const parsed = parseCorrectionBody(raw, contentType);
    if (!parsed.ok) {
      const response = correctionResponse({ ok: false, error: parsed.error, status: 400 }, accept);
      res.statusCode = response.status;
      res.setHeader("content-type", response.contentType);
      res.end(response.body);
      return true;
    }
    const result = await submitCorrection(file, parsed.value);
    const response = correctionResponse(
      result.ok ? { ok: true, request: result.request } : { ok: false, errors: result.errors, status: 400 },
      accept,
    );
    res.statusCode = response.status;
    res.setHeader("content-type", response.contentType);
    res.end(response.body);
    return true;
  }

  res.statusCode = 405;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "method_not_allowed", note: QUEUE_NOTE }));
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
