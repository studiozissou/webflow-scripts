# RHP Dial: Engaged Tick Lock + Dynamic Sector Count

**Slug:** `rhp-dial-engaged-ticks-dynamic-sectors`
**Project:** ready-hit-play-prod
**Status:** Ready to Build
**Priority:** P1
**Created:** 2026-04-13

## Summary

Two changes to `work-dial.js`:

1. **Engaged mode disables tick lengthening** — When the dial enters ENGAGED state (cursor inside deadzone), smoothly tween `attractionEase` to 0 so ticks return to base length. This communicates that the project can't be switched. On returning to ACTIVE, attraction re-enables naturally via the existing per-frame ramp.

2. **Dynamic sector count** — Remove the `Math.min(8, ...)` cap on `N` so the number of sectors matches the actual CMS item count. Make `FLAT_TICKS` proportional (`~67%` of ticks per sector) to maintain consistent orange band width regardless of project count.

## Files Affected

| File | Lines | Change |
|------|-------|--------|
| `work-dial.js` | ~280 | Remove `Math.min(8, ...)` cap |
| `work-dial.js` | ~519-522 | Add `attractionEase` tween in ENGAGED branch of `setDialState` |
| `work-dial.js` | ~577 | Dynamic `FLAT_TICKS` calculation |
| `work-dial.js` | ~1224 | Gate `hasAttraction` on `dialState !== ENGAGED` |

**Single file, ~15 LOC changed. Complexity: Low.**

## Detailed Changes

### 1. Engaged mode disables tick lengthening

**In `setDialState()` (~line 519):**
```js
} else if (newState === DIAL_STATES.ENGAGED) {
  setDialUiOpacity(1);
  // Smoothly disable tick attraction so ticks return to base length
  const gsap = window.gsap;
  const reduced = prefersReduced();
  if (gsap && !reduced) {
    gsap.to(state, { attractionEase: 0, duration: 0.3, ease: 'power2.out', overwrite: true });
  } else {
    state.attractionEase = 0;
  }
}
```

**In the draw loop (~line 1224):**
```js
const hasAttraction = hasPointer && !reduced && attractionEnabled && dialState !== DIAL_STATES.ENGAGED;
```

This dual approach ensures:
- The GSAP tween smoothly animates lengthened ticks back to default size
- The `hasAttraction` gate prevents any new lengthening while in ENGAGED
- When transitioning ENGAGED → ACTIVE, the per-frame ramp (`+= 0.04`) naturally re-enables attraction

### 2. Dynamic sector count

**Remove cap (~line 280):**
```js
// Before:
const N = Math.min(8, items.length);
// After:
const N = items.length;
```

**Dynamic FLAT_TICKS (~line 577):**
```js
// Before:
const FLAT_TICKS = 8;
// After:
const FLAT_TICKS = Math.round(TICKS_PER_SECTOR * 0.67);
```

With 6 projects: `TICKS_PER_SECTOR = 96/6 = 16`, `FLAT_TICKS = Math.round(16 * 0.67) = 11`. The orange band maintains ~67% coverage of each sector.

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements, event listeners, or timelines. The GSAP tween on `state.attractionEase` targets a plain object property and is killed when the gsap context is reverted in `destroy()`. No lifecycle changes needed.
2. **State survival** — Nothing new persists across transitions. `attractionEase` resets to 0 on init.
3. **Transition interference** — No. The tween targets a JS value, not a DOM element. No z-index or opacity conflicts.
4. **Re-entry correctness** — On home → about → home, `init()` resets `state.attractionEase = 0` and `dialState = IDLE`. Clean re-entry.
5. **Namespace scoping** — Home only (same as existing work-dial). No change.

## Verify Loop

### Pass/fail criteria
- **ENGAGED ticks at base length:** When cursor enters deadzone (ENGAGED state), all ticks must be at `geom.baseLen` (no lengthening). If ticks were lengthened before entering ENGAGED, they must smoothly return to base length within ~0.3s.
- **ACTIVE ticks lengthen normally:** When cursor exits deadzone back to ACTIVE, ticks must respond to cursor proximity and lengthen toward `geom.maxLen` as before.
- **6 sectors visible:** With 6 CMS items, the orange highlight should show 6 evenly-spaced sectors of 60 degrees each (not 8 sectors of 45 degrees).
- **Orange band proportional:** The fully-orange portion of each sector should be visually similar in ratio to the old 8-project layout (~67% of sector width).
- **No console errors** on home page load and during IDLE → ACTIVE → ENGAGED → ACTIVE → IDLE cycle.

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io`
2. Wait for RHP scripts to load (`window.RHP.scriptsOk === true`)
3. Move cursor toward the dial ring (enters ACTIVE state — ticks lengthen, orange sector appears)
4. Move cursor into the centre of the fg video circle (enters ENGAGED state)
5. Observe: lengthened ticks should smoothly shrink back to base length
6. Move cursor back out toward the tick ring (returns to ACTIVE)
7. Observe: ticks should lengthen again toward cursor position
8. Count visible orange sectors — should be 6 (matching CMS items)

### Tier mapping
- **Tier 1:** `rhp-dial-engaged-ticks-dynamic-sectors.spec.js` — DOM presence, console errors, CMS item count assertion, canvas presence, reduced motion
- **Tier 2:** Registered in `tests/registry.json`
- **Tier 3:** Manual — visual tick animation smoothness, orange band proportionality, ENGAGED→ACTIVE transition feel (subjective timing)

### Regression scope
- Dial state machine transitions must still work (IDLE ↔ ACTIVE ↔ ENGAGED)
- Sector switching must still work in ACTIVE state
- Mobile dial must be unaffected (mobile doesn't use ENGAGED state)
- Barba transitions must not break (suspend/resume/init/destroy cycle)
- Step text scramble must still fire on state changes

## Test Plan

### Tier 1 — Auto: Playwright local
- Canvas and dial DOM present
- No console errors on home load
- CMS item count matches sector expectations (6 items present)
- Reduced motion: ticks visible, no animation errors

### Tier 2 — Auto: CDN regression
- Registered in `tests/registry.json` as `rhp-dial-engaged-ticks-dynamic-sectors`

### Tier 3 — Manual
- [ ] ENGAGED state: ticks visually shrink to base length smoothly (~0.3s)
- [ ] ACTIVE→ENGAGED→ACTIVE: ticks re-lengthen after exiting deadzone
- [ ] Orange sectors: 6 evenly-spaced sectors visible (not 8)
- [ ] Orange band width looks proportional across sectors
- [ ] Safari + Firefox: same behaviour (canvas rendering)

## Acceptance Tests

See `tests/acceptance/rhp-dial-engaged-ticks-dynamic-sectors.spec.js`.

| Test | What it checks |
|------|---------------|
| `dial canvas is present` | `#dial_ticks-canvas` attached |
| `6 CMS items present on homepage` | `.dial_cms-item` count === 6 |
| `no JS errors on home page load` | Zero `pageerror` events |
| `RHP scripts initialise` | `window.RHP.scriptsOk === true` |
| `ticks visible with reduced motion` | Canvas present, no errors with `prefers-reduced-motion: reduce` |
