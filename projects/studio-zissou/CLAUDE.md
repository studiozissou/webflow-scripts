# studio-zissou — Project Guide

## What this is
Custom scripts for Studio Zissou's Webflow site. Vanilla ES2022+, no build step.

## Testing

Playwright acceptance tests run against the staging site (URL from `STAGING_URL` in `.env.test`).
Test scripts are in package.json (`test:sz*`).

## Known selectors
Confirmed on Home with the Webflow MCP, 2026-11-12 (Contact component, used by `contact-steps.js`):
- `[data-sz="contact-steps"]` on `.sz-contact_wrapper`; 6 × `[data-sz-step]` rows; `[data-sz-require-one]` on the chips fieldset
- `[data-sz="contact-next"]` on 5 × `div.sz-sentence_arrow[role=button][tabindex=0]` (Webflow turns an inserted `<button>` into a Link, so these stay divs)
- `[data-sz="contact-back"]`, `contact-count`, 6 × `contact-segment`, `contact-need-error`, `contact-done`, `contact-fail`
- Inputs `#contact-name`, `#contact-business`, `#contact-email`, `#contact-website`, `#contact-message`; chips `#need-google|website|bookings|care|unsure` (names match ids)

Confirmed from published Home HTML, 2026-11-17 (`nav.js`, `task-list.js`; Designer snapshot still pending T0):
- `nav[data-sz="nav"].section_nav.u-scheme-brunello-dark > .padding-global > .container-large > .sz-nav_panel` (holds `ul.sz-nav_list` + `a.sz-nav_wordmark` + `ul.sz-nav_list`)
- `section[data-sz="problem"] .sz-problem_group > ul.sz-dot-list` gets `data-sz="task-list"` (T4); items `li.sz-dot-list_item.is-small`
- Every section has `data-sz` and one `u-scheme-*` class; `nav.js` reads these

Set with the Webflow MCP and published live, 2026-11-17 (`tracking.js`; all in component definitions, so every page with Nav/Footer gets them):
- `[data-sz-cta]`: `nav-contact` (Nav), `split-tell-me` (Split), `price-care`, `price-refresh` (Price list), `cta-band-agencies` (CTA band), `footer-send`, `footer-email`, `footer-contact` (Footer)
- `[data-sz="frame-start"]` on `.sz-split_wrapper` inside `section_split[data-sz="split"]`
- Every homepage section is a component instance; edit attributes with `scope_component_id`. No `/contact` page exists (it serves the 404 page).
