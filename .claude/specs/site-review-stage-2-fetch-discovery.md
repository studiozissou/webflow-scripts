# Spec: site-review-stage-2-fetch-discovery

**Status:** Ready to Build
**Project:** webflow-scripts
**Priority:** P1
**Complexity:** Simple
**Author:** Claude (Opus)
**Created:** 2026-03-11
**Depends on:** site-review-stage-1-skeleton
**Blocks:** All check stages (3–5)

---

## Summary

Shared page fetcher with per-run cache and sitemap/page discovery. These are shared utilities that every check module depends on.

## Deliverables

| File | Purpose |
|------|---------|
| `tools/site-review/lib/fetch-page.js` | Fetch HTML + headers + status + redirect chain, cached per URL per run |
| `tools/site-review/lib/discovery.js` | Parse sitemap.xml for page list, fallback to `--pages` flag |
| `tests/site-review/fetch-page.test.js` | Fetch + cache behaviour tests |
| `tests/site-review/discovery.test.js` | Sitemap parsing + fallback tests |

## fetch-page.js API

```js
/**
 * @param {string} url
 * @param {Map} cache - shared per-run cache
 * @returns {Promise<{ html: string, headers: Object, statusCode: number, redirectChain: string[] }>}
 */
export async function fetchPage(url, cache)
```

- Uses Node native `fetch`
- Follows redirects, records chain
- Caches by URL — same page fetched at most once per run
- Timeout: 15s

## discovery.js API

```js
/**
 * @param {string} rootUrl - Site root (e.g. https://example.com)
 * @param {string[]} [manualPages] - Override from --pages flag
 * @returns {Promise<string[]>} - Array of full page URLs
 */
export async function discoverPages(rootUrl, manualPages)
```

- If `manualPages` provided, resolve them against `rootUrl` and return
- Otherwise fetch `${rootUrl}/sitemap.xml`, parse `<loc>` tags
- If no sitemap, return just the root URL

## Test Gate

```bash
node --test tests/site-review/fetch-page.test.js tests/site-review/discovery.test.js
```

Plus manual smoke test against a real site URL.

## Barba Impact

N/A — standalone CLI tool.
