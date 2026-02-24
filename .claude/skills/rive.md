# Skill: Rive

## CDN
```html
<script src="https://unpkg.com/@rive-app/canvas@2"></script>
```

## Basic setup
```js
const RivePlayer = (() => {
  let r;

  function init(canvas) {
    r = new rive.Rive({
      src: '/animations/hero.riv',
      canvas,
      autoplay: true,
      stateMachines: 'State Machine 1',
      onLoad() {
        r.resizeDrawingSurfaceToCanvas();
      },
    });

    // Resize
    const ro = new ResizeObserver(() => r.resizeDrawingSurfaceToCanvas());
    ro.observe(canvas);

    return ro;
  }

  function destroy() {
    r?.cleanup();
    r = null;
  }

  return { init, destroy };
})();
```

## State machine inputs (trigger interactivity)
```js
const inputs = r.stateMachineInputs('State Machine 1');
const hoverInput = inputs.find(i => i.name === 'isHovered');
const triggerInput = inputs.find(i => i.name === 'Click');

// Boolean input
canvas.addEventListener('mouseenter', () => { hoverInput.value = true; });
canvas.addEventListener('mouseleave', () => { hoverInput.value = false; });

// Trigger input
canvas.addEventListener('click', () => { triggerInput.fire(); });
```

## Scroll-driven state (GSAP + Rive)
```js
const progressInput = inputs.find(i => i.name === 'scrollProgress');
ScrollTrigger.create({
  trigger: section,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: ({ progress }) => {
    progressInput.value = progress * 100; // Rive expects 0–100
  },
});
```

## Text runs (Rive 2024+)
```js
const textRun = r.getTextRunValue('headline');
textRun.text = 'New headline from JS';
```

## Accessibility
```html
<canvas aria-label="Animated illustration of [description]" role="img"></canvas>
```
Provide a static image fallback via CSS for `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  [data-rive-canvas] { display: none; }
  [data-rive-fallback] { display: block; }
}
```

## File hosting
- Host `.riv` files on Webflow's asset CDN (upload as asset) or an external CDN
- Max file size: keep under 500 KB for performance
- Always test on mobile — Rive WASM can be slow to initialise on low-end devices

## Barba cleanup
```js
barba.hooks.leave(() => {
  RivePlayer.destroy();
});
```
