# Skill: Lottie

## CDN options
```html
<!-- Full player (if using interactivity) -->
<script src="https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie.min.js"></script>

<!-- Lightweight (SVG renderer, no interactivity) -->
<script src="https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie_light.min.js"></script>
```

## Basic playback
```js
const animation = lottie.loadAnimation({
  container: document.querySelector('[data-lottie]'),
  renderer: 'svg',   // 'svg' | 'canvas' | 'html'
  loop: false,
  autoplay: false,
  path: '/animations/hero.json',
});

animation.addEventListener('DOMLoaded', () => {
  animation.play();
});
```

## Scroll-driven (GSAP scrub)
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

## Hover trigger
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

## Dynamic colour (using layers)
```js
// Change a specific layer's fill colour
const layer = animation.renderer.elements[0]; // by index
// Use lottie-colorify for programmatic colour changes, or
// modify the JSON before loading:
fetch('/animations/icon.json')
  .then(r => r.json())
  .then(data => {
    // mutate data.layers[0].shapes[0].it[1].c.k = [r, g, b, a]
    lottie.loadAnimation({ animationData: data, container, renderer: 'svg', loop: false });
  });
```

## File optimisation
- Use LottieFiles Optimiser before deploying (remove unused layers, compress)
- Prefer SVG renderer for resolution-independence
- Use Canvas renderer for complex animations with many elements (>100 layers)
- Keep file size under 200 KB

## Accessibility
```html
<div data-lottie aria-label="Loading animation" role="img" aria-live="polite"></div>
```
For `prefers-reduced-motion`:
```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  animation.goToAndStop(animation.totalFrames - 1, true); // show final frame
} else {
  animation.play();
}
```

## Destroy
```js
animation.destroy(); // removes canvas/SVG and event listeners
```

## Barba cleanup
```js
barba.hooks.leave(() => {
  animation?.destroy();
});
```
