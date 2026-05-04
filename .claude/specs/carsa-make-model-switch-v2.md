# Spec: Carsa Make/Model Switch v2

Slug: carsa-make-model-switch-v2
Project: carsa
Status: Ready to Build
Created: 2026-05-04
Priority: P2
Supersedes: carsa-model-redirect, carsa-make-model-prefill

## Summary

Rewrite the make/model dropdown redirect script with new behaviour rules:

- **VSRP desktop (>991px):** No redirect logic at all — dropdowns act as native Finsweet filters
- **VSRP mobile (≤991px):** User selects make/model, destination page is prefetched, redirect fires only when `#mobile-search-submit` is tapped
- **Make/model pages desktop:** Immediate redirect on any make/model change (no same-page guard needed since no prefill)
- **Make/model pages mobile:** Same deferred behaviour as VSRP mobile
- **No prefill anywhere** — dropdowns always start at "Any"

## Requirements

### R1: Desktop VSRP — no redirect
- Breakpoint: `window.matchMedia('(max-width: 991px)')` → false = desktop
- Make/model dropdowns are pure Finsweet filters, no JS redirect logic attached
- Model population still works (selecting a make populates model options)

### R2: Mobile (all pages) — deferred redirect
- On make or model selection, compute destination URL
- Inject `<link rel="prefetch" href="...">` into `<head>` (update on each change, max 1 link)
- Do NOT redirect until `#mobile-search-submit` is clicked
- On click: `location.href = prefetchedURL` (or current page if no make/model selected)
- If user selects "Any" for both make and model, no redirect (stay on current page / close modal)

### R3: Desktop make/model pages — immediate redirect
- Make change → redirect to `/used-cars/make/{slug}` with filters
- Model change → redirect to `/used-cars/models/{slug}` with filters
- Make set to "Any" → redirect to `/used-cars`
- Model set to "Any" → no redirect (just filters in place)

### R4: No prefill
- Remove all prefill logic (`reverseMakeMap`, `reverseModelMap`, `_pageMake`, `_pageModel`)
- Dropdowns always start at "Any make" / "Any model"
- Page context is still detected (for redirect URL building) but not used for prefill

### R5: Filter preservation
- Reuse existing `getActiveFilters()` — harvests `[fs-list-field]` values excluding make/model
- Append as query params on redirect URLs
- On mobile prefetch: include filters in prefetched URL

## Architecture

### Approach: Single-file rewrite of `make-model-redirect.js`

Same inline `<script>` embed, same Finsweet hook pattern, but simplified:

```
┌─────────────────────────────────────────────────┐
│ getPageContext()        — vsrp / make / model    │
│ isMobile()             — matchMedia ≤991px       │
│ slugify(), makeOption() — unchanged helpers      │
│ getActiveFilters()     — unchanged               │
│ buildModelRedirectURL() — unchanged              │
│ buildMakeRedirectURL()  — unchanged              │
├─────────────────────────────────────────────────┤
│ initMakeModelFilters()                           │
│  ├─ Build slug maps (modelSlugMap, makeSlugMap)  │
│  ├─ Populate make dropdown                      │
│  ├─ populateModels(makeName)                    │
│  ├─ computeRedirectURL() — returns URL or null  │
│  ├─ prefetchURL(url) — manages <link> element   │
│  ├─ Make onChange:                              │
│  │   desktop make/model → immediate redirect    │
│  │   desktop vsrp → just populate models        │
│  │   mobile → populate models + prefetch        │
│  └─ Model onChange:                             │
│      desktop make/model → immediate redirect    │
│      desktop vsrp → noop (Finsweet handles)     │
│      mobile → prefetch                          │
├─────────────────────────────────────────────────┤
│ #mobile-search-submit click handler             │
│  └─ if pendingRedirectURL → location.href = url │
└─────────────────────────────────────────────────┘
```

### Key decisions

