# RHP: Home Intro Section + Scroll-Driven Morph + About Slide Transitions

**Slug:** `rhp-home-intro-scroll-morph`
**Client:** ready-hit-play-prod
**Status:** Ready to Build
**Approach:** C — Hybrid decomposition (3 modules)

## Update 2026-04-09 — Clone-from-nav simplification

After verifying the live homepage markup (`reference/homepage.html`), the original "move the About big logo into a symbol and drop it into the home intro slot" Designer prereq is **unnecessary**. The nav logo (`.nav_logo-link > .nav_logo-wrapper-2.is-nav`) already contains the exact same 3× `.about-hero_ready` SVG markup as the About hero big logo — they share identical DOM structure, only the parent CSS sizes them differently.

Five changes flow from this:

1. **Simplified Designer prereq** — User only adds an empty `.section_home-intro > .home-intro_logo-slot` inside the home Barba container. No symbol creation, no markup moving from About.
2. **Clone-based JS approach** — `home-scroll-morph.js` clones the nav logo wrapper into the intro slot on `init()`, hides the real nav logo via `opacity: 0`, and at morph-complete fades the clone out while fading the nav logo back in (or just reveals the nav logo after the clone is removed). No Flip reparent of the real logo is needed — the clone disposes, the nav logo stays where it always lived.
3. **Remove About hero logo animations** — Delete `initAboutHeroLogoHover` / `destroyAboutHeroLogoHover` (orchestrator.js ~711–822) and `initAboutHeroLogoScroll` / `destroyAboutHeroLogoScroll` (~824+). These drove interactions on the big About-hero logo which is now moved out of the About hero layout (user may hide the `.section_about-hero` big logo via Webflow visibility or remove it entirely).
4. **Defensive CSS for intro scoping** — Ensure `.section_home-intro` only renders on the home namespace:
   ```css
   .section_home-intro { display: none; }
   [data-barba-namespace="home"] .section_home-intro { display: flex; }
   ```
5. **Mobile sticky slot** — User has already added `position: sticky; top: 0;` to `.home-intro_logo-slot` on mobile in Webflow Designer. This preserves the mobile "scroll-driven logo reveal" interaction that used to live in `initAboutHeroLogoScroll`. ScrollTrigger scrub remains compatible — sticky pins the slot within the parent, total scroll distance is still the intro section's 100vh. The morph's `x/y/scale` tween on the clone element works against the sticky parent's layout position; Flip end-state measurements are re-taken on scroll each tick via `invalidateOnRefresh: true`.

All other architecture (3 modules, Barba slide transitions, scroll lock after morph, replay API) is unchanged. Sections below have been revised accordingly — the original reparent-based code remains inline but is now clearly marked as superseded where relevant.

## Summary

Major homepage restructure. On fresh page load, the homepage presents an intro section featuring the large interactive logo (currently on /about) over the IDLE background video, with the dial rendered small (About-page size). As the user scrolls 100vh, the logo Flip-reparents to the nav position and the dial morphs from small → large. At the end of that 100vh range, native/Lenis scroll is locked and the homepage behaves exactly as it does today (work-dial owns all input).

Re-entering home via Barba skips the intro entirely and lands directly in the dial-large state. Case→home handoff keeps its existing ACTIVE behaviour.

Home↔About transitions are also rewritten: the About Barba container itself slides horizontally (−100% ↔ 0%) over a fixed home, replacing the current Flip-based logo/dial morph timeline (`aboutTransitionTL`).

Clicking the nav logo while on home scrolls to top and replays the scroll-morph timeline in reverse to restore the intro section — no reload required.

## Goals

- Give the homepage a cinematic first impression (large logo over video) without reloading.
- Reuse the existing About hero logo markup so we have a single source of truth.
- Keep work-dial behaviour untouched once the morph completes (scroll locked, drag/hover owns input).
- Simplify the home↔about transition — one container slide, not a cross-element Flip.
- Preserve battle-tested iOS autoplay/tap-to-play fallback from `home-intro.js`.

## Non-goals

- No Designer/CMS schema changes beyond adding the empty `.section_home-intro > .home-intro_logo-slot` container on home and setting `position: sticky` on the slot at mobile (already done).
- No symbol creation or markup migration from About hero — JS clones from the existing nav logo at runtime.
- No change to case-page transitions, work-dial internals, or the video pool.
- No mobile-specific intro UI code path — user's Webflow sticky CSS on `.home-intro_logo-slot` replaces the old `initAboutHeroLogoScroll` mobile behaviour.
- No removal of the current intro sequence (step text → dial ticks → video fade) — it runs inside the new intro section.

## DOM Context

### Current state (verified via `reference/homepage.html` snapshot)

- **Nav logo** (all pages, single source of truth): `nav.nav > .nav_logo-wrapper > .nav_logo-link > .nav_logo-wrapper-2.is-nav` — contains 3× `<div data-cursor="dot" class="about-hero_ready"><div class="nav_logo-embed w-embed"><svg>...</svg></div></div>` (R / H / P characters). Inside persistent nav, OUTSIDE Barba container.
- **Big logo on /about** (legacy): `.section_about-hero .about-hero_ready` — identical 3-SVG markup, just sized larger via parent CSS. Currently driven by `initAboutHeroLogoHover` + `initAboutHeroLogoScroll` animations in orchestrator.js. These animations will be deleted in this spec.
- **Dial** (persistent, outside Barba — restructured 2026-03-12): `.dial_component[data-dial-ns="home"|"work"]` lives inside `.dial_layer-fg`, OUTSIDE Barba container. CSS visibility controlled by `data-dial-ns`.
- **Home Barba container**: `<main data-barba-namespace="home" data-barba="container" class="main-wrapper">` contains `.section_home` and `.about-transition` overlay.
- **Transition dial** (small static canvas): `.transition-dial` — separate module.
- **Home bg video**: owned by `work-dial.js`, `RHP.workDial.getIntroVideoEl()` returns it.

