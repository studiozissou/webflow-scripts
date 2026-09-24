# Oost — hosted scripts

Scripts for Restaurant Oost (Haarlem), served from this repo through jsDelivr. Vanilla JS, no build step.

## How it loads

Webflow has one script tag, in the site footer:

```html
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@oost-v0.1.0/projects/oost/init.js" data-allow-local></script>
```

`init.js` reads its own URL, so every module comes from the same pinned tag. It appends, in order:

1. Lenis stylesheet and script (pinned npm version on jsDelivr)
2. the global modules (`smooth-scroll.js`)
3. any per-route modules from `ROUTES` (none yet)

Dynamic scripts are added with `async = false`, which makes the browser execute them in insertion order, so a module can rely on the dependencies listed before it without polling.

## Why a loader

Webflow custom code is limited and hard to review. One tag pointing at a git tag keeps the site on a known version, makes rollback a tag change, and lets new modules ship without touching Webflow.

## Modules

| File | Does |
|---|---|
| `smooth-scroll.js` | Starts Lenis with `anchors: true`, so `#menukaart` and `#offerte` links scroll smoothly. Skipped when the visitor prefers reduced motion or when Lenis failed to load. Exposes `window.OOST.lenis`; call `stop()` before opening an overlay and `start()` after. |

Add a module by dropping a file in this folder, adding it to `GLOBAL_MODULES` or a `ROUTES` entry in `init.js`, and adding a test in `tests/oost/`.

## Deploying

1. Bump `VERSION` in `init.js` (format `YYYY.M.D.N`).
2. Commit, push, tag `oost-vX.Y.Z`, push the tag.
3. Change the tag in the Webflow footer script and publish.

jsDelivr caches a tag for good, so a new tag per deploy is the cache-bust.

## Local dev

Serve the repo root on `https://localhost:8080`, open the staging site with `?oost=local`, and the loader pulls modules from your machine for the rest of the browser session. `?oost=cdn` switches back. The switch only works while the tag carries `data-allow-local`; remove that attribute at launch.

## Tests

`npm run test:oost` runs the section validator tests and the loader and module tests, all in `tests/oost/`. They run the real files in a `vm` sandbox with a stub document, so they need no browser.
