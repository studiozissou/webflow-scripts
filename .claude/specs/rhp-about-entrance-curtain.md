# RHP — About Page Entrance Curtain & Content Reveal

**Slug:** `rhp-about-entrance-curtain`
**Client:** Ready Hit Play
**Status:** Ready to Build
**Priority:** P1
**Created:** 2026-04-23

---

## Summary

Replace the current home/work → about slide transition (horizontal xPercent slide) with a two-phase curtain + content reveal:

1. **Curtain phase (1.5s):** A fullscreen overlay (`--_primitives---colors--midnight-darker`) slides from off-screen left (`x: -100vw`, `opacity: 0`) to cover the viewport (`x: 0`, `opacity: 1`) using `power4.out`.
2. **Content reveal phase (2s):** Once the about page loads, above-fold content enters with SplitText line-by-line stagger — sliding up (`y` + `opacity`) in sequence.

The existing about → home/work animation (slide out left) is unchanged. Reset logic ensures clean re-entry on repeat navigation cycles.

---

## Approach

**Approach A: Extend `home-about-slide.js`** — the existing module gains state (curtain DOM element + gsap.context for SplitText) and three new responsibilities: curtain animation, content reveal, and reset. No new files.

---

## Architecture

### Files Modified

| File | Changes |
|------|---------|
| `home-about-slide.js` | Add curtain element creation, `animateCurtainIn()`, `revealAboutContent()`, `resetCurtain()`. Rewrite `leaveHomeToAbout()` to use curtain instead of xPercent slide. Module becomes stateful (curtain ref, gsap.context ref). |
| `orchestrator.js` | Lines 1807-1822 (home-to-about): add `RHP.homeAboutSlide.resetCurtain()` call in `beforeLeave`. Lines 1833-1835 (about-to-home `beforeLeave`): add `RHP.homeAboutSlide.resetCurtain()` before `views.about.destroy()`. Lines 1861-1888 (work-to-about): same `resetCurtain()` in `beforeLeave`. Lines 1897-1901 (about-to-work `beforeLeave`): same. |

### New Module API (home-about-slide.js)

```js
RHP.homeAboutSlide = {
  leaveHomeToAbout(data),    // REWRITTEN — curtain in + content reveal
  leaveAboutToHome(data),    // UNCHANGED — slide out left
  resetCurtain(),            // NEW — reset curtain + revert SplitText for clean re-entry
  version
};
```

### Curtain DOM Element

Created once in the IIFE scope on module load:

```js
const curtainEl = document.createElement('div');
curtainEl.className = 'rhp-about-curtain';
curtainEl.style.cssText = [
  'position: fixed',
  'inset: 0',
  'z-index: 5',                    // above dial (z:3-4), below cursor (z:9999)
  'pointer-events: none',
  'will-change: transform, opacity'
].join(';');
// Background set via CSS var with fallback
const bg = getComputedStyle(document.documentElement)
  .getPropertyValue('--_primitives---colors--midnight-darker').trim() || '#090014';
curtainEl.style.background = bg;
document.body.appendChild(curtainEl);
// Initial hidden state
gsap.set(curtainEl, { x: '-100vw', opacity: 0, display: 'none' });
```

**Placement:** Appended to `document.body`, outside the Barba container, so it survives container swaps.

**z-index: 5** — above `.dial_component` (z:3), above `.nav_contact-pullout` (z:4), below `.cursor_component` (z:9999), below `.section_contact` (z:99).

### Phase 1: Curtain Animation (in `leaveHomeToAbout`)

```
Timeline:
0.00s ────── curtain display:block, gsap.fromTo x:-100vw,opacity:0 → x:0,opacity:1
              ease: power4.out, duration: 1.5s
1.50s ────── curtain covers viewport, Barba resolves enter() Promise
              → afterEnter fires → runAfterEnter → views.about.init()
              → aboutIconScale.init() runs (double-rAF measures heights)
```

The `enter()` hook returns a Promise that resolves when the curtain animation completes. This keeps the about page hidden behind the curtain during the DOM swap.

### Phase 2: Content Reveal (triggered from `afterEnter`)

After `runAfterEnter()` completes (which calls `views.about.init()` → `aboutIconScale.init()`), the content reveal begins. This is sequenced by calling `RHP.homeAboutSlide.revealAboutContent(container)` at the end of `runAfterEnter` when the target namespace is `about`.

**Critical sequencing:** `aboutIconScale.init()` uses a double-rAF to measure `.about_r-link`, `.about_header`, and `.accordion-title` heights. SplitText must NOT fire until after those measurements complete. The curtain covers the page during this measurement window, so there is no visual artifact.

**Implementation:**

