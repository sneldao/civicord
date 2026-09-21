import asyncio

import httpx

from civicord.recrawl import (
    PROTOCOL_VERSION,
    RobotsCache,
    read_manifest_rows,
    read_manifest_urls,
    recrawl_url,
    result_to_row,
    run_recrawl,
    write_manifest,
)


def _client(handler):
    return httpx.AsyncClient(transport=httpx.MockTransport(handler), follow_redirects=True)


def _run(targets, handler, tmp_path, **kwargs):
    async def go():
        async with _client(handler) as client:
            robots = RobotsCache(client)
            pages = tmp_path / "pages"
            pages.mkdir()
            sem = asyncio.Semaphore(4)
            out = []
            for i, (url, pid, name) in enumerate(targets):
                out.append(
                    await recrawl_url(
                        client,
                        robots,
                        url,
                        pid,
                        name,
                        name.split()[-1],
                        "2026-09-21",
                        pages,
                        i,
                        sem=sem,
                    )
                )
            return out

    return asyncio.run(go())


ALLOW_ALL = httpx.Response(200, text="User-agent: *\nDisallow:\n")


def test_recrawl_live_stores_normalized_body(tmp_path):
    def handler(request):
        if request.url.path == "/robots.txt":
            return ALLOW_ALL
        return httpx.Response(200, text="<html><body><h1>  Vote   for Dancey </h1></body></html>")

    (res,) = _run([("https://ok.com/", "116117", "Joe Dancey")], handler, tmp_path)
    assert res.status_class == "live"
    assert res.status_code == 200
    assert res.protocol == PROTOCOL_VERSION
    assert res.name_found is True
    assert res.char_count > 0 and res.sha256 and res.file
    body = (tmp_path / "pages" / res.file.split("/", 1)[1]).read_text(encoding="utf-8")
    assert "Vote for Dancey" in body
    assert "<h1>" not in body  # normalized, not raw HTML


def test_recrawl_http_error_stores_no_body(tmp_path):
    def handler(request):
        if request.url.path == "/robots.txt":
            return ALLOW_ALL
        return httpx.Response(404, text="gone")

    (res,) = _run([("https://ok.com/missing", "1", "A B")], handler, tmp_path)
    assert res.status_class == "http_error"
    assert res.status_code == 404
    assert res.file == "" and res.sha256 is None


def test_recrawl_respects_robots_txt(tmp_path):
    seen = []

    def handler(request):
        if request.url.path == "/robots.txt":
            return httpx.Response(200, text="User-agent: *\nDisallow: /\n")
        seen.append(str(request.url))
        return httpx.Response(200, text="should never be fetched")

    (res,) = _run([("https://blocked.com/", "2", "C D")], handler, tmp_path)
    assert res.status_class == "robot_denied"
    assert seen == []
    assert res.file == ""


def test_recrawl_manifest_round_trip(tmp_path):
    def handler(request):
        if request.url.path == "/robots.txt":
            return ALLOW_ALL
        return httpx.Response(200, text="hello world hello")

    async def go():
        return await run_recrawl(
            [("https://ok.com/", "1", "A B")],
            "2026-09-21",
            tmp_path / "pages",
            transport=httpx.MockTransport(handler),
        )

    results = asyncio.run(go())
    manifest = tmp_path / "recrawl.csv"
    write_manifest(results, manifest)
    assert read_manifest_urls(manifest) == {"https://ok.com/"}
    rows = read_manifest_rows(manifest)
    assert rows[0]["protocol"] == PROTOCOL_VERSION
    assert rows[0]["sha256"] == results[0].sha256
    # result_to_row keeps every manifest column present
    assert set(result_to_row(results[0])) >= {
        "person_id",
        "url",
        "checked_at",
        "protocol",
        "status_class",
        "sha256",
        "file",
    }
