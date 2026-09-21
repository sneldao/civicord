from civicord import claimdiff
from civicord.claimdiff import (
    MAX_CLAIMS_PER_PERSON,
    diff_person,
    normalize_sentence,
    publish_frontend_snapshot,
    row_dict,
    split_sentences,
)
from civicord.taxonomy import TOPICS, tag_claim


def test_split_sentences_basic():
    parts = split_sentences("Vote for me. I back the NHS.  Lower taxes now!")
    assert len(parts) == 3
    assert parts[1] == "I back the NHS."


def test_split_sentences_drops_empties():
    assert split_sentences("   ") == []
    assert split_sentences("No terminator here") == ["No terminator here"]


def test_normalize_sentence_canonical():
    assert normalize_sentence("  Vote   For Me! ") == "vote for me!"
    assert normalize_sentence('"Vote for me."') == "vote for me."


def test_tag_claim_topics():
    tags = tag_claim("We will cut NHS waiting lists and build hospitals")
    assert tags == ["nhs"]
    assert tag_claim("I love canvassing in the rain") == []
    multi = tag_claim("Build affordable homes and hire more teachers")
    assert set(multi) == {"housing", "education"}


def test_tag_claim_excludes_cta_and_address_noise():
    # Bare "vote" (every Vote-for-X CTA) and "road" (street addresses) are
    # excluded so theme tallies aren't drowned in asymmetry noise.
    assert tag_claim("Vote for Smith on Broad Road") == []
    assert tag_claim("Potholes on every road need fixing") == ["transport"]


def test_taxonomy_topics_stable_and_known():
    assert set(TOPICS) >= {"nhs", "economy", "immigration", "housing", "climate", "tax"}


def test_diff_person_alignment():
    april = ["Vote for Dancey today for Stockton West.", "Short line here."]
    new = "Vote for Dancey today for Stockton West. We now back lower taxes for workers."
    d = diff_person("1", "A B", "https://a.com", april, new, "2026-09-21")
    assert d.kept == 1
    assert d.deleted_count == 0  # "Short line here." is 3 words < MIN_WORDS
    assert d.added_count == 1
    assert d.added[0]["topics"] == ["tax"]
    assert d.scope_note == claimdiff.SCOPE_NOTE
    assert d.protocol == claimdiff.PROTOCOL_VERSION


def test_diff_person_deleted_claim_tagged():
    april = ["Our plan fully funds the NHS and cuts waiting lists fast."]
    d = diff_person(
        "1",
        "A B",
        "https://a.com",
        april,
        "Completely different homepage text here now.",
        "2026-09-21",
    )
    assert d.deleted_count == 1
    assert d.deleted[0]["topics"] == ["nhs"]
    assert d.kept == 0


def test_diff_person_caps_snapshot_lists_but_counts_full():
    april = [f"April policy statement number {i} about housing and schools." for i in range(30)]
    d = diff_person(
        "1",
        "A B",
        "https://a.com",
        april,
        "Unrelated new homepage content is published here today.",
        "2026-09-21",
    )
    assert d.deleted_count == 30
    row = row_dict(d)
    assert row["deleted_count"] == 30
    assert row["added_count"] == 1


def test_publish_frontend_snapshot_caps_and_counts(tmp_path):
    april = [f"April policy statement number {i} about housing and schools." for i in range(30)]
    d = diff_person(
        "1",
        "A B",
        "https://a.com",
        april,
        "Unrelated new homepage content is published here today.",
        "2026-09-21",
    )
    path = tmp_path / "claim_diffs.json"
    n = publish_frontend_snapshot([d], path)
    assert n == 1
    import json

    snap = json.loads(path.read_text(encoding="utf-8"))["byPerson"]["1"]
    assert len(snap["deleted"]) == MAX_CLAIMS_PER_PERSON
    assert snap["scope_note"] == claimdiff.SCOPE_NOTE
