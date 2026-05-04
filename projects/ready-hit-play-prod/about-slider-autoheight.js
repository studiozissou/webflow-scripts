// Legacy filename — CDN init.js still references about-slider-autoheight.js.
// Contains the about-swipers module. After CDN init.js is updated to load
// about-swipers.js directly, delete this file.
//
// Module: about-swipers (loaded via about-slider-autoheight.js for CDN compat)
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

    // Measure accordion titles and image max-width to cap slide height
    const section = container.querySelector('.section_about-hero');
    if (section) {
      const titles = section.querySelectorAll('.accordion-title');
      let titlesH = 0;
      titles.forEach(t => { titlesH += t.offsetHeight; });
      section.style.setProperty('--accordion-titles-height', titlesH + 'px');

      // Cap slide height: min(viewport - titles, image-max-width + caption)
      const viewportCap = window.innerHeight - titlesH;
      const firstSlide = section.querySelector('[data-slider] .swiper-slide');
      const imgWrap = firstSlide?.querySelector('.about_image-wrapper');
      const caption = firstSlide?.querySelector('.spacer-medium');
      if (imgWrap) {
        const imgMaxW = parseFloat(getComputedStyle(imgWrap).maxWidth) || Infinity;
        const captionH = caption?.offsetHeight || 0;
        const contentCap = imgMaxW + captionH;
        const slideH = Math.min(viewportCap, contentCap);
        section.style.setProperty('--slide-max-height', slideH + 'px');
      }
    }

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
  const mod = { init, destroy, version: VERSION };
  window.RHP.aboutSwipers = mod;
  window.RHP.aboutSliderAutoheight = mod; // alias for CDN init.js health check
})();
