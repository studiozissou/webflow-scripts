# Carsa Make & Model Pages — Test Report

**Date:** 2026-04-30
**Mode:** Full (BMW make + BMW 3 Series model) | Light (8 remaining)
**Focus:** Cross-links, Schema/SEO

---

## Summary

| # | Issue | Severity | Scope | Auto-fixable |
|---|-------|----------|-------|-------------|
| 1 | "See all {Make}s" links use **uppercase** make slug → 404 | **Critical** | All model pages | Yes (CMS) |
| 2 | FAQPage schema has **all empty** questions & answers | **Critical** | All 10 pages | Yes (CMS/embed) |
| 3 | H1 pluralisation adds naive "s" → "3 Seriess", "Focuss", "C Classs" | **High** | All model pages | Yes (CMS) |
| 4 | Make pages show **placeholder card content** ("Heading / div block") | **Critical** | All 5 make pages | No (Finsweet/CMS) |
| 5 | Make page H1 is generic "Used cars for sale" — missing make name | **High** | All 5 make pages | Yes (CMS) |
| 6 | JS TypeError on make pages: `Cannot read properties of undefined (reading 'length')` | **Medium** | All make pages | No (JS fix) |
| 7 | JS TypeError on model pages: `Cannot set properties of null (setting 'innerText')` | **Medium** | Model pages | No (JS fix) |
| 8 | 404 resource on page load (unknown asset) | **Low** | All pages | Investigate |

---

## Issue Details

### 1. CRITICAL — "See all {Make}s" link broken (uppercase slug → 404)

Every model page has a "See all {Make}s" CTA that links to the make page with an **uppercase** make name in the slug. Webflow CMS slugs are lowercase, so these all 404.

| Model Page | Link Text | Broken URL | Correct URL |
|-----------|-----------|------------|-------------|
| bmw-3-series | See all BMWs | `/used-cars/make/BMW` | `/used-cars/make/bmw` |
| audi-a4 | See all Audis | `/used-cars/make/Audi` | `/used-cars/make/audi` |
| volkswagen-golf | See all Volkswagens | `/used-cars/make/Volkswagen` | `/used-cars/make/volkswagen` |
| ford-focus | See all Fords | `/used-cars/make/Ford` | `/used-cars/make/ford` |
| mercedes-benz-c-class | See all Mercedes-Benzs | `/used-cars/make/Mercedes-Benz` | `/used-cars/make/mercedes-benz` |

**Root cause:** The CMS field feeding the link href uses the display name (e.g. "BMW") instead of the slug (e.g. "bmw"). Likely a template binding issue — should use `{make-slug}` not `{make-name}`.

**Note:** The breadcrumb schema correctly uses lowercase slugs — the fix is only needed on the visible "See all" link.

### 2. CRITICAL — FAQPage schema completely empty

Every page (both make and model) includes a `FAQPage` JSON-LD schema block with 9-10 questions, but **all questions have empty `name` and `text` fields**:

```json
{
  "@type": "Question",
  "name": "",
  "acceptedAnswer": { "@type": "Answer", "text": "" }
}
```

This is harmful for SEO — Google will see malformed structured data and may penalise or ignore all schema on the page. Either populate the FAQs from CMS or remove the empty schema block entirely.

**Scope:** All 10 pages tested (likely all 522 make+model pages).

### 3. HIGH — Naive pluralisation adds "s" to model names

The H1 template appears to be: `Used {Make} {Model}s for sale`

This produces grammatically wrong headlines:

| Page | H1 (actual) | H1 (correct) |
|------|-------------|--------------|
| bmw-3-series | Used BMW 3 Series**s** for sale | Used BMW 3 Series for sale |
| ford-focus | Used Ford Focus**s** for sale | Used Ford Focus for sale |
| mercedes-benz-c-class | Used Mercedes-Benz C Class**s** for sale | Used Mercedes-Benz C Class for sale |
| audi-a4 | Used Audi A4**s** for sale | Used Audi A4s for sale (OK) |
| volkswagen-golf | Used Volkswagen Golf**s** for sale | Used Volkswagen Golfs for sale (OK) |

