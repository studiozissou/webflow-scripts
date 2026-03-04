# Spec: Fix — Dial Video Survival Across Barba Transitions

**Queue ID:** `fix-dial-bgvideo-barba`
**Priority:** P1
**Type:** Bug fix
**Prerequisite for:** `feat-dial-video-continuity`

---

## Problem

After any Barba transition (home → work, work → home):
- Black screen where the bg and fg dial videos should be playing
- On re-init the dial loads wrong/stale/missing videos; some sectors have no video; fg video gets stuck on one project
- Sector switching correctly updates UI text + tick colours, but video elements are broken or absent

---

## Root Causes

### RC1 — `originalBgEl` permanently deleted by cleanup

`dial_layer-bg` (containing `.dial_bg-video`) sits **outside** the Barba container — persistent across all transitions. However:

1. During a bg pool swap, `oldBgVisible` (the original Webflow `dial_bg-video`) is rotated out via `comp.appendChild(oldBgVisible)` — physically **moved inside** `dial_component` which is **inside** the Barba container.
2. `workDial.destroy()` cleanup then removes it via `bgPoolNext.remove()` or `bgVisible.parentNode.removeChild(bgVisible)`.
3. On re-init, `document.querySelector('.dial_bg-video')` returns `null` — element is gone forever.

Even without a pool swap occurring, cleanup calls `bgVisible.parentNode.removeChild(bgVisible)` which deletes it directly.

### RC2 — `dial_layer-fg` lives inside the Barba container

`dial_layer-fg` (containing `dial_video-wrap` and `dial_fg-video`) is a child of `dial_component` which is inside the Barba container. When Barba swaps the container:

- `dial_layer-fg` disappears mid-transition
- `runAfterEnter` for case namespace: `document.querySelector('.dial_layer-fg')` returns null (old container gone, case container has no fg layer) — the expand animation is a silent no-op
- `runCaseDialShrinkAnimation`: `data.current.container.querySelector('.dial_layer-fg')` — case container has no fg layer — shrink animation is a no-op

### RC3 — `homeIntro.skip()` / `resetToVisible()` fighting workDial init

`resetToVisible()` calls `gsap.set(bgVideo, { opacity: 1 })` **before** `workDial.init()`. workDial never resets bgVideo to opacity:0 at boot in IDLE (applyActive isInitial=true skips crossfade). bgVideo is stuck at opacity:1 in IDLE state on every Barba return.

---

## Solution

### Part A — Webflow Designer change

Move `dial_layer-fg` (the `<a>` tag containing `dial_video-wrap` + `dial_fg-video`) **out of** `dial_component` and the Barba container, to sit alongside `dial_layer-bg` as a persistent sibling.

```
BEFORE (inside container):
  main[data-barba="container"]
    section.section_home
      div.dial_component
        canvas
        a.dial_layer-fg      ← ✗ inside container
          div.dial_video-wrap
            video.dial_fg-video
        div.dial_layer-ui
        div.dial_cms-list-wrapper

AFTER (outside container):
  div.dial_layer-bg            ← already here ✓
    video.dial_bg-video
  a.dial_layer-fg              ← moved here ✓
    div.dial_video-wrap
      video.dial_fg-video
  main[data-barba="container"]
    section.section_home
      div.dial_component       ← canvas + CMS + UI only
        canvas
        div.dial_layer-ui
        div.dial_cms-list-wrapper
```

Both video layers are position:fixed/absolute fullscreen — moving them does not affect page layout.

### Part B — `work-dial.js`

#### B1. Capture original elements at init start

At the top of `init()`, before any pool creation or cleanup registration:

```js
const originalBgEl = document.querySelector(SEL.bgVideo);
const originalFgEl = document.querySelector(SEL.fgVideo);
```

These are the Webflow-authored elements. They must never be removed.

#### B2. Use `document.querySelector` for persistent elements

`dial_layer-fg` is now outside `comp`. Update lookups:

```js
// fgWrap — now outside comp, use document directly
const fgWrap = document.querySelector(SEL.fgWrap);

// visibleVideo initial find — falls naturally to document.querySelector fallback
// confirm comp.querySelector(SEL.fgVideo) is replaced with document.querySelector
```

`comp` (`dial_component`) still used for: canvas, CMS items, step text, title/meta.

#### B3. Pool rotation — never move `originalBgEl` into `comp`

In both bg pool swap branches, the demotion step currently does `comp.appendChild(oldBgVisible)`. Change to keep the demoted element in `bgLayerEl` (persistent):

```js
// When demoting oldBgVisible after a bg pool swap:
oldBgVisible.classList.remove('dial_bg-video');
oldBgVisible.setAttribute('aria-hidden', 'true');
oldBgVisible.style.cssText = poolHiddenStyle;
bgLayerEl.appendChild(oldBgVisible); // ← always bgLayerEl, never comp
```

This keeps all bg elements (active and hidden) inside the persistent `dial_layer-bg` wrapper.

Apply the same principle to fg pool demotion: demoted fg elements go back into `fgWrap` (hidden) rather than `comp`.

#### B4. Cleanup — never remove `originalBgEl` or `originalFgEl`

