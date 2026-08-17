# TSC — YouTube embeds & Picture-in-Picture

**Date:** 2026-08-06
**Status:** Reference note — no code change required
**Scope:** All custom YouTube embeds on thesignallingcompany.com

## TL;DR

Picture-in-Picture is **already enabled** on every custom YouTube embed and has been
since the feature shipped. There is nothing to update. If you can't see a PiP button,
that is expected — **YouTube's embedded player never renders one**. See "Why there is
no PiP button" below before re-opening this.

## How the embeds work

All YouTube video on the site flows through a single code path in `init.js`:

| Function | Line (as of `48d6a1e`) | Role |
| --- | --- | --- |
| `getYouTubeId()` | ~407 | Parses the CMS-pasted URL (`youtu.be`, `v=`, `/embed/`, `/shorts/`) |
| `mountYouTubeEmbed()` | ~418 | Builds the real privacy-mode iframe — **the only place `allow` is set** |
| `mountYouTubeFacade()` | ~459 | Click-to-play poster + play button (QW2 perf win) |
| `setupProjectVideos()` | ~534 | Routes `[data-yt-url]` to facade or direct mount |

Editors paste a plain YouTube URL into a CMS field bound to `data-yt-url`. Adding
`data-yt-facade` opts that element into the lightweight poster; the facade's click
handler then calls `mountYouTubeEmbed()`, so **facade and direct embeds share the
same iframe attributes**. One line covers the whole site.

### The PiP-relevant attributes

```js
iframe.allow =
  'accelerated-autoplay; autoplay; encrypted-media; picture-in-picture; web-share';
iframe.allowFullscreen = true;
```

`picture-in-picture` with no allowlist defaults to `'src'` — the iframe's own origin
(`youtube-nocookie.com`), which is what we want. Nothing sets `disablePictureInPicture`,
and no `sandbox` attribute is applied.

## Site audit (2026-08-06)

Swept all 15 live pages. **Three videos total, zero raw pasted `<iframe>`s** — nothing
bypasses `init.js`:

| Page | Video |
| --- | --- |
| `/` | `xhtLILNSEyU` (facade) |
| `/about` | `xhtLILNSEyU` (facade — same video as `/`) |
| `/projects/lineas-hld77` | `9G0OXItQ1bA` (facade) |

All other pages (`/railos`, `/railos/apps`, `/products`, `/services`, `/projects`,
`/leadership`, `/careers`, `/faq`, `/news`, `/contact`, `/projects/skoda-regiojet`,
`/projects/akiem-br189`) carry no video.

### Verified live

Mounted the Lineas embed and inspected it in-browser against `init.min.js` @ `48d6a1e`:

```
allow: "accelerated-autoplay; autoplay; encrypted-media; picture-in-picture; web-share"
disablepictureinpicture: false
sandbox: null
document.featurePolicy.allowsFeature('picture-in-picture',
  'https://www.youtube-nocookie.com')  →  true
```

## Why there is no PiP button

**`allow="picture-in-picture"` grants permission for PiP. It does not create a button.**

The button must come from either the browser's own UI or from code we write. YouTube's
player chrome lives inside a cross-origin iframe we cannot reach into, and YouTube does
not put a PiP control in its embedded player on any platform — the embed control bar is
CC, settings, fullscreen, share, and the YouTube wordmark. That's the whole set.

So the permission we set is what makes the **browser-native** routes work:

| Platform | How a viewer gets PiP |
| --- | --- |
| Desktop Chrome / Edge | Right-click **twice** on the video → "Picture in picture"; or the media hub button in the toolbar |
| macOS Safari | PiP from the address-bar audio icon, or right-click on the video |
| **iOS Safari** | **No button.** See below. |

### The iOS gap

On iOS the embed is mounted with `playsinline=1`, so the video plays inline underneath
YouTube's custom control overlay. The native iOS player controls — which are what carry
the PiP button on iPhone — never appear. No attribute change fixes this; it is a
consequence of embedding YouTube rather than a misconfiguration.

Tapping fullscreen *may* hand off to the native player on some iOS versions, which would
expose PiP there. This is inconsistent for YouTube embeds and is worth testing on-device
before promising it to anyone.

## If a visible PiP button is ever required

Two routes were considered on 2026-08-06 and **both were declined** in favour of leaving
the embeds as they are:

1. **Document Picture-in-Picture API** (confirmed supported in desktop Chrome). We'd add
   our own button and move the iframe into a PiP window. Gotcha: moving an iframe across
   documents reloads it, restarting playback — you'd need the YouTube IFrame API to
   capture `currentTime` and seek back after remount. Desktop Chrome/Edge only; **does
   not help iOS or Safari at all.**
2. **Self-host the video as a native `<video>`.** The only route that gives iOS a PiP
   button, and it allows a custom desktop button via `requestPictureInPicture()`. Costs:
   video hosting and bandwidth, loss of YouTube analytics and adaptive streaming, and a
   real rewrite of the embed code.

Route 2 is the only one that addresses the iOS case that prompted this note.
