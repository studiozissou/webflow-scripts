/* =========================================
   RHP — Initialization Loader
   Ensures proper loading order and dependency management
   ========================================= */
(function() {
  'use strict';

  // Configuration - Use pinned commit in your Webflow script URL (e.g. ...@cbbef90/.../init.js). Init will load modules from the same commit.
  const CONFIG = {
    version: '2026.2.6.7',
    baseUrlTemplate: 'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@COMMIT/projects/ready-hit-play-prod',

    // CSS dependencies (loaded first)
    cssDependencies: [
      'https://unpkg.com/lenis@1.3.17/dist/lenis.css'
    ],

    // Dependencies (loaded first)
    dependencies: [
      'https://unpkg.com/@barba/core',
      'https://unpkg.com/lenis@1.3.17/dist/lenis.min.js'
    ],

    // Module files (loaded in order)
    modules: [
      'lenis-manager.js',
      'cursor.js',
      'contact-pullout.js',
      'work-dial.js',
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
    var scriptSrc = typeof document !== 'undefined' && document.currentScript && document.currentScript.src ? document.currentScript.src : '';
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

      for (const dep of CONFIG.dependencies) {
        await loadScript(dep);
      }

      await new Promise(resolve => setTimeout(resolve, 10));

      const versionParam = 'v=' + (CONFIG.version || '0');
      for (const module of CONFIG.modules) {
        await loadScript(`${baseUrl}/${module}?${versionParam}`);
      }

      const RHP = window.RHP || {};
      RHP.version = CONFIG.version || '0';
      window.RHP = RHP;
      const checks = [
        { module: 'lenis-manager.js', ok: typeof RHP.lenis !== 'undefined', detail: '' },
        { module: 'cursor.js', ok: typeof RHP.cursor !== 'undefined', detail: RHP.cursor?.version || '(no version)' },
        { module: 'contact-pullout.js', ok: true, detail: '' },
        { module: 'work-dial.js', ok: typeof RHP.workDial !== 'undefined', detail: '' },
        { module: 'orchestrator.js', ok: typeof RHP.views !== 'undefined' && typeof RHP.scroll !== 'undefined', detail: '' },
        { module: 'utils.js', ok: true, detail: '(no RHP export)' }
      ];
      const failed = checks.filter(function(c) { return !c.ok; });
      const allOk = failed.length === 0;
      RHP.scriptsOk = allOk;
      RHP.scriptsCheck = { total: checks.length, ok: checks.length - failed.length, failed: failed.map(function(c) { return c.module; }) };
      window.RHP = RHP;

      console.log('RHP load check:', checks.map(function(c) {
        return c.module + ': ' + (c.ok ? 'OK' : 'MISSING') + (c.detail ? ' (' + c.detail + ')' : '');
      }).join(' | ') + ' | version: ' + RHP.version);
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
