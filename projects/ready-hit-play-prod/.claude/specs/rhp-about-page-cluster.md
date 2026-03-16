# Spec: About Page — Scroll, Reveals, Dial, and Logo Hover Fixes

**Slug:** `rhp-about-page-cluster`
**Client:** ready-hit-play-prod
**Status:** Planning
**Created:** 2026-03-13

---

## Bugs Covered

| ID | Priority | Summary |
|----|----------|---------|
| `rhp-about-page-scroll-reveal-broken` | P0 | Scroll broken, GSAP content reveals stay hidden, HIT logo hover missing |
| `rhp-about-dial-missing-after-work-transition` | P1 | Small dial inside `.about_dial-link` doesn't render after work→about |

---

## Context

After the namespace restructure (2026-03-12), the about page has multiple failures:
1. **Scroll doesn't work** — content is not scrollable after Barba transition to about
2. **Text reveals invisible** — `about-text-lines.js` sets all lines to `opacity: 0` but the scroll-linked fade never fires
3. **HIT logo hover dead** — `initAboutHeroLogoHover()` either can't find elements or fails silently
4. **Dial missing on return** — after about→home→about (or work→about), the `.about_dial-wrapper` has lingering `visibility: hidden`

These all affect the about page and share root causes in `orchestrator.js` view lifecycle and Lenis management.

---

## Root Causes

### Bug 1 + 2: Scroll broken + reveals hidden

**Lenis double-start.** In `runAfterEnter()` (L1091-1096), Lenis is started for all non-home pages:
```js
RHP.scroll.unlock();
RHP.lenis && RHP.lenis.start && RHP.lenis.start();
RHP.lenis && RHP.lenis.resize && RHP.lenis.resize();
```

Then `views.about.init()` (L596-598) starts Lenis again:
```js
RHP.lenis?.start();
RHP.lenis?.resize();
```

`lenis-manager.start()` calls `stop()` first (destroying the current instance), then creates a fresh instance. This means:
1. First start creates Lenis instance A
2. `about-text-lines.init()` registers `RHP.lenis.onScroll(scrollHandler)` on instance A
3. Second start (from `views.about.init()`) destroys instance A, creates instance B
4. `scrollHandler` is now orphaned — registered on a destroyed instance
5. Lines stay at `opacity: 0` forever — `doUpdate()` never fires

The native `window scroll` listener still works, but with Lenis active, native scroll events fire inconsistently. The RAF-throttled `doUpdate()` gets called sporadically (or not at all if Lenis fully suppresses native scroll).

**Decision:** `runAfterEnter` owns Lenis start/stop. Remove Lenis calls from `views.about.init()`.

### Bug 3: HIT logo hover missing

`initAboutHeroLogoHover(container)` uses `container.querySelectorAll('.section_about-hero .about-hero_ready .nav_logo-embed')`. After the namespace restructure, `container` = `data.next.container` = `[data-barba="container"]` which is inside `dial_layer-fg`.

Possible causes:
1. `.section_about-hero` is still inside the Barba container → selector should work
2. If it was moved outside during restructure → selector returns empty → silent fail
3. The `isDesktop()` guard at L601 could be failing on some viewports

Investigation needed during build to confirm which cause. The fix approach is the same: ensure the selector works by falling back to `document` if container query fails (same pattern as `about-text-lines.js`).

### Bug 4: Dial missing after transition

In `runAboutToHomeTransition()` (L1285):
```js
if (aboutDialWrapper) gsap.set(aboutDialWrapper, { visibility: 'hidden' });
```

This inline style is **never cleared**. On the next about page visit:
- `views.about.init()` calls `RHP.aboutDialTicks.init(container)`
- `about-dial-ticks.js` starts its RAF draw loop
- But `.about_dial-wrapper` has `visibility: hidden` from the previous transition
- Canvas draws correctly but is invisible

No code in `runAfterEnter`, `views.about.init()`, or `about-dial-ticks.init()` clears this.

---

## Solution

### Step 1: Remove Lenis from `views.about.init()` — let `runAfterEnter` own it

**File:** `orchestrator.js`

In `views.about.init()` (L596-598), remove:
```js
RHP.lenis?.start();
RHP.lenis?.resize();
```

`runAfterEnter` already handles Lenis start + resize for all non-home namespaces (L1091-1096). This eliminates the double-start that orphans scroll listeners.

Also remove Lenis calls from `views.case.init()` and `views.contact.init()` if they exist, for consistency — `runAfterEnter` is the single Lenis owner.

### Step 2: Restore `.about_dial-wrapper` visibility on about page enter

**File:** `orchestrator.js`

