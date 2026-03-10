---
name: pixi-js
description: Guides the agent through PixiJS 2D WebGL integration for Webflow — scene setup, filters, GSAP animation, interactive sprites, and cleanup. Activates when the task involves PixiJS, 2D WebGL, or sprite-based graphics.
---

<objective>
Integrate PixiJS v8 scenes into Webflow projects with proper async initialisation, GSAP animation, interactive sprites, and Barba.js cleanup.
</objective>

<quick_start>
CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js"></script>
```

Minimal setup (v8 async API):
```js
const PixiScene = (() => {
  let app;

  async function init(canvasContainer) {
    app = new PIXI.Application();
    await app.init({
      width: canvasContainer.clientWidth,
      height: canvasContainer.clientHeight,
      backgroundColor: 0x000000,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(devicePixelRatio, 2),
      autoDensity: true,
    });

    canvasContainer.appendChild(app.canvas);

    const ro = new ResizeObserver(() => {
      app.renderer.resize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    });
    ro.observe(canvasContainer);

    buildScene();
    return ro;
  }

  function buildScene() {
    const sprite = PIXI.Sprite.from('/images/asset.png');
    sprite.anchor.set(0.5);
    sprite.x = app.screen.width / 2;
    sprite.y = app.screen.height / 2;
    app.stage.addChild(sprite);

    app.ticker.add((ticker) => {
      sprite.rotation += 0.01 * ticker.deltaTime;
    });
  }

  function destroy() {
    app?.destroy(true, { children: true, texture: true });
    app = null;
  }

  return { init, destroy };
})();
```
</quick_start>

<common_patterns>
Filters (post-processing):
```js
import { BlurFilter, ColorMatrixFilter } from 'pixi.js';

const blur = new BlurFilter({ strength: 8 });
const cm = new ColorMatrixFilter();
cm.desaturate();

sprite.filters = [blur, cm];
gsap.to(blur, { strengthX: 0, strengthY: 0, duration: 1 });
```

GSAP + PixiJS (animate stage objects):
```js
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

gsap.to(sprite, {
  pixi: { x: 400, y: 300, alpha: 0.5, rotation: 180, tint: 0xff0000 },
  duration: 1, ease: 'power2.out'
});
```

Interactive sprites:
```js
sprite.interactive = true;
sprite.cursor = 'pointer';
sprite.on('pointerover', () => { gsap.to(sprite.scale, { x: 1.1, y: 1.1, duration: 0.2 }); });
sprite.on('pointerout',  () => { gsap.to(sprite.scale, { x: 1, y: 1, duration: 0.2 }); });
```

Particle container (performance):
```js
const container = new PIXI.ParticleContainer(10000, {
  scale: true, position: true, rotation: false, alpha: true
});
app.stage.addChild(container);
```

Barba cleanup:
```js
barba.hooks.leave(() => {
  PixiScene.destroy();
});
```
</common_patterns>

<anti_patterns>
- Use `ParticleContainer` for 1000+ identical sprites
- Batch textures into a spritesheet (`PIXI.Assets.load('spritesheet.json')`)
- Avoid `app.ticker.add` callbacks that do heavy computation every frame
- Use `sprite.cullable = true` to skip off-screen rendering
</anti_patterns>

<success_criteria>
- PixiJS v8 async `app.init()` used (not legacy constructor)
- ResizeObserver handles viewport changes
- `PixiScene.destroy(true, { children: true, texture: true })` called on Barba leave
- No ticker callbacks running after destroy
- Interactive sprites use `pointer` events (not mouse events)
</success_criteria>
