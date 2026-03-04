# /component-plan — Component Identification and Sign-off

Analyses Figma output to identify reusable components, resolves all flagged ambiguities
through conversation, and produces a signed-off component inventory.

Does not proceed to the next component until the current one is fully resolved.
Does not close until you explicitly sign off on the complete inventory.

---

## Pre-flight

1. Read `.claude/client.md`
2. Read `.claude/design/figma-tokens.json`
3. Read `.claude/design/interaction-specs.md`
4. Read `.claude/design/figma-flags.md`
5. Confirm all four files exist. If any are missing, stop and name which command to run.

---

## Step 1 — Identify component candidates

Review all Figma frames and reference images.
Mark as a component candidate if it:
- Appears on more than one page
- Has multiple variants
- Contains CMS-bound content
- Is a nav, footer, or site-wide element
- Is complex enough that rebuilding per-page would be risky

---

## Step 2 — Resolve flagged ambiguities (blocking)

Work through `figma-flags.md` one component at a time.

For each flagged component:
1. Show the flag and reference image
2. Ask a specific, direct question — not "what do you want?" but the actual design question:
   - "The mobile nav has no interaction spec — hamburger menu or bottom sheet?
     What's the open/close animation?"
   - "The card shows 3 items on listing and 4 on homepage — same component or two?"
   - "This CTA has no hover state — infer from brand colours or wait for spec?"
3. Wait for answer
4. Record resolution in `.claude/design/design-decisions.md`
5. Update the flag entry: `"resolved": true` and resolution text
6. Move to the next flag only after recording

Do not batch questions. One flag → one answer → one recorded decision → next flag.

---

## Step 3 — Document spacing approach per component

For each component, record in the inventory:
- Internal layout: flex / grid / Client First spacer divs / mixed
- Any absolute placements: note the Figma value as reference and flag for manual review
- Auto-layout gaps/padding: note as reference values only — not variables

---

## Step 4 — Write component inventory

Write `.claude/design/component-inventory.md`:

```markdown
# Component Inventory — [Client Name]
**Generated:** YYYY-MM-DD
**Status:** Draft

---

## [component-slug]
- **Description:**
- **Appears on pages:**
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

---

## Step 5 — Sign-off

Show the user a summary table:

```
#   Component          Pages        CMS?  Complexity  Dependencies
1   nav                all          no    simple      none
2   footer             all          no    simple      none
3   hero-homepage      home         no    complex     none
4   card-project       work, home   yes   simple      none
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

1. Every flag in `figma-flags.md` has `"resolved": true`
2. `design-decisions.md` has one entry per resolved flag
3. `component-inventory.md` has build order and complexity for every component
4. Every component has a `Dependencies` field (even if "none")
5. Every component has a `Spacing reference` and `Absolute placements` field
6. Inventory has `Status: Approved` with date
7. No component written to inventory before its flags resolved
8. User explicitly approved — not just reviewed
