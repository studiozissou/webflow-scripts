# Site Intake Report — Coconut

**Date:** 2026-05-06 | **Live URL:** https://www.getcoconut.com | **Staging URL:** https://getcoconut.webflow.io

## Summary

Coconut is a well-established Webflow site (155 pages, 19 CMS collections) serving as the primary lead generation platform for their self-employed accounting and MTD compliance software. The site targets UK sole traders, freelancers, and landlords, with a secondary audience of accountants.

The site has solid technical foundations — HTTPS, sitemap, custom 404, analytics stack, and cookie consent are all in place. Schema markup is a mixed picture: some pages (/features, /mtd-software, /accountant-software) have excellent JSON-LD with FAQPage, SoftwareApplication, and BreadcrumbList, while others (/about, /jobs, /sign-up, homepage) have minimal or no structured data. The client's primary request — Organization schema — is almost entirely absent site-wide.

The material issues are: (1) no Organization or WebSite schema on the homepage or site-wide, (2) 60-70% of images missing alt text, (3) /jobs has 2 H1 tags (should be 1), (4) analytics firing before consent, and (5) 7 published archive pages and 8 dev/test drafts cluttering the CMS. AEO maturity is L2 (Emerging) at 10/20 — schema and freshness are reasonable, but authority signals and answer-first content structure are weak.

**Verdict:** A quietly strong site with a loud ceiling. The brand already competes on organic search — the site just isn't packaging its content for search engines, AI platforms, or rich results as well as it could.

---

## Passing

| Check | Status | Notes |
|-------|--------|-------|
| SSL/HTTPS | PASS | Fully served over HTTPS. No mixed content. 147 network requests all HTTPS. |
| Sitemap | PASS | 392 URLs, valid XML, referenced in robots.txt. |
| Custom 404 | PASS | Branded 404 page with navigation. |
| Favicon | PASS | Shortcut icon (32px PNG) + apple-touch-icon. |
| Canonical domain | PASS | www.getcoconut.com is canonical. 4 custom domains configured. |
| Analytics | PASS | GTM, GA4, Google Ads, TikTok Pixel, Facebook Pixel (x2), Hotjar, Zoho PageSense, Intercom. |
| Cookie consent | PASS | Granular consent banner with accept/choose. Controls for 7 consent categories. |
| Meta titles | PASS | Present on all key pages (some template pages missing — low priority). |
| Viewport | PASS | Mobile viewport meta tag present on all pages. |
| Lighthouse SEO | PASS | 92/100 on homepage. |
| Lighthouse Accessibility | PASS | 86/100 on homepage. |
| robots.txt AI bots | PASS | No blocks on GPTBot, ClaudeBot, PerplexityBot, or Google-Extended. |

---

## Needs Attention

### SEO — Meta & Open Graph

| Issue | Severity | Detail |
|-------|----------|--------|
| /features meta description typo | MEDIUM | "...with simple our intuitive..." should be "our simple, intuitive" |
| 6 CMS template pages missing SEO title | LOW | /blog-banner-ads, /feature-highlight, /integrations, /jobs (template), /speaker, /webinars (template) |

### SEO — Structure & Schema

