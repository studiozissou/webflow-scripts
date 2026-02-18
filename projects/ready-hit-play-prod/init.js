/* =========================================
   RHP — Initialization Loader
   Ensures proper loading order and dependency management
   ========================================= */
(function() {
  'use strict';

  // Capture init script URL immediately (currentScript is only set during initial execution; async init() may run after it's cleared)
  var INIT_SCRIPT_SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src)
    ? document.currentScript.src
    : '';

  // Configuration - Use pinned commit in your Webflow script URL (e.g. ...@cbbef90/.../init.js). Init will load modules from the same commit.
  const CONFIG = {
    version: '2026.2.18.1', // bump when you deploy – new ?v= busts cache so modules reload
    baseUrlTemplate: 'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@COMMIT/projects/ready-hit-play-prod',

    // CSS dependencies (loaded first)
    cssDependencies: [
      'https://unpkg.com/lenis@1.3.17/dist/lenis.css'
    ],

    // Dependencies (loaded first): GSAP 3.14.2 + plugins (Webflow CDN), then Barba, Lenis
    dependencies: [
      'https://cdn.prod.website-files.com/gsap/3.14.2/gsap.min.js',
      'https://cdn.prod.website-files.com/gsap/3.14.2/ScrollTrigger.min.js',
      'https://unpkg.com/@barba/core',
      'https://unpkg.com/lenis@1.3.17/dist/lenis.min.js'
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
      'intro-format.js',
      'orchestrator.js',
      'utils.js'
    ]
  };

  // Load a stylesheet and return a promise
  function loadStylesheet(href) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`link[href="${href}"]`);
      if (existing) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load: ${href}`));
      document.head.appendChild(link);
    });
  }

  // Load a script and return a promise
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }

  function getBaseUrl() {
    var scriptSrc = INIT_SCRIPT_SRC;
    // Local dev: script from localhost or same-origin without CDN @commit
    var isLocal = scriptSrc && (
      /^(https?:)?\/\/localhost(:\d+)?(\/|$)/i.test(scriptSrc) ||
      /^file:\/\//i.test(scriptSrc) ||
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

      for (const css of CONFIG.cssDependencies) {
        await loadStylesheet(css);
      }

      // Page-specific: Overland AI case study CSS (fonts + typography)
      const isOverlandPage = /\/case-studies\/overland-ai(\/|$)/.test(window.location.pathname);
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
      for (const module of CONFIG.modules) {
        await loadScript(`${baseUrl}/${module}?${versionParam}`);
      }

      // Page-specific: Overland AI case study (only on /case-studies/overland-ai)
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
        { module: 'intro-format.js', ok: typeof RHP.formatIntroText === 'function', detail: '—' },
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
        'intro-format.js': '—',
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
      var splitTextOk = typeof window.SplitText !== 'undefined';
      console.log('RHP GSAP:', gsapOk ? 'gsap OK ' + (window.gsap && window.gsap.version ? '(' + window.gsap.version + ')' : '') : 'gsap MISSING', '| ScrollTrigger:', scrollTriggerOk ? 'OK' : 'MISSING', '| SplitText:', splitTextOk ? 'OK' : (CONFIG.splitTextUrl ? 'MISSING' : 'off'));
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
