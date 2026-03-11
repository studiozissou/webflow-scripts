# Spec: site-review-stage-3-html-checks

**Status:** Ready to Build
**Project:** webflow-scripts
**Priority:** P1
**Complexity:** Simple
**Author:** Claude (Opus)
**Created:** 2026-03-11
**Depends on:** site-review-stage-2-fetch-discovery
**Blocks:** Stage 6 (runner + reports)

---

## Summary

First 3 checks — all pure HTML parsers. Validates the check module contract before building more complex checks.

## Deliverables

| File | Purpose |
|------|---------|
| `tools/site-review/checks/meta-tags.js` | Title, description, OG, canonical validation |
| `tools/site-review/checks/image-alt.js` | Missing alt text detection |
| `tools/site-review/checks/security-headers.js` | HSTS, CSP, X-Frame-Options, etc. |
| `tests/site-review/checks/meta-tags.test.js` | |
| `tests/site-review/checks/image-alt.test.js` | |
| `tests/site-review/checks/security-headers.test.js` | |
| `tests/site-review/fixtures/sample-page.html` | Shared HTML fixture with known issues |

## Check Module Contract

Every check exports:

```js
export async function check({ url, pages, config, log, fetchPage }) → Finding[]
export const meta = { name, label, category, tier: 1, parallel: true }
```

## meta-tags.js

Checks per page:
- Missing `<title>` → critical
- Title too short (< 30) or too long (> 60) → warning
- Duplicate titles across pages → warning
- Missing `<meta name="description">` → critical
- Description too short (< 70) or too long (> 160) → warning
- Duplicate descriptions → warning
- Missing `<link rel="canonical">` → warning
- Missing OG tags (og:title, og:description, og:image) → info

## image-alt.js

Checks per page:
- `<img>` with no `alt` attribute → warning
- `<img>` with empty `alt=""` on non-decorative images → info
- `<img>` missing `width`/`height` (CLS contributor) → info

## security-headers.js

Checks root URL response headers:
- Missing `Strict-Transport-Security` → warning
- Missing `Content-Security-Policy` → warning
- Missing `X-Content-Type-Options` → warning
- Missing `X-Frame-Options` → info
- Missing `Referrer-Policy` → info
- Missing `Permissions-Policy` → info

## Test Gate

```bash
node --test tests/site-review/checks/
```

All 3 check tests pass using fixture HTML.

## Barba Impact

N/A — standalone CLI tool.
