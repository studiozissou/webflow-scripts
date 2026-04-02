// Module: check-finance
// Project: Carsa
// Deps: none (vanilla JS, no build step)

(() => {
  const BASE = 'https://quote.carsa.co.uk/eligibility/questions';
  const SELECTOR = '[data-link="check-finance"]';
  const ANALYTICS_VALUE = 'check-finance-car-card-click';
  const HOST = location.hostname.replace(/^www\./, '');

  function getAttributionParams() {
    const pick = (s) => {
      try {
        return JSON.parse(s.getItem('attribution_session') || 'null') ||
               JSON.parse(s.getItem('attribution') || 'null');
      } catch (_) { return null; }
    };
    const ss = pick(sessionStorage) || {};
    const ls = pick(localStorage) || {};
    const utms = (ss.utms && Object.keys(ss.utms).length ? ss.utms : (ls.utms || {}));
    let refDomain = ss.referrerDomain || ls.referrerDomain || '';
    if (!refDomain && document.referrer) {
      try {
        const d = new URL(document.referrer).hostname.replace(/^www\./, '');
        if (!(d === HOST || d.endsWith('.' + HOST))) refDomain = d;
      } catch (_) { /* invalid referrer URL */ }
    }
    const params = { ...utms };
    if (refDomain) params.referrer = refDomain;
    return params;
  }

  function addParams(url, obj) {
    try {
      const u = new URL(url, location.origin);
      for (const k in obj) { if (!u.searchParams.has(k)) u.searchParams.set(k, obj[k]); }
      return u.toString();
    } catch (_) {
      const hasQ = url.indexOf('?') > -1;
      const parts = [];
      for (const k in obj) {
        if (!new RegExp('([?&])' + k + '=').test(url)) parts.push(k + '=' + encodeURIComponent(obj[k]));
      }
      return parts.length ? url + (hasQ ? '&' : '?') + parts.join('&') : url;
    }
  }

  function buildURL(vrm) {
    let url = BASE;
    if (vrm) url += '?vrm=' + encodeURIComponent(vrm);
    return addParams(url, getAttributionParams());
  }

  // Hover: swap ancestor <a> href so browser status bar shows finance URL
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

  // Click fallback: if href wasn't swapped yet (keyboard/touch), swap it now
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
