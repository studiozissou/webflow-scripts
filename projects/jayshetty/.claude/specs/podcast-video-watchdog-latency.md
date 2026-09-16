# Spec — Video watchdog stops mistaking a slow Spotify page for a dead one

**Slug:** `podcast-video-watchdog-latency`
**Status:** Ready for build (16 Sep 2026)
**Client:** Jay Shetty — site `64c10a2010e1a379d08bf030`, live page `www.jayshetty.me/podcast`
**Evidence:** `projects/jayshetty/.claude/research/spotify-video-watchdog-latency-2026-09-16.md`
**Ships as:** `podcast-player.js` v1.2.2, hosted script + footer pin bump

## Problem

Since v1.2.1 the client team still sees audio players, or a per-item mix of
audio and video, on fresh machines. Reproduced on the live page in Safari
26.6.2: Spotify's `/video` embed posts `ready` anywhere from 0.5 s to more
than 6.4 s after its `load` event (Spotify-side variance, time-of-day
dependent). `watchForDegradedVideo` fires at 6 s after `load` and swaps the
iframe to the audio embed, and `useVideoEmbed` then refuses video for that
item for the rest of the page session (`__videoFellBack`). Two of ten runs
fell back or came within 1.2 s of doing so. In a standalone control the same
page is ready within 0.64 s in 30 of 30 samples, so no iframe attribute the
player sets is responsible.

## Research summary

- **Reusable code:** `projects/jayshetty/podcast-player/podcast-player.js` —
  `watchForDegradedVideo` (lines 68–103), `useVideoEmbed` (105–129),
  `playSpotify` existing-controller path (200–206). Build script
  `build-footer.cjs`; footer inputs `footer-code.html`, `PASTE-INTO-FOOTER.html`.
- **Spotify iFrame API facts (read from the live bundle, `iframe_api.5d9c…js`):**
  `createController` inserts the iframe and sets the audio src synchronously;
  `play()` is queued while `loading` and flushed on `ready`;
  `createController(el, { uri, preferVideo: true })` calls `supportsVideo`
  (oEmbed `type === "video"`) and then sets
  `/embed/episode/{id}/video?utm_source=iframe-api` — byte-identical to the
  URL the player swaps in by hand. `preferVideo` is documented for
  `loadUri`/`loadEntity`, undocumented but implemented for `createController`.
- **Constraints:** no test infra in `projects/jayshetty/`; Playwright is
  Chromium-only anyway; project rule of one top-of-file sentence and no
  inline comments; jsDelivr pins are immutable, so every change is a version
  bump; live deploy is a user-gated call.
- **Selectors:** unchanged — `.podcast-list-spotify-embed`,
  `.spotify-player-target`, `.is-podcast-watch-button[data-watch="spotify"]`
  (12 per page, present on paginated pages 2–4 too).
- **Live DOM:** cover slot renders the Spotify iframe at 336×189 CSS px on a
  2000 px window; Spotify's video layout renders fine at that size.

## Approaches considered

| Approach | Confidence | Complexity | Key risk | Reusable code |
| --- | --- | --- | --- | --- |
| A: Longer, non-sticky watchdog (20 s after `load`, retry video on next click) | 85 | Low (1 file, ~15 LOC) | A genuinely dead card shows for 20 s before audio appears; unknown tail beyond 20 s | `watchForDegradedVideo`, `useVideoEmbed` |
| B: Official `preferVideo: true` path, drop manual swap + sandbox, keep A's watchdog | 75 | Medium (1 file, ~60 LOC net removal + README) | `preferVideo` on `createController` is undocumented; adds one oEmbed round-trip before the iframe gets a src; the `load`-handler `play()` goes away and relies on the API's command queue | `createController` options; `controllerFor` |
| C: Remove the watchdog entirely | 60 | Low (1 file, −40 LOC) | The Aug dead-card spell would leave a dead player with no recovery | — |

