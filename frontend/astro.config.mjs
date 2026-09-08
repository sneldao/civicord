import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Deploy-time note: for GitHub Pages project sites set `site` + `base`
// (e.g. site: "https://sneldao.github.io", base: "/civicord") and prefix
// links with import.meta.env.BASE_URL. `site` drives the sitemap + canonical
// URLs — override with SITE_URL per environment. NOTE: civicord.org did not
// resolve as of 2026-09-08; confirm the domain is live before deploying,
// otherwise the generated sitemap points at a dead domain.
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL || "https://civicord.org",
  integrations: [sitemap()],
  prefetch: true,
});
