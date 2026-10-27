// Carsa shared equal-height car cards moved out of Webflow page bodies: the vanilla version for home, calculator and reserve, and the jQuery version for the store and servicing templates.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('equal-height.js: window.__CARSA missing');
    return;
  }
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('equal-height.js');

  H.block(() => {
    if (!H.onPage(['/', '/car-finance-calculator', '/reserve'])) return;
    function setEqualHeight() {
      var cards = document.querySelectorAll('[data-card-height="equal"]');
      if (!cards.length) return;
      cards.forEach(function(c) { c.style.height = 'auto'; });
      var maxH = 0;
      cards.forEach(function(c) { maxH = Math.max(maxH, c.offsetHeight); });
      cards.forEach(function(c) { c.style.height = maxH + 'px'; });
    }

    window.addEventListener('resize', setEqualHeight);

    new MutationObserver(setEqualHeight).observe(
      document.body,
      { childList: true, subtree: true }
    );
  });

  H.block(() => {
    if (!H.onPage([], ['/stores', '/sell-car/store', '/mot-and-car-servicing/servicing-locations'])) return;
    function setEqualHeight() {
      let $cards = $('[data-card-height="equal"]');
      let maxH = 0;
      $cards.css('height', 'auto');
      $cards.each(function () {
        maxH = Math.max(maxH, $(this).outerHeight());
      });
      $cards.height(maxH);
    }

    H.onLoad(setEqualHeight);
    $(window).on('resize', setEqualHeight);
  });
})(window.jQuery);
