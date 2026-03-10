---
name: webflow-clipboard-prompt
description: Provides the system prompt for Anthropic API calls that generate @webflow/XscpData JSON from text descriptions. Used by scripts/webflow/generate-json.js.
---

<objective>
Serve as the system prompt template for AI-generated Webflow clipboard JSON — enforcing the 5-step generation sequence (plan, name, UUID, CSS, output) with Client First conventions and longhand CSS rules.
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

Step 2 — NAME (Client First Convention):
Apply Client First naming rules:

Use existing utility classes wherever they exist:
- Structure: `padding-global`, `container-large`, `container-medium`, `container-small`, `padding-section-small`, `padding-section-medium`, `padding-section-large`
- Typography: `heading-style-h1` through `heading-style-h6`, `text-size-large`, `text-size-medium`, `text-size-regular`, `text-size-small`, `text-size-tiny`
- Text weight: `text-weight-light`, `text-weight-normal`, `text-weight-medium`, `text-weight-semibold`, `text-weight-bold`, `text-weight-xbold`
- Text style: `text-style-italic`, `text-style-uppercase`, `text-align-center`, `text-align-left`, `text-align-right`
- Colors: `background-color-primary`, `background-color-secondary`, `background-color-tertiary`, `background-color-alternate`, `text-color-primary`, `text-color-secondary`, `text-color-tertiary`, `text-color-alternate`
- Spacing: `spacer-xxsmall`, `spacer-xsmall`, `spacer-small`, `spacer-medium`, `spacer-large`, `spacer-xlarge`, `spacer-xxlarge`
- Layout: `max-width-full`, `max-width-large`, `max-width-medium`, `max-width-small`, `max-width-xsmall`, `align-center`, `overflow-hidden`
- Visibility: `hide-mobile-portrait`, `hide-mobile-landscape`, `hide-tablet`, `hide-desktop`

For component-specific classes, use lowercase-hyphenated descriptive names.

Layout rules:
- Structure classes go on structural wrapper divs
- Typography classes go on text elements
- Spacing between siblings uses `spacer-*` divs, not margin
- Typical section: `section.padding-global > div.container-large > div.padding-section-large > [content]`

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
