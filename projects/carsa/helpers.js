// Carsa shared helpers, loaded first by init.js on every page: sets window.__CARSA to the error-isolating block, the ready/load timing helpers, the path and CMS-config readers, and the first-touch attribution reader and URL param writer every module uses.
(function () {
  'use strict';

  if (window.__CARSA) return;

  function block(fn) {
    try {
      fn();
    } catch (err) {
      window.setTimeout(function () {
        throw err;
      });
    }
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        block(fn);
      });
    } else {
      block(fn);
    }
  }

  function onLoad(fn) {
    if (document.readyState === 'complete') {
      block(fn);
    } else {
      window.addEventListener('load', function () {
        block(fn);
      });
    }
  }

  function onPage(paths, prefixes) {
    var p = location.pathname;
    if (p.length > 1) p = p.replace(/\/+$/, '');
    if (paths.indexOf(p) !== -1) return true;
    return (prefixes || []).some(function (x) {
      var rest = p.indexOf(x + '/') === 0 ? p.slice(x.length + 1) : '';
      return rest !== '' && rest.indexOf('/') === -1;
    });
  }

  function cms(config, keys) {
    if (!config || typeof config !== 'object') return null;
    var out = {};
    keys.forEach(function (k) {
      var v = config[k];
      out[k] = String(v == null ? '' : v).trim();
    });
    return out;
  }

  function domainOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (_) {
      return '';
    }
  }

  function getAttributionParams() {
    var host = String(location.hostname || '').replace(/^www\./, '');
    function isExternal(d) {
      return typeof d === 'string' && d !== '' && d !== host && !d.endsWith('.' + host);
    }

    var store;
    try {
      store = JSON.parse(localStorage.getItem('attribution') || 'null');
    } catch (_) {
      store = null;
    }
    if (!store || typeof store !== 'object') store = {};

    var params = {};
    var utms = store.utms && typeof store.utms === 'object' ? store.utms : {};
    Object.keys(utms).forEach(function (k) {
      params[k] = utms[k];
    });

    if (!Object.keys(params).length) {
      try {
        new URLSearchParams(location.search).forEach(function (v, k) {
          if (/^utm_/i.test(k) && v) params[k] = v;
        });
      } catch (_) {}
    }

    var ref = '';
    if (isExternal(store.referrerDomain)) {
      ref = store.referrerDomain;
    } else if (store.referrer) {
      var stored = domainOf(store.referrer);
      if (isExternal(stored)) ref = stored;
    }
    if (!ref && document.referrer) {
      var current = domainOf(document.referrer);
      if (isExternal(current)) ref = current;
    }
    if (ref) params.referrer = ref;
    return params;
  }

  function addParams(url, obj) {
    try {
      var u = new URL(url, location.origin);
      for (var k in obj) {
        if (!u.searchParams.has(k)) u.searchParams.set(k, obj[k]);
      }
      return u.toString();
    } catch (_) {
      var hasQ = url.indexOf('?') > -1;
      var parts = [];
      for (var key in obj) {
        if (!new RegExp('([?&])' + key + '=').test(url)) parts.push(key + '=' + encodeURIComponent(obj[key]));
      }
      return parts.length ? url + (hasQ ? '&' : '?') + parts.join('&') : url;
    }
  }

  window.__CARSA = {
    block: block,
    onReady: onReady,
    onLoad: onLoad,
    onPage: onPage,
    cms: cms,
    getAttributionParams: getAttributionParams,
    addParams: addParams
  };
})();
