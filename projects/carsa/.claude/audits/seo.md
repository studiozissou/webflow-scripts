# Carsa.co.uk SEO Audit
**Audit Date:** 2026-05-04
**Scope:** Homepage, /used-cars, /car-finance, /stores, /blog, /contact, /faq, /about/carsa, vehicle detail pages

---

## Summary Table

| Check | Status | Notes |
|-------|--------|-------|
| Meta titles | PASS | Present on all pages; /car-finance (65 chars) and VDPs (98 chars) too long |
| Meta descriptions | PASS | Rendering correctly on all pages checked; /value-car duplicates /part-exchange |
| OG tags | PASS | og:title, og:description, og:image present sitewide |
| Canonical tags | PASS | Present and correct on all pages checked |
| H1 tags | WARNING | 1 real H1 per page + sitewide "Chat with Caroline AI" chatbot H1; /reserve has no real H1 |
| Heading hierarchy | PASS | No major jumps detected (H1-H2-H3 flows correctly) |
| Schema.org JSON-LD | IN PROGRESS | Product schema live on vehicle pages; sitewide being implemented |
| Sitemap | PASS | ~1,100+ URLs in single sitemap.xml |
| llms.txt | FAIL | Not present (URL soft-redirects to about page) |
| Hreflang | PASS | No conflicting tags; single-locale English site |
| Internal linking | PASS | Key pages well-linked from nav and homepage |

---

## Detailed Findings

### 1. Meta Titles

| Page | Title | Length | Status |
|------|-------|--------|--------|
| Homepage | "Carsa -- Modern, Hassle-Free Used Car Buying UK" | 49 chars | OK |
| /used-cars | "Used cars for sale or on finance \| Carsa" | 41 chars | OK |
| /car-finance | "Car Finance \| Free Finance Eligibility Checker \| PCP & HP - Carsa" | 67 chars | WARNING - truncates |
| /stores | "Find Your Nearest Carsa Store \| Nationwide Used Car Locations" | 62 chars | WARNING - slightly long |
| /blog | "Carsa Blog \| Insights & Advice for Car Buyers" | 47 chars | OK |
| /contact | Not rendered in HTML | — | FAIL |
| /faq | "Used Cars FAQ \| Answers to Common Questions from Carsa" | 55 chars | OK |
| /about/carsa | "About Carsa \| Trusted Used Car Dealer Serving Drivers Nationwide" | 65 chars | WARNING - slightly long |
| Vehicle pages | Dynamic (e.g. "Used 2022 White Tesla Model Y...") | Varies | OK |

### 2. Meta Descriptions

**Status: PASS — rendering correctly on all pages checked.**

Previous audit finding was incorrect (WebFetch tool strips `<head>` content during HTML-to-markdown conversion, causing false negatives). Verified via Playwright `evaluate_script` on 2026-05-04.

One issue: /value-car and /part-exchange share identical meta descriptions. These are distinct pages and need unique descriptions.

### 3. OG Tags

**Status: PASS — present sitewide.**

Verified via Playwright on homepage, /about/carsa, /blog, /contact, /car-finance, vehicle pages. All have og:title, og:description, and og:image. Previous audit finding was incorrect (WebFetch strips `<head>` content).

### 4. Canonical Tags

**Status: PASS — present and correct on all pages checked.**

Verified via Playwright on homepage, /about/carsa, /blog, /contact, /car-finance, /reserve, vehicle pages. Previous audit finding was incorrect (WebFetch strips `<head>` content).

### 5. H1 Tags

| Page | H1 Count | Real H1 | Status |
|------|----------|---------|--------|
| Homepage | 2 | "Find your next car. Finance ready." | PASS (+ chatbot) |
| /used-cars | — | Not checked | — |
| /car-finance | 2 | "Car finance. Made simple." | PASS (+ chatbot) |
| /stores | — | Not checked | — |
| /blog | 2 | "Behind the Wheel" | PASS (+ chatbot) |
| /contact | 2 | "Talk to us, anytime." | PASS (+ chatbot) |
| /faq | — | Not checked | — |
| /about/carsa | 2 | "About Carsa" | PASS (+ chatbot) |
| /reserve | 1 | None | WARNING — only chatbot H1 |
| Vehicle pages | 2 | e.g. "Land Rover Range Rover Sport" | PASS (+ chatbot) |

**Sitewide issue:** "Chat with Caroline AI" chatbot widget injects an H1 on every page. Single fix: change to `<span>` or `<div>`.

**Improvement since March:** /car-finance fixed from ~21 to 1. Homepage fixed from 14+ to 1. /about/carsa fixed from 7 to 1. All H1 inflation issues from March are resolved.

### 6. Heading Hierarchy

No major jumps. Structure flows H1 > H2 > H3 correctly across pages. The issue is H1 count, not hierarchy gaps.

### 7. Schema.org JSON-LD

**IN PROGRESS — being implemented by developer.**

Current state:
- Vehicle detail pages: Product schema LIVE (price, condition, availability, VIN, year, body type, transmission, fuel, mileage, colour)
- Other pages: Not yet deployed

### 8. Sitemap

- ~1,100+ URLs in single flat XML file
- Referenced in robots.txt
- Includes: main pages, model pages (~700), vehicles (~250), blog articles (~100), stores (~15), legal (~13)
- Note: ~250 vehicles in sitemap vs 4,639 in CMS — many may be unpublished or dynamically loaded from DealerNet

### 9. llms.txt

**FAIL** — URL soft-redirects to /about/carsa content (Webflow catch-all 404). Not a valid llms.txt file.

Note: Previous audit (March) reported llms.txt as present. May have been removed or was incorrectly identified.

### 10. Hreflang

**PASS** — No hreflang tags, correct for single-locale English (UK) site.

### 11. Internal Linking

**PASS** — Homepage links to all key commercial pages via primary nav + body CTAs. Blog cross-links to vehicles and services.

---

## Priority Fixes

*Excludes JSON-LD which is in progress.*

### P0

1. **Chatbot H1 sitewide** — Change "Chat with Caroline AI" from H1 to `<span>` or `<div>`. Single fix improves every page.

### P1

2. **Shorten /car-finance title (65 chars → ≤60)**
3. **Shorten /car-care/carsacover title (81 chars → ≤60)**
4. **Shorten VDP title template (98 chars on sample → ≤60)** — Likely needs restructuring of CMS-bound title fields
5. **Add H1 to /reserve page** — Currently has no real H1
6. **Write unique meta description for /value-car** — Currently duplicates /part-exchange
7. **Fix HTTP links in /terms pages** — `http://www.carsa.co.uk` found in CMS rich text

### Suggestion

10. **Restore llms.txt** — Create at root with business summary, services, locations, key page links.

11. **Vehicle image alt text** — Set CMS-bound alt: "{Year} {Colour} {Make} {Model} - {View}"

12. **Sitemap vehicle coverage** — Investigate ~250 vs 4,639 gap. Consider programmatic sitemap for full inventory.
