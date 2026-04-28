# rhp-mobile-nav-logo-reload

> On RHP homepage, tablet and below: nav logo tap does a full page reload instead of `replay()`, so the user restarts from the beginning of the morph.

**Status:** Ready to Build
**Priority:** P2
**Client:** Ready Hit Play
**Type:** fix
**Agent:** code-writer

---

## Context

`orchestrator.js:1260–1277` defines the nav logo click handler (`initNavLogoLink()`). When on the homepage post-morph, it calls `RHP.homeScrollMorph.replay()` — a complex ~100 LOC function that reverse-tweens the morph from progress 1→0, re-reveals the intro section, and re-initialises the scroll-driven timeline.

On mobile/tablet, `replay()` has historically been fragile (see `rhp-nav-logo-replay-and-dial-click.md` for the 3 bugs it needed patching for). The mobile morph uses a different timeline (`buildMobileTimeline()` — 300svh, bell-curve word reveal), making the reverse path even more complex and harder to test.

A full page reload is the simplest, most reliable way to restart the mobile morph experience. It:
- Guarantees clean state (no stale GSAP contexts, no leftover ScrollTrigger instances)
- Re-runs the intro sequence from scratch
- Avoids maintaining a separate mobile `replay()` code path
- Matches user expectation on touch devices (tap logo = go home)

## Decision

- **Breakpoint check:** `!(hover: hover)` via `window.matchMedia` — same check used by `home-scroll-morph.js:_isDesktop()` to decide between desktop and mobile timelines. Semantically: "if you got the mobile morph, you get the mobile reload behaviour."
- **Scope:** Homepage only (the `replay()` path). When navigating from about/case to home on mobile, existing `barba.go('/')` behaviour is unchanged.

## Implementation

### File: `projects/ready-hit-play-prod/orchestrator.js`

**Location:** Lines 1266–1270 (inside the `navLogo` click handler)

**Before:**
```js
if (ns === 'home' && morph?.complete === true && typeof morph.replay === 'function') {
  morph.replay();
  // initDialClickToScroll() not needed here — the boot-time binding on
  // .home-transition-dial persists (element is outside Barba container).
  return;
}
```

**After:**
```js
if (ns === 'home' && morph?.complete === true && typeof morph.replay === 'function') {
  // Touch devices (tablet & below): full reload to restart morph cleanly
  if (!window.matchMedia?.('(hover: hover)').matches) {
    window.location.reload();
    return;
  }
  morph.replay();
  // initDialClickToScroll() not needed here — the boot-time binding on
  // .home-transition-dial persists (element is outside Barba container).
  return;
}
```

**Lines changed:** +3 (one `if` block with `location.reload()` + `return`)
**Files affected:** 1 (`orchestrator.js`)
**Complexity:** Low — 3 LOC in 1 file

## Barba Impact

1. **Init/Destroy lifecycle** — No new DOM elements, listeners, or timelines. N/A.
2. **State survival** — `window.location.reload()` destroys all state. This is intentional — the user wants a fresh start.
3. **Transition interference** — No Barba transition is triggered. The reload bypasses Barba entirely.
4. **Re-entry correctness** — The reload produces a fresh `DOMContentLoaded`, so all modules init from scratch. No re-entry concerns.
5. **Namespace scoping** — Only fires when `ns === 'home'`. No risk of triggering on wrong pages.

## Verify Loop

### Pass/fail criteria
1. **Mobile/tablet (touch device):** Tapping nav logo on homepage post-morph triggers `window.location.reload()` — page fully reloads, morph intro section is visible again, `RHP.homeScrollMorph.complete` is `false`
2. **Desktop (hover device):** Clicking nav logo on homepage post-morph still calls `morph.replay()` — no reload, smooth reverse tween
3. **No console errors** on either path
4. **Other pages unaffected:** Logo tap on about/case still navigates to home via Barba (desktop) or Barba (mobile) — no change

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/` on a touch device (or Chrome DevTools device emulation with touch enabled)
2. Scroll through the intro morph until `RHP.homeScrollMorph.complete === true`
3. Tap the nav logo (`.nav_logo-link`)
4. **Expected:** Page fully reloads. Intro section is visible. Morph is at start.

### Tier mapping
- **Tier 1 (auto):** Tests 1–4 in acceptance test (mobile viewport emulation, desktop viewport, console errors, about page logo)
- **Tier 3 (manual):** Real iPad/iPhone tap — Playwright can emulate touch but cannot guarantee iOS Safari reload behaviour

### Regression scope
- Desktop `replay()` must still work (no regression from adding the mobile branch)
- About/case → home navigation unchanged on both desktop and mobile
- No new console errors on any page

## Parallelisation Map

| Stream | Agent | Task | Est. LOC | Sequential deps |
|--------|-------|------|----------|-----------------|
| 1 | code-writer | Add mobile check to orchestrator.js | 3 | None |
| 2 | qa | Run acceptance tests | — | Stream 1 |

**Recommendation:** Sequential — too small to parallelise.

## Acceptance Tests

See `tests/acceptance/rhp-mobile-nav-logo-reload.spec.js`

| # | Test name | Tier |
|---|-----------|------|
| 1 | mobile: nav logo tap reloads page on homepage post-morph | Tier 1 |
| 2 | desktop: nav logo click still triggers replay, not reload | Tier 1 |
| 3 | no console errors during mobile logo reload | Tier 1 |
| 4 | about page: mobile nav logo navigates home without reload | Tier 1 |
| 5 | real iOS Safari tap behaviour | Tier 3 (manual) |
