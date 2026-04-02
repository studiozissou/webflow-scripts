# Spec: Carsa Check Finance Link

**Slug:** `carsa-check-finance-link`
**Project:** `carsa`
**Status:** Ready to Build
**Created:** 2026-03-31
**Priority:** P1

---

## Summary

Add a click handler to `[data-link="check-finance"]` elements on Carsa's used-cars page that builds a finance eligibility URL with the vehicle's VRM and stored UTM attribution, then opens it in a new tab. On desktop hover, the browser's native URL preview (bottom-left chrome) shows the destination by temporarily swapping the ancestor `<a>` element's `href`.

## Requirements

1. **Click** `[data-link="check-finance"]` → open `https://quote.carsa.co.uk/eligibility/questions?vrm={VRM}` in a new tab
2. **No VRM** → open `https://quote.carsa.co.uk/eligibility/questions` (no `?vrm=` param)
3. **UTM attribution** appended to the URL from sessionStorage/localStorage (matching existing `getAttributionParams()` pattern in `homepage.js`)
4. **Hover preview** — on mouseenter, swap ancestor `<a>` href to the finance URL; on mouseleave, restore original href. Browser natively shows the URL in the bottom-left corner
5. **Nested link handling** — `[data-link="check-finance"]` is a `<div>` nested inside a card `<a>`. Click handler must `stopPropagation()` + `preventDefault()` to prevent card navigation
6. **Mobile** — no hover, but click/tap must work. `touchend` does not need special handling since `click` fires after `touchend` on mobile browsers. The `stopPropagation` on `click` is sufficient
7. **Finsweet CMS Load** — cards may be dynamically added by Finsweet pagination. Use event delegation on a stable ancestor (no need to re-bind). Href swap uses `mouseenter` delegation on the same ancestor

## Architecture

**Approach:** Vanilla JS + ancestor `<a>` href swap (Approach D)

### Why this approach
- No jQuery dependency (aligns with CLAUDE.md `No jQuery` rule for new code)
- No invalid nested `<a>` elements (swaps existing `<a>` href instead of creating overlay)
- Browser-native hover preview with zero CSS
- Event delegation handles Finsweet dynamically-loaded cards
- ~60 LOC, single file

### DOM structure (confirmed via Chrome DevTools)

```
div.results_collection-list-wrapper.w-dyn-list
  └── div.results_collection-list.w-dyn-items#results-list
        └── div.results_collection-item.w-dyn-item          ← CMS item boundary
              └── div.car-card.is-hover-animation
                    └── a.recent_slide-inner-wrapper         ← parent <a> (card link → /vehicles/used/xxx)
                          └── div.recent_slide-bottom-wrapper
                                └── div.car-card_finance-link  ← [data-link="check-finance"] vrm="CN69XNE"
```

### File

**New file:** `projects/carsa/check-finance.js`

### Implementation

```
(() => {
  const BASE = 'https://quote.carsa.co.uk/eligibility/questions';
  const HOST = location.hostname.replace(/^www\./, '');

  // --- Attribution (matches homepage.js getAttributionParams) ---
  function getAttributionParams() { ... }  // sessionStorage > localStorage > document.referrer
  function addParams(url, obj) { ... }     // URL API, skip existing keys

  // --- Build finance URL ---
  function buildURL(vrm) {
    let url = BASE;
    if (vrm) url += '?vrm=' + encodeURIComponent(vrm);
    return addParams(url, getAttributionParams());
  }

  // --- Ancestor href swap (hover preview) ---
  // On mouseenter [data-link="check-finance"]:
  //   1. Find closest <a> ancestor
  //   2. Store original href in data-original-href
  //   3. Set href to finance URL
  // On mouseleave:
  //   1. Restore original href from data-original-href

  // --- Click handler ---
  // On click [data-link="check-finance"]:
  //   1. stopPropagation() + preventDefault()
  //   2. Restore ancestor href (in case mouseleave hasn't fired)
  //   3. window.open(buildURL(vrm), '_blank', 'noopener')

  // --- Init ---
  // Delegate all events on document.body (handles Finsweet dynamic loads)
})();
```

### Key details

