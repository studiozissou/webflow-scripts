# rhp-work-dial-switch-deadzone — Outer-ring project switching inside fg video

**Status:** Ready to Build
**Priority:** P2
**Project:** ready-hit-play-prod
**Created:** 2026-04-08
**Approach:** A — State-machine tweak (chosen over parallel-switch-path, confidence 90/100)

## Summary

Allow project switching to keep working while the cursor is inside the foreground video — but only in the outer ring. Introduce a tweakable "deadzone" radius at the centre of the fg video: inside the deadzone, switching stays locked (user is clearly engaging with the video); outside the deadzone but still inside the fg video, switching re-enables so users don't have to fully leave the circle to pick a different project.

Default deadzone = `videoR * 0.7` → inner 70 % of fg video locks switching; outer 30 % ring enables it.
Live-tuneable via `window.RHP.workDial.setDeadzoneRatio(0.65)` in DevTools.

## Current State

- `work-dial.js:17` defines `DIAL_STATES = { IDLE, ACTIVE, ENGAGED }`.
- `work-dial.js:908–912` — `ACTIVE ↔ ENGAGED` transition fires at `fgDist <= geom.videoR - 6` (i.e. anywhere inside the fg video).
- `work-dial.js:915–916` — `state.inSwitch` requires `state.rDist > geom.innerR`, so it is **false** anywhere inside the fg video.
- `work-dial.js:919` — desktop sector switching gate:
  ```js
  if (!isMobile() && dialState === DIAL_STATES.ACTIVE && state.inSwitch && !state.inInner) {
    applyActive(idx);
  }
  ```
  Two separate conditions block switching once the cursor crosses into the fg video: the state goes to `ENGAGED` **and** `state.inInner` flips to `true`.
- `work-dial.js:927` — cursor PLAY state is driven by `state.inInner`, not `dialState`.
- `work-dial.js:1178` — tick warmth uses `state.inInner`.
- `work-dial.js:1296` — `.dial_layer-fg` click → `goToActiveCase(e, items, state)` (unconditional on desktop).

## Requirements

### R1: Introduce a deadzone radius concept

- Add a module-scoped, runtime-mutable `SWITCH_DEADZONE_RATIO` constant at the top of the IIFE (default `0.7`).
- Add `geom.deadzoneR` computed in `setupGeometry()` as `geom.videoR * SWITCH_DEADZONE_RATIO`. Recomputed on every resize via the existing `setupGeometry()` call path.
- Add hysteresis helpers `H.deadzoneEnter = () => geom.deadzoneR - 6` and `H.deadzoneExit = () => geom.deadzoneR + 10` to match the existing `inner*`/`switch*` helper pattern.

### R2: Move the ACTIVE ↔ ENGAGED threshold to the deadzone

- Change the `ACTIVE → ENGAGED` condition from `fgDist <= geom.videoR - 6` → `fgDist <= geom.deadzoneR - 6`.
- Change the `ENGAGED → ACTIVE` condition from `fgDist >= geom.videoR + 4` → `fgDist >= geom.deadzoneR + 4`.
- Semantic change: `ENGAGED` now means "cursor is deep in the fg video centre, do not switch me". `ACTIVE` continues to cover the tick ring **and** the outer ring of the fg video.

### R3: Add `state.inDeadzone` and replace `!state.inInner` in the switch gate

- Add `inDeadzone: false` to the `state` object.
- Track `inDeadzone` in `onPointerMove` using `fgDist` with hysteresis:
  ```js
  if (!state.inDeadzone && fgDist <= H.deadzoneEnter()) state.inDeadzone = true;
  else if (state.inDeadzone && fgDist >= H.deadzoneExit()) state.inDeadzone = false;
  ```
- Change the switch gate at line 919:
  ```js
  if (!isMobile() && dialState === DIAL_STATES.ACTIVE && state.inSwitch && !state.inDeadzone) {
  ```
- Reset `state.inDeadzone = false` in `onPointerLeave()`.

### R4: Relax `inSwitch` so it covers the outer fg ring

- Remove the `state.rDist > geom.innerR` restriction from `inSwitch` enter/exit:
  ```js
  if (!state.inSwitch && state.rDist <= H.switchEnter()) state.inSwitch = true;
  else if (state.inSwitch && state.rDist >= H.switchExit()) state.inSwitch = false;
  ```
- `inSwitch` now simply means "cursor is inside `switchMaxR`", i.e. anywhere on the dial. The `!state.inDeadzone` check handles the centre exclusion.

### R5: Hoist `fgDist` computation

- `fgDist = Math.hypot(e.clientX - geom.fgCX, e.clientY - geom.fgCY)` is currently computed only inside the `ACTIVE↔ENGAGED` block (line 907). Hoist it to the top of the "after `rDist/angDeg` are set" section so it can be reused by both the state transition and the `inDeadzone` tracker.
- Keep the `!isMobile() && interactionUnlocked && introComplete` gating on the state transition block exactly as today.

