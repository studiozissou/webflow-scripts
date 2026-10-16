---
name: client-onboarding
description: Start a new client project in this monorepo — brief, private folder, launch checklist, owner-inputs list, Webflow pre-flight, the projects/_template copy, global utilities, and Gate 0 status. Use when Will says "new client", "onboard", "kick off", "set up a project for", or starts work on a site that has no projects/<client>/ folder yet. Replaces the old /bootstrap and /dev-setup commands; --animated adds the GSAP/Barba/Lenis orchestrator.
argument-hint: <client-slug> [--animated]
---

Runs Phases 0–1 of the small-business launch playbook for a new client. This file is public: client names, IDs, contacts, prices and copy go in the private folder, never here or in the public repo.

## Step 0 — Ask first

Ask via `AskUserQuestion`, in one block:
1. **New build or takeover** of an existing Webflow site?
2. Client slug (lower-case, hyphens), display name, staging URL, live domain, Webflow plan.
3. Animated stack (GSAP/Barba/Lenis orchestrator)? Default no; `--animated` means yes.

## Step 1 — Brief and private folder

1. Create `~/webflow-internal/projects/<client>/.claude/` and run `scripts/link-internal.sh`, so `projects/<client>/.claude` links to it. Check the link exists before writing anything into it.
2. Run `/client-brief`. Its `client.md` lands in the private folder.

## Step 2 — Launch checklist

Copy the launch checklist from `~/webflow-internal/.claude/reference/small-business-launch-playbook.md` into `projects/<client>/.claude/specs/launch-checklist.md`. Cut items that don't apply (no booking, single locale, no forms) and say which you cut. If the playbook isn't there, say so and continue.

## Step 3 — Owner inputs

Write `projects/<client>/.claude/specs/owner-inputs.md`: NAP (name, address, phone), opening hours, photos, social handles, prices, font licences, booking provider and venue ID, consent tool, payments, domains and DNS access. One line each with owner and status. A missing value is written `TODO-<thing>` (e.g. `TODO-phone`), never a dummy number or example address: `launch-guard` flags `TODO-` and fake values, so nothing slips through to live.

## Step 4 — Webflow pre-flight

Webflow MCP `get_site`. If it isn't connected, stop and ask Will to re-authorise the Webflow MCP with the Designer tab open, then resume. Record site ID, page IDs and collection IDs (with field slugs) in `projects/<client>/.claude/client.md`, never in the public repo. Note `lastUpdated` vs `lastPublished` so pending changes are known before anyone publishes.

## Step 5 — Copy the template

1. Copy `projects/_template/` to `projects/<client>/` and `tests/_template/` to `tests/<client>/` (update the paths in the tests).
2. In every `.js` file: replace `CLIENT` with the upper-case namespace and `client` with the slug (case-sensitive). Grep afterwards: no `CLIENT` or `_template` left.
3. `package.json`: add `"test:<client>": "node --test 'tests/<client>/*.test.js'"` and `"<client>:launch-guard": "node tools/webflow/launch-guard.js --client <client>"`.
4. Fill `launch.config.json` (domain, locales primary first, known placeholders, fallback paths) and the `llms.txt` lines you can; leave the rest as `TODO-`.
5. No booking widget: delete `booking-widget.js`, its test and its `GLOBAL_MODULES` entry.
6. Keep `VERSION = '0.1.0'`. The first `/deploy` cuts `<client>-v0.1.0`.

## Step 6 — Global utilities

`site-utilities.js` and `smooth-scroll.js` are copies of `shared/`. Every client gets both, tested.

- **New build:** both stay in `GLOBAL_MODULES` and Lenis stays in `DEPS`. The loader tag goes into the Webflow footer at the first `/deploy`.
- **Takeover:** run `/intake` to inventory the site's existing custom code. Keep both files and their tests, but remove them and the Lenis entry from the loader. Add a "Takeover notes" section to the client README: which existing site scripts each utility would replace, and any existing smooth-scroll, Webflow interactions or scroll-jacking that Lenis could clash with. Nothing is added to the live site until Will decides.

## Step 7 — Animated option

Only with `--animated` or when Will asks. Carries over the old `/bootstrap` path.

1. Write `projects/<client>/orchestrator.js` from the template below and add it to the loader (with pinned GSAP, ScrollTrigger and Barba in `DEPS`, after Lenis). It replaces `smooth-scroll.js`: one Lenis instance only.
2. Copy the Playwright templates from `tests/templates/`:
   - `canary.spec.template.js` → `tests/acceptance/_canary-<client>.spec.js`
   - `smoke.test.template.js` → `tests/acceptance/smoke-<client>.test.js`
   - `a11y.test.template.js` → `tests/acceptance/a11y-<client>.test.js`
   - Replace `__STAGING_URL_PLACEHOLDER__` and `__CLIENT_NAME__`; add the staging URL to `.env.test`.
   - Add `test:<client>:e2e`, `test:<client>:smoke` and `test:<client>:a11y` scripts (`playwright test --config=tests/acceptance/playwright.config.js <pattern>`).
3. Ask before running the canary (`npx playwright test --config=tests/acceptance/playwright.config.js _canary-<client>`).

```js
// <ClientName> orchestrator: Lenis, GSAP contexts per page and Barba transitions.
(() => {
  'use strict';

  let lenis;
  let ctx;

  function initLenis() {
    if (lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    lenis = new Lenis({ autoRaf: true, anchors: true });
  }

  function initPage(namespace) {
    ctx = gsap.context(() => {});
    return () => ctx?.revert();
  }

  barba.init({
    transitions: [{ name: 'default', leave() {}, enter() {} }],
    views: [{ namespace: 'home', beforeEnter() {}, afterEnter() {} }],
  });

  barba.hooks.leave(() => lenis?.stop());
  barba.hooks.enter(() => lenis?.start());
  barba.hooks.after(({ next }) => {
    initPage(next.namespace);
    ScrollTrigger.refresh();
  });
  barba.hooks.beforeLeave(() => ctx?.revert());

  initLenis();
  initPage(document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace);
})();
```

## Step 8 — Gate 0 status

Finish with:
- **Gate 0:** every owner input still `TODO-`, grouped by owner, and what each blocks.
- **Done:** folders, link, template copy, npm scripts, tests run (`npm run test:<client>` must pass).
- **Next:** the next playbook step (usually `/figma-audit` for a new build, the `/intake` report for a takeover).

## Rules

- Never write to `.claude/queue.json` (deprecated).
- Never put client data in the public repo: IDs, contacts, prices and copy go in `projects/<client>/.claude/`.
- Never run Playwright without asking.
