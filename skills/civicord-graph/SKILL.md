---
name: civicord-graph
description: Query Civicord’s live The Graph subgraph for ENS-registered UK candidates (p{id}.civicord.eth) and join results with the static audit ledger. Use when an agent needs on-chain registration, sync status, text-record changes, or to compare Graph vs ledger for a Democracy Club person id.
---

# Civicord Subgraph SKILL

Continuity note: Civicord is an existing open-source public-record project. This skill targets the **live Subgraph Studio index** of ENSv2 registrations and text records — not a mocked dataset.

## Endpoint

```
https://api.studio.thegraph.com/query/101650/civicord/v0.0.4
```

Studio UI: https://thegraph.com/studio/subgraph/civicord
Network: Sepolia · **v0.0.4** (namehash join). Same-origin: `POST /api/graph` on civicord.pages.dev.

POST `application/json` body: `{ "query": "...", "variables": { } }`
Browser CORS allows `*`.

## Entities

| Entity | ID | Meaning |
|---|---|---|
| `Candidate` | Democracy Club person id (`"5693"`) | `p{id}.civicord.eth` registration |
| `TextRecord` | `nodeHex/key` | Latest url / status / person_name |
| `TextRecordChange` | per block | Change log when `setText` fires |
| `Stat` | `"civicord"` | Aggregate counts |
| `NodeToCandidate` | namehash hex | Lookup for TextChanged |

**Do not** use a constituency slug as `Candidate.id`.

## Quick queries

### Sync health
```graphql
{
  _meta { block { number } deployment hasIndexingErrors }
  stat(id: "civicord") {
    candidateCount textRecordCount textRecordChangeCount liveCount goneCount
  }
}
```

### One candidate
```graphql
{
  candidate(id: "5693") {
    id ensName owner registeredAt registeredAtBlock
    status url personName textRecordCount
  }
}
```

### Recent registrations
```graphql
{
  candidates(first: 10, orderBy: registeredAt, orderDirection: desc) {
    id ensName registeredAt textRecordCount
  }
}
```

### Text changes (may be empty until records blast finishes)
```graphql
{
  textRecordChanges(first: 20, orderBy: timestamp, orderDirection: desc) {
    key oldValue newValue blockNumber
    candidate { id ensName }
  }
}
```

## Join with the audit ledger (required for meaningful answers)

The Graph indexes **on-chain** ENS state. Website liveness (live / gone / redirected) lives in the static audit API:

```
GET https://civicord.pages.dev/api/candidates/{id}.json
```

Reasoning pattern:

1. Query Studio `candidate(id)` (and optionally `textRecordChanges`).
2. Fetch ledger JSON for the same id.
3. Cite both: registration / text records from Graph; HTTP/DNS audit from the ledger.
4. If `textRecordCount` is `0`, say so — registrations are live; status text may still be pending `setText`.

On Civicord pages, WebMCP tools do this for you:

- `query_subgraph_meta`
- `get_onchain_candidate`
- `compare_onchain_to_ledger` ← prefer for Q&A
- `list_recent_onchain_registrations`
- `list_text_record_changes`

## Example agent question

> Is Dawn Furness (5693) on-chain, and what does the audit say about her site?

1. `compare_onchain_to_ledger` with `id: "5693"` (or Graph + `/api/candidates/5693.json`).
2. Answer from `verdict[]`, then quote `onchain.ensName` and ledger `websites[].audit`.

## Curl smoke test

```bash
curl -s -X POST -H 'content-type: application/json' \
  -d '{"query":"{ _meta { block { number } hasIndexingErrors } stat(id:\"civicord\") { candidateCount textRecordCount } }"}' \
  https://api.studio.thegraph.com/query/101650/civicord/v0.0.4
```
