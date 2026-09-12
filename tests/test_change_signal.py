"""Tests for change_signal taxonomy (no network)."""

from civicord.change_signal import (
    classify_change_signal,
    rollup_person,
    rows_from_audit,
    summarize,
)


def test_classify_priority_gone_beats_redirect():
    assert (
        classify_change_signal(
            status_class="dns_error",
            redirected=True,
            name_found=False,
            has_audit=True,
        )
        == "gone"
    )


def test_classify_repurposed_beats_redirect():
    assert (
        classify_change_signal(
            status_class="live",
            redirected=True,
            name_found=False,
            has_audit=True,
        )
        == "repurposed_suspect"
    )


def test_classify_redirect_when_still_named():
    assert (
        classify_change_signal(
            status_class="live",
            redirected=True,
            name_found=True,
            has_audit=True,
        )
        == "redirected"
    )


def test_classify_still_attested():
    assert (
        classify_change_signal(
            status_class="live",
            redirected=False,
            name_found=True,
            has_audit=True,
        )
        == "still_attested"
    )


def test_classify_still_attested_when_name_unknown():
    assert (
        classify_change_signal(
            status_class="live",
            redirected=False,
            name_found=None,
            has_audit=True,
        )
        == "still_attested"
    )


def test_classify_other_http_error():
    assert (
        classify_change_signal(
            status_class="http_error",
            redirected=False,
            name_found=None,
            has_audit=True,
        )
        == "other"
    )


def test_classify_unaudited():
    assert (
        classify_change_signal(
            status_class=None,
            redirected=False,
            name_found=None,
            has_audit=False,
        )
        == "unaudited"
    )


def test_rollup_worst_wins():
    assert rollup_person(["still_attested", "gone", "redirected"]) == "gone"
    assert rollup_person(["redirected", "repurposed_suspect"]) == "repurposed_suspect"
    assert rollup_person([]) == "unaudited"


def test_rows_from_audit_and_summarize():
    rows = rows_from_audit(
        [
            {
                "person_id": "1",
                "person_name": "A",
                "url": "https://a.example",
                "status_class": "live",
                "status_code": "200",
                "redirected": "False",
                "final_url": "",
                "name_found": "True",
            },
            {
                "person_id": "2",
                "person_name": "B",
                "url": "https://b.example",
                "status_class": "dns_error",
                "status_code": "",
                "redirected": "False",
                "final_url": "",
                "name_found": "",
            },
        ]
    )
    assert rows[0]["change_signal"] == "still_attested"
    assert rows[1]["change_signal"] == "gone"
    counts = summarize(rows)
    assert counts["still_attested"] == 1
    assert counts["gone"] == 1
