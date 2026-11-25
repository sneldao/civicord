#!/usr/bin/env python3
"""Prepare or publish a Civicord evidence bundle to X Layer DeWEB.

Dry-run is the default and requires no keys. It verifies chain/contract shape,
resolves the container, diffs local files against SiteRegistry metadata, estimates
gas where possible, and writes a publication plan. Broadcast support exists for a
later explicit human confirmation and uses Foundry keystores only — never a raw
private-key argument.

Example dry run:
  python scripts/tapeout/deweb_publish.py \
    data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11 \
    --processor 0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355 --token-id 6 \
    --from 0x1F4d4B97d9cFD57b2F5CED5b87249ECCa95920E5
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
CHAIN_ID = 196
RPC_DEFAULT = "https://rpc.xlayer.tech"
FACTORY = "0x1f09DAeFA827f02CBb40967cc91b259763760761"
OPENER = "0x536adD8F30f03b69f6fbF29d425A816A0dC50106"
SITEREG = "0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6"
DOMBIND = "0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9"
CHUNK_MAX = 24_000
MAX_FILE_BYTES = 350 * CHUNK_MAX
ZERO_HASH = "0x" + "00" * 32


def cast_bin() -> str:
    found = shutil.which("cast")
    if found:
        return found
    candidate = Path.home() / ".foundry" / "bin" / "cast"
    if candidate.exists():
        return str(candidate)
    raise SystemExit("cast CLI not found; install Foundry first")


CAST = cast_bin()


def run_cast(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run([CAST, *args], text=True, capture_output=True, check=check, timeout=120)


def cast_out(args: list[str]) -> str:
    return run_cast(args).stdout.strip()


def first_number(text: str) -> int:
    match = re.search(r"\d+", text)
    return int(match.group(0)) if match else 0


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def content_type_for(path: str) -> str:
    suffix = Path(path).suffix.lower()
    return {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".txt": "text/plain; charset=utf-8",
        ".xml": "application/xml",
        ".wasm": "application/wasm",
    }.get(suffix, "application/octet-stream")


def validate_relative_path(path: str) -> None:
    if not path or path.startswith("/") or "\\" in path:
        raise SystemExit(f"unsafe DeWEB path: {path!r}")
    parts = path.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise SystemExit(f"DeWEB path contains a dot/empty segment: {path!r}")
    if any(ord(ch) < 0x20 for ch in path):
        raise SystemExit(f"DeWEB path contains a control character: {path!r}")
    if not unicodedata.is_normalized("NFC", path):
        raise SystemExit(f"DeWEB path is not Unicode NFC-normalized: {path!r}")


def join_chain_path(prefix: str, rel: str) -> str:
    validate_relative_path(rel)
    if not prefix:
        return rel
    validate_relative_path(prefix)
    return f"{prefix.rstrip('/')}/{rel}"


def parse_file_info(output: str) -> dict[str, Any]:
    lines = output.strip().splitlines()
    if len(lines) < 5:
        raise RuntimeError(f"unexpected fileInfo output: {output!r}")
    return {
        "size": first_number(lines[0]),
        "contentType": lines[1].strip().strip('"'),
        "sha256": lines[2].strip().lower(),
        "updatedAt": first_number(lines[3]),
        "chunkCount": first_number(lines[4]),
    }


def file_info(rpc: str, container: str, path: str) -> dict[str, Any]:
    out = cast_out(
        [
            "call",
            SITEREG,
            "fileInfo(address,string)(uint32,string,bytes32,uint40,uint256)",
            container,
            path,
            "--rpc-url",
            rpc,
        ]
    )
    return parse_file_info(out)


def read_file_bytes(rpc: str, container: str, path: str) -> bytes:
    out = cast_out(
        [
            "call",
            SITEREG,
            "read(address,string)(bytes)",
            container,
            path,
            "--rpc-url",
            rpc,
        ]
    )
    return bytes.fromhex(out.removeprefix("0x"))


def scan_bundle(bundle: Path) -> list[dict[str, Any]]:
    if not bundle.exists() or not bundle.is_dir():
        raise SystemExit(f"bundle directory does not exist: {bundle}")
    files = []
    for path in sorted(p for p in bundle.rglob("*") if p.is_file()):
        rel = str(path.relative_to(bundle))
        validate_relative_path(rel)
        data = path.read_bytes()
        if len(data) > MAX_FILE_BYTES:
            raise SystemExit(f"{rel} is {len(data)} bytes, over the {MAX_FILE_BYTES} DeWEB limit")
        files.append(
            {
                "path": rel,
                "bytes": len(data),
                "sha256": sha256_bytes(data),
                "contentType": content_type_for(rel),
                "chunks": max(1, (len(data) + CHUNK_MAX - 1) // CHUNK_MAX),
                "source": str(path),
            }
        )
    if not files:
        raise SystemExit(f"bundle has no files: {bundle}")
    return files


def default_prefix(bundle: Path) -> str:
    try:
        manifest = json.loads((bundle / "manifest.json").read_text(encoding="utf-8"))
        cohort = manifest.get("cohort", {})
        slug = cohort.get("slug")
        version = manifest.get("bundleVersion")
        if slug and version:
            return f"civicord/uk-2024-25/{slug}/{version}"
    except (json.JSONDecodeError, OSError, KeyError, TypeError, UnicodeDecodeError):
        return f"civicord/evidence-bundle/{bundle.name}"
    return f"civicord/evidence-bundle/{bundle.name}"


def ensure_chain_shape(rpc: str) -> None:
    actual = cast_out(["chain-id", "--rpc-url", rpc])
    if actual != str(CHAIN_ID):
        raise SystemExit(f"RPC chain id is {actual}, expected {CHAIN_ID}")
    for label, address in {
        "opener": OPENER,
        "SiteRegistry": SITEREG,
        "DomainBinding": DOMBIND,
    }.items():
        code = cast_out(["code", address, "--rpc-url", rpc])
        if code in ("", "0x"):
            raise SystemExit(f"no code at {label} {address}")


def resolve_container(args: argparse.Namespace) -> dict[str, Any]:
    rpc = args.rpc
    result: dict[str, Any] = {}
    if args.container:
        code = cast_out(["code", args.container, "--rpc-url", rpc])
        if code in ("", "0x"):
            raise SystemExit(f"no code at container {args.container}")
        opened = cast_out(
            ["call", SITEREG, "isOpenedContainer(address)(bool)", args.container, "--rpc-url", rpc]
        )
        if opened != "true":
            raise SystemExit(
                f"{args.container} is not an opened TapeOut container; pass processor/token instead"
            )
        if not args.from_address:
            raise SystemExit(
                "--from is required with --container so onlyEditor gas estimates are meaningful"
            )
        result.update(
            {
                "container": args.container,
                "opened": True,
                "processor": None,
                "tokenId": None,
                "owner": args.from_address,
            }
        )
        return result

    processor = args.processor
    token_id = str(args.token_id)
    if not processor or not token_id:
        raise SystemExit("pass either --container or both --processor and --token-id")
    code = cast_out(["code", processor, "--rpc-url", rpc])
    if code in ("", "0x"):
        raise SystemExit(f"no code at processor {processor}")
    is_cpu = cast_out(["call", FACTORY, "isCPU(address)(bool)", processor, "--rpc-url", rpc])
    if is_cpu != "true":
        raise SystemExit(f"{processor} is not a TapeOut processor from factory {FACTORY}")
    owner = cast_out(["call", processor, "ownerOf(uint256)(address)", token_id, "--rpc-url", rpc])
    container = cast_out(
        [
            "call",
            OPENER,
            "accountOf(address,uint256)(address)",
            processor,
            token_id,
            "--rpc-url",
            rpc,
        ]
    )
    opened = (
        cast_out(
            [
                "call",
                OPENER,
                "isOpened(address,uint256)(bool)",
                processor,
                token_id,
                "--rpc-url",
                rpc,
            ]
        )
        == "true"
    )
    result.update(
        {
            "container": container,
            "opened": opened,
            "processor": processor,
            "tokenId": int(token_id),
            "owner": owner,
        }
    )
    return result


def estimate_gas(
    rpc: str,
    contract: str,
    signature: str,
    args: list[str],
    *,
    from_address: str | None,
    value_wei: int = 0,
) -> tuple[int | None, str | None]:
    cmd = ["estimate", contract, signature, *args, "--rpc-url", rpc]
    if from_address:
        cmd.extend(["--from", from_address])
    if value_wei:
        cmd.extend(["--value", str(value_wei)])
    proc = run_cast(cmd, check=False)
    if proc.returncode == 0:
        try:
            return int(proc.stdout.strip().split()[0]), None
        except (IndexError, ValueError):
            return None, (proc.stderr or proc.stdout).strip()[-500:]
    return None, (proc.stderr or proc.stdout).strip()[-500:]


def fallback_file_gas(byte_count: int) -> int:
    # TapeKit documents roughly 200 gas per deployed byte plus contract overhead.
    return 60_000 + 200 * byte_count


def discover_open_fee(rpc: str, processor: str, token_id: int, from_address: str | None) -> int:
    cmd = [
        "estimate",
        OPENER,
        "open(address,uint256)",
        processor,
        str(token_id),
        "--value",
        "0",
        "--rpc-url",
        rpc,
    ]
    if from_address:
        cmd.extend(["--from", from_address])
    proc = run_cast(cmd, check=False)
    blob = (proc.stderr or "") + "\n" + proc.stdout
    match = re.search(r"0xf04f3db2[0-9a-fA-F]{128,}", blob)
    if match:
        data = match.group(0)
        try:
            return int(data[-64:], 16)
        except ValueError:
            pass
    # Documented real-world fallback from a prior small-site X Layer publication.
    return 80_000_000_000_000_000


def chunk_hex(path: Path, offset: int, length: int) -> str:
    with path.open("rb") as handle:
        handle.seek(offset)
        return "0x" + handle.read(length).hex()


def plan_publication(args: argparse.Namespace) -> dict[str, Any]:
    bundle = args.bundle.resolve()
    ensure_chain_shape(args.rpc)
    resolution = resolve_container(args)
    container = resolution["container"]
    from_address = args.from_address or resolution.get("owner")
    prefix = args.prefix if args.prefix is not None else default_prefix(bundle)
    if prefix:
        validate_relative_path(prefix)

    local_files = scan_bundle(bundle)
    plan_files: list[dict[str, Any]] = []
    for item in local_files:
        chain_path = join_chain_path(prefix, item["path"])
        validate_relative_path(chain_path)
        info = file_info(args.rpc, container, chain_path)
        exists = info["chunkCount"] != 0
        unchanged = (
            exists and info["size"] == item["bytes"] and info["sha256"] == "0x" + item["sha256"]
        )
        if exists and not unchanged:
            raise SystemExit(
                "immutable publication policy violation: chain already has different bytes at "
                f"{chain_path}; choose a new version prefix rather than overwriting"
            )
        action = "skip-unchanged" if unchanged else "publish"
        plan_files.append({**item, "chainPath": chain_path, "onchain": info, "action": action})

    open_planned = not resolution["opened"]
    open_fee_wei = 0
    open_gas = None
    open_estimate_error = None
    if open_planned:
        open_fee_wei = discover_open_fee(
            args.rpc, resolution["processor"], resolution["tokenId"], from_address
        )
        open_gas, open_estimate_error = estimate_gas(
            args.rpc,
            OPENER,
            "open(address,uint256)",
            [resolution["processor"], str(resolution["tokenId"])],
            from_address=from_address,
            value_wei=open_fee_wei,
        )

    gas_price = first_number(cast_out(["gas-price", "--rpc-url", args.rpc]))
    total_gas = 0
    estimates_live = True
    for item in plan_files:
        if item["action"] == "skip-unchanged":
            item["gasEstimate"] = 0
            item["estimateSource"] = "unchanged"
            continue
        path_obj = Path(item["source"])
        first_len = min(item["bytes"], CHUNK_MAX)
        calls = []
        first_chunk = chunk_hex(path_obj, 0, CHUNK_MAX)
        calls.append(
            (
                "putFile",
                SITEREG,
                "putFile(address,string,string,bytes32,bytes)",
                [
                    container,
                    item["chainPath"],
                    item["contentType"],
                    "0x" + item["sha256"],
                    first_chunk,
                ],
                first_len,
            )
        )
        for chunk_index in range(1, item["chunks"]):
            offset = chunk_index * CHUNK_MAX
            length = min(CHUNK_MAX, item["bytes"] - offset)
            calls.append(
                (
                    "appendChunk",
                    SITEREG,
                    "appendChunk(address,string,uint256,bytes)",
                    [
                        container,
                        item["chainPath"],
                        str(chunk_index),
                        chunk_hex(path_obj, offset, CHUNK_MAX),
                    ],
                    length,
                )
            )
        file_gas = 0
        live_for_file = True
        call_plan = []
        for op, contract, signature, call_args, byte_len in calls:
            if open_planned:
                # The container does not exist yet, so simulation is impossible before open().
                gas = fallback_file_gas(byte_len)
                err = "container not open; fallback formula"
                live_for_file = False
            else:
                gas, err = estimate_gas(
                    args.rpc, contract, signature, call_args, from_address=from_address
                )
                if gas is None:
                    gas = fallback_file_gas(byte_len)
                    live_for_file = False
            file_gas += gas
            call_plan.append(
                {
                    "op": op,
                    "contract": contract,
                    "signature": signature,
                    "argsPreview": call_args[:4] + ["<bytes>"],
                    "gasEstimate": gas,
                    "estimateError": err,
                }
            )
        estimates_live = estimates_live and live_for_file
        total_gas += file_gas
        item["gasEstimate"] = file_gas
        item["estimateSource"] = "eth_estimateGas" if live_for_file else "fallback formula"
        item["calls"] = call_plan

    fallback_path = None
    fallback_gas = 0
    fallback_error = None
    if args.set_fallback:
        fallback_path = join_chain_path(prefix, "index.html")
        if open_planned:
            fallback_gas = fallback_file_gas(0)
            fallback_error = "container not open; fallback formula"
            estimates_live = False
        else:
            gas, fallback_error = estimate_gas(
                args.rpc,
                SITEREG,
                "setFallback(address,string)",
                [container, fallback_path],
                from_address=from_address,
            )
            fallback_gas = gas if gas is not None else fallback_file_gas(0)
            if gas is None:
                estimates_live = False
        total_gas += fallback_gas

    bind_plan = None
    if args.bind:
        if not args.months:
            raise SystemExit("--bind requires --months")
        if not 1 <= args.months <= 120:
            raise SystemExit("--months must be between 1 and 120")
        name = args.bind if args.bind.endswith(".tape") else args.bind + ".tape"
        monthly_fee = first_number(
            cast_out(["call", DOMBIND, "monthlyFee()(uint256)", "--rpc-url", args.rpc])
        )
        value = monthly_fee * args.months
        gas, err = estimate_gas(
            args.rpc,
            DOMBIND,
            "bind(string,address,uint256)",
            [name, container, str(args.months)],
            from_address=from_address,
            value_wei=value,
        )
        bind_gas = gas if gas is not None else 200_000
        total_gas += bind_gas
        estimates_live = estimates_live and gas is not None
        bind_plan = {
            "name": name,
            "months": args.months,
            "monthlyFeeWei": monthly_fee,
            "valueWei": value,
            "gasEstimate": bind_gas,
            "estimateError": err,
        }

    if open_gas is not None:
        total_gas += open_gas
    elif open_planned:
        total_gas += 250_000
        estimates_live = False

    estimated_gas_cost_wei = total_gas * gas_price
    fee_total_wei = open_fee_wei + (bind_plan["valueWei"] if bind_plan else 0)
    estimated_total_wei = estimated_gas_cost_wei + fee_total_wei
    from_balance_wei = None
    funding_shortfall_wei = None
    if from_address:
        from_balance_wei = first_number(cast_out(["balance", from_address, "--rpc-url", args.rpc]))
        funding_shortfall_wei = max(0, estimated_total_wei - from_balance_wei)
    plan = {
        "mode": "broadcast" if args.broadcast else "dry-run",
        "chainId": CHAIN_ID,
        "rpc": args.rpc,
        "bundle": str(bundle),
        "prefix": prefix,
        "container": container,
        "processor": resolution.get("processor"),
        "tokenId": resolution.get("tokenId"),
        "owner": resolution.get("owner"),
        "from": from_address,
        "containerOpened": resolution["opened"],
        "open": {
            "planned": open_planned,
            "feeWei": open_fee_wei,
            "gasEstimate": open_gas,
            "estimateError": open_estimate_error,
        },
        "files": plan_files,
        "fallback": {
            "planned": bool(args.set_fallback),
            "path": fallback_path,
            "gasEstimate": fallback_gas,
            "estimateError": fallback_error,
        },
        "bind": bind_plan,
        "totals": {
            "filesTotal": len(plan_files),
            "filesToPublish": sum(1 for item in plan_files if item["action"] == "publish"),
            "filesUnchanged": sum(1 for item in plan_files if item["action"] == "skip-unchanged"),
            "payloadBytes": sum(item["bytes"] for item in plan_files),
            "gasEstimate": total_gas,
            "gasPriceWei": gas_price,
            "estimatedGasCostWei": estimated_gas_cost_wei,
            "feeWei": fee_total_wei,
            "estimatedTotalWei": estimated_total_wei,
            "estimatedTotalOKB": estimated_total_wei / 10**18,
            "fromBalanceWei": from_balance_wei,
            "fromBalanceOKB": (from_balance_wei / 10**18) if from_balance_wei is not None else None,
            "fundingShortfallWei": funding_shortfall_wei,
            "fundingShortfallOKB": (funding_shortfall_wei / 10**18)
            if funding_shortfall_wei is not None
            else None,
            "estimatesLive": estimates_live,
        },
        "safety": {
            "immutablePaths": True,
            "overwritingDifferentBytes": "aborted before broadcast",
            "rawPrivateKeysAccepted": False,
            "broadcastRequiresTypedConfirmation": True,
        },
    }
    return plan


def write_plan(plan: dict[str, Any], out: Path | None, bundle: Path) -> Path:
    if out is None:
        safe_name = bundle.name.replace("/", "-")
        out = REPO_ROOT / "data" / "out" / "deweb" / "publish-plans" / f"{safe_name}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    return out


def print_summary(plan: dict[str, Any], plan_path: Path) -> None:
    totals = plan["totals"]
    print(f"mode: {plan['mode']}")
    print(f"chain: {plan['chainId']} via {plan['rpc']}")
    print(f"container: {plan['container']} opened={plan['containerOpened']}")
    print(f"prefix: {plan['prefix']}")
    print(
        "files: "
        f"{totals['filesToPublish']} to publish, {totals['filesUnchanged']} unchanged, "
        f"{totals['payloadBytes']} payload bytes"
    )
    print(
        "estimate: "
        f"{totals['gasEstimate']} gas, fees {totals['feeWei']} wei, "
        f"total ~{totals['estimatedTotalOKB']:.8f} OKB "
        f"({'live eth_estimateGas' if totals['estimatesLive'] else 'includes fallback estimates'})"
    )
    if totals.get("fromBalanceWei") is not None:
        print(
            "from balance: "
            f"{totals['fromBalanceOKB']:.8f} OKB; "
            f"shortfall {totals['fundingShortfallOKB']:.8f} OKB"
        )
    print(f"plan written: {plan_path}")


def signer_args(args: argparse.Namespace) -> list[str]:
    if args.account:
        result = ["--account", args.account]
    elif args.keystore:
        result = ["--keystore", args.keystore]
    else:
        raise SystemExit("broadcast requires --account or --keystore (never a raw private key)")
    if args.password_file:
        result.extend(["--password-file", args.password_file])
    return result


def tx_hash_from_output(output: str) -> str | None:
    labelled = re.search(r"transactionHash\s*:?\s*(0x[0-9a-fA-F]{64})", output, re.IGNORECASE)
    if labelled:
        return labelled.group(1)
    match = re.search(r"^\s*(0x[0-9a-fA-F]{64})\s*$", output, re.MULTILINE)
    return match.group(1) if match else None


def send_call(
    rpc: str,
    signer: list[str],
    contract: str,
    signature: str,
    args: list[str],
    *,
    value_wei: int = 0,
) -> str | None:
    cmd = ["send", contract, signature, *args, "--rpc-url", rpc, *signer]
    if value_wei:
        cmd.extend(["--value", str(value_wei)])
    proc = run_cast(cmd, check=False)
    output = proc.stdout + "\n" + proc.stderr
    if proc.returncode != 0:
        raise RuntimeError(f"transaction failed for {signature}: {output[-1200:]}")
    return tx_hash_from_output(output)


def broadcast(args: argparse.Namespace, plan: dict[str, Any]) -> dict[str, Any]:
    try:
        cap_wei = int(Decimal(args.max_total_okb) * 10**18)
    except InvalidOperation as exc:
        raise SystemExit(f"invalid --max-total-okb value: {args.max_total_okb!r}") from exc
    estimated_total = plan["totals"]["estimatedTotalWei"]
    if cap_wei <= 0:
        raise SystemExit("--max-total-okb must be positive")
    if estimated_total > cap_wei:
        raise SystemExit(
            "broadcast aborted: estimated total "
            f"{estimated_total / 10**18:.8f} OKB exceeds cap {cap_wei / 10**18:.8f} OKB"
        )

    expected = f"publish {plan['container']} on chain 196"
    print(f"About to publish {plan['totals']['filesToPublish']} files to {plan['container']}.")
    print(f"Estimated cost in this plan: ~{plan['totals']['estimatedTotalOKB']:.8f} OKB.")
    print(f"Configured estimate cap: {cap_wei / 10**18:.8f} OKB.")
    print(
        "This cap applies to the plan estimate; review gas/fee output carefully before confirming."
    )
    print(f"Type exactly: {expected}")
    typed = input("confirmation> ").strip()
    if typed != expected:
        raise SystemExit("broadcast aborted: confirmation did not match")

    signer = signer_args(args)
    txs: list[dict[str, Any]] = []
    rpc = args.rpc
    container = plan["container"]

    if plan["open"]["planned"]:
        tx = send_call(
            rpc,
            signer,
            OPENER,
            "open(address,uint256)",
            [plan["processor"], str(plan["tokenId"])],
            value_wei=plan["open"]["feeWei"],
        )
        txs.append({"op": "open", "tx": tx})

    for item in plan["files"]:
        if item["action"] != "publish":
            continue
        source = Path(item["source"])
        first = chunk_hex(source, 0, CHUNK_MAX)
        tx = send_call(
            rpc,
            signer,
            SITEREG,
            "putFile(address,string,string,bytes32,bytes)",
            [container, item["chainPath"], item["contentType"], "0x" + item["sha256"], first],
        )
        txs.append({"op": "putFile", "path": item["chainPath"], "tx": tx})
        for chunk_index in range(1, item["chunks"]):
            offset = chunk_index * CHUNK_MAX
            tx = send_call(
                rpc,
                signer,
                SITEREG,
                "appendChunk(address,string,uint256,bytes)",
                [
                    container,
                    item["chainPath"],
                    str(chunk_index),
                    chunk_hex(source, offset, CHUNK_MAX),
                ],
            )
            txs.append(
                {"op": "appendChunk", "path": item["chainPath"], "chunk": chunk_index, "tx": tx}
            )

    if plan["fallback"]["planned"]:
        tx = send_call(
            rpc,
            signer,
            SITEREG,
            "setFallback(address,string)",
            [container, plan["fallback"]["path"]],
        )
        txs.append({"op": "setFallback", "tx": tx})

    if plan["bind"]:
        tx = send_call(
            rpc,
            signer,
            DOMBIND,
            "bind(string,address,uint256)",
            [plan["bind"]["name"], container, str(plan["bind"]["months"])],
            value_wei=plan["bind"]["valueWei"],
        )
        txs.append({"op": "bind", "name": plan["bind"]["name"], "tx": tx})

    plan["transactions"] = txs
    plan["mode"] = "broadcast-complete"
    return plan


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    root.add_argument("bundle", type=Path)
    target = root.add_mutually_exclusive_group(required=True)
    target.add_argument("--container")
    target.add_argument("--processor")
    root.add_argument("--token-id", type=int)
    root.add_argument("--rpc", default=RPC_DEFAULT)
    root.add_argument("--from", dest="from_address")
    root.add_argument("--prefix", default=None)
    root.add_argument("--set-fallback", action="store_true")
    root.add_argument("--bind")
    root.add_argument("--months", type=int)
    root.add_argument("--out", type=Path)
    root.add_argument("--broadcast", action="store_true")
    root.add_argument(
        "--max-total-okb",
        default="0.1",
        help="abort broadcast if the plan estimate exceeds this OKB amount (default: 0.1)",
    )
    root.add_argument("--account", help="Foundry keystore account name")
    root.add_argument("--keystore", help="Foundry keystore file/folder path")
    root.add_argument("--password-file", help="keystore password file for non-interactive use")
    return root


def main() -> int:
    args = parser().parse_args()
    if args.processor and args.token_id is None:
        raise SystemExit("--processor requires --token-id")
    plan = plan_publication(args)
    if args.broadcast:
        plan = broadcast(args, plan)
    out = write_plan(plan, args.out, args.bundle.resolve())
    print_summary(plan, out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
