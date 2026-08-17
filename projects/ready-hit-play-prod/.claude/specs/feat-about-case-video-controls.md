# feat-about-case-video-controls

**Status:** Ready to Build
**Type:** feat
**Priority:** P1
**Project:** ready-hit-play-prod
**Created:** 2026-08-12
**Test page:** https://rhpcircle.webflow.io/about

---

## Problem

A case-study video block has been added to the about page inside the third
accordion ("WHY READY HIT PLAY EXISTS"):

```
div.accordion-column
  div.w-dyn-list                                    ← Collection List (About Page Slides)
    div.w-dyn-item
      section.section_case-video.is-remote-building [data-cursor="white-dot"]
        div.dial_video-wrap.is-case-study.w-embed   ← HTML Embed
          video.video-cover [autoplay muted loop playsinline] src="" poster=""
        div.case-video_control-wrapper
          div.case-video_controls
            div.play-pause    (.is-play / .is-pause)
            div.mute-unmute   (.is-mute / .is-unmute)
```

It is inert. Three separate causes:

1. **No JS wiring.** `case-video-controls.js` is only invoked from
   `RHP.views.case.init()` (orchestrator.js:958). `RHP.views.about.init()`
   never calls it, so the play/pause and mute buttons do nothing, no progress
   bar is injected, and the video never gets the post-Barba `tryPlay()` kick
   (the browser only honours the `autoplay` attribute on initial parse, not on
   Barba-inserted DOM).

2. **Rounded corners.** `ready-hit-play.css:459` sets the base
   `.dial_video-wrap { border-radius: 999px }` for the home dial circle. The
   only reset is `[data-barba-namespace="work"] .dial_video-wrap { border-radius: 0 }`
   (line 645). Nothing resets it under `[data-barba-namespace="about"]`, so the
   about video renders pill-clipped.

3. **Empty `src`.** The published HTML renders `src="" poster=""`. The CMS item
   backing it — *"Why Ready Hit Play Exists Video"* (`launch-video`, collection
   **About Page Slides** `69f8a08bc32852a7af7cff0f`) — has both a populated
   `vimeo-link` and an `image`, so the HTML Embed's `src`/`poster` are not bound
   to those fields. **This is a Webflow Designer fix and is a prerequisite for
   visual sign-off** (see Prerequisite below).

## Goal

The about-page video behaves exactly like a case-study video: autoplays muted
on load and after a Barba transition, play/pause and mute/unmute icons wired and
state-synced, clickable/keyboard-scrubbable progress bar, viewport auto-pause
with volume fade, controls auto-hiding on idle — with square corners and clean
Barba init/destroy.

## Non-goals

- No changes to case-study page behaviour.
- No new control markup — the Designer markup is already correct.
- No redesign of the accordion the video sits in.

---

## Prerequisite (Webflow Designer — user)

The embed's `src`/`poster` need the CMS bindings. In the Designer:

1. Open **About** → accordion 3 → `accordion-column` → the Collection List →
   `section_case-video` → double-click the `dial_video-wrap is-case-study`
   HTML Embed.
2. Put the caret inside `src="` and use **+ Add Field** → **Vimeo Link**.
3. Put the caret inside `poster="` and use **+ Add Field** → **Image**.
4. Publish.

Verify with:

```bash
curl -s https://rhpcircle.webflow.io/about | grep -o '<video class="video-cover"[^>]*>'
```

`src` must be a non-empty `player.vimeo.com/...` URL.

Until this is done the JS guard (below) leaves the block alone, so nothing looks
broken — the video simply stays blank.

---

## Approach

Reuse `case-video-controls.js` wholesale. It already queries
`ctx.querySelectorAll('.section_case-video')` and the about markup matches the
case-study markup exactly (`video.video-cover`, `.case-video_control-wrapper`,
`.play-pause`, `.mute-unmute`; `.restart` is optional and absent — the module
already guards it with `if (restart)`).

Three edits.

### 1. `orchestrator.js` — wire the module into the about view

`RHP.views.about.init(container)` (~line 787):

```js
initAboutTeamHover(container); // handles desktop vs mobile internally
RHP.caseVideoControls?.init?.(container);   // ← add
```

`RHP.views.about.destroy()` (~line 802):

```js
destroyAboutTeamHover();
RHP.caseVideoControls?.destroy?.();          // ← add
```

Bump `ORCHESTRATOR_VERSION` to `2026.8.12.1`.

