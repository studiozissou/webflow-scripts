Commit all staged and unstaged changes, then push to the remote.

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
10. Ask: "Run post-deploy verification?" (Yes / Skip)
11. If yes, wait 30s for jsDelivr to index the new commit, then present the **regression gate**:

    Read `tests/registry.json` and count entries. Show:
    > **Regression gate:** N specs in registry (~Xm estimated at 20s/spec).
    > - **Full regression (Recommended)** — runs all N specs
    > - **Changed-only** — runs critical specs + specs matching changed files since last deploy

    If the project has no `tests/registry.json`, fall back to `npm test` (smoke + a11y) and skip the gate.

    **Full regression** (default):
    ```
    npm run test:registry
    ```

    **Changed-only:**
    - Identify changed JS/CSS files from `git log --name-only LAST_HASH..HEAD`
    - Match changed filenames to registry entry slugs
    - Build a file list: all matched specs + all entries with `"critical": true`
    - Run:
      ```
      npx playwright test [matched + critical files] --config=tests/playwright.config.js --reporter=list
      ```

    Report pass/fail per suite + total spec count.

12. If any test fails: report failures — user decides whether to fix and re-deploy or accept.
