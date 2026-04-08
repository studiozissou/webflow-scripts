# feat-work-nav-prev-next — Work page prev/next navigation

**Project:** ready-hit-play-prod
**Type:** feature
**Priority:** P1
**Status:** Ready to Build
**Created:** 2026-04-08
**Slug:** `feat-work-nav-prev-next`

## Summary

Wire the two already-published links on every `/work/<slug>` case page —
`a[data-button="work-previous"]` and `a[data-button="work-next"]` — so that
clicking them navigates to the previous / next case study in the CMS collection,
cyclically. First → last and last → first wrap around. Clicks are handled by
Barba's built-in link interception (same-origin anchor → `case` transition);
the module only needs to populate the `href` attributes.

## Background

- The user has added two buttons in Webflow, inside `.case-close_grid`, both
  currently pointing at `href="#"`. Published and verified live.
- A hidden CMS list `.dial_cms-list .w-dyn-item` is rendered on every case page
  (6 items as of 2026-04-08). The same list is already consumed by
  `work-dial.js` on the home page — each item exposes `data-url` (slug) and
  `data-title` (name).
- Case study URLs use `/work/<slug>` (confirmed on live site; the legacy
  `/case-studies/` path 404s — see `feat-rename-case-studies-to-work` marked
  Done in `queue.json`).
- RHP uses Barba; case pages are the `case` Barba namespace (aliased to `work`
  via `RHP.views.work = RHP.views.case` at `orchestrator.js:1173`).

## Research findings

### Live DOM (verified via Chrome DevTools MCP on `/work/overland-ai`, `/work/remote`, `/work/stoke-space`)

**Buttons**
- Selectors: `a[data-button="work-previous"]`, `a[data-button="work-next"]`
- Parent: `.case-close_grid`
- Classes: `button is-link is-icon w-inline-block`
- Current `href` value: `#` (placeholder, awaiting JS)

**CMS list**
- Selector: `.dial_cms-list .w-dyn-item`
- Item count: 6 (consistent across tested pages)
- Per-item attributes:
  - `data-url` → slug, e.g. `"overland-ai"`, `"remote"`, `"stoke-space"`
  - `data-title` → display name (not used by this feature, but present)

**Current-page signal (ranked)**
1. `[data-wf-item-slug]` attribute on a container element — most reliable
2. `location.pathname` last segment (`/work/<slug>` → `<slug>`) — fallback

### Codebase precedents

- `work-dial.js` already iterates `.dial_cms-item` and reads `data-url` /
  `data-title` — same CMS, same attribute conventions.
- `earth-parallax.js` is the canonical minimal case-scoped module template
  (IIFE, `init(container)` / `destroy()` / `version`, `active` flag).
- `orchestrator.js:1020-1171` defines `RHP.views.case` which already calls
  `RHP.earthParallax?.init?.(container)` and `RHP.caseVideoControls?.init?.(container)`
  inside `init`, and mirrors destroys. This is the insertion point.
- `init.js:68-82` lists all modules in load order. New modules are loaded
  before `orchestrator.js` so orchestrator can reference them.

### Constraints from CLAUDE.md

- "Every module: IIFE, registers on `window.RHP`, exposes `version` string and
  `init(container)` / `destroy()`" (project CLAUDE.md)
- "No `console.log` in committed code — use `DEBUG && console.log(...)` pattern"
  (monorepo CLAUDE.md)
- Barba impact check is mandatory for every feature

## Approach

**Approach A — Init-time wire, one shot** (confidence 92%, Low complexity)

New module `projects/ready-hit-play-prod/work-nav.js` that:
1. Registers `window.RHP.workNav = { init, destroy, version }`.
2. On `init(container)`:
   - Query `.dial_cms-list .w-dyn-item` (prefer `container.querySelectorAll`,
     fall back to `document.querySelectorAll` since the CMS list location may
     vary across Webflow template edits).
   - Resolve current slug:
     - First: `document.querySelector('[data-wf-item-slug]')?.getAttribute('data-wf-item-slug')`
     - Fallback: `location.pathname` last non-empty segment
   - Build an ordered array of slugs from `items.map(i => i.getAttribute('data-url'))`.
   - Find `currentIndex = slugs.indexOf(currentSlug)`; if `-1`, default to `0`
     and log a `DEBUG && console.warn(...)`.
   - Compute `prevIndex = (currentIndex - 1 + slugs.length) % slugs.length`
     and `nextIndex = (currentIndex + 1) % slugs.length`.
   - Find prev/next buttons inside the container:
     `container.querySelector('a[data-button="work-previous"]')`
     and `container.querySelector('a[data-button="work-next"]')`.
   - Set each button's `href` to `/work/${slugs[prevIndex|nextIndex]}`.
   - If either button is missing, bail silently (not every case page may have
     them yet during rollout).
   - If `slugs.length < 2`, bail silently — nothing to navigate between.
