# RHP: Home Intro Section + Scroll-Driven Morph + About Slide Transitions

**Slug:** `rhp-home-intro-scroll-morph`
**Client:** ready-hit-play-prod
**Status:** Ready to Build
**Approach:** C — Hybrid decomposition (3 modules)

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

- No Designer/CMS schema changes beyond adding the new `.home_intro` container and moving the existing logo markup into it.
- No change to case-page transitions, work-dial internals, or the video pool.
- No mobile-specific intro UI — same scroll-driven interaction at all breakpoints.
- No removal of the current intro sequence (step text → dial ticks → video fade) — it runs inside the new intro section.

## DOM Context

### Current state (live, verified via Chrome DevTools MCP)

- **Big logo** (/about only): `.section_about-hero .nav_logo-wrapper-2.is-nav` — contains 3× `.about-hero_ready` SVG. Inside Barba container `[data-barba-namespace="about"]`.
- **Small nav logo** (all pages): `.nav_logo-link > .nav_logo-wrapper-2.is-nav` — inside persistent nav, outside Barba.
- **Dial** (persistent, outside Barba): `.dial_component[data-dial-ns="home"|"work"]` — CSS controls visibility by namespace.
- **Home Barba container**: `[data-barba-namespace="home"]` — currently empty-ish; dial + nav live outside.
- **Transition dial** (small static canvas): `.transition-dial` — separate module.
- **Home bg video**: owned by `work-dial.js`, `RHP.workDial.getIntroVideoEl()` returns it.

### After Webflow Designer prereq (user will do before /build)

1. In the home Barba container, add a new section: `<section class="section_home-intro" data-home-intro>` with a flex-centred wrapper `.home-intro_logo-slot` that will receive the reparented logo.
2. Move (cut) the `.nav_logo-wrapper-2.is-nav` + `.about-hero_ready` SVG markup from the About hero into a Webflow **symbol** named `home-intro-logo`.
3. Place the symbol instance inside `.home-intro_logo-slot` on the home page. Remove the big-logo instance from the About hero (About hero becomes text-only).
4. Ensure both `.nav_logo-link` (nav) and `.home-intro_logo-slot` use identical intrinsic layout for the logo wrapper so Flip can measure cleanly (same `display`, no transform).
5. Add `.home_intro` class to the new section and give it `height: 100vh` in Webflow Designer (the JS will `ScrollTrigger.refresh()` on resize).

**Prereq confirmation step**: `home-scroll-morph.js` will fail loudly with a console warning if `.home-intro_logo-slot` or the reparented logo SVG is missing, and will no-op (no scroll lock, no morph) so the site still works.

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

### File 2: `home-scroll-morph.js` (NEW)

