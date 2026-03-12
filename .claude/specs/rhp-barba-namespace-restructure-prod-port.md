# Spec: Port Barba namespace restructure to production modules

**Client**: ready-hit-play
**Status**: Planning
**Created**: 2026-03-12
**Slug**: `rhp-barba-namespace-restructure-prod-port`

## Problem

The Barba namespace restructure (dial persists outside swap zone, morph in `leave()`) was implemented in `global.js` (dev workspace) but the live site loads from `ready-hit-play-prod/` modules via `init.js`. The prod orchestrator still has the old architecture where the dial is inside the Barba container, gets destroyed/recreated on each navigation, and morph animations run in `afterEnter` (post-swap).

## Goal

Port the restructured Barba architecture from `global.js` to `ready-hit-play-prod/orchestrator.js` so the live site uses persistent dial elements with seamless home ↔ case transitions.

## Scope

**In scope:**
- Home → case transition (dial expand, circle → rectangle)
- Case → home transition (dial shrink, rectangle → circle)
- Direct-land on home (normal dial boot)
- Direct-land on case/work (expanded dial, Lenis scroll)
- CSS namespace rules (`data-dial-ns`)
- New CSS file for prod (`ready-hit-play.css` loaded via `init.js`)

**Out of scope:**
- Home intro sequence (keep existing `introMode` + `homeIntro.run()` as-is)
- About-transition-persist (keep existing `runHomeToAboutTransition` / `runAboutToHomeTransition` as-is)
- The 6 transition bugs in `global.js` (separate task — but known fixes will be incorporated)
- The 3 about-page bugs (separate task)
- About/contact view changes (keep existing `makeScrollPage()` + prod about view)

---

## Architecture: What changes

### Prod orchestrator.js — before (current)

```
Barba container = main-wrapper (wraps everything including dial)
→ home-to-case: dial destroyed, DOM swapped, dial morph in afterEnter (post-swap)
→ case-to-home: runCaseDialShrinkAnimation in leave, then dial recreated in afterEnter
→ Dial elements lost on every navigation
→ Video reloads on transition
```

### Prod orchestrator.js — after (target)

```
Barba container = inside dial_layer-fg (only page content swaps)
→ home-to-case: workDial destroyed, runDialExpandAnimation in leave (pre-swap), case view init in afterEnter
→ case-to-home: case view destroyed, runDialShrinkAnimation in leave (pre-swap), home view init in afterEnter
→ Dial elements (ticks, video, fg layer) persist
→ Video plays continuously
→ data-dial-ns attribute controls CSS visibility
```

### Key structural change

The Webflow HTML must be restructured (manual, in Designer) so that:
- `dial_component` sits outside the Barba swap zone
- `[data-barba="container"]` is inside `dial_layer-fg`
- Both home and work pages have identical outer shells
- `data-dial-ns="home"` on home page, `data-dial-ns="work"` on work page

**This HTML change is a prerequisite.** It was already done for dev — needs to be replicated in the Webflow staging site that prod points to.

---

## Implementation tasks

### Task 1: Add CSS file to prod (new file + init.js update)

**File**: `ready-hit-play-prod/ready-hit-play.css` (new)
**File**: `ready-hit-play-prod/init.js` (edit)

Copy `ready-hit-play/ready-hit-play.css` to `ready-hit-play-prod/ready-hit-play.css`.

Update `init.js` to load it:
```js
cssDependencies: [
  'https://unpkg.com/lenis@1.3.17/dist/lenis.css'
  // ready-hit-play.css loaded as a module CSS (see below)
],
```

Add to the module loading section (after cssDependencies, before JS modules):
```js
// Project CSS (loaded after lenis.css, before JS modules)
await loadStylesheet(`${baseUrl}/ready-hit-play.css?${versionParam}`);
```

### Task 2: Add dial morph helpers to orchestrator.js

**File**: `ready-hit-play-prod/orchestrator.js` (edit)

Add these functions after the existing `_getCSSVar` / `_parseSize` helpers:

1. `getDialVars()` — reads CSS custom properties for dial dimensions
2. `runDialExpandAnimation()` — async circle→rectangle morph (0.8s)
3. `runDialShrinkAnimation()` — async rectangle→circle morph (0.8s)
4. `setDialToWorkState()` — immediate set for direct-land on work
5. `setDialToHomeState()` — immediate set for direct-land / after transition

**Source**: Copy from `global.js` lines 736–940. These are standalone IIFE-scoped functions with no external dependencies beyond `window.gsap` and DOM queries.

Incorporate known bug fixes from the transition-bugs spec:
- Fix 2: Pin `dial_video-wrap` dimensions before `data-dial-ns` change in `runDialExpandAnimation`
- Fix 4: Defensive `clearProps: 'overflow'` in afterEnter
- Fix 6: Explicit `zIndex: 3` restoration after `clearProps: 'all'`

### Task 3: Rewrite `home-to-case` and `case-to-home` transitions

**File**: `ready-hit-play-prod/orchestrator.js` (edit)

Replace the current `rhp-core` default transition (which handles home→case) and `case-to-home` named transition with:

**New `home-to-case` named transition:**
```js
{
  name: 'home-to-case',
  from: { namespace: ['home'] },
  to: { namespace: ['case'] },
  async leave(data) {
    const ns = data.current?.namespace || currentNs;
    // Capture video handoff before destroying dial
    if (ns === 'home' && RHP.videoState && RHP.workDial) {
      const fgVideo = document.querySelector('.dial_fg-video');
      const idx = RHP.workDial.getActiveIndex();
      if (fgVideo && typeof idx === 'number') {
        RHP.videoState.caseHandoff = {
          index: idx,
          currentTime: fgVideo.currentTime || 0,
          transitionDuration: 0.6
        };
      }
    }
    if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
    await runDialExpandAnimation();
  },
  enter() { window.scrollTo(0, 0); },
  afterEnter(data) { runAfterEnter(data); }
}
```

**Updated `case-to-home` transition:**
```js
{
  name: 'case-to-home',
  from: { namespace: ['case'] },
  to: { namespace: ['home'] },
  beforeLeave(data) {
    // Capture video handoff (existing logic preserved)
    ...
    if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
  },
  async leave(data) {
    await runDialShrinkAnimation();
  },
  enter() { window.scrollTo(0, 0); },
  afterEnter(data) { runAfterEnter(data); }
}
```

**Keep existing `rhp-core` as fallback** for any route not covered by named transitions.

### Task 4: Update `runAfterEnter` for namespace restructure

**File**: `ready-hit-play-prod/orchestrator.js` (edit)

The current `runAfterEnter` has complex dial morph logic in the `if (dialFg && window.gsap)` block (lines 882–952). This needs to be simplified since morph now happens in `leave()`:

**For `ns === 'case'` (after home→case):**
- No morph animation needed (already ran in leave)
- Unlock scroll
- Clear overflow on `dial_layer-fg` (defensive)
- Init case view
- Re-assert `gsap.set(dialUI, { opacity: 0 })` after `_reinitWebflow()` (Fix 3)
- Preserve Overland AI page-specific loading
- Preserve video handoff seek logic

**For `ns === 'home'` (after case→home):**
- No morph animation needed (already ran in leave)
- `setDialToHomeState()` defensively
- Lock scroll, stop Lenis
- Init home view
- Restore `zIndex: 3` on `dial_layer-fg` (Fix 6)
- Preserve `homeIntro.skip()` for non-fresh navigations

**For about transitions:**
- Keep existing about-transition-persist logic unchanged

### Task 5: Update `RHP.views.case` for persistent scroll wrapper

**File**: `ready-hit-play-prod/orchestrator.js` (edit)

The current prod case view queries `data-case-scroll-wrapper` inside the Barba container. With the restructure, `dial_layer-fg` IS the scroll wrapper and persists outside the container.

