import { defineConfig } from "astro/config";

// Deploy-time note: for GitHub Pages project sites set `site` + `base`
// (e.g. site: "https://sneldao.github.io", base: "/civicord") and prefix
// links with import.meta.env.BASE_URL. Left unset while iterating locally.
export default defineConfig({
  output: "static",
});
