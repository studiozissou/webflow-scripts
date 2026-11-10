# Client First V3 utility classes (verified)

Verified 2026-11-04 against finsweet.com Client First V3 docs (V3 released 23 Oct 2026) and the V3 starter cloneable. Every class below appears in the source named in its row. Starter values are placeholders: the project's own variable values always override them, so read the project's Variables panel before quoting a number.

Source key (full URLs are repeated in each row so a row can be checked on its own):

- Utility class systems: https://finsweet.com/client-first/docs/utility-class-systems
- Core structure strategy: https://finsweet.com/client-first/docs/core-structure-strategy
- Spacing strategy: https://finsweet.com/client-first/docs/spacing-strategy
- What's new in V3: https://finsweet.com/client-first/docs/whats-new
- Client-First AI skill file: https://finsweet.com/client-first/docs/client-first-skill
- Starter cloneable CSS: https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css

## Contents

1. Structure
2. Typography
3. Spacing
4. Grid, gap and display
5. Max width
6. Hide
7. Icons
8. Background and text colour
9. Other utilities
10. Removed or discouraged
11. Starter scale (placeholder values)
12. Where the sources disagree
13. Not in the docs

## 1. Structure

| Class | What it does / value | Source |
|---|---|---|
| `page-wrapper` | Outermost parent of every element on the page. Keep styling minimal. | https://finsweet.com/client-first/docs/core-structure-strategy |
| `main-wrapper` | Set to the `<main>` tag. Wraps the page content; nav and footer sit outside it. | https://finsweet.com/client-first/docs/core-structure-strategy |
| `section_[section-identifier]` | Native Section element (`<section>`). Default structure: padding-left/right from `global-padding`, padding-top/bottom from the Section Padding group (Layout collection). | https://finsweet.com/client-first/docs/core-structure-strategy |
| `container-large` | `width: 100%`, auto side margins, max-width from Sizes > Container (starter 80rem). | https://finsweet.com/client-first/docs/utility-class-systems |
| `container-medium` | As above, starter 64rem. | https://finsweet.com/client-first/docs/utility-class-systems |
| `container-small` | As above, starter 48rem. | https://finsweet.com/client-first/docs/utility-class-systems |
| `padding-global` | Alternative structure only. padding-left/right from `global-padding`, nothing else. | https://finsweet.com/client-first/docs/core-structure-strategy |
| `padding-section-small`, `padding-section-medium`, `padding-section-large` | Alternative structure only. Equal top and bottom padding from the Section Padding group. Combo on the `padding-global` element. | https://finsweet.com/client-first/docs/utility-class-systems |
| `padding-section-top-small`, `padding-section-top-medium`, `padding-section-top-large` | Alternative structure only. Top section padding (new in V3). | https://finsweet.com/client-first/docs/utility-class-systems |
| `padding-section-bottom-small`, `padding-section-bottom-medium`, `padding-section-bottom-large` | Alternative structure only. Bottom section padding (new in V3). | https://finsweet.com/client-first/docs/utility-class-systems |
| `section-style-dark` | Example global add-on class stacked on `section_[identifier]` for styles shared by many sections. | https://finsweet.com/client-first/docs/core-structure-strategy |
| `global-styles_default` | Embed inside the `Global / Styles` component holding the CSS that ships with Client First. Do not edit. | https://finsweet.com/client-first/docs/client-first-skill |
| `global-styles_custom` | Embed inside `Global / Styles` for project CSS. | https://finsweet.com/client-first/docs/client-first-skill |

## 2. Typography

HTML tags (`body`, `h1` to `h6`) carry the defaults. These classes are for variations only. Source: https://finsweet.com/client-first/docs/typography-strategy

