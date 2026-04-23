/* =========================================
   RHP — Home ↔ About Slide Transitions
   Two-phase curtain + content reveal for home/work → about.
   About → home/work slide-out is unchanged.
   Curtain element lives on document.body (outside Barba container)
   so it survives DOM swaps.
   ========================================= */
(function () {
  'use strict';
  const VERSION = '2026.4.23.2';
  const DEBUG = false;

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  /* ── Curtain DOM element (created once) ── */
  const curtainEl = document.createElement('div');
  curtainEl.className = 'rhp-about-curtain';
  curtainEl.style.cssText = [
    'position: fixed',
    'inset: 0',
    'z-index: 5',
    'pointer-events: none',
    'will-change: transform, opacity'
  ].join(';');
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--_primitives---colors--midnight-darker').trim() || '#090014';
  curtainEl.style.background = bg;
  document.body.appendChild(curtainEl);

  const gsap = window.gsap;
  if (gsap) {
    gsap.set(curtainEl, { x: '-100vw', display: 'none' });
  }

  /* ── State ── */
  let revealCtx = null;

  /* ── Reset (called by orchestrator beforeLeave) ── */
  function resetCurtain() {
    if (revealCtx) {
      revealCtx.revert();
      revealCtx = null;
    }
    if (curtainEl && window.gsap) {
      window.gsap.killTweensOf(curtainEl);
      window.gsap.set(curtainEl, { x: '-100vw', display: 'none' });
    }
  }

  /* ── Phase 1: Curtain slide in (called from Barba enter()) ── */
  function leaveHomeToAbout(data) {
    const g = window.gsap;
    if (!g) return Promise.resolve();

    if (prefersReduced()) {
      // No curtain, no animation — content will be made visible in revealAboutContent
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      g.set(curtainEl, { display: 'block' });
      g.fromTo(
        curtainEl,
        { x: '-100vw' },
        {
          x: 0,
          duration: 1.5,
          ease: 'power4.out',
          onComplete: resolve
        }
      );
    });
  }

  /* ── Phase 2: Content reveal (called from orchestrator afterEnter) ── */
  function revealAboutContent(container) {
    const g = window.gsap;
    const SplitText = window.SplitText;
    if (!g || !container) return;

    if (prefersReduced()) {
      // Instant: make everything visible, hide curtain
      resetCurtain();
      var targets = _collectTargets(container);
      if (targets.length) g.set(targets, { opacity: 1, y: 0 });
      return;
    }

    // Wait 2 rAFs to let aboutIconScale.init() finish its measurements
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        _runReveal(container, g, SplitText);
      });
    });
  }

  function _collectTargets(container) {
    var targets = [];
    var rLink = container.querySelector('.about_r-link');
    if (rLink) targets.push(rLink);
    var headerEls = container.querySelectorAll('.about_header h2, .about_header p');
    for (var i = 0; i < headerEls.length; i++) targets.push(headerEls[i]);
    var accordionEls = container.querySelectorAll('.accordion-title h2');
    for (var j = 0; j < accordionEls.length; j++) targets.push(accordionEls[j]);
    return targets;
  }

  function _runReveal(container, g, SplitText) {
    var allTargets = _collectTargets(container);
    if (!allTargets.length) {
      // Nothing to animate — just dismiss curtain
      _dismissCurtain(g);
      return;
    }

    revealCtx = g.context(function () {
      // Pre-hide all targets
      g.set(allTargets, { opacity: 0, y: 30 });

      // SplitText setup for text elements (not .about_r-link)
      var splits = [];
      for (var i = 0; i < allTargets.length; i++) {
        var el = allTargets[i];
        if (!el.classList.contains('about_r-link') && SplitText) {
          // WCAG: set role before SplitText so aria-label is valid
          if (!el.getAttribute('role')) el.setAttribute('role', 'group');
          var split = new SplitText(el, { type: 'lines' });
          g.set(split.lines, { yPercent: 100, opacity: 0 });
          splits.push({ el: el, split: split, index: i });
        } else {
          splits.push({ el: el, split: null, index: i });
        }
      }

      // Curtain exit animation
      var tl = g.timeline();

      tl.to(curtainEl, {
        x: '100vw',
        duration: 0.6,
        ease: 'power2.in',
        onComplete: function () {
          g.set(curtainEl, { display: 'none' });
        }
      }, 0);

      // Content stagger (starts 0.2s after curtain begins leaving)
      var interElementDelay = allTargets.length > 1 ? 2.0 / allTargets.length : 0;

      for (var k = 0; k < splits.length; k++) {
        var entry = splits[k];
        var offset = 0.2 + (k * interElementDelay);

        // Animate the element wrapper (opacity + y)
        tl.to(entry.el, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out'
        }, offset);

        // If SplitText lines, animate them in
        if (entry.split && entry.split.lines.length) {
          tl.to(entry.split.lines, {
            yPercent: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.08,
            ease: 'power2.out'
          }, offset);
        }
      }
    }, container);
  }

  function _dismissCurtain(g) {
    if (!g) return;
    g.to(curtainEl, {
      x: '100vw',
      duration: 0.6,
      ease: 'power2.in',
      onComplete: function () {
        g.set(curtainEl, { display: 'none' });
      }
    });
  }

  /* ── About → Home (UNCHANGED) ── */
  function leaveAboutToHome(data) {
    // current = about container, next = home container
    const g = window.gsap;
    const current = data?.current;
    if (!g || !current?.container) return Promise.resolve();
    if (prefersReduced()) {
      g.set(current.container, { xPercent: -100, opacity: 0 });
      // Note: work-dial IDLE state is restored by work-dial's own resume/init
      // flow during Barba re-entry. setDialState is not a public API.
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      g.to(current.container, {
        xPercent: -100,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.out',
        onComplete: resolve
      });
    });
  }

  /* ── Public API ── */
  window.RHP = window.RHP || {};
  window.RHP.homeAboutSlide = {
    leaveHomeToAbout,
    leaveAboutToHome,
    revealAboutContent,
    resetCurtain,
    version: VERSION
  };
})();
