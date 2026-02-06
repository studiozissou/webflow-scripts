/* =========================================
   RHP — Initialization Loader
   Ensures proper loading order and dependency management
   ========================================= */
(function() {
  'use strict';

  // Configuration - Bump version on deploy so module URLs change and cache is busted
  const CONFIG = {
    version: '2026.2.6.2',
    baseUrl: 'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@main/projects/ready-hit-play-prod',
    // Or pin a commit: baseUrl: '...@af49ed1/...',
    
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
      'work-dial.js',
      'orchestrator.js',
      'utils.js'
    ],
    rhpCss: 'ready-hit-play.css'
  };

  // Load a stylesheet and return a promise
  function loadStylesheet(href) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
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
      // Check if already loaded
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false; // Maintain order
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }

  // Dev mode: script ?dev=1/?nocache=1 or page URL contains webflow.io → timestamp on module URLs (no cache)
  const scriptSrc = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
  const devMode = /[?&](?:dev|nocache)=1/i.test(scriptSrc) || (typeof location !== 'undefined' && /webflow\.io/i.test(location.href));

  // Load all dependencies first, then modules
  async function init() {
    try {
      // Load CSS dependencies first
      for (const css of CONFIG.cssDependencies) {
        await loadStylesheet(css);
      }
      if (devMode && CONFIG.rhpCss) {
        await loadStylesheet(`${CONFIG.baseUrl}/${CONFIG.rhpCss}?t=${Date.now()}`);
      }

      // Load JavaScript dependencies
      for (const dep of CONFIG.dependencies) {
        await loadScript(dep);
      }

      // Wait a tick to ensure globals are available
      await new Promise(resolve => setTimeout(resolve, 10));

      // Load modules in order (version param busts cache on deploy; dev mode adds timestamp for fresh load every time)
      const moduleParam = devMode ? 't=' + Date.now() : 'v=' + (CONFIG.version || '0');
      for (const module of CONFIG.modules) {
        const url = `${CONFIG.baseUrl}/${module}?${moduleParam}`;
        await loadScript(url);
      }

      // Debug: report which RHP modules are present after load
      const RHP = window.RHP || {};
      const checks = [
        { module: 'lenis-manager.js', ok: typeof RHP.lenis !== 'undefined', detail: '' },
        { module: 'cursor.js', ok: typeof RHP.cursor !== 'undefined', detail: RHP.cursor?.version || '(no version)' },
        { module: 'work-dial.js', ok: typeof RHP.workDial !== 'undefined', detail: '' },
        { module: 'orchestrator.js', ok: typeof RHP.views !== 'undefined' && typeof RHP.scroll !== 'undefined', detail: '' },
        { module: 'utils.js', ok: true, detail: '(no RHP export)' }
      ];
      const failed = checks.filter(function(c) { return !c.ok; });
      if (failed.length) {
        console.warn('RHP load check: some modules may not have run correctly:', failed.map(function(c) { return c.module; }));
      }
      console.log('RHP load check:', checks.map(function(c) {
        return c.module + ': ' + (c.ok ? 'OK' : 'MISSING') + (c.detail ? ' (' + c.detail + ')' : '');
      }).join(' | '));

      if (devMode) console.log('RHP: dev mode (nocache) – modules loaded with timestamp');
      console.log('✅ RHP scripts loaded successfully');
    } catch (error) {
      console.error('❌ Error loading RHP scripts:', error);
    }
  }

  // Start loading when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
