Plan a feature before writing any code.

## Model split
- **Opus max-effort** for clarifying questions (step 2), spec writing + task breakdown + parallelisation map (steps 3–7), and Barba impact check
- **Sonnet** for research agents (step 1), acceptance test generation (step 8), and Notion pushes

## Notion push: Planning (if Notion connected)
Update queue.json: set this slug's status to Planning.
Push to Notion: search by Slug + Client, update Status to "Planning",
set Last Updated to now. If the row doesn't exist, create it with
Task Name, Slug, Status, Client (search Clients DB by name from
CLAUDE.md, link matching row), and Priority
(ask user if not already set). If Notion fails, log warning and continue.

## Process

### 1. Research phase (GSD-inspired context engineering)

Before asking any questions, spawn up to 3 Explore agents in parallel to research:

- **Agent 1 — Codebase patterns:** Search the codebase for existing patterns similar to this feature. Look for reusable functions, components, or modules that could be adapted. Check `shared/utils.js`, the project orchestrator, and any related page modules.
- **Agent 2 — Specs, ADRs, and conventions:** Read the relevant spec(s), ADRs, and CLAUDE.md sections that relate to this feature's domain (animation, CMS, layout, transitions). Identify constraints and decisions already made.
- **Agent 3 — Webflow page structure (if MCP connected):** Use `element_snapshot_tool` to snapshot the target page DOM to understand the existing structure and available selectors. If MCP is not connected, skip this agent.

Summarize findings in a **Research Summary** block before proceeding. Include:
- Reusable code found (file paths + function names)
- Existing patterns to follow
- Constraints discovered (from ADRs, specs, or CLAUDE.md)
- Selectors confirmed (if MCP was used)

### 2. Clarifying questions

Use the `pm-questioning` skill to ask clarifying questions. Do not skip this step.
**Include research findings in the question context** — reference specific files, patterns, and constraints found by the research agents so the user can make informed decisions.

### 3–8. Spec writing and task breakdown

3. Once answers are gathered, use **Opus max-effort** for spec writing and architectural analysis. Write a spec to `.claude/specs/<feature-slug>.md` using the pm agent spec format. Incorporate research findings into the spec — reference reusable code, confirmed selectors, and existing patterns.
4. Break the feature into ordered tasks and append them to `.claude/queue.json`.
5. Identify which agents are needed for each task (code-writer, qa, seo, perf, etc.).
5b. **Parallelisation analysis** — For every task in the breakdown, evaluate parallel potential. Reference the `parallelisation` skill. Produce a **Parallelisation Map** in the spec:
   - Independent streams (tasks that can run simultaneously) with agent, est. time, est. tokens
   - Sequential dependencies (which tasks gate others)
   - Recommendation: parallel/sequential, worktrees yes/no, agent teams yes/no
   - This map feeds into `/build` so it can spawn parallel executors
6. Flag any architectural decisions that need an ADR before work begins.
7. **Barba transition impact check** (see below).
8. **Generate acceptance tests** (see below).
9. **Verification section** — Every plan MUST include a "Verification" section listing concrete steps to confirm the implementation is correct. Prefer automated checks (run tests, run a script, use MCP tools, grep for expected output) over manual inspection.
10. Present the plan summary to the user for approval. Use `AskUserQuestion` with the following options (in this order):
    - **"Save spec, add to queue, and sync to Notion" (Recommended)** — Write the spec to `.claude/specs/<feature-slug>.md`, add tasks to `queue.json` using the `queue-tasks` skill for formatting (plain-English names, descriptive slugs, step-by-step Notion pages with embedded spec and Files section), and sync all new rows to Notion via the `notion-dashboard` skill.
    - **"Save spec only"** — Write the spec file but do not touch queue.json or Notion.
    - **"Review changes first"** — Show a summary of what will be written before saving anything.

## Barba transition impact check

If the project uses Barba.js for page transitions, answer these questions in the spec before proceeding:

1. **Init/Destroy lifecycle** — Does the feature add DOM elements, event listeners, GSAP timelines, or ScrollTrigger instances? If yes, it MUST have `init(container)` and `destroy()` methods, and orchestrator.js must call them on `barba.hooks.enter` / `barba.hooks.leave`.
2. **State survival** — Does anything need to persist across a Barba transition (video playback position, scroll offset, user selection)? If yes, define how state is stored (e.g. `RHP.videoState`) and restored after the transition.
3. **Transition interference** — Could the feature's animations or DOM mutations conflict with the leave/enter transition itself? Check for z-index stacking, opacity tweens, or elements that exist outside `[data-barba="container"]`.
4. **Re-entry correctness** — If a user navigates away and comes back (e.g. home → about → home), does the feature re-initialise cleanly? No stale listeners, no doubled DOM nodes, no missing elements.
5. **Namespace scoping** — Which Barba namespaces does this feature run on? Confirm it does NOT init on pages where it shouldn't.

Add a "Barba Impact" section to the spec with answers. If Barba is not enabled for the project, write "N/A — no Barba transitions" and move on.

## Acceptance tests

After writing the spec, generate acceptance tests for every testable behaviour.

1. Look for a **project-local override** first at `tests/templates/acceptance-test.spec.js`
   (relative to the project root). If it exists, use it — it has project-specific helpers
   (e.g. `waitForRHP`, CJS/ESM format, pre-imported axe-core). If not found, fall back to
   the **generic template** at `.claude/templates/acceptance-test.spec.js`.
   Both templates show the available test patterns (element visibility, CSS class checks,
   CMS filtering, console errors, reduced motion, barba transitions, responsive, axe-core).

2. For each testable behaviour described in the spec, write a concrete test.
   Each test must specify:
   - Which page to navigate to (using STAGING_URL from .env.test)
   - What user action to simulate (scroll, click, wait, resize viewport)
   - What to assert (element visible, class present, count changed, no errors)
   - Appropriate wait times for GSAP animations (typically 1-2s) and
     Finsweet operations (typically 0.5-1s)

3. Always include a "no console errors" test for every page the feature touches.

4. If the feature involves animation, include a "prefers-reduced-motion" test.

5. Save the generated test file to: `tests/acceptance/SLUG.spec.js`
   Replace SLUG with the feature slug used in the spec filename.

6. The test file must:
   - Import dotenv and read STAGING_URL from .env.test
   - Use test.describe with the slug name
   - Use test.beforeEach for page navigation
   - Have clear test names that describe the expected behaviour
   - Use reasonable timeouts (Webflow pages are slower than local dev)

7. Add an "Acceptance Tests" section to the bottom of the spec listing each
   test by name, so the spec is the human-readable version and the .spec.js
   file is the machine-runnable version.

8. Do NOT run the tests at this point. They will be run during `/build`.

If the project has no test infrastructure yet (no `package.json` with Playwright,
no `.env.test`), skip acceptance test generation and note it in the spec output.

## Notion push: Ready to Build (if Notion connected)
Update queue.json: set this slug's status to Ready to Build.
Push to Notion: update Status to "Ready to Build", set Last Updated.
If Notion fails, log warning and continue.

## Output
- Spec file at `.claude/specs/<feature-slug>.md`
- Acceptance test file at `tests/acceptance/<feature-slug>.spec.js` (if test infra exists)
- Updated `.claude/queue.json` with new tasks
- List of agents needed
- Any blockers or open questions
