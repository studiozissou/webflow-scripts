# /style-guide — Project UI & Style Guide Setup

Sets up the project design system in Webflow: creates/updates variables from extracted
tokens, applies them to base Client First classes, and optionally builds a visual
reference page.

Reference the `client-first` skill for CF class names and variable structure.

---

## Pre-flight

1. Read `.claude/client.md` — confirm project details
2. Read `.claude/design/figma-tokens.json` — confirm tokens exist with CF mappings
3. Read `.claude/design/section-map.md` — confirm sections are mapped
4. Connect to Webflow MCP
5. Confirm Webflow site is connected (`/webflow-connect` must have run first)

---

## Confirmation

Ask: "Ready to set up the design system in [project name]. This will:
1. Update template variables with your brand values
2. Apply variables to base CF classes (headings, text, colours, buttons)
3. Optionally create a visual reference page

This modifies the live Webflow Designer state. Proceed?"

Wait for explicit confirmation.

---

## Phase A — Variables

Adapted from the [Webflow variables-refactor prompt](https://developers.webflow.com/mcp/prompts/variables-refactor).

### A1. Read existing template variables

Use `variable_tool` to read all existing CF template variables. Categorise:
- **Primitives** already in template (brand-*, neutral-*)
- **Semantic** already in template (background-color-*, text-color-*, font-*, radius-*, stroke-*)
- **Size** variables already in template

### A2. Update template variables with client values

For each token in `figma-tokens.json` that has a `cf_mapping`:
1. Find the matching template variable
2. Update its value with the client's token value
3. Log the change: `[variable-name]: [old-value] → [new-value]`

### A3. Create new brand variables

For tokens in `figma-tokens.json` that do not match any existing template variable:
1. Create a new variable using the `converted_name` from the token
2. Follow CF two-tier naming: primitive first, then semantic referencing the primitive
3. Log: `[variable-name]: created with value [value]`

### A4. Create size variables with breakpoint modes

For tokens with `type: "size"` and `breakpoint_values`:
1. Create a size variable with the desktop value as default
2. Add breakpoint modes for tablet and mobile values
3. Use `clamp()`, `min()`, or `max()` where the designer's intent suggests fluid scaling
4. Log: `[variable-name]: created with modes [desktop/tablet/mobile values]`

### A5. Verify variables

Use `variable_tool` to read back all variables and confirm:
- Every token in `figma-tokens.json` has a corresponding variable
- Values match
- Log any mismatches

---

## Phase B — Apply to base CF classes

Reference the `client-first` skill for the full class list.

### B1. Typography

Use `style_tool` to update:
- `.heading-style-h1` through `.heading-style-h6` — font family, size, weight, line height, letter spacing from typography tokens
- `.text-size-large`, `.text-size-medium`, `.text-size-regular`, `.text-size-small`, `.text-size-tiny` — font size values
- `.text-weight-*` classes — font weight values
- All values should reference variables, not hardcoded values

### B2. Colours

Use `style_tool` to update:
- `.text-color-primary`, `.text-color-secondary`, `.text-color-tertiary`, `.text-color-alternate` — referencing colour variables
- `.background-color-primary`, `.background-color-secondary`, `.background-color-tertiary`, `.background-color-alternate` — referencing colour variables

### B3. Buttons

Use `style_tool` to update:
- `.button` base style — background colour, text colour, border radius, padding from tokens

### B4. Verify with snapshots

Use `element_snapshot_tool` on the style guide page (or any page with these classes) to
visually confirm the styles are applied correctly. Compare against reference screenshots
from `.claude/design/references/`.

### Also write build/class-reference.md

After applying variables to CF classes, write `build/class-reference.md`
documenting every class that was configured, organised by category:

```markdown
# Class Reference — [Client Name]

## Typography
| Class | Properties | Variable |
|-------|-----------|----------|
| .heading-style-h1 | font-size: var(--font-size-h1); ... | font-size-h1 |
...

## Buttons
| Class | Properties | Variable |
...

## Colours
| Class | Properties | Variable |
...

## Spacing
| Class | Properties | Variable |
...
```

Include:
- All typography classes (.heading-style-h1 through h6, .text-size-*)
- All colour classes (.text-color-*, .background-color-*)
- All button classes
- Any custom classes created during the style guide setup

This file is consumed by `/client-build` to know which classes are available.

---

## Phase C — Visual reference page (optional)

Ask: "Do you want me to create/update a visual reference page on the style guide? (y/n)"

If yes:

### C1. Find or create style guide page

Find the existing `/style-guide` draft page. If it doesn't exist, ask:
"No style-guide page found. Create one from scratch or skip?"

### C2. Add brand sections below existing CF content

- **Brand colour swatches** — all colour variables with name and hex, grouped: primitives then semantic
- **Typography samples** — heading and body fonts at their defined sizes, all text style tokens with labels
- **UI styles** — radius tokens visualised, shadow tokens visualised
- **Component placeholders** — one section per component from `component-inventory.md` in build order, labelled `[component-slug] — not yet built`

Leave existing Client First utility sections untouched — only add below them.

---

## After completion

Add task to `queue.json`:

```json
{
  "id": "style-guide-populate",
  "title": "Replace component placeholders in style guide as each component is built",
  "type": "qa",
  "status": "Triage",
  "priority": "P3",
  "agent": "qa",
  "dependencies": []
}
```

---

## Output summary

Show on completion:

```
/style-guide complete

Phase A — Variables:
  Updated:  [N] existing variables
  Created:  [N] new variables
  Size:     [N] with breakpoint modes
  Errors:   [N]

Phase B — Base CF classes:
  Typography:  [N] classes updated
  Colours:     [N] classes updated
  Buttons:     [N] classes updated
  Class ref:   build/class-reference.md written

Phase C — Visual reference:
  [Created / Updated / Skipped]

Next: build loop — /plan → /build → publish to staging → /qa-check
```

---

## Verification tests

1. Every token in `figma-tokens.json` has a corresponding Webflow variable
2. Variable values match token values
3. Size variables have breakpoint modes where tokens have `breakpoint_values`
4. Base CF heading classes (`.heading-style-h1`–`h6`) reference typography variables
5. Base CF text classes reference text variables
6. Base CF colour classes reference colour variables
7. `.button` style references brand variables
8. Existing Client First sections on the style guide page are untouched (if Phase C ran)
9. New sections added below existing content — not interspersed (if Phase C ran)
10. Page remains in draft/hidden state — not published (if Phase C ran)
11. `style-guide-populate` task added to `queue.json`
12. No other Webflow pages or content modified
13. `build/class-reference.md` exists and lists all configured classes grouped by category
