# RHP — About Page Scroll Accordions

**Slug:** `rhp-about-scroll-accordions`
**Project:** ready-hit-play-prod
**Type:** Feature
**Priority:** P1
**Status:** Planning

## Summary

Scroll-triggered accordion reveal on the about page. Each `.accordion-content` opens (height 0 → auto, opacity 0 → 1) when its sibling `.accordion-title` crosses a ScrollTrigger threshold at 35% from the bottom of the viewport. Reversible on scroll-back.

## HTML Structure (from Webflow staging)

```html
<div class="accordion-block">
  <div class="accordion-title">
    <h2 class="heading-style-h2 text-color-green">What we know</h2>
  </div>
  <div class="accordion-content">
    <div class="accordion-column-wrapper">
      <div class="accordion-column"><!-- text --></div>
      <div class="accordion-column"><!-- image --></div>
    </div>
    <div class="spacer-huge"></div>
  </div>
</div>
```

- **Section:** `.section_about-hero`
- **Count:** 2–3 `.accordion-block` elements
- **Initial state:** All closed (height 0, opacity 0 on `.accordion-content`)
- **Behaviour:** Multiple can be open simultaneously

## Approach

**ScrollTrigger per accordion** — one `ScrollTrigger.create()` per `.accordion-title`. GSAP natively tweens `height: "auto"`. `toggleActions: "play none none reverse"` handles forward/reverse.

### Why this approach
- GSAP handles `height: "auto"` natively (no max-height hack needed)
- ScrollTrigger `toggleActions` gives free reverse on scroll-back
- Matches existing RHP module pattern exactly (earth-parallax.js, about-text-lines.js)
- ~50 LOC, single file, low risk

## Architecture

### New file: `about-scroll-accordions.js`

Standard RHP IIFE module pattern:

```javascript
(() => {
  'use strict';
  const VERSION = '2026.4.21.1';
  window.RHP = window.RHP || {};

  RHP.aboutScrollAccordions = (() => {
    let active = false;
    let ctx = null;

    function init(container) {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      if (!gsap || !ScrollTrigger) return;
      if (active) return;
      active = true;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scope = container || document;
      const blocks = scope.querySelectorAll('.section_about-hero .accordion-block');
      if (!blocks.length) return;

      ctx = gsap.context(() => {
        blocks.forEach((block) => {
          const title = block.querySelector('.accordion-title');
          const content = block.querySelector('.accordion-content');
          if (!title || !content) return;

          // Initial state
          gsap.set(content, { height: 0, opacity: 0, overflow: 'hidden' });

          if (reducedMotion) {
            // Skip animation — show content immediately
            gsap.set(content, { height: 'auto', opacity: 1, overflow: 'visible' });
            return;
          }

          // Open timeline
          const tl = gsap.timeline({ paused: true });
          tl.to(content, {
            height: 'auto',
            opacity: 1,
            duration: 0.75,
            ease: 'power3.out',
            onComplete: () => gsap.set(content, { overflow: 'visible' }),
            onReverseComplete: () => gsap.set(content, { overflow: 'hidden' })
          });

          // ScrollTrigger: fire when .accordion-title hits 35% from bottom
          ScrollTrigger.create({
            trigger: title,
            start: 'top 65%',       // 35% from bottom = 65% from top
            toggleActions: 'play none none reverse',
            animation: tl
          });
        });
      }, scope);
    }

    function destroy() {
      if (!active) return;
      active = false;
      if (ctx) { ctx.revert(); ctx = null; }
    }

    return { init, destroy, version: VERSION };
  })();
})();
```

### Integration points (3 files)

| File | Change | LOC |
|------|--------|-----|
| `about-scroll-accordions.js` | New module (above) | ~50 |
| `init.js` | Add `'about-scroll-accordions.js'` to `CONFIG.modules` array (after `about-slider-autoheight.js`) + add health check entry | ~3 |
| `orchestrator.js` | Add `RHP.aboutScrollAccordions?.init?.(container)` in `views.about.init()` and `RHP.aboutScrollAccordions?.destroy?.()` in `views.about.destroy()` | ~2 |

### CSS (in Webflow or ready-hit-play.css)

Initial state should be set by JS (not CSS) to avoid FOUC on non-JS fallback. The `gsap.set(content, { height: 0, opacity: 0 })` in `init()` handles this.

