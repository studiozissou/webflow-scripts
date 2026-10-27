// Carsa near template (/used-cars/near/<slug>) behaviour moved out of the page head and body: filter form submit block, list loader, make/model redirect, promo cards, mobile filters, filter accordions, near-location redirect and VRM trim.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('near.js: window.__CARSA missing');
    return;
  }
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('near.js');

  var DEBUG = false;

  H.block(function () {
    var FORM_ID = 'wf-form-Filter-Vehicles';

    function blockSubmit() {
      var form = document.getElementById(FORM_ID);
      if (!form) return false;

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }, true);

      var parent = form.closest('.w-form');
      if (parent) {
        var done = parent.querySelector('.w-form-done');
        var fail = parent.querySelector('.w-form-fail');
        if (done) done.style.display = 'none';
        if (fail) fail.style.display = 'none';
      }

      return true;
    }

    if (document.getElementById(FORM_ID)) {
      blockSubmit();
    } else {
      H.onReady(blockSubmit);
    }
  });

  H.block(() => {
    window.FinsweetAttributes = window.FinsweetAttributes || [];
    window.FinsweetAttributes.push([
      'list',
      (listInstances) => {
        $(document).on('input change', '[fs-list-field]', () => {
          $('.loading').show();
          $('#results-list-wrapper').hide();
          $('.facet-wrapper').addClass('is-hidden');
          $('.filters1_item').addClass('is-loading');
        });

        listInstances.forEach((list) => {
          list.addHook('filter', () => {
            $('.loading').show();
            $('#results-list-wrapper').hide();
            $('.facet-wrapper').addClass('is-hidden');
            $('.filters1_item').addClass('is-loading');
          });

          list.addHook('afterRender', () => {
            $('.loading').hide();
            $('#results-list-wrapper').show();
            $('.facet-wrapper').removeClass('is-hidden');
            $('.filters1_item').removeClass('is-loading');
          });
        });
      },
    ]);
  });

  H.block(function () {
    var DEBUG = false;

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

    var _modelSlugMap = {};
    var _makeSlugMap = {};

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

    var _submitBound = false;
    function bindMobileSubmit() {
      if (_submitBound) return;
      _submitBound = true;
      $(document).on('click', '#mobile-search-submit', function () {
        var url = computeRedirectURL();
        if (!url) url = pendingRedirectURL;
        if (url) {
          location.href = url;
        }
      });
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

    function computeRedirectURL() {
      var makeName = $('[name="make"]').val();
      var modelName = $('[name="model"]').val();
      var filters = getActiveFilters();

      if (modelName) {
        return buildModelRedirectURL(_modelSlugMap[modelName] || slugify(modelName), makeName, modelName, filters);
      }
      if (makeName) {
        return buildMakeRedirectURL(_makeSlugMap[makeName] || slugify(makeName), makeName, filters);
      }
      return null;
    }

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

      bindMobileSubmit();

      $makeDropdown.on('change.carsa', function () {
        populateModels(this.value);
        $modelDropdown.val('');
        $modelDropdown[0].dispatchEvent(new Event('input', { bubbles: true }));
        $modelDropdown[0].dispatchEvent(new Event('change', { bubbles: true }));
        if (!isMobile()) return;
        pendingRedirectURL = computeRedirectURL();
        prefetchURL(pendingRedirectURL);
      });

      $modelDropdown.on('change.carsa', function () {
        if (!isMobile()) return;
        pendingRedirectURL = computeRedirectURL();
        prefetchURL(pendingRedirectURL);
      });
    }
  });

  H.block(() => {
    window.FinsweetAttributes = window.FinsweetAttributes || [];
    window.FinsweetAttributes.push([
      'list',
      (listInstances) => {
        listInstances.forEach((list) => {
          list.addHook('afterRender', () => {
            const $list = $('#results-list');
            $list.find('[data-element="promo-card"]').remove();

            $('#promo-storage [data-element="promo-card"]').each(function () {
              const base = parseInt($(this).attr('data-position'), 10) || 1;
              const repeat = parseInt($(this).attr('data-repeat'), 10) || 0;
              const $children = $list.children();
              const max = $children.length;

              const insertAt = (pos) => {
                const $clone = $(this).clone(true);
                const kids = $list.children();
                if (pos >= kids.length) {
                  $list.append($clone);
                } else {
                  $clone.insertBefore(kids.eq(pos - 1));
                }
              };

              insertAt(base);
              if (repeat > 0) {
                let pos = base + repeat;
                while (pos <= max + 1) {
                  insertAt(pos);
                  pos += repeat;
                }
              }
            });

            const $wrappers = $('#results-list > .results_offer-wrapper');
            $wrappers.each(function () {
              if ($(this).next('.results_offer-wrapper').length) {
                $(this).nextAll('.results_offer-wrapper').hide();
                return false;
              }
            });
          });
        });
      },
    ]);
  });

  H.block(() => {
    function windowLoaded() {
      const span = document.getElementById('desktop-results');

      function getCount(el) {
        const raw = el.textContent.trim().replace(/,/g, '');
        const count = parseInt(raw, 10);
        return count;
      }

      let startValue = getCount(span);
      let i = 0;

      const pollId = setInterval(() => {
        const c = getCount(span);
        if (c == startValue) {
          i++;

          if (i >= 10) {
            clearInterval(pollId);
            $('#mobile-filters-loading-link').hide();
            $('#mobile-filters-link').css('display', 'flex');
          }
        } else if (c != startValue) {
          startValue = c;
          i = 0;
        }
      }, 400);
    }

    H.onLoad(windowLoaded);
  });

  H.block(() => {
    $(document).ready(function () {
      function bindFilterToggle() {
        if ($(window).width() <= 991) {
          $('#mobile-filters-link')
            .off('click')
            .on('click', function (e) {
              e.preventDefault();
              $('.filters1_filters-wrapper').addClass('is-visible');
            });
          $('#mobile-search-submit')
            .off('click')
            .on('click', function () {
              $('.filters1_filters-wrapper').removeClass('is-visible');
            });
          $('#filters-mobile-close').on('click', function () {
            $('.filters1_filters-wrapper').removeClass('is-visible');
          });
        } else {
          $('#mobile-filters-link, #mobile-search-submit').off('click');
        }
      }
      bindFilterToggle();
      $(window).on('resize', bindFilterToggle);

      $(document).on('click', '.filters1_filter-group-heading', function () {
        $(this).siblings('.filters1_filter-options').toggleClass('is-open');
        $(this).find('.filters1_accordion-icon').toggleClass('is-open');
      });
    });
  });

  H.block(function () {
    const DEBUG = false;

    const path = location.pathname.replace(/\/$/, '') || '/';
    if (!/^\/used-cars\/near\/.+$/.test(path)) {
      DEBUG && console.log('[near-redirect] not a /near/ page, exiting');
      return;
    }

    const earlyParams = new URLSearchParams(location.search);
    if (earlyParams.has('cars_location_equal')) {
      earlyParams.delete('cars_location_equal');
      const cleanURL = location.pathname + (earlyParams.toString() ? '?' + earlyParams.toString() : '');
      location.replace(cleanURL);
      return;
    }

    window.addEventListener('pageshow', function (e) {
      if (e.persisted) {
        DEBUG && console.log('[near-redirect] bfcache restore, reloading');
        location.reload();
      }
    });

    const DEBOUNCE_MS = 200;
    const BASE_URL = location.origin + '/used-cars';
    const LOCATION_PARAM = 'cars_location_equal';
    const DATA_ATTR_ZERO = 'data-near-zero';

    let initialised = false;
    let submitBound = false;

    function isMobile() {
      return window.matchMedia('(max-width: 991px)').matches;
    }

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

      const locations = getCheckedLocationNames(entries);
      if (clickedName && locations.indexOf(clickedName) === -1) {
        locations.push(clickedName);
      }

      url.searchParams.set(LOCATION_PARAM, JSON.stringify(locations));

      const current = new URLSearchParams(location.search);
      current.forEach(function (val, key) {
        if (key === LOCATION_PARAM) return;
        url.searchParams.set(key, val);
      });

      return url.toString();
    }

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
        return;
      }

      e.stopImmediatePropagation();

      label.classList.add('is-list-active');
      if (entry.input) entry.input.checked = true;

      const redirectURL = buildRedirectURL(entry.name, entries);
      if (!redirectURL) return;

      DEBUG && console.log('[near-redirect] redirecting to:', redirectURL);
      location.href = redirectURL;
    }

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

      processLocationFilters(entries);

      group.addEventListener('click', function (e) {
        const currentEntries = getLocationEntries(group);
        handleClick(e, currentEntries);
      }, true);

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

    window.FinsweetAttributes = window.FinsweetAttributes || [];
    window.FinsweetAttributes.push([
      'list',
      function () {
        DEBUG && console.log('[near-redirect] Finsweet list ready');
        bootstrap();
      }
    ]);
  });

  H.block(() => {
    $('#vrm-search').on('input', function () {
      this.value = this.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    });
  });
})(window.jQuery);
