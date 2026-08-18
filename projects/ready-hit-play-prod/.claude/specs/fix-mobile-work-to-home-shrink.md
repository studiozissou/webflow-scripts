# Fix: mobile work → home transition collapses instead of shrinking

**Slug:** `fix-mobile-work-to-home-shrink`
**Client:** Ready Hit Play
**Type:** Bug fix + transition polish
**Created:** 2026-08-18
**Status:** Ready to Build

---

## Problem

On mobile, tapping to navigate from a work (case study) page back to home makes the
work page **vanish in a single frame** instead of shrinking. Desktop shrinks smoothly
over 0.8s.

The user's ask: *"ideally i would like the whole page to shrink on transition like it
does on desktop."*

## Root cause

`getDialVars()` (`orchestrator.js:117-129`) reads the dial dimensions straight out of
CSS custom properties as **raw strings** via `_getCSSVar`, and `runDialShrinkAnimation()`
(`orchestrator.js:233-300`) hands those strings directly to GSAP:

```js
gsap.to(dialFg, {
  width: v.homeWidth,      // ← a raw CSS string, not a number
  height: v.homeHeight,
  borderRadius: v.homeBR,
  duration: dur,
  ease: 'power2.inOut',
  ...
});
```

The values differ by breakpoint:

| Breakpoint | `--dial-large-width` (aliased to `--dial-home-width`) | Source |
|---|---|---|
| Desktop | `clamp(180px, min(50svh, 70vw), min(50svh, 70vw))` | `ready-hit-play.css:469` |
| ≤991px | `min(65vw, 65svh)` | `ready-hit-play.css:599` |

GSAP cannot parse `min()` / `clamp()` as a numeric tween target, so it falls back to
**complex-string interpolation**: it constructs a start string matching the end value's
shape, zero-filling the numbers it has no start value for.

- **Desktop** start becomes `clamp(1123px, min(0svh,0vw), min(0svh,0vw))`.
  Because CSS `clamp(MIN, VAL, MAX)` ≡ `max(MIN, min(VAL, MAX))`, the `180px` **floor
  slot** absorbs the real starting width, so the box tracks the shrinking floor argument
  for most of the tween. But the floor argument is itself heading to `180px` — below the
  `450px` target — so near the end it drags the box **past** the target before the
  growing middle term takes over and pulls it back up.
- **Mobile** start becomes `min(0vw, 0svh)` = **0**. There is no floor slot at all.

**Desktop is affected too.** The clamp floor limits the damage to an undershoot rather
than a collapse, which is why it was never reported — it reads as a springy ease rather
than a bug. Both platforms are fixed by the same change.

### Measured evidence (staging, rAF sampler through `barba.go('/')` from `/work/overland-ai`)

**Mobile — 393×852, target 255px.** `.dial_layer-fg` width per frame:

```
393, 393, 393, 393, 393, 0, 0, 0, 1, 2, 4, 6, 9, 13, 18, 25, 32, 41, 51, 63,
77, 93, 110, 130, 153, 176, 204, 234, 265, 299, 311, 304, 297, … 255
```

It does not shrink — it **collapses to zero in one frame, then grows back up**, overshoots
to 311px, and eases down to 255px. Opacity measured `1` throughout the collapse,
confirming a size bug, not a visibility/CSS-cascade bug.

**Desktop — 1440×900, target 450px.** Same sampler:

```
1123, 1123, …, 1049, 1009, 956, 893, 813, 709, 597, 499, 454, 415, 383, 369,
382, 394, 405, 414, 421, 428, 433, 438, 442, 446, 449, 450
```

A clean shrink from 1123px all the way down — then it **undershoots to 369px (18% below
the 450px target) and climbs back up**. Same collapse-then-grow signature, bounded by the
clamp floor.

Both series were captured before any code change, and both are asserted against by the
acceptance tests (which currently fail — see Acceptance Tests below).

