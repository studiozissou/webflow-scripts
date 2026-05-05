# feat-page-loader — Page Loader on Uncached Load

**Status:** Ready to Build
**Priority:** P1
**Created:** 2026-05-05
**Approach:** Pure CSS transition + single class toggle (Approach C)

## Summary

Show a `.loader` container (added in Webflow Designer) on all pages during uncached/first load. Dismiss with a quick CSS fade once `RHP.scriptsOk` is set (all scripts + modules loaded). No new module — just inline CSS in `init.js` + one class toggle + permanent rules in `ready-hit-play.css`.

## Requirements

1. `.loader` element exists in Webflow HTML (user will add it in Designer)
2. Loader is visible immediately on page load (before any JS runs)
3. Loader fades out (0.4s opacity transition) once `RHP.scriptsOk = true`
4. Loader is removed from DOM after fade completes
5. Works on all pages (home, about, case)
6. Only shows on uncached loads (cached loads are fast enough that the loader flashes and fades instantly — acceptable)
7. Respects `prefers-reduced-motion` (instant hide, no transition)
8. Does not interfere with Barba transitions

## Implementation

### File 1: `init.js` — 3 changes

#### Change 1: Extend inline `<style>` block (line 29–37)

Add loader CSS rules to the existing `s.textContent` concatenation:

```js
// After the existing FOUC rules, append:
'.loader{position:fixed;inset:0;z-index:10000;opacity:1;transition:opacity 0.4s ease;pointer-events:all}' +
'.rhp-scripts-loaded .loader{opacity:0;pointer-events:none}' +
'@media(prefers-reduced-motion:reduce){.loader{transition:none}}'
```

- `z-index: 10000` — above `.cursor_component` (9999)
- `position: fixed; inset: 0` — covers full viewport
- `pointer-events: all` while visible, `none` after fade — prevents interaction with page during load
- `prefers-reduced-motion` — skips the transition entirely

#### Change 2: Add class toggle after `scriptsOk` (after line 288)

```js
// Dismiss the loader — CSS transition fades it out
document.documentElement.classList.add('rhp-scripts-loaded');

// Remove .loader from DOM after fade (cleanup)
var loaderEl = document.querySelector('.loader');
if (loaderEl) {
  var removeLoader = function() { loaderEl.remove(); };
  loaderEl.addEventListener('transitionend', removeLoader, { once: true });
  // Safety net: remove after 600ms if transitionend doesn't fire (reduced-motion, etc.)
  setTimeout(removeLoader, 600);
}
```

This runs regardless of `allOk` — a broken load should still dismiss the loader (showing error state is better than an eternal loader).

#### Change 3: None needed in error path

The `catch` block (line 336) does not set `scriptsOk`. But if deps fail to load, the page is broken anyway. We add the class toggle AFTER `RHP.scriptsOk = allOk` (line 286), inside the `try` block, so it only fires if init() reaches that point. If init() throws before reaching modules (e.g. CDN down), the loader stays — which is correct (the page has nothing to show).

**Edge case:** If a single module fails but init() continues, `allOk = false` but the class is still added and loader fades. This is the right behaviour — partial load > eternal loader.

### File 2: `ready-hit-play.css` — permanent rules

Add near the top (after the FOUC rules, around line 57):

```css
/* Page loader — visible until init.js adds .rhp-scripts-loaded to <html>.
   Inline <style> in init.js covers the gap before this CSS loads. */
.loader {
  position: fixed;
  inset: 0;
  z-index: 10000;
  opacity: 1;
  transition: opacity 0.4s ease;
  pointer-events: all;
}

.rhp-scripts-loaded .loader {
  opacity: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .loader {
    transition: none;
  }
}
```

These are duplicates of the inline rules. The inline rules cover the critical gap before `ready-hit-play.css` loads from CDN. The CSS file rules are the permanent source of truth.

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements, event listeners, GSAP timelines, or ScrollTrigger instances. The loader is a one-shot: show on initial load, fade, remove from DOM. No init/destroy needed.
2. **State survival** — Nothing survives. The `.loader` element is removed from DOM after fade. On Barba transitions, it no longer exists.
3. **Transition interference** — `.loader` is `position: fixed; z-index: 10000`, above everything. It's removed before any Barba transition can fire (scripts must load before Barba inits). No conflict.
4. **Re-entry correctness** — N/A. The `.loader` is gone after first load. Barba re-entry (home → about → home) cannot resurrect it.
5. **Namespace scoping** — All pages. The loader is not namespace-specific.

## Verify Loop

### Pass/fail criteria
- `.loader` element is visible on initial page load (before scripts)
- `.rhp-scripts-loaded` class is present on `<html>` after `RHP.scriptsOk`
- `.loader` has `opacity: 0` after class is added
- `.loader` is removed from DOM within 1s of scripts loading
- No console errors related to loader
- With `prefers-reduced-motion: reduce`, loader disappears instantly (no transition)

### Reproduction steps
1. Hard refresh (Cmd+Shift+R) on any page (home `/`, about `/about`, any case study)
2. Observe loader is visible during script loading
3. After ~2-4s (cold cache), loader fades out
4. Inspect DOM — `.loader` element should be gone
5. Navigate via Barba to another page — no loader reappears

### Tier mapping
- **Tier 1:** `rhp-scripts-loaded` class present, `.loader` removed from DOM, no console errors, reduced-motion check
- **Tier 2:** Registered in `tests/registry.json`
- **Tier 3:** Visual check on real device (loader timing feel on slow 3G)

### Regression scope
- FOUC prevention rules must still work (nav items hidden on home until `.rhp-home-ready`)
- Barba transitions must not be affected
- Cursor z-index (9999) must be below loader (10000) during load, but cursor inits after scripts load so no visual overlap

## Parallelisation Map

| Stream | Task | Agent | Est. LOC | Parallel? |
|--------|------|-------|----------|-----------|
| 1 | Modify `init.js` (inline style + class toggle) | code-writer | ~15 | Yes (with stream 2) |
| 2 | Add CSS rules to `ready-hit-play.css` | code-writer | ~15 | Yes (with stream 1) |
| 3 | Acceptance tests | code-writer | ~60 | After 1+2 |

**Recommendation:** Streams 1+2 parallel (same agent, two edits). Stream 3 after. No worktrees needed — changes are in different files with no conflicts.

## Test Plan

### Tier 1 — Auto: Playwright local
- `feat-page-loader.spec.js` — see Acceptance Tests section

### Tier 2 — Auto: CDN regression
- Registered in `tests/registry.json` as `feat-page-loader`

### Tier 3 — Manual
- **Slow network simulation:** Throttle to Slow 3G in DevTools, hard refresh — verify loader is visible for several seconds before fading. Can't automate because Playwright doesn't throttle CDN script loading the same way a real browser does.
- **Visual polish:** Confirm the 0.4s fade feels right on a real device. Subjective timing.

## Acceptance Tests

1. `rhp-scripts-loaded class is present after load` — checks `<html>` has the class
2. `.loader is removed from DOM after scripts load` — checks `.loader` count is 0
3. `no JS errors on home page` — collectErrors pattern
4. `no JS errors on about page` — collectErrors pattern
5. `reduced motion: loader not visible` — `reducedMotion: 'reduce'`, checks `.loader` is not visible or removed
6. `loader does not reappear after Barba transition` — navigate home → about → check no `.loader`
