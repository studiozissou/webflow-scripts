// Carsa fuel template behaviour moved out of the Webflow template body: PX links with stored UTMs and the "Search all" links, reading the CMS fuel name from window.__CARSA_FUEL.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('fuel-template.js');

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

  var FUEL = cms(window.__CARSA_FUEL, ['name']);
  if (!FUEL && window.DD_LOGS) window.DD_LOGS.logger.warn('fuel-template.js: window.__CARSA_FUEL missing, "Search all" links skipped');

  block(() => {
    $(function () {
      const HOST = location.hostname.replace(/^www\./,'');

      function getAttributionParams(){
        const pick = (k)=>{ try{ return JSON.parse(k.getItem('attribution_session')||'null') || JSON.parse(k.getItem('attribution')||'null'); }catch(_){ return null; } };
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
        try{
          const u = new URL(url, location.origin);
          for(const k in obj){ if(!u.searchParams.has(k)) u.searchParams.set(k, obj[k]); }
          return u.toString();
        }catch(_){
          const hasQ = url.indexOf('?')>-1, parts=[];
          for(const k in obj){ if(!new RegExp('([?&])'+k+'=').test(url)) parts.push(k+'='+encodeURIComponent(obj[k])); }
          return parts.length ? url + (hasQ?'&':'?') + parts.join('&') : url;
        }
      }

      function generatePxURL(pxVrm){
        const base = 'https://quote.carsa.co.uk/value-my-car/enter-vrm?px_vrm=' + encodeURIComponent(pxVrm);
        return addParams(base, getAttributionParams());
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

  if (FUEL) onReady(function() {
    const fuel  = FUEL.name.trim();

    const params = [];
    if (fuel)  params.push("cars_fuel-type_equal="  + fuel.replace(/\s+/g, '+'));

    const query = params.length ? "?" + params.join("&") : "";

    document.querySelectorAll('[data-button="search-similar"]').forEach(btn => {
      btn.setAttribute("href", "/used-cars" + query);
    });
  });
})(window.jQuery);
