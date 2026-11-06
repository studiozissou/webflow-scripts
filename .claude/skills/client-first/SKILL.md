---
name: client-first
description: Guides the agent through Finsweet's Client-First v3 (released 23 October 2026) for Webflow — five variable collections with responsive modes, the flat section_ core structure with padding on the section, one-class spacing, typography and layout utilities, the custom-class-plus-utility strategy, and component naming. Activates when building or reviewing Webflow sites that follow Client-First, and when migrating a v2 build.
---

<objective>
Apply Client-First v3 correctly in Webflow projects: variables first, a flat core structure with padding on the section, one class per spacing decision, utility classes for the common variations and a custom class for everything else, never deep stacking. Where a project still runs v2, know which parts changed so you don't mix the two systems.
</objective>

<quick_start>
Key rules:
1. Variables before classes. Every repeated value (colour, type size, spacing step, container width, element size) is a variable. Classes reference variables; nothing is hardcoded where a variable exists.
2. Flat core structure. Padding lives on the section through variables. No `padding-global` or `padding-section-*` layer unless the section needs its own padding layer.
3. One class per spacing decision: `padding-bottom-large`, `margin-top-small`, `gap-medium`. Direction and size are never two classes.
4. HTML tags are the typography default. Add `heading-style-*` or `text-*` utilities only for a variation. Most headings carry no class.
5. Custom class first, utility on top. `home-header_text text-size-large`, never a new style written onto stacked utilities.
6. Stack 1 or 2 classes freely, question 3, stop at 4. Five means create a custom class.
7. Rem on a 16 px base for every size. Exceptions: 1px borders stay 1px, 0.875rem for 14 px text, 0.125rem for 2 px gaps.

Default page skeleton (v3):
```
div.page-wrapper
  main.main-wrapper
    section.section_[name]        padding-left/right → Layout › global-padding
                                  padding-top/bottom → Layout › Section Padding › small|medium|large
      div.container-large|medium|small
        [content]
```

Alternative skeleton, only when a section needs its own padding layer:
```
section.section_[name]
  div.padding-global.padding-section-[size]
    div.container-large
      [content]
```

What changed from v2 (the structure this repo used until November 2026):

| v2 | v3 |
|---|---|
| `section > padding-global > container > padding-section-*` | `section_[name] > container-*`, padding on the section via variables |
| `spacer-xxsmall … spacer-xxlarge` empty divs | `padding-bottom-[size]` spacing block, or `gap-[size]` on the parent |
| `margin-top` + `margin-small` (direction + size stacked) | `margin-top-small` (one class) |
| Variables for colour only | Base, Theme, Typography, Layout, Sizes collections with breakpoint modes |
| Div Block with `section` tag | Native Section element |
| `text-style-italic/uppercase/…` | `text-style-allcaps/balance/pretty/italic/link/muted/nowrap/quote/strikethrough/1line/2lines/3lines` |
| `max-width-full … xxsmall` (large = 48rem) | `max-width-xxlarge` (80rem) added above `xlarge` (64rem) |
| `icon-1x1-*`, `icon-height-*` | unchanged, plus `grid-*`, `display-*`, `*-inherit` utilities |
| `text-color-tertiary` | dropped from the starter (`primary`, `secondary`, `alternate` remain) |
| One `Global / Styles` embed | `global-styles_default` and `global-styles_custom` embeds, separate |

Verified class names, with the values the starter ships and a source URL per group, are in `references/v3-utilities.md`. Use that file, not memory, when you need an exact name.
</quick_start>

