# feat-about-team-hover — About Team Section Hover Animations

**Status:** Planning
**Priority:** P2
**Project:** ready-hit-play-prod
**Created:** 2026-03-17

## Summary

Rework the about page team section hover interactions. Remove team member content from the scroll-based text reveal, add image scale + name shift on hover, and implement mobile tap-to-toggle with mutual exclusion.

## Current State

- `about-text-lines.js` targets `.section_about-team` (line 17 in `SECTION_SELECTORS`), which splits and fades ALL `h1-h4, p` inside the section on scroll — including text inside `.about-team_member` (the names and titles).
- `orchestrator.js:495–554` (`initAboutTeamHover`) handles desktop hover: expands bio width/opacity on `.about-team_image` mouseenter, translates the *other* team member by ±16vw.
- Mobile has no hover/tap interaction — `isDesktop()` guard skips init entirely.
- DOM structure (per `reference/about.html`): `.about-team_member` → `.about-team_image-wrapper` → `.about-team_name` + `img.about-team_image`. User confirms Webflow structure has changed — `.image-cover` now exists inside `.about-team_image` (or wrapping it).

## Requirements

### R1: Exclude `.about-team_member` from scroll reveal
- In `about-text-lines.js`, text elements inside `.about-team_member` must be excluded from SplitText + scroll-linked opacity fade.
- The section heading ("LEADERSHIP TEAM" h2) must STILL animate via scroll reveal.
- Implementation: add `el.closest('.about-team_member')` check alongside the existing `[data-text-animation="exclude"]` check at line 105.

### R2: Image scale on hover
- On hover of `.about-team_image`, scale `.image-cover` (child of `.about-team_image`, or the image wrapper — confirm element exists in live Webflow) to `scale(1.1)`.
- Duration: 0.3s, ease: `power3.out`.
- Reverse on hover out (scale back to 1).
- `.about-team_image` (or its wrapper) needs `overflow: hidden` in CSS to clip the scaled image.

### R3: Name shift on hover
- On hover of `.about-team_image`, shift `.about-team_name` to the **right** by `2rem`.
- For `.about-team_name.is-guy`, shift to the **left** by `2rem` instead.
- Duration: 0.5s, ease: `power3.out`.
- Reverse on hover out (shift back to `x: 0`).

### R4: Quick flip handling
- Use `gsap.to()` (not `gsap.fromTo()`) for all hover animations — GSAP's default overwrite behaviour naturally interpolates from the current value when a new tween starts, so rapid hover in/out won't snap or glitch.
- Explicitly set `overwrite: true` on each tween to immediately kill any conflicting in-progress tween on the same target+property, preventing queue buildup.

### R5: Mobile tap-to-toggle
- On touch devices (detected via `!(hover: hover)` media query, i.e. `!isDesktop()`), convert hover to tap.
- Tap `.about-team_image` → plays enter animations (bio expand + image scale + name shift).
- Tap same `.about-team_image` again → plays leave animations (reverse all).
- Tap the OTHER `.about-team_image` → closes the currently open member first, then opens the tapped one.
- Tap anywhere outside both `.about-team_member` elements → closes whichever is open.
- Use a single `activeTeamMember` state variable (`null | 'ryan' | 'guy'`) to track toggle state.

### R6: Bio expand (existing — keep)
- The existing bio width/opacity expand and sibling translate on hover remains.
- Integrate R2 (image scale) and R3 (name shift) into the existing enter/leave callbacks.

## Files to Modify

| File | Change |
|------|--------|
| `about-text-lines.js:105` | Add `.about-team_member` ancestor exclusion check |
| `orchestrator.js:495–569` | Rewrite `initAboutTeamHover` / `destroyAboutTeamHover`: add image scale, name shift, mobile tap toggle, `overwrite: true` |
| `ready-hit-play.css` | Add `overflow: hidden` on `.about-team_image` (or wrapper) for clipped scale; ensure `.about-team_name` has no conflicting transitions |

## Implementation Detail

### about-text-lines.js change (R1)

```js
// Line 105 — add .about-team_member exclusion
if (el.closest('[data-text-animation="exclude"]')) return;
if (el.closest('.about-team_member')) return;  // ← NEW
```

### orchestrator.js — initAboutTeamHover rewrite (R2–R6)

