// Carsa /car-finance-calculator page behaviour moved out of the Webflow page body: the HP finance calculator driven by the live finance config, and the mobile view-results scroll.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('finance-calculator.js');

  var DEBUG = false;

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

  onReady(function() {
    const depositInput = document.getElementById("finance-deposit");
    const carPriceInput = document.getElementById("finance-car-price");
    const totalPriceEl = document.getElementById("total-price");

    const CFG = {
      representativeApr: 10.9,
      aprByTier: { Excellent: 8.9, VeryGood: 10.9, Good: 10.9, Fair: 16.9, BelowAverage: 16.9 },
      defaultTerm: 48,
      defaultAnnualMileage: 8000,
      defaultDepositAmount: 2500
    };
    const TIER = { 'excellent':'Excellent', 'very-good':'VeryGood', 'good':'Good', 'fair':'Fair' };

    const cfgReady = Promise.race([
      fetch('https://consumer-finance.carsanet.co.uk/finance-config')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(c => {
          const a = c && c.representativeApr;
          if (typeof a === 'number' && isFinite(a) && a >= 0 && a <= 40) {
            Object.keys(c).forEach(k => { if (c[k] !== null && c[k] !== undefined && c[k] !== '') CFG[k] = c[k]; });
          }
          return CFG;
        })
        .catch(err => {
          console.error('finance-config fetch failed', err);
          if (window.DD_LOGS) window.DD_LOGS.logger.error('finance-config fetch failed', { error: String(err) });
          return CFG;
        }),
      new Promise(res => setTimeout(() => res(CFG), 3000))
    ]);

    const fmtGBP = (v, opts={minimumFractionDigits:0, maximumFractionDigits:0}) =>
      "£" + Number(v).toLocaleString("en-GB", opts);
    const parseGBP = v => Number((v||"").toString().replace(/[^0-9.]/g,"")) || 0;
    const aprFor = rating => {
      const v = (CFG.aprByTier || {})[TIER[rating]];
      return (typeof v === 'number') ? v : CFG.representativeApr;
    };
    const depositDefault = () => {
      const keys = ['defaultDepositAmount','defaultDeposit','defaultCashDeposit','representativeDeposit'];
      for (const k of keys) if (typeof CFG[k] === 'number' && isFinite(CFG[k]) && CFG[k] >= 0) return CFG[k];
      return 2500;
    };

    let cmsPrice = parseGBP(carPriceInput.value || "10000");

    function setRadio(input) {
      if (!input) return;
      document.querySelectorAll('input[name="' + input.name + '"]').forEach(r => {
        r.checked = false;
        r.removeAttribute('checked');
        r.classList.remove('w--redirected-checked');
        const l = r.closest('label');
        if (l) l.classList.remove(l.getAttribute('fs-inputactive-class') || 'is-active');
      });
      input.checked = true;
      input.setAttribute('checked', '');
      input.classList.add('w--redirected-checked');
      const lab = input.closest('label');
      if (lab) lab.classList.add(lab.getAttribute('fs-inputactive-class') || 'is-active');
    }

    function getSelectedAPRAndUpdateUI() {
      const sel = document.querySelector('input[type="radio"][data-name="apr"]:checked');
      const rating = sel?.value;
      const apr = aprFor(rating);
      document.querySelectorAll('[data-number="apr"]').forEach(el => el.textContent = apr);
      DEBUG && console.log("[APR Selected]", rating, "=>", apr);
      return apr;
    }

    function updateStaticOutputs(deposit, term) {
      const hpTermEl = document.getElementById("hp-term");
      if (hpTermEl) {
        hpTermEl.textContent = term + " monthly payments of";
        DEBUG && console.log("[Term Updated]", term);
      }
      const credit = cmsPrice - deposit;
      document.querySelectorAll('[data-number="total-credit"]').forEach(el => {
        el.textContent = fmtGBP(credit);
      });
      document.querySelectorAll('[data-number="deposit"]').forEach(el => {
        el.textContent = fmtGBP(deposit);
      });
      DEBUG && console.log("[Static Outputs] Deposit:", deposit, "Price:", cmsPrice, "Credit:", credit);
    }

    function callFinanceAPI() {
      const deposit = parseGBP(depositInput?.value);
      const term = document.querySelector('input[type="radio"][data-name="finance-term"]:checked')?.value;
      const apr  = getSelectedAPRAndUpdateUI();

      updateStaticOutputs(deposit, term);

      const mapping = {
        "hp-price": { path: "hp.payments.regular", currency: true, localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 } },
        "hp-price-short": { path: "hp.payments.regular", currency: true, transform: v => Math.floor(parseFloat(v)), localeOptions: { minimumFractionDigits: 0, maximumFractionDigits: 0 } },
        "hp-total-amount-payable": { path: "hp.totalAmountPayable", currency: true, localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 } },
        "hp-total-charges": { path: "hp.totalCharges", currency: true, localeOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 } },
        "hp-fixed-rate": { path: "hp.flatRate", currency: false, format: v => Number(v).toFixed(1) + "%" }
      };

      const payload = {
        criteria: { annualMileage: Number(CFG.defaultAnnualMileage), cashDeposit: Number(deposit), outstandingFinance: 0, pxEquity: 0, term: Number(term), apr },
        vehicle:  { mileage: 7617, price: cmsPrice, registrationDate: "2025-01-22", type: "Car", vrm: "MD74ZHJ" },
        requestedBy: "manual",
        requestUuid: (window.crypto?.randomUUID && crypto.randomUUID()) || String(Date.now())
      };

      DEBUG && console.log("[Finance API Payload]", payload);

      fetch("https://consumer-finance.carsanet.co.uk/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          DEBUG && console.log("[Finance API Response]", data);
          const get = (o,p) => p.split('.').reduce((a,k)=>a?.[k], o);

          Object.keys(mapping).forEach(id => {
            const cfg = mapping[id];
            let val = get(data, cfg.path);
            if (val == null) return;
            if (cfg.transform) val = cfg.transform(val);
            if (cfg.format)    val = cfg.format(val);
            else if (cfg.currency) val = "£" + Number(val).toLocaleString("en-GB", cfg.localeOptions);

            const el = document.getElementById(id);
            if (el) el.textContent = val;
            document.querySelectorAll('[data-number="'+id+'"]').forEach(n => n.textContent = val);
            DEBUG && console.log("[Updated Element]", id, "=>", val);
          });
        })
        .catch(err => console.error("[Finance API Error]", err));
    }

    function applyDefaults() {
      depositInput.value = fmtGBP(depositDefault());

      cmsPrice = parseGBP(carPriceInput.value || "10000");
      carPriceInput.value = fmtGBP(cmsPrice);
      if (totalPriceEl) totalPriceEl.textContent = fmtGBP(cmsPrice);

      setRadio(document.getElementById(String(CFG.defaultTerm)));

      setRadio(document.querySelector('input[type="radio"][data-name="apr"][value="very-good"]'));

      getSelectedAPRAndUpdateUI();
    }

    applyDefaults();

    carPriceInput.addEventListener("input", () => {
      cmsPrice = parseGBP(carPriceInput.value);
      DEBUG && console.log("[Car Price Updated]", cmsPrice);
      if (totalPriceEl) totalPriceEl.textContent = fmtGBP(cmsPrice);
      callFinanceAPI();
    });
    carPriceInput.addEventListener("blur", () => {
      cmsPrice = parseGBP(carPriceInput.value);
      carPriceInput.value = fmtGBP(cmsPrice);
      if (totalPriceEl) totalPriceEl.textContent = fmtGBP(cmsPrice);
      callFinanceAPI();
    });
    carPriceInput.addEventListener("focus", () => {
      carPriceInput.value = parseGBP(carPriceInput.value) || '';
    });

    let depTimer;
    depositInput.addEventListener("input", () => {
      clearTimeout(depTimer);
      const n = parseGBP(depositInput.value);
      document.querySelectorAll('[data-number="deposit"]').forEach(el => el.textContent = fmtGBP(n));
      DEBUG && console.log("[Deposit Updated]", n);
      depTimer = setTimeout(callFinanceAPI, 800);
    });
    depositInput.addEventListener("blur", () => {
      depositInput.value = fmtGBP(parseGBP(depositInput.value));
    });
    depositInput.addEventListener("focus", () => {
      depositInput.value = parseGBP(depositInput.value) || '';
    });

    function wireScopedRadios(groupName) {
      document.querySelectorAll('input[type="radio"][data-name="'+groupName+'"]').forEach(input => {
        input.addEventListener("change", function() {
          setRadio(this);

          if (groupName === "apr") {
            const apr = getSelectedAPRAndUpdateUI();
            DEBUG && console.log("[APR Changed]", this.value, "=>", apr);
          }
          if (groupName === "finance-term") {
            DEBUG && console.log("[Term Changed]", this.value);
          }
          callFinanceAPI();
        });
      });
    }
    wireScopedRadios("finance-term");
    wireScopedRadios("apr");

    document.querySelectorAll('#finance-deposit, #finance-car-price, input[type="radio"][data-name="finance-term"], input[type="radio"][data-name="apr"]')
      .forEach(el => el.addEventListener("keydown", e => { if (e.key === "Enter") e.preventDefault(); }));

    cfgReady.then(() => {
      applyDefaults();
      callFinanceAPI();
    });
  });

  onReady(function() {
    DEBUG && console.log("DOM Loaded")
    const btn = document.querySelector('[data-analytics-event="finance-calculator-cta-view-results-mobile"]');
    const results = document.getElementById("finance-calculator-results");
    DEBUG && console.log(btn)
      DEBUG && console.log(results)
    if (btn && results) {
      btn.addEventListener("click", function(e) {
      DEBUG && console.log("Button clicked")
        e.preventDefault();
        results.scrollIntoView({ behavior: "smooth" });
      });
    }
  });
})(window.jQuery);
