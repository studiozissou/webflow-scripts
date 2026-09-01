# Spec — Safari joins the Spotify video path (podcast list player)

**Slug:** `podcast-safari-video-path`
**Status:** Approved for build (31 Aug 2026)
**Client:** Jay Shetty — site `64c10a2010e1a379d08bf030`, live page `www.jayshetty.me/podcast`
**Evidence base:** `projects/jayshetty/.claude/research/safari-spotify-video-2026-08-31.md`

## Problem

Client Product reported Safari gets an audio embed where Chrome gets video. Correct:
`podcast-player.js` gates the Spotify iFrame API + `/video` swap behind
`typeof window.GestureEvent === "undefined"`, so every WebKit browser takes a
plain-audio-embed path. The 19 Aug justifications for that gate were re-tested on
31 Aug and did not survive:

- The iFrame API works in Safari 18.6 — `createController` succeeds, `ready` fires,
  no native-app prompt (that prompt was EP 853's bad Omny CMS link, per `e466be0`).
- The "no video in Safari" evidence came from loading `/video` top-level, which is
  equally dead in Chrome. Inside a controller-handshaken iframe, Safari plays video:
  human-verified, moving picture, **40 `playback_update` messages** on the
  side-by-side probe (`safari-video-compare.html`).

## Fix

Remove the engine gate so every browser takes the API + `/video` path, and fix the
watchdog so Safari's autoplay block cannot trigger a false fallback.

### Change 1 — `projects/jayshetty/podcast-player/podcast-player.js`

- Delete `var USE_IFRAME_API = ...` (line 63) and every branch keyed on it:
  `ensureSpotifyApi` guard (line 30), `useVideoEmbed` guard (line 121),
  `pauseAllSpotify` teardown branch (line 154), `playSpotify` plain-embed branch
  (line 214), `pauseItem` teardown branch (line 244).
- Delete `mountPlainEmbed` and `unmountPlainEmbed` — dead once the gate goes
  (the watchdog's audio fallback sets `frame.src` directly and stays).
- **Watchdog fix (load-bearing):** `watchForDegradedVideo` currently latches
  `__videoOk` only on `playback_update`. Safari blocks autoplay, so a Safari user
  who takes more than 6 s to tap play would have a healthy video player torn down
  to audio. Change the latch to fire on **any message whose `e.source` is the
  swapped iframe's `contentWindow`** — the 31 Aug Safari run proved a healthy
  `/video` page sends `ready` immediately. This also fixes a pre-existing
  looseness: today any Spotify embed's `playback_update` (origin-checked only)
  satisfies the watchdog for every wrapper.
  - Residual risk, accepted and documented: if Spotify's dead-card spell recurs
    *and* the dead card still handshakes, the fallback will not trigger. The dead
    card observed top-level performs no handshake, so this is judged unlikely.
- Update the single top-of-file sentence (no inline comments — project rule).

### Change 2 — `projects/jayshetty/podcast-player/head-code.html`

Remove the `GestureEvent` guard (lines 25–30) so the API loader runs
unconditionally. Note: the live page does not currently carry this head block —
`ensureSpotifyApi()` self-loads — but the file mirrors what Designer paste should
be, so it must not reintroduce the gate.

### Change 3 — footer artifacts

`PASTE-INTO-FOOTER.html` / `footer-code.built.html` pin
`@jayshetty-podcast-player-v1.1.0`. Bump the pin to
`jayshetty-podcast-player-v1.2.0` in the build input and re-run
`node projects/jayshetty/podcast-player/build-footer.cjs`. Never edit the built
copy directly.

### Change 4 — `projects/jayshetty/podcast-player/README.md`

Rewrite the "Browser split" section (now factually wrong), add a changes-log entry
for v1.2.0 citing the research doc, and update the deploy notes to name tag
v1.2.0.

## Expected UX after the change

| | Chrome / Firefox / Edge | Safari + iOS browsers |
| --- | --- | --- |
| Player | Video (unchanged) | **Video** (was audio) |
| Start | Autoplays on Watch (unchanged) | One tap inside the embed (same tap count as today) |
| Pause others | iFrame API (unchanged) | **iFrame API** (was iframe teardown) |

Known cosmetic, pre-existing in Chrome and accepted: the audio card shows briefly
before the `/video` swap on `ready`.

## Task breakdown

| # | Task | Agent | Size | Gates |
| --- | --- | --- | --- | --- |
| 1 | Gate removal + watchdog source-latch in `podcast-player.js` | code-writer | M | — |
| 2 | `head-code.html` + footer pin bump + `build-footer.cjs` run | code-writer | S | 1 |
| 3 | README rewrite | code-writer | S | 1 |
| 4 | Deploy: push, tag `jayshetty-podcast-player-v1.2.0`, `register_hosted_script` v1.2.0, `set_page_scripts` apply, publish | main session — **requires explicit user go; touches the live client page** | S | 1–3 |
| 5 | Manual QA checklist (Tier 3 below) | user + qa | S | 4 |

### Parallelisation map

Single sequential stream. Tasks 2 and 3 could technically run parallel after 1,
but all three touch one directory and total under an hour — parallel agents,
worktree teams: **not recommended**. `/build` should run 1 → 2 → 3 in one
executor and stop before 4 for the deploy gate.

## Barba Impact

N/A — no Barba transitions in the jayshetty project.

## ADR check

None required. This removes a conditional branch on restored evidence; the
architecture (delegated clicks, controller registry, watchdog fallback) is
unchanged. Evidence and rationale live in the research doc and the two probe
pages, which stay in the repo as regression instruments.

## Acceptance Tests

**Test infra: absent** — no `.env.test`, no `package.json`, no Playwright in
`projects/jayshetty/`. Tier 1/2 are skipped per the plan process. Noted for the
record: even with infra, Playwright is Chromium-only and cannot exercise the
Safari path this change exists for; automated coverage would only guard the
Chrome regression surface.

### Test Plan (3 tiers)

**Tier 1 — Auto: Playwright local** — skipped, no test infra.

**Tier 2 — Auto: CDN regression** — skipped, no `tests/registry.json`.

**Tier 3 — Manual (all verification lives here; reasons per item):**

1. **Safari macOS — video plays** (cross-browser; Playwright cannot run WebKit
   here, and playback is a real-gesture interaction): live `/podcast`, click a
   Spotify item's Watch → video player mounts in the cover slot → tap play inside
   → moving picture.
2. **Safari — no false fallback** (timing + visual): after Watch, wait 10 s
   *without* tapping play → player must still be the `/video` embed, not
   reverted to audio.
3. **Safari — no native-app prompt** (OS-level dialog, not automatable): full
   page load + Watch click sequence shows no "open Spotify?" dialog.
4. **iOS Safari — same as 1–3** (device-specific WebKit behaviour).
5. **Chrome — regression** (kept manual for parity in one checklist): Watch →
   video autoplays; second item's Watch pauses the first; pause button works;
   YouTube items unaffected.
6. **Console clean** (both browsers): no errors sourced from
   `podcast-player.js`.
7. **Animation feel n/a** — no motion work in this change.

## Verify Loop

### Pass/fail criteria

- **P1 (Safari):** after Watch click on a Spotify item, the item's
  `.podcast-list-spotify-embed iframe` has `src` containing
  `/embed/episode/{id}/video` — observable via Web Inspector.
- **P2 (Safari):** 10 s after Watch with no further interaction, that `src`
  still contains `/video` (watchdog did not fire falsely).
- **P3 (Safari):** tapping play inside the embed produces a moving video
  picture, and `playback_update` messages flow (visible via a
  `window.addEventListener("message", ...)` snippet in the console).
- **P4 (Safari):** no macOS "open Spotify?" dialog at any point.
- **P5 (Chrome):** identical Watch click yields `/video` src and autoplaying
  video within ~3 s; clicking a second Spotify item pauses the first
  (controller `pause()`, no teardown).
- **P6 (both):** zero console errors from `podcast-player.js`; the
  `#js-podcast-player-css` style element is present (IIFE ran).

### Reproduction steps

1. Open `https://www.jayshetty.me/podcast` (after deploy; before deploy, use the
   staging paste flow the README describes).
2. Scroll to the episode list; identify a Spotify-era item (Watch button with
   `data-watch="spotify"`).
3. Click Watch. Wait ≤3 s for the swap (Chrome) / observe mount (Safari).
4. Safari only: wait 10 s (P2), then tap play inside the embed (P3).
5. Click a second Spotify item's Watch (P5 pause-others).
6. Check the console (P6).

### Tier mapping

All criteria are Tier 3 manual — named above as checklist items 1–6. No Tier 1
test names or Tier 2 registry entries exist (no infra; see Acceptance Tests).

### Regression scope — must not break

- Chrome/Firefox/Edge video path: the swap logic is character-identical for
  them; only the gate around it is removed.
- YouTube items: postMessage play/pause untouched.
- Omny players and the `dropNonOmnyEmbeds` guard (EP 853): untouched.
- Finsweet pagination/filter re-renders: click delegation is document-level and
  survives re-renders — unchanged.
- Cover-art hide (`:has(...)` CSS) and `show-btn` button states: selector
  surface unchanged.

## Deploy notes (Task 4, gated)

1. Merge branch → tag `jayshetty-podcast-player-v1.2.0` on the merge commit →
   push tag (jsDelivr serves tags immediately; never rely on cache purge).
2. `register_hosted_script` version 1.2.0 pointing at the tagged URL;
   `set_page_scripts` to the podcast page (confirm current page id via the
   scripts API at deploy time — README records `6a85a907e42332f1eded63d7`, but
   the live `/podcast` page serves the script today).
3. README publishing rule ("webflow.io only until sign-off") predates v1.1.0
   reaching the live domain; deploying v1.2.0 to live is a **user call** made at
   the gate.
4. Rollback = re-apply hosted script v1.1.0. One API call, no code revert needed.

## Follow-ups (out of scope)

- **EP 853 Omny CMS field** holds a `open.spotify.com/episode/…` web-player URL
  — still wrong at source; player drops it defensively.
- **Episode hero player**: its spec mounts `/video` as a *plain* iframe
  (`utm_source=generator`); 31 Aug evidence says `/video` may be dead without a
  controller handshake. Verify the hero on Safari and Chrome; if dead, it needs
  this same controller+swap treatment.
- **Page Settings footer** still carries the truncated
  `<script src=".../podcas?v=1">` line — hand-delete in Designer.

## Open questions

None blocking. Rollout style (straight to live vs staging paste first) is decided
at the Task 4 gate.
