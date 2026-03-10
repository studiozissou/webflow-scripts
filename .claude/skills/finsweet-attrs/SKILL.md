---
name: finsweet-attrs
description: Guides the agent through Finsweet Attributes v2 for Webflow CMS — filtering, load more, sorting, nesting, and GSAP integration. Activates when the task involves CMS filtering, pagination, sorting, or Finsweet attributes.
---

<objective>
Implement Finsweet Attributes v2 for Webflow CMS lists — filtering, load more/pagination, sorting, and nesting — with proper GSAP integration and JS API hooks.
</objective>

<quick_start>
CDN — single script for all list features:
```html
<script async type="module"
  src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js"
  fs-list>
</script>
```
- `async type="module"` replaces v1's `defer` scripts
- `fs-list` attribute activates all list features (filter, load, sort, nest) from one script
- Load in Webflow Site Settings > Head Code (not footer)

JS API hook:
```js
window.FinsweetAttributes ||= [];
window.FinsweetAttributes.push([
  'list',
  (result) => {
    // result.loading — Promise that resolves when fully loaded
    // result.restart() — destroy + reload
    // result.destroy() — tear down
  },
]);
```

v1 to v2 migration:
- One CDN script replaces four separate v1 scripts
- Attribute prefix: `fs-cmsfilter-*` / `fs-cmsload-*` / `fs-cmssort-*` / `fs-cmsnest-*` all become `fs-list-*`
- Global API: `window.fsAttributes` becomes `window.FinsweetAttributes`
- Init pattern: `||=` instead of `|| []`
</quick_start>

<common_patterns>
List Filter (`fs-list-element="filters"`):
```html
<div fs-list-element="filters">
  <input type="checkbox" fs-list-field="category" fs-list-value="design">
  <input type="text" fs-list-field="name" fs-list-debounce="200">
  <input type="range" fs-list-field="price" fs-list-range="from">
  <input type="range" fs-list-field="price" fs-list-range="to">
  <button fs-list-element="clear">Clear all</button>
</div>

<div fs-list-element="list">
  <div class="w-dyn-list">
    <div class="w-dyn-items">
      <div class="w-dyn-item">
        <div fs-list-field="category">Design</div>
      </div>
    </div>
  </div>
</div>

<span fs-list-element="results-count"></span>
<span fs-list-element="items-count"></span>
<div fs-list-element="empty">No results</div>

<div fs-list-element="tag">
  <span fs-list-element="tag-field"></span>: <span fs-list-element="tag-value"></span>
  <button fs-list-element="tag-remove">x</button>
</div>
```

Filter settings (on `fs-list-element="list"`):

| Attribute | Values | Purpose |
|---|---|---|
| `fs-list-activeclass` | class name | Applied to active filter inputs |
| `fs-list-highlight` | `"true"` | Highlight matching search terms |
| `fs-list-showquery` | `"true"` | Sync filters to URL query params |
| `fs-list-operator` | `contain` `equal` `greater` `less` | Comparison logic |
| `fs-list-fieldtype` | `"number"` `"date"` | Enable numeric/date comparison |
| `fs-list-fuzzy` | `0`-`100` | Fuzzy search threshold |
| `fs-list-filteron` | `"change"` `"submit"` | When filtering triggers |
| `fs-list-filtermatch` | `"and"` | Require all selected values |
| `fs-list-conditionsmatch` | `"or"` | Logic between filter fields |

List Load:
```html
<!-- Load More -->
<div fs-list-element="list" fs-list-load="more" fs-list-loadcount="6">...</div>
<a fs-list-element="loader">Load more</a>

<!-- Infinite scroll -->
<div fs-list-element="list" fs-list-load="infinite" fs-list-threshold="-20">...</div>

<!-- Pagination -->
<div fs-list-element="list" fs-list-load="pagination"
     fs-list-pagesiblings="2" fs-list-pageboundary="1">...</div>

<span fs-list-element="visible-count"></span>
<span fs-list-element="visible-count-from"></span> - <span fs-list-element="visible-count-to"></span>
<span fs-list-element="page-count"></span>
```

