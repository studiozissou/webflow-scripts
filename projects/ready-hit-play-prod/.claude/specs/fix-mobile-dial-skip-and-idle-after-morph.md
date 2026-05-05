# fix-mobile-dial-skip-and-idle-after-morph

> Mobile homepage: dial tap skips word cycle to morph; dial starts IDLE after morph, first tap anywhere activates.

**Status:** Ready to Build
**Priority:** P1
**Agent:** code-writer
**Created:** 2026-05-05
**Approach:** Document Listener (Approach C)
**Files:** `home-scroll-morph.js` only (~25 LOC net change)

---

## Problem

### Feature 1 — Dial tap to skip word cycle doesn't work on mobile
The `onDialTap` click listener exists at `home-scroll-morph.js:669–679` but doesn't fire reliably on mobile because:
- `click` events have a ~300ms delay on mobile Safari/Chrome
- The word cycle may auto-complete or scroll-interrupt before the delayed click arrives
- Need to use `pointerdown` instead of `click` for immediate mobile response

### Feature 2 — Dial forced to ACTIVE immediately after morph
`onMorphComplete()` calls `RHP.workDial.forceActive()` at line 852, which:
- Sets `dialState = ACTIVE` and `_mobileActiveLocked = true` immediately
- Shows fg/bg project video with no user interaction
- User sees active state (project video, title text) when they expect idle state (generic video, "Step into the circle")

**Expected behaviour:** After morph completes on mobile, dial should be in IDLE state showing default text and generic video. First tap anywhere on screen should activate the dial and lock it into ACTIVE.

---

## Solution

### Feature 1 — Swap `click` to `pointerdown` on dial tap skip

In `buildMobileTimeline()` (line 668–679):
- Replace `addEventListener('click', onDialTap)` → `addEventListener('pointerdown', onDialTap)`
- Replace both `removeEventListener('click', onDialTap)` calls → `removeEventListener('pointerdown', onDialTap)`

This gives immediate tap response on mobile (no 300ms delay).

### Feature 2 — Remove `forceActive()`, add one-time document listener

In `finalize()` (line 847–858):

1. **Remove** the `forceActive()` call (lines 851–854):
   ```js
   // DELETE:
   if (!_isDesktop() && RHP.workDial?.forceActive) {
     RHP.workDial.forceActive();
   }
   ```

2. **Add** a one-time `pointerdown` listener on `document` that activates on first tap:
   ```js
   if (!_isDesktop() && RHP.workDial?.forceActive) {
     _firstTapHandler = () => {
       _firstTapHandler = null;
       RHP.workDial.forceActive();
     };
     document.addEventListener('pointerdown', _firstTapHandler, { once: true });
   }
   ```

3. **Add** module-level variable:
   ```js
   let _firstTapHandler = null;
   ```

4. **Clean up** in `destroy()`:
   ```js
   if (_firstTapHandler) {
     document.removeEventListener('pointerdown', _firstTapHandler);
     _firstTapHandler = null;
   }
   ```

### Why this works correctly

- **IDLE visual state:** After morph, `_applyCompleteState(true)` sets `interactionUnlocked = true` but does NOT change dial state. Dial remains in IDLE (generic video, "Step into the circle" text, teal ticks).
- **First tap on dial:** Both the document listener AND `work-dial.js:onPointerDown` fire. `onPointerDown` sets `_justActivatedMobile = true` (400ms suppression) preventing accidental navigation on the activation tap. `forceActive()` from the document listener is idempotent (dial already ACTIVE from `onPointerDown`).
- **First tap outside dial:** Only the document listener fires. `forceActive()` activates the dial. No navigation risk (link is inside `.dial_layer-fg`).
- **Barba leave before first tap:** `destroy()` removes the document listener. `forceActive()` also guards on `alive` and `interactionUnlocked`.
- **ADR 001 compliance:** `work-dial.js` is completely unchanged. `home-scroll-morph.js` only calls the existing `forceActive()` public method.

---

## Files Changed

