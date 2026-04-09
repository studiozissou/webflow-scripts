/* =========================================
   RHP — Home Scroll Morph
   Clones the nav logo into .home-intro_logo-slot, drives a ScrollTrigger
   scrub timeline that expands the dial small→large and moves the cloned
   logo to the nav position. At morph-complete the clone disposes and the
   real nav logo is revealed. On Barba re-entry skipToEnd() lands directly
   in dial-large state.
   ========================================= */
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
  let _resizeHandler = null;   // stored bound ref so destroy() can remove it

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function redrawDialCanvas() {
    // work-dial listens for resize and re-paints its canvas.
    window.dispatchEvent(new Event('resize'));
  }

  /** Re-queries module-scoped DOM refs. Called by init() and skipToEnd()
      since Barba swaps the [data-barba="container"] on every transition.
      .home-intro_logo-slot lives INSIDE the container (home namespace);
      nav + dial persist outside the container. */
  function _queryDOMRefs(container) {
    introSlot = (container && container.querySelector('.home-intro_logo-slot')) ||
      document.querySelector('.home-intro_logo-slot');
    navLogoLink = document.querySelector('.nav_logo-link');
    navLogoWrapper = document.querySelector('.nav_logo-link .nav_logo-wrapper-2.is-nav');
    dialEl = document.querySelector('.dial_component[data-dial-ns="home"]');
  }

  function ensureClone() {
    // Clone the nav logo wrapper into the intro slot if not already there.
    if (!introSlot || !navLogoWrapper) return null;
    const existing = introSlot.querySelector('.nav_logo-wrapper-2.is-nav');
    if (existing) return existing;
    const clone = navLogoWrapper.cloneNode(true);
    clone.setAttribute('data-home-intro-clone', '');
    introSlot.appendChild(clone);
    return clone;
  }

  function hideNavLogo() {
    if (navLogoWrapper && window.gsap) window.gsap.set(navLogoWrapper, { opacity: 0 });
  }
  function showNavLogo() {
    if (navLogoWrapper && window.gsap) {
      window.gsap.set(navLogoWrapper, { opacity: 1, clearProps: 'opacity' });
    }
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
      DEBUG && console.warn('[home-scroll-morph] GSAP/ScrollTrigger missing');
      return;
    }

    _queryDOMRefs(container);

    if (!introSlot || !navLogoLink || !navLogoWrapper || !dialEl) {
      DEBUG && console.warn('[home-scroll-morph] required DOM missing — intro morph disabled', {
        introSlot: !!introSlot,
        navLogoLink: !!navLogoLink,
        navLogoWrapper: !!navLogoWrapper,
        dialEl: !!dialEl
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
        // Kill previous timeline + ScrollTrigger explicitly. scrubTL.kill()
        // does NOT propagate to the attached ScrollTrigger — without this
        // explicit kill, resize rebuilds leak dead ScrollTriggers.
        if (scrubTL) {
          if (scrubTL.scrollTrigger) scrubTL.scrollTrigger.kill();
          scrubTL.kill();
          scrubTL = null;
        }
        if (scrollTrigger) {
          scrollTrigger.kill();
          scrollTrigger = null;
        }
        if (!cloneEl) return;

        if (prefersReduced()) {
          // Reduced motion: no tween, callback-only ScrollTrigger.
          scrollTrigger = ScrollTrigger.create({
            trigger: '.section_home-intro',
            start: 'top top',
            end: '+=100%',
            onLeave: onMorphComplete,
            onEnterBack: onMorphReverse,
            invalidateOnRefresh: true
          });
          return;
        }

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
        const scaleTarget = startRect.width > 0 ? targetRect.width / startRect.width : 1;

        scrubTL.to(cloneEl, {
          x: dx,
          y: dy,
          scale: scaleTarget,
          ease: 'power3.inOut',
          duration: 1
        }, 0);

        // Capture for explicit cleanup on next rebuild / destroy.
        scrollTrigger = scrubTL.scrollTrigger || null;
      };

      buildTimeline();

      // Rebuild on resize AND on replay() (clone is recreated — timeline
      // needs to re-target the new node). Stored outside the ctx so destroy()
      // can remove it and replay() can call it.
      _resizeHandler = buildTimeline;
      window.addEventListener('resize', _resizeHandler);
    }, container || document);
  }

  /** Shared post-complete side effects for both the scrub-end path and the
      Barba re-entry skipToEnd path. Keeps the two code paths from drifting. */
  function _applyCompleteState() {
    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(true);
    }
    if (window.RHP?.lenis?.stop) window.RHP.lenis.stop();
    if (window.RHP?.scroll?.lock) window.RHP.scroll.lock();
    redrawDialCanvas();
  }

  function onMorphComplete() {
    complete = true;

    // Reveal the real nav logo, dispose the clone
    showNavLogo();
    removeClone();

    // Hide the (now-empty) intro section so it no longer takes layout
    const introSection = document.querySelector('.section_home-intro');
    if (introSection && window.gsap) window.gsap.set(introSection, { display: 'none' });

    _applyCompleteState();

    DEBUG && console.log('[home-scroll-morph] complete');
    window.dispatchEvent(new CustomEvent('rhp:home-scroll-morph:complete'));
  }

  function onMorphReverse() {
    // User scrolled back up past the intro start — recreate the clone, hide nav logo.
    if (!introSlot || !navLogoWrapper) return;
    cloneEl = ensureClone();
    if (cloneEl && window.gsap) window.gsap.set(cloneEl, { clearProps: 'all' });
    hideNavLogo();
    complete = false;
    // Defensive: restore scroll/lenis so the intro remains scrub-able. Under
    // normal CSS-locked conditions this branch is unreachable, but if a future
    // change leaves scroll unlocked after onMorphComplete, we want the reverse
    // path to re-enter a scrollable state rather than stranding the user.
    if (window.RHP?.scroll?.unlock) window.RHP.scroll.unlock();
    if (window.RHP?.lenis?.start) window.RHP.lenis.start();
  }

  function skipToEnd(container) {
    // Called on Barba re-entry to home. Land in dial-large state without animation.
    // Re-query DOM because Barba just swapped the home container.
    _queryDOMRefs(container);

    const introSection = document.querySelector('.section_home-intro');
    if (introSection) introSection.style.display = 'none';

    // Ensure nav logo is visible (no clone needed)
    removeClone();
    showNavLogo();

    if (dialEl && window.gsap) {
      window.gsap.set(dialEl, {
        '--dial-live-width': 'var(--dial-large-width)',
        '--dial-live-height': 'var(--dial-large-height)'
      });
    }
    complete = true;
    initialised = true; // block double-init from view hook
    _applyCompleteState();
  }

  function replay() {
    // Nav logo click on home: scroll to top, reverse timeline, re-show intro section.
    // Guard: replay only works when a scrub timeline was built on first load.
    // On Barba re-entry we call skipToEnd() instead (no scrub timeline).
    if (!_resizeHandler) return;
    const introSection = document.querySelector('.section_home-intro');
    if (introSection) introSection.style.display = '';

    // Recreate clone in the slot, hide real nav logo
    cloneEl = ensureClone();
    if (cloneEl && window.gsap) window.gsap.set(cloneEl, { clearProps: 'all' });
    hideNavLogo();

    // Rebuild the scrub timeline to re-target the fresh clone node. Without
    // this, the previous scrubTL still animates a detached cloneEl reference.
    _resizeHandler();

    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(false);
    }

    if (window.RHP?.scroll?.unlock) window.RHP.scroll.unlock();
    if (window.RHP?.lenis?.start) window.RHP.lenis.start();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    complete = false;
  }

  function destroy() {
    if (_resizeHandler) {
      window.removeEventListener('resize', _resizeHandler);
      _resizeHandler = null;
    }
    // Mirror buildTimeline() kill order: ScrollTrigger first (scrubTL.kill()
    // does NOT propagate to the attached ScrollTrigger), then the timeline.
    if (scrubTL) {
      if (scrubTL.scrollTrigger) scrubTL.scrollTrigger.kill();
      scrubTL.kill();
      scrubTL = null;
    }
    if (scrollTrigger) { scrollTrigger.kill(); scrollTrigger = null; }
    if (ctx) { ctx.revert(); ctx = null; }
    removeClone();
    showNavLogo();
    initialised = false;
    complete = false;
  }

  window.RHP = window.RHP || {};
  window.RHP.homeScrollMorph = {
    init,
    destroy,
    skipToEnd,
    replay,
    get complete() { return complete; },
    version: VERSION
  };
})();
