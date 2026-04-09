/* =========================================
   Console snippet — load latest work-nav.js from local worktree server
   Use: paste into DevTools console on https://rhpcircle.webflow.io/work/<slug>
        AFTER you have set ?rhp=local&rhp-port=8085 at least once.
   Bypasses CDN init.js (which doesn't yet know about work-nav.js).
   ========================================= */
(async () => {
  try { window.RHP && window.RHP.workNav && window.RHP.workNav.destroy && window.RHP.workNav.destroy(); } catch (e) {}
  if (window.RHP && window.RHP.workNav) delete window.RHP.workNav;

  const url = 'https://localhost:8085/projects/ready-hit-play-prod/work-nav.js?v=' + Date.now();
  const src = await fetch(url).then(function (r) { return r.text(); });
  new Function(src)();

  const container = document.querySelector('[data-barba="container"]');
  window.RHP.workNav.init(container);

  const prevLabelEl = document.querySelector('a[data-button="work-previous"] .text-size-tiny.text-style-allcaps');
  const nextLabelEl = document.querySelector('a[data-button="work-next"] .text-size-tiny.text-style-allcaps');
  const prevBtn = document.querySelector('a[data-button="work-previous"]');
  const nextBtn = document.querySelector('a[data-button="work-next"]');

  console.log('[work-nav]', window.RHP.workNav.version);
  console.log('prev:', prevBtn && prevBtn.getAttribute('href'), '-', prevLabelEl && prevLabelEl.textContent);
  console.log('next:', nextBtn && nextBtn.getAttribute('href'), '-', nextLabelEl && nextLabelEl.textContent);
})();