### After Webflow Designer prereq (user will do before /build)

Only **two** Designer tasks are required:

1. **Add an empty intro section** inside the home Barba container, as the first child of `[data-barba-namespace="home"]`:
   ```html
   <section class="section_home-intro">
     <div class="home-intro_logo-slot"></div>
   </section>
   ```
   - `.section_home-intro`: `height: 100vh`, `display: flex` centred (both Designer and CSS rules).
   - `.home-intro_logo-slot`: flex-centred, sized to house the large logo. **Mobile override (user already applied):** `position: sticky; top: 0;` so the slot pins within the intro section during the 100vh scroll range, preserving the mobile scroll-driven logo reveal interaction.
   - Leave the slot empty — JS will clone the nav logo markup into it on `init()`.

2. **(Optional cleanup)** Hide or delete the big `.about-hero_ready` logo inside `.section_about-hero` on the About page. It's no longer animated by JS, but can be kept if desired. If kept, the about hero still shows static large characters; if deleted, About hero becomes text-only. **Recommended: hide via Webflow visibility (display: none)** so Designer markup is preserved as a backup.

No symbol creation. No markup moving between pages. The nav logo is the single source of truth.

**Prereq confirmation step**: `home-scroll-morph.js` fails loudly with a console warning if `.home-intro_logo-slot` is missing or if `.nav_logo-link .nav_logo-wrapper-2.is-nav` is missing (so cloning cannot happen), and then no-ops — no scroll lock, no morph — so the site still works.

## Architecture (Approach C — Hybrid decomposition)

Three cooperating modules, each with clear single responsibility:

| Module | Size | Responsibility |
|--------|------|----------------|
| `home-intro.js` (refactored) | ~200 lines (was 370) | Pre-scroll intro sequence ONLY: set initial small-dial state, reveal step text, dial tick pulse, IDLE video fade-in + iOS autoplay/tap fallback, nav reveal. Does NOT handle logo morph or scroll. Exposes `RHP.homeIntro.run()` and sets `RHP.homeIntro.done = true` when complete. |
| `home-scroll-morph.js` (NEW) | ~150 lines | Flip-reparent logo from `.home-intro_logo-slot` → `.nav_logo-link`. Builds ScrollTrigger scrub timeline for dial small→large + logo scale. Handles canvas redraw on complete. Calls `RHP.scroll.lock()` at end. Provides `RHP.homeScrollMorph.replay()` (nav logo click) and `RHP.homeScrollMorph.skipToEnd()` (Barba re-entry). |
| `home-about-slide.js` (NEW) | ~80 lines | Simple slide transitions for Home↔About. Builds GSAP tweens on the About Barba container (`translateX` + `opacity`, power3.out, 0.75s). Exposes `RHP.homeAboutSlide.leaveHomeToAbout()` and `.leaveAboutToHome()` called from orchestrator Barba hooks. |

### Load order (update `init.js` CONFIG.modules)

```
lenis-manager.js
cursor.js
work-dial.js
transition-dial.js
about-dial-ticks.js
about-text-lines.js
home-intro.js            ← refactored
home-scroll-morph.js     ← NEW
home-about-slide.js      ← NEW
intro-format.js
earth-parallax.js
case-video-controls.js
video-loader.js
orchestrator.js
utils.js
```

`home-scroll-morph.js` and `home-about-slide.js` register on `window.RHP` before `orchestrator.js` consumes them.

### Orchestrator changes

- **Delete**: the persistent `aboutTransitionTL` + all Flip-based home↔about morph code (orchestrator.js lines ~1872–2020).
- **Add**: Barba `leave`/`enter` hooks for `home`→`about` and `about`→`home` that delegate to `RHP.homeAboutSlide`.
- **Add**: on home `enter` via Barba (not initial load), call `RHP.homeScrollMorph.skipToEnd()` so the page lands in dial-large state.
- **Modify**: home Lenis lifecycle. Currently home has **no** Lenis. New behaviour:
  - Fresh load (intro runs): `RHP.lenis.start()` on window after intro sequence completes, so the 100vh scroll can drive the morph.
  - On `RHP.scroll.lock()` at morph completion: Lenis is `.stop()`ed and CSS `overflow: hidden` is applied, restoring today's "no scroll on home" behaviour.
  - On Barba re-entry to home: no Lenis start, scroll stays locked (page already in dial-large state).
  - On `RHP.homeScrollMorph.replay()`: Lenis is restarted, scroll-to-top, timeline reversed, then Lenis stopped again at the end.

## Implementation

### File 1: `home-intro.js` (refactor)

Keep everything that runs before the scroll morph. Remove everything that touches post-intro state.

**Keep:**
- `hasRun` flag (one-shot on fresh load)
- `setInitialState()` — initial step text, dial small, intro video opacity 0
- `revealStepText()` — SplitText word reveal
- `runDialTickAnimation()` — canvas tick pulse
- `fadeInIntroVideo()` — video play + autoplay rejection + tap-to-play fallback (do NOT touch this logic)
- `runNavAnimation()` — nav fade-in
- Final state: dial is in IDLE small state, video playing, nav visible, step text visible

**Remove/defer** (now owned by `home-scroll-morph.js`):
- Any code that expands the dial to large
- Any code that calls `RHP.workDial.setInteractionUnlocked(true)`
- Any code that removes the intro section from the layout

