# RHP Video Overlays

**Slug:** `rhp-video-overlays`
**Project:** `ready-hit-play-prod`
**Status:** Ready to Build
**Priority:** P1
**Created:** 2026-04-13

## Summary

Add dark overlays to the homepage dial videos to improve contrast and visual hierarchy:
- **BG overlay:** 45% opacity `#000` on `.dial_layer-bg` — always on, all namespaces
- **FG overlay:** 15% opacity `#000` on `#fg-video-wrap` — homepage only, fades out on home→work and fades in on work→home Barba transitions

## Approach

**Pure CSS** — both overlays are `::after` pseudo-elements. Zero new HTML elements.

- BG overlay: `::after` on `.dial_layer-bg` with `background: rgba(0,0,0,0.45)`, always visible
- FG overlay: `::after` on `#fg-video-wrap` scoped to `[data-dial-ns="home"]`, with opacity driven by a CSS custom property `--fg-overlay-opacity` that GSAP tweens during Barba transitions

### Why pseudo-elements work here

1. `.dial_layer-bg` has `position: absolute; inset: 0` — `::after` with `position: absolute; inset: 0` fills it correctly
2. `#fg-video-wrap` on home has `overflow: hidden; border-radius: 999px` — `::after` clips to the circle automatically
3. Both containers are positioned, so `::after` stacking works without extra wrappers
4. The BG canvas has `transform: scale(1.1)` — the `::after` on `.dial_layer-bg` (not on `.dial_bg-canvas`) won't be affected by this transform; it fills the layer container correctly

### Why CSS custom property for FG transition

During Barba `leave()`, `data-dial-ns` changes mid-animation. A CSS-only approach (scoping `::after` visibility to `[data-dial-ns="home"]`) would cause an abrupt cut. GSAP tweening `--fg-overlay-opacity` on `#fg-video-wrap` gives a smooth crossfade independent of namespace changes.

## Scope

### In scope
- 45% `#000` overlay on all `.dial_layer-bg` (home, work, about)
- 15% `#000` overlay on `#fg-video-wrap` circle on homepage only
- GSAP fade out of FG overlay during home→work `runDialExpandAnimation`
- GSAP fade in of FG overlay during work→home in `runAfterEnter`
- `prefers-reduced-motion`: skip GSAP tween, set instantly

### Out of scope
- Overlay on `.dial_generic-video` (idle video)
- Overlay on case study `video.video-cover` sections
- Any new HTML elements or Webflow Designer changes

## Files Changed

| File | Change | Lines (est.) |
|------|--------|-------------|
| `ready-hit-play.css` | Add `::after` rules for `.dial_layer-bg` and `#fg-video-wrap` | ~25 |
| `orchestrator.js` | Add GSAP tween of `--fg-overlay-opacity` in expand/shrink + afterEnter | ~15 |

**Total:** ~40 LOC across 2 files.

## Implementation Detail

### CSS (`ready-hit-play.css`)

```css
/* ====== Video overlays ====== */

/* BG overlay: 45% black on all namespaces */
.dial_component[data-dial-ns="home"] .dial_layer-bg::after,
.dial_component[data-dial-ns="work"] .dial_layer-bg::after,
.dial_component[data-dial-ns="about"] .dial_layer-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1;
  pointer-events: none;
}

/* FG overlay: 15% black on homepage only */
.dial_component[data-dial-ns="home"] #fg-video-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  opacity: var(--fg-overlay-opacity, 1);
  z-index: 1;
  pointer-events: none;
}
```

Note: `z-index: 1` places the overlay above the video (`z-index: auto/0`) but below the video spinner (`z-index: 5`).

### JS (`orchestrator.js`)

#### In `runDialExpandAnimation()` (home → work)

Add alongside the existing `dialUI` / `dialTicks` fade-out block (~line 146-151):

```js
// Fade out FG overlay during morph
const videoWrap = document.getElementById('fg-video-wrap');
if (videoWrap) {
  gsap.to(videoWrap, { '--fg-overlay-opacity': 0, duration: dur * 0.5, ease: 'power2.out' });
}
```

#### In `runDialShrinkAnimation()` (work → home)

Not needed here — the overlay will be invisible during `leave()` because we're coming from work (no `::after` rendered on work namespace). The fade-in happens in `runAfterEnter`.

#### In `runAfterEnter()` (after transition completes)

After the existing `clearProps` block for `videoWrap` (~line 1400-1402), add:

```js
// Restore FG overlay on home (fade in); remove on work
if (videoWrap) {
  if (ns === 'home') {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.to(videoWrap, { '--fg-overlay-opacity': 1, duration: reduced ? 0 : 0.4, ease: 'power2.out' });
  } else {
    gsap.set(videoWrap, { '--fg-overlay-opacity': 0 });
  }
}
```

#### In `setDialToHomeState()` (direct land on home)

```js
if (videoWrap) gsap.set(videoWrap, { '--fg-overlay-opacity': 1 });
```

#### In `setDialToWorkState()` (direct land on work)

```js
if (videoWrap) gsap.set(videoWrap, { '--fg-overlay-opacity': 0 });
```

### clearProps interaction

The existing `gsap.set(videoWrap, { clearProps: 'all' })` in `runAfterEnter` (line 1401) clears all inline styles including CSS custom properties. This is correct — the `--fg-overlay-opacity` tween runs **after** `clearProps`, so the value is re-set correctly. No conflict.

