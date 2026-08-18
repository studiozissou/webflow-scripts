# Mobile dial: circular 360° drag + spinner arrows indicator

**Slug:** `rhp-mobile-dial-circular-drag-and-spinner-arrows`
**Project:** `ready-hit-play-prod`
**Type:** feature (2 changes, one shared file)
**Priority:** P1
**Created:** 2026-08-18
**Status:** Ready to Build

---

## Context

Client (RHP) raised two issues with the mobile homepage dial:

1. **The gesture flips direction mid-spin.** Trying to spin the dial by circling a
   finger around it, the rotation reverses at certain points in the arc. The dial
   cannot be spun a continuous 360°.
2. **The white dot doesn't communicate that the dial is spinnable.** It reads as a
   position marker, not an affordance. Replace it with a supplied
   double-arrow SVG so the spin action is obvious.

---

## Root cause — the direction flip

`work-dial.js:1243` `onPointerMoveMobile()`:

```js
const dx = e.clientX - state.dragStartX;
const dy = e.clientY - state.dragStartY;
// y-axis: swipe down → clockwise; x-axis: swipe right → counterclockwise (inverted)
const delta = Math.abs(dy) >= Math.abs(dx) ? dy : -dx;
state.rotationDeg = state.dragStartRot + (delta * ROTATE_PER_PX);
```

This is a **dominant-axis** mapping, not an angular one. It measures displacement
from the touch-start point and picks whichever of the two axes has moved further.

As a finger travels a circular arc, the dominant axis swaps every 45°. At each
swap the term feeding `delta` changes identity (`dy` → `-dx` → `dy` …) and, worse,
`delta` is measured from a **fixed** origin (`dragStartX/Y`), so a finger arcing
back toward its start point produces a *decreasing* `delta` — the dial unwinds even
though the finger is still moving forward around the circle. The dial can never
exceed roughly a quarter turn in one gesture, and reverses at the 45° boundaries.
This is exactly the behaviour the client described.

---

## Blocking sub-fix — the dial centre is computed wrong

`work-dial.js:1179–1183` `onPointerDown()`:

```js
const rect = canvas.getBoundingClientRect();
const x = e.clientX - rect.left;
const y = e.clientY - rect.top;
const dist = Math.hypot(x - geom.cx, y - geom.cy);
```

`geom.cx`/`geom.cy` are `canvas.offsetWidth/2` and `offsetHeight/2` — the **CSS
layout box** centre (`work-dial.js:1034`). But the canvas carries
`transform: rotate(${state.rotationDeg}deg)`, written every frame in `draw()`
(`work-dial.js:1337`) and on restore (`work-dial.js:487`). `getBoundingClientRect()`
returns the axis-aligned bounding box of the **transformed** element, which for a
rotated square is up to √2 larger than the CSS box.

So `rect.left + geom.cx` is not the dial centre. At 45° of rotation the error is
`(w·√2 − w)/2 ≈ 0.207·w` — on a ~350px dial, ~72px off. It's a tolerable
inaccuracy for the existing coarse tap-radius test, but it is **fatal for
`atan2`**: an offset centre makes the measured angle wrong by a varying amount, so
the dial would drift, stutter, and reverse near the false centre.

**Fix (required before the angular tracker will work):** derive the centre from
the rect itself. Rotation is about `transform-origin: 50% 50%`, so the AABB centre
and the CSS box centre coincide regardless of rotation angle:

```js
const rect = canvas.getBoundingClientRect();
const cx = rect.left + rect.width / 2;
const cy = rect.top + rect.height / 2;
```

This is correct for square and non-square canvases alike, and at any rotation.

> **Memory cross-reference:** this is the same class of bug as the 2026-04-29 tick
> centering drift (fixed by swapping `getBoundingClientRect()` for
> `offsetWidth`/`offsetHeight` in `resize()`). Same lesson, opposite direction:
> use `offsetWidth`/`offsetHeight` for *sizing* a transformed element, and
> `rect.left + rect.width/2` for *locating its centre* in viewport space.

---

## Approach chosen

