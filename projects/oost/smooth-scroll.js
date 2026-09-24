// Starts Lenis smooth scrolling site-wide with anchor handling, skips it for visitors who prefer reduced motion, and exposes the instance as window.OOST.lenis so overlays can stop and start it.
(function () {
  'use strict';

  window.OOST = window.OOST || {};
  var OOST = window.OOST;

  if (typeof window.Lenis !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (OOST.lenis && typeof OOST.lenis.destroy === 'function') OOST.lenis.destroy();

  OOST.lenis = new window.Lenis({
    autoRaf: true,
    anchors: true,
    smoothWheel: true,
    duration: 1.1,
  });
})();
