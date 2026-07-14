# TSC Cargo Template — px/vw → rem Migration

**Status:** Done
**Created:** 2026-06-24
**Client:** The Signalling Company
**Staging:** https://tsc-v2.webflow.io/
**Site ID:** 6a32b717a48adbce92029295

## Summary

Migrate all typography, layout, radius, and icon Webflow Variables in the Cargo+ template from px/vw units to rem (and em for letter-spacing). Then add Client First fluid responsive CSS to the site to restore smooth viewport scaling via a fluid root font-size.

## Why

- **Accessibility:** rem respects user browser font-size preferences; vw does not
- **Consistency:** one unit system across all sizing tokens
- **Maintainability:** rem values are easier to reason about than vw percentages
- **Fluid scaling:** Client First fluid root CSS (proven on NEM Life) gives smoother cross-viewport scaling than raw vw, with better control at breakpoint boundaries

## Approach

1. Convert all `vw` (desktop/tablet) and `px` (mobile) variable values to `rem`
2. Convert letter-spacing variables to `em` (scales with element font-size)
3. Leave viewport-relative layout vars as `vw` (Container widths, Radius/Full)
4. Add Client First fluid root CSS to `global.css` (same pattern as NEM Life `projects/nem-life/global.css:127-177`)

## Reference Width

All desktop rem values are computed at **1440px** viewport width (where root = 16px, so 1rem = 16px). Values rounded to clean rem steps:
- Sizes ≥ 2rem → round to nearest 0.25rem
- Sizes < 2rem → round to nearest 0.125rem
- Sizes < 0.5rem → round to nearest 0.0625rem

---

## Conversion Tables

### Typography — Font Size (14 variables)

**Collection:** `🔠 Typography` (`collection-d119a105-aa5e-3e77-89bc-5a07706ad133`)
**Modes:** Tablet (`mode-13ad6686`), Mobile L (`mode-2a1f3d5e`), Mobile (`mode-99eabf7d`)

| Variable | ID | Desktop/Tablet | Mobile L/M |
|----------|-----|---------------|------------|
| Size/H0 | `variable-3b576bd4` | 8rem | 6rem |
| Size/H1 | `variable-d36d6923` | 4.75rem | 3rem |
| Size/H2 | `variable-93865a61` | 3.25rem | 2.5rem |
| Size/H3 | `variable-9809f602` | 2.5rem | 2rem |
| Size/H4 | `variable-b4ac8a78` | 1.75rem | 1.5rem |
| Size/H5 | `variable-ce4bc688` | 1.375rem | 1.25rem |
| Size/H6 | `variable-1b579138` | 0.875rem | 0.75rem |
| Size/Body 1 | `variable-d3f482ea` | 1rem | 1rem |
| Size/Body 2 | `variable-481fb1da` | 0.875rem | 0.875rem |
| Size/Body 3 | `variable-d6523d18` | 0.75rem | 0.75rem |
| Size/Button 1 | `variable-50801163` | 0.75rem | 0.75rem |
| Size/Button 2 | `variable-77879c42` | 0.625rem | 0.625rem |
| Size/Label 1 | `variable-820e69b1` | 0.625rem | 0.625rem |
| Size/Label 2 | `variable-89932a10` | 0.5rem | 0.5rem |

### Typography — Line Height (14 variables)

| Variable | ID | Desktop/Tablet | Mobile L/M |
|----------|-----|---------------|------------|
| Line Height/H0 | `variable-fb1e5df9` | 6.5rem | 5rem |
| Line Height/H1 | `variable-dd370046` | 4.5rem | 2.75rem |
| Line Height/H2 | `variable-fed09657` | 3rem | 2.25rem |
| Line Height/H3 | `variable-d19b0b17` | 2.625rem | 1.75rem |
| Line Height/H4 | `variable-57a54603` | 2rem | 1.75rem |
| Line Height/H5 | `variable-b5d82152` | 1.625rem | 1.5rem |
| Line Height/H6 | `variable-f6818b33` | 1rem | 1.25rem |
| Line Height/Body 1 | `variable-9ae96d85` | 1.625rem | 1.5rem |
| Line Height/Body 2 | `variable-1fe04c22` | 1.25rem | 1.25rem |
| Line Height/Body 3 | `variable-1b194ce7` | 1rem | 1rem |
| Line Height/Button 1 | `variable-60d8c9cc` | 1rem | 1.25rem |
| Line Height/Button 2 | `variable-9e7d4999` | 0.625rem | 0.75rem |
| Line Height/Label 1 | `variable-aba397de` | 0.75rem | 0.75rem |
| Line Height/Label 2 | `variable-32edee3e` | 0.625rem | 0.625rem |