In `runAfterEnter()`, after the about-specific `rhp-nav-hidden` class is added (L1036) and before `views.about.init()` is called (L1113), add:

```js
if (ns === 'about') {
  const aboutDialWrapper = document.querySelector('.about_dial-wrapper');
  if (aboutDialWrapper) gsap.set(aboutDialWrapper, { clearProps: 'visibility' });
}
```

This clears the inline `visibility: hidden` set by `runAboutToHomeTransition`, restoring the dial wrapper to its CSS default (`visible`).

### Step 3: Add `gsap.context()` to `about-text-lines.js`

**File:** `about-text-lines.js`

Wrap all GSAP calls in `init()` inside a `gsap.context()`:

```js
let ctx = null;

function init(container) {
  if (active) return;
  active = true;
  ctx = gsap.context(() => {
    // existing SplitText + gsap.set(line, { opacity: 0 }) calls
  }, container);
  // scroll listener registration stays outside context (not GSAP-managed)
}

function destroy() {
  if (!active) return;
  active = false;
  ctx?.revert();  // kills all GSAP tweens + reverts SplitText
  ctx = null;
  // still remove scroll listeners manually
  window.removeEventListener('scroll', scrollHandler, { passive: true });
  RHP.lenis?.offScroll?.(scrollHandler);
  ScrollTrigger.removeEventListener('refresh', refreshHandler);
  cancelAnimationFrame(rafId);
}
```

Note: `gsap.context().revert()` automatically reverts SplitText instances created within it, so the manual `split.revert()` loop can be removed.

### Step 4: Add `gsap.context()` to `about-dial-ticks.js`

**File:** `about-dial-ticks.js`

Minimal change — the module doesn't use GSAP tweens, only canvas drawing. But wrapping the init in `gsap.context()` future-proofs it and aligns with the project pattern. The main benefit is if any GSAP `set()` calls are added later, they auto-clean.

If no GSAP calls exist in `about-dial-ticks.js`, skip this step — don't add `gsap.context()` for no reason.

### Step 5: Fix HIT logo hover selector — fall back to `document`

**File:** `orchestrator.js`

In `initAboutHeroLogoHover(container)` (L501), change:
```js
const logoEmbeds = container.querySelectorAll('.section_about-hero .about-hero_ready .nav_logo-embed');
```
to:
```js
const logoEmbeds = (container || document).querySelectorAll('.section_about-hero .about-hero_ready .nav_logo-embed');
if (!logoEmbeds.length) {
  logoEmbeds = document.querySelectorAll('.section_about-hero .about-hero_ready .nav_logo-embed');
}
```

Same fallback pattern used by `about-text-lines.js`. If `.section_about-hero` is outside the Barba container after restructure, the `document` fallback catches it.

Also add the same fallback to `initAboutTeamHover(container)` if it has the same pattern.

### Step 6: Add `gsap.context()` to about hero hover in orchestrator

**File:** `orchestrator.js`

The `initAboutHeroLogoHover` and `initAboutTeamHover` functions use raw `gsap.to()` / `gsap.killTweensOf()` without `gsap.context()`. Wrap in a context:

```js
let aboutHeroCtx = null;

function initAboutHeroLogoHover(container) {
  aboutHeroCtx = gsap.context(() => {
    // existing hover logic
  });
}

function destroyAboutHeroLogoHover() {
  aboutHeroCtx?.revert();
  aboutHeroCtx = null;
  // existing listener removal + split.revert()
}
```

This ensures all GSAP tweens created by hover interactions are killed on destroy.

---

## Barba Impact

### 1. Init/Destroy lifecycle
- `views.about.init()` and `views.about.destroy()` already exist and are called correctly by orchestrator
- Lenis ownership moves to `runAfterEnter` — no change to the init/destroy call pattern, just removing redundant Lenis calls from the view
- `gsap.context()` additions improve destroy cleanup — no lifecycle change needed

### 2. State survival
- Nothing needs to persist across about page transitions — text lines re-split on each init
- The `.about_dial-wrapper` visibility fix is a cleanup concern, not state survival

### 3. Transition interference
- The `visibility: hidden` fix only runs in `runAfterEnter` (after swap) — no conflict with leave animations
- `gsap.context().revert()` in destroy runs in `beforeLeave` — before the transition animation starts

### 4. Re-entry correctness
- home→about→home→about: Lenis single-owner prevents double-start. `gsap.context().revert()` kills stale tweens. `clearProps: 'visibility'` restores dial wrapper. Text lines re-split cleanly.
- work→about: Same flow — `views.case.destroy()` + `views.about.init()`. Dial wrapper visibility cleared.
- about→home→about: `runAboutToHomeTransition` hides dial wrapper → `runAfterEnter` clears it → dial renders.

