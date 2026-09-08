# Onchain Plan (ENSv2)

## Goal

Publish the liveness audit as a tamper-evident onchain record. Each of the 2,375
candidates gets an ENSv2 subname under our parent name on Sepolia, with the website URL,
snapshot hashes, and liveness status as text records. All writes go through
[ENSv2](https://docs.ens.domains/ensv2/overview) Enhanced Access Control — only the
Civicord key can update a candidate's records.

## Status (updated 2026-09-09)

- **Live parent name: `civicord.eth`** (registered 2026-09-09 via the official
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
- **Deployer EOA** `0xfa104deA24CbC347100adE461883403bdd79E0eC` — key lives
  **outside the repo** at `~/.config/civicord/sepolia.key`.
- **Minting**: blast-mode publisher (`publish.py --blast`) signs offline and fires
  raw txs without waiting for receipts (~50× faster than sequential `cast send`).
  Runs rotate across multiple RPCs (Alchemy primary + public fallbacks) and are
  fully idempotent/resumable: registration skipped when `getResolver(label) != 0`,
  records skipped when the on-chain `url` text already matches.
- **Smoke test passed** 2026-09-08: p9/p15/p16 resolve with url + status +
  `vnd.civicord.person_name` via `text()` reads against the resolver.
- **Gas reality check** (measured on Sepolia): `register()` ≈ 1.20M gas,
  `setText()` ≈ 0.30M gas → ~2.1M gas (~0.002 ETH @ ~1 gwei) per candidate for
  register + 3 texts. Full 2,375 ≈ 4.5 ETH Sepolia. Run currently paused at
  ~348/2,375 awaiting more faucet ETH — resume is one command and duplicate-free.
- Manifest (ens_name, person_id, name, url, status, node) written to
  `data/out/onchain_manifest.csv` at the end of each run.

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
   (commit-reveal), 2026-09-09 — canonical. `civicordhq.eth` (2026-09-08) kept
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
- Graph subgraph over these events (separate Wed work item)
