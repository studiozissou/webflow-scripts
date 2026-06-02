/**
 * NEM Life — Radio Filter Uncheck
 * Allows Finsweet CMS List radio filters to be unchecked
 * by clicking them again, clearing all filters.
 */

(() => {
  const form = document.querySelector('[fs-list-element="filters"]');
  if (!form) return;

  form.addEventListener('click', (e) => {
    /* Ignore the synthetic click the browser fires on the input */
    if (e.target.tagName === 'INPUT') return;

    const label = e.target.closest('label');
    if (!label) return;

    const radio = label.querySelector('input[type="radio"]');
    if (!radio || !radio.checked) return;

    /* Radio was already checked — clear filters */
    e.preventDefault();
    e.stopPropagation();
    window.location.replace(window.location.pathname);
  }, true);
})();
