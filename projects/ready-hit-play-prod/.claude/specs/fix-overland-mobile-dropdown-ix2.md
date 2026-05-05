# fix-overland-mobile-dropdown-ix2

## Summary

Migrate Webflow IX2 interactions on the Overland AI mobile benefit dropdowns to GSAP, so they work after Barba page transitions.

**Problem:** Webflow IX2 binds `DROPDOWN_OPEN` / `DROPDOWN_CLOSE` events to `.benefits_dropdown-mobile` (class-based). After a Barba transition into `/work/overland-ai`, IX2 doesn't re-bind to the new DOM. The dropdowns still open/close (Webflow's native dropdown JS is reinited by `_reinitWebflow()`), but the IX2 animation layer (slide + colour changes) is lost. Page reload fixes it.

**Solution:** Replace IX2 action lists `a` / `a-2` with GSAP timelines in `overland-ai.js`. Reuse the existing `MutationObserver` pattern from `initBenefitVideoAutoplay` (which already watches `w--open` on `.benefits_dropdown-list-mobile`).

## Scope

- **1 file modified:** `overland-ai.js`
- **0 new files**
- **~50 LOC added**
- Mobile only (< 992px)

## IX2 Action Lists (extracted from live site via Chrome DevTools)

### `a` — "Benefits Grid - Hover IN Mobile" (DROPDOWN_OPEN)

Two action item groups (initial state → animate):

**Group 1 — Set initial state (instant):**
| Target (child of `.benefits_dropdown-mobile`) | Property | Value |
|---|---|---|
| `.benefits_dropdown-list-mobile` | `translateY` | `10%` |
| `.benefits_dropdown-list-mobile` | `opacity` | `0` |

**Group 2 — Animate (100ms delay, 300ms duration):**
| Target | Property | Value | Easing |
|---|---|---|---|
| `.key-benefits_logo` | `color` | `rgb(243, 78, 12)` (orange) | linear |
| `.grid-corner.is-bottom-right` | `borderColor` | `rgb(243, 78, 12)` | linear |
| `.grid-corner.is-bottom-left` | `borderColor` | `rgb(243, 78, 12)` | linear |
| `.grid-corner.is-top-left` | `borderColor` | `rgb(243, 78, 12)` | linear |
| `.grid-corner.is-top-right` | `borderColor` | `rgb(243, 78, 12)` | linear |
| `.text-size-small` | `color` | `rgb(255, 255, 255)` (white) | linear |
| `.benefits_dropdown-list-mobile` | `opacity` | `1` | linear |
| `.benefits_dropdown-list-mobile` | `translateY` | `0%` | easeOut |

### `a-2` — "Benefits Grid - Hover OUT Mobile" (DROPDOWN_CLOSE)

One action item group (0ms delay, 300ms duration):
| Target | Property | Value | Easing |
|---|---|---|---|
| `.key-benefits_logo` | `color` | `rgb(98, 116, 111)` (teal) | linear |
| `.grid-corner.is-bottom-right` | `borderColor` | `rgb(255, 255, 255)` (white) | linear |
| `.grid-corner.is-bottom-left` | `borderColor` | `rgb(255, 255, 255)` | linear |
| `.grid-corner.is-top-left` | `borderColor` | `rgb(255, 255, 255)` | linear |
| `.grid-corner.is-top-right` | `borderColor` | `rgb(255, 255, 255)` | linear |
| `.text-size-small` | `color` | `rgb(98, 116, 111)` (teal) | linear |
| `.benefits_dropdown-list-mobile` | `translateY` | `10%` | easeIn |
| `.benefits_dropdown-list-mobile` | `opacity` | `0` | linear |

### DOM structure (per dropdown, 9 total)

