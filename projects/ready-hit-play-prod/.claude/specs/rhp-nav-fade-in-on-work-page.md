# rhp-nav-fade-in-on-work-page

**Status:** Ready to Build
**Type:** fix + feat
**Priority:** P1
**Project:** ready-hit-play-prod
**Created:** 2026-08-13
**Test page:** https://rhpcircle.webflow.io/about → click any `/work/*` link

---

## Problem

Two defects, one blocking the other.

### 1. The nav is missing entirely on work pages after landing on /about (bug)

The About page carries **page-level custom code** in Webflow containing:

```css
.nav { display: none !important; }
```

Barba only swaps `[data-barba="container"]` — it never touches `<head>`. So once
the user lands on `/about`, that inline `<style>` stays in the document for the
rest of the session, and **every subsequent SPA navigation keeps the nav hidden**
until a hard reload.

Verified on the live site (`@05ead54`):

| Route | `.nav` computed display |
|-------|-------------------------|
| Direct load `/work/tommy-hilfiger` | `flex` ✅ |
| Direct land `/about` → click work link | `none` ❌ |

The owning node is an inline `<style>`, not our CDN CSS — confirmed by walking
`document.styleSheets` and reading `sheet.ownerNode`:

```
{ sel: ".nav", display: "none", important: "important",
  ownerTag: "STYLE", ownerHref: "(inline <style>)",
  inlineSnippet: "\n.nav {\n\tdisplay: none !important;\n\t}\n" }
```

This does **not** break `about → home`, because `ready-hit-play.css:111` already
carries an override for precisely this problem:

```css
/* When entering home (about→home or case→home), show nav even if rhp-nav-hidden
   was not yet removed (override timing/order) */
[data-barba="wrapper"]:has([data-barba-namespace="home"]).rhp-home-ready .nav {
  display: flex !important;
}
```

Work and case namespaces have no equivalent, so they inherit the stale rule.

**Pre-existing**, not introduced by `feat-about-to-work-via-home-transition` —
but that feature made the about→work route a normal thing to do, so it is now
reachable in ordinary use.

### 2. When the nav does show, it appears instantly (feature)

On work pages the nav pops in at full opacity with no entrance, which reads
poorly straight after the 1.85 s three-beat about→home→case transition.

## Goal

1. The nav is present and interactive on work/case pages regardless of how the
   user got there.
2. Arriving at a work page **from about**, the nav plays an entrance that matches
   the homepage: *Who we are* slides in from the left, *Contact* from the right —
   plus the logo fades in.

## Non-goals

- No change to the homepage nav entrance in `home-scroll-morph.js`.
- No Designer edit. (Considered and rejected — see Approach.)
- No entrance on `home → work`, `work → work`, or direct loads: the nav is
  already on screen there and animating it would read as a flash.

---

## Structural facts (verified against the live DOM)

With the nav visible on `/work/tommy-hilfiger` at 1280 px:

| Selector | Box | Notes |
|----------|-----|-------|
| `.nav` | 1280 × 0 | flex container, children absolutely positioned |
| `.nav_logo-link` | 234 × 29 @ top 16 | logo — **fade target** |
| `.nav_about-link` | 99 × 30 @ top 385 | slides from left |
| `.nav_contact-link` | 71 × 30 @ top 385 | slides from right |

All three are **outside** `[data-barba="container"]` (they live under
`.page-wrapper`), so they persist across transitions and are safe to pre-set
before the container swap.

**Mobile:** `ready-hit-play.css:1217-1220` hides `.nav_about-link` and
`.nav_contact-link` on work pages at ≤ 991 px. The entrance must animate only
what is actually rendered, or it will leave inline styles on `display:none`
nodes and tween nothing.

### The homepage choreography being reused

`home-scroll-morph.js` → `_applyCompleteState(animate)` (~line 707):

