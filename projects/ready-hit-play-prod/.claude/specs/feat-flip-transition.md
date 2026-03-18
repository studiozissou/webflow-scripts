# Spec: GSAP Flip-Based About Transition

**Slug:** `feat-flip-transition`
**Client:** ready-hit-play-prod
**Status:** Planning
**Created:** 2026-03-17
**Supersedes:** `rhp-about-transition-persist` (keeps architecture, replaces positioning logic)

---

## Context

The current about-transition system uses manual pixel calculations (`_getCSSVar`, `_parseSize`, hardcoded `top: '2vh'`) to position the logo and dial during home↔about transitions. These break on edge cases (scrollbar offsets, CSS clamp values, viewport resize mid-transition).

**Goal:** Replace manual positioning with GSAP Flip for reliable container-to-container animation, and restructure about→home to play forward (not reverse) with a post-transition overlay hold.

## Decisions (Confirmed)

1. **Flip reparenting** — Logo and dial DOM nodes physically move between containers via `appendChild`. Flip captures state before, reparents, then animates from the old state.
2. **Dial target** — `.about_dial-wrapper` inside `.about-transition` (not the real about-page dial). All Flip containers are children of `.about-transition`.
3. **About→home overlay hold** — `.about-transition` stays visible after about→home transition until `RHP.workDial` is initialised (dial canvas drawn, first video ready), then fades out.
4. **About→home forward animation** — Instead of `tl.reverse()`, play a separate forward animation (same easing as home→about, e.g. `power3.out`). This avoids Power3.out playing in reverse (which looks like Power3.in).
5. **Flip loading** — Add `Flip.min.js` to `init.js` `CONFIG.dependencies` for guaranteed availability.

---

## DOM Structure (inside `.about-transition`)

```
.about-transition
  ├── .about-transition_background          (overlay backdrop)
  ├── .about-transition_logo-start          (logo HOME position — nav-sized, top)
  │     └── #transition-logo                (reparented here for home state)
  ├── .about-transition_logo-middle         (logo ABOUT position — large, centred)
  │     └── .transition-dial                (dial HOME position — large, centred)
  └── .about_dial-wrapper                   (dial ABOUT position — small, bottom)
```

### Flip Container Map

| Element | Home→About Start | Home→About End |
|---------|-----------------|----------------|
| `#transition-logo` (logo) | `.about-transition_logo-start` | `.about-transition_logo-middle` |
| `.transition-dial` (dial) | `.about-transition_logo-middle` | `.about_dial-wrapper` |

About→home reverses the containers (but plays a new forward animation, not `tl.reverse()`).

---

## Implementation Steps

### Step 1: Add Flip to init.js dependencies
**File:** `init.js`

Add GSAP Flip plugin to `CONFIG.dependencies` array, after ScrollTrigger/SplitText:
```
https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/Flip.min.js
```

Ensure `gsap.registerPlugin(Flip)` is called after load (or verify Webflow head block already does this).

### Step 2: Remove manual positioning helpers
**File:** `orchestrator.js`

Remove or deprecate:
- `_getCSSVar()` — no longer needed for transition positioning
- `_parseSize()` — no longer needed
- `_getScrollbarOffset()` — Flip handles this automatically
- `_findTransitionLogo()` — replace with direct `document.querySelector('#transition-logo')`

Keep any helpers still used elsewhere (audit before removing).

### Step 3: Rewrite `getAboutTransitionTimeline` → two Flip-based functions
**File:** `orchestrator.js`

Replace the single persistent `aboutTransitionTL` with two functions that create fresh Flip animations each time (Flip captures live positions — no stale cache, no resize invalidation needed):

#### `runHomeToAboutTransition()`
```js
function runHomeToAboutTransition(data) {
  const overlay = document.querySelector('.about-transition');
  const logo = document.querySelector('#transition-logo');
  const dial = document.querySelector('.transition-dial');
  const logoEnd = document.querySelector('.about-transition_logo-middle');
  const dialEnd = document.querySelector('.about-transition .about_dial-wrapper');

  if (!overlay || !logo || !dial || !window.Flip) return Promise.resolve();

  // Show overlay
  gsap.set(overlay, { display: 'flex', opacity: 0 });

  // Capture current positions
  const logoState = Flip.getState(logo);
  const dialState = Flip.getState(dial);

  // Reparent to end containers
  logoEnd.appendChild(logo);
  dialEnd.appendChild(dial);

  // Animate overlay fade
  const overlayTween = gsap.to(overlay, {
    opacity: 1, duration: 0.3, ease: 'linear'
  });

  // Flip animate logo and dial
  const logoFlip = Flip.from(logoState, {
    duration: 0.75, ease: 'power3.out',
    absolute: true  // prevents layout shift during animation
  });
  const dialFlip = Flip.from(dialState, {
    duration: 0.75, ease: 'power3.out',
    absolute: true
  });

  // Return promise that resolves when all complete
  return Promise.all([
    overlayTween.then ? overlayTween : new Promise(r => overlayTween.eventCallback('onComplete', r)),
    new Promise(r => logoFlip.eventCallback('onComplete', r)),
    new Promise(r => dialFlip.eventCallback('onComplete', r)),
  ]).then(() => {});
}
```

