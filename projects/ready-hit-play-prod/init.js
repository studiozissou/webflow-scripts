/* =========================================
   RHP — Initialization Loader
   Ensures proper loading order and dependency management
   ========================================= */
(function() {
  'use strict';

  // Bail out on pages that don't use the RHP app (privacy, 404, etc.)
  // Unlock scroll first — Webflow body has overflow:hidden for the main SPA pages.
  if (/\/(privacy-policy|404)(\/|$|\?)/.test(window.location.pathname)) {
    document.body.style.overflow = 'auto';
    return;
  }

  // Force full reload when restored from bfcache (back-nav from privacy/404).
  // The cached DOM has stale Barba/GSAP/Lenis state that can't recover.
  // { once: true } prevents any possibility of a reload loop.
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) window.location.reload();
  }, { once: true });

  // Dismiss loader — called by MutationObserver (home intro) and by init() fallback.
  // Declared at outer IIFE scope so both can access it.
  var _loaderDismissed = false;
  function _dismissLoader() {
    if (_loaderDismissed) return;
    _loaderDismissed = true;
    document.documentElement.classList.add('rhp-scripts-loaded');
    var el = document.querySelector('.loader');
    if (el) el.remove();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  // FOUC prevention: inject critical hide rules synchronously before first paint.
  // ready-hit-play.css loads later (after deps); these inline styles cover the gap.
  // Hide on home until home-scroll-morph completes and sets .rhp-home-ready:
  //   • nav items (logo, about, contact) — fade in via CSS cascade
  //   • dial step text — home-scroll-morph tweens opacity 0 → 1 in last 10% of scrub
  (function() {
    var s = document.createElement('style');
    s.textContent =
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready) .nav_logo-link,' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready) .nav_about-link,' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready) .nav_contact-link' +
      '{opacity:0!important;visibility:hidden!important;pointer-events:none!important}' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready) .dial_component[data-dial-ns="home"] .heading-style-h7.is-step,' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready) .dial_component[data-dial-ns="home"] [data-text="step"]' +
      '{opacity:0!important;visibility:hidden!important;pointer-events:none!important}' +
      '.section_about-hero:not([style*="--icon-scale-ready"]) .icon-embed-r{max-height:50svh}' +
      '.loader{position:fixed!important;top:0;left:0;width:100%;height:100%;pointer-events:none!important;z-index:9999}' +
      '.loader4_component{pointer-events:none!important;opacity:0;animation:rhp-loader-fadein .3s ease .5s forwards}' +
      '@keyframes rhp-loader-fadein{to{opacity:1}}' +
      '.loader4_progress-bar{width:0;animation:rhp-loader-fill 12s cubic-bezier(.1,.4,.2,1) forwards}' +
      '.rhp-scripts-loaded .loader,.rhp-scripts-loaded .loader4_component{display:none!important}' +
      '@media(prefers-reduced-motion:reduce){.rhp-scripts-loaded .loader,.rhp-scripts-loaded .loader4_component{transition:none}.loader4_progress-bar{animation:none}}' +
      '@keyframes rhp-loader-fill{0%{width:0}70%{width:55%}90%{width:75%}100%{width:85%}}';
    document.head.appendChild(s);

    // MutationObserver: dismiss loader the instant the intro logo becomes visible (home).
    // Watches for .rhp-intro-started on the Barba wrapper — set by orchestrator
    // → home-intro.run() — which is the exact moment the logo fades in.
    (function() {
      var wrapper = document.querySelector('[data-barba="wrapper"]');
      if (!wrapper) return;
      var obs = new MutationObserver(function() {
        if (wrapper.classList.contains('rhp-intro-started')) {
          obs.disconnect();
          _dismissLoader();
        }
      });
      obs.observe(wrapper, { attributes: true, attributeFilter: ['class'] });
    })();

    // Preconnect to CDN origins used by deps/modules
    ['https://cdn.jsdelivr.net', 'https://cdn.prod.website-files.com', 'https://unpkg.com'].forEach(function(origin) {
      var link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = '';
      document.head.appendChild(link);
    });
  })();

  // Capture init script URL immediately (currentScript is only set during initial execution; async init() may run after it's cleared)
  var INIT_SCRIPT_SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src)
    ? document.currentScript.src
    : '';

  // Source-switch: ?rhp=local persists to localStorage; ?rhp=cdn clears it
  // Optional: ?rhp-port=8081 persists the local server port (default 8080)
  (function() {
    try {
      var params = new URLSearchParams(window.location.search);
      var p = params.get('rhp');
      if (p === 'local') localStorage.setItem('rhp-source', 'local');
      else if (p === 'cdn') { localStorage.removeItem('rhp-source'); localStorage.removeItem('rhp-port'); localStorage.removeItem('rhp-dev'); window.__RHP_BASE = undefined; }
      var port = params.get('rhp-port');
      if (port && /^\d{4,5}$/.test(port)) localStorage.setItem('rhp-port', port);
    } catch(e) { /* storage or location access blocked — ignore */ }
  })();

  // Configuration - Use pinned commit in your Webflow script URL (e.g. ...@cbbef90/.../init.js). Init will load modules from the same commit.
  const CONFIG = {
    version: '2026.5.4.2', // bump when you deploy – new ?v= busts cache so modules reload
    baseUrlTemplate: 'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@COMMIT/projects/ready-hit-play-prod',

    // CSS dependencies (loaded first)
    cssDependencies: [
      'https://unpkg.com/lenis@1.3.17/dist/lenis.css'
    ],

    // GSAP core — loaded first in Wave 1 (plugins need window.gsap at parse time)
    gsapCoreUrl: 'https://cdn.prod.website-files.com/gsap/3.14.2/gsap.min.js',

    // Wave 2: GSAP plugins + vendor deps (all loaded in parallel after gsap core)
    wave2Dependencies: [
      'https://cdn.prod.website-files.com/gsap/3.14.2/ScrollTrigger.min.js',
      'https://cdn.prod.website-files.com/gsap/3.14.2/ScrambleTextPlugin.min.js',
      'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/Flip.min.js',
      'https://cdn.prod.website-files.com/gsap/3.14.2/SplitText.min.js',
      'https://unpkg.com/@barba/core@2.10.3/dist/barba.umd.js',
      'https://unpkg.com/lenis@1.3.17/dist/lenis.min.js',
      'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js'
    ],

    // Modules loaded in parallel (no parse-time cross-dependencies)
    parallelModules: [
      'lenis-manager.js',
      'cursor.js',
      'work-dial.js',
      'transition-dial.js',
      'about-dial-ticks.js',
      'about-text-lines.js',
      'about-swipers.js',
      'about-scroll-accordions.js',
      'about-icon-scale.js',
      'about-accordion-scroll.js',
      'home-intro.js',
      'home-scroll-morph.js',
      'home-about-slide.js',
      'intro-format.js',
      'earth-parallax.js',
      'case-video-controls.js',
      'video-loader.js',
      'work-nav.js',
      'utils.js'
    ],

    // Modules that must load after all parallel modules (orchestrator reads RHP.* registrations at parse time)
    sequentialModules: [
      'orchestrator.js'
    ]
  };

  // ngrok free tier: use fetch + skip header to bypass interstitial on mobile
  var _isNgrok = window.__RHP_BASE && /\.ngrok-free\.dev/i.test(window.__RHP_BASE);
  var _ngrokHeaders = { 'ngrok-skip-browser-warning': '1' };

  // Load a stylesheet and return a promise
  function loadStylesheet(href) {
    return new Promise(function(resolve, reject) {
      var existing = document.querySelector('link[href="' + href + '"]');
      if (existing) { resolve(); return; }
      if (_isNgrok && /\.ngrok-free\.dev/i.test(href)) {
        fetch(href, { headers: _ngrokHeaders })
          .then(function(r) { if (!r.ok) throw new Error(r.status); return r.text(); })
          .then(function(css) {
            var s = document.createElement('style');
            s.textContent = css;
            document.head.appendChild(s);
            resolve();
          })
          .catch(function(e) { reject(new Error('Failed to load: ' + href + ' (' + e.message + ')')); });
        return;
      }
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = function() { resolve(); };
      link.onerror = function() { reject(new Error('Failed to load: ' + href)); };
      document.head.appendChild(link);
    });
  }

  // Load a script and return a promise
  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) { resolve(); return; }
      if (_isNgrok && /\.ngrok-free\.dev/i.test(src)) {
        fetch(src, { headers: _ngrokHeaders })
          .then(function(r) { if (!r.ok) throw new Error(r.status); return r.text(); })
          .then(function(js) {
            var s = document.createElement('script');
            s.textContent = js;
            document.head.appendChild(s);
            resolve();
          })
          .catch(function(e) { reject(new Error('Failed to load: ' + src + ' (' + e.message + ')')); });
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      // async=true is the browser default for dynamic scripts; explicit for clarity.
      // Execution order is controlled by wave-based await, not by the async attribute.
      script.async = true;
      // crossorigin="anonymous" uses CORS mode, which bypasses Chrome's ORB
      // (Opaque Resource Blocking). jsDelivr sends access-control-allow-origin: *
      // so CORS succeeds and the browser can validate content-type properly.
      script.crossOrigin = 'anonymous';
      script.onload = function() { resolve(); };
      script.onerror = function() { reject(new Error('Failed to load: ' + src)); };
      document.head.appendChild(script);
    });
  }

  function getBaseUrl() {
    // __RHP_BASE set by inline snippet in Webflow head (supports ?dev= for mobile)
    if (window.__RHP_BASE) return window.__RHP_BASE;
    try {
      var localOverride = localStorage.getItem('rhp-source');
      if (localOverride === 'local') {
        var storedPort = localStorage.getItem('rhp-port') || '8080';
        return 'https://localhost:' + storedPort + '/projects/ready-hit-play-prod';
      }
    } catch(e) { /* localStorage blocked — fall through to normal detection */ }
    var scriptSrc = INIT_SCRIPT_SRC;
    // Local dev: script from localhost or same-origin without CDN @commit
    var isLocal = scriptSrc && (
      /^(https?:)?\/\/localhost(:\d+)?(\/|$)/i.test(scriptSrc) ||
      /^file:\/\//i.test(scriptSrc) ||
      /\.ngrok-free\.dev(\/|$)/i.test(scriptSrc) ||
      (!scriptSrc.includes('@') && scriptSrc.indexOf(window.location.origin) === 0)
    );
    if (isLocal) {
      return scriptSrc.replace(/\?.*$/, '').replace(/\/[^/]*$/, '');
    }
    var match = scriptSrc.match(/@([a-f0-9]{7,40})(?:\/|$)/i);
    var commit = match ? match[1] : 'main';
    return CONFIG.baseUrlTemplate.replace('COMMIT', commit);
  }

  async function init() {
    try {
      var baseUrl = getBaseUrl();

      var isDevMode = /^https?:\/\/localhost(:\d+)?(\/|$)/i.test(baseUrl) || /\.ngrok-free\.dev(\/|$)/i.test(baseUrl);
      if (isDevMode) {
        console.log('%c[RHP] SOURCE: LOCALHOST' + (/ngrok/.test(baseUrl) ? ' (ngrok)' : ''), 'color: #ff8200; font-weight: bold');
        // Visual dev indicator — small orange dot, top-left
        var dot = document.createElement('div');
        dot.style.cssText = 'position:fixed;top:8px;left:8px;width:10px;height:10px;background:#ff8200;border-radius:50%;z-index:99999;pointer-events:none;opacity:0.8';
        document.body.appendChild(dot);
      } else {
        var commitMatch = baseUrl.match(/@([a-f0-9]{7,40})/i);
        console.log('%c[RHP] SOURCE: CDN' + (commitMatch ? ' @' + commitMatch[1] : ''), 'color: #05EFBF; font-weight: bold');
      }

      const isOverlandPage = /\/work\/overland-ai(\/|$)/.test(window.location.pathname);
      const versionParam = 'v=' + (CONFIG.version || '0');

      // Wave 1: GSAP core + all CSS (parallel — no interdependencies)
      await Promise.all([
        loadScript(CONFIG.gsapCoreUrl),
        ...CONFIG.cssDependencies.map(css => loadStylesheet(css)),
        loadStylesheet(`${baseUrl}/ready-hit-play.css?${versionParam}`),
        ...(isOverlandPage ? [loadStylesheet(`${baseUrl}/overland-ai.css?${versionParam}`)] : [])
      ]);

      // Wave 2: GSAP plugins + vendor deps (parallel — all need window.gsap from Wave 1)
      await Promise.all(CONFIG.wave2Dependencies.map(url => loadScript(url)));

      // Expose loader helpers before modules run — modules may lazy-load deps
      // (e.g. aboutSwipers lazy-loads Swiper via RHP.loadScript)
      const _rhp = window.RHP || {};
      _rhp.loadScript = loadScript;
      _rhp.loadStylesheet = loadStylesheet;
      _rhp.getScriptBaseUrl = getBaseUrl;
      window.RHP = _rhp;

      // All parallel modules (no parse-time cross-dependencies)
      await Promise.all(
        CONFIG.parallelModules.map(module => {
          return loadScript(`${baseUrl}/${module}?${versionParam}`);
        })
      );

      // Sequential modules (orchestrator reads all RHP.* registrations at parse time)
      for (const module of CONFIG.sequentialModules) {
        await loadScript(`${baseUrl}/${module}?${versionParam}`);
      }

      // Page-specific: Overland AI case study (only on /work/overland-ai)
      if (isOverlandPage) {
        await loadScript(`${baseUrl}/overland-ai.js?${versionParam}`);
      }

      // Fallback: dismiss loader after all modules load (non-home pages, or if
      // the MutationObserver didn't fire). Idempotent — no-op if already dismissed.
      _dismissLoader();

      const RHP = window.RHP || {};
      RHP.version = CONFIG.version || '0';
      RHP.configVersion = CONFIG.version || '0';
      window.RHP = RHP;
      const checks = [
        { module: 'lenis-manager.js', ok: typeof RHP.lenis !== 'undefined', detail: RHP.lenis?.version || '' },
        { module: 'cursor.js', ok: typeof RHP.cursor !== 'undefined', detail: RHP.cursor?.version || '(no version)' },
        { module: 'work-dial.js', ok: typeof RHP.workDial !== 'undefined', detail: RHP.workDial?.version || '' },
        { module: 'transition-dial.js', ok: typeof RHP.transitionDial !== 'undefined', detail: RHP.transitionDial?.version || '' },
        { module: 'about-dial-ticks.js', ok: typeof RHP.aboutDialTicks !== 'undefined', detail: RHP.aboutDialTicks?.version || '' },
        { module: 'about-text-lines.js', ok: typeof RHP.aboutTextLines !== 'undefined', detail: RHP.aboutTextLines?.version || '' },
        { module: 'about-swipers.js', ok: typeof RHP.aboutSwipers !== 'undefined', detail: RHP.aboutSwipers?.version || '' },
        { module: 'about-scroll-accordions.js', ok: typeof RHP.aboutScrollAccordions !== 'undefined', detail: RHP.aboutScrollAccordions?.version || '' },
        { module: 'about-icon-scale.js', ok: typeof RHP.aboutIconScale !== 'undefined', detail: RHP.aboutIconScale?.version || '' },
        { module: 'about-accordion-scroll.js', ok: typeof RHP.aboutAccordionScroll !== 'undefined', detail: RHP.aboutAccordionScroll?.version || '' },
        { module: 'home-intro.js', ok: typeof RHP.homeIntro !== 'undefined', detail: RHP.homeIntro?.version || '(no version)' },
        { module: 'home-scroll-morph.js', ok: typeof RHP.homeScrollMorph !== 'undefined', detail: RHP.homeScrollMorph?.version || '' },
        { module: 'home-about-slide.js', ok: typeof RHP.homeAboutSlide !== 'undefined', detail: RHP.homeAboutSlide?.version || '' },
        { module: 'intro-format.js', ok: typeof RHP.formatIntroText === 'function', detail: '—' },
        { module: 'earth-parallax.js', ok: typeof RHP.earthParallax !== 'undefined', detail: RHP.earthParallax?.version || '' },
        { module: 'case-video-controls.js', ok: typeof RHP.caseVideoControls !== 'undefined', detail: RHP.caseVideoControls?.version || '' },
        { module: 'video-loader.js', ok: typeof RHP.videoLoader !== 'undefined', detail: RHP.videoLoader?.version || '' },
        { module: 'work-nav.js', ok: typeof RHP.workNav !== 'undefined', detail: RHP.workNav?.version || '' },
        { module: 'orchestrator.js', ok: typeof RHP.views !== 'undefined' && typeof RHP.scroll !== 'undefined', detail: RHP.orchestratorVersion || '' },
        { module: 'utils.js', ok: true, detail: '—' }
      ];
      const failed = checks.filter(function(c) { return !c.ok; });
      const allOk = failed.length === 0;
      RHP.scriptsOk = allOk;
      RHP.scriptsCheck = { total: checks.length, ok: checks.length - failed.length, failed: failed.map(function(c) { return c.module; }) };
      window.RHP = RHP;

      var versionsTable = {
        'init (loader)': CONFIG.version,
        'lenis-manager.js': RHP.lenis?.version || '—',
        'cursor.js': (RHP.cursor?.version || '—') + (typeof RHP.cursor?.transitionDuration === 'number' ? ' (transitionDuration: ' + RHP.cursor.transitionDuration + ')' : ''),
        'work-dial.js': RHP.workDial?.version || '—',
        'transition-dial.js': RHP.transitionDial?.version || '—',
        'about-dial-ticks.js': RHP.aboutDialTicks?.version || '—',
        'about-text-lines.js': RHP.aboutTextLines?.version || '—',
        'about-swipers.js': RHP.aboutSwipers?.version || '—',
        'about-scroll-accordions.js': RHP.aboutScrollAccordions?.version || '—',
        'about-icon-scale.js': RHP.aboutIconScale?.version || '—',
        'about-accordion-scroll.js': RHP.aboutAccordionScroll?.version || '—',
        'home-intro.js': RHP.homeIntro?.version || '—',
        'home-scroll-morph.js': RHP.homeScrollMorph?.version || '—',
        'home-about-slide.js': RHP.homeAboutSlide?.version || '—',
        'intro-format.js': '—',
        'earth-parallax.js': RHP.earthParallax?.version || '—',
        'case-video-controls.js': RHP.caseVideoControls?.version || '—',
        'video-loader.js': RHP.videoLoader?.version || '—',
        'work-nav.js': RHP.workNav?.version || '—',
        'orchestrator.js': RHP.orchestratorVersion || '—',
        'utils.js': '—'
      };
      RHP.versions = versionsTable;
      console.log('RHP script versions (loaded):');
      console.table(versionsTable);

      console.log('RHP load check:', checks.map(function(c) {
        return c.module + ': ' + (c.ok ? 'OK' : 'MISSING') + (c.detail ? ' (' + c.detail + ')' : '');
      }).join(' | ') + ' | version: ' + RHP.version);
      var gsapOk = typeof window.gsap !== 'undefined';
      var scrollTriggerOk = typeof window.ScrollTrigger !== 'undefined';
      var flipOk = typeof window.Flip !== 'undefined';
      var splitTextOk = typeof window.SplitText !== 'undefined';
      var scrambleTextOk = typeof window.ScrambleTextPlugin !== 'undefined';
      console.log('RHP GSAP:', gsapOk ? 'gsap OK ' + (window.gsap && window.gsap.version ? '(' + window.gsap.version + ')' : '') : 'gsap MISSING', '| ScrollTrigger:', scrollTriggerOk ? 'OK' : 'MISSING', '| Flip:', flipOk ? 'OK' : 'MISSING', '| ScrambleText:', scrambleTextOk ? 'OK' : 'MISSING', '| SplitText:', splitTextOk ? 'OK' : (CONFIG.splitTextUrl ? 'MISSING' : 'off'));
      if (!gsapOk) {
        console.warn('⚠️ RHP: GSAP did not load. Check dependency URLs in init.js.');
      }
      if (allOk) {
        console.log('✅ RHP: all ' + checks.length + ' scripts present');
      } else {
        console.warn('⚠️ RHP: ' + failed.length + ' script(s) missing – ' + failed.map(function(c) { return c.module; }).join(', '));
      }

      console.log('✅ RHP scripts loaded successfully');
    } catch (error) {
      console.error('❌ Error loading RHP scripts:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
