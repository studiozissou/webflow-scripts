# feat-fg-overlay-transition-fade

> Fade the 15% FG video overlay out on home→work, keep hidden on work→work, fade back in on work→home.

**Status:** Planning → Ready to Build
**Priority:** P1
**Project:** ready-hit-play-prod
**Created:** 2026-04-15

---

## Problem

The 15% black overlay on `#fg-video-wrap` currently appears/disappears instantly because the CSS selector `.dial_component[data-dial-ns="home"] #fg-video-wrap::after` stops matching the moment `setDialNs('work')` fires during the expand animation (orchestrator.js:192). The user wants a smooth 0.3s fade on transitions.

## Solution

1. **Remove namespace scoping from the CSS selector** — change from `.dial_component[data-dial-ns="home"] #fg-video-wrap::after` to `#fg-video-wrap::after` so the pseudo-element always exists in the render tree.
2. **Change default opacity to 0** — `var(--fg-overlay-opacity, 0)` instead of `var(--fg-overlay-opacity, 1)`.
3. **JS controls the variable** via GSAP tweens during transitions and `gsap.set()` in state helpers.

## Files Changed

| File | Change | LOC |
|------|--------|-----|
| `ready-hit-play.css` | Change selector + default value | ~2 lines |
| `orchestrator.js` | Add GSAP tweens in 4 locations + re-assert in `runAfterEnter` | ~15 lines |

**Complexity:** Low (2 files, <20 LOC)

## Detailed Changes

### 1. CSS (`ready-hit-play.css:1126`)

**Before:**
```css
.dial_component[data-dial-ns="home"] #fg-video-wrap::after {
  /* ... */
  opacity: var(--fg-overlay-opacity, 1);
}
```

**After:**
```css
#fg-video-wrap::after {
  /* ... */
  opacity: var(--fg-overlay-opacity, 0);
}
```

The pseudo-element now renders on all namespaces but is invisible by default. JS sets `--fg-overlay-opacity: 1` on home.

### 2. `runDialExpandAnimation()` (orchestrator.js:~156)

After pinning `#fg-video-wrap` dimensions (line ~160) and before the morph tween, add:

```js
// Fade out FG overlay (home → work)
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (videoWrap) {
  gsap.to(videoWrap, {
    '--fg-overlay-opacity': 0,
    duration: reduced ? 0 : 0.3,
    ease: 'power1.out'
  });
}
```

Note: `videoWrap` is already queried at line 156. The `reduced` variable already exists at line 140. Just add the tween. The overlay fades to 0 during the first 0.3s of the 0.8s morph.

### 3. `runDialShrinkAnimation()` (orchestrator.js:~254)

After `setDialNs('home')` (line 254), add:

```js
// Fade in FG overlay (work → home)
if (videoWrap) {
  gsap.to(videoWrap, {
    '--fg-overlay-opacity': 1,
    duration: reduced ? 0 : 0.3,
    ease: 'power1.out',
    delay: dur * 0.5
  });
}
```

Need to query `videoWrap` (not currently done in this function). Delay 0.4s (50% of 0.8s morph) so it fades in during the second half of the shrink back to circle.

### 4. `setDialToWorkState()` (orchestrator.js:~282)

After `gsap.set(dialFg, { clearProps: 'all' })` (line 293), add:

```js
const videoWrap = document.getElementById('fg-video-wrap');
if (videoWrap && gsap) gsap.set(videoWrap, { '--fg-overlay-opacity': 0 });
```

### 5. `setDialToHomeState()` (orchestrator.js:~301)

After `gsap.set(dialFg, { position: 'absolute', inset: 0, margin: 'auto' })` (line 314), add:

```js
const videoWrap = document.getElementById('fg-video-wrap');
if (videoWrap && gsap) gsap.set(videoWrap, { '--fg-overlay-opacity': 1 });
```

### 6. `runAfterEnter()` — re-assert after `clearProps` (orchestrator.js:~1401)

After the existing `gsap.set(videoWrap, { clearProps: 'all' })` at line 1401, add:

```js
// Re-assert FG overlay opacity (clearProps wipes CSS variables)
if (ns === 'home') {
  gsap.set(videoWrap, { '--fg-overlay-opacity': 1 });
} else {
  gsap.set(videoWrap, { '--fg-overlay-opacity': 0 });
}
```

This runs for all namespaces: home gets overlay, work/about/etc get no overlay.

### 7. First paint on home (fresh load)

On DOMContentLoaded, the CSS defaults to `--fg-overlay-opacity: 0` (no overlay). The overlay needs to appear on home. This is handled by `setDialToHomeState()` which is called by `runAfterEnter()` at line 1415 on home namespace. On fresh load, `orchestrator.js` calls `runAfterEnter()` in the initial Barba setup.

**Verify:** Check if `runAfterEnter` fires on initial page load (not just transitions). If not, add a `gsap.set` in the orchestrator's initial boot.

Looking at the orchestrator init flow: `barba.init()` fires `afterEnter` on the first page load (Barba v2 behaviour). So `runAfterEnter` WILL fire on DOMContentLoaded → `setDialToHomeState()` → `gsap.set(videoWrap, { '--fg-overlay-opacity': 1 })`. Confirmed safe.

## Transition Matrix

