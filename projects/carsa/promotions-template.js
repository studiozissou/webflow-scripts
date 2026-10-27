// Carsa promotions template behaviour moved out of the Webflow template body: points the search-offer buttons at the deals filter for the promotion, reading the CMS pill description from window.__CARSA_PROMO.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('promotions-template.js: window.__CARSA missing');
    return;
  }
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('promotions-template.js');

  var PROMO = H.cms(window.__CARSA_PROMO, ['pillDescription']);
  if (!PROMO && window.DD_LOGS) window.DD_LOGS.logger.warn('promotions-template.js: window.__CARSA_PROMO missing, promo filter link skipped');

  if (PROMO) H.block(() => {
    var promo = PROMO.pillDescription.trim();

    var encoded = encodeURIComponent(promo);

    var url = "/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=" + encoded;

    $(document).ready(function(){
      $('[data-button="search-offer"]').attr("href", url);
    });
  });
})(window.jQuery);