**Add to `run()` completion:**
```js
window.RHP.homeIntro.done = true;
window.dispatchEvent(new CustomEvent('rhp:home-intro:complete'));
// Start Lenis so the user can scroll into the morph
if (window.RHP?.lenis) window.RHP.lenis.start();
```

**New API (`window.RHP.homeIntro`):**
```
{ run, done: boolean, version }
```

### File 2: `home-scroll-morph.js` (NEW — clone-from-nav approach)

Instead of physically reparenting the nav logo, this module clones the nav logo markup into the intro slot on init, hides the real nav logo while the intro section is visible, and disposes the clone at morph-complete (simultaneously revealing the real nav logo). This keeps the nav logo in its stable DOM position at all times and avoids Flip reparent of a live element.

```js
// IIFE module — home-scroll-morph.js
(function () {
  'use strict';
  const VERSION = '2026.4.9.1';
  const DEBUG = false;

  let ctx = null;
  let scrubTL = null;
  let scrollTrigger = null;
  let initialised = false;
  let complete = false;
  let introSlot = null;
  let navLogoLink = null;      // real nav logo wrapper link (stable)
  let navLogoWrapper = null;   // real .nav_logo-wrapper-2.is-nav inside nav
  let cloneEl = null;          // the cloned big logo that lives in the intro slot
  let dialEl = null;

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function redrawDialCanvas() {
    // work-dial listens for resize and re-paints its canvas.
    window.dispatchEvent(new Event('resize'));
  }

  function ensureClone() {
    // Clone the nav logo wrapper into the intro slot if not already there.
    if (!introSlot || !navLogoWrapper) return null;
    let existing = introSlot.querySelector('.nav_logo-wrapper-2.is-nav');
    if (existing) return existing;
    const clone = navLogoWrapper.cloneNode(true);
    clone.setAttribute('data-home-intro-clone', '');
    introSlot.appendChild(clone);
    return clone;
  }

  function hideNavLogo() {
    if (navLogoWrapper) window.gsap?.set(navLogoWrapper, { opacity: 0 });
  }
  function showNavLogo() {
    if (navLogoWrapper) window.gsap?.set(navLogoWrapper, { opacity: 1, clearProps: 'opacity' });
  }
  function removeClone() {
    if (cloneEl?.parentNode) cloneEl.parentNode.removeChild(cloneEl);
    cloneEl = null;
  }

  function init(container) {
    if (initialised) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) {
      console.warn('[home-scroll-morph] GSAP/ScrollTrigger missing');
      return;
    }

    introSlot = document.querySelector('.home-intro_logo-slot');
    navLogoLink = document.querySelector('.nav_logo-link');
    navLogoWrapper = document.querySelector('.nav_logo-link .nav_logo-wrapper-2.is-nav');
    dialEl = document.querySelector('.dial_component[data-dial-ns="home"]');

    if (!introSlot || !navLogoLink || !navLogoWrapper || !dialEl) {
      console.warn('[home-scroll-morph] required DOM missing — intro morph disabled', {
        introSlot: !!introSlot, navLogoLink: !!navLogoLink,
        navLogoWrapper: !!navLogoWrapper, dialEl: !!dialEl
      });
      return;
    }

    initialised = true;

    // 1. Clone the nav logo into the intro slot
    cloneEl = ensureClone();
    // 2. Hide the real nav logo while intro is visible
    hideNavLogo();

    ctx = gsap.context(() => {
      // Initial state: dial small (matches about size)
      gsap.set(dialEl, {
        '--dial-live-width': 'var(--dial-small-width)',
        '--dial-live-height': 'var(--dial-small-height)'
      });

      const buildTimeline = () => {
        if (scrubTL) scrubTL.kill();
        if (!cloneEl) return;

        scrubTL = gsap.timeline({
          scrollTrigger: {
            trigger: '.section_home-intro',
            start: 'top top',
            end: '+=100%',
            scrub: 0.5,
            onLeave: onMorphComplete,
            onEnterBack: onMorphReverse,
            invalidateOnRefresh: true
          }
        });

        // Dial small → large (drives CSS vars; work-dial reads these)
        scrubTL.to(dialEl, {
          '--dial-live-width': 'var(--dial-large-width)',
          '--dial-live-height': 'var(--dial-large-height)',
          ease: 'power3.inOut',
          duration: 1
        }, 0);

        // Clone logo tween: scale/position toward the nav target.
        const startRect = cloneEl.getBoundingClientRect();
        const targetRect = navLogoWrapper.getBoundingClientRect();
        const dx = targetRect.left + targetRect.width / 2 - (startRect.left + startRect.width / 2);
        const dy = targetRect.top + targetRect.height / 2 - (startRect.top + startRect.height / 2);
        const scaleTarget = targetRect.width / startRect.width;

        scrubTL.to(cloneEl, {
          x: dx,
          y: dy,
          scale: scaleTarget,
          ease: 'power3.inOut',
          duration: 1
        }, 0);
      };

      buildTimeline();
      scrollTrigger = scrubTL?.scrollTrigger || null;

      // Rebuild on resize (mobile sticky slot means the clone's layout origin
      // can change mid-scroll; invalidateOnRefresh re-measures on ST refresh).
      window.addEventListener('resize', buildTimeline);
    }, container || document);
  }

  function onMorphComplete() {
    complete = true;

    // Reveal the real nav logo, dispose the clone
    showNavLogo();
    removeClone();

    // Hide the (now-empty) intro section so it no longer takes layout
    const introSection = document.querySelector('.section_home-intro');
    if (introSection) window.gsap.set(introSection, { display: 'none' });

    redrawDialCanvas();

    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(true);
    }

    if (window.RHP?.lenis?.stop) window.RHP.lenis.stop();
    if (window.RHP?.scroll?.lock) window.RHP.scroll.lock();

    window.dispatchEvent(new CustomEvent('rhp:home-scroll-morph:complete'));
  }

  function onMorphReverse() {
    // User scrolled back up past the intro start — recreate the clone, hide nav logo.
    if (!introSlot || !navLogoWrapper) return;
    cloneEl = ensureClone();
    if (cloneEl) window.gsap.set(cloneEl, { clearProps: 'all' });
    hideNavLogo();
    complete = false;
  }

  function skipToEnd() {
    // Called on Barba re-entry to home. Land in dial-large state without animation.
    // Re-query DOM because Barba just swapped the home container.
    introSlot = document.querySelector('.home-intro_logo-slot');
    navLogoLink = document.querySelector('.nav_logo-link');
    navLogoWrapper = document.querySelector('.nav_logo-link .nav_logo-wrapper-2.is-nav');
    dialEl = document.querySelector('.dial_component[data-dial-ns="home"]');

    const introSection = document.querySelector('.section_home-intro');
    if (introSection) introSection.style.display = 'none';

    // Ensure nav logo is visible (no clone needed)
    removeClone();
    showNavLogo();

    if (dialEl) {
      window.gsap.set(dialEl, {
        '--dial-live-width': 'var(--dial-large-width)',
        '--dial-live-height': 'var(--dial-large-height)'
      });
    }
    complete = true;
    initialised = true; // block double-init from view hook
    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(true);
    }
    if (window.RHP?.lenis?.stop) window.RHP.lenis.stop();
    if (window.RHP?.scroll?.lock) window.RHP.scroll.lock();
    redrawDialCanvas();
  }

  function replay() {
    // Nav logo click on home: scroll to top, reverse timeline, re-show intro section.
    if (!scrubTL) return;
    const introSection = document.querySelector('.section_home-intro');
    if (introSection) introSection.style.display = '';

    // Recreate clone in the slot, hide real nav logo
    cloneEl = ensureClone();
    if (cloneEl) window.gsap.set(cloneEl, { clearProps: 'all' });
    hideNavLogo();

    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(false);
    }

    if (window.RHP?.scroll?.unlock) window.RHP.scroll.unlock();
    if (window.RHP?.lenis?.start) window.RHP.lenis.start();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    complete = false;
  }

  function destroy() {
    if (scrubTL) { scrubTL.kill(); scrubTL = null; }
    if (scrollTrigger) { scrollTrigger.kill(); scrollTrigger = null; }
    if (ctx) { ctx.revert(); ctx = null; }
    removeClone();
    showNavLogo();
    initialised = false;
    complete = false;
  }

  window.RHP = window.RHP || {};
  window.RHP.homeScrollMorph = {
    init, destroy, skipToEnd, replay,
    get complete() { return complete; },
    version: VERSION
  };
})();
```

