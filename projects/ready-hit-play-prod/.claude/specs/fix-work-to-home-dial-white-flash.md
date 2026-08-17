# fix-work-to-home-dial-white-flash

**Project:** ready-hit-play-prod
**Type:** Bug fix
**Slug:** `fix-work-to-home-dial-white-flash`
**Created:** 2026-08-17
**Status:** Ready to Build

---

## Problem

Navigating **work → home**, a white box fills the dial for roughly the entire
0.8 s shrink animation. It reads as a flash/blowout in the middle of what should
be a video shrinking back into the circle.

## Measured root cause

Instrumented on staging (`https://rhpcircle.webflow.io/work/overland-ai`,
1440×900, rAF sampling of `getBoundingClientRect` through the transition):

| t (ms) | `data-dial-ns` | dial height | `#fg-video-wrap` height | white inside dial |
|-------:|----------------|------------:|------------------------:|------------------:|
| 0      | `work`         | 765         | 625                     | 140 px            |
| 64     | `home`         | 765         | **0**                   | **765 px**        |
| 323    | `home`         | 693         | 0                       | 693 px            |
| 523    | `home`         | 374         | 0                       | 374 px            |
| 857    | `home`         | 450         | 0                       | 450 px            |
| 941    | `home`         | 450         | 450                     | 0 (container gone)|

Two independent faults combine:

### Fault 1 — `#fg-video-wrap` collapses to 0 px height

`.dial_layer-fg` is `display: flex; flex-flow: column`. Its children are
`a.dial_work-link`, `#fg-video-wrap`, and `[data-barba="container"]`.

- `ready-hit-play.css:634` — the **work** rule sets `flex-shrink: 0` on
  `#fg-video-wrap`, so it holds its height.
- `ready-hit-play.css:625` — the **home** rule sets `width: 100%; height: 100%;
  aspect-ratio: 1/1` but **omits `flex-shrink: 0`**.

`runDialShrinkAnimation()` calls `setDialNs('home')` (`orchestrator.js:265`)
while the old Barba container — ~4,957 px of case content — is still a sibling
flex item. With `flex-shrink` back at its default `1`, that sibling crushes
`#fg-video-wrap` to **0 px**. The video vanishes instantly at t≈64 ms and does
not come back until Barba removes the old container at t≈941 ms.

### Fault 2 — the case content is white and now owns the whole dial box

`.case-studies_wrapper` is itself transparent (`rgba(0,0,0,0)`). The white comes
from its children: `section_case-title`, `section_case-intro` and
`section_case-close` are all `rgb(255,255,255)`. With the video collapsed, those
sections are the only thing rendering inside the shrinking dial.

## Confirmed DOM (live)

```
.dial_component[data-dial-ns]
└── .dial_layer-fg            ← persists, morphs rect ↔ circle, flex column
    ├── a.dial_work-link
    ├── #fg-video-wrap        ← persists, SIBLING of the container
    │   └── video.dial_fg-video
    └── [data-barba="container"]   ← SWAP ZONE
        └── .case-studies_wrapper
            ├── section_case-video   (transparent spacer)
            ├── section_case-title   #fff
            ├── section_case-intro   #fff
            └── section_case-close   #fff
```

`#fg-video-wrap` is a **sibling** of the Barba container, not a descendant of
`.case-studies_wrapper`. Fading the wrapper therefore cannot touch the video —
verified via `wrapper.contains(fgVideoWrap) === false`.

---

## Solution

Two changes inside `runDialShrinkAnimation()` (`orchestrator.js:232–298`), plus a
defensive restore. Chosen approach: **fade the case content AND keep the video
sized**, so the video visibly shrinks into the circle rather than the dial going
empty.

### Change 1 — Fade `.case-studies_wrapper` to 0 over 0.2 s

Starts immediately, before `setDialNs('home')`, so no white is ever composited.
Duration 0.2 s against the 0.8 s shrink: gone by ~25 % of the way in.

