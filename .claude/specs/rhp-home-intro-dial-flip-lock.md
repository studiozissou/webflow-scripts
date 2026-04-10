# rhp-home-intro-dial-flip-lock

**Slug:** `rhp-home-intro-dial-flip-lock`
**Project:** `ready-hit-play-prod`
**Type:** feature (refinement of in-progress `rhp-home-intro-scroll-morph`)
**Priority:** P1
**Created:** 2026-04-09
**Status:** Planning → Ready to Build on approval

---

## Relationship to prior spec

This spec **refines and partially replaces** `rhp-home-intro-scroll-morph.md` (currently "Ready to Build", implementation in progress in the dirty working tree). The three-module decomposition stays (`home-intro.js` + `home-scroll-morph.js` + `home-about-slide.js`). What changes:

| Area | Prior spec / current code | This spec |
|---|---|---|
| Dial on page load | Live from frame one (`setIntroComplete`, `setAttractionEnabled(true)`, `onIntroComplete`, `onNavAnimationComplete` all fired immediately in `home-intro.run()`) | **Locked idle state** — no fg video, no tick growth, no project switching, no colour shift. Dial sits at `.home_dial-start` rect, small size. |
| Dial size/position morph | CSS-var tween (`--dial-live-width/height` small→large) + BCR delta | **GSAP Flip.fit() scrubbed** — dial element fitted to `.home_dial-start` on init, scrub-fitted to `.home_dial-middle` as `.section_home-intro` scrolls out (progress 0→1 = scroll 0%→100%). Flip owns the rect; CSS vars are set to `--dial-small-*` on init and `--dial-large-*` at completion. |
| Intro logo morph | x/y/scale BCR delta tween | **GSAP Flip.fit() scrubbed** — intro logo fitted to nav-logo target rect over the same scroll window. |
| Nav items at morph complete | `_animateNavIn()` in `home-scroll-morph.js` animates `.nav_logo-link`, `.nav_about-link`, `.nav_contact-link` with yPercent/xPercent tweens | **Removed.** Nav becomes visible via `.rhp-home-ready` CSS class toggle only — no GSAP animate-in. |
| `[data-text="step"]` / `.is-step` | Visible by default (z-index 5 only) | **Hidden on page load**, animated in at morph complete. GSAP tween lives in `home-intro.js`, fired by `home-scroll-morph.js` via an exposed `RHP.homeIntro.revealStep()` API. |
| Intro logo on page load | Visible from frame one | **Fades in** via GSAP (0.4s) after FOUC guard class is added. Inline CSS in `init.js` hides it with `opacity:0 !important` until `[data-barba="wrapper"].rhp-intro-logo-ready` is added. |
| Fg video on page load | Fades in via `home-intro.js` → `playIntroVideoASAP()` → IDLE generic video opacity 0→1 | **Suppressed.** Fg project video and the IDLE generic video both stay invisible on page load. Fg promotion only happens after morph complete. |

The `home-about-slide.js` module, the `.section_home-intro` CSS scoping, the `skipToEnd()` Barba re-entry path, and the `replay()` nav-logo-click path all stay as specified in the prior spec, with adjustments for the new Flip-based transition mechanism.

---

## Feature summary

On a fresh home load, the persistent `.dial_component` is fitted to an empty `.home_dial-start` slot (small, idle visual). All dial activity is frozen — no fg video, no tick animation, no sector switch, no colour shift. The intro logo (`.nav_logo-wrapper-2:not(.is-nav)` inside `.home-intro_logo-slot`) fades in and hosts an optional desktop hover reveal. Step text (`[data-text="step"]` / `.is-step`) is hidden.

As the user scrolls through the 100vh `.section_home-intro`, a scrubbed GSAP timeline runs two `Flip.fit` tweens in parallel: the dial fits from its `.home_dial-start` rect to the `.home_dial-middle` rect, and the intro logo fits from its natural slot position to the `.nav_logo-wrapper-2.is-nav` target rect inside `.nav_logo-link`.

At scroll end (section out of view → ScrollTrigger `onLeave`), the morph is committed: the dial's live CSS vars are set to `--dial-large-*`, the `.rhp-home-ready` class is added to the wrapper (revealing nav items via the existing FOUC CSS rule), the intro logo is hidden, the real nav logo takes over, step text animates in (via `RHP.homeIntro.revealStep()`), and the dial is fully unlocked (`setIntroComplete`, `setAttractionEnabled(true)`, `onIntroComplete`, canvas redraw).

All Barba re-entry paths (about→home, case→home handoff) continue to use `homeScrollMorph.skipToEnd()` and land directly in the completed state.

---

## Requirements

### Page-load state (pre-scroll)

