# Plan + options — Notion draft

**Date:** 2026-04-16
**To:** Menno-Paul Dekker (CourtesyMasters) — Fons Bitter (Founder) in copy
**From:** Will
**Rate basis:** €120/hour
**Source:** `reports/intake-report-2026-04-15.md` · `comms/plan-and-options-slack-2026-04-16.md` · `comms/plan-and-options-email-2026-04-16.md`

---

## How to use this file

Paste everything below the `---` line straight into a Notion page. Notion preserves H1/H2/H3 headings, bold, bullets, tables, and inline code on paste. After paste, polish in-app:

1. Convert the **Phase 0 total** paragraph to a blue callout (`/callout` → blue)
2. Convert the **retainer tiers** paragraph to a green callout
3. Wrap each P0–P3 band in a toggle so the page scans clean (`/toggle` → move H3 inside)
4. Add **status property** to the page (Proposed / Approved / Signed) if it lives in a database
5. Link the page from the client dashboard

---

# CourtesyMasters — Remediation Plan & Pricing

**Prepared:** 16 April 2026
**Client:** CourtesyMasters (Menno-Paul Dekker, day-to-day · Fons Bitter, founder)
**Rate:** €120/hour
**Phase 0 duration:** ~3 weeks fixed-scope, P0–P3
**Ongoing:** P4 on monthly retainer

> 📋 **TL;DR:** Phase 0 fixes the foundation (de-risk + SEO + schema + editorial + ops) in three weeks for ~44-59 hours / €5,280 – €7,080. P4 is ongoing growth work on a monthly retainer — recommended tier is 12h/month at €1,440/mo.

---

## P0 — Week 1 — Easy wins + signal-quality

**Top tasks**

- Shorten 27 truncated page titles (direct SERP CTR uplift)
- Fix 3 duplicate H1s on insights posts, hreflang typo on `/jobs`, aria-labels on 5 icon-only links
- Image + font optimisation — 80% of bandwidth today is oversized PNGs (LCP drops to <1.2s on `/for-employers`)
- Clean 28 pages with broken outbound links, fix Cookiebot contrast, unpublish 7 dev/test pages
- File Webflow Support ticket to remove partnercode (stops Egenix earning ongoing affiliate commission)

**Wins:** SEO · Trust · A11y · Perf · GDPR — all visible in the first sprint

**Pricing:** ~6-7 hours → **€720 – €840**

---

## P1 — Week 1 — Critical de-risk + core schema

**Top tasks**

- Migrate Egenix custom JS → client-owned GitHub *(single biggest site-continuity risk today)*
- Clean duplicate Lenis + align GSAP/ScrollTrigger versions (handled inside migration)
- JobPosting schema on 19 jobs missing it → Google for Jobs eligibility
- Replace Webflow-default "Product snippet" with proper Organization schema site-wide

**Wins:** Removes the #1 business-continuity risk + unlocks Google for Jobs on 19 listings

**Pricing:** ~6-7 hours → **€720 – €840**

---

## P2 — Week 2 — Rich results + client-visible design

**Top tasks**

- Kick-ass footer redesign — brief + 2 Figma directions for sign-off
- URL structure rewrite — `/insights/news/`, `/insights/blog/`, `/insights/video/` + 301 map
- FAQPage schema on 30 FAQs · Article schema on 16 insights + 3 case studies · BreadcrumbList as static HTML
- Padding / spacing consistency pass on the 5 top pages (pixelperfect)

**Wins:** Visible wins for the client + schema trio that unlocks rich results and AI citations

**Pricing:** ~13-16 hours → **€1,560 – €1,920**

---

## P3 — Week 2-3 — Editorial foundation + ops

**Top tasks**

- Sitewide typography/layout standards — center column under mega header, 1.5 line-height, left-align, `hyphens: none` for Dutch, list token styling
- Body text colour demo — 2-3 values around 75-85% grey on staging, client selects
- Form simplification — 12 contact sub-pages → one form per audience + topic dropdown
- Replace Zapier + reCAPTCHA with Klaviyo API + Power Automate + Webflow's built-in AI spam filter
- CMS field explainers, CSS docs, auto-generated architecture diagram, billing walkthrough

**Wins:** The site looks, reads, and runs the way the client wants · Editors work independently · 2 third-party dependencies gone

**Pricing:** ~19-29 hours → **€2,280 – €3,480**

---

## Phase 0 total (P0 – P3)

| Band | Timeline | Hours | € |
| --- | --- | --- | --- |
| P0 — Easy wins + signal-quality | Week 1 | ~6-7h | €720 – €840 |
| P1 — De-risk + core schema | Week 1 | ~6-7h | €720 – €840 |
| P2 — Rich results + design | Week 2 | ~13-16h | €1,560 – €1,920 |
| P3 — Editorial + ops | Week 2-3 | ~19-29h | €2,280 – €3,480 |
| **Total** | **~3 weeks** | **~44-59h** | **€5,280 – €7,080** |

> 💰 **Phase 0 headline: €5,280 – €7,080 over ~3 weeks.** Paid 30% deposit / 40% mid-project / 30% on delivery.

---

## P4 — Ongoing (retainer) — Growth

**Top areas**

- AEO remediation L1 → L3 (answer-first copy, authority signals) — currently invisible to ChatGPT / Perplexity / SGE
- Candidate + employer funnel automation (Powerpath / Dynamics — discovery session first)
- Klaviyo end-to-end — segmented marketing + transactional flows
- AI agents HITL — SEO monitoring, content creation, brand-voice check
- Content programme targeting Dutch money keywords (#2-5 → #1) + review of 5 dormant non-NL locales

### Retainer tiers (all at €120/hour)

| Tier | Hours / month | € / month | Best for |
| --- | --- | --- | --- |
| Maintenance | 4 | €480 | Small fixes, nothing strategic |
| Light | 8 | €960 | SEO monitoring + throughput on the change-list |
| **Standard (recommended)** | **12** | **€1,440** | Steady AEO progress + content velocity |
| Active growth | 16 | €1,920 | Funnels + AEO content + international SEO |

> 🌱 **Recommended: Standard tier at €1,440/mo.** Unused hours roll over 1 month. Minimum term 6 months, then month-to-month with 30 days' notice.

---

## To move forward

1. Go-ahead on **Phase 0 (P0–P3)** + preferred retainer tier
2. Answers on four remaining clarifications:
    - **Item 1c** — body text colour (demo 2-3 grey values on staging, client picks)
    - **Item 11** — Zapier direction (recommend Power Automate)
    - **Item 12** — Klaviyo scope (replacement vs addition)
    - **Item 14** — Cookiebot decision (keep + fix contrast recommended)

---

## Outside this quote

- **ESI Global (esiglobal.com)** — sister company, parallel SOW. Same programme shape, separate intake + quote.
- **Funnel implementation (items 15, 16)** — discovery session required first (1-2 weeks). Implementation quoted post-discovery, sits on retainer.
- **Translation of net-new content** into the 5 non-NL locales — audit only; translation separate line.
- **Cookiebot replacement decision** — direction locked to "keep + fix contrast" 2026-04-16.

---

## Source documents

- Intake report: `reports/intake-report-2026-04-15.md`
- Proposal options: `proposals/proposal-options-2026-04-16.md`
- Narrative: `proposals/narrative-2026-04-16.md`
- Client change list (mapped): `client-requests/change-list-mapped-2026-04-16.md`
- Slack draft: `comms/plan-and-options-slack-2026-04-16.md`
- Email draft: `comms/plan-and-options-email-2026-04-16.md`