**A — Incremental angular delta.** Each `pointermove`, compute the finger's angle
about the dial centre, take the shortest-arc difference from the previous move's
angle, and accumulate it into `state.rotationDeg` at 1:1.

Considered and rejected:

| Approach | Confidence | Why not |
|---|---|---|
| B: Absolute angle offset (`dragStartRot + (angle − dragStartAngle)`) | 45 | `atan2` wraps at ±180°, so the dial jumps a half-turn backwards mid-spin. Unwrapping it correctly *is* approach A. |
| C: GSAP Draggable `type:"rotation"` | 30 | New CDN dependency; Draggable takes ownership of `canvas.style.transform`, which `draw()` rewrites every frame and `_persistedDial` restores on Barba re-entry. Direct conflict. |

Accumulating a per-move delta means unlimited continuous rotation in either
direction with no wraparound artifacts, and it drops the `dragStartX/Y/Rot` state
entirely for the mobile path.

---

## Decisions (confirmed with user)

| Question | Decision |
|---|---|
| Rotation mapping | **1:1 angular** — finger arcs 60° about the centre, dial rotates 60°. True physical-knob feel. |
| Straight-swipe fallback | **None.** Pure angular for touch. A straight flick past the dial still sweeps an angle, so it degrades gracefully. `onWheel()` (`work-dial.js:1258`) keeps its existing dominant-axis logic — untouched. |
| Arrows vs dot | **Arrows replace the dot entirely.** The `.dial_sector-dot` element is repurposed to render the SVG; the 8px white circle is gone. |
| Arrow behaviour | **Static.** Fades in with the existing `setIntroComplete` path (`work-dial.js:1778`). No pulse, no hide-after-use. |

### Judgment call: keep the `.dial_sector-dot` class name

The class name becomes semantically stale ("dot" that is now arrows), but it is
referenced by 4 CSS rules and 2 test files
(`rhp-mobile-home-work.spec.js:60,94`, `rhp-mobile-dial-permanent-lengthened-ticks.spec.js:335`).
The element still marks sector position at 6 o'clock — only its rendering changes.
**Keeping the name**, to hold the blast radius to the two files that actually
change. Add a CSS comment noting the rename debt.

---

## Sensitivity change — flag for client review

This is a **large** change in feel and should be demoed before sign-off.

- **Today:** `ROTATE_PER_PX = 0.22` deg/px. With N sectors, one sector =
  `360/N` degrees, needing `(360/N)/0.22` px of straight swipe. At N=6 that is
  **60° per sector ≈ 273px of swipe** — most of the screen height.
- **After:** one sector = **60° of finger arc** about the dial centre. On a ~350px
  dial (radius ~175px), a 60° arc at the tick ring is ~183px of finger travel —
  and much less if the finger drags closer to the centre.

Net: browsing sectors becomes considerably faster and lighter. That is the correct
behaviour for a physical-dial metaphor, but it is a noticeable departure. If it
tests as too twitchy, the single tuning knob is a gain multiplier on the
accumulated delta (`GAIN` constant below), defaulting to `1.0`.

`ROTATE_PER_PX` becomes dead for the touch path once the change lands — it is
**not** used by `onWheel()`, which has its own `0.08` factor. Delete the constant.

---

## Implementation

### Change 1 — circular drag

**File:** `projects/ready-hit-play-prod/work-dial.js`

**1a. Add an angle helper** near the existing `mod()` utility:

```js
// Shortest signed arc between two angles (deg), in (-180, 180].
function shortestArc(from, to) {
  return mod(to - from + 180, 360) - 180;
}
```

**1b. Add a centre helper** so both the tap-radius test and the angular tracker
read from one source of truth. Must be rotation-safe:

```js
// Viewport-space centre of the ticks canvas. Correct under CSS rotation:
// transform-origin is 50% 50%, so the rotated AABB shares the CSS box centre.
// Do NOT use rect.left + geom.cx — geom.cx is the untransformed layout centre.
function canvasCentre() {
  const r = canvas.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}
```

