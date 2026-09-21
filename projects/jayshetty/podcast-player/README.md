# Podcast dual-platform inline player (YouTube + Spotify)

Source of truth for the custom code on the **/podcast** page (page
`64c14c21b0f0bd266134a4df`, site `64c10a2010e1a379d08bf030`; the draft
`podcast-v2` mirror is `6a85a907e42332f1eded63d7`). Spec:
`projects/jayshetty/.claude/specs/podcast-dual-platform-inline-player.md`.

The code ships as Webflow page custom code, not via the CDN pipeline. These files
mirror what is in Webflow so changes are reviewable in git; deploys happen through
the Webflow MCP (or by pasting in Designer page settings).

| File | Deploys to |
| --- | --- |
| `head-code.html` | Page settings → Inside `<head>` tag (full block) |
| `footer-code.html` | Page settings → Before `</body>` tag — **via `build-footer.cjs`, see below** |
| `spotify-embed.html` | HtmlEmbed `2356c0b9-cde5-734f-2373-b89173011785` (`.podcast-list-spotify-embed.is-cover`) |
| `player-harness.html` | Not deployed — mounts the local `podcast-player.js` against a mock list DOM for pre-deploy testing in any browser (`python3 -m http.server 8080 --directory projects/jayshetty/podcast-player`, then open `/player-harness.html`) |

### How the player is attached (read this first)

`podcast-player.js` is **not** in the footer field. It is registered as a
hosted script and applied to the page through the Webflow scripts API:

```
register_hosted_script  -> id "jayshettypodcastplayer", version 1.2.2
                           (tag jayshetty-podcast-player-v1.2.2)
set_page_scripts        -> applied to the podcast page, footer
                           (README recorded 6a85a907e42332f1eded63d7; confirm the
                           current page id via the scripts API at deploy time —
                           the live /podcast page serves the script today)
```

On the live `/podcast` page the player is NOT attached via the scripts API —
it loads from a plain `<script>` tag in the footer freeform block (updated to
the v1.2.0 pin via `set_page_freeform_code` on 1 Sep 2026; the endpoint's
old blanket HTTP 406 has cleared for that page, though the `podcast-v2` head
write still 406s). The scripts-API attachment above applies to the draft
`podcast-v2` mirror. Historical context: the freeform endpoint once returned
HTTP 406 on every write, and when the script tag *was* pasted by hand, the
Designer's code editor reformatted the block on save and truncated the long
jsDelivr URL mid-path, which is a good reason to keep long URLs out of that
field permanently.

To ship a player change: edit `podcast-player.js`, merge, tag the merge commit
(`jayshetty-podcast-player-vX.Y.Z`), push the tag, then `register_hosted_script`
the new version against the tagged jsDelivr URL and re-apply it with
`set_page_scripts`. jsDelivr serves tags immediately and caches forever, so
always bump the version rather than relying on a purge. Rollback is one API
call: re-apply the previous hosted script version (v1.2.1 for the v1.2.2 rollout).

**Outstanding:** the draft `podcast-v2` footer still contains the truncated
`<script src=".../podcas?v=1">` line from that paste (the live `/podcast`
footer does not). It 404s harmlessly but should be deleted in Page Settings
or via the now-working freeform write. The CDN URL pins a release tag,
never a branch, so it survives merges and worktree cleanup.

### Deploying the footer

Webflow's page custom-code field has a size ceiling that the commented source
now exceeds, so the footer ships comment-stripped:

```sh
node projects/jayshetty/podcast-player/build-footer.cjs   # prints what to paste
node projects/jayshetty/podcast-player/build-footer.cjs --stats
```

Edit `footer-code.html` — comments and all — and re-run the build; never edit
the stripped copy in Webflow directly, or the next build will overwrite the
change. The stripper is line-based: it only removes lines that *start* a
comment, so URLs containing `//` and the postMessage JSON strings are safe.

How the player JS finds the episode URL (no extra Designer state):

- It first looks for a `[data-spotify-url]` attribute inside the item (none is
  bound today — the MCP Data API rejected attribute CMS bindings), and falls
  back to the item's `a[href*="open.spotify.com/episode"]` — the mobile watch
  button link, which Will already CMS-bound to the "Spotify Link" field
  (`8fb2404da401ac6e187e39e6e0d4a67c`). If that mobile button is ever removed
  or unbound, bind `data-spotify-url` on any element inside the item instead.
- The embed wrapper keeps its Webflow conditional visibility (shown only on
  Spotify-era items); the YouTube embed keeps the inverse condition.

## Changes vs the previous footer code (Aug 2026)

- The jQuery "Video Player JS" block is replaced by one vanilla-JS IIFE:
  document-level delegated clicks (survive Finsweet v1 re-renders with zero
  re-init), per-platform targeting via `data-watch` / `data-pause`, lazy
  Spotify `createController` on first click with a pruned controller registry.