This covers both entry paths — `bootCurrentView()` (direct land on `/about`,
orchestrator.js:1460) and `runAfterEnter()` (Barba entry, orchestrator.js:1478)
both route through `RHP.views.about.init(container)`.

### 2. `case-video-controls.js` — empty-source guard

In `wireSection(section)`, after the existing element guard:

```js
if (!video || !playPause || !muteUnmute || !controlWrapper) return;

/* CMS-bound embeds can render src="" when the field is unbound or empty.
   Wiring a sourceless video injects a dead scrub bar and fires a doomed
   play() on every enter — bail instead. */
if (!video.currentSrc && !video.getAttribute('src') && !video.querySelector('source')) return;
```

Bump `VERSION` to `2026.8.12.1`.

### 3. `ready-hit-play.css` — square corners in every namespace

The existing `[data-barba-namespace="work"]` reset is namespace-scoped, which is
the bug. Replace the scoping with a structural rule that holds wherever a
case-video block appears — currently `work` and `about`, and any future page.
Add next to the existing rule (~line 644):

```css
/* Case-video blocks now appear on about as well as work. Reset the base
   .dial_video-wrap pill radius structurally rather than per-namespace —
   the pill is only ever wanted on the persistent home dial (#fg-video-wrap). */
.section_case-video .dial_video-wrap,
.section_case-video-laptop .dial_video-wrap {
  border-radius: 0;
}
```

Keep the existing `[data-barba-namespace="work"]` rule — it is harmless and
other work-page rules depend on that block staying put.

`#fg-video-wrap` is a sibling of the Barba container inside `.dial_layer-fg`,
never a descendant of `.section_case-video`, so the home dial circle is
untouched. Verified against the live DOM on `/`, `/about` and `/work/overland-ai`.

Layout is otherwise already correct without JS: Webflow's own stylesheet gives
`.section_case-video { aspect-ratio: 16/9 }`, `.is-remote-building { aspect-ratio: 1920/800 }`,
`.dial_video-wrap.is-case-study { aspect-ratio: auto; height: auto; position: static }`
and `.case-video_control-wrapper { position: absolute; inset: auto 0 0 }`.

---

## Barba impact

1. **Init/destroy lifecycle** — Yes: the module injects a
   `.case-video_progress-track` element, attaches ~10 listeners, runs a rAF
   progress loop, an idle `setTimeout`, and an `IntersectionObserver`. All are
   registered in the module's `cleanups[]` and torn down by `destroy()`, which
   is now called from `RHP.views.about.destroy()` — itself called from
   `beforeLeave` on every about-leaving transition
   (`about-to-home`, `about-to-work`, `rhp-core`).
2. **State survival** — None required. `RHP.videoState` is not touched; the
   about video restarts on re-entry, which is correct for a looping ambient clip.
3. **Transition interference** — One shared element: the module tweens
   `.cursor_dot-wrapper` opacity to 0 when controls auto-hide with the mouse
   inside the section. `destroy()` kills that tween and resets
   `cursorWrapper.style.opacity = ''`, so the cursor cannot be left invisible
   across a transition. The injected progress track lives inside the Barba
   container, which Barba removes wholesale; `track.remove()` on an already
   detached node is a no-op, so double teardown is safe.
4. **Re-entry correctness** — `views.about.init` is `active`-guarded, and the
   module clears `cleanups[]`, `wiredVideos`, and both observers in `destroy()`,
   recreating the observer in `init()`. home → about → home → about produces no
   doubled tracks and no stale listeners. `wireSection` is called once per
   `.section_case-video` per init.
5. **Namespace scoping** — Runs on `about` and `case`/`work` only. `home` has no
   `.section_case-video`, and `views.home.init` is untouched.

---

## Files touched

| File | Change | Est. LOC |
|------|--------|----------|
| `orchestrator.js` | 2 calls in `views.about` + version bump | 3 |
| `case-video-controls.js` | empty-src guard + version bump | 4 |
| `ready-hit-play.css` | structural border-radius reset | 6 |

No new modules, no `init.js` load-order change (`case-video-controls.js` is
already in `CONFIG.parallelModules`).

---

## Verify Loop

### Pass/fail criteria

