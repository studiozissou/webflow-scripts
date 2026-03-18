# Spec: RHP Mobile — Homepage & Work/Case Pages

**Slug:** `rhp-mobile-home-work`
**Project:** `ready-hit-play-prod`
**Priority:** P1
**Status:** Planning
**Created:** 2026-03-18
**Covers queue items:** `rhp-dial-mobile-upgrade`, `rhp-mobile-responsiveness` (partial — home + work/case only), `rhp-mobile-autoplay-video-fallback` (out of scope, noted)

---

## Summary

Make the RHP homepage and work/case pages fully responsive at ≤991px. The design goal is to keep proportions visually similar to the 1280px desktop layout, scaled down fluidly. Key changes:

1. **Fluid rem scaling** — update `html font-size` calc breakpoints for ≤991px
2. **Homepage dial** — bump to ~85vw on mobile, scroll-to-rotate (1:1 direct mapping), white dot HTML indicator
3. **Mobile video sources** — JS reads `data-video-mobile` / `data-video-bg-mobile` from CMS items when on mobile, falls back to `data-video` / `data-video-bg`
4. **Work/case page layout** — full-screen content, main height = `100dvh - nav height` (JS-measured), `.dial_layer-ui` hidden
5. **Intro sequence** — identical to desktop on mobile

---

## Scope

### In scope
- Homepage: fluid scaling, dial sizing, scroll rotation, white dot indicator, mobile video sources, intro sequence, project info tap-to-navigate
- Work/case pages: full-screen layout, nav peek, `.dial_layer-ui` hidden, content sizing
- Responsive CSS for ≤991px, ≤767px, ≤479px breakpoints

### Out of scope
- About page mobile (separate story — `rhp-about-mobile`)
- Autoplay fallback / "tap to play" messaging (`rhp-mobile-autoplay-video-fallback` — separate)
- CMS field creation (handled by `feat-work-cms-mobile-video-fields` spec)
- Contact page (no changes needed — already responsive)
- Poster fallback for poor connections (separate story)

---

## Technical Design

### 1. Fluid rem scaling (CSS)

**File:** `ready-hit-play.css` (lines 7–9)

Update the `html font-size` calc values for mobile breakpoints. The goal: at 991px viewport, proportions match what 1280px looks like, scaled down. At 390px, still readable but proportionally smaller.

```css
/* Existing — keep */
html { font-size: calc(0.7416576964477932rem + 0.21528525296017226vw); }
@media screen and (max-width:1920px) { html { font-size: calc(0.7416576964477933rem + 0.21528525296017226vw); } }

/* Update — steeper curve below 992px */
@media screen and (max-width:992px) {
  html { font-size: calc(0.6246215943491423rem + 0.6054490413723511vw); }
}
@media screen and (max-width:767px) {
  html { font-size: calc(0.5rem + 0.8vw); }
}
```

Values need visual testing — these are starting points. The `calc(a + b*vw)` formula means at 390px: `0.5rem + 0.8*3.9px = 8px + 3.12px = 11.12px` base font-size.

### 2. Homepage dial sizing (CSS)

**File:** `ready-hit-play.css`

Update `--dial-large-width` / `--dial-large-height` for mobile:

```css
@media (max-width: 991px) {
  :root {
    --dial-large-width: min(85vw, 85svh);
    --dial-large-height: min(85vw, 85svh);
  }
}
```

This gives ~331px at 390px viewport (vs current 273px). Capped by svh so it doesn't overflow on landscape.

### 3. Scroll-to-rotate dial (JS)

**File:** `work-dial.js`

The existing `onPointerDown`/`onPointerMoveMobile`/`onWheel` handlers are the foundation. Changes needed:

**a) Replace drag with native scroll capture:**
On mobile, the page is CSS-locked (`overflow: hidden`), so we use touch events on the dial container. The existing pointer handlers already do this — refine:

- Keep `ROTATE_PER_PX = 0.22` (tunable)
- Keep direct 1:1 mapping (no inertia per user preference)
- Both axes: track `clientX` and `clientY` in `onPointerMoveMobile`, use whichever has larger delta (matching `onWheel` behaviour). Currently only `clientY` is tracked — add `dragStartX` and pick dominant axis per move event.
- On `pointerup`, snap to nearest sector with a short `gsap.to(state, { rotationDeg: nearestSectorDeg, duration: 0.2 })`
- Apply canvas rotation + call `applyActive(sectorIndex)` on each move
**b) Attraction on mobile:**
Currently `hasAttraction` requires `hasPointer` (desktop only). On mobile, the ticks should always show the "attracted" visual toward the white dot position (bottom-centre). This is purely visual — ticks near bottom-centre are drawn longer.

