# Publishing the audit onchain (ENSv2 on Sepolia)

## Prerequisites

- [Foundry](https://book.getfoundry.sh/) — all chain access goes through the
  `cast` CLI (no web3.py dependency)
- Python deps from the repo root (`pip install -e '.[dev]'`); `certifi` is
  used for TLS if present, with a `curl` fallback otherwise
- A funded Sepolia deployer key in `PK` (kept **outside** the repo)

## What this does

Reads `data/out/websites.csv` + `data/out/audit_liveness.csv`, then writes one ENSv2
subname per candidate under the civicord parent name, with text records. Produces
`data/out/onchain_manifest.csv` for the subgraph and frontend.

## Quickstart

```bash
# 1. Parent name: any name you own on Sepolia (e.g. registered via ETHRegistrar),
#    or reuse an existing one. Set its LABEL (not full name) below.
export PARENT_LABEL="myname"
export PARENT_REGISTRY=0x...        # registry that manages <PARENT_LABEL>.eth (ETHRegistry)
export PK=0x...                     # funded Sepolia deployer key
export RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# 2. Official ENSv2 addresses
export FACTORY=0x118bc31a50d559f7015a8da26d54b3b030cdb70f
export USER_REGISTRY_IMPL=0x...     # from ensdomains/contracts-v2 deployments/sepolia/UserRegistryImpl.json
export RESOLVER_IMPL=0x...           # PermissionedResolverImpl from same dir

# 3. Deploy registry + resolver proxies (idempotent — CREATE2 salts are deterministic)
python scripts/publish/deploy.py

# 4. Register all 2,375 candidate subnames + set text records (batched)
python scripts/publish/publish.py
```

## Text record schema

Written today by `publish.py`:

| Key | Value |
|---|---|
| `url` | Candidate website URL as scraped |
| `status` | Audit status class (live/http_error/dns_error/...) |
| `vnd.civicord.person_name` | Candidate name |

EAC demo only (`eac_demo.py`):

| Key | Value |
|---|---|
| `vnd.civicord.eac_demo` | Proof string written by a delegated key, then rights revoked |

## EAC claim-path demo

```bash
export PK=$(tr -d '\n' < ~/.config/civicord/sepolia.key)
# optional: write a throwaway key to ~/.config/civicord/eac-delegate.key
python scripts/publish/eac_demo.py --ids 5693,17372,2504
```

See `docs/ens-claim-path.md`.

## Refresh frontend chips from The Graph

```bash
python scripts/publish/rebuild_manifest_from_graph.py
cd frontend && npm run build
```

Planned (not yet written by the script):

| Key | Value |
|---|---|
| `snapshot_sha256` | SHA-256 of the candidate's scraped page text, if ingested |
| `last_audited` | Audit date (ISO) |
| `vnd.civicord.person_id` | Democracy Club person ID (also the ENS label itself) |

## Salts (deterministic, idempotent re-runs)

- Registry proxy salt: `keccak256(abi.encode("UserRegistry", namehash(PARENT), 0))`
- Resolver proxy salt: `keccak256(abi.encode("OwnedResolver", deployer, 0))`
- Re-running `deploy.py` re-derives the same CREATE2 address — factory call will revert,
  which the script treats as "already deployed" and reads the existing address instead.
