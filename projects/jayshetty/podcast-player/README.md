# Podcast dual-platform inline player (YouTube + Spotify)

Source of truth for the custom code deployed to **jayshetty.webflow.io/podcast-v2**
(page `6a85a907e42332f1eded63d7`, site `64c10a2010e1a379d08bf030`). Spec:
`projects/jayshetty/.claude/specs/podcast-dual-platform-inline-player.md`.

The code ships as Webflow page custom code, not via the CDN pipeline. These files
mirror what is in Webflow so changes are reviewable in git; deploys happen through
the Webflow MCP (or by pasting in Designer page settings).

| File | Deploys to |
| --- | --- |
| `head-code.html` | Page settings → Inside `<head>` tag (full block) |
| `footer-code.html` | Page settings → Before `</body>` tag — **via `build-footer.cjs`, see below** |
| `spotify-embed.html` | HtmlEmbed `2356c0b9-cde5-734f-2373-b89173011785` (`.podcast-list-spotify-embed.is-cover`) |

### How the player is attached (read this first)

`podcast-player.js` is **not** in the footer field. It is registered as a
hosted script and applied to the page through the Webflow scripts API:

```
register_hosted_script  -> id "jayshettypodcastplayer", version 1.0.0
set_page_scripts        -> applied to page 6a85a907e42332f1eded63d7, footer
```

Two reasons. Webflow's freeform custom-code endpoint started returning HTTP
406 on every write (any size, any content, byte-identical included) while
reads, publishes and the scripts API all worked — so the footer can only be
edited by hand right now. And when the script tag *was* pasted by hand, the
Designer's code editor reformatted the block on save and truncated the long
jsDelivr URL mid-path, which is a good reason to keep long URLs out of that
field permanently.

To ship a player change: edit `podcast-player.js`, push, then register a new
version and re-apply it (jsDelivr caches, so bump the version rather than
relying on a purge).

**Outstanding:** the footer still contains the truncated
`<script src=".../podcas?v=1">` line from that paste. It 404s harmlessly but
should be deleted by hand in Page Settings. The CDN URL also pins the
worktree branch, which disappears on merge — re-register against `@main`
then.

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

## Browser split (measured 19 Aug 2026)

| | Chrome / Firefox / Edge | Safari + all iOS browsers |
| --- | --- | --- |
| Player | Video, in the cover slot | Audio, in the cover slot |
| Start | Autoplays on Watch | One tap inside the embed |
| Pause others | Spotify iFrame API | Iframe torn down |

Safari is excluded from the video path on evidence, not assumption:

- Spotify **UA-gates video**. Its `/video` embed loaded top-level in Safari has
  no `<video>` element and no play button — and sending Safari's user-agent
  string *from Chrome* reproduces the same stripped page exactly. Nothing in a
  visitor's privacy settings or codec support is involved (Safari 18.6 has MSE,
  H.264 and VP9; the page is degraded before any of that matters).
- Spotify's **iFrame API triggers the native-app prompt** in Safari.
  `createController` alone does it, with no playback command, while a plain
  embed iframe on `about:blank` never prompts. Hence WebKit builds its own
  iframe and the API script is not even loaded there.

`/video` also went through a spell of serving a dead card to *everyone*
(real Chrome, clean sessions) while the audio embed kept working, so the
player watchdog falls back to audio when a loaded video page never reports
playback. A `playback_update` message latches the embed as good, so a working
video is never swapped out.

## Publishing rule

Publish to the **webflow.io subdomain only** until sign-off. Copying the code
to the live `/podcast` page and publishing custom domains is a manual step.
