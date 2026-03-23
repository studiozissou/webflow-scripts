# rhp-about-hero-logo-scroll

## Summary
Mobile-only (≤991px) scroll-driven logo animation on the about page. The `.section_about-hero` is ~250svh tall. The logo is CSS sticky and vertically centered. As the user scrolls through the section, the 3 logo words (READY, HIT, PLAY) animate sequentially — each using the same choreography as the existing desktop hover (fade 0.4→1 + SplitText word slide in), but driven by scroll progress via a GSAP timeline with `scrub: true`.

Each word's animation follows a bell curve within its third of the section: initial state at the top and bottom of its third, end state (fully visible, words slid in) at the middle of its third.

Desktop (>991px) keeps the existing hover interaction unchanged.

## Approach
**GSAP timeline + ScrollTrigger scrub** (Approach A from exploration).

Single GSAP timeline with 3 sequential segments, one per logo word. Each segment animates in (words slide from `yPercent: -100` to `0`, opacity `0→1`) then back out (words slide to `yPercent: 100`, opacity `1→0`). The timeline is attached to a `ScrollTrigger` with `scrub: true` on `.section_about-hero`. ScrollTrigger maps scroll progress 0→1 across the full section height, and the timeline's internal keyframe positions handle the bell-curve shape per third.

Gated by `!isDesktop()` (existing `(hover: hover)` matchMedia inverse) at `init()` time in orchestrator.js.

## Prerequisites (Webflow Designer changes)

These MUST be done in the Webflow Designer before the JS works:

1. **`.section_about-hero` height → ~250svh** (currently 100vh / 844px)
2. **`.section_about-hero` overflow → `visible`** (currently `hidden`). CSS `position: sticky` does not work inside `overflow: hidden`. Alternative: `overflow: clip` (clips visually but doesn't create a scroll container, allowing sticky to work).
3. **`.nav_logo-wrapper-2` position → `sticky`** with `top: 50%; transform: translateY(-50%)` to center vertically. This needs to be set at ≤991px only (mobile breakpoint in Webflow).

## Architecture

### New code location
All new code lives inside `orchestrator.js`, within the existing `RHP.views.about` IIFE, alongside `initAboutHeroLogoHover` / `destroyAboutHeroLogoHover`.

New functions:
- `initAboutHeroLogoScroll(container)` — sets up SplitText + scrub timeline
- `destroyAboutHeroLogoScroll()` — kills ScrollTrigger, reverts GSAP context

No new files. No changes to `init.js` module list.

### DOM structure (confirmed via Playwright at 390×844)

```
.section_about-hero          ← ScrollTrigger trigger (250svh)
  .nav_logo-wrapper-2        ← CSS sticky, centered (flex row)
    .about-hero_ready[0]     ← "READY" (flex: 602)
      .nav_logo-embed        ← SVG logo word
      .heading-style-h3 ×2   ← "be ready", text
      p ×2                   ← "be ready", "To create"
    .about-hero_ready[1]     ← "HIT" (flex: 316)
      .nav_logo-embed
      .heading-style-h3 ×2
      p ×2
    .about-hero_ready[2]     ← "PLAY" (flex: 494)
      .nav_logo-embed
      .heading-style-h3 ×2
      p ×2
```

### Timeline structure

```
Timeline position:  0%────────33%────────66%────────100%
                    |  READY   |   HIT    |   PLAY   |
                    |in   out  |in   out  |in   out  |
                    0→1→0      0→1→0      0→1→0
```

Each third (0–33%, 33–66%, 66–100%) contains:
1. **First half** (e.g. 0–16.5%): animate IN — `.about-hero_ready` opacity 0.4→1, SplitText words `yPercent: -100 → 0`, `opacity: 0 → 1`
2. **Second half** (e.g. 16.5–33%): animate OUT — `.about-hero_ready` opacity 1→0.4, SplitText words `yPercent: 0 → 100`, `opacity: 1 → 0`

Timeline uses GSAP labels for clarity: `ready-in`, `ready-out`, `hit-in`, `hit-out`, `play-in`, `play-out`.

### ScrollTrigger config

```js
scrollTrigger: {
  trigger: '.section_about-hero',
  start: 'top top',
  end: 'bottom bottom',
  scrub: true,
  // No pin — logo is CSS sticky
}
```

**Lenis proxy requirement:** The about page runs Lenis on window. ScrollTrigger's default scroller is also window. As long as `lenis.on('scroll', ScrollTrigger.update)` is wired (handled by lenis-manager.js), scrub will track correctly. If the P0 about-page cluster changes the scroller to a custom wrapper, the `scroller` option must be added here.

### SplitText setup

Reuse the exact pattern from `initAboutHeroLogoHover` (orchestrator.js:593–607):
- Target: `.heading-style-h3` elements inside each `.about-hero_ready`
- Split: `type: 'words,lines'`, `linesClass: 'about-hero-line'`, `wordsClass: 'about-hero-word'`
- Initial state: `gsap.set(words, { yPercent: -100, opacity: 0 })`
- Store split instances for cleanup in `destroy()`

**SplitText coexistence:** Desktop hover and mobile scroll both split the same elements, but they are mutually exclusive — gated by `isDesktop()` / `!isDesktop()`. Only one ever runs. Safe as long as no resize-triggered re-init crosses the boundary (acceptable risk — Barba navigation resets both).

### Mobile gate

```js
// In RHP.views.about.init(container):
if (isDesktop()) {
  initAboutHeroLogoHover(container);   // existing
} else {
  initAboutHeroLogoScroll(container);  // new
}
```

```js
// In RHP.views.about.destroy():
destroyAboutHeroLogoHover();   // existing (no-ops if not inited)
destroyAboutHeroLogoScroll();  // new (no-ops if not inited)
```

### CSS changes (in `ready-hit-play.css`)

```css
@media (max-width: 991px) {
  .section_about-hero {
    overflow: clip;             /* allow sticky, clip visual overflow */
    height: 250svh;            /* tall scroll section */
  }
  .section_about-hero .nav_logo-wrapper-2 {
    position: sticky;
    top: 50%;
    transform: translateY(-50%);
  }
}
```

Note: If the height and overflow are set in Webflow Designer, the CSS rules here are only needed for the sticky positioning. Confirm with Webflow which properties are Designer-set vs code-set.

### prefers-reduced-motion

```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Set all 3 .about-hero_ready to opacity: 1 (fully visible)
  // Skip SplitText and timeline entirely
  return;
}
```

## Barba Impact

1. **Init/Destroy lifecycle:** Yes — adds SplitText instances, a GSAP timeline, and a ScrollTrigger instance. All wrapped in `gsap.context()`. `destroy()` calls `ctx.revert()` which kills timeline + ScrollTrigger + reverts SplitText DOM.

2. **State survival:** No state needs to persist across transitions. The scroll animation is purely visual — resets to initial state on every init.

3. **Transition interference:** No conflict. The scroll animation targets `.about-hero_ready` elements inside `.section_about-hero` which is inside the Barba container. During leave, `destroy()` is called first, cleaning up all tweens. The about→home transition animates the logo via the `.about-transition` overlay (outside Barba container), which is a different DOM path.

4. **Re-entry correctness:** `destroy()` → `ctx.revert()` restores SplitText DOM to original state, kills ScrollTrigger, clears timeline. Next `init()` re-splits, re-creates timeline from scratch. Clean cycle on home→about→home→about.

5. **Namespace scoping:** About only. The `init()` call is inside `RHP.views.about.init()`, which only runs when `data-barba-namespace="about"`.

## Tasks

### Task 1: Webflow Designer prerequisites
- Set `.section_about-hero` height to 250svh
- Set `.section_about-hero` overflow to `clip` (or `visible`)
- Optionally set `.nav_logo-wrapper-2` to sticky in Webflow (or handle in CSS)
- **Agent:** Human (Webflow Designer)
- **Blocks:** Task 2

### Task 2: Implement `initAboutHeroLogoScroll` / `destroyAboutHeroLogoScroll`
- Add new functions in orchestrator.js within `RHP.views.about` IIFE
- SplitText setup (reuse hover pattern)
- GSAP timeline with 3 bell-curve segments
- ScrollTrigger with scrub: true
- gsap.context() wrapping
- prefers-reduced-motion guard
- **Agent:** code-writer
- **Est:** ~80 LOC

### Task 3: Wire mobile gate in init/destroy
- Modify `RHP.views.about.init()` and `.destroy()` to call scroll variant on mobile
- Change `if (isDesktop()) initAboutHeroLogoHover(container)` to if/else
- **Agent:** code-writer
- **Est:** ~10 LOC

### Task 4: Add CSS sticky + section override for ≤991px
- Add `position: sticky; top: 50%; transform: translateY(-50%)` to `.nav_logo-wrapper-2` at `max-width: 991px`
- Add `overflow: clip` and `height: 250svh` to `.section_about-hero` at `max-width: 991px` (if not done in Webflow Designer)
- **Agent:** code-writer
- **Est:** ~15 LOC CSS

### Task 5: Run acceptance tests
- Run Tier 1 tests against staging
- **Agent:** qa
- **Blocks:** deployment

## Parallelisation Map

| Stream | Tasks | Agent | Est. LOC | Parallel? |
|--------|-------|-------|----------|-----------|
| A: Webflow Designer | Task 1 | Human | — | Independent (manual) |
| B: JS implementation | Tasks 2, 3 | code-writer | ~90 | Sequential (2 depends on IIFE scope) |
| C: CSS | Task 4 | code-writer | ~15 | Parallel with B |
| D: QA | Task 5 | qa | — | After B + C + A |

**Recommendation:** Tasks 2+3 sequential, Task 4 parallel with B, Task 5 after all. No worktrees needed (single file changes). No agent teams needed.

## Verification

### Tier 1 — Auto: Playwright local
- `tests/acceptance/rhp-about-hero-logo-scroll.spec.js`
- Section present and tall (>200svh computed height)
- Logo wrapper is sticky at mobile viewport
- ScrollTrigger instance exists on section
- Opacity changes on scroll (middle of first third → READY visible)
- No console errors
- Reduced motion: all words visible, no animation
- Barba re-entry: home→about→home→about clean

### Tier 2 — Auto: CDN regression
- Same tests registered in `tests/registry.json`, run after deploy

### Tier 3 — Manual
- **Animation feel:** Bell curve timing feels natural on real device scroll (subjective)
- **iOS Safari:** Sticky positioning + scroll interaction works correctly (Safari has sticky bugs)
- **Cross-browser:** Firefox mobile, Samsung Internet
- **Touch scroll:** Animation tracks finger movement smoothly (scrub responsiveness)
- **Viewport resize:** Rotating device mid-scroll doesn't break layout

## Acceptance Tests

See `tests/acceptance/rhp-about-hero-logo-scroll.spec.js`:
1. `section_about-hero is present and tall on mobile` — section height > 1500px at 390px viewport
2. `logo wrapper is sticky on mobile` — computed position is `sticky`
3. `no JS errors on about page load (mobile)` — zero pageerror events
4. `READY word animates on scroll through first third` — scroll to ~16% of section, check first `.about-hero_ready` opacity > 0.7
5. `HIT word animates on scroll through second third` — scroll to ~50%, check second `.about-hero_ready` opacity > 0.7
6. `PLAY word animates on scroll through third third` — scroll to ~83%, check third `.about-hero_ready` opacity > 0.7
7. `words return to initial state between thirds` — scroll to ~33%, check first and second `.about-hero_ready` opacity < 0.6
8. `prefers-reduced-motion: all words visible` — all `.about-hero_ready` opacity ≥ 0.9
9. `Barba re-entry: no errors after home→about→home→about` — zero errors, section still present
10. `desktop viewport: scroll animation not active` — at 1200px wide, no ScrollTrigger on section
