# Spec: Near Page Location Redirect

Slug: carsa-near-location-redirect
Project: carsa
Status: Ready to Build
Created: 2026-06-09
Priority: P2

## Summary

On `/used-cars/near/*` pages, the CMS list is pre-filtered to show cars near a specific area. Location filter checkboxes in the sidebar show facet counts — distant stores show `0` because no cars from those stores appear in the pre-filtered list. Currently, clicking a zero-count location checkbox does nothing useful (Finsweet filters to zero results).

This script transforms zero-count location checkboxes into redirect links that navigate the user to the main `/used-cars` page with the selected location(s) and all active filters preserved.

## Requirements

### R1: Page scope — `/near/` pages only
- Script runs only on pages matching `/used-cars/near/*`
- Exit early if `location.pathname` does not match

### R2: Detect zero-count locations via MutationObserver
- Observe `[fs-list-element="facet-count"]` elements inside the location filter group for text content changes
- Use a self-adjusting debounce: process only after no mutations fire for 200ms
- On each debounced trigger, scan all location checkboxes and classify as zero-count or non-zero

### R3: Hide `.facet-wrapper` for zero-count locations
- For each location checkbox where `[fs-list-element="facet-count"]` text is `"0"`, hide the `.facet-wrapper` descendant (`display: none`)
- For locations that become non-zero after filter changes, restore `.facet-wrapper` visibility
- No other visual changes (no icon, no tooltip)

### R4: Intercept clicks on zero-count location checkboxes
- When a user clicks a zero-count location label/checkbox, intercept the click
- Build a redirect URL: `https://www.carsa.co.uk/used-cars?cars_location_equal=["ClickedLocation"]&...activeFilters`
- Navigate immediately via `location.href`

### R5: Mixed selection — redirect includes all checked locations
- If the user already has non-zero locations checked (e.g. Bradford) and clicks a zero-count location (e.g. Gloucester), the redirect URL includes ALL currently-checked locations plus the newly clicked one
- URL format: `https://www.carsa.co.uk/used-cars?cars_location_equal=["Bradford","Gloucester"]&...activeFilters`
- The `cars_sort_dated-added` param and all other active filters are preserved

### R6: Filter preservation
- Read all current URL params except `cars_location_equal` (we rebuild that ourselves)
- Append them to the redirect URL
- Use `new URL()` + `searchParams` for clean URL construction

### R7: Re-process on filter changes
- When the user changes other filters (fuel type, gearbox, etc.), Finsweet re-renders and facet counts update
- The MutationObserver catches these updates and re-processes zero-count classification
- Previously zero-count locations may become non-zero (restore facet-wrapper) or vice versa

## Architecture

### Single file: `projects/carsa/near-location-redirect.js`

Self-contained IIFE. No dependencies beyond Finsweet (already loaded on page).

```
┌───────────────────────────────────────────────────────┐
│ Page guard: /used-cars/near/* only                     │
│                                                        │
│ findLocationFilterGroup()                              │
│   → scoped to .filters1_form, finds location inputs    │
│                                                        │
│ MutationObserver on location filter group              │
│   → watches characterData + childList + subtree        │
│   → 200ms settle debounce                              │
│   → calls processLocationFilters()                     │
│                                                        │
│ processLocationFilters()                               │
│   → for each input[fs-list-field="location"]:          │
│     → read sibling [fs-list-element="facet-count"]     │
│     → if "0": hide .facet-wrapper, mark as zero-count  │
│     → if non-zero: show .facet-wrapper, unmark         │
│                                                        │
│ Click handler (event delegation on filter form)        │
│   → if clicked label contains a zero-count input:      │
│     → preventDefault + stopImmediatePropagation        │
│     → buildRedirectURL(clickedLocation)                │
│     → location.href = url                              │
│                                                        │
│ buildRedirectURL(clickedLocationName)                  │
│   → base: https://www.carsa.co.uk/used-cars            │
│   → collect currently-checked locations from DOM       │
│   → add clickedLocationName                            │
│   → set cars_location_equal=["Loc1","Loc2"]            │
│   → copy all other URL params (except location)        │
│   → return url.toString()                              │
│                                                        │
│ Finsweet init hook (bootstrap)                         │
│   → FinsweetAttributes.push(['list', cb])              │
│   → on init: find filter group, start MO, first scan   │
└───────────────────────────────────────────────────────┘
```

### DOM selectors (confirmed via live inspection)

| Element | Selector |
|---|---|
| Filter form | `form.filters1_form` or `[fs-list-element="filters"]` |
| Location checkbox input | `input[fs-list-field="location"]` |
| Location name (value) | `input.getAttribute('fs-list-value')` |
| Location label text | `span[fs-cmsfilter-field="location"]` |
| Facet count number | `[fs-list-element="facet-count"]` (inside `.facet-wrapper`) |
| Facet count wrapper | `.facet-wrapper` (parent of count, brackets) |
| Checkbox label (click target) | `label.dropdown1_checkbox-field` |
| Active/checked state | `label.is-list-active` class |
| Filter group container | `.filters1_filter-group` containing location inputs |

