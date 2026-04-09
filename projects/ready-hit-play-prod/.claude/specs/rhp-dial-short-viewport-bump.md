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

### Measurements (live rhpcircle.webflow.io — MCP-verified 2026-04-09)

> **Note:** The earlier spec draft recorded step text at 376 px for the 1440×… row. The actual rendered width is **438.55 px** due to `letter-spacing: 5.63 px` applied to the H7 step element. The table below is the corrected ground truth.

| Viewport | Dial Ø | Text rendered | Fill % | Status |
|---|---|---|---|---|
| 1440 × 900 | 450 px | 438.55 px | 97% | Tight but contained |
| 1440 × 800 | 400 px | 438.55 px | **110%** | **Overflows** ticks |
| 1440 × 720 | 360 px | 438.55 px | **122%** | **Overflows** ticks |
| 1920 × 1080 | 540 px | 468.88 px | 87% | OK — ~36px each side |

**Root cause:** `50svh` makes the dial shrink with viewport height while the fluid `rem` + `letter-spacing` keeps the step text width roughly stable within a given width band. Below a certain vh threshold, the dial becomes narrower than the text, and the live text width is dominated by letter-spacing rather than font-size.

**Note on element behaviour:** The step element is `display: flex; white-space: normal` inside an unconstrained container, so text does not wrap — it spills past the dial edges silently. This makes the bug visually subtle but present.

---

## Goal

Grow the desktop dial on short-viewport laptops only — specifically inside the range `1440 ≤ vw ≤ 1990 AND vh ≤ 849` — so the step text fits comfortably on one line inside the tick ring with breathing room (fill % ≤ ~90%, target ~87% at 1440×800).

> **Revised 2026-04-09:** Originally targeted ≤80% fill. After discovering the step text is 438.55 px (not 376 px), hitting ≤80% would require either a much larger dial (70svh+, visually chunky) or a letter-spacing reduction (brand-impacting). Shipped 65svh first; user requested a slightly smaller size on review. Final value **63svh** — tight fit (87.0%) without the 65svh bulkiness.

