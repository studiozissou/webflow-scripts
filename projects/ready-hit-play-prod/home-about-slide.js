/* =========================================
   RHP — Home ↔ About Slide Transitions
   Stateless module. Orchestrator Barba transitions call these functions
   directly — no init/destroy lifecycle. The About Barba container itself
   slides horizontally over a fixed home/dial.
   ========================================= */
(function () {
  'use strict';
  const VERSION = '2026.4.9.1';

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function leaveHomeToAbout(data) {
    // current = home container, next = about container
    const gsap = window.gsap;
    const next = data?.next;
    if (!gsap || !next?.container) return Promise.resolve();
    if (prefersReduced()) {
      gsap.set(next.container, { xPercent: 0, opacity: 1 });
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      gsap.fromTo(
        next.container,
        { xPercent: -100, opacity: 0 },
        { xPercent: 0, opacity: 1, duration: 0.75, ease: 'power3.out', onComplete: resolve }
      );
    });
  }

  function leaveAboutToHome(data) {
    // current = about container, next = home container
    const gsap = window.gsap;
    const current = data?.current;
    if (!gsap || !current?.container) return Promise.resolve();
    if (prefersReduced()) {
      gsap.set(current.container, { xPercent: -100, opacity: 0 });
      // Note: work-dial IDLE state is restored by work-dial's own resume/init
      // flow during Barba re-entry. setDialState is not a public API.
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      gsap.to(current.container, {
        xPercent: -100,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.out',
        onComplete: resolve
      });
    });
  }

  window.RHP = window.RHP || {};
  window.RHP.homeAboutSlide = {
    leaveHomeToAbout,
    leaveAboutToHome,
    version: VERSION
  };
})();
