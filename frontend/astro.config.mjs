import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Deploy-time note: for GitHub Pages project sites set `site` + `base`
// (e.g. site: "https://sneldao.github.io", base: "/civicord") and prefix
// links with import.meta.env.BASE_URL. `site` drives the sitemap + canonical
// URLs — override with SITE_URL per environment. Current deploy target is
// Vercel: https://civicord.vercel.app.
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL || "https://civicord.vercel.app",
  integrations: [sitemap()],
  prefetch: true,
});
