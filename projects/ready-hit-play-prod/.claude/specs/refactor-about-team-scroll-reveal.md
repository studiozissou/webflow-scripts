# refactor-about-team-scroll-reveal

**Status:** Ready to Build | **Priority:** P1 | **Created:** 2026-03-26

## Summary

Replace the mobile (≤991px) team section scroll animation on the about page with a per-element ScrollTrigger scrub approach. Remove custom CSS layout overrides (user has rebuilt layout in Webflow Designer). Desktop hover animation unchanged.

### What changes
- **CSS:** Remove all mobile team layout overrides (lines 223–263) and `--team-photo-slide` custom properties (lines 212–221). Keep `--team-name-shift` (used by desktop hover) and desktop-only rules.
- **JS (orchestrator.js):** Replace the manual rAF + Lenis.onScroll mobile branch (lines 596–663) with per-element ScrollTrigger scrub. Wire `setupScrollTriggerProxy` for about page. Add `ScrollTrigger.refresh()` to about boot path.
- **JS (lenis-manager.js):** No changes — `setupScrollTriggerProxy(container, null)` already works (fallback to `wrapper.scrollHeight`).

### What stays the same
- Desktop hover animation (mouseenter/mouseleave, bio expand, name shift, sibling push)
- `about-text-lines.js` — still uses its own rAF pattern (coexists with ScrollTrigger)
- `about-dial-ticks.js` — unaffected
- Reduced motion guard

## Approach: Per-Element ScrollTrigger with Scrub

Each `.about-team_image`, `.about-team_name`, `.about-team_bio` gets its own `gsap.fromTo` with `scrollTrigger: { scrub: true }`.

**Why ScrollTrigger now works:** The previous approach avoided ScrollTrigger because the about page had no `scrollerProxy` wired. The fix: call `setupScrollTriggerProxy(container, null)` in the about boot path — same infrastructure case pages already use.

**Why per-element (not per-member):** Each child element animates based on its own scroll position (user requirement). In a stacked column layout, the bio can be hundreds of pixels below the image — they must trigger independently.

## Technical Design

### CSS removal (ready-hit-play.css)

Remove lines 212–263:
```
/* Lines 212-221: --team-photo-slide custom properties (all 3 breakpoints) */
/* Lines 223-263: Mobile team section reflow block (all layout overrides + 479px sub-block) */
```

Keep lines 198–210 (`--team-name-shift` — used by desktop hover).

### JS changes (orchestrator.js)

#### 1. Wire ScrollTrigger proxy for about page

In `runAfterEnter`, after `_startLenisForPage` for about page (line ~1687), add:

```js
RHP.lenis?.setupScrollTriggerProxy?.(data.next.container, null);
```

And in the existing `rAF` at line 1722, add `ScrollTrigger.refresh()`:

```js
requestAnimationFrame(function() {
  RHP.lenis?.resize();
  window.ScrollTrigger?.refresh?.();
});
```

Also in `bootCurrentView` for about direct-land (line ~1515), add the same proxy call after `_startLenisForPage`.

#### 2. Replace mobile scroll branch in `initAboutTeamHover`

Replace lines 596–663 (the `else` block after `if (isDesktop())`) with:

```js
} else {
  // Mobile: per-element ScrollTrigger scrub
  // Each child animates opacity:0 + x:100% → opacity:1 + x:0 as it enters viewport
  const scroller = container?.closest('[data-barba="container"]') || container;

  for (const m of Object.values(members)) {
    const scaleTarget = m.imageCover || m.image;
    const children = [m.image, m.name, m.bio];

    for (const el of children) {
      const props = { opacity: 1, x: 0 };
      // Image gets scale in the same tween (lockstep with translate)
      if (el === m.image) props.scale = 1.05;

      gsap.fromTo(el,
        { opacity: 0, x: '100%', ...(el === m.image ? { scale: 1 } : {}) },
        {
          ...props,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            scroller: scroller,
            start: 'top bottom',   // element top hits viewport bottom → progress 0
            end: 'top 40%',        // element top hits 40% from viewport top → progress 1
            scrub: true,
          }
        }
      );
    }
  }
}
```

**Key details:**
- `scroller: scroller` — about page scrolls in the Barba container (position:fixed, overflow:auto), not window
- `start: 'top bottom'` / `end: 'top 40%'` — matches user requirement (enter viewport → 40% from top)
- `scrub: true` — continuous proportional, auto-reverses on scroll back
- `ease: 'none'` — linear scrub (scroll position = animation progress)
- Image `scale: 1 → 1.05` in same tween — properties stay in lockstep
- All tweens created inside existing `aboutTeamCtx = gsap.context()` — `ctx.revert()` auto-kills them on destroy