| Class | What it does / value | Source |
|---|---|---|
| `heading-style-h1`, `heading-style-h2`, `heading-style-h3`, `heading-style-h4`, `heading-style-h5`, `heading-style-h6` | Makes an element look like that heading level without changing its tag. Values from the H1 to H6 groups in Typography. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-size-large` | Font size, starter 1.5rem / 1.5rem / 1.25rem (desktop / tablet / mobile landscape). | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-size-medium` | Starter 1.25rem at every breakpoint. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-size-regular` | Starter 1rem. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-size-small` | Starter 0.875rem. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-size-tiny` | Starter 0.75rem. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-weight-xbold` | 800 in the starter. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-weight-bold` | 700. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-weight-semibold` | 600 (the variable is named `semi-bold`, the class `semibold`). | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-weight-medium` | 500. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-weight-normal` | 400. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-weight-light` | 300. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-style-allcaps` | All caps. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-style-italic` | Italic. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-style-strikethrough` | Strikethrough. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-style-nowrap` | No wrapping. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-style-muted` | Muted text treatment (check the project's styles). | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-style-link` | Link text treatment (check the project's styles). | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-style-quote` | Quote text treatment (check the project's styles). | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-style-balance` | Balances line lengths across a text block. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `text-style-pretty` | Stops a single word sitting alone on the last line. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `text-style-1line` | Limits text to one line. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `text-style-2lines` | Truncates after two lines. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-style-3lines` | Truncates after three lines. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-align-left`, `text-align-center`, `text-align-right` | Text alignment. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-color-primary`, `text-color-secondary`, `text-color-alternate` | Text colour from the Theme > Text group. Names are examples; check the project. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-color-inherit` | Inherits colour from the parent. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `text-size-inherit` | Inherits font size from the parent. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `text-weight-inherit` | Inherits font weight from the parent. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `text-decoration-inherit` | Inherits text decoration from the parent. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `text-rich-text` | Styles Rich Text content through nested tag selectors. Add no classes inside the Rich Text block. | https://finsweet.com/client-first/docs/client-first-skill |

## 3. Spacing

Every spacing class reads its value from the Spacing group in the Layout collection, which has Desktop, Tablet and Mobile Landscape modes. "We do not hardcode spacing values on utility classes." Every size is available for every direction. Source: https://finsweet.com/client-first/docs/spacing-strategy

| Class | What it does / value | Source |
|---|---|---|
| `margin-[size]` | Margin on all sides. | https://finsweet.com/client-first/docs/spacing-strategy |
| `padding-[size]` | Padding on all sides. | https://finsweet.com/client-first/docs/spacing-strategy |
| `margin-top-[size]`, `margin-bottom-[size]`, `margin-left-[size]`, `margin-right-[size]` | Margin on one side. Direction and size are one class in V3. | https://finsweet.com/client-first/docs/spacing-strategy |
| `margin-horizontal-[size]`, `margin-vertical-[size]` | Margin on a pair of opposite sides. | https://finsweet.com/client-first/docs/spacing-strategy |
| `padding-top-[size]`, `padding-bottom-[size]`, `padding-left-[size]`, `padding-right-[size]` | Padding on one side. | https://finsweet.com/client-first/docs/spacing-strategy |
| `padding-horizontal-[size]`, `padding-vertical-[size]` | Padding on a pair of opposite sides. | https://finsweet.com/client-first/docs/spacing-strategy |
| `gap-[size]` | Gap on a flex or grid parent, from the same scale. New in V3. | https://finsweet.com/client-first/docs/spacing-strategy |
| `spacing-clean` | Sets all margin and padding to 0. Use it to strip native Webflow component spacing. | https://finsweet.com/client-first/docs/spacing-strategy |

`[size]` is one of the 14 steps below. The same name means the same value in margin, padding and gap. Desktop values are the docs defaults; tablet and mobile landscape values come from the starter cloneable CSS (https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css).

| Size | Desktop | Tablet (991px) | Mobile landscape (767px) | Source (name and desktop value) |
|---|---|---|---|---|
| `0` | 0rem | 0rem | 0rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `xxtiny` | 0.25rem | 0.25rem | 0.25rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `xtiny` | 0.5rem | 0.5rem | 0.5rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `tiny` | 0.75rem | 0.75rem | 0.75rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `xxsmall` | 1rem | 1rem | 1rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `xsmall` | 1.25rem | 1.25rem | 1.25rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `small` | 1.5rem | 1.5rem | 1.5rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `medium` | 2rem | 1.5rem | 1.25rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `large` | 3rem | 2.5rem | 1.5rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `xlarge` | 4rem | 3rem | 2rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `xxlarge` | 5rem | 4rem | 3rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `huge` | 6rem | 5rem | 4rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `xhuge` | 8rem | 6rem | 5rem | https://finsweet.com/client-first/docs/spacing-strategy |
| `xxhuge` | 12rem | 8rem | 6rem | https://finsweet.com/client-first/docs/spacing-strategy |