1. **Dial** — persistent `.dial_component` is fitted (via `Flip.fit` instant) to `.home_dial-start`'s bounding rect. `--dial-live-width/height` are set to `var(--dial-small-width/height)`. Work-dial is initialised with `{ introMode: true }` so `introComplete = false`, `interactionUnlocked = false`, `attractionEnabled = false`, `dialState = IDLE`.
2. **No fg video** — the `.dial_fg-video` (project video) stays at opacity 0. No `.dial_fg-video` activity until morph complete.
3. **No generic idle video** — the `.dial_generic-video` (created by work-dial at init) also stays at opacity 0. The existing `home-intro.js` code that fades it in (`playIntroVideoASAP`) is deleted.
4. **No tick growth / colour shift / project switching** — handled by `interactionUnlocked = false` in work-dial. Tick draw loop continues (the canvas still paints) but with `attractionEase = 0` and `sectorGradientMix` held at the IDLE baseline. Verify work-dial's existing `IDLE` state draws produce the visual the user wants — if not, add a `setDialFrozen(true)` gate in work-dial that suppresses `attractionEnabled` drawing and the sector-dot fade-in.
5. **Step text hidden** — `[data-text="step"]` / `.is-step` are hidden via an inline CSS rule injected by `init.js`: `opacity: 0; visibility: hidden` while `[data-barba="wrapper"]:not(.rhp-home-ready)` is the ancestor.
6. **Intro logo fades in** — `.nav_logo-wrapper-2:not(.is-nav)` inside `.home-intro_logo-slot` starts at `opacity: 0` via an inline CSS FOUC rule in `init.js`. After `home-intro.run()` executes, GSAP tweens it to `opacity: 1` (`duration: 0.4, ease: 'power2.out'`). The `.rhp-intro-logo-ready` class is added to the wrapper to release the CSS hold.
7. **Desktop hover on intro logo** — existing `_initIntroLogoHover` behaviour is retained (desktop: about-hero-style text reveal on mouseenter/leave; mobile: scroll-driven via scrub timeline). No change here.
8. **Lenis** — started so the 100vh scroll window can progress. `RHP.scroll.lock()` is NOT applied yet.

### Scroll-locked transition (scroll 0% → 100% of `.section_home-intro`)

1. **ScrollTrigger** — `trigger: .section_home-intro`, `start: 'top top'`, `end: '+=100%'`, `scrub: 0.5`, `invalidateOnRefresh: true`. Section out of view = progress 1.
2. **Dial Flip scrub** — a scrubbed tween whose vars are the output of `Flip.fit(dial, homeDialMiddle, { scale: true, getVars: true })` animates the dial from its current fit (start slot) to the middle slot's rect.
3. **Intro logo Flip scrub** — same pattern, vars from `Flip.fit(introLogo, navLogoTarget, { scale: true, getVars: true })` where `navLogoTarget = .nav_logo-link .nav_logo-wrapper-2.is-nav`.
4. **Mobile text reveal** — existing `canHover() === false` path still reveals `.is-about-upper` / `.is-about-lower` text within the scrub timeline. Unchanged from current implementation.
5. **No step text during scroll** — step text remains hidden throughout the scroll window. Only revealed after `onLeave`.

### Morph-complete state (onLeave)

1. **Commit dial size via CSS vars** — `gsap.set('.dial_component[data-dial-ns="home"]', { '--dial-live-width': 'var(--dial-large-width)', '--dial-live-height': 'var(--dial-large-height)' })`. This replaces the Flip transform with a CSS-owned final size. Canvas resize listener fires and redraws.
2. **Add `.rhp-home-ready` class** to `[data-barba="wrapper"]`. Nav items become visible via existing FOUC CSS (`.nav_logo-link`, `.nav_about-link`, `.nav_contact-link` opacity hold is released).
3. **Hide intro logo** — the intro logo `.nav_logo-wrapper-2:not(.is-nav)` is set to `opacity: 0, display: none`. The real `.is-nav` logo is now the only visible logo.
4. **Hide `.section_home-intro`** — `display: none` via `gsap.set`.
5. **Reveal step text** — call `RHP.homeIntro.revealStep()`, which fades/slides in `[data-text="step"]` / `.is-step` elements (`opacity 0→1`, `y: 10→0`, `duration: 0.6`, `ease: 'power2.out'`, `stagger: 0.05`).
6. **Unlock dial** — call `workDial.setIntroComplete()`, `workDial.setAttractionEnabled(true)`, `workDial.onIntroComplete()`. (These are the lines currently at the top of `home-intro.run()` — they move to `_applyCompleteState()` in `home-scroll-morph.js`.)
7. **Lock scroll** — `RHP.lenis.stop()`, `RHP.scroll.lock()`. Dispatch synthetic `resize` so work-dial re-reads its rect.
8. **Redraw canvas** — `redrawDialCanvas()` (existing helper in `home-scroll-morph.js`).
9. **No `_animateNavIn`** — this function is deleted entirely. Nav visibility is owned by the CSS FOUC class only.

### Barba re-entry (skip path)

`homeScrollMorph.skipToEnd(container)` must still work. Updated behaviour:
- Query `.home_dial-start`, `.home_dial-middle`, dial, intro logo, nav target.
- Fit the dial directly to `.home_dial-middle` rect via `Flip.fit` (instant, no tween).
- Set `--dial-live-width/height` to `var(--dial-large-*)`.
- Hide `.section_home-intro` and intro logo.
- Add `.rhp-home-ready` class.
- Call `_applyCompleteState()` (unlocks dial, locks scroll, reveals step text).
- Does NOT animate anything — instant.

### Replay (nav logo click on home)

`homeScrollMorph.replay()` existing behaviour is preserved with updates:
- Guarded by `_resizeHandler` presence (only works on fresh loads).
- Removes `.rhp-home-ready` class.
- Re-shows `.section_home-intro`.
- Re-fits the dial to `.home_dial-start`.
- Re-shows intro logo (opacity 1, display flex).
- Hides step text again via CSS ancestor (class removal re-applies FOUC hide).
- Rebuilds the scrub timeline.
- Unlocks scroll so user can scroll again.

### Re-entry with handoff (case → home)

`RHP.views.home.resume(container, handoff)` continues to:
- Call `homeScrollMorph.destroy()`.
- Lock scroll.
- Call `workDial.resume(handoff)` (restores ACTIVE state on the previous project).
- Call `homeScrollMorph.skipToEnd(container)` — this lands the dial at `.home_dial-middle` with the handoff video still playing.

