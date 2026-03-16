# Spec: Video Persistence During Home↔Case Transitions

**Slug:** `rhp-video-transition-cluster`
**Client:** ready-hit-play-prod
**Status:** Planning
**Created:** 2026-03-13

---

## Bugs Covered

| ID | Priority | Summary |
|----|----------|---------|
| `rhp-video-persistence-home-work-transition` | P0 | BG + FG videos destroyed during home↔case transitions |
| `rhp-foreground-video-rectangular-work-transition` | P0 | FG video stays circular during home→case morph (should snap to rectangular) |
| `rhp-work-page-video-autoplay-after-barba` | P0 | Videos don't autoplay after Barba transition |
| `rhp-video-pool-switching-after-barba` | P1 | Pool switching inconsistent after round-trip transition |

---

## Context

The dial `.dial_component` persists **outside** the Barba container (namespace restructure shipped 2026-03-12). Video elements *could* survive transitions — but `work-dial.destroy()` explicitly removes them from the DOM in `beforeLeave`, then `work-dial.init()` recreates everything from scratch in `afterEnter`.

**Note:** "work" pages are renamed case studies. Barba namespace is still `case`. `data-dial-ns` values are `home` and `work`.

---

## Root Cause

In `orchestrator.js`, the `beforeLeave` hook calls `RHP.views[ns].destroy()` which triggers `work-dial.destroy()`. The destroy cleanup array:
1. Removes `poolPrev`, `poolNext`, `bgPoolPrev`, `bgPoolNext` (4 off-screen pool videos)
2. Removes `bgVisible` (the blurred background video in `.dial_layer-bg`)
3. Removes `genericVideo` (the IDLE state looping video)
4. Cancels all RAF loops (draw, drift monitor)
5. Removes all event listeners

This happens **before** `leave()` runs the morph animation (`runDialExpandAnimation` / `runDialShrinkAnimation`), so the morph animates an empty dial.

