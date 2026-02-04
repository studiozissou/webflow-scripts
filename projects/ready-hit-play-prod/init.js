/* =========================================
   RHP — Initialization Loader
   Ensures proper loading order and dependency management
   ========================================= */
(function() {
  'use strict';

  // Configuration - Update these with your JS Deliver URLs
  const CONFIG = {
    baseUrl: 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/projects/ready-hit-play-prod',
    // Or use raw GitHub URLs:
    // baseUrl: 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/projects/ready-hit-play-prod',
    
    // Dependencies (loaded first)
    dependencies: [
      'https://unpkg.com/@barba/core',
      'https://unpkg.com/lenis@1.3.17/dist/lenis.min.js'
    ],
    
    // Module files (loaded in order)
    modules: [
      'lenis-manager.js',
      'work-dial.js',
      'orchestrator.js',
      'utils.js'
    ]
  };

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

  // Load all dependencies first, then modules
  async function init() {
    try {
      // Load dependencies
      for (const dep of CONFIG.dependencies) {
        await loadScript(dep);
      }

      // Wait a tick to ensure globals are available
      await new Promise(resolve => setTimeout(resolve, 10));

      // Load modules in order
      for (const module of CONFIG.modules) {
        const url = `${CONFIG.baseUrl}/${module}`;
        await loadScript(url);
      }

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
