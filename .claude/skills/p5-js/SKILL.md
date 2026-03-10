---
name: p5-js
description: Guides the agent through p5.js creative coding integration for Webflow — instance mode, scroll binding, WebGL, and cleanup. Activates when the task involves p5.js, generative art, or creative coding sketches.
---

<objective>
Integrate p5.js sketches into Webflow projects using instance mode to avoid global namespace pollution, with GSAP scroll binding, accessibility, and Barba.js cleanup.
</objective>

<quick_start>
CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/p5@1/lib/p5.min.js"></script>
```

Instance mode (always use this):
```js
const P5Sketch = (() => {
  let p5instance;

  function init(container) {
    p5instance = new p5((p) => {
      let particles = [];

      p.setup = () => {
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.parent(container);
        p.colorMode(p.HSB, 360, 100, 100, 1);

        for (let i = 0; i < 80; i++) {
          particles.push({ x: p.random(p.width), y: p.random(p.height), vx: p.random(-1, 1), vy: p.random(-1, 1) });
        }
      };

      p.draw = () => {
        p.clear();
        particles.forEach(pt => {
          pt.x += pt.vx;
          pt.y += pt.vy;
          if (pt.x < 0 || pt.x > p.width) pt.vx *= -1;
          if (pt.y < 0 || pt.y > p.height) pt.vy *= -1;
          p.fill(200, 80, 100, 0.8);
          p.noStroke();
          p.circle(pt.x, pt.y, 6);
        });
      };

      p.windowResized = () => {
        p.resizeCanvas(container.clientWidth, container.clientHeight);
      };
    });
  }

  function destroy() {
    p5instance?.remove();
    p5instance = null;
  }

  return { init, destroy };
})();
```
</quick_start>

<common_patterns>
Mouse interaction:
```js
p.mouseMoved = () => {
  // p.mouseX, p.mouseY are available
};
p.mousePressed = () => {};
```

GSAP + p5 (drive sketch from scroll):
```js
let sketchProgress = 0;

ScrollTrigger.create({
  trigger: section,
  start: 'top bottom',
  end: 'bottom top',
  onUpdate: ({ progress }) => { sketchProgress = progress; },
});

// In p.draw(): use sketchProgress to control animation state
```

Shader/WebGL mode:
```js
p.setup = () => {
  p.createCanvas(w, h, p.WEBGL);
  p.noStroke();
};
p.draw = () => {
  p.background(0);
  p.rotateY(p.frameCount * 0.01);
  p.box(100);
};
```

Barba cleanup:
```js
barba.hooks.leave(() => {
  P5Sketch.destroy();
});
```
</common_patterns>

<anti_patterns>
- Never use global mode — always use instance mode to avoid namespace pollution
- `p.noLoop()` + `p.redraw()` for static or event-driven sketches (no 60fps loop needed)
- Use `p.pixelDensity(1)` on mobile to reduce rendering load
- Prefer `p.clear()` over `p.background()` for transparent canvas over Webflow elements
- Add `aria-label` and `role="img"` to the container — p5 canvas is not accessible by default
</anti_patterns>

<success_criteria>
- Sketch uses instance mode (no global p5 functions)
- `prefers-reduced-motion` stops the draw loop with `p.noLoop()`
- `P5Sketch.destroy()` called on Barba leave
- Canvas container has `aria-label` and `role="img"`
- No 60fps loop running when sketch is static or off-screen
</success_criteria>
