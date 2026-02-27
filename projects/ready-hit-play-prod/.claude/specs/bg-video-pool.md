# Spec: BG Video Sliding-Window Pool

**ID:** `feat-bg-video-pool`
**Priority:** P1
**File:** `work-dial.js` only — no other files change

---

## Problem

FG video switches are instant on adjacent sectors because `poolPrev` / `poolNext` preload the neighbouring project videos. BG has no pool — every sector change calls `setVideoSourceAndPoster(bgVideo, v, poster)` → `load()` → decode lag, visibly out of sync with FG.

## Goal

Give BG the same sliding-window pool as FG. Adjacent switches: instant, 0.15s crossfade (pool hit). Non-adjacent switches: existing src-reload path, 0.4s crossfade (pool miss, matches FG).

---

## Design

FG and BG play the same `data-video` URL for a given project index, so `bgPoolPrev` / `bgPoolNext` load identical URLs to `poolPrev` / `poolNext` — just in separate `<video>` elements.

`bgVisible` tracks the currently visible BG element. `bgVideoRef` is kept in sync and used by `setDialState` and the drift monitor.

During a pool-hit crossfade, both old and new BG videos coexist in `.dial_layer-bg` for 0.15s — both `position:absolute; inset:0` — then the outgoing element is demoted to an off-screen pool slot.

---

## Changes — `work-dial.js` only

### 1. Init — new BG pool variables (insert after fg pool creation, ~line 179)

```js
let bgPoolPrev = document.createElement('video');
let bgPoolNext = document.createElement('video');
[bgPoolPrev, bgPoolNext].forEach(el => {
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('muted', '');
  el.setAttribute('playsinline', '');
  el.setAttribute('loop', '');
  el.setAttribute('preload', 'auto');
  el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';
  comp.appendChild(el);
});
let bgVisible = null;                              // currently visible bg <video> element
let bgLoadWindowIndices = { prev: null, next: null };
```

**Cleanup:** add `bgPoolPrev.remove(); bgPoolNext.remove();` alongside existing fg pool cleanup.

---

### 2. `setDialState` — use `bgVideoRef` fallback (~line 281)

```js
// Before
const bgVideo = genericVideoComp?.querySelector(SEL.bgVideo) || document.querySelector(SEL.bgVideo);

// After — bgVideoRef points to bgVisible after any swap; fall back to DOM query on first run
const bgVideo = bgVideoRef || genericVideoComp?.querySelector(SEL.bgVideo) || document.querySelector(SEL.bgVideo);
```

No other changes to `setDialState`.

---

### 3. `applyActive` — initialise `bgVisible` on first call (after `visibleVideo` init, ~line 564)

Remove the existing local `bgVideo` variable declaration and replace with:

```js
if (!bgVisible) {
  bgVisible = comp.querySelector(SEL.bgVideo) || document.querySelector(SEL.bgVideo);
  if (bgVisible) { bgVisible.style.position = 'absolute'; bgVisible.style.inset = '0'; }
  bgVideoRef = bgVisible;
}
const bgLayerEl = comp.querySelector('.dial_layer-bg') || document.querySelector('.dial_layer-bg');
```

---

### 4. `applyActive` — save/pause `bgVisible` state (replace existing `bgVideo` references, ~lines 573–576)

```js
if (prevIndex >= 0 && bgVisible && bgVisible.tagName === 'VIDEO') {
  saveVideoStateToIndex(bgVisible, prevIndex);
  try { bgVisible.pause(); } catch(e) {}
}
```

---

### 5. `applyActive` — save out-of-window BG pool state (after fg pool window save, ~line 584)

```js
if (bgLoadWindowIndices.prev !== null && !inWindow(bgLoadWindowIndices.prev)) saveVideoStateToIndex(bgPoolPrev, bgLoadWindowIndices.prev);
if (bgLoadWindowIndices.next !== null && !inWindow(bgLoadWindowIndices.next)) saveVideoStateToIndex(bgPoolNext, bgLoadWindowIndices.next);
```

