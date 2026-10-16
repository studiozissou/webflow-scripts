# CLIENT — hosted scripts

Template for a small-business Webflow site, copied into `projects/<client>/` by the `client-onboarding` skill. Vanilla JS, no build step, served from this repo through jsDelivr.

## After copying

1. Replace `CLIENT` with the upper-case namespace (e.g. `ACME`) and `client` with the folder name (e.g. `acme`) in every `.js` file, and the title of this README. Both replacements are case-sensitive.
2. Fill in `launch.config.json`: real `domain`, every locale (primary first), known placeholder numbers, `fallbackPaths`, and `schemes` if the site's CSS isn't available to the section validator.
3. Fill in `llms.txt`. Every `TODO-` left in it is a missing owner input.
4. Add `test:<client>` and `<client>:launch-guard` scripts to `package.json`, and copy `tests/_template/` to `tests/<client>/` with the paths updated.
5. Takeover sites: remove `smooth-scroll.js`, `site-utilities.js` and the Lenis entry in `DEPS` from `init.js` until Will decides, and add a "Takeover notes" section here listing what each would replace and any scroll or interaction clash.

## How it loads

Webflow has one script tag, in the site footer:

<!-- prettier-ignore -->
```html
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@client-v0.1.0/projects/client/init.js" defer></script>
```

`init.js` reads its own URL, so every module comes from the same pinned tag. It appends, in order, the `DEPS` (pinned Lenis), the `GLOBAL_MODULES`, then any `ROUTES` modules whose `match` fits the path. Scripts are added with `async = false`, so they execute in insertion order.

## Modules

| File                | Does                                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `smooth-scroll.js`  | Lenis with anchor handling and inlined CSS; off under reduced motion or if Lenis didn't load. Exposes `window.CLIENT.lenis`. Copy of `shared/smooth-scroll.js`.              |
| `site-utilities.js` | `noopener` on new-tab links, year in `#year`, hidden `Conversion Page` + `utm_*` fields once per form. Copy of `shared/site-utilities.js`.                                   |
| `faq-accordion.js`  | Native `details.faq_item` inside `.faq_list`: first open, animated open/close, native under reduced motion. Exposes `window.CLIENT.faq.init(root)` / `destroy()`.            |
| `booking-widget.js` | Lazy booking widget. Vendor details live in the `BOOKING` object (Zenchef by default). Loads on idle or intent, falls back to the bookings page after 8 s, never auto-opens. |

Delete `booking-widget.js` (and its entry in `GLOBAL_MODULES`) if the site has no booking widget.

## Booking widget in Webflow

- Add a `.zc-widget-config` div with `data-restaurant="<venue id>"` and a localised `data-iframe-title` (e.g. "Book a table at …").
- Give every booking button `data-booking="open"`. No inline vendor snippet and no auto-open attribute.
- Another vendor: change only `BOOKING` (SDK URL, origin, ready message, fallback URL, trigger attribute).

## Local dev

Add `data-allow-local` to the footer tag on staging, serve the repo root on `https://localhost:8080`, and open the site with `?client=local` (`&client-port=8081` for another port). `?client=cdn` switches back. Remove `data-allow-local` before going live; `launch-guard` flags it.

## Launch

Run `/launch-check <staging url>` before the domain goes live, and again after. It runs `launch-guard` on every locale, the consent check, page and schema tests, and prints the phone checklist. The rules behind it are in the `webflow-launch` skill.

`npm run <client>:launch-guard -- <url>` runs the crawl on its own: exit `0` clean, `1` findings, `2` fetch failure.

## Deploying

`/deploy` handles releases: it bumps `VERSION` (semver, starting at `0.1.0`), runs `npm run preflight -- <client>`, tags `<client>-vX.Y.Z`, purges jsDelivr and swaps the tag in the Webflow footer.

## Tests

`npm run test:<client>` runs the loader and module tests in a `vm` sandbox with stub documents, so no browser is needed.
