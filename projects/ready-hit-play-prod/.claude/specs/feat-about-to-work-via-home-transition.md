# feat-about-to-work-via-home-transition

**Status:** Ready to Build
**Type:** feat
**Priority:** P1
**Project:** ready-hit-play-prod
**Created:** 2026-08-12
**Test page:** https://rhpcircle.webflow.io/about

---

## Problem

Links to case studies (`/work/<slug>`) are being added to the about page. The
`about-to-work` Barba transition already exists (orchestrator.js:1964) but it
was never designed for this — it calls `runDialExpandAnimation()` straight away:

```js
async leave() {
  const dialComp = document.querySelector('.dial_component');
  if (dialComp?.getAttribute('data-dial-ns') !== 'work') {
    await runDialExpandAnimation();
  } else {
    setDialToWorkState();
  }
}
```

The about container is an opaque, viewport-covering sibling of the persistent
`.dial_component`, so the dial expands **behind** it, entirely unseen. The user
sees the about page sit still for 0.8 s and then hard-cut to the case study.

## Goal

Clicking any `/work/*` link on the about page plays a legible three-beat
transition — **about → home → case study**:

1. **Slide out** — the about container slides off to the left, revealing the
   persistent dial behind it (identical motion to the existing `about-to-home`).
2. **Home beat** — the dial reads as the homepage dial: large teal tick ring,
   circular foreground, with the *clicked* case study's teaser already playing
   inside it. Short hold.
3. **Expand** — the circle expands into the case-study frame and Barba swaps in
   the case page, with video playback handed off so the header video continues
   from where the dial video got to.

## Non-goals

- No change to `home-to-work`, `work-to-work`, `home-to-about`, `about-to-home`
  or `work-to-about`.
- No re-initialisation of the interactive work-dial (drag/hover/sector logic) —
  the home beat is a ~1 s visual, not a usable dial.
- No new Designer markup. Links are plain `<a href="/work/...">`.

---

## Structural facts (verified against live DOM)

Confirmed on `/`, `/about` and `/work/overland-ai`:

```
/  and  /work/*        body[data-barba=wrapper] > .page-wrapper > main.main-wrapper
                         > section.section_home > .dial_component
                           > .dial_layer-fg
                             > .dial_video-wrap#fg-video-wrap
                             > [data-barba=container]          ← container is INSIDE dial_layer-fg

/about                 body[data-barba=wrapper] > .page-wrapper > main.main-wrapper
                         > section.section_home > .dial_component > .dial_layer-fg > #fg-video-wrap
                         > .barba-wrapper-about[data-barba=container]   ← container is a SIBLING
```

So on about, sliding `data.current.container` out genuinely uncovers the dial.
`#fg-video-wrap` and `#dial_ticks-canvas` persist across every transition.

Relevant CSS (`ready-hit-play.css`):

- `.dial_component[data-dial-ns="home"] .dial_layer-fg { opacity: 0 }` under
  **both** `@media (hover: hover)` (line ~424) and `@media (hover: none)`
  (line ~437) — so after `setDialToHomeState()` the foreground must be made
  visible explicitly by JS.
- Home circle size comes from `--dial-live-width/height`, falling back to
  `--dial-large-*`. `.dial_component.is-intro-small` overrides those to
  `--dial-small-*` and hides the ticks canvas — it must not be left on.

## Approach

**Chosen: sequence the two existing animations, with a video pre-load in
between.** Every beat already exists and is battle-tested; the only genuinely
new code is a static tick painter and the orchestration itself.

| Beat | Existing code reused | Duration |
|------|---------------------|----------|
| 1 slide-out | `RHP.homeAboutSlide.leaveAboutToHome(data)` (home-about-slide.js) | 0.8 s |
| 2 home beat | `setDialToHomeState()` + `_setFgVideoForSlug()` + new tick paint | 0.25 s hold |
| 3 expand | `runDialExpandAnimation()` (orchestrator.js:131) | 0.8 s |

Total ≈ **1.85 s**, all constants at the top of the transition for tuning.

