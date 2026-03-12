# Spec: Fix RHP Barba Home ↔ Work Transition Bugs

**Client**: ready-hit-play (dev site — rhpcircle.webflow.io)
**Priority**: P0 — Critical (blocks client review)
**Status**: Ready to Build
**Created**: 2026-03-12
**Spec**: `.claude/specs/rhp-barba-transition-bugs.md` (bug report)

## Context
After implementing the Barba namespace restructure (dial persists outside swap zone), 6 bugs surfaced in the home↔work transitions.

## Files to modify
- `projects/ready-hit-play/global.js` (lines 751–880 transition functions, lines 996–1075 Barba transitions)
- `projects/ready-hit-play/ready-hit-play.css` (dial component styles)

---

## Bug Fixes

### Fix 1: Ticks clipped by `.dial_component` overflow
**Bug**: Attracted ticks extend beyond canvas/component bounds and get cut off (visible at 12/6 o'clock positions).

**Root cause**: `.dial_component` has `overflow: hidden` (CSS line 13). Canvas fills viewport exactly, but attracted ticks reach 424px from center while viewport center is ~393px.

**Fix** (CSS): Change `overflow: hidden` → `overflow: visible` on `.dial_component`. Safe because work-page scroll is on `.dial_layer-fg` (overflow-y: auto), not the component. Ticks are `display: none` on work pages.

### Fix 2: Video blank during home → work transition
**Bug**: Foreground video goes blank/black momentarily during transition.

**Root cause**: At `global.js:779`, `data-dial-ns` changes to `"work"` BEFORE GSAP pins `dialFg` dimensions. This instantly triggers CSS `.dial_component[data-dial-ns="work"] .dial_video-wrap { width: 100%; aspect-ratio: 16/9; border-radius: 0 }`, causing the video to abruptly resize from circle to full-width rectangle while dialFg is still viewport-sized, then GSAP shrinks dialFg. This reflow causes a blank frame.

**Fix** (JS — `runDialExpandAnimation`):
1. Pin `dial_video-wrap` dimensions inline BEFORE changing `data-dial-ns`
2. After GSAP morph completes, clear video-wrap inline styles so CSS takes over

```js
// Before changing data-dial-ns (after capturing dialFg rect):
const videoWrap = dialFg.querySelector('.dial_video-wrap');
const vRect = videoWrap?.getBoundingClientRect();
if (videoWrap && vRect) {
  gsap.set(videoWrap, { width: vRect.width, height: vRect.height, borderRadius: 999, aspectRatio: 'auto' });
}

// In onComplete, after clearProps on dialFg:
if (videoWrap) gsap.set(videoWrap, { clearProps: 'all' });
```

### Fix 3: Labels visible on work page
**Bug**: `dial_layer-ui` (sector title + meta) remains visible on work page.

**Root cause**: Most likely Webflow sets inline `opacity` on `.dial_layer-ui` from Designer, which beats our CSS rule. No IX2 interaction exists on this element per user confirmation.

**Fix** (belt-and-suspenders):
1. CSS: Add `!important` to the namespace rule
2. JS: In `home-to-case` `afterEnter`, re-assert `dialUI` opacity AFTER `_reinitWebflow()`

```css
.dial_component[data-dial-ns="work"] .dial_layer-ui {
  opacity: 0 !important;
  pointer-events: none;
}
```

```js
// In home-to-case afterEnter, after _reinitWebflow():
const dialUI = document.querySelector('.dial_layer-ui');
if (dialUI) gsap.set(dialUI, { opacity: 0 });
```

### Fix 4: Work page doesn't scroll
**Bug**: After transitioning to work, case study content inside `dial_layer-fg` cannot be scrolled.

**Root cause**: `runDialExpandAnimation` sets `overflow: hidden` inline on `dialFg` (line 786). `clearProps: 'all'` should remove it, but if the animation doesn't complete (killed by another tween, or browser tab hidden), inline `overflow: hidden` persists.

**Fix** (JS): In `home-to-case` `afterEnter`, defensively clear inline overflow on `dialFg` before `views.case.init`.

```js
// In home-to-case afterEnter, before views.case.init:
const dialFg = document.querySelector('.dial_layer-fg');
if (dialFg) gsap.set(dialFg, { clearProps: 'overflow' });
```

### Fix 5: Scrollbar visible on work view
**Bug**: Scrollbar appears despite `.no-scrollbar` class.

**Root cause**: Scrollbar may be on a child element (`.case-studies_wrapper`), not `dial_layer-fg` itself.

**Fix** (CSS): Apply scrollbar-hiding to both `dialFg` AND its scroll content child:
```css
.dial_layer-fg.no-scrollbar,
.dial_layer-fg.no-scrollbar .case-studies_wrapper {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.dial_layer-fg.no-scrollbar::-webkit-scrollbar,
.dial_layer-fg.no-scrollbar .case-studies_wrapper::-webkit-scrollbar {
  display: none;
}
```

### Fix 6: Dial not appearing on work → home return (z-index)
**Bug**: After work→home, dial circle doesn't appear. Inline styles from work state persist.

**Root cause**: After `clearProps: 'all'` on `dialFg`, z-index may not be restored if Webflow sets it as inline style (which gets cleared). Additionally, the stacking context from the new Barba content may cover the dial.

**Fix** (JS — defensive z-index restoration):
```js
// In runDialShrinkAnimation onComplete, after clearProps:
gsap.set(dialFg, { zIndex: 3 });

// In case-to-home afterEnter, after views.home.init:
const dialFg = document.querySelector('.dial_layer-fg');
if (dialFg) gsap.set(dialFg, { zIndex: 3 });
```

If this doesn't fix it: Use Playwright/MCP to snapshot computed styles on the live page.

---

## Implementation Order

1. **CSS fixes** (ready-hit-play.css)
   - Fix 1: `overflow: visible` on `.dial_component`
   - Fix 3 (CSS): `!important` on label opacity rule
   - Fix 5: Scrollbar hiding on child elements

2. **JS fixes** (global.js)
   - Fix 2: Pin video-wrap in `runDialExpandAnimation`
   - Fix 3 (JS): Re-assert dialUI opacity in `home-to-case` afterEnter
   - Fix 4: Clear overflow in `home-to-case` afterEnter
   - Fix 6: Restore z-index in `runDialShrinkAnimation` + `case-to-home` afterEnter

---

## Barba Impact
- **Init/Destroy**: No new lifecycle methods — fixes are within existing transition hooks
- **State survival**: No new state — video persistence already handled
- **Transition interference**: Fix 2 prevents CSS-vs-GSAP race by pinning video-wrap. Fix 6 ensures z-index survives clearProps.
- **Re-entry**: Fix 4 and Fix 6 add defensive guards in afterEnter that handle incomplete animations
- **Namespace scoping**: All fixes target `home-to-case` and `case-to-home` named transitions only

---

## Verification

After applying fixes, test on rhpcircle.webflow.io:

1. **Home → work**: Video plays continuously (no blank frame), dial morphs circle→rect, labels fade out and stay hidden, content scrollable, no scrollbar visible
2. **Work → home**: Dial appears (not covered), ticks + labels fade in, video circular, no stale inline styles
3. **Home (active state)**: Move mouse near ticks — verify attracted ticks NOT clipped at top/bottom
4. **Direct-land home**: Normal dial boot
5. **Direct-land work**: Dial expanded, scrollable
6. **Work → home → work (rapid)**: No stuck states
7. **Home → about → home**: No regression
