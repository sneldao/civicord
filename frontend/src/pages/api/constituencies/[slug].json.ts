import type { APIRoute } from "astro";
import constituenciesRaw from "../../../data/constituencies.json";

export const prerender = true;

function load(): any[] {
  const raw: any = (constituenciesRaw as any);
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.default)) return raw.default;
  return [];
}

export function getStaticPaths() {
  const list = load();
  return list.map((c: any) => ({ params: { slug: c.slug } }));
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? "";
  const list = load();
  const c = list.find((x: any) => x.slug === slug);
  if (!c) {
    return new Response(JSON.stringify({ error: "constituency not found", slug }, null, 2), {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
        "access-control-allow-origin": "*",
      },
    });
  }
  // Include ogImage so agents can return the deed alongside the JSON.
  const body = {
    ...c,
    ogImage: `/og/constituencies/${c.slug}.svg`,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
};
