# Hand-off report template

Fill this in at step 7 and save it as `projects/<client>/.claude/cf-page/<slug>/report.md`, next to the screenshots. Keep the headings and their order; the user reads the same layout every time. Write "n/a" rather than deleting a row.

Pass rules, from the run's targets: elements at or below the target (default 70% of the original, or `--target-elements <n>`), max depth not higher, CF ratio at least 90%, each Lighthouse score not lower, and the screenshot comparison lists only intended differences.

```markdown
# Client First rebuild: <client> /<slug>

Run <YYYY-MM-DD> · duplicate `/<slug>-cf` (page <DUPLICATE_PAGE_ID>) · original page <ORIGINAL_PAGE_ID> · slot <webflow|webflow-2> · result **PASS | FAIL**

## Metrics

| Metric | Original | Duplicate | Target | Pass |
|---|---|---|---|---|
| Elements | <n> | <n> | ≤ <target> | yes/no |
| Max depth | <n> | <n> | ≤ <original> | yes/no |
| Distinct classes | <n> | <n> | report only | |
| CF ratio | <n>% | <n>% | ≥ 90% | yes/no |
| Lighthouse performance, 375 | <n> | <n> | ≥ original | yes/no |
| Lighthouse performance, 1440 | <n> | <n> | ≥ original | yes/no |
| Lighthouse accessibility, 375 | <n> | <n> | ≥ original | yes/no |
| Lighthouse accessibility, 1440 | <n> | <n> | ≥ original | yes/no |

Element and class numbers come from `page-metrics.js` on `tree-before.json` and `tree-final.json`.

## Screenshots

- Original, 375: `projects/<client>/.claude/cf-page/<slug>/original-375.png`
- Original, 1440: `projects/<client>/.claude/cf-page/<slug>/original-1440.png`
- Duplicate, 375: `projects/<client>/.claude/cf-page/<slug>/duplicate-375.png`
- Duplicate, 1440: `projects/<client>/.claude/cf-page/<slug>/duplicate-1440.png`

Differences seen, each marked intended or not:

- <section>: <difference> (intended | not intended)

## Sections

| # | Legacy section | Action | New section | Elements before → after |
|---|---|---|---|---|
| <n> | <legacy classes> | keep / rebuild / drop | `section_<name>` | <n> → <n> |

## Dropped sections

- <legacy classes>: <why> (hidden | duplicate of section <n>)

## Lost on rebuild

- Interactions (IX2) on: <sections, or "none exposed by the element tree">
- Native widgets replaced: <slider or tabs, and what replaced them>
- Other: <link settings, embeds, attributes not carried>

## Manual steps, in this order

1. Review `/<slug>-cf` on staging (https://<staging>/<slug>-cf) at 375 and 1440.
2. Rename slugs in Page settings: the original `/<slug>` → `/<slug>-old`, then the duplicate `/<slug>-cf` → `/<slug>`.
3. Move SEO title, meta description, Open Graph and schema to the new page if they were not carried: <list what is missing, or "all carried">.
4. Publish to the custom domains.
5. Delete `/<slug>-old` after one publish cycle.
6. Run Style Manager > Clean up to remove the unused legacy classes.

## Sign-off

Reviewed by ______ on ______ · staging checked at 375 and 1440 · slug swap done ______ · custom-domain publish ______
```