### Change 2 — Pin and tween `#fg-video-wrap` through the shrink

Pin `width`/`height` inline **and set `flexShrink: 0`** before the namespace
flip, then tween down to the home dial box alongside `dialFg`. Inline GSAP styles
beat the CSS `height: 100%`, and `flex-shrink: 0` stops the oversized sibling
from crushing it. This mirrors what `runDialExpandAnimation()` already does on
the way out (`orchestrator.js:157–190`).

### Change 3 — Restore on return to a work page

`.case-studies_wrapper` lives inside the Barba container, so the faded node is
destroyed when Barba swaps containers and a fresh one arrives at opacity 1. The
normal path self-heals. The restore is defensive cover for aborted/interrupted
transitions and the `rhp-core` fallback: in `runAfterEnter()` under
`ns === 'case' || ns === 'work'`, `clearProps: 'opacity'` on the incoming
wrapper.

`#fg-video-wrap` needs no new restore — `runAfterEnter()` already does
`killTweensOf` + `clearProps: 'all'` on it (`orchestrator.js:1566–1569`), which
clears the pinned size and `flexShrink`.

### Sketch

```js
// runDialShrinkAnimation(), inside the Promise
const videoWrap = document.getElementById('fg-video-wrap');
const caseWrap  = dialFg.querySelector('.case-studies_wrapper');

gsap.killTweensOf(dialFg);
if (videoWrap) gsap.killTweensOf(videoWrap);
if (caseWrap)  gsap.killTweensOf(caseWrap);

// Fade case content out fast — its child sections are #fff and would
// otherwise fill the dial for the whole shrink.
if (caseWrap) {
  gsap.to(caseWrap, {
    opacity: 0,
    duration: reduced ? 0 : 0.2,
    ease: 'power1.out'
  });
}

// Pin the video box BEFORE the ns flip. flexShrink:0 is load-bearing:
// the home CSS rule omits it, so the oversized Barba container sibling
// would otherwise crush this to 0 px height.
const vRect = videoWrap?.getBoundingClientRect();
if (videoWrap && vRect) {
  gsap.set(videoWrap, {
    width: vRect.width,
    height: vRect.height,
    flexShrink: 0,
    borderRadius: _parseSize(v.caseBR)
  });
}

setDialNs('home');
dialFg.classList.remove('is-case-study', 'no-scrollbar');

// Tween the video down to the home circle in lockstep with dialFg.
if (videoWrap) {
  gsap.to(videoWrap, {
    width: _parseSize(v.homeWidth),
    height: _parseSize(v.homeHeight),
    borderRadius: _parseSize(v.homeBR),
    duration: dur,
    ease: 'power2.inOut'
  });
}
```

Note: `runDialExpandAnimation()`'s `onComplete` sets
`borderBottomLeftRadius`/`borderBottomRightRadius` to 0 on `#fg-video-wrap`
(`orchestrator.js:183–188`). The shrink must clear those so the circle closes —
either include them in the tween or rely on the existing `clearProps: 'all'` in
`runAfterEnter()`. Prefer tweening them to `v.homeBR` so the corners round during
the animation rather than snapping at the end.

`_parseSize` (`orchestrator.js:31`) handles `rem`/`vw`/`min()` but returns
`Infinity` for `auto` and cannot resolve `dvh`. `--dial-home-height` defaults to
`37.5rem`, so `_parseSize` is safe here — but guard against a non-finite result
and fall back to the temp-element `calc()` resolution trick already used in the
expand animation (`orchestrator.js:170–177`).

---

## Files affected

| File | Change | Approx. lines |
|------|--------|---------------|
| `orchestrator.js` | `runDialShrinkAnimation()` — fade wrapper, pin + tween videoWrap | ~232–298 |
| `orchestrator.js` | `runAfterEnter()` — defensive `clearProps: 'opacity'` on incoming wrapper | ~1575–1585 |
| `ready-hit-play.css` | *(optional hardening)* add `flex-shrink: 0` to the home `#fg-video-wrap` rule | 625–632 |
| `tests/acceptance/fix-work-to-home-dial-white-flash.spec.js` | new | — |
| `tests/registry.json` | new entry | — |

