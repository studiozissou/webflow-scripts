# /webflow-connect — Webflow Connection and Variable Setup

Connects to the Webflow project, reads its current state, renames existing template
variables to kebab-case, and creates new variables from approved Figma tokens.

**Confirmation required before any write operation.**

---

## Pre-flight

1. Read `.claude/client.md`
2. Read `.claude/design/figma-tokens.json`
3. Read `.claude/design/arch-review.md` — must have `Status: Signed off`
4. If arch-review is not signed off, stop and direct to `/arch-review`

---

## Step 1 — Connect and read

1. Connect to Webflow project via Webflow MCP
2. Retrieve and record:
   - Project name and ID
   - Staging URL and live URL
   - All existing pages
   - All existing CMS collections
   - All existing variables — read these in full before any writes
3. Write project ID and URLs to `.claude/client.md`
4. Show the user what was found and ask: "Does this look like the right project?"
5. Wait for confirmation before proceeding

---

## Step 2 — Rename existing template variables to kebab-case

The starter template uses Title Case naming. Rename all existing variables to kebab-case
before adding new ones — keeps the full variable set consistent.

Generate a rename list and show it to the user:

```
Existing name          → Proposed kebab-case name
─────────────────────────────────────────────────
White                  → color-white
Neutral Lightest       → color-neutral-lightest
Neutral Lighter        → color-neutral-lighter
Neutral Light          → color-neutral-light
Neutral                → color-neutral
Neutral Dark           → color-neutral-dark
Neutral Darker         → color-neutral-darker
Neutral Darkest        → color-neutral-darkest
Transparent            → color-opacity-transparent
White 5                → color-opacity-white-5
White 10               → color-opacity-white-10
[...continue for all existing variables]
Text                   → scheme-text
Background             → scheme-background
Foreground             → scheme-foreground
Border                 → scheme-border
Accent                 → scheme-accent
Heading                → font-heading
Body                   → font-body
Large                  → radius-large
Medium                 → radius-medium
Small                  → radius-small
Border Width           → stroke-border-width
Divider Width          → stroke-divider-width
```

Ask: "Ready to rename [N] existing variables to kebab-case. Proceed?"
Wait for explicit confirmation before renaming.

After renaming, read variables back from Webflow to confirm all renames applied.

---

## Step 3 — Resolve token conflicts

Compare `figma-tokens.json` against current Webflow variables (post-rename).

For each Figma token:
- No match → mark as `create`
- Same name + same value → mark as `skip`
- Same name + different value → mark as `conflict`
- Flagged in figma-tokens.json → mark as `needs-naming-confirmation`

Show conflict report before doing anything:

```
Ready to create:         [N] variables
Already exist (skip):    [N] variables
Conflicts:               [N] variables
Needs naming confirm:    [N] variables
```

Resolve one at a time:
- **Conflict:** "Variable [name] exists as [old value] — Figma has [new value].
  Keep existing, overwrite, or create with new name?"
- **Needs confirmation:** "Token [figma_name] — proposed name: [converted_name].
  Correct?"

Record every decision in `design-decisions.md`.

---

## Step 4 — Update placeholder variables

The template has placeholder values that need updating with real client values:

| Variable | Template value | Action |
|---|---|---|
| `font-heading` | `system-ui` | Update to client heading font from Figma |
| `font-body` | `system-ui` | Update to client body font from Figma |
| `radius-large` | `0px` | Update from Figma radius tokens |
| `radius-medium` | `0px` | Update from Figma radius tokens |
| `radius-small` | `0px` | Update from Figma radius tokens |
| `scheme-accent` | `color-neutral-darkest` | Update to client brand accent colour |

Show proposed updates and ask: "Ready to update [N] placeholder variables. Proceed?"
Wait for confirmation.

---

## Step 5 — Create new variables

Ask: "Ready to create [N] new variables. Proceed?"
Wait for confirmation.

Create variables grouped as:

| Group | Contents |
|---|---|
| `color-brand-*` | Client brand colour primitives |
| `color-*` | Any additional colour tokens not in template |
| `font-*` | Additional font tokens if needed |
| `radius-*` | Any additional radius tokens |
| `shadow-*` | Shadow tokens |

Do not create spacing variables.

After creation, read variables back from Webflow and verify count matches expected.
If counts don't match, report discrepancy and stop.

Update `figma-tokens.json` — add `webflow_variable_id` to each created/updated token.

---

## Output summary

```
/webflow-connect complete

Project:              [name]
Variables renamed:    [N] (Title Case → kebab-case)
Placeholders updated: [N]
Variables created:    [N]
Variables skipped:    [N] (already existed)
Conflicts resolved:   [N]

Files updated:
  .claude/client.md (project ID, URLs)
  .claude/design/figma-tokens.json (variable IDs added)
  .claude/design/design-decisions.md (conflict resolutions)

Next: run /dev-queue to generate queue.json and CLAUDE.md.
```

---

## Verification tests

1. `client.md` has Webflow project ID, staging URL, live URL
2. All existing template variables renamed to kebab-case — none remain in Title Case
3. `figma-tokens.json` — every created/updated variable has `webflow_variable_id`
4. Placeholder variables updated — `font-heading` and `font-body` no longer `system-ui`
5. Radius variables no longer `0px` (unless Figma genuinely has 0px radius)
6. Variable count in Webflow matches expected after creation
7. No variables created or renamed without explicit user confirmation
8. All conflicts and flagged tokens resolved and recorded in `design-decisions.md`
9. Command did not run if arch-review was not `Signed off`
