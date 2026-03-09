Bootstrap a new Webflow project in this monorepo.

## Steps
1. Ask for: client name (slug), site URL, Webflow plan tier, and a one-line description.
2. Create the directory `projects/<client-slug>/`.
3. Create `projects/<client-slug>/orchestrator.js` using the standard IIFE template with Barba.js lifecycle hooks and Lenis initialisation.
4. Create `projects/<client-slug>/README.md` with: client name, site URL, stack summary, deploy instructions.
5. Scaffold test files using the templates in `tests/templates/`:
   - Copy `tests/templates/canary.spec.template.js` → `tests/acceptance/_canary-<client-slug>.spec.js`
   - Copy `tests/templates/smoke.test.template.js` → `tests/acceptance/smoke-<client-slug>.test.js`
   - Copy `tests/templates/a11y.test.template.js` → `tests/acceptance/a11y-<client-slug>.test.js`
   - Replace `__STAGING_URL_PLACEHOLDER__` with the project's Webflow staging URL
   - Replace `__CLIENT_NAME__` with the client display name
   - Add npm scripts to root `package.json`:
     - `"test:<slug>": "playwright test --config=tests/acceptance/playwright.config.js <slug>"`
     - `"test:<slug>:smoke": "playwright test --config=tests/acceptance/playwright.config.js smoke-<slug>"`
     - `"test:<slug>:a11y": "playwright test --config=tests/acceptance/playwright.config.js a11y-<slug>"`
   - Ensure `.env.test` contains the staging URL (add if not present)
6. Add an entry to `.claude/queue.json` for initial QA of the new project setup.
7. Run the canary test (`npx playwright test --config=tests/acceptance/playwright.config.js _canary-<slug>`) to verify the staging site is reachable.
8. Confirm the folder structure with the user.

## Webflow site discovery (if MCP connected)

If Webflow MCP available:
1. List authorised sites, find the one matching this project
2. Read page list and CMS collections
3. Take element snapshot of home page
4. Record in CLAUDE.md under "## Webflow": site ID, pages with IDs, CMS schemas,
   existing custom code embeds
5. Add empty "## Known selectors" placeholder to CLAUDE.md

Skip silently if not connected.

## orchestrator.js template to use
```js
// Orchestrator: <ClientName>
// Site: <URL>
// Stack: GSAP, Barba.js, Lenis

(() => {
  'use strict';

  // — Lenis smooth scroll —
  let lenis;
  function initLenis() {
    lenis = new Lenis({ lerp: 0.1 });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // — Page init — call page-specific modules here
  function initPage(namespace) {
    const ctx = gsap.context(() => {
      // page modules go here
    });
    return ctx;
  }

  // — Barba.js —
  barba.init({
    transitions: [{ name: 'default', leave() {}, enter() {} }],
    views: [{
      namespace: 'home',
      beforeEnter() {},
      afterEnter() {},
    }],
  });

  barba.hooks.before(() => { lenis?.stop(); });
  barba.hooks.after(() => {
    lenis?.start();
    ScrollTrigger.refresh();
  });

  // — Boot —
  document.addEventListener('DOMContentLoaded', () => {
    initLenis();
    initPage(document.body.dataset.barbaNamespace);
  });
})();
```