The CSS change is optional because the JS pin already covers the transition
window. Adding it makes the collapse structurally impossible and is the smaller
long-term risk — recommended, but it must be verified against direct-land on
home, where `#fg-video-wrap` is the only sizeable flex child.

---

## Out of scope

- **work → about** keeps case content visible while the curtain slides across —
  deliberate, per the comment at `orchestrator.js:1930`. No change there.
- **work → work** (case→case) is an instant swap with no shrink. Unaffected.
- **home → work** (expand) already pins `#fg-video-wrap` correctly. Unaffected.

---

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM nodes, listeners, ScrollTriggers or
   persistent timelines. Two GSAP tweens created inside an existing
   `leave()`-scoped animation that already resolves a Promise on completion.
   `killTweensOf` is called on all three targets at the top of the function, so
   re-entry cannot stack tweens. No new `init`/`destroy` pair required.
2. **State survival** — Nothing new to persist. The existing
   `RHP.videoState.caseHandoff` capture happens in `beforeLeave`, before this
   code runs, and is untouched.
3. **Transition interference** — The wrapper fade targets a node inside the
   outgoing container only; `#fg-video-wrap` is a sibling and stays opaque. The
   `flexShrink: 0` pin is inline and cleared by the existing
   `clearProps: 'all'` in `runAfterEnter()`. No z-index changes.
4. **Re-entry correctness** — work → home → work → home must show the video
   shrinking each cycle with no residual `opacity: 0` on the incoming wrapper and
   no residual inline size on `#fg-video-wrap`. Covered by Change 3 and the
   existing `clearProps`. Explicitly tested (T4).
5. **Namespace scoping** — Runs only inside `runDialShrinkAnimation()`, called
   from the `work-to-home` transition's `leave()` (`orchestrator.js:1836`). Not
   reachable from `work-to-about`, `work-to-work`, or `about-to-work`.

---

## Verify Loop

### Pass/fail criteria

1. **No white composited in the dial.** From the click on `.case-homepage-link`
   until the old container is removed, no rAF frame has a `#fff` section
   intersecting the `.dial_layer-fg` box at `opacity > 0.05`.
   Measured as: `.case-studies_wrapper` computed opacity ≤ 0.05 by t = 250 ms
   after transition start, and ≤ 0.05 for every frame thereafter while attached.
2. **Video stays sized.** `#fg-video-wrap.getBoundingClientRect().height > 0`
   on **every** sampled frame of the shrink. This is the direct regression guard
   — pre-fix it is exactly `0` from t≈64 ms to t≈941 ms.
3. **Video tracks the dial.** At shrink end, `#fg-video-wrap` height is within
   ±8 px of `.dial_layer-fg` height.
4. **Home lands correctly.** 2 s after the transition, `data-dial-ns="home"`,
   `#fg-video-wrap` has no inline `width`/`height`/`flex-shrink`, and the dial is
   its normal circle.
5. **Return to work restores content.** After home → work, the new
   `.case-studies_wrapper` has computed `opacity === '1'`.
6. **No console errors** on the work page, the home page, and across the
   transition.
7. **Reduced motion** — with `prefers-reduced-motion: reduce`, `dur` is 0 and the
   fade duration is 0; the transition completes and the home dial is correct with
   no white frame.

### Reproduction steps

1. `page.goto(STAGING_URL + '/work/overland-ai')`, wait for `RHP.scriptsOk`, then
   1500 ms settle.
2. Install a rAF sampler recording, per frame: `performance.now()`,
   `data-dial-ns`, `.dial_layer-fg` rect, `#fg-video-wrap` rect,
   `.case-studies_wrapper` presence + computed opacity.
3. Click `a.case-homepage-link`.
4. Wait 2500 ms (0.8 s shrink + Barba swap + settle), stop the sampler.
5. Assert criteria 1–4 over the recorded frames.