**1c. `onPointerDown()` (line ~1172)** — swap in the corrected centre, and seed
the angle tracker. `dist` and the ACTIVE/IDLE tap-radius logic keep working, now
against a correct centre:

```js
const { cx, cy } = canvasCentre();
const dx = e.clientX - cx;
const dy = e.clientY - cy;
const dist = Math.hypot(dx, dy);
// … existing tap-radius / ACTIVE / IDLE block unchanged …

state.dragActive = true;
state.lastAngleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
state.startedInInner = (dist <= geom.innerR);
```

Remove `state.dragStartX`, `state.dragStartY`, `state.dragStartRot` writes here
and their declarations at `work-dial.js:467–469`. Add `lastAngleDeg: 0` to the
`state` object (line ~461).

**1d. Replace `onPointerMoveMobile()` (line ~1243)** entirely:

```js
const GAIN = 1.0; // 1:1 angular. Raise if browsing tests as too slow.

function onPointerMoveMobile(e) {
  if (!isMobile() || !state.dragActive) return;
  if (inCaseStudyMode()) return;   // swiping a case study must not rotate the dial
  if (state.startedInInner) return; // inner circle is the tap-to-play zone

  const { cx, cy } = canvasCentre();
  const dx = e.clientX - cx;
  const dy = e.clientY - cy;

  // Guard the singularity: atan2 is meaningless at the exact centre and wildly
  // noisy within a few px of it. Hold the previous angle rather than emit garbage.
  if (Math.hypot(dx, dy) < CENTRE_DEADZONE_PX) return;

  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  state.rotationDeg += shortestArc(state.lastAngleDeg, angle) * GAIN;
  state.lastAngleDeg = angle;

  // Variant B: update active index as steps cross boundaries (unchanged)
  const stepped = Math.round(state.rotationDeg / sectorSize);
  applyActive(mod(stepped, N));
}
```

with `const CENTRE_DEADZONE_PX = 24;` alongside `GAIN`.

**Direction sanity check:** canvas y grows downward, so `atan2` increases
clockwise on screen. Adding the delta directly to `rotationDeg` — which is fed
straight into `rotate(${rotationDeg}deg)`, also clockwise-positive — means the dial
tracks the finger exactly. **No sign inversion.** Verify on device: dragging
clockwise must turn the dial clockwise.

**1e. `onPointerUp()` (line ~1210)** — no logic change. It reads only
`state.rotationDeg` and snaps to `Math.round(rotationDeg / sectorSize)`, which is
correct for arbitrarily large accumulated values, and already normalises via
`mod(state.rotationDeg, 360)` in `onComplete`. Clear `state.lastAngleDeg` alongside
the existing flag resets for tidiness.

**1f. `preventTouchScroll()` (line ~1272)** — unchanged. It already gates on
`state.dragActive`, which the new path still sets and clears identically. This is
what stops the page scrolling during a spin; it must keep working.

### Change 2 — spinner arrows replace the white dot

**Asset:** `/Users/willmorley/Downloads/spinner arrows.svg` — 53×19, two
chevron-plus-line arrows pointing outward (left and right), `stroke="white"`,
`stroke-width="2"`, with a ~19px empty gap between them.

**2a. `work-dial.js:376–383`** — keep the element and class, set inline SVG as
its content. Use `currentColor` in place of the hardcoded `white` so the stroke
follows CSS `color`:

```js
// Spin-direction indicator (sector position at 6 o'clock — CSS handles visibility
// per breakpoint). Class name kept as .dial_sector-dot for CSS/test continuity.
let sectorDot = document.createElement('div');
sectorDot.className = 'dial_sector-dot';
sectorDot.setAttribute('aria-hidden', 'true');
sectorDot.innerHTML = '<svg width="53" height="19" viewBox="0 0 53 19" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
  '<path d="M42.6016 0.730957L51.3741 8.9189L43.1862 17.6914" stroke="currentColor" stroke-width="2"/>' +
  '<line x1="50.6422" y1="9.23682" x2="35.6069" y2="9.22441" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M10.186 0.730957L1.41349 8.9189L9.60144 17.6914" stroke="currentColor" stroke-width="2"/>' +
  '<line y1="-1" x2="15.0354" y2="-1" transform="matrix(1 -0.000824853 -0.000824853 -1 2.14453 8.23682)" stroke="currentColor" stroke-width="2"/>' +
  '</svg>';
if (!introComplete) sectorDot.style.opacity = '0';
comp.appendChild(sectorDot);
```

