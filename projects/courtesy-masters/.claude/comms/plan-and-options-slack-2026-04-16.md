# Plan + options — Slack draft

**Date:** 2026-04-16
**To:** Menno-Paul Dekker (CourtesyMasters) — cc Fons Bitter (Founder)
**From:** Will
**Rate basis:** €120/hour
**Source:** `reports/intake-report-2026-04-15.md` · `proposals/proposal-options-2026-04-16.md`

---

## Short Slack

> Hi Menno-Paul — audit wrapped. Plan split into four priority bands (P0–P3 are the fixed scope, P4 is ongoing). All at €120/hour.
>
> **P0 — Week 1 — Easy wins + signal-quality (~6-7h · €720-€840)**
> • Shorten 27 truncated page titles (direct SERP CTR uplift)
> • Fix 3 duplicate H1s, hreflang typo on `/jobs`, aria-labels on 5 icon links
> • Image + font optimisation — 80% of bandwidth today is oversized PNGs (LCP ↓ to <1.2s)
> • Clean 28 broken outbound links, Cookiebot contrast fix, unpublish 7 dev pages
> • File Webflow Support ticket to remove partnercode (stops Egenix earning ongoing commission)
> **Wins:** SEO, trust, a11y, perf, GDPR — all visible in the first sprint.
>
> **P1 — Week 1 — Critical de-risk + core schema (~6-7h · €720-€840)**
> • Migrate Egenix custom JS → client-owned GitHub *(this is the single biggest site risk today)*
> • Clean duplicate Lenis + align GSAP/ScrollTrigger versions (handled inside migration)
> • JobPosting schema on the 19 jobs missing it → Google for Jobs eligibility
> • Replace Webflow-default "Product snippet" with proper Organization schema site-wide
> **Wins:** Removes the #1 business-continuity risk + unlocks Google for Jobs on 19 listings.
>
> **P2 — Week 2 — Rich results + client-visible design (~13-16h · €1,560-€1,920)**
> • **Kick-ass footer** redesign — brief + 2 Figma directions for sign-off
> • URL structure rewrite — `/insights/news/`, `/insights/blog/`, `/insights/video/` + 301 map
> • FAQPage schema on 30 FAQs · Article schema on 16 insights + 3 case studies · BreadcrumbList as static HTML
> • Padding/spacing consistency pass on 5 top pages (pixelperfect)
> **Wins:** The visible wins for the client + the schema trio that unlocks rich results and AI citations.
>
> **P3 — Week 2-3 — Editorial foundation + ops (~19-29h · €2,280-€3,480)**
> • Sitewide typography/layout standards — center column under mega header, 1.5 line-height, left-align, hyphens off for Dutch, list styling
> • Body text colour demo (2-3 options on staging, you pick)
> • Form simplification — 12 contact sub-pages → one per audience + topic dropdown
> • Replace Zapier + reCAPTCHA with Klaviyo API + Power Automate + Webflow's built-in AI spam filter
> • CMS field explainers, CSS docs, auto-generated architecture diagram, billing walkthrough
> **Wins:** The site looks, reads, and runs the way you want. Editors work independently. 2 third-party dependencies gone.
>
> **Phase 0 total (P0-P3): ~44-59h · €5,280-€7,080**
>
> ---
>
> **P4 — Ongoing (retainer) — Growth**
> • AEO remediation L1 → L3 (answer-first copy, authority signals) — currently invisible to ChatGPT / Perplexity / SGE
> • Candidate + employer funnel automation (Powerpath / Dynamics — discovery first)
> • Klaviyo end-to-end (segmented marketing + transactional flows)
> • AI agents HITL — SEO monitoring, content creation, brand-voice check
> • Content programme targeting Dutch money keywords (#2-5 → #1) + 5 dormant locales
>
> **Retainer tiers (all at €120/h, unused hours roll over 1 month, min term 6 months):**
> • 4h/month — **€480/mo** *(maintenance only)*
> • 8h/month — **€960/mo** *(light — SEO monitoring + small fixes)*
> • 12h/month — **€1,440/mo** *(recommended floor — steady progress)*
> • 16h/month — **€1,920/mo** *(active growth — funnels + AEO content)*
>
> ---
>
> 30% deposit / 40% mid / 30% on delivery for Phase 0. Retainer monthly in advance.
>
> To move forward I need:
> 1. Go-ahead on Phase 0 (P0-P3) + your retainer tier preference
> 2. Four remaining clarifications — text colour (1c), Zapier direction (11), Klaviyo scope (12), Cookiebot decision (14)
>
> ESI (esiglobal.com) runs as a parallel SOW — same programme shape, separate quote, own intake.
>
> Happy to jump on 30 min to walk through.

---

## How the numbers were built

All hours come from the updated intake report's P0-P4 tables (2026-04-16 estimate revision). Phase 0 is fixed-scope work delivered across Weeks 1-3. P4 sits on retainer because it's discovery-led, content-driven, and continuous.

### Phase 0 breakdown

| Band | Hours | € at 120/hr |
|------|-------|-------------|
| P0 — Week 1 — easy wins | ~6-7h | €720-€840 |
| P1 — Week 1 — de-risk + core schema | ~6-7h | €720-€840 |
| P2 — Week 2 — rich results + design | ~13-16h | €1,560-€1,920 |
| P3 — Week 2-3 — editorial + ops | ~19-29h | €2,280-€3,480 |
| **Total Phase 0** | **~44-59h** | **€5,280-€7,080** |

### Retainer tiers

| Tier | Hours/month | €/month | Best for |
|------|-------------|---------|----------|
| Maintenance | 4 | €480 | Small fixes, nothing strategic |
| Light | 8 | €960 | SEO monitoring + throughput on change-list |
| **Standard (recommended)** | **12** | **€1,440** | Steady AEO progress + content velocity |
| Active growth | 16 | €1,920 | Funnels + AEO content + int'l SEO |

Unused retainer hours roll over 1 month. Minimum term 6 months, then month-to-month with 30 days' notice.

### Not in these numbers

- **ESI Global (esiglobal.com)** — sister company, parallel engagement. Same programme shape, separate intake + quote.
- **Funnel implementation (items 15, 16)** — discovery session required first (1-2 weeks). Implementation quoted post-discovery, sits on retainer.
- **Translation of net-new content** into the 5 non-NL locales — audit only; translation separate.
- **Cookiebot replacement decision** — direction locked to "keep + fix contrast" 2026-04-16; replacement would be separate.
