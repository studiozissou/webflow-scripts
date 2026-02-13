/* =========================================
   RHP — About Page Text Line Animations
   - Split text by line in sections: stories, circle, services, frame, team
   - Initial: opacity 0; scroll-linked fade in as line bottom moves above viewport bottom
   - Start: rem above viewport bottom; End: 35svh above (configurable per breakpoint)
   ========================================= */
(() => {
  const VERSION = '2026.2.13.1';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const SECTION_SELECTORS = [
    '.section_about-stories',
    '.section_about-circle',
    '.section_about-services',
    '.section_about-frame',
    '.section_about-team'
  ];

  /** Text elements to split by line (heading/paragraph selectors within each section) */
  const TEXT_SELECTORS = [
    'h1', 'h2', 'h3', 'h4', 'p'
  ].join(', ');

  /** Start: rem above viewport bottom. End: svh (small viewport height %) above viewport bottom.
   *  Override getThresholds() for different screen sizes. */
  const END_ABOVE_VIEWPORT_BOTTOM_SVH = 35;

  function getThresholds() {
    const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
    if (mq('(max-width: 479px)')) return { start: 6, endSvh: END_ABOVE_VIEWPORT_BOTTOM_SVH };
    if (mq('(max-width: 767px)')) return { start: 6, endSvh: END_ABOVE_VIEWPORT_BOTTOM_SVH };
    if (mq('(max-width: 991px)')) return { start: 10, endSvh: END_ABOVE_VIEWPORT_BOTTOM_SVH };
    if (mq('(max-width: 1440px)')) return { start: 12, endSvh: END_ABOVE_VIEWPORT_BOTTOM_SVH };
    return { start: 10, endSvh: END_ABOVE_VIEWPORT_BOTTOM_SVH };
  }

  const prefersReduced = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function remToPx(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize) || rem * 16;
  }

  function svhToPx(svh) {
    const vh = window.visualViewport?.height ?? window.innerHeight;
    return vh * (svh / 100);
  }

  RHP.aboutTextLines = (() => {
    let active = false;
    let splitInstances = [];
    let lineElements = [];
    let scrollHandler = null;
    let refreshHandler = null;
    let rafId = null;

    function doUpdate() {
      if (!active || !window.gsap) return;

      const viewportBottom = window.innerHeight;
      const { start: startRem, endSvh } = getThresholds();
      const startPx = viewportBottom - remToPx(startRem);
      const endPx = viewportBottom - svhToPx(endSvh);
      const range = startPx - endPx;
      if (range === 0) return;

      const gsap = window.gsap;
      lineElements.forEach((line) => {
        const lineBottom = line.getBoundingClientRect().bottom;

        let progress = 0;
        if (lineBottom <= endPx) {
          progress = 1;
        } else if (lineBottom < startPx) {
          progress = (startPx - lineBottom) / range;
          progress = Math.max(0, Math.min(1, progress));
        }

        gsap.set(line, { opacity: progress });
      });
    }

    function init(container) {
      const gsap = window.gsap;
      const SplitText = window.SplitText;
      const ScrollTrigger = window.ScrollTrigger;

      if (!gsap || !SplitText || !ScrollTrigger || prefersReduced()) return;
      if (active) return;

      active = true;
      splitInstances = [];
      lineElements = [];

      SECTION_SELECTORS.forEach((sectionSel) => {
        const section = container?.querySelector(sectionSel) || document.querySelector(sectionSel);
        if (!section) return;

        const textEls = section.querySelectorAll(TEXT_SELECTORS);
        textEls.forEach((el) => {
          if (!el.textContent?.trim()) return;
          if (el.closest('.visually-hidden')) return;
          if (el.closest('[data-text-animation="exclude"]')) return;
          try {
            const split = new SplitText(el, {
              type: 'lines',
              linesClass: 'about-text-line',
              absolute: false
            });
            if (!split.lines?.length) return;

            splitInstances.push(split);

            split.lines.forEach((line) => {
              gsap.set(line, { opacity: 0 });
              lineElements.push(line);
            });
          } catch (e) {
            console.warn('RHP about-text-lines SplitText:', e);
          }
        });
      });

      scrollHandler = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          doUpdate();
        });
      };

      refreshHandler = doUpdate;

      window.addEventListener('scroll', scrollHandler, { passive: true });
      RHP.lenis?.onScroll?.(scrollHandler);
      ScrollTrigger.addEventListener('refresh', refreshHandler);

      doUpdate();
      ScrollTrigger.refresh();
    }

    function destroy() {
      if (!active) return;
      active = false;

      window.removeEventListener('scroll', scrollHandler);
      RHP.lenis?.offScroll?.(scrollHandler);
      if (window.ScrollTrigger && refreshHandler) {
        window.ScrollTrigger.removeEventListener('refresh', refreshHandler);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      splitInstances.forEach((split) => {
        try {
          if (split.revert) split.revert();
        } catch (e) {}
      });
      splitInstances = [];
      lineElements = [];
      scrollHandler = null;
      refreshHandler = null;
    }

    return {
      version: VERSION,
      init,
      destroy,
      getThresholds
    };
  })();
})();