1. **VRM source:** Read from `el.getAttribute('vrm')`. User will populate this attribute via Webflow CMS binding. If empty/null, omit `?vrm=` entirely
2. **Attribution storage keys:** `attribution_session` (sessionStorage, preferred) → `attribution_session` (localStorage) → `attribution` (localStorage) — matches existing homepage.js pattern
3. **`addParams` defence:** Uses `URL` constructor with `location.origin` fallback. Skips keys already present in the URL
4. **Restore on click:** The click handler must restore the ancestor `<a>` href before opening the new tab, so that if the user middle-clicks or the click handler fails, the card link still works
5. **`noopener`:** All `window.open` calls include `noopener` for security
6. **No `console.log`:** Uses `DEBUG && console.log()` pattern per CLAUDE.md

## Barba Impact

N/A — Carsa does not use Barba.js for page transitions. No init/destroy lifecycle needed.

## Task Breakdown

### Task 1: Write `check-finance.js`
**Agent:** code-writer
**Est. LOC:** ~60
**Description:** Create `projects/carsa/check-finance.js` implementing the full feature — attribution helpers, URL builder, event delegation for hover swap + click handler.

### Task 2: Verify on staging
**Agent:** qa (manual — Chrome DevTools)
**Description:** Load `https://carsa-v2.webflow.io/used-cars`, inject the script, verify: (a) hover shows correct URL in browser chrome, (b) click opens correct URL in new tab, (c) card click still navigates when not clicking finance link, (d) works on mobile viewport.

## Parallelisation Map

| Stream | Task | Agent | Est. tokens | Dependencies |
|--------|------|-------|-------------|--------------|
| A | Write check-finance.js | code-writer | ~15k | none |
| B | QA verify | qa (manual) | ~10k | A |

**Recommendation:** Sequential — only 2 tasks with a hard dependency. No parallelism, no worktrees, no agent teams.

## Verify Loop

### Pass/fail criteria
- [ ] Hovering `[data-link="check-finance"]` shows `https://quote.carsa.co.uk/eligibility/questions?vrm=XX...` in browser bottom-left URL preview
- [ ] Clicking opens the correct URL in a new tab
- [ ] VRM in URL matches the card's `vrm` attribute value
- [ ] UTM params from localStorage/sessionStorage attribution are appended
- [ ] If `vrm` attribute is empty, URL is `https://quote.carsa.co.uk/eligibility/questions` (no `?vrm=`)
- [ ] After hovering then moving mouse away, parent `<a>` href is restored to original value
- [ ] Clicking the card area (not the finance link) still navigates to the vehicle detail page
- [ ] On mobile (touch device), tapping the finance link opens the URL in a new tab
- [ ] No console errors

### Reproduction steps
1. Navigate to `https://carsa-v2.webflow.io/used-cars?cars_sort_dated-added=desc`
2. Wait for CMS items to load (~2s)
3. Hover over any "Check finance - no credit impact" link → observe URL in browser chrome
4. Click the link → verify new tab opens with correct URL
5. Click the card image/title area → verify navigates to vehicle detail page
6. Set localStorage: `localStorage.setItem('attribution', JSON.stringify({ utms: { utm_source: 'test', utm_medium: 'cpc' } }))` → reload → click finance link → verify `&utm_source=test&utm_medium=cpc` appended
7. Emulate mobile (Chrome DevTools → 430px width) → tap finance link → verify new tab

### Tier mapping
- **Tier 1 (Auto):** No test infrastructure for Carsa — skipped
- **Tier 2 (CDN regression):** N/A — no test registry for Carsa
- **Tier 3 (Manual):** All verification is manual via Chrome DevTools (see reproduction steps above). Reason: no Playwright/test infra exists for this project

### Regression scope
- Parent card links must continue to navigate to `/vehicles/used/{slug}`
- Other click handlers on the page (make/model filters, price tabs, PX form, valuation form) must not be affected
- No interference with Finsweet CMS filter/sort/load operations

## Acceptance Tests

No test infrastructure exists for Carsa (no `.env.test`, no `package.json`, no Playwright). All verification is manual per Tier 3 above.