- **Video, not audio:** the iFrame API only ever loads the audio embed, but
  these episodes are Spotify *video* podcasts. Spotify's video player lives at
  the undocumented-but-oEmbed-official `/embed/episode/{id}/video` URL
  (`oembed` returns `"type": "video"` with that iframe src). After
  `createController` the code swaps the injected iframe to the `/video`
  variant — it speaks the same messaging protocol, so the controller's
  `play()`/`pause()` keep working. The `ready` handler re-swaps and defers
  play if the audio page ever loads first. Verified working 19 Aug 2026.
- The head CSS overrides `.podcast-list-spotify-embed.is-cover { display:
  block }` — the Designer class still carries `display:none` from when the
  embed was broken. Conditional visibility still hides it on YouTube-era
  items. (Cleaner long-term: remove the display:none from the class in
  Designer, then this override can go.)
- The stray video-player handlers that lived at the tail of the Omny script
  (`.image-cover` double bindings, `.videoplay` add) moved into the same IIFE;
  cover clicks now route to the item's *visible* watch button only.
- The Omny blocks (re-ID, `initPlayer`, `setTimeout` pagination re-init) are
  otherwise untouched — refactor is a spec follow-up.

## Browser split (re-measured 31 Aug 2026)

| | Chrome / Firefox / Edge | Safari + all iOS browsers |
| --- | --- | --- |
| Player | Video, in the cover slot | Video, in the cover slot |
| Start | Autoplays on Watch | One tap inside the embed (autoplay blocked) |
| Pause others | Spotify iFrame API | Spotify iFrame API |

There is no engine gate: every browser loads the iFrame API, calls
`createController`, and swaps the injected iframe to `/embed/episode/{id}/video`.
The only observable difference is Safari's autoplay policy — the video player
mounts but waits for a tap inside the embed.

Until v1.2.0 the player keyed on `typeof window.GestureEvent` and sent every
WebKit browser down a plain-audio-embed path. The 19 Aug evidence for that gate
was re-tested on 31 Aug (`projects/jayshetty/.claude/research/safari-spotify-video-2026-08-31.md`)
and did not hold up:

- **"Spotify UA-gates video"** — the test loaded `/video` *top-level*, which
  serves a dead card in Chrome too. Inside a controller-handshaken iframe Safari
  18.6 plays video: human-verified moving picture and 40 `playback_update`
  messages on the side-by-side probe (`safari-video-compare.html`).
- **"The iFrame API triggers the native-app prompt"** — `createController`
  succeeds and `ready` fires in Safari with no prompt. The prompt seen on 19 Aug
  was EP 853's bad Omny CMS link (`e466be0`), which `dropNonOmnyEmbeds` now
  removes.

Both probe pages (`safari-video-test.html`, `safari-video-compare.html`) stay in
the repo as regression instruments.

### Video watchdog

`/video` once went through a spell of serving a dead card to *everyone* (real
Chrome, clean sessions) while the audio embed kept working, so the player
keeps a watchdog that falls back to the audio embed when a loaded video page
never reports in. The latch is **any message whose `source` is the swapped
iframe's `contentWindow`** — a healthy `/video` page posts `ready` on its own,
so Safari's blocked autoplay (no `playback_update` until the user taps) cannot
trigger a false fallback. The listener is armed *before* `frame.src` is
reassigned; the countdown starts at the iframe's `load` event.

The countdown is **20 s** (v1.2.2; it was 6 s until then). Measured on the live
page on 16 Sep 2026, Spotify's video page posted `ready` anywhere from 0.5 s to
more than 6.4 s after `load`, varying minute to minute on Spotify's side, and
two of ten fresh Safari runs were torn down to audio by the 6 s timer. That was
the client's "some of us get audio, some get a mix" report — nothing to do with
the browser, region, caches or episode content (all ruled out in
`projects/jayshetty/.claude/research/spotify-video-watchdog-latency-2026-09-16.md`).
A dead card still loads and then fails to handshake, so the fallback path
survives the longer wait; it just tolerates a slow Spotify.

The fallback is **not sticky** (also v1.2.2). A Watch click on an item that fell
back clears the fallback flags and swaps the iframe back to `/video`, re-arming
the watchdog, so one slow moment can no longer lock an episode to audio for the
rest of the page session.

To keep a stale message from the outgoing audio document from satisfying the
latch, the controller `ready` handler does not send `play()` when it has just
issued the swap (the iframe's `load` handler plays instead). This also closes an
older looseness where another Spotify embed's `playback_update` (origin-checked
only) satisfied the watchdog for every wrapper on the page.

Accepted residual risks, all with the same mild consequence (a dead `/video`
page would not fall back to audio, or would show for up to 20 s first): if the
dead-card spell recurs *and* the dead card still handshakes; or if the outgoing
audio document posts a message in the window between `frame.src` reassignment
and the navigation committing. The dead card observed top-level performs no
handshake, an idle audio embed has not been seen to post unprompted, and the
swap normally lands within 100 ms of the iframe's insertion, so both are judged
unlikely.

