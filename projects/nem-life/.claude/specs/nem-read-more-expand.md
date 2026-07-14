# NEM Life — Read More Expand/Collapse

**Slug:** `nem-read-more-expand`
**Project:** nem-life
**Created:** 2026-06-02
**Status:** Ready to Build

## Summary

GSAP-powered read-more expand/collapse animation. A button with `data-button="read-more-expand"` toggles all sibling `data-block="read-more-expand"` elements open/closed. Blocks are collapsed by default on page load. Button text toggles between "Lees meer" / "Lees minder". Works on any page site-wide.

## Requirements

1. All `[data-block="read-more-expand"]` elements are collapsed (height 0, opacity 0) on page load
2. Clicking `[data-button="read-more-expand"]` toggles all sibling `[data-block="read-more-expand"]` elements
3. One button opens/closes ALL sibling blocks within the same parent
4. Button text toggles: "Lees meer" → "Lees minder" (and reverse)
5. Animation matches FAQ accordion: 0.4s, `power2.inOut`, height + opacity
6. Multiple independent read-more groups per page supported (scoped to parent)
7. Works on any page — not page-specific
8. Respects `prefers-reduced-motion` — show content immediately, no animation

## DOM Structure (Webflow)

```html
<div class="some-wrapper">
  <div data-block="read-more-expand">...content...</div>
  <div data-block="read-more-expand">...more content...</div>
  <a data-button="read-more-expand">Lees meer</a>
</div>
```

Button and blocks are direct DOM siblings within a shared parent wrapper.

## Approach

Mirror the `faq-accordion.js` pattern exactly:
- New file `read-more-expand.js` as standalone IIFE
- Same measure-then-animate pattern: set `height: auto`, read `offsetHeight`, reset to `0px`, tween to measured value
- Track state with `.is-open` class on the parent wrapper
- `gsap.set()` for initial collapsed state
- `gsap.to()` for expand/collapse animations

### Key differences from faq-accordion.js
- No icon rotation (no `vLine`)
- Button text swap instead of icon toggle
- One button toggles ALL sibling blocks (not single-item accordion)
- Independent groups (no close-others-on-open behaviour)
- `prefers-reduced-motion` support

## Files Affected

| File | Change |
|------|--------|
| `projects/nem-life/src/read-more-expand.js` | New file (~65 LOC) |
| `projects/nem-life/src/init.js` | Add `'read-more-expand.js'` to modules array (line 31) |

## Implementation Detail

```
read-more-expand.js (~65 LOC)
├── IIFE wrapper
├── Constants: DURATION (0.4), EASE ('power2.inOut'), REDUCED_MOTION check
├── Select all [data-button="read-more-expand"] buttons
├── Early return if none found
├── For each button:
│   ├── Find parent element
│   ├── Find all sibling [data-block="read-more-expand"] blocks
│   ├── gsap.set() all blocks to { height: 0, opacity: 0, overflow: 'hidden' }
│   ├── Store original button text (for toggle)
│   └── Add click listener:
│       ├── Check .is-open on parent wrapper
│       ├── If closed → expand all blocks (measure-then-animate)
│       ├── If open → collapse all blocks
│       └── Toggle button text and .is-open class
├── collapse(blocks): gsap.to each → height: 0, opacity: 0
└── expand(blocks): measure each → gsap.to height: h, opacity: 1
```

## Barba Impact

N/A — no Barba transitions in nem-life.

## Parallelisation Map

| Stream | Agent | Task | Est. LOC | Dependencies |
|--------|-------|------|----------|-------------|
| 1 | code-writer | Write `read-more-expand.js` + add to `init.js` | ~70 | None |

Single stream — too small to parallelise. Sequential execution.

## Verify Loop

### Pass/fail criteria
1. On page load, all `[data-block="read-more-expand"]` elements have `height: 0` and `opacity: 0`
2. Button text reads "Lees meer" on load
3. After clicking button, all sibling blocks are visible with `height: auto` and `opacity: 1`
4. Button text reads "Lees minder" after expanding
5. After clicking button again, all sibling blocks collapse back to `height: 0`, `opacity: 0`
6. Button text reads "Lees meer" after collapsing
7. Parent wrapper has `.is-open` class when expanded, removed when collapsed
8. Animation duration is 0.4s with `power2.inOut` easing
9. With `prefers-reduced-motion: reduce`, blocks show/hide instantly (no animation)
10. No console errors on the page

### Reproduction steps
1. Navigate to `https://nem-life-1.webflow.io/missie-nem-life`
2. Verify blocks are collapsed on load
3. Click the "Lees meer" button
4. Verify blocks expand with smooth animation
5. Verify button text changes to "Lees minder"
6. Click the "Lees minder" button
7. Verify blocks collapse
8. Verify button text changes back to "Lees meer"

### Tier mapping
- Tier 1 (auto): Tests 1–7, 10 covered by `nem-read-more-expand.spec.js`
- Tier 2 (CDN regression): Registered in `tests/registry.json`
- Tier 3 (manual): Test 8 (animation timing feel) — easing curves are subjective

### Regression scope
- FAQ accordion on home page must still work (separate module, no shared code)
- No other modules on missie page should break

## Acceptance Tests

See `tests/acceptance/nem-read-more-expand.spec.js`

1. `blocks are collapsed by default on page load`
2. `button text is "Lees meer" on load`
3. `clicking button expands all sibling blocks`
4. `button text changes to "Lees minder" after expanding`
5. `clicking button again collapses all blocks`
6. `button text changes back to "Lees meer" after collapsing`
7. `parent wrapper has is-open class when expanded`
8. `content is visible without animation when reduced motion is preferred`
9. `no JS errors on page load`