Alternatives rejected: re-initialising `work-dial` for the home beat (heavy —
builds the whole video pool and grabs pointer input, for a 1 s visual); and a
cross-fade with no home beat (does not deliver the requested about → home → case
read).

### 1. `orchestrator.js` — parameterise the fg-video loader

`_updateCaseVideos(force)` (line 1359) derives the slug from
`window.location.pathname`. During `leave()` the URL has not changed yet, so it
must be told the slug. Split it:

```js
/** Load a case study's teaser into the persistent #fg-video-wrap video.
 *  @param {string} slug — case study slug, e.g. 'overland-ai'
 *  @param {boolean} [force=true] */
function _setFgVideoForSlug(slug, force) { /* existing body, minus the slug derivation */ }

function _updateCaseVideos(force) {
  const slug = window.location.pathname.replace(/\/$/, '').split('/').pop() || '';
  if (!slug) return;
  _setFgVideoForSlug(slug, force);
}
```

Behaviour for existing callers (runAfterEnter:1613, bootCurrentView) is unchanged.
The function already handles the frame-capture overlay, CMS poster, and the
mobile `data-video-mobile` variant — all of which we want here.

### 2. `transition-dial.js` — static tick painter for the persistent canvas

`work-dial` owns `#dial_ticks-canvas` and is destroyed on about, so nothing
paints the ring during the home beat. `transition-dial.js` already has the exact
tick geometry (96 bars, teal `#05EFBF`, matching `work-dial`) but is hard-bound
to the `.home-transition-dial` / `.transition-dial` wrapper.

Add a small public method that paints one static ring into a supplied canvas and
a matching clear, without disturbing the module's own `alive` instance:

```js
/** Paint one static teal ring into an arbitrary canvas (used by the
 *  about→work via-home beat, where work-dial is destroyed and nothing
 *  is painting #dial_ticks-canvas). */
function paintInto(canvasEl) { /* size to parent rect × dpr, reuse the draw math */ }
function clearCanvas(canvasEl) { /* ctx.clearRect */ }
```

Export both alongside `init/destroy/resize`. Bump `TRANSITION_DIAL_VERSION` to
`2026.8.12.1`. ~35 LOC, no change to existing behaviour.

### 3. `home-about-slide.js` — optional slide duration

`leaveAboutToHome(data)` hard-codes `duration: 1`. Add an optional second
argument so this path can use 0.8 s without affecting `about-to-home`:

```js
function leaveAboutToHome(data, opts) {
  const dur = opts?.duration ?? 1;
  ...
}
```

Bump `VERSION` to `2026.8.12.1`.

### 4. `orchestrator.js` — the via-home transition

New module-level constants and helper, then rewire the existing `about-to-work`
transition:

```js
const VIA_HOME_SLIDE_DUR = 0.8;
const VIA_HOME_HOLD      = 0.25;

/** about → home → work. Slides the about container away to reveal the
 *  persistent dial dressed as the homepage dial (target case teaser playing
 *  inside the circle), holds, then expands the circle into the case frame. */
async function runAboutToWorkViaHome(data) {
  const gsap = window.gsap;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slug = (data?.next?.url?.path || '').replace(/\/$/, '').split('/').pop() || '';

  if (!gsap || reduced) { setDialToWorkState(); return; }

  // ── Beat 2 prep (runs while about still covers the screen) ──
  const dialComp = document.querySelector('.dial_component');
  const dialFg   = document.querySelector('.dial_layer-fg');
  const fgWrap   = document.getElementById('fg-video-wrap');
  const ticks    = document.querySelector('.dial_component .dial_layer-ticks');
  const dialUI   = document.querySelector('.dial_layer-ui');

  setDialToHomeState();
  // is-intro-small pins the dial to --dial-small-*; home-scroll-morph removes it
  // on the homepage but it can survive a direct land on /about.
  dialComp?.classList.remove('is-intro-small');
  // CSS pins the home foreground to opacity 0 in both hover media queries.
  if (dialFg) gsap.set(dialFg, { opacity: 1 });
  if (fgWrap) gsap.set(fgWrap, { opacity: 1, '--fg-overlay-opacity': 0 });
  // Label/meta are stale after about — keep them out of the beat.
  if (dialUI) gsap.set(dialUI, { opacity: 0 });
  if (ticks)  { gsap.set(ticks, { opacity: 1 }); RHP.transitionDial?.paintInto?.(ticks); }
  if (slug)   _setFgVideoForSlug(slug);

  // ── Beat 1: about slides out, revealing the dial ──
  await RHP.homeAboutSlide?.leaveAboutToHome?.(data, { duration: VIA_HOME_SLIDE_DUR });

  // ── Beat 2: hold on the home look ──
  await new Promise((r) => gsap.delayedCall(VIA_HOME_HOLD, r));

  // ── Beat 3: hand off playback, then expand ──
  const fgVideo = document.querySelector('#fg-video-wrap > .dial_fg-video');
  const items   = Array.from(document.querySelectorAll('.dial_cms-item'));
  const index   = items.findIndex((el) => el.getAttribute('data-url') === slug);
  if (RHP.videoState) {
    RHP.videoState.caseHandoff = {
      index: index >= 0 ? index : 0,
      currentTime: fgVideo?.currentTime || 0,
      transitionDuration: 0.8
    };
  }
  await runDialExpandAnimation();
}
```

