import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";
import { correctionsQueuePlugin } from "./src/lib/corrections-plugin.mjs";

// `site` drives the sitemap + canonical URLs — override with SITE_URL per
// environment. Current deploy target is Cloudflare Pages: civicord.pages.dev.
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL || "https://civicord.pages.dev",
  integrations: [sitemap()],
  vite: {
    plugins: [correctionsQueuePlugin(fileURLToPath(new URL(".", import.meta.url)))],
  },
  // Viewport-scoped prefetch: links prefetch when they near the viewport
  // instead of just on hover — keeps the 2,375-row ledger from becoming a
  // bandwidth footgun while prev/next + candidate links still feel instant.
  prefetch: { prefetchAll: false, defaultStrategy: "viewport" },
});
