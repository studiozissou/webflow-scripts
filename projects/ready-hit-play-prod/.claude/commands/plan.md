Plan a feature before writing any code.

## Process
1. Use the `pm-questioning` skill to ask clarifying questions. Do not skip this step.
2. Once answers are gathered, write a spec to `.claude/specs/<feature-slug>.md` using the pm agent spec format.
3. Break the feature into ordered tasks and append them to `.claude/queue.json`.
4. Identify which agents are needed for each task (code-writer, qa, seo, perf, etc.).
5. Flag any architectural decisions that need an ADR before work begins.
6. **Barba transition impact check** (see below).
7. Generate acceptance tests (see below).
8. Present the plan summary to the user for approval before proceeding.

**Always write the spec file to `.claude/specs/<feature-slug>.md` before the session ends — do not wait to be asked.**

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

1. Read the template at .claude/templates/acceptance-test.spec.js to understand
   the test patterns available (element visibility, CSS class checks, CMS filtering,
   console errors, reduced motion, barba transitions, responsive).

2. For each testable behaviour described in the spec, write a concrete test.
   Each test must specify:
   - Which page to navigate to (using STAGING_URL from .env.test)
   - What user action to simulate (scroll, click, wait, resize viewport)
   - What to assert (element visible, class present, count changed, no errors)
   - Appropriate wait times for GSAP animations (typically 1-2s) and
     Finsweet operations (typically 0.5-1s)

3. Always include a "no console errors" test for every page the feature touches.

4. If the feature involves animation, include a "prefers-reduced-motion" test.

5. Save the generated test file to: tests/acceptance/SLUG.spec.js
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

8. Do NOT run the tests at this point. They will be run during /build.

## Output
- Spec file at `.claude/specs/<feature-slug>.md`
- Acceptance test file at `tests/acceptance/<feature-slug>.spec.js`
- Updated `.claude/queue.json` with new tasks
- List of agents needed
- Any blockers or open questions
