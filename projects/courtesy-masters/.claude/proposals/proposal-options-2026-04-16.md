# Proposal Options — CourtesyMasters

**Date:** 2026-04-16
**Prepared for:** Menno-Paul Dekker (CourtesyMasters)
**Status:** Draft v2
**Currency:** EUR

---

## Context

Following the site intake audit (`reports/intake-report-2026-04-15.md`) and the client's 2026-04-11 change list, the CourtesyMasters website has three clear workstreams:

1. **De-risk** — migrate custom code off Egenix's GitHub, fix duplicate Lenis and GSAP version mismatch, remove dead code
2. **Remediate** — targeted technical clean-up (3 insights H1, 27 long titles, 28 broken external links, hreflang conflict), schema expansion (JobPosting 19 jobs, FAQPage 30 FAQs, Article/Person/Organization/BreadcrumbList), asset optimisation (PNGs = 80% of bandwidth), WCAG AA contrast + a11y items
3. **Grow** — content strategy, AEO remediation (site is currently L1/Invisible to AI search), competitor gap analysis, international SEO review

This document presents **three proposal options** ranging from a targeted critical-fix engagement to a full remediation + ongoing retainer. All three assume you want to keep the existing Webflow build — none involve a rebuild.

---

## Option 1 — Critical Remediation (one-off)

> **Stop the bleeding.** Fix the risks that are actively damaging the site and set a clean foundation. No growth work. No content programme.

### Goals

- Remove the Egenix GitHub dependency (critical business risk)
- Fix the SEO gaps that are costing organic visibility today
- Meet WCAG 2.1 Level A minimum (legal exposure in EU/NL)
- Cut site bandwidth by ~55-60% via image optimisation
- Deliver a clean handover document so any future developer can pick up the site

### Scope

Covers **P0 + P1** from the main report's priority bands, plus Schema Essentials from P2 and Asset Optimisation from P3. Justification tags: **SEO** / **AEO** / **Perf** / **De-risk** / **Trust** / **A11y** / **Conv** / **Ops**.

| Workstream | Deliverable | Justification | Report ref |
|------------|-------------|---------------|------------|
| **Easy-win sprint (P0)** | Unpublish 7 dev/test pages, disable 7-9 thin template pages, fix 2 CMS collection typos, fix hreflang typo on `/jobs?tab=succesfully-closed-jobs`, fix 3 insights-post H1 duplicates, file Webflow Support ticket to remove partnercode (client item 22), add aria-labels to 5 icon-only links, shorten 27 long page titles, clean up 28 pages with broken external links, Cookiebot contrast + pricing sanity check | **SEO** / **Trust** / **A11y** / **De-risk** | Tasks #1–11 (#9 resolved 2026-04-16) |
| **Custom code migration (P1)** | New `courtesymasters/cm-webflow` GitHub repo; Egenix JS audited and moved; duplicate Lenis removed; GSAP/ScrollTrigger aligned on 3.12.5; dead code removed | **De-risk** (CRITICAL) / **Perf** | Tasks #12–14 |
| **Core schema (P1 + P2)** | Full Organization schema site-wide (replacing the Webflow-default Product snippet); JobPosting schema on remaining 19 jobs; BreadcrumbList in static HTML | **SEO** / **AEO** | Tasks #15, 16, 21 |
| **Accessibility** | Body text colour contrast (demo 2-3 values on staging, client selects a passing value ~`#3A3A3A` to `#404040` per client item 1c); spot-check alt-text quality on 20 key images | **A11y** / **Trust** | Task #25 |
| **Asset optimisation** | Top 20 worst PNGs converted to WebP/AVIF, fonts converted to WOFF2, `/for-employers` hero LCP fix | **Perf** / **SEO** / **AEO** | Task #27 |
| **Handover** | Updated `client.md` with deploy workflow, changelog setup, 1-hour walkthrough call | **Ops** | — |

### Out of scope (Option 1)

- FAQ/Article/Person schema
- Content writing or copy review
- AEO remediation beyond L1→L2 (no answer-first restructuring)
- Multilingual audit of non-NL locales
- Zapier / Powerpath CRM / MS365 integration work
- AI agent setup
- Footer redesign or typography rework (client change-list items)

### Timeline

~4-5 weeks from kickoff to completion.

