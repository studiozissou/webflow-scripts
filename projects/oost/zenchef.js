// Owns the Zenchef booking widget: turns the Reserveer buttons into widget triggers, loads the SDK after page load or on first intent with a loading state and a bookings-page fallback for early taps, and titles the booking iframe once it is ready.
(function () {
  'use strict';

  var DEBUG = false;
  var SDK_ID = 'zenchef-sdk';
  var SDK_SRC = 'https://sdk.zenchef.com/v1/sdk.min.js';
  var BOOKINGS_ORIGIN = 'https://bookings.zenchef.com';
  var TRIGGER = '[data-zc-action="open"]';
  var TRIGGERS = '[data-formitable="open"], ' + TRIGGER;
  var IFRAME = 'iframe[src^="' + BOOKINGS_ORIGIN + '"]';
  var IFRAME_TITLES = {
    nl: 'Reserveren bij Restaurant Oost',
    en: 'Book a table at Restaurant Oost',
  };
  var PRELOAD_DELAY = 2000;
  var FALLBACK_DELAY = 8000;

  var document = window.document;
  var config = document.querySelector('.zc-widget-config');
  if (!config || document.getElementById(SDK_ID)) return;

  var rid = config.getAttribute('data-restaurant') || '388830';
  var ready = null;
  var isReady = false;
  var pending = null;
  var fallbackTimer = null;

  function isWidgetListening(event) {
    return (
      event.origin === BOOKINGS_ORIGIN &&
      Boolean(event.data) &&
      event.data.type === 'widget-listening'
    );
  }

  function pageLang() {
    return (document.documentElement.lang || 'nl').slice(0, 2);
  }

  function titleIframe() {
    var iframe = document.querySelector(IFRAME);
    if (!iframe) return;
    iframe.setAttribute('title', IFRAME_TITLES[pageLang()] || IFRAME_TITLES.nl);
  }

  function injectSdk() {
    var script = document.createElement('script');
    script.id = SDK_ID;
    script.src = SDK_SRC;
    script.async = true;
    document.head.appendChild(script);
    return script;
  }

  function loadSdk() {
    if (ready) return ready;
    ready = new Promise(function (resolve, reject) {
      window.addEventListener('message', function onMessage(event) {
        if (!isWidgetListening(event)) return;
        window.removeEventListener('message', onMessage);
        isReady = true;
        titleIframe();
        DEBUG && console.log('[oost/zenchef] widget ready');
        resolve();
      });
      var script = document.getElementById(SDK_ID) || injectSdk();
      script.onerror = reject;
    });
    ready.catch(function () {});
    return ready;
  }

  function setLoading(trigger, loading) {
    if (loading) {
      trigger.classList.add('is-loading');
      trigger.setAttribute('aria-busy', 'true');
    } else {
      trigger.classList.remove('is-loading');
      trigger.removeAttribute('aria-busy');
    }
  }

  function takePending() {
    var trigger = pending;
    pending = null;
    clearTimeout(fallbackTimer);
    if (trigger) setLoading(trigger, false);
    return trigger;
  }

  function openBookingsPage() {
    window.location.assign(
      BOOKINGS_ORIGIN + '/results?rid=' + rid + '&lang=' + pageLang(),
    );
  }

  function onReady() {
    var trigger = takePending();
    if (trigger) trigger.click();
  }

  function onFail() {
    if (!takePending()) return;
    DEBUG && console.log('[oost/zenchef] widget unavailable, opening bookings page');
    openBookingsPage();
  }

  function waitForWidget(trigger) {
    if (pending) setLoading(pending, false);
    pending = trigger;
    setLoading(trigger, true);
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(onFail, FALLBACK_DELAY);
    loadSdk().then(onReady, onFail);
  }

  function onClick(event) {
    var target = event.target;
    var trigger = target && target.closest ? target.closest(TRIGGER) : null;
    if (!trigger) return;
    event.preventDefault();
    if (!isReady) waitForWidget(trigger);
  }

  function preload() {
    loadSdk();
  }

  function wireTrigger(trigger) {
    trigger.setAttribute('data-zc-action', 'open');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.addEventListener('pointerenter', preload);
    trigger.addEventListener('touchstart', preload, { passive: true });
    trigger.addEventListener('focusin', preload);
  }

  function preloadWhenIdle() {
    setTimeout(function () {
      if (window.requestIdleCallback) window.requestIdleCallback(preload);
      else setTimeout(preload, 0);
    }, PRELOAD_DELAY);
  }

  var triggers = document.querySelectorAll(TRIGGERS);
  for (var i = 0; i < triggers.length; i++) wireTrigger(triggers[i]);
  document.addEventListener('click', onClick);

  if (document.readyState === 'complete') preloadWhenIdle();
  else window.addEventListener('load', preloadWhenIdle);

  window.OOST = window.OOST || {};
  window.OOST.zenchef = { load: loadSdk };
})();
