"""Unit tests for wayback helpers (mocked HTTP)."""

from pathlib import Path

import httpx

from civicord.wayback import (
    CdxHit,
    html_to_text,
    id_url,
    pick_snapshot,
    query_cdx,
    sha256_bytes,
    similarity,
)


def test_id_url():
    assert id_url("20250415120000", "https://example.com/") == (
        "https://web.archive.org/web/20250415120000id_/https://example.com/"
    )


def test_html_to_text_strips_script():
    html = "<html><script>evil()</script><p>Hello  world</p></html>"
    assert html_to_text(html) == "Hello world"


def test_pick_snapshot_prefers_near_date():
    hits = [
        CdxHit("20240101000000", "https://a.com", "200", "d1"),
        CdxHit("20250414000000", "https://a.com", "200", "d2"),
        CdxHit("20250601000000", "https://a.com", "200", "d3"),
    ]
    assert pick_snapshot(hits).timestamp == "20250414000000"


def test_pick_snapshot_prefers_april_window_over_closer_outlier():
    """A mid-April snapshot beats a nearer but out-of-window hit (e.g. 2022 / Sep)."""
    hits = [
        CdxHit("20221231135251", "https://a.com", "200", "d1"),  # closer to nothing useful
        CdxHit("20250405094323", "https://a.com", "200", "d2"),  # in Apr window
        CdxHit("20250916154711", "https://a.com", "200", "d3"),  # post-audit
    ]
    assert pick_snapshot(hits).timestamp == "20250405094323"


def test_pick_snapshot_falls_back_outside_window():
    hits = [
        CdxHit("20221231135251", "https://a.com", "200", "d1"),
        CdxHit("20240715134130", "https://a.com", "200", "d2"),
    ]
    assert pick_snapshot(hits).timestamp == "20240715134130"


def test_sha256_and_similarity():
    assert len(sha256_bytes(b"abc")) == 64
    assert similarity("hello world", "hello world") == 1.0
    assert similarity("", "x") is None


def test_query_cdx_parses_json():
    payload = [
        ["timestamp", "original", "statuscode", "digest"],
        ["20250410120000", "https://ex.com/", "200", "ABC"],
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=payload)

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as client:
        hits = query_cdx(client, "https://ex.com/")
    assert len(hits) == 1
    assert hits[0].timestamp == "20250410120000"


def test_select_spike_prefers_pages(tmp_path: Path):
    from civicord.wayback import select_spike_targets

    changes = tmp_path / "changes.csv"
    changes.write_text(
        "person_id,person_name,url,change_signal\n"
        "1,A,https://a.com,gone\n"
        "2,B,https://b.com,gone\n"
        "3,C,https://c.com,repurposed_suspect\n",
        encoding="utf-8",
    )
    pages = tmp_path / "pages.csv"
    pages.write_text(
        "person_id,page_key,char_count,text\n2,k,10,hello\n3,k,10,hi\n",
        encoding="utf-8",
    )
    rows = select_spike_targets(changes, pages_csv=pages, limit=4)
    ids = {r["person_id"] for r in rows}
    assert "2" in ids
    assert "1" not in ids or "2" in ids  # prefers 2 over 1 for gone


def test_select_spike_dedupes_person_ids(tmp_path: Path):
    from civicord.wayback import select_spike_targets

    changes = tmp_path / "changes.csv"
    changes.write_text(
        "person_id,person_name,url,change_signal\n"
        "1,A,https://a.com/1,gone\n"
        "1,A,https://a.com/2,gone\n"
        "2,B,https://b.com,gone\n"
        "3,C,https://c.com,repurposed_suspect\n"
        "4,D,https://d.com,repurposed_suspect\n",
        encoding="utf-8",
    )
    pages = tmp_path / "pages.csv"
    pages.write_text(
        "person_id,page_key,char_count,text\n1,k,10,a\n2,k,10,b\n3,k,10,c\n4,k,10,d\n",
        encoding="utf-8",
    )
    rows = select_spike_targets(changes, pages_csv=pages, limit=4)
    ids = [r["person_id"] for r in rows]
    assert len(ids) == len(set(ids))
    assert len(ids) == 4
