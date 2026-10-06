// Starts Lenis smooth scrolling site-wide with anchor handling and its inlined CSS, skips it for visitors who prefer reduced motion, and exposes the instance as window.OOST.lenis so overlays can stop and start it.
(function () {
  'use strict';

  var LENIS_CSS =
    'html.lenis,html.lenis body{height:auto}.lenis:not(.lenis-autoToggle).lenis-stopped{overflow:clip}.lenis [data-lenis-prevent],.lenis [data-lenis-prevent-wheel],.lenis [data-lenis-prevent-touch]{overscroll-behavior:contain}.lenis.lenis-smooth iframe{pointer-events:none}.lenis.lenis-autoToggle{transition-property:overflow;transition-duration:1ms;transition-behavior:allow-discrete}';

  window.OOST = window.OOST || {};
  var OOST = window.OOST;
  var document = window.document;

  function addLenisStyles() {
    if (document.getElementById('oost-lenis-css')) return;
    var style = document.createElement('style');
    style.id = 'oost-lenis-css';
    style.textContent = LENIS_CSS;
    document.head.appendChild(style);
  }

  if (typeof window.Lenis !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  addLenisStyles();

  if (OOST.lenis && typeof OOST.lenis.destroy === 'function') OOST.lenis.destroy();

  OOST.lenis = new window.Lenis({
    autoRaf: true,
    anchors: true,
    smoothWheel: true,
    duration: 1.1,
  });
})();
