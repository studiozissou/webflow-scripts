# fix-mobile-dial-position-video-flash

> Fix dial centering on work→home return + eliminate FG video flash on sector change

**Priority:** P2
**Status:** Ready to Build
**Created:** 2026-04-03
**Jam source:** cc7b5c16-7c6c-423b-8a80-bafa0edf57e6

---

## Problem

**Bug 3:** After navigating case/work → home via Barba, the dial appears shifted to the top-right instead of centered.

**Bug 2:** When switching sectors on the dial (mobile), the foreground video disappears briefly (black flash) then reappears.

---

## Root Cause

**Bug 3:** `setDialToHomeState()` (orchestrator.js line 301-318) runs `clearProps: 'all'` which should let CSS `[data-dial-ns="home"] .dial_layer-fg` re-center via `position:absolute; inset:0; margin:auto`. On mobile, residual Webflow inline styles or CSS specificity issues may prevent proper centering on the first frame.

**Bug 2:** Two sources:

1. `work-dial.js` line 687: `gsap.fromTo(fgWrap, { opacity: 0 }, { opacity: 1, ... })` forces `fgWrap` to `opacity:0` on every sector change — guaranteed black frame flash
2. Pool swap (lines 627-676): `fgWrap.removeChild(oldVisible)` runs immediately, then new video is appended at `opacity:0` waiting for `seeked` event (up to 500ms). Gap where no visible video exists in fgWrap.

---

## File Changes

### `orchestrator.js`

**1. setDialToHomeState() (line ~312)**

After clearProps, assert centering:

```js
function setDialToHomeState() {
  const gsap = window.gsap;
  const dialFg = document.querySelector('.dial_layer-fg');
  const dialUI = document.querySelector('.dial_layer-ui');
  const dialComp = document.querySelector('.dial_component');
  if (!dialFg) return;

  setDialNs('home');
  dialFg.classList.remove('is-case-study', 'no-scrollbar');

  if (gsap) {
    gsap.set(dialFg, { clearProps: 'all' });
    // Assert centering — defensive against stale inline styles on mobile
    gsap.set(dialFg, { position: 'absolute', inset: 0, margin: 'auto' });
    if (dialUI) gsap.set(dialUI, { clearProps: 'opacity' });
  } else {
    dialFg.style.cssText = '';
    if (dialUI) dialUI.style.cssText = '';
  }
}
```

### `work-dial.js`

**2. fgWrap crossfade (line 687)**

Remove the forced `opacity:0` flash:

```js
// BEFORE:
window.gsap.fromTo(fgWrap, { opacity: 0 }, { opacity: 1, duration: didSwap ? 0.15 : 0.4, ease: 'linear', overwrite: true });

// AFTER:
window.gsap.to(fgWrap, { opacity: 1, duration: didSwap ? 0.15 : 0.4, ease: 'linear', overwrite: true });
```

**3. Pool swap — poolPrev block (lines ~627-651)**

Defer old video removal until new video is seeked. Replace the current remove-then-add pattern:

```js
if (idx === loadWindowIndices.prev && poolPrevReady && poolPrevHasUrl && fgWrap.contains(visibleVideo)) {
  const oldVisible = visibleVideo;
  // Append new video OVER old (old stays visible until new is seeked)
  fgWrap.appendChild(poolPrev);
  poolPrev.classList.add('dial_fg-video');
  poolPrev.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;';
  poolPrev.removeAttribute('aria-hidden');
  poolPrev.poster = '';

  // Deferred cleanup: remove old video after new is revealed
  var oldRemoved = false;
  var removeOld = function() {
    if (oldRemoved) return;
    oldRemoved = true;
    oldVisible.classList.remove('dial_fg-video');
    if (fgWrap.contains(oldVisible)) fgWrap.removeChild(oldVisible);
  };

  // Seek-mask with integrated cleanup
  var revealed = false;
  var reveal = function() {
    if (revealed) return;
    revealed = true;
    if (window.gsap) window.gsap.to(poolPrev, { opacity: 1, duration: 0.15, ease: 'linear', overwrite: true, onComplete: removeOld });
    else { poolPrev.style.opacity = '1'; removeOld(); }
  };
  poolPrev.addEventListener('seeked', reveal, { once: true });
  setTimeout(reveal, 500);

  restoreVideoStateFromIndex(poolPrev, idx);
  visibleVideo = poolPrev;

  // Repurpose pool elements (existing logic unchanged)
  const freeElPrev = poolNext;
  poolNext = oldVisible;
  comp.appendChild(poolNext);
  poolNext.style.cssText = poolHiddenStyle;
  poolNext.setAttribute('aria-hidden', 'true');
  try { poolNext.pause(); } catch(e) {}
  poolPrev = freeElPrev;
  if (urlPrev && poolPrev.src !== urlPrev) {
    poolPrev.poster = readPosterFromItem(items[newPrev]) || '';
    poolPrev.src = urlPrev;
    try { poolPrev.load(); } catch (e) {}
    ensurePoolBuffered(poolPrev);
  }
  didSwap = true;
}
```

**4. Pool swap — poolNext block (lines ~652-676)**

Same crossfade pattern as poolPrev: append new video, keep old visible, defer `removeChild` into reveal callback.

---

## Barba Impact

- `setDialToHomeState` centering assertion: cleared by `clearProps: 'all'` on next transition. No stale state.
- Pool swap: old video removal is deferred by ~150ms max (seeked usually fires in <50ms). Old video is always removed before next `applyActive` call because `state.lastIndex` guard prevents re-entry.
- No new DOM elements persist — old video is always removed in reveal callback or 500ms timeout.

---

## Verify

1. Home → case → back to home: dial centered correctly (not shifted to top-right)
2. On mobile, drag dial through sectors: no black flash between projects
3. Rapid sector switching: no duplicate videos accumulating in fgWrap
4. Desktop: existing hover/crossfade behaviour unchanged (no regression)
5. Pool swap path: video transitions show brief crossfade, not black gap
