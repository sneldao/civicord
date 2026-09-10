# Ops Runbook (internal)

Infrastructure and deployment notes for Civicord. This doc is **internal** —
it's safe to commit (no secrets), but unlike `architecture.md` /
`onchain-plan.md` it documents *how we run* the project rather than what it is.

Last updated: 2026-09-11 22:40 — gateway **LIVE** (`civicord-aieyq.bazgateway.com`, marketplace *Pending verification*), OG deeds live, worker alias for extensionless `/api/*` shipped (`68950dd3`); subgraph **v0.0.2 deployed** (`QmQqGfVxLZ…`, `hasIndexingErrors:false` @ 8149999, syncing 3.5M blocks from 8150000 to 11677k — `v0.0.1` faulted).

## Hosting topology

| Layer | Service | Notes |
| --- | --- | --- |
| Frontend (3,031 html + 652 api json + 650 deeds, `34M` dist) | Cloudflare Pages — project `civicord` | Live at https://civicord.pages.dev; **deployed manually** from local `frontend/dist` with `wrangler pages deploy` (see below) |
| Data snapshots | Cloudflare R2 — bucket `civicord-data` (account e738) | Served same-origin at `/data/*` by `frontend/public/_worker.js` (5-min cache) |
| Legacy/unused | Vercel (`civicord.vercel.app`) | `vercel.json` still present; superseded by Pages — delete when confident |
| Future | VPS available for pipeline cron + FastAPI search API | Not yet used |

## Cloudflare accounts — READ THIS FIRST

Two accounts are involved, and wrangler's default behavior burned us once
already:

- **`e7383c0c7474c8f61cc06598eeb134a0`** (`ungethe@gmail.com`) — the Civicord
  account. Owns the Pages project and `civicord-data` R2.
- **`ff315ddd5317cb560f09b5e51fe8252f`** — a second account on the same login,
  used for Workers AI (key historically exported in `~/.zshrc`, now commented
  out).

**Gotcha (verified 2026-09-09):** wrangler's OAuth login covers *both*
accounts, and its `r2 object` operations target the wrong one — with no
`CLOUDFLARE_ACCOUNT_ID` they default to `ff315ddd`, and **even with
`account_id` pinned in `wrangler.toml`, object puts land in the wrong
account**. Objects uploaded this way are invisible to the Pages worker and to
REST listings of the e738 bucket. Verified with round-trip probes.

**Rules:**

1. **Do not use `wrangler r2 object put/get/delete` for snapshot uploads.**
   Use `scripts/upload_snapshot.sh` (REST API with wrangler's OAuth token —
   verified correct end-to-end against the live worker):
   ```bash
   scripts/upload_snapshot.sh frontend/src/data/candidates.json candidates.json
   ```
2. Do **not** re-add `CLOUDFLARE_API_KEY` / `CLOUDFLARE_BASE_URL` to
   `~/.zshrc` — the AI-scoped key caused `Authentication error [code: 10000]`
   on every non-AI endpoint and overrode wrangler's OAuth. If needed for
   Workers AI, scope it to a project `.env`.
3. The OAuth token can do REST object get/put/delete but **cannot** create or
   delete *buckets*, nor touch objects in the ff315ddd account (403). Bucket
   create/delete: use the dashboard.
4. A stray, now-empty `civicord-data` bucket still exists in ff315ddd (plus a
   stray `pin-test-3.txt` probe object) — delete from the dashboard when
   convenient.

## ENS publish runbook (two-phase resume)

