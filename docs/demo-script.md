# Demo script — Civicord (2:40, screen capture, no talking head)

> Record at 1440×900, mic on, `chrome --start-fullscreen`. Have
> `civicord.pages.dev`, `civicord-aieyq.bazgateway.com/mcp`, Studio query
> tab, and a terminal with `curl` ready. One take > perfect take.
> Voice: calm, researcher — never “web3/blockchain/mint”, always
> “permanent record / public register / verify”.

## 0:00 — Cold open on hero (15s)
**Screen:** `civicord.pages.dev` — pointillist hero (2,375 dots = UK).
**Line:** “2,375 candidates stood in the last UK election with a homepage.
17 months later, this is what’s left.”
Hover — gone dots are recording-red, voids around Humber/Highlands.
“Every dot is a website. The gaps are where the record already vanished.”

## 0:15 — Halftone hex = one seat, one jurisdiction (30s)
**Screen:** Scroll to halftone hex on `/` then click into `/browse` — Map/List toggle stays synced.
**Line:** “We joined those dots to 650 jurisdictions — one hex, one constituency.
Colour and dot size both encode survival, so it survives colour-blindness and print.
Hover a row, the hex pulses — the ledger and the map are the same register.”
Click **Gone** in legend → ledger filters → URL becomes `?status=gone` — copy link.

## 0:45 — “What happened in Ynys Môn?” (40s)
**Screen:** `/constituencies/ynys-mon` — halftone thumb + `3 of 4 live (75%)`,
3 candidates with `p{id}.civicord.eth` + `Verify → app.ens.domains` + Etherscan.
**Line:** “Ask for a place, not a metric. *What happened in Ynys Môn?*
Two of three sites still live, one gone, three redirected. Every name has a
permanent `p{id}.civicord.eth` you can verify on ENS — Sepolia, tamper-evident,
same onchain record the map shades from.”
Click **See filtered ledger →** — lands on `/browse?constituency=ynys-mon`.
Show **Share** — `og:image` is `/og/constituencies/ynys-mon.svg`, 1200×630 stipple deed — paste in Slack.
Candidate row → `/candidates/2504` — seat-context bar “in St Ives — 3 of 4 live”
+ hex thumb + party live-share compare.

## 1:25 — Agent pay-per-seat (30s)
**Screen:** Terminal.
**Line:** “Humans browse free. Agents pay per jurisdiction — one constituency,
one metered call.”
```bash
curl -s https://civicord-aieyq.bazgateway.com/api/summary | jq .
# 200 free — 2,375 sites, 1,513 live, 633 seats with sites

curl -s https://civicord-aieyq.bazgateway.com/api/constituencies/st-ives
# 402 — x402Version:1, payment-required, Base USDC 0x8335… → 0x96F3…7446

curl -s -H "X-Payment: <x402>" https://civicord-aieyq.bazgateway.com/api/constituencies/st-ives | jq .slug
# 200 — St Ives, 4 candidates, url/status/ENS, ogImage
```
“That’s the Bazantic gateway — `civicord-aieyq.bazgateway.com`, five tools at
`/mcp`. `listConstituencies` is a penny, a single seat is two-tenths of a cent.
The Recipe tells an agent when to call it: any UK place name → slug → one call.”

## 1:55 — Subgraph — the change log agents actually query (40s)
**Screen:** Studio `thegraph.com/studio/subgraph/civicord` — `v0.0.3` green,
or terminal `curl` to `api.studio.thegraph.com/query/101650/civicord/v0.0.3`.
**Line:** “The same onchain events a human verifies, an agent can query.”
```graphql
{
  stat(id: "civicord") { candidateCount textRecordCount }
  candidates(first: 3) { id label ensName status url }
  textRecords(where: { key: "status" }) { id value } # which sites went dark
}
```
“This is The Graph indexing `LabelRegistered` + `TextChanged` on Sepolia from
block 8150000 — the natural-language layer over the ENS record. *Which sites
went dark since April? Which now redirect to a shop?* — that’s a Subgraph query,
not a scrape.”

## 2:35 — Close + verify (15s)
**Screen:** Back to hero, scroll to “How it works: Collect → Record → Verify”.
**Line:** “Open, longitudinal, citable. Every fact links to the public register
it came from. Try your constituency — Civicord pages dot dev.”
Overlay cards:
`civicord.pages.dev` · `civicord-aieyq.bazgateway.com` · `github.com/sneldao/civicord`

## B-roll / captions to bake in
- Lower-third on every URL change: `?constituency=…` / `?status=gone` / `?party=…`
- x402 `402 → payment-required → 200` flash (2s)
- Subgraph `v0.0.3 block 8149999 → indexing → _meta hasIndexingErrors:false` badge (v0.0.2 was faulted — don't show it)

## What we cut if we hit 4:00
- Candidate deep-dive (keep only the ynys-mon → st-ives hop)
- Second `?country=Scotland` query — keep one filter demoe

## FEEDBACK.md skeleton (fill per sponsor, 200 words each)
See `docs/FEEDBACK.md` — one section per prize: ENS / The Graph / Bazantic.
