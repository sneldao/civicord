# ENSv2 claim path + EAC demo

## What “claim” means here

Today every `p{id}.civicord.eth` is owned by the Civicord deployer, with text
records (`url`, `status`, `vnd.civicord.person_name`) written by the publisher.
ENSv2’s Permissioned Resolver Enhanced Access Control (EAC) is how a
**candidate, party, or agent** later gets write rights **without** taking over
the whole name:

| Scope | Call | Effect |
|---|---|---|
| One text key on one name | `authorizeTextRoles(dnsName, key, account, true)` | Account may `setText` that key only |
| All text keys on one name | `authorizeNameRoles(dnsName, ROLE_SET_TEXT, account, true)` | Account may set any text on that name |
| Revoke | Same call with `false` | Write rights removed; further `setText` reverts |

Admin roles stay with the deployer until explicitly granted — so Civicord can
hand a candidate the pen for `url`/`status` corrections without making the
record unilaterally deletable by a third party.

## Proven on Sepolia (demo set)

Script: `python scripts/publish/eac_demo.py` (default ids `5693,17372,2504`).

Flow run on-chain:

1. Fund a throwaway **delegate** EOA
2. `authorizeTextRoles(..., "vnd.civicord.eac_demo", delegate, true)`
3. Delegate `setText` succeeds; `eth_call` readback matches
4. Revoke with `false`
5. Delegate `setText` **reverts** (`EACUnauthorized` / execution reverted)

Log: [eac-demo-log.json](eac-demo-log.json) (written by the script). Dedicated
key `vnd.civicord.eac_demo` so `url`/`status` used by the ledger stay intact.

## Live verify in the product

Candidate pages with an on-chain chip expose **Verify on-chain** →
`GET /api/ens?id={personId}` (Pages worker) → Sepolia `eth_call` of
`text(bytes32,string)` on PermissionedResolver
`0x340d18ecb0bbe7bd67b53e836f2f68cf620aee67`. No wallet required to read.

## Alias note (honest)

- **Registry dual parent:** `civicord.eth` and `civicordhq.eth` both point at the
  same UserRegistry (`setSubregistry`). Subnames resolve under either tree.
- **Not showcased:** PermissionedResolver `setAlias` (record-level alias
  pointer). Dual parent ≠ `setAlias`; we document the distinction rather than
  overclaim.

## Rebuild frontend chips from The Graph

Publisher CSV historically lagged full registration. Sync:

```bash
python scripts/publish/rebuild_manifest_from_graph.py
cd frontend && npm run build
```

Then deploy Pages as usual.
