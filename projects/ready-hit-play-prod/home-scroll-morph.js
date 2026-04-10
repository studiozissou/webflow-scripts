/* =========================================
   RHP — Home Scroll Morph
   On fresh home load the dial is LOCKED idle in .home_dial-start at dial-
   small size, the intro logo (about-hero style) is visible in .home-intro_
   logo-slot, and the nav is hidden. Scrolling through the 100vh intro
   section scrubs:
     • dial small → large (CSS vars on .dial_component)
     • intro logo toward the .nav_logo-wrapper position (transform scale)
     • step text opacity 0 → 1 (last 10% of scroll)
   At scrub-end: .rhp-home-ready is toggled on the wrapper (CSS FOUC rule
   falls off, nav items become visible via class cascade — no GSAP tween),
   scroll locks, dial unlocks (setIntroComplete + setAttractionEnabled +
   setInteractionUnlocked), intro section is display:none'd.
   The intro logo has an about-hero-style hover interaction (desktop) or
   scroll-driven reveal (mobile).
   ========================================= */
(function () {
  'use strict';
  const VERSION = '2026.4.10.1';
  const DEBUG = false;

  let ctx = null;
  let scrubTL = null;
  let scrollTrigger = null;
  let initialised = false;
  let complete = false;
  let introSlot = null;
  let navLogoLink = null;      // real nav logo link (stable)
  let navLogoWrapper = null;   // real .nav_logo-wrapper-2.is-nav inside nav
  let introLogoEl = null;      // real .nav_logo-wrapper-2 (no .is-nav) inside intro slot
  let dialEl = null;
  let sectionEl = null;        // .section_home-intro — used as element-ref trigger
  let stepTextEl = null;       // .heading-style-h7.is-step inside .dial_component[data-dial-ns="home"]
  let _resizeHandler = null;   // stored bound ref so destroy() can remove it
  let _hoverEnterHandler = null;
  let _hoverLeaveHandler = null;
  let _hoverTargetEl = null;
  let _hoverTL = null;

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function canHover() {
    return window.matchMedia?.('(hover: hover)').matches === true;
  }

  function redrawDialCanvas() {
    // work-dial listens for resize and re-paints its canvas.
    window.dispatchEvent(new Event('resize'));
  }

  /** Re-queries module-scoped DOM refs. Called by init() and skipToEnd()
      since Barba swaps the [data-barba="container"] on every transition.
      .section_home-intro + .home-intro_logo-slot live OUTSIDE the Barba
      container (as siblings of .section_home in main.main-wrapper). Nav
      and dial also persist outside the container. */
  function _queryDOMRefs(container) {
    sectionEl = document.querySelector('.section_home-intro');
    introSlot = (sectionEl && sectionEl.querySelector('.home-intro_logo-slot')) ||
      document.querySelector('.home-intro_logo-slot');
    // The real intro logo is the about-hero-style wrapper (no .is-nav).
    // Webflow places it inside .home-intro_logo-slot in the Designer.
    introLogoEl = introSlot?.querySelector('.nav_logo-wrapper-2:not(.is-nav)') || null;
    navLogoLink = document.querySelector('.nav_logo-link');
    navLogoWrapper = document.querySelector('.nav_logo-link .nav_logo-wrapper-2.is-nav');
    dialEl = document.querySelector('.dial_component[data-dial-ns="home"]');
    stepTextEl = document.querySelector('.dial_component[data-dial-ns="home"] .heading-style-h7.is-step') ||
      document.querySelector('.dial_component[data-dial-ns="home"] [data-text="step"]');
  }

  /** About-hero-style hover reveal for the intro logo. Desktop only — on
      mobile the reveal is scroll-driven via the scrub timeline. */
  function _initIntroLogoHover() {
    const gsap = window.gsap;
    if (!gsap || !introLogoEl) return;

    const rows = introLogoEl.querySelectorAll('.about-hero_ready');
    if (!rows.length) {
      DEBUG && console.warn('[home-scroll-morph] intro logo has no .about-hero_ready children — hover reveal disabled. Check Webflow Designer: .home-intro_logo-slot should contain .nav_logo-wrapper-2 with the same 3x.about-hero_ready structure as .section_about-hero.');
      return;
    }
    const uppers = introLogoEl.querySelectorAll('.about-hero_ready .heading-style-h3.is-about-upper');
    const lowers = introLogoEl.querySelectorAll('.about-hero_ready .heading-style-h3.is-about-lower');
    if (!uppers.length || !lowers.length) {
      DEBUG && console.warn('[home-scroll-morph] intro logo missing .is-about-upper / .is-about-lower text — hover reveal will be a no-op.');
    }

    // Initial masked state — CSS also sets opacity:0 so there's no FOUC before this runs.
    if (prefersReduced()) {
      gsap.set([uppers, lowers], { yPercent: 0, opacity: 1 });
      return;
    }

    gsap.set(uppers, { yPercent: -100, opacity: 0 });
    gsap.set(lowers, { yPercent: 100, opacity: 0 });

    if (!canHover()) {
      // Mobile: reveal is tied to scroll progress inside the scrub timeline.
      // Don't attach listeners — the scrub tween builds its own reveal in
      // buildTimeline(). Return here so we don't leak pointer listeners.
      return;
    }

    _hoverTargetEl = introLogoEl;

    _hoverEnterHandler = () => {
      if (_hoverTL) _hoverTL.kill();
      _hoverTL = gsap.timeline();
      _hoverTL.to(uppers, {
        yPercent: 0, opacity: 1,
        duration: 0.5, ease: 'power3.out', stagger: 0.08
      }, 0);
      _hoverTL.to(lowers, {
        yPercent: 0, opacity: 1,
        duration: 0.5, ease: 'power3.out', stagger: 0.08
      }, 0);
    };
    _hoverLeaveHandler = () => {
      if (_hoverTL) _hoverTL.kill();
      _hoverTL = gsap.timeline();
      _hoverTL.to(uppers, {
        yPercent: -100, opacity: 0,
        duration: 0.4, ease: 'power3.in', stagger: 0.05
      }, 0);
      _hoverTL.to(lowers, {
        yPercent: 100, opacity: 0,
        duration: 0.4, ease: 'power3.in', stagger: 0.05
      }, 0);
    };

    _hoverTargetEl.addEventListener('mouseenter', _hoverEnterHandler);
    _hoverTargetEl.addEventListener('mouseleave', _hoverLeaveHandler);
  }

  function _destroyIntroLogoHover() {
    if (_hoverTL) { _hoverTL.kill(); _hoverTL = null; }
    if (_hoverTargetEl && _hoverEnterHandler) {
      _hoverTargetEl.removeEventListener('mouseenter', _hoverEnterHandler);
    }
    if (_hoverTargetEl && _hoverLeaveHandler) {
      _hoverTargetEl.removeEventListener('mouseleave', _hoverLeaveHandler);
    }
    _hoverTargetEl = null;
    _hoverEnterHandler = null;
    _hoverLeaveHandler = null;
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

    if (!sectionEl || !introSlot || !navLogoLink || !navLogoWrapper || !dialEl || !introLogoEl) {
      DEBUG && console.warn('[home-scroll-morph] required DOM missing — intro morph disabled', {
        sectionEl: !!sectionEl,
        introSlot: !!introSlot,
        navLogoLink: !!navLogoLink,
        navLogoWrapper: !!navLogoWrapper,
        dialEl: !!dialEl,
        introLogoEl: !!introLogoEl
      });
      return;
    }

    initialised = true;

    // Lock the dial — on fresh load it must stay idle in .home_dial-start
    // at dial-small with no fg video / no project switching / no attraction.
    // home-scroll-morph unlocks it after the 100vh scroll morph completes.
    // (Defensive: orchestrator already inits workDial with introMode:true,
    // which sets the same flags — we repeat here so replay() and Barba
    // re-entry fall through the same lock path.)
    if (RHP.workDial?.setAttractionEnabled) RHP.workDial.setAttractionEnabled(false);
    if (RHP.workDial?.setInteractionUnlocked) RHP.workDial.setInteractionUnlocked(false);

    ctx = gsap.context(() => {
      // Initial state: dial small (matches about size)
      gsap.set(dialEl, {
        '--dial-live-width': 'var(--dial-small-width)',
        '--dial-live-height': 'var(--dial-small-height)'
      });

      // Step text starts hidden — revealed at tail end of scrub.
      if (stepTextEl) gsap.set(stepTextEl, { opacity: 0 });

      // Wire the hover / mobile-scroll text reveal on the intro logo.
      _initIntroLogoHover();

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
        if (!introLogoEl) return;

        // Reset any leftover transform from a previous scrub so the rect
        // measurements below reflect the rest state.
        gsap.set(introLogoEl, { clearProps: 'transform' });

        if (prefersReduced()) {
          // Reduced motion: no tween, callback-only ScrollTrigger.
          // Element reference, not selector string: gsap.context(fn, container)
          // scopes string selectors to the container, but .section_home-intro
          // lives OUTSIDE the Barba container (sibling of .section_home).
          scrollTrigger = ScrollTrigger.create({
            trigger: sectionEl,
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
            trigger: sectionEl,
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

        // Intro logo tween: scale/position toward the nav target.
        const startRect = introLogoEl.getBoundingClientRect();
        const targetRect = navLogoWrapper.getBoundingClientRect();
        const dx = targetRect.left + targetRect.width / 2 - (startRect.left + startRect.width / 2);
        const dy = targetRect.top + targetRect.height / 2 - (startRect.top + startRect.height / 2);
        const scaleTarget = startRect.width > 0 ? targetRect.width / startRect.width : 1;

        scrubTL.to(introLogoEl, {
          x: dx,
          y: dy,
          scale: scaleTarget,
          ease: 'power3.inOut',
          duration: 1
        }, 0);

        // Mobile: reveal about-hero text across scroll progress (uppers/lowers
        // tied to the same scrub). Desktop uses mouseenter/leave instead.
        if (!canHover()) {
          const uppers = introLogoEl.querySelectorAll('.about-hero_ready .heading-style-h3.is-about-upper');
          const lowers = introLogoEl.querySelectorAll('.about-hero_ready .heading-style-h3.is-about-lower');
          if (uppers.length) {
            scrubTL.to(uppers, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.04 }, 0);
          }
          if (lowers.length) {
            scrubTL.to(lowers, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.04 }, 0);
          }
        }

        // Step text fades in during the last 10% of the scrub so it appears
        // only once the dial has nearly reached its large state.
        if (stepTextEl) {
          scrubTL.to(stepTextEl, { opacity: 1, duration: 0.1, ease: 'power1.out' }, 0.9);
        }

        // Capture for explicit cleanup on next rebuild / destroy.
        scrollTrigger = scrubTL.scrollTrigger || null;
      };

      buildTimeline();

      // Rebuild on resize AND on replay(). Stored outside the ctx so destroy()
      // can remove it and replay() can call it.
      _resizeHandler = buildTimeline;
      window.addEventListener('resize', _resizeHandler);
    }, container || document);
  }

  /** Shared post-complete side effects for both the scrub-end path and the
      Barba re-entry skipToEnd path. Unlocks the dial, locks scroll, redraws
      the dial canvas so the tick layer renders at its final large size.
      Nav item visibility is driven purely by the .rhp-home-ready class on
      the wrapper — no GSAP tween on .nav_logo-link / .nav_about-link /
      .nav_contact-link. The CSS FOUC rule at the top of ready-hit-play.css
      hides those nodes while the wrapper lacks .rhp-home-ready; adding the
      class removes the hide rule and they become visible instantly. */
  function _applyCompleteState(animate) {
    const gsap = window.gsap;
    const SplitText = window.SplitText;
    const scope = document.querySelector('[data-barba="wrapper"]') || document.body;

    // Kill the scrub timeline + ScrollTrigger so they can't revert tweened
    // values when scroll.lock() changes the scroll position.
    if (scrubTL) {
      if (scrubTL.scrollTrigger) scrubTL.scrollTrigger.kill();
      scrubTL.kill();
      scrubTL = null;
    }
    if (scrollTrigger) {
      scrollTrigger.kill();
      scrollTrigger = null;
    }

    // Clear inline opacity on step text before the class toggle.
    if (stepTextEl && gsap) gsap.set(stepTextEl, { clearProps: 'opacity,visibility' });

    // Query nav items.
    const navLogo = scope.querySelector('.nav_logo-link');
    const navAbout = scope.querySelector('.nav_about-link');
    const navContact = scope.querySelector('.nav_contact-link');

    if (animate) {
      // Pin nav items at starting positions before the class toggle removes
      // the CSS FOUC hide — prevents them flashing at their final state.
      if (gsap) {
        if (navLogo) gsap.set(navLogo, { yPercent: -100, opacity: 0, visibility: 'visible' });
        if (navAbout) gsap.set(navAbout, { xPercent: -100, opacity: 0, visibility: 'visible' });
        if (navContact) gsap.set(navContact, { xPercent: 100, opacity: 0, visibility: 'visible' });
      }
      // Pin step text at opacity:0 before the class toggle.
      if (stepTextEl && gsap) gsap.set(stepTextEl, { opacity: 0, visibility: 'visible' });
    }

    scope.classList.add('rhp-home-ready');

    if (animate) {
      // --- Nav entrance animation ---
      // Logo drops from above, about slides from left, contact from right.
      // Sequential (each starts after the previous finishes).
      const DUR = 0.7;
      const EASE_TRANSLATE = 'power3.out';
      if (gsap) {
        const tl = gsap.timeline();
        if (navLogo) {
          tl.to(navLogo, { yPercent: 0, opacity: 1, duration: DUR, ease: EASE_TRANSLATE,
            clearProps: 'yPercent,opacity,visibility' });
        }
        if (navAbout) {
          tl.to(navAbout, { xPercent: 0, opacity: 1, duration: DUR, ease: EASE_TRANSLATE,
            clearProps: 'xPercent,opacity,visibility' });
        }
        if (navContact) {
          tl.to(navContact, { xPercent: 0, opacity: 1, duration: DUR, ease: EASE_TRANSLATE,
            clearProps: 'xPercent,opacity,visibility' });
        }
      }

      // --- Step text SplitText entrance ---
      // Words slide up from yPercent:100 (masked by overflow:hidden on lines),
      // 0.15s stagger, 0.8s expo.out — matches the original home-intro animation.
      if (stepTextEl && gsap && SplitText) {
        try {
          const split = new SplitText(stepTextEl, {
            type: 'words,lines',
            linesClass: 'home-intro-line',
            wordsClass: 'home-intro-word'
          });
          if (split.lines) split.lines.forEach(l => { l.style.overflow = 'hidden'; });
          if (split.words?.length) gsap.set(split.words, { yPercent: 100, opacity: 0 });
          gsap.to(stepTextEl, { opacity: 1, duration: 0.4, ease: 'power4.out' });
          gsap.to(split.words, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.15 });
          gsap.to(split.words, { opacity: 1, duration: 0.8, ease: 'linear', stagger: 0.15 }, '<');
        } catch (e) {
          stepTextEl.style.opacity = '1';
        }
      } else if (stepTextEl) {
        stepTextEl.style.opacity = '1';
      }
    } else {
      // Skip path (Barba re-entry): land in final state instantly.
      if (gsap) {
        [navLogo, navAbout, navContact].filter(Boolean).forEach(el => {
          gsap.set(el, { clearProps: 'yPercent,xPercent,opacity,visibility' });
        });
      }
      if (stepTextEl) {
        if (gsap) gsap.set(stepTextEl, { clearProps: 'opacity,visibility' });
        else stepTextEl.style.opacity = '1';
      }
    }

    if (window.RHP?.workDial?.setIntroComplete) window.RHP.workDial.setIntroComplete();
    if (window.RHP?.workDial?.setAttractionEnabled) window.RHP.workDial.setAttractionEnabled(true);
    if (window.RHP?.workDial?.setInteractionUnlocked) window.RHP.workDial.setInteractionUnlocked(true);

    if (window.RHP?.lenis?.stop) window.RHP.lenis.stop();
    if (window.RHP?.scroll?.lock) window.RHP.scroll.lock();
    redrawDialCanvas();
  }

  function onMorphComplete() {
    if (complete) return;
    complete = true;

    // Hide the (now-empty) intro section so it no longer takes layout
    const introSection = document.querySelector('.section_home-intro');
    if (introSection && window.gsap) window.gsap.set(introSection, { display: 'none' });

    // Intro logo is hidden now — no need for hover listeners.
    _destroyIntroLogoHover();

    // Unlock dial + scroll lock + add .rhp-home-ready + animate nav/step in.
    _applyCompleteState(true);

    DEBUG && console.log('[home-scroll-morph] complete');
    window.dispatchEvent(new CustomEvent('rhp:home-scroll-morph:complete'));
  }

  function onMorphReverse() {
    // User scrolled back up past the intro start — re-attach hover, hide nav
    // again via class removal. Under normal CSS-locked conditions this branch
    // is unreachable (scroll is locked on morph complete), but kept for safety
    // in case future changes leave scroll unlocked post-complete.
    if (!introLogoEl) return;
    complete = false;
    _initIntroLogoHover();

    const scope = document.querySelector('[data-barba="wrapper"]') || document.body;
    scope.classList.remove('rhp-home-ready');

    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(false);
    }
    if (window.RHP?.workDial?.setAttractionEnabled) {
      window.RHP.workDial.setAttractionEnabled(false);
    }
    if (window.RHP?.scroll?.unlock) window.RHP.scroll.unlock();
    if (window.RHP?.lenis?.start) window.RHP.lenis.start();
  }

  function skipToEnd(container) {
    // Called on Barba re-entry to home. Land in dial-large state without animation.
    // Re-query DOM because Barba just swapped the home container.
    _queryDOMRefs(container);

    const introSection = document.querySelector('.section_home-intro');
    if (introSection) introSection.style.display = 'none';

    if (dialEl && window.gsap) {
      window.gsap.set(dialEl, {
        '--dial-live-width': 'var(--dial-large-width)',
        '--dial-live-height': 'var(--dial-large-height)'
      });
    }

    // Step text was inline-opacity-0 on first load — clear any leftover
    // inline style so the class toggle / CSS owns the final state.
    if (stepTextEl && window.gsap) {
      window.gsap.set(stepTextEl, { clearProps: 'opacity' });
    }

    complete = true;
    initialised = true; // block double-init from view hook
    _applyCompleteState(false);
  }

  function replay() {
    // Nav logo click on home: scroll to top, reverse timeline, re-show intro section.
    // Guard: replay only works when a scrub timeline was built on first load.
    // On Barba re-entry we call skipToEnd() instead (no scrub timeline).
    if (!_resizeHandler) return;
    const introSection = document.querySelector('.section_home-intro');
    if (introSection) introSection.style.display = '';

    // Remove .rhp-home-ready so nav items + step text cascade back to hidden
    // via the CSS FOUC rule. No GSAP tween on the nav items themselves.
    const scope = document.querySelector('[data-barba="wrapper"]') || document.body;
    scope.classList.remove('rhp-home-ready');

    // Re-attach hover listeners on the real intro logo.
    _initIntroLogoHover();

    // Re-hide step text immediately — the rebuilt scrub will fade it back in.
    if (stepTextEl && window.gsap) window.gsap.set(stepTextEl, { opacity: 0 });

    // Rebuild the scrub timeline so new rects reflect current layout.
    _resizeHandler();

    if (window.RHP?.workDial?.setInteractionUnlocked) {
      window.RHP.workDial.setInteractionUnlocked(false);
    }
    if (window.RHP?.workDial?.setAttractionEnabled) {
      window.RHP.workDial.setAttractionEnabled(false);
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
    _destroyIntroLogoHover();
    // Mirror buildTimeline() kill order: ScrollTrigger first (scrubTL.kill()
    // does NOT propagate to the attached ScrollTrigger), then the timeline.
    if (scrubTL) {
      if (scrubTL.scrollTrigger) scrubTL.scrollTrigger.kill();
      scrubTL.kill();
      scrubTL = null;
    }
    if (scrollTrigger) { scrollTrigger.kill(); scrollTrigger = null; }
    if (ctx) { ctx.revert(); ctx = null; }
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
