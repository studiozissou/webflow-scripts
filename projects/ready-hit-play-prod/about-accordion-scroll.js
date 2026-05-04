/* =========================================
   RHP — About Accordion Scroll
   Smooth-scrolls to accordion content on title click.
   Uses Lenis if available, falls back to native scrollIntoView.
   ========================================= */
(() => {
  'use strict';

  const VERSION = '2026.5.4.1';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const DEBUG = false;

  RHP.aboutAccordionScroll = (() => {
    let active = false;
    let listeners = [];

    function init(container) {
      if (active) return;
      active = true;

      const root = container || document;
      const titles = root.querySelectorAll('.section_about-hero .accordion-title');
      if (!titles.length) return;

      titles.forEach(title => {
        const handler = () => {
          const content = title.nextElementSibling;
          if (!content || !content.classList.contains('accordion-content')) return;

          const titleHeight = title.offsetHeight;
          DEBUG && console.log('[about-accordion-scroll] titleHeight', titleHeight);

          if (typeof RHP.lenis?.scrollTo === 'function') {
            RHP.lenis.scrollTo(content, { offset: -titleHeight });
          } else {
            content.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        };

        title.addEventListener('click', handler);
        listeners.push({ el: title, fn: handler });
      });
    }

    function destroy() {
      if (!active) return;
      active = false;

      for (const l of listeners) {
        l.el.removeEventListener('click', l.fn);
      }
      listeners = [];
    }

    return { init, destroy, version: VERSION };
  })();
})();
