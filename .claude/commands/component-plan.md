# /component-plan — Section Mapping & Component Sign-off

Confirms the section map from `/figma-audit`, identifies reusable Webflow components,
resolves all flagged ambiguities through conversation, and produces a signed-off
component inventory with section-to-component mappings.

Does not proceed to the next item until the current one is fully resolved.
Does not close until you explicitly sign off on the complete inventory.

---

## Pre-flight

1. Read `.claude/client.md`
2. Read `.claude/design/figma-tokens.json`
3. Read `.claude/design/section-map.md`
4. Read `.claude/design/interaction-specs.md`
5. Read `.claude/design/figma-flags.md`
6. Confirm all five files exist. If any are missing, stop and name which command to run.

---

## Step 1 — Confirm section map

Review `section-map.md` from `/figma-audit` with the user.

For each page:
1. Show the section list with reference screenshots
2. Ask: "Does this section breakdown look right for [page-slug]? Any sections to split, merge, or rename?"
3. Record changes

Update `section-map.md` with any corrections. This is the authoritative page structure
for the build.

---

## Step 2 — Confirm component list

Components are already identified from Figma — any element saved as a Figma component
becomes a Webflow component. This step confirms the list, resolves flags, and documents
each component.

For each component identified in the section map:
1. Show the component name, which sections/pages it appears in, and reference image
2. Confirm it should be a Webflow component (not just a section-level element)
3. If flagged in `figma-flags.md`, resolve the flag now (see Step 3)
4. Document usage, variants, and dependencies

---

## Step 3 — Resolve flagged ambiguities (blocking)

Work through `figma-flags.md` one item at a time (sections and components).

For each flag:
1. Show the flag and reference image
2. Ask a specific, direct question — not "what do you want?" but the actual design question:
   - "The mobile nav has no interaction spec — hamburger menu or bottom sheet?
     What's the open/close animation?"
   - "The card shows 3 items on listing and 4 on homepage — same component or two?"
   - "This CTA has no hover state — infer from brand colours or wait for spec?"
   - "Token `text-heading-h1-size` maps to `heading-style-h1` but the Figma value (72px) conflicts with the CF template default (64px) — use the Figma value?"
3. Wait for answer
4. Record resolution in `.claude/design/design-decisions.md`
5. Update the flag entry: `"resolved": true` and resolution text
6. Move to the next flag only after recording

Do not batch questions. One flag → one answer → one recorded decision → next flag.

---

## Step 4 — Document spacing approach per component

For each component, record in the inventory:
- Internal layout: flex / grid / Client First spacer divs / mixed
- Any absolute placements: note the Figma value as reference and flag for manual review
- Auto-layout gaps/padding: note as reference values only — not variables

---

## Step 5 — Write component inventory

Write `.claude/design/component-inventory.md`:

```markdown
# Component Inventory — [Client Name]
**Generated:** YYYY-MM-DD
**Status:** Draft

---

## [component-slug]
- **Description:**
- **Appears on pages:**
- **Sections:** [which sections in the section map use this component]
- **Variants:**
- **CMS-bound:** yes / no
- **Finsweet attributes:** CMS Filter / CMS Load / CMS Nest / none
- **Internal layout:** flex / grid / Client First spacers / mixed
- **Spacing reference:** [auto-layout gap/padding values from Figma — reference only]
- **Absolute placements:** [describe — flagged for manual review]
- **Interaction notes:**
- **Responsive behaviour:**
- **Figma reference:** [frame name]
- **Build order:** [number]
- **Dependencies:** [other slugs or "none"]
- **Complexity:** simple / complex
- **Design decisions:** [resolutions from this session]
```

Complexity rules:
- **Simple** — static layout, no state, no JS, no animations → `/plan` → `/build`
- **Complex** — state, GSAP, Barba hooks, Finsweet, shared state, non-trivial CMS →
  `/plan` → `/architect` → `/build`

List in build order: global elements first, then shared components, then page-specific.

After the component entries, add a **Sections** build list and a **Full Build Order** table.
Sections are top-level build units — they assemble components and section-level elements.
Components are built first (reusable symbols), then sections are built top to bottom.

```markdown
## Sections (build list)

Sections are the top-level build units. Components are built first (they're reusable
symbols), then sections are built top to bottom — each section assembles its components
and section-level elements.

| # | Section | Components inside | Section-level elements inside | CMS? | Complexity | Dependencies |
|---|---------|-------------------|-------------------------------|------|------------|--------------|
| N | [slug]  | [component slugs] | [element names]               | y/n  | simple/complex | [deps]    |

## Full Build Order

#   Item                Type              Parent     CMS?  Complexity  Dependencies
1   [component]         component         —          ...   ...         ...
...
N   [section]           section           —          ...   ...         [component deps]
```

---

## Step 6 — Update section map with component mappings

Update `section-map.md` to include confirmed component slugs per section, matching the
component inventory. Every section should show which components (if any) it contains.

---

## Step 7 — Sign-off

Show the user the full build order table — components and sections together:

```
#   Item                Type              Parent     CMS?  Complexity  Dependencies
1   nav                 component         —          no    simple      none
2   footer              component         —          no    simple      none
3   hero-cta            component         —          no    complex     none
4   card-project        component         —          yes   simple      none
...
N   hero                section           —          no    complex     nav, hero-cta
N+1 work                section           —          yes   complex     card-project
...
```

Ask: "Does this look right? Anything missing, combined, or in the wrong order?"

Make changes. Repeat until the user says the inventory is approved.

Record in `component-inventory.md`:

```markdown
**Status:** Approved
**Approved:** YYYY-MM-DD
```

Do not close until this is recorded.

---

## Verification tests

1. `section-map.md` exists and was confirmed/updated by the user
2. Every flag in `figma-flags.md` has `"resolved": true`
3. `design-decisions.md` has one entry per resolved flag
4. `component-inventory.md` has build order and complexity for every component
5. Every component has a `Dependencies` field (even if "none")
6. Every component has a `Sections` field showing where it appears in the section map
7. Every component has a `Spacing reference` and `Absolute placements` field
8. `section-map.md` includes component slugs per section
9. Inventory includes a **Sections build list** with every section, its components, and section-level elements
10. Inventory includes a **Full Build Order** table covering both components and sections
11. Sections list their component dependencies (components they contain)
12. Inventory has `Status: Approved` with date
13. No component written to inventory before its flags resolved
14. User explicitly approved — not just reviewed