### Tier mapping

**Tier 1 — Auto (Playwright, runs in `/build` and `/debug`)**
`tests/acceptance/fix-work-to-home-dial-white-flash.spec.js`
- T1 `video wrap never collapses to zero height during the shrink`
- T2 `case wrapper is faded out before the dial starts shrinking`
- T3 `home state is clean after the transition`
- T4 `work → home → work → home leaves no stale opacity or inline size`
- T5 `case wrapper opacity is restored on a work page`
- T6 `no console errors across the work → home transition`
- T7 `reduced motion completes the transition without a white frame`

**Tier 2 — Auto (CDN regression, runs in `/deploy`)**
Registered in `tests/registry.json` as `fix-work-to-home-dial-white-flash`,
`critical: true` — this sits on the primary navigation path.

**Tier 3 — Manual**
- **Perceptual check that no white flickers.** rAF sampling can miss a
  sub-frame composite; a human watching the transition at normal speed is the
  final word. Can't be automated.
- **Safari + Firefox.** Playwright runs Chromium only here, and flexbox
  `flex-shrink` resolution against a `dvh`-sized parent has historically differed
  in Safari.
- **iOS Safari on a real device.** `dvh` collapse on toolbar show/hide and video
  decode behaviour during a size tween can't be emulated faithfully.
- **Animation feel.** Whether 0.2 s reads as "the content cleanly gets out of the
  way" or as "a pop" is subjective. Adjust to taste after seeing it.

### Regression scope

Must not break:
- **Video handoff work → home** — `RHP.videoState.caseHandoff` seek and
  `views.home.resume()`. The dial must land on the project you were viewing, not
  project 0. Covered by the existing `fix-home-restore-closed-project` registry
  entry — run it.
- **home → work expand** — `runDialExpandAnimation()` shares `#fg-video-wrap`
  and sets bottom-corner radii in its `onComplete`. Verify the corners round
  correctly on the way back in.
- **work → about** — case content must stay visible behind the curtain.
- **work → work** — instant swap, fg video persists.
- **Direct-land on home and on a work page** — no inline styles from a
  transition that never ran.
- **`.dial_bg-canvas` mirror** — the blurred BG draw loop
  (`startCaseBgDraw`) is unaffected but sits behind the video; confirm no
  z-order surprise once the video stays visible.

---

## Acceptance Tests

`tests/acceptance/fix-work-to-home-dial-white-flash.spec.js`

| # | Test name | Asserts |
|---|-----------|---------|
| T1 | video wrap never collapses to zero height during the shrink | `#fg-video-wrap` height > 0 on every sampled frame (the core regression) |
| T2 | case wrapper is faded out before the dial starts shrinking | wrapper opacity ≤ 0.05 by t = 250 ms and on all later frames |
| T3 | home state is clean after the transition | `data-dial-ns="home"`, no inline width/height/flex-shrink on `#fg-video-wrap` |
| T4 | work → home → work → home leaves no stale opacity or inline size | two full cycles, criteria T1–T3 hold on the second |
| T5 | case wrapper opacity is restored on a work page | computed opacity `'1'` after home → work |
| T6 | no console errors across the work → home transition | zero `pageerror` events |
| T7 | reduced motion completes the transition without a white frame | `reducedMotion: 'reduce'`, lands on home, no white frame sampled |

---

## Parallelisation Map

**Recommendation: sequential, no worktrees, no agent teams.**

All production changes land in a single function in one file
(`orchestrator.js:runDialShrinkAnimation`). Two agents editing that function
would conflict on every hunk, and the verification is a single Playwright run
against one transition. Fan-out costs more than it saves here.

| Stream | Tasks | Agent | Est. time | Est. tokens |
|--------|-------|-------|----------:|------------:|
| S1 (only) | T1 → T2 → T3 → T4 | code-writer, then qa | ~35 min | ~40k |

