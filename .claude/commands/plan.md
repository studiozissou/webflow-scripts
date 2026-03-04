Plan a feature before writing any code.

## Notion push: Planning
Update queue.json: set this slug's status to Planning.
Push to Notion: search by Slug + Client, update Status to "Planning",
set Last Updated to now. If the row doesn't exist, create it with
Task Name, Slug, Status, Client (search Clients DB by name from
CLAUDE.md, link matching row), and Priority
(ask user if not already set). If Notion fails, log warning and continue.

## Process
1. Use the `pm-questioning` skill to ask clarifying questions. Do not skip this step.
2. Once answers are gathered, write a spec to `.claude/specs/<feature-slug>.md` using the pm agent spec format.
3. Break the feature into ordered tasks and append them to `.claude/queue.json`.
4. Identify which agents are needed for each task (code-writer, qa, seo, perf, etc.).
5. Flag any architectural decisions that need an ADR before work begins.
6. **Barba transition impact check** (see below).
7. Present the plan summary to the user for approval before proceeding.

**Always write the spec file to `.claude/specs/<feature-slug>.md` before the session ends — do not wait to be asked.**

## Barba transition impact check

If the project uses Barba.js for page transitions, answer these questions in the spec before proceeding:

1. **Init/Destroy lifecycle** — Does the feature add DOM elements, event listeners, GSAP timelines, or ScrollTrigger instances? If yes, it MUST have `init(container)` and `destroy()` methods, and orchestrator.js must call them on `barba.hooks.enter` / `barba.hooks.leave`.
2. **State survival** — Does anything need to persist across a Barba transition (video playback position, scroll offset, user selection)? If yes, define how state is stored (e.g. `RHP.videoState`) and restored after the transition.
3. **Transition interference** — Could the feature's animations or DOM mutations conflict with the leave/enter transition itself? Check for z-index stacking, opacity tweens, or elements that exist outside `[data-barba="container"]`.
4. **Re-entry correctness** — If a user navigates away and comes back (e.g. home → about → home), does the feature re-initialise cleanly? No stale listeners, no doubled DOM nodes, no missing elements.
5. **Namespace scoping** — Which Barba namespaces does this feature run on? Confirm it does NOT init on pages where it shouldn't.

Add a "Barba Impact" section to the spec with answers. If Barba is not enabled for the project, write "N/A — no Barba transitions" and move on.

## Notion push: Ready to Build
Update queue.json: set this slug's status to Ready to Build.
Push to Notion: update Status to "Ready to Build", set Last Updated.
If Notion fails, log warning and continue.

## Output
- Spec file at `.claude/specs/<feature-slug>.md`
- Updated `.claude/queue.json` with new tasks
- List of agents needed
- Any blockers or open questions
