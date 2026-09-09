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

**Gotcha:** wrangler's OAuth login covers *both* accounts, and with no
`CLOUDFLARE_ACCOUNT_ID` set it defaults to `ff315ddd` — silently writing R2
objects into a stray bucket there while the Pages worker (bound to e738) sees
nothing. This produced "Upload complete" messages for objects that didn't land.

**Rules:**

1. Always export the account explicitly for R2/CLI operations:
   ```bash
   export CLOUDFLARE_ACCOUNT_ID=e7383c0c7474c8f61cc06598eeb134a0
   ```
2. Do **not** re-add `CLOUDFLARE_API_KEY` / `CLOUDFLARE_BASE_URL` to
   `~/.zshrc` — the AI-scoped key caused `Authentication error [code: 10000]`
   on every non-AI endpoint and overrode wrangler's OAuth. If needed for
   Workers AI, scope it to a project `.env`.
3. The OAuth token can do S3-style object get/put/delete but **cannot** create
   or delete *buckets* via REST (scope gap). Bucket create/delete: use wrangler
   or the dashboard.
4. A stray, now-empty `civicord-data` bucket still exists in ff315ddd — delete
   it from the dashboard when convenient.

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
cd frontend && node scripts/build-data.mjs          # CSVs → src/data/candidates.json
export CLOUDFLARE_ACCOUNT_ID=e7383c0c7474c8f61cc06598eeb134a0
npx wrangler r2 object put civicord-data/candidates.json \
  --file src/data/candidates.json
```

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