| # | Condition | Observable |
|---|-----------|------------|
| 1 | Module wired on about | `window.RHP.caseVideoControls.version` is defined **and** `document.querySelector('.section_case-video .case-video_progress-track')` is non-null on `/about` |
| 2 | Square corners | `getComputedStyle($('.section_case-video .dial_video-wrap')).borderRadius` resolves to `0px` |
| 3 | Home dial unaffected | On `/`, `getComputedStyle($('#fg-video-wrap')).borderRadius` is still `999px` (or the case value on `/work/*`) |
| 4 | Autoplay | After load + 2 s, `$('.section_case-video video').paused === false` and `.muted === true` |
| 5 | Play/pause | Clicking `.play-pause` toggles `video.paused`; `.is-play` / `.is-pause` `display` swap between `flex` and `none` |
| 6 | Mute | Clicking `.mute-unmute` toggles `video.muted`; `.is-mute` / `.is-unmute` `display` swap |
| 7 | Scrub | Clicking at 50 % of `.case-video_progress-track` width moves `video.currentTime` to ≈ half `duration` (±10 %) |
| 8 | Viewport pause | Scrolling the video fully out of view for 1 s → `video.paused === true`; scrolling back → playing again |
| 9 | Teardown | Navigating about → home leaves `document.querySelectorAll('.case-video_progress-track').length === 0` and `getComputedStyle($('.cursor_dot-wrapper')).opacity === '1'` |
| 10 | No errors | Zero `pageerror` events across load, interaction and transition |

### Reproduction steps

1. `https://rhpcircle.webflow.io/about`, wait for `window.RHP.scriptsOk === true`, +1.5 s.
2. Open accordion 3 ("WHY READY HIT PLAY EXISTS") if collapsed.
3. Scroll the `.section_case-video` into view, wait 1 s → assert 4.
4. Click `.play-pause`, wait 300 ms → assert 5. Click again to resume.
5. Click `.mute-unmute`, wait 300 ms → assert 6. Click again to re-mute.
6. Click `.case-video_progress-track` at x = 50 % → assert 7.
7. Scroll to page top, wait 1.5 s → assert 8 (paused). Scroll back, wait 1.5 s → assert 8 (playing).
8. Click the nav logo (about → home), wait 2.5 s → assert 9.

### Tier mapping

- **Tier 1 (auto, local):** criteria 1–3, 5–7, 9, 10 —
  `tests/acceptance/feat-about-case-video-controls.spec.js`.
- **Tier 2 (auto, CDN regression):** registry id `feat-about-case-video-controls`.
- **Tier 3 (manual):**
  - Criterion 4 (autoplay) on **real iOS Safari** — iOS refuses programmatic
    play without a gesture; headless Chromium always allows it, so the
    `.rhp-play-overlay` fallback path can only be confirmed on device.
  - Audio quality of the unmute volume fade — Playwright cannot hear.
  - Whether the 2 s auto-hide idle delay *feels* right against the accordion
    layout (subjective).
  - Safari/Firefox corner rendering — Playwright runs Chromium only.

### Regression scope

Must not break:

- Case-study video blocks on `/work/*` (same module, same CSS rule path) —
  covered by the existing `case-video-progress-autohide` and
  `fix-case-video-autoplay-barba` acceptance suites.
- The home dial circle radius on `/` and the case dial radius on `/work/*`.
- `about-icon-scale.js`, `about-accordion-scroll.js`, `about-swipers.js` — all
  measure accordion heights; the video is already in the DOM so measurements do
  not change, but re-run `rhp-about-icon-viewport-fill` and
  `rhp-about-accordion-scroll`.
- The custom cursor: it must be visible after leaving about.

---

## Test Plan

**Tier 1 — Playwright local:** `tests/acceptance/feat-about-case-video-controls.spec.js`
**Tier 2 — CDN regression:** registry entry `feat-about-case-video-controls`
**Tier 3 — Manual:** iOS autoplay + play-overlay fallback, volume-fade audio,
auto-hide feel, Safari/Firefox corners.

## Acceptance Tests

| Test | Asserts |
|------|---------|
| `progress track is injected on the about video` | Criterion 1 |
| `about video wrap has square corners` | Criterion 2 |
| `home dial video wrap keeps its pill radius` | Criterion 3 |
| `play/pause button toggles playback and swaps icons` | Criterion 5 |
| `mute/unmute button toggles muted and swaps icons` | Criterion 6 |
| `clicking the progress track seeks the video` | Criterion 7 |
| `leaving about tears down the progress track and restores the cursor` | Criterion 9 |
| `about page loads with no console errors` | Criterion 10 |
| `prefers-reduced-motion: controls stay visible and no errors` | Reduced-motion path |