```
1. Wait 2 rAFs (match aboutIconScale timing) — measurements are done
2. Collect animation targets in DOM order:
   a. container.querySelector('.about_r-link')
   b. container.querySelectorAll('.about_header h2, .about_header p')
   c. container.querySelectorAll('.accordion-title h2')
3. Flatten into ordered array: [rLink, h2, p, accordH2×4] = 7 elements
4. gsap.context(() => { ... }, container):
   a. Pre-hide: gsap.set(allTargets, { opacity: 0, y: 30 })
   b. For each target:
      - If text element (h2 or p): SplitText type:'lines', set lines yPercent:100, opacity:0
      - If .about_r-link: no SplitText, just y+opacity
   c. Animate curtain OUT: gsap.to(curtainEl, { x: '100vw', opacity: 0, duration: 0.6, ease: 'power2.in' })
      → then display:none
   d. Stagger content in (starts 0.2s after curtain begins leaving):
      - Each element: opacity:1, y:0, duration: 0.5
      - SplitText lines within each element: yPercent:0, opacity:1, duration: 0.4, stagger: 0.08
      - Inter-element delay: calculated to fill 2s total across 7 elements
        → approx stagger: 2.0 / 7 ≈ 0.285s per element
5. Total visible animation: ~2.6s (0.6s curtain out + 2s content stagger, overlapping by 0.2s)
```

### Content Targets (in DOM order)

| # | Selector | Type | SplitText? |
|---|----------|------|-----------|
| 1 | `.about_r-link` | SVG link | No — animate as block (y + opacity) |
| 2 | `.about_header h2` | "Goosebumps don't lie." | Yes — SplitText lines |
| 3 | `.about_header p` | Body copy (2 visual lines via `<br>`) | Yes — SplitText lines |
| 4 | `.accordion-title:nth-child(1) h2` | "What we know" | Yes — SplitText lines (1 line) |
| 5 | `.accordion-title:nth-child(2) h2` | "WHERE IT COMES FROM" | Yes — SplitText lines (1 line) |
| 6 | `.accordion-title:nth-child(3) h2` | "WHY READY HIT PLAY EXISTS" | Yes — SplitText lines (1 line) |
| 7 | `.accordion-title:nth-child(4) h2` | "Services" | Yes — SplitText lines (1 line) |

### Reset Logic (`resetCurtain()`)

Called in `beforeLeave` of every transition that leaves the about page (about-to-home, about-to-work), AND in `beforeLeave` of every transition entering about (home-to-about, work-to-about) for idempotency:

```js
function resetCurtain() {
  // Revert SplitText DOM mutations
  if (revealCtx) { revealCtx.revert(); revealCtx = null; }
  // Reset curtain position for next use
  if (curtainEl && gsap) {
    gsap.set(curtainEl, { x: '-100vw', opacity: 0, display: 'none' });
  }
}
```

### Prefers-Reduced-Motion

If `prefers-reduced-motion: reduce`:
- Skip curtain animation entirely
- Set all content targets to visible immediately (no SplitText, no stagger)
- Same as current behaviour: instant transition

### Work → About Path

The `work-to-about` transition already `await`s `runDialShrinkAnimation()` in `leave()`. The curtain fires in `enter()` AFTER the shrink completes. Sequence:

```
leave():  await runDialShrinkAnimation()  — dial shrinks to small
enter():  curtain slides in (1.5s)        — covers shrunk dial
afterEnter(): runAfterEnter → content reveal (2s)
```

### About → Home/Work (UNCHANGED)

The existing `leaveAboutToHome(data)` remains as-is: the about container slides out left (`xPercent: -100`, 0.75s, power3.out). `resetCurtain()` is called in `beforeLeave` to revert any SplitText and hide the curtain for the next inbound transition.

---

## Barba Impact

1. **Init/Destroy lifecycle:** The module gains state (curtain DOM element + `revealCtx` gsap.context). `resetCurtain()` acts as the destroy path for this state and must be called in `beforeLeave` of about-to-home and about-to-work transitions.

2. **State survival:** The curtain element lives on `document.body` (outside Barba container) and persists across all transitions. It is reset to off-screen hidden state after each use. No cross-transition state needs to survive.

3. **Transition interference:** The curtain uses `z-index: 5`, sitting above the dial layers but below cursor and contact pullout. During the 1.5s curtain-in phase, the about page DOM swap happens invisibly behind the curtain. The curtain slides OUT (to +100vw) during content reveal, so it doesn't interfere with the about page interaction layer.

4. **Re-entry correctness:** `resetCurtain()` is called in `beforeLeave` of every about-exiting transition AND in `beforeLeave` of every about-entering transition. This ensures: SplitText DOM mutations are reverted (`.revert()`), curtain is at `x: -100vw, display: none`, no stale listeners or doubled nodes. Tested path: home → about → home → about must show the full curtain + reveal sequence both times.

5. **Namespace scoping:** Curtain animation fires only in `home-to-about` and `work-to-about` transitions. Content reveal fires only when `runAfterEnter` detects `ns === 'about'`. The curtain element exists globally but is hidden (`display: none`) on all non-about-entering transitions.