**Non-goals:**
- Do not change the dial formula on viewports ≥ 850px tall (16" MBP at 1440×900 already has enough padding).
- Do not touch mobile (≤ 991px).
- Do not change the font-size / letter-spacing of the step text.
- Do not change `.dial_layer-fg` positioning or any JS.

---

## Approach

Add **one** media query to `projects/ready-hit-play-prod/ready-hit-play.css` that overrides `--dial-large-width` and `--dial-large-height` to `63svh` in the problem zone.

### Why 63svh (no vw cap)?

Chosen after the 2026-04-09 re-measurement corrected the step text width from 376 px → 438.55 px, and after live in-browser review of the 65svh draft (judged slightly too chunky on a real 13" MBP). Comparison of bump options against the real text width:

| Viewport | 60svh dial | **63svh dial** | 65svh dial | 70svh dial | Text |
|---|---|---|---|---|---|
| 1440 × 849 (upper boundary) | 509 px (86%) | **535 px (82%)** | 552 px (79%) | 594 px (74%) | 438.55 |
| 1440 × 800 | 480 px (91%) | **504 px (87%)** | 520 px (84%) | 560 px (78%) | 438.55 |
| 1440 × 768 | 461 px (95%) | **484 px (91%)** | 499 px (88%) | 538 px (82%) | 438.55 |
| 1920 × 849 (upper boundary) | 509 px (92%) | **535 px (88%)** | 552 px (85%) | 594 px (79%) | 468.88 |
| 1920 × 800 | 480 px (98%) | **504 px (93%)** | 520 px (90%) | 560 px (84%) | 468.88 |

- **60svh** — 91% fill at the primary 1440×800 target. Text fits but feels cramped.
- **63svh (chosen)** — 87% fill. Breathing room; dial is visually balanced on 13" MBP without feeling oversized.
- **65svh** — 84% fill. Slightly too generous per live review — dial visually dominant against the truck scene.
- **70svh** — 78% fill (only bump to pass original ≤80% goal). Rejected: 560 px dial fills 70% of viewport height, feels oversized.

### CSS change

Insert directly after the default `:root` dial-size block (line ~378 of `ready-hit-play.css`):

```css
/* Short-viewport desktop laptops: bump dial so step text fits with breathing
   room. Targets vh ≤ 849 in the 1440–1990 width range. The live step text
   ("Great stories made undeniable") measures ~438px due to letter-spacing,
   so at the default 50svh (400px at 800h) it would overflow the dial. 63svh
   gives 504px at 1440×800 (≈87% text-fill) and ~535px at the 849 upper bound. */
@media (min-width: 1440px) and (max-width: 1990px) and (max-height: 849px) {
  :root {
    --dial-large-width: 63svh;
    --dial-large-height: 63svh;
  }
}
```

### File change

**`projects/ready-hit-play-prod/ready-hit-play.css`** — add 9 lines after line 378, before the mobile breakpoint block. Net change: `+9 / -0`. No other files touched.

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

- **Nav overlap:** At 1440×849 the dial becomes ~535px tall. The nav is a `position: fixed` transparent overlay at ~3.5rem (~56px). Dial centered vertically: top = (849 − 535) / 2 ≈ 157px from top. Nav zone is 0–56px. No overlap.
- **Vertical clipping:** At the shortest plausible laptop viewport (1440×720, rare), dial ≈ 454px, centered vertically: top ≈ 133px, bottom ≈ 587px of 720px → 133px bottom margin. Safe.
- **Above 849 vh:** Default formula stays in effect. No visual change.
- **Above 1990 vw:** Default formula stays in effect. No visual change.
- **Width jump at 1990→1991:** At 1990×849, new formula ≈ 535px. At 1991×849, default formula ≈ 424px. A user resizing across the boundary at short vh will see the dial shrink by ~110px. Accepted — edge case, not typical browsing behaviour.
- **Height jump at 849→850:** At 1440×849 ≈ 535px, at 1440×850 = 425px. Jump of ~110px. Only affects users actively resizing across the boundary. **MCP-verified 2026-04-09** — transition is crisp, no flash.
- **Tick ring canvas (`.transition-dial`):** Uses `calc(var(--dial-large-width) * 1.184)` — scales proportionally with the new value. Canvas is redrawn on resize, no pixelation risk.
- **1920 × ≤768 residual tightness:** At 1920×768 the new formula gives ~484px vs 469px text ≈ 97% fill. Tight but contained. Accepted as P3 follow-up if users report it.

---

## Verify Loop

### Pass/fail criteria

1. **At 1440×800:** Dial `.dial_layer-fg` computed width is **504px ± 5px** (was 400px).
2. **At 1440×768:** Dial computed width is **~484px ± 5px** (was 384px).
3. **At 1440×900 (unchanged zone):** Dial computed width remains **450px ± 5px** (default formula).
4. **At 1920×1080 (unchanged zone):** Dial computed width remains **540px ± 5px** (default formula).
5. **At 1440×800:** Step text `[data-text="step"]` rendered width ≤ **90%** of `.dial_layer-fg` width (target ~87% = 438.55 / 504).
6. **At 1440×800:** `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no horizontal overflow).
7. **Console:** No new errors on home page load at 1440×800.
8. **Barba round-trip:** home → /about → home at 1440×800 restores dial to 504px width (not stuck at inline pixel value).

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/`.
2. Resize viewport to test size (e.g. 1440×800).
3. Wait for `window.RHP.scriptsOk === true` (up to 20s on cold load).
4. Read `document.querySelector('.dial_component[data-dial-ns="home"] .dial_layer-fg').getBoundingClientRect().width`.
5. Read `document.querySelector('[data-text="step"]').getBoundingClientRect().width`.
6. Compare against the pass/fail table.

### Tier mapping

- **Tier 1 (Playwright):**
  - `bumps dial to ~504px (63svh) at 1440x800` — set viewport, measure dial, assert width ≈ 504.
  - `keeps dial at ~450px at 1440x900 (unchanged zone)` — regression guard.
  - `step text fits within dial with breathing room at 1440x800` — direct fill % assertion ≤ 0.90.
  - `no horizontal overflow at 1440x800` — scrollWidth === clientWidth.
  - `no console errors at 1440x800` — standard RHP pattern.
  - `barba round-trip preserves bumped dial at 1440x800` — home → /about → home, re-measure 504.
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

1. **`bumps dial to ~504px (63svh) at 1440x800`** — sets viewport 1440×800, asserts `.dial_layer-fg` width is between 499 and 509 px.
2. **`keeps dial at ~450px at 1440x900`** — regression guard, asserts unchanged in the zone above the new breakpoint.
3. **`keeps dial at ~540px at 1920x1080`** — regression guard for the large unchanged zone.
4. **`step text fits within dial with breathing room at 1440x800`** — measures both, asserts ratio ≤ 0.90 (real measured ≈ 0.870).
5. **`no horizontal overflow at 1440x800`** — scrollWidth === clientWidth.
6. **`no console errors at 1440x800`** — pageerror listener, zero after load + 500ms settle.
7. **`barba round-trip preserves bumped dial at 1440x800`** — home → /about → home, re-asserts 504px ± 5.

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