On re-entry, `work-dial.init()` recreates all elements from scratch, but:
- Pool references are fresh — no preloaded adjacent videos (bug #4)
- Autoplay may fail because `play()` calls race with element creation (bug #3)
- The `caseHandoff` mechanism saves time/index but can't prevent the visual gap (bug #1)
- `dial_video-wrap` gets `borderRadius: 999` pinned during morph — never transitions to rectangular (bug #2)

---

## Solution: Suspend/Resume Pattern

### Architecture

Add `suspend()` and `resume()` methods to `work-dial.js` for home↔case transitions only. Full `destroy()` remains for home→about/contact.

```
beforeLeave (home→case):  RHP.workDial.suspend()   ← NEW
leave:                     runDialExpandAnimation()  (videos visible during morph)
afterEnter (case):         videos already playing, no action needed

beforeLeave (case→home):  capture caseHandoff state
leave:                     runDialShrinkAnimation()
afterEnter (home):         RHP.workDial.resume()     ← NEW

beforeLeave (home→about): RHP.workDial.destroy()     (unchanged)
```

### `suspend()` — what it does

1. **Pause playback** — pause `visibleVideo`, `bgVisible`, `genericVideo`
2. **Stop RAF loops** — cancel draw loop and drift monitor
3. **Remove event listeners** — pointer/touch/wheel handlers
4. **Keep all DOM elements in place** — no `.remove()` calls
5. **Set `suspended = true` flag** — guard against re-entry
6. **Save current state** — `saveVideoStateToIndex()` for active sector

### `resume(handoff)` — what it does

1. **Re-attach event listeners** — pointer/touch/wheel
2. **Restart RAF loops** — draw loop and drift monitor
3. **Apply handoff if provided** — seek to `handoff.currentTime`, set active index
4. **Resume playback** — `playPaired()` on fg + bg
5. **Set `suspended = false`**
6. **Pool preload** — preload adjacent sectors for immediate switching

### `destroy()` — unchanged

Still removes all DOM elements, used only for transitions to about/contact.

---

## Implementation Steps

### Step 1: Add `suspend()` to work-dial.js

**File:** `projects/ready-hit-play-prod/work-dial.js`

Add a new function after `destroy()`:

```js
function suspend() {
  if (!alive || suspended) return;
  suspended = true;

  // Save state for active sector
  if (visibleVideo && typeof state.lastIndex === 'number') {
    saveVideoStateToIndex(visibleVideo, state.lastIndex);
    saveVideoStateToIndex(bgVisible, state.lastIndex);
  }

  // Pause all videos (don't remove)
  [visibleVideo, bgVisible, genericVideo, poolPrev, poolNext, bgPoolPrev, bgPoolNext]
    .forEach(v => { if (v && !v.paused) v.pause(); });

  // Stop RAF loops
  stop();                    // draw loop
  stopDriftMonitorGlobal();  // drift monitor

  // Remove interaction listeners (stored in a separate array from cleanup)
  suspendListeners.forEach(fn => fn());

  interactionUnlocked = false;
}
```

Expose on `RHP.workDial`: `suspend`.

### Step 2: Add `resume()` to work-dial.js

```js
function resume(handoff) {
  if (!alive || !suspended) return;
  suspended = false;

  // Re-attach interaction listeners
  reattachListeners();

  // If handoff provided, apply it
  if (handoff && typeof handoff.index === 'number') {
    RHP.videoState.byIndex[handoff.index] = {
      currentTime: handoff.currentTime,
      paused: false
    };
    applyActive(handoff.index);

    // Force exact seek
    if (visibleVideo) try { visibleVideo.currentTime = handoff.currentTime; } catch(e) {}
    if (bgVisible && bgVisible.tagName === 'VIDEO') try { bgVisible.currentTime = handoff.currentTime; } catch(e) {}
  }

  // Resume playback
  if (visibleVideo && bgVisible) playPaired(visibleVideo, bgVisible);

  // Restart RAF loops
  if (dialState === DIAL_STATES.ACTIVE || dialState === DIAL_STATES.ENGAGED) {
    startDriftMonitorGlobal();
  }
  start(); // draw loop

  // Preload adjacent pool slots
  preloadAdjacentSlots(state.lastIndex);

  interactionUnlocked = true;
}
```

Expose on `RHP.workDial`: `resume`.

### Step 3: Separate interaction listeners from cleanup array

Currently all listeners are registered via `on()` and pushed to the single `cleanup` array. Refactor:

- Create `suspendListeners = []` — for pointer/touch/wheel/resize handlers (things that should detach on suspend)
- Keep `cleanup = []` — for DOM removal only (runs in destroy)
- `on()` helper gains a `{ suspend: true }` option to route to the right array

### Step 4: Update orchestrator.js beforeLeave — home→case

**File:** `projects/ready-hit-play-prod/orchestrator.js`

In the home→case `beforeLeave` hook, replace:
```js
if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
```
with:
```js
// Suspend work-dial (keep videos alive for morph animation)
if (ns === 'home' && RHP.workDial?.suspend) {
  RHP.workDial.suspend();
} else if (ns && RHP.views[ns]?.destroy) {
  RHP.views[ns].destroy();
}
```

Also capture handoff state BEFORE suspend:
```js
const fgVideo = document.querySelector('.dial_fg-video');
const idx = RHP.workDial.getActiveIndex();
if (fgVideo && typeof idx === 'number') {
  RHP.videoState.caseHandoff = {
    index: idx,
    currentTime: fgVideo.currentTime || 0,
    transitionDuration: 0.6
  };
}
```

### Step 5: Update orchestrator.js afterEnter — case→home return

In the case→home `afterEnter`, replace full `RHP.views.home.init()` with:
```js
if (RHP.workDial?.resume) {
  const handoff = RHP.videoState.caseHandoff;
  RHP.workDial.resume(handoff);
  RHP.videoState.caseHandoff = null;
} else {
  RHP.views.home.init(container);
}
```

### Step 6: Fix FG video shape — snap to rectangular

**File:** `projects/ready-hit-play-prod/orchestrator.js` — `runDialExpandAnimation()`

Currently pins `dial_video-wrap` with `borderRadius: 999`. Change to:
```js
if (videoWrap && vRect) {
  gsap.set(videoWrap, {
    width: vRect.width,
    height: vRect.height,
    borderRadius: 0           // ← snap to rectangular immediately
  });
}
```

This makes the fg video rectangular from the moment the morph begins.

### Step 7: Ensure autoplay on case page enter

**File:** `projects/ready-hit-play-prod/orchestrator.js` — `runAfterEnter()`

After Barba swaps the container for case pages, explicitly play the case hero video:
```js
if (ns === 'case') {
  const caseVideo = container.querySelector('.section_case-video video')
    || container.querySelector('video');
  if (caseVideo) {
    caseVideo.play().catch(() => {});
  }
}
```

Also ensure the dial fg video keeps playing during the morph (it was suspended, not destroyed, so it should still be playing — but add a safety `play()` call in `runDialExpandAnimation` onComplete).

### Step 8: Fix pool references on resume

In `resume()`, after applying handoff, trigger pool preload for adjacent sectors:
```js
function preloadAdjacentSlots(idx) {
  const prevIdx = (idx - 1 + sectors.length) % sectors.length;
  const nextIdx = (idx + 1) % sectors.length;

  setVideoSourceAndPoster(poolPrev, sectors[prevIdx].video, sectors[prevIdx].poster);
  setVideoSourceAndPoster(poolNext, sectors[nextIdx].video, sectors[nextIdx].poster);
  setVideoSourceAndPoster(bgPoolPrev, sectors[prevIdx].video, sectors[prevIdx].poster);
  setVideoSourceAndPoster(bgPoolNext, sectors[nextIdx].video, sectors[nextIdx].poster);

  poolPrevIdx = prevIdx;
  poolNextIdx = nextIdx;
}
```

This ensures pool is warm immediately after resume, fixing bug #4.

---

## Barba Impact

### 1. Init/Destroy lifecycle
- `suspend()` replaces `destroy()` for home→case transitions only
- `resume()` replaces `init()` for case→home returns only
- `destroy()` still used for home→about/contact
- `init()` still used for fresh home loads and direct-land

### 2. State survival
- Video elements persist in DOM across home↔case transitions (no removal)
- `RHP.videoState.caseHandoff` still captures time+index for seek on resume
- Pool preload state survives (elements not removed)

### 3. Transition interference
- Videos remain visible during morph — this is the desired behavior
- `bgVisible` stays in `.dial_layer-bg` (outside Barba container) — no conflict
- `visibleVideo` stays in `.dial_video-wrap` inside `.dial_layer-fg` — morphs with the dial
- FG video snaps to rectangular (`borderRadius: 0`) at morph start

### 4. Re-entry correctness
- home→case→home: `resume()` with handoff — clean re-entry
- home→case→about→home: case `destroy()` + fresh `init()` — no suspend involved
- home→about→home: full `destroy()` + fresh `init()` — unchanged
- Multiple round-trips: each suspend/resume pair is stateless (no accumulated drift)

### 5. Namespace scoping
- `suspend()`/`resume()` only activates for `home` namespace in orchestrator
- `destroy()` path unchanged for `about`, `contact`, `case` (when leaving case for non-home)

---

## Edge Cases

| Scenario | Expected behavior |
|----------|-------------------|
| home→case→about | `suspend()` on home leave, then `destroy()` on case leave (video pool cleaned up at this point) |
| home→case→home→case (rapid) | suspend → resume → suspend cycle, each idempotent |
| Direct-land on case page | No suspend needed — `init()` runs fresh when navigating case→home |
| `prefers-reduced-motion` | Same suspend/resume, but skip morph animation (instant state change) |
| iOS autoplay restrictions | Videos were already playing before suspend — `resume()` calls `play()` which should succeed since user has already interacted |

---

## Files Changed

| File | Change |
|------|--------|
| `work-dial.js` | Add `suspend()`, `resume()`, refactor listener registration |
| `orchestrator.js` | Update beforeLeave/afterEnter for home↔case, fix borderRadius in expand animation |

---

## Parallelisation Map

| Stream | Tasks | Agent | Est. time | Est. tokens |
|--------|-------|-------|-----------|-------------|
| A | Steps 1-3 (work-dial suspend/resume + listener refactor) | code-writer | 25 min | 15k |
| B | Steps 4-5 (orchestrator beforeLeave/afterEnter) | code-writer | 15 min | 8k |
| C | Steps 6-7 (borderRadius fix + autoplay) | code-writer | 10 min | 5k |

**Dependencies:** B depends on A (orchestrator calls suspend/resume). C is independent.
**Recommendation:** Run A first, then B+C in parallel. No worktrees needed (changes in 2 files only).

---

## Verification

1. **Local dev:** Start local server (`/local`), test on rhpcircle.webflow.io with local script override
2. **Manual checks:**
   - home→case: video stays visible during dial morph, fg snaps to rectangular
   - case→home: video resumes at correct time, pool switching works on first sector change
   - home→case→home→case: no stale elements, no memory leak (check DevTools video count)
   - home→about→home: full destroy/init cycle still works
3. **Automated:** Run `npm run test:smoke` after pushing to verify no regressions
4. **Console:** Zero errors during all transition paths (`DEBUG && console.log` only)

---

## Acceptance Tests

| Test | Type | Page/Action | Assertion |
|------|------|-------------|-----------|
| Videos persist during home→case morph | Hard | Navigate home→case | `.dial_fg-video` and `.dial_bg-video` remain in DOM throughout transition |
| FG video is rectangular during morph | Hard | Navigate home→case | `.dial_video-wrap` has `borderRadius: 0` (not 999) during morph |
| Case page video autoplays | Hard | Navigate home→case | `.section_case-video video` is playing (not paused) within 2s of page load |
| Videos resume on case→home return | Hard | Navigate home→case→home | `.dial_fg-video` and `.dial_bg-video` are playing, time offset matches handoff |
| Pool switching works after round-trip | Hard | Navigate home→case→home, change sector | Sector change shows correct video within 500ms |
| No console errors on transition | Hard | All transition paths | Zero `console.error` entries |
| Full destroy still works for about | Hard | Navigate home→about | `work-dial.destroy()` called, pool videos removed from DOM |
| prefers-reduced-motion respected | Hard | Set reduced motion, navigate | No morph animation, state changes instantly |
