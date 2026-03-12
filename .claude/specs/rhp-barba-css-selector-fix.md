# Spec: Fix RHP Barba CSS Selector Scoping After Namespace Restructure

**Client**: ready-hit-play-prod (rhpcircle.webflow.io)
**Priority**: P0 — Critical (root cause of all visible transition bugs)
**Status**: Ready to Build
**Created**: 2026-03-12
**Supersedes**: `rhp-barba-transition-bugs-fix.md` (dev workspace spec — most fixes already ported to prod, but CSS root cause was missed)

## Context

The Barba namespace restructure (shipped 2026-03-12) moved `dial_component` and all dial layers **outside** the Barba container. The container now sits INSIDE `dial_layer-fg`:

```
.dial_component                          ← OUTSIDE barba container
  .dial_layer-bg                         ← sibling of fg
  .dial_layer-ticks                      ← sibling of fg
  .dial_layer-fg                         ← ANCESTOR of barba container
    .dial_video-wrap                     ← sibling of barba container (inside fg)
    [data-barba="container" ns="home"]   ← INSIDE fg
      page content
  .dial_layer-ui                         ← sibling of fg
```

## Root Cause

**ALL CSS selectors using `[data-barba-namespace="X"] .dial_Y` are broken** because they assume `.dial_Y` is a DESCENDANT of `[data-barba-namespace]`. After the restructure, dial elements are ancestors or siblings — not descendants. The selectors silently fail to match, so ~80 lines of dial CSS never apply.

The `data-dial-ns` selectors (lines 490–536) DO work because they target `.dial_component[data-dial-ns="X"]` — an attribute on the element itself.

### What's broken (CSS lines in `ready-hit-play.css`)

| Lines | Selector | Target | Status |
|-------|----------|--------|--------|
| 176–187 | `[ns="home"] .dial_component` | Stage: grid, 100dvh, overflow, place-items | BROKEN |
| 203–209 | `[ns="home"] .dial_layer-bg` | BG layer: absolute, inset:0, z:0 | BROKEN |
| 217–224 | `[ns="home"] .dial_bg-video` | BG video: cover, scale, blur | BROKEN |
| 244–255 | `[ns="home"] .dial_component .dial_layer-ticks` | Ticks: absolute, inset:0, z:2 | BROKEN |
| 258–267 | `[ns="home"] .dial_layer-fg` | FG home: absolute, inset:0, margin:auto, z:3, circle size | BROKEN |
| 271–279 | `@media (hover:hover) [ns="home"] .dial_layer-fg` | FG opacity:0 on desktop | BROKEN |
| 281–292 | `[ns="case"] .dial_layer-fg` | FG case: absolute, grid, z:3 | BROKEN |
| 296–302 | `[ns="case"] .dial_layer-fg` | FG case dimensions | BROKEN |
| 394–408 | `[ns="home"] .dial_video-wrap`, `[ns="case"] .dial_video-wrap` | Video wrap shape | BROKEN |
| 412–418 | `[ns="home"] .dial_fg-video` | FG video: cover | BROKEN |
| 422–434 | `[ns="home"] .dial_layer-ui` | Labels position, z:4 | BROKEN |
| 437–439 | `[ns="home"] .dial_cms-list` | CMS list hidden | BROKEN |
| 655–657 | `[ns="home"] .dial_layer-bg` | BG black fallback | BROKEN |

(`ns` = `data-barba-namespace` abbreviated in table)

### Symptoms (user-reported bugs)

1. **HOME: Dial not visible in IDLE** — z-index:3 on `.dial_layer-fg` never applies; fg sits behind other elements
2. **HOME: Square bounding box / clipping** — `.dial_component` missing `overflow:hidden` + grid centering from CSS; Webflow base styles create a visible rectangular frame instead
3. **HOME: Dial + fg video misaligned** — `place-items:center` and `margin:auto` on `.dial_layer-fg` never apply; elements fall back to Webflow flow positioning
4. **WORK: Container aligned too high** — `.dial_component` missing `height:100dvh` and `display:grid; place-items:center` so content isn't vertically centered
5. **WORK→HOME: dial_layer-fg appears to grow** — `runDialShrinkAnimation` animates to full viewport rect (correct), then `clearProps:'all'` removes inline styles expecting CSS to constrain to circle size. But home CSS never matches, so fg stays full viewport.