**Why clone instead of Flip reparent?**
- The nav logo is persistent and outside Barba. Reparenting it mid-run risks losing listeners, cursor attributes, and any Webflow IX bindings.
- Cloning is a one-way operation: `cloneNode(true)` copies markup + inline SVG. No IX bindings are copied, but none are needed on the clone (it's purely visual during the morph).
- At morph complete, we dispose the clone and reveal the real nav logo. The user never sees the swap because both elements occupy the same screen position at that moment (the clone's tween end-state matches the nav logo's live position).
- Flip is no longer strictly required, but we keep it loaded for `about-transition` (if that symbol still uses it elsewhere) and for future use. If Flip is absent, this module still works.

### File 3: `home-about-slide.js` (NEW)

Simple GSAP tweens on the About Barba container. Both directions use `power3.out 0.75s`.

```js
(function () {
  'use strict';
  const VERSION = '2026.4.8.1';

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function leaveHomeToAbout({ current, next }) {
    // current = home container, next = about container
    const gsap = window.gsap;
    if (!gsap || !next?.container) return Promise.resolve();
    if (prefersReduced()) {
      gsap.set(next.container, { xPercent: 0, opacity: 1 });
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      gsap.fromTo(next.container,
        { xPercent: -100, opacity: 0 },
        { xPercent: 0, opacity: 1, duration: 0.75, ease: 'power3.out', onComplete: resolve }
      );
    });
  }

  function leaveAboutToHome({ current, next }) {
    // current = about container, next = home container
    const gsap = window.gsap;
    if (!gsap || !current?.container) return Promise.resolve();
    if (prefersReduced()) {
      gsap.set(current.container, { xPercent: -100, opacity: 0 });
      // Ensure dial is IDLE
      if (window.RHP?.workDial?.setDialState) {
        window.RHP.workDial.setDialState('IDLE');
      }
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      gsap.to(current.container, {
        xPercent: -100,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.out',
        onComplete: () => {
          if (window.RHP?.workDial?.setDialState) {
            window.RHP.workDial.setDialState('IDLE');
          }
          resolve();
        }
      });
    });
  }

  window.RHP = window.RHP || {};
  window.RHP.homeAboutSlide = {
    leaveHomeToAbout, leaveAboutToHome, version: VERSION
  };
})();
```

### File 4: `orchestrator.js` changes

**Remove:**
- `aboutTransitionTL` persistent timeline (lines ~1872–2020).
- All Flip-based home↔about morph logic.
- Any pre-positioning of logo/dial on direct-land /about.
- `initAboutHeroLogoHover(container)` and `destroyAboutHeroLogoHover()` (lines ~711–822). These drove hover-triggered SplitText/opacity/y tweens on `.section_about-hero .about-hero_ready .nav_logo-embed`.
- `initAboutHeroLogoScroll(container)` and `destroyAboutHeroLogoScroll()` (lines ~824 onward), including the `aboutHeroScrollCtx` and `scrollSplitInstances` state. This was the bell-curve mobile scroll-linked animation on the About hero big logo.
- Any orchestrator calls into those four functions (search for `initAboutHeroLogoHover`, `initAboutHeroLogoScroll`, `destroyAboutHeroLogoHover`, `destroyAboutHeroLogoScroll`). Typically called from the About view init/destroy and/or `rhp:barba:afterenter` handler.
- Any `window.innerWidth > 991` gating that was specific to these hero logo scroll animations.

**Why:** the big About-hero logo is being hidden (or removed) by the Webflow Designer prereq. With no big logo to animate, these four functions are dead code. The mobile scroll-linked logo reveal is replaced by the user's `position: sticky` CSS on `.home-intro_logo-slot` in combination with the ScrollTrigger scrub in `home-scroll-morph.js`.

**Add to Barba transitions array:**
```js
{
  name: 'home-to-about',
  from: { namespace: ['home'] },
  to: { namespace: ['about'] },
  async leave(data) { /* no-op — slide runs in enter */ },
  async enter(data) {
    await window.RHP.homeAboutSlide.leaveHomeToAbout(data);
  }
},
{
  name: 'about-to-home',
  from: { namespace: ['about'] },
  to: { namespace: ['home'] },
  async leave(data) {
    await window.RHP.homeAboutSlide.leaveAboutToHome(data);
  },
  async enter(data) {
    // Re-entry to home: skip intro, land in dial-large
    if (window.RHP?.homeScrollMorph?.skipToEnd) {
      window.RHP.homeScrollMorph.skipToEnd();
    }
  }
}
```

**Nav logo click handler (add to `initNavLogo()` or equivalent):**
```js
const navLogoLink = document.querySelector('.nav_logo-link');
if (navLogoLink) {
  navLogoLink.addEventListener('click', (e) => {
    const ns = document.querySelector('[data-barba-namespace]')?.dataset?.barbaNamespace;
    if (ns === 'home' && window.RHP?.homeScrollMorph?.complete) {
      e.preventDefault();
      window.RHP.homeScrollMorph.replay();
    }
    // else let default navigation happen
  });
}
```

**Home init hook:**
```js
// Inside home view init (fresh load)
if (window.RHP?.homeScrollMorph?.init) {
  window.RHP.homeScrollMorph.init(container);
}
window.addEventListener('rhp:home-intro:complete', () => {
  // Lenis already started by home-intro.js
  // ScrollTrigger has already built its timeline via init()
  window.ScrollTrigger?.refresh();
}, { once: true });
```

### File 5: `init.js` changes

Update `CONFIG.modules` to include the two new files in the order shown above. Bump `CONFIG.version`.

### File 6: `ready-hit-play.css` changes

```css
/* ── Home intro section ─────────────────────────────────────── */

/* Defensive namespace scoping: intro only renders on home.
   Prevents accidental display on about / case if the section markup
   bleeds through via a Webflow symbol or legacy copy. */
.section_home-intro {
  display: none;
}
[data-barba-namespace="home"] .section_home-intro {
  display: flex;
  height: 100vh;
  width: 100%;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.home-intro_logo-slot {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* NOTE: user has already added `position: sticky; top: 0;` to
   .home-intro_logo-slot at mobile breakpoints in Webflow Designer.
   This replaces the old initAboutHeroLogoScroll bell-curve interaction:
   on mobile, the slot pins within the 100vh intro section while the
   user scrolls, preserving the "scroll-driven logo reveal" feel.
   No JS mobile branch is needed. */

/* Dial "live" size custom properties — driven by home-scroll-morph */
.dial_component[data-dial-ns="home"] {
  width: var(--dial-live-width, var(--dial-small-width));
  height: var(--dial-live-height, var(--dial-small-height));
}

/* ── About hero cleanup (if big logo is kept visually in Designer) ── */
/* If user opts to leave the big .about-hero_ready markup on /about
   as a visual-only element, remove any transforms/filters the old
   hover/scroll animations might have left on it. The old init*HeroLogo*
   functions applied inline styles that stuck around after destroy.
   Clearing these resets to the Designer baseline. */
.section_about-hero .about-hero_ready {
  transform: none;
  filter: none;
  opacity: 1;
}
```

Work-dial already reads `--dial-large-width/height` and `--dial-small-width/height` — we introduce `--dial-live-width/height` as the value that is tweened.

**Mobile sticky slot — compatibility note:** User's Webflow CSS adds `position: sticky; top: 0;` to `.home-intro_logo-slot` at mobile breakpoints. This is compatible with the ScrollTrigger scrub because:
1. The trigger is `.section_home-intro`, not the slot — the 100vh scroll range is measured on the section, unaffected by the slot's sticky positioning.
2. `invalidateOnRefresh: true` re-measures `startRect` / `targetRect` on every ST refresh, so even if the sticky slot's layout origin shifts during scroll, the clone's tween start-point is always up to date.
3. `cloneEl.getBoundingClientRect()` is evaluated lazily inside `buildTimeline()` when ScrollTrigger refreshes — so at the moment the tween is built, it reflects the slot's actual current position (sticky or not).

If the mobile sticky causes noticeable drift in the clone's transform (because sticky offsets compound with GSAP's `x/y`), the fallback is to attach the sticky to `.home-intro_logo-slot > .home-intro_logo-inner` and leave the slot itself statically positioned, isolating the sticky effect from the tween target.

