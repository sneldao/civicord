# Demo script — Civicord (~2:30)

The story: a website can disappear; the observation doesn't have to. ENSv2
provides the namespace and permissions that make the record independently
addressable and maintainable — central to the product, not a lookup at the end.

## 0:00–0:20 — Problem

Start on `https://civicord.pages.dev`.

“What happens to a candidate's website after the election? Civicord records
what was actually observed, when it was observed — and makes that record
independently verifiable.”

Show the three starting paths. The dots summarize HTTP outcomes; they are not
one dot per candidate and do not prove content survival.

## 0:20–0:55 — The surprise — `/candidates/5693` (Dawn Furness)

“This URL returned HTTP 200 at the 7 September 2026 audit.”

Click through to the record.

“But it now redirects to a domain-sale page. HTTP told us the server
responded — the evidence tells us what actually happened.”

Select **View evidence** — show the April 2025 excerpts, labeled as excerpts
rather than complete archived pages. Select **Copy citation**.

## 0:55–1:20 — ENSv2 — **Verify this record** → **Verify on-chain**

“The audit isn't just in Civicord's database. Each candidate has an ENSv2
subname — `p5693.civicord.eth` — with resolver fields on Sepolia: the
candidate name, the original URL, and the audit status.”

“`live` means the URL responded successfully at audit time — it does not mean
the campaign survived, and the full website is not stored on-chain.”

## 1:20–1:50 — EAC — the authority story

Run live in a terminal (needs `PK`, `RPC_URL`, `cast`; delegate funding is
handled by the script):

```bash
export PK=$(tr -d '\n' < ~/.config/civicord/sepolia.key)
python scripts/publish/eac_demo.py --ids 5693
```

If a live run isn't practical while recording, show
[eac-demo-log.json](eac-demo-log.json) instead — it's the committed output of
this exact flow on Sepolia.

“ENSv2's Permissioned Resolver also separates authority. Here the deployer
grants a delegate the right to write one text key on one name — the write
succeeds and reads back, we revoke, and the next write reverts.”

“That is how a candidate, party, or agent can be handed the pen for their own
record without controlling the namespace.”

## 1:50–2:10 — The Graph — **Query The Graph**

Back on `/candidates/5693`, open Agent view → **Query The Graph**, then the
query button in the expanded panel.

“The Graph gives a live indexed view of the same on-chain records — the app
consumes the audit ledger without a private copy as the source of truth.”

Show the returned block and fields. If a service fails, show the error
honestly; do not present a cached response as live.

## 2:10–2:30 — Close

“Civicord is a continuity layer for civic information: what was observed,
what evidence survived, and who has authority to maintain the record. ENSv2
provides the namespace and permissions that make it independently addressable
and maintainable.”

“UK first — designed for other regions.”

## Recording notes

- Rehearse against the deployed site; don't read old seat counts from memory.
- The EAC run takes a minute or two on Sepolia — if you run it live, start it
  while narrating the ENS segment. `docs/ens-claim-path.md` has the honest
  scope notes (dual parent `civicordhq.eth` ≠ `setAlias`).
- One flat `p{id}.civicord.eth` subname per candidate — do not describe a
  constituency hierarchy that doesn't exist.
- Keep the Continuity point for the written submission rather than spending
  video time on it: ENSv2 registry + subgraph pre-existed; this iteration made
  UI and agents consume them live.
- See [demo-checklist.md](demo-checklist.md) for track targets.