3. On `destroy()`:
   - Reset `href="#"` on both buttons (best-effort — orchestrator swaps the
     Barba container anyway, but this keeps destroy explicit and symmetric).
   - Clear `active` flag.
4. Integration:
   - `orchestrator.js` `RHP.views.case.init(container)` adds
     `RHP.workNav?.init?.(container);` after `initCaseTitleEntrance(container);`
     (line ~1160).
   - `RHP.views.case.destroy()` adds `RHP.workNav?.destroy?.();` alongside
     the other destroys (line ~1167).
5. `init.js`:
   - Append `'work-nav.js'` to `CONFIG.modules` before `'orchestrator.js'`
     (position alongside `case-video-controls.js` / `video-loader.js`).
   - Add a health check entry in the `expected` list near line 232.
   - Add a version row in the console table near line 253.
6. Click handling: **none**. Same-origin `<a href>` is intercepted by Barba
   automatically — the `case → case` transition runs the existing leave/enter
   hooks which already call `RHP.views.case.destroy()` / `init()`, so prev/next
   wiring re-runs on every hop.

### Why not approach B / C

- **B (self-registering event listener)** — works, but scatters case-scoped
  logic outside `RHP.views.case`. Less visible in orchestrator.
- **C (inline helper in orchestrator.js)** — violates "every module = IIFE +
  version + init/destroy" project rule, bloats an already 2284-line file, and
  contradicts the user's explicit request for a new module file.

## Files affected

| File | Change | Approx lines |
|---|---|---|
| `projects/ready-hit-play-prod/work-nav.js` | NEW — IIFE module, `RHP.workNav = { init, destroy, version }` | ~90 LOC |
| `projects/ready-hit-play-prod/orchestrator.js` | 2 lines: call `RHP.workNav?.init?.(container)` in `views.case.init` (line ~1160), call `RHP.workNav?.destroy?.()` in `views.case.destroy` (line ~1167) | +2 |
| `projects/ready-hit-play-prod/init.js` | Add `'work-nav.js'` to `CONFIG.modules` (line ~78), add health check entry (line ~232), add version row (line ~253) | +3 |
| `projects/ready-hit-play-prod/tests/acceptance/feat-work-nav-prev-next.spec.js` | NEW — acceptance test | — |
| `projects/ready-hit-play-prod/tests/registry.json` | New registry entry | +1 entry |

## Module skeleton

```js
(() => {
  const VERSION = '2026.4.8.1';
  const DEBUG = false;
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  RHP.workNav = (() => {
    let active = false;
    let prevBtn = null;
    let nextBtn = null;

    function _resolveCurrentSlug() {
      const attr = document
        .querySelector('[data-wf-item-slug]')
        ?.getAttribute('data-wf-item-slug');
      if (attr) return attr;
      const parts = location.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }

    function init(container) {
      if (active) return;
      const root = container || document;

      // CMS list may be outside the Barba container — fall back to document
      let items = Array.from(root.querySelectorAll('.dial_cms-list .w-dyn-item'));
      if (!items.length) {
        items = Array.from(document.querySelectorAll('.dial_cms-list .w-dyn-item'));
      }
      if (items.length < 2) return;

      prevBtn = root.querySelector('a[data-button="work-previous"]')
        || document.querySelector('a[data-button="work-previous"]');
      nextBtn = root.querySelector('a[data-button="work-next"]')
        || document.querySelector('a[data-button="work-next"]');
      if (!prevBtn && !nextBtn) return;

      const slugs = items.map(i => i.getAttribute('data-url')).filter(Boolean);
      if (slugs.length < 2) return;

      const current = _resolveCurrentSlug();
      let currentIndex = slugs.indexOf(current);
      if (currentIndex === -1) {
        DEBUG && console.warn('[work-nav] current slug not in CMS list:', current);
        currentIndex = 0;
      }

      const prevIndex = (currentIndex - 1 + slugs.length) % slugs.length;
      const nextIndex = (currentIndex + 1) % slugs.length;

      if (prevBtn) prevBtn.setAttribute('href', `/work/${slugs[prevIndex]}`);
      if (nextBtn) nextBtn.setAttribute('href', `/work/${slugs[nextIndex]}`);

      active = true;
    }

    function destroy() {
      if (!active) return;
      if (prevBtn) prevBtn.setAttribute('href', '#');
      if (nextBtn) nextBtn.setAttribute('href', '#');
      prevBtn = null;
      nextBtn = null;
      active = false;
    }

    return { version: VERSION, init, destroy };
  })();
})();
```