| Transition | Overlay behaviour | Mechanism |
|-----------|------------------|-----------|
| Fresh home load | Visible (opacity 1) | `runAfterEnter` → `setDialToHomeState()` |
| Home → Work | Fade out 0.3s | `runDialExpandAnimation` tween |
| Work → Work | Stay hidden (0) | `runAfterEnter` sets 0 for work ns |
| Work → Home | Fade in 0.3s | `runDialShrinkAnimation` tween + `runAfterEnter` re-asserts 1 |
| Home → About | Stay visible (1) | About doesn't change overlay (no expand/shrink) |
| About → Home | Stay visible (1) | `runAfterEnter` → `setDialToHomeState()` |
| Work → About | Hidden → stays hidden | `runAfterEnter` sets 0 for about ns (no fg-video visible on about) |
| About → Work | Hidden | `runAfterEnter` sets 0 for work ns |

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements, listeners, or timelines. Just inline CSS variable sets. No init/destroy needed.
2. **State survival** — Nothing persists. The overlay state is re-derived from namespace in `runAfterEnter`.
3. **Transition interference** — The 0.3s fade runs concurrently with the 0.8s morph. No z-index conflict (`::after` is z-index 1, already below spinner at z-index 5). No opacity tween conflict because the morph tweens `dialFg` size/shape, not `videoWrap` opacity.
4. **Re-entry correctness** — `runAfterEnter` always re-asserts the correct value after `clearProps`. Home→Work→Home cycle: fade out → `clearProps` wipes → re-assert 1 → fade in complete.
5. **Namespace scoping** — Affects all namespaces via `runAfterEnter`. Correct behaviour: 1 on home, 0 everywhere else.

## `prefers-reduced-motion`

All GSAP tweens use `duration: reduced ? 0 : 0.3`. The `reduced` variable is already checked in both `runDialExpandAnimation` and `runDialShrinkAnimation`. With `duration: 0`, GSAP sets the value instantly (no visible animation).

## Verify Loop

### Pass/fail criteria
- **Home fresh load:** `getComputedStyle(videoWrap, '::after').opacity === '1'`
- **After home→work expand completes:** `getComputedStyle(videoWrap, '::after').opacity === '0'`
- **On work page (after clearProps):** `--fg-overlay-opacity` is `0` on `#fg-video-wrap`
- **After work→home shrink completes:** `getComputedStyle(videoWrap, '::after').opacity === '1'`
- **No console errors** on any transition
- **Reduced motion:** overlay appears/disappears instantly (no visible animation), same end states

### Reproduction steps
1. Load `https://rhpcircle.webflow.io/` → verify overlay visible (dark tint on fg video)
2. Click a project to trigger home→work → watch overlay fade out during first 0.3s of morph
3. On work page, verify no overlay visible
4. Click logo to return home → watch overlay fade in during second half of shrink morph
5. Repeat cycle to confirm re-entry correctness

### Tier mapping
- **Tier 1 (auto):** `rhp-video-overlays.spec.js` already tests overlay presence/absence. Update existing tests to verify computed opacity values post-transition.
- **Tier 2 (CDN regression):** Existing registry entry `rhp-video-overlays` covers this.
- **Tier 3 (manual):** Visual smoothness of the 0.3s fade during morph — subjective animation quality. Cross-browser: Safari pseudo-element + CSS variable inheritance.

### Regression scope
- Existing Barba transitions must not break (morph timing, video handoff)
- `clearProps: 'all'` must still work (overlay re-asserted after)
- Video loader spinner (z-index 5) must remain above overlay (z-index 1)
- Home intro sequence unaffected (overlay state set in `runAfterEnter`, not `home-intro.js`)

---

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Dependencies |
|--------|------|-------|----------|--------------|
| A | CSS selector change | code-writer | 2 | None |
| B | JS tweens + state helpers | code-writer | 15 | None |
| C | Update acceptance test | code-writer | 10 | A + B |

Streams A and B are independent (CSS and JS). Stream C depends on both.
**Recommendation:** Sequential — total LOC is <30, single-file focus. Parallelisation overhead exceeds benefit. No worktrees needed.

---

## Test Plan

### Tier 1 — Auto: Playwright local
Update `tests/acceptance/rhp-video-overlays.spec.js`:
- Existing "fg overlay present on homepage" test — verify `opacity === '1'` (not just `!== 'none'`)
- Add: "fg overlay fades to 0 after home→work transition" — navigate to case, wait 2.5s, check `opacity === '0'`
- Add: "fg overlay fades to 1 after work→home transition" — full round trip, check `opacity === '1'`
- Existing "no JS errors" tests cover console error regression

### Tier 2 — Auto: CDN regression
Existing `rhp-video-overlays` registry entry already covers this test file. No new entry needed.

### Tier 3 — Manual
- Visual smoothness of 0.3s fade during morph animation (subjective)
- Safari: CSS variable inheritance on `::after` pseudo-element
- Mobile: overlay visible on home, hidden on work (touch navigation)

---

## Acceptance Tests

1. `fg overlay has opacity 1 on homepage`
2. `fg overlay fades to 0 after home→work transition`
3. `fg overlay stays at 0 on work page`
4. `fg overlay fades to 1 after work→home round trip`
5. `no JS errors on home`
6. `no JS errors after home→work→home cycle`
7. `reduced motion: overlay appears instantly on home`