Because `[data-barba="container"]` is nested **inside** `.dial_layer-fg` (verified live:
`.dial_component > .dial_layer-fg.is-case-study > .barba-namespace`), the entire work
page collapses with the box. That is the reported "immediately disappears".

### Ruled out

- `RHP.views.work.destroy()` / `RHP.views.case.destroy()` (`orchestrator.js:822-975`) —
  teardown of listeners, ScrollTriggers, Lenis and GSAP contexts only. Does not set
  `opacity`/`display`/`visibility` or remove nodes.
- `ready-hit-play.css:439-443` (`@media (hover:none),(pointer:coarse) →
  [data-dial-ns="home"] .dial_layer-fg { opacity: 0 }`) — measured opacity stays `1`
  through the collapse; the inline `opacity:1` from `gsap.set` (`orchestrator.js:263`)
  wins during the tween. This rule only takes effect after `runAfterEnter` clears props,
  which is correct home behaviour.
- `RHP.lenis.stop()` and `dialFg.scrollTop = 0` in `beforeLeave` — reposition content,
  do not hide it.

### Note on the expand path

`runDialExpandAnimation()` tweens to `v.caseWidth` / `v.caseHeight`, which resolve to
single-unit values at every breakpoint (`78vw`/`85dvh` desktop, `100vw`/`100dvh` at
≤991px — `ready-hit-play.css:589-590`, `1219-1220`). GSAP parses those legitimately, so
home→work is **not** affected and is out of scope for the code change. It stays in
regression scope.

---

## Solution

### 1. Resolve CSS custom properties to pixels before tweening (the fix)

Add a helper that resolves any CSS length expression — including `min()`, `clamp()`,
`calc()`, `svh`, `dvh` — to a computed pixel number, by probing a throwaway element.

This pattern **already exists in this file**: `runDialExpandAnimation()` builds a temp
element to resolve `calc(--dial-case-height - --dial-case-title-gap)` to px
(`orchestrator.js:168-176`). Extract and generalise it rather than adding a second copy.

```js
/** Resolve a CSS length expression (min()/clamp()/calc()/svh/dvh/…) to a pixel number.
 *  GSAP cannot tween to a multi-term CSS function — it falls back to complex-string
 *  interpolation and zero-fills the start, which collapses the element. Always resolve
 *  dial dimensions through here before handing them to gsap.to().
 *  @param {string} value — CSS length expression.
 *  @param {'width'|'height'} axis — which axis to probe (vw/vh resolve per-axis).
 *  @returns {number|null} pixels, or null if the value could not be resolved. */
function _resolveToPx(value, axis) {
  if (!value) return null;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;top:0;left:0';
  probe.style[axis] = value;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect()[axis];
  probe.remove();
  return px > 0 ? px : null;
}
```

Then in `runDialShrinkAnimation()`:

```js
const homeW = _resolveToPx(v.homeWidth, 'width');
const homeH = _resolveToPx(v.homeHeight, 'height');

gsap.to(dialFg, {
  width: homeW ?? v.homeWidth,    // px number; string fallback preserves today's behaviour
  height: homeH ?? v.homeHeight,
  borderRadius: v.homeBR,          // '1000rem' — single-unit, GSAP parses fine
  duration: dur,
  ease: 'power2.inOut',
  onComplete: () => { /* unchanged */ }
});
```

The `?? v.homeWidth` fallback means that if the probe ever fails (element detached,
zero-size viewport), behaviour is exactly what ships today — no new failure mode.

This alone delivers the user's ask: **the whole page shrinks on mobile like it does on
desktop**, and desktop becomes an honest px→px tween instead of riding the clamp floor.

**Desktop motion does change slightly** — the measured 18% undershoot (dip to 369px before
settling at 450px) disappears, so the landing is a clean ease-out instead of a small
springy recovery. This is an improvement, but it is a visible change to a transition that
was signed off, so include it in the Tier 3 sign-off.

The probe must be appended to `document.body`, not inside `.dial_component` — the dial
has `transform: scale()` applied during the home-scroll-morph scrub, which would skew
the measurement.

