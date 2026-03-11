# Spec: site-review-stage-6-runner-reports-cli

**Status:** Ready to Build
**Project:** webflow-scripts
**Priority:** P1
**Complexity:** Complex
**Author:** Claude (Opus)
**Created:** 2026-03-11
**Depends on:** Stages 3, 4, 5 (all checks)
**Blocks:** Nothing — Tier 1 is complete after this stage

---

## Summary

Wire everything together: runner orchestrates checks in parallel, report generators output JSON + markdown, CLI entry point handles args. After this stage, Tier 1 (€150 health check) is fully functional.

## Deliverables

| File | Purpose |
|------|---------|
| `tools/site-review/lib/runner.js` | Dynamic check loader, parallel executor, result collector |
| `tools/site-review/lib/report/json-report.js` | Findings → structured JSON report |
| `tools/site-review/lib/report/markdown-report.js` | Findings → client-readable markdown |
| `tools/site-review/index.js` | CLI entry point |
| `tests/site-review/runner.test.js` | |
| `tests/site-review/report/json-report.test.js` | |
| `tests/site-review/report/markdown-report.test.js` | |
| Update `package.json` | Add `"site-review"` npm script |

## runner.js API

```js
/**
 * @param {Object} options
 * @param {string} options.url - Root URL
 * @param {string[]} options.pages - Page URLs
 * @param {number} options.tier - 1 or 2
 * @param {number} options.concurrency - Max parallel checks (default 5)
 * @param {string[]} options.skip - Check names to skip
 * @param {Object} options.config
 * @returns {Promise<{ findings: Finding[], summary: Object, timing: Object }>}
 */
export async function runChecks(options)
```

- Auto-discovers `checks/*.js` via glob
- Filters by `meta.tier <= options.tier`
- Skips checks in `options.skip`
- Runs `meta.parallel === true` checks concurrently (up to concurrency limit)
- Validates all findings via `validateFinding()`
- Returns summary stats: total, by severity, by category

## Report Output

**JSON** (`report.json`):
```json
{
  "meta": { "url", "tier", "generatedAt", "pagesAudited", "checksRun", "duration" },
  "summary": { "total", "critical", "warning", "info", "byCategory": { ... } },
  "findings": [ ...Finding[] ]
}
```

**Markdown** (`report.md`):
```
# Site Review: example.com
Date | Tier | Pages audited

## Summary (severity table)
## Critical Issues (grouped)
## Warnings (grouped)
## Informational (grouped)
## Scores (Lighthouse table per page)
```

Output directory: `tools/site-review/reports/<domain>-<date>/`

## CLI (index.js)

```bash
node tools/site-review/index.js --url https://example.com --tier 1
```

Flags: `--url`, `--tier`, `--pages`, `--concurrency`, `--skip`, `--verbose`, `--output`

Follows `wf-gen.js` parseArgs pattern.

## Test Gate

```bash
# Unit tests
node --test tests/site-review/

# Integration test (real site)
node tools/site-review/index.js --url https://studiozissou.webflow.io --tier 1
```

Verify: `reports/` contains `report.json` + `report.md` with correct structure, findings are grouped and sorted, summary stats are accurate.

**Tier 1 is complete after this stage.**

## Barba Impact

N/A — standalone CLI tool.