---

## Architecture

### Flip.fit mechanic

`Flip.fit(el, target, { scale: true, getVars: true })` returns `{ x, y, scale, ... }` transform vars that would make `el` occupy `target`'s bounding rect. Combined with a scrubbed ScrollTrigger, this yields scroll-linked position/scale morphing without reparenting.

Pattern inside `home-scroll-morph.buildTimeline()`:

```js
// Initial fit — runs once on init before the scroll timeline.
const startVars = Flip.fit(dialEl, homeDialStartEl, { scale: true, getVars: true });
gsap.set(dialEl, startVars);

// Scrubbed fit to target.
const scrubTL = gsap.timeline({
  scrollTrigger: {
    trigger: sectionEl,
    start: 'top top',
    end: '+=100%',
    scrub: 0.5,
    onLeave: onMorphComplete,
    onEnterBack: onMorphReverse,
    invalidateOnRefresh: true
  }
});

const dialEndVars = Flip.fit(dialEl, homeDialMiddleEl, { scale: true, getVars: true });
const logoEndVars = Flip.fit(introLogoEl, navLogoTargetEl, { scale: true, getVars: true });

scrubTL
  .to(dialEl, { ...dialEndVars, ease: 'none' }, 0)
  .to(introLogoEl, { ...logoEndVars, ease: 'none' }, 0);

// Mobile text reveal tweens (existing behaviour) also added at position 0.
```

**Critical:** `Flip.fit` computes the target rect at the moment it's called. If the user resizes during the scroll window, the end state drifts. Handle via `invalidateOnRefresh: true` on the ScrollTrigger and a debounced resize handler that rebuilds the timeline (existing `_resizeHandler` pattern).

### CSS-var fallback on completion

After `onLeave`, the dial's transform-based size is swapped for a CSS-var size:

```js
// At morph-complete
const finalVars = Flip.fit(dialEl, homeDialMiddleEl, { scale: true, getVars: true });
gsap.set(dialEl, finalVars); // snap to final, in case scrub was mid-tween
// Then commit to CSS vars
dialEl.style.setProperty('--dial-live-width', 'var(--dial-large-width)');
dialEl.style.setProperty('--dial-live-height', 'var(--dial-large-height)');
// Clear transform
gsap.set(dialEl, { clearProps: 'transform,x,y,scale' });
```

**Risk:** The CSS-var size produces a different element rect than the Flip.fit'd transform rect. If `.home_dial-middle` is sized to exactly match `--dial-large-width/height` (by being the CSS var itself in Webflow Designer), this swap is seamless. Otherwise there's a visible jump.

**Mitigation:** Document that `.home_dial-middle` must be sized to `--dial-large-width` × `--dial-large-height` in Webflow Designer. Add this to Designer prereqs.

### Intro logo handoff on completion

After `onLeave`:

```js
gsap.set(introLogoEl, { opacity: 0, display: 'none' });
wrapper.classList.add('rhp-home-ready'); // reveals real .is-nav logo via FOUC CSS
```

The real nav logo `.nav_logo-link > .nav_logo-wrapper-2.is-nav` is always in the DOM. It's hidden by `init.js`'s inline FOUC rule until `.rhp-home-ready` is added. The handoff is frame-perfect because the intro logo is fitted to the nav target's exact rect at the moment of `onLeave`.

### Step text reveal API

New function in `home-intro.js`:

```js
const RHP = window.RHP;
// ...
function revealStep() {
  if (!container) return;
  const stepEls = container.querySelectorAll('[data-text="step"], .is-step');
  if (!stepEls.length) return;
  if (prefersReducedMotion()) {
    gsap.set(stepEls, { opacity: 1, y: 0 });
    return;
  }
  gsap.fromTo(stepEls,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.05 }
  );
}
RHP.homeIntro = { run, skip, revealStep, destroy, version };
```

Called by `home-scroll-morph._applyCompleteState()`:
```js
RHP.homeIntro?.revealStep?.();
```

### Locked dial state mechanics

Option A (minimal): Rely on existing `introMode: true` gating in work-dial. Do NOT call `setIntroComplete()` or `setAttractionEnabled(true)` or `onIntroComplete()` from `home-intro.run()`. These are deferred to `home-scroll-morph._applyCompleteState()`. The dial stays in IDLE with `interactionUnlocked = false`, `introComplete = false`, `attractionEnabled = false`, `dialState = IDLE`.

**Verify work-dial's existing IDLE draw produces the "no fg video, no tick growth, no colour shift" visual the user wants.** Specifically:
- `dialState = IDLE` → fg layer opacity 0 (no fg video visible) ✓
- `attractionEnabled = false` → `attractionEase = 0` → ticks at baseline length ✓
- `interactionUnlocked = false` → no sector switch ✓
- Colour shift: depends on `sectorGradientMix` which reads the active project index. In IDLE with no interaction, colour should stay at baseline.

If IDLE state doesn't fully suppress everything the user wants (e.g. the generic idle video continuing to fade in autonomously via the work-dial constructor, or the sector dot fading in at `introComplete`), add Option B.

Option B (explicit gate): Add a `frozen` flag to work-dial that, when true, suppresses:
- Generic idle video opacity tween
- Sector dot fade-in on `setIntroComplete`
- Any autonomous animation in the draw loop beyond the static IDLE canvas
- Expose `workDial.setFrozen(true/false)`. Call `setFrozen(true)` at init, `setFrozen(false)` in `_applyCompleteState()`.

