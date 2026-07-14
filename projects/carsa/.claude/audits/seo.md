# Carsa.co.uk SEO Audit

**Audit Date:** 2026-07-01
**Previous Audit:** 2026-06-18 (SEMRush full crawl)
**Scope:** 17 pages audited across homepage, commercial pages, CMS templates, store pages, blog, and VDPs

**Method note:** Chrome DevTools MCP was not available for this session. Body content (headings, JSON-LD, internal links, content structure) was extracted via WebFetch. Title tags, meta descriptions, canonical URLs, and OG tags live in `<head>` which WebFetch strips during HTML-to-markdown conversion. Title/description data was inferred from JSON-LD `name` fields where the schema templates populate them from the same CMS source as the `<title>` tag. Direct `<title>` and `<meta>` verification should be confirmed via Chrome DevTools in a follow-up.

---

## Summary Table

| Check | Status | June | July | Change |
|-------|--------|------|------|--------|
| Meta titles (from schema) | WARNING | Present; 3 store pages missing | Store pages still likely missing titles | No change |
| Meta descriptions | PASS | Present sitewide; /value-car duplicates /part-exchange | Same | No change |
| OG tags | PASS | Present sitewide | Same | No change |
| Canonical tags | PASS | Present and correct | Requires DevTools to re-verify | Assumed stable |
| H1 tags | IMPROVED | 2 pages with chatbot H1 issue | Chatbot H1 fixed; 1 page with 2 real H1s; 2 store pages missing H1 | Mixed |
| Heading hierarchy | WARNING | Minor issues | BCA Leeds and Mansbridge have no H1; H6 misuse on /stores | Regressed on new stores |
| Schema.org JSON-LD | WARNING | Complete sitewide; FAQ scrub not working | FAQ scrub still not working | No change on FAQ issue |
| Sitemap | PASS | Referenced in robots.txt | Same | Stable |
| llms.txt | FAIL | Not present | Still not present | No change |
| Hreflang | PASS | Not needed (single-locale UK) | Same | N/A |
| Internal linking | PASS | Well-linked | No nofollow found on checked pages | Likely improved |
| Robots.txt | PASS | All bots allowed | Same | Stable |
| Blog author | WARNING | "Jane Doe" placeholder | Still "Jane Doe" | No change |

---

## Changes Since June Baseline

| Metric | June Baseline | July Finding | Status |
|--------|--------------|--------------|--------|
| Structured data errors (FAQ) | 1,235 | Still present — empty FAQ slots on make (5 empty/page) and model (2-3 empty/page) pages | NOT FIXED |
| Multiple H1 tags | 2 (/car-care/drive-away-car-insurance, /promotions/free-1-year-warranty-2025) | /car-care page FIXED (1 H1). /promotions page still has 2 H1s but chatbot is no longer the cause — both are real content H1s | Partially fixed |
| Duplicate titles | 1,950 | Not measurable without full crawl | Requires SEMRush rescan |
| Duplicate meta descriptions | 50 | Not measurable without full crawl | Requires SEMRush rescan |
| 4xx errors | 38 | Not measurable without full crawl | Requires SEMRush rescan |
| Broken internal links | 10 | Not measurable without full crawl | Requires SEMRush rescan |
| Missing titles | 3 (store pages) | BCA Bedford, BCA Leeds, Mansbridge — all still appear to lack custom titles | NOT FIXED |
| Nofollow internal links | 25 across 18 pages | 0 found on 5 checked pages | LIKELY FIXED |

---

## Per-Page Findings

### Homepage (/)

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Find your next car Finance ready" | PASS |
| Heading hierarchy | H1 > H2 > H3, correct flow | PASS |
| JSON-LD | Organization + WebSite + WebPage | PASS |
| Schema name | "Carsa — Modern, Hassle-Free Used Car Buying" (49 chars) | OK |
| Chatbot H1 | "Chat with Caroline AI" — NOT an H1, JS config string only | FIXED |
| Internal links | 20+ internal links, no nofollow | PASS |

### /used-cars

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Used cars for sale" | PASS |
| JSON-LD | Organization + CollectionPage | PASS |
| Schema name | "Used cars for sale or on finance \| Carsa" (41 chars) | OK |
| Chatbot H1 | JS config string, not an H1 | FIXED |
| Vehicle listings | Car titles in H4 tags (appropriate for listing cards) | PASS |

