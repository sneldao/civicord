# Ops Runbook (internal)

Infrastructure and deployment notes for Civicord. This doc is **internal** —
it's safe to commit (no secrets), but unlike `architecture.md` /
`onchain-plan.md` it documents *how we run* the project rather than what it is.

Last updated: 2026-09-09 (evening — Alchemy primary + pending-nonce + decode fixes).

## Hosting topology

| Layer | Service | Notes |
| --- | --- | --- |
| Frontend (2,376 static pages) | Cloudflare Pages — project `civicord` | Live at https://civicord.pages.dev; production deploys from `main` |
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
nohup python scripts/publish/publish.py --blast --register-only \
  >> /tmp/records-blast.log 2>&1 &
```

**Phase 2 — records for all 2,375 (~2.1 Ggas ≈ 2.1 ETH @ 1 gwei; run when
balance ≥ 2.5 ETH, or wait for gas < 0.3 gwei):**
```bash
unset RPC_URL RPC_FALLBACKS
export PK="$DEPLOYER_SEPOLIA_PK"
nohup python scripts/publish/publish.py --blast --records-only \
  >> /tmp/records-blast.log 2>&1 &
# wrapper with 12 attempts + drain: /tmp/recordsloop.sh (see below)
```

Fully idempotent: registers skip when `getResolver(label) != 0`, records skip
when the on-chain `url` already matches (fixed tonight — `decode_string` was
reading the wrong ABI word, so every pass re-wrote all 7k `setText` txs).
Manifest rows are written for every candidate (including skips) — the frontend's
Public Record blocks read from it. **Critical fix:** the run now fails fast if
*any* batch fails (previously it printed `Wrote 2375 rows` + `RECORDS DONE`
with 0 successful writes and exited 0).

**Current wrapper (`/tmp/recordsloop.sh`):** unsets `RPC_URL`, reads
`$HOME/.config/civicord/sepolia.key`, loops 12× `publish.py --blast
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

```bash
cd frontend && npm run build
# CLOUDFLARE_API_KEY in the shell (AI key ff315ddd) breaks Pages auth — unset it:
env -u CLOUDFLARE_API_KEY -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_BASE_URL \
  npx wrangler pages deploy frontend/dist --project-name civicord --commit-dirty=true
# deploys to https://<hash>.civicord.pages.dev (civicord.pages.dev alias follows)
```

Verify after deploy:
```bash
curl -s -o /dev/null -w '%{http_code}\n' https://civicord.pages.dev/
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' \
  https://civicord.pages.dev/data/candidates.json
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

## Frontend deploy state (2026-09-09 21:25 BST)

- **Built:** `frontend/dist` 2,380 pages (2,375 candidates + `cohorts/{live,gone,redirected}` + `methodology` + `index` + sitemap) — 2.94 s.
- **Pages deploy:** `https://61492fcf.civicord.pages.dev` (verified 200), smoke-tested:
  `cohorts/gone` → *The graveyard*, `cohorts/redirected` → *Top destinations*,
  `/candidates/3454` + `/candidates/9` → `compare-line` + `timeline` present.
- **R2 snapshot:** `frontend/src/data/candidates.json` (2,514,165 bytes) uploaded via
  `scripts/upload_snapshot.sh` to `civicord-data/candidates.json` — `https://civicord.pages.dev/data/candidates.json`
  returns 200; `candidates 2375 onchain 2375` in committed JSON (manifest-driven
  — on-chain record *content* is still catching up, see ENS section above).
- **Gotcha already hit tonight:** `npx --prefix frontend wrangler pages deploy dist` fails
  (`ENOENT dist`); deploy from repo root as `frontend/dist`. And any
  `CLOUDFLARE_API_KEY`/`ACCOUNT_ID`/`BASE_URL` in the shell (the Workers AI key from a prior `.zshrc`
  export) causes `Authentication error [code: 10000]` — the `env -u` prefix above is required.

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
