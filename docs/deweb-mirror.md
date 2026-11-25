# Civicord DeWEB mirror — public verification guide

> Audience: judges, journalists, researchers, archivists and Civicord users.
> This is the external-facing guide to the Holborn and St Pancras evidence
> mirror. Internal operating details are in
> [tapeout-operations.md](tapeout-operations.md).

## What this is

Civicord's canonical public record remains the ordinary Civicord site. For the
TapeOut Accelerate entry, one bounded cohort — seven candidates in Holborn and
St Pancras — was exported as a small, versioned evidence bundle and published
to X Layer DeWEB.

The mirror is a **continuity and verification surface**. It lets a reader inspect
the exact exported bytes, methodology, caveats, source list and hashes without
trusting the normal Civicord host. It is not a second source of truth, not a
live re-audit, and not evidence that a campaign intended anything improper.

## Quick links

| Item | Link / value |
|---|---|
| Mirror root | <https://20-2-272.tapekit.org/> |
| Fixed versioned exhibit | <https://20-2-272.tapekit.org/civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/index.html> |
| Verification page in the bundle | <https://20-2-272.tapekit.org/civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/verify.html> |
| Manifest | <https://20-2-272.tapekit.org/civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11/manifest.json> |
| Canonical cohort page | <https://civicord.pages.dev/constituencies/holborn-and-st-pancras> |
| Repository | <https://github.com/sneldao/civicord> |
| Tape name | `tape://20.2.272.tape` |
| Bundle version | `audit-2026-09-07-export-2026-11` |
| Manifest SHA-256 | `2993bbce8d018be26a1664abcb586f5b034cbb6fd7732c4a17e056e877465901` |
| Container | `0xB078da6de46795656187052322Dda3A7E249C288` |
| Verification pinned block | `76865195` |

## What the bundle contains

The frozen bundle has seven files and 30,258 bytes:

| File | Purpose |
|---|---|
| `index.html` | Human-readable seven-candidate exhibit |
| `manifest.json` | File list, sizes, SHA-256 hashes and bundle metadata |
| `methodology.md` | How Civicord audits and labels URL states |
| `caveats.md` | Interpretation limits, including blocked/redirected/gone distinctions |
| `candidates.json` | Bounded structured cohort records |
| `sources.json` | Source and provenance references |
| `verify.html` | Verification instructions bundled with the evidence |

The bundle deliberately omits bulk claim diffs because their scope caveats need
further review. It does not include raw third-party HTML archives.

## How to read it

Start at the mirror root for the latest convenience copy. For citation or
scrutiny, use the fixed versioned exhibit URL and record the manifest SHA-256.
The root `index.html` is currently an exact byte copy of the versioned
`index.html`, but the root is a convenience path and may be updated when a newer
evidence version is published.

The gateway is only a reading convenience. It is not the trust root.

## How to verify it yourself

From a clone of the public repository:

```bash
git clone https://github.com/sneldao/civicord.git
cd civicord
```

Verify the frozen local bundle structure and hashes:

```bash
python3 scripts/tapeout/evidence_bundle.py verify \
  data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11 \
  --self-test
```

Verify the bytes published on X Layer directly, without using the gateway as
evidence. This requires the Foundry `cast` CLI because the verifier performs
`eth_call` reads. Foundry installation instructions are at
<https://github.com/foundry-rs/foundry>.

```bash
python3 scripts/tapeout/verify_deweb.py \
  data/out/deweb/holborn-and-st-pancras/audit-2026-09-07-export-2026-11 \
  --container 0xB078da6de46795656187052322Dda3A7E249C288 \
  --prefix civicord/uk-2024-25/holborn-and-st-pancras/audit-2026-09-07-export-2026-11
```

The verification report generated after publication is retained at
`data/out/deweb/verification/audit-2026-09-07-export-2026-11-b078da6de4.json`.
At pinned block `76865195`, two RPC endpoints agreed on chain id, height,
SiteRegistry implementation and file reads; all seven files matched the frozen
local bytes by size and SHA-256.

## How to interpret the proof

This verification shows that specific bytes were readable from X Layer state at
a pinned block and matched the frozen local bundle. It does **not** show that:

- the political interpretation is true;
- a campaign acted intentionally;
- the mirror is impossible to change;
- the gateway is trustworthy;
- X Layer has a large independent public-RPC set.

The container holder can technically write to paths in the container. Civicord's
publication policy is therefore append-only by version: new evidence receives a
new versioned path, while only the unversioned convenience copy is updated.
That policy is operational, not enforced by the chain. Readers should cite the
versioned URL plus manifest hash and can inspect transaction history if they
need to investigate later writes.

X Layer's public RPC-operator set is thin. The two-endpoint check is evidence
of consistent chain-state reads, not a claim of perfect censorship resistance
or permanence.

## Suggested citation

> Civicord, “Holborn and St Pancras — UK 2024–25 campaign-web evidence bundle”,
> version `audit-2026-09-07-export-2026-11`, X Layer DeWEB mirror
> `tape://20.2.272.tape`, manifest SHA-256
> `2993bbce8d018be26a1664abcb586f5b034cbb6fd7732c4a17e056e877465901`.

## Corrections and questions

Civicord records are audit observations, not final determinations. Corrections,
source questions and methodology issues can be raised through the public
repository: <https://github.com/sneldao/civicord/issues>.
