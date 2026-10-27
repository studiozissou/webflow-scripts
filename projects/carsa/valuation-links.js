// Carsa shared instant-valuation links moved out of Webflow page bodies: builds the sellcar order URL from the form's VRM and mileage plus stored UTMs and the external referrer, on the pages that carried it inline.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('valuation-links.js: window.__CARSA missing');
    return;
  }
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('valuation-links.js');

  var VALUATION_PATHS = [
    '/',
    '/about/reviews',
    '/sell-car/part-exchange',
    '/sell-car/value-car',
    '/used-cars',
    '/used-cars/black-friday-deals',
    '/used-cars/deals',
  ];
  var VALUATION_TEMPLATES = [
    '/used-cars/fuel',
    '/used-cars/make',
    '/used-cars/models',
    '/used-cars/near',
    '/mot-and-car-servicing/servicing-locations',
    '/sell-car/store',
  ];

  H.block(() => {
    if (!H.onPage(VALUATION_PATHS, VALUATION_TEMPLATES)) return;
    $(function () {
      function generateOrderURL(vrm, mileage){
        const base = 'https://sellcar.carsa.co.uk/new-order?vrm=' + encodeURIComponent(vrm)
                   + '&mileage=' + encodeURIComponent(mileage || '');
        return H.addParams(base, H.getAttributionParams());
      }

      function getFormValues($form){
        const vrm = ($form.find('[name="vrm"]').first().val() || '')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '');
        const mileage = ($form.find('[name="mileage"]').first().val() || '').trim();
        return { vrm, mileage };
      }

      function setHref($trigger){
        const $form = $trigger.closest('form');
        if(!$form.length) return null;
        const { vrm, mileage } = getFormValues($form);
        if(!vrm) return null;
        const url = generateOrderURL(vrm, mileage);
        if($trigger.is('a')) $trigger.attr({ href: url, target: '_blank' });
        return url;
      }

      $(document).on('click', '[data-link="valuation"]', function(e){
        const url = setHref($(this));
        if(!url) return;
        if(!$(this).is('a')){
          e.preventDefault();
          window.open(url, '_blank', 'noopener');
        }
      });

      $(document).on('keydown', 'form input', function(e){
        if(e.key !== 'Enter') return;
        const $form = $(this).closest('form');
        const $trigger = $form.find('[data-link="valuation"]').first();
        if(!$trigger.length) return;
        e.preventDefault();
        const url = setHref($trigger);
        if(url && !$trigger.is('a')) window.open(url, '_blank', 'noopener');
        else if(url) $trigger[0].click();
      });

      $(document).on('input', 'form [name="vrm"], form [name="mileage"]', function(){
        const $form = $(this).closest('form');
        $form.find('[data-link="valuation"]').each(function(){ setHref($(this)); });
      });
    });
  });
})(window.jQuery);