## Edge cases

| Scenario | Handling |
|----------|----------|
| Webflow Designer prereq missing (no `.home-intro_logo-slot` or logo symbol) | `home-scroll-morph.init()` logs warning and no-ops. Home still loads, intro section absent, dial defaults to large size. |
| `prefers-reduced-motion` | Intro sequence runs fast-forward (already handled in home-intro.js). Scroll-morph timeline replaced with `gsap.set()` jump-cut at scroll end. About slide becomes instant `gsap.set()`. |
| iOS autoplay rejected | Existing tap-to-play fallback in `home-intro.js` runs untouched. |
| Rapid Barba navigation home ↔ about ↔ home | Each direction calls its slide, orchestrator awaits the tween, `skipToEnd()` fires on home re-entry to land in dial-large. |
| Case → home handoff | Unchanged — work-dial's existing ACTIVE handoff path runs after `skipToEnd()`. |
| Direct-land /about (user pastes /about URL) | About loads normally, no slide. Home is not initialised until first navigation. |
| Resize during intro | ScrollTrigger `invalidateOnRefresh: true` rebuilds the timeline with fresh Flip measurements. |
| Resize after morph complete | Scroll is locked, timeline is killed-at-end. Resize just triggers dial canvas redraw via work-dial's own resize listener. |
| Nav logo click while replay is mid-reverse | `replay()` is a no-op if `complete === false`. |
| Fast scroll through 100vh | Scrub smooths it (`scrub: 0.5`); onLeave fires exactly once per crossing. |

