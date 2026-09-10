# Onchain Plan (ENSv2)

## Goal

Publish the liveness audit as a tamper-evident onchain record. Each of the 2,375
candidates gets an ENSv2 subname under our parent name on Sepolia, with the website URL,
snapshot hashes, and liveness status as text records. All writes go through
[ENSv2](https://docs.ens.domains/ensv2/overview) Enhanced Access Control — only the
Civicord key can update a candidate's records.

## Status (updated 2026-09-11 23:05 BST — subgraph v0.0.3 + gateway handle live)

> **2026-09-11 23:05:** gateway `civicord-aieyq.bazgateway.com` LIVE (`MCP Live · 5 tools`, Marketplace *Pending verification*, `100`/`200` mcents), subgraph `v0.0.3` `QmUcjfa4x4…` (`hasIndexingErrors:false` @ 8149999, syncing to 11677k — `v0.0.2` `QmQqGfVx…` faulted @ 11660475 due to unpadded `BigInt.toHexString()` → `Bytes.fromHexString` throw, `v0.0.1` pruned). See [ops.md](ops.md) and [plan.md](plan.md) for verify cURLs.

## Status (2026-09-09 21:30 BST — Alchemy + pending + decode fixes — baseline)

- **Live parent name: `civicord.eth`** (registered 2026-09-08 via the official
  ETHRegistrar commit-reveal; `civicordhq.eth` was registered 2026-09-08 during a
  first-pass — both labels point at the same UserRegistry, so candidate labels
  resolve under both trees). Candidate names are `p{person_id}.civicord.eth`.
  Text records are keyed by full node, so records published under the old
  `civicordhq` nodes are being refreshed under `civicord` nodes as the run
  resumes.
- **Proxies deployed** (Sepolia): UserRegistry `0x0895…2aa9`, PermissionedResolver
  `0x340d…ee67` (per-account resolver serving every deployer-owned name).
  Hierarchy wired: ETHRegistry `setSubregistry("civicordhq", UserRegistry)`.
  Deployment state (addresses only, no keys) in `scripts/publish/.deployed.json`
  (gitignored); ABIs cached in `scripts/publish/.abi-cache/`.
- **Deployer EOA** `0xfa104deA24CbC347100adE461883403bdd79E0eC` — the private
  key lives **outside the repo** (location deliberately undocumented).
- **Minting**: blast-mode publisher (`publish.py --blast`) signs offline and fires
  raw txs without waiting for receipts (~50× faster than sequential `cast send`).
  Now on **Alchemy primary** (`eth-sepolia.g.alchemy.com` derived from
  repo-root `.env:ALCHEMY_KEY` via `ensv2._resolve_rpc_endpoints()`, publicnode
  as fallback). `call()` and `blast_send()` share that resolution — previously
  `call()` hardcoded publicnode only, so the `--records-only` resume check
  always missed and every pass rewrote all ~7k `setText` txs. Runs are
  fully idempotent/resumable: registration skipped when `getResolver(label) != 0`,
  records skipped when the on-chain `url` text already matches (fixed tonight —
  `decode_string` was reading the wrong ABI word, so skip never fired).
- **Smoke test passed** 2026-09-08: p9/p15/p16 resolve with url + status +
  `vnd.civicord.person_name` via `text()` reads against the resolver.
- **Gas reality check** (measured on Sepolia): `register()` ≈ 1.20M gas,
  `setText()` ≈ 0.30M gas → ~2.1M gas (~0.002 ETH @ ~1 gwei) per candidate for
  register + 3 texts.
  **On-chain state audited 2026-09-09 21:30 BST** (via `getResolver(label)` + `text(node,url)` reads;
  labels are `p<person_id>`, i.e. raw dataset IDs like `p122389`, NOT a 1..N index):
  - **~2,375 / 2,375 labels registered** — all labels now resolve (Alchemy reads confirmed).
  - **~50% of `url` text records on the canonical `civicord.eth` nodes** (every-50th and
    every-100th samples both ~50% match before tonight's `decode_string` fix; post-fix the
    resume check honestly skips ~1,180 already-written candidates, so the in-flight
    `records-only` pass should write only the remaining ~1,195 × 3 texts). Earlier
    reports of `4 / 2,375` were the smoke-test subset; the register phase had already
    topped up the registry before the evening blast runs.
  - **Wrapper:** `/tmp/recordsloop.sh` (12 attempts, Alchemy primary, `PK` from
    `$HOME/.config/civicord/sepolia.key`, drains `pending == latest` between attempts).
    `publish.py` now starts from `get_pending_nonce()` (pending pool, not `latest`) and
    resyncs to the pending pool after any partial failure within a candidate (replaces
    the old `rewind-to-start_nonce` loop that caused `nonce too low` storms). Also
    fails fast if any batch fails — previously it printed `Wrote 2375 rows` + `RECORDS
    DONE` with 0 successful writes and exited 0.
  - Deployer wallet `0xfa10…E0eC`: **~2.15 ETH** (was 2.27 before the evening retries,
    was 0.9055 before the Sepolia top-up). Actual record burn ≈ 0.01 ETH per ~60
    candidates; comfortably funded for the remaining ~1.2k records.
- Manifest (ens_name, person_id, name, url, status, node) written to
  `data/out/onchain_manifest.csv` at the end of each run. Committed
  `frontend/src/data/candidates.json` (2,514,165 bytes, 2,375 candidates) is
  manifest-driven and already shows `onchain 2375` — the on-chain *content*
  (the `text` records themselves) is still catching up in the in-flight pass
  above; the JSON will be re-uploaded to R2 after the tail verifies.

## Architecture

```
civicord.eth (parent .eth name on Sepolia, owned by deployer; civicordhq.eth aliased)
  └─ ETHRegistry: setSubregistry("civicord", USER_REGISTRY_PROXY)
       └── UserRegistry proxy (via VerifiableFactory.deployProxy)
             ├── {person-id}.civicord.eth   × 2,375 (register())
             └── PermissionedResolver proxy (via VerifiableFactory.deployProxy)
                   └── text records: url, status, snapshot hashes, last-audited
```

- **Deployer EOA** = registrar + record writer (all roles on the UserRegistry root
  resource, ALL_ROLES bitmap).
- **UserRegistry init**: `initialize(rootAccount = deployer, roleBitmap = ALL_ROLES)`
  where `ALL_ROLES = 0x1111…1111` (111 roles, each nibble = one role for the root
  account).
- **Resolver init**: `initialize(admin = deployer, roleBitmap = ALL_ROLES, setters = [])`.
- One resolver serves all names owned by the deployer (per-account resolver model).

## Steps

1. **Parent name** — ✅ done: `civicord.eth` registered via the ETHRegistrar
   (commit-reveal), 2026-09-08 — canonical. `civicordhq.eth` (2026-09-08) kept
   as an alias pointing at the same UserRegistry.
2. **Registry proxy** — `deployProxy(USER_REGISTRY_IMPL, salt, init)` with salt
   `keccak256(abi.encode("UserRegistry", namehash("civicord.eth"), 0))`; then
   `setSubregistry("civicord", proxy)` on the ETHRegistry.
3. **Resolver proxy** — `deployProxy(PERMISSIONED_RESOLVER_IMPL, salt, init)` with salt
   `keccak256(abi.encode("OwnedResolver", deployer, 0))`; then `setResolver(label)` per
   candidate (batched, in the register call itself — `register()` accepts a resolver).
4. **Batch register** — 2,375 ×
   `register(label = person_id, owner = deployer, registry = 0, resolver = resolverProxy, roleBitmap = 0, expiry = type(uint64).max)`.
5. **Batch set records** — `setText(node, key, value)` for url / status / snapshot
   hashes / last_audited per candidate.
6. **Verify** — `factory.verifyContract(proxy, impl) == true` for both proxies; spot-check
   `text()` reads on a few names.

## Sepolia deployment addresses (official ENSv2)

Sourced from `ensdomains/contracts-v2` → `contracts/deployments/sepolia/`:

| Contract | Address |
|---|---|
| VerifiableFactory | `0x118bc31a50d559f7015a8da26d54b3b030cdb70f` |
| UserRegistryImpl | from `deployments/sepolia/UserRegistryImpl.json` (script reads it) |
| PermissionedResolverImpl | from `deployments/sepolia/PermissionedResolverImpl.json` |
| ETHRegistry | from `deployments/sepolia/ETHRegistry.json` |

The publish scripts fetch these ABIs/addresses directly from the
`ensdomains/contracts-v2` GitHub repo at run time, so addresses never go stale in our
code.

## Files

- `contracts/ENSv2Minimal.sol` — minimal interfaces typed against the official deployment
  (we deploy **no** new contracts; ENSv2's factories + official implementations only)
- `scripts/publish/deploy.py` — registry + resolver proxy deployment (idempotent)
- `scripts/publish/publish.py` — batch registration + text records + manifest
- `scripts/publish/README.md` — usage + record schema

## Out of scope this week

- `civicord publish` CLI subcommand (scripts are run manually)
- Mainnet, IPNS/contenthash resolution, cross-chain
- Graph subgraph over these events — **now done:** `v0.0.3` live (see Status note above)
