# RHP — Vimeo Replacement: Direct-Link Video Hosting Options

**Date:** 2026-08-18
**Trigger:** Vimeo 2026 pricing restructure (Bending Spoons acquisition; legacy users
reporting increases up to ~670%, seat-based billing, 2 TB/mo bandwidth cap on self-serve plans).

---

## What RHP actually needs

RHP does **not** use the Vimeo embed/iframe or player.js. `work-dial.js` sets a raw
progressive MP4 URL as the `src` of native `<video>` elements:

```
work-dial.js:16
const GENERIC_VIDEO_URL = 'https://player.vimeo.com/progressive_redirect/playback/1167326952/rendition/540p/file.mp4?...&signature=...';
```

Per-project videos come from Webflow CMS text fields (the "Vimeo Link" field bound in
the Designer — see `.claude/specs/feat-about-case-video-controls.md`).

Hard requirements for any replacement:

| Requirement | Why |
|---|---|
| Permanent, non-expiring public MP4 URL | Stored in Webflow CMS fields; can't re-sign per request |
| HTTP byte-range support | `applyActive()` seeks `currentTime` to keep fg/bg in sync |
| Fast CDN, low TTFB | 5 concurrent elements (fg, bg, poolPrev, poolNext, generic) |
| Per-GB (not per-minute) billing, ideally | Videos are silent loops — minutes-delivered pricing punishes looping |
| Poster/thumbnail URL | `setVideoSourceAndPoster()` |
| Multiple renditions (540p/720p) | Mobile vs desktop |
| Self-serve upload UI | Client uploads case-study videos themselves |

Not needed: DRM, analytics, adaptive HLS (native `<video>` progressive is the current
architecture), captions, live streaming.

---

## Options

### 1. Bunny Stream — **recommended**
- https://bunny.net/stream/ · pricing: https://bunny.net/docs/stream/pricing
- URL patterns: https://bunny.net/docs/stream/storage-structure

Public URLs, no token required by default:

```
https://{pull_zone}.b-cdn.net/{video_id}/play_720p.mp4   (also 1080p / 360p / 240p)
https://{pull_zone}.b-cdn.net/{video_id}/playlist.m3u8
https://{pull_zone}.b-cdn.net/{video_id}/thumbnail.jpg
https://{pull_zone}.b-cdn.net/{video_id}/original
```

Pricing (Aug 2026): storage **$0.01/GB/mo**; delivery **$0.010/GB** Europe & North America
($0.030 Asia/Oceania, $0.045 South America, $0.060 MEA); standard encoding **free**
(premium $0.025–$0.150/min); transcription $0.10/language-minute; DRM is a separate
$99/mo add-on we don't need. Roughly $1/mo minimum account spend.

Order-of-magnitude for RHP: 540p loops ≈ 2–3 MB each, ~10 clips fetched per visit ≈ 25 MB.
At 10k visits/month ≈ 250 GB ≈ **~$2.50/mo delivery**. Storage of ~50 clips is cents.

**Gotchas:**
- MP4 Fallback must be enabled on the video library's Encoding tab **before** upload —
  only videos uploaded after enabling get MP4 files generated. Set this first.
- MP4 fallback is capped at 720p on some library configs; 540p/720p is all RHP uses, fine.
- Security tab has *Allowed domains* (empty = unrestricted) and *Allowed referrers*. If we
  lock these down, add production, the `.webflow.io` staging host, and the local dev origin
  used by `/local`, or the pool videos will 403.

### 2. Cloudflare Stream — solid runner-up
- https://www.cloudflare.com/products/cloudflare-stream/
- pricing: https://developers.cloudflare.com/stream/pricing/
- MP4 downloads: https://developers.cloudflare.com/stream/viewing-videos/download-videos/

```
https://customer-{code}.cloudflarestream.com/{uid}/downloads/default.mp4
```

$5 per 1,000 minutes **stored** + $1 per 1,000 minutes **delivered**; encoding and ingress
free; bandwidth included; no minimum. Notably, Cloudflare states content served from the
browser cache is not billable — which specifically covers short looping video, so RHP's
loop pattern is cheaper here than the raw per-minute rate suggests.

