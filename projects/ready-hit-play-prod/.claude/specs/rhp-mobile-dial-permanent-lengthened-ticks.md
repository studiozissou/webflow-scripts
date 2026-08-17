# rhp-mobile-dial-permanent-lengthened-ticks

> On mobile, lock the lengthened dial ticks ("the bulge") to the sector that is active when the dial appears, so the bulge rotates **with** the dial instead of staying pinned to screen-bottom. Other ticks never grow.

**Priority:** P2
**Status:** Ready to Build
**Created:** 2026-08-17
**Type:** JS behaviour change (single module, mobile branch only)
**Files:** `projects/ready-hit-play-prod/work-dial.js`

> **Base revision:** every line number below is against `work-dial.js` at **`origin/main` (54c8790)**, which is 1807 lines. Note that the **local `main` has diverged** — it sits at `3b8bd13` with a 1746-line `work-dial.js` and does not contain the recent RHP commits. The logic, all constants (`MOBILE_ATTR_EASE 0.6`, `angFalloff 18`, `maxLenRatio 96/253`, `gapRatio 24/253`, `baseLenRatio 22.51/253`) and all three `state.rotationDeg` assignment sites are **identical in both**, so the analysis holds either way — but line numbers shift by roughly +10 to +50. Build from `origin/main`.

---

## Problem

On mobile the dial rotates via a CSS transform on the ticks canvas, and a subset of ticks is lengthened to form a visual "bulge". Today that bulge is **pinned to screen-bottom** — it sits permanently under `.dial_sector-dot` at 6 o'clock while the ticks themselves slide through it as the dial turns. Ticks grow as they enter the bottom zone and shrink as they leave.

The client wants the opposite reading: the lengthened ticks that appear when the dial first shows should be **permanent** — those specific ticks stay long and travel with the dial as it rotates, and no other tick ever grows.

### Root cause — one line

`work-dial.js:1289`:

```js
const attractionTarget = mod(180 - state.rotationDeg, 360);
```

The canvas is rotated as a whole by CSS (`work-dial.js:1283`):

```js
canvas.style.transform = `rotate(${state.rotationDeg}deg)`;
```

…and the target angle is recomputed **every frame to cancel that rotation out**. Subtracting `state.rotationDeg` is precisely what converts a rotating canvas back into a screen-fixed bulge. Remove the compensation and use a constant canvas-space angle, and the bulge is baked into canvas pixels — it then turns with the CSS transform for free.

### Current influence curve (unchanged by this spec)

`work-dial.js:1308–1314`:

```js
const degTop0 = (i / T.bars * 360 + 90) % 360;
const dAng = Math.min(Math.abs(degTop0 - attractionTarget), 360 - Math.abs(degTop0 - attractionTarget));
mobileInf = Math.max(0, 1 - dAng / T.angFalloff) * MOBILE_ATTR_EASE;
```

- `T.angFalloff = 18°` → linear taper over 18° each side ≈ 4–5 ticks per side (ticks are 3.75° apart), ~9–10 ticks in the bulge.
- `MOBILE_ATTR_EASE = 0.6` → the peak tick reaches 60% of the way from `baseLen` to `maxLen`.
- Tick 24 sits exactly on 180°, so the peak is realised precisely (no half-tick straddle).

---

## The active-sector requirement

The bulge must lock to **whichever project is active when the dial appears**, not always sector 0. Returning to home from a case study restores a non-zero active index, and the bulge belongs on that project's ticks.

### Mobile sector → canvas-angle mapping

On mobile, rotation drives selection (`work-dial.js:1178`, `:1201`, `:1214`):

```js
applyActive(mod(Math.round(state.rotationDeg / sectorSize), N));
```

So `activeIndex = mod(round(rotationDeg / sectorSize), N)`, and the sector at screen-bottom (under the dot) is at canvas top-0 angle `mod(180 - rotationDeg, 360)`. Substituting `rotationDeg = k · sectorSize` gives the static per-sector angle:

```
bulgeCanvasAngle(k) = mod(180 − k · sectorSize, 360)
```