---

## Task Breakdown

| # | Task | Agent | Est. LOC | Depends on |
|---|------|-------|----------|------------|
| 1 | Add curtain DOM element creation + `resetCurtain()` to `home-about-slide.js` | code-writer | 40 | — |
| 2 | Rewrite `leaveHomeToAbout()` to animate curtain in (power4.out, 1.5s) | code-writer | 25 | 1 |
| 3 | Add `revealAboutContent(container)` with SplitText lines + stagger | code-writer | 60 | 1 |
| 4 | Wire orchestrator: `resetCurtain()` in beforeLeave hooks + `revealAboutContent()` call in afterEnter for about namespace | code-writer | 30 | 1,2,3 |
| 5 | Add prefers-reduced-motion bypass to curtain + reveal paths | code-writer | 10 | 2,3 |
| 6 | Test: run acceptance tests | qa | — | 4,5 |

### Parallelisation Map

**Stream A (tasks 1-3):** All in `home-about-slide.js` — sequential within this file.
**Stream B (task 4):** Orchestrator wiring — depends on Stream A completion.
**Task 5:** Can be done alongside task 2 or 3.

**Recommendation:** Sequential build — all changes are in 2 files with tight dependencies. No worktrees needed. Single code-writer agent.

---

## Verify Loop

### Pass/fail criteria

1. **Curtain appears:** On home → about click, a dark overlay slides in from the left covering the full viewport within 1.5s
2. **Content reveals:** After curtain covers viewport, about page content (R-link, header text, accordion titles) animates in with visible line-by-line stagger over 2s
3. **Curtain exits:** The curtain slides out to the right during content reveal, becoming invisible
4. **About → home unchanged:** Clicking back to home from about still slides the about container out to the left (xPercent -100)
5. **Re-entry clean:** home → about → home → about shows the full curtain + reveal sequence both times, no doubled DOM nodes, no stuck elements
6. **Work → about:** Same curtain + reveal after dial shrink animation
7. **No console errors:** Zero JS errors throughout all transition paths
8. **Reduced motion:** With `prefers-reduced-motion: reduce`, all content is immediately visible, no animation
9. **aboutIconScale:** CSS vars (`--top-offset`, `--header-height`, `--titles-height`) are correctly set after reveal (R glyph fills viewport height minus offsets)

### Reproduction steps

1. Navigate to `https://rhpcircle.webflow.io/` (home)
2. Wait for RHP scripts to load (`window.RHP.scriptsOk === true`)
3. Click the about link in the nav
4. Observe: dark curtain slides in from left → about content reveals with stagger
5. Click logo/home link to return home
6. Click about again — should show full animation sequence again
7. Navigate to any case study page, then click about link — same curtain + reveal
8. Test with reduced motion enabled in OS/browser settings

### Tier mapping

- **Tier 1 (Playwright):** Tests 1, 2, 5, 7, 8 — see acceptance tests below
- **Tier 2 (Registry):** All Tier 1 tests registered for regression
- **Tier 3 (Manual):** Tests 3 (curtain exit direction — visual), 4 (about→home feel), 9 (aboutIconScale measurement accuracy — requires visual inspection of R glyph sizing)

### Regression scope

- About → home transition must still work (xPercent slide out left)
- About → work transition must still work (dial expand)
- aboutIconScale CSS vars must be correct after content reveal
- aboutDialTicks must render correctly
- No interference with contact pullout (z-index layering)
- Cursor must remain visible above curtain during transition

---

## Acceptance Tests

### Tier 1 — Auto: Playwright

| Test | Asserts |
|------|---------|
| `curtain element exists after RHP init` | `.rhp-about-curtain` attached to DOM |
| `no JS errors on home → about transition` | Zero `pageerror` events |
| `curtain is visible during home → about` | `.rhp-about-curtain` has `display: block` and `opacity > 0` mid-transition |
| `about content visible after transition` | `.about_r-link`, `.about_header h2`, `.accordion-title h2` all visible after 4s |
| `no JS errors on work → about transition` | Navigate to case page first, then about — zero errors |
| `re-entry: home → about → home → about clean` | No doubled `.rhp-about-curtain`, content visible both times |
| `reduced motion: content immediately visible` | With `reducedMotion: 'reduce'`, all targets have `opacity: 1` after transition |
| `about → home still works` | About container reaches `xPercent: -100` or equivalent, home page loads clean |

### Tier 3 — Manual

| Check | Why manual |
|-------|-----------|
| Curtain easing feels like power4.out | Subjective animation quality |
| Content stagger timing feels natural at 2s | Subjective timing assessment |
| Curtain exits to right smoothly | Visual direction verification |
| aboutIconScale R glyph fills correctly | Requires visual measurement of viewport-fill calculation |
| Animation looks correct on Safari/Firefox | Playwright only runs Chromium |
| Mobile viewport: curtain covers full screen including safe areas | Requires real device testing |
