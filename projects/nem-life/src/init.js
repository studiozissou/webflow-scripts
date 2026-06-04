/**
 * NEM Life — Script Loader
 *
 * Single entry point loaded via jsDelivr:
 * <script src="https://cdn.jsdelivr.net/gh/{owner}/{repo}@{hash}/projects/nem-life/src/init.js"></script>
 *
 * Loads vendor deps (GSAP, ScrollTrigger, Swiper) first, then project
 * modules once all deps are ready.
 */
(() => {
  const src = document.currentScript.src;
  const BASE = src.substring(0, src.lastIndexOf('/') + 1);

  const deps = [
    'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js',
    'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js',
    'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
  ];

  const modules = [
    'card-links.js',
    'method-cars-fade.js',
    'swiper-init.js',
    'blog-share.js',
    'blog-navlinks.js',
    'faq-accordion.js',
    'external-link-arrows.js',
    'back-to-top.js',
    'menu-toggle.js',
    'header-shrink.js',
    'topbar-hide.js',
    'radio-uncheck.js',
    'read-more-expand.js',
    'quiz-data.js',
  ];

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadModules() {
    modules.forEach((file) => {
      const s = document.createElement('script');
      s.src = `${BASE}${file}`;
      s.async = false;
      document.head.appendChild(s);
    });
  }

  function loadCSS(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  async function boot() {
    /* Load GSAP core + Swiper JS & CSS in parallel */
    await Promise.all([
      loadScript(deps[0]),  // gsap
      loadScript(deps[2]),  // swiper js
      loadCSS('https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css'),
    ]);
    /* ScrollTrigger needs gsap to exist first */
    await loadScript(deps[1]);
    gsap.registerPlugin(ScrollTrigger);
    loadModules();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
