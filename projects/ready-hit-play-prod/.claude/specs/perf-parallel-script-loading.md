# perf-parallel-script-loading

## Summary

Reduce RHP uncached load time from ~15s to <5s by parallelising script loading in `init.js`. Two phases: Phase 1 (parallel `Promise.all()`) and Phase 2 (minification pipeline).

## Problem

`init.js` loads 30+ resources **strictly sequentially** via `await loadScript()` in a loop. Each request waits for the previous to finish: DNS/TLS → download → parse → execute → next. On a fast desktop connection, the waterfall alone accounts for ~10-12s of the ~15s load time.

### Current waterfall (30+ sequential requests)

```
DOMContentLoaded
  → lenis.css              (unpkg)       ~150ms
  → gsap.min.js            (webflow cdn) ~200ms
  → ScrollTrigger.min.js   (webflow cdn) ~150ms
  → ScrambleTextPlugin     (webflow cdn) ~150ms
  → Flip.min.js            (jsdelivr)    ~200ms  ← new TLS
  → barba.umd.js           (unpkg)       ~200ms  ← new TLS
  → lenis.min.js           (unpkg)       ~150ms
  → lottie_light.min.js    (jsdelivr)    ~150ms
  → SplitText.min.js       (webflow cdn) ~150ms
  → 10ms pause
  → ready-hit-play.css     (jsdelivr)    ~150ms
  → 20 modules × ~150ms each             ~3000ms
  ────────────────────────────────────────────────
  Total: ~4.5s deps + ~3s modules + overhead ≈ 10-12s waterfall
```

### Root causes

1. **Zero parallelism** — every `await` serialises the next request
2. **3 CDN origins** (webflow, unpkg, jsdelivr) — each needs TLS handshake
3. **No minification** — `.min.js` code path exists locally but no minified files are committed; jsDelivr doesn't auto-minify GitHub repos
4. **20 independent modules loaded one-by-one** — only `orchestrator.js` depends on all others

## Phase 1: Parallel Loading (Quick Wins)

### Changes to `init.js` (lines 247-284)

#### 1a. Parallel vendor dependency loading (2-wave)

GSAP plugins need `window.gsap` at parse time. Split into two waves:

```
Wave 1 (parallel): gsap.min.js + lenis.css
Wave 2 (parallel): ScrollTrigger + ScrambleText + Flip + SplitText + Barba + Lenis JS + lottie
```

**Why 2 waves, not 1:** ScrollTrigger, Flip, ScrambleText, and SplitText all auto-register with `gsap` at parse time. They need `window.gsap` to exist. Wave 1 ensures GSAP core is loaded. Wave 2 parallelises everything else.

Replace lines 247-264:
```js
// Wave 1: GSAP core + CSS (parallel — no interdependencies)
await Promise.all([
  loadScript('https://cdn.prod.website-files.com/gsap/3.14.2/gsap.min.js'),
  ...CONFIG.cssDependencies.map(css => loadStylesheet(css))
]);

// Wave 2: GSAP plugins + all other vendor deps (parallel — all need gsap on window)
await Promise.all([
  loadScript('https://cdn.prod.website-files.com/gsap/3.14.2/ScrollTrigger.min.js'),
  loadScript('https://cdn.prod.website-files.com/gsap/3.14.2/ScrambleTextPlugin.min.js'),
  loadScript('https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/Flip.min.js'),
  loadScript(CONFIG.splitTextUrl),
  loadScript('https://unpkg.com/@barba/core@2.10.3/dist/barba.umd.js'),
  loadScript('https://unpkg.com/lenis@1.3.17/dist/lenis.min.js'),
  loadScript('https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js')
]);
```

**Expected savings:** ~7 sequential requests → 2 parallel batches = **~800-1200ms saved** (5-6 round trips eliminated).

#### 1b. Parallel module loading (batch + tail)

All 20 modules are independent IIFEs that register on `window.RHP`. No module reads a sibling's registration at parse time — all cross-module calls happen inside `init()`/`destroy()` functions called later by orchestrator.

**Exception:** `orchestrator.js` must load last (it calls `bootCurrentView()` at parse time and expects all modules on `window.RHP`). `utils.js` must also load after orchestrator (or be moved before it).