Rest of the block (`sectorDotRef`, `cleanup.push`) unchanged. The fade-in at
`work-dial.js:1778` needs no change — it tweens the wrapper's opacity, and the SVG
is inside it.

`innerHTML` with a hardcoded literal is safe here (no interpolation, no user
input). Prefer it over a `<img>` or `background-image` so `currentColor` works and
there is no extra network request.

**2b. `ready-hit-play.css:1155`** — reshape the box:

```css
/* ====== Mobile spin indicator (sector position at 6 o'clock) ====== */
/* Was an 8px white dot; now the spinner-arrows SVG. Class name retained
   for CSS/test continuity — rename debt, tracked in the spec. */
/* Positioned below the max tick extension: dial radius * ~1.55 accounts for
   gap + 50%-longer maxLen. The -5.5px keeps the 19px-tall block centred where
   the 8px dot's centre sat, so the gap to .dial_layer-ui is preserved. */
.dial_sector-dot {
  position: absolute;
  bottom: calc(50% - var(--dial-large-height) / 2 * 1.55 - 0.5rem + 1rem - 5.5px);
  left: 50%;
  transform: translateX(-50%);
  width: 53px;
  height: 19px;
  color: #fff;
  line-height: 0;
  z-index: 5;
  pointer-events: none;
  display: none;
}
```

Removed: `width/height: 8px`, `border-radius: 50%`, `background: #fff`.
Added: explicit `width/height` matching the SVG, `color` for `currentColor`,
`line-height: 0` to kill inline-descender space below the SVG.

The three sibling rules (mobile `display: block`, and the
`work`/`about`/`contact` namespace `display: none !important`) are **unchanged** —
this is the payoff for keeping the class name.

**2c. Vertical offset check.** `.dial_layer-ui` positions itself at
`calc(50% + var(--dial-large-height)/2 * 1.55 + 0.5rem + 16px - 1rem)`
(`ready-hit-play.css:741`) — 16px below the old dot's anchor. The indicator grows
from 8px to 19px tall; the `-5.5px` correction keeps its *centre* where the dot's
centre was, so the gap shrinks by ~5.5px top and bottom rather than 11px on one
side. Whether that reads as too tight is a **visual judgment — Tier 3 manual
check.** If the client wants the old breathing room back, bump the `16px` in
`ready-hit-play.css:741` to `22px`.

### Change 3 — version bumps

- `work-dial.js:13` — `WORK_DIAL_VERSION` `2026.8.13.2` → `2026.8.18.1`
- `init.js:104` — `CONFIG.version` `2026.8.17.7` → `2026.8.18.1` (cache bust)
- `CLAUDE.md` file-responsibilities table — update the `work-dial.js` version cell

---

## Barba Impact

RHP uses Barba. Answers to the five checks:

1. **Init/Destroy lifecycle** — No new DOM nodes, listeners, or GSAP timelines.
   The `.dial_sector-dot` element already exists and is already registered in
   `cleanup` (`work-dial.js:383`); only its innerHTML changes. `onPointerDown` /
   `onPointerMoveMobile` / `onPointerUp` are already bound and unbound through the
   existing `on(...)` helper (`work-dial.js:1642–1644`). **No orchestrator change
   required.**
2. **State survival** — `state.lastAngleDeg` is per-gesture, seeded fresh on every
   `pointerdown`, and meaningless between gestures. It must **not** be persisted.
   `_persistedDial` (`work-dial.js:1844`) stores `{ rotationDeg, bulgeSector }` —
   leave that shape alone; `rotationDeg` continues to carry across transitions as
   it does today.
