import { defineCollection, z } from "astro:content";

// Shape of frontend/src/data/candidates.json (built by scripts/build-data.mjs
// from pipeline CSVs or the R2 snapshot). Validated at build time — a malformed
// pipeline output now fails loudly instead of shipping broken pages.
const websiteSchema = z.object({
  url: z.string(),
  elections: z.array(z.string()),
  parties: z.array(z.string()),
  posts: z.array(z.string()).optional().default([]),
  audit: z
    .object({
      statusClass: z.string(),
      statusCode: z.union([z.string(), z.number()]).nullable().optional(),
      redirected: z.boolean().optional().default(false),
      finalUrl: z.string().nullable().optional(),
      nameFound: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const candidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  websites: z.array(websiteSchema),
  pages: z
    .array(
      z.object({
        key: z.string(),
        chars: z.number(),
        snippet: z.string(),
      })
    )
    .optional()
    .default([]),
  onchain: z
    .object({
      ens: z.string(),
      status: z.string().nullable().optional(),
      node: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const candidates = defineCollection({
  loader: async () => {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = await readFile(join(here, "data/candidates.json"), "utf8");
    const parsed = candidateSchema.array().parse(JSON.parse(raw));
    return parsed.map((c) => ({ ...c, id: c.id }));
  },
  schema: candidateSchema,
});

export const collections = { candidates };