```
.grid_grid-item-wrapper
  .benefits_dropdown-mobile.w-dropdown
    .benefits_dropdown-toggle-mobile.w-dropdown-toggle
      .grid_grid-item.is-benefits.is-mobile
        .grid_grid-content
          .key-benefits_logo           <-- color target
          .key-benefits_text-container
            .text-size-small           <-- color target
        .grid-corner.is-top-left       <-- borderColor target (toggle corners)
        .grid-corner.is-top-right
        .grid-corner.is-bottom-left
        .grid-corner.is-bottom-right
    nav.benefits_dropdown-list-mobile.w-dropdown-list   <-- translateY + opacity target
      .grid_cover-image-mobile         (video)
      .corners-wrapper
        .grid-corner.is-top-right.is-orange   (NOT targeted — already orange)
        .grid-corner.is-bottom-left.is-orange
        .grid-corner.is-bottom-right.is-orange
```

**Note:** IX2 targets `.grid-corner.is-top-right` etc from the dropdown root — this matches BOTH toggle corners AND list `.is-orange` corners. GSAP should scope to **toggle corners only** (`toggle.querySelectorAll('.grid-corner')`) since the list corners are already orange.

## Implementation

### Approach

Merge the dropdown animation into the existing `initBenefitVideoAutoplay()` MutationObserver callback. The observer already watches each `.benefits_dropdown-list-mobile` for `w--open` class mutations. When `w--open` appears → play open timeline. When removed → play close timeline.

### Code changes in `overland-ai.js`

1. **Rename** `initBenefitVideoAutoplay` → `initMobileDropdowns` (broader responsibility now)

2. **Add GSAP context** — wrap mobile dropdown logic in `gsap.context()` (stored alongside `_gsapCtx`) so it's killed on `destroy()`

3. **In the `handleClassChange` callback**, after the existing video play/pause logic, add:
   ```js
   const dropdown = targetElement.closest('.benefits_dropdown-mobile');
   const toggle = dropdown?.querySelector('.benefits_dropdown-toggle-mobile');
   const list = targetElement; // the nav element being observed
   const corners = toggle?.querySelectorAll('.grid-corner');
   const logo = toggle?.querySelector('.key-benefits_logo');
   const textSmall = toggle?.querySelector('.text-size-small');

   if (targetElement.classList.contains('w--open')) {
     // OPEN — matches IX2 action list "a"
     gsap.set(list, { y: '10%', opacity: 0 });
     gsap.to(corners, { borderColor: ORANGE, duration: 0.3, delay: 0.1, overwrite: true });
     gsap.to(logo, { color: ORANGE, duration: 0.3, delay: 0.1, overwrite: true });
     gsap.to(textSmall, { color: '#fff', duration: 0.3, delay: 0.1, overwrite: true });
     gsap.to(list, { y: '0%', opacity: 1, duration: 0.3, delay: 0.1, ease: 'power1.out', overwrite: true });
   } else {
     // CLOSE — matches IX2 action list "a-2"
     gsap.to(corners, { borderColor: 'rgb(217, 229, 231)', duration: 0.3, overwrite: true });
     gsap.to(logo, { color: TEAL, duration: 0.3, overwrite: true });
     gsap.to(textSmall, { color: TEAL, duration: 0.3, overwrite: true });
     gsap.to(list, { y: '10%', opacity: 0, duration: 0.3, ease: 'power1.in', overwrite: true });
   }
   ```

4. **Colour constants** (reuse from desktop hover or define at module scope):
   - `ORANGE = '#F34E0C'` (rgb 243, 78, 12)
   - `TEAL = 'rgb(98, 116, 111)'`
   - Toggle corner default borderColor: `'rgb(217, 229, 231)'` (matches desktop `initGridHover` reset value)

5. **`prefers-reduced-motion` guard** — skip animations, apply instantly:
   ```js
   const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   // If prefersReduced: gsap.set() instead of gsap.to()
   ```

6. **Breakpoint guard** — only run on mobile (< 992px). The observers should still be created (Webflow dropdowns only render on mobile via CSS display rules), but add `if (window.innerWidth >= DESKTOP_BP) return;` at the top of the animation block to be safe.

7. **Destroy** — existing `benefitObservers.forEach(o => o.disconnect())` already cleans up. The GSAP context revert handles inline styles.

### What NOT to change

- Desktop hover (`initGridHover`) — leave as-is, it works
- Desktop IX2 on `.grid_grid-content.is-overdrive` — leave as-is, it works
- The Webflow dropdown open/close mechanism itself — `_reinitWebflow()` handles that

