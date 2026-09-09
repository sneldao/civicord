// Pages advanced-mode worker: serves pipeline data snapshots from R2 at
// /data/*, all other requests fall through to the static Astro assets.
export default {
  async fetch(request, env) {
    const { pathname, searchParams } = new URL(request.url);
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
    return env.ASSETS.fetch(request);
  },
};