Change: when `isMobile()`, set attraction target to bottom-centre of canvas (6 o'clock position) instead of cursor position. The attraction effect runs at reduced intensity (`attractionEase` capped at 0.6 on mobile).

### 4. White dot indicator (HTML)

**File:** `work-dial.js` (create element), `ready-hit-play.css` (style)

Create a fixed HTML element positioned at bottom-centre of the dial, below the ticks ring. This dot:
- Is a `<div class="dial_sector-dot">` appended to `.dial_component`
- Positioned absolutely: `bottom: calc(50% - var(--dial-large-height)/2 - 0.75rem)`, `left: 50%`, `transform: translateX(-50%)`
- 8px white circle, no rotation
- Only visible on mobile (`display: none` above 991px, or always visible if desired)
- Created in `work-dial.js init()`, removed in `destroy()`
- Will support GSAP animation later (user noted)

### 5. Mobile video source swap (JS)

**File:** `work-dial.js`

**Approach:** When `isMobile()`, prefer `data-video-mobile` over `data-video` for FG videos, and `data-video-bg-mobile` over `data-video-bg` for BG videos. Graceful fallback to desktop sources.

```js
function getVideoUrl(item, type = 'fg') {
  if (isMobile()) {
    const mobileAttr = type === 'fg' ? 'data-video-mobile' : 'data-video-bg-mobile';
    const mobileUrl = item?.getAttribute(mobileAttr);
    if (mobileUrl) return mobileUrl;
  }
  const desktopAttr = type === 'fg' ? 'data-video' : 'data-video-bg';
  return item?.getAttribute(desktopAttr) || '';
}
```

Update all calls to `item.getAttribute('data-video')` to use `getVideoUrl(item, 'fg')` and BG equivalents. Affected locations:
- `applyActive()` line ~676
- Pool preload logic lines ~700–710
- `_buildPool()` / `_assignSlot()` if they read video URLs

### 6. Work/case page layout (CSS + JS)

**File:** `ready-hit-play.css`, `orchestrator.js`

**CSS changes (≤991px):**
```css
@media (max-width: 991px) {
  .dial_layer-ui { display: none !important; }

  .dial_component:has([data-barba-namespace="case"]) .dial_layer-fg {
    width: 100vw;
    height: calc(100dvh - var(--nav-height, 3.5rem));
    border-radius: 0;
  }
}
```

**JS changes (`orchestrator.js`):**
On mobile + case namespace, measure nav height and set CSS custom property:

```js
function setNavHeight() {
  if (!isMobile()) return;
  const nav = document.querySelector('.nav_component');
  if (nav) {
    document.documentElement.style.setProperty(
      '--nav-height', nav.offsetHeight + 'px'
    );
  }
}
```

Call `setNavHeight()` in case page `enter` hook and on `resize`.

### 7. Intro sequence (no changes)

The intro sequence (`home-intro.js`) runs identically on mobile. No modifications needed — the text, ticks, and video reveal scale naturally with the larger dial size.

### 8. Project info tap-to-navigate

**File:** `work-dial.js` or `orchestrator.js`

The project info area (`.dial_project-info` or equivalent selector — contains H2 project name + tags) should be tappable on mobile to navigate to the case page. This likely already works via Barba link handling if it's wrapped in an `<a>` tag. Verify and add if missing:

- On mobile, add `click` handler to `.dial_project-info` that triggers `barba.go(caseUrl)` using the current sector's CMS item URL
- Desktop behaviour unchanged

---

## Barba Impact

1. **Init/Destroy lifecycle** — White dot indicator element created in `work-dial.init()`, removed in `work-dial.destroy()`. `setNavHeight()` added to orchestrator's case enter hook. No new GSAP timelines that persist across transitions.

2. **State survival** — No new state needs to survive transitions. Mobile video sources are read fresh from CMS items on each `applyActive()` call. `--nav-height` CSS property persists harmlessly.

3. **Transition interference** — Dial sizing change (85vw) applies via CSS custom properties that the morph animation already reads. No conflict — morph targets are separate (`--dial-case-*` vars). White dot is inside `.dial_component` which persists outside Barba container.

4. **Re-entry correctness** — White dot is created in `init()` and removed in `destroy()`, so no duplication on re-entry. `isMobile()` is checked fresh each time. `setNavHeight()` is idempotent.

5. **Namespace scoping** — Dial changes affect `home` namespace. Case layout changes affect `case` namespace. White dot only on `home`. `setNavHeight()` only on `case`. No cross-namespace leaks.

---

## Task Breakdown

### Task 1: Fluid rem scaling + dial sizing CSS
**Agent:** code-writer
**Files:** `ready-hit-play.css`
**Est. time:** 15 min | **Est. tokens:** 8k

Update `html font-size` breakpoints and `--dial-large-*` custom properties for ≤991px/≤767px/≤479px. Pure CSS, no JS.

### Task 2: White dot HTML indicator
**Agent:** code-writer
**Files:** `work-dial.js`, `ready-hit-play.css`
**Est. time:** 20 min | **Est. tokens:** 12k

Create `.dial_sector-dot` element in `init()`, remove in `destroy()`. CSS positioning + mobile-only visibility.

### Task 3: Mobile video source swap
**Agent:** code-writer
**Files:** `work-dial.js`
**Est. time:** 20 min | **Est. tokens:** 10k

Add `getVideoUrl()` helper, update all `getAttribute('data-video')` calls. Fallback to desktop sources.

### Task 4: Mobile dial attraction (ticks toward white dot)
**Agent:** code-writer
**Files:** `work-dial.js`
**Est. time:** 15 min | **Est. tokens:** 8k

On mobile, set attraction target to bottom-centre (6 o'clock) instead of cursor position. Reduced intensity.

### Task 5: Work/case page layout
**Agent:** code-writer
**Files:** `ready-hit-play.css`, `orchestrator.js`
**Est. time:** 20 min | **Est. tokens:** 12k

Hide `.dial_layer-ui` on mobile. Full-width/height case container with JS-measured `--nav-height`. No border-radius on mobile.

### Task 6: Project info tap-to-navigate
**Agent:** code-writer
**Files:** `work-dial.js` or `orchestrator.js`
**Est. time:** 10 min | **Est. tokens:** 6k

Add click handler on project info area → `barba.go()` on mobile.

### Task 7: Code review
**Agent:** code-reviewer (3x parallel — Simplicity, Bugs, Conventions)
**Files:** all changed files
**Est. time:** 10 min | **Est. tokens:** 30k

### Task 8: Acceptance tests
**Agent:** qa
**Files:** `tests/acceptance/rhp-mobile-home-work.spec.js`
**Est. time:** 15 min | **Est. tokens:** 10k

---

## Parallelisation Map

```
Stream A (CSS):     Task 1 (rem + dial sizing)
Stream B (JS):      Task 2 (white dot) → Task 4 (attraction toward dot)
Stream C (JS):      Task 3 (mobile video sources)
Stream D (JS):      Task 5 (case layout)
Stream E (JS):      Task 6 (tap navigate)
                         ↓ all complete ↓
                    Task 7 (code review — 3 parallel reviewers)
                         ↓
                    Task 8 (acceptance tests)
```

**Recommendation:** 5 parallel streams for Tasks 1–6 (all independent — different files or non-overlapping sections of same file). Tasks 2+4 are sequential (4 depends on dot element from 2). Code review after all implementation. Acceptance tests last.

**Worktrees:** Not needed — changes are in different files or clearly separated sections.
**Agent Teams:** Not needed — streams are independent, no mid-task collaboration.

---

## Verification

1. CDN purge via `.claude/scripts/purge-cdn.sh` after push
2. Run acceptance tests: `cd projects/ready-hit-play-prod && npm test`
3. Playwright MCP visual check at 390x844, 768x1024, 991x768 viewports:
   - Homepage: dial fills ~85vw, white dot visible at bottom, scroll rotates dial
   - Case page: full-screen content, logo + bg video peek at top, no bottom nav
   - No JS console errors on any page
4. Manual check: project info tap navigates to case page on mobile

---

## Acceptance Tests

| # | Test name | Page | Assertion |
|---|-----------|------|-----------|
| 1 | Homepage loads without JS errors at 390px | `/` | No `pageerror` events |
| 2 | Dial is ≥300px wide at 390px viewport | `/` | `.dial_layer-fg` width ≥ 300 |
| 3 | White dot indicator visible on mobile | `/` | `.dial_sector-dot` visible at 390px |
| 4 | White dot hidden on desktop | `/` | `.dial_sector-dot` not visible at 1280px |
| 5 | Bottom nav hidden on case page mobile | `/work/overland-ai` | `.dial_layer-ui` not visible at 390px |
| 6 | Case container is full width on mobile | `/work/overland-ai` | `.dial_layer-fg` width ≥ 380px at 390px |
| 7 | No JS errors on case page mobile | `/work/overland-ai` | No `pageerror` events |
| 8 | Barba transition home→case: no errors at 390px | `/` → click project | No errors, correct namespace |
| 9 | Reduced motion: dial and dot visible | `/` | Elements visible with `prefers-reduced-motion: reduce` |
| 10 | Accessibility: no new WCAG violations at 390px | `/` | axe-core WCAG 2.1 AA |
