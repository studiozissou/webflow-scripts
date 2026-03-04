Build a feature end-to-end using the appropriate agents.

## Notion push: Building
Update queue.json: set this slug's status to Building.
Push to Notion: update Status to "Building", set Last Updated.
If Notion fails, log warning and continue.

## Process
0. **Log slug:** Run `.claude/scripts/log-slug.sh build_start <feature-slug>` (derive the slug from the feature/spec name).
1. Read the spec from `.claude/specs/` (if it exists) or ask for a description.
2. Read all relevant existing files before writing anything.
## Selector verification (if Webflow MCP connected)

Before writing JS targeting elements by class or data attribute:
1. Use `element_snapshot_tool` to read target page DOM
2. Confirm every selector exists
3. If missing, stop and ask — do not assume it appears at runtime
4. Document confirmed selectors in CLAUDE.md under "## Known selectors"

## Spacing check

Before writing any layout code:
- Use Client First spacer divs for vertical rhythm between components
- Use flex or grid for component-internal layout
- Absolute placements: nearest approximation, add comment:
  `/* manual placement — verify against design */`
- Never create custom spacing variables or classes if Client First covers it

3. Use the `code-writer` agent to implement the feature.
4. Use the `refactor` agent on all changed files. Instruction: "Refactor the implementation for clarity and pattern compliance. Do not change behaviour."
5. Use the `code-reviewer` agent to review all changes. Handle the verdict:
   - **PASS** — continue to the next step.
   - **WARN** — show warnings to the user, then continue.
   - **FAIL** — fix the issues, then re-run the code-reviewer. Max 3 review cycles. After 3 failures, mark the task Blocked in queue.json and ask the developer for guidance.
6. If the feature has motion/animation, apply the `gsap-scrolltrigger` or `barba-js` skill as appropriate.
7. After implementation, run `/qa-check` automatically.
8. Update the relevant task in `.claude/queue.json` to `"status": "done"`.
9. Present a summary of what was built, what files were changed, and any deployment steps.

## Rules
- Never start writing code without reading existing files first
- Always check `shared/utils.js` and the project orchestrator before adding new utilities
- Leave no console.log statements in completed code
- Mark all tasks complete in queue.json when done
- Verify all selectors via Webflow MCP before writing JS that targets them
- Use Client First spacer divs for vertical rhythm — no margin-top/bottom between components
- **Log slug:** After marking tasks complete, run `.claude/scripts/log-slug.sh build_end <feature-slug>`

## Wrap up
Before finishing, ask: "Status for SLUG?"
Offer: in-progress / blocked / ready-for-review / done
If blocked, ask: "What's blocking you?"
Log: `.claude/scripts/log-slug.sh status_CHOSEN SLUG`

## Notion push: final status

Based on the status the user chose in the wrap-up:

- **ready-for-review:**
  Update queue.json status to Ready to Review.
  Push to Notion: Status "Ready to Review", clear Blocker field.

- **blocked:**
  Update queue.json status to Blocked.
  Push to Notion: Status "Blocked", set Blocker to the reason the user gave.

- **in-progress** (not done yet, just pausing):
  Update queue.json status to Building.
  Push to Notion: Status "Building".

- **done:**
  Update queue.json status to Done.
  Push to Notion: Status "Done".

Always set Last Updated. If Notion fails, log warning and continue.
