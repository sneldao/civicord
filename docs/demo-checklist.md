# Demo + submission checklist (The Graph Continuity)

Deadline: **Sun 2026-09-13 12:00 EDT / 17:00 UK**.

## What you need to do (human)

1. **Record the 2–4 min demo** (see [demo-script.md](demo-script.md))
   - Must-show beat: seat or `/candidates/5693` → Agent view → **Query The Graph**
   - Say Continuity: *subgraph existed; we made agents consume Studio live and join the ledger*
   - If `textRecordCount > 0` on v0.0.4: show status/url from Graph; else say registrations + ledger join (still valid)
2. **ETHGlobal submission**
   - Track: **Best AI Tooling / AI Use Case — Continuity**
   - Public repo: `https://github.com/sneldao/civicord`
   - Document pre-existing vs new: subgraph + ledger pre-existed; live WebMCP Graph tools, `/api/graph`, AgentView Query, namehash fix `v0.0.4`, skill — Continuity work
3. **Optional Bazantic**
   - Re-import `https://civicord.pages.dev/openapi.yaml` so free `POST /api/graph` appears as a gateway resource (MCP tools are auto-generated from OpenAPI — we cannot push tools from the repo)

## What is already done in-repo / on-chain

| Item | Status |
|---|---|
| Live Studio client + WebMCP Graph tools + compare join | Done (`b6ec282`+) |
| Same-origin `POST /api/graph` worker proxy | Done (this pass) |
| AgentView on seat **and** candidate pages | Done |
| OpenAPI + recipe + SKILL + Continuity FEEDBACK | Done |
| Demo set `setText` on-chain (5693, Ynys Môn, St Ives) | On-chain yes |
| Subgraph **v0.0.4** namehash fix (TextChanged join) | Deployed; **re-syncing** |
| Full 2,375 records blast | Needs ~2 ETH gas — **optional**; demo set is enough |

## Verify before pressing record

```bash
# Prefer v0.0.4 once synced past registrations + text events
curl -s -X POST -H 'content-type: application/json' \
  -d '{"query":"{ _meta { block { number } hasIndexingErrors } stat(id:\"civicord\") { candidateCount textRecordCount textRecordChangeCount } candidate(id:\"5693\") { ensName status url textRecordCount } }"}' \
  https://api.studio.thegraph.com/query/101650/civicord/v0.0.4

# Same-origin proxy (after Pages deploy)
curl -s -X POST https://civicord.pages.dev/api/graph \
  -H 'content-type: application/json' \
  -d '{"query":"{ _meta { block { number } } }"}'
```

Wait until `candidate(id:"5693").status` is `"live"` (or `textRecordCount >= 1`) before the Graph close-up in the video if possible.

## Deployer gas (only if you want full records blast)

- Address: `0xfa104deA24CbC347100adE461883403bdd79E0eC`
- Full `--records-only` for all candidates needs ~2+ ETH at ~1 gwei
- Demo subset already skipped as on-chain; no top-up required for the video
