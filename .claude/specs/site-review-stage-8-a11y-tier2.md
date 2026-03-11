# Spec: site-review-stage-8-a11y-tier2

**Status:** Ready to Plan
**Project:** webflow-scripts
**Priority:** P2
**Complexity:** Simple
**Author:** Claude (Opus)
**Created:** 2026-03-11
**Depends on:** site-review-stage-7-csv-importers
**Blocks:** Nothing — Tier 2 is complete after this stage

---

## Summary

Accessibility deep-dive check using axe-core (already installed), plus wiring importers into the runner for `--tier 2` flow.

## Deliverables

| File | Purpose |
|------|---------|
| `tools/site-review/checks/accessibility.js` | axe-core via Playwright — contrast, forms, ARIA, focus, headings |
| `tests/site-review/checks/accessibility.test.js` | |
| Update `runner.js` | Load importers when `--tier 2` + CSV flags present |
| Update `index.js` | Add `--sf-pages`, `--sf-links`, `--se-ranking` CLI flags |

## accessibility.js

Uses `@axe-core/playwright` (already installed as devDep). Checks per page:

- Contrast ratio failures → warning/critical (based on WCAG level)
- Missing form labels → warning
- Keyboard navigation issues → warning
- Invalid ARIA attributes → warning
- Missing focus states → info
- Heading hierarchy (skip levels, missing H1) → warning

Maps axe-core violation severity to finding severity:
- `critical` / `serious` → critical
- `moderate` → warning
- `minor` → info

## Tier 2 Runner Flow

```
--tier 2 --sf-pages ./pages.csv --sf-links ./links.csv
    |
    ├── Run all Tier 1 checks (automated)
    ├── Run accessibility check (Playwright + axe-core)
    ├── Import SF pages CSV → Finding[]
    ├── Import SF links CSV → Finding[]
    ├── Import SE Ranking CSV → Finding[] (if provided)
    └── normalise.js merges + dedups all findings
```

## CLI Flags (added)

```
--sf-pages <csv>      Screaming Frog pages CSV
--sf-links <csv>      Screaming Frog links CSV
--se-ranking <csv>    SE Ranking audit CSV
```

## Test Gate

```bash
# Full suite
node --test tests/site-review/

# Integration test
node tools/site-review/index.js --url https://example.com --tier 2 --sf-pages ./export.csv
```

Verify: Tier 2 report contains automated findings + imported findings + accessibility findings, all merged and deduped.

**Tier 2 is complete after this stage.**

## Barba Impact

N/A — standalone CLI tool.
