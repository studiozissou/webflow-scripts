---
name: client-first
description: Applies Finsweet Client First V3 (23 Oct 2026) to Webflow builds and reviews. Covers the flat V3 page structure (page-wrapper > main-wrapper > section_ > container-), the five variable collections (Base, Theme, Typography, Layout, Sizes) with breakpoint modes, rem on a 16px base, typography, spacing, grid, gap and display utilities, custom class + utility class strategy, and Webflow component naming. Use this skill whenever you build, review or audit a Webflow site that follows Client First, name or rename classes, structure a section or page, choose a text-size, heading-style or text-style utility, set up or link variables, decide on margin, padding, gap or section spacing, or name a Webflow component, write HTML to push through the Webflow MCP, plan a Variables panel setup from brand guidelines, or convert spacer divs or `padding-global` layers, even if the user only says "Finsweet", "CF", "the class naming system", "build a section", "set up the variables" or "clean up the classes" and never names the skill.
---

<objective>
Build and review Webflow projects the Client First V3 way: flat section structure with padding from variables, every reused value in a variable, HTML tags as typography defaults, utilities only from the verified V3 list, custom classes for everything specific. V3 was released 23 Oct 2026 and replaces V2 (spacer divs, `padding-global` wrappers, `layer`). Finsweet's own rule file for agents is at https://finsweet.com/client-first/docs/client-first-skill and is the tie-breaker when this skill is silent.
</objective>

<quick_start>
First, find out which version the site runs. A V3 class on a V2 site does nothing, because the class or the variable behind it does not exist, and the reverse leaves dead layers. Check, in this order:
- The project's README or `projects/<client>/.claude/client.md`, which may say.
- The published CSS: V3 has Webflow variable names such as `--_layout---` or `--_theme---` and classes such as `margin-top-small` or `gap-medium`; V2 has `spacer-*` classes and every section wrapped in `padding-global`.
- For a new build, V3.

On a V2 site, match its existing structure and classes unless the job is the migration itself, and say so in the reply. The repo validator (`tools/webflow/validate-section.js`) defaults to V2; pass `--structure v3` for a V3 site.

Before writing anything, read the project: existing classes, variable collections with their groups and modes, and components. Reuse what exists and create only what is missing. Starter project values are placeholders, so take design values from the design source, never from the starter.

Default V3 page structure:

```
page-wrapper
  [Global / Nav]
  main-wrapper                     (tag: main)
    section_[identifier]           (native Section element)
      container-[size]
        [content]
  [Global / Footer]
```

- Put padding straight on `section_[identifier]` through variables: padding-left and padding-right linked to `global-padding` (Layout > Spacing), padding-top and padding-bottom linked to a Section Padding variable (`small`, `medium` or `large`, Layout collection). For uneven padding, link top and bottom to different Section Padding variables.
- `container-[size]` is the section's first child. Sizes are `container-small`, `container-medium`, `container-large`.
- Name each section by its content (`section_hero`, `section_pricing`) so the Navigator reads like a sitemap.

Why flat: fewer wrapper divs, a native `<section>` tag for semantics, and a Navigator that reads like a sitemap of the page. Padding lives in variables, so it changes per breakpoint without extra classes.

Alternative structure, only when a section needs padding as its own layer for extra control:

```
section_[identifier]
  padding-global padding-section-[size]
    container-[size]
```

Never stack `padding-global` or `padding-section-[size]` as combos on `section_[identifier]`.

In this repo, `tools/webflow/validate-section.js --structure v3` enforces the default structure and reports `padding-global`, `padding-section-*` and `spacer-*` as errors.
</quick_start>

<reference_guides>

## Full class list

Every verified V3 class name, its value and its source URL is in `references/v3-utilities.md`. Use only names from that file or names that already exist in the project. If a name is in its "Not in the docs" list (for example `scheme-*`, `text-style-uppercase`, `spacer-*`), do not introduce it.

## Variables

Webflow Variables are the foundation of a V3 project. A variable holds a value; a class applies it. Link every reused value (colour, type, spacing, size, radius) to a variable instead of typing the number, so one change in the Variables panel updates the whole site.