```js
// IIFE module — home-scroll-morph.js
(function () {
  'use strict';
  const VERSION = '2026.4.8.1';
  const DEBUG = false;

  let ctx = null;
  let flipState = null;
  let scrubTL = null;
  let scrollTrigger = null;
  let initialised = false;
  let complete = false;
  let introSlot = null;
  let navSlot = null;
  let logoEl = null;
  let dialEl = null;

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function redrawDialCanvas() {
    // Redraw the work-dial canvas at new size to avoid pixelation.
    // work-dial.js exposes no redraw API yet — we'll fire a resize event
    // which work-dial listens for and triggers its own canvas re-paint.
    window.dispatchEvent(new Event('resize'));
  }

  function init(container) {
    if (initialised) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const Flip = window.Flip;
    if (!gsap || !ScrollTrigger || !Flip) {
      console.warn('[home-scroll-morph] GSAP/ScrollTrigger/Flip missing');
      return;
    }

    introSlot = document.querySelector('.home-intro_logo-slot');
    navSlot = document.querySelector('.nav_logo-link');
    logoEl = document.querySelector('.home-intro_logo-slot .nav_logo-wrapper-2.is-nav');
    dialEl = document.querySelector('.dial_component[data-dial-ns="home"]');

    if (!introSlot || !navSlot || !logoEl || !dialEl) {
      console.warn('[home-scroll-morph] required DOM missing — intro morph disabled');
      return;
    }

    initialised = true;
    ctx = gsap.context(() => {
      // Initial state: dial small (matches about size), logo in intro slot
      gsap.set(dialEl, {
        '--dial-live-width': 'var(--dial-small-width)',
        '--dial-live-height': 'var(--dial-small-height)'
      });

      // Build scrub timeline gated on intro completion
      const buildTimeline = () => {
        if (scrubTL) scrubTL.kill();

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

        // Dial small → large (drive CSS vars; work-dial reads these)
        scrubTL.to(dialEl, {
          '--dial-live-width': 'var(--dial-large-width)',
          '--dial-live-height': 'var(--dial-large-height)',
          ease: 'power3.inOut',
          duration: 1
        }, 0);

        // Logo reparent via Flip happens at scroll progress 1.0 (not scrubbed —
        // Flip is an immediate transform, so we trigger it at the end).
        // Instead: tween logo scale + position during scrub, then do a final
        // Flip reparent at onLeave.
        const startRect = logoEl.getBoundingClientRect();
        const targetRect = navSlot.getBoundingClientRect();
        const dx = targetRect.left + targetRect.width / 2 - (startRect.left + startRect.width / 2);
        const dy = targetRect.top + targetRect.height / 2 - (startRect.top + startRect.height / 2);
        const scaleTarget = targetRect.width / startRect.width;

        scrubTL.to(logoEl, {
          x: dx,
          y: dy,
          scale: scaleTarget,
          ease: 'power3.inOut',
          duration: 1
        }, 0);
      };

      buildTimeline();
      scrollTrigger = scrubTL.scrollTrigger;

      // Rebuild on resize
      window.addEventListener('resize', buildTimeline);
    }, container || document);
  }

  function onMorphComplete() {
    complete = true;
    if (!logoEl || !navSlot) return;

    // Flip-reparent the logo into the nav, keeping its visual position
    const state = window.Flip.getState(logoEl);
    navSlot.appendChild(logoEl);
    window.gsap.set(logoEl, { clearProps: 'all' });
    window.Flip.from(state, { duration: 0, absolute: false });

    // Hide the (now-empty) intro section so it no longer takes layout
    const introSection = document.querySelector('.section_home-intro');
    if (introSection) window.gsap.set(introSection, { display: 'none' });

    // Redraw dial canvas at new (large) size to avoid pixelation
    redrawDialCanvas();

    // Enable work-dial interaction
    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(true);
    }

    // Lock scroll
    if (window.RHP?.lenis?.stop) window.RHP.lenis.stop();
    if (window.RHP?.scroll?.lock) window.RHP.scroll.lock();

    window.dispatchEvent(new CustomEvent('rhp:home-scroll-morph:complete'));
  }

  function onMorphReverse() {
    // User scrolled back up past the intro start — re-parent logo to intro slot.
    if (!logoEl || !introSlot) return;
    const state = window.Flip.getState(logoEl);
    introSlot.appendChild(logoEl);
    window.gsap.set(logoEl, { clearProps: 'all' });
    window.Flip.from(state, { duration: 0, absolute: false });
    complete = false;
  }

  function skipToEnd() {
    // Called on Barba re-entry to home. Land in dial-large state without animation.
    init(document);
    const introSection = document.querySelector('.section_home-intro');
    if (introSection) introSection.style.display = 'none';
    if (navSlot && logoEl && logoEl.parentNode !== navSlot) {
      navSlot.appendChild(logoEl);
      window.gsap.set(logoEl, { clearProps: 'all' });
    }
    if (dialEl) {
      window.gsap.set(dialEl, {
        '--dial-live-width': 'var(--dial-large-width)',
        '--dial-live-height': 'var(--dial-large-height)'
      });
    }
    complete = true;
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

    // Re-parent logo back to intro slot
    if (logoEl && introSlot && logoEl.parentNode !== introSlot) {
      introSlot.appendChild(logoEl);
      window.gsap.set(logoEl, { clearProps: 'all' });
    }

    // Disable work-dial interaction while morph reverses
    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(false);
    }

    // Unlock + restart Lenis + scroll to top
    if (window.RHP?.scroll?.unlock) window.RHP.scroll.unlock();
    if (window.RHP?.lenis?.start) window.RHP.lenis.start();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    complete = false;
  }

  function destroy() {
    if (scrubTL) { scrubTL.kill(); scrubTL = null; }
    if (scrollTrigger) { scrollTrigger.kill(); scrollTrigger = null; }
    if (ctx) { ctx.revert(); ctx = null; }
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
/* New home intro section */
.section_home-intro {
  height: 100vh;
  width: 100%;
  display: flex;
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

/* Dial "live" size custom properties — driven by home-scroll-morph */
.dial_component[data-dial-ns="home"] {
  width: var(--dial-live-width, var(--dial-small-width));
  height: var(--dial-live-height, var(--dial-small-height));
}
```

