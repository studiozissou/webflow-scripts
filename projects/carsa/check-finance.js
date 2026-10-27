// Carsa check-finance: on hover or click of a finance card, points its car-card link at the eligibility quote URL with the VRM and stored attribution, and restores it on mouseout.
(() => {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('check-finance.js: window.__CARSA missing');
    return;
  }
  const BASE = 'https://quote.carsa.co.uk/eligibility/questions';
  const SELECTOR = '[data-link="check-finance"]';
  const ANALYTICS_VALUE = 'check-finance-car-card-click';

  function buildURL(vrm) {
    let url = BASE;
    if (vrm) url += '?vrm=' + encodeURIComponent(vrm);
    return H.addParams(url, H.getAttributionParams());
  }

  document.body.addEventListener('mouseover', (e) => {
    const el = e.target.closest(SELECTOR);
    if (!el) return;
    const anchor = el.closest('a');
    if (!anchor) return;
    if (!anchor.dataset.originalHref) anchor.dataset.originalHref = anchor.href;
    if (!('originalAnalytics' in anchor.dataset)) anchor.dataset.originalAnalytics = anchor.getAttribute('data-analytics-event') || '';
    anchor.href = buildURL(el.getAttribute('vrm'));
    anchor.setAttribute('data-analytics-event', ANALYTICS_VALUE);
  });

  document.body.addEventListener('mouseout', (e) => {
    const el = e.target.closest(SELECTOR);
    if (!el) return;
    if (el.contains(e.relatedTarget)) return;
    const anchor = el.closest('a');
    if (!anchor || !anchor.dataset.originalHref) return;
    anchor.href = anchor.dataset.originalHref;
    delete anchor.dataset.originalHref;
    if ('originalAnalytics' in anchor.dataset) {
      const orig = anchor.dataset.originalAnalytics;
      if (orig) anchor.setAttribute('data-analytics-event', orig);
      else anchor.removeAttribute('data-analytics-event');
      delete anchor.dataset.originalAnalytics;
    }
  });

  document.body.addEventListener('click', (e) => {
    const el = e.target.closest(SELECTOR);
    if (!el) return;
    const anchor = el.closest('a');
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
