# Spec: Fix About Page Logo Animation

**ID:** fix-about-logo-animation
**Type:** bug
**Priority:** P2
**Status:** planned
**Created:** 2026-02-27
**File:** `orchestrator.js` — `initAboutHeroLogoHover()`

---

## Context

The about page hero (`section_about-hero`) contains multiple `.about-hero_ready` items, each pairing a `.nav_logo-embed` SVG (READY / HIT / PLAY) with adjacent `.heading-style-h3` text elements. On desktop, hovering a logo SVG triggers a word-by-word reveal of the adjacent heading, plus an opacity and lift on the parent container.

Animation logic lives at `orchestrator.js:187–256` (`initAboutHeroLogoHover`).

---

## Bugs

### 1. Wrong animation direction (bottom-up → top-down)

**Current:** words initialise at `yPercent: 100` (below the line) and slide **up** into view on enter.
**Required:** words should initialise at `yPercent: -100` (above the line) and slide **down** into view on enter.
**Leave:** words exit **downward** (`yPercent: 0 → 100`) — preserves current exit direction, creating a clean "slide in from top, exit to bottom" pattern.

**Lines to change:**
- Init `gsap.set(split.words, { yPercent: 100, opacity: 0 })` → `yPercent: -100`
- `onEnter` reset (new, see bug 3): `gsap.set(split.words, { yPercent: -100, opacity: 0 })`
- Leave: keep `yPercent: 100` (exit downward — no change needed)

---

### 2. Animation speed too slow — increase by 25%

**Current durations:**
```js
const wordDuration = 0.8;
const wordStagger = 0.3;
const lineDelay  = 0.3;
// leaveDuration = wordDuration / 2 (auto-scales)
```

**Required (×0.75):**
```js
const wordDuration = 0.6;
const wordStagger  = 0.225;
const lineDelay    = 0.225;
```

`leaveDuration` is derived (`wordDuration / 2 = 0.3`) so it scales automatically.

---

### 3. Interrupted hover — animation appears pre-completed on re-enter

**Root cause:** `onEnter` does not kill existing tweens before starting new ones. If the user hovers out mid-enter (triggering leave tweens) then immediately re-hovers, `onEnter` fires new tweens alongside partially-completed leave tweens, causing unpredictable (often pre-completed) visual state.

**Fix:** At the top of `onEnter`:
1. `gsap.killTweensOf()` on `heroReady`, each `headingEl`, and each `split.words`
2. `gsap.set()` to reset all targets to their initial hidden state:
   - `heroReady`: `{ opacity: 0.4, y: 0 }`
   - `headingEl`: `{ opacity: 0 }`
   - `split.words`: `{ yPercent: -100, opacity: 0 }`
3. Then start the enter tweens as before

This guarantees a full, clean animation on every hover-in regardless of prior state.

---

## Implementation

**Single file:** `orchestrator.js`
**Function:** `initAboutHeroLogoHover()` (lines ~187–257)
**Agent:** code-writer

### Pseudocode — revised `onEnter`
```js
const onEnter = () => {
  // 1. Kill any in-flight tweens
  gsap.killTweensOf(heroReady);
  headingSplits.forEach(({ split, headingEl }) => {
    gsap.killTweensOf(headingEl);
    if (split.words?.length) gsap.killTweensOf(split.words);
  });

  // 2. Reset to initial hidden state (ensures full restart)
  gsap.set(heroReady, { opacity: 0.4, y: 0 });
  headingSplits.forEach(({ split, headingEl }) => {
    gsap.set(headingEl, { opacity: 0 });
    if (split.words?.length) gsap.set(split.words, { yPercent: -100, opacity: 0 });
  });

  // 3. Animate in
  gsap.to(heroReady, { opacity: 1, duration: 0.3, ease: 'linear' });
  gsap.to(heroReady, { y: '-1.5rem', duration: 0.5, ease: 'power3.out' });
  headingSplits.forEach(({ split, headingEl }, idx) => {
    const delay = idx * lineDelay;
    gsap.to(headingEl, { opacity: 1, duration: wordDuration, ease: 'power4.out', delay });
    if (split.words?.length) {
      gsap.to(split.words, { yPercent: 0, opacity: 1, duration: wordDuration, ease: 'power4.out', stagger: wordStagger, delay });
    }
  });
};
```

### Pseudocode — revised `onLeave` (no structural change, just verify exit direction)
```js
// Leave: words exit downward (yPercent → 100) — unchanged
gsap.to(split.words, { yPercent: 100, opacity: 0, duration: leaveDuration, ease: 'power4.out' });
```

---

## Acceptance Criteria

- [ ] Hovering a READY/HIT/PLAY logo SVG reveals words sliding **down** (top-to-bottom), not up
- [ ] Animation completes visibly faster (~25%) than before
- [ ] Hovering out mid-animation and immediately re-hovering triggers a **full restart** of the animation from hidden state
- [ ] Leave animation: words exit downward cleanly, no flicker
- [ ] `prefers-reduced-motion` still exits early (existing guard is in the `init` function)
- [ ] No regressions on team hover or text-lines scroll animations
- [ ] Barba cleanup (`destroy()`) still reverts SplitText and removes listeners correctly

---

## Out of Scope

- Mobile scroll-triggered version (separate ticket)
- Transition logo animation (home↔about Barba transitions) — untouched