### Typography — Letter Spacing → em (14 variables)

Single em value per variable across all modes (em scales with element font-size automatically).

| Variable | ID | All modes |
|----------|-----|-----------|
| Letter Spacing/H0 | `variable-ea4e26e2` | -0.03em |
| Letter Spacing/H1 | `variable-e1dbe228` | -0.03em |
| Letter Spacing/H2 | `variable-0193ea5c` | -0.03em |
| Letter Spacing/H3 | `variable-44a68635` | -0.03em |
| Letter Spacing/H4 | `variable-3da926fd` | -0.015em |
| Letter Spacing/H5 | `variable-065e188e` | -0.02em |
| Letter Spacing/H6 | `variable-cf5f159e` | 0.03em |
| Letter Spacing/Body 1 | `variable-bd2ea801` | 0.01em |
| Letter Spacing/Body 2 | `variable-30f24e98` | 0.015em |
| Letter Spacing/Body 3 | `variable-36ac94a7` | 0em |
| Letter Spacing/Button 1 | `variable-411af05a` | 0.07em |
| Letter Spacing/Button 2 | `variable-a39b8bec` | 0.08em |
| Letter Spacing/Label 1 | `variable-c9dab57a` | 0.06em |
| Letter Spacing/Label 2 | `variable-31dd9fc3` | 0.075em |

### Layout — Spacing (13 variables)

**Collection:** `📏 Layout` (`collection-6005b31c-6a27-aaa8-ee1e-4cb111ff5a7b`)
**Modes:** Tablet (`mode-7d465acc`), Mobile L (`mode-32bf77ea`), Mobile (`mode-fbbe1808`)

| Variable | ID | Desktop/Tablet | Mobile L/M |
|----------|-----|---------------|------------|
| Spacing/160 | `variable-becf79a1` | 8rem | 6.5rem |
| Spacing/120 | `variable-f4eff795` | 6rem | 5rem |
| Spacing/80 | `variable-d8b209fe` | 4rem | 3.5rem |
| Spacing/64 | `variable-a634ca20` | 3.25rem | 3rem |
| Spacing/48 | `variable-30400cff` | 2.5rem | 2rem |
| Spacing/32 | `variable-2b092934` | 1.5rem | 1.5rem |
| Spacing/24 | `variable-3b53ddf2` | 1.25rem | 1.25rem |
| Spacing/20 | `variable-28af049e` | 1rem | 1rem |
| Spacing/16 | `variable-1ba6c74c` | 0.75rem | 0.75rem |
| Spacing/12 | `variable-e86ed890` | 0.625rem | 0.5rem |
| Spacing/8 | `variable-8eb13123` | 0.375rem | 0.5rem |
| Spacing/4 | `variable-46196d66` | 0.25rem | 0.25rem |
| Spacing/0 | `variable-63e8842f` | 0rem | 0rem |

### Layout — Section Padding (5 variables)

| Variable | ID | Desktop/Tablet | Mobile L/M |
|----------|-----|---------------|------------|
| Section Padding/Extra Large | `variable-9b326587` | 10rem | 7.5rem |
| Section Padding/Large | `variable-1b921c9f` | 8rem | 6rem |
| Section Padding/Medium | `variable-258fec12` | 6rem | 4rem |
| Section Padding/Small | `variable-04f71984` | 4rem | 3rem |
| Section Padding/Extra Small | `variable-a47369e0` | 1.5rem | 1.5rem |

### Layout — Max Width (10 variables)

| Variable | ID | Desktop/Tablet | Mobile L/M |
|----------|-----|---------------|------------|
| Max Width/1 Column | `variable-a7193ef8` | 5rem | 6.25rem |
| Max Width/2 Columns | `variable-25e86740` | 10.75rem | 13.5rem |
| Max Width/3 Columns | `variable-621c0655` | 16.5rem | 20.75rem |
| Max Width/4 Columns | `variable-2e0cf983` | 22.5rem | 28rem |
| Max Width/5 Columns | `variable-44920ff9` | 28.25rem | 35.25rem |
| Max Width/6 Columns | `variable-e43e1c0f` | 34rem | 42.5rem |
| Max Width/7 Columns | `variable-fc190d50` | 39.75rem | 49.75rem |
| Max Width/8 Columns | `variable-b11edf2f` | 45.625rem | 57rem |
| Max Width/9 Columns | `variable-0b52f3bc` | 51.375rem | 64.25rem |
| Max Width/10 Columns | `variable-15d86a38` | 57.25rem | 71.5rem |
| Max Width/12 Columns | `variable-3168469d` | 68.75rem | 86rem |

### Layout — Grid (3 variables)

