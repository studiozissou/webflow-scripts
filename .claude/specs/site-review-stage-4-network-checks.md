# Spec: site-review-stage-4-network-checks

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

4 checks that involve network requests: broken links, redirect chains, mixed content, and PageSpeed Insights API.

## Deliverables

| File | Purpose |
|------|---------|
| `tools/site-review/checks/broken-links.js` | HTTP HEAD link checker |
| `tools/site-review/checks/redirect-chains.js` | Follow redirects, report chains |
| `tools/site-review/checks/mixed-content.js` | HTTP resources on HTTPS pages |
| `tools/site-review/checks/psi.js` | PageSpeed Insights API (CWV + Lighthouse) |
| `tests/site-review/checks/broken-links.test.js` | |
| `tests/site-review/checks/redirect-chains.test.js` | |
| `tests/site-review/checks/mixed-content.test.js` | |
| `tests/site-review/checks/psi.test.js` | Mocked API response |
| `tests/site-review/fixtures/psi-response.json` | Fixture PSI API response |

## broken-links.js

- Parse all `<a href>`, `<img src>`, `<link href>`, `<script src>` from HTML
- Group internal vs external
- HTTP HEAD with concurrency limit (10 parallel), 10s timeout
- 404 → critical, 5xx → warning, timeout → info

## redirect-chains.js

- For each internal URL, follow redirects (max 10 hops)
- Chain > 1 hop → warning, > 3 hops → critical
- Redirect loop → critical

## mixed-content.js

- If site is HTTPS, scan for `http://` in `src`, `href`, `action` attributes
- Each occurrence → warning

## psi.js

- Call `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` for mobile + desktop
- Extract CWV from `loadingExperience.metrics` (LCP, CLS, INP)
- Extract Lighthouse category scores (performance, accessibility, best practices, SEO)
- Extract mobile-specific audits (tap targets, font size, viewport)
- Apply thresholds from config.js
- Requires `GOOGLE_PSI_API_KEY` env var

## Test Gate

```bash
node --test tests/site-review/checks/
```

All check tests pass. PSI test uses mocked API fixture. After tests pass, manual verification: provide your PSI API key, run psi.js against one real URL, confirm scores match manual PageSpeed check.

## Barba Impact

N/A — standalone CLI tool.
