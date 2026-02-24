Bootstrap a new Webflow project in this monorepo.

## Steps
1. Ask for: client name (slug), site URL, Webflow plan tier, and a one-line description.
2. Create the directory `projects/<client-slug>/`.
3. Create `projects/<client-slug>/orchestrator.js` using the standard IIFE template with Barba.js lifecycle hooks and Lenis initialisation.
4. Create `projects/<client-slug>/README.md` with: client name, site URL, stack summary, deploy instructions.
5. Add an entry to `.claude/queue.json` for initial QA of the new project setup.
6. Confirm the folder structure with the user.

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
