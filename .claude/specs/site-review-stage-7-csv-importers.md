# Spec: site-review-stage-7-csv-importers

**Status:** Ready to Plan
**Project:** webflow-scripts
**Priority:** P2
**Complexity:** Simple
**Author:** Claude (Opus)
**Created:** 2026-03-11
**Depends on:** site-review-stage-6-runner-reports-cli
**Blocks:** Stage 8 (Tier 2 integration)

---

## Summary

Parse Screaming Frog and SE Ranking CSV exports into the unified Finding schema. No external CSV parsing library — use Node's built-in readline.

## Deliverables

| File | Purpose |
|------|---------|
| `tools/site-review/importers/sf-pages.js` | Screaming Frog "Internal:All" CSV parser |
| `tools/site-review/importers/sf-links.js` | Screaming Frog links CSV parser |
| `tools/site-review/importers/se-ranking.js` | SE Ranking audit CSV parser |
| `tools/site-review/importers/normalise.js` | Dedup imported vs automated findings |
| `tests/site-review/importers/sf-pages.test.js` | |
| `tests/site-review/importers/sf-links.test.js` | |
| `tests/site-review/importers/se-ranking.test.js` | |
| `tests/site-review/fixtures/sf-pages.csv` | Fixture CSV |
| `tests/site-review/fixtures/sf-links.csv` | Fixture CSV |

## Importer API

Each importer exports:

```js
/**
 * @param {string} csvPath - Path to CSV file
 * @returns {Promise<Finding[]>}
 */
export async function importSfPages(csvPath)
```

## SF Pages — Columns Mapped

Address, Status Code, Title, Title Length, Meta Description, Meta Description Length, H1, H2, Word Count, Canonical Link, Indexability

Generates findings for: 4xx/5xx pages, missing titles, thin content (< 300 words), missing H1, non-indexable pages, broken canonicals.

## SF Links — Columns Mapped

Source, Destination, Status Code, Type (internal/external)

Generates findings for: broken links, orphan pages (no inbound links), dead-end pages (no outbound links).

## normalise.js

- Merges imported findings with automated findings
- Dedup: same URL + same issue type = keep the richer description
- Adds `source: 'import'` or `source: 'automated'` to finding meta

## Test Gate

```bash
node --test tests/site-review/importers/
```

Then provide a real Screaming Frog CSV export and verify it parses correctly.

## Barba Impact

N/A — standalone CLI tool.