```js
cleanup.push(function () {
  poolPrev.remove();
  poolNext.remove();
  if (bgPoolPrev !== originalBgEl) bgPoolPrev.remove();
  if (bgPoolNext !== originalBgEl) bgPoolNext.remove();
  if (bgVisible && bgVisible !== originalBgEl && bgVisible.parentNode) {
    bgVisible.parentNode.removeChild(bgVisible);
  }
  // Reset originalBgEl for next init (stays in dial_layer-bg)
  if (originalBgEl) {
    window.gsap?.killTweensOf?.(originalBgEl);
    originalBgEl.style.cssText = '';
    originalBgEl.style.opacity = '0';
    try { originalBgEl.pause(); } catch(e) {}
    originalBgEl.removeAttribute('src');
    try { originalBgEl.load(); } catch(e) {}
  }
  // Reset originalFgEl for next init (stays in fgWrap)
  if (originalFgEl) {
    window.gsap?.killTweensOf?.(originalFgEl);
    originalFgEl.style.cssText = '';
    try { originalFgEl.pause(); } catch(e) {}
  }
  genericVideo?.remove();
  genericVideo = null;
  bgVisible = null;
  stopDriftMonitorGlobal();
});
```

#### B5. Remove dadc622 Fix 1 (now redundant)

The `gsap.set(bgVisible, { opacity: 0 })` guard added after `applyActive(0)` in dadc622 is made redundant by §C1 below (removing `resetToVisible` from the Barba return path). Remove it to avoid GSAP tween noise.

Keep dadc622 Fix 2 (handoff blur patch) — it remains valid.

#### B6. Version bump

`WORK_DIAL_VERSION = '2026.2.28.1'`

### Part C — `orchestrator.js`

#### C1. Remove `homeIntro.skip()` from Barba return path

`homeIntro.skip()` / `resetToVisible()` is a first-load path. It should not fire on Barba returns — it sets `bgVideo.opacity = 1` before workDial.init, polluting the IDLE initial state.

```js
// In runAfterEnter, remove this block:
if (prevNs && prevNs !== 'home' && data.next && data.next.container) {
  RHP.homeIntro?.skip?.(data.next.container);  // ← remove
}
```

Confirm `homeIntro` intro path still fires correctly on first `DOMContentLoaded` load via `introMode: true` in `views.home.init`.

#### C2. `runCaseDialShrinkAnimation` — use `document.querySelector`

```js
// Before:
const dialFg = data.current?.container?.querySelector('.dial_layer-fg');

// After:
const dialFg = document.querySelector('.dial_layer-fg');
```

`dialFg` is now always in the DOM (outside container). The shrink animation will work.

#### C3. `runAfterEnter` — use `document.querySelector` for dialFg and bgVideo

```js
// Before:
var dialFg = (data.next?.container)?.querySelector('.dial_layer-fg');
if (!dialFg) dialFg = document.querySelector('.dial_layer-fg');
var bgVideo = (data.next?.container)?.querySelector('.dial_bg-video');
if (!bgVideo) bgVideo = document.querySelector('.dial_bg-video');

// After:
var dialFg = document.querySelector('.dial_layer-fg');
var bgVideo = document.querySelector('.dial_bg-video');
```

#### C4. Version bump

`ORCHESTRATOR_VERSION = '2026.2.28.1'`

### Part D — `ready-hit-play.css`

`dial_layer-fg` is now outside the Barba container — namespace-scoped CSS (`[data-barba-namespace="home"] .dial_layer-fg`) no longer applies. Replace with wrapper state class:

```css
/* Before */
[data-barba-namespace="home"] .dial_layer-fg { ... }
[data-barba-namespace="home"] .dial_bg-video { ... }

/* After */
.rhp-home-ready .dial_layer-fg { ... }
.rhp-home-ready .dial_bg-video { ... }
```

`dial_layer-fg` must be hidden on non-home pages. Add default hidden state:

```css
.dial_layer-fg {
  visibility: hidden;
  pointer-events: none;
  opacity: 0;
}
.rhp-home-ready .dial_layer-fg {
  visibility: visible;
  pointer-events: auto;
}
/* opacity is managed by GSAP (setDialState) so leave it off the rhp-home-ready rule */
```

Audit all existing `[data-barba-namespace="home"]` rules that reference dial elements and confirm equivalents using `.rhp-home-ready`.

---

## What This Does Not Include

- Videos continuing to play during the transition animation (separate: `feat-dial-video-continuity`)
- Work → home handoff showing the last-visited project (separate: `feat-dial-video-continuity`)
- Pool-ready unlock replacing the 300ms timeout (separate: `feat-dial-video-continuity`)

---

## Files Changed

| File | Change |
|------|--------|
| `work-dial.js` | `originalBgEl`/`originalFgEl` tracking; cleanup fix; pool rotation fix; `document.querySelector` for persistent elements; remove dadc622 Fix 1; version bump |
| `orchestrator.js` | Remove `homeIntro.skip()` from Barba return; fix `dialFg`/`bgVideo` lookups; fix `runCaseDialShrinkAnimation`; version bump |
| `ready-hit-play.css` | Namespace-scoped dial rules → `.rhp-home-ready`; `dial_layer-fg` default hidden |
| **Webflow Designer** | Move `dial_layer-fg` outside Barba container |

---

## Testing

After deploy + jsDelivr hash update:

```bash
npm run test:smoke
```

Manual checks:
- [ ] Home fresh load: intro plays, IDLE generic video visible, bg+fg appear on hover
- [ ] Home → Work → Home (second visit): no black screen, dial re-inits cleanly, correct videos per sector
- [ ] Home → Work → Home → Work (third visit): repeatable, no degradation
- [ ] Bg video blur applied on hover after all return paths
- [ ] `dial_layer-fg` hidden on about, work, contact pages
- [ ] `runCaseDialShrinkAnimation` plays on work → home (circle shrinks back)
- [ ] `runAfterEnter` expand animation plays on home → work (circle grows)
