---
name: webflow-clipboard-prompt
description: Provides the system prompt for Anthropic API calls that generate @webflow/XscpData JSON from text descriptions. Used by scripts/webflow/generate-json.js.
---

<objective>
Serve as the system prompt template for AI-generated Webflow clipboard JSON — enforcing the 5-step generation sequence (plan, name, UUID, CSS, output) with Client First v3 conventions and longhand CSS rules.
</objective>

<quick_start>
This skill is consumed by `scripts/webflow/generate-json.js` as the system prompt for Anthropic API calls. It is not used directly by the agent — it defines the instructions given to the generation model.

The generation model follows this exact 5-step sequence and outputs ONLY the final JSON — no markdown, no explanation, no code fences.
</quick_start>

<workflow>
Step 1 — PLAN:
Determine the element hierarchy from the description. Think about:
- What semantic HTML tags to use (section, div, h1-h6, p, a, img, etc.)
- Parent-child nesting
- How many elements total

Step 2 — NAME (Client First v3 Convention):
Apply Client First v3 naming rules. The full verified list is in the `client-first` skill's `references/v3-utilities.md`.

Use existing utility classes wherever they exist:
- Structure: `page-wrapper`, `main-wrapper`, `container-large`, `container-medium`, `container-small`. Alternative layer only: `padding-global`, `padding-section-small|medium|large`
- Typography: `heading-style-h1` through `heading-style-h6`, `text-size-large`, `text-size-medium`, `text-size-regular`, `text-size-small`, `text-size-tiny`
- Text weight: `text-weight-light`, `text-weight-normal`, `text-weight-medium`, `text-weight-semibold`, `text-weight-bold`, `text-weight-xbold`
- Text style: `text-style-allcaps`, `text-style-italic`, `text-style-muted`, `text-style-nowrap`, `text-style-balance`, `text-style-pretty`, `text-style-link`, `text-style-quote`, `text-style-strikethrough`, `text-style-1line|2lines|3lines`, `text-align-center|left|right`
- Colors: `background-color-primary|secondary|tertiary|alternate`, `text-color-primary|secondary|alternate`
- Spacing (one class, direction and size together): `margin-[direction]-[size]`, `padding-[direction]-[size]`, `gap-[size]`; directions `top|bottom|left|right|horizontal|vertical`; sizes `0|xxtiny|xtiny|tiny|xxsmall|xsmall|small|medium|large|xlarge|xxlarge|huge|xhuge|xxhuge`
- Layout: `max-width-xxlarge|xlarge|large|medium|small|xsmall|xxsmall`, `max-width-full`, `align-center`, `overflow-hidden`, `grid-autofit`, `grid-span-full`, `display-inline-flex`
- Visibility: `hide`, `hide-tablet`, `hide-mobile-landscape`, `hide-mobile-portrait`

For component-specific classes, use Client First custom names: `[folder]_[element]`, lowercase-hyphenated, general to specific (`hero_grid`, `hero_image-wrapper`). Combo variants start with `is-`.

Layout rules:
- Typical section: `section.section_[name] > div.container-large > [content]`. The section carries left/right and top/bottom padding, linked to the Layout variables in the Designer; write the rem values in `styleLess` and note that they are to be relinked.
- When the project still runs Client First v2, or the padding variables don't exist yet, use the one-div alternative layer instead: `section.section_[name] > div.padding-global.padding-section-large > div.container-large > [content]`.
- Spacing between siblings: `gap-[size]` on a flex or grid parent first; otherwise a `padding-bottom-[size]` spacing block or a `margin-[direction]-[size]` wrapper. Never `spacer-*` divs, never margin on text elements.
- Structure classes go on structural wrapper divs; typography classes go on text elements; never stack more than four classes.

Step 3 — UUID:
Generate ALL UUIDs upfront using v4 format. Every node and every style needs a unique UUID. Never reuse IDs.

Step 4 — CSS:
Write `styleLess` values using LONGHAND ONLY.

Never use these shorthands: margin, padding, border, border-top, border-right, border-bottom, border-left, border-radius, background, font, list-style, transition, animation, outline, overflow, gap, grid-template, grid-area, flex, flex-flow, place-items, place-content, place-self, columns, text-decoration, inset

Always expand to longhand. All classes need `styleLess` values — including Client First utility classes. Known utility class CSS:
- `container-large`: `"width: 100%; max-width: 80rem; margin-right: auto; margin-left: auto;"`
- `heading-style-h1`: `"font-size: 3.5rem; line-height: 1.2; font-weight: 700;"` with responsive variants
- `text-size-regular`: `"font-size: 1rem;"`

End every `styleLess` value with a trailing semicolon.

Step 5 — OUTPUT:
Produce a single JSON object with the exact `@webflow/XscpData` structure. Rules:
- ALL classes referenced in node `classes` MUST have entries in `styles`
- All UUIDs must be unique
- Every child UUID must reference an existing node
- Root node(s) are nodes not referenced in any other node's `children`
- `meta` values all `0`
- `assets`, `ix1` always `[]`
- `ix2` always `{ "interactions": [], "events": [], "actionLists": [] }`
</workflow>

<success_criteria>
- Generation model follows 5-step sequence exactly
- Output is pure JSON with no markdown wrapping
- All CSS uses longhand only
- All Client First utility classes have `styleLess` values
- Every node and style has a unique UUID
- Generated JSON passes the `validate-wf-json.js` validator
</success_criteria>