## Debug log (`?playerdebug`, v1.3.0+)

Add `?playerdebug` (or `&playerdebug`) to any page running the player and a
log panel appears bottom-right with **Copy log** and **Hide**. It exists so the
client can reproduce a problem on their own machine and paste back what the
player saw, without DevTools. Without the flag the logger is a no-op: no panel,
no extra listeners, no `window.__playerLog`.

What it records: version, user agent, viewport, URL; what the page can detect
about Safari settings (autoplay allowed before and on the Watch click, a failed
iFrame API script load as a content-blocker hint, cookie flag, storage quota as
a Private-window hint, MediaSource/FairPlay support, reduced motion); every
step of the Spotify path (API ready, controller created/ready, `/video` swap,
iframe `load` timings, watchdog armed/satisfied/fired, the first Spotify message
of each type per iframe); swallowed `play()` errors, page errors and unhandled
rejections. **Copy log** appends a `state` line per Spotify iframe (src kind,
`__videoOk`, `__videoFellBack`, `allow` attribute).

Settings a page cannot see — ask the client to report them alongside the log:
Safari → Settings for jayshetty.me → Auto-Play and Content Blockers; Settings →
Privacy → Prevent cross-site tracking; extensions (ad blockers); Lockdown Mode;
Private window; iCloud Private Relay.

`tests/jayshetty/podcast-player-debug.test.js` runs the real script in a stub
DOM (`node --test tests/jayshetty/`).

## Changes log

### v1.3.0 — `?playerdebug` on-page log (21 Sep 2026)

- Client still reported audio instead of video in Safari after v1.2.2.
  Reproduced once on the live page in Safari 26.6.2: `/video` loaded at 5.4 s,
  then sent no message for 23 s, so the watchdog correctly fell back to audio.
  Three further runs (foreground and hidden window) handshook 2–4 s after load
  and played video. Chrome was fine. The log is to capture the client's own
  runs and settings. Player behaviour is unchanged.

### v1.2.2 — watchdog waits 20 s and no longer sticks (16 Sep 2026)

- Reproduced the client's post-v1.2.1 report on the live page in Safari 26.6.2:
  Spotify's `/video` page took 0.5 s to >6.4 s after `load` to post `ready`,
  and the 6 s watchdog tore two of ten healthy runs down to audio, permanently
  for that page session. `VIDEO_WATCHDOG_MS` 6000 → 20000; a Watch click on a
  fallen-back item now swaps back to `/video` and re-arms the watchdog.
- `video-latency-probe.html` added: a standalone control that times `load` →
  `ready` for six iframe variants, for checking whether Spotify is slow right
  now. Spec: `projects/jayshetty/.claude/specs/podcast-video-watchdog-latency.md`.
  Evidence: `projects/jayshetty/.claude/research/spotify-video-watchdog-latency-2026-09-16.md`.

### v1.2.1 — watchdog countdown starts at iframe load (2 Sep 2026)

- v1.2.0 started the 6 s watchdog countdown when the `/video` swap was issued,
  so slow connections triggered a false audio fallback before the page could
  load (client report: inconsistent audio/video across their team; reproduced
  on the live page with Slow 3G — no `load` within 14 s, `__videoFellBack`
  true at 6 s). The countdown now starts on the swapped iframe's `load` event;
  the message listener stays armed from the swap so early handshakes are never
  missed. Dead-card fallback verified intact (bogus episode: load at 0.2 s,
  fallback 6.3 s after load).

### v1.2.0 — Safari joins the video path (1 Sep 2026)

- Removed the `GestureEvent` engine gate from `podcast-player.js` and
  `head-code.html`; deleted the plain-embed mount/unmount branch it selected.
- Watchdog latch changed from `playback_update` (origin-checked) to any message
  from the swapped iframe's own `contentWindow`.
- Footer pin bumped to `@jayshetty-podcast-player-v1.2.0`.
- Spec: `projects/jayshetty/.claude/specs/podcast-safari-video-path.md`.
  Evidence: `projects/jayshetty/.claude/research/safari-spotify-video-2026-08-31.md`.
- v1.2.0 deployed 1 Sep 2026 (staging then live); superseded by v1.2.1 the
  next day after the slow-network false-fallback report.

### v1.1.0 (Aug 2026)

- WebKit gate: Safari and iOS browsers received a plain audio embed and iframe
  teardown for pause-others (reverted in v1.2.0).
- Video watchdog with `playback_update` latch.

### v1.0.0 (Aug 2026)

- First hosted-script release of the vanilla-JS dual-platform player.

## Publishing rule

The original rule — publish to the **webflow.io subdomain only** until sign-off —
predates v1.1.0 reaching the live domain, which the live `/podcast` page serves
today. Pushing a new hosted-script version to live is an explicit user call at
the deploy gate, never part of an automated build. Copying head/footer code to
the live page and publishing custom domains remain manual steps.
