# Client-First v3 utility classes

Verified against Finsweet's docs on 6 November 2026 (v3 published 23 October 2026). Each group names its source page. Values are the starter cloneable's defaults; a project may change them through the Variables panel, so treat the names as fixed and the values as defaults.

## Core structure

Source: https://finsweet.com/client-first/docs/core-structure-strategy

| Class | Role |
|---|---|
| `page-wrapper` | Outermost div, optional styles |
| `main-wrapper` | `<main>` around all sections, not nav or footer |
| `section_[identifier]` | Native Section, carries global and section padding through Layout variables |
| `container-large` / `container-medium` / `container-small` | `width: 100%`, auto margins, `max-width` from Sizes › Container (large is 80rem by default) |
| `padding-global` | Alternative structure only: left and right padding from Layout › `global-padding` |
| `padding-section-small` / `-medium` / `-large` | Alternative structure only: top and bottom padding from Layout › Section Padding |
| `padding-section-top-small|medium|large`, `padding-section-bottom-small|medium|large` | Alternative structure, one direction |

## Typography

Source: https://finsweet.com/client-first/docs/utility-class-systems

| Prefix | Values |
|---|---|
| `heading-style-` | `h1` `h2` `h3` `h4` `h5` `h6` |
| `text-size-` | `large` `medium` `regular` `small` `tiny` (Typography collection) |
| `text-style-` | `allcaps` `balance` `pretty` `italic` `link` `muted` `nowrap` `quote` `strikethrough` `1line` `2lines` `3lines` |
| `text-weight-` | `xbold` `bold` `semibold` `medium` `normal` `light` |
| `text-align-` | `left` `center` `right` |
| `text-color-` | `primary` `secondary` `alternate` (Theme collection) |
| Buttons | `button`, `button is-secondary`, `button is-text` |

`text-style-uppercase` from v2 is now `text-style-allcaps`. `text-style-underline` is not in the v3 list; `text-style-link` covers link styling. `text-color-tertiary` is not in the v3 starter.

## Spacing

Source: https://finsweet.com/client-first/docs/utility-class-systems and https://finsweet.com/client-first/docs/spacing-strategy

Size scale, shared by margin, padding and gap, values from Layout › Spacing with breakpoint modes:

| Size | Default |
|---|---|
| `0` | 0rem |
| `xxtiny` | 0.25rem |
| `xtiny` | 0.5rem |
| `tiny` | 0.75rem |
| `xxsmall` | 1rem |
| `xsmall` | 1.25rem |
| `small` | 1.5rem |
| `medium` | 2rem |
| `large` | 3rem |
| `xlarge` | 4rem |
| `xxlarge` | 5rem |
| `huge` | 6rem |
| `xhuge` | 8rem |
| `xxhuge` | 12rem |

| Pattern | Meaning |
|---|---|
| `margin-[size]`, `padding-[size]` | All sides |
| `margin-[direction]-[size]`, `padding-[direction]-[size]` | Directions: `top` `bottom` `left` `right` `horizontal` `vertical`; every size is available for every direction |
| `gap-[size]` | `gap` on a flex or grid parent, `gap-0` through `gap-xxhuge` |
| `spacing-clean` | All margin and padding to 0 |

Section padding (`padding-section-*`) uses its own values in Layout › Section Padding, not this scale. There is no `spacer-*` class in v3; the spacing block is an empty div with `padding-bottom-[size]`.

## Responsive hide

Source: https://finsweet.com/client-first/docs/utility-class-systems

`hide` (all devices), `hide-tablet`, `hide-mobile-landscape`, `hide-mobile-portrait`. Each hides from that breakpoint down.

## Inherit

`text-color-inherit`, `text-size-inherit`, `text-weight-inherit`, `text-decoration-inherit`, `border-radius-inherit`.

## Grid

| Class | Meaning |
|---|---|
| `grid-autofit` | Webflow native auto-fit columns |
| `grid-autofit-css` | Auto-fit through custom CSS |
| `grid-autofit-[size]` | Minimum column width for auto-fit (Sizes collection) |
| `grid-autofill-css` | Auto-fill through custom CSS (no native option) |
| `grid-autofill-[size]` | Minimum column width for auto-fill |
| `grid-span-full` | Item spans the full grid width |

Apply a custom class first, then the grid class as a combo.

## Display

`display-inline`, `display-inline-flex` (base breakpoint), `display-contents`.

## Max width

Values from Sizes › Max Width. Use `container-*` for the outer content width and `max-width-*` inside it.

| Class | Default |
|---|---|
| `max-width-xxlarge` | 80rem |
| `max-width-xlarge` | 64rem |
| `max-width-large` | 48rem |
| `max-width-medium` | 32rem |
| `max-width-small` | 20rem |
| `max-width-xsmall` | 16rem |
| `max-width-xxsmall` | 12rem |
| `max-width-full` | `max-width: none` |
| `max-width-full-tablet`, `max-width-full-mobile-landscape`, `max-width-full-mobile-portrait` | `max-width: none` from that breakpoint |

## Icons

`icon-height-small|medium|large` (height only), `icon-1x1-small|medium|large` (height and width). Values from Sizes.

## Background colour

`background-color-primary`, `background-color-secondary`, `background-color-tertiary`, `background-color-alternate`. Values from Theme › Background.

## Other utilities

| Class | CSS |
|---|---|
| `z-index-1`, `z-index-2` | `z-index: 1 / 2` |
| `align-center` | `margin-left: auto; margin-right: auto` |
| `pointer-events-none`, `pointer-events-auto` | `pointer-events` |
| `overflow-hidden`, `overflow-scroll`, `overflow-auto`, `overflow-clip`, `overflow-visible` | `overflow` |
| `disable-select` | `user-select: none` |
| `text-area-vertical` | `resize: vertical` |
| `aspect-ratio-square` | `1 / 1` |
| `aspect-ratio-portrait` | `2 / 3` |
| `aspect-ratio-landscape` | `3 / 2` |
| `aspect-ratio-widescreen` | `16 / 9` |

The v2 names `aspect-ratio-1/1`, `-16/9`, `-4/3`, `-3/2`, `z-index-3`, `layer` and `icon-1rem`/`icon-small|medium|large` are not in the v3 starter.

## Global embed

Source: https://finsweet.com/client-first/docs/global-styles-embed

`Global / Styles` component with two embeds: `global-styles_default` (Finsweet's CSS) and `global-styles_custom` (project CSS). Default snippets reference `--_sizes---focus--width`, `--_sizes---focus--offset`, `--_theme---system--focus-state`, `--_theme---system--selection-background` and `--_theme---system--selection-text`, which shows Webflow's variable CSS naming: `--_<collection>---<group>--<variable>`.

## Variable collections

Source: https://finsweet.com/client-first/docs/variables

Base (primitives), Theme (Background, Border, Text, Link, System), Typography (breakpoint modes), Layout (Spacing, Section Padding, `global-padding`; breakpoint modes), Sizes (Container, Max Width, Icon, grid minimums, focus).

## Changelog

Source: https://finsweet.com/client-first/docs/changelog

v3, 23 October 2026: cloneable rebuilt on Webflow Variables; component naming page added; variables page rewritten for the new collections; core structure moved to the native Section element and a flatter section; new spacing system; new text style, inherit, grid, gap and display utilities; classes strategy 2 rewritten around custom class plus utility class; global styles split into default and custom embeds. Previous release was v2.1 on 9 January 2023.
