# Spec: About Page Icon Viewport Fill

**Slug:** `rhp-about-icon-viewport-fill`
**Status:** Ready to Build
**Priority:** P1
**Project:** ready-hit-play-prod
**Created:** 2026-04-22

## Summary

On the RHP about page, dynamically scale `.icon-embed-r` so it fills the remaining vertical viewport height on page load. The icon, `.about_header`, 4x `.accordion-title` elements, and 5vw vertical section padding must all fit inside the viewport. The icon maintains its aspect ratio and recalculates on resize.

## Approach

**JS Measurement + CSS Custom Property** — replicates the existing `setNavHeight` pattern in `orchestrator.js:1244-1253`. A new module `about-icon-scale.js` measures element heights, calculates remaining space, and sets a `--icon-max-height` CSS custom property. CSS applies `max-height: var(--icon-max-height)` to `.icon-embed-r` with aspect-ratio preservation.

### Why not CSS-only?

The section cannot be fixed at `height: 100svh` because accordion content expands later (scroll-triggered open via `about-scroll-accordions.js`). A fixed-height section would either clip accordion content or cause the icon to shrink as accordions open. The JS approach measures once on load and sets a fixed pixel value that won't change when accordions expand.

## Implementation

### File 1: `about-icon-scale.js` (NEW — ~65 LOC)

```
projects/ready-hit-play-prod/about-icon-scale.js
```

Module structure follows `about-dial-ticks.js` template:

```js
/* =========================================
   RHP — About Icon Viewport Fill
   - Scales .icon-embed-r to fill remaining viewport height
   - Measures: viewport - .about_header - 4x .accordion-title - 5vw padding
   - Sets --icon-max-height CSS custom property
   - Barba-safe: init(container) / destroy()
   ========================================= */
(() => {
  const VERSION = '2026.4.22.1';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const SEL = {
    section: '.section_about-hero',
    header: '.about_header',
    accordionTitle: '.accordion-title',
    icon: '.icon-embed-r'
  };

  RHP.aboutIconScale = (() => {
    let alive = false;
    let cleanup = [];
    let rafId = 0;

    function on(el, evt, fn, opts) {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
      cleanup.push(() => el.removeEventListener(evt, fn, opts));
    }

    function measure() {
      if (!alive) return;

      const section = document.querySelector(SEL.section);
      if (!section) return;

      // Viewport height (safe for iOS)
      const vh = window.visualViewport?.height ?? window.innerHeight;

      // Section vertical padding: 5vw top + 5vw bottom = 10vw
      const vw = window.innerWidth;
      const sectionPadding = vw * 0.05 * 2;

      // .about_header height
      const header = section.querySelector(SEL.header);
      const headerH = header ? header.offsetHeight : 0;

      // Sum of all .accordion-title heights within the section
      const titles = section.querySelectorAll(SEL.accordionTitle);
      let titlesH = 0;
      titles.forEach(t => { titlesH += t.offsetHeight; });

      // Remaining height for icon
      const remaining = vh - sectionPadding - headerH - titlesH;
      const iconMaxH = Math.max(0, remaining);

      section.style.setProperty('--icon-max-height', iconMaxH + 'px');
    }

    function measureDebounced() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    }

    function init(container = document) {
      if (alive) return;

      const section = (container.querySelector ? container.querySelector(SEL.section) : null)
        || document.querySelector(SEL.section);
      if (!section) return;

      alive = true;
      measure();
      on(window, 'resize', measureDebounced, { passive: true });
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(rafId);
      cleanup.forEach(fn => { try { fn(); } catch (e) {} });
      cleanup = [];
      // Clean up CSS custom property
      const section = document.querySelector(SEL.section);
      if (section) section.style.removeProperty('--icon-max-height');
    }

    return { init, destroy, measure, version: VERSION };
  })();
})();
```

**Key decisions:**
- Sets `--icon-max-height` on `.section_about-hero` (scoped, not `:root`) — avoids polluting global namespace
- Uses `visualViewport?.height ?? window.innerHeight` — canonical RHP mobile pattern
- Uses `section.querySelectorAll(SEL.accordionTitle)` — scoped to section, safe if more accordions are added elsewhere
- rAF debounce on resize — matches `setNavHeightDebounced` pattern
- No `gsap.context()` needed — no GSAP tweens, just measurements and CSS var
- Cleans up CSS property in `destroy()` — prevents stale values after Barba transition

### File 2: `orchestrator.js` — wire into about view

**Lines 785-790 (init):** Add after `RHP.aboutSliderAutoheight?.init?.(container);`

```js
RHP.aboutIconScale?.init?.(container);
```

**Lines 800-802 (destroy):** Add after `RHP.aboutSliderAutoheight?.destroy?.();`

```js
RHP.aboutIconScale?.destroy?.();
```

### File 3: `init.js` — register module

**Line 77** (after `'about-scroll-accordions.js'`): Add to `CONFIG.modules`:

```js
'about-icon-scale.js',
```

**Line ~237** (health checks array): Add entry:

```js
{ module: 'about-icon-scale.js', ok: typeof RHP.aboutIconScale !== 'undefined', detail: RHP.aboutIconScale?.version || '' },
```

**Line ~263** (versions table): Add entry:

