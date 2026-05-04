# rhp-about-accordion-scroll

## Summary
Click any `.accordion-title` on the RHP about page to smooth-scroll the container so the next sibling `.accordion-content`'s top edge sits one accordion-title height below the viewport top.

## Context
- About page scrolls inside `[data-barba="container"]` (position: fixed, overflow: auto) — not window scroll
- Lenis owns scroll on the about page with the Barba container as wrapper
- Accordion content is already open/visible on page load — no open/close toggle needed
- `about-icon-scale.js` reads `.accordion-title` heights; this feature only scrolls, so no conflict
- No existing click handlers on `.accordion-title`

## Approach: Expose Lenis `scrollTo`
Lenis instances have a built-in `scrollTo(target, options)` method. The `lenis-manager.js` already uses it internally (line 82, ScrollTrigger proxy) but doesn't expose it publicly. We expose it, then use it in a new lightweight module.

## Files

### 1. `lenis-manager.js` — expose `scrollTo`
Add a `scrollTo(target, opts)` wrapper to the public API:
```js
function scrollTo(target, opts) {
  lenis?.scrollTo?.(target, opts);
}
```
Update the export: `RHP.lenis = { start, stop, resize, scrollTo, onScroll, offScroll, setupScrollTriggerProxy, version: LENIS_MANAGER_VERSION };`

### 2. `about-accordion-scroll.js` — new module (~40 LOC)
Standard RHP IIFE module pattern. On `init(container)`:
1. Query all `.section_about-hero .accordion-title` elements
2. Measure height of first title element → store as `titleHeight`
3. For each title, add a click listener that:
   - Finds the next sibling `.accordion-content` via `title.closest('.accordion-block').querySelector('.accordion-content')`
   - Calls `RHP.lenis.scrollTo(content, { offset: -titleHeight })`
   - If Lenis is unavailable (reduced motion / no smooth scroll), fall back to native `content.scrollIntoView({ behavior: 'smooth', block: 'start' })`
4. Store cleanup references for all listeners

On `destroy()`: remove all click listeners, reset state.

No `prefers-reduced-motion` skip needed — scrolling is navigation, not decoration. Lenis itself won't be running under reduced motion (it returns early), so the native `scrollIntoView` fallback handles that path.

Bottom-of-page accordion content that can't reach the top: Lenis caps at max scrollable distance automatically. No special handling needed.

### 3. `orchestrator.js` — wire init/destroy
In `RHP.views.about.init(container)` (line 784+):
```js
RHP.aboutAccordionScroll?.init?.(container);
```
In `RHP.views.about.destroy()` (line 797+):
```js
RHP.aboutAccordionScroll?.destroy?.();
```

### 4. `init.js` — register module
Add `'about-accordion-scroll.js'` to `CONFIG.modules` array, after `'about-icon-scale.js'` (line 93).

## Barba Impact

1. **Init/Destroy lifecycle** — Yes: adds click listeners. Module has `init(container)` / `destroy()` with listener cleanup. Wired via `views.about`.
2. **State survival** — No. Nothing persists across transitions.
3. **Transition interference** — No. Only triggers on user click; no animations or DOM mutations.
4. **Re-entry correctness** — Yes: `destroy()` removes all listeners; `init()` guards with `if (active) return`; fresh listeners on re-enter.
5. **Namespace scoping** — About only. Wired exclusively through `views.about.init/destroy`.

## Verify Loop

### Pass/fail criteria
- Clicking any `.accordion-title` scrolls the container so `.accordion-content` top is at `titleHeight` px from viewport top
- Bottom-of-page accordions scroll as far as possible (no JS error, no infinite scroll)
- No console errors on click
- Lenis continues to function normally after scroll-to
- Clean re-init after Barba round-trip (home → about → home → about)

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/about`
2. Wait for RHP scripts to load
3. Click the first `.accordion-title`
4. Verify: the `.accordion-content` below it scrolls to near the viewport top (offset by one title height)
5. Click the last `.accordion-title`
6. Verify: page scrolls as far as possible (content may not reach the exact offset)
7. Navigate to home via nav, then back to about
8. Repeat steps 3–6 — should work identically

### Tier mapping
- Tier 1: `rhp-about-accordion-scroll.spec.js` tests 1–6
- Tier 2: Registered in `tests/registry.json`
- Tier 3: Manual — check scroll feels smooth on real mobile device (Lenis `smoothTouch: false` means native touch scroll; the programmatic scrollTo should still work)

### Regression scope
- Lenis smooth scroll must not break
- `about-icon-scale.js` CSS vars must not change (we don't modify title heights)
- Barba transitions to/from about must remain clean
- Other about modules (swipers, dial ticks, team hover) unaffected

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Dependencies |
|--------|------|-------|----------|-------------|
| A | Expose `scrollTo` in `lenis-manager.js` | code-writer | 5 | None |
| B | New `about-accordion-scroll.js` module | code-writer | 40 | Stream A |
| C | Wire in `orchestrator.js` + `init.js` | code-writer | 4 | Stream B |

**Recommendation:** Sequential (A → B → C). Total ~49 LOC across 4 files. Too small for parallel worktrees — single code-writer agent, sequential edits.

## Test Plan

### Tier 1 — Auto: Playwright local
See `tests/acceptance/rhp-about-accordion-scroll.spec.js`

### Tier 2 — Auto: CDN regression
Registered in `tests/registry.json`

### Tier 3 — Manual
- Real mobile device: tap `.accordion-title`, confirm scroll-to works with native touch scroll (Lenis `smoothTouch: false`)
- Safari desktop: confirm Lenis `scrollTo` works in Safari's scroll container
- Animation feel: confirm scroll duration feels natural (Lenis default 1.1s duration)

## Acceptance Tests
1. `accordion-title elements are clickable` — all titles have cursor pointer or are interactive
2. `click first accordion-title scrolls to its content` — content top near viewport top + title offset
3. `click last accordion-title scrolls as far as possible` — no error, scroll position at or near max
4. `no console errors on accordion click` — zero JS errors during interaction
5. `Barba re-entry: accordion scroll works after round-trip` — home → about → home → about, click still works
6. `reduced motion: scroll still works` — content reaches expected position (native fallback)
