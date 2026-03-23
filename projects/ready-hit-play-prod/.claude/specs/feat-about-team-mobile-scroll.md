# feat-about-team-mobile-scroll — Mobile Scroll-linked Team Bio Reveal

**Status:** Ready to Build
**Priority:** P2
**Project:** ready-hit-play-prod
**Created:** 2026-03-19

## Summary

Replace the mobile tap-to-toggle team member interaction on the about page (<=991px) with a scroll-linked reveal. As each team member scrolls into view, the photo slides sideways and the bio text reveals from the opposite direction, all proportional to scroll progress. Fully reversible on scroll-up.

## Current State

- `orchestrator.js:408–569` has `initAboutTeamHover()` with desktop hover (mouseenter/leave) and mobile click toggle
- Desktop hover remains unchanged — this feature only modifies the `!isDesktop()` mobile branch
- Bio is `position: absolute, width: 0, overflow: hidden, opacity: 0` — hidden by JS on init
- `.about-team_name` is `position: absolute` — doesn't occupy flow
- `.about-team_wrapper` is `display: flex; flex-direction: column` on mobile
- About page uses Lenis on `[data-barba="container"]` wrapper — **no ScrollTrigger proxy exists for this page**
- `about-text-lines.js` uses manual `lenis.onScroll` + `getBoundingClientRect` + rAF pattern (not ScrollTrigger scrub) for exactly this reason

## Approach: Pre-calculated Fixed Heights + Manual Lenis Scroll Handler

### Why not ScrollTrigger scrub?
The about page starts Lenis on the Barba container but does NOT wire `ScrollTrigger.scrollerProxy`. This means `scrub: true` would read native `window.scrollY` while Lenis virtualises scroll, causing visual lag. `about-text-lines.js` deliberately avoids ScrollTrigger for this reason. We follow the same pattern.

### Why fixed heights?
The bio is `position: absolute` and doesn't occupy flow. Without pre-sizing the container, the expanded bio would overlap the next team member. Pre-calculating the expanded height and setting `min-height` on each `.about-team_member` ensures:
- No layout jumps when bio expands/collapses
- No content overlap between Ryan and Guy sections
- ScrollTrigger positions for other elements remain stable
- Fully reversible — no feedback loop from height changes during scroll

## Requirements

### R1: Pre-calculate container heights on mobile init
- On `!isDesktop()`, temporarily set each bio to `position: static; width: auto; opacity: 1` to measure its rendered height
- Set each `.about-team_member` `min-height` to `imageHeight + bioHeight + spacing` (where spacing = `4rem` at 991px, scaling down per breakpoint)
- Revert bio to hidden state after measurement
- All measurements via `gsap.set()` inside `aboutTeamCtx` for clean revert on destroy

### R2: Scroll-linked reveal using manual Lenis onScroll pattern
- Follow `about-text-lines.js` pattern: `RHP.lenis.onScroll()` + `window scroll` + `scrollWrapper scroll` + rAF throttle
- Per member, calculate progress 0→1 based on `getBoundingClientRect()`:
  - `start`: element top enters viewport bottom (top >= viewportHeight → progress = 0)
  - `end`: element is centered in viewport (top + height/2 = viewportHeight/2 → progress = 1)
  - Linear interpolation between start and end