### 2. Mobile-only content fade (the polish)

At ≤991px the work page is fullscreen (`100vw × 100dvh`) shrinking to a ~325px circle —
a far larger size change than desktop's 1123px → 450px. Case text and images visibly
squash on the way down. Fade the case content out over the first ~60% of the tween so
the box is empty by the time it reaches dial size.

Fade the **outgoing Barba container**, not `.dial_layer-fg`:

```js
const isMobile = window.matchMedia('(max-width: 991px)').matches;
const outgoing = dialFg.querySelector('[data-barba="container"]');
if (isMobile && outgoing && !reduced) {
  gsap.to(outgoing, {
    opacity: 0,
    duration: dur * 0.6,
    ease: 'power2.in'
  });
}
```

Why the container and not the whole `.dial_layer-fg`: `#fg-video-wrap` lives **outside**
the Barba container (`orchestrator.js:1384`) and is the element that morphs into the home
dial video. Fading only the container removes the case text/sections while the video
wrap and dial ticks keep morphing — so the transition reads as the case study dissolving
*into* the dial rather than the whole thing dimming.

No cleanup is needed for this tween: Barba removes the outgoing container once `leave()`
resolves, so the inline `opacity: 0` is discarded with the node.

**The fade is deliberately mobile-only** — gated behind the `max-width: 991px` check, per
the decision to leave desktop's look as-is. (Desktop still gets the undershoot fix from
step 1; it just gets no content fade.)

### Breakpoint choice

`991px` matches the CSS breakpoint at which `--dial-large-width` switches to the
unclamped `min()` form (`ready-hit-play.css:597-601`), so the JS gate and the CSS cause
stay in step. Do **not** use `(hover: none), (pointer: coarse)` here — that is a device
capability query, not a size query, and would mis-fire on touch laptops.

---

## Files affected

| File | Change | Est. LOC |
|---|---|---|
| `orchestrator.js` | Add `_resolveToPx()` helper near the other dial helpers (~line 115) | +18 |
| `orchestrator.js` | Use resolved px in `runDialShrinkAnimation()` (~line 285-299) | ~6 |
| `orchestrator.js` | Add mobile-only container fade in `runDialShrinkAnimation()` | +9 |
| `orchestrator.js` | Optionally refactor `runDialExpandAnimation()` temp-element block (~168-176) to call the new helper | ~-8 |
| `init.js` / Webflow embed | Bump `?v=` cache-buster on `orchestrator.js` | 1 |

No CSS changes. No Webflow Designer changes. No new dependencies.

---

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements, listeners, GSAP timelines or
   ScrollTriggers are created. `_resolveToPx()` appends and removes a probe element
   synchronously within one call, so nothing outlives the function. The container fade
   tween targets a node Barba destroys immediately after `leave()` resolves. **No
   `init()`/`destroy()` changes required.**
2. **State survival** — Unaffected. `RHP.videoState.caseHandoff` capture in `beforeLeave`
   (`orchestrator.js:1915-1932`) is untouched, so the case→home video handoff still works.
3. **Transition interference** — The fade targets only the outgoing container, which sits
   *below* `#fg-video-wrap` and `.dial_layer-ui` in the dial stack. It cannot occlude the
   FG overlay crossfade (`--fg-overlay-opacity`, `orchestrator.js:266-274`), the tick
   fade-in, or the UI fade-in — those all target elements outside the container.
   Resolving the width/height to px changes only the *start* value GSAP computes; the end
   state is byte-identical to today, so `runAfterEnter`'s deferred `clearProps` still
   lands on the same values.
4. **Re-entry correctness** — work → home → work → home re-runs the same pure function
   each time; the probe re-measures against the live viewport, so orientation changes and
   resizes between visits are handled. No stale cached px values are stored anywhere.