Sequential dependencies: T1 (fade) and T2 (video pin) both edit the same
`Promise` body and must land together — splitting them produces a half-fixed
transition where the dial is empty. T3 (restore) depends on nothing but is
trivial. T4 (verify) gates on all three.

---

## Task Breakdown

| # | Task | Agent | Notes |
|---|------|-------|-------|
| T1 | Fade `.case-studies_wrapper` to 0 over 0.2 s at the top of `runDialShrinkAnimation()` | code-writer | Before `setDialNs('home')`; respect `reduced` |
| T2 | Pin `#fg-video-wrap` (`width`/`height`/`flexShrink: 0`) before the ns flip and tween it to the home box | code-writer | Include border-radius so the circle closes cleanly |
| T3 | Defensive `clearProps: 'opacity'` on the incoming wrapper in `runAfterEnter()` for `case`/`work` | code-writer | Covers interrupted transitions |
| T4 | Run the acceptance spec + `fix-home-restore-closed-project` regression | qa | Then hand the Tier 3 checklist to the user |
| T5 | *(optional)* Add `flex-shrink: 0` to the home `#fg-video-wrap` CSS rule | code-writer | Verify direct-land on home first |

## ADR

None required. No new dependency, no new module, no cross-project pattern — this
is a localised fix inside an existing animation function.

---

## Implementation notes (added during `/build`, 2026-08-17)

Two things in the plan above turned out to be wrong once measured live. Both are
corrected in the shipped code; the sections above are left as written so the
original reasoning is still readable.

### 1. `_parseSize(v.homeWidth)` returns `NaN`, not a usable pixel value

The plan assumed `--dial-home-height` resolves to `37.5rem`. It does not — that
is only the *fallback* argument to `_getCSSVar`, and the property is actually
defined (`ready-hit-play.css:583`) as:

```
--dial-home-width:  var(--dial-large-width);   /* clamp(180px, min(50svh, 70vw), min(50svh, 70vw)) */
--dial-home-height: var(--dial-large-height);
```

`getPropertyValue` returns that `clamp(...)` string with `var()` substituted.
`_parseSize` sees `'vw'` in it, calls `parseFloat('clamp(180px, …')` and yields
`NaN` — so the sketch's `width: _parseSize(v.homeWidth)` would have set the
video box to `NaN`.

Shipped instead: a small `_resolveLengthPx(value, axis)` helper that measures
the value on a hidden probe element, which handles `clamp()`, `calc()`, `svh`
and anything else the browser can lay out. `runDialExpandAnimation`'s existing
inline temp-element block was folded into the same helper. The tween is guarded
by `if (homeW > 0 && homeH > 0)`, which also rejects `NaN`.

### 2. Task T5 (the "optional CSS hardening") was dropped — it would be inert

The plan suggested adding `flex-shrink: 0` to the home `#fg-video-wrap` rule.
`flex-shrink` only applies to flex items, and on the home namespace
`.dial_layer-fg` is **`display: grid; place-items: center`**
(`ready-hit-play.css:399`) — only the *work* namespace makes it
`display: flex; flex-flow: column` (`ready-hit-play.css:819`). Confirmed live:
computed `display` on `.dial_layer-fg` under `data-dial-ns="home"` is `grid`.

So the collapse after the namespace flip is not a flex-shrink effect at all: it
is `height: 100%` resolving against an auto-sized grid row that the oversized
outgoing container has taken. An inline pixel height is what fixes it, and the
JS pin already supplies that. No CSS change shipped.

`flexShrink: 0` is still set alongside the pin, because at the moment the pin is
applied the namespace is still `work` and the flex layout is live. It is cleared
by the existing `clearProps: 'all'` in `runAfterEnter` (verified: no stale
inline `width`/`height`/`flex-shrink` after the transition).

### 3. Acceptance-test corrections