---

### 6. `applyActive` — BG pool hit check (NEW block; insert BEFORE existing `if (!didSwap)`, after fg pool logic ~line 650)

```js
const bgPoolPrevReady = bgPoolPrev.readyState >= 2;
const bgPoolNextReady = bgPoolNext.readyState >= 2;
const bgPoolPrevHasUrl = sameUrl(v, bgPoolPrev.currentSrc || bgPoolPrev.src);
const bgPoolNextHasUrl = sameUrl(v, bgPoolNext.currentSrc || bgPoolNext.src);
let didSwapBg = false;

// Inline style for a promoted bg element inside dial_layer-bg
// CSS class .dial_bg-video handles width/height/object-fit/transform:scale(1.1)/filter:blur(0px) baseline
const bgFilledStyle = 'position:absolute;inset:0;opacity:0;';
const currentBlurFilter = dialState !== DIAL_STATES.IDLE ? 'blur(40px)' : 'blur(0px)';
const currentBgOpacity = dialState !== DIAL_STATES.IDLE ? 1 : 0;
const useBgCrossfade = !prefersReduced() && !!window.gsap;

if (idx === bgLoadWindowIndices.prev && bgPoolPrevReady && bgPoolPrevHasUrl && bgLayerEl) {
  restoreVideoStateFromIndex(bgPoolPrev, idx);
  const oldBgVisible = bgVisible;
  // Ensure outgoing is absolutely positioned for stacking during crossfade
  if (oldBgVisible) { oldBgVisible.style.position = 'absolute'; oldBgVisible.style.inset = '0'; }
  // Promote incoming
  bgPoolPrev.classList.add('dial_bg-video');
  bgPoolPrev.removeAttribute('aria-hidden');
  bgPoolPrev.style.cssText = bgFilledStyle;
  bgLayerEl.appendChild(bgPoolPrev);
  if (useBgCrossfade) {
    window.gsap.set(bgPoolPrev, { filter: currentBlurFilter });
    window.gsap.to(bgPoolPrev, { opacity: currentBgOpacity, duration: 0.15, ease: 'linear', overwrite: true });
    window.gsap.to(oldBgVisible, { opacity: 0, duration: 0.15, ease: 'linear', overwrite: true, onComplete: () => {
      oldBgVisible.classList.remove('dial_bg-video');
      oldBgVisible.setAttribute('aria-hidden', 'true');
      oldBgVisible.style.cssText = poolHiddenStyle;
      if (oldBgVisible.parentNode === bgLayerEl) bgLayerEl.removeChild(oldBgVisible);
      comp.appendChild(oldBgVisible);
    }});
  } else {
    if (oldBgVisible) {
      oldBgVisible.classList.remove('dial_bg-video');
      oldBgVisible.setAttribute('aria-hidden', 'true');
      oldBgVisible.style.cssText = poolHiddenStyle;
      if (oldBgVisible.parentNode === bgLayerEl) bgLayerEl.removeChild(oldBgVisible);
      comp.appendChild(oldBgVisible);
    }
    bgPoolPrev.style.opacity = String(currentBgOpacity);
    if (window.gsap) window.gsap.set(bgPoolPrev, { filter: currentBlurFilter });
    else bgPoolPrev.style.filter = currentBlurFilter;
  }
  bgVisible = bgPoolPrev;
  bgVideoRef = bgVisible;
  // Repurpose slots: oldBgVisible → bgPoolNext (has items[newNext] URL buffered, ready for fwd switch)
  //                  freeBgPrev (old bgPoolNext) → bgPoolPrev (will load urlPrev below)
  const freeBgPrev = bgPoolNext;
  bgPoolNext = oldBgVisible;
  bgPoolPrev = freeBgPrev;
  didSwapBg = true;

} else if (idx === bgLoadWindowIndices.next && bgPoolNextReady && bgPoolNextHasUrl && bgLayerEl) {
  restoreVideoStateFromIndex(bgPoolNext, idx);
  const oldBgVisible = bgVisible;
  if (oldBgVisible) { oldBgVisible.style.position = 'absolute'; oldBgVisible.style.inset = '0'; }
  bgPoolNext.classList.add('dial_bg-video');
  bgPoolNext.removeAttribute('aria-hidden');
  bgPoolNext.style.cssText = bgFilledStyle;
  bgLayerEl.appendChild(bgPoolNext);
  if (useBgCrossfade) {
    window.gsap.set(bgPoolNext, { filter: currentBlurFilter });
    window.gsap.to(bgPoolNext, { opacity: currentBgOpacity, duration: 0.15, ease: 'linear', overwrite: true });
    window.gsap.to(oldBgVisible, { opacity: 0, duration: 0.15, ease: 'linear', overwrite: true, onComplete: () => {
      oldBgVisible.classList.remove('dial_bg-video');
      oldBgVisible.setAttribute('aria-hidden', 'true');
      oldBgVisible.style.cssText = poolHiddenStyle;
      if (oldBgVisible.parentNode === bgLayerEl) bgLayerEl.removeChild(oldBgVisible);
      comp.appendChild(oldBgVisible);
    }});
  } else {
    if (oldBgVisible) {
      oldBgVisible.classList.remove('dial_bg-video');
      oldBgVisible.setAttribute('aria-hidden', 'true');
      oldBgVisible.style.cssText = poolHiddenStyle;
      if (oldBgVisible.parentNode === bgLayerEl) bgLayerEl.removeChild(oldBgVisible);
      comp.appendChild(oldBgVisible);
    }
    bgPoolNext.style.opacity = String(currentBgOpacity);
    if (window.gsap) window.gsap.set(bgPoolNext, { filter: currentBlurFilter });
    else bgPoolNext.style.filter = currentBlurFilter;
  }
  bgVisible = bgPoolNext;
  bgVideoRef = bgVisible;
  // Repurpose slots: oldBgVisible → bgPoolPrev (has items[newPrev] URL buffered, ready for back switch)
  //                  freeBgNext (old bgPoolPrev) → bgPoolNext (will load urlNext below)
  const freeBgNext = bgPoolPrev;
  bgPoolPrev = oldBgVisible;
  bgPoolNext = freeBgNext;
  didSwapBg = true;
}
```

