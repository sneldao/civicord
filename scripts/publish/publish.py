"""Register candidate subnames + set text records on Sepolia (ENSv2).

Reads scripts/publish/.deployed.json (run deploy.py first), then iterates the
audit CSVs. Sequential cast-send transactions; use --start/--limit to chunk runs.

Usage:
  python scripts/publish/publish.py                # register all + set records
  python scripts/publish/publish.py --limit 50     # first 50 only
  python scripts/publish/publish.py --start 50 --limit 50
  python scripts/publish/publish.py --records-only # text records for already-registered
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from ensv2 import (
    env,
    namehash,
    send,
)

REPO_ROOT = Path(__file__).parent.parent.parent
STATE_FILE = Path(__file__).parent / ".deployed.json"
MANIFEST = REPO_ROOT / "data" / "out" / "onchain_manifest.csv"

MAX_U64 = 2**64 - 1


def load_audit() -> list[dict]:
    rows = {}
    with open(REPO_ROOT / "data" / "out" / "websites.csv", newline="") as f:
        for r in csv.DictReader(f):
            rows.setdefault(
                r["person_id"], {"person_id": r["person_id"], "name": r["person_name"], "sites": []}
            )
            rows[r["person_id"]]["sites"].append(r["url"])
    with open(REPO_ROOT / "data" / "out" / "audit_liveness.csv", newline="") as f:
        for r in csv.DictReader(f):
            entry = rows.get(r["person_id"])
            if entry is not None and r["url"] in entry["sites"]:
                entry.setdefault("status", r["status_class"])
    return sorted(rows.values(), key=lambda e: int(e["person_id"]))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--limit", type=int, default=0, help="0 = no limit")
    ap.add_argument("--records-only", action="store_true")
    args = ap.parse_args()

    rpc = env("RPC_URL")
    pk = env("PK")
    state = json.loads(STATE_FILE.read_text())
    registry, resolver, deployer = state["registry"], state["resolver"], state["deployer"]
    parent = state["parent_name"]

    candidates = load_audit()
    if args.limit:
        candidates = candidates[args.start : args.start + args.limit]
    elif args.start:
        candidates = candidates[args.start :]

    manifest_rows = []
    for i, c in enumerate(candidates, start=args.start + 1):
        label = f"p{c['person_id']}"  # ENS labels must start with a letter/digit-safe token
        full = f"{label}.{parent}"
        node = namehash(full)
        print(f"[{i}] {full} ({c['name']}) status={c.get('status', 'unknown')}")

        if not args.records_only:
            send(
                rpc,
                pk,
                registry,
                "register(string,address,address,address,uint256,uint64)",
                label,
                deployer,
                "0x0000000000000000000000000000000000000000",
                resolver,
                "0",
                str(MAX_U64),
            )
        if c.get("status"):
            send(
                rpc,
                pk,
                resolver,
                "setText(bytes32,string,string)",
                "0x" + node.hex(),
                "url",
                c["sites"][0],
            )
            send(
                rpc,
                pk,
                resolver,
                "setText(bytes32,string,string)",
                "0x" + node.hex(),
                "status",
                c["status"],
            )
            send(
                rpc,
                pk,
                resolver,
                "setText(bytes32,string,string)",
                "0x" + node.hex(),
                "vnd.civicord.person_name",
                c["name"],
            )
        manifest_rows.append(
            {
                "ens_name": full,
                "person_id": c["person_id"],
                "person_name": c["name"],
                "url": c["sites"][0],
                "status": c.get("status", ""),
                "node": "0x" + node.hex(),
            }
        )

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    new_file = not MANIFEST.exists() or args.start == 0
    with open(MANIFEST, "a" if not new_file else "w", newline="") as f:
        w = csv.DictWriter(
            f, fieldnames=["ens_name", "person_id", "person_name", "url", "status", "node"]
        )
        if new_file:
            w.writeheader()
        w.writerows(manifest_rows)
    print(f"Wrote {len(manifest_rows)} rows to {MANIFEST}")


if __name__ == "__main__":
    main()