3. **Transition interference** — None. The indicator is `pointer-events: none`,
   `z-index: 5`, inside `.dial_component`, and the pointer handlers already
   short-circuit on `inCaseStudyMode()`. No new z-index or opacity actors.
4. **Re-entry correctness** — On home → about → home, `init()` recreates the
   indicator with the SVG and `state` is rebuilt with `lastAngleDeg: 0`. The first
   `pointerdown` after re-entry re-seeds it before any move is processed, so a
   stale value can never leak into a delta. The removed `dragStartX/Y/Rot` fields
   must be deleted from the `state` literal too, not just their write sites, or
   they linger as dead state.
5. **Namespace scoping** — Unchanged. Drag handlers gate on `isMobile()` and
   `inCaseStudyMode()`; the indicator is CSS-gated to
   `[data-dial-ns="home"]` at `max-width: 991px` and force-hidden on
   `work`/`about`/`contact`.

---

## Verify Loop

### Pass/fail criteria

**Circular drag**

- [ ] Dragging a finger a full circle around the dial (starting outside
      `geom.innerR`, staying outside `CENTRE_DEADZONE_PX`) rotates the dial a
      **continuous 360°** with no direction reversal at any point in the arc.
- [ ] Direction tracks the finger: clockwise drag → dial turns clockwise. Verified
      by reading `canvas.style.transform` before and after a synthesised clockwise arc.
- [ ] A finger arc of one sector-angle (`360/N` deg) advances exactly one sector:
      `RHP.workDial.getActiveIndex()` increments by 1.
- [ ] Multi-turn: a two-full-circle drag returns `state.rotationDeg` to within one
      sector of its start and `getActiveIndex()` to its starting value.
- [ ] On `pointerup` the dial snaps to a sector boundary within ~250 ms:
      `rotationDeg % sectorSize` is ≈0.
- [ ] Console: no errors, no `NaN` in the transform string at any point.

**Centre correction**

- [ ] With the dial rotated to ~45°, a tap at the true visual centre of the dial
      still registers as inside `geom.innerR` (`startedInInner === true`, dial does
      not rotate). Before the fix this misfires.

**Spinner arrows**

- [ ] `.dial_sector-dot` is visible on home at ≤991px and contains an `svg` child
      with 2 `path` and 2 `line` elements.
- [ ] Its bounding box is 53×19 (±1px).
- [ ] Computed `background-color` is transparent and `border-radius` is not 50%
      (proves the old dot styling is gone).
- [ ] `aria-hidden="true"` on the wrapper; SVG has `focusable="false"`.
- [ ] Hidden on `work`, `about` and `contact` namespaces, and above 991px.
- [ ] Opacity reaches 1 after the intro completes on a fresh home load.

**Regression scope — must not break**

- [ ] Tap inside the video circle still plays / navigates (does not rotate the dial).
- [ ] Tap-radius ACTIVE/IDLE state switching still fires at the right distance.
- [ ] Page does not scroll while dragging the dial (`preventTouchScroll`).
- [ ] Case-study pages still scroll normally — the dial must not swallow touch
      (`inCaseStudyMode()` guard).
- [ ] Desktop hover/sector-switch path completely unaffected (`isMobile()` guard).
- [ ] `onWheel()` behaviour unchanged.
- [ ] Barba home → about → home: indicator re-appears with the SVG, dial still
      spins, no doubled nodes.
- [ ] Existing suites still green:
      `rhp-mobile-home-work.spec.js`,
      `rhp-mobile-dial-permanent-lengthened-ticks.spec.js`,
      `rhp-work-dial-switch-deadzone.spec.js`,
      `fix-dial-tick-centering-drift.spec.js`.

### Reproduction steps

1. `https://rhpcircle.webflow.io/` at viewport 390×844, touch emulation on.
2. Wait for `window.RHP.scriptsOk === true`, then 2000 ms for the intro to settle.
3. Read `.dial_layer-fg` bounding box to locate the dial centre and radius.
4. Dispatch a synthesised pointer arc: `pointerdown` at angle 0° on a circle of
   radius `r = dialRadius * 1.15` about that centre, then ~36 `pointermove` events
   stepping 10° each, then `pointerup`.
