# TapeOut Accelerate — conditional DeWEB mirror strategy and publication record

> Working assessment, researched and revised **2026-11-25**. This is a
> time-boxed competition document, not a change to the public-record
> methodology. MagicLens, the separate primary TapeOut project, remains the
> portfolio priority. The technical DeWEB gate has now passed: the mirror is
> published and direct-chain verified. Civicord should still submit only if
> the remaining video/submission work does not weaken the standing rule that
> the public record and its caveats do not change for a competition.

## Decision in one paragraph

The honest Civicord entry is **not** “put Civicord on a blockchain” and not a
migration of the canonical ENS/Sepolia registry. It is a small, versioned
**verifiable publication mirror**: a bounded evidence bundle for one seat,
written to X Layer DeWEB, with Civicord's caveat and methodology text embedded
in the bundle itself. The ordinary site remains the convenient interface; the
mirror demonstrates that the evidence and methodology can be read and checked
without trusting the Civicord host.

Do not build a publication-policy circuit. TapeOut circuits are gate-level
NAND/LATCH/REF netlists, not general schema validators. DeWEB publication
itself uses TapeOut contracts on X Layer (`SiteRegistry` and `DomainBinding`),
so a circuit is optional ecosystem decoration rather than the eligibility
spine. If anything is validated negatively, validate the manifest with ordinary
code and show that malformed evidence is rejected.

## Competition facts

Source checked against the official Build X Series page on 2026-11-25:
<https://web3.okx.com/xlayer/build-x-series>. Re-check before submission; the
deadline is described as provisional and the organiser reserves the right to
amend rules and dates.

