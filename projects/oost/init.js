// Oost site loader: loads Lenis and then the site modules, in order, from the same versioned folder as this file; the ?oost=local dev switch only works when the tag carries data-allow-local and lasts for the browser session.
(function () {
  'use strict';

  if (window.OOST && window.OOST.base) return;

  var VERSION = '2026.9.24.1';
  var STYLES = ['https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.css'];
  var DEPS = ['https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js'];
  var GLOBAL_MODULES = ['smooth-scroll.js'];
  var ROUTES = [];

  var script = document.currentScript;
  if (!script || !script.src) return;

  function readSwitch() {
    if (!script.hasAttribute('data-allow-local')) return null;
    try {
      var store = window.sessionStorage;
      var params = new URLSearchParams(window.location.search);
      var source = params.get('oost');
      var port = params.get('oost-port');
      if (source === 'local') store.setItem('oost-source', 'local');
      if (source === 'cdn') {
        store.removeItem('oost-source');
        store.removeItem('oost-port');
      }
      if (port && /^\d{4,5}$/.test(port)) store.setItem('oost-port', port);
      if (store.getItem('oost-source') !== 'local') return null;
      return (
        'https://localhost:' + (store.getItem('oost-port') || '8080') + '/projects/oost/'
      );
    } catch {
      return null;
    }
  }

  var base = readSwitch() || script.src.slice(0, script.src.lastIndexOf('/') + 1);
  var modules = GLOBAL_MODULES.slice();
  for (var i = 0; i < ROUTES.length; i++) {
    if (ROUTES[i].match.test(window.location.pathname))
      modules = modules.concat(ROUTES[i].modules);
  }

  window.OOST = window.OOST || {};
  window.OOST.base = base;
  window.OOST.version = VERSION;
  window.OOST.modules = modules;

  function addStylesheet(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = href;
    document.head.appendChild(el);
  }

  function addScript(src) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    var el = document.createElement('script');
    el.src = src;
    el.async = false;
    document.head.appendChild(el);
  }

  for (var s = 0; s < STYLES.length; s++) addStylesheet(STYLES[s]);
  for (var d = 0; d < DEPS.length; d++) addScript(DEPS[d]);
  for (var m = 0; m < modules.length; m++) addScript(base + modules[m]);
})();