1. **`isMobile()` uses `matchMedia`** — evaluated at event time (not cached at init), so orientation changes are handled correctly
2. **Prefetch via `<link rel="prefetch">`** — low-cost, browser-native, no custom fetch logic. Updated on every dropdown change (remove old link, insert new one)
3. **`pendingRedirectURL` variable** — set on every mobile dropdown change, read on `#mobile-search-submit` click
4. **No prefill = no same-page guards** — massive simplification. No `_pageMake`, `_pageModel`, `_prefillDone` flags needed
5. **`#mobile-search-submit` handler** — bound once outside `initMakeModelFilters()` (since Finsweet re-runs init on render, we don't want duplicate listeners)

### Removed code
- `reverseMakeMap`, `reverseModelMap` — no longer needed (no prefill)
- `_pageMake`, `_pageModel`, `_prefillDone` — no longer needed
- Finsweet tag-remove clicking logic on VSRP — desktop VSRP has no redirect, mobile defers

### Files affected
- `projects/carsa/make-model-redirect.js` — full rewrite (~150 LOC, down from 232)

### Dependencies
- jQuery (sitewide)
- Finsweet Attributes CMS List (already loaded)
- `#mobile-search-submit` button (confirmed exists in Webflow on all target pages)
- `.model-data` CMS items with `model-title`, `make-title`, `model-slug`, `make-slug` attributes (already in place)

## Barba Impact
N/A — Carsa does not use Barba.js.

## Task Breakdown

| # | Task | Agent | Est. LOC |
|---|------|-------|----------|
| 1 | Rewrite `make-model-redirect.js` | code-writer | ~150 |
| 2 | Manual QA on staging | manual | — |

### Parallelisation Map
Single task — no parallelisation needed. One code-writer agent rewrites the file, then manual QA.

## Verify Loop

### Pass/fail criteria
1. **VSRP desktop:** Select make → model dropdown populates, no redirect occurs. Select model → no redirect occurs. Finsweet filters list in-place.
2. **VSRP mobile:** Select make → model populates, `<link rel="prefetch">` appears in `<head>` pointing to `/used-cars/make/{slug}?...`. Select model → prefetch updates to `/used-cars/models/{slug}?...`. Tap `#mobile-search-submit` → redirects to prefetched URL.
3. **Make page desktop:** Change make dropdown → immediate redirect to new make page. Change model → immediate redirect to model page.
4. **Make page mobile:** Change make/model → prefetch updates. Tap submit → redirects.
5. **Model page desktop:** Change make → redirects to make page. Change model → redirects to new model page.
6. **No prefill:** On any page, dropdowns always show "Any" on load regardless of URL path.
7. **Filter preservation:** Active filters (price, fuel, etc.) appear as query params in redirect URL.
8. **No console errors** on any page type.

### Reproduction steps
1. Navigate to `https://www.carsa.co.uk/used-cars` (desktop viewport)
2. Select "BMW" from make → model dropdown populates, no redirect
3. Select "3 Series" from model → no redirect, list filters
4. Resize to ≤991px (or use mobile device)
5. Open filter modal, select "Audi" → check `<head>` for prefetch link
6. Tap `#mobile-search-submit` → redirects to `/used-cars/make/audi?...`
7. On make page, select different make on desktop → immediate redirect
8. On make page mobile, select model → prefetch, tap submit → redirects

### Tier mapping
- **Tier 1 (Auto):** N/A — no test infra for Carsa
- **Tier 2 (CDN regression):** N/A
- **Tier 3 (Manual):** All checks above — requires real Finsweet interaction, mobile viewport, and Webflow CMS

### Regression scope
- Finsweet CMS filtering must still work on VSRP (desktop)
- `make-model.js` empty-state script unaffected (separate embed)
- Homepage search unaffected (separate script)

## Acceptance Tests
No test infrastructure exists for Carsa. All verification is manual (Tier 3).
