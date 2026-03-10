---
name: barba-js
description: Guides the agent through Barba.js page transition setup for Webflow — init, hooks, views, GSAP cleanup, and gotchas. Activates when the task involves page transitions, Barba, or SPA-like navigation.
---

<objective>
Set up Barba.js page transitions for Webflow sites with proper GSAP context cleanup, Lenis integration, namespace-based views, and common gotcha handling.
</objective>

<quick_start>
CDN:
```html
<script defer src="https://cdn.jsdelivr.net/npm/@barba/core"></script>
```

Required Webflow setup — add to `<body>` via Page Settings custom attributes:
```
data-barba = wrapper
```
Add to the page content wrapper div:
```
data-barba-namespace = home   (change per page)
```

Core setup:
```js
barba.init({
  debug: false,
  timeout: 5000,
  transitions: [
    {
      name: 'fade',
      to: { namespace: ['home', 'about'] },

      async leave(data) {
        await gsap.to(data.current.container, { opacity: 0, duration: 0.4 });
      },
      async enter(data) {
        gsap.from(data.next.container, { opacity: 0, duration: 0.4 });
      },
    },
  ],
});
```
</quick_start>

<common_patterns>
Global hooks (outside transitions):
```js
barba.hooks.before(() => {
  lenis?.stop();
  document.documentElement.classList.add('is-transitioning');
});

barba.hooks.after(({ next }) => {
  lenis?.start();
  ScrollTrigger.refresh();
  document.documentElement.classList.remove('is-transitioning');
  initPage(next.namespace);
});

barba.hooks.leave(({ current }) => {
  pageContextMap.get(current.namespace)?.revert();
  pageContextMap.delete(current.namespace);
});
```

Page context pattern (manage GSAP per page):
```js
const pageContextMap = new Map();

function initPage(namespace) {
  const ctx = gsap.context(() => {
    // all page animations
  });
  pageContextMap.set(namespace, ctx);
}
```

Namespace-based views:
```js
barba.init({
  views: [
    {
      namespace: 'home',
      beforeEnter({ next }) { /* runs before enter transition */ },
      afterEnter({ next }) { initHomePage(); },
      beforeLeave({ current }) { destroyHomePage(); },
    },
    {
      namespace: 'case-study',
      afterEnter({ next }) { initCaseStudy(); },
    },
  ],
});
```

Preventing transitions on specific links:
```html
<a href="/external" data-barba-prevent="self">External link</a>
<a href="/file.pdf" data-barba-prevent>PDF</a>
```
```js
barba.init({
  prevent: ({ el }) => el.classList.contains('no-transition') || el.href.includes('.pdf'),
});
```

Prefetch:
```html
<script defer src="https://cdn.jsdelivr.net/npm/@barba/prefetch"></script>
```
```js
import prefetch from '@barba/prefetch';
barba.use(prefetch);
```
</common_patterns>

<anti_patterns>
- Webflow IX2 interactions re-fire after Barba — use `Webflow.require('ix2').init()` after transitions or disable IX2 entirely
- Analytics: re-fire pageview on `barba.hooks.after` — `gtag('event', 'page_view', { page_path: next.url.path })`
- Forms: Webflow forms need re-initialisation after Barba — call `Webflow.require('commerce').init()` or handle with custom logic
- Images: lazy-loaded images in new container may not trigger — use `IntersectionObserver` or call a re-init
- Scroll position: Barba does NOT auto-scroll to top — do it manually in `after` hook: `window.scrollTo(0, 0)`
</anti_patterns>

<success_criteria>
- `data-barba="wrapper"` on body and `data-barba-namespace` on page container
- All GSAP contexts reverted on `barba.hooks.leave`
- `ScrollTrigger.refresh()` called in `barba.hooks.after`
- Lenis stopped on leave, started on after
- Analytics pageview re-fired on transition
- Scroll position reset to top on page change
</success_criteria>