**Recommendation:** Start with Option A. Only add Option B if Playwright tests or manual verification show the dial isn't fully static on load. Document in build tasks as a "check in /build" action.

### Dial geometry + canvas at the small size

The dial canvas (`#dial_ticks-canvas`) reads its size from `getBoundingClientRect()` at init and on resize. When the dial is fitted to `.home_dial-start` (small rect), the canvas must redraw at that size. Options:

A) **Canvas at full large size, scaled via transform.** The canvas is sized to the large rect once at work-dial init, and Flip.fit just applies a `transform: scale(X)` to the whole `.dial_component` to make it appear small. The canvas is pixel-perfect at large and interpolated at small. Cheap, but text/ticks may look blurry at small.

B) **Canvas re-sized on Flip fit.** Synthetic `resize` event fires after each Flip.fit call; work-dial re-reads rect and re-draws at the new size. More expensive, pixel-perfect.

**Recommendation:** Option A. The small rect is only seen for ~100vh of scroll — a transform-based scale is acceptable. Canvas is sized once at the large rect. This matches how `Flip.fit` with `scale: true` works naturally. No new canvas logic needed.

**Mitigation for text legibility at small size:** If dial text (step text, meta text) is unreadable at scale, we can hide the dial UI layer (`.dial_layer-ui`) via opacity 0 during the locked state, since the user wants it hidden anyway.

---

## Files affected

| File | Change type | Lines |
|---|---|---|
| `projects/ready-hit-play-prod/home-intro.js` | Major refactor | ~60 changed |
| `projects/ready-hit-play-prod/home-scroll-morph.js` | Major refactor (Flip.fit + removed animateNavIn) | ~150 changed |
| `projects/ready-hit-play-prod/init.js` | FOUC CSS additions; version bump | ~15 changed |
| `projects/ready-hit-play-prod/ready-hit-play.css` | Add `.home_dial-start`/`.home_dial-middle` placeholder styles, `.is-step` hidden state, intro logo FOUC | ~30 added |
| `projects/ready-hit-play-prod/orchestrator.js` | Verify call order; bump version; no logic change expected | ~5 changed |
| `projects/ready-hit-play-prod/work-dial.js` | Possibly add `setFrozen()` if Option A insufficient | 0–30 |
| `projects/ready-hit-play-prod/package.json` | no change | 0 |

### Webflow Designer prerequisites (manual)

1. **Add `.home_dial-start`** — an empty `<div class="home_dial-start">` inside `.section_home-intro`, sized and positioned to match the desired small dial rect (`6rem × 6rem` or whatever matches `--dial-small-width/height`). Positioned where the dial should visually begin (likely centred within the intro section, above or below the intro logo slot depending on design).
2. **Add `.home_dial-middle`** — an empty `<div class="home_dial-middle">` inside the home namespace but outside `.section_home-intro` (so it's at the dial's final resting position). Sized to match `--dial-large-width/height`.
3. **Confirm intro logo** — `.nav_logo-wrapper-2:not(.is-nav)` is already inside `.home-intro_logo-slot`. No change needed.
4. **Confirm nav target** — `.nav_logo-link > .nav_logo-wrapper-2.is-nav` already exists. No change needed.
5. **Confirm `.home_dial-start` and `.home_dial-middle` sizes match the dial's rendered sizes at each stage.** If the middle slot is smaller than `--dial-large-width/height`, the post-completion CSS var swap will cause a visible jump.

**Blocker if prereqs not done:** The feature cannot be built without these Designer elements. `/build` must pause and prompt for Designer confirmation before touching JS.

---

## Barba Impact

1. **Init/Destroy lifecycle**
   - `home-intro.js`: `init/run/skip/destroy` — adds no ScrollTriggers, no resize listeners. The new `revealStep()` creates a one-shot tween that doesn't need explicit kill (plays to completion or is overridden). Still, the GSAP context pattern is used for safety.
   - `home-scroll-morph.js`: Already has `init/destroy/skipToEnd/replay`. The Flip.fit approach doesn't add new lifecycle concerns because `Flip.fit` just returns tween vars — no new listeners. The scrub timeline still needs the explicit `scrubTL.scrollTrigger.kill() → scrubTL.kill() → ctx.revert()` teardown (already in place).
   - `work-dial.js`: If Option B frozen flag is added, it's a module-scope variable, reset on `destroy()` along with `introComplete` etc. No new cleanup burden.

2. **State survival**
   - `RHP.videoState.caseHandoff` is set by `beforeLeave` on case→home. `resume(handoff)` uses it to restore the ACTIVE dial video. This continues to work because `skipToEnd()` runs after `resume()` — the dial is already ACTIVE with the handoff video, and `skipToEnd()` just hides the intro section and lands at the large size. **No change needed.**
   - The new locked-idle state does NOT persist across transitions; it only applies on a fresh home load. On Barba re-entry, `skipToEnd()` bypasses the locked state entirely.

3. **Transition interference**
   - The Flip scrub operates on `.dial_component` which is OUTSIDE the Barba container. This is deliberate (namespace restructure 2026-03-12) and already handled. Barba leave/enter animations operate on `[data-barba="container"]` which is inside `.dial_layer-fg`. No z-index conflicts expected.
   - The intro logo lives inside `[data-barba-namespace="home"]` (inside `.home-intro_logo-slot`). When leaving home for about/case, the intro logo's Flip transforms must be cleared to avoid stale transforms on the next home entry. `destroy()` calls `ctx.revert()` which should clear them.

