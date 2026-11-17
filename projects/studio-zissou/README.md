# Studio Zissou scripts

`init.js` loads the modules in order from the same tagged folder: `../../shared/experiments.js`, `global.js`, `contact-steps.js`, `tracking.js`.

## Why experiments

**Rotation vs split.** Traffic is low, so the homepage tests stories by rotation: one story is live for a period (about 4 weeks), then the next one. A PostHog annotation marks each change. Every event carries the `story` super property, so a breakdown by `story` compares the periods. A 50/50 split (both stories at the same time) needs about 2,500 visitors per variant. Splits wait until traffic is high enough and a consent banner exists. They run first on pooled templates (all location or service pages), because those pages get most of the organic traffic.

**Why cookieless.** The PostHog snippet runs with `cookieless_mode: 'always'` and `person_profiles: 'never'`. Nothing is stored on the device, so no banner is needed and every visitor is counted. The cost is that IDs reset daily. That is fine for comparing periods, but splits are not stable, so splits need cookies and consent.

**Why publish-swap, not flags.** In cookieless mode there is no flag cache. A story chosen by a flag would leave the hero blank for 0.3 to 1 s on every page load, which hurts LCP. The live story is instead the CMS item with `Live = on`, and a Webflow publish swaps it. There is no flicker, and visitors without JS see the same story.

**The runner (`shared/experiments.js`).** This is for splits later, and Carsa can use it too. It waits for the real PostHog instance, reads each `exp-*` flag with `getFeatureFlag` (so PostHog records the exposure), and applies the ops in the flag payload (`show`, `hide`, `css`, `class-add`, `class-remove`, `text`). The `show`, `hide` and `css` rules are scoped by `<html data-exp-<name>="<variant>">`, so the `control` variant changes nothing. `show` uses `display:revert`, which gives `block`; for a flex or grid wrapper, set the op's `value` to `flex` or `grid`. When no `exp-*` flag is active, it does nothing and hides nothing at first paint. Add `?exp-preview=1` to force your own browser into the `test` variant.

**Tracking (`tracking.js`).** It registers `story` and `locale`, and captures `cta_click` (`[data-sz-cta]`), `story_section_reached` (`[data-sz="frame-start"]`, once) and `lead_submitted` (`.w-form-done` becomes visible, once per form). It never calls `identify` or `alias`.
