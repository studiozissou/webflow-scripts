// Carsa shared FAQ JSON-LD moved out of Webflow page bodies: the /faq builder, which now waits for Finsweet to load every list item, and the small #section-faq builder on the finance and sell-car pages.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('faq-schema.js');

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

  block(() => {
    if (!onPage(['/faq']) || !document.querySelector('#faq-schema-list')) return;
    (function () {
      if (window.__FAQ_SCHEMA_INIT__) return;
      window.__FAQ_SCHEMA_INIT__ = true;

      const SCOPE_SEL = '#faq-schema-list';
      const ITEM_SEL  = '[data-faq-question]';
      const STABLE_MS = 1000;
      const TIMEOUT_MS = 15000;
      const POLL_MS = 150;

      let claimed = false;

      const norm = s => (s || '').replace(/\s+/g, ' ').trim();

      function collectFaq(scope) {
        const items = [];
        scope.querySelectorAll(ITEM_SEL).forEach(qEl => {
          const item = qEl.closest('[data-faq-item]');
          const aEl = item ? item.querySelector('[data-faq-answer]') : null;
          const q = norm(qEl.textContent);
          const a = norm(aEl ? aEl.textContent : '');
          if (!q || !a) return;
          items.push({
            "@type": "Question",
            "name": q,
            "acceptedAnswer": { "@type": "Answer", "text": a }
          });
        });
        return items;
      }

      function injectOrReplace(obj) {
        const text = JSON.stringify(obj);
        const existing = document.querySelector('script[data-faq-jsonld]');
        if (existing) {
          existing.text = text;
          return true;
        }
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.dataset.faqJsonld = '1';
        s.text = text;
        document.head.appendChild(s);
        return true;
      }

      function waitForStableCount(scope, onDone) {
        let lastCount = -1;
        let lastChangeTs = performance.now();
        const startTs = performance.now();

        const timer = setInterval(() => {
          const count = scope.querySelectorAll(ITEM_SEL).length;
          if (count !== lastCount) {
            lastCount = count;
            lastChangeTs = performance.now();
          }
          const stableFor = performance.now() - lastChangeTs;
          const elapsed = performance.now() - startTs;
          if ((count > 0 && stableFor >= STABLE_MS) || elapsed >= TIMEOUT_MS) {
            clearInterval(timer);
            if (elapsed >= TIMEOUT_MS && count === 0) return;
            onDone(count);
          }
        }, POLL_MS);
      }

      function settled(instance) {
        const pending = instance.loadingPaginatedItems;
        return Promise.resolve(pending).catch(() => {}).then(() => {
          if (instance.loadingPaginatedItems !== pending) return settled(instance);
        });
      }

      function waitForList(scope, instance) {
        const startTs = performance.now();
        settled(instance).then(() => {
          let builtCount = -1;
          const check = () => {
            const all = instance.items && instance.items.value;
            const target = Array.isArray(all) ? all.length : 0;
            const count = scope.querySelectorAll(ITEM_SEL).length;
            const timedOut = performance.now() - startTs >= TIMEOUT_MS;
            if (count <= builtCount || !(count > 0 && (count >= target || timedOut))) return;
            builtCount = count;
            clearInterval(timer);
            build();
          };
          const timer = setInterval(check, POLL_MS);
          if (typeof instance.addHook === 'function') {
            instance.addHook('afterRender', (rendered) => {
              check();
              return rendered;
            });
          }
          check();
        });
      }

      function findInstance(scope, instances) {
        return (instances || []).find(inst => {
          const list = inst && inst.listElement;
          if (!list) return false;
          return list === scope || scope.contains(list) || (typeof list.contains === 'function' && list.contains(scope));
        });
      }

      function run() {
        const scope = document.querySelector(SCOPE_SEL);
        window.FinsweetAttributes = window.FinsweetAttributes || [];
        window.FinsweetAttributes.push(['list', (instances) => {
          if (claimed || !scope) return;
          const instance = findInstance(scope, instances);
          if (!instance) return;
          claimed = true;
          waitForList(scope, instance);
        }]);
        setTimeout(() => {
          if (document.querySelector('script[data-faq-jsonld]')) return;
          waitForStableCount(scope || document, build);
        }, TIMEOUT_MS);
      }

      function build() {
        const scope = document.querySelector(SCOPE_SEL) || document;
        const items = collectFaq(scope);
        if (!items.length) return;
        const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": items };
        injectOrReplace(jsonLd);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
      } else {
        run();
      }
    })();
  });

  block(() => {
    if (!onPage(['/car-finance', '/sell-car/part-exchange', '/sell-car/value-car']) || !document.querySelector('#section-faq')) return;
    (function () {
      if (window.__FAQ_SCHEMA_MINI__) return;
      window.__FAQ_SCHEMA_MINI__ = true;

      const SCOPE_SEL = '#section-faq';
      const ITEM_Q    = '[data-faq-question]';
      const ITEM_A    = '[data-faq-answer]';

      const norm = s => (s || '').replace(/\s+/g, ' ').trim();

      function collect(scope) {
        const items = [];
        scope.querySelectorAll(ITEM_Q).forEach(qEl => {
          const item = qEl.closest('[data-faq-item]');
          const aEl  = item ? item.querySelector(ITEM_A) : null;
          const q = norm(qEl.textContent);
          const a = norm(aEl ? aEl.textContent : '');
          if (!q || !a) return;
          items.push({
            "@type": "Question",
            "name": q,
            "acceptedAnswer": { "@type": "Answer", "text": a }
          });
        });
        return items;
      }

      function inject(data) {
        if (!data || !data.mainEntity || !data.mainEntity.length) return;
        if (document.querySelector('script[data-faq-jsonld]')) return;
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.dataset.faqJsonld = '1';
        s.text = JSON.stringify(data);
        document.head.appendChild(s);
      }

      function build() {
        const scope = (SCOPE_SEL && document.querySelector(SCOPE_SEL)) || document;
        const items = collect(scope);
        if (!items.length) return;
        inject({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": items });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build, { once: true });
      } else {
        build();
      }
    })();
  });
})(window.jQuery);
