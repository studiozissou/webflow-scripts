# Oost — hosted scripts

Scripts for Restaurant Oost (Haarlem), served from this repo through jsDelivr. Vanilla JS, no build step.

## How it loads

Webflow has one script tag, in the site footer:

<!-- prettier-ignore -->
```html
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@oost-v0.4.1/projects/oost/init.js" defer data-allow-local></script>
```

`init.js` reads its own URL, so every module comes from the same pinned tag. It appends, in order:

1. the Lenis script (pinned npm version on jsDelivr)
2. the global modules (`smooth-scroll.js`, `utils.js`, `faq-accordion.js`, `zenchef.js`)
3. any per-route modules from `ROUTES` (none yet)

Dynamic scripts are added with `async = false`, which makes the browser execute them in insertion order, so a module can rely on the dependencies listed before it without polling.

The tag carries `defer`, so it never blocks rendering. `document.currentScript` still works in deferred classic scripts. The loader appends no stylesheet: `smooth-scroll.js` inlines Lenis's few CSS rules as `<style id="oost-lenis-css">`, and only when Lenis actually starts.

## Why a loader

Webflow custom code is limited and hard to review. One tag pointing at a git tag keeps the site on a known version, makes rollback a tag change, and lets new modules ship without touching Webflow.

## Modules

| File               | Does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `smooth-scroll.js` | Starts Lenis with `anchors: true`, so `#menukaart` and `#offerte` links scroll smoothly. Skipped when the visitor prefers reduced motion or when Lenis failed to load. Exposes `window.OOST.lenis`; call `stop()` before opening an overlay and `start()` after.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `utils.js`         | Sets `rel="noreferrer noopener"` on every `target="_blank"` link, writes the current year into `#year`, and adds hidden `Conversion Page` (the URL without `utm_` parameters) and `utm_*` fields to every form so Webflow form submissions carry their source. Moved out of the Webflow footer code so all site scripts ship through the loader and one tag.                                                                                                                                                                                                                                                                                                             |
| `faq-accordion.js` | On pages with a `.faq_list`, closes every FAQ `details` except the first and sets `html.faq-ready`. It animates open (400 ms) and close (300 ms) with the Web Animations API, on the same `cubic-bezier(0.22, 1, 0.36, 1)` curve as the chevron. A click mid-animation reverses from the current height. Reduced motion and browser-driven toggles (find-in-page) stay native and instant. Exposes `window.OOST.faq.init(root)` / `destroy()`. Each bound `details` carries `data-faq-bound`, so a second `init` does nothing.                                                                                                                                           |
| `zenchef.js`       | Owns the Zenchef booking SDK. Turns every `data-formitable="open"` or `data-zc-action="open"` button into a widget trigger. Loads the SDK after `load` + 2 s idle, or on the first hover, touch or focus of a Reserveer button, whichever comes first. A tap before the widget is ready shows `is-loading` and `aria-busy`, then opens the widget when it signals ready. After 8 s, or if the SDK fails, it sends the visitor to the bookings page (same tab, so popup blockers can't stop it). Never auto-opens. When the widget signals ready it sets a `title` on the booking iframe, in Dutch or English from the page `lang`, so screen readers can name the frame. On phones (≤ 767 px) it tucks the booking iframe under the ConsentPro cookie banner while the banner is open, and brings it back when the banner closes or a Reserveer button is tapped. |

Add a module by dropping a file in this folder, adding it to `GLOBAL_MODULES` or a `ROUTES` entry in `init.js`, and adding a test in `tests/oost/`.

## FAQ accordion

The FAQ lists are Webflow Collection Lists on the `FAQ` collection. Every template item has a static `open` attribute and carries FAQPage microdata. So the Designer canvas, visitors without JS and crawlers all see every answer in plain HTML.

- **Native `details` plus the Web Animations API.** `details`/`summary` bring keyboard, screen-reader and find-in-page support for free. The script only adds motion. The Web Animations API is built into the browser, needs no GSAP, and lets a click cancel and reverse mid-animation. CSS-only `::details-content` transitions snap in Safari, iOS and Firefox, and Webflow Interactions can't target one CMS item at a time.
- **Flash guard.** Every item ships open, so the page would show every answer until the script closes them. A tiny inline script in the site head adds `html.faq-js`. While `faq-ready` is missing, head CSS hides every answer except the first. The script adds `faq-ready` once it has closed the extra items. The head snippet also adds it after 3 s, so if `faq-accordion.js` fails to load, every answer shows open instead of staying hidden. The Designer runs neither, so the canvas shows every answer.
- **Head code.** The flash-guard snippet, the guard CSS and the 400 ms chevron transition come from the build tooling in the private repo (`webflow_css.py --mode complex`, `webflow_head.py`). They sit between the `oost:complex-css` and `oost:faq-guard` markers.
- **Chevron.** The chevron follows `[open]`, but `open` is only removed when the close animation ends. So the script adds `is-closing` to the `details` for the whole close, and head CSS turns the chevron back while that class is present. The chevron then moves with the height instead of 300 ms late. Under reduced motion the chevron transition is off.
- **Webflow quirk.** Webflow drops an empty `open` attribute on publish, so the template `details` uses `open="open"`.

## Why the cookie banner sits above Zenchef on phones

Zenchef gives its iframe the highest possible z-index and appends it last, so on phones its floating "Reserveer een tafel" button covered the banner's **Accepteren** button. ConsentPro renders the banner inside a shadow root, so page CSS can't tell when it's open. `zenchef.js` watches the banner's `fs-consent-active` attribute and toggles `oost-zc-under-consent` on the iframe, which drops it to z-index 99998 (the banner is 99999). A Reserveer tap removes the class so the booking widget always opens on top.

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

## Locale check

`npm run oost:locale-guard -- https://www.oosteten.nl` crawls the sitemap without a browser and reports English-locale regressions. Run it after every publish that touches links or the English locale. Add `--strict` to turn the share-image warning into a failure.

| Check               | Fails when                                                       |
| ------------------- | ---------------------------------------------------------------- |
| English link leak   | an `/en` page links to a Dutch URL outside the language switcher |
| Placeholder number  | a page still carries the placeholder WhatsApp number             |
| Bare social link    | an Instagram link has no handle                                  |
| Untranslated title  | an `/en` page has the same `<title>` as its Dutch twin           |
| Run-together list   | a list item is over 30 characters with no space                  |
| Missing share image | a page has no `og:image` (warning unless `--strict`)             |

Exit code `0` is clean, `1` means findings, `2` means a page could not be fetched.

Webflow locale overrides freeze: when a Dutch link is fixed, the English override keeps its old value and nothing flags it. The 6 Oct 2026 site test found the English pages linking to Dutch URLs and a placeholder WhatsApp number that had been fixed in Dutch three days earlier. The check reads the published HTML, so it sees what crawlers see. A runtime script that rewrote the links was rejected because crawlers would still get the wrong HTML.

The crawl is not part of `npm run test:oost` because it needs the network. Its unit tests in `tests/oost/locale-guard.test.js` are, and run on inline HTML.

## Tests

`npm run test:oost` runs the section validator tests and the loader and module tests, all in `tests/oost/`. They run the real files in a `vm` sandbox with a stub document, so they need no browser.
