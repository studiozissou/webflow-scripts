---
name: lottie
description: Guides the agent through Lottie animation integration for Webflow — playback, scroll-driven scrub, hover triggers, and cleanup. Activates when the task involves Lottie, JSON animations, or After Effects exports.
---

<objective>
Integrate Lottie animations into Webflow projects with proper playback control, GSAP ScrollTrigger scrubbing, accessibility, and Barba.js cleanup.
</objective>

<quick_start>
CDN options:
```html
<!-- Full player (if using interactivity) -->
<script src="https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie.min.js"></script>

<!-- Lightweight (SVG renderer, no interactivity) -->
<script src="https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie_light.min.js"></script>
```

Basic playback:
```js
const animation = lottie.loadAnimation({
  container: document.querySelector('[data-lottie]'),
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: '/animations/hero.json',
});

animation.addEventListener('DOMLoaded', () => {
  animation.play();
});
```
</quick_start>

<common_patterns>
Scroll-driven (GSAP scrub):
```js
animation.addEventListener('DOMLoaded', () => {
  const totalFrames = animation.totalFrames;

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: ({ progress }) => {
      animation.goToAndStop(progress * totalFrames, true);
    },
  });
});
```

Hover trigger:
```js
el.addEventListener('mouseenter', () => {
  animation.setDirection(1);
  animation.play();
});
el.addEventListener('mouseleave', () => {
  animation.setDirection(-1);
  animation.play();
});
```

Dynamic colour (modify JSON before loading):
```js
fetch('/animations/icon.json')
  .then(r => r.json())
  .then(data => {
    // mutate data.layers[0].shapes[0].it[1].c.k = [r, g, b, a]
    lottie.loadAnimation({ animationData: data, container, renderer: 'svg', loop: false });
  });
```

Accessibility:
```html
<div data-lottie aria-label="Loading animation" role="img" aria-live="polite"></div>
```
```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  animation.goToAndStop(animation.totalFrames - 1, true);
} else {
  animation.play();
}
```

Barba cleanup:
```js
barba.hooks.leave(() => {
  animation?.destroy();
});
```
</common_patterns>

<anti_patterns>
- Use LottieFiles Optimiser before deploying (remove unused layers, compress)
- Prefer SVG renderer for resolution-independence
- Use Canvas renderer only for complex animations with many elements (>100 layers)
- Keep file size under 200 KB
</anti_patterns>

<success_criteria>
- Animation loads and plays on the correct trigger (scroll, hover, or page load)
- `prefers-reduced-motion` shows final frame instead of animating
- `animation.destroy()` called on Barba leave
- File size under 200 KB after optimisation
- Container has `aria-label` and `role="img"` for accessibility
</success_criteria>
