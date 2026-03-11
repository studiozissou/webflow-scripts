# Spec: Persist `.about-transition` Outside Barba Container

**Slug:** `rhp-about-transition-persist`
**Client:** ready-hit-play-prod
**Status:** Ready to Build
**Created:** 2026-03-11

---

## Context

The `.about-transition` overlay (logo morph + background fade) was **inside** `<main data-barba="container">`, so Barba destroyed/recreated it on every navigation — no state preserved, no true reversal possible.

**Goal:** Persist `.about-transition` outside the Barba container so the same GSAP timeline can play forward (→ about) and reverse (← home).

**Known risk** (CLAUDE.md L133): CSS namespace scoping (`[data-barba-namespace="about"] .about-transition`) will break — needs selector update.

---

## Direct Landing Strategy

On direct land to **/about**, pre-position logo and dial to their end states via `gsap.set()` (duration: 0) but keep `.about-transition` overlay hidden. When the user navigates about→home, show the overlay and reverse the animation from those positions.

On direct land to **/home** or **/case**, no pre-positioning — `.about-transition` stays `display: none`. Case→about plays the same forward animation as home→about.

---

## Implementation Steps

### Step 1: Move `.about-transition` in Webflow Designer — DONE
`.about-transition` is now a Webflow symbol, positioned outside `<main>` on home, about, and case pages.

**TODO:** Download fresh reference HTML for homepage, about, and case-study-template.

### Step 2: Fix CSS namespace scoping
**File:** `projects/ready-hit-play-prod/ready-hit-play.css`

Current CSS uses `[data-barba-namespace="about"] .about-transition` selectors (lines 105-114). These break now that `.about-transition` is outside the container.

**Fix:** Remove namespace prefix — the element is only visible during transitions anyway.

Verify: `grep` for any `[data-barba-namespace] .about-transition` patterns and remove the namespace prefix.

### Step 3: Update JS queries to use `document` instead of `container`
**File:** `projects/ready-hit-play-prod/orchestrator.js`

Change `.about-transition` queries from `container.querySelector()` to `document.querySelector()` since the element is now outside the barba container:

- **Line 878:** `container.querySelector('.about-transition')` → `document.querySelector('.about-transition')`
- **Lines 884-885:** Same for child selectors
- **Lines 1013, 1022-1023:** Same in `runAboutToHomeTransition()`

### Step 4: Convert to a single persistent GSAP timeline
**File:** `projects/ready-hit-play-prod/orchestrator.js`

Replace `runHomeToAboutTransition()` + `runAboutToHomeTransition()` with a single lazily-created timeline:

```js
let aboutTransitionTL = null;

function getAboutTransitionTimeline() {
  if (aboutTransitionTL) return aboutTransitionTL;
  const el = document.querySelector('.about-transition');
  if (!el || !window.gsap) return null;
  // Build forward timeline (home → about): overlay fade + logo morph + dial shrink
  aboutTransitionTL = gsap.timeline({ paused: true });
  // ... existing tween logic ...
  return aboutTransitionTL;
}

// Forward: → about (used by home→about AND case→about)
function runHomeToAboutTransition(data) {
  const tl = getAboutTransitionTimeline();
  if (!tl) return Promise.resolve();
  tl.progress(0);
  return new Promise(resolve => { tl.play().eventCallback('onComplete', resolve); });
}

// Reverse: ← home
function runAboutToHomeTransition(data) {
  const el = document.querySelector('.about-transition');
  gsap.set(el, { display: 'flex', opacity: 1 }); // show overlay before reversing
  const tl = getAboutTransitionTimeline();
  if (!tl) return Promise.resolve();
  tl.progress(1);
  return new Promise(resolve => {
    tl.reverse().eventCallback('onReverseComplete', () => {
      gsap.set(el, { display: 'none' });
      resolve();
    });
  });
}
```

### Step 5: Direct-landing setup (position children, keep overlay hidden)
**File:** `projects/ready-hit-play-prod/orchestrator.js`

On direct land to **/about only**, `.about-transition` stays `display: none`, but the logo and dial inside it are pre-positioned to their end states via `gsap.set()`. On /case and /home, no pre-positioning — transitions play forward normally.

