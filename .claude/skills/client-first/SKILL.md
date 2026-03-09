---
name: client-first
description: Client First naming system reference — variables, structure classes, typography,
  colours, spacing, layout utilities. Use when building or reviewing Webflow sites that
  follow the Finsweet Client First convention.
---

## Variables — Two-Tier System

### Primitives (raw values)

| Prefix | Examples |
|--------|----------|
| `brand-*` | `brand-red`, `brand-blue-dark` |
| `neutral-*` | `neutral-100` through `neutral-900` |

### Semantic (reference primitives)

| Prefix | Purpose |
|--------|---------|
| `background-color-*` | `background-color-primary`, `-secondary`, `-tertiary`, `-alternate` |
| `text-color-*` | `text-color-primary`, `-secondary`, `-tertiary`, `-alternate` |
| `scheme-*` | Dark/light scheme overrides |
| `font-*` | `font-primary`, `font-secondary` |
| `radius-*` | `radius-small`, `-medium`, `-large` |
| `stroke-*` | `stroke-thin`, `-medium`, `-thick` |

### Size Variables

Webflow supports size variables with breakpoint modes:
- **Automatic modes** — one value per breakpoint, applied automatically
- **Manual modes** — applied per class when needed
- Supports `clamp()`, `min()`, `max()` functions as values
- Use for responsive typography, spacing, and container widths

---

## Structure Classes

| Class | Purpose |
|-------|---------|
| `padding-global` | Site-wide horizontal padding (applied to sections) |
| `container-large` | Max-width container — largest |
| `container-medium` | Mid-width container |
| `container-small` | Narrow container (e.g. blog content) |
| `padding-section-small` | Vertical section padding — small |
| `padding-section-medium` | Vertical section padding — medium |
| `padding-section-large` | Vertical section padding — large |

---

## Typography Classes

### Heading styles (combo classes on HTML heading tags)

| Class | Applied to |
|-------|-----------|
| `heading-style-h1` | `<h1>` |
| `heading-style-h2` | `<h2>` |
| `heading-style-h3` | `<h3>` |
| `heading-style-h4` | `<h4>` |
| `heading-style-h5` | `<h5>` |
| `heading-style-h6` | `<h6>` |

### Text utility classes

| Prefix | Values |
|--------|--------|
| `text-size-` | `large`, `medium`, `regular`, `small`, `tiny` |
| `text-weight-` | `light`, `normal`, `medium`, `semibold`, `bold`, `xbold` |
| `text-style-` | `italic`, `uppercase`, `strikethrough`, `underline`, `nowrap` |
| `text-align-` | `left`, `center`, `right` |
| `text-color-` | `primary`, `secondary`, `tertiary`, `alternate` |

---

## Colour Classes

| Class | Purpose |
|-------|---------|
| `background-color-primary` | Main background |
| `background-color-secondary` | Alternate sections |
| `background-color-tertiary` | Cards, panels |
| `background-color-alternate` | Dark/contrast sections |

HTML tags use default styles. Override with utility classes only when needed.

---

## Spacing

### Pattern: direction + size combo classes

Spacing is applied using `.spacer-*` divs, not margin-top/bottom on content elements.

| Class | Purpose |
|-------|---------|
| `spacer-xxsmall` | Tiny gap (4px) |
| `spacer-xsmall` | Extra-small gap (8px) |
| `spacer-small` | Small gap (16px) |
| `spacer-medium` | Medium gap (24px) |
| `spacer-large` | Large gap (32px) |
| `spacer-xlarge` | Extra-large gap (48px) |
| `spacer-xxlarge` | Jumbo gap (64px+) |

### Rules
- Use `.spacer-*` divs for vertical rhythm between siblings
- Do not use margin-top/bottom on content blocks for vertical spacing
- `spacing-clean` removes all spacing from a section

---

## Layout Utility Classes

| Prefix | Values |
|--------|--------|
| `hide-` | `mobile-portrait`, `mobile-landscape`, `tablet`, `desktop` |
| `max-width-` | `full`, `large`, `medium`, `small`, `xsmall`, `xxsmall` |
| `overflow-` | `hidden`, `auto`, `visible` |
| `z-index-` | `1`, `2`, `3` (semantic layering) |
| `layer` | Creates stacking context |
| `align-center` | Centers block element |
| `pointer-events-` | `none`, `auto` |
| `aspect-ratio-` | `1/1`, `16/9`, `4/3`, `3/2` |
| `icon-` | `1rem`, `small`, `medium`, `large` |
| `button` | Base button style |

---

## Key Rules

1. **HTML tags as defaults** — `<h1>` gets heading styles from the tag. Only add `.heading-style-h1` when overriding the default.
2. **Spacer divs for vertical rhythm** — never margin-top/bottom on content.
3. **Semantic names map to utility classes** — a Figma token `heading-desktop-h1` maps to `.heading-style-h1`, not a custom class.
4. **Variables before classes** — set brand values as variables first, then classes reference those variables.
5. **One source of truth** — if a value exists as a variable, classes must reference the variable, not a hardcoded value.
