"""Deploy the Civicord UserRegistry + PermissionedResolver proxies on Sepolia.

Idempotent: records deployed proxy addresses in scripts/publish/.deployed.json
and skips any proxy that already has code at its recorded address.

Usage:
  PARENT_NAME=civicord.eth PK=0x... RPC_URL=... python scripts/publish/deploy.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ensv2 import (
    ALL_ROLES,
    RESOLVER_IMPL_JSON,
    USER_REGISTRY_IMPL_JSON,
    abi_encode_words,
    deploy_proxy,
    encode_init,
    env,
    fetch_deployment,
    keccak,
    keccak256,
    namehash,
    proxy_address_for,
)

STATE_FILE = Path(__file__).parent / ".deployed.json"


def main() -> None:
    rpc = env("RPC_URL")
    pk = env("PK")
    parent = env("PARENT_NAME")

    deployer = subprocess.run(
        ["cast", "wallet", "address", "--private-key", pk],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()

    registry_impl = fetch_deployment(USER_REGISTRY_IMPL_JSON)["address"]
    resolver_impl = fetch_deployment(RESOLVER_IMPL_JSON)["address"]

    state: dict = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}

    # --- Resolver proxy (per-account, salt = keccak256(abi.encode("OwnedResolver", deployer, version))) ---
    resolver_salt = keccak256(
        abi_encode_words(
            keccak("OwnedResolver"),
            bytes.fromhex(deployer.removeprefix("0x")),
            (0).to_bytes(32, "big"),
        )
    )

    resolver_addr = state.get("resolver")
    if resolver_addr and proxy_address_for(rpc, resolver_addr):
        print(f"Resolver proxy already deployed: {resolver_addr}")
    else:
        init = encode_init("initialize(address,uint256,bytes[])", deployer, hex(ALL_ROLES), "[]")
        resolver_addr = deploy_proxy(rpc, pk, resolver_impl, resolver_salt, init)
        print(f"Resolver proxy deployed: {resolver_addr}")
        state["resolver"] = resolver_addr

    # --- UserRegistry proxy (per-name, salt = keccak256(abi.encode("UserRegistry", namehash(parent), version))) ---
    parent_node = namehash(parent)
    registry_salt = keccak256(
        abi_encode_words(
            keccak("UserRegistry"),
            parent_node,
            (0).to_bytes(32, "big"),
        )
    )

    registry_addr = state.get("registry")
    if registry_addr and proxy_address_for(rpc, registry_addr):
        print(f"UserRegistry proxy already deployed: {registry_addr}")
    else:
        init = encode_init("initialize(address,uint256)", deployer, hex(ALL_ROLES))
        registry_addr = deploy_proxy(rpc, pk, registry_impl, registry_salt, init)
        print(f"UserRegistry proxy deployed: {registry_addr}")
        state["registry"] = registry_addr

    state.update(
        {"deployer": deployer, "parent_name": parent, "parent_node": "0x" + parent_node.hex()}
    )
    STATE_FILE.write_text(json.dumps(state, indent=2))
    print(f"State written to {STATE_FILE}")
    print(
        "NEXT: wire the registry into the ENSv2 hierarchy —\n"
        f"  cast send <ETHRegistry> 'setSubregistry(string,address)' "
        f"{parent.split('.')[0]} {registry_addr} --private-key $PK --rpc-url $RPC_URL\n"
        "Then run publish.py to register candidates."
    )


if __name__ == "__main__":
    main()
