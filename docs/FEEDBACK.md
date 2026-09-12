# FEEDBACK — ETHGlobal Civicord · 2026-09-13

> One doc, three sections — copy per-sponsor on submission. Keep each 150–250 words. Be specific, not flattering.

## ENS — Best Use of ENSv2

**What we built:** `civicord.eth` parent + UserRegistry `0x0895…2aa9` + PermissionedResolver `0x340d…ee67` on Sepolia — `p{person_id}.civicord.eth` for 2,375 candidates, `text(url/status/vnd.civicord.person_name)` as the tamper-evident record. Blast publisher (`publish.py --blast`) + idempotent resume (`decode_string` fix, `get_pending_nonce()`), alias `civicordhq.eth` kept.

**What worked:** ENSv2 factories + PermissionedResolver per-record roles are the right primitive for a *public register* — one resolver per deployer, one `namehash` per candidate, `app.ens.domains` verification for free. Docs were legible.

**Friction:** `decode_string` ABI word offset is subtle (we shipped a wrong skip for a week); a worked `text()` round-trip example with `bytes32 node` + `string key` would have saved a pass. `recordVersions` vs `TextChanged` indexing guidance is thin — we used `TextChanged` + `LabelRegistered` for the Subgraph.

**Wish:** a Sepolia faucet note in the onboarding (Alchemy vs publicnode divergence cost us a publish retry), and a canonical “verify a text record” Etherscan link pattern to share with judges.

**Would you recommend ENSv2 for this use again?** Yes — identity, not wallet, is the product here.

---

## The Graph — AI Tooling / Continuity

**What we built:** Subgraph indexing ENSv2 `LabelRegistered/LabelUnregistered/ResolverUpdated` + `TextChanged` on Sepolia from `startBlock 8150000` — schema `Candidate ↔ TextRecord ↔ TextRecordChange + Stat + NodeToCandidate` lookup (because `TextChanged.node` is `bytes32`, not `person_id`). `v0.0.1` `QmTp8yuy…` faulted then pruned; `v0.0.2` `QmQqGfVx…` faulted @ 11660475 (unpadded `BigInt.toHexString()` → `Bytes.fromHexString` throw on odd-length hex); **v0.0.3 `QmUcjfa4…` fixes it** (`hasIndexingErrors:false`, synced near head), endpoint `api.studio.thegraph.com/query/101650/civicord/v0.0.3`.

**Continuity deepening (2026-09-12):** Graph became load-bearing in the agent path — not copy-paste only. `frontend/src/lib/graph.ts` POSTs live to Studio; WebMCP tools `query_subgraph_meta`, `get_onchain_candidate`, **`compare_onchain_to_ledger`** (Graph + `/api/candidates/{id}.json` join with verdict), `list_recent_onchain_registrations`, `list_text_record_changes`; AgentView “Query The Graph” button (fixed `candidate(id)` to person id, not seat slug); reusable `skills/civicord-graph/SKILL.md`. Pre-existing: subgraph + static ledger + Bazantic. New for Continuity judging: live Studio consumption + reasoned join.

**What worked:** `graph-cli 0.98 + graph-ts 0.38` codegen/build once `entities: [NodeToCandidate]` is registered; Studio CORS `*` lets the browser hit the provider directly; free `_meta` is enough for a sync proof in the demo.

**Friction:** v0.0.1/v0.0.2 `indexing_error` only surfaced as `hasIndexingErrors:true` — Logs tab was the only diagnostic. Sync of ~3.5M blocks is slow. **Honesty:** as of deepening, `candidateCount≈2375` but `textRecordCount`/`textRecordChangeCount` can still be `0` until `setText` blasts finish — agents must join Graph identity with the audit ledger for liveness answers.

**Wish:** clearer `bytes32` vs `uint256 tokenId` hex-casing + padding contract (we now `paddedHex` to 0x+64 lower-case), and an `immutable` entity recommendation in the scaffold.

**Would you fund this dataset via GRT?** Yes — registration + change-log queries are Subgraph work; the audit join is how agents answer “what happened to the site?” without pretending Graph alone holds HTTP outcomes.

---

## Bazantic — Agentify a new API

**What we built:** Static jurisdiction API (`GET /api/constituencies[/{slug}]`, `GET /api/summary`, `GET /og/…svg`, `openapi.yaml`) on `civicord.pages.dev` (Cloudflare Pages, `34M` `3031+652+650` files), gatewayed as x402/MPP at `https://civicord-aieyq.bazgateway.com` (also `3se6sbx…bazgateway.com`, `MCP Live · 5 tools` at `/mcp`, handle claimed <1 min, Marketplace *Pending verification* `/services/3se6sbx…`), upstream `civicord.pages.dev`, payout `0x96F3…7446`, `100`/`200` mcents (`$0.001` list, `$0.002`/seat). Worker alias `frontend/public/_worker.js` (`cb09faf`) maps extensionless `/api/*` → `…json` + query `?country=&region=&limit=` filtering; verified `21:30` — gateway `402` carries `x402Version:1` + `payment-required` + `www-authenticate: Payment` on Base USDC `0x8335…`.

**What worked:** Spec import (`openapi.yaml` → 4 resources), per-route pricing, x402 402 payload, and MCP generation were frictionless. Handle claim + `claude mcp add --transport http civicord https://civicord-aieyq.bazgateway.com/mcp` quick-start is demo-ready.

**Friction:** Gateway defines extensionless routes (`/api/constituencies`, `/api/constituencies/{slug}`) but Astro builds `…json.ts → …json` — we added a Pages `_worker.js` alias to avoid a 404 after payment. A “route alias” UI (`/api/constituencies → /api/constituencies.json`) would have removed a deploy. Free route `GET /og/…svg` is `404` on the gateway while origin is `200` — resource is registered but Fly returns `not found`; we document origin as canonical, but a Test button that shows upstream status would have clarified it faster.

**Wish:** dashboard shows upstream response code on Test for free routes, and a Recipe tab that accepts `gateway/recipe.md` as the publish artifact.

**Would you use Bazantic again for pay-per-jurisdiction data?** Yes — humans free, agents pay, one line in the Recipe.

*Addendum (2026-09-12):* we went further agent-native than the gateway alone — the **site itself** now registers six read-only WebMCP tools on `document.modelContext` (W3C draft, Chrome origin trial ≥149; `@mcp-b/webmcp-polyfill@5` self-hosted as fallback), incl. `get_metered_demand` which shows a real gateway 402 demand in-browser. `/robots.txt` + `/llms.txt` carry discovery for JS-less agents. The story for your catalog: every Civicord page is both human UI *and* an agent-ready tool surface.

---

## General — ETHGlobal tooling

ETHGlobal Online project creation after first commit (2026-09-07 21:52) let “From Scratch” stay eligible. Granular commits + `subgraph/build` ignored + `.deployed.json` ignored are respected. Sepolia deploy cost (~2.15 ETH) was the real throttle, not tooling.

**AI attribution:** human-directed, Cline-assisted (pipeline, frontend scaffolding, docs drafting); architecture/data/design decisions are human. Noted in README per rules — this FEEDBACK is human-written.
