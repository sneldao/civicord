# ENSv2 claim path + EAC demo

## What “claim” means here

Today every `p{id}.civicord.eth` is owned by the Civicord deployer, with text
records (`url`, `status`, `vnd.civicord.person_name`) written by the publisher.
ENSv2’s Permissioned Resolver Enhanced Access Control (EAC) is how a
**candidate, party, or agent** later gets write rights **without** taking over
the whole name. On the dedicated ETHOnline deployment the EAC surface is
setter-scoped:

| Scope | Call | Effect |
|---|---|---|
| One text key (all names on this resolver) | `grantSetterRoles(setTextCalldata, account)` | Account may `setText` that key only — resource derived from `keccak256(key)` |
| Revoke | `revokeRoles(keccak256(key), ROLE_SET_TEXT, account)` | Write rights removed; further `setText` reverts |

`ROLE_SET_TEXT = 1 << 4`. Note the honest scoping caveat: a setter grant applies
to **every name served by that resolver instance** — per-name isolation would
require separate resolver instances.

Admin roles stay with the deployer until explicitly granted — so Civicord can
hand a candidate the pen for `url`/`status` corrections without making the
record unilaterally deletable by a third party.

## Proven on Sepolia (demo set)

Script: `python scripts/publish/eac_demo.py` (default ids `5693,17372,2504`).

Flow run on-chain (hackathon deployment, `p5693.civicord.eth`):

1. Fund a throwaway **delegate** EOA
2. `grantSetterRoles(setText("vnd.civicord.eac_demo", …) calldata, delegate)`
3. Delegate `setText` succeeds; `eth_call` readback matches
4. `revokeRoles(keccak256("vnd.civicord.eac_demo"), ROLE_SET_TEXT, delegate)`
5. Delegate `setText` **reverts** (`EACUnauthorized` / execution reverted)

Txs: grant `0x5425f0…ea7b`, write `0x21cb4f…a7dc`, revoke `0xfa572b…3952`.

Log: [eac-demo-log.json](eac-demo-log.json) (written by the script). Dedicated
key `vnd.civicord.eac_demo` so `url`/`status` used by the ledger stay intact.

## Live verify in the product

Candidate pages with an on-chain chip expose **Verify on-chain** →
`GET /api/ens?id={personId}` (Pages worker) → Sepolia `eth_call` of
`resolve(bytes,bytes)` on PermissionedResolver
`0xa90747f2d95a9c4d0cad151669a9af31a3cad630` (dedicated ETHOnline deployment —
inner call is `text(bytes32,string)`). No wallet required to read.

## Deployment note (honest)

- **Current:** dedicated ETHOnline hackathon deployment — UserRegistry
  `0x097bdb198cb1a40cbd0c05ff801efe83bb151428`, PermissionedResolver
  `0xa90747f2d95a9c4d0cad151669a9af31a3cad630`. `civicord.eth` registered on the
  hackathon ETHRegistrar; resolves in the hackathon ENS App/Explorer.
- **Historical:** an earlier deployment on the standard ENSv2 Sepolia Beta
  (UserRegistry `0x0895…2aa9`, resolver `0x340d…ee67`, dual parent
  `civicord.eth`/`civicordhq.eth`) is superseded; kept here for provenance.

## Rebuild frontend chips from The Graph

Publisher CSV historically lagged full registration. Sync:

```bash
python scripts/publish/rebuild_manifest_from_graph.py
cd frontend && npm run build
```

Then deploy Pages as usual.
