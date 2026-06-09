/**
 * Filter "All" Button Prepend — NEM Life
 *
 * Moves [data-button="all"] into [data-list="filters"] as the first child.
 * Runs on inzichten, ervaringen, category, and tag pages — bails if elements missing.
 */
(() => {
  const DEBUG = false;

  const btn = document.querySelector('[data-button="all"]');
  if (!btn) return;

  const filters = document.querySelector('[data-list="filters"]');
  if (!filters) return;

  DEBUG && console.log('[filter-all-prepend] moving button into filters');
  filters.prepend(btn);
})();
