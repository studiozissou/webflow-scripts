# Spec: About Slider Auto-Height

**Slug:** `rhp-about-slider-autoheight`
**Project:** ready-hit-play-prod
**Priority:** P1
**Status:** Ready to Build
**Created:** 2026-04-20

## Summary

Apply auto-height behaviour to all `.about-slider` Webflow sliders on the about page. Each `.w-slider` ancestor dynamically matches the height of its currently active `.w-slide` child, using a MutationObserver on `aria-hidden` attribute changes.

## Approach

Standalone module `about-slider-autoheight.js` following the standard RHP module pattern (IIFE, `window.RHP` registration, `init(container)` / `destroy()`).

## Implementation

### New file: `about-slider-autoheight.js`

```js
(() => {
  'use strict';

  const VERSION = '2026.4.20.1';
  let active = false;
  let observers = [];

  function updateSliderHeight(slider) {
    const slides = slider.querySelectorAll('.w-slide');
    for (let i = 0; i < slides.length; i++) {
      if (!slides[i].hasAttribute('aria-hidden')) {
        slider.style.height = slides[i].clientHeight + 'px';
        break;
      }
    }
  }

  function init(container) {
    if (active) return;
    active = true;

    const scope = container || document;
    const sliders = scope.querySelectorAll('.about-slider');

    sliders.forEach(wrapper => {
      const slider = wrapper.closest('.w-slider') || wrapper.querySelector('.w-slider') || wrapper;
      const slides = slider.querySelectorAll('.w-slide');
      if (!slides.length) return;

      // Set initial height
      updateSliderHeight(slider);

      // Observe each slide for aria-hidden attribute changes
      slides.forEach(slide => {
        const observer = new MutationObserver(() => updateSliderHeight(slider));
        observer.observe(slide, { attributes: true, attributeFilter: ['aria-hidden'] });
        observers.push(observer);
      });
    });
  }

  function destroy() {
    if (!active) return;
    active = false;
    observers.forEach(obs => obs.disconnect());
    observers = [];
  }

  window.RHP = window.RHP || {};
  window.RHP.aboutSliderAutoheight = { init, destroy, version: VERSION };
})();
```

### Changes to existing files

**`orchestrator.js` (~line 785-795)** — Add init/destroy calls in `RHP.views.about`:

```diff
  init(container) {
    if (active) return;
    active = true;
    RHP.aboutDialTicks?.init?.(container);
    RHP.aboutTextLines?.init?.(container);
+   RHP.aboutSliderAutoheight?.init?.(container);
    initAboutTeamHover(container);
  },
  destroy() {
    if (!active) return;
    active = false;
    RHP.lenis?.stop();
    RHP.aboutDialTicks?.destroy?.();
    RHP.aboutTextLines?.destroy?.();
+   RHP.aboutSliderAutoheight?.destroy?.();
    destroyAboutTeamHover();
  }
```

**`init.js`** — Add `about-slider-autoheight.js` to `CONFIG.modules` (after `about-text-lines.js`, before `home-intro.js`).

## Files Affected

| File | Action | Lines |
|------|--------|-------|
| `about-slider-autoheight.js` | Create | ~50 LOC |
| `orchestrator.js` | Edit | +2 lines (init + destroy call) |
| `init.js` | Edit | +1 line in CONFIG.modules array |

## Barba Impact

1. **Init/Destroy lifecycle** — Yes. MutationObservers are created in `init()` and disconnected in `destroy()`. Orchestrator calls both via `RHP.views.about`.
2. **State survival** — No. Slider height is purely visual and re-calculated on init.
3. **Transition interference** — No. Only sets `style.height` on `.w-slider` elements inside the Barba container. No z-index, opacity, or animation conflicts.
4. **Re-entry correctness** — Yes. `destroy()` clears all observers; `init()` re-creates them fresh. `active` guard prevents double-init.
5. **Namespace scoping** — `about` only. Called from `RHP.views.about.init()`.

## Verify Loop

### Pass/fail criteria
- Every `.about-slider .w-slider` on the about page has an inline `style.height` matching the active slide's `clientHeight`
- Changing slides (via Webflow's native arrow/dot navigation) updates the slider height within 1 frame
- No console errors on the about page
- After Barba transition home → about → home → about, sliders still auto-height correctly

### Reproduction steps
1. Navigate to `/about`
2. Wait for RHP init (scripts loaded)
3. Observe slider wrapper height matches active slide content
4. Click a slide navigation dot/arrow
5. Verify height updates to new active slide

### Tier mapping
- Tier 1: `rhp-about-slider-autoheight.spec.js` tests (element presence, height set, no errors, Barba lifecycle)
- Tier 2: Registry entry for regression
- Tier 3: Visual polish — verify height transition doesn't cause layout jank (cannot be automated, subjective)

### Regression scope
- About page modules (about-dial-ticks, about-text-lines, team hover) must not break
- Barba transitions to/from about must remain clean

## Parallelisation Map

This is a single-file feature with 2 minor integration edits. **No parallelisation needed** — sequential execution is optimal.

| Task | Agent | Est. tokens | Dependencies |
|------|-------|-------------|--------------|
| 1. Create module file | code-writer | ~2k | None |
| 2. Edit orchestrator.js | code-writer | ~1k | Task 1 |
| 3. Edit init.js | code-writer | ~1k | Task 1 |
| 4. Run acceptance tests | qa | ~3k | Tasks 1-3 |

Recommendation: Sequential, no worktrees, no team needed.

## Acceptance Tests

See `tests/acceptance/rhp-about-slider-autoheight.spec.js`

| # | Test name | What it checks |
|---|-----------|----------------|
| 1 | `.about-slider` elements exist on about page | DOM presence |
| 2 | slider has inline height set | Auto-height applied on init |
| 3 | no JS errors on about page | Console clean |
| 4 | Barba: navigate away and back, no errors | Clean re-init |
| 5 | height updates after slide change | MutationObserver working |
