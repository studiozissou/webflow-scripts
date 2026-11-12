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