### URL construction

```js
// Input: clickedLocationName = "Gloucester"
// Currently checked: ["Bradford"] (from DOM, labels with .is-list-active)
// Current URL params: cars_sort_dated-added=desc&cars_fuel-type_equal=["Petrol"]

// Output:
// https://www.carsa.co.uk/used-cars?cars_location_equal=["Bradford","Gloucester"]&cars_sort_dated-added=desc&cars_fuel-type_equal=["Petrol"]
```

## Barba Impact

N/A — Carsa does not use Barba.js.

## Tasks

### T1: Write `near-location-redirect.js`
- Agent: code-writer
- Create `projects/carsa/near-location-redirect.js` as `<script>` embed
- IIFE, vanilla JS, no jQuery, DEBUG pattern
- Implement all R1–R7

### T2: Manual QA on staging
- Agent: manual (Tier 3)
- Test on `/used-cars/near/wakefield`, `/used-cars/near/southampton`, etc.
- Verify zero-count hiding, redirect URLs, filter preservation, mixed selection

## Parallelisation Map

Single task (T1) — no parallelisation needed. T2 is manual.

- **T1**: code-writer, ~30 min, ~2k tokens
- **T2**: manual QA, sequential after T1

## Verify Loop

### Pass/fail criteria

1. On `/used-cars/near/wakefield?cars_sort_dated-added=desc&cars_location_equal=["Bradford"]`:
   - Bolton and Bradford show facet counts (non-zero) with visible `.facet-wrapper`
   - All other locations (Cannock, Durham, Gloucester, etc.) have `.facet-wrapper` hidden
   - No console errors

2. Clicking "Gloucester" (zero-count):
   - Browser navigates to `https://www.carsa.co.uk/used-cars?cars_location_equal=["Bradford","Gloucester"]&cars_sort_dated-added=desc`
   - (Bradford included because it was already checked)

3. Unchecking Bradford first, then clicking Gloucester:
   - Navigates to `https://www.carsa.co.uk/used-cars?cars_location_equal=["Gloucester"]&cars_sort_dated-added=desc`

4. Adding fuel-type filter (Petrol), then clicking a zero-count location:
   - Redirect URL includes `cars_fuel-type_equal=["Petrol"]`

5. On `/used-cars` (non-near page): script does NOT run, no behaviour change

### Reproduction steps

1. Navigate to `https://carsa-v2.webflow.io/used-cars/near/wakefield?cars_sort_dated-added=desc&cars_location_equal=["Bradford"]`
2. Wait 2–3s for Finsweet to render facet counts
3. Observe sidebar: zero-count locations should have no `(0)` visible
4. Click "Gloucester" in the location filter
5. Verify redirect URL in address bar

### Tier mapping

- **Tier 1 (Auto)**: Console error check, DOM state assertions (facet-wrapper hidden), page guard check
- **Tier 2 (CDN)**: Registered in `tests/registry.json` for regression
- **Tier 3 (Manual)**: Redirect destination verification (cross-origin to carsa.co.uk), visual check of facet-wrapper hiding, timing verification on slow connections

### Regression scope

- `make-model-redirect.js` — must not conflict (different page scope: make/model pages vs near pages; both use Finsweet hooks but different instances)
- Finsweet filter behaviour on `/near/` pages — non-zero location checkboxes must still work normally
- URL params must not be corrupted for non-location filters

## Test Plan

### Tier 1 — Auto: Playwright local
- `near-location-redirect.spec.js`
  - Zero-count facet-wrapper is hidden
  - Non-zero facet-wrapper is visible
  - Script does not run on `/used-cars` page
  - No console errors on `/near/` page
  - Click on zero-count checkbox triggers navigation (check `page.waitForURL`)

### Tier 2 — Auto: CDN regression
- Registered in `tests/registry.json`
- Runs after deploy against live CDN URL

### Tier 3 — Manual
- Verify redirect URL lands on correct `carsa.co.uk/used-cars` page with correct params (cross-origin, can't automate)
- Test with slow 3G throttling — facet counts take longer, MO should still catch them
- Test on mobile viewport — checkbox tap behaviour
- Test mixed selection (Bradford checked + click Gloucester)
- Safari/Firefox cross-browser check

## Acceptance Tests

1. `zero-count facet-wrapper is hidden` — assert `.facet-wrapper` has `display: none` for locations with count "0"
2. `non-zero facet-wrapper is visible` — assert `.facet-wrapper` is visible for locations with count > 0
3. `script does not run on non-near pages` — navigate to `/used-cars`, assert no `.facet-wrapper` elements are hidden
4. `no console errors` — collect console errors during page load and filter interaction
5. `click on zero-count triggers navigation` — click a zero-count location, assert URL changes to `/used-cars` pattern
