"""Rebuild data/out/onchain_manifest.csv from live The Graph Studio.

The publisher historically wrote only the demo subset into the CSV while
~2,375 names were already registered + texted on-chain. Frontend chips are
manifest-driven — this syncs chips with Graph reality.

Usage:
  python scripts/publish/rebuild_manifest_from_graph.py
"""

from __future__ import annotations

import csv
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ensv2 import namehash

REPO_ROOT = Path(__file__).parent.parent.parent
MANIFEST = REPO_ROOT / "data" / "out" / "onchain_manifest.csv"
WEBSITES = REPO_ROOT / "data" / "out" / "websites.csv"
SUBGRAPH = "https://api.studio.thegraph.com/query/101650/civicord/v0.0.4"
PAGE = 1000


def gql(query: str, variables: dict | None = None) -> dict:
    body = json.dumps({"query": query, "variables": variables or {}})
    # Prefer curl (system CA store) — Python 3.14 on macOS often lacks certifi roots.
    try:
        out = subprocess.run(
            [
                "curl",
                "-sf",
                SUBGRAPH,
                "-H",
                "content-type: application/json",
                "-H",
                "accept: application/json",
                "--data-binary",
                body,
            ],
            capture_output=True,
            text=True,
            check=True,
            timeout=90,
        ).stdout
        payload = json.loads(out)
    except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
        try:
            import ssl

            import certifi

            ctx = ssl.create_default_context(cafile=certifi.where())
        except Exception:  # noqa: BLE001
            ctx = None
        req = urllib.request.Request(
            SUBGRAPH,
            data=body.encode(),
            headers={"content-type": "application/json", "accept": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            payload = json.load(resp)
    if payload.get("errors"):
        raise RuntimeError(payload["errors"])
    return payload["data"]


def load_names() -> dict[str, str]:
    names: dict[str, str] = {}
    if not WEBSITES.exists():
        return names
    with open(WEBSITES, newline="") as f:
        for r in csv.DictReader(f):
            names.setdefault(r["person_id"], r["person_name"])
    return names


def fetch_all_candidates() -> list[dict]:
    out: list[dict] = []
    skip = 0
    while True:
        data = gql(
            """
            query($first: Int!, $skip: Int!) {
              candidates(first: $first, skip: $skip, orderBy: id, orderDirection: asc) {
                id
                ensName
                status
                url
                textRecordCount
              }
            }
            """,
            {"first": PAGE, "skip": skip},
        )
        batch = data["candidates"]
        out.extend(batch)
        print(f"  fetched {len(out)}…", flush=True)
        if len(batch) < PAGE:
            break
        skip += PAGE
    return out


def main() -> None:
    print(f"Querying {SUBGRAPH}", flush=True)
    names = load_names()
    candidates = fetch_all_candidates()
    rows = []
    for c in candidates:
        pid = str(c["id"])
        ens = c.get("ensName") or f"p{pid}.civicord.eth"
        node = "0x" + namehash(ens).hex()
        rows.append(
            {
                "ens_name": ens,
                "person_id": pid,
                "person_name": names.get(pid, ""),
                "url": c.get("url") or "",
                "status": c.get("status") or "",
                "node": node,
            }
        )
    rows.sort(key=lambda r: int(r["person_id"]))
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST, "w", newline="") as f:
        w = csv.DictWriter(
            f, fieldnames=["ens_name", "person_id", "person_name", "url", "status", "node"]
        )
        w.writeheader()
        w.writerows(rows)
    with_status = sum(1 for r in rows if r["status"])
    print(
        f"Wrote {len(rows)} rows to {MANIFEST} ({with_status} with status text)",
        flush=True,
    )


if __name__ == "__main__":
    main()