| Variable | ID | Desktop/Tablet | Mobile L/M |
|----------|-----|---------------|------------|
| Grid/Page Padding | `variable-58febdb6` | 1.5rem | 1rem |
| Grid/Column Gap | `variable-f7633091` | 0.75rem | 0.75rem |
| Grid/Content Gap | `variable-8d7f64d8` | 6.5rem | 2.5rem |

### Layout — Container (EXCLUDED — stay as vw)

| Variable | Reason |
|----------|--------|
| Container/Large (100vw) | Viewport-relative layout dimension |
| Container/Medium (80vw / 100vw) | Viewport-relative layout dimension |
| Container/Small (50.67vw / 100vw) | Viewport-relative layout dimension |

### Radius (7 variables to migrate, 2 excluded)

**Collection:** `🔘 Radius` (`collection-765cedf5-5696-7392-9b13-8b47032b15a2`)
**Modes:** Tablet (`mode-9c6efecc`), Mobile L (`mode-e8997532`), Mobile (`mode-727fd830`)

| Variable | ID | Desktop/Tablet | Mobile L/M |
|----------|-----|---------------|------------|
| General/Small | `variable-3591d99b` | 0.25rem | 0.25rem |
| General/Default | `variable-5c9ea79b` | 0.375rem | 0.5rem |
| General/Large | `variable-035f3040` | 0.625rem | 0.75rem |
| UI/Button Base | `variable-d74eb202` | 0.375rem | 0.5rem |
| UI/Button Circle | `variable-5886f038` | 0.375rem | 0.5rem |
| UI/Input | `variable-f6efffd6` | 0.375rem | 0.5rem |
| UI/Home Video | `variable-11b952c6` | 0.625rem | 0.75rem |

**Excluded:**
| Variable | Reason |
|----------|--------|
| General/Full (100vw) | Pill radius — intentionally viewport-relative |
| UI/Tag (0px) | Zero value — unit irrelevant |

### Icon (5 variables)

**Collection:** `❇️ Icon` (`collection-7535d137-2b39-3f62-64d9-60965cf441b1`)
**Modes:** Tablet (`mode-1634ad81`), Mobile L (`mode-f26ff46b`), Mobile (`mode-32383ad1`)

| Variable | ID | Desktop/Tablet | Mobile L/M |
|----------|-----|---------------|------------|
| Icon Stroke | `variable-e99c0230` | 0.0625rem | 0.0625rem |
| Button Icon/Button Rectangle | `variable-5b099442` | 0.625rem | 0.75rem |
| Button Icon/Button Circle | `variable-ca31db7f` | 1rem | 1.25rem |
| Regular Icons/Large | `variable-c161e0c4` | 2.25rem | 2.75rem |
| Regular Icons/Medium | `variable-aa580415` | 1.25rem | 1.5rem |

---

## Client First Fluid Root CSS

Add to `projects/the-signalling-company/global.css` (new file) or site-wide embed. Pre-computed linear interpolation coefficients.

```css
html { font-size: 1.125rem; }
@media screen and (max-width:1920px) {
  html { font-size: calc(0.6260395010395009rem + 0.41580041580041593vw); }
}
@media screen and (max-width:1439px) {
  html { font-size: calc(0.19519015659955263rem + 0.8948545861297538vw); }
}
@media screen and (max-width:992px) {
  html { font-size: calc(0.7578125rem + 0.390625vw); }
}
@media screen and (max-width:480px) {
  html { font-size: calc(0.7494780793319415rem + 0.8350730688935282vw); }
}
```

**Breakpoint scaling ranges:**

| Breakpoint | Root at upper | Root at lower | Range |
|------------|--------------|---------------|-------|
| >1920px | 18px (1.125rem) | 18px (static) | Fixed |
| 1439–1920px | 18px | 16px | Scales down |
| 992–1439px | 16px | 12px | Scales down |
| 480–992px | 16px | 14px | Scales down |
| <480px | 16px | ~12px | Scales down |

Above 1920px the root is fixed at 18px. Between 1439–1920px it scales from 16→18px. Below each breakpoint, the root resets to ~16px for readability then scales down within the range.

---

## Totals

| Collection | Variables | Updates (var × 4 modes) |
|------------|-----------|------------------------|
| Typography — Font Size | 14 | 56 |
| Typography — Line Height | 14 | 56 |
| Typography — Letter Spacing | 14 | 56 |
| Layout — Spacing | 13 | 52 |
| Layout — Section Padding | 5 | 20 |
| Layout — Max Width | 10 | 40 |
| Layout — Grid | 3 | 12 |
| Radius | 7 | 28 |
| Icon | 5 | 20 |
| **Total** | **85** | **340** |

