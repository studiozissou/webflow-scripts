# Spec: Mobile Intro — Timed Word Cycle + Scroll Morph

**Slug:** `rhp-mobile-intro-timed-words`
**Type:** feature
**Priority:** P1
**Client:** Ready Hit Play
**Created:** 2026-05-04

## Summary

Replace the mobile 300svh scroll-driven word reveal with a **timed GSAP timeline** that auto-plays through all 3 logo SVGs once on page load (0.5s delay), then on scroll, gracefully exits the word animation and scrubs the logo+dial morph identically to desktop.

## Current Behaviour (Mobile ≤991px)

- `.section_home-intro` is `300svh` — 3× viewport height scroll track
- `buildMobileTimeline()` builds a single ScrollTrigger-scrubbed timeline:
  - 0–70% scroll: 3 word bell-curves (IN → HOLD → OUT per SVG)
  - 70–100% scroll: dial grows + logo shrinks to nav (power3.inOut)
- Words use `ease: 'none'` (linear scrub) — no easing curves
- `.home-intro_bottom` is `position: fixed` to keep dial visible during 300svh scroll

## New Behaviour (Mobile ≤991px)

### Phase 1: Timed Word Cycle (auto-play, no scroll)
- Section returns to `100svh` (same as desktop)
- `.home-intro_bottom` returns to `position: absolute` (matches desktop)
- After 0.5s delay from init, a **standalone GSAP timeline** plays:
  - For each of the 3 `.about-hero_ready` SVGs, in sequence:
    1. **IN:** Text containers (`upper`/`lower`) opacity 0→1 (0.3s). Words `yPercent:0, opacity:1` (0.5s, `power3.out`, stagger 0.05). SVG lifts `y: '-1.5rem'` (0.5s, `power3.out`)
    2. **HOLD:** 1s pause
    3. **OUT:** Words `yPercent:100, opacity:0` (0.4s, `power3.in`, stagger 0.03). Text containers opacity 0 (0.3s, delay 0.15s). SVG returns `y: 0` (0.5s, `power3.out`). Spacers hidden on complete
  - After all 3 SVGs complete: words stay hidden (bare logo visible). Timeline is done.

### Phase 2: Scroll Morph (identical to desktop)
- A **separate ScrollTrigger** (scrub: 0.5, trigger: `.section_home-intro`, start: `top top`, end: `+=100%`) drives the morph:
  - Dial: grow from `.home-intro_bottom` to `.home-intro_middle` (power3.inOut, duration 1)
  - Logo: shrink + translate to `.nav_logo-wrapper-2.is-nav` position (power3.inOut, duration 1)
  - Step text: fade in at 90% (power1.out, duration 0.1)
  - `onLeave: onMorphComplete`, `onEnterBack: onMorphReverse`
- This is the **same morph code as desktop** — reuse `buildTimeline()`'s morph block

