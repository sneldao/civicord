import csv

import pytest

from civicord import audit
from civicord.cli import main

AUDIT_CSV = """url,person_id,person_name,status_class,status_code,final_url,redirected,name_found,error,elapsed_ms
https://a.example,1,Ann Aard,live,200,https://a.example,False,True,,120
https://b.example,2,Bob Barnes,inconclusive_blocked,403,,False,,HTTP 403,95
https://c.example,3,Cid Collins,inconclusive_blocked,429,,False,,HTTP 429,88
https://d.example,4,Dee Doyle,dns_error,,,False,,DNS fail,0
"""


def _write_audit(tmp_path, text=AUDIT_CSV):
    out = tmp_path / "out"
    out.mkdir(parents=True, exist_ok=True)
    (out / "audit_liveness.csv").write_text(text, encoding="utf-8")
    return out / "audit_liveness.csv"


def _read(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _fake_results(calls, mapping):
    async def run_audit(targets, concurrency=8, timeout=15.0, proxy=None):
        calls.append([u for u, _ in targets])
        return [mapping[u] for u, _ in targets]

    return run_audit


def test_status_recheck_merges_only_blocked_rows(tmp_path, monkeypatch):
    csv_path = _write_audit(tmp_path)
    calls = []
    mapping = {
        "https://b.example": audit.AuditResult(
            url="https://b.example",
            status_class="live",
            status_code=200,
            final_url="https://b.example",
            elapsed_ms=50,
        ),
        "https://c.example": audit.AuditResult(
            url="https://c.example",
            status_class="live",
            status_code=200,
            final_url="https://c.example",
            elapsed_ms=60,
        ),
    }
    monkeypatch.setattr(audit, "run_audit", _fake_results(calls, mapping))

    main(["--data-dir", str(tmp_path), "audit", "--status", "inconclusive_blocked"])

    assert calls == [["https://b.example", "https://c.example"]]
    rows = _read(csv_path)
    assert len(rows) == 4
    assert rows[0]["status_class"] == "live"  # untouched
    assert rows[3]["status_class"] == "dns_error"  # untouched
    assert rows[1]["status_class"] == "live"
    assert rows[1]["status_code"] == "200"
    assert rows[2]["status_class"] == "live"


def test_status_recheck_comma_list_and_no_match(tmp_path, monkeypatch):
    csv_path = _write_audit(tmp_path)
    calls = []
    monkeypatch.setattr(audit, "run_audit", _fake_results(calls, {}))

    main(["--data-dir", str(tmp_path), "audit", "--status", "gone,other"])
    assert calls == []  # no matching rows -> no audit pass
    assert _read(csv_path)[0]["status_class"] == "live"


def test_status_recheck_requires_existing_csv(tmp_path):
    with pytest.raises(SystemExit):
        main(["--data-dir", str(tmp_path), "audit", "--status", "inconclusive_blocked"])


def test_audit_help_lists_proxy_and_status(capsys):
    with pytest.raises(SystemExit) as exc:
        main(["audit", "--help"])
    assert exc.value.code == 0
    out = capsys.readouterr().out
    assert "--proxy" in out
    assert "--status" in out