| File | Change | LOC |
|------|--------|-----|
| `home-scroll-morph.js` | Add `_firstTapHandler` var, swap click→pointerdown on dial skip, replace `forceActive()` with deferred document listener, cleanup in `destroy()` | ~25 |

---

## Barba Impact

1. **Init/Destroy lifecycle:** The one-time document `pointerdown` listener is added in `finalize()` and removed in `destroy()`. No DOM elements added.
2. **State survival:** No state needs to persist across transitions. The `_firstTapHandler` ref is module-scoped and reset in `destroy()`.
3. **Transition interference:** No animations or DOM mutations. The listener only calls `forceActive()` which changes internal work-dial state.
4. **Re-entry correctness:** On about→home return, `skipToEnd()` calls `_applyCompleteState(false)` which does NOT call `forceActive()` — the dial starts IDLE. The `_firstTapHandler` is NOT set on Barba re-entry (only on fresh morph complete with `isFirstRun = true`). Barba re-entry uses `onPointerDown` tap radius as before.
5. **Namespace scoping:** Only runs on `home` namespace, only on mobile (`!_isDesktop()`).

---

## Parallelisation Map

| Task | Agent | Est. LOC | Dependencies |
|------|-------|----------|--------------|
| 1. Implement both features | code-writer | ~25 | None |
| 2. Verify via Playwright | qa | — | Task 1 |

**Recommendation:** Sequential. Single file, small change. No parallelisation benefit.

---

## Verify Loop

### Pass/fail criteria
1. **Mobile (375×812):** Fresh load → word cycle plays → tap small dial → word cycle stops, morph plays
2. **Mobile (375×812):** Fresh load → word cycle + morph complete → dial is IDLE (generic video visible, "Step into the circle" text, no fg/bg project video)
3. **Mobile (375×812):** After morph complete → tap anywhere on screen → dial transitions to ACTIVE (project video visible, project title in step text)
4. **Mobile (375×812):** After first tap activation → dial stays ACTIVE permanently (`_mobileActiveLocked`)
5. **Desktop (1440×900):** Unchanged behaviour — scroll morph completes, no `forceActive()` on desktop (guard: `!_isDesktop()`)
6. **No console errors** on fresh load, morph complete, and first tap activation

### Reproduction steps
1. Navigate to `STAGING_URL/` at 375×812 viewport
2. Wait for intro sequence to complete and word cycle to begin (~3s)
3. Tap the small dial during word cycle → verify morph plays immediately
4. Wait for morph to complete (~1.5s) → verify dial shows IDLE state
5. Tap anywhere on screen → verify dial transitions to ACTIVE

### Tier mapping
- **Tier 1 (Playwright):** Tests 1–6 (see acceptance tests below)
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (Manual):**
  - iOS Safari: verify `pointerdown` fires on dial tap during word cycle (Playwright only runs Chromium)
  - Visual polish: verify IDLE→ACTIVE transition feels smooth and not jarring
  - Real device: verify on physical iPhone (iOS video autoplay + browser bar behaviour)

### Regression scope
- Desktop morph behaviour must not change
- About→home Barba transition (dial starts IDLE, `onPointerDown` activates) must not change
- Case→home handoff (dial starts ACTIVE via `resume()`) must not change

---

## Acceptance Tests

| # | Test name | Tier |
|---|-----------|------|
| 1 | no JS errors on mobile home load | Tier 1 |
| 2 | dial tap skips word cycle on mobile | Tier 1 |
| 3 | dial is IDLE after morph complete on mobile | Tier 1 |
| 4 | first tap anywhere activates dial on mobile | Tier 1 |
| 5 | dial stays ACTIVE after activation | Tier 1 |
| 6 | desktop morph unchanged — no forceActive on desktop | Tier 1 |
| 7 | reduced motion — morph completes, dial idle | Tier 1 |
| 8 | iOS Safari pointerdown on dial | Tier 3 |
| 9 | visual IDLE→ACTIVE transition feel | Tier 3 |
