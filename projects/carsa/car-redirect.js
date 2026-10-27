// Carsa /car-redirect head script moved into the loader: sends /car-redirect?vrm=X straight to the lower-cased vehicle page.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('car-redirect.js');

  block(() => {
    (function() {
      var vrm = new URLSearchParams(window.location.search).get('vrm');
      if (vrm) {
        window.location.replace('https://www.carsa.co.uk/vehicles/used/' + vrm.toLowerCase());
      }
    })();
  });

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
})(window.jQuery);
