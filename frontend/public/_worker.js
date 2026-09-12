// Pages advanced-mode worker: serves pipeline data snapshots from R2 at
// /data/*, proxies live The Graph Studio at /api/graph, and normalizes
// Bazantic gateway extensionless routes to the static .json assets Astro
// actually builds:
//   /api/constituencies       -> /api/constituencies.json
//   /api/constituencies/<slug> -> /api/constituencies/<slug>.json
//   /api/summary              -> /api/summary.json
//   /api/candidates/<id>      -> /api/candidates/<id>.json
//   /api/graph                -> POST → Subgraph Studio (live)
// Unknown /api/* ids          -> JSON 404 (not the SPA HTML fallback)
// All other requests fall through to the static Astro assets.

const SUBGRAPH_STUDIO =
  "https://api.studio.thegraph.com/query/101650/civicord/v0.0.4";

const corsJson = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Live GraphQL proxy — free, same-origin, for agents/curl/Bazantic upstream.
    if (pathname === "/api/graph" || pathname === "/api/graph/") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsJson });
      }
      if (request.method === "GET") {
        return new Response(
          JSON.stringify(
            {
              endpoint: SUBGRAPH_STUDIO,
              usage: "POST application/json { query, variables? }",
              docs: "https://github.com/sneldao/civicord/blob/main/skills/civicord-graph/SKILL.md",
            },
            null,
            2
          ),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "public, max-age=300",
              ...corsJson,
            },
          }
        );
      }
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST a GraphQL body" }, null, 2), {
          status: 405,
          headers: { "content-type": "application/json; charset=utf-8", ...corsJson },
        });
      }
      try {
        const upstream = await fetch(SUBGRAPH_STUDIO, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: await request.text(),
        });
        const text = await upstream.text();
        return new Response(text, {
          status: upstream.status,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            ...corsJson,
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify(
            { error: "subgraph upstream failed", detail: String(err?.message || err) },
            null,
            2
          ),
          {
            status: 502,
            headers: { "content-type": "application/json; charset=utf-8", ...corsJson },
          }
        );
      }
    }

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
      if (!pathname.endsWith(".json") && !pathname.endsWith(".svg") && pathname.split("/").length === 4) {
        rewritten = pathname + ".json";
      } else if (pathname.endsWith("/") && pathname.split("/").filter(Boolean).length === 3) {
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
    }

    const res = await env.ASSETS.fetch(request);
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
