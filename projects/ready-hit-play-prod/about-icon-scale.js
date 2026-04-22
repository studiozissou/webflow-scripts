/* =========================================
   RHP — About Icon Viewport Fill
   - Scales .icon-embed-r to fill remaining viewport height
   - Formula: 100svh - top-offset - header - (title × 4)
   - Sets --top-offset, --header-height, --titles-height; CSS does the calc
   - Barba-safe: init(container) / destroy()
   ========================================= */
(() => {
  'use strict';

  const VERSION = '2026.4.22.6';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const SEL = {
    section: '.section_about-hero',
    iconLink: '.about_r-link',
    header: '.about_header',
    accordionTitle: '.accordion-title'
  };

  RHP.aboutIconScale = (() => {
    let alive = false;
    let cleanup = [];
    let rafId = 0;
    let sectionEl = null;
    let iconLinkEl = null;
    let headerEl = null;
    let titleEls = [];

    function on(el, evt, fn, opts) {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
      cleanup.push(() => el.removeEventListener(evt, fn, opts));
    }

    function measure() {
      if (!alive || !sectionEl) return;

      // offsetTop of the icon link = padding + line-height strut above it
      const topOffset = iconLinkEl ? iconLinkEl.offsetTop : 0;
      const headerH = headerEl ? headerEl.offsetHeight : 0;

      let titlesH = 0;
      titleEls.forEach(t => { titlesH += t.offsetHeight; });

      sectionEl.style.setProperty('--top-offset', topOffset + 'px');
      sectionEl.style.setProperty('--header-height', headerH + 'px');
      sectionEl.style.setProperty('--titles-height', titlesH + 'px');
    }

    function measureDebounced() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    }

    // No animation — prefers-reduced-motion not applicable (sizing only)
    function init(container = document) {
      if (alive) return;

      const section = container.querySelector(SEL.section);
      if (!section) return;

      alive = true;
      sectionEl = section;
      iconLinkEl = section.querySelector(SEL.iconLink);
      headerEl = section.querySelector(SEL.header);
      titleEls = Array.from(section.querySelectorAll(SEL.accordionTitle));

      // Defer first measure: double-rAF ensures Barba-inserted container
      // has been laid out before reading offsetHeight values
      requestAnimationFrame(() => requestAnimationFrame(measure));
      on(window, 'resize', measureDebounced, { passive: true });

      // Re-measure after fonts load (heights shift with web fonts)
      document.fonts.ready.then(measureDebounced);
      on(window, 'load', measureDebounced);
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
      cleanup.forEach(fn => { try { fn(); } catch (e) {} });
      cleanup = [];
      if (sectionEl) {
        sectionEl.style.removeProperty('--top-offset');
        sectionEl.style.removeProperty('--header-height');
        sectionEl.style.removeProperty('--titles-height');
      }
      sectionEl = null;
      iconLinkEl = null;
      headerEl = null;
      titleEls = [];
    }

    return { init, destroy, measure, version: VERSION };
  })();
})();
