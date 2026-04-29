# fix-about-slider-and-icon-fouc

**Project:** ready-hit-play
**Type:** bug
**Priority:** P1
**Status:** Planning
**Created:** 2026-04-29

## Summary

Two bugs on the about page:
1. **Slider autoheight doesn't fire on Barba transition** — `aboutSliderAutoheight.init()` measures height synchronously before Webflow's slider JS has reinited (`_reinitWebflow()` runs ~70 lines after `views[ns].init()` in `runAfterEnter`)
2. **R logo SVG fills entire viewport on direct reload** — CSS fallback values are all `0px`, making `.icon-embed-r` `100svh` before JS sets `--top-offset`/`--header-height`/`--titles-height`. Also: no content reveal animation fires on direct load, and no fade-out on about→home transition causes an unstyled flash.

## Root Causes

### Bug 1: Slider timing
- `about-slider-autoheight.js` line 43: `updateSliderHeight(slider)` runs synchronously in `init()`
- Orchestrator `runAfterEnter` line 1627 calls `views[ns].init()`, but `_reinitWebflow()` doesn't run until line 1700 — Webflow's slider JS hasn't set `aria-hidden` attributes on `.w-slide` elements yet
- No `fonts.ready`, `window.load`, or double-rAF deferral (unlike `about-icon-scale.js` which has all three)
- On direct page load (`bootCurrentView`), this works because Webflow's slider JS has already run by the time our scripts load

### Bug 2: R logo FOUC
- `ready-hit-play.css` line 1241: `height: calc(100svh - var(--top-offset, 0px) - var(--header-height, 0px) - var(--titles-height, 0px))` — with `0px` fallbacks, icon is `100svh` before JS
- `about-icon-scale.js` uses double-rAF deferral, creating a visible multi-frame flash
- `revealAboutContent()` only runs on Barba transitions (orchestrator line 1632 guards on `data.current?.namespace !== 'about'`), not on direct page load
- About→home transition (`leaveAboutToHome`) slides container out via `xPercent: -100` but `views.about.destroy()` fires in `beforeLeave` (line 1861), removing CSS vars before the slide animation completes — R logo jumps to `100svh` during the slide-out

## Approach: Hybrid A+C

### Fix 1: Slider autoheight timing
- Add double-rAF deferral to the initial `updateSliderHeight()` call in `init()` (matching `aboutIconScale` pattern)
- Add `document.fonts.ready` and `window.load` re-measurement guards
- Do NOT reorder `_reinitWebflow()` in orchestrator (risky — IX2 re-assert guard depends on current ordering)

### Fix 2: R logo FOUC
- **CSS fallback:** Add `max-height: 50svh` on `.section_about-hero .icon-embed-r` — prevents worst-case 100svh flash before JS
- **Direct-load reveal:** In `bootCurrentView` about branch, call `RHP.homeAboutSlide?.revealAboutContent?.(container)` after `views.about.init()` — fires the same SplitText stagger + curtain dismiss that Barba transitions use
- **About→home fade-out:** Move `views.about.destroy()` from `beforeLeave` to `leave()` `onComplete` callback (or after the slide tween), so CSS vars persist during the exit animation. Add a quick `gsap.to(container, { opacity: 0, duration: 0.3 })` layered on top of the xPercent slide for visual polish.

## Files Affected

| File | Change | Lines |
|------|--------|-------|
| `about-slider-autoheight.js` | Double-rAF initial measure + `fonts.ready` + `window.load` guards | L28–53 |
| `ready-hit-play.css` | Add `max-height: 50svh` to `.section_about-hero .icon-embed-r` | L1240–1243 |
| `orchestrator.js` | Add `revealAboutContent` call in `bootCurrentView` about branch | L1449 |
| `orchestrator.js` | Move `views.about.destroy()` in about-to-home `beforeLeave` to after slide tween completes | L1859–1868 |
| `home-about-slide.js` | Guard `_runReveal` curtain animation against null/hidden curtain for direct-load path | L120–186 |

## Detailed Changes

### 1. `about-slider-autoheight.js`

Replace the synchronous init measurement with deferred + guarded pattern:

```js
function init(container) {
  if (active) return;
  if (!container) return;
  active = true;

  const sliders = container.querySelectorAll('.about-slider');

  sliders.forEach(wrapper => {
    const slider = wrapper.closest('.w-slider') || wrapper.querySelector('.w-slider') || wrapper;
    const slides = slider.querySelectorAll('.w-slide');
    if (!slides.length) return;

    trackedSliders.push(slider);

    // Defer initial measurement: double-rAF ensures Barba-inserted container
    // has been laid out AND Webflow slider JS has re-initialized
    requestAnimationFrame(() => requestAnimationFrame(() => updateSliderHeight(slider)));

    // Observe each slide for aria-hidden attribute changes
    slides.forEach(slide => {
      const observer = new MutationObserver(() => requestAnimationFrame(() => updateSliderHeight(slider)));
      observer.observe(slide, { attributes: true, attributeFilter: ['aria-hidden'] });
      observers.push(observer);
    });
  });

  // Re-measure after fonts load (heights shift with web fonts)
  document.fonts.ready.then(() => {
    trackedSliders.forEach(updateSliderHeight);
  });

  // Re-measure on full page load (images may affect slide content height)
  const onLoad = () => trackedSliders.forEach(updateSliderHeight);
  window.addEventListener('load', onLoad, { once: true });
  cleanupFns.push(() => window.removeEventListener('load', onLoad));
}
```

Add `cleanupFns` array for event listener cleanup in `destroy()`.

### 2. `ready-hit-play.css`

Add `max-height: 50svh` as a FOUC guard:

```css
.section_about-hero .icon-embed-r {
  height: calc(100svh - var(--top-offset, 0px) - var(--header-height, 0px) - var(--titles-height, 0px));
  max-height: 50svh; /* FOUC guard — JS removes via --top-offset etc */
  width: auto;
}
```

Wait — this won't work correctly because once JS sets the vars, the `calc()` result will be correct but `max-height: 50svh` will clamp it. We need a different approach: only apply `max-height` when the vars aren't set.

Better approach — use a sentinel var that JS sets:

```css
.section_about-hero .icon-embed-r {
  height: calc(100svh - var(--top-offset, 0px) - var(--header-height, 0px) - var(--titles-height, 0px));
  width: auto;
}

/* FOUC guard: cap height until JS sets --icon-scale-ready */
.section_about-hero:not([style*="--icon-scale-ready"]) .icon-embed-r {
  max-height: 50svh;
}
```

And in `about-icon-scale.js`, after `measure()`, set: `sectionEl.style.setProperty('--icon-scale-ready', '1')`.

Remove in `destroy()`: `sectionEl.style.removeProperty('--icon-scale-ready')`.

### 3. `orchestrator.js` — `bootCurrentView` about branch

After `RHP.views.about?.init?.(container)` on line 1449, add:

```js
RHP.views.about?.init?.(container);

// Content reveal animation for direct-land (same as Barba transition path)
RHP.homeAboutSlide?.revealAboutContent?.(container);
```

### 4. `home-about-slide.js` — Guard for direct-load

In `_runReveal`, the curtain `tl.to(curtainEl, ...)` at line 150 should be conditional — on direct load, the curtain is already hidden (`display: none`, `x: -100vw`). The content reveal should still run, but the curtain animation should be skipped:

```js
function _runReveal(container, g, SplitText) {
  // ... existing target collection + pre-hide + SplitText ...

  var tl = g.timeline();

  // Only animate curtain if it's currently visible (Barba transition path)
  var curtainVisible = curtainEl && getComputedStyle(curtainEl).display !== 'none';
  if (curtainVisible) {
    tl.to(curtainEl, {
      x: '100vw',
      duration: 0.6,
      ease: 'power2.in',
      onComplete: function () {
        g.set(curtainEl, { display: 'none' });
      }
    }, 0);
  }

  // Content stagger (starts immediately on direct-load, 0.2s after curtain on Barba)
  var interElementDelay = allTargets.length > 1 ? 2.0 / allTargets.length : 0;
  var staggerStart = curtainVisible ? 0.2 : 0;
  // ... rest of stagger with offset = staggerStart + (k * interElementDelay) ...
}
```

### 5. `orchestrator.js` — About→home destroy timing

Move `views.about.destroy()` from `beforeLeave` to after the slide animation:

```js
{
  name: 'about-to-home',
  from: { namespace: ['about'] },
  to: { namespace: ['home'] },
  beforeLeave(data) {
    // Don't destroy about view here — CSS vars must persist during slide-out
    RHP.videoLoader?.destroy?.();
  },
  leave(data) {
    const g = window.gsap;
    // Optional: fade container opacity during slide for polish
    if (g && data?.current?.container) {
      g.to(data.current.container, { opacity: 0, duration: 0.8, ease: 'power2.in' });
    }
    return RHP.homeAboutSlide?.leaveAboutToHome
      ? RHP.homeAboutSlide.leaveAboutToHome(data)
      : undefined;
  },
  enter() {
    window.scrollTo(0, 0);
    RHP.homeScrollMorph?.skipToEnd?.();
  },
  afterEnter(data) {
    // Destroy about view here (after slide-out completes)
    const prevNs = data.current?.namespace;
    if (prevNs && RHP.views[prevNs]?.destroy) RHP.views[prevNs].destroy();
    runAfterEnter(data);
  }
}
```