#### 3. Remove stale mobile support code

- Remove `measureAndSetMinHeights()` function (lines 499–514) — no longer needed (no `maxHeight` animation, no pre-sizing)
- Remove `bioHeights` variable (line 497)
- Remove `teamScrollState` cleanup in `destroyAboutTeamHover` (lines 678–684) — ScrollTriggers killed by `ctx.revert()`
- Keep `teamTweenTargets` and `clearProps` in destroy — still needed for desktop hover tweens

#### 4. Reduced motion (mobile)

Update the reduced-motion mobile block (lines 517–524):

```js
if (reducedMotion && !isDesktop()) {
  aboutTeamCtx = gsap.context(() => {
    for (const m of Object.values(members)) {
      // Show all children at final state — no animation
      gsap.set(m.bio, { opacity: 1, x: 0 });
      gsap.set(m.name, { opacity: 1, x: 0 });
      gsap.set(m.image, { opacity: 1, x: 0, scale: 1.05 });
    }
  }, container);
  return;
}
```

#### 5. Initial state for shared `gsap.context` block

Update the shared initial-state block (lines 531–536) to handle both desktop and mobile:

```js
aboutTeamCtx = gsap.context(() => {
  if (isDesktop()) {
    // Desktop: bio hidden by width, members positioned
    gsap.set([members.ryan.bio, members.guy.bio], { width: 0, overflow: 'hidden', opacity: 0 });
    gsap.set([ryanEl, guyEl], { x: 0, force3D: true });
    gsap.set([members.ryan.name, members.guy.name], { x: 0, force3D: true });
    gsap.set([ryanScale, guyScale], { scale: 1, force3D: true });
  }
  // Mobile initial state set by gsap.fromTo in the ScrollTrigger block
}, container);
```

### Destroy cleanup

`destroyAboutTeamHover()` simplifies:

```js
function destroyAboutTeamHover() {
  const gsap = window.gsap;
  if (gsap && teamTweenTargets.length) {
    gsap.killTweensOf(teamTweenTargets);
    gsap.set(teamTweenTargets, { clearProps: 'transform,width,opacity,overflow,scale,maxHeight' });
  }
  aboutTeamCtx?.revert();  // Kills all ScrollTriggers created in context
  aboutTeamCtx = null;

  // Desktop hover listener cleanup (still needed)
  for (const l of teamHoverListeners) {
    if (l.type === 'lenis') {
      RHP.lenis?.offScroll?.(l.fn);
    } else if (l.el) {
      l.el.removeEventListener(l.type, l.fn);
    }
  }
  teamHoverListeners = [];
  teamTweenTargets = [];
  teamScrollState = null;
}
```

The mobile-specific cleanup (rAF cancel, resize timer, Lenis offScroll, min-height clear) is no longer needed — `ctx.revert()` handles all ScrollTrigger cleanup.

## Barba Impact

1. **Init/Destroy lifecycle:** Already handled — `initAboutTeamHover` called in `views.about.init()`, `destroyAboutTeamHover` in `views.about.destroy()`. ScrollTriggers created inside `gsap.context()` are killed by `ctx.revert()`.
2. **State survival:** Nothing to persist across transitions. Team section resets to initial state on re-entry.
3. **Transition interference:** No conflict — team section is inside the Barba container. ScrollTriggers are scoped to `scroller: container` which gets removed during transition.
4. **Re-entry correctness:** `gsap.fromTo` sets both start and end states, so re-entry always starts clean. `setupScrollTriggerProxy` re-registers with the new Lenis instance (closure captures the `lenis` variable which is updated on each `start()`).
5. **Namespace scoping:** About only. `isDesktop()` gate prevents mobile ScrollTriggers on desktop. No init on home or case namespaces.

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| `ready-hit-play.css` | 212–263 | Remove `--team-photo-slide` vars + all mobile team layout overrides |
| `orchestrator.js` | 496–514 | Remove `measureAndSetMinHeights`, `bioHeights` |
| `orchestrator.js` | 517–524 | Update reduced-motion mobile block |
| `orchestrator.js` | 531–536 | Gate initial-state `gsap.set` to desktop only |
| `orchestrator.js` | 596–663 | Replace rAF mobile branch with per-element ScrollTrigger |
| `orchestrator.js` | 666–684 | Simplify destroy (remove rAF/resize/minHeight cleanup) |
| `orchestrator.js` | ~1687 | Add `setupScrollTriggerProxy` for about page |
| `orchestrator.js` | ~1722 | Add `ScrollTrigger.refresh()` to about boot rAF |
| `orchestrator.js` | ~1515 | Add proxy + refresh for about direct-land |

