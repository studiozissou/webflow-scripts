---
name: three-js
description: Guides the agent through Three.js 3D scene integration for Webflow — scene setup, GSAP uniform animation, performance, and cleanup. Activates when the task involves Three.js, 3D scenes, or WebGL rendering.
---

<objective>
Integrate Three.js 3D scenes into Webflow projects with proper ES module loading, GSAP uniform animation, resize handling, and Barba.js cleanup.
</objective>

<quick_start>
CDN (ES module):
```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170/examples/jsm/"
  }
}
</script>
<script type="module" src="/projects/client/three-scene.js"></script>
```

Minimal scene setup:
```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ThreeScene = (() => {
  let renderer, scene, camera, animId;

  function init(canvas) {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    const geo = new THREE.TorusKnotGeometry(0.8, 0.3, 128, 32);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    scene.add(new THREE.Mesh(geo, mat));

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 5, 5);
    scene.add(dir);

    const ro = new ResizeObserver(() => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
    ro.observe(canvas);

    tick();
    return ro;
  }

  function tick() {
    animId = requestAnimationFrame(tick);
    renderer.render(scene, camera);
  }

  function destroy() {
    cancelAnimationFrame(animId);
    renderer.dispose();
  }

  return { init, destroy };
})();
```
</quick_start>

<common_patterns>
GSAP + Three.js (animate uniforms):
```js
const uniforms = { uTime: { value: 0 }, uProgress: { value: 0 } };
gsap.to(uniforms.uProgress, { value: 1, duration: 2, ease: 'power2.inOut' });
// In tick(): uniforms.uTime.value += 0.01;
```

Webflow canvas embed:
```html
<canvas data-three-canvas style="width:100%;height:100%;display:block;"></canvas>
```

Barba cleanup:
```js
ThreeScene.destroy();
```
</common_patterns>

<anti_patterns>
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` — never exceed 2
- Use `BufferGeometry` (default in Three.js r125+) — not `Geometry`
- Dispose of geometries, materials, and textures on destroy: `geo.dispose(); mat.dispose();`
- Use `InstancedMesh` for >100 identical objects
- Avoid creating objects inside the render loop
</anti_patterns>

<success_criteria>
- Scene renders with `alpha: true` for transparent background over Webflow
- Pixel ratio capped at 2
- ResizeObserver handles viewport changes with camera aspect update
- `cancelAnimationFrame` + `renderer.dispose()` called on Barba leave
- All geometries and materials disposed on destroy
</success_criteria>
