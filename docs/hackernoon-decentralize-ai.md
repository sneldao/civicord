# HackerNoon draft — Decentralize AI, Round 2

Entry form for <https://decentralizeai.tech> Round 2 (Nov 2026 – Feb 2027) is a
HackerNoon post: publish, tag, done. Judging is "readership and quality", with
technical depth, originality, impact and verifiable evidence named as the
criteria — so this draft is the measurement write-up we owed the data anyway,
with the reproduction steps at the end instead of a launch.

Status: **draft, unpublished.** Numbers are from the committed snapshots and the
audit of 2026-09-07; every claim links to a public record a reader can open.
Publish after the second labelling pass lands, or publish without it and say the
pass is running — the second is honest, the first is not.

Suggested title: **Two-thirds of our redirect alerts were noise.**

(Precise: it is 427 of 659 redirect rows, not two-thirds of every alert we raise.)

Subtitle: What 2,375 UK election candidate sites taught us about the difference
between a signal and a finding — and how a public ledger can serve humans,
agents and paying agents the same sentence.

---

A candidate's website is a public record that quietly changes. Nobody owns it,
nobody maintains it, and after an election it stops being anyone's priority. The
obvious engineering answer is a change detector: scrape, re-fetch, diff, alert.

We built that, for every UK parliamentary candidate in the April 2025 general
election — 2,375 candidate records keyed on Democracy Club person IDs, scraped
April 2025, re-fetched on a single day, 7 September 2026. 1,513 URLs responded,
441 no longer resolve, 659 redirect.

Then we looked at how much of our own alerting was worth sending to a human. The
answer: not much. And the interesting part is *why* the naive version fails, and
what a public register has to do differently from a monitoring dashboard.

## Two of our signals are precision failures, not recall failures

Nothing is being missed. Too much is being raised. That distinction matters,
because the fixes are opposite: a recall problem wants a wider net, a precision
problem wants a scoring function and a human at the end of it.

**65% of redirect alerts are the same site.** 427 of 659 redirected rows keep
the same site name: `.co.uk` → `.com`, `http` → `https`, `blogspot.co.uk` →
`blogspot.com`, a move to `about.me`, or a redirect inside a party's own CMS.
Only 232 point at a genuinely different host. A hijacked domain and a DNS tidy-up
both look like "redirected" to a status-code check.

**51% of "repurposed" alerts sit on shared party infrastructure.** Our second
signal fires when the HTTP response is a 200 and the candidate's surname does not
appear in the body. 230 of 448 such records live on a domain shared by more than
one candidate — `northants.greenparty.org.uk` (44 records), `reformparty.uk`
(37), `votelife.co.uk` (18), `partyof.wales` (14), `libdems.org.uk` (11),
`linktr.ee` (10). On a branch page, the absence of a surname is *correct*. The
signal was designed to catch a domain that now serves someone else's content, and
half of what it catches is a candidate's name legitimately not being in the
front page of their party's site.

There is a third, subtler one, and it is the reason we do not publish a deletion
metric yet.

## The 95-of-95 case

We compare April 2025 site text against a later homepage fetch, sentence by
sentence, and report sentences that no longer match. For one record — the
Official Monster Raving Loony Party's Kingston and Surbiton page — that produced
**95 of 95 sentences deleted**.

The site is live. Nothing was removed. The April scrape held six pages; the
re-crawl fetched one. We compared a corpus against a page and called the result a
deletion.

So the metric is not publishable while the re-crawl is homepage-only, and we hold
ourselves to two consequences:

- A deletion count is only meaningful where the *kept ratio* is high. A record
  where nothing survived the re-fetch tells us about our fetch, not about their
  edit.
- Any surface that quotes a count has to carry the scope in prose. In the code
  that is `scopeExplanation()`; the sentence a reader gets is "The April text
  covers the whole scraped site; the later text is one homepage fetch. A sentence
  can be missing from that homepage and still exist on another page."

Shipping a deletion metric ahead of a same-scope re-crawl is the one way to make
this dataset false. It would also be the easiest feature we have ever built.

## The axis problem: two counts of "redirected" that are both right

The dataset reports 659 redirected URLs and 471 rows labelled *Redirected*. That
is not a bug, and it is the trap most change feeds walk into.

One axis is the HTTP result per response — a row can be 200 *and* redirected *and*
missing a surname. The other is the change signal, which assigns exactly one
label per row, so a record with several things true of it gets the most specific
one. Our tooling has to say this out loud rather than pick a favourite number, so
the summary an agent reads ends with: "The two axes disagree by design: the
counts above are per HTTP response, the change signals assign exactly one label
per row."

The same discipline applies to what a label means. "Surname absent (review
needed)" is not "the site was repurposed". "DNS / connection failure" is not
"the campaign ended" — an outage and a removal look identical to a single-day
check, and we say so in the sentence, not in a footnote.

## Calibrating "significant" is a human sorting task, not a threshold

We can pick the alert threshold from the armchair, or ask people who do this work
what they would act on. We built a ten-record instrument, chosen to separate the
axes that get conflated: a ledger signal with no content change, a content change
with no ledger signal, a deletion that is really a scope artefact, and a thin
evidential base wearing a confident score.