### R6: Expose `setDeadzoneRatio()` for live tuning

- Add a setter:
  ```js
  function setDeadzoneRatio(ratio) {
    if (typeof ratio !== 'number' || !isFinite(ratio) || ratio < 0 || ratio > 1) return;
    SWITCH_DEADZONE_RATIO = ratio;
    if (geom.videoR) geom.deadzoneR = geom.videoR * ratio;
  }
  ```
- Add `setDeadzoneRatio` to the return object (next to `setIntroComplete`, `setAttractionEnabled`, etc.) so it's accessible via `window.RHP.workDial.setDeadzoneRatio()`.

## What intentionally does NOT change

- **Cursor PLAY state** (line 927, `setCursorPlay(dialState !== IDLE && state.inInner)`). Still driven by `state.inInner`, so PLAY shows anywhere inside the fg video, including the outer switchable ring. **Matches user answer: "Keep PLAY".**
- **Tick warmth** (line 1178, `const warm = (!isIdle && state.inInner) ? inf : 0`). Still uses `inInner`. Untouched.
- **`.dial_layer-fg` click handler** (line 1296) — already calls `goToActiveCase()` unconditionally on desktop. Clicking in the outer switchable ring navigates to whichever sector `applyActive()` just set. **Matches user answer: "Same as tick ring (navigate to active project)".**
- **Mobile tap-to-snap** in `onPointerDown`/`onPointerUp` — the whole deadzone logic is gated on `!isMobile()` at the switch gate and on the ACTIVE↔ENGAGED transition block.
- **Intro gating** — `interactionUnlocked` and `introComplete` checks around the state transition and the switch gate are preserved.
- **`geom.innerR`** — unchanged. Still used by `inInner` tracking, tick warmth, and the fg video boundary for other purposes.

## Files to Modify

| File | Change |
|------|--------|
| `projects/ready-hit-play-prod/work-dial.js` | ~20 lines across 7 edit sites (see Implementation Detail) |

No other files touched. No CSS, no init.js, no orchestrator.js.

## Implementation Detail

### 1. Top of IIFE (after `DIAL_STATES`, around line 17)

```js
const DIAL_STATES = { IDLE: 'idle', ACTIVE: 'active', ENGAGED: 'engaged' };

// Outer switch ring inside the fg video:
// cursor beyond (videoR * this ratio) from fg centre still updates the active
// sector even though it's over the video. Inside = switching locked.
// Live-tuneable via RHP.workDial.setDeadzoneRatio().
let SWITCH_DEADZONE_RATIO = 0.7;
```

### 2. `geom` object (line 340)

```js
const geom = { cx:0, cy:0, fgCX:0, fgCY:0, videoR:0, innerR:0, switchMaxR:0, deadzoneR:0, dpr:1, gap:0, baseLen:0, maxLen:0, barW:1, nearPx:0, radFalloff:0 };
```

### 3. `state` object (line 349)

```js
// zones
inInner:false,
inSwitch:false,
inDeadzone:false,
```

### 4. `setupGeometry()` (after line 856, `geom.switchMaxR = …`)

```js
geom.switchMaxR = outerBase + geom.maxLen + geom.videoR * T.switchBufferRatio;
geom.deadzoneR  = geom.videoR * SWITCH_DEADZONE_RATIO;
```

### 5. Hysteresis helper object (line 872)

```js
const H = {
  innerEnter:    () => geom.innerR - 6,
  innerExit:     () => geom.innerR + 10,
  switchEnter:   () => geom.switchMaxR - 10,
  switchExit:    () => geom.switchMaxR + 20,
  deadzoneEnter: () => geom.deadzoneR - 6,
  deadzoneExit:  () => geom.deadzoneR + 10
};
```

### 6. `onPointerMove()` (lines 880–929) — full rewrite of the body after `state.rDist` is set

