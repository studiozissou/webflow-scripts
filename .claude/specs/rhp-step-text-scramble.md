# RHP: Step Text ScrambleText on Project Selection

**Slug:** `rhp-step-text-scramble`
**Client:** ready-hit-play-prod
**Status:** Ready to Build

## Summary

When the homepage dial enters ACTIVE state (user hovers/drags to select a project), the `[data-text="step"]` element should remain visible and use GSAP ScrambleTextPlugin to animate from its current text to the selected project name. When returning to IDLE, it should scramble back to the original text.

Currently: step text fades to opacity 0 on ACTIVE, fades to opacity 1 on IDLE.
After: step text stays at opacity 1, content scramble-animates between project names.

## DOM Context

The step text element (`div.heading-style-h7.is-step`) sits as a direct child of `.dial_component`, outside Barba container. It has both `data-text="step"` and `data-dial-title` attributes. On the live page, it's the first `[data-dial-title]` match — so `applyActive()` already writes project names to it via `titleEl.textContent = t` (line 579).

There's a second `[data-dial-title]` on `h2.dial_label-title` inside `.dial_layer-ui` — this is the overlay label visible in ACTIVE state. It should continue to be updated separately.

8 CMS projects: Overland AI, Menno Sports, Remote, Stoke Space, Between Here and Mars, Starfish Space, Tommy Hilfiger, Microsoft.

## Implementation

### File: `work-dial.js`

#### 1. Register ScrambleTextPlugin (top of IIFE, after `SEL` definition)

```js
if (window.gsap && window.ScrambleTextPlugin) {
  window.gsap.registerPlugin(window.ScrambleTextPlugin);
}
```

#### 2. Cache step element and original text (in `init()`, after line 178)

```js
const stepEl = comp.querySelector('[data-text="step"]') || document.querySelector('[data-text="step"]');
const origStepText = stepEl ? stepEl.textContent.trim() : '';
```

#### 3. Revert SplitText before first ScrambleText use

Add a flag `let splitReverted = false;` at init scope. Before the first ScrambleText call on `stepEl`, check if SplitText wrappers exist and clean them:

```js
function revertStepSplit() {
  if (splitReverted) return;
  splitReverted = true;
  if (stepEl && stepEl.querySelector('.home-intro-word')) {
    // SplitText wrappers still present — replace with plain text
    stepEl.textContent = stepEl.textContent.trim();
  }
}
```

#### 4. Modify `setDialState()` — ACTIVE branch (lines 405-408)

Replace the opacity→0 fade with ScrambleText to current project name:

```js
// OLD: fade out step text
// document.querySelectorAll('[data-text="step"]').forEach(el => {
//   if (gsap && !reduced) gsap.to(el, { opacity: 0, duration: 0.3, ease: 'linear', overwrite: 'auto' });
//   else el.style.opacity = '0';
// });

// NEW: keep step text visible, scramble to project name
if (stepEl) {
  revertStepSplit();
  const projectName = items[state.activeIndex]?.getAttribute('data-title') || '';
  if (gsap && !reduced && window.ScrambleTextPlugin) {
    gsap.to(stepEl, {
      duration: 0.6,
      scrambleText: { text: projectName, chars: 'upperCase', speed: 0.4 },
      overwrite: true
    });
  } else {
    stepEl.textContent = projectName;
  }
}
```

#### 5. Modify `setDialState()` — IDLE branch (lines 366-369)

Replace the opacity→1 fade with ScrambleText back to original:

```js
// OLD: fade in step text
// document.querySelectorAll('[data-text="step"]').forEach(el => {
//   if (gsap && !reduced) gsap.to(el, { opacity: 1, duration: 0.3, ease: 'linear', overwrite: 'auto' });
//   else el.style.opacity = '1';
// });

// NEW: scramble back to original text
if (stepEl) {
  if (gsap && !reduced && window.ScrambleTextPlugin) {
    gsap.to(stepEl, {
      duration: 0.6,
      scrambleText: { text: origStepText, chars: 'upperCase', speed: 0.4 },
      overwrite: true
    });
  } else {
    stepEl.textContent = origStepText;
  }
}
```

#### 6. Modify `applyActive()` — sector change text update (line 579)

Add ScrambleText for step text on sector change (keep existing `titleEl` update for `.dial_layer-ui`):

```js
// Existing: titleEl.textContent = t; (updates h2.dial_label-title in .dial_layer-ui)
if (titleEl) titleEl.textContent = t;
if (metaEl) metaEl.textContent = m;

// NEW: ScrambleText step text on sector change while ACTIVE
if (stepEl && dialState === DIAL_STATES.ACTIVE && !isInitial) {
  revertStepSplit();
  const gsap = window.gsap;
  const reduced = prefersReduced();
  if (gsap && !reduced && window.ScrambleTextPlugin) {
    gsap.to(stepEl, {
      duration: 0.4,
      scrambleText: { text: t, chars: 'upperCase', speed: 0.6 },
      overwrite: true
    });
  } else {
    stepEl.textContent = t;
  }
}
```