```js
function initAboutTeamHover(container) {
  const gsap = window.gsap;
  if (!gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const scope = container || document;
  const ryanEl = scope.querySelector('[data-team="ryan"]');
  const guyEl = scope.querySelector('[data-team="guy"]');
  if (!ryanEl || !guyEl) return;

  // Gather elements
  const members = {
    ryan: {
      el: ryanEl,
      bio: ryanEl.querySelector('.about-team_bio'),
      image: ryanEl.querySelector('.about-team_image'),
      imageCover: ryanEl.querySelector('.image-cover'),
      name: ryanEl.querySelector('.about-team_name'),
      nameShift: '2rem',  // right
    },
    guy: {
      el: guyEl,
      bio: guyEl.querySelector('.about-team_bio'),
      image: guyEl.querySelector('.about-team_image'),
      imageCover: guyEl.querySelector('.image-cover'),
      name: guyEl.querySelector('.about-team_name'),
      nameShift: '-2rem', // left (is-guy)
    }
  };

  // Validate all elements exist
  for (const m of Object.values(members)) {
    if (!m.bio || !m.image || !m.name) return;
    // imageCover may not exist — fall back to scaling .about-team_image directly
  }

  let activeTeamMember = null; // null | 'ryan' | 'guy'

  // Collect tween targets for killTweensOf on destroy
  teamTweenTargets = [
    members.ryan.bio, members.guy.bio,
    members.ryan.el, members.guy.el,
    members.ryan.name, members.guy.name,
    members.ryan.imageCover || members.ryan.image,
    members.guy.imageCover || members.guy.image,
  ];

  aboutTeamCtx = gsap.context(() => {
    // Initial state
    gsap.set([members.ryan.bio, members.guy.bio], { width: 0, overflow: 'hidden', opacity: 0 });
    gsap.set([ryanEl, guyEl], { x: 0, force3D: true });
    gsap.set([members.ryan.name, members.guy.name], { x: 0, force3D: true });
    const ryanScale = members.ryan.imageCover || members.ryan.image;
    const guyScale = members.guy.imageCover || members.guy.image;
    gsap.set([ryanScale, guyScale], { scale: 1, force3D: true });
  }, container);

  const slideOpts = { duration: 0.5, ease: 'power3.out', force3D: true, overwrite: true };

  function openMember(key) {
    const m = members[key];
    const other = members[key === 'ryan' ? 'guy' : 'ryan'];
    const otherShift = key === 'ryan' ? '16vw' : '-16vw';
    const scaleTarget = m.imageCover || m.image;

    // Bio expand
    gsap.to(m.bio, { width: '100%', overflow: 'visible', duration: 0.5, ease: 'power3.out', overwrite: true });
    gsap.to(m.bio, { opacity: 1, duration: 0.5, ease: 'linear', overwrite: true });
    // Shift other member
    gsap.to(other.el, { x: otherShift, ...slideOpts });
    // Image scale (R2)
    gsap.to(scaleTarget, { scale: 1.1, duration: 0.3, ease: 'power3.out', overwrite: true, force3D: true });
    // Name shift (R3)
    gsap.to(m.name, { x: m.nameShift, ...slideOpts });

    activeTeamMember = key;
  }

  function closeMember(key) {
    const m = members[key];
    const other = members[key === 'ryan' ? 'guy' : 'ryan'];
    const scaleTarget = m.imageCover || m.image;

    // Bio collapse
    gsap.to(m.bio, { width: 0, overflow: 'hidden', duration: 0.5, ease: 'power3.out', overwrite: true });
    gsap.to(m.bio, { opacity: 0, duration: 0.5, ease: 'linear', overwrite: true });
    // Reset other member position
    gsap.to(other.el, { x: 0, ...slideOpts });
    // Image scale reset (R2)
    gsap.to(scaleTarget, { scale: 1, duration: 0.3, ease: 'power3.out', overwrite: true, force3D: true });
    // Name shift reset (R3)
    gsap.to(m.name, { x: 0, ...slideOpts });

    activeTeamMember = null;
  }

  if (isDesktop()) {
    // Desktop: mouseenter on .about-team_image, mouseleave on [data-team]
    const onRyanEnter = () => openMember('ryan');
    const onRyanLeave = () => closeMember('ryan');
    const onGuyEnter = () => openMember('guy');
    const onGuyLeave = () => closeMember('guy');

    members.ryan.image.addEventListener('mouseenter', onRyanEnter);
    ryanEl.addEventListener('mouseleave', onRyanLeave);
    members.guy.image.addEventListener('mouseenter', onGuyEnter);
    guyEl.addEventListener('mouseleave', onGuyLeave);

    teamHoverListeners.push(
      { el: members.ryan.image, type: 'enter', fn: onRyanEnter },
      { el: ryanEl, type: 'leave', fn: onRyanLeave },
      { el: members.guy.image, type: 'enter', fn: onGuyEnter },
      { el: guyEl, type: 'leave', fn: onGuyLeave }
    );
  } else {
    // Mobile: tap to toggle with mutual exclusion (R5)
    function onTap(key) {
      return (e) => {
        e.preventDefault();
        if (activeTeamMember === key) {
          // Close self
          closeMember(key);
        } else {
          // Close other if open, then open self
          if (activeTeamMember) closeMember(activeTeamMember);
          openMember(key);
        }
      };
    }

    const onRyanTap = onTap('ryan');
    const onGuyTap = onTap('guy');

    members.ryan.image.addEventListener('click', onRyanTap);
    members.guy.image.addEventListener('click', onGuyTap);

    // Close on tap outside
    function onDocTap(e) {
      if (!activeTeamMember) return;
      if (ryanEl.contains(e.target) || guyEl.contains(e.target)) return;
      closeMember(activeTeamMember);
    }
    document.addEventListener('click', onDocTap);

    teamHoverListeners.push(
      { el: members.ryan.image, type: 'click', fn: onRyanTap },
      { el: members.guy.image, type: 'click', fn: onGuyTap },
      { el: document, type: 'click', fn: onDocTap }
    );
  }
}
```

