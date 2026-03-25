# feat-dev-cdn-source-switch

## Summary
Add a URL-param + localStorage source-switching mechanism to `init.js` so the same Webflow staging site can serve modules from either localhost (dev) or jsDelivr CDN (presentation) without changing the Webflow head block.

## Motivation
Currently, switching between local dev scripts and CDN-hosted scripts requires editing the `<script>` tag in Webflow's head block and republishing. This is slow and error-prone — you can accidentally leave it on localhost during a client presentation, or forget to switch back for dev. A URL-param toggle with localStorage persistence solves both problems with zero Webflow-side changes after initial deploy.

## How it works

1. Visit `rhpcircle.webflow.io?rhp=local` — init.js reads the param, writes `localStorage.setItem('rhp-source', 'local')`
2. All subsequent page loads (including Barba navigations) read localStorage and load modules from `https://localhost:8080/projects/ready-hit-play-prod/`
3. Visit `?rhp=cdn` — clears localStorage, reverts to normal CDN detection from the script tag's own URL
4. Console log clearly indicates which source is active

## Architecture

### Approach: Minimal getBaseUrl() override (Approach A)
~12 LOC added to `init.js`, 0 LOC modified, 0 LOC deleted.

### Change 1: Param-to-localStorage bridge
Insert after line 28 (INIT_SCRIPT_SRC capture), before CONFIG:

```js
// Source-switch: ?rhp=local persists to localStorage; ?rhp=cdn clears it
(function() {
  try {
    var p = new URLSearchParams(window.location.search).get('rhp');
    if (p === 'local') localStorage.setItem('rhp-source', 'local');
    else if (p === 'cdn') localStorage.removeItem('rhp-source');
  } catch(e) { /* localStorage blocked — ignore */ }
})();
```

### Change 2: Early return in getBaseUrl()
Prepend to `getBaseUrl()` body (before existing `var scriptSrc = ...`):

```js
try {
  if (localStorage.getItem('rhp-source') === 'local') {
    return 'https://localhost:8080/projects/ready-hit-play-prod';
  }
} catch(e) { /* localStorage blocked — fall through to normal detection */ }
```

### Change 3: Console indicator
In `init()`, after `var baseUrl = getBaseUrl();`, add:

```js
var isLocalOverride = false;
try { isLocalOverride = localStorage.getItem('rhp-source') === 'local'; } catch(e) {}
if (isLocalOverride) {
  console.log('%c[RHP] SOURCE: LOCALHOST (override via ?rhp=local)', 'color: #ff8200; font-weight: bold');
} else {
  var commitMatch = baseUrl.match(/@([a-f0-9]{7,40})/i);
  console.log('%c[RHP] SOURCE: CDN' + (commitMatch ? ' @' + commitMatch[1] : ''), 'color: #05EFBF; font-weight: bold');
}
```

## Files affected

| File | Lines | Change |
|------|-------|--------|
| `init.js` | 29 (insert), 106-107 (insert), 125-130 (insert) | +12 LOC, 0 modified |

## Barba Impact
1. **Init/Destroy lifecycle** — N/A. No DOM elements, listeners, or GSAP timelines added.
2. **State survival** — localStorage persists naturally across Barba transitions. No special handling needed.
3. **Transition interference** — None. The source switch runs once at IIFE boot, before Barba is even loaded.
4. **Re-entry correctness** — N/A. `getBaseUrl()` is called once per full page load. Barba re-entries don't re-run init.js.
5. **Namespace scoping** — Runs on all namespaces equally (it's the loader, not a page module).

## Edge cases

| Scenario | Behaviour |
|----------|-----------|
| `?rhp=local` but localhost not running | Modules fail to load, console shows error. Existing `catch` in `init()` handles this gracefully. |
| User forgets to clear localStorage | Local override persists until `?rhp=cdn` or manual `localStorage.removeItem('rhp-source')`. Console log makes it obvious. |
| localStorage blocked (Safari private, iframe) | `try/catch` silently falls through to normal CDN detection. No breakage. |
| `?rhp=somethingelse` | Ignored — only `local` and `cdn` are handled. |
| Mixed content (HTTPS page, HTTP localhost) | Use `https://localhost:8080` (requires local HTTPS server). If HTTP is needed, browser will block it on HTTPS pages — this is a known constraint of the existing local dev setup. |

## Verify Loop

### Pass/fail criteria
- On `?rhp=local`: localStorage key `rhp-source` equals `'local'`, console shows orange `[RHP] SOURCE: LOCALHOST`, all module URLs start with `https://localhost:8080`
- On `?rhp=cdn`: localStorage key `rhp-source` is absent, console shows teal `[RHP] SOURCE: CDN @<hash>`, all module URLs start with `https://cdn.jsdelivr.net`
- On plain URL (no param): existing behaviour unchanged — CDN if script tag is CDN, local if script tag is localhost
- No console errors introduced by the switch logic
- `RHP.scriptsOk === true` in both modes (assuming localhost is running for local mode)

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io?rhp=local`
2. Open console — verify orange `[RHP] SOURCE: LOCALHOST` message
3. Check `localStorage.getItem('rhp-source')` → `'local'`
4. Click any nav link (Barba transition) — verify scripts still load (localStorage persists)
5. Navigate to `https://rhpcircle.webflow.io?rhp=cdn`
6. Open console — verify teal `[RHP] SOURCE: CDN @...` message
7. Check `localStorage.getItem('rhp-source')` → `null`
8. Navigate without any param — verify CDN behaviour (default)

### Tier mapping
- Tier 1 (Auto, Playwright): localStorage set/clear on param, console message presence, no JS errors — see acceptance test
- Tier 2 (CDN regression): registered in `tests/registry.json`
- Tier 3 (Manual): actual localhost module loading (requires local server running — can't be automated in CI)

### Regression scope
- Existing CDN loading must work identically when no `?rhp` param is present
- `RHP.scriptsOk` health check must still pass
- All Barba transitions must still work (source switch doesn't touch transition code)
- FOUC prevention inline styles are unaffected (they run before the param bridge)

## Acceptance Tests

| Test | Type |
|------|------|
| `sets localStorage when ?rhp=local is present` | Tier 1 |
| `clears localStorage when ?rhp=cdn is present` | Tier 1 |
| `does not set localStorage when no rhp param` | Tier 1 |
| `logs source indicator to console` | Tier 1 |
| `no console errors with ?rhp=local (graceful fail)` | Tier 1 |
| `no console errors with ?rhp=cdn` | Tier 1 |
| `RHP.scriptsOk true on CDN (default)` | Tier 1 |
| `localStorage persists across navigation` | Tier 3 (Barba swallows params) |
| `modules load from localhost when override active` | Tier 3 (requires local server) |