## Barba Impact

1. **Init/Destroy lifecycle** — The feature only mutates `href` attributes on
   two existing DOM nodes; it adds no event listeners, timelines, or
   observers. `init(container)` is called from `RHP.views.case.init`; `destroy()`
   is called from `RHP.views.case.destroy`, matching the existing pattern for
   `earth-parallax` and `case-video-controls`.

2. **State survival** — Nothing to survive. Each case page re-computes prev/next
   from the CMS list on enter. No cross-transition state.

3. **Transition interference** — No animations, no z-index, no opacity tweens.
   The `<a>` tags live inside the Barba container so they are torn down and
   rebuilt on every swap — the module re-wires their hrefs on every enter.

4. **Re-entry correctness** — `init` resets `active` and re-queries from scratch.
   Idempotent against re-entry. `destroy` nulls the button references and
   resets hrefs to `#`.

5. **Namespace scoping** — Only `case` (and its `work` alias). The module is
   invoked exclusively from `RHP.views.case.init/destroy`, so it never runs
   on `home`, `about`, or `contact`. Home already reads the same CMS list via
   `work-dial.js` — no conflict.

6. **Case → case transitions** — When the user clicks the wired prev/next link,
   Barba's default anchor interception runs `leave` (calls
   `RHP.views.case.destroy`) → swaps container → `enter` (calls
   `RHP.views.case.init`), which re-invokes `RHP.workNav.init(container)` with
   the new container and the new current slug. Hrefs update naturally.

## Verify Loop

### Pass/fail criteria

1. **Hrefs populated** — On any `/work/<slug>` page (after RHP scripts
   initialise), `document.querySelector('a[data-button="work-previous"]').href`
   ends with `/work/<prev-slug>` and `...work-next` ends with `/work/<next-slug>`.
   Neither equals `#`.
2. **Cyclic wrapping** — When visiting the **first** item in the CMS list,
   `previous` points at the **last** item. When visiting the **last** item,
   `next` points at the **first** item.
3. **Navigation works** — Clicking the prev/next link triggers a Barba case→case
   transition and lands on the expected URL. No console errors.
4. **Clean re-entry** — After `home → case → home → case` (or `case A → case B
   → case A`), hrefs are still correct on the second visit; no duplicate event
   listeners; `window.RHP.workNav.version` is a string.
5. **Home page not affected** — Home page has no prev/next buttons in this form;
   module bails silently. No console errors on home.