Ten real records, each with its public URL: a personal domain now redirecting to
a betting-affiliate site (Maria Miller, Basingstoke); four deleted climate and
transport sentences on a Green councillor's Blogspot (Jake Welsh); five deleted
*education* sentences on a record the ledger does not flag at all (Kate Foale,
Beeston Central & Rylands); a branch site's TLD-only move that "deleted" one
welcome sentence (Reform UK, Ridgeway East); a DNS failure with no archived
text, where we can say the site is unreachable and cannot say what it used to
contain (Adam Holloway, Gravesham); and the 95-of-95 case above.

Labellers rank all ten for materiality, answer "would you act on this", then
repeat **blinded** — same facts, candidate/party/seat hidden. If blinding changes
nothing, content alone drives the judgement and a significance score can be
computed without knowing who the person is. If it changes a lot, then a
significance score is an aid to a reader and must never be presented as a
ranking. That is the whole experiment, and it is the kind of thing only a human
can adjudicate: the paid question is *what should we do about this*, and it does
not get to change what the record says.

## One record, four transports

Here is the part that is relevant to anyone building agent access to public data.

The same ledger is now reachable four ways, and the design constraint was that no
transport may say something the others don't:

1. **A static site** — 5,411 prerendered pages, readable without JavaScript,
   with citation, correction and reply affordances on every record.
2. **A JSON API** — 2,375 per-candidate records and 650 per-seat summaries,
   generated from the same CSVs at build time, plus an OpenAPI description and an
   `llms.txt`.
3. **A metered agent gateway** — the same endpoints fronted by an x402/MPP
   gateway, priced per call (`$0.001` for the seat list, `$0.002` per seat, free
   for the summary and the shareable image), with a `402` carrying
   `x402Version: 1` and `www-authenticate: Payment`.
4. **A self-hosted MCP server** — Streamable HTTP, protocol `2025-11-25`, seven
   read-only tools, and a browser page on the same origin that is a real MCP
   client so the traffic can be shown rather than described.

Money changes the *transport*, never the *answer*. A paying agent gets the same
sentence as a browser, the same caveat, and the same record URL; what they buy is
convenience. That is a decision, not a default: the moment a paid surface can
phrase things more confidently than the free one, a public register has two
truths.

The mechanism that keeps the wording identical is boring and worth stealing. The
server does not restate any prose. It imports the site's own TypeScript modules —
`record-copy.ts`, `change-feed.ts`, `walkback.ts`, `change-labels.ts` — under
Node's type-stripping, so one sentence exists in exactly one place and two
surfaces read it. (The caveat: a module that touches `astro:content` cannot be
imported outside the build, which is why the change-label map lives in its own
file now.)

Then the same rule is enforced by tests rather than by care. The contract checks
that run in CI assert the negotiated protocol version, that all seven tools exist
and are annotated read-only, that a capped page still reports the whole match
count (3 returned, 441 matched — an agent that reads "3" as "3 exist" is
reporting a filter as a finding), that no internal slug like `repurposed_suspect`
appears in any prose field, and that a spoken seat answer cannot be returned
without its limits attached as a separate content block.

Two honesty bugs were found by probing our own edge cases, not by a reader. A
seat answer once quoted a deleted sentence from someone who never stood in that
seat — the picker had been handed the whole ledger rather than the rows for that
seat. A filtered page once reported its page size as the match count. Both are
assertions now, because the fix without the test is a fix until the next
refactor.

## What we would do differently

- Score, don't alert. Every signal above should be a number a human sorts by, and
  the ten-record instrument is how you find out what the weights should be.
- Keep the fetch scopes matched before publishing any diff metric. Our re-crawl
  is homepage-only; the April scrape was site-wide; that mismatch is the single
  biggest lie our data could tell.
- Say what a check cannot see, in the sentence, on every surface. "Snapshot
  audit, not a current availability check. HTTP success and surname matches do
  not prove campaign content survived."
- Write the tests that assert the caveats, not just the values. A caveat in prose
  rots; a caveat in a CI assertion doesn't.

## Reproduce it

```bash
git clone https://github.com/sneldao/civicord && cd civicord
pip install -e '.[dev]'
civicord download --full && civicord ingest && civicord audit --content-check
civicord recrawl && civicord claimdiff && civicord changes

cd mcp && npm install && npm start   # http://127.0.0.1:8787 — an MCP client at /
npm run check                        # the contract assertions described above
```

Code: AGPL-3.0. Derived datasets: CC-BY. The April 2025 Campaign Lab scrape is
reused with credit under an arrangement recorded in the repository; September
2026 fetches are our own, robots-aware and rate-limited. Every number in this
post is reachable from a public record URL — start at
[https://civicord.pages.dev/browse](https://civicord.pages.dev/browse), or open
any of the ten cited records.

---

## Notes for whoever publishes this

- Tag candidates: `#decentralizedai`, `#mcp`, `#opendata`, `#web-scraping`,
  `#elections`, `#x402`. Their Round 2 criteria are technical depth,
  originality, impact and verifiable evidence — the last is why the record URLs
  stay inline rather than in a footer.
- The labelling results are **not** in this draft, because we do not have them.
  If the sheets come back before publication, replace the "Calibrating" section's
  closing paragraph with what the blinded pass actually did; if they don't, the
  section reads as a protocol, which is still true.
- Do not add a line implying the x402 gateway is decentralised infrastructure
  beyond what it is: a third-party metering gateway in front of our static API.
  The on-chain part is 3 ENS records on Sepolia testnet, and the ledger says so.
- Length ~1,900 words. Their FAQ says concept-stage work is welcome, so nothing
  here needs to be finished — but nothing here may be inflated either.