- Deadlines are now anchored to **transition start** (first frame where
  `data-dial-ns` flips to `home`) rather than to sampler start. The spec always
  said "after transition start"; the test measured from `t=0`. Click round-trip
  plus Barba startup is routinely 300-400 ms on staging, so the old form was
  asserting against frames from *before* the transition, where the case page is
  legitimately at opacity 1.
- T4 no longer skips. The homepage exposes no `<a href="/work/...">` at all
  (`a.dial_work-link` is `href="#"`; the dial navigates via `barba.go()` inside
  work-dial.js), so the "find a work anchor" strategy always came up empty and
  the test silently skipped itself — on the deployed build too. It now drives
  `barba.go()`, the same entry point the dial uses. With that fixed the test
  catches the bug on the second cycle against CDN code.
- `loadPage` navigates with `waitUntil: 'domcontentloaded'` instead of the
  default `'load'`. Case pages carry a dozen autoplaying videos, so `'load'`
  regularly blew a 60 s budget on staging and failed runs before any assertion
  ran. `waitForRHP` already polls the real readiness signal.

### Known pre-existing issues surfaced (NOT caused by this fix)

Both reproduce identically against the deployed CDN build with none of this fix
present, and are out of scope here:

1. **`drawImage` throws on a zero-sized canvas.** `Failed to execute 'drawImage'
   on 'CanvasRenderingContext2D': The image argument is a canvas element with a
   width or height of 0` — from work-dial.js's glow canvas
   (`ctx.drawImage(glowCanvas, 0, 0)`, work-dial.js:1342 / 1426) during a
   home → work → home cycle. T4 filters this one exact message via
   `KNOWN_UNRELATED_ERRORS`; remove that filter when the bug is fixed.
2. **`fix-home-restore-closed-project` → "home > about > home (no case study)
   stays generic"** times out after ~3 min and closes the browser. Fails the
   same way on CDN. The other 3 tests in that spec pass.

### 4. Post-review fixes (three-lens code review, all PASS)

- **`_parseSize` also returns `Infinity` for `'0'`.** Measured live:
  `--dial-case-border-radius` is `2.5rem` on desktop but **`0`** at 375px and
  768px, and `_parseSize('0')` falls through every branch to the trailing
  `return Infinity` (only the literal string `'auto'` is special-cased). Both
  dial animations were passing that straight into
  `gsap.set(videoWrap, { borderRadius: ... })`, so on mobile the radius pin was
  silently a no-op. Pre-existing in `runDialExpandAnimation`; the shrink copied
  it. Both now resolve `v.caseBR` through `_resolveLengthPx`, which returns 0
  for `0` and 40 for `2.5rem`.
- **One probe instead of two.** `_withProbe(read)` owns the create/append/remove
  cycle (with `finally`, so the node is removed even if a read throws), and
  `_resolveBoxPx(w, h)` measures both axes off a single element — one reflow
  rather than two, mid-transition inside `leave()`.
- **`caseVideoHeight` is now guarded** (`> 0`) before the expand tween, matching
  the shrink path.
- **Dropped a dead fallback.** The `runAfterEnter` wrapper lookup had
  `data.next.container.querySelector(...) || document.querySelector(...)`. Barba
  guarantees `data.next.container` is attached by `afterEnter`, and every other
  consumer in that function trusts it directly — the fallback could only ever
  match the *outgoing* wrapper, so clearing its opacity was pointless.
- **`ORCHESTRATOR_VERSION` bumped** to `2026.8.17.1`.

One review suggestion was **rejected**: "try the cheap `_parseSize` first and
fall back to the probe only on a non-finite result." Measured at 1280/1440/1920/
375/768, `_parseSize(--dial-home-width)` is `NaN` at *every* viewport — the
value is `clamp(180px, min(50svh, 70vw), ...)` on desktop and `min(65vw, 65svh)`
below 768px, and `_parseSize`'s `min()` regex only matches
`min(<int>vw, <float>rem)`. The fast path would never once be taken, so the
branch would be dead code. Two of the three reviewers repeated the spec's
original `37.5rem` claim, which is what made the suggestion look reasonable.