Section padding is a separate scale: `padding-section-small` and `padding-small` are not the same value. See section 11.

## 4. Grid, gap and display

Client First has no flex, column or breakpoint layout classes; build layouts with custom classes and add these on top.

| Class | What it does / value | Source |
|---|---|---|
| `grid-autofit` | Auto-fit columns with Webflow's native setting. Fixed minimum width, not a variable. Cannot shrink below its minimum on narrow screens. | https://finsweet.com/client-first/docs/utility-class-systems |
| `grid-autofit-css` | Auto-fit through custom CSS. Fixed minimum width you edit directly. | https://finsweet.com/client-first/docs/utility-class-systems |
| `grid-autofit-[size]` | Auto-fit with a minimum column width from Sizes > Grid Columns: `xsmall` 15rem, `small` 20rem, `medium` 30rem, `large` 40rem (starter). | https://finsweet.com/client-first/docs/utility-class-systems |
| `grid-autofill-css` | Auto-fill through custom CSS. No native version exists. | https://finsweet.com/client-first/docs/utility-class-systems |
| `grid-autofill-[size]` | Auto-fill with a minimum column width from Grid Columns (same sizes). | https://finsweet.com/client-first/docs/utility-class-systems |
| `grid-span-full` | Makes a grid child span every column. | https://finsweet.com/client-first/docs/utility-class-systems |
| `gap-[size]` | See Spacing. | https://finsweet.com/client-first/docs/spacing-strategy |
| `display-inline` | `display: inline`. | https://finsweet.com/client-first/docs/utility-class-systems |
| `display-inline-flex` | `display: inline-flex`. For buttons that need flex inside without filling the width. | https://finsweet.com/client-first/docs/utility-class-systems |
| `display-contents` | `display: contents`. Removes the box so children join the parent's flex or grid. | https://finsweet.com/client-first/docs/utility-class-systems |

