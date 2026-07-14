# The Signalling Company — Project Notes

## Client
- **Company:** The Signalling Company (TSC)
- **Contact:** Romain Hourtiguet, Marketing Manager
- **Industry:** Rail technology (safety-critical ATP systems)
- **Website:** thesignallingcompany.com
- **Location:** Belgium

## Client contacts
- **Romain Hourtiguet** — Marketing Manager (day-to-day contact)
- **Alexandre Betis** — CEO (brand vision owner, final approver). Spelled "Betis" in client
  copy, not "Bétis".
- **Jarlath Lally** — Head of Sales & Marketing (author of the website content doc; "JL" in
  its margin notes)
- **Laurent Stukkens** — external IT, owns the DNS change

## Status
- **Phase:** Pre-launch. Site built on `tsc-v2.webflow.io`; DNS switchover scheduled
  Tue 14 July 2026, 10:00 CEST.
- **Date:** 2026-07-09
- Company facts now sourced from `research/text-content-for-website-v4.docx`. See
  `overview.md` for the canonical summary and its **Known discrepancies** table.

## Timeline

### 2026-05-14
- Received brief from Romain after fit-check exchange
- Wrote full custom proposal: 12-page Webflow site, design + development
- Original pricing: Design €5,760 + Development €10,800 = €16,560
- Bumped to Design €7,500 + Development €13,500 = €21,000
- Proposal published at wdmorley.com/project-proposals/the-signalling-company-website (pw: design)
- Synced to Notion (Notes DB + Clients DB)

### 2026-05-18
- Romain replied: budget gap, wants template-based approach not custom
- Referenced "from €5k" on Will's Webflow profile as their expectation
- Their process: pick template → add branding/content → fine-tune
- Drafted counter-proposal: template-based, €6,000, 3 weeks
- Reply saved in comms/reply-template-scope-2026-05-18.md
- Not yet sent

## Proposal versions
- `proposals/proposal-2026-05-14.md` — source of truth (custom build, €21k)
- `proposals/proposal-webflow.html` — Webflow-pasteable version with div-based tables
- `proposals/proposal-embeds.html` — legacy table embeds
- `comms/reply-template-scope-2026-05-18.md` — template-based counter (€6k)

## Key decisions
- Odoo CRM integration: out of scope for any phase
- VAT: reverse charge (intra-community B2B, NL → Belgium)
- AEO dropped from template scope
- Custom design phase dropped from template scope

## Brand identity (from CEO moodboard + brainstorm, Oct 2025)

Alex Betis did a brand identity exercise with Romain. Key metaphors:

- **Colour:** "Not one but many" — United Colours of Benetton. Diversity, unity, strength.
- **Historic figure:** Général Leclerc — fighting with limited resources, creative, rule-breaking.
- **Quote:** "The Man in the Arena" (Theodore Roosevelt) — core philosophy.
- **Plant:** Oak — ancient but robust. "We manipulate things invented 2 centuries ago."
- **Landscape:** Himalayas — the "death zone" analogy from hardest product dev phase.
- **Building:** Fallingwater (Frank Lloyd Wright).
- **Food:** Pizza — convivial, diverse, excellent on a plain apron.
- **Painting:** Medley of colours — people from everywhere contributing.
- **3 flaws:** Too naive, over-intellectualise, arrogant.
- **3 qualities:** Passionate, quick to decide/act, serious despite "looney side."

## Company values (from internal Values presentation)

1. **Think Strategically** — visualise winning, anticipate, take calculated risks, take initiative
2. **Care** — safety first ("we entrust children's lives to our systems"), people, products, customers, the world
3. **Collaborate** — no ego, break silos, "addicted to action", collectively own success and failure
4. **Act Rationally** — scientific method, never out of habit, discipline, challenge status quo

Tagline: "Driven by these values to deliver critical value to our clients, as well as create an inspiring and wholesome workplace."

## Marketing strategy notes (from internal PDF)

- Position: safety-critical rail signalling (ATP/ETCS systems)
- Target audiences: rail operators, infrastructure managers, rolling stock OEMs
- Differentiator: innovation + safety heritage — young company, deep roots
- Website is a key marketing channel in their strategy
- Content themes: product capabilities, customer case studies, thought leadership
- CRM: Odoo (want lead capture but integration out of scope for now)

## Open questions

### To confirm with Romain
- **Founder wording.** The content doc calls Pinte the founder and Betis "employee number
  one and CTO". The live About page calls them both "Founders". Which is right? The About
  page copy needs changing either way.
- **Headcount.** Doc says "50+ train-blazers"; an earlier note here said ~100. Where did
  ~100 come from?
- **Collective expertise.** The About section says ">250 years"; the Akiem quote on the
  same page says "200+ years". Pick one.

### Before launch (14 July)
- `/products/wstm` 404s but is linked from the Products page and specified as Product 6 in
  the content doc. CMS item needs creating.
- All 28 RailOS app and device CMS pages share one `<title>` ("The Signalling Company").
  The template's title tag is not bound to the item name.
- `llms.txt` written and verified (`projects/the-signalling-company/llms.txt`). Not yet
  served — Webflow can't host a raw `.txt` at root, so it needs a page plus redirect, which
  returns `text/html` rather than `text/plain`.
- Open RailOS ADK pricing (€95k / €42k subscriptions, 18% store commission) sits in the
  content doc but is not on the site. Confirm whether it is meant to be public.

### Resolved (pre-build, kept for context)
Budget, scope, branding readiness, copy availability, photography, and design sign-off were
all open before the build. They were settled through the 28 May meeting and the June content
rounds — see `comms/` and `research/full-review-2026-06-18.md` for how. The values and
moodboard did prove useful relationship material, as hoped.
