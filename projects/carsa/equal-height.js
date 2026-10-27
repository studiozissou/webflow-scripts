// Carsa shared equal-height car cards moved out of Webflow page bodies: the vanilla version for home, calculator and reserve, and the jQuery version for the store and servicing templates.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('equal-height.js');

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

  block(() => {
    if (!onPage(['/', '/car-finance-calculator', '/reserve'])) return;
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

  block(() => {
    if (!onPage([], ['/stores', '/sell-car/store', '/mot-and-car-servicing/servicing-locations'])) return;
    function setEqualHeight() {
      let $cards = $('[data-card-height="equal"]');
      let maxH = 0;
      $cards.css('height', 'auto');
      $cards.each(function () {
        maxH = Math.max(maxH, $(this).outerHeight());
      });
      $cards.height(maxH);
    }

    onLoad(setEqualHeight);
    $(window).on('resize', setEqualHeight);
  });
})(window.jQuery);