### destroyAboutTeamHover update

```js
function destroyAboutTeamHover() {
  const gsap = window.gsap;
  if (gsap && teamTweenTargets.length) {
    gsap.killTweensOf(teamTweenTargets);
  }
  aboutTeamCtx?.revert();
  aboutTeamCtx = null;
  teamHoverListeners.forEach(({ el, type, fn }) => {
    const event = type === 'enter' ? 'mouseenter' : type === 'leave' ? 'mouseleave' : type;
    el.removeEventListener(event, fn);
  });
  teamHoverListeners = [];
  teamTweenTargets = [];
}
```

### CSS addition (R2)

```css
/* Clip scaled image on hover */
.about-team_image-wrapper {
  overflow: hidden;
}
```

### About view init update

Remove the `isDesktop()` gate so mobile also initialises:
```js
init(container) {
  if (active) return;
  active = true;
  RHP.aboutDialTicks?.init?.(container);
  RHP.aboutTextLines?.init?.(container);
  initAboutHeroLogoHover(container);   // hero logo hover stays desktop-only (internal guard)
  initAboutTeamHover(container);       // team hover now handles both desktop + mobile internally
}
```

Note: `initAboutHeroLogoHover` already has its own `isDesktop()` guard internally, so it's safe to call unconditionally. If not, we keep the desktop guard only for the hero logo and move team hover outside.

## Barba Impact

1. **Init/Destroy lifecycle** — Already wired: `initAboutTeamHover()` called in `views.about.init()`, `destroyAboutTeamHover()` in `views.about.destroy()`. No new lifecycle hooks needed.
2. **State survival** — No state needs to persist across transitions. `activeTeamMember` resets to `null` on destroy.
3. **Transition interference** — All animations are inside the Barba container (team section). No z-index or opacity conflicts with leave/enter transitions. `gsap.killTweensOf()` on destroy prevents orphan tweens.
4. **Re-entry correctness** — `aboutTeamCtx.revert()` restores initial state. Fresh `init()` re-queries DOM, re-attaches listeners. No stale references.
5. **Namespace scoping** — About page only. Guarded by `views.about.init()` lifecycle.

## Webflow Prerequisites

- Confirm `.image-cover` element exists inside `.about-team_image` (or `.about-team_image-wrapper`). If not, the code falls back to scaling `img.about-team_image` directly.
- Ensure `.about-team_image-wrapper` does NOT have `overflow: visible` set in Webflow Designer (would conflict with the `overflow: hidden` we need for clipped scale).

## Verification

1. **Automated**: Run `npm test` (smoke + a11y) after deploying to staging
2. **Automated**: Run `npx playwright test tests/acceptance/feat-about-team-hover.spec.js`
3. **Manual desktop**: Hover Ryan → image scales 1.1, name shifts right, bio expands, Guy shifts right. Leave → all reverse. Same for Guy (name shifts left). Rapid hover in/out → smooth, no snapping.
4. **Manual mobile**: Tap Ryan → opens. Tap Guy → Ryan closes, Guy opens. Tap Guy again → closes. Tap outside → closes.
5. **Manual scroll**: "LEADERSHIP TEAM" heading fades in on scroll. Team member names/titles do NOT fade (excluded from scroll reveal).
6. **Barba re-entry**: Navigate home → about → hover works. Navigate away → back → hover works again, no doubled animations.

## Parallelisation Map

| Stream | Task | Agent | Est. Time | Sequential Dependency |
|--------|------|-------|-----------|-----------------------|
| A | Modify `about-text-lines.js` (R1) | code-writer | 2 min | None |
| B | Rewrite team hover in `orchestrator.js` (R2–R6) | code-writer | 10 min | None |
| C | Add CSS `overflow: hidden` | code-writer | 1 min | None |
| D | Update `views.about.init` to remove desktop gate | code-writer | 1 min | After B |
| E | QA + acceptance tests | qa | 5 min | After A, B, C, D |

**Recommendation**: Streams A, B, C can run in parallel. D depends on B. E is a gate after all code changes. Total: ~15 min sequential, ~12 min parallel. Worktrees not needed (changes are in 3 files). Agent teams not needed (single code-writer sufficient).

## Acceptance Tests

See `tests/acceptance/feat-about-team-hover.spec.js` for machine-runnable tests.

| # | Test Name | Type |
|---|-----------|------|
| 1 | team section heading still animates on scroll | Functional |
| 2 | team member names excluded from scroll reveal | Functional |
| 3 | image scales on desktop hover | Interaction |
| 4 | name shifts on desktop hover | Interaction |
| 5 | hover animations reverse on leave | Interaction |
| 6 | no JS errors on about page | Console |
| 7 | Barba re-entry: hover works after home→about→home→about | Barba lifecycle |
| 8 | prefers-reduced-motion: content visible without animation | Reduced motion |
| 9 | mobile tap toggle works at 375px | Responsive |
