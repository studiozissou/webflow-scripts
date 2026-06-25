/**
 * Carsa VDP — Vehicle Detail Page scripts
 * Phase 1: externalized as-is from Webflow inline code
 *
 * Reads CMS values from window.__CARSA_VDP (set by inline config in Webflow body).
 * Preserves all original jQuery dependencies and behaviour.
 *
 * Phase 2: fixed typos and broken selectors from original inline code.
 *
 * Remaining issues for Phase 3:
 * - Hardcoded requestUuid in finance API payload (line ~298) — every call
 *   shares the same UUID; may cause dedup/caching issues if the API uses it
 * - MutationObserver on document.body (equal-height cards, §8) fires on every
 *   DOM mutation without debounce — can thrash on busy pages
 * - Attribution/UTM logic is duplicated across §1, §6, §9, §11, §14, §15 with
 *   slight variations (sessionStorage vs localStorage, attribution_session key)
 *   — should be extracted into a shared helper
 * - Two different formatCurrency functions (§2 expects string, §3 expects number)
 *   — works due to IIFE scoping but fragile if refactored
 */

var VDP = window.__CARSA_VDP || {};

/* ============================================================
   1. UTM link appender — Build Deal, Book Test Drive, Eligibility
   ============================================================ */
(function () {
  $(window).on('load', function(){
    var HOST = location.hostname.replace(/^www\./,'');
    var isInternal = function(d) { return !!d && (d===HOST || d.endsWith('.'+HOST)); };

    var store = {};
    try { store = JSON.parse(localStorage.getItem('attribution') || '{}'); } catch(e){}
    var utms = store.utms || {};

    var refDomain = '';
    if (store.referrerDomain && !isInternal(store.referrerDomain)) {
      refDomain = store.referrerDomain;
    } else if (store.referrer) {
      try {
        var d = new URL(store.referrer).hostname.replace(/^www\./,'');
        if(!isInternal(d)) refDomain = d;
      } catch(e){}
    } else if (document.referrer) {
      try {
        var d = new URL(document.referrer).hostname.replace(/^www\./,'');
        if(!isInternal(d)) refDomain = d;
      } catch(e){}
    }

    if (!Object.keys(utms).length) {
      var qs = new URLSearchParams(location.search);
      qs.forEach(function(v,k){ if(/^utm_/i.test(k) && v) utms[k]=v; });
    }

    var toAdd = Object.assign({}, utms);
    if (refDomain) toAdd.referrer = refDomain;

    function addParams(url, obj){
      try {
        var u = new URL(url, location.origin);
        for (var k in obj) if (!u.searchParams.has(k)) u.searchParams.set(k, obj[k]);
        return u.toString();
      } catch(_) {
        var hasQ = url.includes('?'); var parts=[];
        for (var k in obj)
          if (!new RegExp('([?&])'+k+'=').test(url)) parts.push(k+'='+encodeURIComponent(obj[k]));
        return parts.length ? url + (hasQ?'&':'?') + parts.join('&') : url;
      }
    }

    $('a[href*="quote.carsa.co.uk/build-deal/"],' +
      'a[href*="quote.carsa.co.uk/book/"],' +
      'a[href*="quote.carsa.co.uk/eligibility/questions"]').each(function(){
        this.href = addParams(this.href, toAdd);
    });
  });
})();

/* ============================================================
   2. Number formatter — currency, decimals, commas
   ============================================================ */
(function () {
  function formatCurrency(num) {
    return '£' + Number(num.replace(/[^0-9.-]+/g, '')).toLocaleString('en-UK');
  }

  function formatDecimals(num) {
    return Number(num.replace(/[^0-9.-]+/g, '')).toFixed(2);
  }

  function formatCommas(num) {
    return Number(num.replace(/[^0-9.-]+/g, '')).toLocaleString('en-UK');
  }

  function formatCurrencyRounded(num) {
    var clean = Number(num.replace(/[^0-9.-]+/g, ''));
    return '£' + Math.round(clean).toLocaleString('en-UK');
  }

  $(document).ready(function () {
    $('[data-number="currency"]').each(function () {
      $(this).html($(this).text().replace(/[-+]?[0-9]*\.?[0-9]+/g, formatCurrency));
    });

    $('[data-number="currency-rounded"]').each(function () {
      $(this).html($(this).text().replace(/[-+]?[0-9]*\.?[0-9]+/g, formatCurrencyRounded));
    });

    $('[data-number="decimals"]').each(function () {
      $(this).html($(this).text().replace(/[-+]?[0-9]*\.?[0-9]+/g, formatDecimals));
    });

    $('[data-number="commas"]').each(function () {
      $(this).html($(this).text().replace(/[-+]?[0-9]*\.?[0-9]+/g, formatCommas));
    });
  });
})();

/* ============================================================
   3. Finance calculator
   ============================================================ */
