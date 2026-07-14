# NEM Life — Site Remediation Plan

**Slug:** `nem-life-remediation`
**Date:** 2026-05-07
**Source:** `reports/intake-report-2026-05-07.md` (70 tasks across P0-P4)
**Status:** Planning

---

## Overview

Phased remediation of the NEM Life Webflow site based on the full site audit.
68 remaining tasks (2 done: robots.txt #26, llms.txt #54, aria-label mismatch #3).
Organised into 5 execution phases, each with clear deliverables and acceptance tests.

**Barba Impact:** N/A — no Barba transitions.

---

## Phase 1 — SEO Metadata Blitz (MCP-automatable)

**Goal:** Fix all missing/broken SEO titles, meta descriptions, and OG settings via Webflow MCP API calls.
**Method:** `update_page_settings` on each page. No Designer access needed.
**Estimated time:** 15 minutes (all API calls).

### Tasks

| # | Task | Method |
|---|------|--------|
| 4 | Set Home SEO title | MCP `update_page_settings` |
| 5 | Set Home meta description | MCP `update_page_settings` |
| 6 | Set Inzichten SEO title (Dutch) | MCP `update_page_settings` |
| 7 | Set Ervaringen SEO title (Dutch) | MCP `update_page_settings` |
| 8 | Set Voorwaarden SEO title + brand suffix | MCP `update_page_settings` |
| 9 | Set Voorwaarden meta description | MCP `update_page_settings` |
| 10 | Fix page title "NEMLife.com NEW" → "NEM Life" | MCP `update_page_settings` |
| 6b | Set Inzichten meta description | MCP `update_page_settings` |
| 7b | Set Ervaringen meta description | MCP `update_page_settings` |

### Acceptance Tests — Phase 1

```
test('Home has Dutch SEO title')
  → navigate to /, check document.title contains "NEM Life"
  → check meta[name="description"] is not empty

test('Inzichten has Dutch SEO title')
  → navigate to /inzichten, check document.title contains "Inzichten"
  → check document.title does NOT contain "Blog Insights"

test('Ervaringen has Dutch SEO title')
  → navigate to /ervaringen, check document.title contains "Ervaringen"
  → check document.title does NOT contain "Testimonials"

test('Voorwaarden has brand suffix')
  → navigate to /voorwaarden, check document.title contains "NEM Life"
  → check meta[name="description"] is not empty

test('All published pages have meta descriptions')
  → for each of [/, /nem-methode, /missie-nem-life, /inzichten, /ervaringen,
     /link-in-bio/christel, /voorwaarden]:
     check meta[name="description"].content.length > 20
```

### Verify Loop

**Pass/fail:** Every published static page has a non-empty SEO title containing "NEM Life" or a Dutch keyword, and a meta description > 20 chars. No English-only titles remain.

**Reproduction:** Navigate to each page, inspect `<title>` and `<meta name="description">`.

**Regression:** No visual changes. Only `<head>` metadata affected.

---

## Phase 2 — Schema Deployment

**Goal:** Deploy all prepared JSON-LD schemas to Webflow.
**Method:** Paste into Page Settings > Schema markup field (static pages) and CMS template Schema markup field (CMS templates). Sitewide schema goes in Site Settings > Custom Code > Head Code.
**Prerequisite:** Fill FILL_IN placeholders in sitewide schema (logo URL, founding date, social URLs, contact email).
**Estimated time:** 30 minutes (manual paste into Webflow Designer).

### Tasks

| # | Task | Placement |
|---|------|-----------|
| 13 | Deploy sitewide JSON-LD (Organization + WebSite) | Site Settings > Custom Code > Head Code |
| 14 | Deploy Home FAQPage schema | Home > Page Settings > Schema markup |
| 15 | Deploy NEM Methode HowTo + FAQPage | NEM Methode > Page Settings > Schema markup |
| 16 | Deploy Missie AboutPage schema | Missie > Page Settings > Schema markup |
| 17 | Deploy Christel Person schema | Christel > Page Settings > Schema markup |
| 18 | Deploy Blog Article schema (CMS bindings) | Insights template > Page Settings > Schema markup |
| 19 | Deploy Testimonial Review schema (CMS bindings) | Testimonials template > Page Settings > Schema markup |
| 60 | Deploy BreadcrumbList schema | Inner pages > Page Settings > Schema markup |
| 66 | Fill FILL_IN fields in schemas | Before deploying — logo URL, founding date, social URLs, email |

### Acceptance Tests — Phase 2

```
test('Homepage has Organization JSON-LD')
  → navigate to /, query script[type="application/ld+json"]
  → parse JSON, check @type includes "Organization"
  → check name === "NEM Life"

test('Homepage has WebSite JSON-LD')
  → check @type includes "WebSite"

test('Homepage has FAQPage JSON-LD')
  → check one script has @type "FAQPage"

test('NEM Methode has HowTo JSON-LD')
  → navigate to /nem-methode
  → check script[type="application/ld+json"] contains @type "HowTo"

test('Blog article has Article JSON-LD')
  → navigate to /inzichten/de-kracht-van-ondersteuning
  → check @type "Article", headline is not empty, datePublished exists

test('Testimonial has Review JSON-LD')
  → navigate to /ervaringen/dexter
  → check @type includes "Review" or "CreativeWork"

test('No JSON-LD syntax errors')
  → for each page, parse all script[type="application/ld+json"]
  → JSON.parse must not throw

test('Google Rich Results validator')
  → manual: test each page at https://search.google.com/test/rich-results
```

### Verify Loop

**Pass/fail:** Every page has at least one valid JSON-LD script. Homepage has Organization + WebSite + FAQPage. CMS template pages have dynamic fields populated (not "CMS_FIELD_*" placeholders).

**Reproduction:** Navigate to each page, inspect `document.querySelectorAll('script[type="application/ld+json"]')`.

**Regression:** No visual changes. Head-only additions.

---

## Phase 3 — Accessibility + Heading Structure

**Goal:** Fix all Lighthouse accessibility issues and heading hierarchy problems.
**Method:** Mix of Webflow Designer (element attributes, heading levels) and MCP where possible.
**Estimated time:** 1-2 hours.

### Tasks

| # | Task | Method |
|---|------|--------|
| 1 | Add `aria-label="Terug naar boven"` to back-to-top link | Designer: custom attribute |
| 2 | Add `aria-label="Menu"` to mobile hamburger | Designer: custom attribute |
| 20 | Fix Missie: single Dutch H1 | Designer: change heading levels + text |
| 21 | Fix Inzichten H1 to Dutch | Designer: change H1 text |
| 22 | Fix Ervaringen H1 to Dutch | Designer: change H1 text |
| 23 | Fix Christel: promote name to H1 | Designer: change heading level |
| 24 | Fix Voorwaarden: add Dutch H1, translate heading | Designer: change heading + text |
| 32 | Fix color contrast (WCAG AA) | Designer: adjust text/background colours |
| 33 | Fix duplicate H2 on Home | Designer: remove or differentiate duplicate |
| 34 | Fix duplicate H2s on NEM Methode | Designer: remove or differentiate |
| 35 | Demote body-copy H2 on NEM Methode | Designer: change to paragraph or H3 |
| 40 | Fix heading order skip on blog template | Designer: adjust heading levels |
| 41 | Fix Swiper pagination dot touch targets | Designer: increase size |
| 43 | Add alt text to 19 images | Designer: set alt text per image |
| 49 | Bind blog template H1 to CMS title | Designer: bind heading to CMS field |

### Acceptance Tests — Phase 3

```
test('Back-to-top has aria-label')
  → check .back-to-top has aria-label="Terug naar boven"

test('Mobile menu button has aria-label')
  → resize to 478px, check navbar menu button has aria-label

test('Each page has exactly one H1')
  → for each static page: count h1 elements === 1

test('No English H1s on Dutch pages')
  → for [/inzichten, /ervaringen, /missie-nem-life, /voorwaarden]:
     h1.textContent should not match /^(From|In a|We break|Terms)/

test('Heading hierarchy has no jumps')
  → for each page: collect all h1-h6 tags
  → verify no level is skipped (h1→h3 without h2)

test('No images missing alt attribute')
  → for each page: querySelectorAll('img:not([alt])')
  → count === 0 (decorative images should have alt="")

test('axe-core accessibility audit')
  → run axe.run() on each page
  → no "critical" or "serious" violations

test('Color contrast passes')
  → axe-core covers this via color-contrast rule
```

### Verify Loop

**Pass/fail:** Every page has exactly 1 H1 in Dutch. No heading level jumps. Zero images without `alt`. axe-core reports no critical/serious violations. aria-labels present on back-to-top and mobile menu.

**Reproduction:** Navigate to each page, run the heading/alt/axe checks. Resize to 478px for mobile menu test.

**Regression:** Visual changes to heading text and possibly colour palette. Verify no layout breaks.

---

## Phase 4 — Content + CMS + Operational

**Goal:** Wire up CMS, fix navigation, populate editorial foundation.
**Method:** Webflow Designer + CMS Manager. Some items need client input (content, images).
**Estimated time:** 3-5 hours (heavily dependent on client content delivery).

### Tasks

| # | Task | Owner |
|---|------|-------|
| 11 | Rename "Inzichtens" → "Inzichten" | Developer (Designer) |
| 12 | Fix Tags field — add missing options | Developer (Designer) |
| 25 | Configure CMS SEO fields for blog template | Developer (Designer) |
| 28 | Set up custom 404 page | Developer (Designer) |
| 29 | Create + upload default OG image (1200x630px) | Client provides design / Developer creates |
| 30 | Set page-specific OG images | Client provides / Developer sets |
| 31 | Bind blog OG image to CMS Main Image | Developer (Designer) |
| 37 | Wire testimonials template (designer comment) | Developer (Designer) |
| 38 | Reduce Google Fonts to used weights only | Developer (Designer) |
| 39 | Add Swiper CLS-prevention CSS | Developer (code) |
| 42 | Replace default favicon with NEM Life branding | Client provides / Developer sets |
| 44 | Populate CMS with real Dutch content | Client provides copy |
| 45 | Wire up navigation and footer links | Developer (Designer) |
| 46 | Remove/hide unnecessary taxonomy templates | Developer (Designer) |
| 47 | Configure blog meta descriptions per article | Client provides / Developer binds |
| 48 | Add publication/update timestamps | Developer (Designer) |
| 50 | Configure testimonial template SEO fields | Developer (Designer) |
| 51 | Review and document 4 inline scripts | Developer |
| 36 | Verify Voorwaarden content sections belong | Client confirms |

### Acceptance Tests — Phase 4

```
test('CMS collection named correctly')
  → Webflow MCP: get_collection_list, check no collection named "Inzichtens"

test('Navigation links are not # placeholders')
  → for each page: querySelectorAll('nav a[href="#"]')
  → count === 0

test('Footer links resolve (no 404)')
  → collect all footer a[href], fetch each
  → all return 200 or 301

test('Blog articles have meta descriptions')
  → navigate to /inzichten/de-kracht-van-ondersteuning
  → check meta[name="description"] is not empty

test('Blog articles have publication dates visible')
  → check page contains a date element or time tag

test('OG image is set on homepage')
  → check meta[property="og:image"] is not empty

test('Favicon is not default Webflow')
  → check link[rel="icon"] href does NOT contain "website-files.com/img/favicon.ico"

test('Swiper CLS prevention CSS applied')
  → check computed style of .swiper:not(.swiper-initialized) .swiper-slide:not(:first-child)
  → display === "none"

test('No console errors on key pages')
  → for [/, /nem-methode, /inzichten, /ervaringen]:
     collect console.error events → count === 0
```

### Verify Loop

**Pass/fail:** No `#` links in nav/footer. CMS collection renamed. Blog articles have dates + meta descriptions. OG image present on homepage. No console errors. Favicon is custom.

**Reproduction:** Navigate site, click all nav links, check CMS articles, inspect `<head>`.

**Regression:** Navigation changes affect all pages. Test Swiper still initialises after CSS addition. Verify Google Fonts still load correctly after weight subsetting.

---

## Phase 5 — Growth + Launch Prep (Retainer)

**Goal:** AEO remediation, analytics, author authority, and launch-day tasks.
**Method:** Mix of Developer work, client input, and third-party setup.
**Estimated time:** Ongoing / retainer.

### Tasks

| # | Task | Owner |
|---|------|-------|
| 27 | Migrate custom code to client-owned GitHub | Developer + Client (create repo) |
| 55 | Set up GA4/GTM + cookie consent | Developer |
| 56 | AEO: restructure FAQ to answer-first format | Developer (Designer) |
| 57 | AEO: promote FAQ headings H3 → H2 | Developer (Designer) |
| 58 | Add author bylines + credentials | Developer + Client (credentials copy) |
| 59 | Add external citations to NEM Method | Client provides research |
| 61 | Enable English locale when ready | Developer + Client |
| 62 | Monitor CLS in Search Console | Developer (post-launch) |
| 63 | Submit sitemap to Google Search Console | Developer |
| 64 | Convert statement headings to question format | Developer (Designer) |
| 65 | Add social proof signals | Developer + Client (logos, quotes) |
| 67 | Verify canonicals point to nemlife.com | Developer (at domain connection) |
| 68 | 301 redirect from TEMP to NEW project | Developer (at domain connection) |
| 52 | Verify mobile layouts match design | Developer |
| 53 | Verify boolean curation switches wired | Developer |
| 69 | Consider restructuring Key insights CMS fields | Developer |
| 70 | Shorten overly long H2 on NEM Methode | Developer (Designer) |

### Acceptance Tests — Phase 5

```
test('Cookie consent banner appears')
  → navigate to /, check for consent banner element
  → verify analytics scripts do NOT fire before consent

test('GA4 is installed')
  → check for gtag or GTM script in page source

test('FAQ sections use H2 headings')
  → navigate to / and /nem-methode
  → FAQ question elements should be h2, not h3

test('Author byline present on blog articles')
  → navigate to a blog article
  → check for text containing "Christel Reus"

test('Custom code loads from client GitHub')
  → check script[src] does NOT contain "studiozissou"
  → check script[src] contains client org name

test('Canonical points to nemlife.com')
  → check link[rel="canonical"] href starts with "https://nemlife.com"

test('AEO score improved')
  → manual: re-run /site-audit AEO stream
  → target: ≥ 13/20 (B grade)
```

### Verify Loop

**Pass/fail:** Analytics fires after consent. FAQ headings are H2. Author bylines visible. Custom code served from client repo. Canonicals correct.

**Reproduction:** Full site walkthrough post-launch. Re-run Lighthouse + AEO audit.

**Regression:** FAQ heading changes may affect styling (check CSS selectors targeting h3). Code migration changes all script URLs (full regression test needed).

---

## Parallelisation Map

| Phase | Streams | Can parallelise? | Notes |
|-------|---------|-----------------|-------|
| 1 | Single stream | No — sequential MCP calls | Fast (~15 min), not worth parallelising |
| 2 | 2 streams | Yes | Stream A: static page schemas (13-17, 60). Stream B: CMS template schemas (18-19). Independent. |
| 3 | 3 streams | Yes | Stream A: aria-labels + heading fixes (1-2, 20-24). Stream B: alt text (43). Stream C: color contrast audit (32). All touch different elements. |
| 4 | 2 streams | Partial | Stream A: CMS/Designer fixes (11, 12, 25, 37, 39, 46). Stream B: client-dependent (29, 30, 42, 44). Stream B blocks on client delivery. |
| 5 | Not parallelisable | No | Sequential dependencies: analytics before consent check, code migration before URL verification. |

---

## Execution Order

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5
  (MCP)      (paste)    (Designer)   (CMS+ops)   (retainer)
  15 min     30 min     1-2 hrs      3-5 hrs      ongoing
```

Phase 1 can start immediately — no blockers.
Phase 2 blocks on FILL_IN values (logo URL, founding date, social URLs, email).
Phase 3 blocks on Phase 1 (heading content depends on SEO titles being set).
Phase 4 blocks on client content delivery for CMS population.
Phase 5 blocks on domain connection for canonicals/redirects.

---

## Test Plan Summary

### Tier 1 — Auto: Playwright local

All tests in `tests/acceptance/nem-life-remediation.spec.js`:
- Phase 1: 5 tests (SEO titles + meta descriptions)
- Phase 2: 7 tests (JSON-LD presence + validity)
- Phase 3: 8 tests (headings, alt text, aria-labels, axe-core)
- Phase 4: 9 tests (nav links, CMS, OG, favicon, console errors)
- Phase 5: 7 tests (analytics, consent, FAQ headings, bylines, canonicals)

### Tier 2 — Auto: CDN regression

Register in `tests/registry.json` after each phase completes.
On `/deploy`, run all registered tests against live jsDelivr URLs.

### Tier 3 — Manual

| Check | Phase | Why manual |
|-------|-------|-----------|
| Google Rich Results validator | 2 | External tool, requires published site |
| Color contrast visual check | 3 | Subjective — axe catches measurable violations but designer should verify aesthetics |
| Mobile layout match to Figma | 4 | Visual comparison, no automated baseline |
| CMS content quality review | 4 | Editorial judgment |
| AEO score re-audit | 5 | Requires full `/site-audit` re-run |
| Cross-browser (Safari, Firefox) | 5 | Playwright runs Chromium only |