## Solution

### Strategy: Rewire selectors using `:has()` and `data-dial-ns`

Since `[data-barba-namespace]` is a descendant of all dial elements, we use the **`:has()` pseudo-class** to scope styles correctly:

```css
/* OLD (broken): */
[data-barba-namespace="home"] .dial_component { ... }

/* NEW (fixed): */
.dial_component:has([data-barba-namespace="home"]) { ... }
```

This means "a `.dial_component` that HAS a descendant with `data-barba-namespace="home"`".

For layers that are siblings of the barba container (not ancestors), use the component as scope:

```css
/* OLD (broken): */
[data-barba-namespace="home"] .dial_layer-bg { ... }

/* NEW (fixed): */
.dial_component:has([data-barba-namespace="home"]) .dial_layer-bg { ... }
```

### Browser support

`:has()` is supported in Chrome 105+, Safari 15.4+, Firefox 121+. The RHP site targets modern browsers — no IE11, no legacy Edge. This is safe.

---

## Files to modify

1. **`projects/ready-hit-play-prod/ready-hit-play.css`** — Rewrite all broken selectors
2. **`projects/ready-hit-play-prod/orchestrator.js`** — Fix `runDialShrinkAnimation` target (animate to home circle size, not full viewport)

---

## Task Breakdown

### Task 1: CSS — Rewrite namespace-scoped dial selectors (CSS-only)

Replace every `[data-barba-namespace="X"] .dial_Y` selector with `.dial_component:has([data-barba-namespace="X"]) .dial_Y` (or `.dial_component:has([data-barba-namespace="X"])` when targeting the component itself).

**Selectors to rewrite** (all in `ready-hit-play.css`):

```
Lines 176–187: Stage (.dial_component) — home, case, about
Lines 189–195: Stage fallback (no dvh support)
Lines 203–209: dial_layer-bg — home, case, about
Lines 211–235: dial_bg-video — shared + home + case/about
Lines 237–240: About bg-video display:none
Lines 244–255: dial_layer-ticks — home, case, about
Lines 258–267: dial_layer-fg (home) — circle sizing
Lines 271–279: dial_layer-fg (hover:hover) — opacity
Lines 281–302: dial_layer-fg (case/about) — rectangle sizing
Lines 394–408: dial_video-wrap — home circle / case rectangle
Lines 412–418: dial_fg-video — cover
Lines 422–434: dial_layer-ui — labels position
Lines 437–439: dial_cms-list — hidden on home
Lines 442–446: case video-cover
Lines 454–474: case first-screen proportions
Lines 477–488: case video-wrap
Lines 655–657: home dial_layer-bg background
```

**Pattern**:
- `[data-barba-namespace="home"] .dial_component` → `.dial_component:has([data-barba-namespace="home"])`
- `[data-barba-namespace="home"] .dial_layer-bg` → `.dial_component:has([data-barba-namespace="home"]) .dial_layer-bg`
- `[data-barba-namespace="case"] .dial_layer-fg` → `.dial_component:has([data-barba-namespace="case"]) .dial_layer-fg`
- Multi-namespace: `[ns="home"] .X, [ns="case"] .X, [ns="about"] .X` → `.dial_component:has([data-barba-namespace="home"]) .X, .dial_component:has([data-barba-namespace="case"]) .X, .dial_component:has([data-barba-namespace="about"]) .X`

**Important**: Do NOT change non-dial selectors that are correctly scoped (e.g. `[data-barba-namespace="about"] .about_dial-wrapper` on line 695 — about_dial-wrapper IS inside the barba container, so the old selector works).

### Task 2: JS — Fix `runDialShrinkAnimation` target dimensions

