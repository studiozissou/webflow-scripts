# rhp-nav-logo-replay-and-dial-click

## Summary
Fix bugs in the existing `replay()` function (nav logo click on homepage) and add a new click-to-scroll handler on `.home-transition-dial` that smooth-scrolls through the morph.

**Project:** ready-hit-play-prod
**Files affected:** `home-scroll-morph.js`, `orchestrator.js`
**Complexity:** Low (~50 LOC across 2 files)

---

## Story 1: Fix `replay()` bugs

### Context
When the user clicks `.nav_logo-link` on the homepage (after the morph has completed), `replay()` in `home-scroll-morph.js` resets the intro section and morph. It already works conceptually but has 2 bugs and 1 missing call.

### Bug 1 — Logo text containers stay `display:none` after replay
**Root cause:** `_destroyLogoText()` (called on first scroll frame during the initial morph) sets `upper.style.display = 'none'` and `lower.style.display = 'none'` inline on the `.is-about-upper` / `.is-about-lower` elements inside `#interactive-logo`. When `replay()` calls `_splitLogoText()`, it reverts SplitText instances but does **not** clear the inline `display:none`. The `_initLogoHover()` `onEnter` handler tweens `opacity` but never clears `display`, so the hover text is invisible.

**Fix:** In `replay()`, after calling `_splitLogoText()`, clear inline `display` on all upper/lower containers in `logoSplitData` before calling `_initLogoHover()`.

```js
// Clear inline display:none left by _destroyLogoText on previous morph
logoSplitData.forEach(({ upper, lower }) => {
  [upper, lower].filter(Boolean).forEach(t => { t.style.display = ''; });
});
```

### Bug 2 — `_destroyLogoHover()` not called before `_initLogoHover()` in replay path
**Root cause:** If the hover animation was mid-flight or if `_destroyLogoText()` had already run, old listeners may linger in `logoHoverCleanup`. `_splitLogoText()` calls `_revertLogoText()` which clears `logoSplitData` but does NOT call `_destroyLogoHover()`.

**Fix:** Call `_destroyLogoHover()` at the top of `replay()`, before `_splitLogoText()`.

### Missing call — `ScrollTrigger.refresh()` after rebuild
**Root cause:** `replay()` calls `_resizeHandler()` (which rebuilds the scrub timeline) but does not call `ScrollTrigger.refresh()` afterwards. The `sectionEl` display was just un-hidden, so scroll metrics may be stale.

**Fix:** Add `if (window.ScrollTrigger?.refresh) window.ScrollTrigger.refresh();` after `_resizeHandler()`.