State as of 2026-09-09 21:30 BST: **registers ~2,375/2,375** (all labels now
resolve — audited via `getResolver(label)` over the manifest), **records
~50% on-chain before the evening fixes** (every-50th sample: 50% `url` match
before `decode_string` was corrected; post-fix the resume check now honestly
skips ~1,180 already-written candidates). Deployer at **~2.15 ETH** (Alchemy
primary, pending pool drained, `0xfa10…E0eC` — see `docs/onchain-plan.md` for
the full audit and tonight's bugfixes).

**Top-up address (deployer/gas payer):** `0xfa104deA24CbC347100adE461883403bdd79E0eC`
(the matching private key lives **outside this repo** — its location is
deliberately not documented here; see the operator's local secret store).

**RPC setup (updated tonight):** `scripts/publish/ensv2.py` now derives
`RPC_URL` from repo-root `.env:ALCHEMY_KEY` (with `publicnode` as fallback)
via `_resolve_rpc_endpoints()`. `call()` and `blast_send()` share that
resolution — no more `call()` silently hitting publicnode while writes go to
Alchemy. Pre-commit blocks real keys: `.env` is `chmod 600` + gitignored, only
a `your-alchemy-api-key-here` placeholder lives in `.env.example`. The wrapper
**must** run with `RPC_URL`/`RPC_FALLBACKS` unset so `.env` is the source of
truth.

**Phase 1 — registers (~0.55 ETH @ 1 gwei; run when balance ≥ 0.7 ETH):**
```bash
cd /Users/udingethe/dev/civicord   # not Dev — lowercase on this host
unset RPC_URL RPC_FALLBACKS        # force .env:ALCHEMY_KEY -> eth-sepolia.g.alchemy.com
# export PK from your local secret store; never from the repo
# PK=$(cat $HOME/.config/civicord/sepolia.key)  # example location
nohup python -u scripts/publish/publish.py --blast --register-only \
  >> /tmp/records-blast.log 2>&1 &
```

**Phase 2 — records for all 2,375 (~2.1 Ggas ≈ 2.1 ETH @ 1 gwei; run when
balance ≥ 2.5 ETH, or wait for gas < 0.3 gwei):**
```bash
unset RPC_URL RPC_FALLBACKS
export PK="$DEPLOYER_SEPOLIA_PK"
nohup python -u scripts/publish/publish.py --blast --records-only \
  >> /tmp/records-blast.log 2>&1 &
# wrapper with 12 attempts + drain: /tmp/recordsloop.sh (see below) — must be python -u for unbuffered logging
```

Fully idempotent: registers skip when `getResolver(label) != 0`, records skip
when the on-chain `url` already matches (fixed tonight — `decode_string` was
reading the wrong ABI word, so every pass re-wrote all 7k `setText` txs).
Manifest rows are written for every candidate (including skips) — the frontend's
Public Record blocks read from it. **Critical fix:** the run now fails fast if
*any* batch fails (previously it printed `Wrote 2375 rows` + `RECORDS DONE`
with 0 successful writes and exited 0).

**Current wrapper (`/tmp/recordsloop.sh`):** unsets `RPC_URL`, reads
`$HOME/.config/civicord/sepolia.key`, loops 12× `python -u publish.py --blast
--records-only`, and drains the mempool (`pending == latest`) between attempts
so the next pass starts from a fresh `pending` nonce instead of replaying a
stale `latest` nonce and spamming `replacement underpriced` / `nonce too low`.
`publish.py` itself starts from `get_pending_nonce()` and resyncs to the
pending pool after any partial failure within a candidate (replaces the old
`rewind-to-start_nonce` loop).

**Monitor:**
```bash
tail -f /tmp/records-blast.log
# Alchemy-aware balance + pending check (pending pool, not just tip):
python3 - <<'PY'
import os, sys
for line in open('.env'):
    if '=' in line and not line.strip().startswith('#'):
        k,v=line.strip().split('=',1); os.environ.setdefault(k,v)
sys.path.insert(0,'scripts/publish')
from ensv2 import env, _cast, get_pending_nonce
import json
s=json.loads(open('scripts/publish/.deployed.json').read());rpc=env('RPC_URL');a=s['deployer']
print(f"pending {get_pending_nonce(a,rpc)} latest {int(_cast(['nonce',a,'--rpc-url',rpc]).strip())} bal {int(_cast(['balance',a,'--rpc-url',rpc]).strip())/1e18:.6f} ETH")
PY
# quick on-chain spot check:
# cast call $RESOLVER 'text(bytes32,string)' $NODE url --rpc-url $RPC_URL
```

**After phase 2 completes:** regenerate + re-upload the frontend data snapshot
(see "Refreshing the data snapshot" above) so Public Record blocks go live.

**Optimisations applied / considered:**
- `--register-only` added so phases can be funded/run separately.
- `blast_send` fires without receipts (~50× faster); nonces tracked locally.
- Considered and rejected: skipping `vnd.civicord.person_name` records
  (frontend uses the manifest for names, but the onchain record is part of the
  product story — keep unless gas stays > 1 gwei for days).
- Considered and rejected: multicall batching (ENSv2 PermissionedResolver has
  no multicall entrypoint).

## Deploying the frontend

**Important:** `frontend/dist/` is gitignored, and `data/` (the pipeline CSVs +
GeoJSON used by `build-data.mjs` / `build-map.mjs`) is also gitignored. There is
no GitHub Actions workflow and no Cloudflare Pages Git integration that can auto-build
this repo. A commit/push to `main` does **not** make the site live — you must build
locally and run `wrangler pages deploy`.

```bash
cd frontend
npm ci                 # if node_modules is missing
npm run build          # regenerates src/data/* and dist/

# If you have leftover CLOUDFLARE_API_KEY / CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_BASE_URL
# from a Workers AI key, unset them — they break Pages auth and land deploys in the
# wrong Cloudflare account (ff315ddd instead of e7383c0c…):
env -u CLOUDFLARE_API_KEY -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_BASE_URL \
  npx wrangler pages deploy dist --project-name civicord --branch main
```

`wrangler` will open a browser for OAuth on first use, or you can authenticate
ahead of time with `npx wrangler login` (ensure it targets the `e7383c0c…`
account that owns the Pages project).

**Always rebuild before deploying.** `dist/` is a build artifact; if the
pipeline outputs (`data/out/*.csv`, `data/boundaries/ak-v5.geojson`) have
changed, an old `dist/` will still contain stale stats and the wrong on-chain
counts. After a pipeline or `onchain_manifest.csv` update, run `npm run build`
from `frontend/` so `dist/` reflects the latest `candidates.json` and map data.

Verify after deploy (check that a new constituency page is *not* the homepage):

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://civicord.pages.dev/
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' \
  https://civicord.pages.dev/data/candidates.json
curl -s https://civicord.pages.dev/constituencies/st-ives/ | grep -q 'St Ives' && echo "map page live" || echo "still serving homepage fallback"
```

## Refreshing the data snapshot

After each pipeline run:

```bash
cd frontend && node scripts/build-data.mjs            # CSVs → src/data/candidates.json
scripts/upload_snapshot.sh frontend/src/data/candidates.json candidates.json
```

Do **not** use `wrangler r2 object put` for this — it writes to the wrong
account (see the Cloudflare accounts section above).

If the snapshot shape changes meaningfully, also commit the slim
`frontend/src/data/candidates.json` so fresh clones keep building (it's
excluded from the large-file/JSON pre-commit hooks — see
`.pre-commit-config.yaml`).

Data resolution order in `build-data.mjs`: pipeline CSVs in `data/out/` →
R2 snapshot at `https://civicord.pages.dev/data/candidates.json` → committed
`src/data/candidates.json`. R2 snapshot: ~2.5 MB (`candidates.json`), alias at
`civicord.pages.dev/data/candidates.json`.

## Frontend deploy state (2026-09-11 — gateway LIVE, deeds live, worker alias shipped)

- **Built:** `frontend/dist` — `3031` html (`2375` candidates + `650` constituencies + `6` static), `+ 652` API json (`650` × `/api/constituencies/{slug}.json` + `/api/constituencies.json` + `/api/summary.json`), `+ 650` OG deeds (`/og/constituencies/{slug}.svg`, 1200×630, 2.5 MB via `public/og/`), `+ openapi.yaml` — `34M`, `4342` files, sitemap `3031` html. `cd frontend && npm run build` (chain: `build-data.mjs` → `build-map.mjs` → `build-og.mjs` → `astro build`). Previously `2381` html before map.
- **Deployed:** `68950dd3` (plus `aeab68ad` / `266a570d` / `5e5ab5a0`) — `https://civicord.pages.dev` now serves extensionless `GET /api/constituencies`, `GET /api/constituencies/{slug}`, `GET /api/summary` via `frontend/public/_worker.js` rewrite (`cb09faf` — `…json` files on disk, Bazantic defines without `.json`). `?country=&region=&limit=` filtering now handled in the worker (was returning 650 unfiltered). Verified `21:30`.
- **API (static, Bazantic-metered):** `GET /api/constituencies/{slug}` is the pay-per-`?constituency=` unit (x402/MPP via Bazantic; humans still browse free at `/browse?constituency=`). `GET /api/summary` free. `GET /og/constituencies/{slug}.svg` free deed. `GET /openapi.yaml` (277 lines) + Recipe at `gateway/recipe.md`.
- **Gateway (Bazantic — LIVE):** `https://civicord-aieyq.bazgateway.com` (custom handle — claimed, live <1 min) — also `https://3se6sbxfgjfh3fw4gjpytkcroa.bazgateway.com` (hash). Upstream `https://civicord.pages.dev`, `No auth`, Payout `0x96F3…7446` ready, `MCP Live · 5 tools` (`getConstituency`, `getConstituencyOgImage`, `getSummary`, `listConstituencies`, `info`) at `/mcp` — `claude mcp add --transport http civicord https://civicord-aieyq.bazgateway.com/mcp`. Marketplace: **Pending verification** · Published at `/services/3se6sbxfgjfh3fw4gjpytkcroa` (canonical listing). Resources: `GET /api/constituencies 100 ($0.001)` · `GET /api/constituencies/{slug} 200 ($0.002)` · `GET /api/summary 0` · `GET /og/constituencies/{slug}.svg 0` (`Price per call 0–200` mcents). Verified `21:10–21:30` — `api/summary 200` free, `api/constituencies* 402` with `x402Version:1` / `payment-required` + `www-authenticate: Payment` (correct `1000`/`2000` on Base USDC `0x8335…`), `mcp POST 200 text/event-stream`.
- **OG:** every `/constituencies/{slug}` now has `og:image → /og/constituencies/{slug}.svg` (`summary_large_image`, 1200×630, `image/svg+xml`) + `twitter:image` — share test: paste a seat URL in Slack/X. Origin `200`, gateway `404` (resource is `0 mcents` but Fly returns `not found` — origin is canonical; documented in Recipe).
- **Last live Pages deploys:** `68950dd3` (current), `aeab68ad`, `266a570d`, `5e5ab5a0` — all include `+652+650+1`. Pre-gateway were `ce51b262` / `61556895`. Verify:
  ```bash
  # origin (extensionless works via _worker.js)
  curl -s https://civicord.pages.dev/api/summary | jq .
  curl -s https://civicord.pages.dev/api/constituencies?limit=2 | jq 'length'  # now 2, worker-filtered
  curl -s https://civicord.pages.dev/api/constituencies/st-ives | jq .slug
  curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://civicord.pages.dev/og/constituencies/st-ives.svg
  # gateway (x402)
  curl -s https://civicord-aieyq.bazgateway.com/api/summary | jq .
  curl -s -o /dev/null -w '%{http_code}\n' https://civicord-aieyq.bazgateway.com/api/constituencies/st-ives  # 402 + payment-required
  curl -s https://civicord-aieyq.bazgateway.com/openapi.yaml | head
  curl -s -X POST -H 'content-type: application/json' -H 'accept: text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' https://civicord-aieyq.bazgateway.com/mcp | head
  ```
- **R2 snapshot:** `frontend/src/data/candidates.json` (2,412,060 bytes) uploaded via
  `scripts/upload_snapshot.sh` to `civicord-data/candidates.json` — `https://civicord.pages.dev/data/candidates.json`
  returns 200; `candidates 2375 onchain 2375` in committed JSON (manifest-driven
  — on-chain record *content* is still catching up at `p185` in the in-flight `records-only` pass, see ENS section above).

- **Gotchas hit & fixed tonight:**
  - `npx --prefix frontend wrangler pages deploy dist` fails (`ENOENT dist` / `[UNRESOLVED_ENTRY]`). Use `cd frontend && npm run build && npx wrangler pages deploy dist` (see **Deploying the frontend** above).
  - Any `CLOUDFLARE_API_KEY`/`ACCOUNT_ID`/`BASE_URL` in the shell (Workers AI key `ff315` from a prior `.zshrc`) causes `Authentication error [code: 10000]` on non-AI endpoints — the `env -u CLOUDFLARE_API_KEY -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_BASE_URL` prefix is required.
  - `python -m http.server` single-threaded dies on `ClientRouter` prefetch `BrokenPipeError` (every Chromium view-transition kills the server). Fix: threaded server `socketserver.ThreadingMixIn` + `except (BrokenPipeError, ConnectionResetError): pass` in `/tmp/serve.py` and bind `0.0.0.0` for `agent-browser` (needs LAN IP `192.168.0.74:4321`, not `127.0.0.1`).
  - Bare `python scripts/publish/publish.py` buffers `>> /tmp/records-blast.log` (4K file buffering) — stall at `p1067` looked like a hang but was unflushed output. Fix: `python -u` (wrapper now `python -u publish.py --blast --records-only`).

## Subgraph (The Graph)

Indexing the on-chain ENSv2 `LabelRegistered`/`TextChanged` events on **sepolia**
(start block `8150000`). `npx graph` is provided by the root `package.json` dev
dependencies (`@graphprotocol/graph-cli`, `@graphprotocol/graph-ts`).

### Build

```bash
cd subgraph
npx graph codegen
npx graph build
```

Build output goes to `subgraph/build/` (ignored by `.gitignore`);
`subgraph/generated/schema.ts` is committed so the build works on a fresh clone.

### Deploy

The deploy key is cached in `~/.graph-cli.json` (set once with
`npx graph auth <DEPLOY-KEY>` if this machine is new). One-time: create the
subgraph in [Subgraph Studio](https://thegraph.com/studio/) first. The CLI's
`graph create --node https://api.studio.thegraph.com/deploy/ <name>` currently
returns `Method not found`, so the Studio UI is the only way to create it.

Once the subgraph exists in Studio:

```bash
cd subgraph
npx graph deploy --node https://api.studio.thegraph.com/deploy/ \
  --version-label v0.0.1 civicord subgraph.yaml
```

### Current status (2026-09-11 22:40)

- `npx graph build` now passes after the AS compile fix (`b725f11` + `22:40` `NodeToCandidate` entity + `Stat.save()` + lower-case hex fix, `npx graph build subgraph/subgraph.yaml -o subgraph/build`).
- Deployed to Subgraph Studio: `https://thegraph.com/studio/subgraph/civicord`
- Query endpoints: `v0.0.1` `QmTp8yuyk6GFZJKB9KckxmSzjSHQM3CBEbTatZC1VnMKpM` — **faulted** (`hasIndexingErrors:true` @ 11660475, `indexing_error` on every `stat`/`candidates` query — missing `NodeToCandidate` entity registration + `Stat` unsaved on first `ensureStat()`)
- **`v0.0.2` — LIVE, syncing:** `QmQqGfVxLZ2zmHmmKu1eYDKFyVJvPdKaf6W22xJ5DYnaQn` — `hasIndexingErrors:false` @ 8149999 (1 block before `startBlock` 8150000). ~3.5M blocks to head `11677k`, use this endpoint for the demo: `https://api.studio.thegraph.com/query/101650/civicord/v0.0.2`
- Studio metadata (description, source/website URLs, categories) saved in the
  Studio UI; not published to the decentralized network — the Studio query
  endpoint is enough for the hackathon demo.
- Verify: `curl -X POST -H 'content-type: application/json' -d '{"query":"{ _meta { block { number } deployment hasIndexingErrors } }"}' https://api.studio.thegraph.com/query/101650/civicord/v0.0.2`
- Redeployed with `npx graph deploy --node https://api.studio.thegraph.com/deploy/ --version-label v0.0.2 --output-dir subgraph/build civicord subgraph/subgraph.yaml` (deploy key in `~/.graph-cli.json`).

## Sizes to keep an eye on

- Raw scrape has ~72k page entries (154M chars). `build-data.mjs` caps the
  "Archived scrape" evidence at 8 pages / 120-char snippets per candidate
  (surrogate-safe clip). JSON: ~2.3MB, `dist/`: ~13MB. Loosening those caps
  has direct repo/deploy-size consequences — don't without checking.
- Committed JSON is ~2.3MB; prefer R2 for anything bigger.

## Secrets

- ENS deployer key lives **outside** the repo (see `docs/onchain-plan.md`).
- `.env`, `.deployed.json`, `.abi-cache/`, `.wrangler/` are gitignored.
- gitleaks + `detect-private-key` run in pre-commit; `.env` is `chmod 600`.
- Alchemy key in `.env` is read by the deployer; only a placeholder lives in `.env.example`.
