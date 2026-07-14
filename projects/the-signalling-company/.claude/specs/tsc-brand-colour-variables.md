# TSC Brand Colour Variables

**Status:** Ready to Build
**Created:** 2026-06-24
**Client:** The Signalling Company
**Staging:** https://tsc-v2.webflow.io/
**Site ID:** 6a32b717a48adbce92029295
**Slug:** tsc-brand-colour-variables

## Summary

Add TSC's 4 Pantone-matched brand colours and their full scales (Cyan, Ink, Steel) to the Cargo+ template's `🎨 Color / Base` variable collection via Webflow MCP. Update 3 existing base variables to align with the brand palette. No token layer changes — the existing semantic token system continues working via `color-mix()` auto-cascade.

## Why

The Cargo+ template ships with placeholder colours (`#0B1622` dark, `#38C6F4` cyan, `#EDEDED` light). TSC's brand book defines:
- 4 brand constants (Ink, Cyan, Yellow, Steel)
- 3 full colour scales with hand-picked hex values (Cyan 7 steps, Ink 6 steps, Steel 8 steps)
- Light/Dark layout ratios (30/20/10/40 and 50/20/10/20)

The brand scales provide contrast-tested, opaque colour ramps for design use, while the template's existing `color-mix()` opacity scales continue to power the token layer.

## Brand Constants (Pantone-matched)

| Role | Pantone | Name | Hex |
|------|---------|------|-----|
| Primary | PMS 296 C | Ink | `#0B1622` |
| Primary | PMS 298 C | Cyan | `#38C6F4` |
| Accent | PMS 108 C | Yellow | `#FFDD00` |
| Neutral | PMS 6113 C | Steel | `#929EA7` |

## Colour Ratio (Brand Book)

| Layout | Ink | Cyan | Yellow | Steel/Light |
|--------|-----|------|--------|-------------|
| Light | 30% | 20% | 10% | 40% |
| Dark | 50% | 20% | 10% | 20% |

The template's token layer Dark Mode swap already implements this ratio shift — `Background/Base` swaps Light↔Dark, `Tone/Strong` swaps Dark↔Light.

## Architecture

### 2-layer colour system (Cargo+ template)

```
Layer 1: 🎨 Color / Base (collection-1843df4c)
├── Base/Dark 100%…0%   ← opacity scale, powers tokens
├── Base/Light 100%…0%  ← opacity scale, powers tokens
├── Accent/Primary      ← flat hex
├── Lift/Light, Lift/Dark
├── UI/Success, Warning, Error
├── [NEW] Accent/Secondary     ← Yellow
├── [NEW] Cyan/700…100         ← brand scale
├── [NEW] Ink/800…400          ← brand scale
└── [NEW] Steel/900…050        ← brand scale

Layer 2: 🎨 Color / Tokens (collection-a49bdcac)
├── Background/Base, Lift, Semi-transparent, Gradients
├── Tone/Strong, Medium, Subtle, Faint
├── Button Primary/Secondary/Tertiary states
└── Input states
    (all reference Base layer — NO CHANGES to this layer)
```

### Why both scales coexist

| Template opacity scale | Brand hex scale |
|----------------------|-----------------|
| `color-mix(in srgb, #0B1622 64%, transparent)` | `Ink/600 = #22384E` |
| Semi-transparent overlay on any background | Opaque surface colour with tested contrast |
| Powers dark mode token swaps | Available for manual design picks |
| Auto-generated from 1 base hex | Hand-picked by brand designer |

## Changes

### Update 3 existing variables

| Variable | Variable ID | From | To | Reason |
|----------|------------|------|-----|--------|
| `Base/Light 100%` | `variable-37a8e829` | `#EDEDED` | `#F7F8F9` (Steel 050) | Cooler, whiter page bg — cascades through all 8 opacity steps |
| `Lift/Light` | `variable-92991b71` | `#D9D9D9` | `#E4E8EB` (Steel 200) | Lifted surfaces align with brand neutrals |
| `Lift/Dark` | `variable-5979c3f0` | `#0B1622` | `#111F2F` (Ink 800) | Dark cards get slight lift off pure Ink |

### Create 20 new variables in Color / Base

**Collection ID:** `collection-1843df4c-e9ab-da1d-94c6-dc6b0d5dda9c`

#### Accent (1 variable)

| Variable Name | Hex |
|---------------|-----|
| `Accent/Secondary` | `#FFDD00` |

#### Cyan Scale (6 variables — 500 exists as Accent/Primary)

| Variable Name | Hex |
|---------------|-----|
| `Cyan/700` | `#0E83B8` |
| `Cyan/600` | `#1AA3DE` |
| `Cyan/400` | `#6FD7F7` |
| `Cyan/300` | `#A6E6FA` |
| `Cyan/200` | `#D2F2FC` |
| `Cyan/100` | `#ECFAFE` |

#### Ink Scale (5 variables — 900 exists as Base/Dark 100%)

