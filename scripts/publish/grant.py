"""Grant or revoke ENSv2 PermissionedResolver ROLE_SET_TEXT for one text key
to one account — the operational form of the eac_demo.py proof, used when a
verified claim grants a candidate/party/agent write authority.

SCOPING CAVEAT (docs/ens-claim-path.md): a setter-scoped grant applies to
EVERY name served by this resolver instance, not one candidate's name. For
per-name isolation a candidate needs a dedicated resolver instance — until
that exists, use this only for keys delegates may write namespace-wide
(e.g. `vnd.civicord.corrections`), never for `url`/`status` handed to a
single claimant.

Usage:
  export PK=$(tr -d '\\n' < ~/.config/civicord/sepolia.key)
  export RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
  python scripts/publish/grant.py --account 0xDELEGATE --key vnd.civicord.corrections
  python scripts/publish/grant.py --account 0xDELEGATE --key vnd.civicord.corrections --revoke
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ensv2 import _cast, env, send

STATE_FILE = Path(__file__).parent / ".deployed.json"
ROLE_SET_TEXT = 1 << 4  # PermissionedResolver ROLE_SET_TEXT


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--account", required=True, help="Delegate address (0x…)")
    ap.add_argument(
        "--key", required=True, help="Text key the grant covers (e.g. vnd.civicord.corrections)"
    )
    ap.add_argument("--revoke", action="store_true", help="Revoke instead of grant")
    args = ap.parse_args()

    account = args.account.strip()
    if not (account.startswith("0x") and len(account) == 42):
        raise SystemExit(f"--account must be a 0x-prefixed address, got {account!r}")
    key = args.key.strip()
    if not key:
        raise SystemExit("--key must not be empty")

    rpc = env("RPC_URL")
    pk = env("PK")
    if not pk.startswith("0x"):
        pk = "0x" + pk
    state = json.loads(STATE_FILE.read_text())
    resolver = state["resolver"]

    # Same mechanics as eac_demo.py: grantSetterRoles reads only the setter
    # calldata's selector + key; revokeRoles takes uint256(keccak256(key)).
    setter = _cast(["calldata", "setText(bytes,string,string)", "0x", key, ""])
    resource = str(int(_cast(["keccak", key]).strip(), 16))

    print(f"resolver  {resolver}", flush=True)
    print(f"account   {account}", flush=True)
    print(f"key       {key}", flush=True)

    if args.revoke:
        tx = send(
            rpc,
            pk,
            resolver,
            "revokeRoles(uint256,uint256,address)",
            resource,
            str(ROLE_SET_TEXT),
            account,
        )
        print(f"revoke tx {tx}", flush=True)
    else:
        tx = send(
            rpc,
            pk,
            resolver,
            "grantSetterRoles(bytes,address)",
            setter,
            account,
        )
        print(f"grant tx {tx}", flush=True)
        print(
            "note: the grant covers this key on EVERY name on this resolver — "
            "see the scoping caveat in the docstring.",
            flush=True,
        )


if __name__ == "__main__":
    main()
