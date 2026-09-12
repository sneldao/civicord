# Demo + submission checklist (ENS Continuity + Graph Continuity)

Deadline: **Sun 2026-09-13 12:00 EDT / 17:00 UK**.

## What you need to do (human)

1. **Record the 2–4 min demo** (see [demo-script.md](demo-script.md))
   - Must-show beat: seat or `/candidates/5693` → Agent view → **Query The Graph**
   - ENS beat: same page → **Verify on-chain** (live `eth_call` texts) + mention EAC claim path
   - Say Continuity: *subgraph + ENSv2 registry existed; we made agents/UI consume them live*
2. **ETHGlobal submission**
   - Tracks: **Best AI Tooling / Continuity** (Graph) **and** **ENS Continuity Integration** (primary ENS lane)
   - Optional stretch: **Best Use of ENSv2** if EAC grant/revoke + live verify are in the video
   - Public repo: `https://github.com/sneldao/civicord`
   - Document pre-existing vs new: see FEEDBACK Continuity sections
3. **Optional Bazantic**
   - Re-import `https://civicord.pages.dev/openapi.yaml` so free `POST /api/graph` appears as a gateway resource

## What is already done in-repo / on-chain

| Item | Status |
|---|---|
| Live Studio client + WebMCP Graph tools + compare join | Done |
| Same-origin `POST /api/graph` worker proxy | Done |
| AgentView on seat **and** candidate pages | Done |
| Subgraph **v0.0.4** namehash fix (TextChanged join) | Done · ~2375 candidates · ~7122 texts |
| Live `GET /api/ens` eth_call verify + candidate **Verify on-chain** | Done |
| EAC grant → write → revoke demo (`eac_demo.py`) | Done · see [ens-claim-path.md](ens-claim-path.md) |
| Manifest rebuild from Graph (chips ≈ full set) | Done via `rebuild_manifest_from_graph.py` |
| Full 2,375 records blast | Already on-chain (Graph); optional re-publish |

## Verify before pressing record

```bash
# Graph
curl -s -X POST -H 'content-type: application/json' \
  -d '{"query":"{ candidate(id:\"5693\") { ensName status url textRecordCount } }"}' \
  https://api.studio.thegraph.com/query/101650/civicord/v0.0.4

# Live resolver text (after Pages deploy)
curl -s 'https://civicord.pages.dev/api/ens?id=5693'
```

## Deployer gas (only if re-running EAC / publish)

- Address: `0xfa104deA24CbC347100adE461883403bdd79E0eC`
- EAC demo needs ~0.01 ETH for delegate funding + a handful of txs
- Full `--records-only` re-blast not required for the video