| Variable Name | Hex |
|---------------|-----|
| `Ink/800` | `#111F2F` |
| `Ink/700` | `#182A3D` |
| `Ink/600` | `#22384E` |
| `Ink/500` | `#324A62` |
| `Ink/400` | `#4C6076` |

#### Steel Scale (8 variables)

| Variable Name | Hex |
|---------------|-----|
| `Steel/900` | `#2E363C` |
| `Steel/700` | `#5C6973` |
| `Steel/500` | `#929EA7` |
| `Steel/400` | `#AEB8BF` |
| `Steel/300` | `#CBD2D7` |
| `Steel/200` | `#E4E8EB` |
| `Steel/100` | `#F1F3F5` |
| `Steel/050` | `#F7F8F9` |

## Task Breakdown

### Task 1: Update 3 existing base variables
- **Agent:** code-writer (Webflow MCP)
- **Operations:** 3 `update_color_variable` calls
- **Risk:** Low — `Base/Light 100%` change cascades through opacity scale, but all steps remain valid
- **Dependencies:** None

### Task 2: Create Yellow accent variable
- **Agent:** code-writer (Webflow MCP)
- **Operations:** 1 `create_color_variable` call
- **Dependencies:** None

### Task 3: Create Cyan scale (6 variables)
- **Agent:** code-writer (Webflow MCP)
- **Operations:** 6 `create_color_variable` calls
- **Dependencies:** None

### Task 4: Create Ink scale (5 variables)
- **Agent:** code-writer (Webflow MCP)
- **Operations:** 5 `create_color_variable` calls
- **Dependencies:** None

### Task 5: Create Steel scale (8 variables)
- **Agent:** code-writer (Webflow MCP)
- **Operations:** 8 `create_color_variable` calls
- **Dependencies:** None

### Task 6: Verify via MCP read-back
- **Agent:** qa
- **Operations:** `get_variables` on Color/Base collection, validate all 24 original + 20 new variables present with correct hex values
- **Dependencies:** Tasks 1–5

## Parallelisation Map

```
Stream A: Tasks 1–5 (all independent, can batch into 1–2 MCP calls)
  └── Est: 1 API call with 23 actions
  └── Est tokens: ~2,000

Stream B: Task 6 (verify)
  └── Depends on: Stream A
  └── Est: 1 API call
  └── Est tokens: ~1,000

Recommendation: Sequential (A then B) — single agent, no worktrees needed.
Total estimated: 2 MCP calls, ~3,000 tokens.
```

## Barba Impact

N/A — no Barba transitions on TSC site. Template uses standard Webflow page navigation.

## Verify Loop

### Pass/fail criteria

1. **20 new variables exist** in `🎨 Color / Base` collection with correct hex values
2. **3 updated variables** show new hex values:
   - `Base/Light 100%` = `#F7F8F9`
   - `Lift/Light` = `#E4E8EB`
   - `Lift/Dark` = `#111F2F`
3. **Token layer unchanged** — all 36 token variables still reference the same Base variable IDs
4. **No console errors** on homepage or any page
5. **Page backgrounds render** — homepage background colour reflects updated `Base/Light 100%`

### Reproduction steps

1. Run `get_variables` on `collection-1843df4c-e9ab-da1d-94c6-dc6b0d5dda9c` via Webflow MCP
2. Verify 44 total variables (24 original + 20 new)
3. Spot-check hex values for each brand scale
4. Run `get_variables` on `collection-a49bdcac-9684-253e-f2a5-ec790ca24346` — confirm token variable references unchanged
5. Navigate to `https://tsc-v2.webflow.io/` — visually confirm lighter page background
6. Open DevTools — verify `--_🎨-color--base---base--light-100` resolves to `#F7F8F9`

### Tier mapping

- **Tier 1 (Auto):** Acceptance tests validate computed CSS values + console errors
- **Tier 2 (CDN):** N/A — changes are in Webflow Designer, not script code
- **Tier 3 (Manual):** Visual check that page backgrounds and surfaces look correct with updated neutrals

### Regression scope

- Existing template styling must not break — all token references remain valid
- Dark mode (if toggled via style mode) must still swap correctly
- No other modules or scripts affected — this is a Designer-only variable change

## Future Work (out of scope)

- Wire `Accent/Secondary` (Yellow) into button CTA tokens
- Replace `color-mix()` opacity steps with brand scale hex values in tokens
- Dark mode token adjustments to use Ink scale for surface hierarchy
- Add Yellow scale if brand book provides one later

## Acceptance Tests

See `tests/acceptance/tsc-brand-colour-variables.spec.js`

1. `homepage background uses updated Base/Light value` — checks computed bg colour
2. `Lift/Light surface uses Steel 200` — checks lifted card/panel bg colour
3. `Accent/Primary cyan is correct` — checks interactive element colour
4. `no console errors on homepage` — error-free rendering
5. `no console errors on overview page` — error-free rendering
