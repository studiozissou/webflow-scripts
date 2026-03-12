# Bug Report: RHP Barba Home ↔ Work Transition

**Client**: ready-hit-play (dev site — rhpcircle.webflow.io)
**Status**: Ready to Debug
**Created**: 2026-03-12
**Context**: After implementing the namespace restructure (`rhp-barba-namespace-restructure` spec), the Barba transitions between home and work pages have multiple issues.

## Files involved

- `projects/ready-hit-play/global.js` — Orchestrator with Barba transitions, dial morph helpers
- `projects/ready-hit-play/ready-hit-play.css` — Namespace-scoped dial styles
- Webflow Designer — HTML structure (already restructured, not part of these bugs)

## Current architecture

The dial component persists outside the Barba swap zone. `dial_layer-fg` is the morphing container — it fills the viewport on home (via `position: absolute; inset: 0`) and shrinks to a centered rectangle on work (via CSS `[data-dial-ns="work"]` rule with explicit `width`/`height`/`margin: auto`).

Barba transitions use `async leave()` to animate the morph BEFORE the DOM swap, then `afterEnter()` to initialise the new view.

---

## Bug 1: Video goes blank during home → work transition

**Observed**: When clicking a link to go from home to work, the foreground video (`dial_fg-video`) goes blank/black momentarily, then reloads.

**Expected**: The video should continue playing seamlessly throughout the transition — the whole point of the namespace restructure is that `dial_video-wrap` persists outside the Barba container.

**Likely causes**:
- The new Barba container content might include a duplicate video element that briefly covers the persistent one
- Barba's DOM swap might be removing/re-adding elements that overlap with the persistent video
- The `clearProps: 'all'` on `dial_layer-fg` after expand might cause a layout reflow that forces a video repaint
- The `is-case-study` class or `data-dial-ns="work"` CSS change might alter `dial_video-wrap` sizing in a way that triggers a video reload

**Debug approach**:
1. Add `DEBUG && console.log` checkpoints in `runDialExpandAnimation` to confirm the animation runs to completion
2. Check if the work page Barba container includes its own `<video>` element that conflicts with the persistent one
3. Use MCP `browser_console_messages` to check for video-related errors
4. Use DevTools Performance tab to check for layout shifts during transition
5. Check whether the video `<source>` or `src` attribute is being changed during the swap

---

## Bug 2: `dial_layer-ui` (labels) not hidden on work page

**Observed**: After transitioning to the work page, the labels ("WHO WE ARE", project title, etc.) remain visible at the bottom of the screen.

**Expected**: Labels should fade out during the home → work `leave()` animation and stay hidden on work.

**Current implementation**:
- JS: `gsap.to(dialUI, { opacity: 0, duration: 0.32s })` in `runDialExpandAnimation()`
- CSS fallback: `.dial_component[data-dial-ns="work"] .dial_layer-ui { opacity: 0; pointer-events: none; }`

**Likely causes**:
- The GSAP fade-out might not be running (check if `runDialExpandAnimation` is called at all)
- Webflow IX2 reinit (`_reinitWebflow()` in `afterEnter`) might reset the opacity
- The CSS fallback might have a specificity issue — Webflow might inject inline styles or a higher-specificity rule on `.dial_layer-ui`
- The `dialUI` querySelector might not find the element (wrong selector or element not in DOM)

**Debug approach**:
1. Check if `.dial_layer-ui` exists in the persistent DOM (not inside Barba container)
2. Inspect computed styles on work page — is the CSS rule applying?
3. Check Webflow IX2 for interactions that affect `.dial_layer-ui` opacity
4. Add `DEBUG && console.log('dialUI found:', !!dialUI)` before the fade-out

---

## Bug 3: Work page does not scroll

**Observed**: After transitioning to the work page, the case study content inside `dial_layer-fg` cannot be scrolled.

**Expected**: `dial_layer-fg` should be a scrollable container on work (via `overflow-y: auto` from CSS + Lenis wrapper).

**Current implementation**:
- CSS sets `overflow-y: auto` on `[data-dial-ns="work"] .dial_layer-fg`
- `RHP.views.case.init()` starts Lenis with `wrapper: dialFg, content: .case-studies_wrapper`
- `runDialExpandAnimation` ends with `clearProps: 'all'` to remove inline `overflow: hidden`

**Likely causes**:
- `clearProps: 'all'` might not fire (expand animation not completing)
- Lenis might fail to init if `.case-studies_wrapper` isn't found inside `dialFg` after the Barba swap
- The base CSS `place-items: center` (grid) might interfere with flex layout — though `align-items: stretch` was added to override
- `RHP.scroll.lock()` might still be active (html/body overflow: hidden blocking scroll)
- Lenis wrapper needs the content to actually overflow — check if case content is taller than `85dvh`

