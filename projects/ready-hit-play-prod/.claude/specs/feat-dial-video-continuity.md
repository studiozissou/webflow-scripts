# Spec: Feature — Dial Video Continuity Across Transitions

**Queue ID:** `feat-dial-video-continuity` (new)
**Priority:** P1
**Type:** Feature
**Depends on:** `fix-dial-barba-video-survival` (must ship first)

---

## Goal

Videos playing in the home dial should feel continuous across Barba transitions — no black frames, no reload flash. The project video the user was watching becomes the hero video on the work page, and returns seamlessly to the dial on the way back.

---

## Desired Behaviour

### Home → Work (clicking a project)

1. User is in ACTIVE/ENGAGED state. `dial_fg-video` is playing at time T, `dial_bg-video` is playing blurred behind it.
2. User clicks the dial link → Barba transition begins.
3. `dial_fg-video` and `dial_bg-video` **keep playing** through the entire transition animation (no destroy, no pause).
4. `dial_layer-fg` expands from circle to full-screen (the existing `runAfterEnter` animation). Because the fg video was playing continuously, it arrives on the work page already at the right frame — no seek flash.
5. Work page loads beneath. `dial_layer-fg` fades out / hands off to the work page's own case hero video (`.section_case-video video`), which is seeked to `T + transitionDuration`.

### Work → Home (back / nav)

1. User is on the work page. Case hero video has been playing.
2. Barba transition begins → `dial_layer-fg` shrinks back from full-screen to circle (`runCaseDialShrinkAnimation`).
3. Home re-inits with `caseHandoff` containing: `{ index, currentTime, bgSrc }`.
4. Dial shows the last-visited project's fg + bg videos playing (from handoff time). Dial interaction is **locked** — no hover/sector switching yet.
5. Adjacent pool videos (`bgPoolPrev`, `bgPoolNext`) begin buffering in the background.
6. Once both pool slots reach `readyState >= 2` (have a decodable frame): interaction unlocks.
7. On unlock:
   - If mouse is **inside** `idleThreshold`: normal ACTIVE state — dial is fully interactive immediately.
   - If mouse is **outside** `idleThreshold` (IDLE territory): crossfade handoff fg+bg out, genericVideo in. Enter IDLE state.

---

## Implementation

### 1. `work-dial.js` — `freeze()` method

Add a public `freeze()` method. Freeze locks interaction but keeps the RAF loop and all videos playing:

```js
function freeze() {
  interactionUnlocked = false;
  // Remove pointer event handlers
  // (cleanup array already tracks these via off(); alternatively use a flag checked in handlers)
}
```

Expose on `RHP.workDial`:
```js
RHP.workDial = { init, destroy, freeze, isAlive, getActiveIndex, ... };
```

### 2. `work-dial.js` — pool-ready unlock

Replace the 300ms `setTimeout` (currently in orchestrator) with a proper internal poll:

```js
function waitForPoolReady() {
  const check = () => {
    if (!alive) return;
    if (bgPoolPrev.readyState >= 2 && bgPoolNext.readyState >= 2) {
      interactionUnlocked = true;
      // If mouse currently outside idle threshold, transition to IDLE
      if (dialState === DIAL_STATES.ACTIVE && state.rDist > geom.idleThreshold) {
        setDialState(DIAL_STATES.IDLE);
      }
    } else {
      requestAnimationFrame(check);
    }
  };
  requestAnimationFrame(check);
}
```

Call `waitForPoolReady()` at the end of the handoff block (instead of exposing `setInteractionUnlocked`). Add a safety timeout (e.g. 3s) so interaction unlocks even if pool buffers slowly on slow connections.

### 3. `orchestrator.js` — `rhp-core` transition (home → work)

#### beforeLeave — freeze instead of destroy

```js
beforeLeave(data) {
  const ns = data.current?.namespace || currentNs;
  if (ns === 'home' && RHP.videoState && RHP.workDial) {
    const fgVideo = document.querySelector('.dial_fg-video');
    const bgVideo = document.querySelector('.dial_bg-video');
    const idx = RHP.workDial.getActiveIndex();
    if (fgVideo && typeof idx === 'number') {
      RHP.videoState.caseHandoff = {
        index: idx,
        currentTime: fgVideo.currentTime || 0,
        bgSrc: bgVideo?.src || '',
        transitionDuration: 0.6
      };
    }
    // Freeze: keep videos playing, disable interaction
    RHP.workDial.freeze();
    // Do NOT call views.home.destroy() here
  } else {
    if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
  }
},
```

#### enter — defer destroy to here

```js
enter(data) {
  window.scrollTo(0, 0);
  // Leave animation is done. Safe to destroy now.
  if (RHP.workDial?.isAlive?.()) {
    RHP.views.home?.destroy?.();
  }
},
```

