# TapeOut Accelerate — submission evidence pack

> Working copy updated **2026-11-26 UTC** after canonical-site deployment.
> Strategy, caveats and
> full research context: [tapeout-accelerate.md](tapeout-accelerate.md). Public
> verifier documentation: [deweb-mirror.md](deweb-mirror.md). Internal operator
> runbook: [tapeout-operations.md](tapeout-operations.md). This file is the
> concise evidence pack for the demo recording and submission form.
> Do not submit until the demo-video link is inserted and the owner approves the
> final form.

## Access links

| Item | Link / value |
|---|---|
| Mirror root | <https://20-2-272.tapekit.org/> |
| Tape name | `tape://20.2.272.tape` |
| Fixed versioned index | <https://20-2-272.tapekit.org/civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/index.html> |
| Bundle verification page | <https://20-2-272.tapekit.org/civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/verify.html> |
| Manifest | <https://20-2-272.tapekit.org/civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/manifest.json> |
| Canonical Civicord cohort | <https://civicord.pages.dev/constituencies/holborn-and-st-pancras> |
| Repository | <https://github.com/sneldao/civicord> |
| Public verification guide | <https://github.com/sneldao/civicord/blob/main/docs/deweb-mirror.md> |
| Demo video | `[insert public video URL]` |
| Official submission form | <https://forms.gle/EoDNbxQ65dev1wFd9> |

The gateway is a reading convenience. The stronger evidence is the frozen
bundle plus the direct-chain verification report; do not describe the gateway
as the trust root.

## Chain identifiers

| Item | Value |
|---|---|
| Chain | X Layer, chain id `196` |
| Circuit / processor | MagicLens circuit `#20` on OrderGuard `0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355` |
| Container | `0xB078da6de46795656187052322Dda3A7E249C288` |
| Circuit owner / sender | `0x8b0b474f86bE342E5A5329Cc2E25016Aa274594e` |
| SiteRegistry proxy | `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6` |
| Pinned SiteRegistry implementation at verification | `0xa85c4143d1d4a77f54b8e4ecc9e6d1418afea45f` |
| DomainBinding proxy | `0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9` |
| Bundle version | `audit-2026-09-07-export-2026-11` |
| Frozen manifest SHA-256 | `2993bbce8d018be26a1664abcb586f5b034cbb6fd7732c4a17e056e877465901` |
| Frozen payload | 7 files / 30,258 bytes |
| Actual spend | `0.08024877 OKB` — 0.08 opening fee plus 0.00024877 gas |
| Verification pinned block | `76865195` |

## Transaction inventory

All transactions succeeded.

| Operation | Transaction |
|---|---|
| open container | `0x2d104d591189bb877c526570b661f7dec1307d48555ae5e5cb3e40cfb327a8a9` |
| publish `candidates.json` | `0x561cd94c35d9a8bd07fefc8df8835f5bb5b26f929f96cc76b604e7e404b1fffc` |
| publish `caveats.md` | `0xa2cbc760d9a8171f61b4995292511979062de4eaed3fb3a4223029a4a2b90e71` |
| publish `index.html` | `0x1cd7e89c0cb3d226f9ee8d9ddf353ac612ebe8fc4c2be52b7d3ec5a5aef494e2` |
| publish `manifest.json` | `0x137f9b704be3a6661b77e1bb3945aef7067c93d41c34ef3c508e6a885ae79b0e` |
| publish `methodology.md` | `0x5ccdf74888cd40be3a774117bb4c8dc843e4d763cfc6be8cae07d3d739c0c01f` |
| publish `sources.json` | `0x6252637dc57b1561620cca9eba5b19dea1c440ffac3b7189711cb6107287c461` |
| publish `verify.html` | `0xca29406d2c46e7dcb6cb4bde08c672f88bb8c02a5c47e92d03ac692030a57964` |
| set fallback | `0xed240a9169c5fe90d143fde4327047eca616e3ca47358405573d3cfc115cadfb` |
| bind `20.2.272.tape` for 120 months | `0xecd393daea10783c8ed05a79575b9dccfa8d39ec86aa7ddc344080256c64d878` |
| publish root latest-index copy | `0x64e24e5bcec082ef6b784f6e956bec073593c06df23c14d6b70c76acafc09ff1` |

Machine-readable evidence:

- frozen bundle: `data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/`
- publication plans: `data/out/deweb/publish-plans/`
- verification report: `data/out/deweb/verification/audit-2026-09-07-export-2026-11-b078da6de4.json`
- root latest-index proof: `data/out/deweb/verification/root-index-b078da6de4.json`

## Verification evidence

Local frozen-bundle verification:

```bash
python3 scripts/tapeout/evidence_bundle.py verify \
  data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11 \
  --self-test
```

Direct-chain verification:

```bash
python3 scripts/tapeout/verify_deweb.py \
  data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11 \
  --container 0xB078da6de46795656187052322Dda3A7E249C288 \
  --prefix civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11
```

Latest result: **pass**. Seven files checked. At pinned block `76865195`,
`https://rpc.xlayer.tech` and `https://xlayer.drpc.org` agreed on chain id,
height, implementation and file reads. Every file matched the frozen local
bytes by size and SHA-256. The verifier uses no gateway response.

