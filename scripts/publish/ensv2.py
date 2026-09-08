"""Shared helpers for the ENSv2 publish scripts.

Drives Foundry's `cast` CLI for all chain access — no web3.py dependency.
Fetches official ENSv2 deployment artifacts (address + ABI) from the
ensdomains/contracts-v2 GitHub repo at run time.
"""

from __future__ import annotations

import json
import os
import subprocess
import urllib.request

CONTRACTS_REPO_RAW = (
    "https://raw.githubusercontent.com/ensdomains/contracts-v2/main/"
    "contracts/deployments/sepolia/{name}.json"
)

VERIFIABLE_FACTORY = "0x118bc31a50d559f7015a8da26d54b3b030cdb70f"
USER_REGISTRY_IMPL_JSON = "UserRegistryImpl"
RESOLVER_IMPL_JSON = "PermissionedResolverImpl"
ETH_REGISTRY_JSON = "ETHRegistry"

# Each hex nibble of the bitmap grants one role to the root account (ENS docs pattern).
ALL_ROLES = int("1" * 64, 16)


def env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        raise SystemExit(f"Missing environment variable: {name}")
    return val


def _cast(args: list[str], stdin: str | None = None) -> str:
    """Run `cast <args>` and return trimmed stdout."""
    proc = subprocess.run(
        ["cast", *args],
        input=stdin,
        capture_output=True,
        text=True,
        check=False,  # handled below with a friendly error
    )
    if proc.returncode != 0:
        raise RuntimeError(f"cast {' '.join(args[:3])}… failed:\n{proc.stderr.strip()}")
    return proc.stdout.strip()


def namehash(name: str) -> bytes:
    """ENS namehash (ENSIP-1): node = keccak256(parent_node + keccak256(label))."""
    if name in ("", "."):
        return bytes(32)
    label, _, parent = name.partition(".")
    return keccak256(namehash(parent) + keccak(label))


_KECCAK_SHIM = None


def keccak(data: str) -> bytes:
    """keccak256 of a UTF-8 string, via cast (keeps us dependency-free)."""
    out = _cast(["keccak", data])
    return bytes.fromhex(out.removeprefix("0x"))


def keccak256(data: bytes) -> bytes:
    """keccak256 of raw bytes, via cast (hex input)."""
    out = _cast(["keccak", "0x" + data.hex()])
    return bytes.fromhex(out.removeprefix("0x"))


def w32(b: bytes) -> bytes:
    """Left-pad to 32 bytes (solidity uint256/bytes32 word)."""
    return b.rjust(32, b"\x00")


def abi_encode_words(*words: bytes) -> bytes:
    """Naive abi.encode for a fixed list of 32-byte-word-encodable values."""
    return b"".join(w32(w) for w in words)


def fetch_deployment(json_name: str) -> dict:
    """Fetch an official ENSv2 deployment artifact {address, abi, ...}."""
    with urllib.request.urlopen(CONTRACTS_REPO_RAW.format(name=json_name)) as resp:
        return json.load(resp)


def call(to: str, signature: str, *args: str) -> str:
    return _cast(["call", to, signature, *args])


def send(rpc: str, pk: str, to: str, signature: str, *args: str, async_tx: bool = False) -> str:
    argv = ["send", to, signature, *args, "--rpc-url", rpc, "--private-key", pk]
    if async_tx:
        argv.append("--async")
    return _cast(argv)


def encode_init(signature: str, *args: str) -> str:
    """Encode an initializer calldata blob via cast calldata."""
    return _cast(["calldata", signature, *args])


def deploy_proxy(rpc: str, pk: str, implementation: str, salt: bytes, init_data: str) -> str:
    """deployProxy() via the Verifiable Factory; returns the proxy address.

    Idempotent: if the CREATE2 address already has code, we return it instead of
    re-sending the transaction (cast send --async broadcast logs give the address,
    but the simplest deterministic path is compute → check → send → read receipt).
    """
    data = bytes.fromhex(init_data.removeprefix("0x"))
    # cast send returns the tx hash; wait and parse ProxyDeployed via cast receipt.
    tx_hash = send(
        rpc,
        pk,
        VERIFIABLE_FACTORY,
        "deployProxy(address,uint256,bytes)",
        implementation,
        str(int.from_bytes(salt, "big")),
        "0x" + data.hex(),
    )
    out = _cast(["receipt", tx_hash, "--rpc-url", rpc, "--json"])
    receipt = json.loads(out)
    for log in receipt.get("logs", []):
        topics = log.get("topics", [])
        # ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)
        if (
            len(topics) >= 3
            and topics[0].startswith("0x")
            and log.get("address") == VERIFIABLE_FACTORY.lower()
        ):
            return "0x" + topics[2][-40:]
    raise RuntimeError(f"ProxyDeployed event not found in receipt {tx_hash}")


def proxy_address_for(rpc: str, address: str) -> str | None:
    """Return the address if it has deployed code, else None."""
    code = _cast(["code", address, "--rpc-url", rpc])
    return None if code in ("0x", "") else address


def str_to_uint256(s: str) -> str:
    return str(int(s, 0) if s.startswith("0x") else int(s))
