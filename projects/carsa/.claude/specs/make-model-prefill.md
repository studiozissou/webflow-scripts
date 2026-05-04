# Spec: Carsa Make/Model Page Prefill & Redirect

**Slug:** `carsa-make-model-prefill`
**Project:** `carsa`
**Status:** Ready to Build
**Created:** 2026-04-30
**Priority:** P2

---

## Summary

Extend the existing make/model dropdown script to pre-fill dropdowns on make and model sub-pages, and enable redirects when the user changes their selection. Also trigger Finsweet filter tags to appear for the pre-filled values.

## Requirements

### Make page (`/used-cars/make/{slug}`)
1. **Pre-fill make dropdown** from URL path slug on page load
2. **Model dropdown enabled** — populated with models for that make, ready for selection
3. **Model selection → redirect** to `/used-cars/models/{model-slug}`
4. **Make change → redirect** to `/used-cars/make/{new-make-slug}` immediately
5. **Finsweet tags** appear for the pre-filled make

### Model page (`/used-cars/models/{slug}`)
1. **Pre-fill both dropdowns** — make and model from URL path slug
2. **Model change → redirect** to `/used-cars/models/{new-model-slug}`
3. **Make change → redirect** to `/used-cars/make/{new-make-slug}` (model becomes invalid)
4. **Finsweet tags** appear for pre-filled make and model

### Webflow setup
1. **Add `make-slug` attribute** to `.model-data` CMS items, bound to `make:slug` (the Make collection's Slug field via multi-ref)

## Architecture

**Approach:** Extend existing make/model `<script>` embed (same file as `carsa-model-redirect`)

### What's added

1. **`getPageContext()`** — parses URL path to detect page type (`vsrp`, `make`, `model`, `other`)
2. **Reverse lookup maps** — `buildReverseMakeMap()` (make slug → name) and `buildReverseModelMap()` (model slug → { model, make })
3. **`buildMakeSlugMap()`** — make name → make slug (for make redirects)
4. **`buildMakeRedirectURL()`** — builds `/used-cars/make/{slug}` with filter params
5. **`prefillFromPath()`** — reads URL path, reverse-looks-up the slug, pre-fills dropdowns, dispatches change events for Finsweet tags
6. **`prefilling` flag** — prevents redirect handlers from firing during initial dropdown population
7. **Expanded redirect logic** — model `onChange` works on all page types (not just VSRP), make `onChange` redirects on make/model pages

### Key detail: prefilling flag

When we pre-fill dropdowns and dispatch change events (so Finsweet applies filters and shows tags), the redirect handlers would fire and cause an immediate redirect loop. The `prefilling` flag is set to `true` during `prefillFromPath()` and both redirect handlers check it before redirecting.

## Barba Impact

N/A — Carsa does not use Barba.js.

## Task Breakdown

### Task 1: Add `make-slug` attribute in Webflow
**Agent:** manual (user in Webflow Designer)
**Description:** On `.model-data` hidden CMS items, add custom attribute `make-slug` bound to `make:slug` (Make collection Slug via multi-ref).

### Task 2: Update make/model `<script>` embed
**Agent:** manual (user in Webflow Designer custom code)
**Description:** Replace the existing embed with the updated code from `projects/carsa/make-model-redirect.js`.

### Task 3: Verify on staging
**Agent:** qa (manual)
**Description:** Test all three page types per the verify loop below.

## Parallelisation Map

| Stream | Task | Agent | Dependencies |
|--------|------|-------|--------------|
| A | Add make-slug attribute | manual | none |
| B | Update script embed | manual | none |
| C | QA verify | manual | A + B |

## Verify Loop

### Pass/fail criteria

**VSRP (`/used-cars`) — existing behaviour preserved:**
- [ ] Model selection → redirect to `/used-cars/models/{slug}`
- [ ] "Any model" → no redirect
- [ ] Active filters preserved as query params

**Make page (`/used-cars/make/{slug}`):**
- [ ] Make dropdown pre-filled with correct make on page load
- [ ] Model dropdown enabled and populated with models for that make
- [ ] Selecting a model → redirect to `/used-cars/models/{model-slug}`
- [ ] Changing the make → redirect to `/used-cars/make/{new-make-slug}`
- [ ] Finsweet tag appears showing the make name
- [ ] No redirect loop on page load

**Model page (`/used-cars/models/{slug}`):**
- [ ] Both make and model dropdowns pre-filled on page load
- [ ] Changing model → redirect to `/used-cars/models/{new-model-slug}`
- [ ] Changing make → redirect to `/used-cars/make/{new-make-slug}`
- [ ] Finsweet tags appear showing both make and model
- [ ] No redirect loop on page load

**All pages:**
- [ ] No console errors
- [ ] Existing filter/sort/pagination behaviour unaffected

### Reproduction steps
1. Navigate to `/used-cars` → select BMW → select 3 Series → verify redirect to `/used-cars/models/3-series`
2. On `/used-cars/make/bmw` → verify make dropdown shows "BMW", model dropdown is enabled with BMW models
3. On `/used-cars/make/bmw` → select a model → verify redirect to `/used-cars/models/{slug}`
4. On `/used-cars/make/bmw` → change make to "Audi" → verify redirect to `/used-cars/make/audi`
5. On `/used-cars/models/3-series` → verify both dropdowns pre-filled (BMW + 3 Series)
6. On `/used-cars/models/3-series` → change model to "1 Series" → verify redirect to `/used-cars/models/1-series`
7. On `/used-cars/models/3-series` → change make to "Audi" → verify redirect to `/used-cars/make/audi`
8. On all three pages → check Finsweet tags appear for pre-filled values

### Regression scope
- VSRP model redirect must still work identically
- `make-model.js` empty-state logic unaffected
- `check-finance.js` unaffected
- Finsweet filter/sort/pagination unaffected

## Acceptance Tests

No test infrastructure exists for Carsa. All verification is manual.