```js
function onPointerMove(e) {
  const rect = canvas.getBoundingClientRect();
  state.x = e.clientX - rect.left;
  state.y = e.clientY - rect.top;

  const dx = state.x - geom.cx;
  const dy = state.y - geom.cy;
  state.rDist = Math.hypot(dx, dy);
  state.angDeg = angleTop0(dx, dy);

  // Hoisted — reused by state transition AND inDeadzone tracker
  const fgDist = Math.hypot(e.clientX - geom.fgCX, e.clientY - geom.fgCY);

  // IDLE ↔ ACTIVE — desktop only
  if (!isMobile() && interactionUnlocked) {
    if (dialState === DIAL_STATES.IDLE && state.rDist <= geom.idleThreshold) {
      setDialState(DIAL_STATES.ACTIVE);
    } else if (dialState === DIAL_STATES.ACTIVE && state.rDist > geom.idleThreshold) {
      setDialState(DIAL_STATES.IDLE);
    } else if (dialState === DIAL_STATES.ENGAGED && state.rDist > geom.idleThreshold) {
      setDialState(DIAL_STATES.IDLE);
    }
  }

  // inInner zone — unchanged. Still drives cursor PLAY + tick warmth.
  if (!state.inInner && state.rDist <= H.innerEnter()) state.inInner = true;
  else if (state.inInner && state.rDist >= H.innerExit()) state.inInner = false;

  // inDeadzone zone — new. Drives sector-switching exclusion.
  if (!state.inDeadzone && fgDist <= H.deadzoneEnter()) state.inDeadzone = true;
  else if (state.inDeadzone && fgDist >= H.deadzoneExit()) state.inDeadzone = false;

  // ACTIVE ↔ ENGAGED — now based on deadzone, not fg video edge
  if (!isMobile() && interactionUnlocked && introComplete) {
    if (dialState === DIAL_STATES.ACTIVE && fgDist <= geom.deadzoneR - 6) {
      setDialState(DIAL_STATES.ENGAGED);
    } else if (dialState === DIAL_STATES.ENGAGED && fgDist >= geom.deadzoneR + 4) {
      setDialState(DIAL_STATES.ACTIVE);
    }
  }

  // inSwitch — relaxed: no longer requires rDist > innerR
  if (!state.inSwitch && state.rDist <= H.switchEnter()) state.inSwitch = true;
  else if (state.inSwitch && state.rDist >= H.switchExit()) state.inSwitch = false;

  // Switch gate — deadzone replaces inInner
  if (!isMobile() && dialState === DIAL_STATES.ACTIVE && state.inSwitch && !state.inDeadzone) {
    const idx = Math.floor(mod(state.angDeg + sectorOffset, 360) / sectorSize);
    applyActive(idx);
  }

  // Cursor — still driven by inInner, unchanged
  if (!isMobile() && RHP.cursor && RHP.cursor.setPosition) {
    RHP.cursor.setPosition(e.clientX, e.clientY);
    setCursorPlay(dialState !== DIAL_STATES.IDLE && state.inInner);
  }
}
```

### 7. `onPointerLeave()` (line 931)

```js
function onPointerLeave() {
  state.x = -1e4; state.y = -1e4;
  state.rDist = 1e9;
  state.inInner = false;
  state.inSwitch = false;
  state.inDeadzone = false;
  if (!isMobile()) setCursorPlay(false);
  if (!isMobile() && interactionUnlocked && dialState !== DIAL_STATES.IDLE) {
    setDialState(DIAL_STATES.IDLE);
  }
}
```

### 8. Return object (line 1470 area)

```js
function setDeadzoneRatio(ratio) {
  if (typeof ratio !== 'number' || !isFinite(ratio) || ratio < 0 || ratio > 1) return;
  SWITCH_DEADZONE_RATIO = ratio;
  if (geom.videoR) geom.deadzoneR = geom.videoR * ratio;
}

return {
  init, destroy, suspend, resume, isSuspended,
  getActiveIndex,
  setIntroComplete,
  setAttractionEnabled,
  setDeadzoneRatio,
  onIntroComplete,
  onNavAnimationComplete,
  setInteractionUnlocked,
  getIntroVideoEl,
  _ready: false,
  version: WORK_DIAL_VERSION
};
```

### 9. Bump version

