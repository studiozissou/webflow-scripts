// Carsa site loader: on /car-redirect appends car-redirect.js at once, then waits for Webflow's jQuery and GSAP and loads helpers.js, global.js, check-finance.js and the current route's modules (no VDP modules on a /vehicles/ 404), in order, from the same versioned folder as this file; the ?carsa=local dev switch only works when the tag carries data-allow-local and lasts for the browser session.
(function () {
  'use strict';

  if (window.__CARSA_LOADER) return;

  var SHARED = ['animations.js', 'valuation-links.js', 'equal-height.js', 'faq-schema.js'];
  var EARLY = [
    { match: /^\/car-redirect\/?$/, modules: ['car-redirect.js'] }
  ];
  var ROUTES = [
    { match: /^\/vehicles\/.+/, modules: ['vdp.js', 'battery-animation.js', 'at-price-total.js'], skipOn404: true },
    { match: /^(?!\/vehicles\/)/, modules: SHARED },
    { match: /^\/used-cars\/near\/[^/]+\/?$/, modules: ['near.js'] },
    { match: /^\/car-finance-calculator\/?$/, modules: ['finance-calculator.js'] },
    { match: /^\/get-started\/?$/, modules: ['get-started.js'] },
    { match: /^\/faq\/?$/, modules: ['faq.js'] },
    { match: /^\/used-cars\/models\/[^/]+\/?$/, modules: ['models-template.js'] },
    { match: /^\/used-cars\/fuel\/[^/]+\/?$/, modules: ['fuel-template.js'] },
    { match: /^\/used-cars\/promotions\/[^/]+\/?$/, modules: ['promotions-template.js'] },
    { match: /^\/used-cars\/models\/?$/, modules: ['all-models.js'] },
    { match: /^\/blog\/?$/, modules: ['blog.js'] }
  ];
  var DEP_POLL_MS = 50;
  var DEP_TIMEOUT_MS = 3000;

  var script = document.currentScript;
  if (!script || !script.src) return;

  function readSwitch() {
    if (!script.hasAttribute('data-allow-local')) return null;
    try {
      var store = window.sessionStorage;
      var params = new URLSearchParams(window.location.search);
      var source = params.get('carsa');
      var port = params.get('carsa-port');
      if (source === 'local') store.setItem('carsa-source', 'local');
      if (source === 'cdn') {
        store.removeItem('carsa-source');
        store.removeItem('carsa-port');
      }
      if (port && /^\d{4,5}$/.test(port)) store.setItem('carsa-port', port);
      if (store.getItem('carsa-source') !== 'local') return null;
      return 'https://localhost:' + (store.getItem('carsa-port') || '8080') + '/projects/carsa/';
    } catch (e) {
      return null;
    }
  }

  var base = readSwitch() || script.src.slice(0, script.src.lastIndexOf('/') + 1);
  var path = window.location.pathname;
  var early = [];
  for (var r = 0; r < EARLY.length; r++) {
    if (EARLY[r].match.test(path)) early = early.concat(EARLY[r].modules);
  }
  var modules = ['helpers.js', 'global.js', 'check-finance.js'];
  for (var i = 0; i < ROUTES.length; i++) {
    if (!ROUTES[i].match.test(path)) continue;
    if (ROUTES[i].skipOn404 && document.getElementById('404-message')) continue;
    modules = modules.concat(ROUTES[i].modules);
  }

  window.__CARSA_LOADER = { base: base, modules: early.concat(modules) };

  function load(list) {
    for (var j = 0; j < list.length; j++) {
      var src = base + list[j];
      if (document.querySelector('script[src="' + src + '"]')) continue;
      var el = document.createElement('script');
      el.src = src;
      el.async = false;
      document.head.appendChild(el);
    }
  }

  load(early);

  var waited = 0;
  (function gate() {
    if ((window.jQuery && window.gsap) || waited >= DEP_TIMEOUT_MS) return load(modules);
    waited += DEP_POLL_MS;
    window.setTimeout(gate, DEP_POLL_MS);
  })();
})();
