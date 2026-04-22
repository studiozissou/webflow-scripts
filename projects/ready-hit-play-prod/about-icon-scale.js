/* =========================================
   RHP — About Icon Viewport Fill
   - Scales .icon-embed-r to fill remaining viewport height
   - Measures: viewport - .about_header - accordion titles - section padding (10vw)
   - Sets --icon-max-height CSS custom property
   - Barba-safe: init(container) / destroy()
   ========================================= */
(() => {
  'use strict';

  const VERSION = '2026.4.22.1';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const SEL = {
    section: '.section_about-hero',
    header: '.about_header',
    accordionTitle: '.accordion-title',
    icon: '.icon-embed-r'
  };

  RHP.aboutIconScale = (() => {
    let alive = false;
    let cleanup = [];
    let rafId = 0;
    let sectionEl = null;
    let headerEl = null;
    let titleEls = [];

    function on(el, evt, fn, opts) {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
      cleanup.push(() => el.removeEventListener(evt, fn, opts));
    }

    function measure() {
      if (!alive || !sectionEl) return;

      // Viewport height (safe for iOS)
      const vh = window.visualViewport?.height ?? window.innerHeight;

      // Section vertical padding: 5vw top + 5vw bottom = 10vw
      const vw = window.innerWidth;
      const sectionPadding = vw * 0.05 * 2;

      // .about_header height
      const headerH = headerEl ? headerEl.offsetHeight : 0;

      // Sum of all .accordion-title heights within the section
      let titlesH = 0;
      titleEls.forEach(t => { titlesH += t.offsetHeight; });

      // Remaining height for icon
      const remaining = vh - sectionPadding - headerH - titlesH;
      const iconMaxH = Math.max(0, remaining);

      sectionEl.style.setProperty('--icon-max-height', iconMaxH + 'px');
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
      headerEl = section.querySelector(SEL.header);
      titleEls = Array.from(section.querySelectorAll(SEL.accordionTitle));

      // Defer first measure: double-rAF ensures Barba-inserted container
      // has been laid out before reading offsetHeight values
      requestAnimationFrame(() => requestAnimationFrame(measure));
      on(window, 'resize', measureDebounced, { passive: true });
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
      cleanup.forEach(fn => { try { fn(); } catch (e) {} });
      cleanup = [];
      // Clean up CSS custom property
      if (sectionEl) sectionEl.style.removeProperty('--icon-max-height');
      sectionEl = null;
      headerEl = null;
      titleEls = [];
    }

    return { init, destroy, measure, version: VERSION };
  })();
})();
