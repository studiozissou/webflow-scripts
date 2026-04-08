# rhp-dial-short-viewport-bump

> Bump `--dial-large` on short-viewport desktop laptops (1440–1990px wide, ≤849px tall) so the step text "Great stories made undeniable" has breathing room inside the dial.

**Priority:** P2
**Status:** Ready to Build
**Created:** 2026-04-08
**Type:** CSS tweak (single media query)

---

## Problem

On desktop the dial uses `min(50svh, 70vw)`, which is always height-constrained at sane aspect ratios. On common 16" laptop viewports (1440×900, 1920×1080) this produces a 450–540px dial and the IDLE step text ("Great stories made undeniable") fits with ~35px padding each side.

On common **short-viewport laptops** (13" MBP at 1440×800, 1366×768, 1920×900, and similar) the 50svh formula gives a smaller dial (375–450px) and the text begins to touch — or overflow — the tick ring.

### Measurements (live rhpcircle.webflow.io)

| Viewport | Dial Ø | Text natural | Fill % | Status |
|---|---|---|---|---|
| 1440 × 900 | 450 px | 376 px | 84% | OK — ~37px each side |
| 1440 × 800 | 400 px | 376 px | 94% | **Tight** — touching edge |
| 1440 × 750 | 375 px | 376 px | 100% | **Equal** — breaks |
| 1440 × 730 | 365 px | 376 px | 103% | **Overflows** ticks |
| 1600 × 900 | 450 px | 385 px | 85% | OK |
| 1920 × 1080 | 540 px | 469 px | 87% | OK — ~36px each side |

**Root cause:** `50svh` makes the dial shrink with viewport height while the fluid `rem` keeps the step text width roughly stable within a given width band. Below a certain vh threshold, the dial becomes narrower than the text.

**Note on element behaviour:** The step element is `display: flex; white-space: normal` inside an unconstrained container, so text does not wrap — it spills past the dial edges silently. This makes the bug visually subtle but present.

---

## Goal

Grow the desktop dial on short-viewport laptops only — specifically inside the range `1440 ≤ vw ≤ 1990 AND vh ≤ 849` — so text retains at least ~20% horizontal padding (fill % ≤ 80%).

**Non-goals:**
- Do not change the dial formula on viewports ≥ 850px tall (16" MBP at 1440×900 already has enough padding).
- Do not touch mobile (≤ 991px).
- Do not change the font-size / letter-spacing of the step text.
- Do not change `.dial_layer-fg` positioning or any JS.

---

## Approach

Add **one** media query to `projects/ready-hit-play-prod/ready-hit-play.css` that overrides `--dial-large-width` and `--dial-large-height` to `60svh` in the problem zone.

### Why 60svh (no vw cap)?

Chosen over `min(58svh, 34vw)` after comparing target fill percentages:

| Viewport | 60svh dial | Text | Fill % |
|---|---|---|---|
| 1440 × 849 (boundary) | 509 px | 376 px | 74% |
| 1440 × 800 | 480 px | 376 px | 78% |
| 1440 × 768 | 461 px | 376 px | 82% |
| 1440 × 720 | 432 px | 376 px | 87% |
| 1920 × 849 (boundary) | 509 px | 469 px | 92% |
| 1920 × 800 | 480 px | 469 px | 98% |
| 1920 × 768 | 461 px | 469 px | 102% — still tight |

At 1920-wide short viewports the text is larger (~469px) so 60svh is the minimum acceptable bump; anything smaller leaves the 1920×800 case unresolved. The vw cap was dropped because at these viewport widths 60svh is always the constraint anyway (0.6 × 849 = 509 px vs 0.34 × 1920 = 653 px).

### CSS change

Insert directly after the default `:root` dial-size block (line ~378 of `ready-hit-play.css`):

```css
/* Short-viewport desktop laptops: bump dial so step text retains horizontal
   padding. Targets vh ≤ 849 in the 1440–1990 width range. Above 849 vh the
   default `min(50svh, 70vw)` already provides ~35px padding each side. */
@media (min-width: 1440px) and (max-width: 1990px) and (max-height: 849px) {
  :root {
    --dial-large-width: 60svh;
    --dial-large-height: 60svh;
  }
}
```

### File change

**`projects/ready-hit-play-prod/ready-hit-play.css`** — add 7 lines after line 378, before the mobile breakpoint block at line 397. Net change: `+7 / -0`. No other files touched.

---

## Why CSS-only (no JS change)

- `--dial-large-width/height` is the single source of truth. All consumers read from it:
  - `.dial_component[data-dial-ns="home"] .dial_layer-fg` (line 331-332) — direct use
  - `.transition-dial` (line 762-763) — `calc(var(--dial-large-width) * 1.184)`
  - `.dial_sector-dot` (line 911-913) — mobile only, not affected by desktop query
- `work-dial.js` `resize()` reads `fgWrap.getBoundingClientRect()` (not CSS vars), so the new size is picked up automatically on `window.resize`.
- `orchestrator.js` `getDialVars()` reads computed CSS custom property values via `getComputedStyle`. Inline styles set on `.dial_layer-fg` during home→case morph (line 197) are cleared with `clearProps: 'all'` after the transition, so the new value takes effect on any post-transition reflow.
- `idleThreshold` in `work-dial.js` scales with `r.width` and is recalculated on every resize — auto-adjusts.

---

## Barba Impact

**N/A — no Barba lifecycle changes.** This is a pure CSS media query. No DOM, listeners, timelines, namespaces, or state involved.

Verification of no-op on morphs:
- During home→case leave, `orchestrator.js:197` inline-sets `.dial_layer-fg { width, height }` in pixels. Inline styles beat CSS vars mid-transition — unchanged.
- After morph, `clearProps: 'all'` restores CSS control — new value picks up cleanly.
- Home → about → home: home namespace re-enters and reads the new CSS var as normal — no stale state.

---

## Regression risk

- **Nav overlap:** At 1440×849 the dial becomes 509px tall. The nav is a `position: fixed` transparent overlay at ~3.5rem (~56px). Dial centered vertically: top = (849 − 509) / 2 = 170px from top. Nav zone is 0–56px. No overlap.
- **Vertical clipping:** At the shortest plausible laptop viewport (1440×720, rare), dial = 432px, centered vertically: top = 144px, bottom = 576px of 720px → 144px bottom margin. Safe.
- **Above 849 vh:** Default formula stays in effect. No visual change.
- **Above 1990 vw:** Default formula stays in effect. No visual change.
- **Width jump at 1990→1991:** At 1990×849, new formula = 509px. At 1991×849, default formula = 424px. A user resizing across the boundary at short vh will see the dial shrink by 85px. Accepted — edge case, not typical browsing behaviour.
- **Height jump at 849→850:** Similar edge case. At 1440×849 = 509px, at 1440×850 = 425px. Jump of 84px. Only affects users actively resizing across the boundary.
- **Tick ring canvas (`.transition-dial`):** Uses `calc(var(--dial-large-width) * 1.184)` — scales proportionally with the new value. Canvas is redrawn on resize, no pixelation risk.
- **1920 × ≤768 residual tightness:** At 1920×768 the new formula gives 461px vs 469px text = 102% fill. Still overflows by ~8px. Accepted as P3 follow-up — if users report it, add an inner media query that also shrinks letter-spacing in that narrow sub-range.

---

## Verify Loop

### Pass/fail criteria

1. **At 1440×800:** Dial `.dial_layer-fg` computed width is **480px ± 1px** (was 400px).
2. **At 1440×768:** Dial computed width is **461px ± 1px** (was 384px).
3. **At 1440×900 (unchanged zone):** Dial computed width remains **450px ± 1px** (default formula).
4. **At 1920×1080 (unchanged zone):** Dial computed width remains **540px ± 1px** (default formula).
5. **At 1440×800:** Step text `[data-text="step"]` rendered width ≤ 80% of `.dial_layer-fg` width.
6. **At 1440×800:** `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no horizontal overflow).
7. **Console:** No new errors on home page load at 1440×800.
8. **Barba round-trip:** home → /about → home at 1440×800 restores dial to 480px width (not stuck at inline pixel value).

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/`.
2. Resize viewport to test size (e.g. 1440×800).
3. Wait for `window.RHP.scriptsOk === true` (up to 20s on cold load).
4. Read `document.querySelector('.dial_component[data-dial-ns="home"] .dial_layer-fg').getBoundingClientRect().width`.
5. Read `document.querySelector('[data-text="step"]').getBoundingClientRect().width`.
6. Compare against the pass/fail table.

### Tier mapping

- **Tier 1 (Playwright):**
  - `bumps dial to 480px at 1440x800` — set viewport, measure dial, assert width ≈ 480.
  - `keeps dial at 450px at 1440x900 (unchanged zone)` — regression guard.
  - `step text ≤ 80% of dial width at 1440x800` — direct fill % assertion.
  - `no horizontal overflow at 1440x800` — scrollWidth === clientWidth.
  - `no console errors at 1440x800` — standard RHP pattern.
  - `barba round-trip preserves dial width at 1440x800` — home → /about → home, re-measure.
- **Tier 2 (CDN regression):** Tests above registered in `tests/registry.json` as `rhp-dial-short-viewport-bump`. Run on `/deploy`.
- **Tier 3 (manual):**
  - Visual sanity check at 1440×768 (no exact width assertion — just "text fits with padding").
  - Cross-browser: Safari rendering at 1440×800 (Playwright is Chromium only; svh unit sometimes differs slightly in Safari).
  - Real MacBook 13" Pro 1440×900 retina check (document measured vs rendered DPI can differ from Playwright emulation).

### Regression scope

Must NOT break:
- Default dial size at 1440×900 (450 px) and 1920×1080 (540 px).
- Mobile dial at 375×812 (governed by separate `@media (max-width: 991px)` block).
- `.transition-dial` tick ring (scales proportionally via `calc(* 1.184)`).
- home → case → home Barba morph (clearProps restores CSS control).
- home → about → home Barba (dial persists outside Barba container, re-reads CSS var on re-entry).
- `.dial_sector-dot` position on mobile (uses `--dial-large-height` via same-name variable, but mobile block overrides it in the same cascade).

---

## Acceptance Tests

Generated at `tests/acceptance/rhp-dial-short-viewport-bump.spec.js`:

1. **`bumps dial to 480px at 1440x800`** — sets viewport 1440×800, asserts `.dial_layer-fg` width is between 475 and 485 px.
2. **`keeps dial at 450px at 1440x900`** — regression guard, asserts unchanged in the zone above the new breakpoint.
3. **`keeps dial at 540px at 1920x1080`** — regression guard for the large unchanged zone.
4. **`step text fits within 80% of dial at 1440x800`** — measures both, asserts ratio ≤ 0.80.
5. **`no horizontal overflow at 1440x800`** — scrollWidth === clientWidth.
6. **`no console errors at 1440x800`** — pageerror listener, zero after load + 500ms settle.
7. **`barba round-trip preserves bumped dial at 1440x800`** — home → /about → home, re-asserts 480px.

---

## Parallelisation Map

| Task | Stream | Agent | Dependencies |
|---|---|---|---|
| 1. Add CSS media query to `ready-hit-play.css` | A | code-writer | — |
| 2. Run acceptance tests against staging | A (same stream) | qa | 1 |

Single sequential stream. No parallelisation — the change is 7 lines in one file.

**Worktrees:** No.
**Agent teams:** No.

---

## Open Questions

None — all resolved via live measurement + user answers.
