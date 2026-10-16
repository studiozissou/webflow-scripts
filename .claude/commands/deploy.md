Commit and push all changes. If the push touches a client loader, cut a tagged release for that client and swap the tag on the live Webflow site.

> **Testing responsibility:** `/deploy` is the ONLY command that runs CLI test suites (`npm test`, `npx playwright test`, `npm run test:registry`). These tests hit the live CDN URL, so they only make sense after the release is tagged and the Webflow footer points at it. `/build` and `/debug` verify via Playwright MCP only.

## 1. Commit and push

1. `git status` and `git diff` to see what changed.
2. Stage all changed files (never `.env`, credentials or secrets).
3. Commit with a concise message, push, report the commit hash.

## 2. Detect client releases

List the `projects/<client>/` folders touched by the pushed commits. A client needs a release when its `init.js` declares a `VERSION`.

- Loader without `VERSION` (e.g. carsa, released with `tools/carsa/release.js`): skip it and say so.
- No touched loader (tools, skills, tests only): skip to step 8. Same behaviour as a plain commit + push.
- Not on `main`: releases only cut from `main`, so skip to step 8 and say the release waits for the merge.

Steps 3–7 run once per client.

## 3. Bump VERSION

1. Ask via `AskUserQuestion`: **patch**, **minor** or **major**.
2. Latest tag: `git tag --list '<client>-v*' --sort=-v:refname | head -1`.
3. Bump `VERSION` in `projects/<client>/init.js` (semver `X.Y.Z`). If the current value isn't semver (e.g. a date-style cache buster), use the next patch above the latest `<client>-vX.Y.Z` tag, or `0.1.0` if there is none.
4. Commit (`release: <client> vX.Y.Z`) and push.

## 4. Preflight

```
git fetch
npm run preflight -- <client>
```

Any failure stops the release: show the failures and fix them first. Never tag around a failed preflight.

## 5. Tag

```
git tag <client>-vX.Y.Z
git push origin <client>-vX.Y.Z
```

## 6. Purge jsDelivr

For `init.js` and every module in its module lists:

```
curl -s https://purge.jsdelivr.net/gh/studiozissou/webflow-scripts@<client>-vX.Y.Z/projects/<client>/<file>
```

## 7. Swap the tag in Webflow

1. Webflow MCP `get_site` first. Show `lastUpdated` vs `lastPublished` and list the pending unpublished changes: publishing ships all of them.
2. Read the site footer code, replace the old `@<client>-v…` in the `init.js` script tag with the new tag, write it back via MCP. Change nothing else in the footer.
3. Ask before publishing. Publish only on a yes.

If the Webflow MCP isn't connected, stop and ask Will to re-authorise the Webflow MCP with the Designer tab open, then resume at 7.1. Never fall back to a manual paste.

## 8. Post-deploy tests

Ask via `AskUserQuestion`: **"Post-deploy verification?"**
1. **"Full regression" (Recommended)**: all specs in the registry + smoke + a11y
2. **"Since last deploy"**: specs created after `lastDeployed` + every critical spec
3. **"Skip all tests"**: no tests, go to step 9. Log: "Tests skipped by user"

If running tests, wait 30 s for jsDelivr, then show the regression gate from `tests/registry.json`:

```
Regression gate:
  Total specs in registry: N (~Xm estimated at 20s/spec)
  Last deploy: YYYY-MM-DD (or "never")
  New since last deploy: M specs
```

No `tests/registry.json`: run `npm test` (smoke + a11y) and skip the gate.

- **Full regression:** `npm run test:registry`
- **Since last deploy:** filter entries where `created > lastDeployed` or `critical: true`, then `npx playwright test [files] --config=tests/playwright.config.js --reporter=list`

Report pass/fail per suite and the total spec count. On failures, Will decides: fix and re-deploy, or accept.

## 9. Stamp the deploy

After verification passes (or Will accepts failures), update `tests/registry.json`: `lastDeployed` to today, `lastDeployedTag` to the tag just cut (several clients: comma-separated; no release: leave it), and remove the retired `lastDeployedHash` key if present. This is the baseline for the next "since last deploy" run.