**Optional CSS fallback** (if JS fails to load, content stays visible):
```css
/* No CSS needed — content is visible by default in Webflow.
   JS sets height:0/opacity:0 on init. If JS fails, content shows normally. */
```

## Barba Impact

1. **Init/Destroy lifecycle** — Yes. Module creates ScrollTrigger instances inside `gsap.context()`. `ctx.revert()` in `destroy()` kills all. Orchestrator calls init/destroy via `views.about`.
2. **State survival** — No. Accordion open/close state does not need to persist across transitions. Re-entering about page starts all accordions closed again (correct — user scrolls to reveal).
3. **Transition interference** — No. Accordions are inside `[data-barba="container"]` and use standard height/opacity tweens. No z-index or stacking conflicts with leave/enter transitions.
4. **Re-entry correctness** — Yes. `destroy()` calls `ctx.revert()` which kills all ScrollTriggers and clears inline styles. `init()` guards against double-init with `if (active) return`. Clean re-entry on home → about → home → about.
5. **Namespace scoping** — About only. Orchestrator calls init/destroy exclusively in `views.about`. Selectors scoped to `.section_about-hero .accordion-block`.

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Sequential? |
|--------|------|-------|----------|-------------|
| 1 | Write `about-scroll-accordions.js` | code-writer | 50 | Independent |
| 2 | Wire into `init.js` + `orchestrator.js` | code-writer | 5 | After stream 1 |
| 3 | Acceptance tests | qa | 80 | Independent |

**Recommendation:** Sequential build (streams 1 → 2). Low complexity, single developer. No worktrees needed.

## Verify Loop

### Pass/fail criteria

1. **All accordions start closed** — `.accordion-content` has computed height 0 and opacity 0 on page load (after RHP init)
2. **Accordion opens on scroll** — When `.accordion-title` crosses 65% from top of viewport (35% from bottom), its sibling `.accordion-content` animates to visible height and opacity 1
3. **Animation timing** — Duration 0.75s, power3.out easing
4. **Reverse on scroll-back** — Scrolling up past the trigger point reverses the animation (content collapses)
5. **Multiple open** — Two or more accordions can be open simultaneously
6. **No console errors** — No JS errors on about page load or during scroll
7. **Barba re-entry** — home → about → home → about: accordions work correctly on second visit
8. **Reduced motion** — Content visible immediately, no animation

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/about`
2. Wait for RHP scripts to load (`window.RHP.scriptsOk`)
3. Verify all `.accordion-content` elements have height 0
4. Scroll down slowly until first `.accordion-title` reaches ~35% from bottom of viewport
5. Observe first `.accordion-content` animating open (height + opacity)
6. Continue scrolling to trigger remaining accordions
7. Scroll back up past each trigger point — observe reverse animation
8. Navigate to home (Barba), then back to about — repeat steps 3-7

### Tier mapping

- **Tier 1 (auto):** DOM presence, initial state, scroll trigger, reverse, console errors, Barba re-entry, reduced motion — all in `tests/acceptance/rhp-about-scroll-accordions.spec.js`
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (manual):**
  - Animation easing feel (power3.out subjective quality) — can't automate aesthetic judgement
  - Safari/Firefox cross-browser — Playwright only runs Chromium
  - Mobile touch scroll behaviour — real device needed

## Test Plan

### Tier 1 — Auto: Playwright local
See acceptance test file: `tests/acceptance/rhp-about-scroll-accordions.spec.js`

### Tier 2 — Auto: CDN regression
Registered in `tests/registry.json` under id `rhp-about-scroll-accordions`

### Tier 3 — Manual
- Animation easing feel (power3.out curve) — subjective
- Safari + Firefox cross-browser — Playwright = Chromium only
- Mobile scroll + touch — real device needed
- Scroll speed sensitivity — how fast scroll affects trigger reliability

## Acceptance Tests

1. `accordion-content elements are present and start collapsed` — height 0, opacity 0
2. `accordion opens when title scrolls to 35% from bottom` — scroll, verify height > 0 and opacity 1
3. `accordion reverses when scrolling back up` — scroll down then up, verify height returns to 0
4. `multiple accordions can be open simultaneously` — scroll past two triggers, both visible
5. `no JS errors on about page` — pageerror listener
6. `Barba re-entry: accordions work on second visit` — home → about → home → about
7. `reduced motion: content visible without animation` — prefers-reduced-motion, opacity > 0
