# /figma-audit — Figma Extraction

Reads the Figma file and extracts design tokens, component screenshots, interaction specs,
and prototype notes. Flags ambiguities but does not resolve them — that happens in
/component-plan.

---

## Pre-flight

1. Read `.claude/client.md` — confirm project context
2. Ask for Figma file URL or file key if not already known
3. Connect via Figma MCP

---

## Step 1 — Extract design tokens

Extract to `.claude/design/figma-tokens.json`.

Extract these token types:

| Type | What to capture |
|---|---|
| Colour styles | Name, hex, opacity |
| Text styles | Name, font family, size, weight, line height, letter spacing |
| Border radius | All radius tokens |
| Shadow styles | All drop shadow definitions |
| Breakpoints | Frame widths — infer breakpoint intent |

**Do not extract spacing tokens.** Note auto-layout values (gap, padding) as reference
only in `interaction-specs.md` — they inform component documentation but do not become
variables. Absolute/manual placements are flagged for manual review.

**Naming rules — kebab-case throughout:**
- All token names converted to kebab-case regardless of Figma naming
- Make names descriptive: `brand/primary-blue` → `color-brand-primary`,
  `Heading/H1 Desktop` → `text-heading-h1`
- Record both original Figma name and converted name in every token entry
- Flag any ambiguous names — record but do not resolve

Token entry format:
```json
{
  "figma_name": "Brand/Primary Blue",
  "converted_name": "color-brand-primary",
  "type": "color",
  "value": "#1A4FDB",
  "flagged": false,
  "flag_reason": null,
  "webflow_variable_id": null
}
```

---

## Step 2 — Export reference images

Export screenshot of every distinct component, section, and page frame to
`.claude/design/references/`. Name by component slug:

- `nav-desktop.png`, `nav-mobile.png`
- `hero-homepage.png`
- `card-project.png`
- `button-default.png`, `button-hover.png`, `button-disabled.png`

If a component has multiple states or variants, export each separately.

---

## Step 3 — Extract interaction and layout specs

Pull all prototype interactions, annotation notes, spec comments, and auto-layout values
from every frame. Save to `.claude/design/interaction-specs.md`:

```markdown
# Interaction and Layout Specs — [Client Name]
**Extracted:** YYYY-MM-DD

## [frame-name]

### Interactions
- **Trigger:**
- **Action:**
- **Animation:**

### Layout
- **Type:** auto-layout / flex / grid / absolute
- **Gap:** [value — reference only, not a variable]
- **Padding:** [value — reference only, not a variable]
- **Absolute placements:** [describe — flagged for manual review]

### Notes
```

---

## Step 4 — Flag ambiguities

Review every frame and record the following in `.claude/design/figma-flags.md`.
Do not ask the user to resolve these — that is the job of `/component-plan`.

Flag if:
- No prototype interactions or animation notes on the frame
- Hover/focus/active states visible but not annotated
- Trigger with no outcome specified
- Mobile frame differs significantly from desktop with no explanation
- No mobile frame for a complex component
- Breakpoint behaviour unclear
- Looks CMS-bound but no collection named
- Variable number of items with no min/max specified
- Placeholder text — unclear if real content or pattern
- Multiple versions of a component with no labels
- Component appears differently on different pages with no explanation
- Component needs another component inside it but relationship unclear
- Finsweet attribute behaviour implied but not specified
- Absolute placement that appears load-bearing for the design

Flag format:
```markdown
# Figma Flags — [Client Name]
**Generated:** YYYY-MM-DD

## [component-slug]
- **Frame:** [frame name in Figma]
- **Flag:** [description]
- **Type:** interaction / responsive / cms / variant / dependency / placement
- **Resolved:** no
- **Resolution:** —
```

---

## Output summary

Show on completion:

```
/figma-audit complete

Tokens extracted:     [N] colours, [N] text styles, [N] radius, [N] shadows
References exported:  [N] images
Interaction specs:    [N] frames documented
Flags raised:         [N] in figma-flags.md

Files written:
  .claude/design/figma-tokens.json
  .claude/design/interaction-specs.md
  .claude/design/references/ ([N] files)
  .claude/design/figma-flags.md

Next: run /component-plan to review components and resolve flagged ambiguities.
```

---

## Verification tests

1. `figma-tokens.json` exists — every entry has `figma_name`, `converted_name`, `type`,
   `value`, `flagged`, `flag_reason`, `webflow_variable_id: null`
2. No spacing tokens extracted — spacing values appear only as reference in
   `interaction-specs.md`
3. All token names are kebab-case
4. `references/` contains at least one image per page frame
5. `interaction-specs.md` exists — empty entries are themselves flagged
6. `figma-flags.md` exists — if zero flags raised, confirm with user Figma is genuinely
   complete before proceeding
7. No Webflow connection made during this command
8. No ambiguities resolved — flags recorded only
