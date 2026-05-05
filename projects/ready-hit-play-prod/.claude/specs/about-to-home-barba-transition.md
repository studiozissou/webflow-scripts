# about-to-home-barba-transition

## Summary

Replace the about→home hard reload (`window.location.href`) with a proper Barba transition that slides the about container out left and lands on the home main section with the dial visible and interactive (skip intro). Also fix the Safari home→about stuck page issue (safeResolve on `leaveAboutToHome`).

## Approach: Explicit cleanup + direct skipToEnd (Approach B)

Instead of relying on `home-scroll-morph.init()` implicitly detecting re-entry via a hidden `.section_home-intro`, we explicitly call `skipToEnd()` in the transition's `afterEnter`. This ensures the dial lands in its final interactive state deterministically.

## Root Cause (current behaviour)

The about-to-home transition currently does `window.location.href = target` in `beforeLeave`, forcing a full page reload. This:
1. Restarts the intro sequence from scratch (user sees words + morph again)
2. Loses all client-side state (video positions, scroll offset)
3. Is jarring — the user expected to land on the home main section with the dial showing

Additionally, `leaveAboutToHome` in `home-about-slide.js` lacks the `safeResolve` pattern added to `leaveHomeToAbout`, making it vulnerable to the same stuck-page bug on Safari.

## Fix (3 changes)

### 1. Replace about-to-home hard reload with Barba slide-out transition (`orchestrator.js`)

**Current** (lines 1881–1898):
```js
{
  name: 'about-to-home',
  from: { namespace: ['about'] },
  to: { namespace: ['home'] },
  beforeLeave(data) {
    var target = data.next?.url?.href || data.next?.url?.path || '/';
    window.location.href = target;
    return new Promise(function() {});
  },
  leave() {}
}
```

**New:**
```js
{
  name: 'about-to-home',
  from: { namespace: ['about'] },
  to: { namespace: ['home'] },
  beforeLeave(data) {
    const ns = data.current?.namespace || currentNs;
    if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
    RHP.videoLoader?.destroy?.();
  },
  leave(data) {
    return RHP.homeAboutSlide?.leaveAboutToHome
      ? RHP.homeAboutSlide.leaveAboutToHome(data)
      : Promise.resolve();
  },
  enter() {
    window.scrollTo(0, 0);
  },
  afterEnter(data) {
    // Explicit skipToEnd before runAfterEnter — ensures dial is in final
    // state before views.home.init() fires (which would otherwise try
    // to init scroll-morph with a hidden section and bail to skipToEnd
    // implicitly via the guard at line 373).
    if (data.next?.container) {
      RHP.homeScrollMorph?.skipToEnd?.(data.next.container);
    }
    setDialToHomeState();
    runAfterEnter(data);
  }
}
```

**Why explicit skipToEnd:** `runAfterEnter` calls `RHP.homeIntro.skip()` (line 1596) which sets scope classes + unlocks the dial, then calls `views.home.init()` which calls `homeScrollMorph.init()`. Inside `init()`, the guard at line 373 checks if `.section_home-intro` is `display:none` and redirects to `skipToEnd()`. But that's an implicit contract — if the section markup or CSS changes, the guard could silently fail and init a broken ScrollTrigger. Calling `skipToEnd()` explicitly before `runAfterEnter` is deterministic.

**Sequencing detail:** `skipToEnd()` sets `initialised = true` (line 927), so when `views.home.init()` later calls `homeScrollMorph.init()`, it hits the `if (initialised) return;` guard at line 344 and no-ops. No double-init risk.

### 2. Add safeResolve to `leaveAboutToHome` (`home-about-slide.js`)

**Current** (lines 242–252):
```js
return new Promise(function (resolve) {
  g.fromTo(current.container,
    { xPercent: 0 },
    {
      xPercent: -100,
      duration: 1,
      ease: 'power3.out',
      onComplete: resolve
    }
  );
});
```

**New:**
```js
return new Promise(function (resolve) {
  var resolved = false;
  var safety = null;
  function safeResolve() {
    if (resolved) return;
    resolved = true;
    if (safety) safety.kill();
    resolve();
  }

  safety = g.delayedCall(2, safeResolve);

  g.fromTo(current.container,
    { xPercent: 0 },
    {
      xPercent: -100,
      duration: 1,
      ease: 'power3.out',
      overwrite: true,
      onComplete: safeResolve,
      onInterrupt: safeResolve
    }
  );
});
```

