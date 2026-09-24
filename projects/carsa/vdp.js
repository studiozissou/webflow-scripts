// Carsa vehicle detail page behaviour moved out of the Webflow template body: UTM links, finance calculator and config, APR painter, valuation and search-similar links, form UTMs, equal-height cards, schema status, SVG draw-line and similar-car links, reading CMS values from window.__CARSA_VDP.
(function ($) {
  var DEBUG = false;
  var VDP = window.__CARSA_VDP;
  if (!VDP) {
    DEBUG && console.log('vdp.js: window.__CARSA_VDP missing');
    return;
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  (function () {
    $(window).on('load', function(){
      const HOST = location.hostname.replace(/^www\./,'');
      const isInternal = d => !!d && (d===HOST || d.endsWith('.'+HOST));

      let store = {};
      try { store = JSON.parse(localStorage.getItem('attribution') || '{}'); } catch(e){}
      const utms = store.utms || {};

      let refDomain = '';
      if (store.referrerDomain && !isInternal(store.referrerDomain)) {
        refDomain = store.referrerDomain;
      } else if (store.referrer) {
        try {
          const d = new URL(store.referrer).hostname.replace(/^www\./,'');
          if(!isInternal(d)) refDomain = d;
        } catch(e){}
      } else if (document.referrer) {
        try {
          const d = new URL(document.referrer).hostname.replace(/^www\./,'');
          if(!isInternal(d)) refDomain = d;
        } catch(e){}
      }

      if (!Object.keys(utms).length) {
        const qs = new URLSearchParams(location.search);
        qs.forEach((v,k)=>{ if(/^utm_/i.test(k) && v) utms[k]=v; });
      }

      const toAdd = {...utms};
      if (refDomain) toAdd.referrer = refDomain;

      function addParams(url, obj){
        try {
          const u = new URL(url, location.origin);
          for (const k in obj) if (!u.searchParams.has(k)) u.searchParams.set(k, obj[k]);
          return u.toString();
        } catch(_) {
          const hasQ = url.includes('?'); const parts=[];
          for (const k in obj)
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
      const clean = Number(num.replace(/[^0-9.-]+/g, ''));
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

  (function () {
    window.CARSA_FIN = {
      cfg: {
        representativeApr: 10.9,
        aprByTier: { Excellent: 8.9, VeryGood: 10.9, Good: 10.9, Fair: 16.9, BelowAverage: 16.9 },
        defaultTerm: 48,
        defaultAnnualMileage: 8000,
        defaultDepositAmount: 2500
      },
      tier: { 'excellent':'Excellent', 'very-good':'VeryGood', 'good':'Good', 'fair':'Fair' }
    };

    window.CARSA_FIN.APPROVED_FLAT_DEPOSIT = 2500;

    window.CARSA_FIN.depositFor = function (price) {
      var c = window.CARSA_FIN.cfg;
      var keys = ['defaultDepositAmount', 'defaultDeposit', 'defaultCashDeposit', 'representativeDeposit'];
      for (var i = 0; i < keys.length; i++) {
        var v = c[keys[i]];
        if (typeof v === 'number' && isFinite(v) && v >= 0) return v;
      }
      if (!isFinite(price) || price <= 0) return 0;
      return window.CARSA_FIN.APPROVED_FLAT_DEPOSIT;
    };

    window.CARSA_FIN.aprFor = function (rating) {
      var c = window.CARSA_FIN.cfg;
      var v = (c.aprByTier || {})[window.CARSA_FIN.tier[rating]];
      return (typeof v === 'number') ? v : c.representativeApr;
    };

    window.CARSA_FIN.setRadio = function (input) {
      if (!input) return;
      document.querySelectorAll('input[name="' + input.name + '"]').forEach(function (r) {
        r.checked = false;
        r.removeAttribute('checked');
        var l = r.closest('label');
        if (l) l.classList.remove(l.getAttribute('fs-inputactive-class') || 'is-active');
      });
      input.checked = true;
      input.setAttribute('checked', '');
      var lab = input.closest('label');
      if (lab) lab.classList.add(lab.getAttribute('fs-inputactive-class') || 'is-active');
    };

    (function () {
      var TIMEOUT_MS = 3000;
      var MAX_APR = 40;

      var fetched = fetch('https://consumer-finance.carsanet.co.uk/finance-config')
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (c) {
          var apr = c && c.representativeApr;
          if (typeof apr === 'number' && isFinite(apr) && apr >= 0 && apr <= MAX_APR) {
            Object.keys(c).forEach(function (k) {
              if (c[k] !== null && c[k] !== undefined && c[k] !== '') window.CARSA_FIN.cfg[k] = c[k];
            });
          }
          return window.CARSA_FIN.cfg;
        })
        .catch(function (err) {
          console.error('finance-config fetch failed', err);
          if (window.DD_LOGS) window.DD_LOGS.logger.error('finance-config fetch failed', { error: String(err) });
          return window.CARSA_FIN.cfg;
        });

      window.CARSA_FIN.ready = Promise.race([
        fetched,
        new Promise(function (res) { setTimeout(function () { res(window.CARSA_FIN.cfg); }, TIMEOUT_MS); })
      ]);
    })();
  })();

  (function () {
    onReady(function() {

    function preventSafariJump(fn){
      const x = window.scrollX, y = window.scrollY;
      const a = document.activeElement;
      if (a && /^(input|select|textarea|a|button)$/i.test(a.tagName)) a.blur();
      fn();
      requestAnimationFrame(()=>window.scrollTo(x,y));
    }

    function switchTabNoScroll($link){
      const oldHash = location.hash;
      const x = window.scrollX, y = window.scrollY;

      preventSafariJump(() => { $link[0].click(); });

      if (location.hash !== oldHash){
        history.replaceState(null, '', oldHash ? oldHash : (location.pathname + location.search));
      }

      let i = 0;
      (function lock(){
        if (i++ < 4) requestAnimationFrame(() => { window.scrollTo(x,y); lock(); });
      })();
    }

      var FIN = window.CARSA_FIN || {
        cfg: { representativeApr:10.9, aprByTier:{}, defaultTerm:48, defaultAnnualMileage:8000, defaultDepositAmount:2500 },
        aprFor: function(){ return 10.9; },
        depositFor: function(p){ return (isFinite(p) && p > 0) ? 2500 : 0; },
        setRadio: function(i){ if (i) i.checked = true; },
        ready: Promise.resolve()
      };

      var cmsPrice = Number(VDP.price);
      var rawDateStr = VDP.registrationDate;
      var rawDate = new Date(rawDateStr);

      var cmsContribution = Number(
        (VDP.depositContribution || "")
          .replace(/[^0-9.]/g, "")
      ) || 0;

      function formatDateToYYYYMMDD(date) {
        var year = date.getFullYear();
        var month = ("0" + (date.getMonth() + 1)).slice(-2);
        var day = ("0" + date.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
      }
      var formattedRegistrationDate = formatDateToYYYYMMDD(rawDate);

      var depositInput = document.getElementById("finance-deposit");
      var contributionInput = document.getElementById("deposit-contribution");

      function applyPresets() {
        preventSafariJump(function () {
          var cfg = FIN.cfg;

          var totalDeposit = FIN.depositFor(cmsPrice);
          var cashDeposit  = Math.max(0, totalDeposit - cmsContribution);

          if (depositInput && typeof totalDeposit === 'number') {
            depositInput.value = formatCurrency(cashDeposit);
            document.querySelectorAll('[data-number="deposit"]').forEach(el => el.textContent = formatCurrency(totalDeposit));
            document.querySelectorAll('[data-number="customer-deposit"]').forEach(el => el.textContent = formatCurrency(cashDeposit));
          }

          if (contributionInput) {
            contributionInput.value = cmsContribution ? formatCurrency(cmsContribution) : '';
            contributionInput.readOnly = true;
            contributionInput.required = false;
            contributionInput.setAttribute('tabindex', '-1');
          }
          document.querySelectorAll('[data-number="deposit-contribution"]').forEach(el => el.textContent = formatCurrency(cmsContribution));

          if (VDP.financeType === "HP") {
            var defaultTerm = document.getElementById("60");
          } else {
            var defaultTerm = document.getElementById(String(cfg.defaultTerm));
          }
          FIN.setRadio(defaultTerm);

          var mileageSelect = document.getElementById("finance-mileage");
          if (mileageSelect) {
            var want = String(cfg.defaultAnnualMileage), matched = false;
            for (var i = 0; i < mileageSelect.options.length; i++) {
              if (mileageSelect.options[i].value === want) { mileageSelect.value = want; matched = true; break; }
            }
            if (!matched) {
              for (var j = 0; j < mileageSelect.options.length; j++) {
                var val = mileageSelect.options[j].value;
                if (val) { mileageSelect.value = val; break; }
              }
            }
          }

          FIN.setRadio(document.querySelector('input[type="radio"][data-name="apr"][value="very-good"]'));
        });
      }

      applyPresets();

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
        return FIN.aprFor($('input[type="radio"][data-name="apr"]:checked').val());
      }

      function updateStaticOutputs(cashDeposit, term) {
        var totalDeposit = cashDeposit + cmsContribution;
        document.querySelectorAll('[data-number="term"]').forEach(el => el.textContent = term);
        document.querySelectorAll('[data-number="contract-length"]').forEach(el => el.textContent = Number(term) + 1);
        document.querySelectorAll('[data-number="customer-deposit"]').forEach(el => el.textContent = formatCurrency(cashDeposit));
        document.querySelectorAll('[data-number="deposit-contribution"]').forEach(el => el.textContent = formatCurrency(cmsContribution));
        document.querySelectorAll('[data-number="deposit"]').forEach(el => el.textContent = formatCurrency(totalDeposit));
        var credit = cmsPrice - totalDeposit;
        document.querySelectorAll('[data-number="total-credit"]').forEach(el => el.textContent = formatCurrency(credit));
      }

      function callFinanceAPI() {
        var cashDeposit = parseCurrency(depositInput?.value);
        var deposit = cashDeposit + cmsContribution;
        var term = $('input[type="radio"][data-name="finance-term"]:checked').val();
        var mileage = document.getElementById("finance-mileage")?.value;
        var apr = getAprFromSelection();

        updateStaticOutputs(cashDeposit, term);

        var money = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
        var whole = { minimumFractionDigits: 0, maximumFractionDigits: 0 };
        var payments = value => value + " monthly payments of";
        var rate = value => Number(value).toFixed(1) + "%";
        var floorIt = value => Math.floor(parseFloat(value));

        var mapping = {
          "pcp-price":                { path: "pcp.payments.regular",  currency: true, localeOptions: money },
          "pcp-term":                 { path: "pcp.term",              currency: false, format: payments },
          "pcp-optional":             { path: "pcp.residualValue",     currency: true, localeOptions: money },
          "pcp-total-amount-payable": { path: "pcp.totalAmountPayable",currency: true, localeOptions: money },
          "pcp-interest-amount":      { path: "pcp.totalCharges",      currency: true, localeOptions: money },
          "pcp-price-short":          { path: "pcp.payments.regular",  currency: true, transform: floorIt, localeOptions: whole },
          "pcp-fixed-rate":           { path: "pcp.flatRate",          currency: false, format: rate },
          "hp-price":                 { path: "hp.payments.regular",   currency: true, localeOptions: money },
          "hp-price-short":           { path: "hp.payments.regular",   currency: true, transform: floorIt, localeOptions: whole },
          "hp-total-amount-payable":  { path: "hp.totalAmountPayable", currency: true, localeOptions: money },
          "hp-total-charges":         { path: "hp.totalCharges",       currency: true, localeOptions: money },
          "hp-interest-amount":       { path: "hp.totalCharges",       currency: true, localeOptions: money },
          "hp-fixed-rate":            { path: "hp.flatRate",           currency: false, format: rate },
          "hp-term":                  { path: "hp.term",               currency: false, format: payments },
          "pcp-excess-mileage":       { path: "pcp.excessMileage",     currency: false }
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
            mileage: Number(VDP.odometer),
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
        .then(res => res.json())
        .then(data => {
          var pcpError = data?.pcp?.error;
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
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
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

            document.querySelectorAll('[data-number="' + id + '"]').forEach(el => el.textContent = val);
          });
        });
      }

      FIN.ready.then(function () {
        applyPresets();
        callFinanceAPI();
      });

      document.getElementById("finance-mileage")?.addEventListener("input", callFinanceAPI);
      $('input[type="radio"][data-name="finance-term"]').on("change", callFinanceAPI);
      $('input[type="radio"][data-name="apr"]').on("change", callFinanceAPI);

      let depositTimeout;
      depositInput.addEventListener("input", function() {
        clearTimeout(depositTimeout);
        var numeric = parseCurrency(depositInput.value);
        document.querySelectorAll('[data-number="customer-deposit"]').forEach(el => el.textContent = formatCurrency(numeric));
        document.querySelectorAll('[data-number="deposit"]').forEach(el => el.textContent = formatCurrency(numeric + cmsContribution));
        depositTimeout = setTimeout(callFinanceAPI, 1000);
      });

      depositInput.addEventListener("blur", function() {
        depositInput.value = formatCurrency(parseCurrency(depositInput.value));
      });

      depositInput.addEventListener("focus", function() {
        depositInput.value = parseCurrency(depositInput.value) || '';
      });

      document.getElementById("finance-button")?.addEventListener("click", callFinanceAPI);

      document.querySelectorAll('#finance-deposit, #finance-mileage, input[type="radio"][data-name="finance-term"], input[type="radio"][data-name="apr"]').forEach(function(el) {
        el.addEventListener("keydown", function(e) {
          if (e.key === "Enter") e.preventDefault();
        });
      });
    });
  })();

  (function () {
    $(function () {
      var FIN = window.CARSA_FIN;

      function paintApr() {
        if (!FIN) return;
        var apr = FIN.aprFor($('input[type="radio"][data-name="apr"]:checked').val());

        $('[data-number="apr"]').each(function () {
          var hasPercent = $(this).text().indexOf('%') !== -1;
          $(this).text(apr + (hasPercent ? '%' : ''));
        });

        $('.is-apr').each(function () {
          if (this.children.length) return;
          var t = $(this).text();
          if (!/representative\s+apr/i.test(t)) return;
          if (!/\d+(?:\.\d+)?%/.test(t)) return;
          $(this).text(t.replace(/\d+(?:\.\d+)?%/, apr + '%'));
        });
      }

      $(document).on('change', '[data-name="apr"]', paintApr);

      paintApr();
      if (FIN) FIN.ready.then(paintApr);
      $(window).on('load', paintApr);
    });
  })();

  (function () {
    $(document).ready(function () {
      const vrm = VDP.vrm.trim().toLowerCase();
      const location = VDP.locationName.trim();
      const isStorage = VDP.isStorageLocation.trim().toLowerCase() === 'true';

      let newHref = `/get-started?vrm=${encodeURIComponent(vrm)}&location=${encodeURIComponent(location)}`;
      if (isStorage) newHref += '&storage=true';

      $('[data-button="booking-options"]').attr('href', newHref);
    });
  })();

  (function () {
    $(function(){
      const HOST = location.hostname.replace(/^www\./,'');

      function getAttributionParams(){
        let params = {};
        try {
          const store = JSON.parse(localStorage.getItem('attribution') || '{}');
          if (store.utms) Object.assign(params, store.utms);
          if (store.referrerDomain) params.referrer = store.referrerDomain;
        } catch(e){}

        if (!Object.keys(params).some(k=>k.startsWith('utm_'))) {
          const qs = new URLSearchParams(location.search);
          qs.forEach((v,k)=>{ if(/^utm_/i.test(k) && v) params[k]=v; });
        }

        if (!params.referrer && document.referrer){
          try{
            const d = new URL(document.referrer).hostname.replace(/^www\./,'');
            const isInternal = d===HOST || d.endsWith('.'+HOST);
            if (!isInternal) params.referrer = d;
          }catch(e){}
        }
        return params;
      }

      function generatePxURL(pxVrm){
        const base = 'https://quote.carsa.co.uk/get-px-valuation/' + VDP.vrm + '/?px_vrm=' + encodeURIComponent(pxVrm);
        const add = getAttributionParams();
        try {
          const u = new URL(base);
          Object.keys(add).forEach(k => { if(!u.searchParams.has(k)) u.searchParams.set(k, add[k]); });
          return u.toString();
        } catch(e){
          const hasQ = base.includes('?');
          const extra = Object.keys(add).map(k=>k+'='+encodeURIComponent(add[k])).join('&');
          return extra ? base + (hasQ?'&':'?') + extra : base;
        }
      }

      function updateButtonHref($form, $button){
        const pxVrm = $form.find('[name="px-vrm"]').val();
        if(!pxVrm) return;
        const url = generatePxURL(pxVrm);
        $button.attr('href', url).attr('target','_blank');
      }

      $('#px-form-large input, #px-form-small input').on('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          const $form = $(this).closest('form');
          const $btn  = $form.find('a');
          updateButtonHref($form, $btn);
          $btn[0].click();
        }
      });

      $('#px-form-large, #px-form-small').on('submit', function(e){
        e.preventDefault();
        const $btn = $(this).find('a');
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

  (function () {
    onReady(function() {
      const make  = VDP.makeName.trim();
      const model = VDP.modelName.trim();

      const params = [];
      if (make)  params.push("cars_make_equal="  + make.replace(/\s+/g, '+'));
      if (model) params.push("cars_model_equal=" + model.replace(/\s+/g, '+'));

      const query = params.length ? "?" + params.join("&") : "";

      document.querySelectorAll('[data-link="search-similar"]').forEach(btn => {
        btn.setAttribute("href", "/used-cars" + query);
      });
    });
  })();

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

    new MutationObserver(setEqualHeight).observe(document.body, { childList: true, subtree: true });
  })();

  (function () {
    $(function () {
      const HOST = location.hostname.replace(/^www\./,'');
      const STD = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];

      const getStored = () => { try { return JSON.parse(localStorage.getItem('attribution') || '{}'); } catch { return {}; } };
      const getURLUtms = () => { const o={}, qs=new URLSearchParams(location.search); qs.forEach((v,k)=>/^utm_/i.test(k)&&v&&(o[k]=v)); return o; };
      const getUTMs = () => {
        const s = getStored().utms || {};
        return Object.keys(s).length ? s : getURLUtms();
      };
      const getRefDomain = () => {
        const s = getStored();
        if (s.referrerDomain) return s.referrerDomain;
        if (!document.referrer) return '';
        try {
          const d = new URL(document.referrer).hostname.replace(/^www\./,'');
          return (d===HOST || d.endsWith('.'+HOST)) ? '' : d;
        } catch { return ''; }
      };
      const getCleanPageURL = () => {
        const keep=[]; const qs=new URLSearchParams(location.search);
        qs.forEach((v,k)=>{ if(!/^utm_/i.test(k)) keep.push(k+'='+encodeURIComponent(v)); });
        return location.origin + location.pathname + (keep.length ? '?'+keep.join('&') : '');
      };

      const utms = getUTMs();
      const refDomain = getRefDomain();
      const conversionPage = getCleanPageURL();

      $('form[data-form="add-utms"]').each(function(){
        const $f = $(this);
        $f.find('input[name="conversion_page"], input[name="referrer"], input[name^="utm_"]').remove();

        $f.append($('<input>', { type:'hidden', name:'conversion_page', value: conversionPage }));

        STD.forEach(k => {
          $f.append($('<input>', { type:'hidden', name:k, value: utms[k] || '' }));
        });

        Object.keys(utms).forEach(k => {
          if (/^utm_/i.test(k) && !STD.includes(k)) {
            $f.append($('<input>', { type:'hidden', name:k, value: utms[k] }));
          }
        });

        $f.append($('<input>', { type:'hidden', name:'referrer', value: refDomain || '' }));
      });
    });
  })();

  (function () {
    $(document).ready(function() {
      const makeModelCount = $('[data-count="make-model"]').length;

      $('[data-number="make-model"]').text(makeModelCount);

      if (makeModelCount === 0) {
        $('[data-similar="model"]').hide();
        $('[data-similar="make"]').show();
      }
    });
  })();

  (function () {
    (function () {
      var status = VDP.status.trim().toLowerCase();

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
  })();

  (function () {
    $(function () {
      if (typeof gsap === "undefined") return;
      if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

      let userHasScrolled = false;
      window.addEventListener('scroll', function onFirstScroll(){
        userHasScrolled = true;
        window.removeEventListener('scroll', onFirstScroll);
      }, { passive: true });

      const wrappers = Array.from(new Set($('[data-svg="draw-line"]').get()));
      wrappers.forEach(function(wrapper){
        const $w = $(wrapper);
        if ($w.data('svgDrawInit')) return;
        $w.data('svgDrawInit', true);

        const startMode = (wrapper.getAttribute('data-svg-start') || 'auto').toLowerCase();
        const totalDur  = Math.max(0.001, parseFloat(wrapper.getAttribute('data-svg-duration')) || 2);

        const svgs = Array.from(wrapper.querySelectorAll('svg'));
        if (!svgs.length) return;

        svgs.forEach(function(svg){
          const els = Array.from(svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect')).filter(function(el){
            const cs = getComputedStyle(el);
            return cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0;
          });
          if (!els.length) return;

          let totalLen = 0;
          els.forEach(function(el){
            let len = 0;
            try { len = (typeof el.getTotalLength === 'function') ? el.getTotalLength() : 0; } catch(e){ len = 0; }
            if (!isFinite(len) || len <= 0) {
              const b = el.getBBox?.();
              len = (b && isFinite(b.width) && isFinite(b.height)) ? 2*(b.width + b.height) : 1000;
            }
            el.style.strokeDasharray = `${len} ${len}`;
            el.style.strokeDashoffset = `${len}`;
            el.__svgDrawLen = len;
            totalLen += len;
          });
          if (totalLen <= 0) totalLen = els.length || 1;

          const tl = gsap.timeline({ paused: true });
          els.forEach(function(el){
            const seg = (el.__svgDrawLen / totalLen) * totalDur;
            tl.to(el, { strokeDashoffset: 0, duration: seg, ease: "none" }, ">");
          });

          const driver = gsap.to(tl, { progress: 1, duration: totalDur, ease: "power1.inOut", paused: true });

          const playNow = () => gsap.delayedCall(0.2, () => driver.play());
          const playAfterFirstScroll = () => {
            if (userHasScrolled) playNow();
            else {
              const handler = () => { window.removeEventListener('scroll', handler); userHasScrolled = true; playNow(); };
              window.addEventListener('scroll', handler, { passive: true });
            }
          };

          const vh = window.innerHeight || document.documentElement.clientHeight;
          const r0 = svg.getBoundingClientRect();
          const pastOnLoad = (r0.top <= vh * 0.8 && r0.bottom >= 0);

          if (pastOnLoad) {
            (startMode === 'scroll') ? playAfterFirstScroll() : playNow();
            return;
          }

          if (typeof ScrollTrigger !== "undefined") {
            ScrollTrigger.create({ trigger: svg, start: "top 80%", once: true, onEnter: () => playNow() });
          } else {
            const onScroll = () => {
              const r = svg.getBoundingClientRect();
              const enters = r.top <= vh * 0.8 && r.bottom >= 0;
              if (!enters) return;
              window.removeEventListener('scroll', onScroll);
              window.removeEventListener('resize', onScroll);
              playNow();
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll);
            onScroll();
          }
        });
      });
    });
  })();

  (function () {
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
  })();

  (function () {
    $(function () {

      const VRM = VDP.vrm.trim().toUpperCase();

      const HOST = location.hostname.replace(/^www\./, '');
      const isInternal = d => !!d && (d === HOST || d.endsWith('.' + HOST));

      function getAttributionParams() {
        let store = {};
        try { store = JSON.parse(localStorage.getItem('attribution') || '{}'); } catch (e) {}
        const utms = store.utms || {};

        if (!Object.keys(utms).length) {
          new URLSearchParams(location.search).forEach((v, k) => {
            if (/^utm_/i.test(k) && v) utms[k] = v;
          });
        }

        let refDomain = '';
        if (store.referrerDomain && !isInternal(store.referrerDomain)) {
          refDomain = store.referrerDomain;
        } else if (store.referrer) {
          try {
            const d = new URL(store.referrer).hostname.replace(/^www\./, '');
            if (!isInternal(d)) refDomain = d;
          } catch (e) {}
        } else if (document.referrer) {
          try {
            const d = new URL(document.referrer).hostname.replace(/^www\./, '');
            if (!isInternal(d)) refDomain = d;
          } catch (e) {}
        }

        const params = { ...utms };
        if (refDomain) params.referrer = refDomain;
        return params;
      }

      function appendParams(url, params) {
        try {
          const u = new URL(url, location.origin);
          Object.keys(params).forEach(k => {
            if (!u.searchParams.has(k)) u.searchParams.set(k, params[k]);
          });
          return u.toString();
        } catch (_) {
          const hasQ = url.includes('?');
          const parts = Object.keys(params)
            .filter(k => !new RegExp('([?&])' + k + '=').test(url))
            .map(k => k + '=' + encodeURIComponent(params[k]));
          return parts.length ? url + (hasQ ? '&' : '?') + parts.join('&') : url;
        }
      }

      function getPostcode() {
        return ($('[data-field="postcode"]').val() || '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase();
      }

      function buildLink(option) {
        const postcode = getPostcode();
        let url;

        if (option === 'reserve-test-drive') {
          url = 'https://quote.carsa.co.uk/book/' + VRM;
          if (postcode) url += '?postcode=' + encodeURIComponent(postcode);
        } else {
          url = 'https://quote.carsa.co.uk/build-deal/' + VRM + '?skip_intro=';
        }

        return appendParams(url, getAttributionParams());
      }

      function updateCTAs(option) {
        const isTestDrive = option === 'reserve-test-drive';
        const label = isTestDrive ? 'Reserve & test drive' : 'Reserve & collect';
        const href  = buildLink(option);
        const analyticsEvent = isTestDrive ? 'test-drive-cta' : 'build-deal-cta';

        $('[data-button="cta-option"]')
          .text(label)
          .attr('href', href)
          .attr('data-analytics-event', analyticsEvent);
      }

      function animateOpen($el) {
        const naturalHeight = $el.css({ display: 'block', opacity: 0, overflow: 'hidden', height: 0 })
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

      const $postcodeField = $('.form7_field-wrapper.is-postcode');

      function showPostcode(animate) {
        animate ? animateOpen($postcodeField)
                : $postcodeField.css({ display: 'block', opacity: 1, height: 'auto', overflow: '' });
      }

      function hidePostcode() { animateClose($postcodeField); }

      function showContent($label, animate) {
        const $content = $label.find('.details_radio_content');
        animate ? animateOpen($content)
                : $content.css({ display: 'block', opacity: 1, height: 'auto', overflow: '' });
      }

      function hideContent($label) {
        animateClose($label.find('.details_radio_content'));
      }

      function playSquiggle($label) {
        const svg = $label.find('[data-svg="draw-line"] svg')[0];
        if (svg && svg.__svgDrawPlay) svg.__svgDrawPlay();
      }

      $('input[type="radio"][name="Book"]').on('change', function () {
        if (!this.checked) return;
        const option = this.id;
        const $allLabels = $('input[type="radio"][name="Book"]').map(function () {
          return $(this).closest('.details_radio-field').get(0);
        }).get();

        updateCTAs(option);
        playSquiggle($(this).closest('.details_radio-field'));

        $allLabels.forEach(label => {
          const $label = $(label);
          const isSelected = $label.find('input[type="radio"]').prop('checked');
          isSelected ? showContent($label, true) : hideContent($label);
          $label.toggleClass('is-list-active', isSelected);
        });

        option === 'reserve-test-drive' ? showPostcode(true) : hidePostcode();
      });

      $(document).on('input', '[data-field="postcode"]', function () {
        const selected = $('input[type="radio"][name="Book"]:checked').val();
        if (selected) updateCTAs(selected);
      });

      $('#reserve-test-drive').prop('checked', true);

      $('input[type="radio"][name="Book"]').each(function () {
        const $label = $(this).closest('.details_radio-field');
        $label.toggleClass('is-list-active', this.checked);
        if (!this.checked) $label.find('.details_radio_content').css({ display: 'none' });
      });

      showPostcode(false);
      updateCTAs('reserve-test-drive');

      document.getElementById('cta-postcode').addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        const selected = $('input[type="radio"][name="Book"]:checked').val();
        if (selected) {
          updateCTAs(selected);
          const href = $('[data-button="cta-option"]').attr('href');
          if (href) window.location.href = href;
        }
      });

    });
  })();
})(window.jQuery);