**Gotchas:** MP4 download must be enabled per video via an API call to `/downloads` —
it is not a one-time library-wide setting like Bunny's, so client self-serve uploads would
need a small automation. Only one `downloads/default.mp4` rendition, no per-resolution MP4s.

### 3. Mux — overkill here
- https://www.mux.com/ · pricing: https://www.mux.com/pricing
- static renditions: https://www.mux.com/docs/guides/enable-static-mp4-renditions

Standard static renditions are free to generate but billed per minute stored and delivered;
advanced (resolution-specific) renditions add encoding cost from $0.0036/min at 720p.
Excellent API and player, but priced for products, not a portfolio site's background loops.

### 4. Cloudflare R2 / Bunny Storage — dumb file hosting, cheapest
- R2: https://www.cloudflare.com/developer-platform/products/r2/ ·
  https://developers.cloudflare.com/r2/pricing/ — $0.015/GB/mo, **zero egress**, 10 GB free tier.
- Bunny Storage + CDN: https://bunny.net/pricing/ — $0.01/GB stored, $0.01/GB delivered.

Since RHP's videos are already encoded MP4s, an object store behind a custom domain fully
satisfies the technical requirements at near-zero cost. Trade-off: no transcoding, no
thumbnail generation, no upload dashboard — the client would need us (or a Dropbox-style
handoff) for every new video. Viable if the client is happy for us to handle uploads.

---

## Recommendation

**Bunny Stream.** It is the only option that hits all four of: permanent unsigned MP4 URLs,
per-GB pricing that suits looping background video, free standard encoding with automatic
poster thumbnails, and a self-serve upload dashboard the client can use without us.
Expected cost is low single-digit dollars per month.

Cloudflare Stream is the fallback if the client already has a Cloudflare account and wants
one vendor — but the per-video MP4-enable API call makes client self-serve uploads clunkier.

---

## Migration plan (when approved)

1. Create Bunny Stream library, **enable MP4 Fallback first**, then bulk-upload existing videos.
2. Update CMS: rename the "Vimeo Link" field to "Video URL" (or add a new field and migrate),
   repoint each item to `https://{zone}.b-cdn.net/{id}/play_720p.mp4`. Bulk CSV re-import is
   faster than per-item editing if item count is high.
3. Swap `GENERIC_VIDEO_URL` in `work-dial.js:16`.
4. Update posters to Bunny `thumbnail.jpg` URLs, or keep the existing Webflow CDN posters.
5. **Update the test assertion** at
   `tests/acceptance/fix-ios-mobile-dial-video-question-mark.spec.js:47`
   (`expect(src).toContain('vimeo')`) — it will fail after the swap. Check
   `feat-about-case-video-controls.spec.js` for the same pattern.
6. Add a `preconnect` for the b-cdn.net origin alongside the existing ones in `init.js:75`.
7. Verify: fg/bg drift stays within the ±0.1s / ±0.3s tolerance from
   `.claude/specs/video-sync-homepage.md` — this is the real risk, since it depends on
   byte-range seeking behaviour on the new CDN.
8. Keep the Vimeo account alive on a paid tier until the swap is verified in production —
   Vimeo direct links stop working the moment the account is downgraded.

---

## Note on the current Vimeo links

Vimeo's help docs state third-party/direct links do **not** expire, but they require a
Standard, Advanced, Pro, Business, Premium, or Enterprise plan. Downgrading to Free/Starter/
Plus **immediately breaks every direct link already embedded** (they reactivate on upgrade).
So downgrading to dodge the price rise is not an option — it's a migration or full price.
Separately, `progressive_redirect` links obtained via the Vimeo *API* are 24-hour signed
links; only the ones from the direct-links UI are durable. Worth confirming which kind the
hardcoded `GENERIC_VIDEO_URL` is.

## Sources
- https://bunny.net/docs/stream/pricing
- https://bunny.net/docs/stream/storage-structure
- https://developers.cloudflare.com/stream/pricing/
- https://developers.cloudflare.com/stream/viewing-videos/download-videos/
- https://www.mux.com/docs/pricing/video
- https://developers.cloudflare.com/r2/pricing/
- https://help.vimeo.com/hc/en-us/articles/12426150952593-How-to-access-my-video-s-direct-links