**Debug approach**:
1. After transition, inspect `dial_layer-fg` computed styles — does it have `overflow-y: auto`? Or is inline `overflow: hidden` still there?
2. Check if `RHP.views.case.init()` is called — add DEBUG log
3. Check if Lenis finds the wrapper and content elements
4. Test native scroll (disable Lenis temporarily) to isolate CSS vs Lenis issue
5. Check if `RHP.scroll.unlock()` is called before case view init

---

## Bug 4: Scrollbar visible on `dial_layer-fg.is-case-study`

**Observed**: A scrollbar appears on the work-state dial, despite `.no-scrollbar` class being applied.

**Expected**: Scrollbar should be hidden (scrollbar-width: none + ::-webkit-scrollbar display: none).

**Current implementation**:
- JS adds `no-scrollbar` class in `runDialExpandAnimation` step 5
- CSS `.dial_layer-fg.no-scrollbar` hides scrollbar

**Likely causes**:
- `no-scrollbar` class might not be applied (check in DevTools)
- CSS specificity issue — Webflow styles might override
- The scrollbar might be on a child element, not `dial_layer-fg` itself
- `clearProps: 'all'` might somehow interfere (it shouldn't affect classes, but verify)

**Debug approach**:
1. Inspect `dial_layer-fg` class list on work page — is `no-scrollbar` present?
2. Check if the CSS file is loaded (search for `scrollbar-width` in Computed panel)
3. Check if the scrollbar is actually on `dial_layer-fg` or a child (like `.case-studies_wrapper`)

---

## Bug 5: Dial doesn't appear + fg video misshapen on work → home return

**Observed**: After navigating work → home, the dial circle doesn't appear. The video is distorted (not circular, wrong aspect ratio). Screenshot shows `dial_layer-fg` retains work-state inline styles: `cursor: pointer; overflow: auto; aspect-ratio: auto; border-radius: 0; height: 85dvh; width: 78vw; display: flex; flex-flow: column wrap`.

**Expected**: `dial_layer-fg` should animate from work rectangle back to full viewport, then `clearProps: 'all'` removes all inline styles. CSS `position: absolute; inset: 0` takes over (full viewport). `dial_video-wrap` renders as a circle (`border-radius: 999px`).

**Current implementation**:
`runDialShrinkAnimation()`:
1. Captures rect BEFORE changing data-dial-ns (fixed from earlier bug)
2. Pins starting state with inline styles
3. Changes data-dial-ns to "home", removes classes
4. Reads target size from `dial_component`
5. Animates width/height/borderRadius/margin to target
6. `onComplete`: `clearProps: 'all'`

**Likely causes**:
- `runDialShrinkAnimation` might not run at all — the `case-to-home` Barba transition might not match
  - Check: does `data-barba-namespace="case"` exist on the work page container? The Barba `from: { namespace: ['case'] }` needs it
- The animation might start but not complete — something kills the tween before `onComplete`
  - Check: does `afterEnter` → `RHP.views.home.init()` → `RHP.workDial.init()` kill tweens on `dialFg`?
- `getBoundingClientRect()` might return unexpected values if the element is being animated or hidden
- The `clearProps: 'all'` call might fail silently

**Debug approach**:
1. Add `DEBUG && console.log('shrink start')` at start and `DEBUG && console.log('shrink complete')` in onComplete
2. Check if the `case-to-home` transition is even matching (log `data.current.namespace` and `data.next.namespace`)
3. Check if the default fallback transition is firing instead
4. After the failed transition, inspect `dial_layer-fg` inline styles in DevTools — do they match the GSAP pin state or the CSS work rule?
5. Check if `gsap.killTweensOf(dialFg)` is being called from somewhere else during the animation

---

## Meta: Namespace matching confirmed

The work page uses `data-barba-namespace="case"` — confirmed by user. The named transitions (`home-to-case`, `case-to-home`) should match correctly. The bugs are therefore in the animation/CSS logic itself, not namespace mismatch.

**Primary debug focus**: Add DEBUG logging at the start and end of `runDialExpandAnimation` and `runDialShrinkAnimation` to confirm they actually execute and complete. If they do run, the issue is in the CSS/GSAP property handling. If they don't run, investigate why the named transitions aren't firing despite correct namespaces.

---

## Verification plan

After fixing, test these flows:
1. **Home → work**: video plays continuously, dial morphs circle→rect, labels fade out, content scrollable, no scrollbar visible
2. **Work → home**: dial morphs rect→circle, ticks + labels fade in, video circular, no stale inline styles on `dial_layer-fg`
3. **Direct-land home**: normal dial boot, no regression
4. **Direct-land work**: dial expanded, ticks hidden, case content scrollable, video playing
5. **Home → about → home**: dial correct on return
6. **Work → about → work**: dial correct on return
7. **Rapid nav (home → work → home quickly)**: no stuck states

---

## Related specs
- `.claude/specs/rhp-barba-namespace-restructure.md` — the original restructure spec
