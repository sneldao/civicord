# TapeOut / DeWEB operations runbook (internal)

> Maintainer-facing operational notes. This file is safe to commit because it
> contains no secrets. Strategy and research context:
> [tapeout-accelerate.md](tapeout-accelerate.md). Public verifier documentation:
> [deweb-mirror.md](deweb-mirror.md). Submission evidence:
> [tapeout-submission.md](tapeout-submission.md).

## Current state

Publication is complete for the first Holborn and St Pancras bundle.

| Item | Current value |
|---|---|
| Chain | X Layer, chain id `196` |
| Container | `0xB078da6de46795656187052322Dda3A7E249C288` |
| Circuit / processor | circuit `#20` on OrderGuard `0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355` |
| Owner / sender | `0x8b0b474f86bE342E5A5329Cc2E25016Aa274594e` |
| Tape name | `tape://20.2.272.tape` |
| Gateway root | <https://20-2-272.tapekit.org/> |
| Frozen version | `audit-2026-09-07-export-2026-11` |
| Frozen manifest SHA-256 | `2993bbce8d018be26a1664abcb586f5b034cbb6fd7732c4a17e056e877465901` |
| Verification report | `data/out/deweb/verification/audit-2026-09-07-export-2026-11-b078da6de4.json` |
| Root-index proof | `data/out/deweb/verification/root-index-b078da6de4.json` |
| Actual publication spend | `0.08024877 OKB` |

Only the final circuit-20 publication plan and root latest-index plan are
submission evidence. The older probe dry-run for token id 6 is superseded and
kept out of git by `.gitignore`; do not cite it.

## Local environment variables

Civicord's working copy of the owner key material and operational defaults is
stored in the local, gitignored `.env`. A pre-existing backup copy remains in
the MagicLens repo; this runbook should not depend on that copy.
`.env.example` documents the required names without real values. Never print, paste into chat, commit, or place these values in command
arguments.

Required local names:

| Variable | Purpose |
|---|---|
| `TAPEOUT_PRIVATE_KEY` | Sensitive owner key material, retained only as a backup/import source |
| `TAPEOUT_ADDRESS` | Expected owner address; must match the derived key before signing |
| `TAPEOUT_CHAIN_ID` | Expected chain id, `196` |
| `TAPEOUT_RPC_URL` | Primary RPC, currently `https://rpc.xlayer.tech` |
| `TAPEOUT_RPC_FALLBACK_URL` | Independent verification RPC, currently `https://xlayer.drpc.org` |
| `TAPEOUT_CONTAINER` | Current publication container |
| `TAPEOUT_PROCESSOR` | Current OrderGuard processor |
| `TAPEOUT_CIRCUIT_TOKEN_ID` | Current circuit token id, `20` |

The Python verification scripts currently use their own safe defaults and do
not need the private key. `.env` is not automatically loaded by a shell or by
Python. If a maintainer needs these variables in a dedicated local shell, use:

```bash
set -a
. ./.env
set +a
```

Do this only in a trusted local shell, and close that shell when finished. Do
not `echo` or otherwise reveal `TAPEOUT_PRIVATE_KEY`.

## Signing rules

1. Never pass a raw private key as a command-line argument.
2. Prefer an encrypted Foundry keystore for signing.
3. Before any broadcast, verify the derived signer address is exactly
   `0x8b0b474f86bE342E5A5329Cc2E25016Aa274594e`.
4. Treat `.env` as the backup source for key material, not as a signing
   mechanism. If re-import is needed, import locally into an encrypted keystore
   and verify the address before use.
5. Delete temporary keystores and password files after use.
6. Broadcasting requires explicit owner approval and typed confirmation in the
   publication script.

## Routine verification

Frozen local bundle verification, including negative self-tests:

```bash
python3 scripts/tapeout/evidence_bundle.py verify \
  data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11 \
  --self-test
```

Direct-chain verification without trusting the gateway:

```bash
python3 scripts/tapeout/verify_deweb.py \
  data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11 \
  --container 0xB078da6de46795656187052322Dda3A7E249C288 \
  --prefix civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11
```

Expected current proof properties: `ok: true`, seven files, pinned block
`76865195`, matching chain id `196`, matching SiteRegistry implementation, and
matching file sizes/SHA-256 values across both RPC endpoints.

## Evidence-update policy

Do not overwrite the frozen versioned path
`civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/`.
The chain does not technically prevent the container holder from writing paths;
the append-only rule is Civicord's publication policy and a trust contract with
readers.

For new evidence or corrections:

1. Export a **new version directory** with a new audit/export identifier.
2. Verify it locally with `--self-test`.
3. Dry-run `scripts/tapeout/deweb_publish.py` and inspect the plan.
4. Confirm cost, signer and paths with the owner.
5. Broadcast only after explicit approval.
6. Run direct-chain verification and save the JSON report.
7. If appropriate, update only the root latest-index convenience copy.
8. Update [deweb-mirror.md](deweb-mirror.md),
   [tapeout-submission.md](tapeout-submission.md) and the canonical-site mirror
   panel.
9. Record the transaction inventory and artifact hashes.

## Canonical-site deployment status

Redeployed on **2026-11-26 UTC** as Cloudflare Pages deployment `b20692a7`;
production is <https://civicord.pages.dev>. The deployment was made from the
locally rebuilt `frontend/dist` with:

```bash
cd frontend
npm run build
env -u CLOUDFLARE_API_KEY -u CLOUDFLARE_BASE_URL \
  npx wrangler pages deploy dist --project-name civicord --branch main
```

This deployment carries the evidence-led UX redesign: homepage audit anatomy
and research context, exact-hostname redirect fork, constituency evidence
dossiers, candidate address autopsies and the compressed TapeOut verification
panel. It supersedes `979b8859`, which carried the first mirror panel.

Post-deploy verification passed after propagation:

- `/` returned 200 and contained the audit anatomy, independent research
  context and exact-hostname redirect fork.
- `/data/candidates.json` returned 200 and the expected multi-megabyte snapshot.
- `/constituencies/st-ives/` rendered the St Ives page rather than the homepage
  fallback.
- `/api/summary` returned 200 JSON.
- `/api/corrections?all=1` returned 200 JSON.
- `/constituencies/holborn-and-st-pancras/` returned 200 and contained the
  seat dossier, mutually exclusive response classes, compressed TapeOut proof
  sequence, public verification-guide link, append-only publication-policy
  wording and manifest SHA-256
  `2993bbce8d018be26a1664abcb586f5b034cbb6fd7732c4a17e056e877465901`.
- `/candidates/55924` returned 200 and contained the candidate address autopsy
  plus compressed “More actions” disclosure.
- Preview deployment <https://b20692a7.civicord.pages.dev/> returned 200.

## Remaining submission gates

- Owner review of the pre-filled Google Form draft. The public v5 demo URL is
  recorded in [tapeout-submission.md](tapeout-submission.md).
- The unguided external comprehension test was **not run**; the owner elected
  on 2026-11-26 to proceed without it. Do not represent it as completed.
- Submit the Google Form by the internal deadline, 2026-12-04; final
  submission requires the owner's Google sign-in.
