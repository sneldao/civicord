"""Register the civicord parent name on Sepolia via the official ENSv2 ETHRegistrar.

Commit-reveal flow: makeCommitment -> commit -> wait 60s -> register.

Also probes payment options: the v2 registrar prices in an ERC20 (MockUSDC on
Sepolia) or possibly the zero address for native ETH — we query rentPrice for
both and auto-mint MockUSDC via a no-arg mint()/faucet() if available.

Usage:
  PARENT_LABEL=civicord python scripts/publish/register_parent.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ensv2 import (
    ETH_REGISTRY_JSON,
    _cast,
    call,
    env,
    fetch_deployment,
    send,
)

ZERO = "0x0000000000000000000000000000000000000000"
DURATION = str(365 * 24 * 3600)  # 1 year in seconds


def main() -> None:
    rpc = env("RPC_URL")
    pk = env("PK")
    label = env("PARENT_LABEL")

    deployer = subprocess.run(
        ["cast", "wallet", "address", "--private-key", pk],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()

    registrar = fetch_deployment("ETHRegistrar")["address"]
    eth_registry = fetch_deployment(ETH_REGISTRY_JSON)["address"]
    mock_usdc = fetch_deployment("MockUSDC")["address"]

    balance = _cast(["balance", deployer, "--rpc-url", rpc])
    print(f"Deployer: {deployer}  Sepolia balance: {balance} wei")
    if int(balance) < 10**15:
        raise SystemExit("Wallet not funded — get Sepolia ETH from a faucet first.")

    available = call(registrar, "isAvailable(string)", label)
    print(f"{label}.eth available: {available}")
    if available.lower() != "true":
        raise SystemExit(f"{label}.eth is taken — pick another PARENT_LABEL.")

    # Probe payment tokens
    for name, token in (("native-ETH(0x0)", ZERO), (f"MockUSDC {mock_usdc}", mock_usdc)):
        try:
            base, premium = call(
                registrar,
                "rentPrice(string,address,uint64,address)",
                label,
                deployer,
                DURATION,
                token,
            ).split()
            print(f"rentPrice via {name}: base={base} premium={premium}")
        except RuntimeError as e:
            print(f"rentPrice via {name}: failed ({e.args[0].splitlines()[-1] if e.args else e})")

    payment_token = mock_usdc  # default; adjust after seeing probe output
    # Try to mint MockUSDC if a faucet exists
    for sig in ("mint(address,uint256)", "faucet()"):
        try:
            if sig == "mint(address,uint256)":
                send(rpc, pk, payment_token, sig, deployer, str(10**25))
            else:
                send(rpc, pk, payment_token, sig)
            print(f"Minted MockUSDC via {sig}")
            break
        except RuntimeError:
            continue

    secret = _cast(["keccak", str(time.time_ns())])  # fresh random secret, never persisted

    commitment = call(
        registrar,
        "makeCommitment(string,address,bytes32,address,address,uint64,bytes32)",
        label,
        deployer,
        secret,
        ZERO,
        ZERO,
        DURATION,
        ZERO,
    )
    print(f"Commitment: {commitment}")
    send(rpc, pk, registrar, "commit(bytes32)", commitment)
    print("Committed — waiting 75s for min commitment age…")
    time.sleep(75)

    print("Registering…")
    send(
        rpc,
        pk,
        registrar,
        "register(string,address,bytes32,address,address,uint64,address,bytes32)",
        label,
        deployer,
        secret,
        ZERO,
        ZERO,
        DURATION,
        payment_token,
        ZERO,
    )
    print(f"Registered {label}.eth — owner should be {deployer}")

    # Wire the UserRegistry into the hierarchy (deploy.py must have run first)
    state_file = Path(__file__).parent / ".deployed.json"
    if state_file.exists():
        state = json.loads(state_file.read_text())
        registry_proxy = state.get("registry")
        if registry_proxy:
            send(rpc, pk, eth_registry, "setSubregistry(string,address)", label, registry_proxy)
            print(f"setSubregistry('{label}', {registry_proxy}) done — hierarchy wired.")
    else:
        print("NOTE: deploy.py not run yet — run it, then setSubregistry as printed there.")


if __name__ == "__main__":
    main()
