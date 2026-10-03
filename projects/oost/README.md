# Oost — hosted scripts

Scripts for Restaurant Oost (Haarlem), served from this repo through jsDelivr. Vanilla JS, no build step.

## How it loads

Webflow has one script tag, in the site footer:

```html
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@oost-v0.2.0/projects/oost/init.js" data-allow-local></script>
```

`init.js` reads its own URL, so every module comes from the same pinned tag. It appends, in order:

1. Lenis stylesheet and script (pinned npm version on jsDelivr)
2. the global modules (`smooth-scroll.js`, `utils.js`, `faq-accordion.js`)
3. any per-route modules from `ROUTES` (none yet)

Dynamic scripts are added with `async = false`, which makes the browser execute them in insertion order, so a module can rely on the dependencies listed before it without polling.

## Why a loader

Webflow custom code is limited and hard to review. One tag pointing at a git tag keeps the site on a known version, makes rollback a tag change, and lets new modules ship without touching Webflow.

## Modules

| File | Does |
|---|---|
| `smooth-scroll.js` | Starts Lenis with `anchors: true`, so `#menukaart` and `#offerte` links scroll smoothly. Skipped when the visitor prefers reduced motion or when Lenis failed to load. Exposes `window.OOST.lenis`; call `stop()` before opening an overlay and `start()` after. |
| `utils.js` | Sets `rel="noreferrer noopener"` on every `target="_blank"` link, writes the current year into `#year`, and adds hidden `Conversion Page` (the URL without `utm_` parameters) and `utm_*` fields to every form so Webflow form submissions carry their source. Moved out of the Webflow footer code so all site scripts ship through the loader and one tag. |
| `faq-accordion.js` | On pages with a `.faq_list`, closes every FAQ `details` except the first and sets `html.faq-ready`. It animates open (400 ms) and close (300 ms) with the Web Animations API, on the same `cubic-bezier(0.22, 1, 0.36, 1)` curve as the chevron. A click mid-animation reverses from the current height. Reduced motion and browser-driven toggles (find-in-page) stay native and instant. Exposes `window.OOST.faq.init(root)` / `destroy()`. Each bound `details` carries `data-faq-bound`, so a second `init` does nothing. |

Add a module by dropping a file in this folder, adding it to `GLOBAL_MODULES` or a `ROUTES` entry in `init.js`, and adding a test in `tests/oost/`.

## FAQ accordion

The FAQ lists are Webflow Collection Lists on the `FAQ` collection. Every template item has a static `open` attribute and carries FAQPage microdata. So the Designer canvas, visitors without JS and crawlers all see every answer in plain HTML.

- **Native `details` plus the Web Animations API.** `details`/`summary` bring keyboard, screen-reader and find-in-page support for free. The script only adds motion. The Web Animations API is built into the browser, needs no GSAP, and lets a click cancel and reverse mid-animation. CSS-only `::details-content` transitions snap in Safari, iOS and Firefox, and Webflow Interactions can't target one CMS item at a time.
- **Flash guard.** Every item ships open, so the page would show every answer until the script closes them. A tiny inline script in the site head adds `html.faq-js`. While `faq-ready` is missing, head CSS hides every answer except the first. The script adds `faq-ready` once it has closed the extra items. The head snippet also adds it after 3 s, so if `faq-accordion.js` fails to load, every answer shows open instead of staying hidden. The Designer runs neither, so the canvas shows every answer.
- **Head code.** The flash-guard snippet, the guard CSS and the 400 ms chevron transition come from the build tooling in the private repo (`webflow_css.py --mode complex`, `webflow_head.py`). They sit between the `oost:complex-css` and `oost:faq-guard` markers.
- **Chevron.** The chevron follows `[open]`, but `open` is only removed when the close animation ends. So the script adds `is-closing` to the `details` for the whole close, and head CSS turns the chevron back while that class is present. The chevron then moves with the height instead of 300 ms late. Under reduced motion the chevron transition is off.
- **Webflow quirk.** Webflow drops an empty `open` attribute on publish, so the template `details` uses `open="open"`.

## Deploying

1. Bump `VERSION` in `init.js` (format `YYYY.M.D.N`).
2. Commit, push, tag `oost-vX.Y.Z`, push the tag.
3. Change the tag in the Webflow footer script and publish.

jsDelivr caches a tag for good, so a new tag per deploy is the cache-bust.

## Local dev

Serve the repo root on `https://localhost:8080`, open the staging site with `?oost=local`, and the loader pulls modules from your machine for the rest of the browser session. `?oost=cdn` switches back. The switch only works while the tag carries `data-allow-local`; remove that attribute at launch.

## Tests

`npm run test:oost` runs the section validator tests and the loader and module tests, all in `tests/oost/`. They run the real files in a `vm` sandbox with a stub document, so they need no browser.