#### `runAboutToHomeTransition()`
Plays a **new forward animation** (not reverse) — same easing, opposite container direction.

```js
function runAboutToHomeTransition(data) {
  const overlay = document.querySelector('.about-transition');
  const logo = document.querySelector('#transition-logo');
  const dial = document.querySelector('.transition-dial');
  const logoHome = document.querySelector('.about-transition_logo-start');
  const dialHome = document.querySelector('.about-transition_logo-middle');

  if (!overlay || !logo || !dial || !window.Flip) return Promise.resolve();

  // Overlay is ALREADY visible (or set it visible for direct-land)
  gsap.set(overlay, { display: 'flex', opacity: 1 });

  // Capture current positions (logo in _logo-middle, dial in _dial-wrapper)
  const logoState = Flip.getState(logo);
  const dialState = Flip.getState(dial);

  // Reparent to home containers
  logoHome.appendChild(logo);
  dialHome.appendChild(dial);

  // Flip animate — FORWARD easing (power3.out), not reversed
  const logoFlip = Flip.from(logoState, {
    duration: 0.75, ease: 'power3.out',
    absolute: true
  });
  const dialFlip = Flip.from(dialState, {
    duration: 0.75, ease: 'power3.out',
    absolute: true
  });

  // Do NOT fade overlay here — it stays visible until work-dial is ready
  // Return promise when Flip animations complete (overlay fades later)
  return Promise.all([
    new Promise(r => logoFlip.eventCallback('onComplete', r)),
    new Promise(r => dialFlip.eventCallback('onComplete', r)),
  ]).then(() => {});
}
```

### Step 4: Overlay hold + delayed fade on about→home
**File:** `orchestrator.js`

After `runAboutToHomeTransition()` completes and Barba's `afterEnter` fires for `home` namespace:

```js
// In runAfterEnter(), when ns === 'home' and came from 'about':
const overlay = document.querySelector('.about-transition');
if (overlay && overlay.style.display !== 'none') {
  // Wait for work-dial to be ready
  const waitForDial = () => new Promise(resolve => {
    const check = () => {
      if (RHP.workDial && RHP.workDial._ready) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });

  await waitForDial();

  // Fade out overlay
  gsap.to(overlay, {
    opacity: 0, duration: 0.4, ease: 'power2.out',
    onComplete: () => gsap.set(overlay, { display: 'none' })
  });
}
```

**Requires:** `work-dial.js` must expose a `_ready` flag (or similar) that becomes `true` after init completes (canvas drawn, first video attached). If a public ready signal doesn't exist, add one:
```js
// In work-dial.js init():
RHP.workDial._ready = true;
// In work-dial.js destroy():
RHP.workDial._ready = false;
```

Add a safety timeout (e.g. 3s) so the overlay doesn't stay visible forever if work-dial fails to init.

### Step 5: Direct-land pre-positioning
**File:** `orchestrator.js`

Update `bootCurrentView()`:

- **Direct land /about:** Reparent logo into `.about-transition_logo-middle`, dial into `.about_dial-wrapper`. Keep `.about-transition` hidden (`display: none`). No animation — just DOM position. This means about→home Flip will capture the correct "about" state.
- **Direct land /home or /case:** Logo stays in `.about-transition_logo-start`, dial stays in `.about-transition_logo-middle`. These are the default "home" positions.

No manual `gsap.set()` positioning needed — Flip reads position from the container's CSS layout.

### Step 6: Remove resize invalidation
**File:** `orchestrator.js`

Delete:
```js
window.addEventListener('resize', () => { aboutTransitionTL = null; }, { passive: true });
```

Flip captures live positions at animation time — no stale timeline to invalidate.

### Step 7: Clean up CSS
**File:** `ready-hit-play.css`

Ensure Flip containers have correct CSS layout for their target positions:
- `.about-transition_logo-start` — flex, centered, positioned at nav-logo location
- `.about-transition_logo-middle` — flex, centered, fills overlay (large logo position)
- `.about_dial-wrapper` (inside `.about-transition`) — fixed, bottom, small dial size

Remove any `position: fixed` / `left` / `top` rules that were only needed for the manual GSAP positioning — Flip handles this.

### Step 8: Update transition-dial canvas resize
**File:** `transition-dial.js`

Flip's reparenting changes the dial container size. The canvas needs to resize to match:
- Hook into Flip's `onUpdate` or use a `ResizeObserver` on `.transition-dial` to call `RHP.transitionDial.resize()` during animation
- Or: call `resize()` once after Flip completes