### 5. Namespace scoping
- All fixes are scoped to `about` namespace
- Lenis ownership change affects all non-home namespaces equally (case, contact already rely on `runAfterEnter` for Lenis)
- `gsap.context()` additions are module-internal — no namespace impact

---

## Implementation Steps

| Step | File | Change |
|------|------|--------|
| 1 | `orchestrator.js` | Remove Lenis start/resize from `views.about.init()` |
| 2 | `orchestrator.js` | Add `clearProps: 'visibility'` for `.about_dial-wrapper` in `runAfterEnter` |
| 3 | `about-text-lines.js` | Wrap init in `gsap.context()`, use `ctx.revert()` in destroy |
| 4 | `about-dial-ticks.js` | Skip if no GSAP calls; add context only if needed |
| 5 | `orchestrator.js` | Fix HIT logo hover selector with `document` fallback |
| 6 | `orchestrator.js` | Wrap about hero hover in `gsap.context()` |

---

## Parallelisation Map

| Stream | Tasks | Agent | Est. time | Est. tokens |
|--------|-------|-------|-----------|-------------|
| A | Steps 1, 2, 5, 6 (orchestrator.js changes) | code-writer | 15 min | 8k |
| B | Step 3 (about-text-lines gsap.context) | code-writer | 10 min | 5k |

**Dependencies:** None — A and B are independent files.
**Recommendation:** Run A + B in parallel. No worktrees needed (changes in 2 files only).

---

## Edge Cases

| Scenario | Expected behavior |
|----------|-------------------|
| Direct land on /about | `bootCurrentView()` calls `views.about.init()` (no Lenis double-start since `runAfterEnter` doesn't run). Dial wrapper has no lingering visibility. |
| home→about→home→about (rapid) | Each destroy cleans `gsap.context`. Each enter clears dial visibility. Lenis started once per enter. |
| work→about | `views.case.destroy()` runs, then about init. Dial wrapper visibility cleared. |
| about→home (dial hidden) | `visibility: hidden` set on wrapper — correct for transition. Cleared on next about enter. |
| Mobile (not desktop) | `isDesktop()` returns false → HIT logo hover skipped. This is intentional. |
| prefers-reduced-motion | `initAboutHeroLogoHover` returns early. Text lines skip animation (set `opacity: 1` immediately). |

---

## Files Changed

| File | Change |
|------|--------|
| `orchestrator.js` | Remove Lenis from views.about.init(), add dial visibility restore, fix HIT logo selector, add gsap.context to hero hover |
| `about-text-lines.js` | Wrap in gsap.context() for proper GSAP cleanup |

---

## Verification

1. **Scroll works on about:** Navigate home→about — page scrolls with Lenis smooth scroll
2. **Text reveals:** Scroll down on about — text lines fade in progressively
3. **HIT logo hover:** Hover each logo part on desktop — opacity + y animation plays
4. **Dial visible:** Navigate about→home→about — small teal dial renders in `.about_dial-link`
5. **Re-entry:** home→about→home→about — all features work on second visit
6. **Work→about:** Navigate work→about — dial visible, scroll works
7. **Console:** Zero errors during all transition paths
8. **Reduced motion:** Enable reduced-motion — text visible immediately, no hover animation
9. **Smoke tests:** `cd projects/ready-hit-play-prod && npm run test:smoke`

---

## Acceptance Tests

| Test | Type | Page/Action | Assertion |
|------|------|-------------|-----------|
| About page scrolls after Barba transition | Hard | Navigate home→about, scroll down | `window.scrollY` > 0 after scroll action |
| Text lines fade in on scroll | Hard | Navigate to about, scroll to `.section_about-stories` | At least one `.about-text-line` has `opacity > 0` |
| HIT logo hover animates (desktop) | Hard | Navigate to about, hover `.nav_logo-embed` inside `.section_about-hero` | `.about-hero_ready` opacity changes from 0.4 toward 1 |
| About dial visible after round-trip | Hard | Navigate about→home→about | `.about_dial-wrapper` is visible (no inline `visibility: hidden`) |
| About dial visible after work→about | Hard | Navigate work→about | `.about_dial-wrapper` is visible |
| No console errors on about | Hard | Navigate home→about | Zero `console.error` entries |
| Text lines visible with reduced motion | Hard | Set reduced motion, navigate to about | All text content visible (opacity: 1) |
| Re-entry: home→about→home→about clean | Hard | Full round-trip twice | No doubled DOM nodes, no stale listeners, scroll works on second visit |
