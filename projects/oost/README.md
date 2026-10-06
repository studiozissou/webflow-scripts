# Oost — hosted scripts

Scripts for Restaurant Oost (Haarlem), served from this repo through jsDelivr. Vanilla JS, no build step.

## How it loads

Webflow has one script tag, in the site footer:

<!-- prettier-ignore -->
```html
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@oost-v0.3.0/projects/oost/init.js" defer data-allow-local></script>
```

`init.js` reads its own URL, so every module comes from the same pinned tag. It appends, in order:

1. the Lenis script (pinned npm version on jsDelivr)
2. the global modules (`smooth-scroll.js`, `utils.js`, `zenchef.js`)
3. any per-route modules from `ROUTES` (none yet)

Dynamic scripts are added with `async = false`, which makes the browser execute them in insertion order, so a module can rely on the dependencies listed before it without polling.

The tag carries `defer`, so it never blocks rendering. `document.currentScript` still works in deferred classic scripts. The loader appends no stylesheet: `smooth-scroll.js` inlines Lenis's few CSS rules as `<style id="oost-lenis-css">`, and only when Lenis actually starts.

## Why a loader

Webflow custom code is limited and hard to review. One tag pointing at a git tag keeps the site on a known version, makes rollback a tag change, and lets new modules ship without touching Webflow.

## Modules

| File               | Does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `smooth-scroll.js` | Starts Lenis with `anchors: true`, so `#menukaart` and `#offerte` links scroll smoothly. Skipped when the visitor prefers reduced motion or when Lenis failed to load. Exposes `window.OOST.lenis`; call `stop()` before opening an overlay and `start()` after.                                                                                                                                                                                                                                                  |
| `utils.js`         | Sets `rel="noreferrer noopener"` on every `target="_blank"` link, writes the current year into `#year`, and adds hidden `Conversion Page` (the URL without `utm_` parameters) and `utm_*` fields to every form so Webflow form submissions carry their source. Moved out of the Webflow footer code so all site scripts ship through the loader and one tag.                                                                                                                                                      |
| `zenchef.js`       | Owns the Zenchef booking SDK. Turns every `data-formitable="open"` or `data-zc-action="open"` button into a widget trigger. Loads the SDK after `load` + 2 s idle, or on the first hover, touch or focus of a Reserveer button, whichever comes first. A tap before the widget is ready shows `is-loading` and `aria-busy`, then opens the widget when it signals ready. After 8 s, or if the SDK fails, it sends the visitor to the bookings page (same tab, so popup blockers can't stop it). Never auto-opens. |

Add a module by dropping a file in this folder, adding it to `GLOBAL_MODULES` or a `ROUTES` entry in `init.js`, and adding a test in `tests/oost/`.

## Why Zenchef is lazy

PageSpeed Insights on 3 Oct 2026 scored the home page 20 on mobile. A local Lighthouse run gave LCP 14.6 s and CLS 0.29. The eager Zenchef snippet pulled 1.47 MB (bookings iframe, captcha, SDK) before LCP, and `data-open="2000"` auto-opened the widget, causing most of the layout shift.

The Reserveer buttons were also never wired to Zenchef: they carried `data-formitable="open"`, which the SDK ignores. `zenchef.js` adds `data-zc-action="open"` so they work.

The SDK's iframe drops any `open` sent before it posts `widget-listening`, so an early tap waits for that message, not for the script's `onload`.

Lenis keeps running while the widget is open. The SDK gives no close signal: closing via its X sends no close message or event, only a height change. Stopping Lenis on open could leave the page unscrollable.

## Deploying

1. Bump `VERSION` in `init.js` (format `YYYY.M.D.N`).
2. Commit, push, tag `oost-vX.Y.Z`, push the tag.
3. Change the tag in the Webflow footer script and publish.

jsDelivr caches a tag for good, so a new tag per deploy is the cache-bust.

### Webflow (once `oost-v0.3.0` is live)

Site settings, footer code:

- Remove the inline Zenchef SDK snippet, but keep the `.zc-widget-config` div.
- Remove `data-open="2000"` from that div.
- Add `defer` to the `init.js` tag and point it at the new tag.
- Optional: rename `data-formitable="open"` to `data-zc-action="open"` on the Nav and hero buttons. The JS handles both.

## Local dev

Serve the repo root on `https://localhost:8080`, open the staging site with `?oost=local`, and the loader pulls modules from your machine for the rest of the browser session. `?oost=cdn` switches back. The switch only works while the tag carries `data-allow-local`; remove that attribute at launch.

## Tests

`npm run test:oost` runs the section validator tests and the loader and module tests, all in `tests/oost/`. They run the real files in a `vm` sandbox with a stub document, so they need no browser.