Rewire the transition (orchestrator.js:1963):

```js
{
  name: 'about-to-work',
  from: { namespace: ['about'] },
  to:   { namespace: ['case', 'work'] },

  beforeLeave(data) {
    RHP.lenis?.stop();                                  // ← add: about runs Lenis on its container
    RHP.homeAboutSlide?.resetCurtain?.();               // ← add: clear any half-run curtain
    const ns = data.current?.namespace || currentNs;
    if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
    RHP.videoLoader?.destroy?.();
  },

  async leave(data) {
    await runAboutToWorkViaHome(data);
  },

  enter() { window.scrollTo(0, 0); },

  afterEnter(data) {
    // Clear the static ring we painted — work-dial is not alive to own it,
    // and the case namespace never shows ticks.
    const ticks = document.querySelector('.dial_component .dial_layer-ticks');
    if (ticks) RHP.transitionDial?.clearCanvas?.(ticks);
    runAfterEnter(data);
  }
}
```

`runAfterEnter` then does the rest as it already does for `home-to-work`:
`setDialNs('work')`, `clearProps` on `dialFg`/`fgWrap`, `_updateCaseVideos()`
(no-op — src already matches, it early-returns), the `caseHandoff` seek
(`currentTime + 0.8`) and `views.case.init()`.

Bump `ORCHESTRATOR_VERSION` to `2026.8.12.1`.

### Trigger scope

No per-link opt-in. Barba matches on namespace, so **every** `<a href="/work/...">`
inside the about container gets this transition automatically. `barba.init`
already sets `preventRunning: true`, so a second click mid-transition is ignored,
and `prevent` only excludes `/privacy-policy` and `/404`.

---

## Barba impact

1. **Init/destroy lifecycle** — No new persistent DOM and no new listeners. The
   only additions are a canvas paint (cleared in `afterEnter`) and GSAP tweens on
   persistent elements, all of which `runAfterEnter`'s existing
   `clearProps: 'all'` on `.dial_layer-fg` and `#fg-video-wrap` already resets.
   `beforeLeave` destroys `views.about` (which now also tears down
   `caseVideoControls`, per `feat-about-case-video-controls`) and `videoLoader`.
2. **State survival** — Yes, deliberately: `RHP.videoState.caseHandoff` carries
   `{ index, currentTime, transitionDuration }` from the dial video to the case
   header video, consumed in `runAfterEnter` (orchestrator.js:1648-1660) and
   cleared there. Same contract as `home-to-work`.
3. **Transition interference** — Three known hazards, all handled:
   - `.dial_component.is-intro-small` would render the beat at
     `--dial-small-*`; explicitly removed.
   - `.dial_layer-fg` is `opacity: 0` on the home namespace in both hover media
     queries; explicitly set to 1, and `runDialExpandAnimation` re-asserts
     `opacity: 1` on its own `gsap.set`.
   - `.dial_layer-ui` is `clearProps`'d back to visible by `setDialToHomeState()`
     and would flash a stale title; pinned to 0 for the beat, and `runAfterEnter`
     re-asserts `opacity: 0` for the work namespace anyway.
   `homeAboutSlide.leaveAboutToHome` carries a 2 s `gsap.delayedCall` safety
   resolve, so a killed slide tween cannot hang `leave()`.