Auto-fit collapses empty columns so the rest stretch; auto-fill keeps empty columns so items hold their size. All grid classes default to a `medium` gap (https://finsweet.com/client-first/docs/client-first-skill).

## 5. Max width

Use `container-` for the outer content width and `max-width-` for widths nested inside a container. Values from Sizes > Max Width.

| Class | What it does / value | Source |
|---|---|---|
| `max-width-xxlarge` | 80rem | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-xlarge` | 64rem | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-large` | 48rem | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-medium` | 32rem | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-small` | 20rem | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-xsmall` | 16rem | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-xxsmall` | 12rem | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-full` | `max-width: none` at every breakpoint. | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-full-tablet` | `none` from tablet down. | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-full-mobile-landscape` | `none` from mobile landscape down. | https://finsweet.com/client-first/docs/utility-class-systems |
| `max-width-full-mobile-portrait` | `none` on mobile portrait. | https://finsweet.com/client-first/docs/utility-class-systems |

## 6. Hide

| Class | What it does / value | Source |
|---|---|---|
| `hide` | Hidden at every breakpoint. | https://finsweet.com/client-first/docs/utility-class-systems |
| `hide-tablet` | Hidden on tablet and below. | https://finsweet.com/client-first/docs/utility-class-systems |
| `hide-mobile-landscape` | Hidden on mobile landscape and below. | https://finsweet.com/client-first/docs/utility-class-systems |
| `hide-mobile-portrait` | Hidden on mobile portrait. | https://finsweet.com/client-first/docs/utility-class-systems |

## 7. Icons

Values from Sizes > Icon: small 1rem, medium 2rem, large 2.5rem (starter).

| Class | What it does / value | Source |
|---|---|---|
| `icon-height-small`, `icon-height-medium`, `icon-height-large` | Sets height only. | https://finsweet.com/client-first/docs/utility-class-systems |
| `icon-1x1-small`, `icon-1x1-medium`, `icon-1x1-large` | Sets width and height. | https://finsweet.com/client-first/docs/utility-class-systems |

## 8. Background and text colour

| Class | What it does / value | Source |
|---|---|---|
| `background-color-primary` | Theme > Background `primary`. | https://finsweet.com/client-first/docs/utility-class-systems |
| `background-color-secondary` | Theme > Background `secondary`. | https://finsweet.com/client-first/docs/utility-class-systems |
| `background-color-tertiary` | Theme > Background `tertiary`. Listed on the utility page but not in the AI skill file; check the project. | https://finsweet.com/client-first/docs/utility-class-systems |
| `background-color-alternate` | Theme > Background `alternate`. | https://finsweet.com/client-first/docs/utility-class-systems |
| `text-color-primary`, `text-color-secondary`, `text-color-alternate` | See Typography. | https://finsweet.com/client-first/docs/utility-class-systems |
| `theme-dark`, `theme-light` | Example utility classes that switch an element or section to another Theme mode. | https://finsweet.com/client-first/docs/variables |

## 9. Other utilities

| Class | What it does / value | Source |
|---|---|---|
| `z-index-1`, `z-index-2` | `z-index` 1 and 2. | https://finsweet.com/client-first/docs/utility-class-systems |
| `align-center` | `margin-left` and `margin-right` set to `auto`. | https://finsweet.com/client-first/docs/utility-class-systems |
| `pointer-events-none` | Blocks click and hover. | https://finsweet.com/client-first/docs/utility-class-systems |
| `pointer-events-auto` | Restores click and hover. | https://finsweet.com/client-first/docs/utility-class-systems |
| `overflow-hidden`, `overflow-scroll`, `overflow-auto`, `overflow-visible` | Matching `overflow` value. | https://finsweet.com/client-first/docs/utility-class-systems |
| `overflow-clip` | `overflow: clip`. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `disable-select` | `user-select: none`. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `text-area-vertical` | Text area resizes vertically only. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `border-radius-inherit` | `border-radius: inherit`. New in V3. | https://finsweet.com/client-first/docs/whats-new |
| `aspect-ratio-square` | 1 / 1 | https://finsweet.com/client-first/docs/utility-class-systems |
| `aspect-ratio-portrait` | 2 / 3 | https://finsweet.com/client-first/docs/utility-class-systems |
| `aspect-ratio-landscape` | 3 / 2 | https://finsweet.com/client-first/docs/utility-class-systems |
| `aspect-ratio-widescreen` | 16 / 9 | https://finsweet.com/client-first/docs/utility-class-systems |
| `button` | Base button class. | https://finsweet.com/client-first/docs/utility-class-systems |
| `button is-secondary`, `button is-text` | Example button variants as `is-` combos. Variant names differ per project. | https://finsweet.com/client-first/docs/utility-class-systems |

## 10. Removed or discouraged

| Class | Status | Source |
|---|---|---|
| `layer` | Removed in V3. | https://finsweet.com/client-first/docs/whats-new |
| `spacer-[size]` | "We no longer document or recommend spacer-[size] classes." Use a spacing block (empty div with one spacing class) instead. One legacy `.spacer-` rule still sits in the starter CSS. | https://finsweet.com/client-first/docs/whats-new |
| `margin-custom[n]`, `padding-custom[n]` | Do not use. | https://finsweet.com/client-first/docs/client-first-skill |
| `padding-global`, `padding-section-[size]` as combos on `section_[identifier]` | Do not add. In the default structure, variables on the section replace them. | https://finsweet.com/client-first/docs/core-structure-strategy |
| Separate direction + size classes (`padding-bottom` + `padding-medium`) | Replaced by one class, `padding-bottom-medium`. | https://finsweet.com/client-first/docs/whats-new |

## 11. Starter scale (placeholder values)

All values from the starter cloneable CSS: https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css. Tablet is the 991px breakpoint, mobile landscape 767px; mobile portrait inherits mobile landscape. Replace these with the project's design values.

Headings (Typography collection, H1 to H6 groups):

| Tag / class | Desktop | Tablet | Mobile landscape | Line height | Weight | Source |
|---|---|---|---|---|---|---|
| `h1` / `heading-style-h1` | 4rem | 4rem | 2.5rem | small (1.1) | bold (700) | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `h2` / `heading-style-h2` | 3rem | 3rem | 2rem | medium (1.2) | bold (700) | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `h3` / `heading-style-h3` | 2rem | 2rem | 1.5rem | medium (1.2) | bold (700) | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `h4` / `heading-style-h4` | 1.5rem | 1.5rem | 1.25rem | large (1.4) | bold (700) | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `h5` / `heading-style-h5` | 1.25rem | 1.25rem | 1rem | xlarge (1.5) | bold (700) | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `h6` / `heading-style-h6` | 1rem | 1rem | 0.875rem | xlarge (1.5) | bold (700) | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |

Body and text sizes (Typography collection, Body and Font Size groups):

| Tag / class | Desktop | Tablet | Mobile landscape | Source |
|---|---|---|---|---|
| `body` | 1rem, line height xlarge (1.5), weight normal (400) | same | same | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `text-size-large` | 1.5rem | 1.5rem | 1.25rem | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `text-size-medium` | 1.25rem | 1.25rem | 1.25rem | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `text-size-regular` | 1rem | 1rem | 1rem | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `text-size-small` | 0.875rem | 0.875rem | 0.875rem | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| `text-size-tiny` | 0.75rem | 0.75rem | 0.75rem | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |

Base primitives: font weights thin 100, xlight 200, light 300, normal 400, medium 500, semi-bold 600, bold 700, xbold 800, black 900; line heights small 1.1, medium 1.2, large 1.4, xlarge 1.5; letter spacing tighter -0.02em, tight -0.01em, default 0em, wide 0.01em, wider 0.02em.

Layout and Sizes:

| Variable | Desktop | Tablet | Mobile landscape | Source |
|---|---|---|---|---|
| `global-padding` (Spacing group) | 2.5rem | 2.5rem | 1.25rem | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| Section Padding `small` | 3rem | 3rem | 3rem | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| Section Padding `medium` | 5rem | 4rem | 3rem | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| Section Padding `large` | 8rem | 6rem | 5rem | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| Container `large` / `medium` / `small` | 80rem / 64rem / 48rem | same | same | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| Grid Columns `xsmall` / `small` / `medium` / `large` | 15rem / 20rem / 30rem / 40rem | same | same | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |
| Icon `small` / `medium` / `large` | 1rem / 2rem / 2.5rem | same | same | https://cdn.prod.website-files.com/61153bc33edff56427f1516f/css/client-first-cloneable.webflow.shared.b6f9d50a4.min.css |

## 12. Where the sources disagree

- Buttons: the utility page's prose speaks of a `button-` prefix, but every example is plain `button`, `button is-secondary`, `button is-text`. Use plain `button` with `is-` variants.
- `layer` is removed in V3 (whats-new); the V2 skill listed it. Do not use it.
- Spacers: whats-new says Finsweet no longer documents or recommends `spacer-[size]`; the AI skill file says never use them; the starter CSS still carries one legacy `.spacer-` rule. Treat spacers as legacy.
- `padding-global` is listed as one of the six core structure classes, yet the default structure replaces it with variables. It belongs to the alternative structure only.
- Dark sections: core structure uses `section-style-dark`, classes strategy 2 uses `section-dark`. Both are examples of a global add-on; prefer `section-style-dark`.
- `background-color-tertiary` is on the utility page; the AI skill file lists only primary, secondary and alternate.
- The variables page once writes "Size and Layout collections"; the collection is named Sizes.
- `max-width-xxlarge` and `container-large` are both 80rem in the starter; the docs do not say they share a variable.

## 13. Not in the docs

These names appeared in our V2 notes or older habits and are not in any V3 source. Do not use them unless the project already has them.

- `scheme-*` classes, `text-color-tertiary`, `text-style-uppercase` (V3 uses `text-style-allcaps`), `text-style-underline`.
- `z-index-3`, `icon-1rem`, `icon-small`, `icon-medium`, `icon-large`, ratio-named aspect classes such as `aspect-ratio-16/9`.
- `padding-section-xlarge`, `padding-custom`, flex, column or breakpoint layout classes.
- `text-color-brand` appears only as an illustrative example on the typography page, not as a starter class.
