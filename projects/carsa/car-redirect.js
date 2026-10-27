// Carsa /car-redirect script, loaded by init.js before the jQuery/GSAP gate: sends /car-redirect?vrm=X straight to the lower-cased vehicle page when X is a plain 2-8 character registration, and leaves the page alone otherwise.
(function () {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('car-redirect.js');

  block(function () {
    var vrm = (new URLSearchParams(window.location.search).get('vrm') || '').replace(/\s+/g, '');
    if (!/^[A-Z0-9]{2,8}$/i.test(vrm)) return;
    window.location.replace('https://www.carsa.co.uk/vehicles/used/' + encodeURIComponent(vrm).toLowerCase());
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
})();