### Step 9: Logo opacity handling
**File:** `orchestrator.js`

The current implementation fades logo opacity to 0.4 during home→about. With Flip, opacity is not a layout property — it must be animated separately:

```js
// During home→about, after Flip:
gsap.to(logo, { opacity: 0.4, duration: 0.75, ease: 'power3.out' });

// During about→home:
gsap.to(logo, { opacity: 1, duration: 0.75, ease: 'power3.out' });
```

---

## Barba Impact Assessment

1. **Init/Destroy lifecycle** — No new persistent listeners. Flip creates disposable tweens per transition. Logo/dial reparenting persists across transitions (they live outside Barba container). No `destroy()` needed.
2. **State survival** — Logo and dial DOM positions survive transitions (they're outside Barba container). Flip reads live state — no stale cache.
3. **Transition interference** — Overlay at `z-index: 2` (matches current). Flip uses `absolute: true` to prevent layout shift. On about→home, overlay persists through `afterEnter` until work-dial ready — must not conflict with home module init.
4. **Re-entry correctness** — home→about→home→about: each Flip captures live state from the container where the element currently lives. No stale positions. Logo/dial always end up in the correct container.
5. **Namespace scoping** — Same as current: home→about, about→home, case→about. No change to which namespaces trigger transitions.

---

## Critical Files

| File | Action |
|------|--------|
| `init.js` | Add Flip.min.js to CONFIG.dependencies |
| `orchestrator.js` | Rewrite transition functions with Flip, add overlay hold logic |
| `work-dial.js` | Expose `_ready` flag for overlay fade trigger |
| `transition-dial.js` | Canvas resize during/after Flip reparenting |
| `ready-hit-play.css` | Ensure Flip container CSS is correct, remove manual positioning overrides |

---

## Parallelisation Map

| Stream | Tasks | Agent | Est. Time | Dependencies |
|--------|-------|-------|-----------|--------------|
| A | Step 1 (Flip dep) | code-writer | 5 min | None |
| B | Steps 2–6 (orchestrator rewrite) | code-writer | 30 min | Step 1 |
| C | Step 7 (CSS cleanup) | code-writer | 10 min | None (can parallel with B) |
| D | Step 8 (transition-dial resize) | code-writer | 10 min | None (can parallel with B) |
| E | Step 9 (logo opacity) | code-writer | 5 min | Part of B |
| F | Code review | code-reviewer ×3 | 10 min | B, C, D complete |
| G | Acceptance tests | qa | 10 min | F complete |

**Recommendation:** Steps A+C+D in parallel, then B (main rewrite), then F+G sequential.
No worktrees needed — changes touch different files but orchestrator.js is the bottleneck.

---

## Verification

1. **Flip loaded:** `console.log(window.Flip)` — should be defined after init.js loads deps
2. **Home→about:** Logo flips from `_logo-start` → `_logo-middle`, dial from `_logo-middle` → `_dial-wrapper`. Smooth `power3.out` easing. Overlay fades in.
3. **About→home:** Logo flips from `_logo-middle` → `_logo-start`, dial from `_dial-wrapper` → `_logo-middle`. Same smooth `power3.out` (NOT reversed easing). Overlay stays visible until work-dial is ready, then fades out.
4. **Re-entry:** home→about→home→about — each transition plays cleanly, no stale positions
5. **Direct land /about:** Page loads, `.about-transition` hidden, logo in `_logo-middle`, dial in `_dial-wrapper`. Navigate about→home — Flip animates from those positions.
6. **Direct land /home:** Logo in `_logo-start`, dial in `_logo-middle`. Navigate home→about — Flip animates forward.
7. **Resize:** Resize window between transitions — Flip captures new positions, no stale cache.
8. **Reduced motion:** Check `prefers-reduced-motion` — skip Flip animation, instant reparent.
9. **Console errors:** All 4 namespaces, no errors after transitions.
10. **Smoke tests:** `npm run test:smoke`

**CDN deploy note:** No `purge-cdn.sh` exists — `/build` will use Playwright MCP fallback for staging verification.

---

## Acceptance Tests

See `tests/acceptance/feat-flip-transition.spec.js`

1. `home→about: no JS errors during transition`
2. `home→about: logo ends up in .about-transition_logo-middle`
3. `home→about: dial ends up in .about_dial-wrapper`
4. `home→about: overlay is visible during transition`
5. `about→home: no JS errors during transition`
6. `about→home: logo ends up in .about-transition_logo-start`
7. `about→home: dial ends up in .about-transition_logo-middle`
8. `about→home: overlay stays visible until homepage loaded`
9. `about→home: overlay fades out after work-dial ready`
10. `re-entry: home→about→home→about — no errors, clean DOM`
11. `direct land /about: logo in correct container`
12. `direct land /about→home: transition plays correctly`
13. `prefers-reduced-motion: content visible without animation delay`
