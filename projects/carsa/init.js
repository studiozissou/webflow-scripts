// Carsa site loader: waits for Webflow's jQuery and GSAP, then loads global.js and the current route's modules, in order, from the same versioned folder as this file; the ?carsa=local dev switch only works when the tag carries data-allow-local and lasts for the browser session.
(function () {
  'use strict';

  if (window.__CARSA_LOADER) return;

  var ROUTES = [
    { match: /^\/vehicles\/.+/, modules: ['battery-animation.js', 'at-price-total.js'] }
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
  var modules = ['global.js'];
  for (var i = 0; i < ROUTES.length; i++) {
    if (ROUTES[i].match.test(window.location.pathname)) modules = modules.concat(ROUTES[i].modules);
  }

  window.__CARSA_LOADER = { base: base, modules: modules };

  function load() {
    for (var j = 0; j < modules.length; j++) {
      var src = base + modules[j];
      if (document.querySelector('script[src="' + src + '"]')) continue;
      var el = document.createElement('script');
      el.src = src;
      el.async = false;
      document.head.appendChild(el);
    }
  }

  var waited = 0;
  (function gate() {
    if ((window.jQuery && window.gsap) || waited >= DEP_TIMEOUT_MS) return load();
    waited += DEP_POLL_MS;
    window.setTimeout(gate, DEP_POLL_MS);
  })();
})();