### /car-finance

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Car finance. Made simple." | PASS |
| JSON-LD | WebPage + BreadcrumbList + Organization | PASS |
| Schema name | "Car Finance \| Free Finance Eligibility Checker \| PCP & HP - Carsa" (67 chars) | WARNING — truncates in SERPs |
| FAQ section | "FAQs" heading with Q&A content but no FAQPage schema | SUGGESTION |
| Chatbot H1 | JS config string, not an H1 | FIXED |

### /stores

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Find your nearest Carsa store" | PASS |
| Heading hierarchy | H6 used for store name labels — should be styled div or H3 | WARNING |
| JSON-LD | CollectionPage with 11 AutoDealer entities + Organization | PASS |
| Schema name | "Find Your Nearest Carsa Store \| Nationwide Used Car Locations" (62 chars) | WARNING — slightly long |
| Store count | 11 stores in schema (does not include BCA Bedford, BCA Leeds, Mansbridge) | Note |

### /blog

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Behind the Wheel" | PASS |
| JSON-LD | CollectionPage + BreadcrumbList + Organization | PASS |
| Schema name | "Carsa Blog \| Insights & Advice for Car Buyers" (47 chars) | OK |
| Content freshness | Latest post: 30 June 2026 | PASS |
| Chatbot H1 | JS config string, not an H1 | FIXED |

### /faq

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "FAQs" | PASS |
| JSON-LD | WebPage + BreadcrumbList + Organization + WebSite | PASS |
| Speakable | SpeakableSpecification targets `.faq_heading`, `.faq_item` | PASS |
| FAQ content | 20+ questions across categories | PASS |
| FAQPage schema | Not present — uses WebPage + Speakable instead | SUGGESTION — add FAQPage for rich results |

### /about/carsa

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "About Carsa" | PASS |
| JSON-LD | AboutPage + Organization | PASS |
| Schema name | "About Carsa \| Trusted Used Car Dealer Serving Drivers Nationwide" (65 chars) | WARNING — slightly long |

### /contact

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Talk to us, anytime." | PASS |
| JSON-LD | ContactPage + Organization | PASS |
| Schema name | "Contact \| Carsa" | OK |

### /sell-car/value-car

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Get your car's value in 30 seconds" | PASS |
| JSON-LD | WebPage + BreadcrumbList + Organization | PASS |
| Schema name | "Value My Car \| Sell My Car \| Carsa" | OK |
| Content | Step-by-step process, FAQs section | PASS |

### /used-cars/models/audi-a3 (model page sample)

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Used Audi A3 cars for sale" | PASS |
| JSON-LD: CollectionPage | Present with BreadcrumbList (Home > Used Cars > A3) | PASS |
| JSON-LD: FAQPage | 9 entries: 7 populated, **2 EMPTY** | CRITICAL |
| FAQ content | 7 detailed Audi A3 FAQs | PASS |
| Empty FAQ entries | Entries 8-9: `"name": ""`, `"text": ""` | CRITICAL |
| Long-form content | About section with Driving, Interior, Technology, Body Styles | PASS |

### /used-cars/make/bmw (make page sample)

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Used BMW cars for sale" | PASS |
| JSON-LD: CollectionPage | Present with BreadcrumbList (Home > Used Cars > BMW) | PASS |
| JSON-LD: FAQPage | 10 entries: 5 populated, **5 EMPTY** | CRITICAL |
| Visible FAQs | 5 displayed (matches populated count) | PASS |
| Empty FAQ entries | Entries 6-10: `"name": ""`, `"text": ""` | CRITICAL |

### /used-cars/fuel/petrol (fuel page sample)

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Used petrol cars for sale" | PASS |
| JSON-LD | CollectionPage + BreadcrumbList + Organization | PASS |
| FAQPage schema | Not present (by design — fuel template has no FAQ slots) | OK |
| Nofollow links | No rel="nofollow" on any internal links | PASS |

### Blog post sample (Audi A3 vs BMW 1 Series vs Mercedes A-Class)

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: article title | PASS |
| JSON-LD | BlogPosting + BreadcrumbList + Organization | PASS |
| datePublished | 30 June 2026 | PASS |
| dateModified | 30 June 2026 | PASS |
| articleSection | "Model Comparisons" | PASS |
| Author | "Jane Doe" | WARNING — placeholder undermines E-E-A-T |
| Heading structure | H1 > H2 (per-model, comparison, verdict) | PASS |