5. **Namespace scoping** — Change is confined to `runDialShrinkAnimation()`, called only
   from the `work-to-home` transition's `leave()` (`orchestrator.js:1936-1938`). It does
   not run on `home-to-work`, `home-to-about`, `about-to-home`, `work-to-about`, or
   `about-to-work`.

---

## Architectural decisions

**No ADR required.** This is a localised bug fix using a pattern already established in
the same file. It introduces no new module, dependency, or cross-project convention.

One convention worth recording in `CLAUDE.md` afterwards (not blocking):
> Never pass a raw CSS custom property to a GSAP numeric tween. `min()`, `clamp()` and
> `calc()` values silently fall back to complex-string interpolation with a zero-filled
> start. Resolve to px via `_resolveToPx()` first.

---

## Parallelisation Map

**Recommendation: sequential, no worktrees, no agent teams.**

All code changes land in a single function in a single file (`orchestrator.js`). Splitting
this across parallel executors would create merge conflicts in the same ~30 line range for
no throughput gain. Total estimated work is well under one agent-hour.

| Stream | Tasks | Agent | Est. time | Est. tokens | Depends on |
|---|---|---|---|---|---|
| A (only) | T1 → T2 → T3 | `code-writer` | 25 min | ~18k | — |
| B | T4 (acceptance tests) | already written by `/plan` | — | — | — |
| C | T5 (verify) | `qa` | 15 min | ~12k | A |

Sequential dependencies: T1 (helper) gates T2 (use it in shrink) gates T3 (fade). T5
cannot start until T1–T3 are deployed to CDN, because the acceptance tests run against
the live staging site.

---

## Test Plan

### Tier 1 — Auto: Playwright local (runs during `/build` and `/debug`)

File: `tests/acceptance/fix-mobile-work-to-home-shrink.spec.js` (8 tests)

Run with: `npx playwright test --config=tests/playwright.config.js tests/acceptance/fix-mobile-work-to-home-shrink.spec.js`

**Baseline established 2026-08-18 against staging, pre-fix: 4 fail / 4 pass.**
The 4 failures are the ones the fix must turn green; the 4 passes are guards that must
stay green.

| # | Test | Pre-fix | Must be, post-fix |
|---|---|---|---|
| 1 | mobile — dial shrinks cleanly, no collapse or growth | **FAIL** (dips to 0px) | PASS |
| 2 | mobile — lands at home dial size, `data-dial-ns="home"`, `is-case-study` removed | PASS | PASS |
| 3 | mobile — outgoing case content fades out | **FAIL** (opacity stays 1) | PASS |
| 4 | desktop — dial shrinks cleanly, clamp undershoot gone | **FAIL** (dips to 369/450) | PASS |
| 5 | desktop — no mobile-only content fade applied | PASS | PASS |
| 6 | mobile — home→work expand still works (untouched path) | PASS | PASS |
| 7 | no JS/console errors during work→home on mobile | PASS | PASS |
| 8 | prefers-reduced-motion — instant, no partial opacity | PASS | PASS |

Test 2 passed on rerun but failed once on a `page.goto` timeout; `loadWorkPage` now uses
`waitUntil: 'domcontentloaded'` because case pages hold Vimeo sources open past the 15s
nav timeout. The config sets `retries: 1`, which absorbs residual staging flake.

Note: there is **no `.env.test` file** in this project. `tests/playwright.config.js:13`
falls back to `https://rhpcircle.webflow.io`, so the suite runs without one. Do not add
a `.env.test` unless staging moves.

### Tier 2 — Auto: CDN regression (runs during `/deploy`)

Registered in `tests/registry.json` as `fix-mobile-work-to-home-shrink`
(`type: acceptance`, `source: plan`, `critical: false`). Runs against the live jsDelivr
URL after the commit → push → CDN hash bump.

### Tier 3 — Manual

