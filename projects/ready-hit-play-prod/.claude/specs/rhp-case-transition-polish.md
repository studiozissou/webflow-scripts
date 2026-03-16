# Spec: Case Transition Polish — Video Sizing, Scroll-to-Top, FG Visibility

**Slug:** `rhp-case-transition-polish`
**Client:** ready-hit-play-prod
**Status:** Ready to Build
**Created:** 2026-03-16

---

## Bugs Covered

| ID | Priority | Summary |
|----|----------|---------|
| `rhp-case-video-sizing-100pct` | P1 | FG video fills 100% of container during expand — should leave gap for title peek |
| `rhp-case-to-home-scroll-position` | P1 | Case→home: video not visible if user scrolled down case page |
| `rhp-case-to-home-fg-invisible` | P0 | After case→home resume, fg-video not visible (clearProps wipes dialFg opacity) |

---

## Context

After the suspend/resume implementation (`rhp-video-transition-cluster`), three issues remain on the home↔case transition:

1. **FG video fills 100% of container during expand** — `runDialExpandAnimation` tweens videoWrap to `width: 100%, height: 100%`, filling the entire expanding dial. Should leave room for `.section_case-title` (title + first line of text) to peek above the fold.
2. **Case→home: video not visible if user scrolled down** — the shrink animation starts from wherever the user is scrolled. If they scrolled past the video, the dial shrinks from mid-content. Need to scroll `.dial_layer-fg` to top before shrink.
3. **After case→home resume: fg-video not visible** — `clearProps: 'all'` on dialFg in `runAfterEnter` removes the inline `opacity: 1` that `setDialState(ACTIVE)` applied. But `dialState` is already `ACTIVE` (preserved through suspend), so `setDialState(ACTIVE)` bails at `if (dialState === newState) return`. Nobody restores dialFg opacity.

---

## Root Causes

### Bug 1: Video sizing during expand

**File:** `orchestrator.js` — `runDialExpandAnimation()` (lines 100-109)

Current tween: `width: '100%', height: '100%'` fills 100% of expanding dialFg. The video should instead take up `calc(var(--dial-case-height) - var(--dial-case-title-gap))`, leaving a gap for the title peek.

**Existing sizing rule** (CSS line 457-462, desktop only):
```css
.section_case-video.is-header {
  min-height: calc(var(--dial-case-height) - 140px);
}
```
This was the old video container's sizing — now hidden (class `hide`). The persistent `dial_video-wrap` uses `aspect-ratio: 16/9` instead, giving a much shorter video (982px vs ~1165px at typical viewport).

### Bug 2: Scroll position before shrink

**File:** `orchestrator.js` — case-to-home transition `beforeLeave` (lines 1497-1511)

The scroll container is `.dial_layer-fg` (overflow: auto). If user scrolled down, the video is out of view when shrink animation starts. `enter()` does `window.scrollTo(0, 0)` but that's the page scroll, not the dialFg internal scroll.

### Bug 3: FG opacity after resume

**File:** `work-dial.js` — `_resumeFn()` (lines 1225-1277)

Root cause trace:
1. Home page: `setDialState(ACTIVE)` sets `dialFg.opacity = 1` (inline GSAP)
2. Home→case: `suspend()`, dialState stays ACTIVE
3. Case→home `runAfterEnter`: `clearProps: 'all'` on dialFg removes inline `opacity: 1`
4. `setDialToHomeState()` does another `clearProps: 'all'`
5. `resume(handoff)` calls `applyActive(handoff.index)` — `isInitial=true` (lastIndex was reset to -1), so fgWrap crossfade at line 776 is skipped
6. `dialState` is already ACTIVE, so calling `setDialState(ACTIVE)` would bail at guard
7. Nobody restores `dialFg.opacity = 1` → fg layer invisible

---

## Solution

### Step 1a: CSS — Add `--dial-case-title-gap` custom property + update videoWrap

**File:** `ready-hit-play.css`

Add new CSS custom property alongside the existing dial vars (lines 329-334):

```css
:root {
  --dial-case-title-gap: 140px;  /* desktop */
}
@media (max-width: 991px) {
  :root { --dial-case-title-gap: 120px; }  /* tablet */
}
@media (max-width: 767px) {
  :root { --dial-case-title-gap: 100px; }  /* mobile landscape */
}
@media (max-width: 479px) {
  :root { --dial-case-title-gap: 80px; }   /* mobile portrait */
}
```

Update the case videoWrap rule (lines 402-411) — replace `aspect-ratio: 16/9; height: auto` with calc-based height:

```css
.dial_component:has([data-barba-namespace="case"]) .dial_video-wrap,
.dial_component:has([data-barba-namespace="about"]) .dial_video-wrap {
  width: 100%;
  height: calc(var(--dial-case-height) - var(--dial-case-title-gap));
  max-height: none;
  border-radius: 0px;
  overflow: hidden;
  flex-shrink: 0;
}
```