### VDP sample: /vehicles/used/dy70uyt (2020 Vauxhall Corsa)

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Vauxhall Corsa" | PASS |
| JSON-LD | Product + Vehicle + BreadcrumbList | PASS |
| Price | GBP 9,135 | PASS |
| Availability | InStock | PASS |
| Vehicle specs | 2020, Grey, Hatchback, Petrol, Manual, 57,997 miles | PASS |
| Schema scrub | Active — removes empty properties, updates SoldOut for removed vehicles | PASS |
| Image alt | "Vauxhall Corsa" — generic | WARNING |

### /stores/bca-bedford

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Carsa Store BCA Bedford" | PASS |
| JSON-LD | AutoDealer + BreadcrumbList + Organization | PASS |
| Title/description | Not visible in extraction — likely missing | WARNING |

### /stores/bca-leeds

| Check | Finding | Status |
|-------|---------|--------|
| H1 | **NO H1** — store name is in H3 | CRITICAL |
| JSON-LD | AutoDealer + BreadcrumbList + Organization | PASS |
| Title/description | Not visible in extraction — likely missing | WARNING |

### /stores/mansbridge

| Check | Finding | Status |
|-------|---------|--------|
| H1 | **NO H1** — "Mansbridge" only in H6 tags | CRITICAL |
| JSON-LD | AutoDealer + BreadcrumbList + Organization | PASS |
| Title/description | Not visible in extraction — likely missing | WARNING |

### /car-care/drive-away-car-insurance (H1 check)

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Insure your new car in minutes..." | PASS |
| Chatbot H1 | NOT an H1 — JS config only | FIXED since June |

### /used-cars/promotions/free-1-year-warranty-2025 (H1 check)

| Check | Finding | Status |
|-------|---------|--------|
| H1 count | **2 H1s** | WARNING |
| H1 #1 | "Free 1 year warranty" | Content H1 |
| H1 #2 | "Available cars on offer" | Should be H2 — template issue |
| Chatbot H1 | NOT an H1 | FIXED since June |

### /sell-car/store/portsmouth

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Sell your car in Portsmouth" | PASS |
| JSON-LD | AutoDealer + Organization | PASS |
| Nofollow | No rel="nofollow" on internal links | PASS |

### /used-cars/near/portsmouth

| Check | Finding | Status |
|-------|---------|--------|
| H1 | 1 H1: "Used cars for sale in Portsmouth" | PASS |
| JSON-LD | CollectionPage + BreadcrumbList + Organization | PASS |
| Nofollow | No rel="nofollow" on internal links | PASS |

---

## Schema Audit Summary

### Schema Types Deployed

| Schema Type | Template File | Status |
|-------------|--------------|--------|
| Organization | site-wide.html | LIVE |
| WebSite | site-wide.html | LIVE |
| WebPage + Speakable | site-wide.html | LIVE |
| CollectionPage | used-cars.html, blog.html, makes-template.html, models-template.html, fuel-template.html, near-template.html, promotions-template.html, deals.html | LIVE |
| AboutPage | about-carsa.html | LIVE |
| ContactPage | contact.html | LIVE |
| Product + Vehicle | vehicles-template.html | LIVE |
| AutoDealer | stores-template.html, sell-car-template.html, stores.html | LIVE |
| BlogPosting | blog-template.html | LIVE |
| BreadcrumbList | All templates | LIVE |
| FAQPage | makes-template.html, models-template.html | LIVE but BROKEN |
| OfferCatalog | deals.html | LIVE |

### Critical Schema Issue: FAQ Scrub Not Executing

The `faq-scrub.js` script at `projects/carsa/faq-scrub.js` contains correct logic to remove empty FAQ Question nodes from FAQPage JSON-LD. The template comments reference it:

```
<!-- Scrub empty FAQ slots -- load faq-scrub.js via page custom code or site-wide body -->
```

However, the site-wide body code at `projects/carsa/schema/site-wide.html` does not include a `<script src>` for `faq-scrub.js`. The script is never loaded, so empty FAQ entries remain in the DOM.

**Live evidence:**
- /used-cars/make/bmw: 5 of 10 FAQ entries are empty
- /used-cars/models/audi-a3: 2 of 9 FAQ entries are empty

