# /style-guide — Extend Template Style Guide Page

Extends the existing `/style-guide` draft page in the Webflow template with
project-specific tokens and component placeholders.

Does not create a new page — reads and extends the existing one.
The existing Client First utility class sections are left untouched.

---

## Pre-flight

1. Read `.claude/client.md` — confirm project details
2. Read `.claude/design/figma-tokens.json` — confirm variables exist
3. Read `.claude/design/component-inventory.md` — confirm approved
4. Connect to Webflow MCP
5. Find the existing `/style-guide` draft page — if it doesn't exist, ask:
   "No style-guide page found. Create one from scratch or skip?"

---

## Confirmation

Ask: "Ready to extend the style-guide page in [project name] with project tokens and
component placeholders. This will add new sections below the existing Client First
content. Proceed?"

Wait for explicit confirmation.

---

## What to add (below existing content)

### Project colour palette
- All brand colour swatches with variable name and hex value
- Grouped: primitives, then semantic (schemes)

### Project typography
- Heading and body fonts rendered at their defined sizes
- All text style tokens with labels

### Project UI styles
- Radius tokens visualised
- Shadow tokens visualised

### Component placeholders
One section per component in build order:
- Label: `[component-slug] — not yet built`
- Replace placeholder with real component as each is built

---

## After creation

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

## Verification tests

1. Existing Client First sections on the style guide page are untouched
2. New sections added below existing content — not interspersed
3. Brand colour swatches match all colour variables in `figma-tokens.json`
4. Typography samples match font variables
5. Component placeholder count matches component inventory count
6. Page remains in draft/hidden state — not published
7. `style-guide-populate` task added to `queue.json`
8. No other Webflow pages or content modified