| Attribute | Values | Purpose |
|---|---|---|
| `fs-list-load` | `more` `all` `infinite` `pagination` | Load mode |
| `fs-list-loadcount` | number | Items per load |
| `fs-list-threshold` | number (px) | Infinite scroll trigger offset |
| `fs-list-stagger` | ms | Animation stagger between items |
| `fs-list-itemsperpage` | number | Override Webflow's 100-item CMS limit |
| `fs-list-resetix` | `"true"` | Re-fire Webflow interactions on new items |
| `fs-list-showquery` | `"true"` | Persist page in URL |

List Sort (`fs-list-element="sort-trigger"`):
```html
<select fs-list-element="sort-trigger">
  <option value="name-asc">Name A-Z</option>
  <option value="name-desc">Name Z-A</option>
  <option value="date-desc">Newest</option>
</select>

<!-- Or link/button triggers -->
<a fs-list-element="sort-trigger" fs-list-field="name-asc">Name up</a>
<a fs-list-element="sort-trigger" fs-list-field="name-desc">Name down</a>
```

| Attribute | Values | Purpose |
|---|---|---|
| `fs-list-fieldtype` | `"date"` `"number"` | Enable date/numeric sort |
| `fs-list-reverse` | `"true"` | Invert default direction |
| `fs-list-ascclass` | class name | Applied when sort is ascending |
| `fs-list-descclass` | class name | Applied when sort is descending |
| `fs-list-duration` | ms | Sort animation duration |

List Nest (`fs-list-element="nest-target"`):
```html
<div fs-list-element="list">
  <div class="w-dyn-items">
    <div class="w-dyn-item">
      <h2>Parent item</h2>
      <div fs-list-element="nest-target" fs-list-nest="child-projects"></div>
    </div>
  </div>
</div>

<div class="w-dyn-list"
     fs-list-element="wrapper"
     fs-list-instance="child-projects">...</div>
```

Combining Filter + Load — both attributes go on the same element:
```html
<div fs-list-element="list" fs-list-load="more" fs-list-loadcount="9">...</div>
```

GSAP integration — refresh ScrollTrigger after list renders:
```js
window.FinsweetAttributes ||= [];
window.FinsweetAttributes.push([
  'list',
  async (listInstance) => {
    await listInstance.loading;
    ScrollTrigger.refresh();
  },
]);
```

Re-animating newly loaded items:
```js
const listEl = document.querySelector('[fs-list-element="list"]');
const mo = new MutationObserver(() => {
  gsap.from(listEl.querySelectorAll('.w-dyn-item:not(.fs-animated)'), {
    opacity: 0, y: 20, stagger: 0.06, duration: 0.4,
    onStart() { this.targets().forEach(el => el.classList.add('fs-animated')); }
  });
  ScrollTrigger.refresh();
});
mo.observe(listEl, { childList: true, subtree: true });
```
</common_patterns>

<anti_patterns>
- v2 uses `async type="module"` — do not add `defer` (incompatible with module scripts)
- All four list solutions use the single `fs-list` script — no need for separate script tags
- Attribute prefix is now uniformly `fs-list-*` — v1's `fs-cmsfilter-*` etc. will not work
- `fs-list-element="empty"` (v2) replaces v1's `fs-list-element="empty-state"`
- Nest only works on published Webflow sites — does not preview in the Designer
- Multi-instance support: add `fs-list-instance="unique-id"` to isolate multiple lists on the same page
</anti_patterns>

<success_criteria>
- Single `fs-list` script tag with `async type="module"` in Site Settings Head
- All attributes use v2 `fs-list-*` prefix (no v1 `fs-cmsfilter-*`)
- `window.FinsweetAttributes ||=` used (not `window.fsAttributes`)
- Filter, load, and sort share the same `fs-list-element="list"` wrapper
- `ScrollTrigger.refresh()` called after list renders
- Empty state element shows when no results match filters
</success_criteria>