Check: `k=0 → 180°` (canvas bottom, matching today's bulge at rotation 0). `k=1 → 180 − sectorSize`, which is exactly screen-bottom once the dial has rotated one sector. Consistent.

> **Trap to document in code.** This is **not** the desktop mapping. `tickToSector()` (`work-dial.js:637`) and the pointer path (`:1090`) put **sector 0 at canvas 0° (screen top)**; mobile puts **sector 0 at canvas 180° (screen bottom)**, because the dot lives at 6 o'clock. The two mappings coexist safely today only because mobile never calls `tickToSector()` / `sectorGradientMix()` — mobile draws every tick flat teal (`:1316`). Do not unify them in this task.

### Blocking sub-fix: rotation is desynced from the active index

`state.rotationDeg` is assigned in **only three places** — `work-dial.js:1168`, `:1182`, `:1197` — all inside the drag/snap handlers. Neither restore path touches it:

| Path | Line | Sets `activeIndex` | Sets `rotationDeg` |
|---|---|---|---|
| `init()` case-study handoff | `:1523` `applyActive(h.index)` | yes | **no** |
| `_resumeFn(handoff)` | `:1646` `applyActive(handoff.index)` | yes | **no** |

So returning from case study 5 leaves `activeIndex = 5` while `rotationDeg = 0`. **This is invisible today** — mobile ticks are all identical flat teal at base length, and the mobile labels are separate DOM that does not rotate, so rotation 0 and rotation 5·sectorSize render identically.

The moment a permanent bulge is baked into canvas space, rotation becomes visible, and "the ticks in sector 5" is only a well-defined phrase if rotation actually encodes that sector. **The sync is therefore mandatory scope, not a nice-to-have** — without it the feature cannot be implemented correctly.

Fix: on handoff restore, set `state.rotationDeg = mod(idx · sectorSize, 360)` and clear the lock so it re-captures on the next frame.

---

## Side space — is there room?

**Yes, at every viewport, in both orientations.** Measured live against `https://rhpcircle.webflow.io/` (headless Chrome for Testing, mobile emulation + touch, `dpr=3`, post-morph with `.rhp-home-ready` confirmed) on 2026-08-17.

| Viewport | dial Ø | dial radius | base tick tip | **bulge tip** | half of binding dim. | **clearance** |
|---|---|---|---|---|---|---|
| 393 × 852 | 255.4 | 127.7 | 151.2 | **173.5** | 196.5 | **23.0 px** |
| 320 × 568 | 208.0 | 104.0 | 123.1 | **141.2** | 160.0 | **18.8 px** |
| 991 × 768 | 499.2 | 249.6 | — | **339.0** | 384.0 (vertical) | **45.0 px** |
| 852 × 393 (landscape) | 255.4 | 127.7 | 151.2 | **173.5** | 196.5 (vertical) | **23.0 px** |

### Why it always fits

`--dial-large-width: min(65vw, 65svh)` (`ready-hit-play.css:599`) scales with the viewport, so the whole geometry is a fixed ratio of the **smaller viewport dimension** `D = min(vw, svh)`:

```
videoR    = 0.325 · D
innerR    = videoR · (1 + 24/253)            = 0.3558 · D
bulge tip = innerR + baseLen + (maxLen − baseLen) · 0.6
          = videoR · 1.3581                  = 0.4414 · D
clearance = 0.5 · D − 0.4414 · D             = 0.0586 · D
```

**Clearance is always 5.86% of the smaller viewport dimension.** Confirmed against all four measured rows (0.0586 × 393 = 23.0 ✓, × 320 = 18.8 ✓, × 768 = 45.0 ✓). It is never negative, so there is no overflow and no clipping at any rotation angle.

Two clipping surfaces were both checked and are both clear:

1. **Canvas bitmap.** The canvas is full-component (393×852 at iPhone 15, measured). Drawn content occupies radius ≤ 173.5 from canvas centre, well inside the 196.5 half-width, so the bitmap never clips its own content — at any rotation, because the bitmap rotates with the content.
2. **`.dial_component`** is `overflow: hidden` at exactly 100% viewport width (measured `componentOverflow: "hidden"`, `componentSize: [393, 852]`). Content stays within radius 173.5 of screen centre, so nothing is cut.

The bulge **already reaches this radius today** — it just points straight down, where the generous vertical space hides the fact. Rotating it to 3 and 9 o'clock moves it into the tight direction and it still clears.

### Why the length multiplier must stay at 0.6

| `MOBILE_ATTR_EASE` | bulge tip @393 | clearance @393 | clearance @320 | glow (12px blur) |
|---|---|---|---|---|
| **0.6 (chosen)** | 173.5 | **23.0 px** | **18.8 px** | clear |
| 0.8 | 180.9 | 15.6 px | 12.7 px | ~4px from edge |
| 1.0 | 188.3 | 8.2 px | 6.7 px | **visibly clips** |

The glow is composited with `ctx.filter = 'blur(12px)'` (`work-dial.js:1340`), which spreads ~12px past each tick tip. At 0.6 the glow stops ~11px short of the screen edge. At 1.0 it is cut off against the edge at 3 and 9 o'clock. **Do not raise this value.**

---

## Goal

1. On mobile, the lengthened ticks are locked to the active sector at the moment the dial appears, in canvas space, and rotate with the dial.
2. No other tick ever grows or shrinks — the lengthened set is fixed for the lifetime of the dial instance.
3. **Revised 2026-08-17 (client):** the bulge KEEPS the position it travelled to across a Barba navigation — `work → home` must not move it. It is a permanent mark on a fixed set of ticks, not a selection indicator that re-homes to the dot. Rotation and the locked sector therefore persist for the life of the page session. *(Superseded: "arriving from a case study locks the bulge to that project's sector, appearing under `.dial_sector-dot` on arrival.")*
4. The bulge grows in over ~0.5s when it first appears, rather than popping.
5. No visual regression: the bulge is the same length and the same tick count as today.

### Non-goals

- Do not touch the desktop branch (`work-dial.js:1349` onward). Desktop attraction follows the pointer and must keep doing so.
- Do not change `MOBILE_ATTR_EASE` (0.6), `T.angFalloff` (18°), `T.maxLenRatio`, or any tick colour.
- Do not touch `transition-dial.js` or `about-dial-ticks.js` — both draw base-length ticks only and have no attraction logic (verified: no `maxLen` in either).
- Do not unify the mobile and desktop sector→angle mappings.
- Do not add a bulge per sector (considered and rejected — see Alternatives).
- ~~Do not persist rotation across Barba transitions.~~ **Reversed 2026-08-17 (client):** rotation *and* `bulgeSector` now persist across Barba navigations within a page session, because a bulge that re-homed to six o'clock on every return read as a jump. A real page load still starts fresh.

---

## Approach

### Chosen: lazy canvas-space lock, integrated grow-in

Replace the per-frame rotation-cancelling target with a **constant canvas angle derived from a lazily-captured sector index**. "Lazily" matters: attraction is enabled at different points on different entry paths (`attractionEnabled = !introMode` at `:176`, forced true in `setIntroComplete()` at `:1705`, and already true at init on a handoff arrival), and the handoff index is applied *after* init begins. Capturing the lock on the first draw frame where attraction is live sidesteps all of that ordering fragility — no new call-site coupling.

Grow-in is integrated in the draw loop rather than tweened with GSAP. This is deliberate, for two reasons:

- **`work-dial.js:516` calls `gsap.killTweensOf(state)`** on every transition into ACTIVE — which on mobile is the first tap after morph, i.e. exactly when the bulge is growing in. A GSAP tween on `state.bulgeEase` would be killed mid-flight and freeze the bulge at partial length.
- The desktop branch already integrates its own ease in the draw loop the same way (`state.attractionEase += 0.04`, `:1361`), and the intro uses the same `1 - Math.pow(1 - raw, n)` curve idiom (`:1303`). rAF integration is the house pattern here.

This also avoids adding another `overwrite: true` GSAP tween on `state`, which would kill the in-flight `rotationDeg` snap tween (`:1172`).

### Alternatives considered and rejected

Approach exploration was deliberately collapsed to a single path: the canvas is *already* rotated by CSS, so "lock the angle in canvas space" is not one option among several — it is the direct expression of the requirement in the existing architecture. The two genuine alternatives were evaluated and rejected on the code as read:

| Alternative | Why rejected |
|---|---|
| **Per-tick boolean flag** — mark tick indices as "long" at lock time and draw them at fixed length | Loses the 18° taper, so the bulge becomes a hard-edged block of long ticks instead of the smooth swell the client is already looking at. Changes the visual, which is a non-goal. |
| **Drop the CSS transform; rotate ticks in JS** by adding `rotationDeg` to each tick's draw angle | Strictly worse: `resize()` deliberately uses `offsetWidth`/`offsetHeight` because `getBoundingClientRect()` returns the rotated AABB (`:968`), and the CSS transform is what keeps the canvas bitmap axis-aligned. Moving rotation into JS re-opens the tick-centering drift class of bug (see `tests/acceptance/fix-dial-tick-centering-drift.spec.js`) for zero benefit. |
| **A bulge on every sector centre** (N bulges, gauge-style) | Materially different design — marks every sector rather than a single travelling origin point. Ruled out by the client's framing ("these lengthened parts are permanent"). |

---

## Implementation

All changes in `projects/ready-hit-play-prod/work-dial.js`.

### 1. New state fields

In the `state` object (near `rotationDeg`, `work-dial.js:~449`):

```js
        // mobile bulge: sector whose ticks are permanently lengthened.
        // null = not yet locked; captured on the first frame attraction is live.
        bulgeSector: null,
        bulgeEase: 0,
```

### 2. Sector → canvas angle helper + lock

Add near the other mobile helpers (after `sectorOffset` is in scope):

```js
      // Mobile sector→canvas-angle map. On mobile the dot sits at screen 6 o'clock
      // and rotation drives selection (activeIndex = round(rotationDeg / sectorSize)),
      // so sector k's centre lives at canvas top-0 angle 180 − k·sectorSize.
      // NOTE: NOT the desktop mapping — tickToSector() puts sector 0 at canvas 0°.
      const bulgeCanvasAngle = (k) => mod(180 - k * sectorSize, 360);
```

### 3. Mobile draw branch

Replace `work-dial.js:1285–1289`:

```js
          // Mobile attraction: ticks always point toward the dot (screen-space bottom).
          // Canvas rotates via CSS, so compensate: target = 180° - rotation in canvas coords.
          const hasAttrMobile = attractionEnabled && !prefersReduced();
          const MOBILE_ATTR_EASE = 0.6;
          const attractionTarget = mod(180 - state.rotationDeg, 360);
```

with:

```js
          // Mobile attraction: the lengthened ticks are LOCKED to the sector that was
          // active when the dial appeared, in canvas space. The canvas rotates via CSS,
          // so a fixed canvas angle turns with the dial. (Subtracting state.rotationDeg
          // here is what used to cancel the rotation out and pin the bulge to
          // screen-bottom — that is exactly the behaviour being removed.)
          const hasAttrMobile = attractionEnabled && !prefersReduced();
          const MOBILE_ATTR_EASE = 0.6;
          if (hasAttrMobile && state.bulgeSector === null) {
            state.bulgeSector = mod(state.activeIndex, N);
            state.bulgeEase = 0;
          }
          // Grow-in integrated in the draw loop, not GSAP: killTweensOf(state) at the
          // ACTIVE transition (see setDialState) would otherwise freeze it part-grown.
          if (state.bulgeSector !== null && state.bulgeEase < 1) {
            state.bulgeEase = Math.min(1, state.bulgeEase + (prefersReduced() ? 1 : 0.035));
          }
          const bulgeGrow = 1 - Math.pow(1 - state.bulgeEase, 3); // ~0.58s power-out
          const attractionTarget = state.bulgeSector === null
            ? mod(180 - state.rotationDeg, 360)
            : bulgeCanvasAngle(state.bulgeSector);
```

Then in the per-tick influence line (`work-dial.js:1312`), scale by the grow-in:

```js
              mobileInf = Math.max(0, 1 - dAng / T.angFalloff) * MOBILE_ATTR_EASE * bulgeGrow;
```

`0.035/frame` at 60fps reaches 1.0 in ~29 frames ≈ 0.48s; with the cubic-out curve the perceived settle is ~0.58s.

### 4. Rotation sync on handoff restore

Add a helper alongside `applyActive`:

```js
      /** Mobile: rotation encodes which sector sits at the dot. A case-study handoff
       *  restores activeIndex without touching rotation, which would leave the locked
       *  bulge pointing at the wrong ticks. Sync them and re-lock. */
      function syncRotationToIndex(idx) {
        if (!isMobile()) return;
        state.rotationDeg = mod(idx * sectorSize, 360);
        if (window.gsap) window.gsap.killTweensOf(state, 'rotationDeg');
        state.bulgeSector = null;  // re-lock to the restored sector next frame
        state.bulgeEase = 0;
      }
```

Call it in both restore paths, immediately after the existing `applyActive`:

- `work-dial.js:1523` — `applyActive(h.index);` → add `syncRotationToIndex(h.index);`
- `work-dial.js:1646` — `applyActive(handoff.index);` → add `syncRotationToIndex(handoff.index);`

### 5. Reset on destroy

`destroy()` already calls `gsap.killTweensOf(_state)` (`:1770`) and `init()` builds a fresh `state` object each time, so `bulgeSector` / `bulgeEase` reset naturally. No change needed — but confirm during build that `init()` genuinely re-creates `state` rather than reusing a module-level object.

---

## Decisions and assumptions

| Decision | Value | Source |
|---|---|---|
| Locked set | One bulge, on the active sector at first appearance | Client, confirmed |
| Grow-in | ~0.5s eased, on first appearance and on handoff re-lock | Client, confirmed |
| Prominence | `MOBILE_ATTR_EASE` stays 0.6 | Client, confirmed — and required by the glow-clip measurement |
| Re-entry | ~~Re-lock to screen-bottom / restored sector on each init~~ → **Keep the travelled position**; rotation + `bulgeSector` survive init/destroy via module scope | Client, confirmed 2026-08-17 (reversed after review) |
| Re-lock on drag | **Never** — the bulge is a fixed travelling mark, not a live selection indicator | Client's "permanent" framing |

**Assumption flagged for review:** `hasAttrMobile` includes `!prefersReduced()` (`:1287`), so under `prefers-reduced-motion: reduce` there is **no bulge at all on mobile** today, and this spec preserves that. Arguably a *locked* bulge is a static visual mark rather than autonomous motion and could reasonably be shown under reduced motion, with only the grow-in suppressed (the `prefersReduced()` branch in the grow-in integrator above already handles that case by snapping to 1). Left as-is to avoid changing reduced-motion behaviour without a client decision. Raise with the client if they want the marker visible for reduced-motion users.

**Related hazard, deliberately not fixed:** `work-dial.js:516` `gsap.killTweensOf(state)` is broader than its own comment ("Kill residual ENGAGED attractionEase tween") and nukes every tween on `state`, including the `rotationDeg` snap. Narrowing it to `killTweensOf(state, 'attractionEase')` would be correct but is out of scope here; this spec routes around it instead. Worth a separate ticket.

---

## Barba Impact

RHP uses Barba. `RHP.workDial` is init/destroy/suspend/resume-driven from `orchestrator.js:471/510/523/538`.

1. **Init/Destroy lifecycle** — No new DOM, no new listeners, no new GSAP timelines, no ScrollTrigger. The change is two extra fields on the existing `state` object plus draw-loop arithmetic, all inside the existing `init(container)` / `destroy()` pair. Grow-in is rAF-integrated inside the already-running `draw()` loop, so it is torn down with the loop. **No new cleanup required.**
2. **State survival** — Nothing new needs to persist. `bulgeSector` is intentionally **not** persisted: the confirmed behaviour is to re-lock on each init. The existing `RHP.videoState.caseHandoff` mechanism supplies the index the bulge locks to, and this spec adds the rotation sync that makes that index visually meaningful.
3. **Transition interference** — None. No z-index, opacity or layout mutation; the ticks canvas already carries a CSS `rotate()` and this change only alters which pixels are drawn inside it. The canvas lives inside `.dial_component`, which is outside `[data-barba="container"]` on home — unchanged by this spec.
4. **Re-entry correctness** — home → about → home re-runs `init()` with a fresh `state`, so `bulgeSector` is `null` and re-locks to `activeIndex` (0 on a plain re-entry, the handoff index when returning from a case). No stale listeners, no doubled nodes. The `suspend()`/`resume(handoff)` path is covered by the `syncRotationToIndex` call in `_resumeFn`.
5. **Namespace scoping** — Runs wherever `work-dial.js` already runs: `data-dial-ns` of `home`, `work`, `about`. The mobile branch is additionally gated by `isMobile()` (`matchMedia('(hover: none), (pointer: coarse)')`). No new namespace exposure.

---

## Verify Loop

### Pass/fail criteria

1. **Bulge exists at first appearance.** After morph completes on a 393×852 mobile viewport, sampling tick lengths from the canvas shows a contiguous run of ~9–10 longer ticks centred at screen 6 o'clock, peak tip radius `173.5 ± 3 px` from dial centre.
2. **Bulge travels with rotation.** After a vertical drag that rotates the dial by `k · sectorSize` (k ≥ 1), the long-tick run is no longer at screen 6 o'clock. Its angular offset from 6 o'clock equals the applied rotation within ±½ sector.
3. **No other tick grows.** At any rotation, the count of ticks longer than `baseLen · 1.25` stays constant (±1 for anti-aliasing at the taper ends) and equals the count measured at rotation 0. Ticks arriving at screen-bottom do **not** lengthen.
4. **Handoff locks to the active project.** Entering a case study from the dial and returning to home leaves the bulge centred at screen 6 o'clock, and `RHP.workDial.getActiveIndex()` equals the case index that was opened. `getComputedStyle(canvas).transform` is **not** identity when that index is non-zero (this is the regression guard for the rotation desync).
5. **Grow-in.** Sampling ~150ms after the bulge first appears gives a peak tip radius strictly between `outerBase` (151.2) and the final `173.5`; by ~800ms it has settled at `173.5 ± 3`.
6. **No overflow.** The furthest-drawn tick pixel stays inside the canvas at every rotation: `max tip radius ≤ canvas.offsetWidth / 2 − 15` at 393px wide. No non-transparent pixel in the outermost 2px column/row of the canvas.
7. **Console clean.** No `pageerror` and no `console.error` on mobile home load through morph, drag, and Barba round-trip.
8. **Desktop untouched.** On a 1440×900 viewport, moving the pointer near the ring still lengthens the ticks nearest the cursor and they still track the pointer; `canvas.style.transform` remains `rotate(0deg)`.

### Reproduction steps

- **URL:** `https://rhpcircle.webflow.io/` (`STAGING_URL`), path `/`
- **Viewport:** 393×852, `isMobile: true`, `hasTouch: true`
- Wait for `window.RHP.scriptsOk === true` (up to 20s)
- Scroll to `document.documentElement.scrollHeight` repeatedly until `[data-barba="wrapper"]` has `.rhp-home-ready` (up to 30s), then wait 2000ms for the tick intro + bulge grow-in
- Tap the dial centre once to leave IDLE (mobile requires a tap → `forceActive`)
- **Rotate:** `touchstart` at dial centre → several `touchmove` steps vertically → `touchend`; wait 1000ms for the snap tween
- **Handoff round-trip:** tap dial centre to open the active case study, wait 2500ms for the Barba transition, navigate back to home via the nav logo, wait 2500ms

Tick lengths are read by sampling the canvas: for each of the 96 tick angles, walk outward from `innerR` along that ray in the canvas bitmap and record the last radius with a non-transparent teal pixel. Sample the **unrotated** canvas bitmap (via `ctx.getImageData`) so the CSS transform does not have to be inverted, and convert to screen angles by adding `rotationDeg`.

### Tier mapping

**Tier 1 — Auto, Playwright local** (`tests/acceptance/rhp-mobile-dial-permanent-lengthened-ticks.spec.js`):
- `bulge is present and centred at screen bottom on first appearance` → criterion 1
- `bulge rotates with the dial and does not stay at screen bottom` → criterion 2
- `long-tick count is constant across rotation` → criterion 3
- `bulge grows in rather than popping` → criterion 5
- `bulge never overflows the canvas at any rotation` → criterion 6
- `no console errors on mobile home through morph and drag` → criterion 7
- `desktop attraction still follows the pointer` → criterion 8
- `reduced motion: no bulge on mobile` → reduced-motion guard for the flagged assumption

**Tier 2 — Auto, CDN regression:** registered in `tests/registry.json` as `rhp-mobile-dial-permanent-lengthened-ticks`, `critical: false`. Runs on `/deploy` after the jsDelivr hash update.

**Tier 3 — Manual:**
- **Real-device feel of the grow-in** (0.5s cubic-out) — subjective timing quality; Playwright can assert the numbers but not whether it feels right.
- **Handoff round-trip on a real iOS device** — the case-study tap → return flow depends on iOS video autoplay and the Barba transition; emulated Chromium touch is not a faithful proxy. This is the primary check for criterion 4, which is why it is also listed here rather than trusted to Tier 1 alone.
- **Safari and Firefox** — Playwright project list is Chromium-only (`tests/playwright.config.js`).
- **Bulge legibility against the video at 3 and 9 o'clock** — the bulge now reaches the tight side of the screen over a blurred video backdrop; whether the 23px margin *looks* comfortable is an art-direction call, not a measurement.
- **Landscape phone** — clearance moves to the vertical axis (measured 23.0px at 852×393); confirm on a real device that the browser chrome does not eat it.

### Regression scope

Must not break:
- **Barba transitions** — home → about → home, home → case → home, case → case. Dial re-inits cleanly, bulge re-locks, no doubled canvas.
- **Mobile drag selection** — `activeIndex` still advances one per sector of rotation; snap-to-sector still lands on a sector boundary; step text still scrambles on sector change.
- **Desktop pointer attraction and sector highlight** — the orange gradient on the active sector (`sectorGradientMix`) is desktop-only and must be untouched.
- **`.dial_sector-dot`** remains the selection indicator at screen 6 o'clock and still fades in after the tick intro (`:1708`).
- **Tick centering** — `resize()` must keep using `offsetWidth`/`offsetHeight`; re-run `tests/acceptance/fix-dial-tick-centering-drift.spec.js`.
- **Tick intro** — the 96-bar staggered intro (`TICK_INTRO`) still runs from 12 o'clock; the bulge must appear *after* it, not during.
- **`transition-dial.js`** — the intro overlay dial still draws base-length ticks only.

---

## Test infrastructure note

`node_modules` is **not installed** in `projects/ready-hit-play-prod`, and **`.env.test` is absent** on this machine. `tests/playwright.config.js` falls back to `baseURL: 'https://rhpcircle.webflow.io'`, but the existing acceptance tests read `process.env.STAGING_URL` directly and build `${STAGING_URL}${path}`, which would resolve to the string `"undefined/"` without that file. Before `/build` runs Tier 1:

```bash
cd projects/ready-hit-play-prod
npm install
npx playwright install chromium
printf 'STAGING_URL=https://rhpcircle.webflow.io\n' > .env.test
```

The generated test defends against this by falling back to the same default the config uses.

---

## Acceptance Tests

File: `projects/ready-hit-play-prod/tests/acceptance/rhp-mobile-dial-permanent-lengthened-ticks.spec.js`

| Test name | Criterion |
|---|---|
| `bulge is present and centred at screen bottom on first appearance` | 1 |
| `bulge rotates with the dial and does not stay at screen bottom` | 2 |
| `long-tick count stays constant across rotation` | 3 |
| `active index and canvas rotation agree after case-study handoff` | 4 |
| `bulge grows in rather than popping` | 5 |
| `bulge never overflows the canvas at any rotation` | 6 |
| `no console errors on mobile home through morph and drag` | 7 |
| `desktop tick attraction still follows the pointer` | 8 |
| `reduced motion leaves all mobile ticks at base length` | reduced-motion guard |

---

## Parallelisation Map

Reference: `parallelisation` skill.

**Recommendation: run sequentially, single agent, no worktree fan-out, no agent team.**

The entire code change is ~35 lines inside one function of one file (`work-dial.js`), and the four edit sites are interdependent — the draw-branch lock and the `syncRotationToIndex` calls must agree on the sector→angle convention or the bulge points at the wrong ticks. Splitting that across agents costs more in coordination and merge risk than it saves. The parallelisation gate is not met: no independent streams of meaningful size.

| Stream | Tasks | Agent | Depends on | Est. time | Est. tokens |
|---|---|---|---|---|---|
| S1 | T1 → T2 → T3 (all `work-dial.js` edits) | `code-writer` | — | 25 min | ~35k |
| S2 | T4 acceptance tests | `code-writer` | none (spec is enough) | 20 min | ~30k |
| S3 | T5 test infra bootstrap (`npm install`, `.env.test`) | inline Bash | — | 5 min | ~2k |
| — | T6 run Tier 1 | `qa` | S1, S2, S3 | 15 min | ~20k |
| — | T7 review | `code-reviewer` | S1 | 10 min | ~15k |

**The one genuine parallel opportunity:** S1, S2 and S3 are mutually independent — the test file is written from this spec and needs no implementation, and the infra bootstrap touches only `node_modules` / `.env.test`. Running those three concurrently saves ~20 min. Everything after that is gated on all three.

**Sequential dependencies:** T1 (state fields + helper) gates T2 (draw branch) gates T3 (handoff sync) — same function, same file, ordered edits. T6 gates on S1+S2+S3. T7 gates on S1.

---

## Architectural decisions needing an ADR

**None.** No new dependency, no new module, no cross-project pattern, no reversal cost — the change is a behaviour flip inside one existing draw branch, revertible by restoring one expression.

The mobile-vs-desktop sector→angle divergence documented above is a pre-existing property of the module, not a decision introduced here. If a future task needs to unify the two mappings (e.g. to bring sector highlighting to mobile), *that* warrants an ADR.


---

## Revision — 2026-08-17: bulge must keep its travelled position

Reported during build verification: on `work → home` the ticks showed the correct
rotation and then jumped back to six o'clock.

**Root cause.** Two separate resets, both of which only became *visible* once the
bulge was baked into canvas space:

1. `syncRotationToIndex()` forced `rotationDeg = idx · sectorSize` and cleared the
   lock on every handoff restore, re-homing the bulge to the dot.
2. `init()` built a fresh `state`, so any route that destroyed rather than
   suspended the dial (anything via `/about`) came back at `rotationDeg = 0`.

**Fix.**

- `_persistedDial` at module scope (survives Barba, not a page load) carries
  `{ rotationDeg, bulgeSector }` from `destroy()` into the next `init()`.
  `bulgeEase` restores to 1 so the grow-in plays once, on first appearance only.
- `syncRotationToIndexIfNeeded()` replaces the unconditional sync at both restore
  sites. It only forces a sync when rotation and the arriving index genuinely
  disagree — e.g. a fresh session landing straight on a case study. Rotating to a
  project and opening it leaves them already in agreement, so the mark is left
  alone.
- `syncRotationToIndex()` writes `canvas.style.transform` synchronously.
  `runAfterEnter`'s `clearProps` strips the canvas's inline styles, so waiting for
  the next `draw()` left one frame rendered at no rotation with the previous
  frame's ticks still in the bitmap.

**Verified** on staging with worktree code, mobile 393x852:

| step | rotation | bulge (90 = six o'clock) | index |
|---|---|---|---|
| arrived home (handoff idx 4) | 240 | 93.1 | 4 |
| after drag | 300 | 153.1 | 5 |
| opened `/work/microsoft` | — | — | 5 |
| back at home | 300 | **153.1** | 5 |

### Test-harness defects found and fixed

- `dragDial()` grabbed the dial 40px from centre. `onPointerMoveMobile` bails on
  `state.startedInInner`, so **no drag in the suite ever rotated the dial** and
  every rotation assertion was vacuous, passing via `test.skip(applied < 10)`.
  The grab point is now on the tick ring, outside `innerR`.
- `measureTicks()` derived its baseline from `Math.min` of the 96 tick lengths.
  The sub-pixel stroke antialiases across two rows on axis-aligned rays, so ticks
  0/12/24/36... read 0 and `maxLen / minLen` was `null`. Now uses the median
  non-zero length.
- The grow-in test sampled once, ~550ms after morph, by which point the ~480ms
  ramp had finished. Now takes a burst and uses the lowest peak.

### Pre-existing issue, NOT fixed here

`InvalidStateError: drawImage ... canvas element with a width or height of 0` is
thrown during the home → work transition. Reproduced identically against the
deployed CDN build, so it predates this work. Worth its own ticket: guard the
glow composite when the ticks canvas measures 0.


### Second pre-existing issue found: reduced motion is not a flat ring

`hasAttrMobile = attractionEnabled && !prefersReduced()`, so on a reading of the
code no tick should lengthen under `prefers-reduced-motion: reduce`. In practice
the acceptance test measures ~18px of variation, and **the identical failure
reproduces against the deployed CDN build**, which does not contain the
permanent-bulge change. So the spec's flagged assumption ("there is no bulge at
all on mobile under reduced motion") does not hold on the live site today.

The test is left asserting the *intended* behaviour rather than being relaxed to
match the bug. Needs its own ticket. Note this is an accessibility-facing
behaviour, so weakening the assertion would hide it.

Caveat on the evidence: a standalone probe using the same emulation (viewport,
`isMobile`, `hasTouch`, `reducedMotion: 'reduce'`, matching user-agent) measured a
*flat* ring (median 10.5, max 12.5, span 2.0) with `prefersReduced === true` and
`RHP._dialIntroProgress === null`. The probe and the Playwright test therefore
disagree, and that disagreement is unexplained. Whoever picks up the ticket
should start there rather than trusting either number outright.