4. **Re-entry correctness** — about → work → about → work is clean:
   `work-to-about` (orchestrator.js:1931) calls `RHP.workDial?.destroy?.()` and
   `setDialToHomeState()`, returning the dial to the state this transition
   expects. The beat sets everything it depends on explicitly rather than
   assuming a prior state, so it is idempotent. Rapid clicks are blocked by
   `preventRunning: true`.
5. **Namespace scoping** — `from: ['about']`, `to: ['case','work']` only. Home
   and case pages are untouched; `home-to-work` keeps using
   `runDialExpandAnimation()` directly.

---

## Files touched

| File | Change | Est. LOC |
|------|--------|----------|
| `orchestrator.js` | split `_updateCaseVideos` → `_setFgVideoForSlug`; add `runAboutToWorkViaHome`; rewire `about-to-work`; version bump | ~70 |
| `transition-dial.js` | `paintInto()` / `clearCanvas()` exports; version bump | ~35 |
| `home-about-slide.js` | optional `{ duration }` on `leaveAboutToHome`; version bump | ~4 |

No `init.js` load-order change — all three modules already load.

---

## Known risks / accepted trade-offs

- **Background video is dark during the beat.** `.dial_bg-video` is owned by
  `work-dial`'s pool and is empty once work-dial is destroyed, so the beat plays
  against the dark page background rather than the home page's blurred backdrop.
  Acceptable — the backdrop is near-black anyway. Optional polish (deferred):
  point the bg video at the same teaser.
- **Dial label stays hidden.** Showing the target case's title/meta during the
  beat (from the matching `.dial_cms-item` `data-title`/`data-meta`) would be a
  nice touch; deferred to keep this change small.
- **1.85 s is long for a click-through.** All three constants
  (`VIA_HOME_SLIDE_DUR`, `VIA_HOME_HOLD`, and the `dur` inside
  `runDialExpandAnimation`) are tunable; expect one round of feel-tuning.
- **`runDialExpandAnimation()` has no safety-timeout resolve** (pre-existing —
  shared with `home-to-work`). If its tween is killed mid-flight, `leave()` never
  resolves. Not introduced here; flagged for a follow-up.

---

## Verify Loop

### Pass/fail criteria

| # | Condition | Observable |
|---|-----------|------------|
| 1 | It is a Barba transition, not a reload | `window.__rhpNavCount` (incremented via a test-side `barba.hooks.after` shim) increases; no `load` event; `window.RHP` object identity unchanged |
| 2 | Lands on the case study | `[data-barba="container"]` has `data-barba-namespace` of `work` (or `case`), and `location.pathname` matches the clicked href |
| 3 | Home beat is actually visible | Sampled ~0.9 s into the transition: `.dial_component` has `data-dial-ns="home"`, and `getComputedStyle($('.dial_layer-fg')).opacity === '1'` |
| 4 | Dial not stuck small | During the beat, `.dial_component` does **not** carry `is-intro-small`, and `$('.dial_layer-fg').getBoundingClientRect().width` is within 10 % of the computed `--dial-large-width` |
| 5 | Target teaser loaded, not a stale one | During the beat, `$('#fg-video-wrap > .dial_fg-video').src` is non-empty and equals the `data-video` (or `data-video-mobile`) of `.dial_cms-item[data-url="<slug>"]` |
| 6 | Ticks painted | During the beat, the `#dial_ticks-canvas` backing store is non-blank (sample `getImageData` for any non-zero alpha pixel) |
| 7 | Video handoff | After the swap, the case header video's `currentTime > 0` and it is playing |
| 8 | Dial ends in work state | After the transition settles: `.dial_component[data-dial-ns="work"]`, `.dial_layer-fg` has class `is-case-study`, `$('.dial_layer-ui')` opacity `0` |
| 9 | Ticks cleared | After the transition, the ticks canvas is blank again (or `opacity: 0`) |
| 10 | Reduced motion | With `prefers-reduced-motion: reduce`, navigation completes in < 1 s and criterion 2 still holds |
| 11 | No errors | Zero `pageerror` events across the whole navigation |
| 12 | Return path intact | work → about (nav about-link) still slides the curtain in and reveals about content |