---

### 7. `applyActive` — BG non-swap path (replace existing lines ~655–658)

```js
// Before
if (bgVideo && bgVideo.tagName === 'VIDEO') {
  setVideoSourceAndPoster(bgVideo, v, poster);
}

// After — only reload on pool miss
if (!didSwapBg) {
  setVideoSourceAndPoster(bgVisible, v, poster);
}
```

---

### 8. `applyActive` — `restoreVideoState` + `playPaired` (replace `bgVideo` references, ~lines 660–679)

```js
// restoreVideoState: skip on bg swap (already called before swap; playPaired syncs currentTime)
restoreVideoStateFromIndex(visibleVideo, idx);
if (!didSwapBg && bgVisible && bgVisible.tagName === 'VIDEO') restoreVideoStateFromIndex(bgVisible, idx);

// ... (enforceVideoPolicy unchanged) ...

// BG miss crossfade (0.4s, same as fg miss — masks src reload)
if (!isInitial && !prefersReduced() && window.gsap) {
  window.gsap.fromTo(fgWrap, { opacity: 0 }, { opacity: 1, duration: didSwap ? 0.15 : 0.4, ease: 'linear', overwrite: true });
  if (!didSwapBg && bgVisible) {
    window.gsap.fromTo(bgVisible, { opacity: 0 }, { opacity: currentBgOpacity, duration: 0.4, ease: 'linear', overwrite: 'auto' });
  }
}

// playPaired: use bgVisible
if (bgVisible && bgVisible.tagName === 'VIDEO') {
  playPaired(visibleVideo, bgVisible);
} else {
  // ... existing fg-only fallback unchanged ...
}
```