## Barba Impact

1. **Init/Destroy lifecycle:**
   - `home-intro.js` — adds no new listeners beyond what it already has. `destroy()` already exists.
   - `home-scroll-morph.js` — new DOM listeners (resize, ScrollTrigger). Must expose `destroy()` that kills `ctx`, `scrubTL`, and the resize listener. Orchestrator calls `destroy()` on Barba `leave` from home.
   - `home-about-slide.js` — stateless, no init/destroy lifecycle; just exposes functions that build one-shot tweens.

2. **State survival:**
   - `homeScrollMorph.complete` flag persists across Barba transitions because the module is never reinstantiated between navigations (IIFE at load time). On `skipToEnd()` after Barba re-entry, it re-sets the DOM + flag.
   - Logo element: lives inside Barba container on fresh load; after morph complete it is reparented into `.nav_logo-link` which is OUTSIDE Barba. On Barba leave (home→about), Barba only destroys the home container — the logo is safe inside the nav. On Barba enter (about→home), a fresh home container is mounted but `skipToEnd()` ensures the logo stays in the nav and the intro section is hidden.

3. **Transition interference:**
   - The About slide runs on the `[data-barba-namespace="about"]` container directly. `xPercent` + `opacity` tweens are confined to the Barba container; dial + nav + bg video live outside and are untouched.
   - No z-index conflicts: About container is positioned relative inside Barba wrapper; dial_component has its own stacking context.

4. **Re-entry correctness:**
   - Home→About→Home: `about-to-home` transition calls `skipToEnd()` in enter hook. Intro section is set to `display: none`, logo is in nav, dial is large, scroll is locked.
   - Home→Case→Home: existing case handoff path (`RHP.videoState.caseHandoff`) runs after `skipToEnd()`. Work-dial reads the handoff and sets `dialState = ACTIVE` directly with the previous project's index. `skipToEnd()` must fire BEFORE the handoff consumer so the dial is already at the large CSS size.
   - Multiple cycles: `skipToEnd()` is idempotent — it checks `logoEl.parentNode !== navSlot` before reparenting.

5. **Namespace scoping:**
   - `home-scroll-morph.js` runs only on `home` namespace (orchestrator inits it in the home view init block). If called on about or case, it no-ops because `.home-intro_logo-slot` won't exist.
   - `home-about-slide.js` is only invoked from the Barba transition entries for home↔about.
   - `home-intro.js` is gated by `hasRun` — runs exactly once per hard page load on home.

## Verify Loop

### Pass/fail criteria