| Fact | Detail |
|---|---|
| Event | **X Layer TapeOut Accelerate** |
| Window | **Oct 16 – Dec 7, 2026, 23:59 UTC** |
| Practical internal deadline | **Dec 4** — leave time for form/video/link failures |
| Format | Online submission; shortlisted teams attend an offline Demo Day |
| Prize pool | **100,000 USDT** — 1 × 20k, 5 × 10k, 5 × 6k |
| Prize caveat | Prizes are TapeOut-community sponsored and may be staged/milestone-based; do not treat headline numbers as immediate cash |
| Existing projects | Allowed, but only substantial work completed inside Oct 16–Dec 7 is judged |
| Submission | [Google Form](https://forms.gle/EoDNbxQ65dev1wFd9) plus a demo video recommended under 3 minutes |
| Core rule | Use TapeOut circuits/contracts/on-chain data on X Layer, **or run on X Layer DeWEB**. Interfaces and broader app logic may run off-chain |
| Judging emphasis | User value and commercial potential, innovation, TapeOut ecosystem integration, product readiness/UX, demo quality |

The submission must explain the product, target users, acquisition route,
revenue model, retention reason, TapeOut/X Layer components used, relevant
processor/circuit identifiers where applicable, access links, and demo video.

### Eligibility interpretation

The participation bullets say a project qualifies if it either uses TapeOut
circuits/contracts/on-chain data on X Layer **or runs on X Layer DeWEB**. The
FAQ uses narrower wording (“must use TapeOut circuits, contracts or onchain
data on X Layer and provide the relevant addresses”). A DeWEB mirror still has
a strong answer under the narrow reading: publishing writes files through the
TapeOut `SiteRegistry` contract and name activation through `DomainBinding` on
X Layer. Those contract addresses, the container address, the transaction
hashes and the resulting `tape://` name should be included in the submission.

A separate circuit is therefore **not required for eligibility** on the text we
have. If the organisers disagree, the fallback is not a fake circuit; it is to
withdraw or ask for clarification.

## Research findings — what DeWEB actually is

Primary sources:

- TapeKit README and site-owner handbook:
  <https://github.com/TapeOutProtocol/TapeKit>
- tape:// specification v0.2 draft:
  <https://github.com/TapeOutProtocol/TapeKit/blob/main/SPEC.md>
- X Layer contract configuration:
  <https://github.com/TapeOutProtocol/TapeKit/blob/main/kernel/src/config.js>
- TAP-02 circuit-netlist semantics:
  <https://github.com/TapeOutProtocol/TAPs/blob/main/TAPs/TAP-02.md>
- HashPort console:
  <https://www.hashport.ai/app>
- Independent X Layer publishing reference:
  <https://github.com/davieslennox0/tapeout-forge/tree/main/tools/deweb-publish>

### Verified properties

1. **A DeWEB site is static content stored under a TapeOut circuit container.**
   Files live in `SiteRegistry` by `(container,path)`. Every file records size,
   content type and SHA-256. Files are chunked at **24,000 bytes**; the maximum
   single-file size is **350 × 24,000 = 8.4 MB**. Sites are static; there is no
   server-side runtime.
2. **The verification model is real but specific.** A compliant client reads at
   a pinned block, requires exact agreement from at least two independent node
   operators, checks the pinned contract implementation, verifies each file's
   length and SHA-256, and isolates the site. It refuses inconsistent reads.
3. **The gateway is convenience, not the trust root.** `*.tapekit.org` makes a
   site readable in an ordinary browser through a Service Worker. The stronger
   claim is that the same bytes can be read directly from chain with the open
   TapeKit kernel. Demo language must separate those two things.
4. **X Layer is supported, but the spec is BNB-centric.** SPEC v0.2 describes
   BNB Smart Chain. X Layer support is in the TapeKit README/kernel config:
   chain id **196**, area code **2**, names of the form
   `<circuit>.2.<processor>.tape` (for example `6.2.272.tape`).
5. **X Layer contract addresses are deployed.** TapeKit lists:
   - processor factory `0x1f09DAeFA827f02CBb40967cc91b259763760761`
   - container opener `0x536adD8F30f03b69f6fbF29d425A816A0dC50106`
   - SiteRegistry proxy `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6`
   - DomainBinding proxy `0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9`

   Read-only checks run for this assessment on 2026-11-25 against
   `https://rpc.xlayer.tech` confirmed chain id `196`, code at all four
   addresses, SiteRegistry implementation `0xa85c4143d1d4a77f54b8e4ecc9e6d1418afea45f`,
   DomainBinding implementation `0x5ebf29b80789e548907c707530c3c7607c4347df`
   (both matching TapeKit's pinned X Layer values), and `monthlyFee() = 0` at
   that moment. Treat fee readings as point-in-time, not policy.
6. **X Layer has a thinner independent-RPC set than BNB.** TapeKit's own config
   says the effective independent public operators are OKX and dRPC; the two OKX
   hostnames count as one operator and thirdweb appears to forward OKX. Strict
   reads therefore depend on agreement between those two operators unless the
   reader configures additional nodes. Default endpoints listed by TapeKit are
   `https://rpc.xlayer.tech`, `https://xlayerrpc.okx.com`,
   `https://xlayer.drpc.org` and `https://196.rpc.thirdweb.com`; operator
   identity matters more than hostname count. This belongs in the trust caveats.
7. **Activation is a display policy, not a read block.** TapeKit-compliant
   shells display only activated/open names, but the chain data is public and
   can be read regardless. Do not describe activation as encryption, access
   control, or the thing that makes publication possible.
8. **Updateability cuts both ways.** The container holder can update or remove
   current directory entries. Historical bytes may remain in chain state or
   history, but the *current readable view* is controlled by the holder.
   Therefore Civicord must treat versioned snapshot paths as append-only and never
   overwrite a cited snapshot in place.
9. **The stack is immature.** TapeKit says the kernel/gateway are not yet
   independently audited; the spec is draft; the Public Suffix List and npm
   package are roadmap items; processors were frozen in October but the factory
   remains upgradeable. This is acceptable for a hackathon proof, not for
   archival absolutism.
10. **TapeOut circuits are Boolean hardware netlists.** TAP-02 defines NAND,
    LATCH and REF records over bit vectors. They can compute small bit-level
    functions; they cannot naturally parse JSON, validate URLs, compare text or
    understand a manifest. Any “schema-checking circuit” would either be fake
    or push the real judgement off-chain. Avoid it.

### Evidence that X Layer publication is feasible

The independent `tapeout-forge` project reports a live X Layer mirror at
`https://6-2-272.tapekit.org/` (`tape://6.2.272.tape`), published through the
X Layer `SiteRegistry`, with file hashes checked against `fileInfo`. Its
`tools/deweb-publish` directory contains a generic MIT-licensed publisher that
opens containers, diffs files by SHA-256, writes `putFile`/`appendChunk`, sets
SPA fallback, binds names, and defaults to dry-run. It reports real cost of
**0.0807 OKB** for a small site: 0.08 OKB container-opening fee plus gas, while
`monthlyFee()` happened to read zero when binding.

That is useful evidence, not proof of our path. A basic `curl` check for this
assessment returned HTTP 200 for both `https://6-2-272.tapekit.org/` and
`https://tapekit.org/`; that proves only gateway reachability, not successful
Service Worker bootstrapping or rendering in a clean browser. The reference
project also notes trouble with one-shot headless-browser rendering, so the
clean-browser test remains a hard gate.

Before use, inspect the script and keys handling ourselves; do not paste private
keys into commands. HashPort is the hosted alternative, but its public console
currently emphasises BNB Chain, so X Layer support must be verified before
relying on it.

## Implementation state as of 2026-11-25

**Publication is complete and independently verified.** The frozen Holborn
bundle is live on X Layer DeWEB under the MagicLens circuit #20 container. The
ordinary Civicord site remains canonical; this is a versioned publication
mirror, not a migration of truth.

| Item | Final state |
|---|---|
| Evidence exporter | Built: `scripts/tapeout/evidence_bundle.py` |
| Local bundle verifier | Built in the same script; negative self-tests pass for altered bytes, missing methodology, wrong schema and removed caveat text |
| Test coverage | `tests/test_tapeout_evidence_bundle.py`; `uv run --with pytest python -m pytest -q tests/test_tapeout_evidence_bundle.py` passes 2/2 |
| Generated bundle | `data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/` |
| Frozen bundle hash | `manifest.json` SHA-256 `2993bbce8d018be26a1664abcb586f5b034cbb6fd7732c4a17e056e877465901`; generated at `2026-11-25T17:36:13Z` |
| Frozen payload | 7 files, 30,258 bytes: `index.html`, `manifest.json`, `methodology.md`, `caveats.md`, `candidates.json`, `sources.json`, `verify.html`; claim diffs omitted by default |
| Selected circuit | Existing MagicLens circuit **#20** on OrderGuard `0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355` |
| Circuit owner / transaction sender | `0x8b0b474f86bE342E5A5329Cc2E25016Aa274594e` |
| Container | `0xB078da6de46795656187052322Dda3A7E249C288`; opened and displayed as live |
| Tape name | `tape://20.2.272.tape`, bound for 120 months; `monthlyFee()` read zero and the binding transaction value was zero |
| Gateway root | <https://20-2-272.tapekit.org/> — browser-render check passed after publishing the root latest-index copy |
| Canonical versioned URL | <https://20-2-272.tapekit.org/civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/index.html> |
| Root latest-index copy | `index.html` is an exact byte copy of the frozen versioned `index.html`, hash `7aa9a87a8c2f95e5e4b4dbb20cc97880d6c25e32522f0948a878fa2f824a8c39`; it exists because TapeKit treats `/` as the literal path `index.html` before considering fallback paths. Two-RPC pinned-block proof: `data/out/deweb/verification/root-index-b078da6de4.json` |
| Fallback path | Set to the versioned `index.html`; it is not what serves `/`, because exact `index.html` now exists |
| Direct-chain verification | **Passed**: `python3 scripts/tapeout/verify_deweb.py data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11 --container 0xB078da6de46795656187052322Dda3A7E249C288 --prefix civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11` |
| Verification report | `data/out/deweb/verification/audit-2026-09-07-export-2026-11-b078da6de4.json`; `ok: true`, 7 files checked, pinned block **76865195**, generated `2026-11-25T19:17:52Z` |
| Verification shape | Read-only direct chain reads at one pinned block through `https://rpc.xlayer.tech` and `https://xlayer.drpc.org`; both reported chain id 196, height 76865195 and SiteRegistry implementation `0xa85c4143d1d4a77f54b8e4ecc9e6d1418afea45f`; every file's size, chain SHA-256 and payload SHA-256 matched the frozen local bytes |
| Browser validation | A clean browser automation session opened the gateway root and rendered the correct Holborn page: 7 candidates, caveat links, record links and no external site assets. Raw `curl` is not meaningful evidence for the gateway because the first response can be the Service Worker bootstrap page rather than site bytes |
| Actual spend | **0.08024877 OKB total**: 0.08 OKB opening fee plus 0.00024877 OKB gas across all 11 successful transactions. Owner balance after publication was approximately 0.02318251 OKB |
| Signing hygiene | The owner-controlled key was imported into a temporary encrypted keystore only after its derived address was verified as the circuit owner. The temporary keystore, password file and temporary bundle copy were deleted after use. A working copy of the backup key material now exists in Civicord's local gitignored `.env`; the pre-existing MagicLens copy remains outside this repository. No secret belongs in tracked files |
| Documentation split | External verifier guide: [deweb-mirror.md](deweb-mirror.md); internal operations runbook: [tapeout-operations.md](tapeout-operations.md); paste-ready evidence pack: [tapeout-submission.md](tapeout-submission.md) |

### Publication transactions

All 11 transactions returned successful receipts. Blocks run from 76864828 to
76865136; the first ten are the original publication and the eleventh is the
root latest-index copy.

| Operation | Path / name | Transaction |
|---|---|---|
| open container | — | `0x2d104d591189bb877c526570b661f7dec1307d48555ae5e5cb3e40cfb327a8a9` |
| putFile | `…/candidates.json` | `0x561cd94c35d9a8bd07fefc8df8835f5bb5b26f929f96cc76b604e7e404b1fffc` |
| putFile | `…/caveats.md` | `0xa2cbc760d9a8171f61b4995292511979062de4eaed3fb3a4223029a4a2b90e71` |
| putFile | `…/index.html` | `0x1cd7e89c0cb3d226f9ee8d9ddf353ac612ebe8fc4c2be52b7d3ec5a5aef494e2` |
| putFile | `…/manifest.json` | `0x137f9b704be3a6661b77e1bb3945aef7067c93d41c34ef3c508e6a885ae79b0e` |
| putFile | `…/methodology.md` | `0x5ccdf74888cd40be3a774117bb4c8dc843e4d763cfc6be8cae07d3d739c0c01f` |
| putFile | `…/sources.json` | `0x6252637dc57b1561620cca9eba5b19dea1c440ffac3b7189711cb6107287c461` |
| putFile | `…/verify.html` | `0xca29406d2c46e7dcb6cb4bde08c672f88bb8c02a5c47e92d03ac692030a57964` |
| setFallback | versioned `index.html` | `0xed240a9169c5fe90d143fde4327047eca616e3ca47358405573d3cfc115cadfb` |
| bind | `20.2.272.tape` for 120 months | `0xecd393daea10783c8ed05a79575b9dccfa8d39ec86aa7ddc344080256c64d878` |
| putFile | root latest `index.html` | `0x64e24e5bcec082ef6b784f6e956bec073593c06df23c14d6b70c76acafc09ff1` |

Machine-readable publication plans are retained at:

- `data/out/deweb/publish-plans/audit-2026-09-07-export-2026-11-circuit20.json`
- `data/out/deweb/publish-plans/root-latest-index.json`

The frozen versioned path must not be overwritten. If the exporter changes, or
if a correction/audit creates new evidence, publish a new version path and then
update only the unversioned latest-index convenience copy.

## Alignment with Civicord's existing documents

This entry is only worth doing if it reinforces the existing product rather
than distracting from it:

- **Continuity principle** (`personas.md`): value compounds over time; IDs and
  citations must never break. A mirror is useful only if it is versioned and
  append-only in practice.
- **Architecture principle** (`architecture.md`): aggregate archivers; do not
  rebuild the archive. DeWEB is another publication/verification mirror, not a
  replacement for Wayback, Campaign Lab, Democracy Club, ENS, or the audit
  pipeline.
- **Change-feed caveat discipline** (`change-feed.md`, `significance-labelling.md`):
  `live` is an HTTP-response class, redirects are noisy, surname absence is a
  heuristic, and claim deletions are scope-limited. Those caveats must be
  embedded in the bundle, not linked back only to the normal site.
- **Convenience, not privilege** (`personas.md` §5): institutions may pay for
  monitoring and exports, never for better underlying facts. Judges must see
  the same public record everyone else sees.
- **Claim flow** (`claim-flow.md`): corrections append; history is not
  rewritten. A correction can produce a new mirror version, never an in-place
  rewrite of a cited one.
- **NLnet strategy** (`nlnet-ois.md`): if tooling is built, make it reusable as
  an open, verifiable export format. Do not make TapeOut the centre of the
  NLnet pitch; NLnet is funding the audit/claim-flow commons, not chain
  integration.
- **Outreach priority** (`outreach.md`): sending the four institutional emails
  remains higher-leverage than this competition; they were still unsent at the
  2026-11-16 outreach review. TapeOut must not become a reason they stay unsent.

## Chosen record slice

**Chosen and now published cohort: Holborn and St Pancras.**

Why this seat:

- seven candidates — large enough to show a cohort, small enough to inspect manually;
- mixed outcomes in the current published snapshot derived from the 2026-09-07
  audit: four `live`, two `dns_error`, one `http_error`; two redirected rows;
  still/redirected/repurpose-suspect/gone signals all represented;
- high public salience because it is the Prime Minister's constituency, but the
  presentation must remain strictly neutral and never imply wrongdoing from a
  technical state;
- compact data footprint: the seven full candidate JSON records plus the three
  available claim-diff rows are only about **20.5 KB raw JSON** before
  normalisation, so the bundle can be small enough for DeWEB without exotic
  optimisation;
- it exercises the awkward cases that make the public record honest: shared
  party infrastructure, redirects, bot/error states, missing surname matches,
  and scope-limited claim diffs.

Exact cohort in the committed snapshot:

| Person ID | Candidate | HTTP class | Redirected? | Ledger signal |
|---|---|---:|---:|---|
| `113881` | Andrew Feinstein | `dns_error` | no | `gone` |
| `7292` | Bobby “Elmo” Smith | `live` | yes | `redirected` |
| `40908` | David Robert Stansell | `live` | no | `repurposed_suspect` |
| `5961` | John Poynton | `live` | no | `still_attested` |
| `5077` | Keir Starmer | `http_error` (403) | yes | `redirected` |
| `2323` | Nick the Incredible Flying Brick | `live` | no | `repurposed_suspect` |
| `72613` | Tom Scripps | `dns_error` | no | `gone` |

These labels are response classes and heuristics, not allegations. The 403 row
in particular must not be narrated as a disappearance.

Important caveat: none of the seven rows has an ENS name in the currently
committed frontend snapshot. That is acceptable. The entry is a mirror of the
public ledger, not a demo of ENS coverage. If judges need the existing ENS
continuity path, **Cramlington and Killingworth** is the fallback because it
includes candidate `5693` (the established demo record) — but it is a weaker
decay exhibit.

### Bundle content — safe by default

Publish only derived, civicord-generated or clearly licensed material:

- seat metadata: name, slug, GSS code, region, electorate where already public;
- candidate rows: person ID, name, party, URL, audit status, redirect target,
  signal label, source attribution, canonical Civicord record URL;
- methodology and caveat text, versioned;
- source/manifest hashes and generation timestamp;
- claim-diff rows only where the scope note is attached, the wording uses the
  existing `scopeExplanation` language, and the example has been manually
  reviewed rather than exported as a bulk deletion count;
- selected archived excerpts only when redistribution rights are clear.

Do **not** publish raw HTML, private reviewer material, contact details from
correction queues, unreviewed screenshots, or bulk third-party campaign text
beyond the CC-BY arrangement already documented.

Expected artifact inventory for v0:

```text
index.html              # readable cohort exhibit with embedded caveats
manifest.json           # schema/source/version/file-hash manifest
methodology.md          # exact methodology version quoted in the bundle
caveats.md              # response-class, redirect, surname and scope limits
candidates.json         # the seven full candidate records, normalised
claim-diffs.json        # optional; omit by default unless manually reviewed
sources.json            # Campaign Lab / Democracy Club / audit provenance and licences
verify.html             # local verification instructions and expected hashes
```

`claim-diffs.json` is optional, not decorative. The Holborn rows include very
large nominal deletion counts caused partly by the April-site-wide vs
September-homepage scope mismatch. For v0 the default is to omit the bulk rows;
include at most hand-checked sentence pairs with `scopeExplanation` attached.
If the scope caveats cannot be carried faithfully, omit the file rather than
simplifying the claim.

### Append-only publication policy

Every bundle is a versioned snapshot, for example:

```text
/civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/index.html
/civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/manifest.json
```

Rules:

1. never overwrite a published snapshot path;
2. corrections and later audits create a new version path;
3. the latest-version index may change, but Civicord policy requires every
   versioned URL to keep resolving to the same bytes;
4. the manifest records schema version, source snapshot hash, methodology
   version, licence, generation time, included record IDs, per-file SHA-256,
   and the canonical Civicord URLs;
5. the absence of evidence is represented as absence/unknown, never smoothed
   over for demo clarity.

## Product and demo shape

### Demo thesis

> “Campaign websites are political evidence, but the web forgets. Civicord
> already measures that decay. For TapeOut, we are publishing a small public
> evidence bundle through DeWEB so the record's verification path does not
> depend on the Civicord host. The ordinary site remains the convenient way to
> read it; the mirror proves the evidence and methodology can be checked from
> public chain state.”

Use **verifiable mirror** or **publication mirror**. Avoid unqualified
“permanent record”: the chain can fail, contracts can be upgradeable, current
directory entries can be changed by the holder, and gateway access is not the
same as independent verification.

### Two-minute-thirty demo script

1. **0:00–0:15 — cold open.** Show a Holborn candidate URL that now errors or
   fails DNS, beside its Civicord record. State the class precisely; do not
   infer intent.
2. **0:15–0:35 — stakes.** Campaigns publish positions on the web, then the web
   changes. Who keeps the evidence readable and checkable?
3. **0:35–0:55 — existing public ledger.** Show the seat page and one candidate
   record, including caveat language and citation affordance.
4. **0:55–1:20 — DeWEB mirror.** Open the versioned bundle through the TapeKit
   gateway and show the same caveats embedded locally.
5. **1:20–1:45 — verification.** Show manifest hashes, `SiteRegistry` file
   metadata, the X Layer contract addresses, and a direct-chain/kernel check
   or a clean second browser read.
6. **1:45–2:05 — negative proof.** Run the ordinary manifest verifier against a
   malformed bundle: missing methodology hash, altered record bytes, wrong
   schema version, or mismatched SHA-256. It fails closed.
7. **2:05–2:30 — users, acquisition, sustainability.** Journalists/researchers
   read free; acquisition comes through civic-tech/outreach networks and
   election-driven searches; retention comes from monthly audits and stable
   citations; institutions pay for monitoring, exports, alerts and new-region
   deployments — never for privileged truth.

### What counts as substantial new work

Pre-existing before the window: audit pipeline, data, static site, ENS/Graph
surfaces, MCP tooling, methodology and caveats.

New inside the window:

- versioned evidence-bundle schema and exporter;
- Holborn bundle generation with embedded caveats and licence attribution;
- X Layer DeWEB publication transactions and manifest;
- verification page comparing Civicord URL, mirror URL, source hashes and
  chain-recorded file metadata;
- malformed-bundle rejection tests;
- clean-browser and direct-chain verification evidence;
- documentation separating canonical records from mirrors.

That list, with commit and transaction links, is the honest answer to the
existing-project rule.

## Commercial and adoption story

Civicord is a public good. Charge for service and convenience, never for
privileged access to the underlying record.

| Audience | Free public value | Possible paid convenience |
|---|---|---|
| Journalists | citations, records, filtered evidence | alerts, evidence exports, newsroom monitoring |
| Researchers/archivists | stable IDs, methodology, open data | bulk packages, long-running cohort analysis |
| Roster stewards / transparency NGOs | digest and correction path | hosted monitoring, steward dashboards, operational support |
| Public-affairs/compliance users | same public facts as everyone else | high-volume API, alerts, audit trails |
| Civic-tech institutions | reusable pipeline and schema | new-jurisdiction deployment and operation |
| Agent/API consumers | ordinary public reads | metered high-volume reads where appropriate |

Acquisition: direct outreach to Democracy Club, UK Web Archive, EDGI,
mySociety and Campaign Lab; journalist/researcher use around election cycles;
searchable seat/candidate pages; open datasets; civic-tech conference and
newsroom networks. Retention: monthly re-audits, stable citations, correction
history, election-triggered passes, and eventually multi-year longitudinal
coverage.

Do not charge campaigns for favourable representation, removal, ranking or
interpretation.

## Submission-form answer skeleton

Paste-ready except for the demo-video link and any final repository/commit links.
The mirror exists and the technical claims below are backed by the transaction
inventory and verification report above.

**Product.** Civicord is an auditable public record of what political campaigns
published online: whether candidate URLs still respond, where they redirect and
what evidence changed. The TapeOut entry adds a versioned DeWEB publication
mirror for one bounded UK constituency cohort. The canonical public record is
unchanged; the mirror proves that a small evidence bundle, its methodology and
its caveats can be read and hash-checked without trusting the Civicord host.

**Target users.** Journalists, researchers/archivists, roster stewards and
civic-tech institutions. They need stable citations, precise caveats and
evidence they can independently inspect. The mirror is for verification and
continuity, not a privileged judge-only dataset.

**Acquisition.** Direct civic-tech and institutional outreach; election-driven
search; journalist/researcher use of citable candidate and constituency pages;
open datasets; reuse by Democracy Club/Campaign Lab/mySociety-adjacent networks.

**Revenue model.** Free public record. Institutions may pay for convenience:
monitoring, exports, alerts, hosted dashboards, high-volume API access and
new-jurisdiction deployment. No payment changes the underlying facts,
representation, ranking or correction history.

**Retention.** Monthly re-audits, stable IDs and citations, election-triggered
passes, longitudinal change history and correction provenance. A mirror matters
because citations must survive host failure and organisational change.

**TapeOut/X Layer components.** The evidence bundle is static content written
through TapeOut `SiteRegistry` proxy `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6`
on X Layer (chain id 196), under container
`0xB078da6de46795656187052322Dda3A7E249C288` for circuit #20 on OrderGuard
processor `0x57F319CF056F72F48cF1dbb670F2A3DB007Aa355`. The name
`20.2.272.tape` is bound through `DomainBinding` proxy
`0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9` for 120 months. Container-open
transaction: `0x2d104d591189bb877c526570b661f7dec1307d48555ae5e5cb3e40cfb327a8a9`;
binding transaction: `0xecd393daea10783c8ed05a79575b9dccfa8d39ec86aa7ddc344080256c64d878`.
The seven frozen file-publication transactions, fallback-setting transaction and
root-index convenience-copy transaction are inventoried in the repository. No
custom validation circuit is claimed.

**Existing vs new work.** Pre-existing: audit pipeline, data, static site,
ENS/Graph surfaces, MCP tooling and methodology. New inside the competition
window: versioned bundle schema/exporter, cohort export, X Layer publication,
chain/mirror verification UX, malformed-bundle rejection tests and this
documentation.

**Demo.** `[video]` shows a vanished/redirected campaign URL, the canonical
Civicord record, the DeWEB mirror, a direct-chain/hash verification and a
malformed bundle failing closed. Repository:
<https://github.com/sneldao/civicord>; mirror: `tape://20.2.272.tape` /
<https://20-2-272.tapekit.org/>; canonical cohort:
<https://civicord.pages.dev/constituencies/holborn-and-st-pancras>; direct-chain
verification report: `data/out/deweb/verification/audit-2026-09-07-export-2026-11-b078da6de4.json`.

## Execution plan and current status

This is a hard time-box. Today is 2026-11-25; the internal deadline is Dec 4.
Days 1–3 are complete: the cohort passed review, the exporter/verifier exist,
publication is live, direct-chain verification passes and the browser renders
both the root entry URL and canonical versioned URL. Day 4 is implemented
locally and build/browser verified, but still needs deployment before the
canonical public site links to the mirror. The remaining gates are deployment,
one external comprehension test, the demo video and submission. Do not add
scope. The concise evidence pack is [tapeout-submission.md](tapeout-submission.md).

### Day 1 — technical and cohort go/no-go

- Confirm the Holborn rows and manually inspect each outcome class.
- Confirm what text/excerpts may be redistributed; default to metadata, hashes
  and derived rows where uncertain.
- Re-run read-only chain checks and record block number, contract addresses,
  implementation slots and fee readings.
- Test whether a known X Layer DeWEB site can be opened in a clean browser
  profile and independently read through TapeKit/kernel, not only through the
  gateway.
- Inspect the available X Layer publisher path (`deweb-publish` or a minimal
  script written under our control). Dry-run only; no keys and no transactions.
- Decide go/no-go the same day.

### Day 2 — export format and local verification

- Implement the versioned manifest schema and a slim static export.
- Embed methodology, licences, source attribution and caveats in the bundle.
- Generate SHA-256 hashes for every file and a top-level manifest hash.
- Write a local verifier that fails closed on missing files, altered bytes,
  wrong schema versions and missing methodology/caveat material.

### Day 3 — publish the mirror

- Open or reuse an appropriate X Layer circuit container.
- Publish the bundle, preferably using a dry-run-first publisher with keystore
  or key-file signing. Never paste a raw private key into shell history.
- Bind the `tape://` name for the maximum practical period if the live fee is
  zero or trivially low; record the exact fee actually paid.
- Record transaction hashes, container, circuit/processor identifiers, chain
  block, bundle hash and gateway URL.

### Day 4 — compare/verify UX

- Add a small verification page or section: canonical Civicord record, mirror
  URL, manifest hash, schema/methodology versions, chain file metadata.
- Link it without demoting the normal user journey.
- Demonstrate malformed-bundle rejection locally and in the video.

### Day 5 — external comprehension test

- Ask one journalist, researcher or transparency-minded tester to inspect the
  mirror without a guided explanation.
- Capture what they trusted, what confused them, and what they would cite.
- Fix comprehension before adding more ecosystem surface area.

### Days 6–7 — video and submission evidence

- Record the 2:30 demo.
- Prepare paste-ready form answers: product, target users, acquisition,
  revenue, retention, TapeOut/X Layer components, contract addresses,
  transaction hashes, access links, pre-existing vs new work.
- Submit by Dec 4, then stop unless shortlisted.

## What not to build

- Do not migrate the canonical ENSv2 registry.
- Do not port all 2,375 records or upload the 34 MB full static site.
- Do not build a fake schema-validation circuit out of NAND gates.
- Do not claim a circuit verifies political truth.
- Do not hide `inconclusive_blocked`, redirect noise, surname-match weakness or
  claim-diff scope limits.
- Do not upload raw HTML, unreviewed screenshots, private queue data or keys.
- Do not create a parallel privileged dataset for judges.
- Do not turn the archive into a token, mining or yield pitch.
- Do not overwrite a cited mirror version in place.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| DeWEB/X Layer tooling is immature | Day 1 end-to-end spike; stop if clean-browser and direct-chain reads cannot be shown |
| Gateway works but independent verification is unclear | Lead with chain reads, hashes and TapeKit verification; describe the gateway as convenience |
| Only two effective independent X Layer RPC operators | State it plainly; allow/test custom RPC configuration; do not claim censorship resistance beyond the evidence |
| Contracts are upgradeable or ecosystem unaudited | Pin implementations, record them in the submission, and describe the mirror as a verifiable publication experiment rather than final archival infrastructure |
| Holder can alter the current directory | Append-only versioned publication policy, transaction-logged manifests, citation by fixed version path plus hash |
| Rules ambiguity around circuits/contracts | Rely on actual `SiteRegistry`/`DomainBinding` use and provide addresses/transactions; ask organisers only if time permits |
| Rights limits on campaign content | Metadata, hashes, derived rows and licensed extracted text only; no raw HTML |
| ENS/Sepolia canonical architecture confuses judges | Say explicitly: canonical registry unchanged; this is a mirror/export format |
| Commercial story sounds weak | Be specific about institutional monitoring, exports, alerts and jurisdiction deployment; admit free public reading is non-negotiable |
| Crypto association harms civic credibility | Lead with archival failure modes and verification; keep chain mechanics out of primary user copy |
| Opportunity cost | Do not start unless outreach emails are sent or explicitly deferred by the owner; stop after submission |

## Decision rule

Enter Civicord only if all are true by **Dec 2**. Status on 2026-11-25:

1. **Passed** — a meaningful versioned bundle is live on X Layer DeWEB.
2. **Passed** — the bundle embeds methodology, licences and caveat language
   without relying on the normal site.
3. **Passed** — a clean browser opened it, and the direct-chain verifier
   checked all seven frozen files, not merely one hash.
4. **Passed** — the local manifest verifier rejects malformed bundles.
5. **In progress** — the paste-ready answers exist, but the video and final
   submission have not yet been produced.
6. **Passed so far** — the exporter, publication planner and verifier are
   reusable evidence-export infrastructure; do not expand them into a
   competition-only product shell.
7. **Owner judgement still required** — the mirror must stop after submission
   unless shortlisted, and must not displace the primary MagicLens submission,
   outreach, take-the-pen, vantage close-out or NLnet.

The technical publication gamble has succeeded. That does not remove the
opportunity-cost gate: if the remaining video/submission work cannot be finished
without harming higher-priority work, keep the mirror as reusable infrastructure
and do not enter.
