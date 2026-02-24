# Skill: PixiJS

## CDN
```html
<script src="https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js"></script>
```

## Minimal setup (v8 async API)
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

    // Resize
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

## Filters (post-processing)
```js
import { BlurFilter, ColorMatrixFilter } from 'pixi.js';

const blur = new BlurFilter({ strength: 8 });
const cm = new ColorMatrixFilter();
cm.desaturate();

sprite.filters = [blur, cm];

// Animate with GSAP
gsap.to(blur, { strengthX: 0, strengthY: 0, duration: 1 });
```

## GSAP + PixiJS (animate stage objects)
```js
// PixiJS plugin for GSAP (optional but useful)
// https://gsap.com/docs/v3/Plugins/PixiPlugin/
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

gsap.to(sprite, {
  pixi: { x: 400, y: 300, alpha: 0.5, rotation: 180, tint: 0xff0000 },
  duration: 1, ease: 'power2.out'
});
```

## Interactive sprites
```js
sprite.interactive = true;
sprite.cursor = 'pointer';
sprite.on('pointerover', () => { gsap.to(sprite.scale, { x: 1.1, y: 1.1, duration: 0.2 }); });
sprite.on('pointerout',  () => { gsap.to(sprite.scale, { x: 1, y: 1, duration: 0.2 }); });
```

## Particle container (performance)
```js
const container = new PIXI.ParticleContainer(10000, {
  scale: true, position: true, rotation: false, alpha: true
});
app.stage.addChild(container);
```

## Barba cleanup
```js
barba.hooks.leave(() => {
  PixiScene.destroy();
});
```

## Performance tips
- Use `ParticleContainer` for 1000+ identical sprites
- Batch textures into a spritesheet (`PIXI.Assets.load('spritesheet.json')`)
- Avoid `app.ticker.add` callbacks that do heavy computation every frame
- Use `sprite.cullable = true` to skip off-screen rendering