| Collection | Role | Default groups |
|---|---|---|
| Base | Primitive tokens: raw colours and font values | Brand, Neutral, Others, Font Family, Font Weight, Line Height, Letter Spacing |
| Theme | Semantic colour tokens | Background, Border, Link, Text, Button Primary, Button Secondary, System |
| Typography | Semantic type tokens | Body, H1 to H6, Font Size |
| Layout | Spacing and section padding | Spacing (includes `global-padding`), Section Padding |
| Sizes | Element sizing | Max Width, Container, Grid Columns, Border Radius, Focus, Icon |

Modes:
- Typography and Layout have breakpoint modes: Desktop (default), Tablet, Mobile Landscape. Change responsive values per mode in the Variables panel, not with breakpoint styles on elements.
- Sizes has a Desktop mode; other collections can add breakpoint modes when the project needs them.
- Theme carries theme modes (Base and Dark Mode in the starter). Switch a section through the Style panel or a class such as `theme-dark`.

Primitive vs semantic: primitives live in Base and are named by value (`blue`, `blue-dark`, `neutral-light`). Semantic tokens in Theme and Typography reference a primitive and are named by purpose (Background > `primary`, Text > `secondary`). Link semantic tokens to classes. For a new colour, add the primitive first, then a semantic variable that points at it.

Naming:
- Groups in sentence case: Background, Section Padding.
- Variables in lowercase with hyphens: `primary`, `background-hover`.
- Do not repeat the group name in the variable (`primary`, not `background-primary`). The exception is where the Style panel needs context, as in Typography: `h2-font-size`, `body-line-height`.
- Never name a semantic variable after a colour; themes and rebrands break it.
- In custom CSS, copy the variable's CSS name from the project rather than building it by hand (pattern `--_theme---text--primary`).

## rem

Use rem so layouts follow browser font settings and zoom. 1rem = 16px; divide px by 16 (Webflow inputs accept `24/16rem`). Prefer readable values: 0.5, 1, 1.5, 2, 2.5, 3 and so on, on a 4-point scale. Three exceptions:

1. 14px type (0.875rem) is fine when 16px is too large.
2. 2px (0.125rem) for tiny spacing below 4px.
3. 1px stays 1px, for example borders.

Do not use vw or vh for type or spacing; they ignore zoom.

## Typography

HTML tags carry the defaults. Style `body` and `h1` to `h6` from the Typography collection first; text that follows the default gets no class. Choose the heading tag for document structure (one `h1` per page, no skipped levels) and the look with a class.

