# Carsa

Custom JavaScript for www.carsa.co.uk, moving out of Webflow page settings into versioned files served from Carsa's CloudFront.

## How it loads

The Webflow site footer holds one tag:

```html
<script src="https://{WEBFLOW_SCRIPTS_CDN}/webflow/v1.0.0/init.js"></script>
```

`init.js` works out its folder from its own `src`, waits for Webflow's jQuery and GSAP (up to 3 s), then appends `global.js` and the current route's modules as ordered scripts from that same folder.

| Route | Modules |
|---|---|
| every page | `global.js` |
| `/vehicles/*` | `battery-animation.js`, `at-price-total.js` |

Routes are added as each page's inline code is removed from Webflow.

### Why the footer, not the head

Webflow injects jQuery, `webflow.js` and GSAP at the end of `<body>`, before footer custom code. The migrated code calls `$` and `gsap` at top level, so a head loader would throw.

### Why `global.js` wraps each block

Each former inline `<script>` runs inside `block()`, which catches errors and rethrows them asynchronously. One broken block cannot stop the others, which matches how separate inline tags behaved, and the error still reaches the console.

Scripts appended by a loader can run after `DOMContentLoaded` or `load` has fired. Blocks that waited for those events use `onReady` / `onLoad`, which run immediately if the event has already passed. Apart from that, the blocks are the live footer code copied as-is, with two agreed fixes:

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

This reads `init.js`, `global.js`, `battery-animation.js` and `at-price-total.js` from the tag (not the working tree) into `webflow/releases/v1.0.0/`, and refuses to overwrite an existing folder. Carsa's `WebflowStack` serves every folder with `immutable` caching and never purges old ones, because the previous folder is the rollback target.

## Local development

Run `/local`, then open any page with `?carsa=local` (add `&carsa-port=8081` for another port). The choice persists in `localStorage` until `?carsa=cdn`.

## Tests

- Unit: `npm run test:carsa` (loader, `global.js`, release tool, AutoTrader price total).
- Acceptance: `npm run test:sz:acceptance -- carsa-code-migration` against live, or `STAGING_URL_CARSA=https://carsa-v2.webflow.io` for staging. Set `CARSA_PHASE1=1` once the loader is in the footer: this runs the loader guards and expects the two fixed live bugs to stay fixed.

## Rollback

Point the footer tag at the previous version folder and publish. Before the first release, restore the captured footer from the rollback copies.
