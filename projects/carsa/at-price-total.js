// Sums the AutoTrader saving and Carsa cash price inside .autotrader_price-info on the VDP and prints both the saving and the AutoTrader market value as comma-formatted £ figures.
(function () {
  function parsePrice(text) {
    var clean = String(text || '').replace(/[^0-9.-]+/g, '');
    if (!/[0-9]/.test(clean)) return NaN;
    var n = Number(clean);
    return isFinite(n) ? n : NaN;
  }

  function formatNumber(n) {
    return Math.round(n).toLocaleString('en-GB');
  }

  function formatGBP(n) {
    return '£' + formatNumber(n);
  }

  function run() {
    var root = document.querySelector('.autotrader_price-info') || document;
    var saving = root.querySelector('[data-price="at-saving"]');
    var price = root.querySelector('[data-price="carsa-price"]');
    var targets = root.querySelectorAll('[data-price="at-value"], [data-price="at-price"]');
    if (!saving || !price || !targets.length) return;
    var savingValue = parsePrice(saving.textContent);
    var total = savingValue + parsePrice(price.textContent);
    if (isNaN(total)) return;
    var before = saving.previousSibling;
    if (before && before.nodeType === 3 && /£\s*$/.test(before.textContent)) {
      before.textContent = before.textContent.replace(/£\s*$/, '');
    }
    saving.textContent = formatGBP(savingValue);
    for (var i = 0; i < targets.length; i++) targets[i].textContent = formatGBP(total);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  window.CarsaAtPriceTotal = { parsePrice: parsePrice, formatNumber: formatNumber, formatGBP: formatGBP, run: run };
})();