### Implementation — `replay()` updated (home-scroll-morph.js ~line 763)
```js
function replay() {
  if (!_resizeHandler) return;
  complete = false;

  // Tear down any lingering hover listeners before re-init
  _destroyLogoHover();

  // Re-show the intro overlay and section
  const homeTransition = document.querySelector('.home-transition');
  if (homeTransition) homeTransition.style.display = '';
  if (sectionEl) sectionEl.style.display = '';

  // Remove .rhp-home-ready so nav items cascade back to hidden
  _getScope().classList.remove('rhp-home-ready');

  // Re-apply small-state class (hides main dial via CSS opacity: 0)
  if (dialEl) dialEl.classList.add('is-intro-small');

  // Reset dial/logo to start positions
  if (window.gsap) {
    if (dialWrapper) window.gsap.set(dialWrapper, { clearProps: FLIP_CLEAR });
    if (logoEl) window.gsap.set(logoEl, { clearProps: FLIP_CLEAR });
  }

  // Re-hide step text — the rebuilt scrub will fade it back in
  if (stepTextEl && window.gsap) window.gsap.set(stepTextEl, { opacity: 0 });

  // Re-init logo text animation and fade logo back in
  _splitLogoText();
  // Clear inline display:none left by _destroyLogoText on previous morph
  logoSplitData.forEach(({ upper, lower }) => {
    [upper, lower].filter(Boolean).forEach(t => { t.style.display = ''; });
  });
  if (window.gsap && logoEl) window.gsap.to(logoEl, { opacity: 1, duration: 0.6, ease: 'power2.out' });
  if (_isDesktop()) _initLogoHover();

  // Rebuild the scrub timeline with fresh geometry
  _resizeHandler();
  if (window.ScrollTrigger?.refresh) window.ScrollTrigger.refresh();

  if (window.RHP?.workDial?.setInteractionUnlocked) {
    window.RHP.workDial.setInteractionUnlocked(false);
  }
  if (window.RHP?.workDial?.setAttractionEnabled) {
    window.RHP.workDial.setAttractionEnabled(false);
  }

  if (window.RHP?.scroll?.unlock) window.RHP.scroll.unlock();
  if (window.RHP?.lenis?.start) window.RHP.lenis.start();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

---

## Story 2: `.home-transition-dial` click-to-scroll

### Behaviour
When the intro/morph section is visible (either on initial load or after a `replay()` reset), clicking `.home-transition-dial` smooth-scrolls the page down so the morph plays out naturally — the same effect as if the user scrolled manually. The scroll target is the bottom of `.section_home-intro` so the morph completes and lands at `.section_home`.

### Implementation — new function in `orchestrator.js`
Add `initDialClickToScroll()` inside the orchestrator IIFE, called from the home view `init()` and from `replay()` completion.

```js
function initDialClickToScroll() {
  var dial = document.querySelector('.home-transition-dial');
  var section = document.querySelector('.section_home-intro');
  if (!dial || !section) return;

  function onClick() {
    // Scroll to the bottom of .section_home-intro so the morph plays through
    var target = section.offsetTop + section.offsetHeight;
    window.scrollTo({ top: target, behavior: 'smooth' });
  }

  // Prevent duplicate listeners — mark element
  if (dial.dataset.dialClickBound) return;
  dial.dataset.dialClickBound = 'true';
  dial.style.cursor = 'pointer';
  dial.addEventListener('click', onClick);
}
```

**Where to call it:**
1. In `initNavLogoLink()` — No. Better to call it from the home view `init()` path in orchestrator, right after the scroll-morph init.
2. Also re-call after `replay()` — the `replay()` function re-shows the intro section, so the dial is visible again. Since we use `data-dial-click-bound` as a guard, calling it again is safe (no-op if already bound).

Add call in `RHP.views.home.init` (orchestrator, after `initScrollMorph()` call, ~line 480):
```js
initDialClickToScroll();
```

And in the `initNavLogoLink` click handler, after `morph.replay()`:
```js
// Re-enable dial click after replay re-shows the intro
initDialClickToScroll();
```

### Edge cases
- **Morph already complete:** dial is `display:none` (hidden by `.home-transition` being hidden), so the click handler is unreachable. No action needed.
- **Mid-scroll:** if user is already scrolling through the morph and clicks, `scrollTo` overrides with a smooth scroll to the end. Acceptable.
- **Mobile:** same behaviour. The smooth scroll triggers the ScrollTrigger scrub timeline naturally.

---

## Barba Impact

1. **Init/Destroy lifecycle:** No new DOM elements or GSAP timelines. The dial click listener uses a `data-` guard to prevent duplicates. On Barba leave, the `.home-transition-dial` element persists outside the container (it's in the persistent dial layer), so the listener survives transitions but is harmless — the intro section is hidden on non-home pages. On re-entry via `skipToEnd()`, the intro section is hidden (`display:none`), so the dial is not clickable.
2. **State survival:** Nothing needs to persist across transitions.
3. **Transition interference:** None — these changes only affect state when the user is on home and the morph section is visible.
4. **Re-entry correctness:** `replay()` fixes ensure clean re-init of logo text. `initDialClickToScroll()` is guarded by `data-dial-click-bound` so it won't double-bind.
5. **Namespace scoping:** Home only. The `initNavLogoLink()` guard checks `ns === 'home'` before calling `replay()`. The dial click handler only fires when `.section_home-intro` is visible (home morph state).

---

## Verify Loop

### Pass/fail criteria
1. **Nav logo replay resets morph:** After morph completes, clicking `.nav_logo-link` → page scrolls to top, `.section_home-intro` visible, `.rhp-home-ready` removed, `complete === false`.
2. **Logo hover works after replay (desktop):** After replay, hovering `#interactive-logo .about-hero_ready` → upper/lower text slides in (visible, not `display:none`).
3. **Morph re-plays on scroll after replay:** After replay, scrolling down → morph animates normally → `complete === true` → nav appears → dial interactive.
4. **Dial click smooth-scrolls through morph:** During intro (before morph complete), clicking `.home-transition-dial` → page smooth-scrolls → morph plays through → lands at `.section_home`.
5. **No console errors** throughout all interactions.

