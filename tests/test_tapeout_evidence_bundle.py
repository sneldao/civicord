"""Tests for the TapeOut evidence-bundle builder and verifier."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "scripts" / "tapeout" / "evidence_bundle.py"


def run_cli(*args: object, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *[str(arg) for arg in args]],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=check,
        timeout=60,
    )


def test_holborn_bundle_builds_and_verifies_with_negative_self_tests(tmp_path: Path) -> None:
    bundle = tmp_path / "bundle"
    run_cli(
        "build",
        "--out",
        bundle,
        "--generated-at",
        "2026-11-25T00:00:00Z",
    )

    manifest = json.loads((bundle / "manifest.json").read_text())
    assert manifest["schema"] == "civicord-evidence-bundle/0.1"
    assert manifest["cohort"]["slug"] == "holborn-and-st-pancras"
    assert len(manifest["cohort"]["personIds"]) == 7
    assert manifest["claimDiffsIncluded"] is False

    verified = run_cli("verify", bundle, "--self-test")
    assert "verification passed" in verified.stdout


def test_verifier_fails_closed_for_corrupted_manifest(tmp_path: Path) -> None:
    bundle = tmp_path / "bundle"
    run_cli("build", "--out", bundle, "--generated-at", "2026-11-25T00:00:00Z")
    manifest_path = bundle / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["files"][0]["sha256"] = "0" * 64
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

    result = run_cli("verify", bundle, check=False)
    assert result.returncode == 1
    assert "sha256 mismatch" in result.stdout
