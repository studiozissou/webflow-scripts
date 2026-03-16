# Spec: Transition Polish — Dial State Handoff + About→Home Flash Fix

**Slug:** `rhp-transition-polish-cluster`
**Client:** ready-hit-play-prod
**Status:** Planning
**Created:** 2026-03-13

---

## Bugs Covered

| ID | Priority | Summary |
|----|----------|---------|
| `rhp-work-to-about-scroll-position-dial-state` | P1 | Dial should scroll to top on case→about, show just-visited project in ACTIVE on about→home return |
| `rhp-about-to-home-transition-flash` | P1 | Overlay fades early during about→home reverse, exposing large logo; transition logo offset |

---

## Context

These are polish bugs in the about↔home transition path. Both affect `orchestrator.js` — the transition functions and the `runAfterEnter` logic. They are independent of the Cluster 1 (video persistence) and Cluster 2 (about page scroll/reveals) fixes, but should be built after those clusters since they share the same orchestrator file.

---

## Root Causes

### Bug 1: Dial scroll + state on about↔home

**Three symptoms, three gaps:**

1. **`dial_layer-fg` not scrolled to top on case→about:** No code in the case→about `beforeLeave` or `leave` resets `dialFg.scrollTop`. The case page may have scrolled the fg layer mid-content.

2. **Dial shows project 0 in IDLE on about→home:** `RHP.videoState.caseHandoff` is only set for case→home, not about→home. On about→home, `workDial.init()` boots in IDLE at index 0.

3. **No ACTIVE state on return:** `workDial.init()` uses `hasHandoff` (from `caseHandoff`) to decide initial state. Since there's no `caseHandoff` on the about→home path, it always starts IDLE.

### Bug 2: About→home overlay flash + logo position

**Overlay flash:** The persistent timeline has two concurrent tweens starting at position 0:
- Overlay opacity: 300ms (0.3 × dur)
- Logo morph: 750ms (0.75 × dur)

When reversed, the overlay completes its reverse at ~450ms into the animation (reaches opacity:0), but `display: none` only fires at 750ms (`onReverseComplete`). From 450ms–750ms the overlay is transparent, exposing the about page's large logo (opacity:0.4) behind it.

**Logo position offset:** The timeline hard-codes `top: '2vh'` as the nav logo destination instead of measuring the actual `.nav_logo-wrapper-2` position via `getBoundingClientRect()`. On different viewports/scroll states, this doesn't match.

---

## Solution

### Step 1: Reset `dial_layer-fg` scroll on case→about

**File:** `orchestrator.js`

In the `case-to-about` transition's `beforeLeave` (or at the start of `runHomeToAboutTransition`), reset the fg layer:

```js
const dialFg = document.querySelector('.dial_layer-fg');
if (dialFg) dialFg.scrollTop = 0;
```