5. Sample `canvas.style.transform` at each step; assert the extracted angle is
   monotonic (allowing for `mod 360` wrap) — **any non-monotonic step is the
   direction-flip bug**.
6. Wait 400 ms for the snap tween, then assert sector alignment.

### Tier mapping

**Tier 1 — Auto (Playwright local, runs in `/build` and `/debug`)**
`tests/acceptance/rhp-mobile-dial-circular-drag-and-spinner-arrows.spec.js`:

- `rotation is monotonic through a full 360 finger arc`
- `clockwise finger arc rotates the dial clockwise`
- `one sector-angle of arc advances exactly one sector`
- `two full turns return to the starting sector`
- `dial snaps to a sector boundary on pointerup`
- `tap inside the inner circle does not rotate the dial`
- `centre stays correct when the canvas is rotated 45 degrees`
- `spinner arrows SVG is rendered inside .dial_sector-dot`
- `indicator box is 53x19 with no dot styling`
- `indicator is hidden above 991px`
- `indicator is hidden on the about namespace`
- `page does not scroll while dragging the dial`
- `dial still spins after home to about to home`
- `no console errors on mobile home`
- `prefers-reduced-motion: rotation still works, snap is instant`
- `axe-core: no new violations on mobile home`

**Tier 2 — Auto (CDN regression, runs in `/deploy`)**
Registered in `tests/registry.json` as
`rhp-mobile-dial-circular-drag-and-spinner-arrows`, `critical: true` (touches the
primary navigation mechanism of the homepage).

**Tier 3 — Manual (checklist after `/build`)**

| Check | Why it can't be automated |
|---|---|
| Spin *feel* at 1:1 — is it twitchy, or right? | Subjective. Synthesised pointer events can't judge kinaesthetic quality. This is the headline risk of the change; demo to RHP before sign-off. |
| Real multi-touch / thumb-arc ergonomics on device | Playwright synthesises single-pointer events with perfect geometry. A real thumb arcs irregularly and pivots from the wrist. |
| iOS Safari rubber-band during a spin | `preventTouchScroll` behaviour under iOS overscroll can't be reproduced in Chromium. |
| Visual gap between arrows and `.dial_layer-ui` after the 11px height increase | Subjective spacing judgment. Fallback if too tight: bump `16px` → `22px` at `ready-hit-play.css:741`. |
| Arrow legibility over varying video content | The indicator sits over the fg video; white-on-white is possible on bright frames. Needs an eye on real CMS footage. |
| Cross-browser (Safari, Firefox) | Playwright project is Chromium-only (`tests/playwright.config.js`). |

### Regression scope

- **Barba transitions:** home ↔ about ↔ case, and the case→home handoff. The dial
  persists outside the Barba container, so a stale listener or doubled node shows
  up here first.
- **Same-page modules:** `transition-dial.js` paints into the same
  `#dial_ticks-canvas`; `video-loader.js` observes pool swaps on the dial videos.
  Neither reads `state`, but both share the DOM node.
- **Cross-page state:** `_persistedDial.rotationDeg` and `RHP.videoState.caseHandoff`
  must survive unchanged — the handoff path restores `activeIndex` and rotation.

---

## Parallelisation Map

**Recommendation: sequential, single stream, no worktrees, no agent teams.**

Both changes land in `work-dial.js`, and Change 2 also touches
`ready-hit-play.css`. Change 1's centre fix (`canvasCentre()`) is inside
`onPointerDown`, ~200 lines from Change 2's element creation — but running them as
parallel agents would mean two writers on one file for a combined diff of well
under 150 LOC. The merge overhead exceeds the wall-clock saving.

| Stream | Tasks | Agent | Est. time | Est. tokens |
|---|---|---|---|---|
| Single | T1 → T2 → T3 → T4 | `code-writer` | ~35 min | ~45k |

**Sequential dependencies:**

- **T1 gates T2.** The `canvasCentre()` fix must land before the angular tracker,
  or the tracker is unverifiable — it'll read as broken when the real fault is the
  offset centre.
