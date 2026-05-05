# fix-about-slider-desktop-only-height

**Type:** fix
**Priority:** P2
**Status:** Ready to Build
**Created:** 2026-05-05
**Project:** ready-hit-play-prod

## Summary

The about page slider height calculation script (`about-swipers.js` lines 34–54) currently runs on all breakpoints. It should only fire on desktop (>991px). On tablet and below (<=991px), sliders should use auto height — the content already has `max-width` so it sizes correctly without the JS cap. Additionally, remove `pauseOnMouseEnter` from all Swiper instances on all breakpoints.

## Approach

**Approach A: matchMedia guard in init()** — selected over Swiper `autoHeight` (incompatible with `effect: 'fade'`) and CSS-only (still runs unnecessary DOM reads on mobile).

## Changes

### 1. `about-swipers.js` — JS breakpoint guard + remove pauseOnMouseEnter

**Lines 34–54:** Wrap the entire height calculation block in a `matchMedia` guard:
```js
const isDesktop = window.matchMedia?.('(min-width: 992px)').matches;
if (isDesktop) {
  // existing height calculation block (lines 35–54)
}
```

**Line 98:** Remove `pauseOnMouseEnter: true` from the Swiper autoplay config.

### 2. `ready-hit-play.css` — Mobile auto-height override

After line 1274 (end of existing Swiper slider rules), add:
```css
/* Mobile/tablet: auto height — content determines slider height, no JS cap */
@media (max-width: 991px) {
  .section_about-hero [data-slider] {
    height: auto;
  }
  .section_about-hero [data-slider] .swiper-slide {
    height: auto;
    position: relative;
  }
  .section_about-hero [data-slider] .slide-caption {
    height: auto;
  }
}
```

Key CSS notes:
- `.swiper-slide { position: relative }` overrides Swiper's fade-mode `position: absolute`, allowing slides to contribute to container height. Active slide is visible via opacity; inactive slides are `opacity: 0` and overlap but don't collapse the container.
- `.slide-caption { height: auto }` lets content flow naturally instead of inheriting `height: 100%` from a now-auto container.

### 3. `about-slider-autoheight.js` — Legacy shim sync

This file is an identical copy of `about-swipers.js` (CDN alias). Apply the same `pauseOnMouseEnter` removal. The height calc change should also be applied for consistency, though `init.js` no longer loads this file.

## Files Affected

| File | Lines | Change |
|------|-------|--------|
| `about-swipers.js` | 34–54, 98 | matchMedia guard around height calc, remove pauseOnMouseEnter |
| `ready-hit-play.css` | after 1274 | `@media (max-width: 991px)` auto-height override |
| `about-slider-autoheight.js` | same as above | Mirror changes (legacy shim) |

**LOC estimate:** ~15 LOC across 3 files

## Barba Impact

1. **Init/Destroy lifecycle:** No change — the module still inits/destroys via orchestrator. The matchMedia check runs inside `init()`, so each Barba navigation re-evaluates the breakpoint.
2. **State survival:** N/A — no state needs to persist across transitions.
3. **Transition interference:** N/A — slider height doesn't interact with leave/enter animations.
4. **Re-entry correctness:** Clean — `destroy()` resets `active` and clears instances. Next `init()` re-evaluates `matchMedia` fresh.
5. **Namespace scoping:** About page only — no change needed.

## Known Limitations

- No `resize` handler: if a user resizes from mobile to desktop mid-session without navigating, the height calc won't run (because `active` is already true and `init()` bails). This is a pre-existing limitation, not introduced by this change. The next Barba navigation to the about page will re-evaluate correctly.

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Dependencies |
|--------|------|-------|----------|--------------|
| A | JS changes (about-swipers.js + legacy shim) | code-writer | ~8 | None |
| B | CSS changes (ready-hit-play.css) | code-writer | ~10 | None |

- Streams A and B are independent — can run in parallel or sequentially (small enough for one pass)
- Recommendation: **Sequential** — total ~15 LOC, not worth parallelising
- Worktrees: No
- Agent teams: No

## Verify Loop

### Pass/fail criteria
1. **Desktop (1440x900):** Slider has explicit height from `--slide-max-height` CSS var (set by JS). `--slide-max-height` is present as inline style on `.section_about-hero`.
2. **Tablet (768x1024):** Slider has `height: auto` (computed). No `--slide-max-height` inline style on `.section_about-hero`. Slider content is visible and not collapsed to 0.
3. **Mobile (375x812):** Same as tablet — `height: auto`, content visible, not collapsed.
4. **All breakpoints:** Swiper autoplay does NOT pause on mouse hover. Swiper still autoplays and crossfades.
5. **All breakpoints:** No console errors on about page load.
6. **Reduced motion:** Autoplay disabled, slides still navigable by swipe/drag.

### Reproduction steps
1. Navigate to `/about` (direct load or via Barba from home)
2. Wait for RHP scripts init (2s settle)
3. **Desktop check:** Inspect `.section_about-hero` → should have `--slide-max-height` inline style
4. **Tablet check:** Resize to 768px width or use device emulation → `--slide-max-height` should NOT be present, computed height should be `auto`
5. **Hover check:** On desktop, hover over a slider → autoplay should NOT pause

### Tier mapping
- Tier 1: `fix-about-slider-desktop-only-height.spec.js` tests (desktop height, tablet auto, mobile auto, no pause, console errors)
- Tier 2: Registry entry for regression
- Tier 3: Manual — Safari crossfade rendering, iOS scroll behaviour

### Regression scope
- Swiper crossfade animation must still work on all breakpoints
- About page Barba transitions (home→about, about→home) must not break
- About icon scale module (`about-icon-scale.js`) is independent — uses different CSS vars

## Acceptance Tests

### Tier 1 — Auto: Playwright local
- `desktop: slider has JS-set height` — at 1440x900, `--slide-max-height` is present
- `tablet: slider has auto height` — at 768x1024, computed height is not 0, no `--slide-max-height`
- `mobile: slider has auto height` — at 375x812, computed height is not 0
- `no pause on hover` — autoplay continues after hover (desktop)
- `no console errors on about page` — standard error check
- `reduced motion: no autoplay` — slides don't auto-advance
- `Barba re-entry: clean re-init` — home→about→home→about, no errors

### Tier 2 — Auto: CDN regression
- Registered in `tests/registry.json` as `fix-about-slider-desktop-only-height`

### Tier 3 — Manual
- Safari crossfade rendering on mobile — Playwright only runs Chromium
- iOS real device scroll + slider swipe interaction
- Visual check that slide content looks correct with auto height (no unexpected gaps or overflow)