```js
'about-icon-scale.js': RHP.aboutIconScale?.version || '—',
```

### File 4: `ready-hit-play.css` — icon sizing rule

Add rule (after existing about section styles):

```css
/* About icon: fill remaining viewport height (set by about-icon-scale.js) */
.section_about-hero .icon-embed-r {
  max-height: var(--icon-max-height, none);
  width: auto;
  height: auto;
}
.section_about-hero .icon-embed-r svg {
  max-height: inherit;
  width: auto;
  height: auto;
}
```

**Note:** If Webflow sets explicit `height`/`width` on `.icon-embed-r` or its SVG, may need `!important` or higher specificity. Verify in Webflow Designer before committing CSS. The `svg` child rule ensures the SVG scales with its container rather than using its intrinsic `viewBox` dimensions.

## Barba Impact

1. **Init/Destroy lifecycle:** Yes — `init(container)` measures and sets CSS var + resize listener; `destroy()` removes listener and clears CSS var. Orchestrator calls both via `views.about`.
2. **State survival:** No state needs to persist across transitions. The CSS var is recalculated on each `init()`.
3. **Transition interference:** None. The module only sets a CSS custom property — no opacity tweens, no z-index changes, no DOM mutations that could conflict with leave/enter.
4. **Re-entry correctness:** Clean. `destroy()` removes the CSS var + listener; `init()` re-measures from scratch. No stale listeners or doubled DOM nodes possible.
5. **Namespace scoping:** About only. Selector `.section_about-hero` only exists on the about page. Module exits early if section not found.

## Verify Loop

### Pass/fail criteria

1. On about page load (direct or via Barba), `.icon-embed-r` is fully visible within the viewport
2. `--icon-max-height` CSS custom property is set on `.section_about-hero` with a positive pixel value
3. `.about_header` + 4x `.accordion-title` + icon + padding all fit within viewport height (no vertical scroll needed to see them)
4. On window resize, `--icon-max-height` updates within 1 rAF
5. On Barba home→about→home→about, no errors, CSS var is set correctly each time
6. `RHP.aboutIconScale` exists with `version`, `init`, `destroy`, `measure`

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/about`
2. Observe: icon + header + accordion titles all visible in viewport
3. Open DevTools → Elements → `.section_about-hero` → check `--icon-max-height` is set
4. Resize window → verify `--icon-max-height` updates
5. Navigate to home → back to about → verify icon still sized correctly

### Tier mapping

- **Tier 1 (auto):** `rhp-about-icon-viewport-fill.spec.js` tests 1-7
- **Tier 2 (CDN regression):** registered in `tests/registry.json`
- **Tier 3 (manual):**
  - Visual check: icon aspect ratio looks correct (not stretched) — subjective visual quality
  - iOS Safari: `visualViewport.height` correctness with dynamic address bar
  - Multiple breakpoints (tablet, mobile) — Playwright only runs one viewport at a time

### Regression scope

- Accordion scroll-open animation must still work (`.accordion-content` expanding doesn't change `--icon-max-height` since it's calculated from titles only)
- `about-slider-autoheight.js` — unrelated, different section
- `about-dial-ticks.js` — unrelated, different element
- Barba transitions — tested via re-entry test

## Test Plan

### Tier 1 — Auto: Playwright local

See `tests/acceptance/rhp-about-icon-viewport-fill.spec.js`

| # | Test | Assertion |
|---|------|-----------|
| 1 | CSS var is set on page load | `--icon-max-height` on `.section_about-hero` is a positive px value |
| 2 | Icon is visible in viewport | `.icon-embed-r` `isVisible()` and within viewport bounds |
| 3 | Module registered | `window.RHP.aboutIconScale` exists with version string |
| 4 | No console errors | Zero `pageerror` events on about page |
| 5 | Barba re-entry | home→about→home→about: CSS var set, no errors |
| 6 | Responsive 375px | CSS var set at mobile viewport, icon visible |
| 7 | Reduced motion | Icon visible (no animation to skip, but verify no error) |

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json` as `rhp-about-icon-viewport-fill`.

### Tier 3 — Manual

- iOS Safari dynamic address bar: verify `visualViewport.height` gives correct value
- Visual: icon aspect ratio looks natural, not squished
- Tablet (768px): verify layout works at intermediate breakpoint

## Acceptance Tests

See `tests/acceptance/rhp-about-icon-viewport-fill.spec.js`:
1. `CSS var --icon-max-height is set on section`
2. `.icon-embed-r is visible within viewport`
3. `RHP.aboutIconScale module is registered`
4. `no JS errors on about page`
5. `Barba re-entry: home→about→home→about`
6. `mobile 375px: CSS var set and icon visible`
7. `prefers-reduced-motion: icon visible`

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Sequential? |
|--------|------|-------|----------|-------------|
| A | Write `about-icon-scale.js` | code-writer | 65 | Independent |
| B | Wire into orchestrator + init.js | code-writer | 6 | Blocked on A (needs module to exist) |
| C | Add CSS rule to `ready-hit-play.css` | code-writer | 8 | Independent |

**Recommendation:** Sequential — total LOC is ~80, all in one logical unit. A single code-writer agent handles all 3 steps in order. No worktrees or teams needed. Parallel execution would add coordination overhead for minimal time savings.
