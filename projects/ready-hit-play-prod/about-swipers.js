// Module: about-swipers
// Project: ready-hit-play-prod
// Deps: Swiper 11 (lazy-loaded)
// Replaces Webflow native sliders on the about page with Swiper.js crossfade instances.
// NOTE: init() is async — returns a Promise. Orchestrator calls fire-and-forget,
//       which is fine: Swiper inits after the lazy-load resolves, no blocking needed.

(() => {
  'use strict';
  const VERSION = '2026.5.4.1';
  const DEBUG = false;

  let active = false;
  let instances = [];

  function prefersReduced() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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

    // Lazy-load Swiper if not yet available
    if (typeof Swiper === 'undefined') {
      try {
        const base = 'https://cdn.jsdelivr.net/npm/swiper@11';
        if (typeof RHP?.loadStylesheet === 'function') {
          await RHP.loadStylesheet(base + '/swiper-bundle.min.css');
        }
        if (typeof RHP?.loadScript === 'function') {
          await RHP.loadScript(base + '/swiper-bundle.min.js');
        }
      } catch (e) {
        active = false;
        DEBUG && console.log('[about-swipers] Failed to load Swiper:', e.message);
        return;
      }
      if (typeof Swiper === 'undefined') {
        active = false;
        DEBUG && console.log('[about-swipers] Swiper not available after load attempt');
        return;
      }
    }

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
          pauseOnMouseEnter: true
        },
        loop: useLoop,
        slidesPerView: 1,
        grabCursor: true,
        allowTouchMove: true,
      });
      instances.push(swiper);
      DEBUG && console.log('[about-swipers] Swiper initialised on', el.dataset.slider, '— loop:', useLoop, 'slides:', slideCount);
    });

    DEBUG && console.log('[about-swipers] init complete —', instances.length, 'instance(s)');
  }

  /**
   * Destroy all Swiper instances and reset state.
   */
  function destroy() {
    if (!active) return;
    active = false;
    instances.forEach(s => { try { s.destroy(true, true); } catch (e) { /* ignore */ } });
    instances = [];
    DEBUG && console.log('[about-swipers] destroyed');
  }

  window.RHP = window.RHP || {};
  window.RHP.aboutSwipers = { init, destroy, version: VERSION };
})();
