<!-- Make/Model selection -->
<script>
(function () {
  // Module: make-model-redirect v2
  // Project: Carsa
  // Deps: jQuery (loaded sitewide), Finsweet Attributes CMS List
  // Pages: /used-cars, /used-cars/make/{slug}, /used-cars/models/{slug}

  var DEBUG = false;

  // --- Page detection ---

  var _pageCtx = null;
  function getPageContext() {
    if (_pageCtx) return _pageCtx;
    var path = location.pathname.replace(/\/$/, '') || '/';
    if (path === '/used-cars') { _pageCtx = { type: 'vsrp' }; return _pageCtx; }
    var makeMatch = path.match(/^\/used-cars\/make\/(.+)$/);
    if (makeMatch) { _pageCtx = { type: 'make', slug: makeMatch[1] }; return _pageCtx; }
    var modelMatch = path.match(/^\/used-cars\/models\/(.+)$/);
    if (modelMatch) { _pageCtx = { type: 'model', slug: modelMatch[1] }; return _pageCtx; }
    _pageCtx = { type: 'other' };
    return _pageCtx;
  }

  // --- Helpers ---

  function isMobile() {
    return window.matchMedia('(max-width: 991px)').matches;
  }

  function slugify(str) {
    return str.toLowerCase().trim()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function createOption(value, text) {
    var opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    return opt;
  }

  function getActiveFilters() {
    var params = {};
    new URLSearchParams(location.search).forEach(function (val, key) {
      if (key === 'cars_make_equal' || key === 'cars_model_equal') return;
      params[key] = val;
    });
    return params;
  }

  function buildModelRedirectURL(modelSlug, makeName, modelName, filters) {
    var url = new URL('/used-cars/models/' + modelSlug, location.origin);
    url.searchParams.set('cars_make_equal', makeName);
    url.searchParams.set('cars_model_equal', modelName);
    for (var k in filters) url.searchParams.set(k, filters[k]);
    return url.toString();
  }

  function buildMakeRedirectURL(makeSlug, makeName, filters) {
    var url = new URL('/used-cars/make/' + makeSlug, location.origin);
    url.searchParams.set('cars_make_equal', makeName);
    for (var k in filters) url.searchParams.set(k, filters[k]);
    return url.toString();
  }

  // --- Shared state (updated on each Finsweet render) ---

  var _modelSlugMap = {};
  var _makeSlugMap = {};

  // --- Prefetch management ---

  var pendingRedirectURL = null;

  function prefetchURL(url) {
    var existing = document.querySelector('link[data-carsa-prefetch]');
    if (existing) existing.remove();
    if (!url) return;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.setAttribute('data-carsa-prefetch', '');
    document.head.appendChild(link);
    DEBUG && console.log('[carsa] prefetch:', url);
  }

  // --- Mobile submit handler (bound once) ---

  var _submitBound = false;
  function bindMobileSubmit() {
    if (_submitBound) return;
    _submitBound = true;
    // Navigate using prefetched URL (fast path)
    $(document).on('click', '#mobile-search-submit', function () {
      // Always recompute fresh — URL has latest filters at click time
      var url = computeRedirectURL();
      // Fall back to prefetched URL if fresh computation fails
      if (!url) url = pendingRedirectURL;
      if (url) {
        location.href = url;
      }
    });
    // Keep prefetch fresh when any filter changes (not just make/model)
    // Debounce to let Finsweet push filter state to URL first
    var _filterTimer = null;
    $(document).on('change', '[fs-list-field]', function () {
      if (!isMobile()) return;
      var name = $(this).attr('name') || $(this).attr('fs-list-field');
      if (name === 'make' || name === 'model') return;
      clearTimeout(_filterTimer);
      _filterTimer = setTimeout(function () {
        var url = computeRedirectURL();
        if (url) {
          pendingRedirectURL = url;
          prefetchURL(url);
        }
      }, 300);
    });
  }

  // --- Compute redirect URL from current dropdown state ---

  function computeRedirectURL() {
    var makeName = $('[name="make"]').val();
    var modelName = $('[name="model"]').val();
    var filters = getActiveFilters();
    var ctx = getPageContext();

    if (modelName) {
      var modelSlug = _modelSlugMap[modelName] || slugify(modelName);
      // Same-page guard: don't redirect to current model page
      if (ctx.type === 'model' && modelSlug === ctx.slug) return null;
      return buildModelRedirectURL(modelSlug, makeName, modelName, filters);
    }
    if (makeName) {
      var makeSlug = _makeSlugMap[makeName] || slugify(makeName);
      // Same-page guard: don't redirect to current make page
      if (ctx.type === 'make' && makeSlug === ctx.slug) return null;
      return buildMakeRedirectURL(makeSlug, makeName, filters);
    }
    // On make/model pages with "Any" selected → redirect to /used-cars with filters
    if (ctx.type === 'make' || ctx.type === 'model') {
      var vsrpUrl = new URL('/used-cars', location.origin);
      for (var k in filters) vsrpUrl.searchParams.set(k, filters[k]);
      return vsrpUrl.toString();
    }
    return null;
  }

  // --- Finsweet init ---

  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push([
    'list',
    (listInstances) => {
      var modelList = listInstances.find(function (inst) { return inst.instance === 'models'; });
      if (!modelList) return;
      initMakeModelFilters();
      modelList.addHook('render', function () {
        initMakeModelFilters();
      });
    }
  ]);

  function initMakeModelFilters() {
    _modelSlugMap = {};
    _makeSlugMap = {};
    var items = [];

    $('.model-data').each(function () {
      var $el = $(this);
      var modelName = $el.attr('model-title');
      var makeName = $el.attr('make-title');
      var modelSlug = $el.attr('model-slug');
      var makeSlug = $el.attr('make-slug');

      if (modelName && makeName) items.push({ model: modelName, make: makeName });
      if (modelName && modelSlug) _modelSlugMap[modelName] = modelSlug;
      if (makeName && makeSlug && !_makeSlugMap[makeName]) _makeSlugMap[makeName] = makeSlug;
    });

    var $makeDropdown = $('[name="make"]');
    var $modelDropdown = $('[name="model"]');
    if (!$makeDropdown.length || !$modelDropdown.length) return;

    // Reset dropdowns to "Any"
    $makeDropdown.off('change.carsa').html('');
    $makeDropdown.append(createOption('', 'Any'));
    $makeDropdown.val('');

    $modelDropdown.off('change.carsa').html('');
    $modelDropdown.append(createOption('', 'Any'));
    $modelDropdown.prop('disabled', true).addClass('is-disabled');

    var uniqueMakes = [...new Set(items.map(function (i) { return i.make; }))].sort();
    uniqueMakes.forEach(function (make) {
      $makeDropdown.append(createOption(make, make));
    });

    function populateModels(makeName) {
      var filtered = items.filter(function (i) { return i.make === makeName; });
      $modelDropdown.html('');
      $modelDropdown.append(createOption('', 'Any'));
      if (!filtered.length) {
        $modelDropdown.prop('disabled', true).addClass('is-disabled');
        return;
      }
      $modelDropdown.prop('disabled', false).removeClass('is-disabled');
      filtered.forEach(function (i) {
        $modelDropdown.append(createOption(i.model, i.model));
      });
    }

    // Bind mobile submit once
    bindMobileSubmit();

    // --- Facet count visibility ---
    var $facetWrappers = $('.facet-wrapper');
    function updateFacetVisibility() {
      var ctx = getPageContext();
      var hide = false;
      if (ctx.type === 'make') {
        var makeSlug = _makeSlugMap[$makeDropdown.val()] || slugify($makeDropdown.val() || '');
        hide = $makeDropdown.val() && makeSlug !== ctx.slug;
      } else if (ctx.type === 'model') {
        var modelSlug = _modelSlugMap[$modelDropdown.val()] || slugify($modelDropdown.val() || '');
        hide = $modelDropdown.val() && modelSlug !== ctx.slug;
      }
      $facetWrappers.css('visibility', hide ? 'hidden' : '');
    }

    // --- Make change handler ---
    $makeDropdown.on('change.carsa', function () {
      var selectedMake = this.value;
      var ctx = getPageContext();
      var mobile = isMobile();

      // Always populate models
      populateModels(selectedMake);
      $modelDropdown.val('').trigger('input');
      updateFacetVisibility();

      if (mobile) {
        // Mobile (all pages): compute + prefetch, defer redirect
        pendingRedirectURL = computeRedirectURL();
        prefetchURL(pendingRedirectURL);
        return;
      }

      // Desktop VSRP: no redirect (Finsweet handles filtering)
      if (ctx.type === 'vsrp') return;

      // Desktop make/model pages: immediate redirect
      if (ctx.type === 'make' || ctx.type === 'model') {
        if (!selectedMake) {
          var anyFilters = getActiveFilters();
          var anyUrl = new URL('/used-cars', location.origin);
          for (var k in anyFilters) anyUrl.searchParams.set(k, anyFilters[k]);
          location.href = anyUrl.toString();
          return;
        }
        var slug = _makeSlugMap[selectedMake] || slugify(selectedMake);
        // Same-page guard: don't redirect if selecting current make
        if (ctx.type === 'make' && slug === ctx.slug) return;
        if (ctx.type === 'model') {
          // Check URL param first, fall back to CMS data for the page's model
          var currentPageMake = new URLSearchParams(location.search).get('cars_make_equal');
          if (!currentPageMake) {
            // Look up make from model slug in CMS items
            var pageModelItems = items.filter(function (i) {
              return (_modelSlugMap[i.model] || slugify(i.model)) === ctx.slug;
            });
            if (pageModelItems.length) currentPageMake = pageModelItems[0].make;
          }
          if (selectedMake === currentPageMake) return;
        }
        location.href = buildMakeRedirectURL(slug, selectedMake, getActiveFilters());
      }
    });

    // --- Model change handler ---
    $modelDropdown.on('change.carsa', function () {
      var selectedModel = this.value;
      var ctx = getPageContext();
      var mobile = isMobile();
      updateFacetVisibility();

      if (mobile) {
        // Mobile (all pages): compute + prefetch, defer redirect
        pendingRedirectURL = computeRedirectURL();
        prefetchURL(pendingRedirectURL);
        return;
      }

      // Desktop VSRP: no redirect (Finsweet handles filtering)
      if (ctx.type === 'vsrp') return;

      // Desktop make page: model from current make → filter in place (no redirect)
      if (ctx.type === 'make') return;

      // Desktop model pages: immediate redirect on model selection
      if (ctx.type === 'model' && selectedModel) {
        var currentMakeName = $makeDropdown.val();
        var slug = _modelSlugMap[selectedModel] || slugify(selectedModel);
        // Same-page guard: don't redirect if selecting current model
        if (slug === ctx.slug) return;
        location.href = buildModelRedirectURL(slug, currentMakeName, selectedModel, getActiveFilters());
      }
    });
  }
})();
</script>
