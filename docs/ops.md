# Ops Runbook (internal)

Infrastructure and deployment notes for Civicord. This doc is **internal** —
it's safe to commit (no secrets), but unlike `architecture.md` /
`onchain-plan.md` it documents *how we run* the project rather than what it is.

Last updated: 2026-09-09.

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

State as of 2026-09-09: 1,921/2,375 registered, 4 with records, deployer at
0.9055 ETH (see `docs/onchain-plan.md` for the audited detail).

**Top-up address (deployer/gas payer):** `0xfa104deA24CbC347100adE461883403bdd79E0eC`
(the matching private key lives **outside this repo** — its location is
deliberately not documented here; see the operator's local secret store).

**Phase 1 — registers (~0.55 ETH @ 1 gwei; run when balance ≥ 0.7 ETH):**
```bash
cd /Users/udingethe/Dev/civicord
export PK="$DEPLOYER_SEPOLIA_PK"   # load from your local secret store, not the repo
export RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
nohup python scripts/publish/publish.py --blast --register-only \
  > /tmp/publish-register.log 2>&1 &
```

**Phase 2 — records for all 2,375 (~2.1 Ggas ≈ 2.1 ETH @ 1 gwei; run when
balance ≥ 2.5 ETH, or wait for gas < 0.3 gwei):**
```bash
nohup python scripts/publish/publish.py --blast > /tmp/publish-records.log 2>&1 &
```
Fully idempotent: registers skip when `getResolver(label) != 0`, records skip
when the on-chain `url` already matches. Manifest rows are written for every
candidate (including skips) — the frontend's Public Record blocks read from it.

**Monitor:**
```bash
tail -f /tmp/publish-register.log          # or publish-records.log
# balance + pending check:
cast balance 0xfa104deA24CbC347100adE461883403bdd79E0eC --rpc-url $RPC_URL
cast nonce 0xfa104deA24CbC347100adE461883403bdd79E0eC --rpc-url $RPC_URL
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
npx wrangler pages deploy dist --project-name civicord
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
`src/data/candidates.json`.

## Sizes to keep an eye on

- Raw scrape has ~72k page entries (154M chars). `build-data.mjs` caps the
  "Archived scrape" evidence at 8 pages / 120-char snippets per candidate
  (surrogate-safe clip). JSON: ~2.3MB, `dist/`: ~13MB. Loosening those caps
  has direct repo/deploy-size consequences — don't without checking.
- Committed JSON is ~2.3MB; prefer R2 for anything bigger.

## Secrets

- ENS deployer key lives **outside** the repo (see `docs/onchain-plan.md`).
- `.env`, `.deployed.json`, `.abi-cache/`, `.wrangler/` are gitignored.
- gitleaks runs in pre-commit.
