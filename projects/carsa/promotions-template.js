// Carsa promotions template behaviour moved out of the Webflow template body: points the search-offer buttons at the deals filter for the promotion, reading the CMS pill description from window.__CARSA_PROMO.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('promotions-template.js');

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

  function cms(config, keys) {
    if (!config || typeof config !== 'object') return null;
    var out = {};
    keys.forEach(function (k) {
      var v = config[k];
      out[k] = String(v == null ? '' : v).trim();
    });
    return out;
  }

  var PROMO = cms(window.__CARSA_PROMO, ['pillDescription']);
  if (!PROMO && window.DD_LOGS) window.DD_LOGS.logger.warn('promotions-template.js: window.__CARSA_PROMO missing, promo filter link skipped');

  if (PROMO) block(() => {
    var promo = PROMO.pillDescription.trim();

    var encoded = encodeURIComponent(promo);

    var url = "/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=" + encoded;

    $(document).ready(function(){
      $('[data-button="search-offer"]').attr("href", url);
    });
  });
})(window.jQuery);