| Week | Focus |
|------|-------|
| 1 | Code migration phase 1-3 (audit, repo setup, CDN switch on staging) |
| 2 | Staging verification + asset optimisation phase 1 |
| 3 | SEO foundation (meta/OG, schema, alt text, heading hierarchy) |
| 4 | Accessibility pass + CMS hygiene + WCAG verification |
| 5 | Production deploy, 48h monitoring, handover + documentation |

### Investment

| Line | Indicative range |
|------|------------------|
| Custom code migration | €___–___ |
| SEO foundation + schema | €___–___ |
| Accessibility + CMS hygiene | €___–___ |
| Asset optimisation | €___–___ |
| Handover + documentation | €___–___ |
| **Total (fixed fee)** | **€___–___** |

*Pricing to confirm based on day-rate and preferred engagement model (fixed fee vs time-and-materials).*

---

## Option 2 — Full Remediation + Growth Setup (one-off, recommended)

> **Everything in Option 1, plus the infrastructure for organic growth.** Get the site from "invisible to AI search" to "competitive" and hand over content + SEO workflows the client can run themselves.

### Additional scope (on top of Option 1)

Covers **P2 (full)**, **P3**, and the AEO / Person-schema / competitive / international portions of **P4**.

| Workstream | Deliverable | Justification | Report ref |
|------------|-------------|---------------|------------|
| **Kick-ass footer** | Brief + 2 design directions (Figma) + build (client item 7, highest urgency signal) | **Trust** / **Conv** | Task #17 |
| **URL structure rewrite** | `/insights/` split into `/insights/news/`, `/insights/blog/`, `/insights/video/`; 301 redirect map; Search Console re-submission; Yoast-style permalink baseline (client item 6) | **SEO** / **Trust** / **AEO** | Task #18 |
| **Complete schema coverage** | FAQPage schema on 30 FAQs, Article schema on 16+ insights + 3+ case studies, Person schema on 16 team bios | **SEO** / **AEO** | Tasks #19, 20, 41 |
| **Padding + background consistency pass** | Design-token audit, sitewide spacing scale, 5 top-priority pages pixel-reviewed (client items 3 + 4 — "pixelperfect!!!") | **Trust** / **Perf** | Tasks #22, 23 |
| **Editorial foundation (P3)** | Typography standards — center column, 1.5 line-height, no word-break, left-align, bullet styling (client items 1a, 1b, 1d, 1e, 1f, 1j); form simplification + RTE / copy-paste fixes (1g, 1h, 1i); body text colour (1c, 75-85% grey to pass WCAG AA) | **A11y** / **Trust** / **Conv** | Tasks #24, 25, 26 |
| **Documentation + handover** | CSS hierarchy "how to" (client item 2); architecture / eco-system diagram + walkthrough video (item 8); CMS manuals per template — CMS, Blog, News, Job, Page, Case Study (items 9a-f) | **Ops** / **Trust** | Tasks #28, 29, 30 |
| **Zapier → Power Automate migration** | Native-to-MS365 form email routing, no third-party hop (client item 11 — pending direction confirmation) | **De-risk** / **Conv** | Task #31 |
| **Webflow plan consolidation** | Audit workspace + site billing, recommend cleanest structure (client item 21 — pending billing access) | **Ops** | Task #32 |
| **AEO remediation (L1 → L3)** | Restructure FAQs as answer-first; author bylines + dates + updated timestamps; internal linking framework; 3 original data-backed pieces | **AEO** / **SEO** | Task #40 |
| **Competitive gap analysis** | Deep-dive on the pure-play recruiter cohort (`mjpeople.nl`, `independenthospitality.nl`, `thehospitalityrecruiters.com`). Transferable landing-page pattern analysis | **SEO** / **Conv** | Task #42 |
| **International SEO review** | Audit of all 5 non-NL locales for depth vs thin translations; hreflang verification; recommendations per locale | **SEO** / **Trust** | Task #43 |
| **Content voice pass** | Brand voice consistency review (`/copy-review`) across all 88 pages against `brand-voice.md` | **Trust** | (part of task #30) |
| **Asset optimisation (full)** | Sitewide image + font pipeline (PNG → WebP/AVIF, WOFF2 fonts, `/for-employers` LCP fix) | **Perf** / **SEO** / **AEO** | Task #27 |
| **Analytics hardening** | Consolidate Google Ads into GTM, verify Search Console access, set up Core Web Vitals monitoring | **SEO** / **Ops** | — |
| **AI-bot blocking alignment** | Review `llms.txt` + robots.txt + "Blocked AI search bots" to ensure alignment with client's AEO goals | **AEO** | Task #45 |

### Out of scope (Option 2)

- Zapier / Powerpath CRM / MS365 integration rebuild (investigation only; separate workstream)
- AI agent setup (HITL required per client; separate workstream)
- Footer redesign, typography rework (client change-list items — included in Option 3 retainer)
- New page builds or Figma design work
- Content writing beyond the 3 original pieces

### Timeline

~8-10 weeks from kickoff.

| Phase | Duration | Focus |
|-------|----------|-------|
| 1 | Weeks 1-4 | Everything in Option 1 |
| 2 | Weeks 5-6 | Full schema + AEO restructure + content voice pass |
| 3 | Weeks 7-8 | Competitive analysis + international SEO + analytics |
| 4 | Weeks 9-10 | 3 original data pieces, performance pass, final handover |

### Investment

| Line | Indicative range |
|------|------------------|
| Everything in Option 1 | €___–___ |
| Schema expansion + AEO | €___–___ |
| Content voice pass + 3 original pieces | €___–___ |
| Competitive + international SEO | €___–___ |
| Forms + analytics | €___–___ |
| **Total (fixed fee)** | **€___–___** |

---

## Option 3 — Remediation + Ongoing Retainer (recommended for long-term)

> **Option 2 plus a monthly retainer.** Iterative improvements, content updates, SEO monitoring, and a dedicated slot for the client's 23-item change list to be addressed over time.

### Structure

1. **Phase 0 — Remediation.** Execute Option 2 in full (8-10 weeks, fixed fee).
2. **Phase 1 — Retainer.** Monthly retainer starting on go-live of Phase 0.

### Retainer scope (monthly)

Delivers **P4 (Grow)** from the main report — funnels, AI agents, international, content programme — plus ongoing monitoring and change-list throughput.

| Area | Typical split | Report ref |
|------|---------------|------------|
| **Funnel + CRM work** | 25% — candidate + employer funnel map-outs, Powerpath/Dynamics/MS365 automation (client items 15, 16) | Tasks #34, 35 |
| **Content publishing + voice** | 20% — schema-tagged insights, job listings, case studies, team updates. Ties to client item 10 ("growth engine") | Tasks #33, 44 |
| **AI agents (HITL)** | 15% — periodic SEO/GEO checks (item 18), content creation/publish/structure (item 19), text-check/brand-voice agent (item 20). Klaviyo investigation (item 12) if in scope | Tasks #36, 37, 38, 39 |
| **SEO + AEO monitoring** | 15% — keyword tracking, Core Web Vitals, Search Console issues, schema validation, AI-citation monitoring | — |
| **Technical maintenance** | 10% — Webflow updates, GSAP version updates, dependency hygiene, broken-link checks | — |
| **Change list throughput** | 10% — remaining items from the 2026-04-11 list, prioritised by client | — |
| **Strategic calls** | 5% — monthly review call, roadmap updates, competitive monitoring | — |

Unused hours roll over 1 month. Work above the monthly allocation is billed at day rate.

### Retainer tiers

| Tier | Hours/month | Ideal for |
|------|-------------|-----------|
| Light | 8 hrs | Maintenance only |
| Standard | 16 hrs | Balanced mix — recommended |
| Growth | 32 hrs | Active content + SEO push, CRM work |

### Minimum term

6 months, then month-to-month with 30 days' notice.

### Investment

| Line | Indicative range |
|------|------------------|
| Phase 0 — Remediation (fixed fee) | €___–___ |
| Phase 1 — Retainer (monthly, Standard tier) | €___/month |
| Phase 1 — Retainer (monthly, Growth tier) | €___/month |

---

## Comparison

Mapped to the main report's priority bands (**P0–P5**):

| Item | Option 1 | Option 2 | Option 3 |
|------|----------|----------|----------|
| **P0 — easy-win sprint (tasks #1–11)** | ✓ | ✓ | ✓ |
| **P1 — Egenix migration + core schema (#12–16)** | ✓ | ✓ | ✓ |
| **P2 — footer, URL structure, rich-result schema, padding (#17–23)** | Schema only | ✓ | ✓ |
| **P3 — editorial foundation + CMS manuals + Zapier + plans (#24–32)** | — | ✓ | ✓ |
| **P4 — funnels, AI agents, international, content (#33–45)** | — | Partial (AEO, competitive, international, Person schema) | ✓ (full + ongoing) |
| Timeline | 4-5 weeks | 8-10 weeks | 8-10 weeks + ongoing |
| Investment | €__-__ | €__-__ | €__-__ + €__/mo |

---

## Explicitly out of scope (all options)

- Full site rebuild or redesign (current site is kept; we fix what exists)
- **`esiglobal.com` (ESI Global, sister company) — separate SOW.** Client confirmed 2026-04-16 that the same programme should be applied to ESI. Will be scoped and priced as its own engagement with a dedicated intake; not bundled into these CM options.
- Cookiebot replacement decision (client is still deciding — can be addressed under Option 3 retainer when decided)
- Any work requiring access to client's GitHub, MS365 tenant, Dynamics 365, or Zapier account until credentials are provisioned
- Translation of net-new content into the 5 non-NL locales (audit only; translation work quoted separately)

---

## Assumptions

- Client provides timely access to: Webflow Designer (editor role minimum), GitHub org creation, GTM, Search Console (once access is confirmed), Zapier, Powerpath/Dynamics 365 (Option 3 only)
- Client or their PA is available for weekly 30-minute check-ins
- Day-to-day sign-off with Menno-Paul Dekker; strategic / commercial decisions copy Fons Bitter (Founder) per his note on confidentiality
- HITL required on all AI agent work (per client brief)
- Work is performed outside Egenix's involvement (professional courtesy notification only)

---

## Requirements from client before kickoff

### Access & assets

- [ ] Confirm preferred option (1, 2, or 3)
- [ ] Confirm currency + preferred payment method
- [ ] Provision Webflow Designer access (Editor role on staging-cm workspace)
- [ ] **Webflow Billing admin access** (needed to audit workspace + site plans — client item 21)
- [ ] Confirm GitHub org creation (`courtesymasters` or similar)
- [ ] Confirm Google Search Console access (currently unverified)
- [ ] Provide brand assets (logo high-res, brand guidelines if any, OG image masters)
- [ ] Confirm main point of contact for approval (founder or delegated)

### Five clarifications that block full scope lock

Draft Slack + email at `comms/client-clarifications-2026-04-16.md`.

| # | Client item | Question | Blocks |
|---|-------------|----------|--------|
| 1 | **1c** (text not black, max 80%) | Current `#909090` fails WCAG AA. Recommend demoing 2-3 values on staging (~`#3A3A3A` to `#404040`) and letting the client pick. | P3 task #25 |
| 2 | **11** (Zapier) | (A) Harden Zapier / (B) replace with Power Automate (recommended) / (C) custom serverless. Which? | P3 task #31 |
| 3 | **12** (Klaviyo) | Moving from Zapier → Klaviyo, or adding Klaviyo alongside for email marketing? | P4 task #39 |
| 4 | **14** (Cookiekot) | Keep + fix contrast / replace with Cookiebot / reduce cookies and drop banner? | P0 task #11 |
| 5 | **21** (Webflow double structure) | Billing access required to audit workspace + site plans. | P3 task #32 |

---

## Payment schedule

### Options 1 & 2 (fixed fee)

| Milestone | % | When |
|-----------|---|------|
| Deposit | 30% | On signing |
| Mid-project checkpoint | 40% | Midpoint review (Week 2-3 for Option 1; Week 5 for Option 2) |
| Final | 30% | Production deploy + handover call |

### Option 3

- Phase 0: same as Option 2 above
- Phase 1 retainer: invoiced on the 1st of each month, payable within 14 days

---

## Next steps

1. Review this proposal
2. Flag any questions, scope adjustments, or preferred option
3. Confirm pricing + kickoff date
4. Sign off and pay deposit to begin

---

*Drafted based on findings in `reports/intake-report-2026-04-15.md`, the client's change list at `client-requests/change-list-2026-04-11.md`, and sub-audits in `.claude/audits/`. Programme philosophy: `proposals/narrative-2026-04-16.md`. Pricing ranges to be finalised with client based on day-rate preference and scope confirmation.*
