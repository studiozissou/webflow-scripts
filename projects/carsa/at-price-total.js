// Sums the AutoTrader saving and Carsa cash price inside .autotrader_price-info on the VDP and prints the AutoTrader market value as a comma-formatted £ figure.
(function () {
  function parsePrice(text) {
    var clean = String(text || '').replace(/[^0-9.-]+/g, '');
    if (!/[0-9]/.test(clean)) return NaN;
    var n = Number(clean);
    return isFinite(n) ? n : NaN;
  }

  function formatGBP(n) {
    return '£' + Math.round(n).toLocaleString('en-GB');
  }

  function run() {
    var root = document.querySelector('.autotrader_price-info') || document;
    var saving = root.querySelector('[data-price="at-saving"]');
    var price = root.querySelector('[data-price="carsa-price"]');
    var targets = root.querySelectorAll('[data-price="at-value"], [data-price="at-price"]');
    if (!saving || !price || !targets.length) return;
    var total = parsePrice(saving.textContent) + parsePrice(price.textContent);
    if (isNaN(total)) return;
    for (var i = 0; i < targets.length; i++) targets[i].textContent = formatGBP(total);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  window.CarsaAtPriceTotal = { parsePrice: parsePrice, formatGBP: formatGBP, run: run };
})();
