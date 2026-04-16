# Site Intake Report — CourtesyMasters

**Date:** 2026-04-15
**Live URL:** https://www.courtesymasters.com
**Staging URL:** https://staging-cm.webflow.io
**Platform:** Webflow (project created 2025-01-16)
**Last published:** 2026-04-09

---

## Summary

CourtesyMasters is a global hospitality executive search firm (est. 1999) with a Webflow site serving three audiences: hospitality employers (B2B), candidates (B2C), and UHNW/royal households. The site has 88 pages across 6 languages (EN, IT, ES, FR, DE, NL) and 20 CMS collections.

The site has strong foundations — SSL, GTM, custom 404, llms.txt, a full SEO head site-wide, and complete image alt text coverage (0/1,337 missing). The material issues are a fragile custom code setup (previous developer's JS hosted on their GitHub, duplicate Lenis instances, GSAP version mismatch), inconsistent structured-data coverage (16/100 pages with JSON-LD; JobPosting on only 3/22 jobs, no FAQPage, no Person, no BreadcrumbList as HTML), three insights posts with duplicate H1s, 27 overly long page titles, 28 pages with broken external links, and an image/asset pipeline where PNGs are 80% of bandwidth. Organic visibility is modest for a 25+ year brand: 118 keywords in NL (primary market) with ~59 monthly visits, and negligible presence in US/UK.

**Verdict:** The foundation is solid. The remaining work is focused remediation (custom code migration, schema expansion, title/heading cleanup, asset optimisation) plus growth and AEO work — not a broad foundational rebuild.

---

## Passing

| Check | Status | Notes |
|-------|--------|-------|
| SSL/HTTPS | PASS | Active across all domains |
| Canonical domain | PASS | www and non-www both configured |
| Custom 404 | PASS | Custom page configured |
| GTM | PASS | GTM-52WXPM23 installed |
| Analytics | PASS | GTM + Google Ads + Leadsy pixel |
| Norton SafeWeb | PASS | Verification tag present |
| Bing + Yandex verification | PASS | Webmaster verification tags present |
| llms.txt | PASS | Well-structured, lists company info and active jobs |
| Designer comments | PASS | All 57 resolved (Egenix agency, Jan-Jul 2025) |

---

## Needs Attention

### SEO — Meta & Open Graph

95/100 pages render a complete SEO head including CMS detail pages (Jobs, Insights, Case Studies, Team bios): `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image`, `og:url`, Twitter cards, `<link rel="canonical">`, and all 6 `hreflang` locales + `x-default`. The site uses Webflow Localiser to inject the SEO head on CMS detail pages, so the meta tags are rendered client-side — this works for all modern crawlers (Google, Facebook, LinkedIn, Twitter, Bing) but is worth binding as a Collection Template safety net (see §P1).

The 5 pages without full OG/Twitter coverage are utility URLs (the non-www apex redirect, `/llms.txt`, `/robots.txt`, `/search`, `/sitemap.xml`) which is expected.

| Issue | Severity | Detail |
|-------|----------|--------|
| Meta description | PASS | 0/9,018 meta-description checks failed. 0 duplicates. |
| og:title / og:description / og:image | PASS | 95/100 pages — remaining 5 are utility URLs |
| Twitter cards | PASS | 95/100 pages — same 5 utility URLs |
| Canonical tags | PASS | 94/100 self-canonical, 1 intentional canonical-to-other, 5 utility. 0 broken, 0 duplicates. |
| hreflang | PASS | 665 hreflang declarations across site, full coverage |
| Hreflang conflicts on `/jobs?tab=*` | Low | 3/665 conflicts, scoped to query-param variants of `/jobs`. URL typo: `?tab=succesfully-closed-jobs` (should be "successfully"). |
| Page titles > 60 chars | Medium | 27 pages affected (incl. homepage + all locale homepages, `/for-employers`, `/services`, all 3 jobs with JobPosting schema, 3 case studies with Article schema). Truncated in SERPs. |
| `/for-royals` page | NEEDS VERIFY | Manual confirmation recommended — not flagged in the crawl but worth a spot-check. |

### SEO — Structure & Schema

| Issue | Severity | Detail |
|-------|----------|--------|
| H1 tags | Medium | 3 insights posts have multiple H1s: `/insights/anthropic-human-judgement`, `/insights/from-macro-to-micro`, `/insights/why-a-strong-brand-identity-matters`. Likely a single Insights Collection Template fix. |
| Heading hierarchy | PASS | No H2→H4→H5 jumps flagged across the crawled pages. |
| Schema JSON-LD coverage | Medium | 16/100 pages have JSON-LD, inconsistently. Product snippet on 16 (incl. homepage + locale homepages — likely Webflow default, not ideal for a recruitment site); Article on only 3/19 insights + 3/6 case studies; JobPosting on only 3/22 jobs. |
| Schema JSON-LD gaps | High | No FAQPage (30 FAQs), no Person (16 team bios), no proper Organization, no BreadcrumbList as HTML. Single largest remaining SEO opportunity. |
| Sitemap | PASS | 94/100 pages in sitemap. 6 not in sitemap are utility URLs. CMS items included. |
| robots.txt | Low | Invalid robots.txt format (malformed LLMS directive). |
| Low text-to-HTML ratio | Medium | 94/100 pages flagged. Expected for a design-heavy brand site but flags the content-depth opportunity from AEO audit. |
| Broken external links | Medium | 28 pages with broken outbound links, concentrated on `/departments-candidates/*` and `/departments-for-employers/*`. |
| Dev/test pages published | NEEDS VERIFY | Crawl sampled 100 pages and may not have hit dev pages. Manual Webflow Designer verification still needed. |

### Technical — Custom Code

| Issue | Severity | Detail |
|-------|----------|--------|
| Egenix JS dependency | Critical | Custom JS hosted on previous developer's GitHub (`cdn.jsdelivr.net/gh/egenix-ops/cm@88d4b83d.../main.js`). If they delete the repo, the site breaks |
| Duplicate Lenis | High | Two conflicting smooth scroll instances — one in `<head>` (unpkg), one in `<body>` (offbrand copy from a different Webflow project's assets CDN) |
| GSAP version mismatch | Medium | GSAP 3.12.5 vs ScrollTrigger 3.11.4 — loaded from different CDNs (jsDelivr vs cdnflare) |
| Google Ads tag | Low | Loaded separately — should be consolidated into GTM |
| Tawk.to remnants | Low | Commented-out script with empty tags left behind |
| Noopener script | Low | Redundant — Webflow handles natively since 2023 |

### Content & Accessibility

| Issue | Severity | Detail |
|-------|----------|--------|
| Alt text | PASS | 0/1,337 images missing ALT attributes. Content/descriptive quality of alt text is a separate question — spot-check on key pages recommended. |
| Colour contrast | Medium | `#909090` / `#7A7A7A` body text on white fails WCAG AA 4.5:1 (Lighthouse). See Lighthouse Accessibility section. |
| Accessible names on icon links | Medium | Navbar logo, search icon, confidentiality icon, footer logo, breadcrumb home link all lack `aria-label` (Lighthouse). |
| Forms | Medium | Multiple contact forms — client wants simplification. Form labels not audited for a11y. |
| Cookie consent | Medium | Cookiekot in use — client questioning whether to keep (change list item 14). Cookiebot dialog contrast fails WCAG AA. |

### CMS Hygiene

| Issue | Severity | Detail |
|-------|----------|--------|
| Collection name typo | Low | "Work at CourtesMasters" (missing "y") |
| Collection name typo | Low | "Candidates Industries in Hospitaility sectors" (extra "i") |
| Unnecessary template pages | Medium | 7 taxonomy/tag collections have template pages generating thin content (Quotes, Testimonials, Employer Departments, Employer Industry Segments, Industries, Services, Case Study Tags, FAQ Tags, Hotelschool Countries) |
| Dev/test pages published | Medium | 7 dev pages live and indexable: `/dev/components`, 3× test CMS items, BUILD MODE DEMO, 2× style guide pages |

---

## Missing or Broken

| Check | Detail |
|-------|--------|
| JobPosting schema | Only 3/22 live jobs have JobPosting. 19 missing — Google for Jobs eligibility blocked on those listings. |
| FAQPage schema | 30 FAQs with no schema — missing rich result opportunity. |
| Article schema | Only 3/~19 insights posts have Article. 16+ missing. Inconsistent application. |
| Person schema | 16 team members with no Person schema. |
| Organization schema (proper) | Homepage has a "Product snippet" (likely Webflow default) not a full Organization schema. Needs proper Organization on every page. |
| BreadcrumbList as HTML | Rendered via JS only in the original audit; SEMRush confirms no static BreadcrumbList schema detected. |
| Duplicate H1 | 3 insights posts: `/insights/anthropic-human-judgement`, `/insights/from-macro-to-micro`, `/insights/why-a-strong-brand-identity-matters`. |
| Page titles > 60 chars | 27 pages truncated in SERPs. |
| Broken external links | 28 pages with broken outbound links (mostly `/departments-*` pages). |
| Hreflang conflict | `/jobs?tab=succesfully-closed-jobs` (URL typo: "succesfully" should be "successfully") — 3 hreflang issues on this variant. |
| Search Console | Google Search Console access not confirmed (Bing + Yandex only). |
| `/search` page | Blocked from crawling — verify intentional. |
| Unminified JS/CSS | 95 pages affected — Webflow default, low priority. Cloudflare/jsDelivr can minify on delivery. |

---

## Lighthouse Audits

### Accessibility

| Page | Score | Status |
|------|-------|--------|
| Homepage | 94 | PASS |
| For Employers | 93 | PASS |
| Jobs | 93 | PASS |

**Recurring issues (all pages):**

| Issue | Severity | Detail |
|-------|----------|--------|
| Color contrast | Medium | `#909090` (.u-text-dark-50) and `#7A7A7A` (.u-text-dark-60) on white fail WCAG AA 4.5:1 minimum (measured 3.19:1 and 3.9:1). Cookiebot dialog also fails (orange #ff6720 on cream, 2.65:1). Fix: darken text to at least `#767676`. |
| Links without accessible names | Medium | Navbar logo, search icon, confidentiality icon, footer logo, and breadcrumb home link all lack `aria-label` or visible text. |
| Heading order | Medium | h5/h6 used decoratively on /for-employers and /jobs, breaking sequential hierarchy. Restructure to sequential h1-h2-h3 or change to `<p>`/`<div>` with styling classes. |

### Performance

| Page | Lighthouse Score | Real LCP (DevTools) | CLS (DevTools) |
|------|-----------------|---------------------|----------------|
| Homepage | 53 | 243ms | 0.05 |
| For Employers | 55 | 2,228ms | 0.04 |
| Jobs | 55 | 159ms | 0.02 |

**Notes:**
- Lighthouse scores (53-55) reflect simulated mobile throttling in headless Chrome — absolute timing values are inflated. DevTools real-browser traces show the site loads fast in practice.
- `/for-employers` has a 2.2s LCP due to a large hero image. Needs WebP conversion, responsive `srcset`, and a `<link rel="preload">` hint.
- All pages have `font-display` issues — setting `font-display: swap` would reduce FCP.
- Third-party scripts (Cookiebot, GTM, Leadsy) contribute to main thread blocking across all pages.

---

## SEMRush Organic Intelligence

### Domain Overview (April 2026)

| Market | Rank | Keywords | Est. Traffic | Est. Traffic Cost |
|--------|------|----------|-------------|-------------------|
| NL (primary) | 711,564 | 118 | 59 | $42 |
| US | 11,143,219 | 22 | 2 | $3 |
| UK | 5,739,322 | 6 | 0 | $0 |

**Takeaway:** Near-zero international visibility despite a 6-language site. NL is the only market with any organic traction, and even that is modest for a 25+ year brand.

### Top Ranking Keywords (NL)

| Keyword | Position | Volume | Traffic % | URL |
|---------|----------|--------|-----------|-----|
| courtesy | 3 | 1,000 | 40.7% | /nl |
| vacatures hotel management | 8 | 170 | 6.8% | /nl/vacatures |
| recruitment horeca | 4 | 90 | 5.1% | /nl |
| horeca recruitment | 4 | 90 | 5.1% | /nl |
| vacatures hospitality management | 8 | 110 | 3.4% | /nl/vacatures |
| werving en selectie horeca | 2 | 50 | 1.7% | /nl |
| hospitality headhunter | 5 | 70 | 1.7% | /nl |
| vacature general manager hotel | 5 | 70 | 3.4% | /nl/vacatures/... |

**Analysis:**
- 40% of all traffic comes from branded "courtesy" (likely misspelling searches)
- Strong positions (#2-5) for Dutch hospitality recruitment terms — these are the money keywords
- Job-specific pages rank for specific vacancy titles — good CMS SEO potential if scaled
- "hospitality headhunter" (pos 5) and "hospitality industry recruiters" (pos 6) show emerging EN visibility from NL

### Top Pages by Traffic (NL)

| URL | Keywords | Traffic | Share |
|-----|----------|---------|-------|
| /nl (homepage NL) | 19 | 35 | 59.3% |
| /nl/vacatures (jobs listing) | 10 | 6 | 10.2% |
| /industries-in-hospitaility | 9 | 5 | 8.5% |
| /nl/vacatures/hotel-general-manager-... | 10 | 5 | 8.5% |
| / (homepage EN) | 6 | 4 | 6.8% |

**Concentration risk:** Homepage drives 66% of all organic traffic. Jobs and industry pages contribute, but most of the 88 pages generate zero organic visits.

### Top Competitors (NL)

| Competitor | SEMRush Rank | Keywords | Traffic | Traffic Cost | Character |
|------------|-------------:|---------:|--------:|-------------:|-----------|
| hospitality-group.nl | 105,691 | 502 | 1,263 | $1,405 | Consultancy + workplace design (not pure recruitment) |
| thehospitalityrecruiters.com | 518,915 | 39 | 114 | $180 | Niche recruiter, tight keyword set |
| mjpeople.nl | 528,484 | 190 | 110 | $124 | Recruitment firm, broadest pure-play footprint |
| independenthospitality.nl | 550,457 | 115 | 101 | $203 | Recruitment firm |
| **courtesymasters.com** | **711,564** | **118** | **59** | **$42** | Executive search (hospitality + UHNWI) |

**Note on `hospitality-group.nl`:** It's the organic leader on paper (~21× CM's traffic) but is effectively a different business — a hospitality consultancy + workplace design firm, with ~55% of its traffic coming from ranking #1 on its own brand term "hospitality group" and #6 on the 4,400/mo head term "hospitality". Not a direct benchmark for an executive-search firm.

**Useful benchmark set = the 3 pure-play recruiters** (thr, mjpeople, independenthospitality). Against that cohort, CM's keyword count (118) is within range but keyword yield (0.50 traffic/keyword) is the lowest. See `audits/competitor-benchmark-2026-04-16.md` for full benchmark + strategic implications.

### 12-Month Trend (US — proxy for global EN)

| Month | Keywords | Traffic | Rank |
|-------|----------|---------|------|
| Apr 2025 | 37 | 0 | 13.4M |
| Jul 2025 | 42 | 15 | 7.1M |
| Oct 2025 | 32 | 1 | 14.6M |
| Jan 2026 | 35 | 1 | 11.7M |
| Mar 2026 | 23 | 2 | 11.1M |

**Trend:** Flat to declining. A brief spike in Jul 2025 (likely post-launch activity) quickly reverted. No sustained growth trajectory.

---

## AEO Score (Homepage)

| Category | Score | Detail |
|----------|-------|--------|
| Schema | 1/4 | Homepage has "Product snippet" JSON-LD (Webflow default — not a proper Organization). No FAQPage, no Article, no BreadcrumbList as HTML. 16/100 pages have JSON-LD across the site (inconsistent). |
| Answer structure | 0/6 | No answer-first content, no question H2s |
| Freshness | 0/3 | No visible timestamps, no recent updates |
| Authority | 1/4 | Brand signals present, no original data/stats |
| Technical | 2/3 | llms.txt present, alt-text coverage complete, hreflang complete. Still: thin internal linking and malformed llms-directive in robots.txt. |
| **Total** | **4/20** | **Maturity Level: L1 (Invisible)** |

The site is effectively invisible to AI answer engines (ChatGPT, Perplexity, Google SGE). The technical substrate is in good shape, but without schema coverage + answer-first content + author/freshness signals, the score stays in L1. Moving to L3 requires the Option 2 growth workstream.

---

## Recommended Next Steps

The plan blends **client-driven requests from the 2026-04-11 change list** with the **technical findings from this audit**. Each task carries a **justification tag** showing which lever it pulls:

- **SEO** — search ranking, crawlability, SERP CTR
- **AEO** — AI answer engine citations (ChatGPT, Perplexity, SGE)
- **Perf** — page speed, Core Web Vitals, LCP
- **De-risk** — business continuity, dependency removal, compliance
- **Trust** — credibility signals (ties to client's "trustworthy is KEY" value)
- **A11y** — accessibility, WCAG
- **Conv** — conversion (forms, funnels)
- **Ops** — operational efficiency, CMS hygiene, handover quality

Full item-by-item mapping of the client's change list: `.claude/client-requests/change-list-mapped-2026-04-16.md`. Programme philosophy: `.claude/proposals/narrative-2026-04-16.md`.

---

### P0 — Week 1 — Easy + highest impact

Small-effort tasks with outsized value. All ship in the first sprint; most are under half a day each. This is the visible-progress week — client sees movement, search sees signal quality, risk drops.

| # | Task | Effort | Justification | Client item |
|---|------|--------|---------------|-------------|
| 1 | **Unpublish 7 dev/test pages** (`/dev/components`, 3× test CMS items, BUILD MODE DEMO, 2× style-guide pages) | 15 min | **SEO** — removes low-quality indexable pages diluting crawl budget | — |
| 2 | **Disable template pages on 7-9 taxonomy-only collections** (Quotes, Testimonials, Employer Departments, Employer Industry Segments, Services taxonomy, Case Study Tags, FAQ Tags, Hotelschool Countries) | 15 min | **SEO** — removes thin-content detail pages | — |
| 3 | **Fix 2 CMS collection typos** ("CourtesMasters" → "CourtesyMasters"; "Hospitaility" → "Hospitality") | 15 min | **Trust**, **SEO** (slug cleanup as part of item 6) | Item 6 |
| 4 | **Fix hreflang typo + conflict on `/jobs?tab=succesfully-closed-jobs`** — correct "succesfully" → "successfully" or noindex query-param variants | 30 min | **SEO** — removes 3/665 hreflang conflicts, fixes trust-damaging URL typo | Item 6 |
| 5 | **Fix 3 insights posts with duplicate H1** (`anthropic-human-judgement`, `from-macro-to-micro`, `why-a-strong-brand-identity-matters`) — single Insights Collection Template fix | 15 min | **SEO** — immediate signal-quality improvement, **AEO** (H1 is a primary content signal) | Item 2 |
| 6 | **Submit Webflow Support ticket to remove partnercode permanently** — not self-serve per Webflow Help Center; Support intervention required. We raise the ticket in P0; resolution time depends on Webflow. | 15 min to file + waiting on Webflow | **De-risk** — stops Egenix earning ongoing affiliate commission on CM's hosting fees | Item 22 |
| 7 | **Add aria-labels to 5 icon-only links** (navbar logo, search icon, confidentiality icon, footer logo, breadcrumb home) | 30 min | **A11y** — closes Lighthouse accessibility gap, **SEO** (accessibility is a ranking factor) | — |
| 8 | **Shorten 27 overly long page titles** (>60 chars) — CMS template pass | 2 hours | **SEO** — affected pages lose ~20-30% CTR to SERP truncation; direct organic-traffic uplift | Item 5 |
| 9 | ~~**Bind CMS SEO fields on 4 Collection Templates as a safety net** (Jobs, Insights, Case Studies, Team)~~ **✓ Already in place (verified 2026-04-16).** Keep pattern for any net-new Collection Templates. | — | — | Item 5 |
| 10 | **Clean up 28 pages with broken external links** (concentrated on `/departments-*`) | 1 hour | **Trust** ("trustworthy is KEY"), **SEO** (outbound link quality signal) | Item 6 |
| 11 | **Cookiebot — keep + fix contrast** Fix the WCAG AA contrast failure on the consent dialog; verify the CM Cookiebot tier isn't overpriced (flag only if materially out of line, otherwise leave). | 30 min | **De-risk** (GDPR/compliance — Cookiebot's audit trail is the value), **A11y** (current dialog fails WCAG AA contrast) | Item 14 |
| 27 | **Image + font optimisation** — PNG → WebP/AVIF on top 20 offenders, fonts to WOFF2, `/for-employers` LCP fix. Full plan: [Asset Optimisation](#asset-optimisation). *(Moved from P3 to P0 — high-impact, low-effort.)* | 1 hour + client upload discipline going forward | **Perf** (PNGs = 80% of bandwidth today; LCP ↓ to <1.2s), **SEO** (page speed is a ranking factor), **AEO** (AI crawlers have aggressive timeouts) | — |

**P0 total: ~6-7 hours of dev work + one 30-minute client call + Webflow Support ticket wait.** Delivers 7 SEO/signal-quality wins, 2 trust/compliance wins, 1 accessibility win, 1 performance/bandwidth win, and removes partnercode. (Task #9 already resolved 2026-04-16.)

---

### P1 — Week 1 — Critical de-risk + core schema

High-effort-but-unavoidable work: the Egenix dependency is the single biggest business risk on the site, and JobPosting / Organization schema are the highest-ROI schema additions.

| # | Task | Effort | Justification | Client item |
|---|------|--------|---------------|-------------|
| 12 | **Migrate custom code to client-owned GitHub repo** — full migration plan in [Custom Code Migration Plan](#custom-code-migration-plan) | 2 hours | **De-risk** (CRITICAL) — all custom JS currently lives on previous developer's GitHub; if they delete the repo or push a breaking change, the site goes down with no rollback | — (protects items 22 + everything) |
| 13 | **Fix duplicate Lenis** (remove offbrand body-loaded copy, keep unpkg head version) — handled inside migration | (part of #12) | **De-risk** (prevents scroll regressions), **Perf** (removes duplicate JS payload) | — |
| 14 | **Align GSAP + ScrollTrigger versions** — both on 3.12.5, same CDN — handled inside migration | 15 min (part of #12) | **De-risk** (removes silent animation bugs), **Perf** | — |
| 15 | **Add JobPosting schema to remaining 19 jobs** (only 3/22 have it today) | 2 hours | **SEO** — unlocks Google for Jobs eligibility on 19 more listings, estimated 2-5× impressions on job pages | Item 5 |
| 16 | **Proper Organization schema site-wide** — replace the "Product snippet" Webflow default with full Organization, propagate via site-wide embed | 2 hours | **SEO**, **AEO** — correct entity type for a recruitment firm; unlocks knowledge-panel eligibility | Item 5 |

**P1 total: ~6-7 hours dev work.** Removes the only business-critical site risk, unlocks Google for Jobs on 19 listings, and fixes the Webflow-default misclassification of the company.

---

### P2 — Week 2 — URL structure + rich results + client-visible design

The items the client will *see* (footer, URL structure) plus the schema tier that unlocks richer search presentation.

| # | Task | Effort | Justification | Client item |
|---|------|--------|---------------|-------------|
| 17 | **Footer redesign** — brief + 2 design directions (Figma) ready for client review | 2-4 hours | **Trust** (highest client urgency signal), **Conv** (footer is high-scroll-depth CTA real estate) | Item 7 |
| 18 | **URL structure rewrite + `/insights/` sub-categorisation** — `/insights/news/`, `/insights/blog/`, `/insights/video/`. 301 redirect map for every changed URL. Search Console re-submission. Yoast-style permalink baseline. | 1-2 hours | **SEO** (better topical clustering), **Trust** ("trustworthy is KEY"), **AEO** (cleaner URL semantics help AI extraction) | Item 6 |
| 19 | **FAQPage schema on 30 FAQs** — structured data markup on every FAQ item | 1 hour | **SEO** (rich result eligibility), **AEO** (FAQ blocks are a primary AI-citation format) | Item 5 |
| 20 | **Article schema on 16 insights posts + 3 case studies missing it** | 1 hour | **SEO** (richer SERP presentation — author, date, thumbnail), **AEO** (Article markup is a primary AI-citation signal) | Item 5 |
| 21 | **BreadcrumbList schema as static HTML** (not JS-rendered) | 2 hours | **SEO** (breadcrumb rich result), **AEO** (site hierarchy signal) | Item 5 |
| 22 | **Padding / spacing consistency pass — first sprint** on 5 most-visited pages (homepage, `/for-employers`, `/for-candidates`, `/services`, `/jobs`). Design-token audit + sitewide spacing scale. | 2 hours | **Trust** (pixelperfect!!! — client urgency signal), **Perf** (consistent spacing reduces CLS risk) | Item 4 |
| 23 | **Component backgrounds re-organisation + optimisation** — runs alongside item 22 | 4 hours | **Trust**, minor **Perf** where backgrounds become CSS gradients vs images | Item 3 |

**P2 total: ~13-16 hours (~2 days) dev + design.** Moves the big-visible-impact items into client view and completes the schema trio that unlocks rich results.

---

### P3 — Week 2-3 — Editorial foundation + operational stability

Client's sitewide typography/layout standards, CMS manuals, form simplification, Zapier replacement, Webflow plan consolidation, image + font optimisation.

| # | Task | Effort | Justification | Client item |
|---|------|--------|---------------|-------------|
| 24a | **Main content basics — quick fixes (sitewide CSS pass).** Line-height 1.5 minimum (1b), `word-break: keep-all; hyphens: none;` (1d + 1j, Dutch language concern), left-align body text (1e), bullet / ordered list styling tokenised (1f). Single stylesheet change across all templates, no design decisions required. | 2-4 hours | **A11y** (readability), **Trust** (polish) | Items 1b, 1d, 1e, 1f, 1j |
| 24b | **Main content basics — longer fixes (design + build).** Center column layout under mega header (1a, see decorrespondent.nl reference) — affects every template, requires design pass + client sign-off on column width, vertical rhythm, sidebar/related-content treatment, breakpoints. | 2-4 hours | **Trust** (editorial polish), **Conv** (readable long-form reads better) | Item 1a |
| 25 | **Body text colour** — demo 2-3 values around 75-85% grey on staging, client selects (item 1c) | 1 hour | **A11y** (WCAG AA contrast), **Trust** (premium quiet tone) | Item 1c ⚠️ clarification pending |
| 26 | **Form simplification + RTE / copy-paste fixes** — consolidate 12 contact sub-pages to one form per audience + topic dropdown; clean RTE paste; CMS editor guidance | 2-4 hours | **Conv** (fewer form variations = higher completion), **A11y** (unified accessible form spec), **Ops** (editor sanity) | Items 1g, 1h, 1i |
| 28 | **CSS hierarchy "how to" documentation** | 1 hour | **Ops** (future-developer onboarding), supports item 8 | Item 2 |
| 29 | **Architecture / eco-system diagram — auto-generated.** Generate from stack data (Webflow project config, custom code inventory, integrations map) into Mermaid / draw.io / Figma. Re-runnable as the stack evolves. Short walkthrough video on first pass. | 1 hour | **Ops** — any developer understands the stack in 5 minutes; diagram stays in sync with stack over time | Item 8 |
| 30 | **CMS field explainers** — add field-level help text to every field across the 6 collections (CMS / Blog / News / Job / Page / Case Study). Webflow surfaces these as tooltips when editors are filling in fields. Optional Loom walkthrough per collection if client wants it on top. | 2 hours | **Ops** (internal editors work independently without a manual), **Trust** (brand voice consistency via field prompts) | Items 9a-f |
| 31 | **Replace Zapier + reCAPTCHA with direct APIs + Webflow's built-in AI spam filter.** Klaviyo API for CM (marketing + transactional email), Power Automate (or direct Graph API) for MS365-to-MS365 form routing. Swap Google reCAPTCHA for Webflow's native AI spam filter (removes a second third-party dependency). Decommission Zapier + reCAPTCHA once cut-over is verified. | 8-12 hours | **De-risk** ("feels unstable from day 1" per client, removes 2 third-party deps), **Conv** (no more lost form submissions), **Ops** | Items 11 + 12 |
| 32 | **Webflow "double structure" — clarification, not consolidation** — client perceives double billing but actually only pays a hosting plan (no separate workspace plan). Deliver a 1-page billing walkthrough / screenshot so Menno-Paul can see what's actually charged. No consolidation work needed. | 0 hours | **Ops** (removes a persistent client worry) | Item 21 |

**P3 total: ~19-29 hours (~2.5-4 days) dev.** Finishes the editorial foundation and operational layer. After P3, the site looks, reads, and runs the way the client wants.

---

### P4 — Ongoing (retainer) — Grow: funnels, AI, international, content

The retainer / Option 2-Option 3 territory. Highest strategic value; requires the foundation of P0-P3 to be in place first.

| # | Task | Effort | Justification | Client item |
|---|------|--------|---------------|-------------|
| 33 | **"Growth engine" framing applied across the programme** — narrative hygiene on every touchpoint | ongoing | **Trust** — ties every deliverable back to the client's vision | Item 10 |
| 34 | **Candidate funnel — discovery session required.** Workshop with client to map current funnel (landing → application → ATS), document Powerpath API surface, MS365/Dynamics integration points. Discovery output = written scope doc → Phase 2 implementation quoted separately. | Discovery 1-2 weeks; implementation TBC post-discovery | **Conv** (qualified candidates into ATS without manual re-entry), **Ops**, **De-risk** (single source of truth) | Item 15 ⚠️ discovery required |
| 35 | **Employer / client funnel — discovery session required.** Same structure as #34 for the employer side. Worth running the two discoveries back-to-back since they share the same CRM/ATS target. | Discovery 1-2 weeks; implementation TBC post-discovery | **Conv** (employer briefs into Dynamics), **Ops** | Item 16 ⚠️ discovery required |
| 36 | **AI agent for periodic SEO/GEO checks** — HITL | 1 week setup, monthly review cycle | **SEO + AEO** (continuous monitoring vs one-off audit), **Ops** | Item 18 |
| 37 | **AI agents for content creation / publish / structure** — HITL | 1-2 weeks setup | **AEO** (velocity of publishing lifts authority signals), **Conv** (content drives qualified traffic) | Item 19 |
| 38 | **Text-check agent** (brand voice / grammar / tone) — HITL, ingests `brand-voice.md` | 1 week setup | **Trust** (voice consistency across 6 languages + many authors) | Item 20 |
| 39 | **Klaviyo implementation — end-to-end** (direction locked 2026-04-16). Full API integration: form submissions → Klaviyo lists, segmentation by audience (candidates / employers / UHNW), transactional flows (application confirmation, enquiry acknowledgement, case-study nurture), marketing automation (newsletter, candidate pipeline, employer re-engagement). Built on top of task #31 (Zapier decommission). | 2-3 weeks | **Conv** (segmented nurture drives candidate re-engagement), **De-risk** (replaces the Zapier hop), **Ops** (single marketing + transactional platform) | Item 12 |
| 40 | **AEO remediation L1 → L3** — answer-first copy restructure, author bylines, updated timestamps, internal linking framework, 3 original data-backed pieces | 3-4 weeks | **AEO** (primary lever — current score 4/20), **SEO** (AEO and SEO compound) | — |
| 41 | **Person schema on 16 team bios** | 1 day | **SEO** (expert authority signal), **AEO** (Person markup drives author citations) | — |
| 42 | **Competitive gap analysis** — focus on the pure-play recruiter cohort; `mjpeople.nl`'s role-specific landing page pattern is the most transferable model | 1 week | **SEO** (keyword opportunity list + content roadmap), **Conv** (role-specific landing pages convert better than homepage-to-jobs) | — |
| 43 | **International SEO review** — 6 languages configured but only NL has traction. Audit the other 5 locales for depth vs thin translations. | 1-2 weeks | **SEO** (five dormant markets — low-effort uplift if translations are simply incomplete), **Trust** (brand consistency across locales) | — |
| 44 | **Content programme** targeting Dutch hospitality recruitment terms — current positions (#2-5) show authority; just needs depth | ongoing (retainer) | **SEO** (move #5 → #3 = roughly 3× CTR), **AEO** (content depth is a citation prerequisite) | — |
| 45 | **AI-bot blocking alignment** with client's AEO goals | half day | **AEO** (ensure we're not blocking the bots we want to be cited by) | — |

---

### Outstanding clarifications before scope lock

Five items tied to client requests need answers before full pricing and sequencing can close. Draft Slack + email: `.claude/comms/client-clarifications-2026-04-16.md`.

| # | Item | Question | Blocks |
|---|------|----------|--------|
| 1 | **Item 1c** (text not black, max 80%) | Current `#909090` fails WCAG AA. Recommend demoing 2-3 values on staging (~`#3A3A3A` to `#404040`) and letting the client pick. | P3 #25 |
| 2 | **Item 11** (Zapier) | (A) Harden Zapier / (B) replace with Power Automate (recommended) / (C) custom serverless. Which? | P3 #31 |
| 3 | **Item 12** (Klaviyo) | Moving from Zapier → Klaviyo, or adding Klaviyo alongside for email marketing? | P4 #39 |
| 4 | **Item 14** (Cookiekot) | Keep + fix contrast / replace with Cookiebot / reduce cookies and drop banner? | P0 #11 |
| 5 | ~~**Item 21**~~ | ~~Billing access required to audit workspace + site plans.~~ **Resolved 2026-04-16.** Client is only paying a hosting plan — no workspace plan. Perception issue, not a billing issue. Action is a 1-page billing walkthrough (task #32). | — |

---

## Custom Code Migration Plan

**Goal:** Move all custom code off third-party dependencies and into a client-owned GitHub repo served via jsDelivr, giving CourtesyMasters full control and version pinning.

### Current state

| Asset | Current source | Risk |
|-------|---------------|------|
| Egenix `main.js` | `cdn.jsdelivr.net/gh/egenix-ops/cm@88d4b83d.../main.js` | **Critical** — hosted on previous developer's GitHub, pinned to a commit hash. No client access to repo. |
| Lenis 1.1.18 JS + CSS | unpkg (head) | Low — public CDN, version-pinned |
| Lenis (duplicate) | Foreign Webflow project assets CDN (645e0e1ff7fdb6dc8c85f3a2) | **High** — offbrand copy from unknown project |
| GSAP 3.12.5 | jsDelivr | Low |
| ScrollTrigger 3.11.4 | cdnflare | **Medium** — version mismatch with GSAP |
| Noopener script | Inline | Redundant since 2023 |

### Migration steps

#### Phase 1 — Audit and extract (Day 1)

1. **Download the Egenix `main.js`** from the pinned jsDelivr URL. Capture the exact version currently in production.
2. **Audit the code** — map what it does (likely: Webflow interactions, form handling, CMS filtering, smooth scroll init). Document every function and DOM dependency.
3. **Identify what can be replaced** — if Egenix code duplicates Lenis init, GSAP setup, or Webflow native features, mark for removal rather than migration.

#### Phase 2 — Set up client repo (Day 1-2)

4. **Create `courtesymasters/cm-webflow`** (or similar) on the client's GitHub org. If they don't have a GitHub org, create one under their account.
5. **Structure:**
   ```
   cm-webflow/
   ├── src/
   │   ├── main.js          ← cleaned Egenix code
   │   ├── vendor/           ← if any vendor code needs local hosting
   │   └── utils/            ← shared helpers
   ├── dist/                 ← minified output (optional — jsDelivr serves raw too)
   └── README.md
   ```
6. **Push the audited code** as the initial commit. Tag as `v1.0.0`.

#### Phase 3 — Switch CDN references (Day 2-3)

7. **Replace Webflow head/body embeds:**

   | Before | After |
   |--------|-------|
   | `cdn.jsdelivr.net/gh/egenix-ops/cm@88d4b83d.../main.js` | `cdn.jsdelivr.net/gh/courtesymasters/cm-webflow@v1.0.0/src/main.js` |
   | Duplicate Lenis from foreign project | **Remove entirely** |
   | ScrollTrigger 3.11.4 from cdnflare | `cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js` |
   | Noopener inline script | **Remove entirely** |
   | Google Ads tag (standalone) | Move firing into GTM |

8. **Version-pin everything** via `@v1.0.0` (GitHub tags) or `@3.12.5` (npm packages) — never use `@latest` in production.

#### Phase 4 — Verify and publish (Day 3-4)

9. **Test on staging** (`staging-cm.webflow.io`) — verify all interactions, forms, smooth scroll, and CMS filtering work identically to the current live site.
10. **Publish to production** — update Webflow custom code, publish site.
11. **Monitor for 48 hours** — check GTM, forms, and Zapier integrations still fire correctly.

#### Phase 5 — Clean up (Week 2)

12. **Contact Egenix** — inform them the code has been migrated and they can archive/delete their `cm` repo at their convenience. Professional courtesy.
13. **Document the new setup** — add a section to client.md with the repo URL, CDN pattern, and how to deploy updates.
14. **Set up jsDelivr cache purge** — document how to purge the CDN cache after pushing a new tag (`https://purge.jsdelivr.net/gh/courtesymasters/cm-webflow@v1.0.0/src/main.js`).

### Ongoing workflow

After migration, any JS changes follow this flow:

1. Edit code in `cm-webflow` repo
2. Test locally or on staging
3. Tag a new version (`v1.1.0`)
4. Update the version number in Webflow's custom code embed
5. Publish in Webflow
6. Purge jsDelivr cache if needed (auto-purges within 24h anyway)

### Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Egenix code has undocumented side effects | Phase 1 audit maps all DOM dependencies before migration |
| jsDelivr CDN outage | jsDelivr has 99.9%+ uptime and multi-CDN fallback. Same risk as current setup. |
| Client doesn't have GitHub account | Create one as part of onboarding — GitHub is free for public repos |
| Breaking change during migration | Version-pin on staging first, only update production after verification |
| Zapier integrations break | Test form submissions end-to-end in Phase 4 before going live |

---

## Custom Code Inventory

### Site-wide `<head>`

| Script | Source | Risk |
|--------|--------|------|
| GTM (GTM-52WXPM23) | Google | Low |
| Google Ads (AW-1058961670) | Google | Low — should be in GTM |
| Norton SafeWeb verification | Norton | None |
| Bing Webmaster verification | Microsoft | None |
| Yandex verification | Yandex | None |
| Tawk.to | Tawk | None — **commented out, empty tags** |
| Instantly/Leadsy pixel | r2.leadsy.ai | Low |
| GSAP 3.12.5 | jsDelivr CDN | Low |
| ScrollTrigger 3.11.4 | cdnflare CDN | Medium — **version mismatch** |
| Egenix custom JS | egenix-ops GitHub via jsDelivr | **Critical — external dependency** |
| Lenis 1.1.18 CSS | unpkg | Low |
| Lenis 1.1.18 JS + init | unpkg | Low |
| Lenis inline styles | Inline | Low |

### Site-wide `<body>`

| Script | Source | Risk |
|--------|--------|------|
| GTM noscript | Google | None — correctly placed |
| Lenis (duplicate) | Foreign Webflow project assets (645e0e1ff7fdb6dc8c85f3a2) | **High — offbrand duplicate** |
| Noopener script | Inline | None — **redundant since 2023** |

---

## Asset Optimisation

**Source:** Webflow asset usage report, `staging-cm`, top 1000 assets by bandwidth, exported 2026-04-16.

### Bandwidth by file type

| Type | Files | Bandwidth (GB) | On-disk (MB) | Share |
|------|-------|----------------|--------------|-------|
| **PNG** | **272** | **8.89** | **320.3** | **80.2%** |
| JPEG | 34 | 0.71 | 16.2 | 6.4% |
| AVIF | 94 | 0.66 | 4.2 | 6.0% |
| JS | 326 | 0.31 | 20.9 | 2.8% |
| OTF (fonts) | 86 | 0.26 | 5.7 | 2.4% |
| CSS | 123 | 0.12 | 4.6 | 1.1% |
| WebP | 56 | 0.11 | 4.0 | 1.0% |
| Other | 7 | 0.02 | 0.7 | 0.1% |
| **Total** | **1,000** | **11.09** | **376.6** | |

**Headline:** PNGs are **80% of total bandwidth** served by the site. The same assets already exist as AVIF (94 files, 4.2 MB on disk) and WebP (56 files, 4.0 MB on disk) — proving Webflow's auto-conversion is partially working, but the heavy PNG originals are still being requested at scale.

### Top PNGs by bandwidth (aggregated across all variants)

| Asset | Source size | Total bandwidth | Loads |
|-------|-------------|-----------------|-------|
| `Job-vacancy-Personal-Assistant-UHNWI-SFO-Amsterdam...png` | 3.43 MB | **1.68 GB** | 516 |
| `BLOG 1 -- HEADER + THUMBNAIL B.png` | 3.19 MB | **0.96 GB** | 314 |
| `Job-vacancy-Senior-Manager-Operations-Limburg...png` | 3.97 MB | **0.83 GB** | 216 |
| `Job-vacancy-Parkmanager-Laacher-See...png` | 1.45 MB | 0.69 GB | 484 |
| `Job-vacancy-Multi-Venue-Revenue-Manager...png` | 1.38 MB | 0.67 GB | 492 |
| `Job-vacancy-Commercial-Performance-Analyst...png` | 2.63 MB | 0.53 GB | 204 |
| `CourtesyMasters-blog-Anthropic-Human-Judgement-main.png` | 2.32 MB | 0.41 GB | 184 |
| `CourtesyMasters-blog-Macro-to-micro-main.png` | 1.32 MB | 0.33 GB | 250 |
| `CourtesyMasters-blog-Why-a-strong-brand-identity...png` | 1.29 MB | 0.28 GB | 223 |

**Top 9 PNGs alone account for ~6.4 GB (57% of total site bandwidth).**

### Why this is happening

1. **Source uploads are PNG.** Webflow auto-generates `-p-500`, `-p-800`, `-p-1080`, `-p-1600`, `-p-2000` responsive variants + AVIF/WebP derivatives, but the **original PNG** is still served in several contexts:
   - Social media crawlers / OG image requests (no AVIF/WebP support)
   - CSS background images (Webflow does not auto-convert these)
   - Direct CMS image URLs in rich-text embeds
   - Older browsers / email clients
2. **Hero/thumbnail PNGs are oversized.** Job vacancy hero images at 3-4 MB are roughly 10-20× larger than needed for their display size (usually ~1200-1600px wide).
3. **Font format outdated.** `ConcretteXL-Regular.otf` (0.18 GB, 2,690 loads) and `Carentro.otf` (0.08 GB, 2,861 loads) are served as OTF. Converting to WOFF2 typically reduces font payload by 30-50%.

### Recommended remediation

#### Phase 1 — Bulk image conversion (Week 1)

1. **Audit the 20 worst offenders** (any PNG > 1 MB). For each:
   - If it's a photograph → re-upload as **JPEG** (quality 82) or **AVIF**
   - If it's a screenshot/graphic with text → re-upload as **WebP** (quality 85)
   - If it needs transparency → keep PNG but run through `pngquant` / `oxipng` first (typically 50-70% reduction with no visible quality loss)
2. **Enforce upload standards** — document a one-page guide for the client:
   - Max dimensions: 2000px wide for hero, 1200px for thumbnails, 800px for body images
   - Max file size: 500 KB for hero, 200 KB for thumbnail, 100 KB for body
   - Prefer JPEG/AVIF over PNG unless transparency is required
3. **Bulk script** — write a Node script that:
   - Pulls all Webflow asset URLs via the Asset API
   - Downloads, converts to WebP/AVIF via `sharp`
   - Re-uploads and updates CMS references
   - Produces a before/after bandwidth estimate

#### Phase 2 — CMS + template fixes (Week 2)

4. **Ensure `<img>` tags use `srcset`** — verify all CMS collection templates (jobs, insights, case studies, team) render responsive image HTML, not bare `<img src>`.
5. **Add `loading="lazy"`** to all below-the-fold images.
6. **Preload LCP hero image** on `/for-employers` (currently 2.2s LCP — report §Performance).
7. **Convert CSS background images** to inline `<img>` where possible so they benefit from responsive variants.

#### Phase 3 — Fonts (Week 2)

8. **Convert `ConcretteXL-Regular.otf` and `Carentro.otf` to WOFF2** — self-host in Webflow, replace font face declarations.
9. **Add `font-display: swap`** (flagged in Lighthouse Performance).
10. **Subset fonts** to Latin range if all 6 languages are Latin-script (they are: EN/IT/ES/FR/DE/NL).

### Expected impact

| Metric | Current | After remediation | Saving |
|--------|---------|-------------------|--------|
| PNG bandwidth share | 80.2% | ~15-20% | **~60-65% total reduction** |
| Total monthly bandwidth | 11.1 GB (sampled) | ~4-5 GB | ~55-60% |
| LCP (`/for-employers`) | 2.2s | <1.2s | Google Core Web Vitals pass |
| Lighthouse Performance | 53-55 | 75-85 | Moves from "poor" to "good" |
| Font payload | 260 MB | 130-160 MB | ~40% |

**Secondary benefits:** faster TTI on mobile, lower CDN costs (Webflow bandwidth-based pricing at higher tiers), better SEO rankings (page speed is a ranking factor), better AEO (AI crawlers have aggressive timeouts), better UX on low-bandwidth connections (relevant for international audiences).

---

## Sub-audits

Detailed deep-dives have been split out as standalone documents for easier review and scoping:

- **SEO audit** — `.claude/audits/seo.md` — meta/OG tags, schema, heading hierarchy, sitemap, hreflang, SEMRush intelligence
- **Competitor benchmark** — `.claude/audits/competitor-benchmark-2026-04-16.md` — CM vs mjpeople.nl, independenthospitality.nl, thehospitalityrecruiters.com, hospitality-group.nl
- **Content audit** — `.claude/audits/content.md` — brand voice, CMS hygiene, thin pages, copy gaps
- **Structure audit** — `.claude/audits/structure.md` — custom code inventory, technical debt, Lighthouse findings, performance
- **AEO audit** — `.claude/audits/aeo.md` — answer engine readiness
- **Client change list** — `.claude/client-requests/change-list-2026-04-11.md` (verbatim) and `.claude/client-requests/change-list-mapped-2026-04-16.md` (mapped to pillars)
- **Narrative** — `.claude/proposals/narrative-2026-04-16.md` — programme philosophy, 3-pillar story, recommended client-facing framing

All sub-audit findings are also reflected in the relevant sections of this consolidated report.

---

*Report generated by automated intake audit. Manual verification recommended for items marked "NEEDS VERIFY".*