The `aspect-ratio: 16/9` is removed — the video uses `object-fit: cover` to fill the height. This matches the original `.section_case-video.is-header` behavior.

### Step 1b: JS — Tween videoWrap to case video height during expand

**File:** `orchestrator.js` — `runDialExpandAnimation()` (lines 100-109)

Add `caseTitleGap` to `getDialVars()`:

```js
// In getDialVars() (line 57-66), add:
caseTitleGap: _getCSSVar('--dial-case-title-gap', '140px'),
```

Then in `runDialExpandAnimation`, compute target height from CSS vars:

```js
if (videoWrap && vRect) {
  // Resolve --dial-case-height and --dial-case-title-gap to pixels
  const tempEl = document.createElement('div');
  tempEl.style.height = 'calc(' + v.caseHeight + ' - ' + v.caseTitleGap + ')';
  tempEl.style.position = 'absolute';
  tempEl.style.visibility = 'hidden';
  document.body.appendChild(tempEl);
  const caseVideoHeight = tempEl.getBoundingClientRect().height;
  document.body.removeChild(tempEl);

  gsap.to(videoWrap, {
    width: '100%',
    height: caseVideoHeight,
    borderRadius: 0,
    duration: dur,
    ease: 'power2.inOut'
  });
}
```

After `clearProps` in `runAfterEnter`, CSS takes over with `height: calc(var(--dial-case-height) - var(--dial-case-title-gap))` — seamless pixel-matching handoff.

**Shrink animation:** No videoWrap tween needed. During shrink, dialFg has `overflow: hidden` which clips the video as the circle shrinks.

### Step 2: Scroll dialFg to top before case→home shrink

**File:** `orchestrator.js` — case-to-home `beforeLeave` (lines 1497-1511)

Add at top of `beforeLeave`:

```js
// Scroll case content to top so video is visible for shrink animation
const dialFg = document.querySelector('.dial_layer-fg');
if (dialFg) dialFg.scrollTop = 0;
RHP.lenis?.stop?.();
```

Instant scroll (no smooth) — shrink animation starts immediately with video visible.

### Step 3: Force setDialState re-apply in resume

**File:** `work-dial.js` — `_resumeFn()` (after applyActive + playPaired block, ~line 1252)

Reset `dialState` to force `setDialState` to re-apply visual state:

```js
// Force visual state refresh — clearProps in runAfterEnter removed inline styles
// but dialState is already ACTIVE, so setDialState would bail. Reset to force re-apply.
const prevState = dialState;
dialState = null;
setDialState(prevState);
```

This re-applies: dialFg opacity 1, bg video blur+opacity, generic video hidden, step text hidden, UI visible. All the visual state that `clearProps` wiped.

---

## Barba Impact

### Init/Destroy lifecycle
- No changes to init/destroy call pattern
- Step 3 only affects the resume path (suspend→resume)

### State survival
- dialState preserved through suspend/resume — Step 3 just forces visual refresh

### Transition interference
- Step 1b: videoWrap tween runs during leave() — same timing as dialFg tween, no conflict
- Step 2: instant scroll in beforeLeave — before any animation starts
- Step 3: runs in resume() after runAfterEnter — after DOM swap complete

### Re-entry correctness
- home→case→home→case: Step 1b re-computes pixel values each time. Step 2 scrolls to top each time. Step 3 re-applies visual state each time.

---

## Implementation Order

| Step | File | Change |
|------|------|--------|
| 1a | `ready-hit-play.css` | Add `--dial-case-title-gap` (140/120/100/80px), update case videoWrap to `height: calc(--dial-case-height - var(--dial-case-title-gap))` |
| 1b | `orchestrator.js` | Add `caseTitleGap` to `getDialVars()`, fix videoWrap tween in `runDialExpandAnimation` |
| 2 | `orchestrator.js` | Add `dialFg.scrollTop = 0` + `RHP.lenis?.stop?.()` in case-to-home `beforeLeave` |
| 3 | `work-dial.js` | Force `setDialState` re-apply in `_resumeFn` after resume |

---

## Verification

1. **Home→case: video leaves gap** — gap visible at bottom of expanding dial, `.section_case-title` peeks above fold
2. **Case→home from scrolled position** — video visible at top when shrink starts
3. **Case→home: fg-video visible after resume** — dial shows project video in ACTIVE state until mouse moves away
4. **Home→about→home** — no regression (full destroy/init, not suspend/resume)
5. **Rapid nav: home→case→home→case** — no errors, correct state each time
6. **Console: zero errors** on all transition paths
7. **Direct land on case page** — video sizing correct (CSS handles it, no JS needed)
8. **Responsive: tablet/mobile** — title gap adapts per breakpoint (120/100/80px)
