/* =========================================
   RHP — Initialization Loader
   Ensures proper loading order and dependency management
   ========================================= */
(function() {
  'use strict';

  // FOUC prevention: inject critical hide rules synchronously before first paint.
  // ready-hit-play.css loads later (after deps); these inline styles cover the gap.
  (function() {
    var s = document.createElement('style');
    s.textContent =
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready):not(.rhp-intro-started) .nav_logo-link,' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready):not(.rhp-intro-started) .nav_about-link,' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready):not(.rhp-intro-started) .nav_contact-link,' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready):not(.rhp-intro-started) .dial_layer-ui,' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready):not(.rhp-intro-started) [data-text="step"],' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready):not(.rhp-intro-started) .heading-style-h7.is-step,' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready):not(.rhp-intro-started) .dial_layer-ticks,' +
      '[data-barba="wrapper"]:has([data-barba-namespace="home"]):not(.rhp-home-ready):not(.rhp-intro-started) .dial_bg-canvas' +
      '{opacity:0!important;visibility:hidden!important;pointer-events:none!important}';
    document.head.appendChild(s);
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
    version: '2026.4.9.2', // bump when you deploy – new ?v= busts cache so modules reload
    baseUrlTemplate: 'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@COMMIT/projects/ready-hit-play-prod',

    // CSS dependencies (loaded first)
    cssDependencies: [
      'https://unpkg.com/lenis@1.3.17/dist/lenis.css'
    ],

    // Dependencies (loaded first): GSAP 3.14.2 + plugins (Webflow CDN), then Barba, Lenis
    dependencies: [
      'https://cdn.prod.website-files.com/gsap/3.14.2/gsap.min.js',
      'https://cdn.prod.website-files.com/gsap/3.14.2/ScrollTrigger.min.js',
      'https://cdn.prod.website-files.com/gsap/3.14.2/ScrambleTextPlugin.min.js',
      'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/Flip.min.js',
      'https://unpkg.com/@barba/core',
      'https://unpkg.com/lenis@1.3.17/dist/lenis.min.js',
      'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js'
    ],

    // SplitText (Club GreenSock) – same CDN, loaded after ScrollTrigger
    splitTextUrl: 'https://cdn.prod.website-files.com/gsap/3.14.2/SplitText.min.js',

    // Module files (loaded in order)
    modules: [
      'lenis-manager.js',
      'cursor.js',
      'work-dial.js',
      'transition-dial.js',
      'about-dial-ticks.js',
      'about-text-lines.js',
      'home-intro.js',
      'home-scroll-morph.js',
      'home-about-slide.js',
      'intro-format.js',
      'earth-parallax.js',
      'case-video-controls.js',
      'video-loader.js',
      'work-nav.js',
      'orchestrator.js',
      'utils.js'
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
      script.async = false;
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

      for (const css of CONFIG.cssDependencies) {
        await loadStylesheet(css);
      }

      // Page-specific: Overland AI case study CSS (fonts + typography)
      const isOverlandPage = /\/work\/overland-ai(\/|$)/.test(window.location.pathname);
      if (isOverlandPage) {
        const versionParam = 'v=' + (CONFIG.version || '0');
        await loadStylesheet(`${baseUrl}/overland-ai.css?${versionParam}`);
      }

      for (const dep of CONFIG.dependencies) {
        await loadScript(dep);
      }

      if (CONFIG.splitTextUrl) {
        await loadScript(CONFIG.splitTextUrl);
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      const versionParam = 'v=' + (CONFIG.version || '0');

      // Project CSS (loaded after vendor CSS, before JS modules)
      await loadStylesheet(`${baseUrl}/ready-hit-play.css?${versionParam}`);

      for (const module of CONFIG.modules) {
        await loadScript(`${baseUrl}/${module}?${versionParam}`);
      }

      // Page-specific: Overland AI case study (only on /work/overland-ai)
      if (isOverlandPage) {
        await loadScript(`${baseUrl}/overland-ai.js?${versionParam}`);
      }

      const RHP = window.RHP || {};
      RHP.version = CONFIG.version || '0';
      RHP.loadScript = loadScript;
      RHP.getScriptBaseUrl = getBaseUrl;
      RHP.configVersion = CONFIG.version || '0';
      window.RHP = RHP;
      const checks = [
        { module: 'lenis-manager.js', ok: typeof RHP.lenis !== 'undefined', detail: RHP.lenis?.version || '' },
        { module: 'cursor.js', ok: typeof RHP.cursor !== 'undefined', detail: RHP.cursor?.version || '(no version)' },
        { module: 'work-dial.js', ok: typeof RHP.workDial !== 'undefined', detail: RHP.workDial?.version || '' },
        { module: 'transition-dial.js', ok: typeof RHP.transitionDial !== 'undefined', detail: RHP.transitionDial?.version || '' },
        { module: 'about-dial-ticks.js', ok: typeof RHP.aboutDialTicks !== 'undefined', detail: RHP.aboutDialTicks?.version || '' },
        { module: 'about-text-lines.js', ok: typeof RHP.aboutTextLines !== 'undefined', detail: RHP.aboutTextLines?.version || '' },
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
