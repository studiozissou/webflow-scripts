Plan a feature before writing any code.

## Model split
- **Opus max-effort** for clarifying questions (step 2), spec writing + task breakdown + parallelisation map (steps 3–7), and Barba impact check
- **Sonnet** for research agents (step 1), approach exploration agents (step 2.5), acceptance test generation (step 8 — MUST run, see below), and Notion pushes

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
- **Agent 4 — Live DOM verification (if Playwright MCP connected):** Use the `playwright-webflow` skill's MCP availability guard to navigate to the staging URL, then `browser_snapshot` to capture the live rendered DOM. Compare against Webflow MCP findings to identify: dynamically injected elements, CMS-rendered items, JS-modified classes/attributes, and any discrepancies between Designer DOM and live DOM. If Playwright MCP is not connected, skip this agent. Staging URL resolution: `.env.test` STAGING_URL → project CLAUDE.md staging URL → skip.

Summarize findings in a **Research Summary** block before proceeding. Include:
- Reusable code found (file paths + function names)
- Existing patterns to follow
- Constraints discovered (from ADRs, specs, or CLAUDE.md)
- Selectors confirmed via Webflow MCP (Designer DOM)
- Live DOM structure confirmed via Playwright MCP (rendered DOM) — note any discrepancies with Designer DOM

### 2. Clarifying questions

Use the `pm-questioning` skill to ask clarifying questions. Do not skip this step.
**Include research findings in the question context** — reference specific files, patterns, and constraints found by the research agents so the user can make informed decisions.

### 2.5. Approach exploration (3 parallel agents)

Before writing the spec, explore 3 competing architectural approaches in parallel.

1. **Formulate 3 approaches** — based on research findings and user answers, define 3 distinct approaches to the feature. Each should be a genuinely different path (e.g. "GSAP timeline" vs "CSS-only" vs "Rive state machine"), not variations of the same idea.

2. **Spawn 3 parallel Explore subagents** (`subagent_type: "Explore"`, `model: "sonnet"`) — one per approach. Each agent receives:
   - The feature description
   - The research summary from Step 1
   - The user's answers from Step 2
   - ONE specific approach to explore
   - Instructions to assess: feasibility, files affected, reusable code, complexity (Low/Medium/High), risks, and a confidence score (0–100)
   - **Read-only** — agents must not modify files

   Subagent prompt template:
   ```
   You are exploring ONE architectural approach for a feature. Read-only — do not modify files.

   ## Feature
   {feature description}

   ## Research Context
   {research summary from Step 1}

   ## User Requirements
   {answers from Step 2}

   ## Your Approach
   {specific approach name and description}

   ## Your Task
   1. Search the codebase for patterns that support or conflict with this approach
   2. Identify all files that would need changes
   3. Find reusable code (functions, patterns, modules) that could be adapted
   4. Assess complexity: Low (1-2 files, <100 LOC) / Medium (3-5 files, 100-300 LOC) / High (6+ files or 300+ LOC)
   5. List risks and gotchas specific to this approach
   6. Rate your confidence (0–100) that this approach is the best path

   ## Return Format
   - **Approach:** {name}
   - **Confidence:** {0-100}
   - **Complexity:** {Low/Medium/High}
   - **Files affected:** {list with line ranges}
   - **Reusable code:** {file:function or "none"}
   - **Risks:** {list}
   - **Rationale:** {2-3 sentences on why this score}
   ```

3. **Synthesize** — merge the 3 reports into a comparison table:

   | Approach | Confidence | Complexity | Key Risk | Reusable Code |
   |----------|-----------|------------|----------|---------------|
   | A: ...   | 85        | Medium     | ...      | file.js:fn()  |
   | B: ...   | 70        | Low        | ...      | utils.js:fn() |
   | C: ...   | 60        | High       | ...      | none          |

4. **Present to user** — show the table with your recommendation and reasoning. Use `AskUserQuestion` with the 3 approaches as options (recommended first). Include a 4th option: "Hybrid — combine elements from multiple approaches".

5. **Proceed** with the chosen approach into spec writing (Steps 3–7 below).

### 3–7. Spec writing and task breakdown

3. Once the approach is chosen, use **Opus max-effort** for spec writing and architectural analysis. Write a spec to `.claude/specs/<feature-slug>.md` using the pm agent spec format. Incorporate research findings into the spec — reference reusable code, confirmed selectors, and existing patterns.
4. Break the feature into ordered tasks and append them to `.claude/queue.json`.
5. Identify which agents are needed for each task (code-writer, qa, seo, perf, etc.).
5b. **Parallelisation analysis** — For every task in the breakdown, evaluate parallel potential. Reference the `parallelisation` skill. Produce a **Parallelisation Map** in the spec:
   - Independent streams (tasks that can run simultaneously) with agent, est. time, est. tokens
   - Sequential dependencies (which tasks gate others)
   - Recommendation: parallel/sequential, worktrees yes/no, agent teams yes/no
   - This map feeds into `/build` so it can spawn parallel executors