`const WORK_DIAL_VERSION = '2026.4.8.2';`

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM, no new listeners, no new GSAP timelines. The new `state.inDeadzone` flag and `geom.deadzoneR` value live inside the existing `state`/`geom` objects which are re-created on every `init()`. Nothing new to wire in orchestrator.js.
2. **State survival** — `SWITCH_DEADZONE_RATIO` is module-scoped (persists across inits, which is correct — user's tuning should survive home→about→home). `geom.deadzoneR` is re-derived from `videoR` in `setupGeometry()` which is already called on every `init()` + resize.
3. **Transition interference** — None. The change is contained to `onPointerMove` gating logic; no z-index, opacity, or DOM mutations.
4. **Re-entry correctness** — Existing `onPointerLeave()` resets `inInner`/`inSwitch`; we add `inDeadzone` reset alongside. On `init()`, `state` is re-created from scratch, so `inDeadzone` starts at `false`. No stale flags.
5. **Namespace scoping** — Home only. The entire work-dial module only runs when the home view initialises. Desktop-only enforced via `!isMobile()` on the switch gate and on the ACTIVE↔ENGAGED transition block.

## Verify Loop

### Pass/fail criteria

1. **Outer-ring switching works** — With cursor at `fgDist ≈ 0.8 * videoR` (inside fg video, outside deadzone), moving to two different angles changes `window.RHP.workDial.getActiveIndex()`.
2. **Deadzone lock holds** — With cursor at `fgDist ≈ 0.3 * videoR` (inside deadzone), moving to two different angles does NOT change `getActiveIndex()`.
3. **Cursor state preserved** — Cursor element shows PLAY (custom cursor `data-cursor` attribute or class) anywhere inside the fg video, deadzone or outer ring. Exact state-check depends on `cursor.js` implementation; minimum assertion: cursor does not flip to the tick-ring arrow style inside the fg video.
4. **Console is clean** — Zero `pageerror` events during a full pointermove sweep across the dial.
5. **Live tuning works** — `window.RHP.workDial.setDeadzoneRatio(0.3)` from DevTools updates behaviour without reload. After calling, hover at `fgDist = 0.5 * videoR` now switches (default 0.7 would have locked).
6. **Barba re-entry** — Home → About → Home: deadzone switching still works on the second visit. No orphan listeners, no doubled behaviour.

### Reproduction steps

1. `navigate_page` to `/` on desktop ≥ 1024 px.
2. `evaluate_script` → call `RHP.workDial.setIntroComplete(true); RHP.workDial.setInteractionUnlocked(true);` to skip intro gating.
3. `evaluate_script` → read `.dial_layer-fg` bounding rect to compute `fgCX`, `fgCY`, `videoR`.
4. Simulate pointermove via `page.mouse.move(x, y)` at known distances/angles relative to `(fgCX, fgCY)`.
5. Read `RHP.workDial.getActiveIndex()` before and after each move.

### Tier mapping

- **Tier 1 (auto — Playwright local)**: 6 tests in `tests/acceptance/rhp-work-dial-switch-deadzone.spec.js`. Runs during `/build` verify loop.
- **Tier 2 (auto — CDN regression)**: Registered in `tests/registry.json` (on save-spec-only mode this is skipped; user can add manually if shipping).
- **Tier 3 (manual)**:
  1. Subjective feel of `0.7` default — does it feel natural, or does it need tuning to 0.65 / 0.75? (cannot automate subjective motion feel)
  2. Safari + Firefox sanity check (Playwright only runs Chromium in this project).

### Regression scope — must NOT break

- Tick ring switching on outer dial (`inSwitch` zone outside `innerR`) — still works, the relaxed `inSwitch` includes it.
- Cursor PLAY state throughout fg video — unchanged (line 927 untouched).
- Tick warmth calc (line 1178) — unchanged (`inInner` untouched).
- Click-to-navigate on `.dial_layer-fg` — unchanged (line 1296 untouched).
- Mobile tap-to-snap (`onPointerDown`/`onPointerUp`) — gated on `!isMobile()`, unchanged.
- Home intro sequence — `interactionUnlocked` and `introComplete` gating preserved around the ACTIVE↔ENGAGED transition.
- About ↔ Home Barba transitions — no new state, no new listeners, no new DOM.

## Parallelisation Map

| Stream | Task | Agent | Est. Time | Dependency |
|--------|------|-------|-----------|------------|
| A | Edit `work-dial.js` (all 7 sites + version bump) | code-writer | 5 min | None |
| B | Acceptance test file | code-writer | 8 min | None |
| C | Multi-reviewer code review (3 parallel sonnet agents — simplicity, correctness, conventions) | code-reviewer ×3 | 4 min | After A |
| D | Human review + (optional) registry + queue entry | — | — | After C |

**Recommendation:** Streams A and B run in parallel. C is the gate before handing off. **No worktrees, no agent teams** — single-file change, tight scope.

## Acceptance Tests

See `tests/acceptance/rhp-work-dial-switch-deadzone.spec.js` for machine-runnable tests.

| # | Test name | Type |
|---|-----------|------|
| 1 | `setDeadzoneRatio` exposed on `window.RHP.workDial` | API surface |
| 2 | hovering in outer ring of fg video updates active sector | Interaction (functional) |
| 3 | hovering deep in fg video centre does NOT change active sector | Interaction (functional) |
| 4 | no JS errors on home pointermove sweep | Console |
| 5 | `setDeadzoneRatio(0.3)` changes behaviour live | Runtime tuning |
| 6 | prefers-reduced-motion: outer-ring switching still functional | Reduced motion |

## Open Questions / Manual Tuning Hooks

- **Default `0.7` feel check** — ship with 0.7, tune from the DevTools console after visual review. `setDeadzoneRatio()` is there specifically so tuning doesn't need a redeploy cycle.
- **Cursor state in outer ring** — user chose "Keep PLAY". Re-evaluate if it feels confusing once live (click still navigates even with PLAY cursor, matching today's ENGAGED click behaviour).
