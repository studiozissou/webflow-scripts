// Client site loader: loads Lenis and then the site modules, in order, from the same versioned folder as this file; the ?client=local dev switch only works when the tag carries data-allow-local and lasts for the browser session.
(function () {
  'use strict';

  if (window.CLIENT && window.CLIENT.base) return;

  var VERSION = '0.1.0';
  var DEPS = ['https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js'];
  var GLOBAL_MODULES = ['smooth-scroll.js', 'site-utilities.js', 'faq-accordion.js', 'booking-widget.js'];
  var ROUTES = [];

  var script = document.currentScript;
  if (!script || !script.src) return;

  function readSwitch() {
    if (!script.hasAttribute('data-allow-local')) return null;
    try {
      var store = window.sessionStorage;
      var params = new URLSearchParams(window.location.search);
      var source = params.get('client');
      var port = params.get('client-port');
      if (source === 'local') store.setItem('client-source', 'local');
      if (source === 'cdn') {
        store.removeItem('client-source');
        store.removeItem('client-port');
      }
      if (port && /^\d{4,5}$/.test(port)) store.setItem('client-port', port);
      if (store.getItem('client-source') !== 'local') return null;
      return (
        'https://localhost:' + (store.getItem('client-port') || '8080') + '/projects/client/'
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

  window.CLIENT = window.CLIENT || {};
  window.CLIENT.base = base;
  window.CLIENT.version = VERSION;
  window.CLIENT.modules = modules;

  function addScript(src) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    var el = document.createElement('script');
    el.src = src;
    el.async = false;
    document.head.appendChild(el);
  }

  for (var d = 0; d < DEPS.length; d++) addScript(DEPS[d]);
  for (var m = 0; m < modules.length; m++) addScript(base + modules[m]);
})();
