# Rolfing Amsterdam — hosted scripts

Hosted scripts for rolfingamsterdam.nl, a Webflow site (English primary, Dutch secondary) taken over in October 2026. Copied from `projects/_template/` by the `client-onboarding` skill. Vanilla JS, no build step, served from this repo through jsDelivr.

Nothing here is on the live site yet. The site runs no custom code of ours; the loader tag goes into the Webflow footer only when a module is needed and Will decides to ship it.

## Takeover notes

- **Existing custom code:** none of ours. The site uses Finsweet Cookie Consent (opt-in) gating GA4, and a Webflow contact form with reCAPTCHA on Book Session. Check the site-wide custom code panel before adding the loader.
- **`smooth-scroll.js`:** kept and tested, not loaded. The site scrolls natively and has Webflow interactions on the home page; Lenis could clash with those, so it stays out until there is a reason.
- **`site-utilities.js`:** kept and tested, not loaded. Would add `noopener` to new-tab links and UTM fields to the contact form. Worth adding if form attribution becomes a goal.
- **`faq-accordion.js`:** in the loader, but the live FAQ is a CMS list, not `details.faq_item` markup, so it does nothing until the FAQ is rebuilt to match.
- **Booking:** no booking widget. Bookings come through the form, phone and email, so `booking-widget.js` was removed.

## How it loads

Webflow has one script tag, in the site footer:

<!-- prettier-ignore -->
```html
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@rolfing-amsterdam-v0.1.0/projects/rolfing-amsterdam/init.js" defer></script>
```

`init.js` reads its own URL, so every module comes from the same pinned tag. It appends the `GLOBAL_MODULES`, then any `ROUTES` modules whose `match` fits the path, in insertion order. `DEPS` is empty on this site.

## Modules

| File                | Does                                                                                                                        | Loaded |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| `faq-accordion.js`  | Native `details.faq_item` inside `.faq_list`: first open, animated open/close, native under reduced motion.                 | Yes    |
| `smooth-scroll.js`  | Lenis with anchor handling. Copy of `shared/smooth-scroll.js`.                                                              | No     |
| `site-utilities.js` | `noopener` on new-tab links, year in `#year`, hidden `Conversion Page` + `utm_*` fields once per form. Copy of `shared/`.   | No     |

## Local dev

Add `data-allow-local` to the footer tag on staging, serve the repo root on `https://localhost:8080`, and open the site with `?rolfing-amsterdam=local` (`&rolfing-amsterdam-port=8081` for another port). `?rolfing-amsterdam=cdn` switches back. Remove `data-allow-local` before going live; `launch-guard` flags it.

## Checks

`npm run rolfing-amsterdam:launch-guard -- <url>` crawls the site against `launch.config.json`: exit `0` clean, `1` findings, `2` fetch failure.

## Schema

`schema/rolfing-pages-template.html` holds the WebPage + BreadcrumbList JSON-LD for the Rolfing Pages template: an EN block and an NL block. Paste the EN block into a Code Embed on the template, then paste the NL block into the same embed in the NL locale override.

- It is an embed, not page head code, because head code is single-locale in Webflow; only `inLanguage`, the URL prefix and the breadcrumb names differ between the blocks.
- It binds `seo-title`, `seo-description`, `updated` and `photo`, which come from the Rolfing Pages field step in the Oct 2026 growth spec (2a). Add those fields before pasting.
- Webflow does not JSON-escape bindings, so a straight `"`, a backslash or a line break in `name`, `seo-title` or `seo-description` breaks the whole block. Make those fields single-line, use typographic quotes in copy, and make `updated` and `photo` required for landing pages so they never render as `""`.
- It carries a minimal Person node for Janco (shared `@id` with the About page) so each page names its author even before the site-wide graph (S5) ships.
- No `Medical*` types and no FAQPage: the FAQ is microdata on the CMS list.
- `npm run test:rolfing-amsterdam` fills the bindings with sample values and checks both blocks parse and agree on locale, URLs and breadcrumb.
- Hand check: once the first landing page is on staging, run `/test-schema` on it (Rich Results Test) in EN and NL.

## Deploying

`/deploy` bumps `VERSION`, runs `npm run preflight -- rolfing-amsterdam`, tags `rolfing-amsterdam-vX.Y.Z` and purges jsDelivr.

## Tests

`npm run test:rolfing-amsterdam` runs the loader, module and config tests in a `vm` sandbox, so no browser is needed.