```js
const DUR = 0.7;
const EASE_TRANSLATE = 'power3.out';
// pinned before the class toggle so they don't flash at final state
gsap.set(navAbout,   { xPercent: -100, opacity: 0, visibility: 'visible' });
gsap.set(navContact, { xPercent:  100, opacity: 0, visibility: 'visible' });
// …then, sequentially, in one timeline:
tl.to(navAbout,   { xPercent: 0, opacity: 1, duration: DUR, ease: EASE_TRANSLATE, clearProps: 'xPercent,opacity,visibility' });
tl.to(navContact, { xPercent: 0, opacity: 1, duration: DUR, ease: EASE_TRANSLATE, clearProps: 'xPercent,opacity,visibility' });
```

Two things to note, both deliberate on the homepage:

- The two links run **sequentially** (`tl.to` with no position parameter), so the
  full entrance is ~1.4 s, not 0.7 s.
- The **logo is not animated at all** — it appears instantly via the
  `.rhp-home-ready` class toggle. The in-code comment says so explicitly. Fading
  the logo here is therefore a *deliberate divergence* from the homepage, at the
  user's request.

`_applyCompleteState` is **private** — `RHP.homeScrollMorph` exposes only
`{ init, destroy, skipToEnd, replay, complete, arrivedViaBarba, version }`. It is
not reusable without refactoring the homepage intro path.

## Approach

**Chosen: CSS override for work/case + a local nav entrance in `orchestrator.js`.**

### 1. `ready-hit-play.css` — unblock the nav

Mirror the existing home override for the work/case namespaces:

```css
/* The About page's page-level custom code injects `.nav{display:none!important}`
   into the document head. Barba never swaps <head>, so that rule survives
   navigation away from /about and hides the nav for the rest of the session.
   Home has an equivalent override above; work/case need their own. */
[data-barba="wrapper"]:has([data-barba-namespace="work"]) .nav,
[data-barba="wrapper"]:has([data-barba-namespace="case"]) .nav {
  display: flex !important;
  pointer-events: auto;
  visibility: visible;
}
```

Specificity beats the bare `.nav` rule, and `!important` matches it.

**Accepted trade-off:** this treats the symptom. The stale `<style>` still leaks,
and any future namespace will need its own override. The clean fix is deleting
that block from the About page's custom code and letting the existing
`.rhp-nav-hidden` mechanism (already managed in `runAfterEnter`) do the job — but
that needs a Designer edit and republish, which this change deliberately avoids.
**Logged as follow-up.**

### 2. `orchestrator.js` — pre-hide, then play the entrance

The nav becomes visible via CSS the moment `data-barba-namespace="work"` lands on
the new container, which is *before* `afterEnter` runs. Animating only in
`afterEnter` would let it flash at full opacity first. So the nav is pinned hidden
during `beforeLeave`, and animated in `afterEnter`.

```js
const NAV_ENTRANCE_DUR  = 0.7;
const NAV_ENTRANCE_EASE = 'power3.out';

/** The three persistent nav elements, or nulls. */
function _navParts() {
  return {
    logo:    document.querySelector('.nav_logo-link'),
    about:   document.querySelector('.nav_about-link'),
    contact: document.querySelector('.nav_contact-link')
  };
}

/** True when the element is actually rendered — ≤991px hides about/contact on
 *  work pages, and tweening a display:none node just strands inline styles. */
function _navRendered(el) {
  return !!el && getComputedStyle(el).display !== 'none';
}

/** Pin the nav hidden before the container swap so it cannot flash at full
 *  opacity between the swap and afterEnter. */
function prepNavEntrance() {
  const gsap = window.gsap;
  if (!gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { logo, about, contact } = _navParts();
  if (_navRendered(logo))    gsap.set(logo,    { opacity: 0 });
  if (_navRendered(about))   gsap.set(about,   { opacity: 0, xPercent: -100 });
  if (_navRendered(contact)) gsap.set(contact, { opacity: 0, xPercent: 100 });
}

/** Nav entrance for about→work. Mirrors the homepage choreography in
 *  home-scroll-morph.js _applyCompleteState() — about slides in from the left,
 *  contact from the right, 0.7s power3.out, sequential — and additionally fades
 *  the logo, which the homepage leaves instant. */
function runNavEntrance() {
  const gsap = window.gsap;
  const { logo, about, contact } = _navParts();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reduced motion (or no GSAP): make sure nothing is left pinned hidden.
  if (!gsap || reduced) {
    [logo, about, contact].forEach((el) => { if (el) el.style.removeProperty('opacity'); });
    return;
  }

  const tl = gsap.timeline();
  // Logo fades alongside the first link rather than after it.
  if (_navRendered(logo)) {
    tl.to(logo, { opacity: 1, duration: NAV_ENTRANCE_DUR, ease: NAV_ENTRANCE_EASE,
                  clearProps: 'opacity' }, 0);
  }
  if (_navRendered(about)) {
    tl.to(about, { xPercent: 0, opacity: 1, duration: NAV_ENTRANCE_DUR,
                   ease: NAV_ENTRANCE_EASE, clearProps: 'xPercent,opacity' }, 0);
  }
  if (_navRendered(contact)) {
    tl.to(contact, { xPercent: 0, opacity: 1, duration: NAV_ENTRANCE_DUR,
                     ease: NAV_ENTRANCE_EASE, clearProps: 'xPercent,opacity' });
  }
}
```

