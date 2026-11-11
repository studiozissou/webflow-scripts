// Team Zissou site-wide behaviour: secures new-tab links, fills [data-sz="year"], and keeps session-only visit attribution in sessionStorage for hidden form fields.
(() => {
  'use strict';

  window.SZ = window.SZ || {};
  if (window.SZ.globalReady) return;
  window.SZ.globalReady = true;

  const STORE_KEY = 'sz_attribution';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const INTERNAL_DOMAINS = ['teamzissou.io', 'studiozissou.com', 'studiozissou.io', 'webflow.io'];
  const FALLBACK = 'direct';

  const stripWww = (host) => host.replace(/^www\./, '');
  const pageUrl = (url) => url.origin + url.pathname;

  const secureExternalLinks = () => {
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const tokens = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      tokens.add('noopener');
      tokens.add('noreferrer');
      link.setAttribute('rel', [...tokens].join(' '));
    });
  };

  const setYear = () => {
    const year = String(new Date().getFullYear());
    document.querySelectorAll('[data-sz="year"]').forEach((el) => {
      el.textContent = year;
    });
  };

  const isInternal = (host, ownHost) =>
    [ownHost, ...INTERNAL_DOMAINS].some((d) => host === d || host.endsWith('.' + d));

  const readReferrer = (ownHost) => {
    try {
      const ref = document.referrer;
      if (!ref) return { referrer: '', referrerDomain: '' };
      const host = stripWww(new URL(ref).hostname);
      if (isInternal(host, ownHost)) return { referrer: '', referrerDomain: '' };
      return { referrer: ref, referrerDomain: host };
    } catch {
      return { referrer: '', referrerDomain: '' };
    }
  };

  const readUtms = (url) => {
    const utms = {};
    for (const key of UTM_KEYS) {
      const value = url.searchParams.get(key);
      if (value) utms[key] = value;
    }
    return utms;
  };

  const getStore = () => {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  };

  const readStored = (store) => {
    try {
      const rec = JSON.parse(store?.getItem(STORE_KEY) ?? 'null');
      return rec && typeof rec === 'object' && rec.utms && typeof rec.utms === 'object' ? rec : null;
    } catch {
      return null;
    }
  };

  const recordVisit = (current) => {
    const store = getStore();
    const stored = readStored(store);
    if (stored) return stored;
    try {
      store?.setItem(STORE_KEY, JSON.stringify(current));
    } catch {
      return null;
    }
    return null;
  };

  const setField = (form, name, value) => {
    let input = form.querySelector(`input[name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  };

  const attribution = () => {
    const url = new URL(window.location.href);
    const current = {
      utms: readUtms(url),
      ...readReferrer(stripWww(url.hostname)),
      landing: pageUrl(url),
      ts: new Date().toISOString(),
    };
    const stored = recordVisit(current);

    const fields = {};
    for (const key of UTM_KEYS) {
      fields[key] = stored?.utms[key] || current.utms[key] || FALLBACK;
    }
    fields.referrer_domain = stored?.referrerDomain || current.referrerDomain || FALLBACK;
    fields.landing_page = stored?.landing || current.landing;
    fields.conversion_page = pageUrl(url);
    fields.locale = document.documentElement.lang || '';
    fields.visit_start_ts = stored?.ts || current.ts;

    document.querySelectorAll('form').forEach((form) => {
      for (const [name, value] of Object.entries(fields)) setField(form, name, value);
    });
  };

  const run = () => {
    secureExternalLinks();
    setYear();
    attribution();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
