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

  /** Sync ScrollTrigger with Lenis when using a custom scroll wrapper (case study).
   *  Proxy both wrapper and body so IX2's scroll-linked interactions use Lenis scroll
   *  regardless of which element IX2 uses as scroller. */
  function setupScrollTriggerProxy(wrapper, content) {
    if (!lenis || !wrapper || typeof window.ScrollTrigger === 'undefined') return;
    const scrollHeight = () => (content ? content.scrollHeight : wrapper.scrollHeight);
    const scrollWidth = () => (content ? content.scrollWidth : wrapper.scrollWidth);
    var proxyScrollTop = function(value) {
      if (!lenis) return 0;
      if (arguments.length) lenis.scrollTo(value, { immediate: true });
      return lenis.scroll;
    };
    window.ScrollTrigger.scrollerProxy(wrapper, {
      scrollTop: proxyScrollTop,
      getBoundingClientRect: function() { return wrapper.getBoundingClientRect(); },
      scrollHeight: scrollHeight,
      scrollWidth: scrollWidth
    });
    window.ScrollTrigger.scrollerProxy(document.body, {
      scrollTop: proxyScrollTop,
      getBoundingClientRect: function() { return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }; },
      scrollHeight: scrollHeight,
      scrollWidth: scrollWidth
    });
    lenis.on('scroll', window.ScrollTrigger.update);
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

  RHP.lenis = { start, stop, resize, onScroll, offScroll, setupScrollTriggerProxy, version: LENIS_MANAGER_VERSION };
})();
