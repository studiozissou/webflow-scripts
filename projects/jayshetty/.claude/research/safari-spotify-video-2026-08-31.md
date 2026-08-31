# Safari Spotify video — re-investigation (31 Aug 2026)

Prompted by client Product feedback on the podcast player. Measured against the
**live** page `https://www.jayshetty.me/podcast` (player v1.1.0 via jsDelivr),
real Safari 18.6 driven by AppleScript, and Chrome 151 via DevTools.

## Verdict in one line

Product's description of the code is **correct**. Their conclusion — "not an
issue with the Spotify embed player" — is **not supported**: Spotify's own embed
JS branches on `isSafari`. But the original 19 Aug justification for the WebKit
branch rests on a **confounded test**, so the branch deserves to be revisited.

## What Product got right

`podcast-player.js:63` really does read:

```js
var USE_IFRAME_API = typeof window.GestureEvent === "undefined";
```

`GestureEvent` is WebKit-proprietary, so this is an engine check, not UA
sniffing — but the effect is what they describe. Verified live in Safari 18.6:
clicking a Spotify "Watch" button on `/podcast` mounts

```
https://open.spotify.com/embed/episode/0QrCDajVXiP1XDvof7Q1Qg
```

— the plain **audio** embed. Chrome on the same page and episode mounts
`/embed/episode/{id}/video?utm_source=iframe-api` and genuinely plays video
(17 `playback_update` messages observed).

So: Chrome video, Safari audio. Exactly as reported.

## Where Product's conclusion breaks down

Spotify's embed bundle (`8939-*.js`) picks playback mode with, de-minified:

```js
(settings.isVideoEmbed || !t || passthrough !== NONE)
&& (t || !session.accessToken || session.isAnonymous
       || settings.isMobile || settings.isSafari)
  ? (settings.isVideoEmbed && n ? FULL : PREVIEW)
  : FULL
```

`settings.isSafari` is an explicit input to Spotify's own FULL-vs-PREVIEW
decision, alongside `isMobile` and anonymous session. Whatever else is true,
the embed player is not browser-neutral.

## The confounded evidence (the important bit)

The README justifies excluding WebKit partly on: *"Spotify's `/video` embed
loaded top-level in Safari has no `<video>` element and no play button — and
sending Safari's UA from Chrome reproduces the same stripped page."*

That test does not discriminate. Loading
`open.spotify.com/embed/episode/{id}/video` **top-level** today gives, after
full hydration:

| Browser | `<video>` elements | buttons | body length |
| --- | --- | --- | --- |
| Safari 18.6 | 0 | `Save on Spotify` only | 9905 |
| Chrome 151 | 0 | `Save on Spotify` only | 9907 |

Identical dead card in **both**. Yet the same URL, mounted in an iframe after
`createController` (the `utm_source=iframe-api` context), plays video fine in
Chrome. The top-level page is degraded for everyone, so the original Safari
observation was never Safari-specific.

Server HTML is also byte-identical across Chrome and Safari user-agents (only
Sentry trace IDs differ), so the gating is entirely client-side.

The second justification — *"the iFrame API triggers the native-app prompt in
Safari"* — is contradicted by commit `e466be0`'s own message, which found the
real source was EP 853's Omny CMS field holding a `open.spotify.com/episode/…`
web-player URL. The player now drops those on load. Across many
`createController` calls in Safari today, **no prompt appeared**.

## Settled: the iFrame API works fine in Safari

Run on the clean probe page (`safari-video-test.html`), same episode, same code,
both browsers:

| | Chrome 151 | Safari 18.6 |
| --- | --- | --- |
| API script loaded | yes | **yes** |
| `createController` | created | **created** |
| `ready` fired | yes | **yes** |
| Swapped to `/video` | yes | yes |
| `playback_update` after swap | **18** | **0** |
| Native-app prompt | — | **none** |

`ready` firing in Safari kills the README's second justification outright: the
iFrame API is usable in WebKit, and `createController` does not raise the
"open Spotify?" prompt. That half of the branch is obsolete.

## Still unresolved: whether Safari renders video

The `0` in that table is **not** proof that Safari is denied video.

Safari blocks autoplay, and the probe was driven by a synthetic
`.click()` from AppleScript — not a real user gesture — so `controller.play()`
was refused before any video could report playback. Chrome permits autoplay,
which is why it reports 18. A `/video` page that renders perfectly but sits
paused emits zero `playback_update` messages, so this run cannot distinguish
"Spotify degraded the page" from "Safari refused to autoplay it".

Cross-origin isolation means the iframe's contents can't be inspected from the
parent, so no amount of scripting settles it. It needs a human to look.

**Do not ship a flag flip until the manual test below is run.**

## How to settle it (2 minutes, Safari)

`safari-video-test.html` next to the player source runs the exact production
video path and shows both the player and a live message log.

```sh
cd projects/jayshetty/podcast-player && python3 -m http.server 8899
```

Open `http://localhost:8899/safari-video-test.html` in **Safari**. Serve it over
http — `file://` gives a null origin that Spotify's embed rejects.

Then, and this is the part automation cannot do:

1. Press **Run** with a real click.
2. When the player appears, **press play inside the embed** — Safari will not
   autoplay it, and without that press the counter stays at zero whatever the
   page is showing.
3. Look at the frame.

- Moving video picture → Safari can do video. Drop the `USE_IFRAME_API` gate.
- Audio card with artwork and a scrubber, no video → Spotify degrades `/video`
  for Safari. The gate stays, and that is the honest answer to the client.

## Recommended fix, once confirmed

Delete the engine gate and let every browser take the API path. The existing
6-second watchdog (`watchForDegradedVideo`) already falls back to the audio
embed when a loaded `/video` page never reports playback, so Safari degrades
to today's behaviour on its own rather than needing a hard-coded branch.

Retain for Safari regardless: autoplay is blocked, so playback still needs one
tap inside the embed.

## Reply to send Product

They are right about the branch, and right that Chrome and Safari end up with
different content. They are wrong that the embed player is uninvolved:
Spotify's own bundle keys on `settings.isSafari` when choosing between full
playback and preview.

The branch was added on measurement rather than assumption, but two of those
measurements have not held up — the iFrame API works in Safari today, and the
"no video in Safari" test was run against a URL that is equally dead in Chrome.
One question remains genuinely open, and it is Spotify's to answer: whether
`/embed/episode/{id}/video` serves a real video player to Safari at all. If it
does, the gate comes out and Safari gets video.
