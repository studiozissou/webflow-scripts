// Carsa /reserve page behaviour moved out of the Webflow page body: the VRM finder that formats the registration, tracks find_car and opens the car's page, through the global crsaFindCar the button calls.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('reserve.js: window.__CARSA missing');
    return;
  }
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('reserve.js');

  window.crsaFindCar = function () {
    var input = document.getElementById('crw-vrm-input');
    var error = document.getElementById('crw-vrm-error');
    if (!input || !error) return;
    var vrm = input.value.trim().replace(/\s+/g, '');
    if (vrm.length < 2) {
      error.classList.add('crw-show');
      input.focus();
      return;
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'find_car', {
        event_category: 'reservation_widget',
        event_label: vrm.toUpperCase(),
        vrm: vrm.toUpperCase()
      });
    }
    window.open(
      'https://www.carsa.co.uk/vehicles/used/' + vrm.toLowerCase(),
      '_blank',
      'noopener'
    );
  };

  H.onReady(function () {
    var input = document.getElementById('crw-vrm-input');
    var error = document.getElementById('crw-vrm-error');
    if (!input || !error) return;

    input.addEventListener('input', function () {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      error.classList.remove('crw-show');
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') window.crsaFindCar();
    });
  });
})(window.jQuery);
