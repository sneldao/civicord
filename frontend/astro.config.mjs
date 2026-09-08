import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Deploy-time note: for GitHub Pages project sites set `site` + `base`
// (e.g. site: "https://sneldao.github.io", base: "/civicord") and prefix
// links with import.meta.env.BASE_URL. Left unset while iterating locally.
export default defineConfig({
  output: "static",
  site: "https://civicord.org",
  integrations: [sitemap()],
  prefetch: true,
});
