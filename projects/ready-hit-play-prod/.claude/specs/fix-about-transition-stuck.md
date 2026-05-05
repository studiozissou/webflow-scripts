# fix-about-transition-stuck

## Summary

When navigating home→about quickly after the scroll morph completes, the about page never appears. The page is stuck showing the homepage forever — must reload to recover.

## Root Cause

The `enter()` hook in the `home-to-about` Barba transition returns a Promise that resolves only when the curtain GSAP tween's `onComplete` fires. If the tween is killed (by GSAP overwrite logic, stale tween conflicts from the morph sequence, or the mobile deferred `finalize()` path), the Promise never resolves, `afterEnter` never fires, and the page is stuck:
- About container stays `visibility: hidden`
- `setDialNs('about')` never runs → dial remains in home mode
- `preventRunning: true` blocks all further navigation

## Fix (Hybrid A+B)

Three changes, ~10 lines:

### 1. `onInterrupt` callback on curtain tween (`home-about-slide.js`)
GSAP 3.12+ provides `onInterrupt` — fires when a tween is killed/overwritten before completion. Use it to resolve the Promise so `afterEnter` always fires.

### 2. Safety `gsap.delayedCall` (`home-about-slide.js`)
Add a `gsap.delayedCall(2, resolve)` that fires after the tween's expected 1.5s duration + 0.5s buffer. Kill it in `onComplete` (happy path) so it's a no-op when things work normally. Same pattern as the existing `safetyTimer` in `_runReveal`.

### 3. Container visibility guard (`orchestrator.js` `afterEnter`)
At the top of `afterEnter` for `home-to-about`, force `visibility: visible` on `data.next.container`. This ensures even if the curtain's `onComplete` never set it, the about container is never stuck hidden.

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `home-about-slide.js` | 70-87 | Add `onInterrupt`, `delayedCall` safety, `once()` guard on resolve |
| `orchestrator.js` | 1870-1875 | Add visibility guard in `afterEnter` |

## Implementation Detail

```js
// home-about-slide.js — leaveHomeToAbout (revised)
return new Promise(function (resolve) {
  var resolved = false;
  function safeResolve() {
    if (resolved) return;
    resolved = true;
    if (safety) safety.kill();
    if (nextContainer) g.set(nextContainer, { visibility: 'visible' });
    resolve();
  }

  g.set(curtainEl, { display: 'block' });
  g.fromTo(curtainEl, { x: '-100vw' }, {
    x: 0,
    duration: 1.5,
    ease: 'power4.out',
    overwrite: true,
    onComplete: safeResolve,
    onInterrupt: safeResolve
  });

  // Belt-and-suspenders: resolve after 2s regardless
  var safety = g.delayedCall(2, safeResolve);
});
```

```js
// orchestrator.js — home-to-about afterEnter (add at top)
afterEnter(data) {
  // Guard: ensure about container is visible even if curtain tween was killed
  if (data.next?.container && window.gsap) {
    window.gsap.set(data.next.container, { visibility: 'visible' });
  }
  RHP.views.home?.destroy?.();
  RHP.videoLoader?.destroy?.();
  runAfterEnter(data);
}
```

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements or listeners. Existing lifecycle unchanged.
2. **State survival** — No cross-transition state affected.
3. **Transition interference** — The `overwrite: true` explicitly clears stale curtain tweens, preventing the exact interference that causes the bug.
4. **Re-entry correctness** — `resetCurtain()` in `beforeLeave` still cleans up. The `once()` pattern (`resolved` flag) prevents double-resolution.
5. **Namespace scoping** — Only affects `home-to-about` and `work-to-about` transitions.

## Verify Loop

### Pass/fail criteria
- After morph completes, clicking about link → about page content appears within 3s
- The about container has `visibility: visible` after transition
- `data-dial-ns` attribute on `.dial_component` is `"about"` after transition
- No console errors during the transition
- Further navigation from about works (not stuck by `preventRunning`)

### Reproduction steps
1. Navigate to homepage (`/`)
2. Wait for intro to complete (RHP.scriptsOk)
3. Scroll through the 100vh morph section quickly (programmatic scroll to bottom)
4. Immediately click `.nav_about-link`
5. Wait 3s
6. Assert about content is visible

### Tier mapping
- Tier 1: `fix-about-transition-stuck.spec.js` — tests rapid morph→about nav
- Tier 3: Safari/Firefox cross-browser (Playwright only runs Chromium)

### Regression scope
- Home→about normal (slow) navigation must still work with curtain animation
- Work→about transition (uses same `leaveHomeToAbout`) must still work
- About→home (force reload) must still work
- Morph replay (nav logo click after about→home) must not break

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Parallel? |
|--------|------|-------|----------|-----------|
| A | Implement fix in home-about-slide.js | code-writer | ~15 | Yes |
| B | Add visibility guard in orchestrator.js | code-writer | ~3 | Yes (same agent, single commit) |

- **Sequential dependency:** Both changes go in one commit → deploy → test
- **Recommendation:** Single agent, sequential within file edits, one commit

## Acceptance Tests

See `tests/acceptance/fix-about-transition-stuck.spec.js`

| Test | What it verifies |
|------|-----------------|
| rapid morph to about: page appears | Core bug — about content visible after fast morph→nav |
| rapid morph to about: no console errors | No JS errors during the race condition |
| rapid morph to about: dial namespace is about | `data-dial-ns="about"` on `.dial_component` |
| rapid morph to about: further navigation works | Not stuck — can navigate away from about |
| normal morph to about still works | Regression — slow path unaffected |
| reduced motion: about appears instantly | prefers-reduced-motion path |
