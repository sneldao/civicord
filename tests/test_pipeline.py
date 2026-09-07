import asyncio
import json

import httpx
import pytest

from civicord.audit import check_url, classify_error, summarize
from civicord.campaignlab import (
    Candidacy,
    normalize_url,
    parse_candidate_json,
    parse_candidates_csv,
    websites_from_candidacies,
)

CANDIDATES_CSV = """person_id,person_name,election_id,ballot_paper_id,election_date,election_current,party_name,party_id,post_label,cancelled_poll,seats_contested,homepage_url
116117,Joe Dancey,parl.2024-07-04,parl.65813,2024-07-04,f,Labour Party,PP53,Stockton West,f,1,https://www.joedancey.co.uk/
116117,Joe Dancey,parl.2024-07-04,parl.65813,2024-07-04,f,Labour Party,PP53,Stockton West,f,1,https://WWW.JoeDancey.co.uk
109030,Tamara Micner,parl.2024-07-04,parl.66001,2024-07-04,f,Green Party,PP63,Hampstead and Kilburn,f,1,https://www.tamaramicner.com
7045,Dave Raval,parl.2024-07-04,parl.66250,2024-07-04,f,Liberal Democrats,PP90,Hackney South and Shoreditch,f,1,not-a-url
23150,Jonathan Millard,local.blaenau-gwent.2024-02-08,local.blaenau-gwent.ebbw-vale-south.by.2024-02-08,2024-02-08,f,Independent,ynmp-party:2,Ebbw Vale South,f,1,
"""

SAMPLE_JSON = {
    "https_www_joedancey_co_uk_/https_www_joedancey_co_uk/content_1.html": "My plan for Stockton West...",
    "https_www_joedancey_co_uk_/content_2.html": "",
}


def test_normalize_url():
    assert normalize_url("https://WWW.Example.com/") == "https://www.example.com"
    assert normalize_url("http://a.co/path///") == "http://a.co/path"
    assert normalize_url("not-a-url") is None
    assert normalize_url("") is None
    assert normalize_url("ftp://x.com") is None


def test_parse_candidates_csv_skips_bad_urls(tmp_path):
    path = tmp_path / "candidates.csv"
    path.write_text(CANDIDATES_CSV, encoding="utf-8")
    candidacies = parse_candidates_csv(path)
    assert len(candidacies) == 3  # 'not-a-url' and empty homepage dropped (5 rows - 2)
    assert all(c.homepage_url.startswith("http") for c in candidacies)


def test_websites_dedupe_and_merge():
    candidacies = [
        Candidacy(
            "1",
            "A B",
            "parl.2024-07-04",
            "parl.1",
            "2024-07-04",
            "Labour",
            "PP53",
            "X",
            "https://a.com",
        ),
        Candidacy(
            "1",
            "A B",
            "local.x.2024-05-02",
            "local.x.y",
            "2024-05-02",
            "Labour",
            "PP53",
            "Y",
            "https://a.com",
        ),
        Candidacy(
            "1",
            "A B",
            "local.z.2024-05-02",
            "local.z.w",
            "2024-05-02",
            "Green",
            "PP63",
            "Z",
            "https://A.com/",
        ),
        Candidacy(
            "2",
            "C D",
            "parl.2024-07-04",
            "parl.2",
            "2024-07-04",
            "Green",
            "PP63",
            "W",
            "https://b.com",
        ),
    ]
    sites = websites_from_candidacies(candidacies)
    assert len(sites) == 2
    person1 = next(s for s in sites if s.person_id == "1")
    assert person1.url == "https://a.com"  # normalized, deduped across case/trailing slash
    assert sorted(person1.elections) == [
        "local.x.2024-05-02",
        "local.z.2024-05-02",
        "parl.2024-07-04",
    ]
    assert sorted(person1.parties) == ["Green", "Labour"]


def test_parse_candidate_json(tmp_path):
    path = tmp_path / "116117_Joe_Dancey.json"
    path.write_text(json.dumps(SAMPLE_JSON), encoding="utf-8")
    pages = parse_candidate_json(path, person_id="116117")
    assert len(pages) == 2
    assert pages[0].person_id == "116117"
    assert pages[0].char_count == len("My plan for Stockton West...")
    assert pages[1].char_count == 0


def _client(handler):
    return httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=True)


def test_check_url_live_and_redirect():
    async def run():
        def handler(request):
            if request.url.host == "moved.com":
                return httpx.Response(301, headers={"Location": "https://new.com/"})
            return httpx.Response(200, text="hello")

        async with _client(handler) as client:
            sem = asyncio.Semaphore(2)
            live = await check_url(client, "https://ok.com", sem=sem)
            moved = await check_url(client, "https://moved.com", sem=sem)
        return live, moved

    live, moved = asyncio.run(run())
    assert live.status_class == "live" and live.status_code == 200
    assert (
        moved.status_class == "live" and moved.redirected and moved.final_url == "https://new.com/"
    )


def test_check_url_name_hint_found():
    async def run():
        def handler(request):
            return httpx.Response(200, text="Vote for Dancey today")

        async with _client(handler) as client:
            return await check_url(
                client, "https://ok.com", name_hint="Dancey", sem=asyncio.Semaphore(1)
            )

    result = asyncio.run(run())
    assert result.status_class == "live"
    assert result.name_found is True


def test_classify_and_summarize():
    assert (
        classify_error(httpx.HTTPStatusError("x", request=None, response=httpx.Response(404)))
        == "http_error"
    )

    class R:
        def __init__(self, status_class):
            self.status_class = status_class

    counts = summarize([R("live"), R("dns_error")])
    assert counts["live"] == 1 and counts["dns_error"] == 1


@pytest.mark.parametrize(
    "status,expected",
    [(404, "http_error"), (500, "http_error"), (403, "http_error")],
)
def test_http_error_classes(status, expected):
    async def run():
        def handler(request):
            return httpx.Response(status)

        async with _client(handler) as client:
            return await check_url(client, f"https://err.com/{status}", sem=asyncio.Semaphore(1))

    assert asyncio.run(run()).status_class == expected
