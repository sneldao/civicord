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
    _cast,
    blast_send,
    call,
    env,
    get_pending_nonce,
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


def decode_string(hexdata: str) -> str:
    """Decode an ABI-encoded dynamic `string` return value from cast call."""
    raw = hexdata.removeprefix("0x")
    if len(raw) < 128:
        return ""
    # ABI: offset (32) | length (32) | data (padded). cast returns 0x + those.
    length = int(raw[64:128], 16)
    hex_data = raw[128 : 128 + length * 2]
    if len(hex_data) < length * 2:
        return ""
    return bytes.fromhex(hex_data).decode("utf-8", "replace")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--limit", type=int, default=0, help="0 = no limit")
    ap.add_argument("--records-only", action="store_true")
    ap.add_argument(
        "--ids",
        type=str,
        default="",
        help="comma-separated Democracy Club person ids (demo subset), e.g. 5693,17372,2504",
    )
    ap.add_argument(
        "--blast",
        action="store_true",
        help="fire raw signed txs without waiting for receipts (~50x faster)",
    )
    ap.add_argument(
        "--register-only",
        action="store_true",
        help="skip text records entirely (phase 1 of a two-phase run: register now, records later)",
    )
    args = ap.parse_args()

    rpc = env("RPC_URL")
    # Keep publish's blast rotation in sync with ensv2._resolve_rpc_endpoints()
    # (Alchemy primary → publicnode fallback), even when RPC_FALLBACKS is unset.
    from ensv2 import _resolve_rpc_endpoints  # local import to avoid cycle at top

    rpcs = _resolve_rpc_endpoints()
    # _resolve_rpc_endpoints already includes rpc as its first entry
    if rpcs[0] != rpc:
        rpc = rpcs[0]
    pk = env("PK")
    state = json.loads(STATE_FILE.read_text())
    registry, resolver, deployer = state["registry"], state["resolver"], state["deployer"]
    parent = state["parent_name"]

    candidates = load_audit()
    if args.ids.strip():
        wanted = {x.strip() for x in args.ids.split(",") if x.strip()}
        candidates = [c for c in candidates if str(c["person_id"]) in wanted]
        if not candidates:
            raise SystemExit(f"no candidates matched --ids {args.ids!r}")
        print(f"--ids filter: {len(candidates)} candidate(s)", flush=True)
    if args.limit:
        candidates = candidates[args.start : args.start + args.limit]
    elif args.start:
        candidates = candidates[args.start :]

    manifest_rows = []
    if args.blast:
        nonce = get_pending_nonce(deployer, rpc)
        pending_check = nonce
        # Sanity: if we used `latest` fallback and there are still pending
        # txs on a different endpoint, surface it early rather than silently
        # producing replacement-underpriced spam.
        try:
            latest = int(_cast(["nonce", deployer, "--rpc-url", rpc]).strip())
            if pending_check < latest:
                pending_check = latest
                nonce = latest
        except Exception:  # noqa: BLE001, S110 - nonce probe is best-effort; blast_send surfaces real errors
            pass
        print(f"blast nonce: pending={nonce} (rpc {rpc.split('//')[1][:24]})", flush=True)
    else:
        nonce = 0
    gas_cache: dict = {}
    failed = 0
    for i, c in enumerate(candidates, start=args.start + 1):
        label = f"p{c['person_id']}"  # ENS labels must start with a letter/digit-safe token
        full = f"{label}.{parent}"
        node = namehash(full)
        print(f"[{i}] {full} ({c['name']}) status={c.get('status', 'unknown')}", flush=True)

        reg_sig = "register(string,address,address,address,uint256,uint64)"
        reg_args = (
            label,
            deployer,
            "0x0000000000000000000000000000000000000000",
            resolver,
            "0",
            str(MAX_U64),
        )
        txt_sig = "setText(bytes32,string,string)"

        if not args.records_only:
            if args.blast:
                # idempotent: skip if this label already has a resolver
                if int(call(registry, "getResolver(string)", label), 16) != 0:
                    print("    already registered — refreshing records only", flush=True)
                else:
                    blast_send(
                        rpcs,
                        pk,
                        deployer,
                        registry,
                        reg_sig,
                        *reg_args,
                        nonce=nonce,
                        gas_cache=gas_cache,
                    )
                    nonce += 1
            else:
                try:
                    send(rpc, pk, registry, reg_sig, *reg_args)
                except RuntimeError as e:
                    if "LabelAlreadyRegistered" in str(e):
                        print(
                            "    already registered — skipping registration, refreshing records",
                            flush=True,
                        )
                    else:
                        raise
        if c.get("status") and not args.register_only:
            already_onchain = False
            if args.blast:
                # resume support: skip if url record already matches
                current = decode_string(
                    call(resolver, "text(bytes32,string)", "0x" + node.hex(), "url")
                )
                if current == c["sites"][0]:
                    print("    records already on-chain — skipping", flush=True)
                    already_onchain = True
            records = [
                ("url", c["sites"][0]),
                ("status", c["status"]),
                ("vnd.civicord.person_name", c["name"]),
            ]
            # NOTE: manifest rows are written for every candidate, including
            # resume-skipped ones — the frontend's Public Record blocks are
            # manifest-driven, so skipped candidates must still appear.
            # Atomic per-candidate: nonce advances only for ACCEPTED txs. On
            # failure we rewind to this candidate's first nonce so the next
            # pass re-signs identical txs and converges with any mempool copy
            # (no nonce gaps); the loop continues instead of dying on one bad
            # nonce and the 12-attempt wrapper eventually converges.
            if not already_onchain:
                try:
                    for key, value in records:
                        if args.blast:
                            blast_send(
                                rpcs,
                                pk,
                                deployer,
                                resolver,
                                txt_sig,
                                "0x" + node.hex(),
                                key,
                                value,
                                nonce=nonce,
                                gas_cache=gas_cache,
                            )
                            nonce += 1
                        else:
                            send(rpc, pk, resolver, txt_sig, "0x" + node.hex(), key, value)
                except Exception as e:  # noqa: BLE001 - transient; wrapper retries after drain
                    failed += 1
                    msg = str(e).strip().splitlines()[-1][:180]
                    print(
                        f"    transient failure on {full} — nonce {nonce} ({msg}), continuing",
                        flush=True,
                    )
                    # Resync to pending pool so the next candidate doesn't
                    # reuse a nonce already pending/mined after a partial write
                    # (avoids replacement-underpriced storms).
                    try:
                        fresh = get_pending_nonce(deployer, rpc)
                        if fresh > nonce:
                            print(f"    resync nonce {nonce} -> {fresh}", flush=True)
                            nonce = fresh
                    except Exception:  # noqa: BLE001, S110 - best-effort resync
                        pass
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
    print(
        f"Wrote {len(manifest_rows)} rows to {MANIFEST} (records failures in run: {failed})",
        flush=True,
    )
    if failed:
        # Any batch failed — manifest is still written for frontend wiring,
        # but the runner must not report success or partial on-chain state
        # would be treated as complete. Wrapper will drain + retry with a
        # fresh pending nonce; already-mined records will be skipped via the
        # on-chain url check.
        raise SystemExit(f"{failed} record batch(es) failed — not marking DONE")


if __name__ == "__main__":
    main()
