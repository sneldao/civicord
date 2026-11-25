#!/usr/bin/env python3
"""Verify a local Civicord evidence bundle directly against X Layer DeWEB.

The verifier is intentionally read-only. It pins one block height, requires all
configured RPC endpoints to agree at that height, checks the pinned SiteRegistry
implementation, compares fileInfo metadata, reads every file byte-for-byte, and
hashes the bytes locally. It does not trust a gateway response.

Example:
  python scripts/tapeout/verify_deweb.py \
    data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11 \
    --container 0xB078da6de46795656187052322Dda3A7E249C288 \
    --prefix civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
CHAIN_ID = 196
DEFAULT_RPCS = ["https://rpc.xlayer.tech", "https://xlayer.drpc.org"]
SITEREG = "0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6"
EXPECTED_IMPLEMENTATION = "0xa85c4143d1d4a77f54b8e4ecc9e6d1418afea45f"


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
    if not match:
        raise ValueError(f"no integer in cast output: {text!r}")
    return int(match.group(0))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_relative_path(path: str) -> None:
    if not path or path.startswith("/") or "\\" in path:
        raise SystemExit(f"unsafe DeWEB path: {path!r}")
    if any(part in ("", ".", "..") for part in path.split("/")):
        raise SystemExit(f"DeWEB path contains a dot/empty segment: {path!r}")


def join_chain_path(prefix: str, rel: str) -> str:
    validate_relative_path(rel)
    if not prefix:
        return rel
    validate_relative_path(prefix)
    return f"{prefix.rstrip('/')}/{rel}"


def default_prefix(bundle: Path) -> str:
    try:
        manifest = json.loads((bundle / "manifest.json").read_text(encoding="utf-8"))
        slug = manifest.get("cohort", {}).get("slug")
        version = manifest.get("bundleVersion")
        if slug and version:
            return f"civicord/uk-2024-25/{slug}/{version}"
    except (json.JSONDecodeError, OSError, TypeError, UnicodeDecodeError):
        pass
    return f"civicord/evidence-bundle/{bundle.name}"


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


def scan_bundle(bundle: Path) -> list[dict[str, Any]]:
    if not bundle.is_dir():
        raise SystemExit(f"bundle directory does not exist: {bundle}")
    files = []
    for path in sorted(p for p in bundle.rglob("*") if p.is_file()):
        rel = str(path.relative_to(bundle))
        validate_relative_path(rel)
        data = path.read_bytes()
        files.append(
            {
                "path": rel,
                "bytes": len(data),
                "sha256": sha256_bytes(data),
                "contentType": content_type_for(rel),
                "source": str(path),
            }
        )
    if not files:
        raise SystemExit(f"bundle has no files: {bundle}")
    return files


def parse_file_info(output: str) -> dict[str, Any]:
    lines = output.strip().splitlines()
    if len(lines) < 5:
        raise ValueError(f"unexpected fileInfo output: {output!r}")
    return {
        "size": first_number(lines[0]),
        "contentType": lines[1].strip().strip('"'),
        "sha256": lines[2].strip().lower(),
        "updatedAt": first_number(lines[3]),
        "chunkCount": first_number(lines[4]),
    }


def call_at_block(rpc: str, block: int, signature: str, args: list[str]) -> str:
    return cast_out(
        [
            "call",
            SITEREG,
            signature,
            *args,
            "--block",
            str(block),
            "--rpc-url",
            rpc,
        ]
    )


def implementation_at_block(rpc: str, block: int) -> str:
    return cast_out(
        [
            "implementation",
            SITEREG,
            "--block",
            str(block),
            "--rpc-url",
            rpc,
        ]
    ).lower()


def block_number(rpc: str) -> int:
    return first_number(cast_out(["block-number", "--rpc-url", rpc]))


def chain_id(rpc: str) -> int:
    return first_number(cast_out(["chain-id", "--rpc-url", rpc]))


def read_chain_file(rpc: str, block: int, container: str, path: str) -> bytes:
    out = call_at_block(
        rpc,
        block,
        "read(address,string)(bytes)",
        [container, path],
    )
    return bytes.fromhex(out.removeprefix("0x"))


def file_info_at_block(rpc: str, block: int, container: str, path: str) -> dict[str, Any]:
    out = call_at_block(
        rpc,
        block,
        "fileInfo(address,string)(uint32,string,bytes32,uint40,uint256)",
        [container, path],
    )
    return parse_file_info(out)


def verify(args: argparse.Namespace) -> dict[str, Any]:
    bundle = args.bundle.resolve()
    prefix = args.prefix if args.prefix is not None else default_prefix(bundle)
    files = scan_bundle(bundle)
    rpcs = args.rpc
    errors: list[str] = []
    warnings: list[str] = []

    chain_ids: dict[str, int] = {}
    heights: dict[str, int] = {}
    implementations: dict[str, str] = {}
    for rpc in rpcs:
        try:
            chain_ids[rpc] = chain_id(rpc)
            heights[rpc] = block_number(rpc)
        except (subprocess.SubprocessError, OSError, ValueError) as exc:
            errors.append(f"RPC preflight failed for {rpc}: {exc}")

    if errors:
        return report_skeleton(args, bundle, prefix, rpcs, errors, warnings)

    bad_chains = {rpc: cid for rpc, cid in chain_ids.items() if cid != CHAIN_ID}
    if bad_chains:
        errors.append(f"wrong chain id(s), expected {CHAIN_ID}: {bad_chains}")

    pinned_block = min(heights.values())
    skew = max(heights.values()) - pinned_block
    if skew > 20:
        errors.append(f"RPC height skew is {skew} blocks; refusing to pin a block")
    elif skew > 5:
        warnings.append(f"RPC height skew is {skew} blocks; pinned to slowest endpoint height")

    opened_values = []
    for rpc in rpcs:
        try:
            opened_values.append(
                call_at_block(
                    rpc,
                    pinned_block,
                    "isOpenedContainer(address)(bool)",
                    [args.container],
                )
            )
            implementations[rpc] = implementation_at_block(rpc, pinned_block)
        except (subprocess.SubprocessError, OSError, ValueError) as exc:
            errors.append(f"container preflight failed for {rpc}: {exc}")

    if len(set(opened_values)) > 1:
        errors.append(f"container opened state differs across RPCs: {opened_values}")
    elif opened_values and opened_values[0] != "true":
        errors.append(
            f"{args.container} is not an opened TapeOut container at block {pinned_block}"
        )

    bad_impl = {
        rpc: impl for rpc, impl in implementations.items() if impl != EXPECTED_IMPLEMENTATION
    }
    if bad_impl:
        errors.append(
            "SiteRegistry implementation mismatch against pinned X Layer implementation "
            f"{EXPECTED_IMPLEMENTATION}: {bad_impl}"
        )

    file_results = []
    if not errors:
        for item in files:
            chain_path = join_chain_path(prefix, item["path"])
            infos = []
            payloads = []
            per_rpc: dict[str, Any] = {}
            for rpc in rpcs:
                try:
                    info = file_info_at_block(rpc, pinned_block, args.container, chain_path)
                    payload = read_chain_file(rpc, pinned_block, args.container, chain_path)
                    infos.append(info)
                    payloads.append(payload)
                    per_rpc[rpc] = {
                        "fileInfo": info,
                        "payloadBytes": len(payload),
                        "payloadSha256": sha256_bytes(payload),
                    }
                except (subprocess.SubprocessError, OSError, ValueError) as exc:
                    errors.append(f"{chain_path}: read failed via {rpc}: {exc}")
                    per_rpc[rpc] = {"error": str(exc)}

            if len({json.dumps(info, sort_keys=True) for info in infos}) > 1:
                errors.append(f"{chain_path}: fileInfo differs across RPCs")
            if len({payload.hex() for payload in payloads}) > 1:
                errors.append(f"{chain_path}: bytes differ across RPCs")

            if infos:
                info = infos[0]
                expected_hash = "0x" + item["sha256"]
                if info["chunkCount"] == 0:
                    errors.append(f"{chain_path}: no file registered at pinned block")
                if info["size"] != item["bytes"]:
                    errors.append(
                        f"{chain_path}: size mismatch local={item['bytes']} chain={info['size']}"
                    )
                if info["sha256"] != expected_hash:
                    errors.append(
                        f"{chain_path}: fileInfo sha256 mismatch local={expected_hash} chain={info['sha256']}"
                    )
                if info["contentType"] != item["contentType"]:
                    errors.append(
                        f"{chain_path}: contentType mismatch local={item['contentType']!r} chain={info['contentType']!r}"
                    )
            if payloads:
                payload = payloads[0]
                payload_hash = sha256_bytes(payload)
                if len(payload) != item["bytes"]:
                    errors.append(
                        f"{chain_path}: byte length mismatch local={item['bytes']} chain-read={len(payload)}"
                    )
                if payload_hash != item["sha256"]:
                    errors.append(
                        f"{chain_path}: byte sha256 mismatch local={item['sha256']} chain-read={payload_hash}"
                    )
            file_results.append(
                {
                    "path": item["path"],
                    "chainPath": chain_path,
                    "localBytes": item["bytes"],
                    "localSha256": item["sha256"],
                    "rpc": per_rpc,
                }
            )

    report = report_skeleton(args, bundle, prefix, rpcs, errors, warnings)
    report.update(
        {
            "chainIds": chain_ids,
            "heights": heights,
            "pinnedBlock": pinned_block,
            "implementations": implementations,
            "containerOpened": opened_values[0] == "true" if opened_values else False,
            "files": file_results,
        }
    )
    report["ok"] = not errors
    return report


def report_skeleton(
    args: argparse.Namespace,
    bundle: Path,
    prefix: str,
    rpcs: list[str],
    errors: list[str],
    warnings: list[str],
) -> dict[str, Any]:
    return {
        "schema": "civicord-deweb-verification/0.1",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "ok": False,
        "bundle": str(bundle),
        "container": args.container,
        "prefix": prefix,
        "siteRegistry": SITEREG,
        "expectedImplementation": EXPECTED_IMPLEMENTATION,
        "rpcs": rpcs,
        "errors": errors,
        "warnings": warnings,
        "trustNote": (
            "Gateway responses are not used. Operator independence is limited to the "
            "configured endpoints; rpc.xlayer.tech and xlayer.drpc.org are treated as "
            "separate operators for this verification report."
        ),
    }


def write_report(report: dict[str, Any], out: Path | None, bundle: Path) -> Path:
    if out is None:
        safe_container = report["container"].lower().removeprefix("0x")[:10]
        out = (
            REPO_ROOT
            / "data"
            / "out"
            / "deweb"
            / "verification"
            / f"{bundle.name}-{safe_container}.json"
        )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return out


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    root.add_argument("bundle", type=Path)
    root.add_argument("--container", required=True)
    root.add_argument("--prefix")
    root.add_argument(
        "--rpc",
        action="append",
        default=None,
        help="RPC endpoint; repeat for independent agreement checks",
    )
    root.add_argument("--out", type=Path)
    return root


def main() -> int:
    args = parser().parse_args()
    args.rpc = args.rpc or DEFAULT_RPCS
    if len(args.rpc) < 2:
        raise SystemExit(
            "pass at least two independent RPC endpoints; verification must fail closed"
        )
    report = verify(args)
    out = write_report(report, args.out, args.bundle.resolve())
    print(f"ok: {report['ok']}")
    print(f"files checked: {len(report.get('files', []))}")
    print(f"pinned block: {report.get('pinnedBlock')}")
    print(f"report written: {out}")
    if report["errors"]:
        print("errors:", file=sys.stderr)
        for error in report["errors"]:
            print(f"- {error}", file=sys.stderr)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
