Build a feature end-to-end using the appropriate agents.

## Notion push: Building
Update queue.json: set this slug's status to Building.
Push to Notion: update Status to "Building", set Last Updated.
If Notion fails, log warning and continue.

## Process
0. **Log slug:** Run `.claude/scripts/log-slug.sh build_start <feature-slug>` (derive the slug from the feature/spec name).
1. Read the spec from `.claude/specs/` (if it exists) or ask for a description.
2. Read all relevant existing files before writing anything.
3. Use the `code-writer` agent to implement the feature.
4. If the feature has motion/animation, apply the `gsap-scrolltrigger` or `barba-js` skill as appropriate.
5. After implementation, run `/qa-check` automatically.
6. Update the relevant task in `.claude/queue.json` to `"status": "done"`.
7. Present a summary of what was built, what files were changed, and any deployment steps.

## Rules
- Never start writing code without reading existing files first
- Always check `shared/utils.js` and the project orchestrator before adding new utilities
- Leave no console.log statements in completed code
- Mark all tasks complete in queue.json when done
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
