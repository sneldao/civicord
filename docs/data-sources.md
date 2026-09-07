# Data Sources

| Source | What it gives us | Access | License/status | Notes |
| --- | --- | --- | --- | --- |
| Campaign Lab candidate-website-scrape | April 2025 per-candidate website scrape (per-section text + source URLs) in `assets/json` | GitHub repo, public | ⚠️ **No license file — clarify before public reuse** | Our historical baseline; no formal schema |
| Democracy Club Candidates (YNR) | Canonical roster: person IDs (stable across elections), party, constituency, social media, results | Free downloads + API | Open (attribution required) | **Use person_id as our primary key**; used by BBC, Electoral Commission |
| Wayback Machine (CDX API) | Historical snapshots of candidate sites, incl. dead domains | Free API; `id_` suffix strips toolbar | Public | Primary source for dead sites; query windows: Apr 2025 + Jul 2024 |
| UK Web Archive (British Library) | Election website collections (2017/2019 blogged; 2024 ⚠️ to verify) | ⚠️ Legal Deposit — much is reading-room-only | Restricted | Offer civicord as public complement + seed nominator |
| Library of Congress US Elections Web Archive | 20+ yrs of US candidate sites; open **CDX indexes + metadata.csv** | Bulk download | Public | Schema template + operating model, not data |
| EDGI web-monitoring | Open-source crawl→version→diff→annotate pipeline | GitHub, open source | Open source | Reuse/extend rather than rebuild diff infra |
| End of Term Web Archive | Process model: seed nomination, bulk WARC, consortium | eotarchive.org | Public | Operating model reference |
| British Election Study | 2024 constituency results + candidate data (DOI 10.48420/284306) | Free download | Academic | Enrichment/cross-check for won/lost |
| TheyWorkForYou (mySociety) | MP activity, offices, membership | API, open | Open | Join for candidate→MP transitions |
| electionresults.uk / Electoral Commission | Result validation, official candidate status | CSV downloads | Open (OGL) | Validation source |
| Parallel Search API | Research/agentic search | API key in `.env` | Paid | Research tooling only, not part of dataset |

## Access plan per phase

- **Phase 0:** Campaign Lab repo + YNR download. No Wayback yet.
- **Phase 1:** Wayback CDX backfill. Contact UKWA about 2024 collection.
- **Phase 2+:** own crawler (robots.txt-aware, rate-limited, UA string identifying civicord).