### Scroll Interrupt (user scrolls during word cycle)
- On first ScrollTrigger `onUpdate` (progress > 0):
  1. Mark `_wordInterrupted = true`
  2. If a word is mid-IN or mid-HOLD: trigger its OUT animation
  3. When the OUT animation completes → call `_destroyLogoText()` to clean up SplitText
  4. The morph scrub is already running in parallel (ScrollTrigger doesn't wait) — it just starts scrubbing

- If the word cycle has already finished naturally (all 3 done): `_destroyLogoText()` is called immediately on first scroll frame (same as desktop)

### Reduced Motion
- Skip word cycle entirely (no timeline created)
- Bare logo visible immediately
- ScrollTrigger callback-only (no scrub): `onLeave: onMorphComplete` — instant state flip on scroll past section
- Same as current reduced motion path

### Replay (nav logo tap on mobile)
- Mobile replay is `window.location.reload()` (orchestrator line ~1274) — the new word cycle starts fresh on reload. No additional replay logic needed in `buildMobileTimeline`.

## Files Affected

### 1. `home-scroll-morph.js` (~150 LOC changed)

**New module-level state:**
```
let wordTL = null;              // standalone timed word cycle timeline
let _wordInterrupted = false;   // true once scroll detected during word cycle
```

**Replace `buildMobileTimeline()` (lines 461–605):**
- Remove the entire current function body
- New body:
  1. `_killScrub()` + kill wordTL if exists
  2. Clear transforms on dial/logo
  3. Reduced motion: callback-only ScrollTrigger (same as current)
  4. Build morph-only scrub timeline (reuse desktop geometry math from `buildTimeline`)
  5. Build standalone word cycle timeline (new `_buildWordCycleTL()` helper)
  6. Set up scroll interrupt in the scrub's `onUpdate`

**New helper: `_buildWordCycleTL()`:**
- Returns a GSAP timeline with `paused: true, delay: 0.5`
- For each `logoSplitData` entry: IN tweens → addPause('+=' + 1) → OUT tweens
- `onComplete`: mark word cycle done, call `_destroyLogoText()`
- Called from `buildMobileTimeline()`, then `.play()`

**New helper: `_interruptWordCycle()`:**
- Called from scrub's `onUpdate` on first scroll frame
- If wordTL is playing and a word is in IN or HOLD phase:
  - Get current word index from timeline progress
  - Kill remaining tweens on current word
  - Play the OUT animation for current word
  - On OUT complete: `_destroyLogoText()`
- If wordTL already completed or was killed: `_destroyLogoText()` immediately

**Modify `destroy()` (line 939):**
- Add: `if (wordTL) { wordTL.kill(); wordTL = null; }`

**Modify `_killScrub()` (line 57):**
- Add: `if (wordTL) { wordTL.kill(); wordTL = null; _wordInterrupted = false; }`

**Modify `_resizeHandler` (line 615):**
- Already calls `buildMobileTimeline()` which will kill+rebuild everything

### 2. `ready-hit-play.css` (~6 lines changed)

**Lines 457–463:** Remove mobile 300svh override:
```css
/* BEFORE */
@media (max-width: 991px) {
  main.main-wrapper:has(...) .section_home-intro {
    height: 300svh;
    min-height: 300svh;
  }
}
/* AFTER: remove entire block (desktop 100svh applies to all) */
```

**Lines 493–501:** Remove mobile fixed positioning on `.home-intro_bottom`:
```css
/* BEFORE */
@media (max-width: 991px) {
  .home-intro_bottom {
    position: fixed;
    ...
  }
}
/* AFTER: remove entire block (desktop absolute applies to all) */
```

**Comment the old values** for easy revert if client changes mind:
```css
/* Reverted 2026-05-04: was 300svh for scroll-driven word reveal.
   Now 100svh with timed word cycle. Revert: uncomment below.
   @media (max-width: 991px) { ... height: 300svh; min-height: 300svh; }
   @media (max-width: 991px) { .home-intro_bottom { position: fixed; ... } }
*/
```

## Reusable Code

| Source | Target | What |
|--------|--------|------|
| `_initLogoHover()` L164–182 | `_buildWordCycleTL()` | Exact timing: in 0.5s power3.out stagger 0.05, out 0.4s power3.in stagger 0.03, container 0.3s fade, SVG y shift |
| `buildTimeline()` L315–458 | new `buildMobileTimeline()` morph block | Geometry math (dial scale, logo scale, slot positions), ScrollTrigger config |
| `_destroyLogoText()` L202–245 | scroll interrupt handler | Graceful SplitText teardown with fast hover-out |
| `_splitLogoText()` L111–151 | unchanged | Word splitting, used by both desktop and new mobile |

## Barba Impact

1. **Init/Destroy lifecycle:** Yes — adds `wordTL` (GSAP timeline). Must be killed in `destroy()` and `_killScrub()`. Already addressed in spec.
2. **State survival:** No. Mobile replay is a page reload — no state to persist.
3. **Transition interference:** No. Word cycle is purely within `#interactive-logo` which lives in `.home-transition` (outside Barba container but inside `main.main-wrapper`). No z-index or opacity conflict with leave/enter.
4. **Re-entry correctness:** Yes. `skipToEnd()` is called on Barba re-entry — it bypasses the word cycle entirely and lands in dial-large state. `wordTL` won't exist (never init'd on re-entry). Clean.
5. **Namespace scoping:** Home only. `buildMobileTimeline()` is gated by `!_isDesktop()` in `init()`, which is only called on home namespace enter.

## Verify Loop