- **T3 is independent** of T1/T2 in behaviour but shares the file, so it runs after.
- **T4 (version bumps)** must be last — the CDN cache bust should reflect the
  finished state.

Genuine parallel opportunity: **acceptance-test authoring (T5) can run alongside
T1–T3**, since the tests are written against this spec, not against the
implementation. If parallelising at all, that is the only split worth making.

---

## Task Breakdown

| # | Task | Agent | Files |
|---|---|---|---|
| T1 | Fix the rotated-canvas centre: add `canvasCentre()`, use it in `onPointerDown` for `dist`/`startedInInner` | `code-writer` | `work-dial.js` |
| T2 | Replace `onPointerMoveMobile` with the incremental angular tracker; add `shortestArc()`, `GAIN`, `CENTRE_DEADZONE_PX`, `state.lastAngleDeg`; delete `dragStartX/Y/Rot` and `ROTATE_PER_PX` | `code-writer` | `work-dial.js` |
| T3 | Swap the white dot for the inline spinner-arrows SVG; reshape `.dial_sector-dot` CSS | `code-writer` | `work-dial.js`, `ready-hit-play.css` |
| T4 | Version bumps: `WORK_DIAL_VERSION`, `init.js` `CONFIG.version`, CLAUDE.md table | `code-writer` | `work-dial.js`, `init.js`, `CLAUDE.md` |
| T5 | Author the acceptance suite (can run parallel to T1–T3) | `qa` | `tests/acceptance/…spec.js` |
| T6 | Review: Barba lifecycle, no leaked state, pattern compliance | `code-reviewer` | — |
| T7 | Run Tier 1 suite + the four listed regression suites | `qa` | — |

---

## ADRs needed

**None.** No new dependency, no new module, no cross-project pattern. The angular
tracker is a localised algorithm swap inside one existing function. The
rotated-element centre lesson is worth appending to project memory rather than
raising an ADR — it now has two occurrences (2026-04-29 sizing, 2026-08-18
locating).

---

## Open questions / blockers

1. **The SVG lives in `~/Downloads`.** It is inlined into `work-dial.js` by this
   spec, so no asset file is committed and nothing needs uploading to Webflow.
   Flagging only so the source file isn't assumed to be a live dependency — it
   isn't; the path in this spec is provenance, not a runtime reference.
2. **`GAIN` default.** Shipping at `1.0` (true 1:1) per the decision above. If the
   client finds it twitchy in the Tier 3 demo, this is the one number to turn.
3. **`N` is CMS-driven** (`items.length`, `work-dial.js:304`), so sector angle
   varies with the number of published case studies. The tests must read `N` from
   the DOM rather than hardcoding 6.
4. **No `.env.test` present.** `tests/playwright.config.js` falls back to
   `https://rhpcircle.webflow.io`, so the suite runs — but it runs against the live
   staging site, meaning Tier 1 cannot be run against local changes until the code
   is deployed. Expect Tier 1 to be a post-deploy gate here, not a pre-deploy one.

---

## Acceptance Tests

Machine-runnable version:
`tests/acceptance/rhp-mobile-dial-circular-drag-and-spinner-arrows.spec.js`

**Circular drag**
1. `no console errors on mobile home at 390px`
2. `rotation is monotonic through a full 360 finger arc` — the core regression test
3. `clockwise finger arc rotates the dial clockwise`
4. `one sector-angle of arc advances exactly one sector`
5. `two full turns return to the starting sector`
6. `dial snaps to a sector boundary on pointerup`
7. `tap inside the inner circle does not rotate the dial`
8. `page does not scroll while dragging the dial`

**Spinner arrows**
9. `spinner arrows SVG is rendered inside .dial_sector-dot`
10. `indicator box is 53x19 with no dot styling`
11. `indicator is hidden above 991px`
12. `indicator is hidden on the about namespace`

**Regression & a11y**
13. `dial still spins after home to about to home`
14. `prefers-reduced-motion: rotation works, snap is instant`
15. `axe-core: no new violations on mobile home`