(function () {
  document.addEventListener("DOMContentLoaded", function() {
    function preventSafariJump(fn){
      var x = window.scrollX, y = window.scrollY;
      var a = document.activeElement;
      if (a && /^(input|select|textarea|a|button)$/i.test(a.tagName)) a.blur();
      fn();
      requestAnimationFrame(function(){ window.scrollTo(x,y); });
    }

    function switchTabNoScroll($link){
      var oldHash = location.hash;
      var x = window.scrollX, y = window.scrollY;

      preventSafariJump(function(){ $link[0].click(); });

      if (location.hash !== oldHash){
        history.replaceState(null, '', oldHash ? oldHash : (location.pathname + location.search));
      }

      var i = 0;
      (function lock(){
        if (i++ < 4) requestAnimationFrame(function(){ window.scrollTo(x,y); lock(); });
      })();
    }

    // CMS values from config
    var cmsPrice = VDP.price;
    var rawDateStr = VDP.registrationDate;
    var rawDate = new Date(rawDateStr);

    function formatDateToYYYYMMDD(date) {
      var year = date.getFullYear();
      var month = ("0" + (date.getMonth() + 1)).slice(-2);
      var day = ("0" + date.getDate()).slice(-2);
      return year + '-' + month + '-' + day;
    }
    var formattedRegistrationDate = formatDateToYYYYMMDD(rawDate);

    var depositInput = document.getElementById("finance-deposit");

    preventSafariJump(function () {
      if (depositInput) depositInput.value = formatCurrency(2000);

      if (VDP.financeType === "HP") {
        var defaultTerm = document.getElementById("60");
      } else {
        var defaultTerm = document.getElementById("48");
      }

      if (defaultTerm) defaultTerm.checked = true;

      var mileageSelect = document.getElementById("finance-mileage");
      if (mileageSelect) {
        for (var i = 0; i < mileageSelect.options.length; i++) {
          var val = mileageSelect.options[i].value;
          if (val) { mileageSelect.value = val; break; }
        }
      }

      $('input[type="radio"][data-name="apr"][value="very-good"]').prop("checked", true);
    });

    function formatCurrency(val) {
      return "£" + Number(val).toLocaleString("en-UK", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }

    function parseCurrency(val) {
      return Number(val.replace(/[^0-9.]/g, ""));
    }

    function getAprFromSelection() {
      var creditRating = $('input[type="radio"][data-name="apr"]:checked').val();
      if (creditRating === "excellent") return 8.9;
      if (creditRating === "very-good" || creditRating === "good") return 10.9;
      if (creditRating === "fair") return 16.9;
      return 10.9;
    }

    function updateStaticOutputs(deposit, term) {
      document.querySelectorAll('[data-number="term"]').forEach(function(el){ el.textContent = term; });
      document.querySelectorAll('[data-number="contract-length"]').forEach(function(el){ el.textContent = Number(term) + 1; });
      var credit = cmsPrice - deposit;
      document.querySelectorAll('[data-number="total-credit"]').forEach(function(el){ el.textContent = formatCurrency(credit); });
    }

    function callFinanceAPI() {
      var deposit = parseCurrency(depositInput ? depositInput.value : '0');
      var term = $('input[type="radio"][data-name="finance-term"]:checked').val();
      var mileage = document.getElementById("finance-mileage") ? document.getElementById("finance-mileage").value : '';
      var apr = getAprFromSelection();

      updateStaticOutputs(deposit, term);

      var mapping = {
        "pcp-price": {
          path: "pcp.payments.regular",
          currency: true,
          localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        "pcp-term": {
          path: "pcp.term",
          currency: false,
          format: function(value) { return value + " monthly payments of"; }
        },
        "pcp-optional": {
          path: "pcp.residualValue",
          currency: true,
          localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        "pcp-total-amount-payable": {
          path: "pcp.totalAmountPayable",
          currency: true,
          localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        "pcp-interest-amount": {
          path: "pcp.totalCharges",
          currency: true,
          localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        "pcp-price-short": {
          path: "pcp.payments.regular",
          currency: true,
          transform: function(value) { return Math.floor(parseFloat(value)); },
          localeOptions: { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        },
        "hp-price": {
          path: "hp.payments.regular",
          currency: true,
          localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        "hp-price-short": {
          path: "hp.payments.regular",
          currency: true,
          transform: function(value) { return Math.floor(parseFloat(value)); },
          localeOptions: { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        },
        "hp-total-amount-payable": {
          path: "hp.totalAmountPayable",
          currency: true,
          localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        "hp-total-charges": {
          path: "hp.totalCharges",
          currency: true,
          localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        "hp-term": {
          path: "hp.term",
          currency: false,
          format: function(value) { return value + " monthly payments of"; }
        },
        "pcp-excess-mileage": {
          path: "pcp.excessMileage",
          currency: false
        }
      };

      var payload = {
        criteria: {
          annualMileage: Number(mileage),
          cashDeposit: Number(deposit),
          outstandingFinance: 0,
          pxEquity: 0,
          term: Number(term),
          apr: apr
        },
        vehicle: {
          mileage: VDP.odometer,
          price: cmsPrice,
          registrationDate: formattedRegistrationDate,
          type: "Car",
          vrm: VDP.vrm
        },
        requestedBy: "manual",
        requestUuid: "6319f553-726a-4e25-83e6-7b6fd792414a"
      };

      fetch("https://consumer-finance.carsanet.co.uk/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var pcpError = data && data.pcp && data.pcp.error;
        var hasError = pcpError && Object.keys(pcpError).length > 0;

        if (hasError) {
          switchTabNoScroll($('#hp-tab-link'));
          $('[data-element="pcp-error"]').css("display", "block");
          $('[data-element="pcp-available"]').css("display", "none");
        } else {
          switchTabNoScroll($('#pcp-tab-link'));
          $('[data-element="pcp-error"]').css("display", "none");
          $('[data-element="pcp-available"]').css("display", "block");
        }

        function getNestedValue(obj, path) {
          return path.split('.').reduce(function(acc, key) { return acc && acc[key]; }, obj);
        }

        Object.keys(mapping).forEach(function(id) {
          var config = mapping[id];
          var val = getNestedValue(data, config.path);
          if (val == null) return;

          if (config.transform) val = config.transform(val);
          if (config.format) val = config.format(val);
          else if (config.currency)
            val = "£" + Number(val).toLocaleString("en-UK", config.localeOptions);

          var el = document.getElementById(id);
          if (el) el.textContent = val;

          document.querySelectorAll('[data-number="' + id + '"]').forEach(function(el) { el.textContent = val; });
        });
      });
    }

    callFinanceAPI();

    var mileageEl = document.getElementById("finance-mileage");
    if (mileageEl) mileageEl.addEventListener("input", callFinanceAPI);
    $('input[type="radio"][data-name="finance-term"]').on("change", callFinanceAPI);
    $('input[type="radio"][data-name="apr"]').on("change", callFinanceAPI);

    var depositTimeout;
    if (depositInput) {
      depositInput.addEventListener("input", function() {
        clearTimeout(depositTimeout);
        var numeric = parseCurrency(depositInput.value);
        document.querySelectorAll('[data-number="deposit"]').forEach(function(el) { el.textContent = formatCurrency(numeric); });
        depositTimeout = setTimeout(callFinanceAPI, 1000);
      });

      depositInput.addEventListener("blur", function() {
        depositInput.value = formatCurrency(parseCurrency(depositInput.value));
      });

      depositInput.addEventListener("focus", function() {
        depositInput.value = parseCurrency(depositInput.value) || '';
      });
    }

    var financeButton = document.getElementById("finance-button");
    if (financeButton) financeButton.addEventListener("click", callFinanceAPI);

    document.querySelectorAll('#finance-deposit, #finance-mileage, input[type="radio"][data-name="finance-term"], input[type="radio"][data-name="apr"]').forEach(function(el) {
      el.addEventListener("keydown", function(e) {
        if (e.key === "Enter") e.preventDefault();
      });
    });
  });
})();

/* ============================================================
   4. APR updater
   ============================================================ */
(function () {
  $('[data-name="apr"]').on('change', function () {
    var value = $(this).val();
    var apr = '';

    if (value === 'excellent') apr = 8.9;
    else if (value === 'very-good' || value === 'good') apr = 10.9;
    else if (value === 'fair') apr = 16.9;

    $('[data-number="apr"]').text(apr);
  });
})();

/* ============================================================
   5. Get Started link updater
   ============================================================ */
(function () {
  $(document).ready(function () {
    var vrm = (VDP.vrm || '').trim().toLowerCase();
    var locationName = (VDP.locationName || '').trim();
    var isStorage = String(VDP.isStorageLocation).trim().toLowerCase() === 'true';

    var newHref = '/get-started?vrm=' + encodeURIComponent(vrm) + '&location=' + encodeURIComponent(locationName);
    if (isStorage) newHref += '&storage=true';

    $('[data-button="booking-options"]').attr('href', newHref);
  });
})();

/* ============================================================
   6. PX form link builder
   ============================================================ */
(function () {
  $(function(){
    var HOST = location.hostname.replace(/^www\./,'');

    function getAttributionParams(){
      var params = {};
      try {
        var store = JSON.parse(localStorage.getItem('attribution') || '{}');
        if (store.utms) Object.assign(params, store.utms);
        if (store.referrerDomain) params.referrer = store.referrerDomain;
      } catch(e){}

      if (!Object.keys(params).some(function(k){ return k.startsWith('utm_'); })) {
        var qs = new URLSearchParams(location.search);
        qs.forEach(function(v,k){ if(/^utm_/i.test(k) && v) params[k]=v; });
      }

      if (!params.referrer && document.referrer){
        try{
          var d = new URL(document.referrer).hostname.replace(/^www\./,'');
          var isInternal = d===HOST || d.endsWith('.'+HOST);
          if (!isInternal) params.referrer = d;
        }catch(e){}
      }
      return params;
    }

    function generatePxURL(pxVrm){
      var base = 'https://quote.carsa.co.uk/get-px-valuation/' + VDP.vrm + '/?px_vrm=' + encodeURIComponent(pxVrm);
      var add = getAttributionParams();
      try {
        var u = new URL(base);
        Object.keys(add).forEach(function(k) { if(!u.searchParams.has(k)) u.searchParams.set(k, add[k]); });
        return u.toString();
      } catch(e){
        var hasQ = base.includes('?');
        var extra = Object.keys(add).map(function(k){ return k+'='+encodeURIComponent(add[k]); }).join('&');
        return extra ? base + (hasQ?'&':'?') + extra : base;
      }
    }

    function updateButtonHref($form, $button){
      var pxVrm = $form.find('[name="px-vrm"]').val();
      if(!pxVrm) return;
      var url = generatePxURL(pxVrm);
      $button.attr('href', url).attr('target','_blank');
    }

    $('#px-form-large input, #px-form-small input').on('keydown', function(e){
      if(e.key === 'Enter'){
        e.preventDefault();
        var $form = $(this).closest('form');
        var $btn  = $form.find('a');
        updateButtonHref($form, $btn);
        $btn[0].click();
      }
    });

    $('#px-form-large, #px-form-small').on('submit', function(e){
      e.preventDefault();
      var $btn = $(this).find('a');
      updateButtonHref($(this), $btn);
      $btn[0].click();
    });

    $('#px-button-large').on('click', function(){
      updateButtonHref($('#px-form-large'), $(this));
    });
    $('#px-button-small').on('click', function(){
      updateButtonHref($('#px-form-small'), $(this));
    });

    $('#px-form-large [name="px-vrm"]').on('input', function(){
      updateButtonHref($('#px-form-large'), $('#px-button-large'));
    });
    $('#px-form-small [name="px-vrm"]').on('input', function(){
      updateButtonHref($('#px-form-small'), $('#px-button-small'));
    });
  });
})();

/* ============================================================
   7. Search similar vehicles
   ============================================================ */
(function () {
  document.addEventListener("DOMContentLoaded", function() {
    var make  = (VDP.makeName || '').trim();
    var model = (VDP.modelName || '').trim();

    var params = [];
    if (make)  params.push("cars_make_equal="  + make.replace(/\s+/g, '+'));
    if (model) params.push("cars_model_equal=" + model.replace(/\s+/g, '+'));

    var query = params.length ? "?" + params.join("&") : "";

    document.querySelectorAll('[data-link="search-similar"]').forEach(function(btn) {
      btn.setAttribute("href", "/used-cars" + query);
    });
  });
})();

/* ============================================================
   8. Equal-height cards
   ============================================================ */
(function () {
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
})();

/* ============================================================
   9. Form UTM hidden fields
   ============================================================ */
(function () {
  $(function () {
    var HOST = location.hostname.replace(/^www\./,'');
    var STD = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];

    var getStored = function() { try { return JSON.parse(localStorage.getItem('attribution') || '{}'); } catch(e) { return {}; } };
    var getURLUtms = function() { var o={}, qs=new URLSearchParams(location.search); qs.forEach(function(v,k){ if(/^utm_/i.test(k)&&v) o[k]=v; }); return o; };
    var getUTMs = function() {
      var s = getStored().utms || {};
      return Object.keys(s).length ? s : getURLUtms();
    };
    var getRefDomain = function() {
      var s = getStored();
      if (s.referrerDomain) return s.referrerDomain;
      if (!document.referrer) return '';
      try {
        var d = new URL(document.referrer).hostname.replace(/^www\./,'');
        return (d===HOST || d.endsWith('.'+HOST)) ? '' : d;
      } catch(e) { return ''; }
    };
    var getCleanPageURL = function() {
      var keep=[]; var qs=new URLSearchParams(location.search);
      qs.forEach(function(v,k){ if(!/^utm_/i.test(k)) keep.push(k+'='+encodeURIComponent(v)); });
      return location.origin + location.pathname + (keep.length ? '?'+keep.join('&') : '');
    };

    var utms = getUTMs();
    var refDomain = getRefDomain();
    var conversionPage = getCleanPageURL();

    $('form[data-form="add-utms"]').each(function(){
      var $f = $(this);
      $f.find('input[name="conversion_page"], input[name="referrer"], input[name^="utm_"]').remove();

      $f.append($('<input>', { type:'hidden', name:'conversion_page', value: conversionPage }));

      STD.forEach(function(k) {
        $f.append($('<input>', { type:'hidden', name:k, value: utms[k] || '' }));
      });

      Object.keys(utms).forEach(function(k) {
        if (/^utm_/i.test(k) && STD.indexOf(k) === -1) {
          $f.append($('<input>', { type:'hidden', name:k, value: utms[k] }));
        }
      });

      $f.append($('<input>', { type:'hidden', name:'referrer', value: refDomain || '' }));
    });
  });
})();

/* ============================================================
   10. Make/model count updater
   ============================================================ */
(function () {
  $(document).ready(function() {
    var makeModelCount = $('[data-count="make-model"]').length;
    $('[data-number="make-model"]').text(makeModelCount);

    if (makeModelCount === 0) {
      $('[data-similar="model"]').hide();
      $('[data-similar="make"]').show();
    }
  });
})();

/* ============================================================
   11. Check-finance link builder
   ============================================================ */
(function () {
  var BASE = 'https://quote.carsa.co.uk/eligibility/questions';
  var SELECTOR = '[data-link="check-finance"]';
  var ANALYTICS_VALUE = 'check-finance-car-card-click';
  var HOST = location.hostname.replace(/^www\./, '');

  function getAttributionParams() {
    var pick = function(s) {
      try {
        return JSON.parse(s.getItem('attribution_session') || 'null') ||
               JSON.parse(s.getItem('attribution') || 'null');
      } catch (_) { return null; }
    };
    var ss = pick(sessionStorage) || {};
    var ls = pick(localStorage) || {};
    var utms = (ss.utms && Object.keys(ss.utms).length ? ss.utms : (ls.utms || {}));
    var refDomain = ss.referrerDomain || ls.referrerDomain || '';
    if (!refDomain && document.referrer) {
      try {
        var d = new URL(document.referrer).hostname.replace(/^www\./, '');
        if (!(d === HOST || d.endsWith('.' + HOST))) refDomain = d;
      } catch (_) {}
    }
    var params = Object.assign({}, utms);
    if (refDomain) params.referrer = refDomain;
    return params;
  }

  function addParams(url, obj) {
    try {
      var u = new URL(url, location.origin);
      for (var k in obj) { if (!u.searchParams.has(k)) u.searchParams.set(k, obj[k]); }
      return u.toString();
    } catch (_) {
      var hasQ = url.indexOf('?') > -1;
      var parts = [];
      for (var k in obj) {
        if (!new RegExp('([?&])' + k + '=').test(url)) parts.push(k + '=' + encodeURIComponent(obj[k]));
      }
      return parts.length ? url + (hasQ ? '&' : '?') + parts.join('&') : url;
    }
  }

  function buildURL(vrm) {
    var url = BASE;
    if (vrm) url += '?vrm=' + encodeURIComponent(vrm);
    return addParams(url, getAttributionParams());
  }

  document.body.addEventListener('mouseover', function(e) {
    var el = e.target.closest(SELECTOR);
    if (!el) return;
    var anchor = el.closest('a');
    if (!anchor) return;
    if (!anchor.dataset.originalHref) anchor.dataset.originalHref = anchor.href;
    if (!('originalAnalytics' in anchor.dataset)) anchor.dataset.originalAnalytics = anchor.getAttribute('data-analytics-event') || '';
    anchor.href = buildURL(el.getAttribute('vrm'));
    anchor.setAttribute('data-analytics-event', ANALYTICS_VALUE);
  });

  document.body.addEventListener('mouseout', function(e) {
    var el = e.target.closest(SELECTOR);
    if (!el) return;
    if (el.contains(e.relatedTarget)) return;
    var anchor = el.closest('a');
    if (!anchor || !anchor.dataset.originalHref) return;
    anchor.href = anchor.dataset.originalHref;
    delete anchor.dataset.originalHref;
    if ('originalAnalytics' in anchor.dataset) {
      var orig = anchor.dataset.originalAnalytics;
      if (orig) anchor.setAttribute('data-analytics-event', orig);
      else anchor.removeAttribute('data-analytics-event');
      delete anchor.dataset.originalAnalytics;
    }
  });

  document.body.addEventListener('click', function(e) {
    var el = e.target.closest(SELECTOR);
    if (!el) return;
    var anchor = el.closest('a');
    if (!anchor) return;
    if (!anchor.dataset.originalHref) {
      anchor.dataset.originalHref = anchor.href;
      anchor.href = buildURL(el.getAttribute('vrm'));
    }
    if (!('originalAnalytics' in anchor.dataset)) {
      anchor.dataset.originalAnalytics = anchor.getAttribute('data-analytics-event') || '';
      anchor.setAttribute('data-analytics-event', ANALYTICS_VALUE);
    }
  });
})();

/* ============================================================
   12. Clean Schema + removed car handler
   ============================================================ */
(function () {
  var status = (VDP.status || '').trim().toLowerCase();

  var blocks = document.querySelectorAll('script[type="application/ld+json"]');
  for (var i = 0; i < blocks.length; i++) {
    var txt = blocks[i].textContent;
    if (!txt || txt.indexOf('"Product"') === -1) continue;

    try {
      var data = JSON.parse(txt);
      var changed = false;

      var scrub = function (obj) {
        if (!obj || typeof obj !== 'object') return;
        var keys = Object.keys(obj);
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          var val = obj[key];
          if (val === '' || val === null) {
            delete obj[key];
            changed = true;
          } else if (Array.isArray(val)) {
            for (var j = val.length - 1; j >= 0; j--) {
              if (val[j] && typeof val[j] === 'object') {
                scrub(val[j]);
                if (val[j].value === undefined && val[j]['@type'] === 'PropertyValue') {
                  val.splice(j, 1);
                  changed = true;
                }
              }
            }
          } else if (typeof val === 'object') {
            scrub(val);
            var remaining = Object.keys(val).filter(function (v) { return v !== '@type'; });
            if (remaining.length === 0) {
              delete obj[key];
              changed = true;
            }
          }
        }
      };

      if (data['@graph']) {
        for (var g = 0; g < data['@graph'].length; g++) {
          scrub(data['@graph'][g]);
        }
      } else {
        scrub(data);
      }

      if (status === 'removed') {
        var touch = function (node) {
          var o = node && node.offers;
          if (!o) return;
          var arr = Array.isArray(o) ? o : [o];
          for (var a = 0; a < arr.length; a++) {
            if (!arr[a] || typeof arr[a] !== 'object') continue;
            arr[a].availability = 'https://schema.org/SoldOut';
            delete arr[a].price;
            delete arr[a].priceCurrency;
            changed = true;
          }
        };
        if (data['@graph']) data['@graph'].forEach(touch);
        else touch(data);
      }

      if (changed) {
        blocks[i].textContent = JSON.stringify(data);
        break;
      }
    } catch (_) {}
  }
})();

/* ============================================================
   13. SVG draw-line animation
   ============================================================ */
(function () {
  $(function () {
    if (typeof gsap === "undefined") return;
    if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

    var userHasScrolled = false;
    window.addEventListener('scroll', function onFirstScroll(){
      userHasScrolled = true;
      window.removeEventListener('scroll', onFirstScroll);
    }, { passive: true });

    var wrappers = Array.from(new Set($('[data-svg="draw-line"]').get()));
    wrappers.forEach(function(wrapper){
      var $w = $(wrapper);
      if ($w.data('svgDrawInit')) return;
      $w.data('svgDrawInit', true);

      var startMode = (wrapper.getAttribute('data-svg-start') || 'auto').toLowerCase();
      var totalDur  = Math.max(0.001, parseFloat(wrapper.getAttribute('data-svg-duration')) || 2);

      var svgs = Array.from(wrapper.querySelectorAll('svg'));
      if (!svgs.length) return;

      svgs.forEach(function(svg){
        var els = Array.from(svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect')).filter(function(el){
          var cs = getComputedStyle(el);
          return cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0;
        });
        if (!els.length) return;

        var totalLen = 0;
        els.forEach(function(el){
          var len = 0;
          try { len = (typeof el.getTotalLength === 'function') ? el.getTotalLength() : 0; } catch(e){ len = 0; }
          if (!isFinite(len) || len <= 0) {
            var b = el.getBBox ? el.getBBox() : null;
            len = (b && isFinite(b.width) && isFinite(b.height)) ? 2*(b.width + b.height) : 1000;
          }
          el.style.strokeDasharray = len + ' ' + len;
          el.style.strokeDashoffset = '' + len;
          el.__svgDrawLen = len;
          totalLen += len;
        });
        if (totalLen <= 0) totalLen = els.length || 1;

        var tl = gsap.timeline({ paused: true });
        els.forEach(function(el){
          var seg = (el.__svgDrawLen / totalLen) * totalDur;
          tl.to(el, { strokeDashoffset: 0, duration: seg, ease: "none" }, ">");
        });

        var driver = gsap.to(tl, { progress: 1, duration: totalDur, ease: "power1.inOut", paused: true });

        var playNow = function() { gsap.delayedCall(0.2, function() { driver.play(); }); };
        var playAfterFirstScroll = function() {
          if (userHasScrolled) playNow();
          else {
            var handler = function() { window.removeEventListener('scroll', handler); userHasScrolled = true; playNow(); };
            window.addEventListener('scroll', handler, { passive: true });
          }
        };

        var vh = window.innerHeight || document.documentElement.clientHeight;
        var r0 = svg.getBoundingClientRect();
        var pastOnLoad = (r0.top <= vh * 0.8 && r0.bottom >= 0);

        if (pastOnLoad) {
          (startMode === 'scroll') ? playAfterFirstScroll() : playNow();
          return;
        }

        if (typeof ScrollTrigger !== "undefined") {
          ScrollTrigger.create({
            trigger: svg,
            start: "top 80%",
            once: true,
            onEnter: function() { playNow(); }
          });
        } else {
          var onScroll = function() {
            var r = svg.getBoundingClientRect();
            var enters = r.top <= vh * 0.8 && r.bottom >= 0;
            if (!enters) return;
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            playNow();
          };
          // BUG: missing opening { for passive option — preserved from original
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', onScroll);
          onScroll();
        }
      });
    });
  });
})();

/* ============================================================
   14. Instant valuation form
   ============================================================ */
(function () {
  $(function () {
    var HOST = location.hostname.replace(/^www\./,'');

    function getAttributionParams(){
      var pick = function(s){ try{ return JSON.parse(s.getItem('attribution_session')||'null') || JSON.parse(s.getItem('attribution')||'null'); }catch(_){ return null; } };
      var ss = pick(sessionStorage) || {};
      var ls = pick(localStorage)  || {};
      var utms = (ss.utms && Object.keys(ss.utms).length ? ss.utms : (ls.utms||{}));
      var refDomain = ss.referrerDomain || ls.referrerDomain || '';
      if(!refDomain && document.referrer){
        try{
          var d = new URL(document.referrer).hostname.replace(/^www\./,'');
          if(!(d===HOST || d.endsWith('.'+HOST))) refDomain = d;
        }catch(_){}
      }
      var params = Object.assign({}, utms);
      if(refDomain) params.referrer = refDomain;
      return params;
    }

    function addParams(url, obj){
      var u = new URL(url, location.origin);
      for(var k in obj){ if(!u.searchParams.has(k)) u.searchParams.set(k, obj[k]); }
      return u.toString();
    }

    function generateOrderURL(vrm, mileage){
      var base = 'https://sellcar.carsa.co.uk/new-order?vrm=' + encodeURIComponent(vrm)
                 + '&mileage=' + encodeURIComponent(mileage || '');
      return addParams(base, getAttributionParams());
    }

    function getFormValues($form){
      var vrm = ($form.find('[name="vrm"]').first().val() || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '');
      var mileage = ($form.find('[name="mileage"]').first().val() || '').trim();
      return { vrm: vrm, mileage: mileage };
    }

    function setHref($trigger){
      var $form = $trigger.closest('form');
      if(!$form.length) return null;
      var vals = getFormValues($form);
      if(!vals.vrm) return null;
      var url = generateOrderURL(vals.vrm, vals.mileage);
      if($trigger.is('a')) $trigger.attr({ href: url, target: '_blank' });
      return url;
    }

    $(document).on('click', '[data-link="valuation"]', function(e){
      var url = setHref($(this));
      if(!url) return;
      if(!$(this).is('a')){
        e.preventDefault();
        window.open(url, '_blank', 'noopener');
      }
    });

    $(document).on('keydown', 'form input', function(e){
      if(e.key !== 'Enter') return;
      var $form = $(this).closest('form');
      var $trigger = $form.find('[data-link="valuation"]').first();
      if(!$trigger.length) return;
      e.preventDefault();
      var url = setHref($trigger);
      if(url && !$trigger.is('a')) window.open(url, '_blank', 'noopener');
      else if(url) $trigger[0].click();
    });

    $(document).on('input', 'form [name="vrm"], form [name="mileage"]', function(){
      var $form = $(this).closest('form');
      $form.find('[data-link="valuation"]').each(function(){ setHref($(this)); });
    });
  });
})();

/* ============================================================
   15. Radio CTA — reserve-collect / reserve-test-drive
   ============================================================ */
(function () {
  $(function () {
    var VRM_VALUE = (VDP.vrm || '').trim().toUpperCase();

    var HOST = location.hostname.replace(/^www\./, '');
    var isInternal = function(d) { return !!d && (d === HOST || d.endsWith('.' + HOST)); };

    function getAttributionParams() {
      var store = {};
      try { store = JSON.parse(localStorage.getItem('attribution') || '{}'); } catch (e) {}
      var utms = store.utms || {};

      if (!Object.keys(utms).length) {
        new URLSearchParams(location.search).forEach(function(v, k) {
          if (/^utm_/i.test(k) && v) utms[k] = v;
        });
      }

      var refDomain = '';
      if (store.referrerDomain && !isInternal(store.referrerDomain)) {
        refDomain = store.referrerDomain;
      } else if (store.referrer) {
        try {
          var d = new URL(store.referrer).hostname.replace(/^www\./, '');
          if (!isInternal(d)) refDomain = d;
        } catch (e) {}
      } else if (document.referrer) {
        try {
          var d = new URL(document.referrer).hostname.replace(/^www\./, '');
          if (!isInternal(d)) refDomain = d;
        } catch (e) {}
      }

      var params = Object.assign({}, utms);
      if (refDomain) params.referrer = refDomain;
      return params;
    }

    function appendParams(url, params) {
      try {
        var u = new URL(url, location.origin);
        Object.keys(params).forEach(function(k) {
          if (!u.searchParams.has(k)) u.searchParams.set(k, params[k]);
        });
        return u.toString();
      } catch (_) {
        var hasQ = url.includes('?');
        var parts = Object.keys(params)
          .filter(function(k) { return !new RegExp('([?&])' + k + '=').test(url); })
          .map(function(k) { return k + '=' + encodeURIComponent(params[k]); });
        return parts.length ? url + (hasQ ? '&' : '?') + parts.join('&') : url;
      }
    }

    function getPostcode() {
      return ($('[data-field="postcode"]').val() || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
    }

    function buildLink(option) {
      var postcode = getPostcode();
      var url;

      if (option === 'reserve-test-drive') {
        url = 'https://quote.carsa.co.uk/book/' + VRM_VALUE;
        if (postcode) url += '?postcode=' + encodeURIComponent(postcode);
      } else {
        url = 'https://quote.carsa.co.uk/build-deal/' + VRM_VALUE + '?skip_intro=';
      }

      return appendParams(url, getAttributionParams());
    }

    function updateCTAs(option) {
      var isTestDrive = option === 'reserve-test-drive';
      var label = isTestDrive ? 'Reserve & test drive' : 'Reserve & collect';
      var href  = buildLink(option);
      var analyticsEvent = isTestDrive ? 'test-drive-cta' : 'build-deal-cta';

      $('[data-button="cta-option"]')
        .text(label)
        .attr('href', href)
        .attr('data-analytics-event', analyticsEvent);
    }

    function animateOpen($el) {
      var naturalHeight = $el.css({ display: 'block', opacity: 0, overflow: 'hidden', height: 0 })
                             .get(0).scrollHeight;
      $el.animate({ height: naturalHeight }, 200, 'linear', function () {
        $el.css({ height: 'auto', overflow: '' })
           .animate({ opacity: 1 }, 200, 'linear');
      });
    }

    function animateClose($el) {
      $el.css('overflow', 'hidden')
         .animate({ opacity: 0 }, 200, 'linear', function () {
           $el.animate({ height: 0 }, 200, 'linear', function () {
             $el.css({ display: 'none', overflow: '' });
           });
         });
    }

    var $postcodeField = $('.form7_field-wrapper.is-postcode');

    function showPostcode(animate) {
      animate ? animateOpen($postcodeField)
              : $postcodeField.css({ display: 'block', opacity: 1, height: 'auto', overflow: '' });
    }

    function hidePostcode() { animateClose($postcodeField); }

    function showContent($label, animate) {
      var $content = $label.find('.details_radio_content');
      animate ? animateOpen($content)
              : $content.css({ display: 'block', opacity: 1, height: 'auto', overflow: '' });
    }

    function hideContent($label) {
      animateClose($label.find('.details_radio_content'));
    }

    function playSquiggle($label) {
      var svg = $label.find('[data-svg="draw-line"] svg')[0];
      if (svg && svg.__svgDrawPlay) svg.__svgDrawPlay();
    }

    $('input[type="radio"][name="Book"]').on('change', function () {
      if (!this.checked) return;
      var option = this.id;
      var $allLabels = $('input[type="radio"][name="Book"]').map(function () {
        return $(this).closest('.details_radio-field').get(0);
      }).get();

      updateCTAs(option);
      playSquiggle($(this).closest('.details_radio-field'));

      $allLabels.forEach(function(label) {
        var $label = $(label);
        var isSelected = $label.find('input[type="radio"]').prop('checked');
        isSelected ? showContent($label, true) : hideContent($label);
        $label.toggleClass('is-list-active', isSelected);
      });

      option === 'reserve-test-drive' ? showPostcode(true) : hidePostcode();
    });

    $(document).on('input', '[data-field="postcode"]', function () {
      var selected = $('input[type="radio"][name="Book"]:checked').val();
      if (selected) updateCTAs(selected);
    });

    $('#reserve-test-drive').prop('checked', true);

    $('input[type="radio"][name="Book"]').each(function () {
      var $label = $(this).closest('.details_radio-field');
      $label.toggleClass('is-list-active', this.checked);
      if (!this.checked) $label.find('.details_radio_content').css({ display: 'none' });
    });

    showPostcode(false);
    updateCTAs('reserve-test-drive');

    var ctaPostcode = document.getElementById('cta-postcode');
    if (ctaPostcode) {
      ctaPostcode.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        var selected = $('input[type="radio"][name="Book"]:checked').val();
        if (selected) {
          updateCTAs(selected);
          var href = $('[data-button="cta-option"]').attr('href');
          if (href) window.location.href = href;
        }
      });
    }
  });
})();

/* ============================================================
   16. Cold banner carousel (UTM-triggered Swiper)
   ============================================================ */
(function () {
  var onReady = function(fn) {
    return window.jQuery ? jQuery(fn) : document.addEventListener("DOMContentLoaded", fn);
  };

  var loadCSS = function(href) {
    if ([].slice.call(document.styleSheets).some(function(s) { return s.href === href; })) return Promise.resolve();
    return new Promise(function(r) {
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      l.onload = r;
      document.head.appendChild(l);
    });
  };

  var loadJS = function(src) {
    if (window.Swiper) return Promise.resolve();
    return new Promise(function(res, rej) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  };

  onReady(function () {
    var banner = document.querySelector(".section_vdp-cold-banner");
    var usp = document.querySelector("#section_usp-carousel, .section_usp-carousel");
    var promoBanner = document.querySelector(".vdp_promo-banner");
    var count = document.querySelectorAll('[data-count="make-model"]').length;

    if (count < 3) {
      if (banner) banner.style.display = "none";
      return;
    }

    var qs = new URLSearchParams(location.search);
    var utm = (qs.get("utm_source") || "").toLowerCase();

    var validSources = [
      "autotrader.co.uk",
      "google_vehicle_ads",
      "chat",
      "google",
      "ebaymotorsgroup",
      "theaa.com",
      "carwow.co.uk",
      "cargurus.co.uk"
    ];

    var isMatch = validSources.some(function(src) { return utm === src; });

    if (banner) banner.style.display = "none";

    if (!isMatch) return;

    if (usp) usp.style.display = "none";

    if (usp && banner && usp.parentNode) usp.parentNode.insertBefore(banner, usp.nextSibling);

    banner.style.display = "flex";

    Promise.all([
      loadCSS("https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css"),
      loadJS("https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js")
    ]).then(function() {
      new Swiper("#cold-banner-carousel", {
        slidesPerView: "auto",
        centeredSlides: true,
        grabCursor: true,
        slideToClickedSlide: true,
        loop: true,
        loopAdditionalSlides: 0,
        speed: 250,
        autoplay: { enabled: false, delay: 1100, pauseOnMouseEnter: true },
        wrapperClass: "vdp-cold-banner_list",
        slideClass: "vdp-cold-banner_item",
        observer: true,
        observeParents: true,
        touchRatio: 1,
        freeMode: { enabled: false, sticky: true },
        lazy: { enabled: true },
        navigation: { nextEl: "#cold-banner-right", prevEl: "#cold-banner-left" },
        breakpoints: { 992: { centeredSlides: false, speed: 350, autoplay: { enabled: true, delay: 1100 } } }
      });
    }).catch(function(err) { /* Swiper load failed */ });
  });
})();

/* ============================================================
   17. Battery animation (EV accordion bar)
   ============================================================ */
(function () {
  if (typeof gsap === 'undefined') return;

  var TRIGGER = '[data-animation="battery"]';
  var BAR_SEL = '.details_battery-health-bar';
  var GRADE_SEL = '.battery-grade';
  var PANEL_SEL = '.details_accordion-details-wrapper';

  document.querySelectorAll(TRIGGER).forEach(function(trigger) {
    var scope = trigger.parentElement;
    var bar = scope.querySelector(BAR_SEL);
    var grade = scope.querySelector(GRADE_SEL);
    var panel = scope.querySelector(PANEL_SEL);

    if (!bar || !grade || !panel) return;

    var targetWidth = (bar.dataset.width || '0') + '%';

    function reset() {
      gsap.killTweensOf(bar);
      gsap.killTweensOf(grade);
      gsap.set(bar, { width: 0 });
      gsap.set(grade, { opacity: 0, scale: 1.5 });
    }

    trigger.addEventListener('click', function() {
      var isOpen = parseFloat(getComputedStyle(panel).height) > 10;

      if (!isOpen) {
        reset();
        gsap.to(bar, { width: targetWidth, duration: 2, ease: 'expo.out' });
        gsap.to(grade, { opacity: 1, scale: 1, duration: 1, delay: 1, ease: 'power4.out' });
      } else {
        reset();
      }
    });
  });
})();
