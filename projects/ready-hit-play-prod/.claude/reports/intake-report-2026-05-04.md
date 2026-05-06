# Site Intake Report — Ready Hit Play

**Date:** 2026-05-04 | **Staging URL:** https://rhpcircle.webflow.io/ | **Live URL:** https://www.readyhitplay.com/ (launching 2026-05-05)

## Summary

Ready Hit Play is a creative branding agency in Amsterdam serving tech and fashion multinationals. The site is a high-craft, animation-heavy portfolio with Barba.js SPA transitions, GSAP-driven motion, and video-centric case studies. The design and interaction quality is exceptional — the site itself functions as a showreel.

The material issues are operational rather than creative: all 20+ production scripts are hosted on a third-party GitHub account (single point of failure), Barba.js is loaded without a version pin, GSAP loads in duplicate versions (3.14.2 + 3.15.0), and basic SEO metadata is incomplete across multiple pages. The heading hierarchy uses multiple H1 tags per page, and no OG images are set for social sharing.

**Verdict:** The site is visually exceptional and functionally solid. The launch-blocking issues are all quick fixes (robots.txt, sitemap, OG tags). The code hosting risk is the single most important item to address post-launch.

---

## Passing

| Check | Status | Notes |
|-------|--------|-------|
| SSL/HTTPS | PASS | Served over HTTPS |
| Favicon | PASS | Custom 32x32 favicon set |
| Mobile viewport | PASS | `width=device-width, initial-scale=1` |
| Homepage meta description | PASS | 131 chars, well-written |
| Homepage title | PASS | "Ready Hit Play — Creative Studio, Amsterdam" (43 chars) |
| OG title + description (homepage) | PASS | Set correctly |
| JSON-LD Organization schema | PASS | Full: name, logo, founders, address, sameAs, knowsAbout |
| JSON-LD WebSite schema | PASS | Present on homepage |
| JSON-LD CreativeWork (case studies) | PASS | With Review + BreadcrumbList |
| AboutPage schema | PASS | With mainEntity + BreadcrumbList |
| Zero console errors | PASS | No JS errors on any page |
| Zero failed network requests | PASS | All 73 requests succeed |
| `lang="en"` on HTML | PASS | Correct |
| No dev/test pages published | PASS | None detected |
| CMS hygiene | PASS | No typos, no orphan items |
| Lighthouse Accessibility | PASS | 89-91 across pages |

---

## Needs Attention

### SEO — Meta & Open Graph

| Issue | Severity | Pages | Detail |
|-------|----------|-------|--------|
| No OG image | HIGH | All pages | Social shares have no preview image |
| About page title is "About" | HIGH | /about | No brand context — should be "About Ready Hit Play" |
| Privacy Policy missing meta description | MEDIUM | /privacy-policy | No description set |
| About page OG title is "About" | MEDIUM | /about | Inherits poor page title |

### SEO — Structure & Schema

| Issue | Severity | Pages | Detail |
|-------|----------|-------|--------|
| Multiple H1 tags | HIGH | All pages | Homepage: 2+, About: 3-4, Case studies: 4 |
| Duplicate WebSite schema | MEDIUM | All pages | Site-wide head + page-specific = double |
| Duplicate viewport meta | LOW | All pages | Two viewport tags (Webflow + custom code) |
| Review schema author format | LOW | Case studies | Em dash in author name string |
| No Person schema | LOW | /about | Founders have bios but no Person markup |

### Technical — Custom Code

| Issue | Severity | Detail |
|-------|----------|--------|
| All code on third-party GitHub | CRITICAL | 20+ scripts on `studiozissou/webflow-scripts` — SPOF |
| Barba.js unpinned version | CRITICAL | `unpkg.com/@barba/core` — no version specified |
| GSAP dual-version conflict | HIGH | 3.14.2 (custom) + 3.15.0 (Webflow IX2) both load |
| CSS loaded twice | MEDIUM | `ready-hit-play.css` loads with `?v=1` and `?v=2026.5.4.2` |
| No analytics | HIGH | No GA4, GTM, or any tracking detected |
| No cookie consent | MEDIUM | GDPR required (NL-based business) |

### Content & Accessibility

| Issue | Severity | Detail |
|-------|----------|--------|
| 6/6 homepage images missing alt text | HIGH | All case study thumbnails |
| No OG images for social sharing | HIGH | Portfolio pages can't preview on social |
| No forms detected | NOTE | Contact is pullout panel (by design) |

---

## Missing or Broken

| Check | Detail |
|-------|--------|
| sitemap.xml | 404 — not generated. Enable in Webflow SEO settings. |
| robots.txt | `Disallow: /` — blocks all crawlers. Expected on staging; must change at launch. |
| llms.txt | Not present. Recommended for AI-search discoverability. |
| Analytics | No GA4/GTM anywhere on site. |
| Cookie consent | No banner/mechanism detected. GDPR required. |
| OG images | Not set on any page. |

---

## Lighthouse Audits

