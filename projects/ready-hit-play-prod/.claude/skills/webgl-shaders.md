# Skill: WebGL Shaders

## Approaches in this stack
1. **Three.js ShaderMaterial** — easiest integration, most control
2. **Raw WebGL** — maximum control, more boilerplate
3. **GLSL via `<script type="x-shader/x-vertex">`** — legacy pattern, avoid

## Three.js ShaderMaterial pattern
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

## Common shader effects

### Noise-based distortion
```glsl
// Classic Perlin noise (include a noise library or paste simplex noise)
float n = snoise(vec3(vUv * 3.0, uTime * 0.5));
vec2 distortedUv = vUv + vec2(n * 0.05 * uProgress);
vec4 color = texture2D(uTexture, distortedUv);
```

### Image transition (two textures, dissolve)
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

### RGB split / chromatic aberration
```glsl
float offset = uProgress * 0.02;
float r = texture2D(uTexture, vUv + vec2(offset, 0.0)).r;
float g = texture2D(uTexture, vUv).g;
float b = texture2D(uTexture, vUv - vec2(offset, 0.0)).b;
gl_FragColor = vec4(r, g, b, 1.0);
```

## Animating uniforms with GSAP
```js
gsap.to(mat.uniforms.uProgress, {
  value: 1, duration: 1.5, ease: 'power2.inOut',
  onUpdate: () => { /* uniform auto-updates */ }
});
// In render loop:
mat.uniforms.uTime.value += 0.01;
```

## Texture loading
```js
const loader = new THREE.TextureLoader();
const texture = loader.load('/path/to/image.jpg', (tex) => {
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
});
```

## Performance
- Avoid `discard` in fragment shader on mobile — costly
- Use `mediump` precision on mobile: `precision mediump float;`
- Reduce texture resolution for mobile (`devicePixelRatio <= 1`)
- One draw call per shader — batch with `InstancedMesh` or `UVs` atlas if needed