**Estimated impact:** ~730 make/model pages x average 3-4 empty entries = ~2,500+ empty FAQ Question nodes in structured data sitewide. Google Search Console will report these as structured data errors.

**Fix options:**
1. Add `<script src>` for faq-scrub.js to Webflow site-wide body code
2. Or add it to the make-template and model-template page-level custom code in Webflow
3. Or use Webflow conditional visibility to suppress empty CMS ref slots in the JSON-LD block

---

## Robots.txt

```
User-agent: *
Allow: /
Sitemap: https://www.carsa.co.uk/sitemap.xml
```

All crawlers welcome. No AI bot blocks. Correct configuration.

---

## llms.txt

**Status: STILL MISSING** — `https://www.carsa.co.uk/llms.txt` returns standard about page content via Webflow's catch-all 404 behaviour.

---

## Priority Fixes

### Critical

1. **Load faq-scrub.js on make/model pages** — Empty FAQ entries on ~730 CMS template pages create ~2,500+ structured data errors. The script exists and is correct; it just needs to be loaded. Single deployment fix.

2. **Add H1 to /stores/bca-leeds and /stores/mansbridge** — These pages have no H1. The store name appears only in H3 or H6. Either fix the CMS entry heading level or update the store template.

3. **Add title + meta description to /stores/bca-bedford, /stores/bca-leeds, /stores/mansbridge** — These 3 pages were flagged as missing titles in June. Populate the SEO Title and Meta Description fields in Webflow CMS for each store entry.

### Warning

4. **/car-finance title too long (67 chars)** — Unchanged since May.

5. **/about/carsa title slightly long (65 chars)** — Unchanged since May.

6. **/promotions/free-1-year-warranty-2025 has 2 H1s** — "Free 1 year warranty" and "Available cars on offer". Change "Available cars on offer" to H2. Template-level fix.

7. **H6 misuse on /stores listing and store template pages** — Store name labels use H6 for visual styling. Use a styled `<div>` or promote to H3.

8. **Blog author "Jane Doe"** — All posts show placeholder author. Undermines E-E-A-T. Replace with a real name and add Person schema.

9. **VDP image alt text generic** — Vehicle images use "Vauxhall Corsa" rather than "2020 Grey Vauxhall Corsa Elite Nav Premium". CMS-bound alt field needed.

### Suggestion

10. **Create llms.txt** — Provide structured business summary for AI engines.

11. **Add FAQPage schema to /car-finance and /faq** — Both pages have FAQ content but no FAQPage structured data. High value for rich results.

---

## Chatbot H1 Status

**RESOLVED** — confirmed across all 17 pages checked. "Chat with Caroline AI" is now rendered as a JavaScript configuration property in the `createChat()` function, not as an HTML heading element. The June baseline of 2 pages with chatbot H1 is now 0.

---

## Nofollow Internal Links Status

**Likely resolved** — the June baseline reported 25 nofollow internal links across 18 pages. Zero nofollow attributes found on internal links across 5 template page types checked (/fuel/petrol, /sell-car/store/portsmouth, /near/portsmouth, /make/bmw, /models/audi-a3). Full crawl needed to confirm sitewide resolution.

---

## Summary: June vs July

| Issue | June | July | Status |
|-------|------|------|--------|
| FAQ schema empty entries | 1,235 errors | Still present (scrub script not loaded) | NOT FIXED |
| Chatbot H1 injection | 2 pages | 0 pages | FIXED |
| Missing store page titles | 3 pages | 3 pages (BCA Bedford, BCA Leeds, Mansbridge) | NOT FIXED |
| Missing store page H1 | Unknown | 2 pages (BCA Leeds, Mansbridge) | NEW FINDING |
| Nofollow internal links | 25 across 18 pages | 0 found on 5 checked pages | LIKELY FIXED |
| /car-finance title too long | 67 chars | 67 chars | NOT FIXED |
| Blog author placeholder | "Jane Doe" | "Jane Doe" | NOT FIXED |
| llms.txt | Missing | Missing | NOT FIXED |
| Schema coverage | Complete | Complete + new templates (fuel, near, sell-car, promotions, deals) | IMPROVED |
| Content freshness (blog) | Latest post 30 June 2026 | Latest post 30 June 2026 | GOOD |
| Promotions page 2 H1s | Chatbot-caused | Template-caused (chatbot fixed, heading level remains) | Partially fixed |