| Page | Device | Accessibility | Best Practices | SEO |
|------|--------|---------------|----------------|-----|
| Homepage | Desktop | 90 | 77 | 63 |
| Homepage | Mobile | 91 | 77 | 63 |
| About | Desktop | 89 | 77 | 66 |

**Recurring issues:**
- SEO score dragged down by missing meta tags + robots.txt block
- Best Practices at 77 likely due to duplicate scripts, missing CSP headers
- Accessibility at 89-91 due to missing alt text + nav logo as `<div>` not `<a>`

---

## SEMRush Organic Intelligence

Section not yet run. Re-invoke `/site-audit` with Layer A to populate.

---

## Competitor Benchmark

Section not yet run. Requires Layer A+B.

---

## AEO Score

| Category | Score | Detail |
|----------|-------|--------|
| A — Schema (A1-A4) | 2/4 | Organization + WebSite present; no FAQ/HowTo/BreadcrumbList on homepage |
| B — Answer Structure (B5-B10) | 0.5/6 | No answer-first paragraphs, no question headings, minimal body copy |
| C — Freshness (C11-C13) | 0/3 | No timestamps, no "last updated", no freshness signals |
| D — Authority (D14-D17) | 1/4 | Founder names in schema; no original data, no citations, no cite-magnets |
| E — Technical (E18-E20) | 1/3 | Internal links present; alt text missing; robots.txt blocks AI bots |
| **Overall** | **4.5/20** | **L1 — Invisible** |

The site's cinematic copy is emotionally powerful but structurally invisible to AI engines. No extractable definition paragraphs, no question-answer patterns, no FAQ blocks.

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

### P0 — Launch day — Critical pre-launch fixes

These must be done before or immediately at launch. All are under 30 minutes.

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 1 | **Enable sitemap.xml in Webflow SEO settings** | TBD | **SEO** — Google can't discover pages without it | — | SEMI |
| 2 | **Allow crawling on production domain** (flip robots.txt) | TBD | **SEO** — site is invisible to all search engines | — | SEMI |
| 3 | **Set OG image on homepage** (1200x630 brand card) | TBD | **Trust** — social shares show blank preview | — | MANUAL |
| 4 | **Update About page title** to "About Ready Hit Play — Who We Are" | TBD | **SEO** — current title is just "About" | — | SEMI |
| 5 | **Remove duplicate WebSite schema** from site-wide head code | TBD | **SEO** — duplicate structured data confuses validators | — | SEMI |
| 6 | **Pin Barba.js version** in unpkg URL | TBD | **De-risk** — unpinned dep can break entire site | — | AUTO |

**P0 total: TBD hours.**

---

### P1 — Week 1 — Foundation + de-risk

High-impact items that protect the investment and unlock search visibility.

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 1 | **Install GA4/GTM** in Webflow project settings | TBD | **Ops** — zero data from launch day otherwise | — | SEMI |
| 2 | **Add alt text to all 6+ images** (CMS + static) | TBD | **A11y** — 100% of images missing alt text | — | SEMI |
| 3 | **Fix H1 hierarchy** — 1 per page, demote extras to H2/styled div | TBD | **SEO** — diluted topical focus on every page | — | SEMI |
| 4 | **Resolve GSAP 3.14.2 / 3.15.0 dual-load** | TBD | **Perf** — ~60KB duplicate payload + conflict risk | — | SEMI |
| 5 | **Remove duplicate CSS load** (ready-hit-play.css) | TBD | **Perf** — unnecessary network request | — | AUTO |
| 6 | **Set OG images on About + all case studies** | TBD | **Trust** — portfolio pages can't be shared socially | — | MANUAL |
| 7 | **Add cookie consent banner** (GDPR) | TBD | **De-risk** — legally required for NL-based business | — | SEMI |
| 8 | **Set meta description on Privacy Policy** | TBD | **SEO** — missing metadata | — | SEMI |
| 9 | **Remove duplicate viewport meta** from head custom code | TBD | **Ops** — unnecessary duplicate tag | — | AUTO |
| 10 | **Fix Review schema author format** (remove em dash) | TBD | **SEO** — malformed structured data | — | AUTO |

**P1 total: TBD hours.**

---

### P2 — Week 2 — Code migration + sustainability

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 1 | **Migrate all custom code to client-owned GitHub** | TBD | **De-risk** — SPOF on third-party account | — | SEMI |
| 2 | **Set up jsDelivr from owned repo** with tagged releases | TBD | **De-risk** — version control + deployment pipeline | — | SEMI |
| 3 | **Add Person schema for founders** on About page | TBD | **SEO** — enable Knowledge Panel for Ryan + Guy | — | AUTO |
| 4 | **Add LocalBusiness schema** to homepage | TBD | **SEO** — enable Google Maps / Knowledge Panel | — | AUTO |
| 5 | **Add datePublished to CreativeWork** schemas | TBD | **SEO** — freshness signal for case studies | — | AUTO |
| 6 | **Consolidate schemas to single @graph** per page | TBD | **Ops** — cleaner, easier to maintain | — | AUTO |
| 7 | **Verify canonical tags** point to `www.readyhitplay.com` | TBD | **SEO** — staging URLs must not leak | — | SEMI |
| 8 | **Verify /work URL** resolves (referenced in breadcrumbs) | TBD | **SEO** — broken breadcrumb reference | — | SEMI |