### Pass/fail criteria
- **Mobile (375×812):** Section height ≈ 1× viewport height (not 3×)
- **Mobile:** After 0.5s delay, words cycle through 3 SVGs automatically (no scroll needed)
- **Mobile:** Each word set appears with power3.out easing, holds 1s, disappears with power3.in
- **Mobile:** After all 3 SVGs cycle, logo shows bare SVG (no words visible)
- **Mobile:** On scroll, logo shrinks + dial grows (same visual as desktop morph)
- **Mobile:** `.rhp-home-ready` class added after morph complete
- **Mobile:** `RHP.workDial.forceActive()` called after morph (fg layer visible)
- **Mobile:** No console errors
- **Desktop:** No change — hover text + 100svh scrub morph still works
- **Reduced motion:** No word animation, instant morph on scroll

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/` on mobile viewport (375×812)
2. Observe: words auto-cycle through "READY", "HIT", "PLAY" with eased animations
3. Wait for cycle to complete (~7s total: 3 × [0.5s in + 1s hold + 0.5s out] + 0.5s delay)
4. Scroll down: logo shrinks to nav, dial grows to center
5. Verify: `.rhp-home-ready` on wrapper, nav visible, dial in ACTIVE state

### Tier mapping
- **Tier 1 (auto):** Section height check, rhp-home-ready after scroll, console errors, reduced motion, desktop regression, Barba re-entry → `tests/acceptance/rhp-mobile-intro-timed-words.spec.js`
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (manual):**
  - Animation timing feel (power3 easing curves subjective quality) — can't automate subjective polish
  - iOS Safari scroll momentum interaction with word interrupt — Playwright only runs Chromium
  - Real device touch gesture (swipe vs tap-scroll) — Playwright emulates, not real touch HW

### Regression scope
- Desktop hover text animation must NOT change
- Desktop scrub morph must NOT change
- Barba transitions (home→about→home, home→work→home) must still work
- `replay()` on desktop must still reverse-play the morph
- Mobile replay (page reload) must restart the word cycle fresh
- Post-morph dial state (forceActive, scroll lock, height freeze) must still work

## Task Breakdown

### Task 1: CSS — Revert mobile section + slot positioning
- **Agent:** code-writer
- **Files:** `ready-hit-play.css`
- **LOC:** ~10 (remove 2 blocks, add comment)
- **Est. tokens:** 2k

### Task 2: JS — Replace `buildMobileTimeline()` with timed words + scrub morph
- **Agent:** code-writer
- **Files:** `home-scroll-morph.js`
- **LOC:** ~150 (replace lines 461–605, add helpers, modify destroy/killScrub)
- **Est. tokens:** 15k
- **Depends on:** Task 1 (CSS must be 100svh for geometry math to be correct)

### Task 3: Acceptance tests
- **Agent:** code-writer (sonnet)
- **Files:** `tests/acceptance/rhp-mobile-intro-timed-words.spec.js`, `tests/registry.json`
- **LOC:** ~180
- **Est. tokens:** 8k
- **Independent of:** Tasks 1-2 (tests run against staging, not local)

## Parallelisation Map

| Stream | Tasks | Agent | Est. tokens | Worktree? |
|--------|-------|-------|-------------|-----------|
| A: CSS + JS | Task 1 → Task 2 (sequential) | code-writer | 17k | No |
| B: Tests | Task 3 | code-writer (sonnet) | 8k | No |

- Streams A and B are **independent** — can run in parallel
- Task 1 → Task 2 must be sequential (CSS height affects JS geometry)
- Recommendation: **parallel** (2 streams), no worktrees needed (different files)

## Acceptance Tests

See `tests/acceptance/rhp-mobile-intro-timed-words.spec.js` for machine-runnable versions.

| Test Name | What it checks |
|-----------|---------------|
| `section_home-intro has 100svh height on mobile` | Section height ≈ 1× viewport (not 3×) |
| `home-intro_bottom is position absolute on mobile` | Slot is absolute, not fixed |
| `word cycle completes automatically on mobile` | After ~7s, `_destroyLogoText` has been called (words cleaned up) |
| `rhp-home-ready after scroll morph on mobile` | Class applied on wrapper after scrolling past section |
| `dial reaches ACTIVE state after morph on mobile` | fg layer opacity 1 post-morph |
| `no JS errors on mobile home load` | Console error count is 0 |
| `desktop section_home-intro is NOT 300svh` | Desktop regression: height ≈ 1× viewport |
| `desktop hover text still works` | Desktop regression: mouseenter on logo shows words |
| `reduced motion skips word cycle` | No word animation, morph on scroll instant |
| `Barba re-entry: home→about→home clean` | skipToEnd path, rhp-home-ready, no errors |
| `no WCAG 2.1 AA violations on mobile home` | axe-core audit |
