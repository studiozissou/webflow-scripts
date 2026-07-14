# Coconut Design System

Extracted from Webflow MCP — 2026-05-21

---

## Typography

| Font | Source | Weights | Role |
|------|--------|---------|------|
| Work Sans | Google Fonts | 300, 400, 500, 600, 700 | Headings (H1–H3) |
| Arco Perpetuo Pro | Custom (uploaded) | Regular, Bold | Body, buttons, lead phrases |
| Inconsolata | Google Fonts | 400, 700 | Mono/accent — code snippets, decorative |

**Fallback stack:** Arial, sans-serif

| Element | Font | Weight | Size token |
|---------|------|--------|------------|
| H1 | Work Sans | 700 | `--_25-text---50px` (3.125em) |
| H2 | Work Sans | 600–700 | `--_25-text---35px` (2.1875em) – `--_25-text---40px` (2.5em) |
| H3 | Work Sans | 600 | `--_25-text---24px` (1.5em) |
| Body | Arco Perpetuo Pro | Regular | `--_25-text---14px` (1em) |
| Body small | Arco Perpetuo Pro | Regular | `--_25-text---12px` (0.75em) |
| Bold lead phrase | Arco Perpetuo Pro | Bold | Inherits parent size |
| CTA button | Arco Perpetuo Pro | Regular | `--_25-text---14px` (1em) |

---

## Variable Collections

### 25 Base (brand colours + radius)

| Variable | CSS Name | Type | Value |
|----------|----------|------|-------|
| Off-White | `--_25-base---off-white` | Color | `whitesmoke` |
| Coco Coral | `--_25-base---coco-coral` | Color | `#f77d53` |
| Black | `--_25-base---black` | Color | `black` |
| Aqua Mist | `--_25-base---aqua-mist` | Color | `#c2efed` |
| Coco Gold | `--_25-base---coco-gold` | Color | `#f7c11c` |
| White | `--_25-base---white` | Color | `white` |
| Coconut Palm | `--_25-base---coconut-palm` | Color | `#2a2228` |
| Coco Cream | `--_25-base---coco-cream` | Color | `#ddd9d4` |
| Round Corner | `--_25-base---round-corner` | Size | `1.5625rem` |

### Base (legacy + extended palette)

| Variable | CSS Name | Type | Value |
|----------|----------|------|-------|
| Blog summary grey | `--blog-summary-grey` | Color | `#61595e` |
| Primary Darkest | `--primary-darkest` | Color | `#066866` |
| Coco Red | `--coco-red` | Color | `#ea526f` |
| Coco Yellow | `--coco-yellow` | Color | `#fabd05` |
| Red lighter | `--red-lighter` | Color | `#ff6683` |
| Transparent | `--transparent` | Color | `rgba(0, 0, 0, 0)` |

#### Neutral

| Step | CSS Name | Value |
|------|----------|-------|
| 10 | `--neutral--10` | `#f7f6f6` |
| 20 | `--neutral--20` | `#f8f7f4` |
| 30 | `--neutral--30` | `#f2efea` |
| 40 | `--neutral--40` | `#ddd9d5` |
| 50 | `--neutral--50` | `#d4d0cc` |
| 60 | `--neutral--60` | `#d4d0cc` |
| 70 | `--neutral--70` | `#736a70` |
| 80 | `--neutral--80` | `#52484f` |
| 90 | `--neutral--90` | `#30262d` |
| 100 | `--neutral--100` | `#191317` |

#### Primary

| Step | CSS Name | Value |
|------|----------|-------|
| 10 | `--primary--10` | `#f0fcfd` |
| 20 | `--primary--20` | `#c1efee` |
| 30 | `--primary--30` | `#adc6ff` |
| 40 | `--primary--40` | `#85a5ff` |
| 50 | `--primary--50` | `#597ef7` |
| 60 | `--primary--60` | `#66d7d1` |
| 70 | `--primary--70` | `#5dc6c0` |
| 80 | `--primary--80` | `#148987` |
| 90 | `--primary--90` | `#0c7876` |
| 100 | `--primary--100` | `#3aa09b` |

### 25 Text (type scale)

All values use `em` units.

| Variable | CSS Name | Value |
|----------|----------|-------|
| 12px | `--_25-text---12px` | `0.75em` |
| 14px | `--_25-text---14px` | `1em` |
| 20px | `--_25-text---20px` | `1.25em` |
| 24px | `--_25-text---24px` | `1.5em` |
| 30px | `--_25-text---30px` | `1.5em` |
| 35px | `--_25-text---35px` | `2.1875em` |
| 40px | `--_25-text---40px` | `2.5em` |
| 50px | `--_25-text---50px` | `3.125em` |
| 70px | `--_25-text---70px` | `4.375em` |
| 80px | `--_25-text---80px` | `5em` |
| 100px | `--_25-text---100px` | `6.25em` |
| 1.2 | `--_25-text---1-2` | `1.2em` |

---

## Quick Reference

### Brand Colours

| Name | Hex | Usage |
|------|-----|-------|
| Coconut Palm | `#2a2228` | Primary dark / text |
| Coco Coral | `#f77d53` | Accent / CTA |
| Coco Gold | `#f7c11c` | Highlight / badge |
| Aqua Mist | `#c2efed` | Light teal background |
| Coco Cream | `#ddd9d4` | Muted background |
| Primary Darkest | `#066866` | Deep teal |
| Coco Red | `#ea526f` | Alert / emphasis |
| Coco Yellow | `#fabd05` | Secondary highlight |

### Border Radius

| Token | Value |
|-------|-------|
| Round Corner | `1.5625rem` (~25px) |
