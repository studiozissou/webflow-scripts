<!-- Redirect when non-related store is filtered for -->
<script>
(function () {
  // Module: near-location-redirect v1
  // Project: Carsa
  // Deps: Finsweet Attributes CMS List (already loaded)
  // Pages: /used-cars/near/* only

  const DEBUG = false;

  // --- R1: Page guard ---

  const path = location.pathname.replace(/\/$/, '') || '/';
  if (!/^\/used-cars\/near\/.+$/.test(path)) {
    DEBUG && console.log('[near-redirect] not a /near/ page, exiting');
    return;
  }

  // --- Stale location param guard ---
  // On /near/ pages, cars_location_equal in the URL is always stale
  // (from back-nav after a redirect). Finsweet caches it internally
  // before we can strip it, so we must strip + reload to get a clean slate.
  const earlyParams = new URLSearchParams(location.search);
  if (earlyParams.has('cars_location_equal')) {
    earlyParams.delete('cars_location_equal');
    const cleanURL = location.pathname + (earlyParams.toString() ? '?' + earlyParams.toString() : '');
    location.replace(cleanURL);
    return; // Stop execution — page is reloading
  }

  // --- bfcache handling ---
  // On back/forward cache restore, Finsweet's internal state is stale.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      DEBUG && console.log('[near-redirect] bfcache restore, reloading');
      location.reload();
    }
  });

  // --- Constants ---

  const DEBOUNCE_MS = 200;
  const BASE_URL = location.origin + '/used-cars';
  const LOCATION_PARAM = 'cars_location_equal';
  const DATA_ATTR_ZERO = 'data-near-zero';

  // --- State ---

  let initialised = false;
  let submitBound = false;

  function isMobile() {
    return window.matchMedia('(max-width: 991px)').matches;
  }

  // --- Helpers ---

  function findLocationFilterGroup() {
    const inputs = document.querySelectorAll('input[fs-list-field="location"]');
    if (!inputs.length) return null;
    let el = inputs[0];
    while (el && !el.classList.contains('filters1_filter-group')) {
      el = el.parentElement;
    }
    return el || null;
  }

  function getLocationEntries(group) {
    const inputs = group.querySelectorAll('input[fs-list-field="location"]');
    const entries = [];
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const label = input.closest('label.dropdown1_checkbox-field');
      if (!label) continue;
      const name = input.getAttribute('fs-list-value') || '';
      if (!name) continue;
      const facetCount = label.querySelector('[fs-list-element="facet-count"]');
      const facetWrapper = label.querySelector('.facet-wrapper');
      entries.push({ input, label, facetCount, facetWrapper, name });
    }
    return entries;
  }

  function isZeroCount(entry) {
    if (!entry.facetCount) return false;
    const text = (entry.facetCount.textContent || '').trim();
    return text === '0';
  }

  function getCheckedLocationNames(entries) {
    const names = [];
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].label.classList.contains('is-list-active')) {
        names.push(entries[i].name);
      }
    }
    return names;
  }

  function buildRedirectURL(clickedName, entries) {
    let url;
    try {
      url = new URL(BASE_URL);
    } catch (err) {
      DEBUG && console.log('[near-redirect] URL construction failed:', err);
      return null;
    }

    // R5: Collect currently-checked locations + the clicked one
    const locations = getCheckedLocationNames(entries);
    if (clickedName && locations.indexOf(clickedName) === -1) {
      locations.push(clickedName);
    }

    // Set location param as JSON array: ["Bradford","Gloucester"]
    url.searchParams.set(LOCATION_PARAM, JSON.stringify(locations));

    // R6: Copy all other URL params except cars_location_equal
    const current = new URLSearchParams(location.search);
    current.forEach(function (val, key) {
      if (key === LOCATION_PARAM) return;
      url.searchParams.set(key, val);
    });

    return url.toString();
  }

  // --- R3: Process location filters (hide/show zero-count facet-wrappers) ---

  function processLocationFilters(entries) {
    DEBUG && console.log('[near-redirect] processing', entries.length, 'locations');
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const zero = isZeroCount(entry);

      if (zero) {
        if (entry.facetWrapper) {
          entry.facetWrapper.style.display = 'none';
        }
        entry.label.setAttribute(DATA_ATTR_ZERO, '');
        DEBUG && console.log('[near-redirect] zero-count:', entry.name);
      } else {
        if (entry.facetWrapper) {
          entry.facetWrapper.style.display = '';
        }
        entry.label.removeAttribute(DATA_ATTR_ZERO);
      }
    }
  }

  // --- R4: Click interception via event delegation ---

  function handleClick(e, entries) {
    const label = e.target.closest('label.dropdown1_checkbox-field');
    if (!label) return;
    if (!label.hasAttribute(DATA_ATTR_ZERO)) return;

    let entry = null;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].label === label) {
        entry = entries[i];
        break;
      }
    }
    if (!entry) return;

    DEBUG && console.log('[near-redirect] intercepted click on zero-count:', entry.name);

    if (isMobile()) {
      // Mobile: let Finsweet handle the click normally. The redirect URL
      // is built at submit time (not here) so it always reflects the
      // latest checked state. We just flag that a zero-count was selected.
      return;
    }

    // Desktop: block Finsweet and redirect immediately
    e.stopImmediatePropagation();

    // Visually check the checkbox so the click feels natural
    label.classList.add('is-list-active');
    if (entry.input) entry.input.checked = true;

    const redirectURL = buildRedirectURL(entry.name, entries);
    if (!redirectURL) return;

    DEBUG && console.log('[near-redirect] redirecting to:', redirectURL);
    location.href = redirectURL;
  }

  // --- Bootstrap ---

  function bootstrap() {
    if (initialised) return;
    const group = findLocationFilterGroup();
    if (!group) {
      DEBUG && console.log('[near-redirect] no location filter group found');
      return;
    }

    const entries = getLocationEntries(group);
    if (!entries.length) {
      DEBUG && console.log('[near-redirect] no location inputs found');
      return;
    }

    initialised = true;

    // Initial processing
    processLocationFilters(entries);

    // R4: Click handler via event delegation on the filter group
    group.addEventListener('click', function (e) {
      const currentEntries = getLocationEntries(group);
      handleClick(e, currentEntries);
    }, true); // useCapture to fire before Finsweet

    // R2 + R7: MutationObserver for facet count changes
    let debounceTimer = null;
    const observer = new MutationObserver(function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        const currentEntries = getLocationEntries(group);
        processLocationFilters(currentEntries);
      }, DEBOUNCE_MS);
    });

    observer.observe(group, {
      characterData: true,
      childList: true,
      subtree: true
    });

    // Mobile: on submit, check if any zero-count locations are active.
    // Build redirect URL at submit time so it always has the latest state.
    if (!submitBound) {
      submitBound = true;
      const submitBtn = document.getElementById('mobile-search-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', function () {
          if (!isMobile()) return;
          var currentEntries = getLocationEntries(group);
          var hasZeroChecked = currentEntries.some(function (e) {
            return e.label.classList.contains('is-list-active') && isZeroCount(e);
          });
          if (!hasZeroChecked) return;
          var redirectURL = buildRedirectURL(null, currentEntries);
          if (!redirectURL) return;
          DEBUG && console.log('[near-redirect] mobile submit → redirecting:', redirectURL);
          location.href = redirectURL;
        });
      }
    }

    DEBUG && console.log('[near-redirect] initialized, watching', entries.length, 'locations');
  }

  // --- Finsweet init hook ---

  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push([
    'list',
    function () {
      DEBUG && console.log('[near-redirect] Finsweet list ready');
      bootstrap();
    }
  ]);
})();
</script>
