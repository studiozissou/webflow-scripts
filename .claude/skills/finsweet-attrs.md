# Skill: Finsweet Attributes v2

## CDN — single script, one tag for all list features
```html
<script async type="module"
  src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js"
  fs-list>
</script>
```
- `async type="module"` — replaces v1's `defer` scripts
- `fs-list` attribute activates all list features (filter, load, sort, nest) from one script
- Load in Webflow **Site Settings > Head Code** (not footer — needs to be available early)

> **v1 → v2 changes**
> - One CDN script replaces four separate v1 scripts
> - Attribute prefix: `fs-cmsfilter-*` / `fs-cmsload-*` / `fs-cmssort-*` / `fs-cmsnest-*` → all now `fs-list-*`
> - Global API: `window.fsAttributes` → `window.FinsweetAttributes`
> - Init pattern: `||=` instead of `|| []`

---

## JS API hook (global, run after attribute loads)
```js
window.FinsweetAttributes ||= [];
window.FinsweetAttributes.push([
  'list',
  (result) => {
    // result = FinsweetAttributeControls for the list attribute
    // result.loading — Promise that resolves when fully loaded
    // result.restart() — destroy + reload
    // result.destroy() — tear down
    console.log('Finsweet list ready', result);
  },
]);
```

---

## List Filter (`fs-list-element="filters"`)

### HTML attributes
```html
<!-- Filter form wrapper -->
<div fs-list-element="filters">

  <!-- Checkbox filter -->
  <input type="checkbox" fs-list-field="category" fs-list-value="design">

  <!-- Text search -->
  <input type="text" fs-list-field="name" fs-list-debounce="200">

  <!-- Range (from/to on same field) -->
  <input type="range" fs-list-field="price" fs-list-range="from">
  <input type="range" fs-list-field="price" fs-list-range="to">

  <!-- Reset -->
  <button fs-list-element="clear">Clear all</button>
</div>

<!-- Collection List wrapper -->
<div fs-list-element="list">
  <div class="w-dyn-list">
    <div class="w-dyn-items">
      <!-- Each item — field value read from text content -->
      <div class="w-dyn-item">
        <div fs-list-field="category">Design</div>
      </div>
    </div>
  </div>
</div>

<!-- Display elements -->
<span fs-list-element="results-count"></span>  <!-- filtered count -->
<span fs-list-element="items-count"></span>    <!-- total count -->
<div  fs-list-element="empty">No results</div> <!-- empty state -->

<!-- Active filter tags -->
<div fs-list-element="tag">
  <span fs-list-element="tag-field"></span>: <span fs-list-element="tag-value"></span>
  <button fs-list-element="tag-remove">✕</button>
</div>
```

### Optional filter settings (on `fs-list-element="list"`)
| Attribute | Values | Purpose |
|---|---|---|
| `fs-list-activeclass` | class name | Applied to active filter inputs |
| `fs-list-highlight` | `"true"` | Highlight matching search terms |
| `fs-list-showquery` | `"true"` | Sync filters to URL query params |
| `fs-list-operator` | `contain` `equal` `greater` `less` | Comparison logic |
| `fs-list-fieldtype` | `"number"` `"date"` | Enable numeric/date comparison |
| `fs-list-fuzzy` | `0`–`100` | Fuzzy search threshold |
| `fs-list-filteron` | `"change"` `"submit"` | When filtering triggers |
| `fs-list-filtermatch` | `"and"` | Require all selected values |
| `fs-list-conditionsmatch` | `"or"` | Logic between filter fields |

---

## List Load (`fs-list-load`)

```html
<!-- Load More -->
<div fs-list-element="list" fs-list-load="more" fs-list-loadcount="6">
  ...
</div>
<a fs-list-element="loader">Load more</a>

<!-- Infinite scroll -->
<div fs-list-element="list" fs-list-load="infinite" fs-list-threshold="-20">
  ...
</div>

<!-- Pagination -->
<div fs-list-element="list" fs-list-load="pagination"
     fs-list-pagesiblings="2" fs-list-pageboundary="1">
  ...
</div>

<!-- Count displays -->
<span fs-list-element="visible-count"></span>
<span fs-list-element="visible-count-from"></span> – <span fs-list-element="visible-count-to"></span>
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

---

## List Sort (`fs-list-element="sort-trigger"`)

```html
<div fs-list-element="list">
  <div class="w-dyn-items">
    <div class="w-dyn-item">
      <!-- Field to sort by — value read from text content -->
      <div fs-list-field="name">Project Title</div>
      <div fs-list-field="date" fs-list-fieldtype="date">2024-01-15</div>
    </div>
  </div>
</div>

<!-- Select trigger -->
<select fs-list-element="sort-trigger">
  <option value="name-asc">Name A–Z</option>
  <option value="name-desc">Name Z–A</option>
  <option value="date-desc">Newest</option>
</select>

<!-- Or link/button triggers (for custom UI) -->
<a fs-list-element="sort-trigger" fs-list-field="name-asc">Name ↑</a>
<a fs-list-element="sort-trigger" fs-list-field="name-desc">Name ↓</a>
```

| Attribute | Values | Purpose |
|---|---|---|
| `fs-list-fieldtype` | `"date"` `"number"` | Enable date/numeric sort |
| `fs-list-reverse` | `"true"` | Invert default direction |
| `fs-list-ascclass` | class name | Applied when sort is ascending |
| `fs-list-descclass` | class name | Applied when sort is descending |
| `fs-list-duration` | ms | Sort animation duration |

---

## List Nest (`fs-list-element="nest-target"`)

```html
<!-- Target page: parent collection list -->
<div fs-list-element="list">
  <div class="w-dyn-items">
    <div class="w-dyn-item">
      <h2>Parent item</h2>
      <!-- Nested child list injected here -->
      <div fs-list-element="nest-target" fs-list-nest="child-projects"></div>
    </div>
  </div>
</div>

<!-- Template page: child collection list wrapper -->
<div class="w-dyn-list"
     fs-list-element="wrapper"
     fs-list-instance="child-projects">
  ...
</div>
```

| Attribute | Values | Purpose |
|---|---|---|
| `fs-list-nest` | identifier | Connects nest-target to template instance |
| `fs-list-instance` | identifier | Must match `fs-list-nest` value |
| `fs-list-cache` | `"false"` | Disable caching of fetched pages |

---

## Combining Filter + Load (important)
Filter and Load share the same `fs-list-element="list"` wrapper — add both attributes to the same element:
```html
<div fs-list-element="list" fs-list-load="more" fs-list-loadcount="9">
  ...
</div>
```

## GSAP integration
Re-run animations and refresh ScrollTrigger after list renders:
```js
window.FinsweetAttributes ||= [];
window.FinsweetAttributes.push([
  'list',
  async (listInstance) => {
    await listInstance.loading;
    // Hook into render events via the resolved API
    // Then refresh GSAP:
    ScrollTrigger.refresh();
  },
]);
```

For re-animating newly loaded items, trigger on DOM mutation with `MutationObserver` on the list wrapper as a safe fallback:
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

## Common gotchas
- v2 uses `async type="module"` — do not add `defer` (incompatible with module scripts)
- All four list solutions (filter, load, sort, nest) use the single `fs-list` script — no need for separate script tags
- Attribute prefix is now uniformly `fs-list-*` — v1's `fs-cmsfilter-*` etc. will not work
- `fs-list-element="empty"` (v2) replaces v1's `fs-list-element="empty-state"`
- Nest only works on published Webflow sites — does not preview in the Designer
- Multi-instance support: add `fs-list-instance="unique-id"` to isolate multiple lists on the same page
