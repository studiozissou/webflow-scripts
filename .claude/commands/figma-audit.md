# /figma-audit — Figma Extraction

Reads the Figma file and extracts design tokens, section maps, reference screenshots,
interaction specs, and prototype notes. Flags ambiguities but does not resolve them —
that happens in `/component-plan`.

Reference the `figma-prep` skill for Figma file preparation best practices.
Reference the `client-first` skill for CF class/variable mapping.

---

## Pre-flight

1. Read `.claude/client.md` — confirm project context
2. Ask for Figma file URL or file key if not already known
3. Connect via Figma MCP — run `whoami` to verify the connection is healthy before proceeding

---

## Figma MCP reliability rules

The Figma MCP hangs on large nodes. Follow these rules for every MCP call:

1. **Always use `get_design_context`** for every MCP read. It returns code, a screenshot,
   and tokens — and has internal size-gating that handles large frames gracefully.
   `get_metadata` serializes the entire node tree with no size limit and will hang on
   sections, pages, or any non-trivial frame.
2. **`get_metadata` is a last resort only.** Use it only when `get_design_context` fails
   AND you need just the structural skeleton (no styles, no tokens, no interactions).
   It is not part of the normal fallback chain.
3. **Fallback chain:** `get_design_context` → `get_screenshot` → skip + flag as
   `type: mcp-timeout` in `figma-flags.md`. Do not fall back to `get_metadata`.
4. **Work node-by-node.** If the user provides a page-level URL, ask them to identify the
   key sections/frames, or use `get_design_context` on the top-level node first to get a
   screenshot overview, then drill into child nodes by ID from the returned `data-node-id`
   attributes.
5. **If any MCP call runs longer than 60 seconds, assume it is hung.** Cancel it, skip that
   node, log it in `figma-flags.md` as a `type: mcp-timeout` flag, and move on. Do not
   retry the same call.
6. **Use `get_screenshot`** (with `excludeScreenshot: false` on `get_design_context`) as a
   lightweight fallback when full context extraction fails.
7. **Use `get_variable_defs`** only on specific component/frame nodes that use variables —
   never on the page root.

---

## Step 1 — Extract design tokens

Extract to `.claude/design/figma-tokens.json`.

> **Tool:** Use `get_design_context` on each section/frame to extract tokens. Do not use
> `get_metadata` — it returns only structure (no styles, no tokens).

Extract these token types:

| Type | What to capture |
|---|---|
| Colour styles | Name, hex, opacity |
| Text styles | Name, font family, size, weight, line height, letter spacing |
| Border radius | All radius tokens |
| Shadow styles | All drop shadow definitions |
| Size | Responsive values (font sizes, spacing, widths) that vary by breakpoint |
| Breakpoints | Frame widths — infer breakpoint intent |

**Size tokens:** Webflow now supports size variables with breakpoint modes (automatic modes
per breakpoint + manual modes per class) and `clamp()`, `min()`, `max()` functions. When a
value changes across breakpoints (e.g. heading size at desktop vs mobile), capture all
breakpoint values in the token entry.

**Unit conversion — always rem:** All size values (font size, line height, letter spacing,
border radius, padding, gap, width, etc.) must be stored in `rem`, not `px`. Convert using
`1rem = 16px` (e.g. `64px → 4rem`, `48px → 3rem`, `20px → 1.25rem`). Figma exports px —
always divide by 16 before writing to `figma-tokens.json`. Colours, opacity, and unitless
values (font weight, line-height ratios) stay as-is.

**Do not extract spacing tokens.** Note auto-layout values (gap, padding) as reference
only in `interaction-specs.md` — they inform component documentation but do not become
variables. Absolute/manual placements are flagged for manual review.

**Naming rules — kebab-case throughout:**
- All token names converted to kebab-case regardless of Figma naming
- Make names descriptive: `brand/primary-blue` → `color-brand-primary`,
  `Heading/H1 Desktop` → `text-heading-h1`
- Record both original Figma name and converted name in every token entry
- Flag any ambiguous names — record but do not resolve

**CF token mapping:** For every extracted token, map it to the best-fit Client First
variable or utility class (reference the `client-first` skill). Record the mapping in
the token entry. If there is any doubt or conflict between a Figma value and a CF class,
set `flagged: true` and describe the conflict in `flag_reason` — do not guess.

Token entry format:
```json
{
  "figma_name": "Brand/Primary Blue",
  "converted_name": "color-brand-primary",
  "type": "color",
  "value": "#1A4FDB",
  "cf_mapping": "brand-primary",
  "cf_class": "background-color-primary",
  "breakpoint_values": null,
  "flagged": false,
  "flag_reason": null,
  "webflow_variable_id": null
}
```

For size tokens with responsive values:
```json
{
  "figma_name": "Heading/H1",
  "converted_name": "text-heading-h1-size",
  "type": "size",
  "value": "4rem",
  "cf_mapping": "heading-style-h1",
  "cf_class": "heading-style-h1",
  "breakpoint_values": {
    "desktop": "4rem",
    "tablet": "3rem",
    "mobile": "2.25rem"
  },
  "flagged": false,
  "flag_reason": null,
  "webflow_variable_id": null
}
```

---

## Step 2 — Map sections and export reference screenshots

Organize output **by section per page**, not by component.

### Parallelisation gate

After the top-level overview identifies all sections across all pages, reference the
`parallelisation` skill. Present the gate for parallel section reads:

