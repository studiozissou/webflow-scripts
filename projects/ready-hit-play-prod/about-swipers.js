// Module: about-swipers
// Project: ready-hit-play-prod
// Deps: Swiper 11 (lazy-loaded)
// Replaces Webflow native sliders on the about page with Swiper.js crossfade instances.
// Also owns desktop sizing of those sliders: each slider is capped to its own tallest
// slide, so one section can no longer inflate the height of every other slider.
// NOTE: init() is async — returns a Promise. Orchestrator calls fire-and-forget,
//       which is fine: Swiper inits after the lazy-load resolves, no blocking needed.

(() => {
  'use strict';
  const VERSION = '2026.8.17.1';
  const DEBUG = false;

  const DESKTOP_MQ = '(min-width: 992px)';

  let active = false;
  let instances = [];
  let cleanup = [];
  let rafId = 0;
  let sectionEl = null;
  let lastSizes = '';
  let columnObserver = null;
  let lastWidths = new WeakMap();

  function on(el, evt, fn, opts) {
    if (!el) return;
    el.addEventListener(evt, fn, opts);
    cleanup.push(() => el.removeEventListener(evt, fn, opts));
  }

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  function isDesktop() {
    return window.matchMedia?.(DESKTOP_MQ).matches;
  }

  /**
   * Measure one slider: the tallest image its slides want, and the tallest
   * caption. Returned separately (not summed per slide) so the caption
   * allowance can be reserved on EVERY slide — otherwise a slide without a
   * caption renders its image a caption's-height taller than its neighbours,
   * and the images visibly jump size as the carousel crossfades.
   *
   * Image height is rendered width x intrinsic aspect ratio, deliberately not
   * max-width: the accordion column constrains the wrapper far below its
   * max-width (479px rendered vs 655px max), so max-width overestimates by
   * ~175px and leaves dead space above and below every image.
   */
  function measureSlides(slider) {
    let imageH = 0;
    let captionH = 0;
    slider.querySelectorAll('.swiper-slide').forEach((slide) => {
      const imgWrap = slide.querySelector('.about_image-wrapper');
      if (imgWrap) {
        const img = imgWrap.querySelector('img');
        const width = imgWrap.getBoundingClientRect().width;
        // naturalWidth is 0 until the image decodes; the window 'load' and
        // fonts.ready re-measures below correct any early guess.
        const ratio = img?.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
        imageH = Math.max(imageH, width * ratio);
      }
      const cap = slide.querySelector('.spacer-medium');
      if (cap) captionH = Math.max(captionH, cap.offsetHeight);
    });
    return { imageH, captionH };
  }

  /** Drop every JS-set sizing property — tablet/mobile fall back to CSS auto height. */
  function clearMeasurements() {
    if (!sectionEl) return;
    sectionEl.style.removeProperty('--slide-max-height');
    sectionEl.style.removeProperty('--accordion-titles-height');
    sectionEl.style.removeProperty('--accordion-title-height');
    sectionEl.querySelectorAll('[data-slider]').forEach((slider) => {
      slider.style.removeProperty('--slide-max-height');
      slider.style.removeProperty('--slide-caption-height');
    });
    lastSizes = '';
  }

  /**
   * Size each slider independently, capped to the space left under the titles.
   * --slide-max-height is set on each [data-slider] rather than on the section,
   * so sliders no longer share a single height.
   */
  function measure() {
    if (!active || !sectionEl) return;

    if (!isDesktop()) {
      clearMeasurements();
      return;
    }

    const titles = sectionEl.querySelectorAll('.accordion-title');
    if (!titles.length) return;

    let titlesH = 0;
    titles.forEach(t => { titlesH += t.offsetHeight; });
    sectionEl.style.setProperty('--accordion-titles-height', titlesH + 'px');

    // Height of a single title. The sticky carousel offsets itself by
    // (title height x 2) to clear the two titles stacked above it.
    // getBoundingClientRect (not offsetHeight) — offsetHeight rounds 65.479 to
    // 65, which would sit the carousel ~1px above the title stack.
    // See ready-hit-play.css § About — sticky carousel.
    const titleH = titles[0].getBoundingClientRect().height;
    sectionEl.style.setProperty('--accordion-title-height', titleH + 'px');

    const viewportCap = window.innerHeight - titlesH;
    const applied = [];

    sectionEl.querySelectorAll('[data-slider]').forEach((slider) => {
      const { imageH, captionH } = measureSlides(slider);
      if (!imageH) return;

      // Reserve the caption PLUS a title-height gap inside the slide box.
      // The gap has to live in the slide, not as padding on the column: the
      // column is the sticky element, so while it is pinned the accordion's
      // bottom rule scrolls up underneath and meets the caption regardless of
      // any column padding. Reserved here it travels with the caption at every
      // scroll position. Slides render image-then-caption from the top
      // (justify-content: flex-start), so the spare band lands below the caption.
      const reserved = captionH + titleH;
      const slideH = Math.min(viewportCap, imageH + reserved);
      slider.style.setProperty('--slide-max-height', slideH + 'px');
      // Also keeps captioned and uncaptioned images the same size and position.
      // Consumed by ready-hit-play.css § About slider image sizing.
      slider.style.setProperty('--slide-caption-height', reserved + 'px');
      applied.push(Math.round(slideH));
    });

    // Only disturb Swiper / scroll systems when a height actually moved —
    // measure() runs on every resize frame and ScrollTrigger.refresh() is costly.
    const sig = applied.join(',');
    if (sig === lastSizes) return;
    lastSizes = sig;

    DEBUG && console.log('[about-swipers] sized', sig);

    instances.forEach(s => { try { s.update(); } catch (e) { /* ignore */ } });
    // Slider heights change document length — keep scroll systems in sync.
    window.RHP?.lenis?.resize?.();
    window.ScrollTrigger?.refresh();
  }

  function measureDebounced() {
    cancelAnimationFrame(rafId);
    // Double rAF. Crossing the 992px breakpoint reflows the accordion columns,
    // and measuring on the first frame reads the pre-reflow width — which sizes
    // a desktop slider from the mobile column width.
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(measure);
    });
  }

  /**
   * Watch the column that wraps each slider. Slide height is derived from column
   * WIDTH, and the window 'resize' event fires before the columns have reflowed —
   * measuring off it alone sizes a desktop slider from the old mobile width.
   *
   * Only width changes re-trigger a measure. measure() writes slider *height*,
   * which would otherwise feed straight back in as another observation.
   */
  function observeColumns() {
    if (typeof ResizeObserver === 'undefined' || !sectionEl) return;

    columnObserver = new ResizeObserver((entries) => {
      let widthChanged = false;
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (lastWidths.get(entry.target) !== w) {
          lastWidths.set(entry.target, w);
          widthChanged = true;
        }
      }
      if (widthChanged) measureDebounced();
    });

    sectionEl.querySelectorAll('[data-slider]').forEach((slider) => {
      const col = slider.closest('.accordion-column');
      if (col) columnObserver.observe(col);
    });
  }

  /**
   * Initialise Swiper instances on all [data-slider] elements inside
   * .section_about-hero. Lazy-loads Swiper CSS + JS if not already on the page.
   */
  async function init(container) {
    if (active) return;
    if (!container) return;

    const sliders = container.querySelectorAll('.section_about-hero [data-slider]');
    if (!sliders.length) return;

    // Set sentinel immediately — prevents double-init during async load
    active = true;
    sectionEl = container.querySelector('.section_about-hero');
    lastSizes = '';

    // Defer first measure: double-rAF ensures a Barba-inserted container has
    // been laid out before reading offsetHeight / getBoundingClientRect.
    requestAnimationFrame(() => requestAnimationFrame(measure));
    observeColumns();

    // Re-measure on the events that shift image or title heights.
    // 'resize' still matters on its own: the viewport cap tracks window height,
    // which can change without any column width changing.
    on(window, 'resize', measureDebounced, { passive: true });
    on(window, 'load', measureDebounced);
    // Web fonts change title heights; images decode after first paint.
    document.fonts?.ready?.then(() => { if (active) measureDebounced(); });

    // Lazy-load Swiper if not yet available
    if (typeof Swiper === 'undefined') {
      const base = 'https://cdn.jsdelivr.net/npm/swiper@11';
      try {
        // Inline loaders — RHP.loadScript may not exist yet (init.js sets it after modules)
        await new Promise((res, rej) => {
          if (document.querySelector('link[href*="swiper-bundle"]')) { res(); return; }
          const l = document.createElement('link');
          l.rel = 'stylesheet'; l.href = base + '/swiper-bundle.min.css';
          l.onload = res; l.onerror = rej;
          document.head.appendChild(l);
        });
        await new Promise((res, rej) => {
          if (document.querySelector('script[src*="swiper-bundle"]')) { res(); return; }
          const s = document.createElement('script');
          s.src = base + '/swiper-bundle.min.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      } catch (e) {
        DEBUG && console.log('[about-swipers] Failed to load Swiper:', e.message);
        destroy();
        return;
      }
      if (typeof Swiper === 'undefined') {
        DEBUG && console.log('[about-swipers] Swiper not available after load attempt');
        destroy();
        return;
      }
    }

    // A Barba leave may have fired while Swiper was loading.
    if (!active) return;

    sliders.forEach(el => {
      const reduced = prefersReduced();
      const slideCount = el.querySelectorAll('.swiper-slide').length;
      const useLoop = slideCount > 2;
      const swiper = new Swiper(el, {
        effect: 'fade',
        fadeEffect: { crossFade: true },
        speed: reduced ? 0 : 750,
        autoplay: reduced ? false : {
          delay: 4000,
          disableOnInteraction: false,
          pauseOnMouseEnter: false
        },
        loop: useLoop,
        slidesPerView: 1,
        grabCursor: true,
        allowTouchMove: true,
      });
      instances.push(swiper);
      DEBUG && console.log('[about-swipers] Swiper initialised on', el.dataset.slider, '— loop:', useLoop, 'slides:', slideCount);
    });

    // Swiper switches slides to position:absolute — re-measure once settled.
    measureDebounced();

    DEBUG && console.log('[about-swipers] init complete —', instances.length, 'instance(s)');
  }

  /**
   * Destroy all Swiper instances and reset state.
   */
  function destroy() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    columnObserver?.disconnect();
    columnObserver = null;
    lastWidths = new WeakMap();
    cleanup.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
    cleanup = [];
    instances.forEach(s => { try { s.destroy(true, true); } catch (e) { /* ignore */ } });
    instances = [];
    // Clear JS-set custom properties so Barba re-entry re-evaluates fresh
    clearMeasurements();
    sectionEl = null;
    DEBUG && console.log('[about-swipers] destroyed');
  }

  window.RHP = window.RHP || {};
  window.RHP.aboutSwipers = { init, destroy, version: VERSION };
})();