### Reproduction steps

1. `https://rhpcircle.webflow.io/about`, wait for `window.RHP.scriptsOk === true`, +1.5 s.
2. Install sampling hooks (`barba.hooks.leave` → start a 60 fps sampler recording
   `data-dial-ns`, `.dial_layer-fg` opacity + width, fg video `src`, and canvas
   non-blankness).
3. Click the first `a[href^="/work/"]` inside `[data-barba-namespace="about"]`.
4. Assert 3–6 against the sample taken at ~0.9 s (after the 0.8 s slide, inside
   the 0.25 s hold).
5. Wait 2500 ms for the transition to settle → assert 1, 2, 7, 8, 9, 11.
6. Click the nav about-link, wait 2500 ms → assert 12.
7. Repeat 1–5 with `page.emulateMedia({ reducedMotion: 'reduce' })` → assert 10.

### Tier mapping

- **Tier 1 (auto, local):** criteria 1, 2, 4, 5, 8, 9, 10, 11, 12 —
  `tests/acceptance/feat-about-to-work-via-home-transition.spec.js`.
  Criteria 3 and 6 are sampled mid-transition and are timing-sensitive; they run
  as soft `test.info().annotations` (`design-drift`) rather than hard failures,
  because a slow CI frame can miss the 0.25 s window.
- **Tier 2 (auto, CDN regression):** registry id
  `feat-about-to-work-via-home-transition`.
- **Tier 3 (manual):**
  - Criterion 7 timing — whether playback *looks* continuous across the swap
    (frame-accurate continuity is subjective and codec-dependent).
  - Overall pacing: does 1.85 s feel right, or does the hold drag?
  - Mobile Safari: the beat on a real device, where `data-video-mobile` is used
    and iOS may refuse to autoplay the dial teaser without a gesture.
  - Safari/Firefox — Playwright runs Chromium only.

### Regression scope

Must not break:

- `home-to-work` (still calls `runDialExpandAnimation()` directly),
  `work-to-work`, `work-to-home`, `home-to-about`, `about-to-home`,
  `work-to-about`.
- `_updateCaseVideos()`'s existing callers in `runAfterEnter` and
  `bootCurrentView` — the refactor must be behaviour-preserving.
- `transition-dial`'s own `init/destroy` on `.home-transition-dial`
  (home intro + `runAfterEnter`).
- `about-to-home`'s 1 s slide duration (the new `duration` option defaults to 1).
- Existing suites to re-run: `about-to-home-barba-transition`,
  `rhp-case-transition-polish`, `fix-dial-step-text-and-work-to-about`,
  `fix-fg-video-case-to-case-barba`, `perf-fg-video-preload-on-transition`.

---

## Test Plan

**Tier 1 — Playwright local:** `tests/acceptance/feat-about-to-work-via-home-transition.spec.js`
**Tier 2 — CDN regression:** registry entry `feat-about-to-work-via-home-transition`
**Tier 3 — Manual:** handoff continuity, pacing, mobile Safari beat, Safari/Firefox.

## Acceptance Tests

| Test | Asserts |
|------|---------|
| `clicking a work link on about navigates via Barba, not a reload` | Criteria 1, 2 |
| `dial passes through the home state mid-transition` | Criteria 3, 4 (soft) |
| `dial loads the clicked case study teaser during the beat` | Criterion 5 (soft) |
| `dial ends in the work state with the UI hidden` | Criterion 8 |
| `ticks canvas is cleared after landing` | Criterion 9 |
| `case header video resumes from the handoff time` | Criterion 7 |
| `reduced motion skips the beats and lands quickly` | Criterion 10 |
| `about to work produces no console errors` | Criterion 11 |
| `work back to about still runs the curtain transition` | Criterion 12 |