| # | Stream | Agent type | Est. tokens | Est. wall time |
|---|--------|-----------|-------------|----------------|
| 1-3 | Sections batch 1 (3 sections) | Explore | ~45k | ~25s |
| 4-6 | Sections batch 2 (3 sections) | Explore | ~45k | ~25s |
| 7-9 | Sections batch 3 (3 sections) | Explore | ~45k | ~25s |

Sequential (9 sections): ~180s / ~135k tokens. Parallel (3-wide batches): ~75s / ~155k tokens (~2.4x faster, +1.15x cost).
**High risk** — MCP calls can hang on large nodes.

**Recommendation: Parallel (3-wide batches)** with MCP timeout guard.

If user approves parallel, fan out section reads in batches of 3 subagents. Each subagent:
- Reads its assigned sections via `get_design_context`
- Enforces 60-second timeout per MCP call (per Figma MCP reliability rules)
- If a call hangs, skip that section + flag as `type: mcp-timeout` in `figma-flags.md`
- Returns section map entries + reference screenshots for its batch

If user chooses sequential, read sections one at a time (existing behaviour).

### Section mapping

> **Tool:** Use `get_design_context` on the top-level page node first to get a screenshot
> overview and identify sections. Then drill into each section by node ID. Do not use
> `get_metadata` to enumerate sections — it returns only structure and will hang on large pages.

For each page in the Figma file, identify sections (top-level frames within the page).

**Component rule:** Any element saved as a Figma component = Webflow component.
Non-component frames are sections.

Write `.claude/design/section-map.md`:

```markdown
# Section Map — [Client Name]
**Generated:** YYYY-MM-DD

## [page-slug] (e.g. home)

| # | Section | Figma frame | Components used | Notes |
|---|---------|-------------|-----------------|-------|
| 1 | hero | hero-homepage | hero-cta (component) | Full-bleed, video bg |
| 2 | services | services-grid | card-service (component) | 3-col grid, CMS-bound |
| 3 | testimonials | testimonials-slider | testimonial-card (component) | Swiper/Finsweet |
...

## [page-slug] (e.g. about)
...
```

### Reference screenshots

For every section on every page, save a reference screenshot to
`.claude/design/references/`. These serve as visual ground truth for QA and regression
testing later.

**How to capture:**
- `get_design_context` already returns a screenshot — save it directly from the response.
- If `get_design_context` fails or times out on a node, use `get_screenshot` as a
  standalone fallback (it's lighter — image only, no code generation).
- Never skip the screenshot — if both tools fail on a node, log it as a `type: mcp-timeout`
  flag and move on.

**Naming — kebab-case by page and section:**

- `home--hero.png`, `home--services.png`, `home--testimonials.png`
- `about--hero.png`, `about--team.png`
- `work--project-grid.png`

For component states/variants (from Figma components), export each separately:
- `component--button-default.png`, `component--button-hover.png`
- `component--card-project.png`

---

## Step 3 — Extract interaction and layout specs

> **Tool:** Use `get_design_context` on each frame — it returns interaction/prototype data
> alongside code and screenshots. `get_metadata` does not include interaction data.

Pull all prototype interactions, annotation notes, spec comments, and auto-layout values
from every frame. Save to `.claude/design/interaction-specs.md`:

```markdown
# Interaction and Layout Specs — [Client Name]
**Extracted:** YYYY-MM-DD

## [page-slug] / [section-name]

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
- CF token mapping conflict (Figma value doesn't cleanly map to a CF class)

Flag format:
```markdown
# Figma Flags — [Client Name]
**Generated:** YYYY-MM-DD

## [component-or-section-slug]
- **Frame:** [frame name in Figma]
- **Page:** [page slug]
- **Flag:** [description]
- **Type:** interaction / responsive / cms / variant / dependency / placement / token-conflict
- **Resolved:** no
- **Resolution:** —
```

---

## Output summary

Show on completion:

```
/figma-audit complete

Tokens extracted:     [N] colours, [N] text styles, [N] radius, [N] shadows, [N] sizes
CF mappings:          [N] mapped, [N] flagged conflicts
Sections mapped:      [N] sections across [N] pages
References exported:  [N] images
Interaction specs:    [N] frames documented
Flags raised:         [N] in figma-flags.md

Files written:
  .claude/design/figma-tokens.json
  .claude/design/section-map.md
  .claude/design/interaction-specs.md
  .claude/design/references/ ([N] files)
  .claude/design/figma-flags.md

Next: run /component-plan to review sections, confirm components, and resolve flagged ambiguities.
```

---

## Verification tests

1. `figma-tokens.json` exists — every entry has `figma_name`, `converted_name`, `type`,
   `value`, `cf_mapping`, `cf_class`, `flagged`, `flag_reason`, `webflow_variable_id: null`
2. Size tokens have `breakpoint_values` when responsive values differ across frames
3. No spacing tokens extracted — spacing values appear only as reference in
   `interaction-specs.md`
4. All token names are kebab-case
5. `section-map.md` exists — every page has an ordered list of sections with components noted
6. `references/` contains at least one image per section per page
7. `interaction-specs.md` exists — empty entries are themselves flagged
8. `figma-flags.md` exists — includes `token-conflict` type for CF mapping conflicts
9. If zero flags raised, confirm with user Figma is genuinely complete before proceeding
10. No Webflow connection made during this command
11. No ambiguities resolved — flags recorded only
