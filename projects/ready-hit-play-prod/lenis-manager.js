/* =========================================
   RHP — Lenis Manager
   Uses official Lenis global (window.Lenis)
   ========================================= */
(() => {
  const LENIS_MANAGER_VERSION = '2026.2.6.10';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  let lenis = null;
  let rafId = null;

  const prefersReduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function start(options = {}) {
    if (typeof window.Lenis !== 'function') return;
    if (prefersReduced()) return;

    // If a Lenis instance already exists (e.g. from another page or wrapper),
    // tear it down so we can safely reconfigure it for the new context.
    if (lenis) {
      stop();
    }

    const defaults = {
      duration: 1.1,
      smoothWheel: true,
      smoothTouch: false
    };

    lenis = new Lenis({ ...defaults, ...options });

    const raf = (time) => {
      if (!lenis) return;
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);
  }

  function stop() {
    if (!lenis) return;

    cancelAnimationFrame(rafId);
    rafId = null;

    lenis.destroy();
    lenis = null;
  }

  function resize() {
    lenis?.resize?.();
  }

  function onScroll(callback) {
    if (lenis && typeof callback === 'function') {
      lenis.on('scroll', callback);
    }
  }

  function offScroll(callback) {
    if (lenis && typeof callback === 'function') {
      try { lenis.off('scroll', callback); } catch (e) {}
    }
  }

  RHP.lenis = { start, stop, resize, onScroll, offScroll, version: LENIS_MANAGER_VERSION };
})();
