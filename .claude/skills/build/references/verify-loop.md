# Verify loop

Browser MCP only. The code is not on the CDN yet, so `npx playwright test` against the staging URL would exercise the old build. CLI suites belong to `/deploy`.

Prefer Chrome DevTools MCP; fall back to Playwright MCP. The availability guard and timing table are in `.claude/skills/chrome-devtools/SKILL.md`. Read that file directly: the skill may be switched off for auto-loading, but the file is still the reference.

## Project dev-server config

The project's CLAUDE.md declares how staging can load local code. Read it for:

- **Staging URL** (also `.env.test` STAGING_URL)
- **Local dev override**: the global that redirects module loading to a local server, if the project's loader supports one (RHP: `window.__RHP_BASE`, documented in `projects/ready-hit-play-prod/CLAUDE.md`)
- **Health probe**: an expression that is true once the project's scripts have loaded (RHP: `window.RHP?.scriptsOk === true`)

Projects without an override verify against the staging URL as deployed. The DOM, console and spec criteria are still checked; note in the summary that local code was not loaded.

## Worktree server (when inside a git worktree and the project has an override)

1. Find a free port from 8080 to 8089 via `lsof -ti:<port>`. Call it `WT_PORT`.
2. Start the `/local` Python HTTPS server from the worktree root on `WT_PORT`, in the background, using the main checkout's certs (`git worktree list | head -1 | awk '{print $1}'` gives the main root).
3. `curl -k https://localhost:$WT_PORT/<project loader path>` must return 200.
4. For every page load below: `navigate_page` to the staging URL, then `evaluate_script` to set the override global to `https://localhost:WT_PORT/projects/<project>` and reload, then poll the health probe until true or 20s.
5. After the loop, pass or fail, kill the server: `lsof -ti:$WT_PORT | xargs kill`.

Not in a worktree: run `/local` normally if the project supports it, otherwise verify as deployed.

## Checks

1. `navigate_page` to the staging URL.
2. **Console**: `list_console_messages` with `types: ["error"]`, filter benign noise. Real errors fail.
3. **DOM**: `take_snapshot`; every selector the spec names exists.
4. **Desktop**: `resize_page` 1280×800, `take_screenshot`.
5. **Mobile**: `emulate` viewport 375×812, `take_screenshot`.
6. **Scroll-triggered** (when the feature animates on scroll): `evaluate_script` to scroll to the section, wait per the timing table, `take_screenshot`.
7. **Spec criteria**: walk each item in the spec's `## Verify Loop`. DOM assertions via `take_snapshot`; visual via `take_screenshot` at the stated viewport and scroll; interaction via `click`, `hover` (uid from the snapshot) or `evaluate_script`, then snapshot or screenshot; console assertions via filtered `list_console_messages`. Log `[PASS]` or `[FAIL] — what went wrong` per criterion.
8. **Smoke**: no console errors; key elements present (nav, barba container, critical modules); navigate to two or three other pages and confirm no errors after the transition; health probe true on each.
9. **Lighthouse**: `lighthouse_audit` with `categories: ["accessibility", "best-practices"]`. WARN under 90, FAIL under 70.

## On failure

Read the failure, name the cause: timing, wrong selector, or code bug. Timing: add a wait and retry. Selector: check against the snapshot. Bug: fix the code. Return to step 1. Count iterations.

After 8 failed iterations on the same check, interactive mode asks `AskUserQuestion`: "Ralph-wiggum mode — keep iterating" (recommended for timing and flake), "Skip this check and continue", "Stop and I'll investigate manually". Auto mode takes ralph-wiggum mode.

Ralph-wiggum mode: keep the fix-and-recheck cycle going with no user interaction, smallest possible fix each time, one line per iteration in the build output (`[ralph #n] what changed → pass/fail`), hard cap of 20 total iterations. At the cap stop, report the history, and mark the build blocked.

## Bridge: MCP bug to regression spec

For each bug the loop found, write a regression spec from the bridge template in `.claude/skills/playwright-webflow/SKILL.md` (read the file directly) to `tests/acceptance/<slug>-regression.spec.js`. Do not run it now; it targets the CDN and runs in `/deploy`. Skip when no bugs were found.

## No browser MCP

Present the spec's verify-loop criteria as a manual checklist, state that the verify loop was skipped and manual verification is required before `/deploy`, and do not run `npx playwright test`.

## All checks pass

Report the per-criterion summary and note that CLI suites (smoke, a11y, acceptance, registry) run during `/deploy` after the CDN push.