Update to match dev global.js pattern:
```js
RHP.views.case = {
  init(_container) {
    RHP.scroll.unlock();
    const dialFg = document.querySelector('.dial_layer-fg');
    const content = dialFg?.querySelector('[data-case-scroll-content]')
      || dialFg?.querySelector('.case-studies_wrapper');
    if (dialFg) dialFg.scrollTop = 0;
    if (dialFg && content) {
      RHP.lenis?.stop();
      RHP.lenis?.start({ wrapper: dialFg, content });
      requestAnimationFrame(() => RHP.lenis?.resize());
    } else {
      RHP.lenis?.start();
      requestAnimationFrame(() => RHP.lenis?.resize());
    }
  },
  destroy() { RHP.lenis?.stop(); }
};
```

Note: Remove `setupScrollTriggerProxy` call from `runAfterEnter` for case view — it used the old container-scoped wrapper which no longer applies.

### Task 6: Update `bootCurrentView` for direct-land

**File**: `ready-hit-play-prod/orchestrator.js` (edit)

Add `data-dial-ns` awareness:

```js
function bootCurrentView() {
  const container = document.querySelector('[data-barba="container"]');
  const ns = container?.getAttribute('data-barba-namespace');
  const dialComp = document.querySelector('.dial_component');
  const dialNs = dialComp?.getAttribute('data-dial-ns') || '';

  if (dialNs === 'work' || ns === 'case') {
    setDialToWorkState();
    RHP.scroll.unlock();
    RHP.views.case?.init?.(container);
  } else if (ns === 'home') {
    setDialToHomeState();
    RHP.views.home?.init?.(container, { introMode: true });
    RHP.homeIntro?.run?.(container);
  } else if (ns === 'about') {
    // Keep existing about direct-land logic (pre-position overlay, etc.)
    ...
  } else {
    // Other namespaces: fallback scroll
    RHP.scroll.unlock();
    RHP.lenis?.start();
    if (ns && RHP.views[ns]?.init) RHP.views[ns].init(container);
  }

  // Keep existing transitionDial init and about-transition positioning
  RHP.transitionDial?.init?.();
  ...
}
```

### Task 7: Add `preventRunning: true` to Barba init

**File**: `ready-hit-play-prod/orchestrator.js` (edit)

The dev version adds `preventRunning: true` to `barba.init()`. This prevents double-fire on rapid navigation and should be in prod:

```js
barba.init({
  preventRunning: true,
  transitions: [...]
});
```

---

## Barba Impact

1. **Init/Destroy lifecycle** — The dial morph helpers query DOM elements globally (not scoped to container). The case view's `init`/`destroy` manages Lenis on the persistent `dial_layer-fg`. WorkDial's existing `init`/`destroy` is unchanged.

2. **State survival** — `RHP.videoState.caseHandoff` already persists video position across transitions. The restructure preserves this pattern. Additionally, `data-dial-ns` on the persistent `dial_component` survives transitions.

3. **Transition interference** — The morph animation now runs in `leave()` BEFORE DOM swap, eliminating the old race condition where `afterEnter` tried to morph after the swap. The `about-transition` overlay is unaffected (stays out of scope).

4. **Re-entry correctness** — `setDialToHomeState()` clears all inline GSAP overrides via `clearProps: 'all'`, ensuring clean state on home re-entry. The `active` flag in views prevents double-init.

5. **Namespace scoping** — `home-to-case` and `case-to-home` are explicitly scoped. About transitions keep existing code. `rhp-core` fallback handles edge cases.

---

## Parallelisation Map

| Stream | Tasks | Agent | Est. time | Est. tokens |
|--------|-------|-------|-----------|-------------|
| A (CSS) | Task 1 | code-writer | 5 min | 2k |
| B (JS core) | Tasks 2, 3, 4, 5, 6, 7 | code-writer | 30 min | 15k |

**Dependencies**: Task 1 (CSS) is independent of Tasks 2–7 (JS). Tasks 2–7 are sequential (each builds on the previous).

**Recommendation**: Sequential execution. Tasks 2–7 touch the same file (orchestrator.js) and are tightly coupled. Task 1 can run first or in parallel, but the gain is negligible.