Wire into the existing `about-to-work` transition only:

```js
beforeLeave(data) {
  RHP.lenis?.stop();
  RHP.homeAboutSlide?.resetCurtain?.();
  prepNavEntrance();                    // ← add
  const ns = data.current?.namespace || currentNs;
  if (ns && RHP.views[ns]?.destroy) RHP.views[ns].destroy();
  RHP.videoLoader?.destroy?.();
},

afterEnter(data) {
  const ticks = _persistentTicks();
  if (ticks) RHP.transitionDial?.clearCanvas?.(ticks);
  runAfterEnter(data);
  runNavEntrance();                     // ← add
}
```

Bump `ORCHESTRATOR_VERSION` to `2026.8.13.1`.

### Timing note (tunable)

Matching the homepage exactly makes the entrance sequential — about (0.7 s) then
contact (0.7 s) — so the nav takes ~1.4 s to fully settle, landing on top of an
already 1.85 s transition. `NAV_ENTRANCE_DUR` and the timeline position parameter
are the two dials. To run both links together instead, add `, 0` to the contact
`tl.to(...)` call. Expect one round of feel-tuning.

### Alternatives rejected

- **Extract the homepage entrance into a shared module** — cleanest long-term
  single source of truth, but `_applyCompleteState` is entangled with the intro
  scrub, SplitText step text and the `.rhp-home-ready` toggle. Refactoring it
  risks the site's primary entrance animation for a secondary reuse.
- **Delete the About page's custom code in the Designer** — the correct fix for
  defect 1, explicitly deferred to keep this change code-only.

---

## Files touched

| File | Change | Est. LOC |
|------|--------|----------|
| `ready-hit-play.css` | work/case `.nav` display override | ~10 |
| `orchestrator.js` | `_navParts`, `_navRendered`, `prepNavEntrance`, `runNavEntrance`; wire into `about-to-work`; version bump | ~55 |

No `init.js` load-order change. No new modules.

---

## Barba Impact

1. **Init/destroy lifecycle** — No new persistent DOM, listeners, ScrollTriggers
   or contexts. Only GSAP tweens on three persistent nav elements, each ending in
   `clearProps` so no inline state survives. No `init`/`destroy` needed.
2. **State survival** — Nothing needs to persist. The nav elements themselves
   already live outside the Barba container.
3. **Transition interference** — The nav sits outside `[data-barba="container"]`,
   so it does not participate in the container swap and cannot fight the slide or
   expand beats. `runAfterEnter` toggles `.rhp-nav-hidden` by namespace; the
   entrance runs after that, so it never fights the class.
4. **Re-entry correctness** — `about → work → about → work` is clean: every tween
   ends in `clearProps`, and `prepNavEntrance` re-pins from a known state on each
   run rather than assuming the previous one unwound. **Risk:** if a tween is
   interrupted mid-flight, `clearProps` never fires and the nav could be stranded
   at `opacity: 0`. Mitigated by `prepNavEntrance` re-setting explicitly, and by
   the reduced-motion branch clearing inline opacity. A killed tween on the *last*
   run of a session is the residual gap — acceptable, and visible only until the
   next navigation.