6. Flag any architectural decisions that need an ADR before work begins.
7. **Barba transition impact check** (see below).

### 8. Generate acceptance tests (MANDATORY)

**This step is NOT optional.** Generate acceptance tests immediately after writing the spec.

Before generating, check for test infrastructure:
- Look for `.env.test` in the project root
- Look for `package.json` with Playwright in devDependencies

**If test infra exists → generate tests. If not → note in spec and skip.**

For RHP (`ready-hit-play-prod`): test infra IS present (`.env.test`, Playwright, axe-core).

Follow the detailed instructions in the **Acceptance tests** section below. Save the test file to `tests/acceptance/SLUG.spec.js`. Add an "Acceptance Tests" section to the spec with two lists:

### Test Plan (3 tiers)

Every plan MUST produce a test plan with all 3 tiers. `/build`, `/debug`, and `/deploy` consume this format.

#### Tier 1 — Auto: Playwright local (runs during `/build` and `/debug` verify loop)
- Tests in `tests/acceptance/SLUG.spec.js` — things Playwright can verify locally
- DOM presence, console errors, CSS states, scroll triggers, Barba navigation
- MCP ad-hoc checks (browser snapshots, screenshots, interaction replay)
- No deploy needed — runs against localhost or staging URL

#### Tier 2 — Auto: CDN regression (runs during `/deploy`)
- The acceptance tests from Tier 1 get registered in `tests/registry.json` — this builds cumulative regression coverage
- On `/deploy`, the user chooses: run ALL registry tests, or only tests created since last deploy
- These run after commit → push → CDN hash update (live jsDelivr URL)

#### Tier 3 — Manual (presented as checklist after `/build` and `/debug`)
- Things that can't be automated and WHY:
  - Interactions requiring real user input (drag, multi-touch, audio playback)
  - Cross-browser (Safari, Firefox) — Playwright only runs Chromium
  - Mobile device-specific (iOS video autoplay, Safari scroll bounce)
  - Visual polish (animation timing feel, easing curves, subjective quality)
- If nothing is manual, note "No manual tests needed"

### 9–10. Verification and approval

9. **Verify loop (MANDATORY)** — Every spec MUST include a "## Verify Loop" section that `/build` and `/debug` will consume directly. This is NOT optional — if the spec lacks a verify loop, `/build` will halt and flag it.

   The verify loop section must contain:

   a. **Pass/fail criteria** — concrete, observable conditions (not vague "it should work"):
      - DOM state assertions (element visible, class present, attribute value)
      - Console state (no errors, specific log output)
      - Visual state (scroll position, animation end state, responsive layout)

   b. **Reproduction steps** — exact sequence to trigger the feature:
      - Page URL
      - User actions (scroll to X, click Y, resize to Z)
      - Wait conditions (animation duration, network load)

   c. **Tier mapping** — which checks are automated vs manual:
      - Reference Tier 1 acceptance tests by name (from step 8)
      - Reference Tier 2 registry entry
      - List Tier 3 manual checks with reasons why they can't be automated

   d. **Regression scope** — what existing behaviour must NOT break:
      - Barba transitions (if applicable)
      - Other modules on the same page
      - Cross-page state (video handoff, scroll position, etc.)

   **Self-check before proceeding:** Re-read the verify loop section you wrote. If it doesn't answer "how does `/build` know this feature is working?", rewrite it.

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

Generate acceptance tests for every testable behaviour in the spec.
The infra check happens in step 8 above — by the time you reach this section, you've confirmed infra exists.

1. Read the **project-local template** at `tests/templates/acceptance-test.spec.js`
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

### 8b. Register in regression database

After generating the acceptance test, register it in the project's test registry:

1. Read `tests/registry.json` in the project root
   - If the file doesn't exist, create it with `{ "version": 1, "lastUpdated": "TODAY", "entries": [] }`
2. If an entry with matching `id` already exists → update its `description` field
3. If new → append an entry with:
   - `id`: the feature slug
   - `file`: `tests/acceptance/SLUG.spec.js` (relative to project root)
   - `type`: `"acceptance"`, `source`: `"plan"`, `critical`: `false`
   - `slug`: the feature slug
   - `created`: today's date (YYYY-MM-DD)
   - `description`: one-line summary of what the test covers
4. Update the top-level `lastUpdated` to today's date
5. Write `tests/registry.json`

## Notion push: Ready to Build (if Notion connected)
Update queue.json: set this slug's status to Ready to Build.
Push to Notion: update Status to "Ready to Build", set Last Updated.
If Notion fails, log warning and continue.

## Output
- Spec file at `.claude/specs/<feature-slug>.md`
- Acceptance test file at `tests/acceptance/<feature-slug>.spec.js` (if test infra exists)
- Updated `tests/registry.json` with the new test entry
- Updated `.claude/queue.json` with new tasks
- List of agents needed
- Any blockers or open questions
