/**
 * Make / Model template
 * 1. Injects fs-list-element="empty" when Webflow strips .w-dyn-empty (single-page collections)
 * 2. Swaps to .is-make-model empty state on zero-result pages
 */

(function makeModelTemplate() {
  const wrapper = document.querySelector('#results-list-wrapper');
  if (!wrapper) return;

  /* ── 1. Inject Finsweet empty element if missing ── */

  if (!wrapper.querySelector('[fs-list-element="empty"]')) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'filters1_empty w-dyn-empty';
    emptyEl.setAttribute('fs-list-element', 'empty');
    emptyEl.style.display = 'none';

    emptyEl.innerHTML =
      '<div class="max-width-small align-center">' +
        '<div class="filters1_empty-text-wrapper">' +
          '<div class="icon-embed-medium align-center w-embed"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M36.8906 19.8975C36.8909 23.2586 35.8946 26.5443 34.0275 29.3391C32.1604 32.1339 29.5064 34.3122 26.4013 35.5986C23.2961 36.885 19.8792 37.2217 16.5827 36.5661C13.2862 35.9105 10.2581 34.292 7.88148 31.9153C5.50483 29.5387 3.88635 26.5106 3.23073 23.2141C2.57511 19.9176 2.91179 16.5007 4.19819 13.3955C5.48459 10.2904 7.66293 7.63641 10.4577 5.76933C13.2525 3.90224 16.5382 2.90588 19.8993 2.90625C24.4057 2.90625 28.7275 4.69639 31.9139 7.88287C35.1004 11.0693 36.8906 15.3911 36.8906 19.8975Z" stroke="#7F7F7F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.8149 13.8149L25.7474 25.7474" stroke="#7F7F7F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.8149 25.7474L25.7474 13.8149" stroke="#7F7F7F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M31.9143 31.9125L45.0937 45.0937" stroke="#7F7F7F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
          '<div class="spacer-small"></div>' +
          '<div class="heading-style-h5">No vehicles found</div>' +
          '<div class="spacer-xsmall"></div>' +
          '<div>Sorry! We can\'t find any vehicles matching your search.<br>Try changing or removing some filters.</div>' +
          '<div class="spacer-medium"></div>' +
          '<a fs-list-element="clear" href="#" class="button is-secondary w-button">Reset filters</a>' +
        '</div>' +
      '</div>';

    const list = wrapper.querySelector('.results_collection-list');
    if (list && list.nextSibling) {
      wrapper.insertBefore(emptyEl, list.nextSibling);
    } else {
      wrapper.appendChild(emptyEl);
    }
  }

  /* ── 2. Zero-result empty-state swap ── */

  const dynEmpty = wrapper.querySelector('.filters1_empty.w-dyn-empty');
  if (!dynEmpty || dynEmpty.offsetHeight === 0) return;

  const filtersLayout = document.querySelector('.filters1_layout');
  const makeModelEmpty = document.querySelector('.filters1_empty.is-make-model');
  if (!filtersLayout || !makeModelEmpty) return;

  filtersLayout.style.display = 'none';
  makeModelEmpty.style.display = 'flex';
  [...dynEmpty.children].forEach(child => child.style.display = 'none');
})();