---

### 9. `applyActive` — BG pool src loading (new section, after fg pool src loading ~line 694)

```js
// Mirror fg pool loading for BG pool (same URLs — both fg and bg use data-video per project)
if (urlPrev && bgPoolPrev.src !== urlPrev) {
  bgPoolPrev.poster = readPosterFromItem(items[newPrev]) || '';
  bgPoolPrev.src = urlPrev;
  try { bgPoolPrev.load(); } catch(e) {}
  startPoolWhenReady(bgPoolPrev);
}
if (urlNext && bgPoolNext.src !== urlNext) {
  bgPoolNext.poster = readPosterFromItem(items[newNext]) || '';
  bgPoolNext.src = urlNext;
  try { bgPoolNext.load(); } catch(e) {}
  startPoolWhenReady(bgPoolNext);
}
bgLoadWindowIndices.prev = newPrev;
bgLoadWindowIndices.next = newNext;
```

---

## Crossfade matrix

| Scenario | FG | BG |
|---|---|---|
| Pool HIT — adjacent, buffered | `fgWrap` fromTo 0→1 over **0.15s** | per-element crossfade: incoming 0→currentOpacity, outgoing currentOpacity→0, **0.15s** |
| Pool MISS — non-adjacent, reload | `fgWrap` fromTo 0→1 over **0.4s** | `bgVisible` fromTo 0→currentOpacity over **0.4s** (overwrite:'auto') |
| `prefers-reduced-motion` | Instant | Instant (no GSAP tweens) |
| `isInitial` (first call) | No crossfade | No crossfade |

---

## Acceptance criteria

- [ ] Adjacent switch: bg video changes **instantly** (no `load()` / decode lag)
- [ ] BG stays in sync with FG after swap (`playPaired` seeks bg to fg on ready)
- [ ] Non-adjacent switch: bg still switches (src reload, 0.4s crossfade), no regression vs today
- [ ] `setDialState(IDLE)` fades/pauses `bgVideoRef` — operates on `bgVisible` correctly after any swap
- [ ] `setDialState(ACTIVE)` fades/plays `bgVideoRef` — ditto
- [ ] Drift monitor uses `bgVideoRef` — points to `bgVisible` after swaps
- [ ] `prefers-reduced-motion`: instant swaps only, no animation
- [ ] Barba destroy: `bgPoolPrev` + `bgPoolNext` removed from DOM
- [ ] No z-index stacking glitch during crossfade (both elements in `.dial_layer-bg`, `position:absolute; inset:0`)
- [ ] No layout shift (pool elements are off-screen `1px×1px` until promoted)

---

## Out of scope

- CSS changes — no new rules needed; `.dial_bg-video` class provides sizing/transform
- `orchestrator.js`, `home-intro.js`, or any other module
- N×N full parallel-load rearchitect (stays in queue as fallback if this proves insufficient)
- Mobile-specific behaviour (bg behaviour on mobile unchanged)

---

## Gotchas

- **Class juggling during crossfade:** `oldBgVisible.classList.remove('dial_bg-video')` happens inside the `onComplete` callback (0.15s after swap starts). `bgVideoRef` is updated synchronously, so any `setDialState` call in those 0.15s operates on the correct new `bgVisible` — the outgoing tween on `oldBgVisible` completes harmlessly.
- **`sameUrl` helper:** bg pool hit checks use the same `sameUrl(a, b)` function as fg (last-60-chars comparison). Ensure both `currentSrc` and `src` are checked.
- **`bgVisible` stacking:** original `.dial_bg-video` from Webflow HTML has no `position:absolute` inline. We set it lazily on first bgVisible init AND at the start of each swap to ensure correct stacking.
- **`currentBgOpacity` during IDLE state:** If the user somehow triggers a sector switch while in IDLE (shouldn't happen due to `interactionUnlocked` guard), `currentBgOpacity = 0` and the swap is invisible — safe no-op.