```js
function bootCurrentView() {
  const ns = /* current namespace */;
  if (ns === 'about') {
    // Pre-position logo + dial to "about" end state, keep overlay hidden
    // Logo: large, centred, 40% opacity
    // Dial: small, bottom position
    // Then call RHP.transitionDial.resize() to redraw canvas at small size
  }
}
```

Flow summary:
- **Direct land /about** → overlay hidden, logo+dial pre-positioned → about→home shows overlay then reverses
- **Direct land /home** → everything at initial state → home→about plays forward normally
- **Direct land /case** → no pre-positioning → case→about plays forward (same animation as home→about)

### Step 6: Transition-dial canvas redraw on resize
**File:** `projects/ready-hit-play-prod/transition-dial.js`

The `.transition-dial` contains a `<canvas>` drawn by `transition-dial.js`. When the dial is repositioned to a small size on direct land, the canvas needs to be redrawn at the correct resolution to avoid pixelation when it later grows during the reverse animation.

**Fix:** Expose `resize` on the public API:
```js
return { init, destroy, resize, version: TRANSITION_DIAL_VERSION };
```

Then in the orchestrator:
- **Direct land setup:** After `gsap.set()`, call `RHP.transitionDial.resize()` to redraw canvas at small size
- **During reverse animation:** `onUpdate` callback calls `RHP.transitionDial.resize()` on each frame so canvas stays crisp as it grows

### Step 7: Ensure transition-dial init on every page
**File:** `projects/ready-hit-play-prod/orchestrator.js`

Since `.transition-dial` is now on every page (inside the symbol), ensure `init()` is called on boot and after every Barba transition:
- In `bootCurrentView()` or `initBarba()`: call `RHP.transitionDial.init()` unconditionally
- In `runAfterEnter()`: ensure it's re-initialized if needed

### Step 8: Update reference HTML
Download fresh HTML from the published Webflow staging site for:
- `reference/homepage.html`
- `reference/about.html`
- `reference/case-study-template.html`

---

## Barba Impact Assessment

1. **Init/Destroy lifecycle** — No persistent listeners on `.about-transition`. Timeline stored in module closure. No `destroy()` needed.
2. **State survival** — Timeline + element both persist across transitions. This is the goal.
3. **Transition interference** — `z-index: 9998` overlay. Renders on top. No conflict — it IS the transition.
4. **Re-entry correctness** — home→about (play) → home (reverse) → about (play from 0). `tl.progress(0)` before `.play()` ensures clean re-entry.
5. **Namespace scoping** — Used by: `home-to-about`, `about-to-home`, `case-to-about`. All share one timeline. Symbol on home, about, case pages.

---

## Critical Files

| File | Action |
|------|--------|
| `projects/ready-hit-play-prod/orchestrator.js` | Update queries, persistent timeline, direct-land boot |
| `projects/ready-hit-play-prod/transition-dial.js` | Expose `resize()` on public API for canvas redraw |
| `projects/ready-hit-play-prod/ready-hit-play.css` | Fix namespace-scoped selectors |
| `projects/ready-hit-play-prod/reference/*.html` | Re-download after Webflow publish |

---

## Verification

1. **DOM check:** Verify `.about-transition` is a sibling of `<main>`, not a child (check reference HTML)
2. **CSS check:** `grep` for `data-barba-namespace.*about-transition` — should return nothing
3. **Home → About:** Logo morph + overlay plays forward
4. **About → Home:** Same animation reverses smoothly (not a fresh animation)
5. **Re-entry:** Home → about → home → about — each plays cleanly
6. **Direct land /about:** Page loads normally, `.about-transition` hidden, logo+dial pre-positioned. Navigate about→home — overlay appears and animation reverses smoothly
7. **Direct land /home:** Page loads normally, `.about-transition` hidden, logo+dial at initial state
8. **Case → About:** Transition plays forward (same as home→about)
9. **Smoke tests:** `cd projects/ready-hit-play-prod && npm test`
10. **Console errors:** Check all 4 namespaces after transitions

---

## Decisions (Confirmed)

- **Webflow symbol** — `.about-transition` shared across home, about, and case pages (outside `<main>`) — DONE
- **Case ↔ about uses same persistent overlay** — all about-related transitions share one timeline
- **Direct landing: pre-position on /about only** — on direct land to /about, `gsap.set()` logo+dial to end-state positions but keep overlay hidden. On /case, no pre-positioning — case→about plays forward like home→about.
