/* =========================================
   RHP — Case Study Work Nav (Prev / Next)
   Populates `a[data-button="work-previous"]` and `a[data-button="work-next"]`
   hrefs AND label text on /work/<slug> pages from the hidden `.dial_cms-list`
   collection. Wraps cyclically (first ↔ last). Barba intercepts the resulting
   anchor clicks automatically — this module only mutates `href` and label text.
   ========================================= */
(() => {
  const VERSION = '2026.4.9.4';
  const DEBUG = false;
  const LABEL_SELECTOR = '.text-size-tiny.text-style-allcaps';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  RHP.workNav = (() => {
    let active = false;
    let prevBtn = null;
    let nextBtn = null;
    let prevLabelEl = null;
    let nextLabelEl = null;
    let prevLabelOriginal = '';
    let nextLabelOriginal = '';

    function _resolveCurrentSlug() {
      // Use location.pathname — Barba case→case transitions use
      // history.pushState so pathname updates. [data-wf-item-slug] on <html>
      // is a Webflow server-side CMS attribute that only refreshes on full
      // page loads, so it's stale after Barba transitions.
      const parts = location.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }

    function init(container) {
      if (active) return;
      const root = container || document;

      // CMS list may live outside the Barba container — fall back to document
      let items = Array.from(root.querySelectorAll('.dial_cms-list .w-dyn-item'));
      if (!items.length) {
        items = Array.from(document.querySelectorAll('.dial_cms-list .w-dyn-item'));
      }
      if (items.length < 2) return;

      prevBtn = root.querySelector('a[data-button="work-previous"]')
        || document.querySelector('a[data-button="work-previous"]');
      nextBtn = root.querySelector('a[data-button="work-next"]')
        || document.querySelector('a[data-button="work-next"]');
      if (!prevBtn && !nextBtn) return;

      const slugs = items.map(i => i.getAttribute('data-url')).filter(Boolean);
      const titles = items.map(i => i.getAttribute('data-title') || '');
      if (slugs.length < 2) return;

      const current = _resolveCurrentSlug();
      let currentIndex = slugs.indexOf(current);
      if (currentIndex === -1) {
        DEBUG && console.warn('[work-nav] current slug not in CMS list:', current);
        currentIndex = 0;
      }

      const prevIndex = (currentIndex - 1 + slugs.length) % slugs.length;
      const nextIndex = (currentIndex + 1) % slugs.length;

      if (prevBtn) {
        prevBtn.setAttribute('href', `/work/${slugs[prevIndex]}`);
        prevLabelEl = prevBtn.querySelector(LABEL_SELECTOR);
        if (prevLabelEl && titles[prevIndex]) {
          prevLabelOriginal = prevLabelEl.textContent;
          prevLabelEl.textContent = titles[prevIndex];
        }
      }
      if (nextBtn) {
        nextBtn.setAttribute('href', `/work/${slugs[nextIndex]}`);
        nextLabelEl = nextBtn.querySelector(LABEL_SELECTOR);
        if (nextLabelEl && titles[nextIndex]) {
          nextLabelOriginal = nextLabelEl.textContent;
          nextLabelEl.textContent = titles[nextIndex];
        }
      }

      active = true;
    }

    function destroy() {
      if (!active) return;
      if (prevBtn) prevBtn.setAttribute('href', '#');
      if (nextBtn) nextBtn.setAttribute('href', '#');
      if (prevLabelEl && prevLabelOriginal) prevLabelEl.textContent = prevLabelOriginal;
      if (nextLabelEl && nextLabelOriginal) nextLabelEl.textContent = nextLabelOriginal;
      prevBtn = null;
      nextBtn = null;
      prevLabelEl = null;
      nextLabelEl = null;
      prevLabelOriginal = '';
      nextLabelOriginal = '';
      active = false;
    }

    return { version: VERSION, init, destroy };
  })();
})();