- Apply via `gsap.set()` on each scroll frame:
  - Photo (`about-team_image`): `x` from `0` to `±photoSlideDistance` (Ryan: negative/left, Guy: positive/right)
  - Bio (`.about-team_bio`): `width` from `0` to `100%`, `opacity` from `0` to `1`
  - Name (`.about-team_name`): `x` from `0` to `±nameShift` (reads `--team-name-shift` CSS var)
  - Image scale (`.image-cover`): `scale` from `1` to `1.05` (subtler than desktop's 1.1)

### R3: Photo slide distance
- New CSS custom property: `--team-photo-slide` with responsive values:
  - Desktop (>991px): not used (hover interaction)
  - 991px: `8vw`
  - 767px: `6vw`
  - 479px: `4vw`
- Read via `_getCSSVar('--team-photo-slide', '8vw')` at animation time

### R4: Direction per member
- Ryan (photo left → slides further left): photo `x: -slideDistance`, bio reveals from right, name shifts right
- Guy (photo right → slides further right): photo `x: +slideDistance`, bio reveals from left, name shifts left
- Uses existing `nameDir` property (+1/-1) already in the members map

### R5: Fully reversible on scroll-up
- Progress maps linearly to animation state — scrolling up reduces progress, reversing all properties
- No "lock open" — animation state always reflects current scroll position
- Smooth because `gsap.set()` runs every frame via rAF

### R6: Resize handling
- On window resize, re-measure bio heights and update `min-height`
- Debounce resize handler (200ms) matching existing patterns
- After re-measurement, call `doUpdate()` to re-apply current scroll position's animation state

### R7: prefers-reduced-motion
- Already guarded at line 414: `if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;`
- When reduced motion: skip all scroll animation. Bio should be visible by default (set `opacity: 1, width: auto` on init)

### R8: Desktop hover remains unchanged
- The `isDesktop()` branch (lines 504–521) is untouched
- Only the `else` branch (mobile, lines 522–553) is replaced with scroll-linked logic

## Files to Modify

| File | Change | LOC |
|------|--------|-----|
| `orchestrator.js:522–553` | Replace mobile tap-toggle branch with scroll-linked reveal + fixed heights | ~100 |
| `orchestrator.js:556–569` | Update `destroyAboutTeamHover` to clean up scroll listeners + member min-heights | ~15 |
| `ready-hit-play.css` | Add `--team-photo-slide` custom property at all mobile breakpoints | ~12 |

## Implementation Detail

### orchestrator.js — mobile scroll branch replacement

```js
// Inside initAboutTeamHover, replace the `else` block (lines 522–553):
} else {
  // ── Mobile: scroll-linked bio reveal ──

  // 1. Measure expanded bio heights
  const memberKeys = ['ryan', 'guy'];
  const memberData = {};

  memberKeys.forEach(key => {
    const m = members[key];
    const imageRect = m.image.getBoundingClientRect();

    // Temporarily make bio measurable
    gsap.set(m.bio, { position: 'static', width: 'auto', opacity: 1, overflow: 'visible' });
    const bioHeight = m.bio.getBoundingClientRect().height;
    // Revert
    gsap.set(m.bio, { position: 'absolute', width: 0, opacity: 0, overflow: 'hidden' });

    const spacing = remToPx(2); // 2rem gap between image area and bio
    const totalHeight = imageRect.height + bioHeight + spacing;

    gsap.set(m.el, { minHeight: totalHeight });

    memberData[key] = { bioHeight, totalHeight };
  });

  // 2. Scroll handler (follows about-text-lines.js pattern)
  let rafId = null;
  const viewportH = () => window.visualViewport?.height ?? window.innerHeight;

  function doTeamUpdate() {
    const vh = viewportH();
    const photoSlide = parseFloat(_getCSSVar('--team-photo-slide', '8vw'));
    // Convert vw to px
    const slidePx = (parseFloat(photoSlide) / 100) * window.innerWidth;
    const nameShift = _getCSSVar('--team-name-shift', '4rem');
    const nameShiftPx = remToPx(parseFloat(nameShift));

    memberKeys.forEach(key => {
      const m = members[key];
      const rect = m.el.getBoundingClientRect();

      // Progress: 0 when top enters viewport bottom, 1 when element center is at viewport center
      const startY = vh; // element top at viewport bottom
      const endY = (vh - rect.height) / 2; // element centered
      const range = startY - endY;
      if (range <= 0) return;

      let progress = (startY - rect.top) / range;
      progress = Math.max(0, Math.min(1, progress));

      const dir = m.nameDir; // ryan: +1, guy: -1
      const scaleTarget = m.imageCover || m.image;

      gsap.set(m.image, { x: -dir * slidePx * progress, force3D: true });
      gsap.set(m.bio, { width: (progress * 100) + '%', opacity: progress, overflow: progress > 0.05 ? 'visible' : 'hidden' });
      gsap.set(m.name, { x: dir * nameShiftPx * progress, force3D: true });
      gsap.set(scaleTarget, { scale: 1 + (0.05 * progress), force3D: true });
    });
  }

  const onScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      doTeamUpdate();
    });
  };

  // Listen on all scroll sources (same as about-text-lines.js)
  const sw = container?.closest('[data-barba="container"]') || container;
  if (sw && sw !== window) sw.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  RHP.lenis?.onScroll?.(onScroll);

  teamHoverListeners.push(
    { el: sw !== window ? sw : null, type: 'scroll', fn: onScroll },
    { el: window, type: 'scroll', fn: onScroll },
    { el: null, type: 'lenis', fn: onScroll } // sentinel for lenis cleanup
  );

  // Store for resize/destroy
  teamScrollState = { rafId: null, scrollWrapper: sw, onScroll, memberData, doTeamUpdate };

  // 3. Resize handler
  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Re-measure
      memberKeys.forEach(key => {
        const m = members[key];
        gsap.set(m.bio, { position: 'static', width: 'auto', opacity: 1, overflow: 'visible' });
        const bioH = m.bio.getBoundingClientRect().height;
        gsap.set(m.bio, { position: 'absolute', width: 0, opacity: 0, overflow: 'hidden' });
        const imgH = m.image.getBoundingClientRect().height;
        const total = imgH + bioH + remToPx(2);
        gsap.set(m.el, { minHeight: total });
      });
      doTeamUpdate();
    }, 200);
  };
  window.addEventListener('resize', onResize, { passive: true });
  teamHoverListeners.push({ el: window, type: 'resize', fn: onResize });

  // Initial update
  doTeamUpdate();
}
```

### orchestrator.js — destroyAboutTeamHover update

Add scroll cleanup:
```js
function destroyAboutTeamHover() {
  const gsap = window.gsap;
  if (gsap && teamTweenTargets.length) {
    gsap.killTweensOf(teamTweenTargets);
  }
  aboutTeamCtx?.revert();
  aboutTeamCtx = null;

  // Clean up scroll listeners
  if (teamScrollState) {
    if (teamScrollState.rafId) cancelAnimationFrame(teamScrollState.rafId);
    RHP.lenis?.offScroll?.(teamScrollState.onScroll);
    teamScrollState = null;
  }

  teamHoverListeners.forEach(({ el, type, fn }) => {
    if (type === 'lenis') return; // handled above
    if (el) el.removeEventListener(type, fn);
  });
  teamHoverListeners = [];
  teamTweenTargets = [];
}
```

### ready-hit-play.css — new custom property

```css
/* Team photo slide distance (mobile scroll reveal) */
@media screen and (max-width: 991px) {
  :root { --team-photo-slide: 8vw; }
}
@media screen and (max-width: 767px) {
  :root { --team-photo-slide: 6vw; }
}
@media screen and (max-width: 479px) {
  :root { --team-photo-slide: 4vw; }
}
```

## Barba Impact

1. **Init/Destroy lifecycle** — Already wired via `views.about.init()` / `destroy()`. New scroll listeners + min-height are set inside `aboutTeamCtx` (gsap.context) and cleaned in `destroyAboutTeamHover`. No new lifecycle hooks needed.
2. **State survival** — No state needs to persist across transitions. Scroll progress resets to 0 on destroy. Min-heights cleared by `aboutTeamCtx.revert()`.
3. **Transition interference** — All animated elements are inside the Barba container. No z-index or opacity conflicts with leave/enter. `gsap.killTweensOf()` kills in-flight sets.
4. **Re-entry correctness** — `aboutTeamCtx.revert()` restores original styles. Fresh `init()` re-measures, re-attaches listeners. No stale refs. `rAF` cancelled in destroy.
5. **Namespace scoping** — About page only. `initAboutTeamHover` called from `views.about.init()` only.

## Verification

### Tier 1 — Auto: Playwright local
- Bio reveals proportionally on scroll at 991px, 767px, 479px
- Photo slides in correct direction per member (Ryan left, Guy right)
- Animation reverses on scroll-up
- No JS console errors on about page at mobile widths
- Desktop hover still works at 1440px
- Barba re-entry (home→about→home→about) scroll animation works cleanly
- prefers-reduced-motion: bio visible without animation

### Tier 2 — Auto: CDN regression
- Tests registered in `tests/registry.json` for `/deploy` regression

### Tier 3 — Manual
- **iOS Safari scroll feel**: Lenis `smoothTouch: false` means native momentum on iOS — verify scrub feels smooth, not laggy. Can't automate: requires real iOS device.
- **Cross-browser**: Safari, Firefox desktop — verify no visual glitches. Playwright only runs Chromium.
- **Visual polish**: Bio expand timing feel, photo slide distance — subjective.
- **Bio text readability**: At 479px the bio is long — verify it's fully readable without clipping or awkward wrapping.

## Parallelisation Map

| Stream | Task | Agent | Est. Tokens | Sequential Dependency |
|--------|------|-------|-------------|-----------------------|
| A | Add `--team-photo-slide` CSS custom property | code-writer | 2k | None |
| B | Replace mobile tap-toggle with scroll handler in orchestrator.js | code-writer | 15k | None |
| C | Update destroyAboutTeamHover cleanup | code-writer | 5k | After B |
| D | QA + acceptance tests | qa | 10k | After A, B, C |

**Recommendation**: A and B can run in parallel. C depends on B. D gates on all. Total: ~32k tokens. Worktrees not needed (2 files). Agent teams not needed.

## Acceptance Tests

| # | Test Name | Type | Tier |
|---|-----------|------|------|
| 1 | bio reveals on scroll at 991px | Functional | 1 |
| 2 | bio reveals on scroll at 767px | Functional | 1 |
| 3 | bio reveals on scroll at 479px | Functional | 1 |
| 4 | photo slides correct direction per member | Functional | 1 |
| 5 | animation reverses on scroll-up | Functional | 1 |
| 6 | no JS errors on about page (mobile) | Console | 1 |
| 7 | desktop hover still works at 1440px | Regression | 1 |
| 8 | Barba re-entry scroll animation works | Barba lifecycle | 1 |
| 9 | prefers-reduced-motion: bio visible | Reduced motion | 1 |
| 10 | iOS Safari scroll feel | Visual | 3 |
| 11 | Cross-browser visual check | Visual | 3 |
| 12 | Bio text readability at 479px | Visual | 3 |
