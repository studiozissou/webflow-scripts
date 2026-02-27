# Spec: Dial ACTIVE State — Blur + Threshold Tightening

**Queue ID:** `feat-dial-active-state-fg-bg-blur`
**Priority:** P1
**File:** `work-dial.js` only

## Goal

Apply the same `blur(40px)` that currently only exists in ENGAGED to the ACTIVE state as well. Blur and opacity transitions all run at 0.3s. Tighten the IDLE→ACTIVE proximity threshold by 40%.

## Current behaviour

| State | bgVideo opacity | bgVideo filter | genericVideo opacity | dialUi opacity |
|-------|----------------|----------------|----------------------|----------------|
| IDLE | 0 | blur(0px) | 1 | 0 |
| ACTIVE | 1 (0.4s) | blur(0px) | 0 (0.4s) | 1 (0.3s) |
| ENGAGED | 1 | blur(40px) (hover tween) | 0 | 1 |

Blur is owned by `pointerenter`/`pointerleave` hover handlers on the dial inner element.

## Target behaviour

| State | bgVideo opacity | bgVideo filter | genericVideo opacity | dialUi opacity |
|-------|----------------|----------------|----------------------|----------------|
| IDLE | 0 (0.3s) | blur(0px) (0.3s) | 1 (0.3s) | 0 (0.3s, existing) |
| ACTIVE | 1 (0.3s) | blur(40px) (0.3s) | 0 (0.3s) | 1 (0.3s, existing) |
| ENGAGED | 1 | blur(40px) (no change) | 0 | 1 |

Blur is owned by `setDialState`. Hover handlers no longer touch `filter`.

## Changes — `work-dial.js`

### 1. `setDialState` — IDLE branch
- Change `bgVideo` opacity tween: `duration: 0.4` → `duration: 0.3`
- Change `genericVideo` fade-in tween: `duration: 0.4` → `duration: 0.3`
- Add `filter: 'blur(0px)'` to the `bgVideo` tween (single combined tween)
- Reduced motion: `gsap.set(bgVideo, { opacity: 0, filter: 'blur(0px)' })`

### 2. `setDialState` — ACTIVE branch
- Change `bgVideo` opacity tween: `duration: 0.4` → `duration: 0.3`
- Change `genericVideo` fade-out tween: `duration: 0.4` → `duration: 0.3`
- Add `filter: 'blur(40px)'` to the `bgVideo` tween (single combined tween)
- Reduced motion: `gsap.set(bgVideo, { opacity: 1, filter: 'blur(40px)' })`

### 3. Hover handlers — pointerenter / pointerleave
- Remove `gsap.to(bgVideo, { filter: 'blur(40px)', ... })` from `pointerenter`
- Remove `gsap.to(bgVideo, { filter: 'blur(0px)', ... })` from `pointerleave`
- Remove `gsap.set(bgVideo, { filter: 'blur(0px)' })` reduced-motion fallback
- `setDialState(ENGAGED)` / `setDialState(ACTIVE)` calls remain unchanged

### 4. Idle threshold — `updateGeom()`
```js
// Before (line ~709)
geom.idleThreshold = (geom.innerR + geom.baseLen) + (200 * (r.width / 3000));

// After
geom.idleThreshold = ((geom.innerR + geom.baseLen) + (200 * (r.width / 3000))) * 0.6;
```

## Timing summary

All transitions on `bgVideo` and `genericVideo`: **0.3s, linear**
`dialUi` (`.dial_layer-ui`): already 0.3s — no change
ENGAGED hover: no timing changes, blur tweens removed

## Constraints

- `prefers-reduced-motion`: use `gsap.set` (instant) for all bgVideo/genericVideo changes
- ENGAGED state: no blur tween needed — blur is already at 40px from ACTIVE entry
- No changes to `orchestrator.js`, CSS, or any other module
