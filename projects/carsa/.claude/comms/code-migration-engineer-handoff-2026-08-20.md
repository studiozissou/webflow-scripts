# Carsa Webflow scripts — engineer handoff note

**For:** Carsa engineering (maintainers of `focalstrategy/carsa-website-support`)
**From:** Will Morley
**Date:** 2026-08-20
**Status:** Draft — send once Phase 1 (loader) is live

## What this is

All of the custom JavaScript that used to live inline in Webflow page settings is moving into plain `.js` files under `projects/carsa/` in `github.com/studiozissou/webflow-scripts` (public). Webflow loads exactly one script tag, in the site footer:

```html
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@{SHA}/projects/carsa/init.js"></script>
```

`init.js` reads its own `src`, derives the base URL, and loads `global.js` plus the module for the current route (`/vehicles/*` → `vdp.js`, `/used-cars` → `srp.js`, and so on). Pages that render CMS fields keep a tiny inline config block (`window.__CARSA_VDP = {...}`) in Webflow because `{{wf ...}}` tokens only resolve inline; the module reads that global.

## Why it's on our repo, not yours

jsDelivr only serves public GitHub repos; `carsa-website-support` is private. Serving from `studiozissou/webflow-scripts` works today with no dependency on your pipeline. The files are written to be portable from the start: dependency-free classic scripts, no build step, no bundler, no hard-coded host or SHA anywhere in the code (the loader derives its base URL from its own `src`), and a flat folder that is the deployable unit as-is. Moving hosts is a copy plus one URL change in Webflow.

## Taking it over (optional)

You already ship `carousel-embed` from `d1kcoelx4vkza6.cloudfront.net` via the SST `StaticSite` construct. The scripts can ride the same pattern:

1. Copy `projects/carsa/*.js` into `apps/webflow-scripts/` (or similar) in your repo.
2. Add a `WebflowScriptsStack` mirroring `stacks/CarouselStack.ts`: `path: "apps/webflow-scripts"`, no build command, `dist` = the folder itself.
3. Cache policy: either content-hash the folder name per deploy (`/v/{git-sha}/init.js`) and keep `immutable`, or serve from a fixed path with `REVALIDATE` like `bundle.js` does. Pinned + immutable is what we use on jsDelivr and is what the acceptance tests assert; if you choose revalidate, tell me and I'll relax that test.
4. Change the one footer tag in Webflow to the new URL and publish. Nothing else in Webflow changes.
5. Keep `init.js` deriving its base URL from `document.currentScript.src` — it already does — so modules follow wherever the loader is hosted.

## Contract we'll both keep

- **Footer, not head.** Webflow injects jQuery, `webflow.js` and GSAP at the end of `<body>` before footer custom code. The modules call `$` and `gsap` directly, so the loader must stay in the footer.
- **Classic scripts, no `type="module"`**, until the refactor phase is explicitly done.
- **Config blocks stay in Webflow** and are the only inline JS allowed on a migrated page.
- **No edits to inline embeds on migrated pages.** Changes go through a PR; the acceptance suite in `tests/acceptance/carsa-code-migration.spec.js` runs against staging and live before and after each publish.
- **Pin, never track a branch.** Every Webflow publish references a SHA (or your equivalent immutable path).

## Files

| File | Purpose |
|---|---|
| `projects/carsa/init.js` | Loader, route map, dependency gate |
| `projects/carsa/global.js` | 8 former site-footer scripts |
| `projects/carsa/{page}.js` | One module per page type |
| `projects/carsa/.claude/rollback/` | Original inline code per page, dated |
| `tests/acceptance/carsa-code-migration.spec.js` | Acceptance tests |
| `projects/carsa/.claude/specs/carsa-code-migration.md` | Full plan |

Questions: will@teamzissou.io
