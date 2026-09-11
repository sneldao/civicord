// Pages advanced-mode worker: serves pipeline data snapshots from R2 at
// /data/*, and normalizes Bazantic gateway extensionless routes to the
// static .json assets Astro actually builds:
//   /api/constituencies       -> /api/constituencies.json
//   /api/constituencies/<slug> -> /api/constituencies/<slug>.json
//   /api/summary              -> /api/summary.json
//   /api/candidates/<id>      -> /api/candidates/<id>.json
// Unknown /api/* ids          -> JSON 404 (not the SPA HTML fallback)
// All other requests fall through to the static Astro assets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { search } = url;
    let pathname = url.pathname;

    if (pathname.startsWith("/data/")) {
      const key = pathname.slice("/data/".length);
      const object = await env.DATA.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = {
        "content-type": object.httpMetadata?.contentType || "application/json",
        "cache-control": "public, max-age=300",
      };
      return new Response(object.body, { headers });
    }

    // Gateway alias: extensionless -> .json (Bazantic defines routes without .json,
    // Astro builds ...json.ts -> ...json files). Keep .json direct hits as-is.
    let rewritten = null;
    if (pathname === "/api/constituencies" || pathname === "/api/constituencies/") {
      rewritten = "/api/constituencies.json";
    } else if (pathname.startsWith("/api/constituencies/")) {
      // Avoid rewriting og images or already-.json slugs
      if (!pathname.endsWith(".json") && !pathname.endsWith(".svg") && pathname.split("/").length === 4) {
        rewritten = pathname + ".json";
      } else if (pathname.endsWith("/") && pathname.split("/").filter(Boolean).length === 3) {
        // trailing slash slug e.g. /api/constituencies/st-ives/
        rewritten = pathname.replace(/\/$/, "") + ".json";
      }
    } else if (pathname === "/api/summary" || pathname === "/api/summary/") {
      rewritten = "/api/summary.json";
    } else if (pathname.startsWith("/api/candidates/") && !pathname.endsWith(".json") && pathname.split("/").length === 4) {
      rewritten = pathname + ".json";
    }

    if (rewritten) {
      const newUrl = new URL(request.url);
      newUrl.pathname = rewritten;
      newUrl.search = url.search;
      // If the caller passed ?country=&region=&limit= filters on the list endpoint,
      // Pages serves a static .json — it ignores search. Do the filtering in the
      // worker so ?country=Scotland and ?limit=2 actually trim (gateway also uses it).
      const needsFilter =
        (rewritten === "/api/constituencies.json" || rewritten === "/api/constituencies") &&
        (url.searchParams.has("country") || url.searchParams.has("region") || url.searchParams.has("limit"));
      if (needsFilter) {
        const baseRes = await env.ASSETS.fetch(new Request(newUrl.toString(), request));
        if (baseRes.ok) {
          try {
            const list = await baseRes.json();
            let out = Array.isArray(list) ? list : [];
            const country = url.searchParams.get("country");
            const region = url.searchParams.get("region");
            const limitRaw = url.searchParams.get("limit");
            if (country) out = out.filter((c) => (c.country ?? "").toLowerCase() === country.toLowerCase());
            if (region) out = out.filter((c) => (c.region ?? "").toLowerCase() === region.toLowerCase());
            const limit = limitRaw ? Math.min(650, Math.max(1, Number(limitRaw) || 650)) : 650;
            if (out.length > limit) out = out.slice(0, limit);
            return new Response(JSON.stringify(out, null, 2), {
              headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "public, max-age=300",
                "access-control-allow-origin": "*",
              },
            });
          } catch (_) {
            return baseRes;
          }
        }
        if (baseRes.status !== 404) return baseRes;
      } else {
        const newRequest = new Request(newUrl.toString(), request);
        const res = await env.ASSETS.fetch(newRequest);
        // Missing .json on disk serves the SPA HTML fallback as 200 — normalize
        // unknown /api/* ids to a JSON 404 (same contract as known-bad ids).
        if ((res.headers.get("content-type") || "").includes("text/html") && pathname.startsWith("/api/")) {
          return new Response(JSON.stringify({ error: "not found", path: pathname }, null, 2), {
            status: 404,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "public, max-age=60",
              "access-control-allow-origin": "*",
            },
          });
        }
        if (res.status !== 404) return res;
      }
      // else fall through to original handling below
    }

    const res = await env.ASSETS.fetch(request);
    // Static hosting builds no per-ID 404 file: unknown /api/* ids fall through
    // to the SPA HTML fallback. Normalize to JSON so agents get a real 404
    // (same contract the prerendered endpoints return for known-bad ids).
    if (pathname.startsWith("/api/") && (res.headers.get("content-type") || "").includes("text/html")) {
      return new Response(JSON.stringify({ error: "not found", path: pathname }, null, 2), {
        status: 404,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60",
          "access-control-allow-origin": "*",
        },
      });
    }
    return res;
  },
};
