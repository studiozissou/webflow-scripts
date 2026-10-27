# Carsa

Custom JavaScript for www.carsa.co.uk, moving out of Webflow page settings into versioned files served from Carsa's CloudFront.

## How it loads

The Webflow site footer holds one tag:

```html
<script src="https://{WEBFLOW_SCRIPTS_CDN}/webflow/v1.0.0/init.js"></script>
```

`v1.1.0` adds `check-finance.js` and `vdp.js`. `v1.2.0` moves every remaining inline page script into the modules below. The tag moves to each once published.

`init.js` works out its folder from its own `src`, waits for Webflow's jQuery and GSAP (up to 3 s), then appends `global.js`, `check-finance.js` and the current route's modules as ordered scripts from that same folder.

| Route | Modules |
|---|---|
| every page | `global.js`, `check-finance.js` |
| `/vehicles/*` | `vdp.js`, `battery-animation.js`, `at-price-total.js` |
| every page except `/vehicles/*` | `animations.js`, `valuation-links.js`, `equal-height.js`, `faq-schema.js` |
| `/used-cars/near/<slug>` | `near.js` |
| `/car-finance-calculator` | `finance-calculator.js` |
| `/get-started` | `get-started.js` |
| `/faq` | `faq.js` |
| `/used-cars/models/<slug>` | `models-template.js` (reads `window.__CARSA_MODELS`) |
| `/used-cars/fuel/<slug>` | `fuel-template.js` (reads `window.__CARSA_FUEL`) |
| `/used-cars/promotions/<slug>` | `promotions-template.js` (reads `window.__CARSA_PROMO`) |
| `/used-cars/models` | `all-models.js` |
| `/blog` | `blog.js` |
| `/car-redirect` | `car-redirect.js` |

Every regex is anchored (`^…$` or `^…/[^/]+/?$`), so `/car-finance` never picks up the calculator and `/used-cars/models` never picks up the template.

### Why the v1.2.0 modules wait for a page marker

A module running beside its inline copy would double-run the homepage dropdown, the FAQ schema and the draw-line timelines. So every v1.2.0 module returns early unless the page body sets `window.__CARSA_PAGE = { release: 'v1.2.0' }`, which is pasted in the same write that strips that page's inline code. The 404 redirect in `global.js` uses the same gate. A module that passes the gate pushes its name to `window.__CARSA_RAN`, so tests can tell "loaded and inert" from "loaded and ran".

### Why the shared modules carry path lists

Draw-line, draw-shapes, valuation links, the FAQ-mini schema and both equal-height variants were pasted on some pages only. Each block keeps a list of the paths (and CMS template prefixes) it was on, so marking a page never gives it behaviour it did not have. A new page that should animate needs its path added. Draw-shapes also runs wherever `#404-message` exists, because the 404 page keeps the failed URL as its path.

Routes are added as each page's inline code is removed from Webflow. `vdp.js` comes first on the VDP because its code was inline in the page body, which ran before the two footer modules. It reads its CMS values from `window.__CARSA_VDP`, normalising every key to a string (missing keys become `''`) so one drifted config field cannot stop the blocks after it, warns through Datadog when the object is missing entirely, and uses the same `onReady` / `onLoad` helpers as `global.js`.

### Why `check-finance.js` loads everywhere

The homepage has finance cards but never had the handler. The handler delegates from `document.body`, so it is a no-op on pages without cards and also covers cards the search widget injects later. Running alongside a leftover inline copy is safe because both guard on `dataset.originalHref`.

### Why the footer, not the head

Webflow injects jQuery, `webflow.js` and GSAP at the end of `<body>`, before footer custom code. The migrated code calls `$` and `gsap` at top level, so a head loader would throw.

### Why `global.js` wraps each block

Each former inline `<script>` runs inside `block()`, which catches errors and rethrows them asynchronously. One broken block cannot stop the others, which matches how separate inline tags behaved, and the error still reaches the console.

Loader-appended scripts can run after `DOMContentLoaded` or `load` has fired, so blocks that waited for those events use `onReady` / `onLoad`, which run at once if the event has passed. Otherwise the blocks are the live footer code copied as-is, with two agreed fixes:

- **External link `rel`**: the live block was `type="fs-consent"`, so its `DOMContentLoaded` listener never fired. It now runs on ready.
- **Copyright year**: the live block threw on pages without `#year`. It now checks first.

The chat widget's `import` became a dynamic `import()` so `global.js` stays a classic script. The slider and chat CSS stay in the Webflow footer.

### Why classic scripts

Phases 1 and 2 copy live code 1:1 behind a baseline test suite. ES modules change scope and timing, so conversion waits for the refactor phase.

## Releases

A release is a git tag `carsa-vX.Y.Z`. Copy it into Carsa's repo with:

```
node tools/carsa/release.js v1.0.0 ~/carsa-website-support
```

This reads every file in `RELEASE_FILES` (`tools/carsa/release.js`) from the tag (not the working tree) into `webflow/releases/v1.0.0/`, and refuses to overwrite an existing folder. Carsa's existing `CarouselStack` distribution serves every folder from `/webflow/vX.Y.Z/` with `immutable` caching and never purges old ones, because the previous folder is the rollback target.

## Local development

Run `/local`, then open any page with `?carsa=local` (add `&carsa-port=8081` for another port). The loader only honours the switch when its `<script>` tag carries `data-allow-local`, which the live footer never has: add the attribute with a DevTools HTML override, or publish it to the staging domain only. The choice lasts for the browser session (`sessionStorage`) or until `?carsa=cdn`.

## Tests

- Unit: `npm run test:carsa` (every `projects/carsa/tests/*.test.js` plus the release tool).
- Acceptance: `npm run test:sz:acceptance -- carsa-code-migration` against live, or `STAGING_URL_CARSA=https://carsa-v2.webflow.io` for staging. Set `CARSA_PHASE1=1` once the loader is in the footer: this runs the loader guards and expects the two fixed live bugs to stay fixed.

## Rollback

Point the footer tag at the previous version folder and publish. Before the first release, restore the captured footer from the rollback copies.
