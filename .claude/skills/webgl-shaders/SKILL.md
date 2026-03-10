---
name: webgl-shaders
description: Guides the agent through WebGL shader development for Webflow — Three.js ShaderMaterial, common effects, GSAP uniform animation, and performance. Activates when the task involves shaders, GLSL, fragment shaders, or custom WebGL effects.
---

<objective>
Write WebGL shaders for Webflow projects using Three.js ShaderMaterial, with GSAP-driven uniform animation, common visual effects, and mobile performance considerations.
</objective>

<quick_start>
Three.js ShaderMaterial pattern:
```js
const mat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:     { value: 0 },
    uProgress: { value: 0 },
    uTexture:  { value: texture },
    uResolution: { value: new THREE.Vector2(w, h) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform float uProgress;
    uniform sampler2D uTexture;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(uTexture, vUv);
      gl_FragColor = color;
    }
  `,
  transparent: true,
});
```
</quick_start>

<common_patterns>
Noise-based distortion:
```glsl
float n = snoise(vec3(vUv * 3.0, uTime * 0.5));
vec2 distortedUv = vUv + vec2(n * 0.05 * uProgress);
vec4 color = texture2D(uTexture, distortedUv);
```

Image transition (two textures, dissolve):
```glsl
uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform float uProgress;

void main() {
  vec4 t1 = texture2D(uTexture1, vUv);
  vec4 t2 = texture2D(uTexture2, vUv);
  gl_FragColor = mix(t1, t2, uProgress);
}
```

RGB split / chromatic aberration:
```glsl
float offset = uProgress * 0.02;
float r = texture2D(uTexture, vUv + vec2(offset, 0.0)).r;
float g = texture2D(uTexture, vUv).g;
float b = texture2D(uTexture, vUv - vec2(offset, 0.0)).b;
gl_FragColor = vec4(r, g, b, 1.0);
```

Animating uniforms with GSAP:
```js
gsap.to(mat.uniforms.uProgress, {
  value: 1, duration: 1.5, ease: 'power2.inOut',
});
// In render loop:
mat.uniforms.uTime.value += 0.01;
```

Texture loading:
```js
const loader = new THREE.TextureLoader();
const texture = loader.load('/path/to/image.jpg', (tex) => {
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
});
```
</common_patterns>

<anti_patterns>
- Avoid `discard` in fragment shader on mobile — costly
- Use `mediump` precision on mobile: `precision mediump float;`
- Reduce texture resolution for mobile (`devicePixelRatio <= 1`)
- One draw call per shader — batch with `InstancedMesh` or UV atlas if needed
- Prefer Three.js ShaderMaterial over raw WebGL (easier integration, less boilerplate)
- Avoid legacy `<script type="x-shader/x-vertex">` pattern
</anti_patterns>

<success_criteria>
- Shader compiles without errors on desktop and mobile
- Uniforms animated via GSAP (not manual RAF)
- `mediump` precision used for mobile targets
- Textures use `LinearFilter` and `generateMipmaps: false` for non-power-of-two images
- Effect degrades gracefully on low-end devices
</success_criteria>