<reference_guides>
Variables (https://finsweet.com/client-first/docs/variables):

| Collection | Holds | Groups (starter) |
|---|---|---|
| Base | Primitive tokens: raw colours (`red-100`, `blue-600`), font families and other base values | by token type |
| Theme | Semantic colours | Background, Border, Text, Link, System |
| Typography | Semantic type: font-size, weight, line-height, letter-spacing for body, headings, text sizes | per element or size |
| Layout | Spacing scale, global padding, section padding | Spacing, Section Padding |
| Sizes | Element sizing: containers, max-widths, icons, grid column minimums, focus ring | Container, Max Width, Icon, … |

Rules:
- Primitives are named by value (`red-light`, `neutral-900`) and are never linked to a class directly unless the value is used once. Semantic variables point at primitives; classes point at semantic variables.
- Groups are Sentence case, variables are lowercase-hyphenated, and a variable name does not repeat its group (`Background › primary`, not `background-primary`). Exception: add context when the Style panel would otherwise be ambiguous (`h2-font-size`).
- Never name a semantic variable after a colour. Theming (light/dark via Variable modes, switched in the Style panel or with a `theme-dark` utility) depends on it.
- Responsive variables: Typography and Layout use breakpoint modes (Desktop, Tablet, Mobile Landscape). Set the value once per mode and every element using the variable follows. Extend to other collections when a project needs it.
- `clamp()`, `min()` and `max()` are valid variable values, so fluid type and spacing live in the Sizes and Typography collections rather than in custom CSS.
- Search the Style panel by group name (`Text`, `Spacing`) to narrow results.

Core structure (https://finsweet.com/client-first/docs/core-structure-strategy):
- `page-wrapper`: outermost div, optional styles, keeps `body` limited to typography and background colour. Caution: `overflow: hidden` here kills `position: sticky` for every descendant.
- `main-wrapper`: `<main>` tag, wraps all sections, excludes nav and footer. Accessibility and crawl landmark.
- `section_[identifier]`: native Section element, named so the Navigator reads as a page sitemap. Carries global padding (left/right → `global-padding`) and section padding (top/bottom → a Section Padding variable; different variables for uneven spacing). Avoid other heavy styling; use a global add-on class such as `section-style-dark` for recurring section themes. Do not stack `padding-global` or `padding-section-*` on the section class.
- `container-large|medium|small`: `width: 100%`, auto margins, `max-width` from the Sizes collection. Add or remove sizes per project.
- `padding-global` and `padding-section-[size]` / `padding-section-[direction]-[size]` remain as classes for the alternative, layered structure, applied together on one div inside the section.

Class strategy (https://finsweet.com/client-first/docs/classes-strategy-1 and /classes-strategy-2):
- Utility class: global by nature, no underscore, applies one CSS concern (`text-size-large`, `hide-tablet`). Custom class: underscore marks the folder, `[folder]_[element]` (`team-list_headshot-wrapper`), names read general to specific, no abbreviations.
- Global custom classes are encouraged (`faq_item`, `header_content`) when the element recurs across the site.
- Combo class: `is-` prefix, inherits from the base class and only works stacked on it (`button is-secondary`, `section_header is-home`). Create one only when inheriting from the base has a clear benefit; `container is-large` is the documented anti-pattern, `container-large` the fix.
- Stack classes from the same category (spacing with spacing, typography with typography). Never write new styles onto stacked utilities: that mints a combo class nobody wants.
- Three ways out of a deep stack, in order of preference: custom class with utilities on top; a custom class alone with values from the same variables; `[utilities] is-[instance]` when the global properties must stay global.
- Folders: one level by default (`component_element`), nested only for a clear organisational win (`page_component_element`). Page name in the class only when the class is page-specific.

Typography (https://finsweet.com/client-first/docs/typography-strategy):
- Tag defaults carry the design. `heading-style-h[1-6]` restyles any text as that heading level without changing the tag (an SEO `h1` that looks like the `h2`). Never put a heading tag on non-heading text; use a text element and a custom class.
- Utilities: `text-size-*`, `text-weight-*`, `text-style-*`, `text-align-*`, `text-color-*`, plus `text-size-inherit`, `text-weight-inherit`, `text-color-inherit`, `text-decoration-inherit`.
- A custom class is right for unique text (`footer_copyright-text`), a managed group (`footer_link`), or text that departs from the default on one breakpoint.
- New utility systems (`text-opacity-*`) get a new folder and a matching group in the Typography collection.

Spacing (https://finsweet.com/client-first/docs/spacing-strategy):
- One scale, 14 steps, shared by margin, padding and gap: `0, xxtiny (0.25rem), xtiny (0.5), tiny (0.75), xxsmall (1), xsmall (1.25), small (1.5), medium (2), large (3), xlarge (4), xxlarge (5), huge (6), xhuge (8), xxhuge (12)`. Values live in Layout › Spacing with breakpoint modes, so spacing is responsive without element-level overrides.
- Section padding uses its own values in Layout › Section Padding; `padding-section-small` and `padding-small` are different numbers.
- Five strategies. Prefer the first two for lists and component internals:
  1. Flex gap on the parent (`gap-[size]` or a Spacing variable).
  2. CSS Grid gap on the parent.
  3. Custom class on the element, value from a Spacing variable (recurring elements, per-breakpoint spacing, one-offs).
  4. Spacing wrapper: a div with `margin-[direction]-[size]` or `padding-[direction]-[size]` around one child.
  5. Spacing block: an empty div with `padding-bottom-[size]` between siblings.
- Keep spacing classes off text elements (`faq_title` with `margin-bottom`, not `margin-bottom-small` on the `h3`).
- `spacing-clean` zeroes all margin and padding, useful on native Webflow components.

Utilities (https://finsweet.com/client-first/docs/utility-class-systems): full list in `references/v3-utilities.md`. New in v3: `text-style-*` set, `*-inherit`, `grid-autofit`, `grid-autofit-css`, `grid-autofit-[size]`, `grid-autofill-css`, `grid-autofill-[size]`, `grid-span-full`, `display-inline`, `display-inline-flex`, `display-contents`, `gap-[size]`, `overflow-clip`, `overflow-scroll`, `disable-select`, `text-area-vertical`, `aspect-ratio-square|portrait|landscape|widescreen`, `max-width-xxlarge`, `max-width-full-[breakpoint]`. Apply a custom class first and a grid utility on top.

Components and interactions (https://finsweet.com/client-first/docs/component-naming, /interactions-naming):
- Components: `Group / Identifier`, and the group is created by hand in the Components panel (the slash is visual only). Starter groups: Global (`Global / Styles`, `Global / Nav`, `Global / Footer`), Template (`Template / Section`, `Template / Core Structure`, meant to be unlinked), Card, Form, Section, Modal.
- Interactions: `Element [Action State]`, Title Case, square brackets around action and state: `Nav Menu [Open]`, `Image [Show Scroll In]`.

Global styles embed (https://finsweet.com/client-first/docs/global-styles-embed):
- `Global / Styles` component on every page holds two embeds: `global-styles_default` (Finsweet's snippets, don't delete) and `global-styles_custom` (project CSS). Embed, not Site Settings, so the CSS renders in the Designer.
- Default snippets: antialiased text, `:focus-visible` outline from `--_sizes---focus--width` and `--_theme---system--focus-state`, `::selection` colours from Theme › System, rich-text first/last margin removal. Commented out by default: pointer cursor, form reset, inherit typography on links and form elements, red outline on empty `href="#"` links in design mode.
- Webflow variable CSS names follow `--_<collection>---<group>--<variable>`.

Semantic tags (https://finsweet.com/client-first/docs/semantic-html-tags): `<header>` on the nav component, `<main>` on `main-wrapper` (unique content only), `<footer>` on the footer, `<section>` for each page section with a heading, `<article>` and `<aside>` where they apply.

Fluid responsive (https://finsweet.com/client-first/docs/fluid-responsive): optional add-on that scales the `html` font-size per breakpoint so every rem value scales with it. Generated CSS goes in `global-styles_custom`. Browser zoom and font-size preferences keep working, unlike `vw` sizing.

Migrating a v2 build:
- Do it per page, on a duplicate, with the published CSS as the source of truth. The `cf-page` spec in the private repo holds the run shape; `tools/webflow/validate-section.js --structure v3` checks each rebuilt section (`padding-global`, `padding-section-*` and `spacer-*` are errors under v3).
- Foundation first: the five collections, the type and spacing scales, `page-wrapper`/`main-wrapper`, the section-padding variables and the v3 utilities must exist before any page moves.
- Map text to the nearest `heading-style-*` / `text-size-*` by its current computed size, not by tag.
- Old classes stay for one publish cycle, then Style Manager › Clean up.
</reference_guides>

<success_criteria>
- Variables exist in five collections, semantic variables reference primitives, and no class holds a hardcoded value where a variable exists.
- Every page uses `page-wrapper > main-wrapper > section_[name] > container-*`, with the section's padding linked to Layout variables. The `padding-global` layer appears only where a section needs its own padding layer, and never stacked on the section class.
- Spacing uses gap on parents, variable-backed custom classes, or one-class `margin-*`/`padding-*` utilities. No `spacer-*` classes, no direction-plus-size stacks.
- Headings mostly carry no class; variations use `heading-style-*` and `text-*` utilities; unique text gets a `[folder]_[element]` custom class.
- No element stacks more than four classes, no new styles on stacked utilities, every combo class starts with `is-`.
- Components are named `Group / Identifier` inside a matching group; interactions are named `Element [Action State]`.
- All sizes in rem on a 16 px base, except 1px borders.
</success_criteria>