**Bug**: `runDialShrinkAnimation` (orchestrator.js line 128) animates `dialFg` to `comp.getBoundingClientRect()` (full viewport), then relies on CSS `clearProps` to constrain to circle. With broken CSS, the fg stays full viewport.

**Fix**: Even with CSS selectors fixed, animating to full viewport then snapping to circle is visually wrong. The shrink animation should tween directly to the home circle dimensions:

```js
// Instead of animating to targetRect (full viewport):
const v = getDialVars();
const homeW = _parseSize(v.homeWidth) || _parseSize(v.homeFallbackWidth);
const homeH = _parseSize(v.homeHeight) || _parseSize(v.homeFallbackHeight);

gsap.to(dialFg, {
  width: homeW,
  height: homeH,
  borderRadius: '1000rem',
  // ... rest of animation
});
```

Also: after `clearProps:'all'`, explicitly set `zIndex: 3` (already done on line 181, confirmed).

### Task 3: JS — Fix `runDialShrinkAnimation` margin animation

Currently line 175 animates `margin: 0`. But the home state needs `margin: auto` for centering (from the CSS rule that was broken). Fix: animate `margin: 'auto'` or set it after clearProps.

### Task 4: Verify all transitions end-to-end

After CSS + JS fixes, test:
1. **Direct-land home** — dial visible, centered, ticks circular, no clipping, IDLE state correct
2. **Home ACTIVE** — video in circle, ticks attract toward cursor, no bounding box visible
3. **Home → Work** — smooth morph, video continuous, work content centered vertically (50vh)
4. **Work → Home** — smooth shrink to circle (not grow), ticks + labels fade in, dial centered
5. **Home → About → Home** — no regression
6. **Direct-land work** — content centered, scrollable

---

## Barba Impact

1. **Init/Destroy lifecycle**: No new lifecycle methods — fixes are CSS selector corrections + animation target fix
2. **State survival**: No change — video persistence already handled via `RHP.videoState`
3. **Transition interference**: The CSS fix restores proper z-index stacking so dial layers don't conflict with transitions. The JS fix makes the shrink animation target correct dimensions.
4. **Re-entry correctness**: `clearProps:'all'` + corrected CSS selectors = proper fallback state on every re-entry
5. **Namespace scoping**: All fixes restore proper scoping that was silently broken by the restructure

---

## Parallelisation Map

| Stream | Task | Agent | Est. tokens | Dependencies |
|--------|------|-------|-------------|--------------|
| A | Task 1: CSS selector rewrite | code-writer | ~8k | None |
| A | Task 3: Margin fix (small, in same file context) | code-writer | ~2k | Task 2 |
| B | Task 2: JS shrink target fix | code-writer | ~4k | None |
| — | Task 4: E2E verification | qa | ~6k | Tasks 1+2+3 |

**Recommendation**: Sequential — Tasks 1+2+3 are small, interdependent (CSS fix changes what JS needs to do), and in only 2 files. Parallel overhead not justified. Total est: ~20k tokens.

---

## Verification

1. **Automated**: Run `npm test` (smoke + a11y) after deploying to staging
2. **Visual**: Load home page — dial must be centered circle with ticks, no rectangular bounding box
3. **Visual**: Trigger work→home — fg must SHRINK to circle, not grow
4. **Visual**: Work page — content must be dead-center vertically
5. **Grep check**: `grep -n 'data-barba-namespace.*\\.dial_' ready-hit-play.css` should return 0 results (all rewritten to `:has()` pattern) — EXCEPT for selectors inside `.about_dial-wrapper` which is correctly inside the barba container

---

## Jam References

- Jam 1 (HOME/IDLE clipping + bounding box): https://jam.dev/c/27cf625c-04b5-4fd2-a8cc-618466636446
- Jam 2 (HOME/ACTIVE misalignment): https://jam.dev/c/4b89ec5f-d6e0-4152-ad78-2c3b723cc632
- Jam 4 (WORK→HOME grow bug): https://jam.dev/c/4d6894a9-3ed1-4b70-9cfa-996f90d506b0
