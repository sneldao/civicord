# Civicord — Competing/Adjacent Projects Research

_Researched 2026-09-07 via Parallel Search API. Status: preliminary — items marked ⚠️ need manual verification._

## Direct precedents (validated)

### 1. EDGI Web Monitoring (US) — **closest open-source project; build on this**
- Repo: https://github.com/edgi-govdata-archiving/web-monitoring ("Scanner")
- Monitors changes on US government websites at scale (founded during 2016 transition)
- Pipeline architecture: crawl → archive versions → diff → human/AI significance annotation → public web UI
- Lesson: their biggest pain was **version management + diff UX**, exactly our Phase 3-4. Reuse their data model and diffing approach; avoid their scaling mistakes (ask them).

### 2. Library of Congress — US Elections Web Archive (US)
- 20+ years of candidate campaign websites (presidential/gubernatorial/congressional)
- Publishes open data packages: **CDX index files + metadata.csv of all candidate websites** — see blog posts "Candidates, Campaigns, and CDX Files" (2022) and "New U.S. Elections Web Archive Data Resources" (2024) at blogs.loc.gov
- Their `metadata.csv` + CDX structure is a ready-made **schema template** for our websites/snapshots tables.

### 3. End of Term Web Archive (US) — process model
- eotarchive.org — consortium archiving of .gov sites at administration changes
- Steal: seed-nomination model, bulk WARC downloads, multi-org cost sharing.

### 4. UK Web Archive (British Library) — the key UK player ⚠️
- Blogs confirm they collect election websites during UK general elections (2017, 2019 posts: "What websites do we collect during UK General Elections?", "Web Archiving the UK General Election 2019")
- **Critical caveat: Legal Deposit Regulations 2013** — most UKWA content is viewable only in UK legal deposit libraries (reading-room access), not bulk-downloadable. Verify what's accessible for 2024.
- Opportunity: civicord as seed nominator + publicly-accessible complement.

### 5. Politwoops / ProPublica (US) — accountability precedent, now defunct
- Tracked 500k+ deleted tweets from politicians since 2012; shut down 2023/24
- Lesson: "deleted statements" framing has proven public/journalist value; also shows maintenance/funding risk of ongoing monitoring.

## Adjacent UK infrastructure (complementary, not competing)

- **Democracy Club Candidates** (candidates.democracyclub.org.uk): canonical roster, free researcher downloads, social media links, election statements. No website-change tracking. **Use their person/candidate IDs as our primary keys.**
- **TheyWorkForYou (mySociety)**: MP activity records; no website monitoring.
- **Campaign Lab candidate-website-scrape**: our baseline (April 2025 scrape, JSON per candidate in `assets/json`). No license file ⚠️ — clarify reuse terms.
- **British Election Study**: 2024 constituency results + candidate data (DOI 10.48420/284306) — good for won/lost status enrichment.

## The gap (provisional finding)

No UK project does **candidate-level longitudinal website change tracking** (per-candidate diffs, deleted claims, topic shifts, alerts) as open data. Precedents exist only in the US (EDGI for gov sites, LoC for candidate *archiving* without change analysis).

## Recommended stack decisions informed by research

1. Adopt **LoC's CDX + metadata.csv** data model for our snapshot/change schema.
2. Study **EDGI web-monitoring** before writing diff infrastructure; potentially contribute upstream rather than rebuild.
3. Use **Wayback CDX API** as historical baseline (Campaign Lab scrape is April 2025, not July 2024).
4. Output format target: **bulk WARC/Parquet downloads + CDX indexes** like LoC/EOT, not just a portal.
5. Partner-first: Democracy Club (IDs + distribution), UK Web Archive (nominations + future crawls), mySociety (patterns + audience).

## Open questions / manual verification needed

- [ ] Does UKWA hold 2024 GE candidate site crawls? What access model?
- [ ] Campaign Lab scrape license + per-candidate scrape timestamps
- [ ] Democracy Club: does YNR API expose website/homepage fields reliably?
- [ ] Contact EDGI about reusing web-monitoring components
- [ ] Any academic UK candidate-website datasets (Google Scholar pass still to do)
