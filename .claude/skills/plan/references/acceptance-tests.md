# Acceptance tests

Generate a test for every testable behaviour in the spec. The spec is the human-readable version; the `.spec.js` file is the machine-runnable one.

## Template

Read the project-local template at `tests/templates/acceptance-test.spec.js` (relative to the project root) first. It carries project helpers such as `waitForRHP`, the CJS/ESM format and a pre-imported axe-core. If it does not exist, use the generic template at `.claude/templates/acceptance-test.spec.js`. Both show the available patterns: element visibility, CSS class checks, CMS filtering, console errors, reduced motion, Barba transitions, responsive, axe-core.

## Each test specifies

- Which page to open (STAGING_URL from `.env.test`)
- The user action to simulate (scroll, click, wait, resize)
- The assertion (element visible, class present, count changed, no errors)
- Waits sized for GSAP (typically 1–2s) and Finsweet (0.5–1s)

## Always include

- A "no console errors" test for every page the feature touches
- A `prefers-reduced-motion` test when the feature animates

## File requirements

- Save to `tests/acceptance/<slug>.spec.js` using the spec's slug
- Import dotenv and read STAGING_URL from `.env.test`
- `test.describe` named after the slug, `test.beforeEach` for navigation
- Test names describe the expected behaviour
- Generous timeouts; Webflow pages are slower than local dev

Do not run the tests now. `/build` verifies through browser MCP and `/deploy` runs the suites after the CDN push.

## Register in `tests/registry.json`

1. Read the registry. If missing, create `{ "version": 1, "lastUpdated": "<today>", "entries": [] }`.
2. If an entry with the same `id` exists, update its `description`.
3. Otherwise append: `id` (slug), `file` (`tests/acceptance/<slug>.spec.js`), `type: "acceptance"`, `source: "plan"`, `critical: false`, `slug`, `created` (today, YYYY-MM-DD), `description` (one line).
4. Set top-level `lastUpdated` to today and write the file.

Add an "Acceptance Tests" section at the bottom of the spec listing each test by name.