## Task Breakdown

### Task 1: Remove mobile team CSS
**Agent:** code-writer | **Est:** 5 min | **Files:** `ready-hit-play.css`
- Delete lines 212–263 (--team-photo-slide + all mobile team layout overrides)
- Keep lines 198–210 (--team-name-shift)

### Task 2: Wire ScrollTrigger proxy for about page
**Agent:** code-writer | **Est:** 10 min | **Files:** `orchestrator.js`
- Add `setupScrollTriggerProxy(container, null)` in `runAfterEnter` for about
- Add `ScrollTrigger.refresh()` in about boot rAF
- Add same in `bootCurrentView` for about direct-land

### Task 3: Replace mobile scroll animation
**Agent:** code-writer | **Est:** 15 min | **Files:** `orchestrator.js`
- Remove `measureAndSetMinHeights`, `bioHeights`
- Update reduced-motion mobile block
- Gate shared initial-state to desktop only
- Replace rAF mobile branch with per-element ScrollTrigger
- Simplify destroy

### Task 4: Update acceptance tests
**Agent:** code-writer | **Est:** 10 min | **Files:** `tests/acceptance/refactor-about-team-scroll-reveal.spec.js`
- Update existing `feat-about-team-mobile-scroll.spec.js` assertions (no more maxHeight/width checks — now check translateX and opacity)
- Add new test for ScrollTrigger-based scrub behavior
- Verify desktop hover regression unchanged

## Parallelisation Map

| Stream | Tasks | Agent | Est. Tokens |
|--------|-------|-------|-------------|
| A | Task 1 (CSS) | code-writer | 5k |
| B | Tasks 2+3 (JS) | code-writer | 25k |
| C | Task 4 (tests) | code-writer | 15k |

- **A and B are independent** — CSS removal and JS changes don't block each other
- **C depends on B** — test assertions must match the new animation properties
- **Recommendation:** Parallel A+B, then sequential C. No worktrees needed (single project). No agent teams (straightforward changes).

## Verify Loop

### Pass/fail criteria
1. At 768px viewport, `.about-team_image`, `.about-team_name`, `.about-team_bio` start at `opacity: 0` and `translateX(100%)` (or equivalent transform matrix)
2. After scrolling each element to 40% from viewport top, all three are at `opacity: 1` and `translateX(0)`
3. Image `.about-team_image` also reaches `scale(1.05)` at full progress
4. Scrolling back up reverses all properties to initial state
5. Desktop hover (≥992px) still works: bio expands, name shifts, sibling pushes
6. No JS console errors on about page at any breakpoint
7. `prefers-reduced-motion`: all children visible without animation
8. Barba cycle (home → about → home → about) — animation reinitializes cleanly

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/about`
2. Set viewport to 768×1024 (tablet)
3. Scroll down to team section
4. Observe each child element animating in as it enters viewport
5. Scroll back up — observe reversal
6. Resize to 1440×900 — hover over Ryan's image — bio expands, name shifts
7. Navigate home → about → scroll to team — animation works on re-entry

### Tier mapping
- **Tier 1 (auto):** Criteria 1-7 covered by acceptance tests
- **Tier 2 (CDN):** Same tests run post-deploy against live URL
- **Tier 3 (manual):**
  - Animation feel/easing at different scroll speeds (subjective)
  - Safari/Firefox cross-browser (Playwright = Chromium only)
  - iOS Safari scroll bounce interaction with ScrollTrigger
  - Visual inspection that no horizontal overflow occurs from `translateX(100%)`

### Regression scope
- About page: `about-text-lines.js` scroll reveal must still work
- About page: `about-dial-ticks.js` must still render
- Barba transitions: home↔about must complete without errors
- Desktop hover: bio expand, name shift, image scale unchanged

## Test Plan

### Tier 1 — Auto: Playwright local
- Elements start at opacity:0, translateX:100% (991px, 767px, 479px)
- Elements reach opacity:1, translateX:0 after scroll (40% from top)
- Image reaches scale:1.05 at full progress
- Animation reverses on scroll-up
- No console errors (all breakpoints)
- Desktop hover regression (1440px)
- Barba lifecycle (home→about→home→about)
- Reduced motion fallback

### Tier 2 — Auto: CDN regression
- Same tests registered in `tests/registry.json`

### Tier 3 — Manual
- Animation smoothness at various scroll speeds (subjective feel)
- Safari/Firefox rendering (Playwright = Chromium only)
- iOS Safari: ScrollTrigger + Lenis proxy interaction
- No horizontal scrollbar from translateX(100%) initial state
