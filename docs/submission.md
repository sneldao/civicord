# ETHOnline 2026 submission record

What was submitted, and the rule confirmations it implies. Source of truth is
the ETHGlobal submission form; this file is the repo-side record.

## Submitted

- **Project:** civicord · Data/Analytics · 🏛️
- **Demo:** https://civicord.pages.dev · video:
  [Loom](https://www.loom.com/share/05347c30a5784d45abe9b9256509bff9)
- **Repo:** github.com/sneldao/civicord (public, primary, monorepo)
- **Prize applications (max 3):** The Graph ($15k), ENS ($5k), Bazantic ($3k)
- **Per-prize evidence links:** `scripts/publish/eac_demo.py` (ENS),
  `subgraph/src/mapping.ts` (Graph), `gateway/recipe.md` (Bazantic)
- **Description + how-it's-made:** as pasted into the form (honest claims only —
  "responding" not "surviving", `p{id}.civicord.eth` flat subnames, no on-chain
  content hashes claimed).

## Rule confirmations made on the form

| Confirmation | How Civicord satisfies it |
|---|---|
| Project started from scratch at event kick-off | First commit `Sept 7, 2026`; granular history throughout the event |
| Git version control + frequent commits | Public repo history from day 1; no single-commit bulk dumps |
| Open source | Repo public from first commit |
| **Not submitted to another hackathon** | This project must not be entered into any other hackathon — flag any future reuse idea against this confirmation |
| Work built entirely during the event | All code written during the event window. Pre-existing *inputs* are public data, not project code: Campaign Lab's April 2025 scrape, Democracy Club person IDs, ONS boundary data + Automatic Knowledge hex geometry (OGL-licensed, disclosed). Vendored `js-sha3` (MIT) is a library, not project-specific work |
| Abide by event rules & CoC | Acknowledged |

## Judging mechanics worth remembering

- Projects stay **editable until the submission deadline**; details above are
  what was submitted.
- Live Judging (round 2) shortlists from round 1 on: video quality, live demo
  quality, proper git history.
- Stake return condition: submitted before the deadline (done).
- Media/CoC text is standard ETHGlobal boilerplate — nothing project-specific.

## If a judge inspects

- **Deployment compliance:** records live on the *dedicated ETHOnline ENSv2
  deployment* (UserRegistry `0x097b…1428`, PermissionedResolver `0xa907…d630`),
  resolvable via the hackathon Universal Resolver / ENS App. Beta-era state is
  documented as superseded in [onchain-plan.md](onchain-plan.md).
- **EAC scope honesty:** `grantSetterRoles` grants are key-scoped but
  resolver-wide — disclosed in [ens-claim-path.md](ens-claim-path.md).
- **Registration coverage:** the blast is gas-budgeted and resumable; chips on
  the site reflect records actually on the hackathon deployment, synced via
  `rebuild_manifest_from_graph.py` against subgraph v0.0.5.