Plus 1 new CSS file.

---

## Task Breakdown

### Task 1: Update Typography variables (42 vars, 168 updates)
**Agent:** code-writer (Webflow MCP)
**Actions:** 3 batched MCP calls (font-size, line-height, letter-spacing)

### Task 2: Update Layout variables (31 vars, 124 updates)
**Agent:** code-writer (Webflow MCP)
**Actions:** 4 batched MCP calls (spacing, section padding, max width, grid)

### Task 3: Update Radius variables (7 vars, 28 updates)
**Agent:** code-writer (Webflow MCP)
**Actions:** 1 batched MCP call

### Task 4: Update Icon variables (5 vars, 20 updates)
**Agent:** code-writer (Webflow MCP)
**Actions:** 1 batched MCP call

### Task 5: Write Client First fluid root CSS
**Agent:** code-writer
**Actions:** Create `projects/the-signalling-company/global.css`, register as site script via MCP

### Task 6: Visual regression check
**Agent:** qa (Chrome DevTools MCP)
**Actions:** Screenshot key pages at multiple viewport widths, compare computed font-sizes

## Parallelisation Map

```
Tasks 1-4 (variable updates) — PARALLEL (independent collections)
  ↓ all complete
Task 5 (fluid root CSS) — SEQUENTIAL (depends on variables being rem)
  ↓
Task 6 (visual regression) — SEQUENTIAL (depends on both)
```

- **Parallel streams:** Tasks 1-4 can run simultaneously (4 agents, ~5 min each)
- **Sequential deps:** Task 5 gates on 1-4; Task 6 gates on 5
- **Worktrees:** No (all changes are in Webflow Designer, not git)
- **Teams:** No (single code-writer agent can batch MCP calls efficiently)

**Recommendation:** Run tasks 1-4 sequentially in a single agent session (MCP tool handles batching well). Then task 5 as code-writer. Then task 6 as qa.

---

## Barba Impact

N/A — no Barba transitions in TSC project.

---

## Verify Loop

### Pass/fail criteria

1. **Font sizes match spec** — At 1440px viewport, `getComputedStyle` on a heading element returns the expected px value (e.g. H1 = 4.75rem = 76px at 16px root)
2. **Fluid scaling works** — Resizing viewport from 1440px to 1920px causes font sizes to grow smoothly (not jump)
3. **Mobile sizes correct** — At 375px viewport, body text is readable (≥12px computed)
4. **Browser zoom respects rem** — Ctrl+/- changes text size (unlike vw which ignores zoom)
5. **No console errors** — No CSS parsing errors or broken variable references
6. **Layout intact** — Section padding, spacing, and grid maintain visual proportions
7. **Letter spacing proportional** — Heading letter-spacing tightens proportionally with font-size

### Reproduction steps

1. Navigate to `https://tsc-v2.webflow.io/` at 1440px viewport
2. Inspect H1 element — computed font-size should be ~76px
3. Inspect body text — computed font-size should be ~16px
4. Resize to 1920px — H1 should grow to ~85.5px (76 × 18/16)
5. Resize to 375px — body text should be ≥12px
6. Ctrl++ twice — text should visibly grow (rem responds to zoom)
7. Check section spacing — visual gaps should look proportional

### Tier mapping

- Tiers 1-2: Automated via `tests/acceptance/tsc-cargo-rem-migration.spec.js`
- Tier 3: Manual visual check at 320px, 768px, 1440px, 1920px, 2560px

### Regression scope

- CMS template pages must still render correctly
- Nav and footer spacing must not collapse
- Button text must remain readable at all breakpoints
- No overflow or text truncation from size changes

---

## Test Plan

### Tier 1 — Auto: Playwright local

See `tests/acceptance/tsc-cargo-rem-migration.spec.js`:
- H1 computed font-size at 1440px viewport
- Body text computed font-size at 1440px viewport
- Font size scales between 1440px and 1920px
- No console errors on homepage
- No console errors on overview page

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json`. Runs on `/deploy`.

### Tier 3 — Manual

- **Visual proportion check at 5 widths** (320, 768, 1440, 1920, 2560px) — subjective layout quality
- **Browser zoom test** — Ctrl++ 3 times, check text scales and layout doesn't break
- **Safari/Firefox cross-browser** — Playwright only runs Chromium
- **CMS template pages** — Check blog post, team member, product detail pages render correctly with new sizes

---

## Acceptance Tests

1. `homepage H1 has expected computed font-size at 1440px`
2. `homepage body text has expected computed font-size at 1440px`
3. `font size scales fluidly between 1440px and 1920px`
4. `no console errors on homepage`
5. `no console errors on overview page`
6. `section padding matches expected rem values`