| Check | Why it can't be automated |
|---|---|
| Shrink *feels* gentle on a real iPhone (Safari) | Playwright runs Chromium only; iOS Safari's dvh/svh recalculation on browser-chrome show/hide differs from emulation, and this fix reads `svh` units |
| Fade timing reads as intentional, not laggy | Subjective motion-design judgement |
| Transition during an in-flight Vimeo video load | Requires real network throttling plus a real device decoder |
| Android Chrome + Firefox mobile | Cross-browser; Playwright config is Chromium-only |
| Rotate device mid-transition | Real orientation-change event; emulated resize does not reproduce the `svh` reflow |
| Desktop landing still feels right with the undershoot removed | The fix changes desktop motion (removes an ~18% springy dip before settling). Subjective sign-off on a previously-approved transition |

---

## Verify Loop

### Pass/fail criteria

**PASS requires all of:**

1. **No undershoot.** Sampling `.dial_layer-fg.getBoundingClientRect()` every rAF from
   `barba.go('/')` until settle, **no frame** has `width < 0.95 × targetWidth`, where
   `targetWidth` is `--dial-home-width` resolved to px at the current viewport.
   Thresholding against the *start* width does not work — desktop legitimately shrinks to
   40% of start (1123 → 450). The bug's signature is dipping below the *target*:
   mobile to 0px (0% of a 255px target), desktop to 369px (82% of a 450px target).
2. **Monotonic shrink.** The width series is non-increasing within a 5px tolerance.
   Both platforms currently violate this — mobile rises 0 → 311, desktop rises 369 → 450.
3. **Correct end state.** After settle, `.dial_layer-fg` width equals the computed
   `--dial-home-width` (±4px), `.dial_component` has `data-dial-ns="home"`, and
   `.dial_layer-fg` no longer carries `is-case-study`.
4. **Fade applied on mobile only.** At ≤991px the outgoing `[data-barba="container"]`
   reaches `opacity < 0.1` before the tween completes. At 1440px it never drops below
   `0.99`.
5. **Console clean.** Zero `pageerror` events and zero `console.error` entries across the
   transition.
6. **Home lands correctly.** `window.RHP.scriptsOk === true` afterwards and the home dial
   is centred (guards the `fix-mobile-dial-position-video-flash` regression, where the
   dial shifted top-right after a work→home return).

### Reproduction steps

1. Set viewport to **393 × 852** (iPhone 15 Pro).
2. `page.goto('https://rhpcircle.webflow.io/work/overland-ai')`
3. Wait for `window.RHP.scriptsOk === true` (up to 20s), then 1500ms settle.
4. Start an rAF sampler recording `.dial_layer-fg` bounding rect + the outgoing
   container's computed opacity.
5. Trigger the transition via `window.barba.go('/')` (this is exactly what the close
   button does — `orchestrator.js:1290`).
