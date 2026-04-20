# NEM Life — Client Workspace

Intake & proposal workspace for taking over the NEM Life Webflow build (30 % complete, handed off from previous developer).

## Contents

- **`briefing.md`** — verbatim-ish extract of the client's Notion briefing (captured 2026-04-16 via Chrome DevTools because the Notion public API was down and the page is a JS SPA)
- **`takeover-plan.md`** — 5-phase scoped plan with hours, pricing (€3,240), risks, opportunities, and engagement structure
- **`slack-message.md`** — short client-facing summary, formatted for Slack
- **`audit/screenshots/`** — full-page screenshots of every audited page (desktop + mobile) from `nem-life-1.webflow.io`

## Key facts

- **Client contact:** Alex Reus (husband of Christel, founder of NEM Life — Dutch psychology brand)
- **Brand principal:** Christel Reus
- **Staging:** [nem-life-1.webflow.io](https://nem-life-1.webflow.io)
- **Live (old):** nemlife.com — Webflow site `NEMLife.com TEMP`, needs 301 migration
- **Figma:** file `8jRJkSvjuMQzYkA1gXc646` + PNG exports in `designs/`
- **Budget indicated:** €2,000 – €5,000
- **Quote:** **€3,240 fixed** (27 hours at €120/hr) — confirmed by Alex 2026-04-20
- **Out of scope:** Doe de zelftest (Phase 2 — Alex has dedicated brief), quiz block in Blog Item, Therapy/Couples therapy service pages (Alex building himself)
- **Proposed delivery:** 2–3 weeks from deposit to launch
- **Rate:** €120/hr (per house `rate-card.md`)
- **Ongoing care options:** Insights €120/mo · Care €480/mo (recommended) · Grow €960/mo

## Handover sensitivity

Previous developer was unreliable and hard to contact. Client is looking for someone calm, structured, and communicative. Proposal emphasises:
- Daily Slack check-ins
- Loom walkthroughs at every decision point
- No custom code unless strictly necessary (per brief)
- Client-First class methodology (inherited convention)
- Fixed scope + explicit "won't do" list to prevent scope creep in both directions

## Webflow MCP context

- Site ID: `69bfba56f3622791a798b816` (NEMLife.com NEW, shortName `nem-life-1`)
- Sibling site: `687204088df2ae8cbea5eb5f` (NEMLife.com TEMP — live on nemlife.com)
- 14 pages (2 drafts: Blank Page for Texts, System Elements)
- 4 CMS collections: Insights, Insights categories, Testimonials, Testimonials Categories
- 43 components registered
- Locales: NL primary + EN secondary, both currently disabled (contradicts briefing — flag at kickoff)

## Next actions (once client signs)

1. Kickoff call — resolve remaining open questions (newsletter provider, Share & Care scope)
2. Get Figma + Webflow collaborator + Notion + Slack access
3. Request final copy & asset drive
4. Deposit 50 % → start Phase 1
5. Bootstrap project inside the monorepo via `/bootstrap` once under contract