6. **No console errors** on any tested page.

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/work/overland-ai`.
2. Wait for `window.RHP.scriptsOk === true`.
3. Inspect both buttons' `href` attributes via DevTools or `evaluate_script`.
4. Click `[data-button="work-next"]` — confirm URL changes and new page loads
   via Barba (no full reload).
5. From the new page, click `[data-button="work-previous"]` — confirm return
   to previous case.
6. Navigate to the first case (index 0) and the last case (index 5) — confirm
   wrap-around on `previous` / `next` respectively.
7. Navigate `home → case → home` — no console errors, dial still works.

### Tier mapping

- **Tier 1 (Auto, Playwright local)** — all 6 acceptance tests listed below.
  Covered by `tests/acceptance/feat-work-nav-prev-next.spec.js`.
- **Tier 2 (Auto, CDN regression)** — registered in `tests/registry.json`;
  runs on `/deploy`.
- **Tier 3 (Manual)** —
  - Visual: prev/next buttons visually distinguishable, SVG icon orientation
    correct (CSS-only, not JS — not tested by Playwright).
  - Safari / Firefox: confirm Barba interception fires on anchor click (the
    smoke test runs Chromium only).

### Regression scope

- **Barba transitions** — case→case transitions must still fire Barba hooks
  correctly; `earth-parallax` and `case-video-controls` must still init/destroy.
- **Home page work-dial** — still reads the same `.dial_cms-list` items; prev/next
  logic must not mutate the CMS list (read-only).
- **Scroll position** — case→case re-init must not leave scroll in a stale
  position (already handled by `orchestrator.js:1139` `dialFg.scrollTop = 0`).
- **Existing case tests** — `feat-case-title-entrance`, `rhp-case-transition-polish`,
  `perf-fg-video-preload-on-transition`, `case-video-progress-autohide` must
  still pass.

**Self-check**: This verify loop answers "how does `/build` know this feature
is working?" — yes. Concrete selector-based assertions, explicit repro steps,
regression scope flagged.

## Test Plan (3 tiers)

### Tier 1 — Auto: Playwright local

File: `tests/acceptance/feat-work-nav-prev-next.spec.js`

1. `populates hrefs on initial case page load`
2. `wraps previous → last on first case page`
3. `wraps next → first on last case page`
4. `navigates case → case via next button (Barba transition)`
5. `clean re-entry after home → case → home → case`
6. `no console errors on case page load`

### Tier 2 — Auto: CDN regression

Registered in `tests/registry.json` with `id: feat-work-nav-prev-next`,
`source: plan`, `critical: false`. Included in cumulative regression runs
triggered by `/deploy`.

### Tier 3 — Manual

- **Safari desktop + iOS Safari** — confirm Barba case→case transition fires
  and page lands without a full reload. Playwright only covers Chromium.
- **Visual check** — prev button points "backwards", next button points
  "forwards"; icon orientation and text labels correct.

## Parallelisation Map

| Task | Depends on | Parallel? | Agent | Notes |
|---|---|---|---|---|
| Create `work-nav.js` module | — | parallelisable with orchestrator edit (different files) | code-writer | IIFE skeleton + logic |
| Edit `orchestrator.js` (2 lines in `views.case.init/destroy`) | — | parallelisable with module creation | code-writer | Trivial |
| Edit `init.js` (3 additions: modules list + health check + version row) | — | parallelisable | code-writer | Trivial |
| Run acceptance tests | all three edits + deploy | sequential (gate) | qa | Playwright |

**Recommendation:** Single code-writer pass — this is <100 LOC across 3 files
and parallelising a <5-minute change is overhead for no win. No worktrees, no
agent teams. Sequential build → deploy → acceptance tests.

## Agents needed

- **code-writer** — write `work-nav.js`, edit `orchestrator.js` and `init.js`
- **qa** — run acceptance tests after deploy

## ADR requirement

None. This follows established patterns (case-scoped module, IIFE, views.case
lifecycle hook). No architectural decisions introduced.

## Open questions / blockers

- **URL format assumed `/work/<slug>`** — confirmed via live DOM research.
  If Webflow adds a trailing slash or locale prefix in the future, update the
  href template in one place.
- **`[data-wf-item-slug]` availability** — verified present on case pages
  today; fallback to `location.pathname` last segment handles absence.

## Deployment

1. Create `work-nav.js`, edit `orchestrator.js`, edit `init.js`.
2. Bump `CONFIG.version` in `init.js` (e.g. `2026.4.8.2`).
3. Commit + push.
4. Update jsDelivr commit hash + bump `?v=` in Webflow head block.
5. Run `npm run test:acceptance -- feat-work-nav-prev-next` against staging.
6. Mark Done in queue.json.

## Acceptance Tests

See `tests/acceptance/feat-work-nav-prev-next.spec.js`. Tests:

1. **Elements & hrefs** — buttons exist on `/work/overland-ai` and both have
   hrefs that start with `/work/` and are not `#`.
2. **Cyclic wrap (previous)** — on the first CMS item's page, `work-previous`
   points at the last CMS item.
3. **Cyclic wrap (next)** — on the last CMS item's page, `work-next` points
   at the first CMS item.
4. **Barba navigation** — clicking `work-next` navigates via Barba to the next
   case; `window.RHP.scriptsOk` remains true; no full reload (assert URL change
   without losing `window.RHP.workNav.version` identity).
5. **Barba re-entry** — after `home → work/overland-ai → home → work/overland-ai`,
   hrefs are still correct.
6. **Console errors** — no page errors during any of the above.