### 3. Safari home→about fix verification

The `leaveHomeToAbout` safeResolve pattern (already shipped in the `fix-about-transition-stuck` build) should cover Safari. If it still fails in Safari testing, the `delayedCall(2)` guarantees resolution regardless. No additional code change needed — this spec covers verification only.

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `orchestrator.js` | 1881–1898 | Replace hard reload with slide-out + explicit skipToEnd |
| `home-about-slide.js` | 234–253 | Add safeResolve + onInterrupt + delayedCall to leaveAboutToHome |

## Barba Impact

1. **Init/Destroy lifecycle** — `views.about.destroy()` called in `beforeLeave`. `views.home.init()` called via `runAfterEnter`. `homeScrollMorph.skipToEnd()` called explicitly before `runAfterEnter` to land in final state. No new DOM elements or listeners.
2. **State survival** — No video handoff needed (about has no video). Dial state restored via `setDialToHomeState()` + `skipToEnd()`.
3. **Transition interference** — `leaveAboutToHome` slides the about container out (`xPercent: -100`). This doesn't conflict with the incoming home container. Curtain is reset in `resetCurtain()` (not used in this direction).
4. **Re-entry correctness** — about→home→about→home must work. `skipToEnd()` sets `initialised = true` + `complete = true`, so `destroy()` on next about-nav will reset correctly. `views.home.destroy()` calls `homeScrollMorph.destroy()` which resets `initialised = false`.
5. **Namespace scoping** — Only affects `about-to-home` transition. No impact on home-to-about, work-to-home, or work-to-about.

## Verify Loop

### Pass/fail criteria
- About→home transition slides the about container out left (no hard reload)
- Home page lands with dial visible and interactive (`.rhp-home-ready` on wrapper)
- `data-dial-ns` is `"home"` on `.dial_component`
- Scroll is CSS-locked on home (`overflow: hidden`)
- No console errors during transition
- Further navigation from home works (home→about, home→work)
- Full round-trip: about→home→work→home works clean
- Safari: home→about transition completes (not stuck)
- `leaveAboutToHome` resolves even if tween is killed (safeResolve)

### Reproduction steps
1. Navigate to homepage, wait for intro + morph complete
2. Click `.nav_about-link` → wait for about page
3. Click `.nav_logo-link` (or home link) → should slide about out, land on home with dial
4. Verify dial is showing, `.rhp-home-ready` is on wrapper
5. Click a case study link → should transition to work page
6. Navigate back to home → should land clean again

### Tier mapping
- **Tier 1:** `tests/acceptance/about-to-home-barba-transition.spec.js`
- **Tier 2:** Registered in `tests/registry.json`
- **Tier 3:** Safari cross-browser (home→about stuck), mobile touch (about→home swipe feel)

### Regression scope
- Home→about curtain transition must still work
- Work→home dial shrink must still work
- Work→about curtain transition must still work
- About→work must still work
- Nav logo click on home (replay) must still work
- `homeScrollMorph.skipToEnd()` must handle being called before `init()` (it does — it sets `initialised = true` directly)

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Parallel? |
|--------|------|-------|----------|-----------|
| A | Replace about-to-home in orchestrator.js | code-writer | ~20 | Yes |
| B | Add safeResolve to leaveAboutToHome | code-writer | ~15 | Yes (same agent) |

- **Sequential dependency:** Both changes go in one commit
- **Recommendation:** Single code-writer agent, sequential edits, one commit

## Acceptance Tests

See `tests/acceptance/about-to-home-barba-transition.spec.js`

| Test | What it verifies |
|------|-----------------|
| about to home: page transitions without reload | No hard reload — Barba DOM swap, about container slides out |
| about to home: dial is visible and interactive | `.rhp-home-ready` on wrapper, dial visible |
| about to home: dial namespace is home | `data-dial-ns="home"` on `.dial_component` |
| about to home: no console errors | No JS errors during transition |
| about to home: further navigation works | Can navigate from home to work after returning |
| round trip: about → home → about | Full cycle works clean |
| round trip: about → home → work | Cross-namespace re-entry |
| reduced motion: about to home resolves instantly | No animation, immediate state |