Also add this to `home-to-about` `beforeLeave` for consistency (home shouldn't have scrolled the fg layer, but defensive reset costs nothing).

### Step 2: Save active index before destroying work-dial

**File:** `orchestrator.js`

In `home-to-about` and `case-to-about` `beforeLeave`, before `RHP.workDial.destroy()`:

```js
// Capture active project for about→home return
const activeIdx = RHP.workDial?.getActiveIndex?.();
if (typeof activeIdx === 'number') {
  RHP.videoState.aboutHandoff = { index: activeIdx };
}
```

This stores the last-active project index so about→home can restore it.

### Step 3: Accept `startIndex` option in `workDial.init()`

**File:** `work-dial.js`

Add support for an options parameter in `init()`:

```js
function init(container, opts = {}) {
  // ... existing init code ...

  const startIdx = (opts.startIndex != null) ? opts.startIndex : 0;
  const startActive = !!opts.startActive;

  dialState = startActive ? DIAL_STATES.ACTIVE :
              (hasHandoff ? DIAL_STATES.ACTIVE : DIAL_STATES.IDLE);

  applyActive(startIdx);

  if (startActive) {
    setDialState(DIAL_STATES.ACTIVE);
  }
}
```

### Step 4: Use `aboutHandoff` in `runAfterEnter` for about→home

**File:** `orchestrator.js`

In `runAfterEnter`, when `ns === 'home'` and there's no `caseHandoff` but there is an `aboutHandoff`:

```js
requestAnimationFrame(function() {
  if (hadCaseHandoff && RHP.workDial?.resume) {
    RHP.workDial.resume(handoff);
  } else {
    var aboutHandoff = RHP.videoState?.aboutHandoff;
    var initOpts = { introMode: false };
    if (aboutHandoff && typeof aboutHandoff.index === 'number') {
      initOpts.startIndex = aboutHandoff.index;
      initOpts.startActive = true;
      RHP.videoState.aboutHandoff = null;
    }
    RHP.views.home.init(data.next.container, initOpts);
  }
});
```

Then `views.home.init()` passes options through to `workDial.init()`.

**Revert to normal on mouse move:** The dial's existing `ACTIVE → ENGAGED` state machine handles this. When `startActive` is true, the dial boots in ACTIVE showing the saved project. On first mouse move, `interactionUnlocked = true` (already set by init), so pointer events trigger normal sector detection → dial continues as usual.

### Step 5: Keep overlay opaque during about→home reverse

**File:** `orchestrator.js` — `runAboutToHomeTransition()`

Currently the persistent timeline's reverse fades the overlay too early. Fix: override the overlay opacity during the reverse, then manually fade after completion.

```js
function runAboutToHomeTransition(data) {
  const el = document.querySelector('.about-transition');
  const tl = getAboutTransitionTimeline();
  if (!tl) return Promise.resolve();

  tl.progress(1);
  gsap.set(el, { display: 'flex', opacity: 1 });

  // Pin overlay at opacity:1 during reverse (override timeline's opacity tween)
  const overlayPin = gsap.set(el, { opacity: 1, overwrite: 'auto' });

  return new Promise(resolve => {
    tl.reverse().eventCallback('onReverseComplete', () => {
      // Logo + dial are done. NOW fade overlay.
      gsap.to(el, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(el, { display: 'none' });
          resolve();
        }
      });
    });
  });

  // ... dial grow animation runs concurrently (unchanged)
}
```

Alternative approach (simpler): Before calling `tl.reverse()`, temporarily disable the overlay tween in the timeline:

```js
// Pause the overlay opacity tween so it doesn't reverse
const overlayTween = tl.getChildren(false, true, false)[0]; // first tween = overlay
if (overlayTween) overlayTween.pause();

tl.reverse().eventCallback('onReverseComplete', () => {
  if (overlayTween) overlayTween.play(); // restore for next use
  gsap.to(el, { opacity: 0, duration: 0.2, onComplete: () => {
    gsap.set(el, { display: 'none' });
    resolve();
  }});
});
```

Use whichever approach is cleaner in practice. The key invariant: **overlay stays at opacity:1 until all reverse animations complete**.

### Step 6: Measure nav logo position live

**File:** `orchestrator.js` — `getAboutTransitionTimeline()`

Replace the hard-coded `top: '2vh'` with a measured position:

```js
function getAboutTransitionTimeline() {
  // ... existing setup ...

  const navLogo = document.querySelector('.nav_logo-wrapper-2');
  let logoFromTop = '2vh';    // fallback
  let logoFromLeft = '50%';
  let logoFromXPercent = -50;

  if (navLogo) {
    const navRect = navLogo.getBoundingClientRect();
    logoFromTop = navRect.top + 'px';
    logoFromLeft = navRect.left + 'px';
    logoFromXPercent = 0;  // using absolute left, not centered
  }

  // Use measured values in the timeline's "from" state (small/nav position)
  aboutTransitionTL = gsap.timeline({ paused: true });
  // ... overlay tween ...
  aboutTransitionTL.fromTo(transitionLogo,
    {
      position: 'fixed',
      left: logoFromLeft,
      top: logoFromTop,
      xPercent: logoFromXPercent,
      width: logoSmallWidth,
      height: logoSmallHeight,
      opacity: 1
    },
    { /* ... large/centred state ... */ },
    0
  );

  return aboutTransitionTL;
}
```

The existing `aboutTransitionTL = null` on resize ensures stale measurements are discarded.

---

## Barba Impact

### 1. Init/Destroy lifecycle
- `workDial.init()` gains an optional `startIndex`/`startActive` parameter — backward compatible, existing calls unaffected
- No new DOM elements or listeners added

### 2. State survival
- `RHP.videoState.aboutHandoff` is a new lightweight state object `{ index: number }`, saved before destroy, consumed on about→home return, then nulled
- Follows the same pattern as `RHP.videoState.caseHandoff`

### 3. Transition interference
- Overlay pinned at opacity:1 during reverse prevents the flash — no visual conflict with other transitions
- `dialFg.scrollTop = 0` runs in `beforeLeave` — before any transition animation starts

### 4. Re-entry correctness
- home→about→home: `aboutHandoff` saved, consumed, nulled. Next home→about→home cycle: fresh save/consume.
- home→about→case→home: `aboutHandoff` is set on home→about, but case→home uses `caseHandoff` instead. `aboutHandoff` lingers but is harmless (nulled on next about→home, or overwritten on next home→about).
- home→about→home→about→home: each cycle independent — index saved, consumed, nulled.

### 5. Namespace scoping
- `aboutHandoff` only set in `home-to-about` and `case-to-about` `beforeLeave`
- Only consumed in `runAfterEnter` when `ns === 'home'` and `caseHandoff` is absent
- No impact on other namespaces

---

## Implementation Steps

| Step | File | Change |
|------|------|--------|
| 1 | `orchestrator.js` | Reset `dialFg.scrollTop = 0` in case→about and home→about `beforeLeave` |
| 2 | `orchestrator.js` | Save active index to `RHP.videoState.aboutHandoff` before work-dial destroy |
| 3 | `work-dial.js` | Accept `startIndex` + `startActive` options in `init()` |
| 4 | `orchestrator.js` | Pass `aboutHandoff` through `views.home.init()` → `workDial.init()` on about→home |
| 5 | `orchestrator.js` | Pin overlay at opacity:1 during reverse, manual fade after `onReverseComplete` |
| 6 | `orchestrator.js` | Measure nav logo `getBoundingClientRect()` in `getAboutTransitionTimeline()` |

---

## Parallelisation Map

| Stream | Tasks | Agent | Est. time | Est. tokens |
|--------|-------|-------|-----------|-------------|
| A | Steps 1, 2, 4, 5, 6 (orchestrator.js) | code-writer | 20 min | 10k |
| B | Step 3 (work-dial.js startIndex) | code-writer | 10 min | 4k |

**Dependencies:** A.step4 depends on B (orchestrator passes options that work-dial must accept). Run B first, then A. Or run in parallel if agent B finishes quickly.
**Recommendation:** Sequential (B then A) or parallel with B as a blocking dependency for A.step4 only.

---

## Edge Cases

| Scenario | Expected behavior |
|----------|-------------------|
| Direct land on /about → navigate home | No `aboutHandoff` saved (work-dial was never active). Dial boots normally at index 0 in IDLE. |
| home→about→home with project 3 active | Dial boots in ACTIVE at project 3. Mouse move → normal interaction. |
| case→about→home with project 5 active | Same — index saved from case page, restored on home. |
| home→about→case→home | `aboutHandoff` set on home→about. `caseHandoff` set on case→home. `caseHandoff` takes precedence (checked first). `aboutHandoff` ignored. |
| Rapid home→about→home→about→home | Each cycle: save → consume → null. No accumulation. |
| Overlay flash regression check | About→home: overlay stays at opacity:1 until logo+dial animations complete. Then 200ms fade out. No flash. |
| Logo position on different viewports | Measured live from `.nav_logo-wrapper-2` rect. Resize invalidates timeline cache. |

---

## Files Changed

| File | Change |
|------|--------|
| `orchestrator.js` | Scroll reset, aboutHandoff save/consume, overlay pin during reverse, nav logo measurement |
| `work-dial.js` | `startIndex` + `startActive` init options |

---

## Verification

1. **Scroll reset:** Navigate case→about — `dial_layer-fg` at scrollTop 0
2. **Active state return:** Navigate home→about→home with project 3 active — dial shows project 3 in ACTIVE state
3. **Mouse revert:** After about→home return, move mouse — dial transitions to normal interaction
4. **No flash:** Navigate about→home — overlay stays opaque until animation completes, then fades smoothly
5. **Logo position:** Navigate about→home — transition logo lands exactly on the nav logo position
6. **Re-entry:** home→about→home→about→home — each transition clean
7. **Direct land /about → home:** Dial boots normally (no handoff, no crash)
8. **Console:** Zero errors during all about↔home transition paths
9. **Smoke tests:** `cd projects/ready-hit-play-prod && npm run test:smoke`

---

## Acceptance Tests

| Test | Type | Page/Action | Assertion |
|------|------|-------------|-----------|
| dial_layer-fg at top after case→about | Hard | Navigate case→about | `document.querySelector('.dial_layer-fg').scrollTop === 0` |
| Dial shows last project after about→home | Hard | Activate project 3 on home, navigate home→about→home | `RHP.workDial.getActiveIndex() === 3` |
| Dial in ACTIVE state after about→home | Hard | Navigate home→about→home | Dial state is ACTIVE (fg video visible, not generic) |
| No overlay flash during about→home | Hard | Navigate about→home | `.about-transition` opacity stays 1 until logo tween completes |
| Transition logo reaches nav position | Hard | Navigate about→home | Transition logo final position within 5px of `.nav_logo-wrapper-2` rect |
| No console errors on about↔home | Hard | All about transition paths | Zero `console.error` entries |
| Direct land /about → home works | Hard | Direct land /about, navigate home | Dial boots IDLE at index 0, no errors |
