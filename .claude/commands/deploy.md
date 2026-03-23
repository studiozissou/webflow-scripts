Commit all staged and unstaged changes, then push to the remote.

> **Testing responsibility:** `/deploy` is the ONLY command that runs CLI test suites (`npm test`, `npx playwright test`, `npm run test:registry`). These tests hit the live CDN URL, so they only make sense after the code is pushed and the jsDelivr hash is updated. `/build` and `/debug` verify via Playwright MCP only.

1. Run `git status` and `git diff` to see what changed.
2. Stage all changed files (but never `.env`, credentials, or secrets).
3. Write a concise commit message summarising the changes.
4. Commit.
5. Push to the remote (`git push`).
6. Report the commit hash.

## CDN deploy (jsDelivr commit-hash projects)

If the project uses jsDelivr with commit-hash pinning (check project CLAUDE.md for jsDelivr/CDN references):

7. Determine changes since last deploy:
   - Find the commit hash currently in use on the CDN (ask user, or check CLAUDE.md / queue.json for last deployed hash)
   - Run `git log --oneline LAST_HASH..HEAD` to list all commits since last deploy
   - Identify all changed JS/CSS files across those commits
   - List the features/fixes included in this deploy
8. Show the new commit hash and the jsDelivr URL pattern:
   `https://cdn.jsdelivr.net/gh/OWNER/REPO@NEW_HASH/path/to/init.js`
9. Tell the user: "Update the script URL in Webflow Designer head block with the new commit hash above and bump the `?v=` parameter."
10. Ask via `AskUserQuestion`: **"Post-deploy verification?"**
    1. **"Full regression" (Recommended)** — runs all specs in registry + smoke + a11y
    2. **"Since last deploy"** — runs only specs created after last deploy date + all critical specs
    3. **"Skip all tests"** — no tests, just stamp the deploy. Log: "Tests skipped by user"

    If user chooses **Skip all tests**: jump straight to step 13 (stamp deploy).

11. If running tests, wait 30s for jsDelivr to index the new commit, then show the **regression summary**:

    Read `tests/registry.json` and count entries. Read `lastDeployed` date from registry (if present). Show:
    ```
    Regression gate:
      Total specs in registry: N (~Xm estimated at 20s/spec)
      Last deploy: YYYY-MM-DD (or "never")
      New since last deploy: M specs
    ```

    If the project has no `tests/registry.json`, fall back to `npm test` (smoke + a11y) and skip the gate.

    **Full regression:**
    ```
    npm run test:registry
    ```

    **Since last deploy:**
    - Read `lastDeployed` from `tests/registry.json`
    - Filter entries where `created > lastDeployed` OR `critical: true`
    - Build a file list from the filtered entries
    - Run:
      ```
      npx playwright test [filtered files] --config=tests/playwright.config.js --reporter=list
      ```

    Report pass/fail per suite + total spec count.

12. If any test fails: report failures — user decides whether to fix and re-deploy or accept.

13. **Stamp deploy** — after successful verification (or if user accepts despite failures):
    - Update `tests/registry.json`: set `lastDeployed` to today's date, set `lastDeployedHash` to the new commit hash
    - This becomes the baseline for the next deploy's "since last deploy" filter