Note: `runAfterEnter` does NOT call `views[prevNs].destroy()` — that's done in `beforeLeave`. Moving it to `afterEnter` means we need the explicit destroy call before `runAfterEnter`.

## Barba Impact

1. **Init/Destroy lifecycle:** Both `aboutSliderAutoheight` and `aboutIconScale` already have proper `init(container)` / `destroy()` — no change needed.
2. **State survival:** No state needs to persist across transitions.
3. **Transition interference:** Moving `destroy()` from `beforeLeave` to `afterEnter` for about-to-home means CSS vars (and thus R icon sizing) persist through the slide animation. The slide-out via `xPercent: -100` moves content off-screen, so even without fade the R logo size is irrelevant once off-viewport.
4. **Re-entry correctness:** Double-rAF + `fonts.ready` + `MutationObserver` guards mean the slider will correctly measure on re-entry regardless of timing.
5. **Namespace scoping:** Changes only affect `about` namespace. Home and case paths are untouched.

## Verify Loop

### Pass/fail criteria
- [ ] On Barba transition (home→about): `.about-slider .w-slider` has a valid `Npx` inline height within 2s of page appearing
- [ ] On direct page load (/about): `.icon-embed-r` is NOT `100svh` tall — max-height guard caps at `50svh` before JS, then JS sets correct calculated height
- [ ] On direct page load: content reveal animation fires (R-link, header, accordion titles fade in with SplitText stagger)
- [ ] On about→home transition: R logo does NOT flash to full-viewport height during slide-out
- [ ] On Barba round-trip (home→about→home→about): slider height and icon scale both correct on re-entry
- [ ] No console errors on any path

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/` (home)
2. Click "About" link → wait for curtain + content reveal
3. Scroll to slider section → verify slider has visible content, not collapsed
4. Reload `/about` directly → R logo should NOT fill entire viewport
5. After reload, content should animate in (SplitText stagger)
6. Click home link → about content should fade/slide out without R logo flash

### Tier mapping
- Tier 1 (auto): `rhp-about-slider-autoheight.spec.js` tests slider height on direct load, Barba transition, and slide change
- Tier 1 (auto): New tests for icon FOUC guard and direct-load reveal
- Tier 3 (manual): iOS Safari reload behaviour (Safari-specific FOUC timing)
- Tier 3 (manual): Visual animation timing feel for content reveal on direct load

### Regression scope
- Barba transitions (home→about, about→home, work→about) must still work
- `aboutIconScale` CSS vars must still be set correctly after init
- `homeAboutSlide` curtain animation on Barba path must be unaffected
- About team hover/scroll interactions unaffected
- `aboutDialTicks` canvas rendering unaffected

## Parallelisation Map

| Stream | Task | Agent | Est. tokens | Dependencies |
|--------|------|-------|-------------|--------------|
| A | Fix `about-slider-autoheight.js` (double-rAF + guards) | code-writer | ~2k | None |
| B | Add `max-height` CSS FOUC guard + sentinel var | code-writer | ~1k | None |
| C | Add `revealAboutContent` call to `bootCurrentView` | code-writer | ~1k | None |
| D | Guard `_runReveal` for direct-load (no curtain) | code-writer | ~2k | None |
| E | Move `destroy()` timing in about-to-home transition | code-writer | ~2k | None |
| F | Update acceptance tests | code-writer | ~3k | A, B, C, D, E |

Streams A–E are independent and can run in parallel (separate files). Stream F depends on all others.

**Recommendation:** Sequential build — changes are small enough that a single code-writer agent can handle all in one pass. Parallel worktrees not needed.

## Acceptance Tests

See `tests/acceptance/fix-about-slider-and-icon-fouc.spec.js`

| # | Test name | What it verifies |
|---|-----------|------------------|
| 1 | slider has inline height on direct load | Slider `.w-slider` gets `Npx` height on `/about` direct load |
| 2 | slider has inline height after Barba transition | Height set after home→about via Barba |
| 3 | height updates after slide change | MutationObserver fires, height refreshes |
| 4 | icon-embed-r is capped before JS (max-height guard) | `.icon-embed-r` height ≤ 50svh immediately after DOM |
| 5 | icon CSS vars set after init | `--top-offset`, `--header-height`, `--titles-height` all set on `.section_about-hero` |
| 6 | content reveal fires on direct load | R-link, header, accordion titles are visible (opacity > 0) |
| 7 | no R logo flash on about→home | During transition, `.icon-embed-r` height doesn't jump to viewport height |
| 8 | Barba round-trip: slider and icon correct | home→about→home→about cycle: both features work on re-entry |
| 9 | no console errors | No JS errors on direct load or Barba paths |
| 10 | reduced motion: content visible | With `prefers-reduced-motion: reduce`, all content immediately visible |
| 11 | WCAG 2.1 AA | axe-core accessibility audit on about page |