6. Sample for 1400ms (the tween is 800ms; the margin covers Barba's swap + `afterEnter`).
7. Assert criteria 1–6.
8. Repeat steps 1–7 at **1440 × 900** for the desktop regression guard, asserting no
   fade and an unchanged shrink profile.

### Tier mapping

| Check | Tier | Test name |
|---|---|---|
| 1, 2 | 1 (auto) | tests 1 & 2 above |
| 3 | 1 (auto) | test 3 |
| 4 | 1 (auto) | tests 4 & 6 |
| 5 | 1 (auto) | test 8 |
| 6 | 1 (auto) | test 3 + smoke registry entry |
| All | 2 (CDN) | registry id `fix-mobile-work-to-home-shrink` |
| Feel / iOS Safari / rotation | 3 (manual) | see Tier 3 table |

### Regression scope — what must NOT break

- **`home → work` expand** — `runDialExpandAnimation()` shares `getDialVars()`. Its values
  are single-unit and legitimately parseable, but if the temp-element block there is
  refactored to call `_resolveToPx()`, the case-video height calculation must still
  resolve `calc(100dvh - 80px)` identically. Covered by test 7 and by the existing
  `fix-fg-video-case-to-case-barba.spec.js`.
- **`work → about` and `about → work`** — both call `setDialToWorkState()` /
  `runViaHomeBeat`, which read the same vars. Not modified, but re-run
  `feat-about-to-work-via-home-transition.spec.js`.
- **`about → home`** — `home-about-slide.js` curtain path, untouched. Re-run
  `about-to-home-barba-transition.spec.js`.
- **Case→home video handoff** — `RHP.videoState.caseHandoff` must still restore the
  correct dial sector and playback position. Covered by the existing
  `fix-work-to-home-video-restore` behaviour in the smoke suite.
- **Home scroll-morph** — `home-scroll-morph.js` scrubs `.dial_component` scale and calls
  `transitionDial.resize()` every frame. The new probe element must never be appended
  inside `.dial_component` or the scrub will mis-measure.
- **Reduced motion** — with `dur = 0`, both the shrink and the fade must be skipped
  entirely, not run at zero duration with a visible flash.

**Self-check:** `/build` knows this feature works when the rAF sample series from step 4
is non-increasing and never dips below 40% of the start width, the outgoing container
reaches `opacity < 0.1` on mobile only, and the console is clean.

---

## Task breakdown

| # | Task | Agent |
|---|---|---|
| T1 | Add `_resolveToPx(value, axis)` helper to `orchestrator.js` near the dial morph helpers | `code-writer` |
| T2 | Use resolved px for `width`/`height` in `runDialShrinkAnimation()`, with string fallback | `code-writer` |
| T3 | Add mobile-only (`≤991px`, non-reduced-motion) fade of the outgoing Barba container | `code-writer` |
| T4 | Acceptance tests — written by `/plan`, run by `/build` | — |
| T5 | Run Tier 1 suite at both viewports; confirm regression scope | `qa` |
| T6 | Bump `?v=` cache-buster and deploy | `/deploy` |

---

## Acceptance Tests

File: `tests/acceptance/fix-mobile-work-to-home-shrink.spec.js` — 8 tests, registered in
`tests/registry.json` as `fix-mobile-work-to-home-shrink`.

Core assertions are **shape-of-the-animation** assertions, not end-state assertions: the
end state was already correct before the fix, so only a per-frame sampler catches this.
`sampleWorkToHome()` resolves `--dial-home-width` to px in-page, so thresholds adapt to
the viewport instead of hard-coding breakpoint values.

1. **mobile — dial shrinks cleanly, no collapse or growth** — rAF-samples `.dial_layer-fg`
   through `barba.go('/')`; asserts no frame below 95% of target and a non-increasing
   series. *Pre-fix: FAIL (dips to 0px).*
2. **mobile — lands at home dial size** — final width matches computed `--dial-home-width`
   ±4px, `data-dial-ns="home"`, `is-case-study` removed. *Pre-fix: PASS.*
3. **mobile — outgoing case content fades out** — outgoing `[data-barba="container"]`
   reaches `opacity < 0.1` before the tween ends. *Pre-fix: FAIL (stays 1).*
4. **desktop — dial shrinks cleanly, clamp undershoot gone** — same contract at 1440×900.
   *Pre-fix: FAIL (dips to 369px against a 450px target).*
5. **desktop — no mobile-only content fade** — outgoing container never drops below
   `opacity 0.99`. *Pre-fix: PASS — must stay passing.*
6. **mobile — home→work expand still works** — regression guard on the untouched expand
   path. *Pre-fix: PASS — must stay passing.*
7. **no JS/console errors during work→home on mobile** — `pageerror` + `console.error`.
   *Pre-fix: PASS.*
8. **prefers-reduced-motion — instant, no fade** — asserts no partial opacity values and
   a `data-dial-ns="home"` end state. *Pre-fix: PASS.*

### Running them

```bash
cd projects/ready-hit-play-prod
npx playwright test --config=tests/playwright.config.js \
  tests/acceptance/fix-mobile-work-to-home-shrink.spec.js
```

The `--config` flag is required — without it Playwright loads no `baseURL` and every
`page.goto` fails with "Cannot navigate to invalid URL".
