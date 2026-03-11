# Spec: site-review-stage-1-skeleton

**Status:** Ready to Build
**Project:** webflow-scripts
**Priority:** P1
**Complexity:** Simple
**Author:** Claude (Opus)
**Created:** 2026-03-11
**Depends on:** Nothing
**Blocks:** All subsequent site-review stages

---

## Summary

Project scaffold, Finding data model, DEBUG logger, and config with thresholds. This is the foundation everything else builds on.

## Deliverables

| File | Purpose |
|------|---------|
| `tools/site-review/config.js` | Thresholds, env var loading (dotenv), severity mappings |
| `tools/site-review/lib/finding.js` | `createFinding()` factory + `validateFinding()` |
| `tools/site-review/lib/logger.js` | DEBUG-gated logger (`--verbose` flag) |
| `tests/site-review/finding.test.js` | TDD tests for finding creation + validation |

## Finding Schema

```js
{
  id,           // `${check}-${hash}`
  check,        // 'meta-tags', 'psi', etc.
  severity,     // 'critical' | 'warning' | 'info'
  category,     // 'performance' | 'seo' | 'accessibility' | 'security' | 'code-quality'
  title,        // Short summary
  description,  // Detailed explanation
  url?,         // Page URL where issue found
  element?,     // CSS selector or element desc
  actual?,      // Problematic value
  expected?,    // What it should be
  recommendation?, // How to fix
  meta?         // Check-specific data
}
```

## Config Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| LCP | > 2.5s | > 4s |
| CLS | > 0.1 | > 0.25 |
| INP | > 200ms | > 500ms |
| Title length | < 30 or > 60 chars | Missing |
| Description | < 70 or > 160 chars | Missing |
| Redirect chain | > 1 hop | > 3 hops |
| Broken link | — | 4xx/5xx |

## Patterns to Follow

- ESM (`import`/`export`), named exports only
- `DEBUG && console.log(...)` pattern (no bare console.log)
- Follow `scripts/webflow/wf-gen.js` arg parsing pattern
- dotenv for env loading (already installed)

## Test Gate

```bash
node --test tests/site-review/finding.test.js
```

All tests pass before proceeding to Stage 2.

## Barba Impact

N/A — standalone CLI tool.
