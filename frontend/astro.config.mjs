import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// `site` drives the sitemap + canonical URLs — override with SITE_URL per
// environment. Current deploy target is Cloudflare Pages: civicord.pages.dev.
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL || "https://civicord.pages.dev",
  integrations: [sitemap()],
  prefetch: true,
});
