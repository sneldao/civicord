# Demo script — Civicord

## Start on the homepage

“Political websites can disappear after an election. Civicord lets you inspect the audit, read available source excerpts, and verify recorded fields without an account or wallet.”

Show the three starting paths. The dots summarize HTTP outcomes; they are not one dot per candidate and do not prove content survival.

## Open the worked example

Open `/candidates/5693` (Dawn Furness).

“The original URL returned HTTP 200 at the 7 September 2026 audit, but redirected to a domain-sale page. Responding is not the same as preserving a campaign. Even a surname match can be misleading.”

Show the redirect destination. Select **View evidence** and show the April 2025 excerpts, clearly labeled as excerpts rather than complete archived pages. Select **Copy citation**.

## Verify the recorded fields

Select **Verify this record**, then **Verify on-chain**.

“These are live reads of ENS resolver fields on Sepolia: the candidate name, original URL and audit status. The stored value `live` means HTTP success at the audit, not campaign survival. The full website is not stored on-chain.”

Select **Query The Graph**, then the query button in the expanded panel.

“The Graph retrieves the indexed record alongside the audit ledger. This proves the integration is live; it does not prove that a political claim is true.”

Show the returned block and fields. If a service fails, show the error honestly; do not present a cached response as live.

## Show a visitor’s next step

Follow the candidate’s constituency link, then its filtered ledger. The selected place and results appear before the optional map. Show **Copy filtered link**. Open the map only if useful.

## Close with scope and continuity

“UK first; designed for other regions. The current prototype has public audit fields on Sepolia. Permanent content storage is planned.”

“For Continuity: the ENS registry and subgraph already existed. This iteration made the UI and agents consume them live.”

Use the submission checklist for track-specific requirements. Rehearse against the deployed version before recording; do not read old seat counts from a script.