- [ ] Fresh load /home: intro section visible at top, IDLE video plays in background, dial rendered small, large logo centred
- [ ] Scroll 100vh: logo smoothly moves to nav position, dial smoothly expands to large, timing feels synchronised
- [ ] After 100vh: page scroll is locked (window.scrollY doesn't change on wheel), intro section has `display: none`
- [ ] After 100vh: dial canvas is crisp (not pixelated)
- [ ] After 100vh: work-dial interaction works (hover/drag triggers ACTIVE state, video swap)
- [ ] `RHP.homeScrollMorph.complete === true` after morph
- [ ] Click nav logo on home: scroll smoothly returns to top, morph reverses, intro visible again, dial back to small, nav logo returns to intro slot
- [ ] Home → About: About container slides in from left (translateX -100% → 0%, opacity 0 → 1), 0.75s, power3.out
- [ ] About → Home: About container slides out left (0% → -100%, opacity 1 → 0), dial transitions to IDLE state, home is in dial-large state
- [ ] Home → About → Home (Barba): no flash of intro section, home lands directly in dial-large state
- [ ] Case → Home (Barba): existing handoff still works — dial is ACTIVE with previous project
- [ ] No JS errors in console throughout all scenarios
- [ ] `prefers-reduced-motion`: intro still plays (fast-forward), morph is a jump-cut at scroll end, slides are instant
- [ ] Mobile 375px: same scroll-driven interaction, logo clone morphs smoothly above the sticky slot, canvas not pixelated after resize
- [ ] Webflow Designer prereq missing: page loads with console warning, no intro section, dial defaults to large — site still functional
- [ ] `/about` page: `.section_home-intro` is `display: none` (defensive CSS scoping works)
- [ ] `/case-studies/<any>` page: `.section_home-intro` is `display: none`
- [ ] `/about` page: no residual hover/scroll animations on `.section_about-hero .about-hero_ready` (no transform/filter mutations, no SplitText wrappers injected)
- [ ] Nav logo is visible on /about and /case after the removed logo animations are deleted — no regression from orphaned listeners

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/` (hard load)
2. Observe intro section: large logo, small dial, IDLE video playing
3. Scroll slowly to 100vh → observe logo morph + dial expand
4. Try scrolling further → confirm scroll is locked
5. Hover/drag dial → confirm work-dial ACTIVE behaviour
6. Click nav logo → confirm replay
7. Click About link → observe slide-in from left
8. Click Home → observe slide-out left, home in dial-large state
9. Navigate to a case study → back to home → confirm handoff
10. Reload with `prefers-reduced-motion: reduce` in devtools → confirm fast-forward behaviour
11. Resize to 375px × 812px → reload → repeat steps 2–4

### Tier mapping

- **Tier 1 (Playwright local)**: intro DOM present on fresh load, scroll 100vh triggers `rhp:home-scroll-morph:complete` event, `RHP.homeScrollMorph.complete === true`, scroll-after-complete does not change `window.scrollY`, dial has `--dial-live-width` = `--dial-large-width`, Barba re-entry skips intro (no intro section in DOM), console errors count = 0, reduced-motion fast-path works.
- **Tier 2 (CDN regression)**: same tests in `tests/registry.json` as `rhp-home-intro-scroll-morph`.
- **Tier 3 (Manual)**: visual quality of Flip reparent (smooth, no jump), subjective timing feel of 100vh scroll-driven morph, mobile drag interaction after morph completes, case handoff visual continuity, Safari/Firefox compatibility for Flip + ScrollTrigger scrub, iOS autoplay fallback tap flow (requires real device).

### Regression scope

- **work-dial.js**: sector switching, video pool, hover/drag, case handoff — must not break after morph completion.
- **home-intro.js**: iOS autoplay tap-to-play fallback must still fire if `tryPlay()` rejects.
- **cursor.js**: custom cursor states must continue to work on both intro and post-morph homepage. Clone element must inherit `data-cursor="dot"` attributes from the cloneNode so cursor feedback survives on the clone.
- **About page**: continues to work when navigated via slide. Big `.about-hero_ready` logo in `.section_about-hero` is visually hidden/removed via Webflow Designer. Hover and scroll animations are deleted from orchestrator.js. The About hero should render without the old logo interaction.
- **Case pages**: earth-parallax, case-video-controls, intro-format all unchanged.
- **Barba transitions**: case↔home, case↔case, home→case, about→case must still work (only home↔about is changed).
- **Lenis**: about page and case pages Lenis behaviour unchanged. Only home gains a temporary Lenis window during the intro → morph phase.
- **Mobile scroll-driven logo reveal**: user's `position: sticky` CSS on `.home-intro_logo-slot` replaces the old `initAboutHeroLogoScroll` bell-curve animation. The visual effect should still read as "logo reveals as you scroll" but driven by scroll + sticky + the morph tween instead of a JS-animated bell curve.

## Tasks

1. **Refactor `home-intro.js`** — Strip post-intro logic, keep autoplay fallback untouched, dispatch `rhp:home-intro:complete` + start Lenis on completion, set `RHP.homeIntro.done = true`.
2. **Create `home-scroll-morph.js`** — IIFE module with init, destroy, skipToEnd, replay. Clone-from-nav logic, ScrollTrigger scrub timeline, canvas redraw, scroll-lock handoff.
3. **Create `home-about-slide.js`** — IIFE module exposing `leaveHomeToAbout` and `leaveAboutToHome` functions.
4. **Modify `orchestrator.js`** — Delete:
   - Old Flip `aboutTransitionTL`
   - `initAboutHeroLogoHover` + `destroyAboutHeroLogoHover`
   - `initAboutHeroLogoScroll` + `destroyAboutHeroLogoScroll`
   - All call sites for the four removed functions
   Add: Barba transitions for home↔about using `home-about-slide`, `home-scroll-morph.init()` on home view init, `skipToEnd()` on Barba re-entry to home, nav logo click handler for replay.
5. **Modify `init.js`** — Add `home-scroll-morph.js` and `home-about-slide.js` to CONFIG.modules. Bump version.
6. **Modify `ready-hit-play.css`** — Add `.section_home-intro` defensive namespace scoping (`display:none` by default, `display:flex` inside `[data-barba-namespace="home"]`), `.home-intro_logo-slot` base rules, `--dial-live-*` custom property rules, and `.section_about-hero .about-hero_ready` reset (transform/filter/opacity).
7. **Generate Playwright acceptance tests** — `tests/acceptance/rhp-home-intro-scroll-morph.spec.js` covering all Tier 1 criteria plus the new regressions: intro section has `display: none` on about/case; no About-hero-logo animations firing on about.
8. **Register in `tests/registry.json`** — Add entry with slug, file, type, source, critical, description.
9. **QA on staging** — Run smoke + new acceptance test after deploy; manual Tier 3 checklist.

## Parallelisation Map

Approach C's decomposition into three modules enables genuine parallel execution. Modules 2 and 3 are independent of each other; module 1 and orchestrator changes have a light cross-dependency (orchestrator reads new events) but can still run in parallel if the interface is locked first.

| Task | Agent | Est. tokens | Depends on | Stream |
|------|-------|-------------|------------|--------|
| 1. Refactor home-intro.js | code-writer | ~6k | — | A |
| 2. Create home-scroll-morph.js | code-writer | ~12k | — | B |
| 3. Create home-about-slide.js | code-writer | ~4k | — | C |
| 4. Modify orchestrator.js | code-writer | ~8k | 1, 2, 3 | D (sequential) |
| 5. Modify init.js + CSS | code-writer | ~3k | — | E |
| 6. Multi-perspective code review | code-reviewer ×3 | ~9k | 1–5 | F (sequential) |
| 7. Acceptance tests | code-writer | ~6k | — | G |
| 8. Registry update | code-writer | ~1k | 7 | H (sequential) |
| 9. Deploy + QA | qa | ~5k | 1–8 | I (sequential) |

**Recommendation**: Spawn Streams A, B, C, E, G **in parallel** (5 code-writer agents, no shared files), then run Stream D (orchestrator) once the interfaces are locked (≈5 min), then Stream F (reviewers), then H, then I. Expected speedup: ~2.8× vs sequential. Use worktrees if touching orchestrator.js alongside home-intro.js to avoid merge pain. Agent Teams NOT required — no mid-task collaboration between streams.

## Test Plan

### Tier 1 — Auto: Playwright local

File: `projects/ready-hit-play-prod/tests/acceptance/rhp-home-intro-scroll-morph.spec.js`

1. **Fresh load intro visible** — `.section_home-intro` exists and is visible, logo in `.home-intro_logo-slot`, dial width matches small size, IDLE video element has `readyState >= 2`.
2. **Scroll 100vh triggers morph complete** — Scroll to `window.innerHeight`, wait for `rhp:home-scroll-morph:complete` event, assert `window.RHP.homeScrollMorph.complete === true`, assert `.nav_logo-link .nav_logo-wrapper-2.is-nav` exists (logo reparented).
3. **Scroll lock after complete** — After morph, attempt `window.scrollTo(0, 500)` → assert `window.scrollY === 0` (locked).
4. **Intro section hidden after complete** — `.section_home-intro` has `display: none`.
5. **Dial is large after morph** — computed `width` of `.dial_component` matches the `--dial-large-width` custom property.
6. **No console errors during full flow** — Collect pageerrors across fresh load + scroll + morph completion → `toHaveLength(0)`.
7. **Barba re-entry skips intro** — Navigate to /about, then back to /, wait for Barba enter, assert intro section absent + `RHP.homeScrollMorph.complete === true`.
8. **Home→About slide** — Click about link, wait for slide, assert About container is visible and at `xPercent: 0`.
9. **About→Home slide + IDLE state** — From /about, click home link, wait for slide + `skipToEnd()`, assert `RHP.workDial.getDialState?.() === 'IDLE'` (or fallback assertion on `.dial_component` CSS class).
10. **Reduced motion** — With `reducedMotion: 'reduce'`, fresh-load intro completes fast, scroll-morph jump-cuts at scroll end, no JS errors.
11. **Mobile 375px** — Viewport 375×812, fresh load, scroll 100vh, morph completes, no layout breakage.
12. **Nav logo replay** — After morph complete, click nav logo, wait for scroll-to-top + reverse, assert intro section visible again + `RHP.homeScrollMorph.complete === false`.
13. **About page intro hidden** — Navigate to /about, assert `getComputedStyle('.section_home-intro').display === 'none'` (CSS defensive scoping works even if markup exists).
14. **Case page intro hidden** — Navigate to /case-studies/overland-ai, assert `.section_home-intro` is absent from the DOM OR computed display is none.
15. **About hero hover animations removed** — Navigate to /about, hover over `.section_about-hero .about-hero_ready` (first one), wait 500ms, assert element has no inline `transform` or `filter` style (i.e. no animation was triggered).

### Tier 2 — Auto: CDN regression

- Same test file registered in `tests/registry.json` with `id: "rhp-home-intro-scroll-morph"`, `critical: false`, `source: "plan"`.

### Tier 3 — Manual

- Visual smoothness of Flip reparent (no jump/flicker) — subjective
- Subjective timing of 100vh scroll-driven morph (does it feel good?) — subjective
- Mobile drag interaction with work-dial after morph completes — requires real device touch input
- Case→Home handoff visual continuity with new architecture — requires full multi-page flow
- Safari/Firefox compatibility for Flip + ScrollTrigger scrub — Playwright runs Chromium only
- iOS autoplay fallback tap flow — requires real iOS device

## Acceptance Tests

Generated file: `projects/ready-hit-play-prod/tests/acceptance/rhp-home-intro-scroll-morph.spec.js`

Tests:
- `fresh load: intro section visible, dial small, clone in slot`
- `scroll 100vh: morph completes, clone disposed, nav logo visible`
- `after morph: scroll is locked`
- `after morph: intro section hidden, dial is large`
- `no JS errors on full intro → morph flow`
- `Barba re-entry: intro is skipped, dial lands large`
- `home → about: About container slides in from left`
- `about → home: About slides out, dial returns to IDLE, home is dial-large`
- `reduced motion: no animation, content visible, no errors`
- `mobile 375px: intro + morph work at mobile viewport with sticky slot`
- `nav logo click: replay reverses morph and shows intro`
- `no WCAG 2.1 AA violations on home with intro visible` (axe-core soft assert)
- `about page: .section_home-intro is display:none (CSS scoping)`
- `case page: .section_home-intro is absent or display:none`
- `about page: no hover/scroll animation on .about-hero_ready (deleted functions)`

**Note**: The existing `rhp-home-intro-scroll-morph.spec.js` was generated before the clone-from-nav and defensive CSS scoping decisions. Tasks #7 and #15 in the task list will update the test file to: (a) use clone/nav-logo assertions instead of "logo reparented" assertions, (b) add the three new regression tests, (c) adjust mobile test to expect sticky slot behaviour.
