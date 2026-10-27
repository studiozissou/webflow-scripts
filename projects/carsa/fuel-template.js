// Carsa fuel template behaviour moved out of the Webflow template body: PX links with first-touch UTMs and the "Search all" links, reading the CMS fuel name from window.__CARSA_FUEL.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('fuel-template.js: window.__CARSA missing');
    return;
  }
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('fuel-template.js');

  var FUEL = H.cms(window.__CARSA_FUEL, ['name']);
  if (!FUEL && window.DD_LOGS) window.DD_LOGS.logger.warn('fuel-template.js: window.__CARSA_FUEL missing, "Search all" links skipped');

  H.block(() => {
    $(function () {
      function generatePxURL(pxVrm){
        const base = 'https://quote.carsa.co.uk/value-my-car/enter-vrm?px_vrm=' + encodeURIComponent(pxVrm);
        return H.addParams(base, H.getAttributionParams());
      }

      function updateButtonHref($form, $btn){
        const vrm = $form.find('[name="px-vrm"]').val();
        if(!vrm) return;
        $btn.attr('href', generatePxURL(vrm)).attr('target','_blank');
      }

      $('#px-form-large input, #px-form-small input').on('keydown', function(e){
        if(e.key === 'Enter'){ e.preventDefault(); const $f=$(this).closest('form'); const $b=$f.find('a'); updateButtonHref($f,$b); $b[0].click(); }
      });

      $('#px-form-large, #px-form-small').on('submit', function(e){
        e.preventDefault(); const $b=$(this).find('a'); updateButtonHref($(this), $b); $b[0].click();
      });

      $('#px-button-large').on('click', function(){ updateButtonHref($('#px-form-large'), $(this)); });
      $('#px-button-small').on('click', function(){ updateButtonHref($('#px-form-small'), $(this)); });

      $('#px-form-large [name="px-vrm"]').on('input', function(){ updateButtonHref($('#px-form-large'), $('#px-button-large')); });
      $('#px-form-small [name="px-vrm"]').on('input', function(){ updateButtonHref($('#px-form-small'), $('#px-button-small')); });
    });
  });

  if (FUEL) H.onReady(function() {
    const fuel  = FUEL.name.trim();

    const params = [];
    if (fuel)  params.push("cars_fuel-type_equal="  + encodeURIComponent(fuel));

    const query = params.length ? "?" + params.join("&") : "";

    document.querySelectorAll('[data-button="search-similar"]').forEach(btn => {
      btn.setAttribute("href", "/used-cars" + query);
    });
  });
})(window.jQuery);
