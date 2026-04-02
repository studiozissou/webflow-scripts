/carsa-build — Build a component or section on the Carsa Webflow site.

Invoke the `carsa-webflow` skill before doing anything else. The skill contains the full
Client First reference, guardrails, and anti-patterns. Also invoke the `client-first` skill
for generic Client First validation.

If ARGUMENTS contains `--review`, skip straight to the Weekly Review section below.
If ARGUMENTS contains `--dry-run`, run only steps 1-2 (PLAN + CONFIRM) and stop.

---

## Step 1 — PLAN

Ask the user what they want to build. Then run these checks:

### 1a. Inspect the target page
```
element_tool > get_all_elements (include_style_properties: false)
```
Understand what's already on the page — classes, components, structure.

### 1b. Search for existing components
```
de_component_tool > get_all_components
```
If a matching component exists → plan to insert it with `propertyOverrides`. Skip element building.

### 1c. Check the All Components Template page
Call `de_page_tool > get_all_pages`. Find pages with kind `staticTemplate`. Look for one named
"All Components" or similar. Switch to it and snapshot to see available patterns.

If MCP hangs here, skip this step — it's supplementary, not blocking.

### 1d. Check the Style Guide
Switch to page ID `68348ea61096b37caacd2f9a` and snapshot for visual reference.

### 1e. Present the plan
Tell the user:
- What you'll build (component instance vs from-scratch elements)
- Which classes and variables you'll use
- Where it'll go on the page
- Whether it should be a reusable component

Ask: "Does this match what you had in mind?" Wait for approval.

If `--dry-run` was passed, **stop here** and output the plan summary.

---

## Step 2 — CONFIRM

Before executing, describe the specific MCP calls you'll make:
- Elements to create or components to insert
- Classes to apply
- Attributes to set
- New styles needed (if any)

Get explicit "go ahead" from the user. Webflow changes can be destructive.

---

## Step 3 — BUILD

Execute via Webflow MCP following the skill's build workflows.

### MCP Fallback
If MCP hangs or errors:
1. Retry once — ping with `de_page_tool > get_all_pages` as health check
2. If still failing: switch to HTML output mode
   - Generate clean HTML + CSS using only documented Client First classes
   - Include `data-analytics-event` attributes
   - Tell the user their options (converter, wait and retry)

---

## Step 4 — LOG

Write an entry to the build log (location: `.claude/logs/carsa-build-log.json` or CWD).

Create the file if it doesn't exist:
```json
{ "version": 1, "lastUpdated": "TODAY", "entries": [] }
```

Append entry with: id, date, page, pageId, action, componentName, elementTypes,
newElements, newStyles, newComponents, verified (false initially), sharedToSlack, notes.

---

## Step 5 — VERIFY

Present the verification checklist from the skill. Core checklist always shown.
Append context-aware extras based on what was built (forms, CTAs, images, CMS, etc.).

After the user completes it, update the build log entry: set `verified: true`.

---

## Step 6 — REPORT

Share with the dev team:

1. Check if Slack MCP is available (cache the result for the session)
2. If available: "Want me to post this build summary to #carsa-dev?"
   - If approved: post via Slack MCP
   - Update log: `sharedToSlack: true, slackMethod: "mcp"`
3. If not available or declined: output a pre-formatted copy-paste block
   - Update log: `slackMethod: "copy-paste"` or `"skipped"`

### Summary format
```
Carsa Build — [DATE]
Page: [page path]
Action: [inserted component / built section / updated content]
Details: [what was built, which component, which classes]
New styles: [count] | New components: [count]
Verified: [yes/no]
```

---

## Weekly Review (`--review`)

Read the build log. Generate a markdown summary covering the past 7 days:

- **Total builds:** [count]
- **Pages modified:** [list]
- **New components created:** [list] ← flag for design review
- **New styles created:** [list] ← flag for Client First compliance
- **Unverified builds:** [list] ← flag for QA
- **Unshared builds:** [list] ← flag for team visibility

If Slack MCP is available, offer to post the digest. Otherwise output copy-paste block.

---

## Model split
- **Opus** for planning (step 1), MCP fallback HTML generation (step 3)
- **Haiku** for build log operations (step 4), Slack message formatting (step 6)

ARGUMENTS: $ARGUMENTS
