# Spec: NEM 123 Cards Mobile Trigger Fix + Wat-Als Alignment

**Slug:** `nem-123-mobile-trigger-fix`
**Client:** NEM Life
**Status:** Ready to Build
**Priority:** P1
**Created:** 2026-06-09

## Summary

Two changes to align the "Doorbreek je patronen" (123 cards) and "Wat als er niets verandert?" (pain cards) sections to use the same simple animation pattern:

1. **method-cars-fade.js** — Fix mobile ScrollTrigger timing. Cards currently trigger at `start: 'top 85%'` (card barely visible). Change to `start: 'bottom 95%'` so animation fires when the card is fully in the viewport.

2. **wat-als-reveal.js** — Replace the complex intro→hover→active-card logic with the same simple pattern used by the 123 cards:
   - **Desktop:** Cards start at `opacity: 0, y: 30`. Stagger reveal (`delay: i * 1.5`, `duration: 1.2`). Triggered once when wrap enters at `top 80%`.
   - **Mobile:** Cards start at `opacity: 0.25`. Each card triggers itself at `start: 'bottom 95%'`. Brighten to `opacity: 1` over `0.8s`.
   - **Remove:** Hover behaviour, `hoverLocked` state, IX2 `data-w-id` stripping, `setActive()` toggle, intro timeline with `onComplete` fade-out. The info-wrap and gradient stay visible after reveal — no interaction needed.

## Files Affected

| File | Change | LOC |
|------|--------|-----|
| `projects/nem-life/src/method-cars-fade.js` | Line 62: `start: 'top 85%'` → `start: 'bottom 95%'` | 1 |
| `projects/nem-life/src/wat-als-reveal.js` | Full rewrite — replace 185 lines with ~70 lines matching method-cars-fade pattern | ~70 |

## Approach

### method-cars-fade.js (1-line fix)

```js
// Before (line 62)
start: 'top 85%',

// After
start: 'bottom 95%',
```

### wat-als-reveal.js (rewrite)

Replace the entire IIFE body with the same structure as `method-cars-fade.js`, adapted for the wat-als selectors:

- Selector: `[data-animate="wat-als"]` (wrap), `.pain-card` (items)
- Desktop: `gsap.set(cards, { opacity: 0, y: 30 })` → stagger reveal per card
- Mobile: `gsap.set(cards, { opacity: 0.25 })` → per-card `start: 'bottom 95%'`
- `prefers-reduced-motion` early return (already present, keep as-is)
- Remove: `imgs`/`infos` separation, hover listeners, `hoverLocked`, `setActive()`, IX2 stripping, intro timeline
- The entire `.pain-card` element animates as one unit (image + info-wrap together)

## Constraints

- Keep `prefers-reduced-motion` early return in both files
- Keep `ScrollTrigger.matchMedia()` (legacy API) — consistent with project pattern
- Keep 992/991px breakpoint split
- Keep `const DEBUG = false` pattern
- No Barba transitions — N/A

## Barba Impact

N/A — no Barba transitions in NEMlife.

## Verify Loop

### Pass/fail criteria

1. **Mobile 123 cards:** Cards at `opacity: 0.25` on load. Each card brightens to `opacity: 1` only when its bottom edge enters the viewport (not when its top barely peeks in).
2. **Mobile wat-als:** Same behaviour — cards dimmed at `0.25`, brighten when fully visible.
3. **Desktop 123 cards:** No change — stagger reveal at `top 80%` (unmodified).
4. **Desktop wat-als:** Cards start at `opacity: 0, y: 30`. Stagger in 1-2-3. No hover interaction after reveal. Info text stays visible.
5. **No console errors** on home page at any viewport.
6. **Reduced motion:** All cards fully visible, no animation.

### Reproduction steps

1. Navigate to `https://nem-life-1.webflow.io` (home page)
2. **Mobile (375×812):** Scroll down to 123 cards section. Cards should be dimmed. Each card should brighten only when fully scrolled into view.
3. **Mobile:** Continue to wat-als section. Same behaviour — dimmed cards, brighten on full visibility.
4. **Desktop (1440×900):** Scroll to 123 cards section. Cards stagger in with fade + slide.
5. **Desktop:** Scroll to wat-als section. Cards stagger in with fade + slide. No hover interaction. Info text stays visible after reveal.

### Tier mapping

- **Tier 1:** Playwright tests for initial opacity state, post-scroll opacity, console errors, reduced motion
- **Tier 3 (manual):** Visual timing feel, scroll position where animation fires

### Regression scope

- Desktop 123 cards animation must not change (only mobile trigger point changed)
- No other modules on the home page should be affected

## Parallelisation Map

Single file changes, sequential dependency (wat-als depends on method-cars pattern). No parallelisation needed.

- **Stream 1:** code-writer — edit both files (~15 min, ~2K tokens)
- **Stream 2 (after):** qa — run acceptance tests (~5 min)

## Test Plan

### Tier 1 — Auto: Playwright local

See `tests/acceptance/nem-123-mobile-trigger-fix.spec.js`

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json` — runs on `/deploy`.

### Tier 3 — Manual

- Visual: confirm the "feel" of the trigger timing on a real mobile device (iOS Safari scroll bounce may affect perceived trigger point)
- Visual: confirm info text + gradient readability on wat-als cards at all breakpoints

## Acceptance Tests

1. `123 cards — mobile: cards start dimmed (opacity ~0.25)`
2. `123 cards — mobile: card brightens after scrolling fully into view`
3. `wat-als — mobile: cards start dimmed (opacity ~0.25)`
4. `wat-als — mobile: card brightens after scrolling fully into view`
5. `wat-als — desktop: cards start hidden (opacity ~0)`
6. `wat-als — desktop: cards reveal after scroll trigger`
7. `wat-als — desktop: no hover interaction changes opacity`
8. `reduced motion: all cards fully visible without animation`
9. `no console errors on home page`
