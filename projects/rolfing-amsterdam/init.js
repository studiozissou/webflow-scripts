// Rolfing Amsterdam site loader: loads the site modules, in order, from the same versioned folder as this file; the ?rolfing-amsterdam=local dev switch only works when the tag carries data-allow-local and lasts for the browser session.
(function () {
  'use strict';

  if (window.ROLFING && window.ROLFING.base) return;

  var VERSION = '0.1.0';
  var DEPS = [];
  var GLOBAL_MODULES = ['faq-accordion.js'];
  var ROUTES = [];

  var script = document.currentScript;
  if (!script || !script.src) return;

  function readSwitch() {
    if (!script.hasAttribute('data-allow-local')) return null;
    try {
      var store = window.sessionStorage;
      var params = new URLSearchParams(window.location.search);
      var source = params.get('rolfing-amsterdam');
      var port = params.get('rolfing-amsterdam-port');
      if (source === 'local') store.setItem('rolfing-amsterdam-source', 'local');
      if (source === 'cdn') {
        store.removeItem('rolfing-amsterdam-source');
        store.removeItem('rolfing-amsterdam-port');
      }
      if (port && /^\d{4,5}$/.test(port)) store.setItem('rolfing-amsterdam-port', port);
      if (store.getItem('rolfing-amsterdam-source') !== 'local') return null;
      return (
        'https://localhost:' + (store.getItem('rolfing-amsterdam-port') || '8080') + '/projects/rolfing-amsterdam/'
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

  window.ROLFING = window.ROLFING || {};
  window.ROLFING.base = base;
  window.ROLFING.version = VERSION;
  window.ROLFING.modules = modules;

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