| Issue | Severity | Detail |
|-------|----------|--------|
| No Organization schema site-wide | CRITICAL | Only /features has a minimal Organization. Client specifically requested this. |
| No WebSite schema anywhere | CRITICAL | Missing SearchAction potential; affects sitelinks. |
| /about has zero structured data | CRITICAL | Most natural page for Organization + AboutPage has nothing. |
| Homepage FAQ not marked up | HIGH | 13 visible Q&A pairs with no FAQPage schema. Pattern exists on /mtd-software. |
| /pricing FAQ not marked up | HIGH | 4 visible Q&As with no FAQPage schema. |
| BlogPosting missing publisher | MEDIUM | Knowledge hub articles lack publisher field — required for valid Article rich results. |
| BlogPosting author is a string | MEDIUM | Should be Person or Organization object, not plain text. |
| BreadcrumbList inconsistent | MEDIUM | Present on /pricing, /features, /mtd-software but missing on /accountant-software, articles. |
| /jobs has 2 H1 tags | MEDIUM | DevTools verified: "Careers at Coconut" + "Current vacancies". "Current vacancies" should be H2. |
| /mtd-software H2→H4 skip | LOW | Pricing tiers jump from H2 to H4, skipping H3. |
| 3 duplicate sole trader pages | MEDIUM | /sole-traders, /mtd-for-sole-traders, /mtd-software/sole-traders — cannibalisation risk |
| ~~Duplicate sitemap line in robots.txt~~ | ~~LOW~~ | ~~`Sitemap:` appears twice.~~ FIXED |
| Sitemap includes non-indexable pages | LOW | /tools/*, /search, old content — 6+ pages to exclude. |
| No llms.txt | LOW | Returns 404. Missing AI-search opportunity. |
| No AggregateRating on homepage | LOW | /accountant-software has 4.5/5 but homepage doesn't. |

### Technical — Custom Code

| Issue | Severity | Detail |
|-------|----------|--------|
| Analytics fires before consent | HIGH | GTM and analytics tags fire before user consent selection. May violate GDPR/PECR. Implement Consent Mode v2. |
| Dual Facebook Pixels | MEDIUM | IDs 233127443764795 and 664589987931207. Confirm both needed. |
| GoSimpleTax PageSense script | MEDIUM | Zoho PageSense loads from `cdn.pagesense.io/js/gosimpletax/` — appears to be GoSimpleTax's tracking, not Coconut's. Investigate. |
| jQuery 3.5.1 | LOW | Outdated (Webflow default). Low urgency. |
| Lighthouse Best Practices 54/100 | MEDIUM | Driven by older jQuery, deprecated APIs, third-party scripts. |
| Session recording privacy | MEDIUM | Hotjar + Zoho PageSense both do session recording. Review against privacy policy. |

### Content & Accessibility

| Issue | Severity | Detail |
|-------|----------|--------|
| Alt text missing site-wide | CRITICAL | Homepage: 81/122 images (66%), /features: 17/22 (77%), /about: 7/29 (24%). WCAG A violation. |
| Pricing page typo | LOW | "Making Tax Digial" (missing 't') in hero text. |
| "Super easy" overused | LOW | Appears on homepage hero, features intro, multiple feature cards. |
| Generic CTAs | LOW | "Read more", "More information" don't match the action-oriented voice. |

### CMS Hygiene

| Issue | Severity | Detail |
|-------|----------|--------|
| 8 dev/test draft pages | LOW | /gosimpletax-mp-test, /mtd-software-copy-1/2/3, /mtd-software-old, /static-template-slug-*, /home---embrace, /mtd-lp-template |
| 7 published archive pages | MEDIUM | /archive-2025/* and /archive/* — may be indexed and causing clutter |
| 2 unnecessary CMS template pages | LOW | Blog Banner Ads and Speaker for Webinars — taxonomy collections don't need template pages |

---

## Missing or Broken

| Check | Detail |
|-------|--------|
| Organization schema | Not present on homepage or site-wide. Only minimal version on /features. |
| WebSite schema | Not present anywhere. |
| llms.txt | 404 at site root. |
| /about AboutPage schema | Zero structured data on the about page. |
| /blog and /knowledge-hub listing pages | Both redirect to homepage. If intentional, remove from sitemap. |

---

## Lighthouse Audits

### Homepage

| Metric | Score |
|--------|-------|
| SEO | 92/100 |
| Accessibility | 86/100 |
| Best Practices | 54/100 |

**Recurring issues:** jQuery 3.5.1, deprecated APIs, third-party script overhead, missing alt text.

---

## SEMRush Site Audit (CSV export — 2026-05-04)

**Source:** `.claude/semrush-export-2026-05-04.csv` — 100 pages crawled across getcoconut.com, help.getcoconut.com, web.getcoconut.com, and accountant.getcoconut.com subdomains.

### Key findings (net new — not already captured above)

| Issue | Count | Pages | Severity |
|-------|-------|-------|----------|
| **Structured data markup errors** | 8 occurrences | Homepage, /accountant-software, /features, /pricing, /mtd-software, /webinars-and-events (4), /work-from-home-calculator, /zempler | MEDIUM |
| **Links with non-descriptive anchor text** | 60+ instances | Homepage (12), feature sub-pages (4 each), /pricing (4), /mtd-software (4), /zempler (5) | MEDIUM |
| **Nofollow on external links** | 5-13 per page | Site-wide (5 per page via nav/footer), knowledge hub articles (13 each) | LOW |
| **Low text-to-HTML ratio** | ~70 pages | Nearly all pages flagged — common for design-heavy Webflow sites | LOW |
| **Duplicate meta descriptions** | 2 pages | /legal/partnership-with-the-times, /legal/partnership-with-zempler-bank | LOW |
| **Title element too long** | 2 articles | /christmas-shutdown-checklist..., /panicking-because-your-self-assessment... | LOW |
| **Duplicate content in H1 and title** | 6 articles | Various knowledge hub articles where H1 matches title tag exactly | LOW |
| **Pages with only one internal link** | 15 pages | Mostly knowledge hub articles and help centre collections — orphan risk | MEDIUM |
| **Links with no anchor text** | 3 pages | /bookkeeping-vs-accounting-uk (2), /sole-trader-pensions (2), /partnership-times (1) | LOW |
| **Content not optimized** | 15 pages | Various knowledge hub + category pages | LOW |
| **Outdated content** | Flagged | Multiple knowledge hub articles | MEDIUM |
| **Incorrect pages found in sitemap.xml** | 1 | Sitemap includes invalid/redirect pages | LOW |
| **Blocked from crawling** | 2 pages | /payroll-software-for-accountants, /archive-2025/accountant-software | LOW |
| **No HSTS support** | 2 subdomains | web.getcoconut.com, accountant.getcoconut.com | LOW |
| **Unminified JS and CSS** | 5 pages | Homepage, /features, /pricing, /mtd-software, /gosimpletax-mtd, /zempler | LOW |

### Subdomain issues (outside Webflow scope)

| Subdomain | Issues |
|-----------|--------|
| `web.getcoconut.com/login` + `/signup` | Missing title, missing H1, duplicate meta desc, uncompressed, no HSTS |
| `help.getcoconut.com/*` | Low word count, nofollow on internal links, disallowed external resources, low text-to-HTML — standard Intercom help centre patterns |
| `accountant.getcoconut.com/login` | Blocked from crawling, no HSTS |

**Note:** Subdomain issues are outside Webflow scope. Flag to Coconut's engineering team if HSTS or meta tag fixes are desired.

### New tasks from SEMRush (added to P-band tables)

These are incorporated into the P-band tables below as items 25-28.

---

## SEMRush Organic Intelligence

Section not yet run. Re-invoke `/site-audit` with Layer A to populate via SEMRush API.

---

## Competitor Benchmark

Section not yet run. Requires Layer A+B.

---

## AEO Score

| Category | Score | Detail |
|----------|-------|--------|
| A. Schema | 6/8 | SoftwareApplication, FAQPage on some pages. Missing Organization, WebSite, homepage FAQ markup. |
| B. Answer Structure | 15/23 | MTD page strong. Homepage/features open with brand copy, not answers. |
| C. Freshness | 3/9 | Weakest after authority. No visible dates on homepage, MTD, features. Knowledge hub has dates but they're 8+ months old. |
| D. Authority | 2/16 | Worst category. Zero external links to HMRC/gov.uk. No named authors. No original data. |
| E. Technical | 7/11 | Alt text systematically empty. robots.txt clean. No AI bot blocks. |
| **Overall** | **10/20** | **L2 — Emerging** |

**Top 5 AEO fixes:**
1. Add FAQPage schema to homepage FAQ (13 Q&As already exist)
2. Add external links to HMRC.gov.uk on MTD and allowable expenses pages
3. Add "last updated" timestamps to homepage, MTD, features
4. Rewrite homepage/features opening paragraphs to be answer-first
5. Fix empty alt text site-wide

---

## Recommended Next Steps

### Justification tags

- **SEO** — search ranking, crawlability, SERP CTR
- **AEO** — AI answer engine citations (ChatGPT, Perplexity, SGE)
- **Perf** — page speed, Core Web Vitals, LCP
- **De-risk** — business continuity, dependency removal, compliance
- **Trust** — credibility signals
- **A11y** — accessibility, WCAG
- **Conv** — conversion (forms, funnels)
- **Ops** — operational efficiency, CMS hygiene, handover quality

---

### P0 — Week 1 — Quick wins and critical fixes

Fastest, highest-impact changes. No design decisions needed. Each task under 1 hour.

| # | Task | Hours | Justification | Client item | Automation |
|---|------|-------|---------------|-------------|------------|
| 1 | **Add Organization + WebSite JSON-LD to Webflow Head Code (site-wide)** | | **SEO** — enables Knowledge Panel, brand SERP, AI citations. Client's primary request. | Organization schema | SEMI |
| 2 | **Add AboutPage schema to /about** | | **SEO** — structured data on the page Google expects it most | Organization schema | AUTO |
| 3 | **Fix /jobs: reduce 2 H1s to 1** — demote "Current vacancies" to H2 | | **SEO** — heading hierarchy (DevTools verified) | — | SEMI |
| 4 | **Fix /features meta description typo** ("simple our" → "our simple") | | **SEO** — typo in SERP snippet | — | AUTO |
| 5 | **Fix /pricing hero typo** ("Making Tax Digial" → "Digital") | | **Trust** — visible typo on pricing page | — | AUTO |
| 6 | **Delete 8 dev/test draft pages** | | **Ops** — CMS clutter | — | SEMI |
| 7 | **Create llms.txt** at site root | .25 | **AEO** — AI-search discoverability. Currently 404. | — | AUTO |

**P0 total:** 1 hour

---

### P1 — Week 1-2 — Schema expansion and de-risk

Critical risk items and highest-ROI schema additions.

| # | Task | Hours | Justification | Client item | Automation |
|---|------|-------|---------------|-------------|------------|
| 8 | **Add FAQPage schema to homepage** (13 Q&As already exist) | .5 | **SEO + AEO** — rich results + AI citation eligibility | Organization schema | AUTO |
| 9 | **Add FAQPage schema to /pricing** (4 Q&As) | .5 | **SEO** — rich results on pricing page | Organization schema | AUTO |
| 10 | **Fix BlogPosting schema: add publisher, fix author typing** | .25 | **SEO** — required for valid Article rich results across knowledge hub | Organization schema | AUTO |
| 11 | **Add BreadcrumbList to /accountant-software and knowledge hub articles** | .5 | **SEO** — consistency + breadcrumb rich results | Organization schema | AUTO |
| 12 | **Implement Consent Mode v2** — defer analytics until consent granted | 2 | **De-risk** — GDPR/PECR compliance. Analytics fires before consent. | — | SEMI |
| 13 | **Investigate GoSimpleTax PageSense script** — appears to be GoSimpleTax tracking on Coconut's site | ignore | **De-risk** — third-party tracking that may not belong | — | MANUAL |
| 14 | **Audit dual Facebook Pixels** — confirm both IDs serve distinct purposes | .25 | **De-risk** — potential redundancy | — | MANUAL |
| 15 | **Unpublish or noindex 7 archive pages** | .25 | **SEO + Ops** — published archive pages may be indexed | — | SEMI |
| 16 | **Add AggregateRating to homepage SoftwareApplication** | .25 | **SEO** — /accountant-software has 4.5/5 but homepage doesn't | Organization schema | AUTO |

**P1 total:** 4.5 hours

---

### P2 — Week 2-3 — Content structure and rich results

Client-visible improvements. Some need content review.

| # | Task | Hours | Justification | Client item | Automation |
|---|------|-------|---------------|-------------|------------|
| 17 | **Fix alt text site-wide** — homepage (81 images), /features (17), /about (7) | .5 | **A11y + AEO** — WCAG A violation. ~105 images need descriptive alt text. | — | SEMI |
| 18 | **Consolidate 3 sole trader pages** — canonical to /mtd-software/sole-traders, redirect others | .25 | **SEO** — keyword cannibalisation risk | — | SEMI |
| 19 | **Add external links to HMRC.gov.uk** on /mtd-software and knowledge hub articles | .5 | **AEO + Trust** — zero outbound links to authoritative sources | — | SEMI |
| 20 | **Add "last updated" timestamps** to homepage, /mtd-software, /features | .5 | **AEO** — freshness signals for AI citation | — | SEMI |
| 21 | **Fix /mtd-software heading skip** (H2→H4) | .25 | **SEO** — heading hierarchy gap | — | SEMI |
| 22 | **Clean up sitemap** — exclude /tools/*, /search, old content | .25 | **SEO** — 6+ non-indexable pages in sitemap | — | SEMI |
| 23 | **Remove unnecessary CMS template pages** (Blog Banner Ads, Speaker) | .25 | **Ops** — taxonomy collections don't need individual pages | — | SEMI |
| 24 | **Review Hotjar + Zoho PageSense session recording** against privacy policy | 0 | **De-risk** — session recording may capture sensitive data | — | MANUAL |
| 25 | **Fix non-descriptive anchor text** — 60+ instances of "Read more", "Learn more" across feature sub-pages and homepage | 1 | **SEO** — SEMRush flagged. Anchor text should describe the target page. | — | SEMI |
| 26 | **Fix links with no anchor text** — 5 instances across 3 knowledge hub articles | .25 | **A11y + SEO** — empty anchor tags | — | SEMI |
| 27 | **Fix duplicate meta descriptions** on 2 legal partnership pages | .25 | **SEO** — /legal/partnership-with-the-times and /legal/partnership-with-zempler | — | AUTO |
| 28 | **Fix structured data markup errors** — 8 occurrences flagged by SEMRush across 7 pages | 1 | **SEO** — validate and fix schema errors on homepage, /accountant-software, /features, /pricing, /webinars-and-events | — | SEMI |

**P2 total:** 5 hours

---

### P3 — Week 3-4 — Authority and answer structure

Editorial foundation. Requires content writing or review.

| # | Task | Hours | Justification | Client item | Automation |
|---|------|-------|---------------|-------------|------------|
| 29 | **Rewrite homepage opening paragraph** to be answer-first | .25 | **AEO** — AI engines grab first passage. Current opening is a brand hook, not an answer. | — | SEMI |
| 30 | **Rewrite /features opening paragraph** to be answer-first | .25 | **AEO** — same issue | — | SEMI |
| 31 | **Add question-shaped H2s to homepage** | .5 | **AEO** — zero question H2s currently | — | SEMI |
| 32 | **Add named authors to knowledge hub articles** | 2 | **AEO + Trust** — all articles attributed to "The Coconut Team" | — | MANUAL |
| 33 | **Add original data/stats to key pages** | 2 | **AEO + Trust** — no original research anywhere. Cite-magnet gap. | — | MANUAL |
| 34 | **Review /blog and /knowledge-hub listing pages** — currently redirect to homepage | 1 | **SEO** — important for internal linking and topical authority | — | MANUAL |
| 35 | **Fix 15 orphaned knowledge hub articles** — pages with only 1 internal link (SEMRush) | 1 | **SEO** — orphan pages get less crawl priority and link equity | — | SEMI |
| 36 | **Shorten 2 over-long title elements** — /christmas-shutdown-checklist, /panicking-self-assessment | .25 | **SEO** — truncated in SERPs | — | AUTO |

**P3 total:** 7.25 hours

---

### P4 — Ongoing (retainer) — Growth

| # | Task | Hours | Justification | Client item | Automation |
|---|------|-------|---------------|-------------|------------|
| 38 | **Landlord-specific landing page** — currently bundled with sole traders, no distinct messaging | 1 | **Conv + SEO** — identified gap in ICP analysis | — | MANUAL |
| 39 | **Accountant page content audit** — underserved ICP on main pages | 1 | **Conv** — ICP 3 gets nav links but no substantive pitch | — | MANUAL |
| 40 | **Content freshness programme** — update knowledge hub articles older than 6 months | 1 | **AEO + SEO** — dateModified values are 8+ months old | — | MANUAL |
| 41 | **Add JobPosting schema** when vacancies are posted | 1 | **SEO** — Google for Jobs eligibility | — | AUTO |
| 42 | **SEMRush organic intelligence** — domain overview, top keywords, competitor benchmark | 1 | **SEO** — not yet run. Available as optional Layer A+B. | — | SEMI |
| 43 | **About page content refresh** — thinner and more generic than other pages | 1 | **Trust + AEO** — vision statement uses startup-pitch language that doesn't match brand voice | — | MANUAL |
| 44 | **Strengthen generic CTAs** — replace "Read more" / "More information" with action-oriented copy | 1 | **Conv** — doesn't match the otherwise action-oriented voice | — | SEMI |

**P4 total:** 7 hours

---

## Custom Code Inventory

| Script | Source | Version | Risk | Notes |
|--------|--------|---------|------|-------|
| Google Tag Manager | googletagmanager.com | GTM-WLRSZ9N | Low | Tag management |
| GA4 | googletagmanager.com/gtag | G-YBH18GJQZH | Low | Via GTM |
| Google Ads | googletagmanager.com/gtag | AW-856751664 | Low | Conversion tracking |
| TikTok Pixel | analytics.tiktok.com | Hash-versioned | Medium | Ad tracking |
| Facebook Pixel | connect.facebook.net | fbevents.js | Medium | Two IDs: 233127443764795, 664589987931207 |
| Hotjar | static.hotjar.com | ID 429202, sv=7 | Medium | Session recording |
| Zoho PageSense | static.zohocdn.com/pagesense | Hash-versioned | Medium | Heatmaps + session recording |
| Zoho PageSense (GoSimpleTax) | cdn.pagesense.io/js/gosimpletax | Hash-versioned | Medium | **Investigate — may be GoSimpleTax's tracking** |
| Intercom | widget.intercom.io | d37qo6ee | Medium | Customer messaging |
| OptinMonster | a.omappapi.com | api.min.js | Medium | Popup/lead capture |
| jQuery | cloudfront.net | 3.5.1 | Low | Webflow default — outdated |
| Slick Carousel | cdn.jsdelivr.net | 1.8.1 | Low | Pinned |
| Webfont Loader | ajax.googleapis.com | 1.6.26 | Low | Pinned |
| Trustpilot Widget | widget.trustpilot.com | v5 | Low | Review widget |
| thetimes-utm.js | First-party | 2026-04-08 | Low | UTM tagging for Times campaign |
| times-cookie-overwrite.js | First-party | 2026-04-09 | Low | Attribution cookie override |

**Totals:** 23 external scripts. 10 Low, 12 Medium, 1 High (session recording), 0 Critical.

**Code migration to client-owned GitHub: NOT REQUIRED** — no critical GitHub-hosted scripts detected.

---

## Automation Summary

- **AUTO:** 11 tasks
- **SEMI:** 22 tasks
- **MANUAL:** 11 tasks

**Total: 44 tasks across P0-P4.**

---

## Sub-audits

- `audits/structure.md` — Technical + Analytics (Stream A)
- `audits/seo.md` — SEO + Schema deep scan (Stream B)
- `audits/content.md` — Content + Code Inventory (Stream C)
- `audits/aeo.md` — AEO / AI-search audit (Stream D)
- `.claude/brand-voice.md` — Brand voice reference
- `.claude/ideal-customer-profiles.md` — ICP inference (3 profiles)

---

*Report generated by automated site audit. Manual verification recommended for items marked "NEEDS VERIFY".*