### After code ships

Remove the IX2 interactions `e`/`e-2` (DROPDOWN_OPEN/CLOSE on `.benefits_dropdown-mobile`) from Webflow Designer to avoid double-animation on fresh page load. The GSAP version will handle both direct-land and Barba-navigated cases.

## Barba Impact

1. **Init/Destroy lifecycle** — `overland-ai.js` already has `init(container)` / `destroy()` and listens to `rhp:barba:afterenter`. The MutationObservers are created in `init()` and disconnected in `destroy()`. GSAP context is reverted in `destroy()`. No changes to orchestrator needed.
2. **State survival** — Nothing needs to persist. Dropdown state resets on page change.
3. **Transition interference** — No conflict. Dropdowns are inside the Barba container. Animations are simple property tweens on child elements.
4. **Re-entry correctness** — `destroy()` disconnects observers and reverts GSAP context. `init()` creates fresh observers. No stale state.
5. **Namespace scoping** — `isOverlandPage()` check gates `init()`. Only runs on `/work/overland-ai`.

## Verify Loop

### Pass/fail criteria
- On mobile (375px viewport), after Barba transition from home → `/work/overland-ai`:
  - Tapping a benefit dropdown toggle opens it with slide-up + fade-in animation
  - Logo turns orange, corners turn orange, text turns white on open
  - Closing reverses: slide-down + fade-out, colours reset to teal/white
  - Video inside dropdown plays on open, pauses on close (existing behaviour)
- No console errors on page load or after Barba transition
- `prefers-reduced-motion`: dropdown still opens/closes but without animation delay

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io` (home)
2. Navigate to `/work/overland-ai` via Barba (click a work link, then navigate to Overland AI)
3. Scroll to the benefits grid section (`.section_overland-import`)
4. Tap the first dropdown toggle
5. Observe: slide-up animation, orange highlights, video plays
6. Tap again to close
7. Observe: slide-down animation, colours reset, video pauses

### Tier mapping
- **Tier 1 (auto):** Playwright tests cover element presence, Barba lifecycle, console errors, reduced motion, responsive viewport
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (manual):**
  - Animation timing feel (easing curves match original IX2) — subjective
  - Cross-browser: Safari mobile dropdown behaviour — Playwright only runs Chromium
  - Touch interaction on real iOS device — Playwright touch emulation isn't 1:1

### Regression scope
- Desktop hover (`initGridHover`) must NOT break
- Video autoplay on dropdown open must still work
- Other case study pages must not be affected (`isOverlandPage()` gate)
- Barba transitions to/from Overland AI must remain clean

## Parallelisation Map

Single stream — 1 file, ~50 LOC. No parallel benefit.

| Task | Agent | Est. LOC | Sequential? |
|---|---|---|---|
| Write GSAP dropdown code in `overland-ai.js` | code-writer | ~50 | 1 |
| Run acceptance tests | qa | — | 2 (after 1) |
| Remove IX2 from Webflow Designer | manual | — | 3 (after deploy) |

## Acceptance Tests

See `tests/acceptance/fix-overland-mobile-dropdown-ix2.spec.js`

| Test | What it checks |
|---|---|
| `dropdown toggle is present at mobile viewport` | `.benefits_dropdown-toggle-mobile` visible at 375px |
| `no JS errors on direct page load` | Zero `pageerror` events |
| `no JS errors after Barba transition` | Navigate home → overland-ai, zero errors |
| `dropdown opens with w--open class on click` | Tap toggle → list gets `w--open` |
| `dropdown GSAP animation applies on open` | After open: logo color is orange, corners borderColor is orange |
| `dropdown GSAP animation resets on close` | After close: logo color resets, corners reset |
| `Barba lifecycle: navigate away and back` | Home → overland → home → overland: no errors, dropdowns still work |
| `reduced motion: content visible without animation` | `prefers-reduced-motion: reduce` → dropdown list visible after open |
| `no WCAG 2.1 AA violations` | axe-core scan on page |