**Also affects H2s** like "FAQs about BMW 3 Seriess".

**Fix:** Add a "Plural Name" CMS field or use conditional logic for names ending in "s", "Series", "Class", etc.

### 4. CRITICAL — Make pages show placeholder card content

All 5 make pages display 36 car listing cards with **placeholder/template content** instead of real car data:

> "HeadingThis is some text inside of a div block.£122248 month"

This means the Finsweet CMS filter or the CMS binding is not populating the car cards on make pages. The pages are live and indexable in this broken state.

**Likely cause:** The make page template uses a different CMS collection list or filter configuration than the model pages (which work correctly).

### 5. HIGH — Make page H1 is generic

All 5 make pages show: **"Used cars for sale"**

Should be: **"Used {Make} cars for sale"** (e.g. "Used BMW cars for sale")

The `<title>` tag correctly includes the make name, so this is likely a CMS binding issue on the H1 element only.

### 6. MEDIUM — JS TypeError on make pages

```
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'length')
```

Likely related to Issue #4 — the script trying to process car data that isn't loaded.

### 7. MEDIUM — JS TypeError on model pages

```
Uncaught TypeError: Cannot set properties of null (setting 'innerText')
```

A script is trying to set text on an element that doesn't exist in the DOM.

### 8. LOW — 404 resource on page load

One 404 network request on page load (specific URL not captured in console — may be a favicon or tracking pixel).

---

## Lighthouse Scores (Full Test Pages)

| Category | BMW 3 Series (model) | BMW (make) |
|----------|---------------------|------------|
| Accessibility | 84 (WARN) | 87 (WARN) |
| Best Practices | 96 (PASS) | 96 (PASS) |
| SEO | 100 (PASS) | 100 (PASS) |
| CLS | 0.021 (PASS) | — |
| Mobile overflow | No | — |

---

## Cross-Link Audit Summary

### Model pages (working correctly)
- Breadcrumb: Home → Used Cars → {Make} → {Model} — **correct structure, correct lowercase slugs**
- Vehicle links to `/vehicles/used/{reg}` — all working
- Footer links to sibling model pages — correct
- "See all {Make}s" link — **BROKEN** (uppercase slug, Issue #1)

### Make pages (partially working)
- Breadcrumb: Home → Used Cars → {Make} — correct
- Footer links to model pages — correct
- "See all makes" section with links to other makes — correct lowercase slugs
- Car listing cards — **BROKEN** (placeholder content, Issue #4)

---

## Pages Tested

### Make Pages (5)
| URL | Status |
|-----|--------|
| `/used-cars/make/bmw` | Live, broken cards |
| `/used-cars/make/audi` | Live, broken cards |
| `/used-cars/make/mercedes-benz` | Live, broken cards |
| `/used-cars/make/ford` | Live, broken cards |
| `/used-cars/make/volkswagen` | Live, broken cards |

### Model Pages (5)
| URL | Status |
|-----|--------|
| `/used-cars/models/bmw-3-series` | Live, working |
| `/used-cars/models/audi-a4` | Live, working |
| `/used-cars/models/volkswagen-golf` | Live, working |
| `/used-cars/models/ford-focus` | Live, working |
| `/used-cars/models/mercedes-benz-c-class` | Live, working |

---

## Recommended Fix Priority

1. **Make page car cards** (Critical) — Fix Finsweet/CMS binding so real cars appear
2. **"See all" link slug** (Critical) — Change CMS binding from display name to slug
3. **FAQPage schema** (Critical) — Populate or remove empty FAQ structured data
4. **H1 pluralisation** (High) — Add plural override field in CMS
5. **Make page H1** (High) — Bind H1 to make name from CMS
6. **JS errors** (Medium) — Debug null reference errors

---

## Screenshots
- Desktop (BMW 3 Series): `.claude/research/test-page/bmw-3-series-desktop-2026-04-30.png`
- Mobile (BMW 3 Series): `.claude/research/test-page/bmw-3-series-mobile-2026-04-30.png`
- Desktop (BMW make): `.claude/research/test-page/bmw-make-desktop-2026-04-30.png`