### 4. `orchestrator.js` — `runAfterEnter` for case namespace

#### Seek persistent fg video + case hero video

```js
if (ns === 'case' && RHP.videoState?.caseHandoff) {
  const handoff = RHP.videoState.caseHandoff;
  const seekTime = (handoff.currentTime || 0) + (handoff.transitionDuration || 0.6);
  if (typeof handoff.index === 'number') RHP.videoState.lastCaseIndex = handoff.index;

  // Persistent fg video has been playing through transition — seek to sync point
  const fgVideoEl = document.querySelector('.dial_fg-video');
  if (fgVideoEl) {
    fgVideoEl.currentTime = seekTime;
    fgVideoEl.play().catch(() => {});
  }

  // Case hero video: seek to same sync point
  const caseContainer = data.next.container;
  const caseVideoEl = caseContainer.querySelector('.section_case-video video')
    || caseContainer.querySelector('.dial_video-wrap video');
  if (caseVideoEl) {
    caseVideoEl.currentTime = seekTime;
    caseVideoEl.play().catch(() => {});
  }

  // Fade dialFg out once case page is settled (dialFg was used for transition animation)
  const dialFg = document.querySelector('.dial_layer-fg');
  if (dialFg && window.gsap) {
    gsap.to(dialFg, { opacity: 0, duration: 0.3, delay: 0.2, ease: 'linear' });
  }

  RHP.videoState.caseHandoff = null;
}
```

### 5. `orchestrator.js` — `case-to-home` transition

#### beforeLeave — capture both fg and bg from case page

```js
if (ns === 'case' && RHP.videoState) {
  const container = data.current?.container || document;
  const caseVideo = container.querySelector('.section_case-video video')
    || container.querySelector('.dial_video-wrap video');
  const idx = RHP.videoState.lastCaseIndex;
  const bgVideo = document.querySelector('.dial_bg-video');
  if (caseVideo && typeof idx === 'number') {
    RHP.videoState.caseHandoff = {
      index: idx,
      currentTime: caseVideo.currentTime || 0,
      bgSrc: bgVideo?.src || ''
    };
  }
}
if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
```

#### Remove 300ms setTimeout for setInteractionUnlocked

The pool-ready unlock is now handled internally by `waitForPoolReady()` in work-dial.js. Remove:
```js
// Remove this:
if (hadCaseHandoff) {
  setTimeout(function() { RHP.workDial?.setInteractionUnlocked?.(true); }, 300);
}
```

### 6. `work-dial.js` — handoff init reads bgSrc

In the handoff block, if `bgSrc` is provided, set it on `originalBgEl` before calling `applyActive`:

```js
if (RHP.videoState?.caseHandoff) {
  const h = RHP.videoState.caseHandoff;
  if (h.bgSrc && originalBgEl && originalBgEl.src !== h.bgSrc) {
    originalBgEl.src = h.bgSrc;
  }
  // ... existing handoff logic ...
  waitForPoolReady(); // replaces setTimeout
}
```

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| User navigates home → work without interacting (IDLE state) | No handoff — caseHandoff is null. Work page loads normally. |
| Pool buffers slowly (slow connection) | 3s safety timeout unlocks interaction. User sees slight delay before dial responds. |
| User moves mouse before pool ready | Mouse events are ignored (`interactionUnlocked = false`). Videos play, no crash. |
| Second visit (home → work → home → work) | Handoff captured fresh on each departure. Previous handoff overwritten. |
| `prefers-reduced-motion` | Skip crossfade animations on unlock; snap to target state immediately. |

---

## Files Changed

| File | Change |
|------|--------|
| `work-dial.js` | Add `freeze()`, `isAlive()`; `waitForPoolReady()` (replaces setTimeout); handoff reads `bgSrc`; version bump |
| `orchestrator.js` | `rhp-core.beforeLeave` → freeze + defer destroy to enter; `runAfterEnter` case handoff seek + dialFg fade; `case-to-home.beforeLeave` captures bgSrc; remove 300ms setTimeout; version bump |

---

## Testing

After deploy + jsDelivr hash update:

```bash
npm run test:smoke
```

Manual checks:
- [ ] Home → Work: fg video keeps playing through transition, no black frame
- [ ] Home → Work: work page hero video arrives at correct time (T + 0.6s)
- [ ] Work → Home: dial shows last-visited project fg + bg immediately
- [ ] Work → Home: interaction locked during pool buffering (hover has no effect)
- [ ] Work → Home: interaction unlocks when pool ready (hover works, sector switching works)
- [ ] Work → Home: if mouse outside threshold on unlock → crossfade to IDLE generic video
- [ ] Work → Home: if mouse inside threshold on unlock → stays ACTIVE, normal behaviour
- [ ] All of the above repeatable on second/third visit (no degradation)
