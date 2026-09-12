"""ENSv2 EAC grant → write → revoke demo on a few candidate names.

Proves PermissionedResolver per-record roles end-to-end:
  1. Deployer grants `authorizeTextRoles(..., key, delegate, true)`
  2. Delegate successfully `setText` on that key only
  3. Deployer revokes
  4. Delegate `setText` reverts (EACUnauthorized)

Uses a dedicated text key `vnd.civicord.eac_demo` so url/status stay intact.

Usage:
  export PK=$(tr -d '\\n' < ~/.config/civicord/sepolia.key)
  # optional: DELEGATE_PK / DELEGATE_ADDRESS (else reads ~/.config/civicord/eac-delegate.key)
  python scripts/publish/eac_demo.py
  python scripts/publish/eac_demo.py --ids 5693,17372,2504
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ensv2 import _cast, call, env, namehash, send

REPO_ROOT = Path(__file__).parent.parent.parent
STATE_FILE = Path(__file__).parent / ".deployed.json"
DELEGATE_KEY_FILE = Path.home() / ".config" / "civicord" / "eac-delegate.key"
DEMO_KEY = "vnd.civicord.eac_demo"
DEFAULT_IDS = "5693,17372,2504"
ROLE_SET_TEXT = 1 << 4  # PermissionedResolver ROLE_SET_TEXT


def dns_encode(name: str) -> str:
    """DNS wire-format name as 0x-hex (for authorize* `bytes toName`)."""
    out = b""
    for label in name.strip(".").split("."):
        b = label.encode("utf-8")
        if len(b) > 63:
            raise ValueError(f"label too long: {label!r}")
        out += bytes([len(b)]) + b
    out += b"\x00"
    return "0x" + out.hex()


def decode_string(hexdata: str) -> str:
    raw = hexdata.removeprefix("0x")
    if len(raw) < 128:
        return ""
    length = int(raw[64:128], 16)
    hex_data = raw[128 : 128 + length * 2]
    if len(hex_data) < length * 2:
        return ""
    return bytes.fromhex(hex_data).decode("utf-8", "replace")


def load_delegate() -> tuple[str, str]:
    """Return (address, private_key) for the EAC demo delegate."""
    pk = os.environ.get("DELEGATE_PK", "").strip()
    addr = os.environ.get("DELEGATE_ADDRESS", "").strip()
    if not pk and DELEGATE_KEY_FILE.exists():
        pk = DELEGATE_KEY_FILE.read_text().strip()
    if not pk:
        raise SystemExit(
            f"Missing DELEGATE_PK (or write a key to {DELEGATE_KEY_FILE}).\n"
            "Generate with: cast wallet new"
        )
    if not pk.startswith("0x"):
        pk = "0x" + pk
    if not addr:
        addr = _cast(["wallet", "address", "--private-key", pk]).strip()
    return addr, pk


def ensure_delegate_funded(rpc: str, deployer_pk: str, deployer: str, delegate: str) -> None:
    # `cast balance` prints decimal wei by default.
    bal = int(_cast(["balance", delegate, "--rpc-url", rpc]).strip(), 10)
    if bal >= 2 * 10**16:  # ≥ 0.02 ETH
        print(f"  delegate funded ({bal / 10**18:.6f} ETH)", flush=True)
        return
    print("  funding delegate with 0.03 ETH…", flush=True)
    _cast(
        [
            "send",
            delegate,
            "--value",
            "0.03ether",
            "--rpc-url",
            rpc,
            "--private-key",
            deployer_pk,
            "--from",
            deployer,
        ]
    )
    time.sleep(2)
    bal = int(_cast(["balance", delegate, "--rpc-url", rpc]).strip(), 10)
    print(f"  delegate balance now {bal / 10**18:.6f} ETH", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--ids", default=DEFAULT_IDS, help="comma-separated person ids")
    ap.add_argument(
        "--skip-write",
        action="store_true",
        help="only grant+revoke (no delegate setText)",
    )
    args = ap.parse_args()

    rpc = env("RPC_URL")
    pk = env("PK")
    if not pk.startswith("0x"):
        pk = "0x" + pk
    state = json.loads(STATE_FILE.read_text())
    resolver, deployer = state["resolver"], state["deployer"]
    parent = state["parent_name"]
    alias_parent = state.get("alias_parent_name", "civicordhq.eth")

    delegate, delegate_pk = load_delegate()
    print(f"resolver  {resolver}", flush=True)
    print(f"deployer  {deployer}", flush=True)
    print(f"delegate  {delegate}", flush=True)
    print(f"demo key  {DEMO_KEY}", flush=True)
    print(
        f"alias note: registry also wired under {alias_parent} "
        "(dual parent label ≠ PermissionedResolver.setAlias)",
        flush=True,
    )

    ensure_delegate_funded(rpc, pk, deployer, delegate)

    ids = [x.strip() for x in args.ids.split(",") if x.strip()]
    results: list[dict] = []

    for person_id in ids:
        full = f"p{person_id}.{parent}"
        node = "0x" + namehash(full).hex()
        dns = dns_encode(full)
        print(f"\n=== {full} ===", flush=True)

        # 1. Grant per-record ROLE_SET_TEXT for DEMO_KEY
        print("  grant authorizeTextRoles…", flush=True)
        tx_g = send(
            rpc,
            pk,
            resolver,
            "authorizeTextRoles(bytes,string,address,bool)",
            dns,
            DEMO_KEY,
            delegate,
            "true",
        )
        print(f"    grant tx {tx_g}", flush=True)

        # Also show name-level grant path exists (documented; one name only)
        if person_id == ids[0]:
            print(
                f"  (claim path) authorizeNameRoles ROLE_SET_TEXT={ROLE_SET_TEXT} "
                "would grant all text keys on this name — skipped to keep demo scoped",
                flush=True,
            )

        value = f"eac-ok:{int(time.time())}"
        if not args.skip_write:
            # 2. Delegate writes the dedicated key
            print(f"  delegate setText({DEMO_KEY!r})…", flush=True)
            tx_w = send(
                rpc,
                delegate_pk,
                resolver,
                "setText(bytes32,string,string)",
                node,
                DEMO_KEY,
                value,
            )
            print(f"    write tx {tx_w}", flush=True)
            onchain = decode_string(call(resolver, "text(bytes32,string)", node, DEMO_KEY))
            if onchain != value:
                raise SystemExit(f"readback mismatch: got {onchain!r} want {value!r}")
            print(f"    readback ok: {onchain}", flush=True)

        # 3. Revoke
        print("  revoke authorizeTextRoles…", flush=True)
        tx_r = send(
            rpc,
            pk,
            resolver,
            "authorizeTextRoles(bytes,string,address,bool)",
            dns,
            DEMO_KEY,
            delegate,
            "false",
        )
        print(f"    revoke tx {tx_r}", flush=True)

        # 4. Unauthorized write must fail (eth_call simulation — no gas needed)
        print("  expect unauthorized setText to revert…", flush=True)
        try:
            _cast(
                [
                    "call",
                    resolver,
                    "setText(bytes32,string,string)",
                    node,
                    DEMO_KEY,
                    "should-fail",
                    "--from",
                    delegate,
                    "--rpc-url",
                    rpc,
                ]
            )
            raise SystemExit("ERROR: unauthorized setText succeeded — EAC broken")
        except RuntimeError as e:
            msg = str(e)
            if "EACUnauthorized" in msg or "execution reverted" in msg or "revert" in msg.lower():
                print("    reverted as expected ✓", flush=True)
            else:
                raise

        results.append(
            {
                "ens": full,
                "person_id": person_id,
                "node": node,
                "delegate": delegate,
                "key": DEMO_KEY,
                "value": value if not args.skip_write else None,
                "grant_tx": tx_g,
                "revoke_tx": tx_r,
            }
        )

    out = REPO_ROOT / "docs" / "eac-demo-log.json"
    out.write_text(json.dumps({"network": "sepolia", "results": results}, indent=2) + "\n")
    print(f"\nWrote {out}", flush=True)
    print("EAC demo complete.", flush=True)


if __name__ == "__main__":
    main()
