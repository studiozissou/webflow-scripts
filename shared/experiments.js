// Shared experiment runner: waits for PostHog, then applies the show, hide, css, class and text ops from each exp-* flag payload and records one exposure per flag.
(function () {
  'use strict';

  var DEBUG = false;
  var VERSION = '1.0.0';
  var POLL_MS = 250;
  var POLL_MAX_MS = 10000;
  var DEBOUNCE_MS = 50;
  var MISS_MS = 5000;
  var PREVIEW_KEY = 'exp-preview';
  var CSS_ACTIONS = { show: 1, hide: 1, css: 1 };
  var DOM_ACTIONS = { 'class-add': 1, 'class-remove': 1, text: 1 };

  if (window.__EXPERIMENTS && window.__EXPERIMENTS.version) return;

  var state = (window.__EXPERIMENTS = { version: VERSION, applied: {}, ops: [] });
  var exposed = {};
  var rules = [];
  var ruleSeen = {};
  var domOps = [];
  var domSeen = {};
  var observer = null;
  var debounceTimer = null;

  function warn(message, detail) {
    DEBUG && console.warn('[experiments] ' + message, detail);
  }

  function parsePayload(raw) {
    if (raw == null) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch (error) {
      warn('bad payload', error);
      return null;
    }
  }

  function scoped(attr, variant, selector) {
    var prefix = 'html[' + attr + '="' + String(variant).replace(/"/g, '\\"') + '"] ';
    return prefix + ':is(' + selector + ')';
  }

  function writeStyle() {
    var style = document.getElementById('experiments');
    if (!style) {
      style = document.createElement('style');
      style.id = 'experiments';
      document.head.appendChild(style);
    }
    style.textContent = rules.join('\n');
  }

  function addRule(text) {
    if (ruleSeen[text]) return false;
    ruleSeen[text] = true;
    rules.push(text);
    writeStyle();
    return true;
  }

  function cssRule(op, attr, variant) {
    var body;
    if (op.action === 'show')
      body = 'display:' + (typeof op.value === 'string' && /^[a-z-]+$/.test(op.value) ? op.value : 'revert') + '!important';
    else if (op.action === 'hide') body = 'display:none!important';
    else body = String(op.value);
    return addRule(scoped(attr, variant, op.selector) + '{' + body + '}');
  }

  function runDomOp(entry) {
    var list = document.querySelectorAll(entry.op.selector);
    for (var i = 0; i < list.length; i++) {
      try {
        var el = list[i];
        var done = (el.getAttribute(entry.marker) || '').split(' ');
        if (done.indexOf(entry.id) !== -1) continue;
        var action = entry.op.action;
        var value = entry.op.value == null ? '' : String(entry.op.value);
        if (action === 'class-add') {
          el.classList.add.apply(el.classList, value.split(/\s+/).filter(Boolean));
        } else if (action === 'class-remove') {
          el.classList.remove.apply(el.classList, value.split(/\s+/).filter(Boolean));
        } else {
          el.textContent = value;
        }
        done.push(entry.id);
        el.setAttribute(entry.marker, done.filter(Boolean).join(' '));
      } catch (error) {
        warn('dom op failed', error);
      }
    }
  }

  function runAllDomOps() {
    for (var i = 0; i < domOps.length; i++) {
      try {
        runDomOp(domOps[i]);
      } catch (error) {
        warn('dom pass failed', error);
      }
    }
  }

  function watchDom() {
    if (observer || typeof MutationObserver !== 'function') return;
    observer = new MutationObserver(function () {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        debounceTimer = null;
        runAllDomOps();
      }, DEBOUNCE_MS);
    });
    observer.observe(document.documentElement, { subtree: true, childList: true });
  }

  function warnIfUnmatched(selector) {
    if (!DEBUG) return;
    setTimeout(function () {
      try {
        if (!document.querySelectorAll(selector).length) warn('selector matched nothing', selector);
      } catch (error) {
        warn('bad selector', selector);
      }
    }, MISS_MS);
  }

  function applyOp(op, key, name, variant) {
    if (!op || typeof op.selector !== 'string' || !op.selector) return;
    if (/[{}]/.test(op.selector) || /[{}]/.test(String(op.value))) return;
    var attr = 'data-exp-' + name;
    var sig = key + '|' + variant + '|' + op.action + '|' + op.selector + '|' + op.value;
    if (CSS_ACTIONS[op.action]) {
      if (op.action === 'css' && typeof op.value !== 'string') return;
      if (!cssRule(op, attr, variant)) return;
    } else if (DOM_ACTIONS[op.action]) {
      if (domSeen[sig]) return;
      domSeen[sig] = true;
      var entry = {
        op: op,
        marker: 'data-exp-applied-' + name,
        id: String(domOps.length),
      };
      domOps.push(entry);
      runDomOp(entry);
      watchDom();
    } else {
      warn('unknown action', op.action);
      return;
    }
    state.ops.push({ flag: key, variant: variant, selector: op.selector, action: op.action });
    warnIfUnmatched(op.selector);
  }

  function applyFlag(posthog, key) {
    var variant = posthog.getFeatureFlag(key);
    if (!variant) return;
    var name = key.slice(4);
    document.documentElement.setAttribute('data-exp-' + name, String(variant));
    state.applied[key] = variant;
    if (!exposed[key]) {
      exposed[key] = true;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'experiment_exposure', exp_flag: key, exp_variant: variant });
    }
    var payload = parsePayload(posthog.getFeatureFlagPayload(key));
    var ops = payload && Array.isArray(payload.ops) ? payload.ops : [];
    for (var i = 0; i < ops.length; i++) {
      try {
        applyOp(ops[i], key, name, variant);
      } catch (error) {
        warn('op failed', error);
      }
    }
  }

  function apply(posthog) {
    try {
      var keys = posthog.featureFlags.getFlags() || [];
      for (var i = 0; i < keys.length; i++) {
        try {
          if (typeof keys[i] === 'string' && keys[i].indexOf('exp-') === 0) applyFlag(posthog, keys[i]);
        } catch (error) {
          warn('flag failed', error);
        }
      }
    } catch (error) {
      warn('apply failed', error);
    }
  }

  function previewOn() {
    var store = null;
    try {
      store = window.sessionStorage;
    } catch (error) {
      store = null;
    }
    var param = null;
    try {
      param = new URLSearchParams(window.location.search).get(PREVIEW_KEY);
    } catch (error) {
      param = null;
    }
    try {
      if (param === '1' && store) store.setItem(PREVIEW_KEY, '1');
      if (param === '0' && store) store.removeItem(PREVIEW_KEY);
    } catch (error) {
      warn('storage blocked', error);
    }
    if (param === '1') return true;
    if (param === '0') return false;
    try {
      return !!store && store.getItem(PREVIEW_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function ready(posthog) {
    try {
      if (previewOn()) posthog.setPersonPropertiesForFlags({ exp_preview: 'yes' });
    } catch (error) {
      warn('preview failed', error);
    }
    try {
      posthog.onFeatureFlags(function () {
        apply(posthog);
      });
    } catch (error) {
      warn('onFeatureFlags failed', error);
    }
  }

  function found() {
    var posthog = window.posthog;
    return posthog && posthog.__loaded === true ? posthog : null;
  }

  function start() {
    var posthog = found();
    if (posthog) return ready(posthog);
    var waited = 0;
    var timer = setInterval(function () {
      try {
        waited += POLL_MS;
        var instance = found();
        if (instance) {
          clearInterval(timer);
          ready(instance);
        } else if (waited >= POLL_MAX_MS) {
          clearInterval(timer);
        }
      } catch (error) {
        clearInterval(timer);
        warn('poll failed', error);
      }
    }, POLL_MS);
  }

  try {
    start();
  } catch (error) {
    warn('start failed', error);
  }
})();
