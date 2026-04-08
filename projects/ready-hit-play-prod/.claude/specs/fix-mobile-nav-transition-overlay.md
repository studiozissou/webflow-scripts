# fix-mobile-nav-transition-overlay

> Fix nav visibility during home→about transition + logo position jump on about→home

**Priority:** P1
**Status:** Ready to Build
**Created:** 2026-04-03
**Jam source:** cc7b5c16-7c6c-423b-8a80-bafa0edf57e6

---

## Problem

**Bug 5:** During home→about (or work→about) transition, the Webflow nav bar remains visible through/above the `.about-transition` overlay. The overlay fades in during `leave()`, but `rhp-nav-hidden` is only added in `runAfterEnter()` — after the transition completes.

**Bug 4:** On about→home, the logo Flip animation ends correctly at `_logo-start`, but after `clearProps: 'all'` (orchestrator.js line 2046) the logo snaps to a slightly different y-position than the actual nav logo. Visible as a small downward jump on mobile.

---

## Root Cause

**Bug 5:** `home-to-about` `beforeLeave` (line 2148) and `work-to-about` `beforeLeave` (line 2196) do not add `rhp-nav-hidden`. The nav's Webflow z-index (~1000) may exceed `.about-transition`'s z-index.

**Bug 4:** `_logo-start` container is Webflow-positioned. After Flip completes and `clearProps: 'all'` removes inline styles, the transition logo sits at `_logo-start`'s CSS position — which may differ by a few px from the actual nav logo position on mobile viewports.

---

## File Changes

### `orchestrator.js`

**1. home-to-about beforeLeave (line ~2148)**

Add nav hide before view destroy:

```js
beforeLeave(data) {
  const ns = data.current?.namespace || currentNs;
  // Hide nav immediately — transition overlay must cover it
  const wrapper = document.querySelector('[data-barba="wrapper"]') || document.body;
  wrapper.classList.add('rhp-nav-hidden');
  if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
  RHP.videoLoader?.destroy?.();
},
```

**2. work-to-about beforeLeave (line ~2196)**

Same addition after the Lenis stop + scroll reset:

```js
beforeLeave(data) {
  RHP.lenis?.stop();
  const dialFg = document.querySelector('.dial_layer-fg');
  if (dialFg) dialFg.scrollTop = 0;
  const ns = data.current?.namespace || currentNs;
  // Hide nav immediately
  const wrapper = document.querySelector('[data-barba="wrapper"]') || document.body;
  wrapper.classList.add('rhp-nav-hidden');
  if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
  RHP.workDial?.destroy?.();
  RHP.videoLoader?.destroy?.();
  setDialNs('home');
},
```

**3. runAboutToHomeTransition completion (line ~2042)**

Before clearProps, align transition logo to actual nav logo position:

```js
return Promise.all(promises).then(() => {
  RHP.transitionDial?.resize?.();
  // Align transition logo to actual nav logo position before clearProps
  if (logo) {
    const wrapper = document.querySelector('[data-barba="wrapper"]') || document.body;
    const navLogoWrapper = wrapper.querySelector('.nav_logo-wrapper-2');
    if (navLogoWrapper) {
      const navRect = navLogoWrapper.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();
      const dy = navRect.top - logoRect.top;
      if (Math.abs(dy) > 2) gsap.set(logo, { y: '+=' + dy });
    }
  }
  if (logo) gsap.set(logo, { clearProps: 'all' });
  if (dial) gsap.set(dial, { clearProps: 'all' });
});
```

### `ready-hit-play.css`

**4. Add after line ~244 (before dial component rules):**

```css
/* Transition overlay must sit above mobile nav (Webflow z-index ~1000) */
.about-transition { z-index: 1001; }
```

---

## Barba Impact

- `rhp-nav-hidden` is already removed in `runAfterEnter` line 1634-1636 for non-about pages — no cleanup needed
- Logo alignment is a one-shot `gsap.set` before `clearProps` — no persistent state
- No new DOM elements, listeners, or timelines

---

## Verify

1. Home → "Who We Are": nav must not flash during overlay animation
2. About → home: logo animates smoothly with no snap/jump at end
3. Direct land /about → home: same smooth transition
4. Work → about: nav hidden during transition
5. About → home → about: round-trip with no visual glitches
