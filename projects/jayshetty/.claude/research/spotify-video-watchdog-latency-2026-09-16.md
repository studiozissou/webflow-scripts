# Spotify video player — "inconsistent audio/video" re-investigation (16 Sep 2026)

Prompted by Annie (jayshetty.me), 2–3 Sep, after v1.2.1 shipped: several team
members still get audio players, others "a mix of audio and video players", on
fresh laptops with cleared caches. Measured against the **live** page
(`www.jayshetty.me/podcast`, player v1.2.1 via jsDelivr, byte-identical to the
repo), Safari 26.6.2 on an M1 driven by AppleScript, Chrome via DevTools MCP
with network throttling, and `curl` from NL plus a US-egress fetch.

## Verdict in one line

Reproduced. Spotify's `/video` embed page takes anywhere from 0.5 s to well
over 6 s after its `load` event to post `ready`; the player's 6 s watchdog
treats every slow one as a dead card and permanently swaps that item to the
audio embed. Two of ten fresh Safari runs today fell back or landed within
1.2 s of the limit. Nothing about the browser, region, cache, DRM, codecs,
episode content or the iframe attributes is involved.

## What was ruled out (with the measurement that rules it out)

| Hypothesis | Result |
| --- | --- |
| Live page still serves an old player | Live, staging (`jayshetty.webflow.io`) and a US-edge fetch all pin `@jayshetty-podcast-player-v1.2.1`; the CDN file diffs clean against the repo; Cloudflare `cf-cache-status: HIT`, `last-modified` 14 Sep |
| Safari itself | 4/4 initial Safari 26.6.2 runs: `/video` src, `ready` 0.5–2.4 s after load, playback started, moving picture |
| Spotify's `isSafari` server flag | The embed bundle's playback-mode selector (`7544-*.js`, module 12431) only reaches the `isSafari` term for non-episode content; for episodes the branch is entered via `isEpisode` and resolves to FULL when `defaultAudioFileObject.video[0].requiresDRM` is false |
| DRM / preview mode | `requiresDRM: false`, `isPlayable: true`, `hasVideo: true` for all 12 first-page episodes; FairPlay reports available in this Safari; the manifest offers H.264 320p–1080p and VP9 |
| Region (NL vs US) | Embed page fetched via a US egress (Google, South Carolina) returns identical settings and file data |
| Audio-only episodes | Only EP 828 (page 4, Riz Ahmed) is `oembed.type = rich`; all other 26 Spotify-era items are `video` |
| Cookie / anonymous session | Safari blocks third-party cookies, so every run here was anonymous (`isAnonymous: true`), and it played |
| Blocked autoplay looks like audio | With `play()` suppressed the video embed sits on a video still with a play button — unmistakably video |
| `sandbox`, `loading=lazy`, audio-then-video swap slow the page | Standalone probe, six variants × 4 samples: load 223–565 ms, `ready` 45–70 ms later, no outliers |
| Watchdog too tight on slow *network* only | Chrome Fast 3G cold cache: `ready` 1.3 s after load; Slow 3G + 4× CPU: `ready` arrived *before* `load`. Network alone is not the trigger |

## The reproduction

Live page, Safari 26.6.2, fresh load each run, JS click on a Spotify Watch
button, instrumentation logging iframe `load`, `src` changes and every
message whose `source` is the swapped iframe:

| Run | insert → load | load → `ready` | Outcome |
| --- | --- | --- | --- |
| t1 | 0.58 s | 0.47 s | video |
| t2 (second item, same page) | 1.23 s | 0.54 s | video |
| t3 | 1.39 s | 1.60 s | video |
| t4 | 1.54 s | 2.40 s | video |
| t6 | 0.96 s | 0.99 s | video |
| t7 | 1.79 s | 2.73 s | video |
| t8a | — | 5.58 s after insert | video, 0.4 s from the limit |
| t8b | — | never within window | **audio fallback** |
| t9-1 | 2.83 s | none in 6.4 s | **audio fallback** (`__videoFellBack: true`, src reverted, no `ready` ever seen) |
| t9-2 | 3.50 s | 4.78 s | video, 1.2 s from the limit |

Runs t8–t9 were an hour after t1–t7; Spotify's iFrame API script itself took
8 s to arrive in t9-2. The latency is Spotify-side and time-of-day dependent,
which is exactly what a team in another country on another network would
experience as "some of us get audio, some get a mix".

The fallback is also **sticky**: `__videoFellBack` stays set for the page
session, so once an item drops to audio it stays audio on every further Watch
click until reload.

Standalone control (`podcast-player/video-latency-probe.html`, same episode,
same Safari, no watchdog): 30 of 30 samples had `ready` within 636 ms of
inserting the iframe. The slowness is specific to the live page environment
(heavy page, 12 YouTube iframes, Finsweet, Swiper) and Spotify's backend
variance, not to anything the player does to the iframe.

## Why the previous fixes didn't hold

- v1.2.0 removed the engine gate: correct, Safari plays video.
- v1.2.1 started the 6 s countdown at `load` instead of at the swap: helped
  the download-time case, but the hydration-to-`ready` gap after `load` is
  itself unbounded and was measured at 4.8 s and >6.4 s today.

## Recommended fix (spec: `../specs/podcast-video-watchdog-latency.md`)

Stop treating a slow Spotify page as a dead one. Lengthen the watchdog to
20 s after `load` and make the fallback non-sticky, so a Watch click after a
fallback retries video. Follow-up: adopt the iFrame API's own `preferVideo`
path so Spotify chooses `/video` per episode (this also handles EP 828).

## Reply to send Yoni

> Found it, and I could reproduce it here this time. The player gives
> Spotify's video embed six seconds to say it's alive before switching that
> episode to the audio backup. Spotify's video player is sometimes slower
> than that to start up — nothing to do with the browser, the network speed
> or caches, it varies from minute to minute on Spotify's side — and once an
> episode has switched to audio it stays audio until the page is reloaded.
> That's why it looked random across the team and why clearing caches did
> nothing. The fix gives Spotify far longer before falling back and lets the
> next click try video again. Safari still needs one tap inside the player to
> start playback, which is Safari's autoplay policy rather than ours.
