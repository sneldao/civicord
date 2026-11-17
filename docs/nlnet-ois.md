# NLnet — Open Internet Stack (Restack) — working draft

Status: draft, written 2026-11-16. Deadline **3 Jan 2027, 12:00 CET**
(calls recur every odd month — missing this one costs a re-application,
not the opportunity). Submit at <https://nlnet.nl/propose/>.

Call: <https://nlnet.nl/restack/> · Guide for Applicants, eligibility and
FAQ linked from there. **Read all three before submitting** — this file is
the content draft, not a substitute.

## Read these first — three eligibility landmines

1. **"AI-related projects are not within scope"** — the Restack page says
   it outright (except GenAI systems already at >1M human users). Our
   agent surfaces (MCP, x402 gateway, agent skills, Anna) must NOT be the
   pitch. The fundable project is the *audit pipeline, longitudinal
   record, and claim flow* — civic data commons, deterministic by design.
   If the proposal leads with "infrastructure for agents," expect a
   desk-reject. Decide deliberately what role the agent surfaces play in
   the application (honest answer: downstream consumers of an open
   dataset, mentioned if at all as interoperability, not as deliverables).
2. **European Dimension criterium** — dedicated page; we are a UK project.
   The France second-jurisdiction work (france-2027.md) is the strongest
   answer we have; name it explicitly.
3. **Generative AI policy** (updated 20 Oct 2026) — covers the
   application text itself *and* project development. Read it before
   submitting and comply with whatever disclosure it requires.

## The ask

**One-line:** *Civicord — open, longitudinal infrastructure for the
public record of election campaigns' own websites: recurring liveness
audits, transparent change tracking, and a claim/correction flow, all
published as CC-BY open data.*

**Framing for Restack (deliver/mature/scale *operational internet
commons*):** election information is a "stable public sphere" dependency
currently served by proprietary, ephemeral sources. Civicord is a working
commons — already operational, already publishing — that needs the
maturity work the fund exists to pay for: reliable measurement vantage,
a governed correction channel, and proof it generalises beyond one
country.

## Work package (proposal skeleton)

Follows the NLnet form's usual shape: context, what exists, concrete
tasks, budget, sustainability. Every task must end as AGPL code or CC-BY
data — already true.

**WP1 — Audit vantage & methodology transparency.** Two-stage liveness
audits (CI vantage → selective residential re-check of inconclusive rows)
hardened into a documented, reproducible procedure; published methodology
page; honest classification (blocked ≠ dead). *Mostly done 2026-11-16 —
the grant pays for hardening, docs, and a second vantage provider.*

**WP2 — Claim & correction channel.** Public, inspectable queue;
maintainer decisions logged openly; ENSv2 delegated write path so a
verified claimant (or steward) can update their own record without
trusting us. *Decision endpoint + grant tooling shipped 2026-11-16;
grant covers production hardening, identity/verification design, and
docs for roster stewards.*

**WP3 — Election exercise (May 2027 UK local).** Full
candidate→representative pass as a worked demonstration the pipeline is
roster-agnostic: roster spike (Mar), baseline audit (Apr), post-election
pass + transition analysis (May–Jun). Concrete deadline inside the grant
period.

**WP4 — Second jurisdiction (France).** The region-agnostic claim made
real: roster from ministère de l'Intérieur / data.gouv.fr sources,
professions-de-foi corpus, circonscription model. Presidential ~Apr 2027
gives a small, real deployment inside the grant window.

**Rough budget ask:** €15–25k over ~9–12 months, mostly maintainer time
at cost-recovery rates + residential-proxy infrastructure costs. (Decide
the number after scoping person-days; NLnet pays real effort, not
commercial rates.)

## Open decisions before writing the actual form

- **Applicant:** individual vs through Campaign Lab (institutional
  weight vs their overhead/readiness — Campaign Lab already signalled
  interest in being a home; an application is a cheap way to test that).
- **Sustainability answer:** the institutional-home succession plan in
  personas.md §Governance — name the candidates (Democracy Club, UK Web
  Archive, EDGI, mySociety) and that outreach is underway.
- **2–3 comparable funded proposals:** read NGI Zero Commons/Core
  project pages for calibration before writing final answers.
- **Office Hour** — next is 25 Nov 2026, "Ask us Anything". Attending
  and asking about the AI-scope boundary and the UK European-dimension
  question costs nothing and de-risks the application.

## Submission checklist

- [ ] Answer the form's project questions from this draft
- [ ] Confirm licence statements (AGPL-3.0 code, CC-BY data)
- [ ] Write the European-dimension paragraph (UK + France jurisdiction)
- [ ] Scrub any framing that reads as "AI project"; agent surfaces = data
      consumers at most
- [ ] Comply with the GenAI policy disclosure for how this draft was made
- [ ] Budget table: person-days per WP + infrastructure line
- [ ] Submit before **3 Jan 2027, 12:00 CET**; next call 3 Mar if missed
