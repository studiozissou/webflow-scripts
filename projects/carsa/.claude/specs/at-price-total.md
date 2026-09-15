# at-price-total

**Status:** built, awaiting staging check
**Date:** 2026-09-15
**Page:** Vehicles Template (VDP), page id `6846ae0d20cd88f8417a8e53`
**Test URL:** https://carsa-v2.webflow.io/vehicles/used/ef72otu

## Summary

The VDP AutoTrader price block shows the saving and the Carsa cash price but the
AutoTrader market value span is empty. A small footer script adds the two CMS
values and prints the total into that span as a comma-formatted £ figure.

## Research summary

- **Markup (confirmed on staging, inside `.autotrader_price-info`, two HTML embeds):**
  - `<span data-price="at-saving">314</span>` — raw number, literal £ sits outside the span
  - `<span data-price="carsa-price">£14,358</span>` — already formatted
  - `<span data-price="at-value" class="text-weight-bold"></span>` — empty target
- The brief named the target `at-price`; the live attribute is `at-value`. The
  script fills either name so a Designer rename does not break it.
- Designer MCP cannot see inside HTML embeds, so the attribute query returned
  nothing. Live HTML was the source of truth.
- Existing pattern: `vdp.js` §2 formats `[data-number="currency"]` with
  `toLocaleString`. Same approach reused. Vanilla, no jQuery dependency.
- Constraints: no build step, CDN-loaded via jsDelivr, one-sentence file comment,
  no `console.log`, named globals only.
- Footer today: ~48KB of inline scripts plus one jsDelivr tag for
  `battery-animation.js`. New tag is appended after it.

## Approach

Single vanilla IIFE, `projects/carsa/at-price-total.js`, loaded from jsDelivr by
commit hash in the VDP page footer. Runs on DOMContentLoaded (or immediately if
the DOM is ready), scoped to `.autotrader_price-info` with a document fallback.

Alternatives considered and rejected:
- Adding to `vdp.js`: staging still runs the inline footer scripts, not vdp.js,
  so a new section there would not load.
- Webflow inline script in the footer: works, but breaks the repo-as-source rule
  and cannot be unit tested.

## Behaviour

- Parse both sources by stripping everything except digits, dot and minus.
- If either source is missing or has no digits, do nothing (target stays empty).
- Total is rounded to whole pounds and written as `£14,672` (en-GB grouping).
- The saving span is rewritten as `£1,250`. The embed has a literal £ in the
  text node before the span; the script strips that trailing £ so the heading
  never shows `££`. Removing the literal from the embed is optional.

## Files

- `projects/carsa/at-price-total.js` — the script
- `projects/carsa/tests/at-price-total.test.js` — node:test unit tests (6)
- `tests/acceptance/carsa-at-price-total.spec.js` — Playwright acceptance
- `tests/registry.json` — Tier 2 entry

## Tasks

1. Unit tests (TDD) — done, 6 pass
2. Script — done
3. Commit, push, take commit hash for the jsDelivr URL — done, `fe05e80`
4. Add to the VDP page footer via Webflow MCP — done. The freeform footer
   block was left untouched (48KB, risky to round-trip). Instead the CDN file
   is a registered hosted script, id `carsaatpricetotal`, version 1.0.0, with
   SRI hash, applied to the Vehicles Template in the footer location. To bump
   later: `update_registered_script` with the new jsDelivr URL and hash.
5. Publish to staging (user) and run Tier 1

## Test pages (staging)

- https://carsa-v2.webflow.io/vehicles/used/ef72otu
- https://carsa-v2.webflow.io/vehicles/used/va22hmc
- https://carsa-v2.webflow.io/vehicles/used/ln70jpv

## Parallelisation map

Single stream, one file, no worktrees or agent teams needed beyond the one
worktree this job runs in.

## Barba impact

N/A — Carsa has no Barba transitions.

## Verify loop

### Pass/fail criteria
- On the test URL, `[data-price="at-value"]` text matches `/^£\d{1,3}(,\d{3})*$/`
- Its numeric value equals the parsed `at-saving` plus the parsed `carsa-price`
- No `pageerror` events on load
- `window.CarsaAtPriceTotal` exists (script loaded)

### Reproduction steps
1. Open https://carsa-v2.webflow.io/vehicles/used/ef72otu
2. Wait for `document.readyState === 'complete'` plus 1.5s
3. Read the three `data-price` spans inside `.autotrader_price-info`

### Tier mapping
- Tier 1: `carsa-at-price-total.spec.js` — all four criteria above
- Tier 2: registry entry `carsa-at-price-total`
- Tier 3: none

### Regression scope
- Other footer scripts on the VDP (finance calculator, UTM appender, battery
  animation) must still run; covered by the no-console-errors test
- `vdp-script-externalisation` acceptance suite unchanged

## Test plan

### Tier 1 — Playwright local
- `fills at-value with the comma-formatted £ sum of saving and carsa price`
- `at-value equals at-saving plus carsa-price numerically`
- `exposes CarsaAtPriceTotal global`
- `no console or page errors on the VDP`

### Tier 2 — CDN regression
Registered in `tests/registry.json` as `carsa-at-price-total`.

### Tier 3 — Manual
No manual tests needed.

## Acceptance tests

See Tier 1 list. File: `tests/acceptance/carsa-at-price-total.spec.js`.
Needs `STAGING_URL_CARSA=https://carsa-v2.webflow.io` in `.env.test`.