4. **Re-entry correctness**
   - Fresh home load → full intro flow.
   - About → home → `about-to-home` Barba transition calls `homeScrollMorph.skipToEnd()` in `enter`, then `runAfterEnter` calls `homeIntro.skip()` and `views.home.init()`. The `skip()` path must NOT eagerly unlock the dial (since the dial is already ACTIVE from the handoff in the handoff case, or needs to be unlocked via `_applyCompleteState` via `skipToEnd`).
   - Case → home → `resume(handoff)` restores ACTIVE, then `skipToEnd()` lands at the completed state.
   - Home → about → home → fresh intro is skipped, dial is at large. Correct.

5. **Namespace scoping**
   - All scroll-morph logic runs only on `data-barba-namespace="home"`. Confirmed via orchestrator's `bootCurrentView` and Barba hook logic.
   - `work-dial` persists across namespaces but the frozen/locked state only applies to `home`.
   - The inline FOUC CSS for `.is-step` and intro logo is scoped to `[data-barba="wrapper"]:not(.rhp-home-ready)` (ancestor rule) — it only hides these elements on home pre-morph-complete. On about/case, `.rhp-home-ready` is set (or the elements don't exist there), so no hiding.

---

## Approach exploration

User answers converged on a single approach (Flip.fit scrubbed + existing CSS-var system + existing hover preserved). Three-way exploration skipped because each decision was explicit:

- Flip mechanism: `Flip.fit()` in scrubbed timeline (user-selected)
- Dial size system: CSS vars with Flip handling rect (user-selected)
- Logo selectors: reuse existing `.nav_logo-wrapper-2` + `.is-nav` (user-selected)
- Fg video suppression: suppress only fg video, keep generic idle video option → **user actually chose "Suppress only the fg-video (project video)"** — re-read confirms they want generic IDLE video behaviour untouched. **This contradicts the "no fg video" requirement if interpreted literally.** See Clarification #1 below.

### Clarifications captured post-questioning

**Clarification #1 — "no fg video" vs "generic idle video":** The user selected "Suppress only the fg-video (project video)". This means the generic idle video CAN continue to fade in on page load (per current `home-intro.playIntroVideoASAP()` behaviour). However, the user's original feature description said "no fg video visible". Interpreting: "fg video" in the user's language = the project `.dial_fg-video` (the active project's video). The generic `.dial_generic-video` is the IDLE backdrop and can stay visible.

**Implication:** `home-intro.playIntroVideoASAP()` stays (it fades in `.dial_generic-video`). What gets removed from `home-intro.run()` is the dial-unlock chain (`setIntroComplete`, `setAttractionEnabled`, `onIntroComplete`, `onNavAnimationComplete`) — those move to `_applyCompleteState()`. The IDLE generic video continues to play from frame one.

**But:** Work-dial's `setIntroComplete()` is what fades in the sector dot (mobile). If we don't call it, the sector dot stays hidden throughout the locked state. Since the dial is small and visually de-emphasised, this is probably desired.

**Also:** The `playIntroVideoASAP()` function calls `RHP.workDial.getIntroVideoEl()` to get the generic video element. This returns `genericVideo` created inside work-dial. The generic video's initial opacity is 0 (set at creation in work-dial line 276–286). `home-intro` fades it to 1. **This is the "IDLE backdrop" and the user wants it kept.** Confirmed — we retain `playIntroVideoASAP`.

### One-line summary of the approach

**Flip.fit scrubbed morph** + **CSS-var commit on completion** + **deferred dial unlock** + **FOUC CSS for intro logo + step text** + **delete `_animateNavIn`** + **step text reveal API on `home-intro.js`** + **retain generic IDLE video fade-in**.

---

## Task breakdown

Ordered tasks for `/build`. Each task is ~50–150 LOC or a single Designer change.

| # | Task | Agent | Est. LOC | Depends on |
|---|---|---|---|---|
| 0 | **Designer prereqs** — add `.home_dial-start` and `.home_dial-middle` slot divs in Webflow Designer; confirm sizes match `--dial-small-*` and `--dial-large-*`. USER action, not agent. Pauses `/build`. | — (user) | — | — |
| 1 | **CSS: FOUC rules + step text hidden state + dial slot placeholders** — add to `ready-hit-play.css`: `.home_dial-start`/`.home_dial-middle` placeholder styles (likely `pointer-events: none; opacity: 0; position: relative`), `[data-text="step"]`/`.is-step` hidden state scoped to `[data-barba="wrapper"]:not(.rhp-home-ready) [data-dial-ns="home"]`, intro logo `opacity: 0` until `.rhp-intro-logo-ready` class. | code-writer | 30 | 0 |
| 2 | **init.js: inline FOUC CSS block updates + version bump** — add the new CSS rules to the inline FOUC block in init.js so they apply synchronously before paint. Bump `CONFIG.version`. | code-writer | 15 | 1 |
| 3 | **home-intro.js refactor: defer dial unlock, add `revealStep()` API, retain playIntroVideoASAP, add intro logo fade-in** — remove the 4 eager unlock calls from `run()`. Add `revealStep()` function. Add intro logo fade-in tween (0.4s) after `playIntroVideoASAP()`. Add `.rhp-intro-logo-ready` class. Expose `revealStep` on `RHP.homeIntro`. | code-writer | 60 | 2 |
| 4 | **home-scroll-morph.js refactor: Flip.fit scrubbed tweens, delete `_animateNavIn`, call `revealStep` and dial-unlock chain in `_applyCompleteState`, update `skipToEnd` to use Flip.fit** — delete `_animateNavIn`/`_animateNavOut`, replace CSS-var-tween mechanic with `Flip.fit(dial, start) → scrubbed Flip.fit(dial, middle)` and `Flip.fit(logo, navTarget)`. Update `_applyCompleteState` to call `setIntroComplete`, `setAttractionEnabled(true)`, `onIntroComplete`, `homeIntro.revealStep`, plus commit `--dial-live-*` to large. Update `skipToEnd` to use `Flip.fit` instant. Update `replay` to re-fit start. | code-writer | 150 | 3 |
| 5 | **orchestrator.js: verify call order, remove any references to the deleted `_animateNavIn`, version bump** — confirm `bootCurrentView` still calls `workDial.init({introMode:true})` then `homeIntro.run()` then `homeScrollMorph.init()` via the complete event. | code-writer | 5 | 4 |
| 6 | **work-dial.js check + optional frozen flag** — manual or playwright check that `IDLE + introMode + !introComplete + !attractionEnabled + !interactionUnlocked` produces no fg video, no tick growth, no colour shift, no sector switch. If anything leaks (e.g. generic video auto-plays without intro-fade, or sector dot auto-shows), add `setFrozen(bool)` gate. | code-writer (conditional) | 0–30 | 5 |
| 7 | **Verify Tier 1 acceptance tests** — run `npx playwright test tests/acceptance/rhp-home-intro-dial-flip-lock.spec.js` against localhost / staging. Iterate fixes. | qa | — | 6 |
| 8 | **Manual Tier 3 verification** — human scrolls the page, confirms dial idle state, scroll-linked morph, step text reveal, no nav animate-in, reduced motion fallback, iOS touch scroll, Barba re-entry. | — (user) | — | 7 |

### Agents needed

- **code-writer** — tasks 1–6
- **qa** — task 7
- **user (manual)** — tasks 0, 8

### Parallelisation Map

Referring to the `parallelisation` skill:

**Dependency graph:**
```
Task 0 (Designer) ──┐
                    ↓
Task 1 (CSS)        Task 2 (init.js) — depends on Task 1
                                      │
                                      ↓
                    Task 3 (home-intro.js) — depends on Task 2
                                      │
                                      ↓
                    Task 4 (home-scroll-morph.js) — depends on Task 3
                                      │
                                      ↓
                    Task 5 (orchestrator.js)
                                      │
                                      ↓
                    Task 6 (work-dial.js conditional)
                                      │
                                      ↓
                    Task 7 (tests) → Task 8 (manual)
```

**Independent streams:** None — every task depends on the previous one because:
- CSS FOUC rules are referenced by init.js inline block
- init.js FOUC + revealStep API must exist before home-scroll-morph.js can call it
- home-scroll-morph.js is the most complex module and depends on all prior setup
- Tests run after all code is in place

**Recommendation: SEQUENTIAL.** Do not parallelise. No worktrees. No agent teams.

**Rationale:** All changes are in a single module chain (`init.js → CSS → home-intro.js → home-scroll-morph.js → orchestrator.js`). The total surface is ~260 LOC across 5 files. Parallelising would introduce merge friction on a linear dependency chain with little speedup. One code-writer agent working sequentially is optimal.

---

## Architectural decisions (ADR candidates)

None of these rise to ADR level on their own — they're refinements of existing ADR-level decisions (module split, persistent dial, CSS-var system). **No new ADR required.** Notable decisions documented inline:

1. **Flip.fit() over Flip.from() + reparenting** — chosen because it doesn't modify the DOM tree, reducing Barba container interference.
2. **CSS-var commit on completion** — chosen to hand ownership back to the existing CSS system post-morph, matching the existing pattern.
3. **`revealStep` API on `home-intro.js` called by `home-scroll-morph.js`** — chosen per user preference that the GSAP animation live in `home-intro.js`.
4. **Deferred dial unlock** — chosen over a "frozen" flag to minimise work-dial surgery; fallback to `setFrozen()` if IDLE state isn't fully static.

---

## Verify Loop

### Pass/fail criteria

**Pre-scroll (page load, after `window.RHP.scriptsOk === true`):**

- `.dial_component[data-dial-ns="home"]` is attached and visible.
- `.dial_component` has a CSS transform indicating it's fitted to `.home_dial-start` rect (`getBoundingClientRect()` matches `.home_dial-start.getBoundingClientRect()` within ±2px).
- `.dial_fg-video` has `opacity === 0`.
- `[data-text="step"]` or `.is-step` computed `opacity === 0` OR `visibility === 'hidden'`.
- `.nav_logo-wrapper-2:not(.is-nav)` inside `.home-intro_logo-slot` has `opacity === 1` after 500ms (fade-in complete).
- `[data-barba="wrapper"]` does NOT have `rhp-home-ready` class.
- `[data-barba="wrapper"]` has `rhp-intro-logo-ready` class.
- `window.RHP.workDial.__testing?.isUnlocked?.() === false` (if exposed) OR: `.dial_layer-fg` has `opacity === 0` (fg video invisible, proxy for `dialState === IDLE`).
- No console errors.

**Mid-scroll (scroll position ~50% through `.section_home-intro`):**

- `.dial_component` rect is between `.home_dial-start` rect and `.home_dial-middle` rect (interpolated, bounded).
- `.nav_logo-wrapper-2:not(.is-nav)` rect is between its start slot rect and the `.nav_logo-wrapper-2.is-nav` target rect.
- No console errors.

**Post-scroll (scroll past `.section_home-intro` bottom, wait 1.5s):**

- `[data-barba="wrapper"]` has `rhp-home-ready` class.
- `.dial_component` rect matches `.home_dial-middle` rect (within ±2px).
- `.dial_component` computed `--dial-live-width` equals `var(--dial-large-width)` evaluated.
- `[data-text="step"]` or `.is-step` computed `opacity > 0`.
- `.nav_logo-link .nav_logo-wrapper-2.is-nav` is visible (opacity > 0).
- `.nav_logo-wrapper-2:not(.is-nav)` (intro logo) is hidden (`display: none` or `opacity: 0`).
- `.section_home-intro` computed `display === 'none'`.
- `window.RHP.scroll.locked === true` (if exposed) OR: `document.documentElement.style.overflow === 'hidden'`.
- `window.RHP.lenis` is stopped (if exposed).
- Work-dial responds to cursor movement (drag the dial or hover a sector — fg video should promote, tick colour should shift, project should change).
- No console errors.

**Reduced motion (`prefers-reduced-motion: reduce`):**

- On page load, dial is already at `.home_dial-middle` rect (no scroll required).
- `.rhp-home-ready` is applied within 500ms of page load.
- Step text is visible.
- No scrubbed scroll tween runs.
- No console errors.

**Barba re-entry (about → home):**

- Dial lands at `.home_dial-middle` immediately on enter (no visible morph).
- `.rhp-home-ready` is present.
- Intro section is hidden.
- Step text is visible.
- Dial is interactive.
- No console errors.

**Case → home handoff:**

- Dial lands at `.home_dial-middle` with the previous project's fg video playing (`.dial_fg-video` opacity > 0).
- `.rhp-home-ready` is present.
- Dial is interactive.
- No console errors.

### Reproduction steps

**Tier 1 (Playwright):**

1. Navigate to `STAGING_URL` (or `http://localhost:<port>/` with `?rhp=local`).
2. `waitForRHP(page)` → 1500ms settle.
3. Assert pre-scroll pass/fail criteria.
4. `page.evaluate(() => window.scrollTo(0, window.innerHeight))` → wait 800ms.
5. Assert mid-scroll criteria.
6. `page.evaluate(() => window.scrollTo(0, window.innerHeight * 2))` → wait 1500ms.
7. Assert post-scroll criteria.
8. Repeat with reduced motion context → assert reduced motion criteria.
9. Navigate `/` → `/about/` → `/` → assert Barba re-entry criteria.

**Tier 3 (manual):**

1. Open `https://rhpcircle.webflow.io/` in a fresh tab (incognito to bypass cache).
2. Observe dial is small, positioned at `.home_dial-start`, no fg video, intro logo fading in.
3. Scroll slowly — observe dial and intro logo morphing smoothly to their targets.
4. Scroll past section end — observe nav logo appearing (instantly, no animate-in), dial at large, step text fading in.
5. Hover a dial sector — observe fg video promotion, colour shift, tick growth.
6. Click a sector — observe project engagement.
7. Click nav logo — observe replay (scroll unlocks, dial scrolls back to start, intro re-shows).
8. Navigate to `/about/` via nav → observe Barba transition.
9. Navigate back to `/` via nav → observe dial lands at large instantly, no intro replay, no step text animate-in (already visible).
10. Engage a project → click to case page → click back → observe dial still at ACTIVE with same project.
11. Safari test: repeat 1–4 on Safari desktop + Safari iOS.
12. Mobile at 375px wide: observe sticky slot behaviour, intro logo Flip target is still correct.
13. `prefers-reduced-motion: reduce` in DevTools → reload → observe no scroll tween, dial already at large.

### Tier mapping

**Tier 1 — Auto (Playwright, `tests/acceptance/rhp-home-intro-dial-flip-lock.spec.js`):**

- `pre-scroll: dial at start slot, no fg video, step text hidden, intro logo visible, no rhp-home-ready class`
- `mid-scroll: dial between start and middle`
- `post-scroll: rhp-home-ready added, dial at middle, step text visible, intro logo hidden, section hidden, scroll locked`
- `reduced motion: lands at complete state immediately`
- `no console errors on load and scroll`
- `Barba about→home: land at complete state`
- `Barba home→about→home: clean re-entry, no doubled nodes`

**Tier 2 — CDN regression (`tests/registry.json` entry):**

- Registered as `rhp-home-intro-dial-flip-lock` with `type: "acceptance"`, `source: "plan"`, `critical: false`.

**Tier 3 — Manual (checklist):**

- Visual smoothness of Flip.fit scrub at 60fps (animation feel, not verifiable by Playwright).
- Canvas legibility when dial is scaled small (subjective — is text/ticks readable?).
- Safari iOS: video autoplay policies, touch scroll inertia, sticky slot layout.
- Firefox: CSS `:has()` support for `.section_home-intro` scoping.
- Nav logo click → replay — visually correct (Playwright can assert state but not "feel").
- `.home_dial-middle` Designer-set size matches `--dial-large-*` (if mismatched, a visible jump appears; only a human eye can confirm "looks seamless").

### Regression scope

**Must NOT break:**

- `case → home` handoff: previous project video still plays at ACTIVE state (`RHP.videoState.caseHandoff`).
- `about → home` Barba transition: `homeScrollMorph.skipToEnd()` still works.
- `home → about` Barba transition: no stale Flip transforms on home re-entry.
- Work-dial sector switching, drag interaction, cursor states — unchanged post-morph.
- `.rhp-home-ready` class FOUC pattern for nav items — still honoured.
- `home-about-slide.js` transitions — untouched.
- Other modules on home (`cursor`, `transition-dial`, `video-loader`, `work-nav`) — untouched.
- `.nav_logo-link` click-to-replay (existing `initNavLogoLink` in orchestrator).
- Canvas tick colours, sector dot, drag deadzone — unchanged post-morph.

### Self-check

> "Does this answer 'how does `/build` know this feature is working?'"

Yes. Playwright assertions on DOM state, CSS classes, computed opacity, bounding rects, and console errors produce a binary pass/fail. Manual Tier 3 exists only for subjective feel + cross-browser not covered by Chromium. The pass/fail criteria are observable and concrete, not "it should work".

---

## Test Plan

### Tier 1 — Auto (Playwright local)

File: `projects/ready-hit-play-prod/tests/acceptance/rhp-home-intro-dial-flip-lock.spec.js`

Tests:
- `pre-scroll: dial is fitted to home_dial-start slot`
- `pre-scroll: fg video is hidden (opacity 0)`
- `pre-scroll: step text is hidden`
- `pre-scroll: intro logo fades in within 500ms`
- `pre-scroll: rhp-home-ready class is absent`
- `pre-scroll: rhp-intro-logo-ready class is present`
- `pre-scroll: no nav logo animate-in tween on nav items (position not translated)`
- `mid-scroll: dial rect is between start and middle slot rects`
- `mid-scroll: intro logo rect is between start slot and nav target rects`
- `post-scroll: rhp-home-ready class is added`
- `post-scroll: dial rect matches home_dial-middle`
- `post-scroll: --dial-live-width equals --dial-large-width`
- `post-scroll: step text is visible (opacity > 0)`
- `post-scroll: nav .is-nav logo is visible`
- `post-scroll: intro logo is hidden`
- `post-scroll: section_home-intro display none`
- `post-scroll: scroll is locked (documentElement overflow hidden)`
- `post-scroll: dial becomes interactive (hover simulates sector promotion)`
- `no JS errors on page load`
- `no JS errors after scroll through intro`
- `reduced motion: lands at completed state on load (no scroll required)`
- `reduced motion: step text is visible`
- `barba about→home: lands at completed state immediately`
- `barba home→about→home: no duplicated DOM nodes, no console errors`
- `accessibility: WCAG 2.1 AA on homepage (axe-core)`

### Tier 2 — Auto (CDN regression)

Registered in `tests/registry.json` as `rhp-home-intro-dial-flip-lock` after spec save. Runs via `/deploy`.

### Tier 3 — Manual

- **Visual feel of Flip.fit scrub** — cannot be automated. Requires human judgement on animation smoothness, easing, subjective quality.
- **Safari desktop + Safari iOS** — Playwright runs Chromium only. Manual Safari pass required to catch `:has()` edge cases, video autoplay, sticky slot quirks.
- **Firefox** — Playwright runs Chromium only. Manual Firefox pass for CSS `:has()` support.
- **Canvas legibility when dial is scaled small** — subjective. Human must confirm step-text and ticks remain readable (or confirm they're hidden by design).
- **`.home_dial-middle` size match** — visible jump at completion if Designer-set size ≠ `--dial-large-*`. Only a human eye can confirm seamless handoff.
- **Nav logo click → replay feel** — Playwright asserts state change but not the visual experience.
- **Real user scroll momentum on iOS** — rubber-band bounce, Lenis hand-off quirks.

---

## Acceptance Tests

Tests in `projects/ready-hit-play-prod/tests/acceptance/rhp-home-intro-dial-flip-lock.spec.js`:

1. `Pre-scroll — dial fitted to home_dial-start`
2. `Pre-scroll — fg video opacity is 0`
3. `Pre-scroll — step text is hidden`
4. `Pre-scroll — intro logo is visible after fade-in`
5. `Pre-scroll — rhp-home-ready class is absent`
6. `Pre-scroll — nav items are hidden (FOUC CSS)`
7. `Mid-scroll — dial rect is between start and middle`
8. `Post-scroll — rhp-home-ready class added`
9. `Post-scroll — dial rect matches home_dial-middle`
10. `Post-scroll — step text is visible`
11. `Post-scroll — intro logo is hidden, nav is-nav logo is visible`
12. `Post-scroll — section_home-intro display none`
13. `Post-scroll — dial becomes interactive (cursor hover promotes fg video)`
14. `No console errors on load and scroll`
15. `Reduced motion — lands at completed state immediately, no scrub`
16. `Reduced motion — step text is visible on load`
17. `Barba about→home — lands at completed state`
18. `Barba home→about→home — no duplicated nodes, no errors`
19. `Accessibility — no WCAG 2.1 AA violations`

---

## Open questions / blockers

1. **Designer prereqs (blocker):** User must add `.home_dial-start` and `.home_dial-middle` empty slot divs in Webflow Designer before `/build` can start Task 1+. Sizes must match `--dial-small-*` and `--dial-large-*` respectively.
2. **Locked IDLE visual correctness:** Need manual or automated confirmation that the current work-dial IDLE state (`dialState=IDLE + introMode + !introComplete + !attractionEnabled + !interactionUnlocked`) produces the "no fg video, no tick growth, no colour shift, no sector switch" visual the user wants. If not, Task 6 becomes mandatory and we add `workDial.setFrozen()`.
3. **Canvas legibility at small scale:** If the dial canvas renders blurry or cramped when `Flip.fit` scales the whole `.dial_component` down, we may need to hide the dial UI layer (`.dial_layer-ui`) during the locked state via `setDialUiOpacity(0)` and restore it in `_applyCompleteState`.
4. **Generic IDLE video vs "no fg video":** Confirmed (per clarification #1) that user means project `.dial_fg-video` only. Generic `.dial_generic-video` IDLE backdrop continues to fade in on load.