**Recommendation: A now, as the v1.2.2 hotfix.** It is the smallest change
that removes the reproduced defect, keeps the safety net for a real Spotify
outage, and stops one bad moment locking an item to audio. B is the right
follow-up once the client confirms A (it also makes EP 828, the one
audio-only episode, degrade gracefully via Spotify's own oEmbed check).

## Fix (Approach A)

### Change 1 — `projects/jayshetty/podcast-player/podcast-player.js`

- `VIDEO_WATCHDOG_MS` 6000 → **20000**. Countdown still starts at the swapped
  iframe's `load`; the message latch still arms at the swap.
- Make the fallback non-sticky. In `playSpotify`'s existing-controller path
  (line 203), before `existing.controller.play()`: if
  `embedWrap.__videoFellBack` is set, clear it along with `__videoOk` and
  `__videoWatchdog`, then call `useVideoEmbed(embedWrap, id)` so the click
  swaps back to `/video` (its `load` handler plays, as today). Keep the
  `__videoFellBack` early return in `useVideoEmbed`; the reset in
  `playSpotify` is what re-enables it.
- Update the single top-of-file sentence if its wording changes meaning.

### Change 2 — footer pin + build

Bump `@jayshetty-podcast-player-v1.2.1` → `v1.2.2` in `footer-code.html` and
`PASTE-INTO-FOOTER.html`, run `node projects/jayshetty/podcast-player/build-footer.cjs`.
Never edit `footer-code.built.html` by hand.

### Change 3 — README

Rewrite the "Video watchdog" paragraph (6 s → 20 s, non-sticky, why), add a
v1.2.2 changes-log entry citing the research doc, update deploy notes to name
tag `jayshetty-podcast-player-v1.2.2` and rollback to v1.2.1.

## Task breakdown

| # | Task | Agent | Size | Gates |
| --- | --- | --- | --- | --- |
| 1 | Watchdog constant + non-sticky reset in `podcast-player.js` | code-writer | S | — |
| 2 | Footer pin bump + `build-footer.cjs` run | code-writer | S | 1 |
| 3 | README watchdog section + changes log | code-writer | S | 1 |
| 4 | Local verification per Verify Loop (harness + probe page) | qa | S | 1 |
| 5 | Deploy: merge, tag v1.2.2, `register_hosted_script` 1.2.2, apply, publish — **user go required, touches the live client page** | main session | S | 1–4 |
| 6 | Client reply to Yoni (draft in research doc) | user | S | 5 |

### Parallelisation map

Single sequential stream, one executor. Tasks 2 and 3 are independent after
1 but total under 30 minutes in one directory; parallel agents, worktree
teams: **not recommended**. `/build` runs 1 → 2 → 3 → 4 and stops before 5.

## Barba Impact

N/A — no Barba transitions in the jayshetty project.

## ADR check

None. A threshold and a flag reset; the architecture (delegated clicks,
controller registry, watchdog) is unchanged. Approach B would warrant a short
ADR when adopted, because it changes who owns the `/video` decision.

## Acceptance Tests

**Test infra: absent** — no `.env.test`, no `package.json`, no Playwright in
`projects/jayshetty/`. Tier 1/2 skipped per the plan process. Playwright
could not exercise Safari or Spotify's latency anyway.

### Test Plan (3 tiers)

**Tier 1 — Auto: Playwright local** — skipped, no infra.

**Tier 2 — Auto: CDN regression** — skipped, no `tests/registry.json`.

**Tier 3 — Manual (all verification lives here):**

1. **Slow `ready` no longer falls back** (timing, needs real Spotify latency):
   live `/podcast` in Safari, Watch on a Spotify item, observe in Web Inspector
   that `src` stays `/video` for 20 s even when `ready` is slow; repeat across
   6–10 fresh loads.
2. **Dead-card fallback still works** (simulate): point one harness item at a
   bogus episode id via `data-spotify-url`; the iframe must revert to the
   audio embed 20 s after its `load`.
3. **Non-sticky**: after a forced fallback (2), click pause then Watch again —
   the iframe must swap back to `/video`.
4. **Chrome regression**: Watch autoplays video within ~3 s; second item's
   Watch pauses the first; pause button works; YouTube items unaffected.
5. **Console clean** in both browsers.
6. Animation feel n/a.

## Verify Loop

### Pass/fail criteria

- **P1 (Safari + Chrome):** after Watch, `.podcast-list-spotify-embed iframe`
  `src` contains `/embed/episode/{id}/video` and still does 15 s later with
  no interaction, on 10 of 10 fresh loads (v1.2.1 failed 2 of 10 today).
- **P2:** with a bogus episode id, `src` reverts to `/embed/episode/{id}`
  between 20 s and 21 s after the iframe's `load` (`__videoFellBack === true`).
- **P3:** after P2, a second Watch click on that item sets `src` back to
  `/video` and `__videoFellBack` is falsy.
- **P4 (Chrome):** playback starts and `playback_update` messages flow within
  ~3 s of Watch; clicking another Spotify item's Watch pauses the first.
- **P5 (both):** zero console errors from `podcast-player.js`;
  `#js-podcast-player-css` present.

### Reproduction steps

1. Serve `projects/jayshetty/podcast-player/` locally
   (`python3 -m http.server 8080 --directory projects/jayshetty/podcast-player`)
   and open `player-harness.html` for P2/P3; use live `/podcast` (after deploy)
   or the harness for P1/P4/P5.
2. Instrument in the console:
   `window.addEventListener("message", e => console.log(e.origin, e.data && e.data.type))`
   and watch `document.querySelector(".podcast-list-spotify-embed.visible iframe").src`.
3. Click Watch on a Spotify item; note `load`, `ready`, and `src` at +15 s.
4. Repeat on fresh loads (P1); run the bogus-id item (P2, P3); run Chrome (P4).

### Tier mapping

All criteria are Tier 3 manual, checklist items 1–5 above. No Tier 1 names or
Tier 2 registry entries (no infra). `video-latency-probe.html` is the
standalone control for "is Spotify slow right now" and stays in the repo.

### Regression scope — must not break

- Chrome/Firefox/Edge video path: only the constant and a flag reset change.
- YouTube items, Omny players, `dropNonOmnyEmbeds`, Finsweet pagination:
  untouched.
- Cover-art hide and `show-btn` states: selector surface unchanged.

## Deploy notes (Task 5, gated)

1. Merge → tag `jayshetty-podcast-player-v1.2.2` on the merge commit → push tag.
2. `register_hosted_script` 1.2.2 at the tagged jsDelivr URL; re-apply with
   `set_page_scripts`; update the live footer freeform pin (worked on 1 Sep
   via `set_page_freeform_code`); publish.
3. Rollback = re-apply v1.2.1.

## Open questions

- Whether to schedule Approach B as the follow-up once the client confirms.
- Safari still needs one in-frame tap to start playback (autoplay policy);
  already communicated to the client on 20 Aug, worth restating in the reply.