## Barba Impact

1. **Init/Destroy lifecycle:** No new DOM elements, no event listeners, no GSAP timelines to track. The `::after` pseudo-elements exist via CSS alone. The GSAP tweens are fire-and-forget (no stored `gsap.context()`).

2. **State survival:** `--fg-overlay-opacity` is an inline CSS custom property on `#fg-video-wrap`. `#fg-video-wrap` persists outside the Barba container, so the property survives DOM swaps. `clearProps: 'all'` in `runAfterEnter` resets it, and the immediately-following tween restores the correct value for the new namespace.

3. **Transition interference:** None. The `::after` pseudo-elements are `pointer-events: none` and don't affect the morph animation (which tweens `width`, `height`, `borderRadius` on `dialFg` and `videoWrap` — not `::after`).

4. **Re-entry correctness:** home → about → home: `runAfterEnter` sets `--fg-overlay-opacity: 1` on home. home → work → home: `runAfterEnter` sets `--fg-overlay-opacity: 1` on home. No stale state possible because `clearProps: 'all'` + immediate re-set.

5. **Namespace scoping:** BG overlay renders on all namespaces via CSS. FG overlay CSS only matches `[data-dial-ns="home"]` — it renders nothing on work/about even without JS.

## Parallelisation Map

| Stream | Task | Agent | Est. tokens | Parallel? |
|--------|------|-------|-------------|-----------|
| A | CSS overlay rules | code-writer | ~2k | Yes |
| B | JS orchestrator tweens | code-writer | ~3k | No (after A, needs to verify z-index) |

**Recommendation:** Sequential — only 2 files, ~40 LOC total. Parallelisation overhead exceeds benefit. Single code-writer agent, CSS first then JS.

## Verify Loop

### Pass/fail criteria

1. **BG overlay visible on home:** `.dial_layer-bg::after` computed `background-color` is `rgba(0, 0, 0, 0.45)` and element is visible
2. **BG overlay visible on work:** Same check after Barba transition to a case study
3. **FG overlay visible on home:** `#fg-video-wrap::after` is visible with `opacity: 1` (or value of `--fg-overlay-opacity`)
4. **FG overlay gone on work:** `#fg-video-wrap::after` either has `opacity: 0` or does not render (CSS scoped to home only)
5. **Smooth fade during transition:** FG overlay fades out during home→work morph (not abrupt cut)
6. **Clean re-entry:** home → work → home: FG overlay fades back in
7. **No console errors** on any page or transition
8. **Video spinner still visible** above overlay (z-index 5 > z-index 1)

### Reproduction steps

1. Load homepage → verify dark overlay on BG canvas and subtle overlay on FG circle
2. Hover dial → BG blurs but overlay stays
3. Click a project → home→work transition: FG overlay fades out during morph
4. On work page → BG overlay visible, no FG overlay on case video
5. Click logo to return home → FG overlay fades in after morph
6. Repeat cycle → no accumulation, no stale opacity

### Tier mapping

- Tier 1 automated: `rhp-video-overlays — Elements`, `rhp-video-overlays — Console Errors`, `rhp-video-overlays — Barba Lifecycle`
- Tier 2 registry: `rhp-video-overlays` entry in `tests/registry.json`
- Tier 3 manual: Verify fade smoothness feels right (subjective timing), check Safari pseudo-element rendering

### Regression scope

- Barba transitions must still complete without errors
- Video spinner (`z-index: 5`) must still render above overlay (`z-index: 1`)
- BG canvas blur animation on home hover must still work (overlay is on `.dial_layer-bg`, blur is on `.dial_bg-canvas`)
- `clearProps: 'all'` on `videoWrap` must not break overlay re-application

## Test Plan

### Tier 1 — Auto: Playwright local

See `tests/acceptance/rhp-video-overlays.spec.js`:
- BG overlay pseudo-element present on homepage
- BG overlay pseudo-element present on work page (after Barba transition)
- FG overlay pseudo-element present on homepage with correct opacity
- FG overlay not rendered on work page
- No JS errors on home and after home→work→home cycle
- Reduced motion: overlays still present (no animation dependency)

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json` as `rhp-video-overlays`.

### Tier 3 — Manual

- **Fade smoothness:** Verify the FG overlay fade-out during home→work morph looks smooth and not abrupt — subjective timing assessment
- **Safari:** Verify `::after` pseudo-elements render correctly with `border-radius: 999px; overflow: hidden` clipping on Safari (Safari has had historical pseudo-element clipping bugs)
- **Mobile:** Verify overlays render at mobile viewport (pseudo-elements should scale with container)

## Acceptance Tests

See `tests/acceptance/rhp-video-overlays.spec.js`:

1. `bg overlay pseudo-element present on homepage` — checks `.dial_layer-bg::after` computed styles
2. `bg overlay present after barba transition to work` — navigates home→work, checks BG overlay
3. `fg overlay present on homepage` — checks `#fg-video-wrap::after` opacity
4. `fg overlay not rendered on work page` — after transition, checks FG overlay is hidden
5. `no JS errors on home` — console error collection
6. `no JS errors after home→work→home cycle` — Barba round-trip error check
7. `reduced motion: overlays visible without animation` — emulates reduced motion
