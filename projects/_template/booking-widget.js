// Booking widget (Zenchef by default, every vendor detail in BOOKING): turns booking buttons into widget triggers, loads the SDK after page load or on first intent with a loading state and a bookings-page fallback for early taps, never opens on its own, and titles the booking iframe once it is ready and keeps it under the consent banner.
(function () {
  'use strict';

  var DEBUG = false;
  var BOOKING = {
    sdkId: 'zenchef-sdk',
    sdkSrc: 'https://sdk.zenchef.com/v1/sdk.min.js',
    origin: 'https://bookings.zenchef.com',
    configSelector: '.zc-widget-config',
    venueAttribute: 'data-restaurant',
    triggerAttribute: 'data-zc-action',
    triggerValue: 'open',
    readyMessage: 'widget-listening',
    fallbackUrl: function (venueId, lang) {
      return (
        'https://bookings.zenchef.com/results?rid=' +
        encodeURIComponent(venueId) +
        '&lang=' +
        lang
      );
    },
  };
  var BUTTONS = '[data-booking="open"]';
  var TITLE_ATTRIBUTE = 'data-iframe-title';
  var DEFAULT_TITLE = 'Book a table';
  var DEFAULT_LANG = 'en';
  var CONSENT_ROOT = '[fs-consent-element="root"]';
  var CONSENT_BANNER = '[fs-consent-element="banner"]';
  var CONSENT_ACTIVE = 'fs-consent-active';
  var UNDER_CONSENT = 'client-booking-under-consent';
  var STYLE_ID = 'client-booking-css';
  var UNDER_CONSENT_CSS =
    '@media (max-width: 767px) { iframe.' +
    UNDER_CONSENT +
    ' { z-index: 99998 !important; } }';
  var PRELOAD_DELAY = 2000;
  var FALLBACK_DELAY = 8000;
  var CONSENT_RETRY_DELAY = 250;
  var CONSENT_RETRY_LIMIT = 40;

  var TRIGGER = '[' + BOOKING.triggerAttribute + '="' + BOOKING.triggerValue + '"]';
  var TRIGGERS = BUTTONS + ', ' + TRIGGER;
  var IFRAME = 'iframe[src^="' + BOOKING.origin + '"]';

  var document = window.document;
  var config = document.querySelector(BOOKING.configSelector);
  if (!config || document.getElementById(BOOKING.sdkId)) return;

  var venueId = config.getAttribute(BOOKING.venueAttribute);
  if (!venueId) return;

  var ready = null;
  var isReady = false;
  var pending = null;
  var fallbackTimer = null;
  var consentWatched = false;
  var consentTimer = null;
  var consentTries = 0;

  function isWidgetReady(event) {
    return (
      event.origin === BOOKING.origin &&
      Boolean(event.data) &&
      event.data.type === BOOKING.readyMessage
    );
  }

  function pageLang() {
    return (document.documentElement.lang || DEFAULT_LANG).slice(0, 2);
  }

  function titleIframe() {
    var iframe = document.querySelector(IFRAME);
    if (!iframe) return;
    iframe.setAttribute('title', config.getAttribute(TITLE_ATTRIBUTE) || DEFAULT_TITLE);
  }

  function consentBanner() {
    var root = document.querySelector(CONSENT_ROOT);
    if (!root || !root.shadowRoot) return null;
    return root.shadowRoot.querySelector(CONSENT_BANNER);
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = UNDER_CONSENT_CSS;
    document.head.appendChild(style);
  }

  function setUnderConsent(under) {
    var iframe = document.querySelector(IFRAME);
    if (!iframe) return;
    if (under) iframe.classList.add(UNDER_CONSENT);
    else iframe.classList.remove(UNDER_CONSENT);
  }

  function layerUnderConsent() {
    if (consentWatched) return true;
    var banner = consentBanner();
    if (!banner || !window.MutationObserver) return false;
    consentWatched = true;
    clearTimeout(consentTimer);
    addStyles();
    function sync() {
      setUnderConsent(banner.hasAttribute(CONSENT_ACTIVE));
    }
    sync();
    new window.MutationObserver(sync).observe(banner, {
      attributes: true,
      attributeFilter: [CONSENT_ACTIVE],
    });
    return true;
  }

  function retryConsent() {
    clearTimeout(consentTimer);
    if (consentWatched || consentTries >= CONSENT_RETRY_LIMIT) return;
    consentTries++;
    consentTimer = setTimeout(function () {
      if (!layerUnderConsent()) retryConsent();
    }, CONSENT_RETRY_DELAY);
  }

  function watchConsent() {
    consentTries = 0;
    if (!layerUnderConsent()) retryConsent();
  }

  function injectSdk() {
    var script = document.createElement('script');
    script.id = BOOKING.sdkId;
    script.src = BOOKING.sdkSrc;
    script.async = true;
    document.head.appendChild(script);
    return script;
  }

  function loadSdk() {
    if (ready) return ready;
    ready = new Promise(function (resolve, reject) {
      window.addEventListener('message', function onMessage(event) {
        if (!isWidgetReady(event)) return;
        window.removeEventListener('message', onMessage);
        isReady = true;
        titleIframe();
        watchConsent();
        DEBUG && console.log('[client/booking] widget ready');
        resolve();
      });
      var script = document.getElementById(BOOKING.sdkId) || injectSdk();
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

  function onReady() {
    var trigger = takePending();
    if (trigger) trigger.click();
  }

  function onFail() {
    if (!takePending()) return;
    DEBUG && console.log('[client/booking] widget unavailable, opening bookings page');
    window.location.assign(BOOKING.fallbackUrl(venueId, pageLang()));
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
    if (!isReady) {
      waitForWidget(trigger);
      return;
    }
    watchConsent();
    setUnderConsent(false);
  }

  function preload() {
    loadSdk();
  }

  function wireTrigger(trigger) {
    trigger.setAttribute(BOOKING.triggerAttribute, BOOKING.triggerValue);
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

  window.CLIENT = window.CLIENT || {};
  window.CLIENT.booking = { load: loadSdk };
})();