### Reproduction steps
1. Navigate to `https://rhpcircle.webflow.io/`
2. Wait for RHP init (intro sequence + morph section visible)
3. Scroll down through morph → morph completes
4. Click `.nav_logo-link` → verify replay (criteria 1)
5. Hover `#interactive-logo .about-hero_ready` → verify hover text (criteria 2)
6. Scroll down again → verify morph replays (criteria 3)
7. Click `.nav_logo-link` again → verify replay
8. Click `.home-transition-dial` → verify smooth-scroll (criteria 4)

### Tier mapping
- **Tier 1 (Playwright):** Criteria 1, 3, 4, 5 — automated in acceptance test
- **Tier 2 (CDN regression):** Same tests registered in `tests/registry.json`
- **Tier 3 (Manual):** Criteria 2 (hover interaction requires real mouse movement, Playwright `hover()` may not trigger GSAP `mouseenter` reliably on this element)

### Regression scope
- Barba transitions home → about → home must still work
- `skipToEnd()` on Barba re-entry must still work
- Work dial interaction after morph complete must still work
- Contact pullout must still work

---

## Tasks

1. **Patch `replay()` in `home-scroll-morph.js`** — Add `_destroyLogoHover()` call, clear inline `display:none` on upper/lower, add `ScrollTrigger.refresh()`. Agent: code-writer.
2. **Add `initDialClickToScroll()` in `orchestrator.js`** — New function + calls from home view init and nav logo click handler. Agent: code-writer.
3. **Run acceptance tests** — Tier 1 Playwright tests. Agent: qa.

## Parallelisation Map

| Stream | Tasks | Agent | Est. tokens |
|--------|-------|-------|-------------|
| A | 1 + 2 (sequential, same build) | code-writer | 3k |
| B | 3 (after A) | qa | 5k |

Recommendation: Sequential — tasks 1+2 are small enough to do in one pass, then test.

---

## Acceptance Tests

See `tests/acceptance/rhp-nav-logo-replay-and-dial-click.spec.js`

| # | Test name | Tier |
|---|-----------|------|
| 1 | `clicking nav logo replays morph — section visible, complete false` | 1 |
| 2 | `morph re-plays on scroll after replay` | 1 |
| 3 | `clicking transition dial smooth-scrolls through morph` | 1 |
| 4 | `no JS errors during replay and dial click interactions` | 1 |
| 5 | `logo hover text visible after replay (desktop)` | 3 (manual) |

## Test Plan

### Tier 1 — Auto: Playwright local
- Tests in `tests/acceptance/rhp-nav-logo-replay-and-dial-click.spec.js`
- Replay state assertions, dial click scroll, console errors

### Tier 2 — Auto: CDN regression
- Registered in `tests/registry.json` as `rhp-nav-logo-replay-and-dial-click`
- Runs after deploy via `/deploy`

### Tier 3 — Manual
- **Logo hover text after replay:** Hover `#interactive-logo .about-hero_ready` on desktop after clicking nav logo. Upper/lower text should slide in. WHY manual: Playwright `hover()` may not reliably trigger GSAP mouseenter animation on this specific element.
- **Smooth scroll feel:** The dial click smooth-scroll should feel natural, not jerky. WHY manual: subjective animation quality.