- `heading-style-h1` to `heading-style-h6`: only to make a tag look like another level, such as an `h1` styled as `heading-style-h2`. It changes CSS, never the tag. Use rarely, except as below.
- Repo convention: `validate-section.js` rule 9 expects every heading to carry a `heading-style-*` class, because migrations map each heading by its computed size and the class makes that mapping visible. For any section that goes through the validator, add the class matching the heading's intended look, even when it equals the tag (`h1.heading-style-h1`). Outside the validator, Finsweet's default above applies.
- `text-size-`: `large`, `medium`, `regular`, `small`, `tiny`.
- `text-weight-`: `xbold`, `bold`, `semibold`, `medium`, `normal`, `light`.
- `text-style-`: `allcaps`, `italic`, `strikethrough`, `nowrap`, `muted`, `link`, `quote`, `balance`, `pretty`, `1line`, `2lines`, `3lines`.
- `text-align-`: `left`, `center`, `right`.
- `text-color-`: `primary`, `secondary`, `alternate` (examples; check the project's Theme > Text group).
- Inherit: `text-color-inherit`, `text-size-inherit`, `text-weight-inherit`, `text-decoration-inherit`.
- Rich Text: style through `text-rich-text` and its nested selectors; add no classes inside the block.

Do not use a heading tag on text that is not a heading; use a text element with `heading-style-h*` or a custom class. Use a custom text class (`footer_link`, `footer_copyright-text`) when the text is unique, managed as a group, or breaks from the default at a breakpoint.

Starter scale, placeholder values a project replaces (desktop / tablet / mobile landscape):

| Style | Size | Line height |
|---|---|---|
| h1 | 4 / 4 / 2.5rem | 1.1 |
| h2 | 3 / 3 / 2rem | 1.2 |
| h3 | 2 / 2 / 1.5rem | 1.2 |
| h4 | 1.5 / 1.5 / 1.25rem | 1.4 |
| h5 | 1.25 / 1.25 / 1rem | 1.5 |
| h6 | 1 / 1 / 0.875rem | 1.5 |
| text-size-large | 1.5 / 1.5 / 1.25rem | |
| text-size-medium | 1.25rem | |
| body, text-size-regular | 1rem | 1.5 |
| text-size-small | 0.875rem | |
| text-size-tiny | 0.75rem | |

Headings are bold (700) in the starter. Full table with source in `references/v3-utilities.md`.

## Spacing

Every spacing value comes from the Spacing group in the Layout collection, which has breakpoint modes, so spacing scales down on tablet and mobile without extra classes.

- `margin-[size]`, `padding-[size]`: all sides.
- `margin-[direction]-[size]`, `padding-[direction]-[size]`: directions `top`, `bottom`, `left`, `right`, `horizontal`, `vertical`. Direction and size are one class (`padding-bottom-medium`); never stack a direction class with a size class.
- `gap-[size]`: gap on a flex or grid parent.
- `spacing-clean`: sets all margin and padding to 0, for stripping native Webflow component spacing.

Scale (desktop starter values): `0` 0, `xxtiny` 0.25, `xtiny` 0.5, `tiny` 0.75, `xxsmall` 1, `xsmall` 1.25, `small` 1.5, `medium` 2, `large` 3, `xlarge` 4, `xxlarge` 5, `huge` 6, `xhuge` 8, `xxhuge` 12 (rem).

Section padding is its own scale (`small`, `medium`, `large` in Section Padding), so `padding-section-small` and `padding-small` are different values.

Five strategies, in the order to reach for them. The first three add no elements; the last two add one div each, so they cost DOM weight and an extra node in the Navigator:
1. Flex gap on the parent (`gap-[size]` or a Spacing variable), when siblings share one spacing value.
2. CSS Grid gap on the parent, the same for grid layouts.
3. Custom class on the element, value from a Spacing variable: the odd one out in an otherwise even stack, recurring elements, per-breakpoint spacing, one-offs.
4. Spacing wrapper: a div with `margin-[direction]-[size]` or `padding-[direction]-[size]` around one child, when the child must stay class-free (rich text, a component instance you cannot edit).
5. Spacing block: an empty div with `padding-bottom-[size]` between siblings, as a last resort.

Uneven spacing in one stack is the usual case. Put the most common value on the parent as a gap and give the exceptions a custom class with a margin from a Spacing variable. The repo validator accepts that under `--structure v3` only when the value is a `var(--…)` reference, which also keeps it on the global scale. A stack of empty blocks is valid but rebuilds the V2 spacer problem under a new name.

Rules:
- No margin between components. Space siblings with a spacing utility or with gap on the parent.
- Never put spacing classes on text elements (`faq_title` with a variable-backed `margin-bottom`, not `margin-bottom-small` on the `h3`).
- When migrating V2, replace spacer divs by the order above: a run of equal spacers becomes a gap on the parent, the odd ones become variable-backed margins on custom classes. Fall back to `padding-bottom-[size]` blocks only where neither works, and say why in the reply.
- Inner padding of cards and items goes on the custom class, linked to a spacing variable.
- Spacers (`spacer-*`) are no longer documented or recommended in V3. Leave them alone in legacy V2 projects you are only patching; do not add new ones.

## Layout utilities

Client First has no flex, column or breakpoint layout classes. Build layouts with custom classes using flex or grid, then add utilities on top.

- Grid: `grid-autofit`, `grid-autofit-css`, `grid-autofit-[size]`, `grid-autofill-css`, `grid-autofill-[size]`, `grid-span-full`. Auto-fit stretches items to fill the row; auto-fill keeps empty columns. `[size]` is `xsmall`, `small`, `medium`, `large` from Sizes > Grid Columns.
- Display: `display-inline`, `display-inline-flex`, `display-contents`.
- Max width: `max-width-xxsmall` to `max-width-xxlarge`, plus `max-width-full`, `-full-tablet`, `-full-mobile-landscape`, `-full-mobile-portrait`. Use inside a container, never instead of one.
- Hide: `hide`, `hide-tablet`, `hide-mobile-landscape`, `hide-mobile-portrait`.
- Icons: `icon-height-small|medium|large`, `icon-1x1-small|medium|large`.
- Aspect ratio: `aspect-ratio-square`, `-portrait`, `-landscape`, `-widescreen`.
- Overflow: `overflow-hidden`, `-scroll`, `-auto`, `-clip`, `-visible`.
- Other: `z-index-1`, `z-index-2`, `align-center`, `pointer-events-none`, `pointer-events-auto`, `disable-select`, `text-area-vertical`, `border-radius-inherit`.
- `layer` is removed in V3.

## Class strategy

A custom class contains an underscore; a utility class never does. Lowercase, hyphenated words, no abbreviations (`button`, not `btn`), general to specific (`text-size-large`).

Customising an element that uses utilities, in this order:
1. Custom class first, utility on top (recommended): `home-header_text` with `text-size-large`. The custom class holds the instance styles while the utility keeps its value under global control.
2. Custom class only, with values linked to variables.
3. `is-` combo on the utilities when some properties must stay global: `text-size-large is-home-header`.

Stacking: 1 or 2 classes is great, 3 needs a reason, 4 is the absolute maximum, 5 means create a custom class. Stack within one category (type with type, spacing with spacing). Never add new styles to a stack of utilities; that silently creates a combo class.

Custom class naming is `[group]_[element]`. The underscore makes a virtual folder; hyphens join words. Examples from the docs: `footer_link`, `footer_copyright-text`, `form_input`, `benefits_item`, `team-list_headshot-wrapper`, `faq-template_heading-text`. Add `_component` to the wrapper of a complete copyable element (`clients-slider_component`). Add a page name only when the class lives on that page alone.

`is-` marks a combo variant that only works on its base class: `button is-secondary`, `section_header is-home`. For styles shared by many sections, stack a global add-on such as `section-style-dark` on the section class.

Never edit a utility class to fix one element; it changes every instance site-wide.

## Component naming

Webflow Components use `Group Name / Component Identifier`, each word capitalised: `Card / Blog Post`, `Form / Newsletter`, `Global / Nav`, `Modal / Video`. Groups: Global, Template, Card, Form, Section, Component, Modal. The slash does not create a group, so create the group in the Components panel and move the component into it.

The page template ships with `Global / Styles` (on every page; holds the `global-styles_default` embed, which you do not edit, and `global-styles_custom` for project CSS), `Template / Section` and `Template / Core Structure`. Unlink template components to use them; never edit them to build content.

The component name and its wrapper class are separate: `Card / Blog Post` can wrap `blog-card_component`.

Navigation: always use Webflow's native Navbar element, pasted from Relume (Navbar 1 unless the design says otherwise) and restyled with the site's classes. Never hand-build a nav from divs; it ships without a mobile menu.

</reference_guides>

<success_criteria>
- Every section is `section_[identifier]` on a native `<section>`, with `container-[size]` as its first child.
- Section padding comes from `global-padding` and Section Padding variables on the section; no `padding-global` in default builds, and never as a combo on the section.
- Sizes are in rem on a 16px base, apart from 14px type, 2px spacing and 1px borders.
- Reused values link to semantic variables in the right collection; responsive values live in variable modes, not breakpoint styles.
- The site's Client First version was checked first, and a V2 site keeps its V2 structure unless the job is the migration.
- Text follows tag defaults; `heading-style-h*` appears only where the tag and look differ, or on every heading in a section checked by the repo validator.
- Spacing uses V3 classes, gap or custom classes linked to variables; no `spacer-*`, no margin between components, no spacing classes on text.
- Every utility used is in `references/v3-utilities.md` or already in the project.
- Custom classes have an underscore, utilities do not, and no element carries more than four classes.
- Components follow `Group Name / Component Identifier` and sit in the matching group.
</success_criteria>
