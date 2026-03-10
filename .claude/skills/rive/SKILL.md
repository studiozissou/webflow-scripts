---
name: rive
description: Guides the agent through Rive animation integration for Webflow — state machines, scroll-driven input, text runs, and cleanup. Activates when the task involves Rive, .riv files, or state machine animations.
---

<objective>
Integrate Rive animations into Webflow projects with state machine interactivity, GSAP ScrollTrigger binding, accessibility fallbacks, and Barba.js cleanup.
</objective>

<quick_start>
CDN:
```html
<script src="https://unpkg.com/@rive-app/canvas@2"></script>
```

Basic setup:
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
</quick_start>

<common_patterns>
State machine inputs (trigger interactivity):
```js
const inputs = r.stateMachineInputs('State Machine 1');
const hoverInput = inputs.find(i => i.name === 'isHovered');
const triggerInput = inputs.find(i => i.name === 'Click');

canvas.addEventListener('mouseenter', () => { hoverInput.value = true; });
canvas.addEventListener('mouseleave', () => { hoverInput.value = false; });
canvas.addEventListener('click', () => { triggerInput.fire(); });
```

Scroll-driven state (GSAP + Rive):
```js
const progressInput = inputs.find(i => i.name === 'scrollProgress');
ScrollTrigger.create({
  trigger: section,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: ({ progress }) => {
    progressInput.value = progress * 100; // Rive expects 0-100
  },
});
```

Text runs (Rive 2024+):
```js
const textRun = r.getTextRunValue('headline');
textRun.text = 'New headline from JS';
```

Accessibility:
```html
<canvas aria-label="Animated illustration of [description]" role="img"></canvas>
```
```css
@media (prefers-reduced-motion: reduce) {
  [data-rive-canvas] { display: none; }
  [data-rive-fallback] { display: block; }
}
```

Barba cleanup:
```js
barba.hooks.leave(() => {
  RivePlayer.destroy();
});
```
</common_patterns>

<anti_patterns>
- Host `.riv` files on Webflow's asset CDN or an external CDN
- Keep file size under 500 KB for performance
- Always test on mobile — Rive WASM can be slow to initialise on low-end devices
</anti_patterns>

<success_criteria>
- Rive animation loads and responds to state machine inputs
- Canvas resizes correctly on viewport changes via ResizeObserver
- `prefers-reduced-motion` hides canvas and shows static fallback
- `RivePlayer.destroy()` called on Barba leave
- Canvas has `aria-label` and `role="img"`
</success_criteria>