Browser evidence: the gateway root rendered the correct seven-candidate Holborn
exhibit in a clean browser automation session. Separately, both verification
RPCs returned root `index.html` bytes exactly matching the frozen versioned
index at pinned block `76865195`. Raw `curl` is not a valid render
check because the first gateway response can be the Service Worker bootstrap.

Canonical-site evidence: Cloudflare Pages deployment `979b8859` is live.
After propagation, `/constituencies/holborn-and-st-pancras/` returned 200 and
contained the mirror panel, mirror root, public verification-guide link,
append-only versioned publication-policy wording and frozen manifest SHA-256.
The site root, data snapshot, St Ives constituency page, summary API and public
corrections-queue read also returned expected responses.

Negative proof: the ordinary bundle verifier's self-test alters bundle bytes,
removes methodology material, uses a wrong schema and removes caveat language;
each malformed case fails closed. Unit tests pass 2/2 and Ruff passes.

## Paste-ready form answers

### Product

Civicord is an auditable public record of what political campaigns published
online: whether candidate URLs still respond, where they redirect and what
evidence changed. The TapeOut entry adds a versioned DeWEB publication mirror
for one bounded UK constituency cohort: seven candidates in Holborn and St
Pancras. The canonical public record is unchanged; the mirror proves that a
small evidence bundle, its methodology and its caveats can be read and
hash-checked without trusting the Civicord host.

### Target users

Journalists, researchers/archivists, roster stewards and civic-tech
institutions. They need stable citations, precise caveats and evidence they can
independently inspect. The mirror is for verification and continuity, not a
privileged judge-only dataset.

### Acquisition

Direct civic-tech and institutional outreach; election-driven search;
journalist/researcher use of citable candidate and constituency pages; open
datasets; reuse by Democracy Club/Campaign Lab/mySociety-adjacent networks.

### Revenue model

Free public record. Institutions may pay for convenience: monitoring, exports,
alerts, hosted dashboards, high-volume API access and new-jurisdiction
deployment. No payment changes the underlying facts, representation, ranking or
correction history.

### Retention

Monthly re-audits, stable IDs and citations, election-triggered passes,
longitudinal change history and correction provenance. A mirror matters because
citations must survive host failure and organisational change.

### TapeOut / X Layer components

The evidence bundle is static content written through TapeOut `SiteRegistry`
proxy `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6` on X Layer (chain id 196),
under container `0xB078da6de46795656187052322Dda3A7E249C288` for owner-controlled
circuit #20 — created during earlier MagicLens work and reused here only as
TapeOut container/processor infrastructure — on OrderGuard processor
`0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355`. The name
`20.2.272.tape` is bound through `DomainBinding` proxy
`0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9` for 120 months. Container-open
transaction: `0x2d104d591189bb877c526570b661f7dec1307d48555ae5e5cb3e40cfb327a8a9`;
binding transaction: `0xecd393daea10783c8ed05a79575b9dccfa8d39ec86aa7ddc344080256c64d878`.
The seven frozen file-publication transactions, fallback-setting transaction and
root-index convenience-copy transaction are inventoried above. No custom
validation circuit is claimed.

### Existing vs new work

Pre-existing before the competition window: audit pipeline, data, static site,
ENS/Graph surfaces, MCP tooling, methodology and caveats.

New inside the competition window: versioned evidence-bundle schema/exporter,
Holborn cohort export, X Layer DeWEB publication transactions, direct-chain
verification tooling and report, malformed-bundle rejection tests, browser
validation, canonical-site verification UX and documentation.

### Demo

`[insert public video URL]` shows a vanished/redirected campaign URL, the
canonical Civicord record, the DeWEB mirror, direct-chain/hash verification and
a malformed bundle failing closed. Repository:
<https://github.com/sneldao/civicord>; mirror: `tape://20.2.272.tape` /
<https://20-2-272.tapekit.org/>; canonical cohort:
<https://civicord.pages.dev/constituencies/holborn-and-st-pancras>.

## Demo capture checklist

Target 2:30. Follow the script in [tapeout-accelerate.md](tapeout-accelerate.md#two-minute-thirty-demo-script).

1. Canonical Civicord cohort page: show one DNS-error row and one redirect row.
2. Say precisely: these are HTTP/audit classes, not allegations of intent.
3. Open the mirror root, then the fixed versioned URL.
4. Open `verify.html` and `manifest.json`; show the bundle carries methodology,
   caveats, sources and hashes.
5. Run the direct-chain verifier live; show `ok: True`, 7 files, pinned block.
6. Run the local verifier with `--self-test`; show negative proofs pass.
7. Show the container/binding transaction hashes and the chain identifiers.
8. Close with users, acquisition, retention and revenue in 20–25 seconds.

Do not say “permanent archive” without qualification. Say “versioned verifiable
publication mirror”. Do not say the circuit validates political truth; no custom
validation circuit is claimed.

## Remaining before submission

- Run one unguided external comprehension test with a journalist, researcher or
  transparency-minded tester; record confusion and fix only comprehension.
- Record the demo video and insert its public URL above.
- Re-read the official form/rule text immediately before submission. The Google Form currently requires Google sign-in, so final submission is an owner action.
- Submit by the internal deadline **2026-12-04**, not the final Dec 7 deadline.