5. **Namespace scoping** — `about-to-work` only (`from: ['about']`,
   `to: ['case','work']`). `home-to-work`, `work-to-work`, `work-to-about`,
   `about-to-home` and `home-to-about` are untouched, and direct loads never call
   either function.

---

## Known risks / accepted trade-offs

- **Symptom fix, not source fix.** The stale `.nav{display:none!important}` still
  leaks out of `/about`. Any namespace added later inherits the bug. Follow-up
  ticket: remove it from the About page's Webflow custom code.
- **~1.4 s sequential entrance** after a 1.85 s transition may feel long. Tunable
  in one line; expect feel-tuning.
- **Logo fade diverges from the homepage**, which shows the logo instantly. This
  is intentional and requested, but the two entrances are now not identical — if
  the homepage is ever changed to match, the constants must be kept in sync
  manually, since the choreography is duplicated rather than shared.
- **Interrupted tween** can strand the nav hidden until the next navigation (see
  Barba Impact 4).

---

## Verify Loop

### Pass/fail criteria

| # | Condition | Observable |
|---|-----------|------------|
| 1 | Nav is present on a work page reached from about | After the transition settles, `getComputedStyle($('.nav')).display === 'flex'` |
| 2 | The original bug is fixed | Direct-land `/about` → click a `/work/*` link → `.nav` display is `flex`, not `none` |
| 3 | Nav is interactive | `.nav_logo-link` has a non-zero bounding box (width > 0 and height > 0) |
| 4 | No flash before the entrance | Sampled at container swap, the nav's opacity is 0 (not 1) before it animates up |
| 5 | Logo fades | Sampled mid-entrance, `.nav_logo-link` computed opacity is strictly between 0 and 1 |
| 6 | About slides from the left | Sampled mid-entrance, `.nav_about-link` has a non-identity `transform` (translateX < 0) |
| 7 | Contact slides from the right | Sampled mid-entrance, `.nav_contact-link` has a non-identity `transform` (translateX > 0) |
| 8 | Entrance settles clean | After settle, all three have computed `opacity: 1` and **no inline** `opacity`/`transform` left (clearProps ran) |
| 9 | No entrance on home→work | Navigating home → work leaves the nav at opacity 1 throughout — no sampled frame below 1 |
| 10 | Reduced motion | With `prefers-reduced-motion: reduce`, nav is visible and at opacity 1 within 1 s, no inline opacity stranded |
| 11 | Mobile safety | At 375 px on a work page, `.nav_about-link`/`.nav_contact-link` are `display:none` and carry **no** inline `xPercent`/`opacity`; the logo still fades |
| 12 | Re-entry | about → work → about → work: the entrance plays both times and criterion 8 holds after each |
| 13 | No errors | Zero `pageerror` events across the whole sequence |
| 14 | Regression: about→home unaffected | about → home still shows the nav, and the homepage entrance still runs its own choreography |

### Reproduction steps

1. Hard-load `https://rhpcircle.webflow.io/about` (must be a *direct land* — this
   is what puts the stale `<style>` in the head).
2. Wait for `window.RHP.scriptsOk === true`, then +1.5 s.
3. Install a rAF sampler recording, per frame: `.nav` computed display, and
   computed `opacity` + `transform` for logo / about / contact.
4. Click the first `a[href^="/work/"]` inside `[data-barba-namespace="about"]`.
5. Assert 4 at the swap frame; assert 5–7 against frames sampled between +100 ms
   and +600 ms after the swap.
6. Wait 2500 ms for settle → assert 1, 2, 3, 8, 13.
7. Repeat 1–6 with `page.emulateMedia({ reducedMotion: 'reduce' })` → assert 10.
8. Repeat at 375 × 812 → assert 11.
9. From the work page, click the nav about-link, then a work link again →
   assert 12.