---

## Edge cases

- **Direct-land on work**: `data-dial-ns="work"` in HTML, CSS hides ticks/labels immediately. JS calls `setDialToWorkState()` + case view init. No dial module initialized.
- **Direct-land on home**: `data-dial-ns="home"` in HTML. Normal dial boot with intro.
- **Direct-land on about**: Existing about direct-land logic preserved (overlay hidden, logo pre-positioned).
- **Browser back/forward**: Barba popstate fires leave/enter. Morph animation runs in correct direction.
- **Rapid navigation**: `preventRunning: true` prevents double-fire. `gsap.killTweensOf(dialFg)` at start of each morph kills stale tweens.
- **Reduced motion**: All morph durations set to 0 when `prefers-reduced-motion: reduce` matches.
- **Video handoff**: Existing `RHP.videoState.caseHandoff` pattern preserved — capture in `beforeLeave`/`leave`, apply in `afterEnter`.
- **Overland AI page**: Page-specific CSS/JS loading in `runAfterEnter` preserved.

---

## Verification

1. **Automated checks:**
   - `grep -c 'runDialExpandAnimation\|runDialShrinkAnimation\|setDialToWorkState\|setDialToHomeState\|getDialVars' orchestrator.js` — should return 5+ (all helpers present)
   - `grep -c 'data-dial-ns' orchestrator.js` — should return 3+ (set in expand, shrink, boot)
   - `grep 'preventRunning' orchestrator.js` — should match
   - `grep 'ready-hit-play.css' init.js` — should match (CSS loaded)

2. **Manual browser checks (localhost:8080):**
   - Home → case: video plays continuously, dial morphs circle→rect, labels fade out, case content scrollable
   - Case → home: video plays continuously, ticks + labels fade in, dial morphs rect→circle
   - Direct-land home: intro runs, dial at home state
   - Direct-land case/work: dial expanded, ticks hidden, scroll works
   - Home → about: existing about transition works (unchanged)
   - Case → about: existing transition works (unchanged)
   - About → home: existing transition works (unchanged)
   - Browser back/forward: correct animations play

3. **Console checks:**
   - No errors on any transition
   - `RHP.versions` table shows all modules loaded
   - No `console.log` (only `DEBUG && console.log`)

---

## Files

| File | Action | Description |
|------|--------|-------------|
| `ready-hit-play-prod/ready-hit-play.css` | **New** | Copy from dev, namespace CSS rules |
| `ready-hit-play-prod/init.js` | Edit | Load `ready-hit-play.css` |
| `ready-hit-play-prod/orchestrator.js` | Edit | Add morph helpers, rewrite transitions, update views/boot |

---

## Prerequisite: Webflow HTML restructure

The Webflow Designer must have these changes on the staging site before JS changes take effect:

1. `dial_component` with `data-dial-ns="home"` on home page
2. `dial_component` with `data-dial-ns="work"` on work page
3. `[data-barba="container"]` moved inside `dial_layer-fg`
4. Both pages have identical outer shell (all dial elements)
5. Work page: `case-studies_wrapper` inside Barba container

**Question for user**: Has this HTML restructure already been done on the staging site? If not, it must be done first in Webflow Designer before any JS changes will work.

---

## Acceptance Tests

> Test infrastructure check: Playwright exists in `package.json`, `.env.test` may need setup.

1. `home-to-case-morph` — Navigate home→case, verify dial morphs (no video flash, labels hidden)
2. `case-to-home-morph` — Navigate case→home, verify dial morphs back (ticks visible, labels visible)
3. `direct-land-home` — Load homepage directly, verify dial at home state
4. `direct-land-case` — Load case page directly, verify dial expanded, content scrollable
5. `video-continuous` — Navigate home→case, verify video element is same DOM node (not recreated)
6. `no-console-errors` — No errors on any transition path
7. `reduced-motion` — With prefers-reduced-motion, verify instant state changes (no animation)
8. `about-transitions-unchanged` — Home→about and about→home still work as before
