// Carsa shared instant-valuation links moved out of Webflow page bodies: builds the sellcar order URL from the form's VRM and mileage plus stored UTMs and the external referrer, on the pages that carried it inline.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('valuation-links.js');

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

  block(() => {
    if (!onPage(VALUATION_PATHS, VALUATION_TEMPLATES)) return;
    $(function () {
      const HOST = location.hostname.replace(/^www\./,'');

      function getAttributionParams(){
        const pick = (s)=>{ try{ return JSON.parse(s.getItem('attribution_session')||'null') || JSON.parse(s.getItem('attribution')||'null'); }catch(_){ return null; } };
        const ss = pick(sessionStorage) || {};
        const ls = pick(localStorage)  || {};
        const utms = (ss.utms && Object.keys(ss.utms).length ? ss.utms : (ls.utms||{}));
        let refDomain = ss.referrerDomain || ls.referrerDomain || '';
        if(!refDomain && document.referrer){
          try{
            const d = new URL(document.referrer).hostname.replace(/^www\./,'');
            if(!(d===HOST || d.endsWith('.'+HOST))) refDomain = d;
          }catch(_){}
        }
        const params = {...utms};
        if(refDomain) params.referrer = refDomain;
        return params;
      }

      function addParams(url, obj){
        const u = new URL(url, location.origin);
        for(const k in obj){ if(!u.searchParams.has(k)) u.searchParams.set(k, obj[k]); }
        return u.toString();
      }

      function generateOrderURL(vrm, mileage){
        const base = 'https://sellcar.carsa.co.uk/new-order?vrm=' + encodeURIComponent(vrm)
                   + '&mileage=' + encodeURIComponent(mileage || '');
        return addParams(base, getAttributionParams());
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