10. Separately: home → work → assert 9. about → home → assert 14.

### Tier mapping

- **Tier 1 (auto, local):** criteria 1, 2, 3, 8, 9, 10, 11, 12, 13, 14 —
  `tests/acceptance/rhp-nav-fade-in-on-work-page.spec.js`.
  Criteria 4–7 are sampled mid-entrance and timing-sensitive; they run as soft
  `test.info().annotations` (`design-drift`) rather than hard failures, because a
  slow CI frame can miss a 0.7 s window. Same convention as
  `feat-about-to-work-via-home-transition`.
- **Tier 2 (auto, CDN regression):** registry id `rhp-nav-fade-in-on-work-page`.
- **Tier 3 (manual):**
  - Whether ~1.4 s sequential feels right on top of the 1.85 s transition, or
    wants shortening / running both links together. Subjective pacing.
  - Whether the logo fade reads as intentional next to the sliding links, or
    whether it should also translate.
  - Mobile Safari on a real device — `:has()` support and the ≤991 px branch.
  - Safari / Firefox — Playwright runs Chromium only, and this fix leans on
    `:has()`, which has different rollout history across engines.

### Regression scope

Must not break:

- The homepage nav entrance (`home-scroll-morph.js` `_applyCompleteState`) — this
  change must not touch it.
- `about-to-home`, `home-to-about`, `work-to-about`, `work-to-work`,
  `home-to-work`, and the `about-to-work` beats themselves.
- The `.rhp-nav-hidden` toggle in `runAfterEnter` (nav must still be hidden on
  about).
- Direct loads of `/`, `/about` and `/work/*`.
- Existing suites to re-run: `feat-about-to-work-via-home-transition`,
  `about-to-home-barba-transition`, `fix-dial-namespace-selectors`,
  `feat-about-case-video-controls`.

---

## Test Plan

**Tier 1 — Playwright local:** `tests/acceptance/rhp-nav-fade-in-on-work-page.spec.js`
**Tier 2 — CDN regression:** registry entry `rhp-nav-fade-in-on-work-page`
**Tier 3 — Manual:** pacing, logo-fade art direction, mobile Safari, Safari/Firefox `:has()`.

## Acceptance Tests

| Test | Asserts |
|------|---------|
| `nav is visible on a work page reached from a direct land on about` | Criteria 1, 2 |
| `nav logo is interactive after the transition` | Criterion 3 |
| `nav animates in rather than appearing instantly` | Criteria 4–7 (soft) |
| `nav entrance leaves no inline styles behind` | Criterion 8 |
| `home to work does not replay the nav entrance` | Criterion 9 |
| `reduced motion shows the nav immediately` | Criterion 10 |
| `mobile leaves hidden nav links untouched` | Criterion 11 |
| `re-entering work replays the entrance cleanly` | Criterion 12 |
| `about to work produces no console errors` | Criterion 13 |
| `about to home still shows the nav` | Criterion 14 |

## Parallelisation Map

Not worth parallelising — two files, ~65 LOC, and the CSS change gates the JS
(the entrance cannot be observed until the nav is displayable).

| Stream | Tasks | Agent | Est. |
|--------|-------|-------|------|
| Sequential (single stream) | CSS override → nav entrance in orchestrator → verify | `code-writer` (opus) | ~25 min |

Recommendation: **sequential, no worktree, no agent team.**

## Agents needed

- `code-writer` (opus) — implementation
- `code-reviewer` ×3 (sonnet) — standard `/build` review lenses
- `qa` (sonnet) — `/qa-check`

## ADRs

None required. The CSS-override-vs-Designer-fix decision is recorded above under
Approach and as a follow-up, but it is reversible and locally scoped, so it does
not warrant an ADR.

## Follow-ups

1. **Remove `.nav { display: none !important }` from the About page's Webflow
   custom code** and let the existing `.rhp-nav-hidden` mechanism handle it. This
   is the source fix for defect 1; the CSS override here is a workaround.
2. Consider extracting the nav entrance into a shared module so the homepage and
   work-page choreographies cannot drift.
