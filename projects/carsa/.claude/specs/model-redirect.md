# Spec: Carsa Model Redirect

**Slug:** `carsa-model-redirect`
**Project:** `carsa`
**Status:** Ready to Build
**Created:** 2026-04-30
**Priority:** P2

---

## Summary

When a user selects a model from the model dropdown on the `/used-cars` page, redirect them to the corresponding model sub-page at `/used-cars/models/{slug}`. Preserve any other active filter values (price, fuel, year, mileage, etc.) as query parameters on the redirect URL.

## Requirements

1. **Model selection → redirect** — when the model dropdown (`[name="model"]`) changes to a non-empty value on `/used-cars`, redirect to `/used-cars/models/{slug}`
2. **Slug source** — read from a `model-slug` attribute on `.model-data` CMS items (bound to the Model collection's Slug field in Webflow). Fall back to JS slugification if attribute missing
3. **Preserve active filters** — gather values from all other non-empty filter inputs on the page and append as query params (e.g. `?fuel=petrol&year_min=2020`)
4. **Page guard** — only run on `/used-cars` (exact match). Do NOT run on `/used-cars/models/*`, `/used-cars/make/*`, or homepage
5. **"Any model" = no redirect** — selecting the default empty option does nothing
6. **Future-ready** — architecture should make adding make redirect trivial (separate function, same pattern)

## Architecture

**Approach:** Inline modification of existing make/model `<script>` embed

### Why this approach
- The model dropdown's `onChange` in the live VSRP code is an empty stub — natural insertion point
- Keeps all make/model logic in one place (no second script listening to the same dropdown)
- Matches existing jQuery style of the surrounding code
- No event ordering issues between two scripts
- Minimal change — ~20 LOC added to existing embed

### DOM structure (confirmed from live code)

```
[name="make"]                ← make dropdown (Finsweet filter input)
[name="model"]               ← model dropdown (Finsweet filter input)
.model-data                  ← hidden CMS items with model-title, make-title, model-slug attributes
```

### File

**Modified:** Existing make/model `<script>` embed on `/used-cars` page (currently in Webflow custom code)

No new file — the redirect logic is added directly into the existing `initMakeModelFilters()` function.

### Implementation

Add these helpers inside the `<script>` block (above `initMakeModelFilters`):

```js
// Slug lookup from .model-data CMS items
function buildSlugMap() {
  var map = {};
  $('.model-data').each(function () {
    var name = $(this).attr('model-title');
    var slug = $(this).attr('model-slug');
    if (name && slug) map[name] = slug;
  });
  return map;
}

// Fallback slugify (only if model-slug attribute is missing)
function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Gather active filter values from all filter inputs on page
// Skip make and model (those are implicit in the redirect URL)
function getActiveFilters() {
  var params = {};
  $('[fs-list-field]').each(function () {
    var name = $(this).attr('name') || $(this).attr('fs-list-field');
    if (!name || name === 'make' || name === 'model') return;
    var val = $(this).val();
    if (val) params[name] = val;
  });
  return params;
}

// Build redirect URL
function buildRedirectURL(slug, filters) {
  var url = new URL('/used-cars/models/' + slug, location.origin);
  for (var k in filters) url.searchParams.set(k, filters[k]);
  return url.toString();
}
```

Then replace the empty stub:

```js
// BEFORE
$modelDropdown.on('change', function () {
  // placeholder, if needed later
});

// AFTER
$modelDropdown.on('change', function () {
  if (location.pathname !== '/used-cars' && location.pathname !== '/used-cars/') return;

  var selected = this.value;
  if (!selected) return;

  var slugMap = buildSlugMap();
  var slug = slugMap[selected] || slugify(selected);
  var filters = getActiveFilters();

  location.href = buildRedirectURL(slug, filters);
});
```

### Webflow setup required

1. **Add `model-slug` attribute** to each `.model-data` hidden CMS item, bound to the Model collection's Slug field

### Key details

1. **Page guard:** `location.pathname` check inside the `change` handler prevents redirects on model sub-pages (avoids redirect loops) and homepage (if the code ever runs there)
2. **Slug lookup:** Uses `model-slug` CMS attribute for reliable slug matching. JS `slugify()` is a fallback for any items missing the attribute
3. **Filter harvesting:** Scans `[fs-list-field]` elements for non-empty values. Skips make/model since those are implicit in the URL path
4. **jQuery style:** Matches surrounding code (uses `$()`, `$(this).attr()`, `.each()`, `.val()`)
5. **No `console.log`:** Per CLAUDE.md convention
6. **No new file:** All logic lives in the existing make/model `<script>` embed

## Barba Impact

N/A — Carsa does not use Barba.js for page transitions. No init/destroy lifecycle needed.

## Task Breakdown

### Task 1: Add `model-slug` attribute in Webflow
**Agent:** manual (user in Webflow Designer)
**Description:** On `.model-data` hidden CMS items, add custom attribute `model-slug` bound to the Model collection's Slug field.

### Task 2: Update make/model `<script>` embed
**Agent:** manual (user in Webflow Designer custom code)
**Est. LOC:** ~20 added
**Description:** Add the 4 helper functions and replace the empty `$modelDropdown.on('change')` stub with the redirect logic. Code is in the spec above — copy directly.

### Task 3: Verify on staging
**Agent:** qa (manual — Chrome DevTools)
**Description:** Publish to staging, navigate to `/used-cars`, select a make then model, verify redirect to `/used-cars/models/{slug}` with correct slug and preserved filters.

## Parallelisation Map

| Stream | Task | Agent | Est. tokens | Dependencies |
|--------|------|-------|-------------|--------------|
| A | Add model-slug attribute | manual (user) | — | none |
| B | Update script embed | manual (user) | — | none |
| C | QA verify | manual | — | A + B |

**Recommendation:** Tasks 1 and 2 can be done in the same Webflow session. Task 3 follows after publish. No agents needed — this is a manual code paste.

## Verify Loop

### Pass/fail criteria
- [ ] Selecting a model from the dropdown on `/used-cars` redirects to `/used-cars/models/{correct-slug}`
- [ ] The slug in the URL matches the CMS collection item's slug (not a JS-generated approximation)
- [ ] Selecting "Any model" (empty value) does NOT trigger a redirect
- [ ] Active filters (price range, fuel type, year, etc.) are preserved as query params on the redirect URL
- [ ] The script does NOT redirect on `/used-cars/models/*` pages (no redirect loop)
- [ ] No console errors on `/used-cars`

### Reproduction steps
1. Navigate to `https://carsa-v2.webflow.io/used-cars`
2. Wait for CMS items to load (~2s)
3. Select a make (e.g. "BMW") from the make dropdown
4. Select a model (e.g. "3 Series") from the model dropdown
5. Verify redirect to `/used-cars/models/3-series` (or the correct CMS slug)
6. Go back to `/used-cars`, set a price filter, then select a model → verify price param appears in redirect URL
7. On `/used-cars/models/3-series`, verify the script does not cause a redirect loop

### Tier mapping
- **Tier 1 (Auto):** No test infrastructure for Carsa — skipped
- **Tier 2 (CDN regression):** N/A — no test registry for Carsa
- **Tier 3 (Manual):** All verification is manual via Chrome DevTools (see reproduction steps above). Reason: no Playwright/test infra exists for this project

### Regression scope
- Make dropdown behaviour must continue to work (populates model dropdown on change)
- Finsweet filter/sort/pagination must not be affected
- `check-finance.js` click handlers must continue to work
- `make-model.js` empty-state logic on model sub-pages must still work after redirect lands

## Acceptance Tests

No test infrastructure exists for Carsa (no `.env.test`, no `package.json`, no Playwright). All verification is manual per Tier 3 above.
