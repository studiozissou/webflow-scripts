# Skill: Barba.js

## CDN
```html
<script defer src="https://cdn.jsdelivr.net/npm/@barba/core"></script>
```

## Required Webflow setup
Add to `<body>` via Page Settings custom attributes:
```
data-barba = wrapper
```
Add to the page content wrapper div:
```
data-barba-namespace = home   (change per page)
```

## Core setup
```js
barba.init({
  debug: false,
  timeout: 5000,
  transitions: [
    {
      name: 'fade',
      // Match by namespace:
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

## Global hooks (put these outside transitions)
```js
barba.hooks.before(() => {
  lenis?.stop();
  document.documentElement.classList.add('is-transitioning');
});

barba.hooks.after(({ next }) => {
  lenis?.start();
  ScrollTrigger.refresh();
  document.documentElement.classList.remove('is-transitioning');
  // Re-init page modules for the new namespace
  initPage(next.namespace);
});

barba.hooks.leave(({ current }) => {
  // Kill GSAP context for the leaving page
  pageContextMap.get(current.namespace)?.revert();
  pageContextMap.delete(current.namespace);
});
```

## Page context pattern (manage GSAP per page)
```js
const pageContextMap = new Map();

function initPage(namespace) {
  const ctx = gsap.context(() => {
    // all page animations
  });
  pageContextMap.set(namespace, ctx);
}
```

## Namespace-based views
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

## Preventing transitions on specific links
```html
<!-- Barba ignores links with data-barba-prevent -->
<a href="/external" data-barba-prevent="self">External link</a>
<a href="/file.pdf" data-barba-prevent>PDF</a>
```

Or programmatically:
```js
barba.init({
  prevent: ({ el }) => el.classList.contains('no-transition') || el.href.includes('.pdf'),
});
```

## Prefetch
```html
<script defer src="https://cdn.jsdelivr.net/npm/@barba/prefetch"></script>
```
```js
import prefetch from '@barba/prefetch';
barba.use(prefetch);
```

## Common gotchas
- Webflow IX2 interactions re-fire after Barba — use `Webflow.require('ix2').init()` after transitions or disable IX2 entirely
- Analytics: re-fire pageview on `barba.hooks.after` — `gtag('event', 'page_view', { page_path: next.url.path })`
- Forms: Webflow forms need re-initialisation after Barba — call `Webflow.require('commerce').init()` or handle with custom logic
- Images: lazy-loaded images in new container may not trigger — use `IntersectionObserver` or call a re-init
- Scroll position: Barba does NOT auto-scroll to top — do it manually in `after` hook: `window.scrollTo(0, 0)`
