# fix-morph-scroll-snap — Auto-complete morph when scroll stalls near end

## Problem

On Safari desktop (and potentially all browsers), the scroll morph on the homepage doesn't fully complete. Safari's elastic overscroll / momentum physics cause the scroll to stall at ~95% ScrollTrigger progress. Because `onLeave` only fires when scroll passes the `end` marker (`+=100%`), the morph never completes — dial stays locked, nav never appears.

The `scrub: 0.5` config adds 500ms lag between scroll position and timeline progress, compounding the issue: the user has stopped scrolling but the timeline is still catching up.

## Solution — JS auto-complete via debounced `onUpdate` threshold

Add a debounced progress check inside the existing `onUpdate` callback in `buildTimeline()`. When `self.progress >= 0.9` holds for 200ms, call `onMorphComplete()` directly. The existing `complete` guard (`if (complete) return`) prevents double-fire if `onLeave` also triggers.

### Why this approach

- **Low complexity** — ~10 LOC in one file
- **No new dependencies** — uses existing module-scoped variables and GSAP's `delayedCall`
- **Safe** — `onMorphComplete()` already has a `complete` guard
- **Tunable** — threshold (0.9) and delay (200ms) are easy to adjust
- **All browsers** — applies universally, not Safari-only

### Why not alternatives

- **CSS scroll-snap**: `overflow: hidden` on html/body disables snap entirely; `mandatory` breaks 0–90% scrub
- **ScrollTrigger `snap` config**: Safari elastic bounce may fight the GSAP snap tween at the browser level; `scrub` + `snap` interaction is fragile

## Files affected

| File | Lines | Change |
|------|-------|--------|
| `home-scroll-morph.js` | 498–508 | Add debounced auto-complete logic inside `onUpdate` callback |

No other files affected. No new modules, no CSS changes.

## Implementation

### Changes to `home-scroll-morph.js`

Add a module-scoped variable for the delayed call:

```js
let _snapCall = null;  // gsap.delayedCall for auto-complete snap
```

Modify the `onUpdate` callback (lines 498–508) to add the debounced snap:

```js
onUpdate: (self) => {
  if (self.progress > 0 && logoSplitData.length) {
    _destroyLogoText();
  }
  if (RHP.transitionDial?.resize) RHP.transitionDial.resize();

  // Auto-complete: if progress stalls above 90% for 200ms, complete the morph.
  // Handles Safari elastic overscroll that prevents onLeave from firing.
  if (!complete && self.progress >= 0.9) {
    if (!_snapCall) {
      _snapCall = gsap.delayedCall(0.2, () => {
        if (!complete) onMorphComplete();
      });
    }
  } else if (_snapCall) {
    _snapCall.kill();
    _snapCall = null;
  }
}
```

Cleanup in `_killScrub()` — add `_snapCall?.kill(); _snapCall = null;` to prevent orphaned delayed calls.

Cleanup in `destroy()` — same guard: `_snapCall?.kill(); _snapCall = null;`.

### Key constraints

- `_snapCall` uses `gsap.delayedCall` (not `setTimeout`) — GSAP manages it, so it's killed automatically when GSAP context is destroyed
- The `0.2` delay (200ms) is intentionally short — just enough to distinguish "user stopped scrolling at 90%+" from "user is actively scrolling through the 90% zone"
- The `!complete` check inside the callback is belt-and-suspenders with the one in `onMorphComplete()`
- The `else if` branch cancels the delayed call if progress drops below 0.9 (e.g. user scrolls back up)

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements or event listeners. The `_snapCall` variable is module-scoped and cleaned up in `_killScrub()` and `destroy()`.
2. **State survival** — Nothing to persist. The `complete` flag is already reset in `init()`.
3. **Transition interference** — No. The auto-complete triggers the same `onMorphComplete()` path that `onLeave` would. No new animations or DOM mutations.
4. **Re-entry correctness** — `_snapCall` is killed in `destroy()`. On re-init, `complete` is reset to `false`, `_snapCall` is `null`. Clean slate.
5. **Namespace scoping** — Home only. `buildTimeline()` is only called on the home page desktop path. Mobile uses `buildMobileTimeline()` which has no ScrollTrigger.

## Verify Loop

### Pass/fail criteria

1. **Primary**: After scrolling ~90%+ of the morph on the homepage and releasing, the morph completes within ~700ms (200ms debounce + 500ms scrub catchup). Nav slides in, dial becomes interactive.
2. **No regression**: Scrolling slowly through 0–89% does NOT trigger early completion.
3. **Scroll-back cancellation**: If the user scrolls to 92% then scrolls back to 80%, the auto-complete does NOT fire.
4. **Clean `onLeave` path**: If the user scrolls fast enough to pass 100% naturally, `onLeave` fires as before — no double-fire, no errors.
5. **No console errors** on homepage load + morph completion.
6. **Replay works**: The logo-click replay path still functions (reverse morph, re-scrub).

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/` (staging)
2. Wait for intro sequence to complete (word cycle + logo morph trigger)
3. Slowly scroll down through the morph section
4. At ~90% progress, release the scroll (stop scrolling / lift fingers)
5. **Expected**: morph completes within ~700ms, nav slides in, dial becomes interactive
6. Scroll back up (should reverse morph via `onEnterBack`)
7. Repeat step 3–5 but release at ~50% — morph should NOT auto-complete

### Tier mapping

- **Tier 1 (auto)**: `fix-morph-scroll-snap.spec.js` tests 1–5 below
- **Tier 2 (CDN regression)**: registered in `tests/registry.json`
- **Tier 3 (manual)**:
  - Safari desktop elastic overscroll feel — Playwright only runs Chromium
  - Animation smoothness / easing quality during the 90%→100% auto-complete
  - Trackpad momentum behaviour on macOS Safari vs Chrome

### Regression scope

- Morph completion path (`onMorphComplete` → `_applyCompleteState`)
- Dial interaction unlock (must still work after auto-complete)
- Nav entrance animation (must still animate, not just pop)
- Replay/reverse morph (logo click → `replay()`)
- Barba home→about transition (morph should not interfere)

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Sequential deps |
|--------|------|-------|----------|-----------------|
| 1 | Implement auto-complete in `home-scroll-morph.js` | code-writer | ~15 | None |
| 2 | Write acceptance tests | code-writer | ~80 | After stream 1 (needs to know exact impl) |
| 3 | Manual Safari verification | human | — | After deploy |

**Recommendation**: Sequential — single file, low LOC, one agent. No worktrees needed.

## Acceptance Tests

See `tests/acceptance/fix-morph-scroll-snap.spec.js`:

1. `no JS errors on homepage load + morph` — collectErrors, scroll to trigger morph, assert no errors
2. `rhp-home-ready class applied after scroll to 90%+` — scroll to 90% of section, wait 700ms, check `.rhp-home-ready` on wrapper
3. `dial interaction unlocked after auto-complete` — after morph, check `window.RHP.workDial` state flags
4. `nav links visible after auto-complete` — check `.nav_about-link` and `.nav_contact-link` visibility
5. `no auto-complete at 50% scroll` — scroll to 50%, wait 500ms, verify `.rhp-home-ready` NOT present
