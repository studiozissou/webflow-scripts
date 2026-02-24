# Skill: Webflow Embeds

## Types of custom code placement in Webflow

### Site-wide (all pages)
- **Site Settings > Custom Code > Head** — scripts/styles loaded on every page, before `</head>`
- **Site Settings > Custom Code > Footer** — scripts loaded before `</body>` on every page

### Per-page
- **Page Settings > Custom Code > Head** — overrides/additions for a single page
- **Page Settings > Custom Code > Footer** — page-specific scripts

### In-canvas (Embed element)
- Drag an Embed component from the Add panel
- Use for: in-flow HTML, small JS snippets, third-party widgets, JSON-LD schemas
- Runs after Webflow's JS — good for CMS-driven data

## CDN loading order (Site Settings Head)
```html
<!-- 1. Styles first -->
<link rel="stylesheet" href="your-styles.css">

<!-- 2. Core libs (defer so they don't block render) -->
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@barba/core"></script>
<script defer src="https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js"></script>

<!-- 3. Finsweet (must be defer) -->
<script defer src="https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsfilter@1/cmsfilter.js"></script>
```

## Site Footer (orchestrator)
```html
<script src="https://cdn.jsdelivr.net/gh/your-org/webflow-scripts/projects/client/orchestrator.js"></script>
```

## CMS Collection page embed (dynamic data)
```html
<!-- Embed inside a CMS Collection List Item -->
<script>
  // Access Webflow CMS field values via data attributes set on the item
  const price = document.currentScript.closest('[data-price]')?.dataset.price;
</script>
```

## Passing CMS data to JS (anti-pattern to avoid)
Do NOT do: `<script>var title = "{{wf {&quot;path&quot;:&quot;name&quot;...}}}"</script>`

DO instead: Use data attributes on elements:
```html
<!-- In Webflow Designer, add custom attribute -->
<!-- data-price → bind to Price field -->
<div class="item" data-price="{{price}}" data-slug="{{slug}}">
```
Then read in JS: `el.dataset.price`

## Webflow page namespace (for Barba)
Add a custom attribute to the `<body>` tag via Page Settings:
- Attribute: `data-barba`
- Value: `wrapper`

Add on the page container div:
- Attribute: `data-barba-namespace`
- Value: `home` (or page slug)

## Common gotchas
- Webflow re-renders Embed code on every publish — keep embeds minimal
- `defer` scripts execute after DOM is ready — no need for DOMContentLoaded wrapper if using defer
- Webflow's own `webflow.js` runs interactions (IX2) — can conflict with GSAP on same elements
- Use `display: none` + JS-driven show to avoid FOUC for JS-dependent elements
- Webflow Designer preview does NOT run custom JS — test on staging/published site