Note: shorter duration (0.4s) for sector-to-sector changes vs 0.6s for state transitions, and faster speed for snappier feel during browsing.

#### 7. Hide `.dial_layer-ui` (CSS)

Since the step text now displays the project name in ACTIVE state, the `.dial_layer-ui` overlay (which previously showed `dial_label-title` + `dial_label-meta`) is redundant. Hide it for now.

Add to `ready-hit-play.css`:

```css
.dial_layer-ui {
  display: none !important;
}
```

Place near the existing `.dial_layer-*` rules. The `!important` is intentional — `setDialUiOpacity()` in work-dial.js still sets `opacity` on this element via GSAP, and we want to override that without touching the JS opacity logic (so it can be reverted later by removing the CSS rule).

Note: `setDialUiOpacity(0)` / `setDialUiOpacity(1)` calls in work-dial.js can stay — they will be no-ops visually since `display: none` removes the element from the layout entirely.

### Edge cases

| Scenario | Handling |
|----------|---------|
| `prefers-reduced-motion` | Direct `textContent` swap, no scramble animation |
| `isInitial` (boot `applyActive(0)`) | Skipped — step text keeps original text in IDLE |
| Barba return (case→home, ACTIVE at boot) | `setDialState(ACTIVE)` fires → scrambles to handoff project name |
| SplitText still wrapping text | `revertStepSplit()` cleans up before first scramble |
| ScrambleTextPlugin fails to load | Falls back to direct `textContent` swap |
| Rapid sector changes | `overwrite: true` kills previous scramble tween |

## Barba Impact

1. **Init/Destroy lifecycle:** No new DOM elements or listeners. ScrambleText tweens are inline GSAP calls with `overwrite: true` — they self-cancel. `destroy()` already kills GSAP context which covers any in-flight tweens.
2. **State survival:** `origStepText` is captured at init. On Barba return, `init()` re-reads the original text from the DOM (which Webflow restores on page swap).
3. **Transition interference:** No — step text is outside Barba container, persists across transitions. The GSAP tweens are short (0.4-0.6s) and use `overwrite: true`.
4. **Re-entry correctness:** `splitReverted` flag resets on each `init()` call. `origStepText` re-read from fresh DOM.
5. **Namespace scoping:** Home only — `work-dial.js` only inits on home namespace.

## Verify Loop

### Pass/fail criteria
- [ ] On homepage, hover/drag into dial → step text scrambles to project name (e.g. "Overland AI")
- [ ] Change sectors → step text scrambles to new project name
- [ ] Move away from dial (IDLE) → step text scrambles back to original copy
- [ ] Step text remains at opacity 1 throughout (never fades out)
- [ ] No console errors
- [ ] `prefers-reduced-motion`: text changes instantly, no scramble animation
- [ ] Barba return (about→home): step text shows original copy in IDLE, scrambles on ACTIVE

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/`
2. Wait for intro sequence to complete
3. Hover mouse toward the dial center → observe step text scramble to first project name
4. Move mouse around dial sectors → observe step text scramble between project names
5. Move mouse away from dial → observe step text scramble back to original
6. Navigate to /about, then back to home → verify clean re-init

### Tier mapping
- **Tier 1 (auto):** Console errors, step text content matches active sector, opacity stays at 1
- **Tier 2 (CDN regression):** Same as Tier 1 after deploy
- **Tier 3 (manual):** Visual quality of scramble animation, timing feel, mobile drag interaction

### Regression scope
- Dial sector switching must still work (video swap, sector tick highlight)
- Intro sequence must still work (SplitText word reveal → then scramble takes over)
- Barba transitions home↔about↔case must not break
- `.dial_layer-ui` is hidden — no longer needs to update visually, but JS calls to it must not throw

## Tasks

1. **Register ScrambleTextPlugin + cache step element** — Add `registerPlugin`, cache `stepEl` and `origStepText`, add `revertStepSplit()` helper
2. **Update `setDialState()` ACTIVE/IDLE branches** — Replace opacity tweens with ScrambleText calls
3. **Update `applyActive()` for sector-change scramble** — Add ScrambleText call gated on ACTIVE state
4. **Hide `.dial_layer-ui` in CSS** — Add `display: none !important` to `ready-hit-play.css`
5. **Test on staging** — Verify all scenarios from verify loop

## Parallelisation Map

All changes are in a single file (`work-dial.js`), tightly coupled. **Sequential execution recommended** — no parallel benefit.

| Task | Agent | Est. tokens | Depends on |
|------|-------|-------------|------------|
| 1-4  | code-writer | ~8k | — |
| 5    | qa | ~4k | 1-4 |

## Test Plan

### Tier 1 — Auto: Playwright local
- Step text content matches active project on sector change
- Step text opacity remains 1 in ACTIVE state
- No console errors on homepage
- Step text reverts to original on IDLE

### Tier 2 — Auto: CDN regression
- Same tests registered in `tests/registry.json`

### Tier 3 — Manual
- Visual quality of ScrambleText animation (character scramble timing, readability)
- Mobile drag: step text updates on drag sector change
- Safari/Firefox: ScrambleText renders correctly
