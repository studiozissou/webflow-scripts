# /dev-queue — Queue and CLAUDE.md Generation

Generates the full task queue from the approved component inventory and writes CLAUDE.md.

---

## Pre-flight

1. Read `.claude/client.md`
2. Read `.claude/design/component-inventory.md` — must have `Status: Approved`
3. Read `.claude/design/arch-review.md` — must have `Status: Signed off`
4. Read `.claude/design/figma-tokens.json` — must have `webflow_variable_id` entries
5. If any check fails, stop and name the command to run first

---

## Step 1 — Scaffold remaining folders

Create any missing:

```
.claude/
├── specs/
├── adrs/
├── audits/
│   ├── seo/
│   ├── accessibility/
│   ├── performance/
│   └── content/
├── reports/
├── briefs/
└── logs/        ← add to .gitignore
```

---

## Step 2 — Generate queue tasks

Use build order from arch-review if it differs from component-inventory order.

### Foundation tasks (always first)

```json
[
  { "id": "foundation-css-variables", "title": "Set up global CSS custom properties", "type": "foundation", "status": "Triage", "priority": "P0", "agent": "code-writer", "dependencies": [] },
  { "id": "foundation-nav", "title": "Build nav component", "type": "component", "status": "Triage", "priority": "P0", "agent": "code-writer", "dependencies": ["foundation-css-variables"] },
  { "id": "foundation-footer", "title": "Build footer component", "type": "component", "status": "Triage", "priority": "P0", "agent": "code-writer", "dependencies": ["foundation-css-variables"] },
  { "id": "foundation-init", "title": "Set up init.js entry point and module load order", "type": "foundation", "status": "Triage", "priority": "P0", "agent": "code-writer", "dependencies": [] }
]
```

Add `foundation-barba` only if Barba.js confirmed in scope — ask user.

### Component tasks

```json
{
  "id": "component-[slug]",
  "title": "Build [component name]",
  "type": "component",
  "status": "Triage",
  "priority": "P1",
  "agent": "code-writer",
  "complexity": "simple|complex",
  "dependencies": ["[dependency IDs]"],
  "figma_ref": "[frame name]",
  "spec": ".claude/specs/component-[slug].md"
}
```

### Page tasks

```json
{
  "id": "page-[slug]",
  "title": "Build [page name] page",
  "type": "page",
  "status": "Triage",
  "priority": "P2",
  "agent": "code-writer",
  "complexity": "simple|complex",
  "dependencies": ["[required component IDs]"],
  "figma_ref": "[frame name]",
  "spec": ".claude/specs/page-[slug].md"
}
```

### SEO and technical tasks

```json
[
  { "id": "seo-schema", "title": "Add schema.org JSON-LD per page type", "type": "seo", "status": "Triage", "priority": "P2", "agent": "schema" },
  { "id": "seo-meta", "title": "Configure meta titles and descriptions", "type": "seo", "status": "Triage", "priority": "P2", "agent": "seo" },
  { "id": "seo-llms-txt", "title": "Set up llms.txt", "type": "seo", "status": "Triage", "priority": "P2", "agent": "seo" },
  { "id": "seo-robots-sitemap", "title": "Configure robots.txt and sitemap", "type": "seo", "status": "Triage", "priority": "P2", "agent": "seo" },
  { "id": "a11y-audit", "title": "Accessibility audit and fixes", "type": "qa", "status": "Triage", "priority": "P2", "agent": "qa" }
]
```

### QA tasks (always last)

```json
[
  { "id": "qa-smoke", "title": "Smoke test — all pages", "type": "qa", "status": "Triage", "priority": "P3", "agent": "qa" },
  { "id": "qa-a11y", "title": "Accessibility audit — all pages", "type": "qa", "status": "Triage", "priority": "P3", "agent": "qa" },
  { "id": "qa-cross-browser", "title": "Cross-browser check", "type": "qa", "status": "Triage", "priority": "P3", "agent": "qa" },
  { "id": "qa-perf", "title": "Performance audit", "type": "qa", "status": "Triage", "priority": "P3", "agent": "perf" }
]
```

---

## Step 3 — Write CLAUDE.md

```markdown
# CLAUDE.md — [Client Name]

## Project overview
[2–3 sentences from client.md]

## Webflow project
- Staging: [url]
- Live: [url]
- Project ID: [id]

## Deployment model
- jsDelivr CDN with commit-pinned URLs
- Localhost detection in init.js for local dev loop

## Module load order
[To be confirmed — update after foundation tasks complete]

## Barba namespaces
[To be confirmed — update when pages are scaffolded]

## Global state
[To be confirmed — update as modules are built]

## Design tokens
- Source: .claude/design/figma-tokens.json
- Webflow variables: created and verified
- Naming: kebab-case throughout

## Component inventory
See .claude/design/component-inventory.md
Build order and complexity recorded per component.

## Spacing convention
- Vertical rhythm: Client First spacer divs (padding-global, padding-section-*, padding-custom)
- Component layout: flex or grid where Figma auto-layout maps cleanly
- Absolute placements: nearest approximation — flag with comment for manual review
- No custom spacing variables

## Class naming convention
[BEM / utility / project-specific — confirm before first build session]

## Known selectors
[Empty — update as selectors verified via Webflow MCP during build]

## Known gotchas
[Empty — update as discovered]

## CSS custom properties read by JS
[Empty — update as needed]
```

---

## Output summary

```
/dev-queue complete

Queue generated:
  Foundation:  [N] tasks
  Components:  [N] tasks
  Pages:       [N] tasks
  SEO/tech:    [N] tasks
  QA:          [N] tasks
  Total:       [N] tasks

Files written:
  .claude/queue.json
  CLAUDE.md

Run /status to see the full queue.
Project is ready for build sessions.
```

---

## Verification tests

1. `queue.json` has all five task categories
2. Foundation tasks have lower priority number than component tasks
3. Every component task has `complexity` field matching inventory
4. Every page task lists its component dependencies
5. All tasks have status `Triage`
6. `CLAUDE.md` exists with confirmed staging and live URLs
7. `CLAUDE.md` has `## Known selectors` and `## Spacing convention` sections
8. Build order matches arch-review recommendation if it differed from inventory
9. Command did not run if arch-review was not `Signed off`
10. Command did not run if `figma-tokens.json` had no `webflow_variable_id` entries