Work-dial already reads `--dial-large-width/height` and `--dial-small-width/height` — we introduce `--dial-live-width/height` as the value that is tweened.

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
- [ ] Mobile 375px: same scroll-driven interaction, logo morph smooth, canvas not pixelated after resize
- [ ] Webflow Designer prereq missing: page loads with console warning, no intro section, dial defaults to large — site still functional

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
- **cursor.js**: custom cursor states must continue to work on both intro and post-morph homepage.
- **About page**: continues to work when navigated via slide. Big logo is now gone from About hero (intentional — it's a symbol, so removing from About page leaves text-only hero).
- **Case pages**: earth-parallax, case-video-controls, intro-format all unchanged.
- **Barba transitions**: case↔home, case↔case, home→case, about→case must still work (only home↔about is changed).
- **Lenis**: about page and case pages Lenis behaviour unchanged. Only home gains a temporary Lenis window during the intro → morph phase.

## Tasks

1. **Refactor `home-intro.js`** — Strip post-intro logic, keep autoplay fallback untouched, dispatch `rhp:home-intro:complete` + start Lenis on completion, set `RHP.homeIntro.done = true`.
2. **Create `home-scroll-morph.js`** — IIFE module with init, destroy, skipToEnd, replay. Flip-reparent logic, ScrollTrigger scrub timeline, canvas redraw, scroll-lock handoff.
3. **Create `home-about-slide.js`** — IIFE module exposing `leaveHomeToAbout` and `leaveAboutToHome` functions.
4. **Modify `orchestrator.js`** — Delete old Flip `aboutTransitionTL`. Add Barba transitions for home↔about using `home-about-slide`. Wire `home-scroll-morph.init()` on home view init. Wire `skipToEnd()` on Barba re-entry to home. Add nav logo click handler for replay.
5. **Modify `init.js`** — Add `home-scroll-morph.js` and `home-about-slide.js` to CONFIG.modules. Bump version.
6. **Modify `ready-hit-play.css`** — Add `.section_home-intro` + `.home-intro_logo-slot` + `--dial-live-*` custom property rules.
7. **Generate Playwright acceptance tests** — `tests/acceptance/rhp-home-intro-scroll-morph.spec.js` covering all Tier 1 criteria.
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
- `fresh load: intro section visible, dial small, logo in slot`
- `scroll 100vh: morph completes, logo reparented to nav`
- `after morph: scroll is locked`
- `after morph: intro section hidden, dial is large`
- `no JS errors on full intro → morph flow`
- `Barba re-entry: intro is skipped, dial lands large`
- `home → about: About container slides in from left`
- `about → home: About slides out, dial returns to IDLE, home is dial-large`
- `reduced motion: no animation, content visible, no errors`
- `mobile 375px: intro + morph work at mobile viewport`
- `nav logo click: replay reverses morph and shows intro`
- `no WCAG 2.1 AA violations on home with intro visible` (axe-core soft assert)
