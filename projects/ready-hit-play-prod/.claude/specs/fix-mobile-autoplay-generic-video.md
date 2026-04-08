# fix-mobile-autoplay-generic-video

> Hide generic video element when iOS blocks autoplay (Low Power Mode)

**Priority:** P1
**Status:** Ready to Build
**Created:** 2026-04-03
**Jam source:** cc7b5c16-7c6c-423b-8a80-bafa0edf57e6

---

## Problem

**Bug 1:** When iOS Safari blocks autoplay (Low Power Mode), the native Safari play button appears over the `genericVideo` element. Screenshot shows a large play icon in the top-left area of the dial.

**Bug 6:** "Background video seems to have frozen" — the genericVideo can't play, so it shows a frozen frame or nothing.

---

## Root Cause

`work-dial.js:230` creates `genericVideo` at full size (`position:absolute;inset:0;width:100%;height:100%`) with `opacity:0`. iOS Safari renders native play button UI over any `<video>` with blocked autoplay regardless of opacity. The `_autoplayBlocked` flag is set (line 82, 245) but nothing hides the element.

`setDialState(IDLE)` at lines 349-353 calls `genericVideo.play()` unconditionally with no check of `_autoplayBlocked`.

---

## File Changes

### `work-dial.js`

**1. genericVideo creation (line 230)**

Start hidden so iOS never renders controls over it before we know autoplay works:

```js
// BEFORE:
genericVideo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:0;z-index:0;';

// AFTER:
genericVideo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:0;z-index:0;display:none;';
```

**2. After tryPlay at boot (line 245)**

On success, restore display:

```js
// BEFORE:
tryPlay(genericVideo).then(r => { if (!r.ok) _autoplayBlocked = true; });

// AFTER:
tryPlay(genericVideo).then(r => {
  if (!r.ok) {
    _autoplayBlocked = true;
  } else {
    genericVideo.style.display = '';
  }
});
```

**3. setDialState IDLE branch (lines 349-353)**

Gate on autoplay status:

```js
if (genericVideo) {
  if (_autoplayBlocked && !_autoplayUnlocked) {
    // Autoplay blocked: keep hidden to prevent native iOS play button
    genericVideo.style.display = 'none';
  } else {
    genericVideo.style.display = '';
    try { genericVideo.play().catch(() => {}); } catch(e) {}
    if (gsap && !reduced) gsap.to(genericVideo, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: true });
    else genericVideo.style.opacity = '1';
  }
}
```

**4. Intro-skipped boot (line ~1141)**

Gate the genericVideo show/fade on autoplay status:

```js
if (dialState === DIAL_STATES.IDLE && introComplete && genericVideo) {
  if (_autoplayBlocked && !_autoplayUnlocked) {
    // Keep hidden — user gesture needed
  } else {
    genericVideo.style.display = '';
    // ... existing _dismissGenericSpinner logic unchanged ...
  }
}
```

**5. pointerdown enforceVideoPolicy (line ~1209)**

Replace existing handler to add unlock logic:

```js
on(window, 'pointerdown', () => {
  enforceVideoPolicy(comp);
  // Unlock autoplay after user gesture
  if (_autoplayBlocked && !_autoplayUnlocked) {
    _autoplayUnlocked = true;
    window.dispatchEvent(new CustomEvent('rhp:autoplay:unlocked'));
    if (dialState === DIAL_STATES.IDLE && genericVideo) {
      genericVideo.style.display = '';
      tryPlay(genericVideo).then(r => {
        if (r.ok && window.gsap) {
          window.gsap.to(genericVideo, { opacity: 1, duration: 0.3, ease: 'linear' });
        }
      });
    }
  }
}, { once: true, passive: true }, true);
```

### `ready-hit-play.css`

**6. Add defense-in-depth (after existing dial video rules):**

```css
/* iOS: suppress native video controls on dial videos (autoplay-blocked Low Power Mode) */
.dial_generic-video::-webkit-media-controls,
.dial_fg-video::-webkit-media-controls {
  display: none !important;
}
```

---

## Barba Impact

- `_autoplayBlocked` and `_autoplayUnlocked` are module-scoped, reset on `init()` (line 151-152). Clean on Barba return.
- `genericVideo` is created+destroyed with init/destroy cycle. No stale state.
- No new DOM elements or persistent listeners beyond existing patterns.

---

## Verify

1. Enable Low Power Mode on iPhone → open home → no native play button visible over dial
2. Tap anywhere on dial → video starts playing, generic video fades in if in IDLE
3. Disable Low Power Mode → reload → generic video shows normally (no regression)
4. Barba nav: home → about → home — genericVideo re-creates cleanly
5. Tab hide/show: video resumes correctly after tab visibility change
