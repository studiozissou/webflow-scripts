/**
 * NEM Life — Script Loader
 *
 * Single entry point loaded via jsDelivr:
 * <script src="https://cdn.jsdelivr.net/gh/{owner}/{repo}@{hash}/src/init.js"></script>
 *
 * All module paths are relative to this file so the loader works
 * regardless of which repo or org hosts the code.
 */
(() => {
  const src = document.currentScript.src;
  const BASE = src.substring(0, src.lastIndexOf('/') + 1);

  const scripts = [
    'method-cars-fade.js',
    'swiper-init.js',
    'blog-share.js',
    'back-to-top.js',
  ];

  function load() {
    scripts.forEach((file) => {
      const s = document.createElement('script');
      s.src = `${BASE}${file}`;
      s.async = false;          // preserve execution order
      document.head.appendChild(s);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
