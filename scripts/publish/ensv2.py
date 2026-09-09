"""Shared helpers for the ENSv2 publish scripts.

Drives Foundry's `cast` CLI for all chain access — no web3.py dependency.
Fetches official ENSv2 deployment artifacts (address + ABI) from the
ensdomains/contracts-v2 GitHub repo at run time.
"""

from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path

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
    """Read config from env, with .env file support (repo root).

    Set either RPC_URL/RPC_FALLBACKS directly, or ALCHEMY_KEY (plus optional
    ALCHEMY_NETWORK, default sepolia) to build the Alchemy endpoint.
    """
    val = os.environ.get(name)
    if not val:
        _load_dotenv()
        val = os.environ.get(name)
    if not val and name == "RPC_URL":
        key = os.environ.get("ALCHEMY_KEY", "")
        net = os.environ.get("ALCHEMY_NETWORK", "sepolia")
        if key:
            # Alchemy dashboard keys look like `...:alch_...` — take the part after the last colon.
            token = key.rsplit(":", 1)[-1]
            val = f"https://eth-{net}.g.alchemy.com/v2/{token}"
    if not val:
        raise SystemExit(f"Missing environment variable: {name}")
    return val


def _load_dotenv() -> None:
    """Load KEY=VALUE lines from the repo-root .env into os.environ (no overrides)."""
    dotenv = Path(__file__).parent.parent.parent / ".env"
    if not dotenv.exists():
        return
    for line in dotenv.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


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


def calldata(sig: str, *args) -> str:
    return _cast(["calldata", sig, *[str(a) for a in args]]).strip()


def blast_send(
    rpcs: list[str], pk: str, from_: str, to: str, sig: str, *args, nonce: int, gas_cache: dict
) -> str:
    """Sign offline and fire a raw tx without waiting for the receipt.

    `rpcs` is a list of endpoints, rotated on transient failures.
    Returns the tx hash. Caller tracks nonces; mined in order per account.
    """
    data = calldata(sig, *args)
    key = f"{to}:{sig}"
    if key not in gas_cache:
        est = int(
            _cast(["estimate", to, data, "--from", from_, "--rpc-url", rpcs[0]]).strip(),
            16,
        )
        gas_cache[key] = int(est * 1.3) + 20_000
    last: Exception | None = None
    for attempt in range(3 * len(rpcs)):
        url = rpcs[attempt % len(rpcs)]
        try:
            raw = _cast(
                [
                    "mktx",
                    "--rpc-url",
                    url,
                    "--private-key",
                    pk,
                    "--nonce",
                    str(nonce),
                    "--gas-limit",
                    str(gas_cache[key]),
                    to,
                    data,
                ]
            ).strip()
            return _cast(["rpc", "eth_sendRawTransaction", raw, "--rpc-url", url]).strip()
        except RuntimeError as e:
            last = e
            msg = str(e)
            transient = (
                "timed out" in msg
                or "sending request" in msg
                or "429" in msg
                or "rate" in msg.lower()
                or "replacement transaction underpriced" in msg
                or "already known" in msg
            )
            if not transient or attempt == 3 * len(rpcs) - 1:
                raise
            print(f"    rpc hiccup ({url.split('//')[1][:24]}), rotating…", flush=True)
            time.sleep(1)
    raise last  # pragma: no cover


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
    """Fetch an official ENSv2 deployment artifact {address, abi, ...}.

    Prefers a local cache (populated via scripts/publish/cache_deployments.sh,
    which uses curl) so we don't depend on Python's CA bundle; falls back to
    urllib with a certifi SSL context.
    """
    cache = Path(__file__).parent / ".abi-cache" / json_name
    if cache.exists():
        return json.loads(cache.read_text())
    try:
        import ssl

        import certifi

        ctx = ssl.create_default_context(cafile=certifi.where())
        with urllib.request.urlopen(CONTRACTS_REPO_RAW.format(name=json_name), context=ctx) as resp:
            return json.load(resp)
    except (urllib.error.URLError, ModuleNotFoundError):
        # Last resort: curl (system CA store)
        out = subprocess.run(
            ["curl", "-sf", CONTRACTS_REPO_RAW.format(name=json_name)],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        return json.loads(out)


def call(to: str, signature: str, *args: str) -> str:
    endpoints = [os.environ.get("RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")]
    endpoints += [u for u in os.environ.get("RPC_FALLBACKS", "").split(",") if u.strip()]
    last: Exception | None = None
    for url in endpoints:
        try:
            return _cast(["call", to, signature, *args, "--rpc-url", url])
        except RuntimeError as e:
            last = e
    raise last  # pragma: no cover


def send(rpc: str, pk: str, to: str, signature: str, *args: str, async_tx: bool = False) -> str:
    argv = ["send", to, signature, *args, "--rpc-url", rpc, "--private-key", pk]
    if async_tx:
        argv.append("--async")
        return _cast(argv)
    # Synchronous: return just the tx hash for receipt lookups.
    out = _cast([*argv, "--json"])
    return json.loads(out)["transactionHash"]


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