Replace lines 281-284:
```js
// Load all modules in parallel EXCEPT orchestrator and utils (must be last)
const parallelModules = CONFIG.modules.filter(m => m !== 'orchestrator.js' && m !== 'utils.js');
await Promise.all(
  parallelModules.map(module => {
    var moduleFile = isDevMode ? module : module.replace('.js', '.min.js');
    return loadScript(`${baseUrl}/${moduleFile}?${versionParam}`);
  })
);

// Orchestrator depends on all modules being registered — load sequentially after
await loadScript(`${baseUrl}/${isDevMode ? 'orchestrator.js' : 'orchestrator.min.js'}?${versionParam}`);
await loadScript(`${baseUrl}/${isDevMode ? 'utils.js' : 'utils.min.js'}?${versionParam}`);
```

**Expected savings:** ~18 sequential requests → 1 parallel batch + 2 sequential = **~2400-3000ms saved**.

#### 1c. CSS parallel with Wave 1

Move project CSS into Wave 1 (it's independent of any JS):

```js
// Wave 1: GSAP core + all CSS (parallel)
await Promise.all([
  loadScript('https://cdn.prod.website-files.com/gsap/3.14.2/gsap.min.js'),
  ...CONFIG.cssDependencies.map(css => loadStylesheet(css)),
  loadStylesheet(`${baseUrl}/${isDevMode ? 'ready-hit-play.css' : 'ready-hit-play.min.css'}?${versionParam}`),
  ...(isOverlandPage ? [loadStylesheet(`${baseUrl}/overland-ai.css?${versionParam}`)] : [])
]);
```

#### 1d. Remove the 10ms setTimeout

Line 266: `await new Promise(resolve => setTimeout(resolve, 10))` was added to let GSAP plugins register. With the 2-wave approach, plugins are loaded in Wave 2 which `await`s Wave 1 — the registration gap is guaranteed. The 10ms delay is unnecessary.

### Expected total savings (Phase 1)

| Before | After | Savings |
|--------|-------|---------|
| ~30 sequential requests | 2 parallel waves + 1 parallel module batch + 2 sequential | ~4-5s |
| ~12s waterfall | ~6-7s | ~40-50% faster |

### Ordering constraints verified

| Module | Parse-time globals read | Safe to parallelise? |
|--------|------------------------|---------------------|
| `work-dial.js` | `window.gsap`, `window.ScrambleTextPlugin` (line 48) | Yes — loads after Wave 2 completes |
| `about-text-lines.js` | None at parse time | Yes |
| `cursor.js` | None at parse time | Yes |
| `orchestrator.js` | Checks `typeof RHP.cursor`, etc. | No — must load last |
| `utils.js` | `document.addEventListener('DOMContentLoaded', ...)` (bare, outside IIFE) | Yes — but keep after orchestrator for consistency |
| All other modules | `window.RHP = window.RHP || {}` only | Yes |

## Phase 2: Minification Pipeline

### 2a. Add terser build step

```bash
npm install --save-dev terser
```

Add to `package.json`:
```json
{
  "scripts": {
    "build:min": "node scripts/minify.js",
    "predeploy": "npm run build:min"
  }
}
```

Create `scripts/minify.js`:
```js
const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const modules = [
  'init.js', 'lenis-manager.js', 'cursor.js', 'work-dial.js',
  'transition-dial.js', 'about-dial-ticks.js', 'about-text-lines.js',
  'about-swipers.js', 'about-scroll-accordions.js', 'about-icon-scale.js',
  'about-accordion-scroll.js', 'home-intro.js', 'home-scroll-morph.js',
  'home-about-slide.js', 'intro-format.js', 'earth-parallax.js',
  'case-video-controls.js', 'video-loader.js', 'work-nav.js',
  'orchestrator.js', 'utils.js', 'overland-ai.js', 'ready-hit-play.css'
];

(async () => {
  for (const file of modules) {
    const src = path.join(ROOT, file);
    if (!fs.existsSync(src)) continue;
    if (file.endsWith('.css')) {
      // Simple CSS minification (remove comments, whitespace)
      const css = fs.readFileSync(src, 'utf8');
      const min = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
      fs.writeFileSync(src.replace('.css', '.min.css'), min);
    } else {
      const code = fs.readFileSync(src, 'utf8');
      const result = await minify(code, { compress: true, mangle: true });
      fs.writeFileSync(src.replace('.js', '.min.js'), result.code);
    }
    console.log(`  ✓ ${file}`);
  }
})();
```

### 2b. Commit .min.js files

jsDelivr serves from raw GitHub. Minified files **must be committed** to the repo — they cannot be gitignored.

### 2c. Update deploy workflow

Current: bump version → push → update hash in Webflow
New: bump version → `npm run build:min` → push → update hash in Webflow

### Expected savings (Phase 2, stacked on Phase 1)

| Metric | Before (raw) | After (minified) | Savings |
|--------|-------------|-------------------|---------|
| Total JS | ~350KB | ~120KB (est. 65% reduction) | ~230KB |
| Total CSS | ~25KB | ~18KB (est. 30% reduction) | ~7KB |
| Download time (fast WiFi) | ~2s | ~0.7s | ~1.3s |

**Combined Phase 1 + 2:** ~15s → ~3-4s on uncached load.

## Files affected

| File | Phase | Change |
|------|-------|--------|
| `init.js` lines 247-284 | 1 | Rewrite sequential loops to `Promise.all()` |
| `init.js` line 266 | 1 | Remove 10ms setTimeout |
| `package.json` | 2 | Add terser devDependency + build script |
| `scripts/minify.js` (new) | 2 | Minification script |
| 20+ `.min.js` files (new) | 2 | Generated minified modules |

## Barba Impact

- **Init/Destroy lifecycle:** No change — module registration pattern unchanged.
- **State survival:** No change — `RHP.videoState` untouched.
- **Transition interference:** No change — load order still guarantees orchestrator loads last.
- **Re-entry correctness:** No change — parallel loading only affects initial page load, not Barba transitions.
- **Namespace scoping:** No change.

**Verdict:** N/A — this change only affects the initial script loading waterfall, not runtime behaviour.

## Verify Loop

### Pass/fail criteria

1. **All RHP modules load successfully:** `window.RHP.scriptsOk === true` within 20s
2. **No console errors on any page:** homepage, about, case study
3. **Load time improvement:** Network waterfall in DevTools shows parallel batches, not sequential
4. **Loader dismisses correctly:** `.loader` element removed, `.rhp-scripts-loaded` on `<html>`
5. **GSAP plugins registered:** `gsap.plugins` includes ScrollTrigger, Flip, ScrambleText, SplitText
6. **Barba transitions work:** home→about, about→home, home→case, case→home — no errors
7. **work-dial canvas renders:** `#dial_ticks-canvas` present, dial interactive on home page

### Reproduction steps

1. Open `https://rhpcircle.webflow.io` in incognito (no cache)
2. Open DevTools → Network tab
3. Verify scripts load in parallel batches (not sequential waterfall)
4. Wait for loader to dismiss
5. Navigate home→about→home via nav links
6. Check console for errors

### Tier mapping

- Tier 1 (auto): `perf-parallel-script-loading.spec.js` — module presence, console errors, load timing
- Tier 2 (CDN regression): registered in `tests/registry.json`
- Tier 3 (manual): Visual check of Network waterfall in DevTools (parallel vs sequential)

### Regression scope

- Barba transitions (home↔about↔case)
- Loader dismiss timing
- work-dial video playback
- About page Swiper lazy load
- GSAP animations on all pages

## Test Plan

### Tier 1 — Auto: Playwright local
- `perf-parallel-script-loading.spec.js` — see Acceptance Tests section

### Tier 2 — Auto: CDN regression
- Same tests run against live jsDelivr URL after deploy

### Tier 3 — Manual
- **Network waterfall shape** — must show parallel request groups in DevTools (cannot be automated: requires visual inspection of waterfall chart)
- **Perceived load feel** — subjective assessment of loader duration improvement
- **Safari / Firefox** — Playwright runs Chromium only

## Acceptance Tests

See `tests/acceptance/perf-parallel-script-loading.spec.js`

1. `all RHP modules load successfully` — `window.RHP.scriptsOk === true`
2. `no JS errors on homepage` — pageerror listener collects 0 errors
3. `no JS errors on about page` — pageerror listener collects 0 errors
4. `no JS errors on case study page` — pageerror listener collects 0 errors
5. `GSAP plugins are registered` — ScrollTrigger, Flip on window
6. `Barba transition home to about` — navigate, no errors, correct namespace
7. `Barba transition about to home` — navigate, no errors, correct namespace
8. `loader dismisses on homepage` — `html.rhp-scripts-loaded` present
9. `scripts load faster than baseline` — `window.RHP.scriptsOk` resolves within 10s (soft assertion)

## Parallelisation Map

| Stream | Agent | Tasks | Est. time | Dependencies |
|--------|-------|-------|-----------|-------------|
| A: Phase 1 code | code-writer | Rewrite init.js loader | 20 min | None |
| B: Acceptance tests | qa | Write + run tests | 15 min | After A |
| C: Phase 2 build script | code-writer | Create minify.js, update package.json | 15 min | Independent of A |
| D: Phase 2 integration | code-writer | Run build, commit .min.js files | 10 min | After A + C |

**Recommendation:** A and C can run in parallel (separate files). B gates on A. D gates on A + C.
