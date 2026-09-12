"""Tests for extract + diff significance heuristics."""

from civicord.diffing import classify_significance, compare_texts
from civicord.extract import extract_main_text, normalize_plaintext, tokens


def test_normalize_and_tokens():
    assert normalize_plaintext("  Hello\n\nWorld  ") == "Hello World"
    assert "hello" in tokens("Hello, world!")


def test_extract_strips_script():
    html = "<html><head><script>evil()</script></head><body><p>Vote for Ada</p></body></html>"
    text = extract_main_text(html)
    assert "Vote" in text or "Ada" in text
    assert "evil" not in text.lower()


def test_classify_significance_bands():
    assert classify_significance(similarity=0.9, coverage=0.2)[0] == "unchanged"
    assert classify_significance(similarity=0.2, coverage=0.5)[0] == "minor"
    assert classify_significance(similarity=0.2, coverage=0.2)[0] == "major"
    assert classify_significance(similarity=0.05, coverage=0.05)[0] == "transformed"
    assert classify_significance(similarity=None, coverage=None)[0] == "incomparable"


def test_compare_coverage_prefers_fragment_join():
    april = "Ada Lovelace will fight for the NHS and schools in this constituency."
    # Wayback page is longer but contains the April fragment.
    wayback = ("Home About Contact " + april + " Donate today. Privacy policy cookies.") * 3
    r = compare_texts(
        person_id="1",
        april_text=april,
        wayback_text=wayback,
        snapshot_ts="20250415120000",
    )
    assert r.coverage is not None and r.coverage > 0.8
    assert r.significance in ("unchanged", "minor")


def test_compare_requires_both_sides():
    empty = compare_texts(person_id="1", april_text="", wayback_text="")
    assert empty.significance == "incomparable"
    no_wb = compare_texts(
        person_id="1", april_text="Ada fights for the NHS", wayback_text="", snapshot_ts="20250401"
    )
    assert no_wb.significance == "incomparable"
    no_ts = compare_texts(
        person_id="1",
        april_text="Ada fights for the NHS",
        wayback_text="Ada fights for the NHS and schools",
        snapshot_ts=None,
    )
    assert no_ts.significance == "incomparable"


def test_compare_rejects_chrome_only_extract():
    april = ("Ada Lovelace will fight for the NHS and schools in this constituency. ") * 40
    wayback = "Home About Contact Donate"
    r = compare_texts(
        person_id="1", april_text=april, wayback_text=wayback, snapshot_ts="20250401120000"
    )
    assert r.significance == "incomparable"