**P2 total: TBD hours.**

---

### P3 — Week 3 — Visibility + AEO foundation

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 1 | **Add extractable definition paragraphs** to homepage + about | TBD | **AEO** — AI engines can't extract any answers currently | — | SEMI |
| 2 | **Create llms.txt** at site root | TBD | **AEO** — discoverability for LLM crawlers | — | AUTO |
| 3 | **Ensure production robots.txt allows AI bots** (GPTBot, ClaudeBot) | TBD | **AEO** — currently blocked | — | SEMI |
| 4 | **Add BreadcrumbList schema to homepage** | TBD | **SEO** — only page without breadcrumbs | — | AUTO |
| 5 | **Convert nav logo from `<div>` to Link Block** in Webflow | TBD | **A11y** — keyboard/screen reader accessible navigation | — | MANUAL |

**P3 total: TBD hours.**

---

### P4 — Ongoing (retainer) — Growth + content

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 1 | **Add FAQ content block** to About or new page | TBD | **AEO** — zero question-answer content for AI engines | — | SEMI |
| 2 | **Create cite-magnet page** (methodology/philosophy) | TBD | **AEO** — no original data or quotable content | — | MANUAL |
| 3 | **Add case study freshness signals** (visible dates) | TBD | **AEO** — no timestamps anywhere on site | — | SEMI |
| 4 | **Build CDN fallback system** in init.js | TBD | **De-risk** — secondary CDN if jsDelivr fails | — | AUTO |
| 5 | **Performance audit + optimization** (video loading, LCP) | TBD | **Perf** — heavy video payload, estimated LCP issues | — | SEMI |

**P4 total: TBD hours.**

---

## Custom Code Inventory

| Script | Source | Version | Risk |
|--------|--------|---------|------|
| GSAP Core | cdn.prod.website-files.com | 3.15.0 + 3.14.2 | HIGH (duplicate) |
| GSAP ScrollTrigger | cdn.prod.website-files.com | 3.15.0 + 3.14.2 | HIGH (duplicate) |
| GSAP SplitText | cdn.prod.website-files.com | 3.15.0 + 3.14.2 | HIGH (duplicate) |
| GSAP Flip | cdn.prod + cdn.jsdelivr | 3.15.0 + 3.14.2 | HIGH (duplicate) |
| GSAP ScrambleText | cdn.prod.website-files.com | 3.15.0 + 3.14.2 | HIGH (duplicate) |
| GSAP ScrollSmoother | cdn.prod.website-files.com | 3.15.0 | MEDIUM |
| Barba.js | unpkg.com/@barba/core | **UNPINNED** | CRITICAL |
| Lenis | unpkg.com/lenis | 1.3.17 | LOW |
| lottie-web | cdn.jsdelivr.net | 5.12.2 | LOW |
| jQuery | d3e54v103j8qbb.cloudfront.net | 3.5.1 | LOW |
| 20+ custom modules | cdn.jsdelivr.net/gh/studiozissou | @203194b | CRITICAL (third-party) |

---

## Custom Code Migration Plan

All 20+ production scripts are hosted on `cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@203194b`. This is a single point of failure — if the studiozissou GitHub account is suspended, the repo deleted, or jsDelivr has an outage, the entire site's interactivity goes offline.

### Target repo structure
```
readyhitplay/rhp-webflow/
├── src/           ← source modules
├── dist/          ← production (if build step added later)
├── vendor/        ← vendored Barba, Lenis
└── package.json
```

### CDN pattern
```
cdn.jsdelivr.net/gh/readyhitplay/rhp-webflow@v1.0.0/src/init.js
```

### Rules
- Production: always pinned to tagged release (`@v1.0.0`), never `@latest`
- Staging: can use `@main`
- Purge: `https://purge.jsdelivr.net/gh/readyhitplay/rhp-webflow@v1.0.0/src/init.js`

---

## Automation Summary

- **AUTO:** 7 tasks — can be executed immediately
- **SEMI:** 18 tasks — need user input or Webflow Designer access
- **MANUAL:** 4 tasks — require human design decisions or external tools

---

## Sub-audits

- [audits/structure.md](audits/structure.md) — Technical + Lighthouse
- [audits/seo.md](audits/seo.md) — SEO + Schema
- [audits/content.md](audits/content.md) — Content + Code Inventory
- [audits/aeo.md](audits/aeo.md) — AEO (AI Answer Engine Optimisation)
- [brand-voice.md](../brand-voice.md) — Brand Voice
- [ideal-customer-profiles.md](../ideal-customer-profiles.md) — Ideal Customer Profiles

---

*Report generated by automated site audit. Manual verification recommended for items marked "NEEDS VERIFY".*
