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

**Transcoding:** standard encoding is free and automatic, and produces a full adaptive
ladder for HLS *plus* per-resolution direct MP4 files at **240p, 360p, 720p and 1080p**.
This is the decisive feature — RHP picks a rendition per breakpoint from a plain URL, with
no HLS library needed. Note the MP4 ladder has **no 480p/540p step**, and RHP currently
serves Vimeo's 540p; closest equivalents are 720p (larger) or 360p (smaller). Decide which
at migration time and measure against the current 540p payload.

**Gotchas:**
- MP4 Fallback must be enabled on the video library's Encoding tab **before** upload —
  only videos uploaded after enabling get MP4 files generated. Set this first.
- Enabled resolutions must likewise be configured **before** upload; changing them later
  does not retro-encode existing videos, they need re-uploading.
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

**Transcoding:** Cloudflare does encode a full adaptive ladder — but *only for HLS/DASH*.
The MP4 download is a **single `default.mp4` at the highest rendition only**; there is no
way to request 720p or 360p as a direct MP4. Community requests for multi-resolution MP4s
have gone unanswered, and the documented workaround is stitching HLS segments with ffmpeg.

**Why this rules it out for RHP as a drop-in:** the dial holds up to 5 concurrent `<video>`
elements. With one MP4 rendition we would push the 1080p file to phones five times over,
which the mobile-readyState branches in `work-dial.js` exist specifically to avoid. Adopting
Cloudflare Stream would mean rewriting the dial onto HLS (hls.js on non-Safari) rather than
swapping URLs — a materially larger job than the Bunny path.

**Other gotchas:** MP4 download must be enabled per video via a POST to `/downloads`, then
polled until `status` is `ready` — not a one-time library-wide setting like Bunny's, so
client self-serve uploads would need a small automation.

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

## Cost risk: PAYG vs RHP's preloading dial

The fair objection to usage billing is that RHP is a heavy consumer by design. Confirmed
from the code:

- `work-dial.js:319` — the two sliding-window pool videos are `preload="auto"` (full download)
- `work-dial.js:349` — the generic video is `preload="auto"`
- `work-dial.js:85` — all *other* videos on the page default to `preload="metadata"` (cheap)
- The bg video mirrors the fg `src`, so it is a browser cache hit, **not** a second download

So ~4 full downloads at rest, **plus one more for every dial rotation** as the window slides.
Eight videos for an engaged visitor is a realistic figure, not a worst case.

### Measured file sizes (from live staging, 2026-08-18)

Not estimates — these are `Content-Length` values pulled from the real Vimeo URLs on
`rhpcircle.webflow.io`:

| Asset | Size |
|---|---|
| Dial loop, 540p (desktop) | **1.08 MB** |
| Dial loop, 360p (mobile) | **0.59 MB** |
| Case film A (`1166421249`), 540p | **24.4 MB** |
| Case film B (`1166421401`), 540p | **17.1 MB** |

There are 6 dial videos (one per case study) plus the hardcoded generic clip, and each case
page carries **2 full case films ≈ 41.5 MB**.

**The dial loops are not the cost — the case films are.** A single case page moves ~40× what
the entire homepage dial does. My earlier estimate modelled only the dial and was wrong about
where the money goes.

### Actual traffic (client GA, provided 2026-08-18)

- ~3,400 sessions **year to date**
- ~415 sessions / 430 users per month since the new site launched (May–Jul)
- Full-year monthly average ~450 sessions
- August tracking higher, but inflated by the team's own testing traffic
- **Planning figure: 400–500 sessions/month**, growth expected from the marketing push
  starting 18 Aug

### Every page measured (live staging, 540p desktop, 2026-08-18)

Each case page carries a different number of films at very different weights, so a single
"representative" page is misleading. Measured `Content-Length` for every page-specific film:

| Page | Films | Page-specific bytes |
|---|---|---|
| Home | 6 dial loops + generic | 7.6 MB |
| About | none (reuses cached dial clips) | **0** |
| Privacy policy | none | 0 |
| /work/tommy-hilfiger | 1 | 12.6 MB |
| /work/starfish-space | 3 (20.9 + 1.9 + 2.5) | 25.4 MB |
| /work/microsoft | 2 (14.5 + 12.9) | 27.4 MB |
| /work/overland-ai | 3 (21.3 + 1.9 + 6.0) | 29.2 MB |
| /work/stoke-space | 2 (24.4 + 17.1) | 41.5 MB |
| **/work/remote** | 3 (23.2 + **35.3** + 22.6) | **81.0 MB** |
| **Whole site, every page** | 21 videos | **~225 MB** |

Average case page is **36 MB**, not the 41.5 MB stoke-space figure used earlier — so the
previous 3-page estimate of 132 MB was slightly conservative; a true average 3-page journey
is ~116 MB.

**Outlier worth acting on:** `/work/remote` is 81 MB — 6.4× the lightest case page, driven by
a single 35.3 MB film. Compressing that one page would cut the site's total video payload by
around 15%.

### Worst case: every visitor views every page

| Sessions / month | Transfer | Bunny cost |
|---|---|---|
| **450 (today)** | 101 GB | **~$1.01** |
| 500 | 113 GB | ~$1.13 |
| 1,000 | 225 GB | $2.25 |
| 2,500 | 563 GB | $5.63 |
| 5,000 | 1.13 TB | $11.25 |
| ~9,100 | 2 TB | ~$20 — **Vimeo's cap breaks here** |

Even on the assumption that every single visitor reads the entire site end to end, RHP at
current traffic lands at **~$1/month** — still essentially the account minimum. Vimeo's 2 TB
cap would not be reached until ~9,100 sessions/month, still **20× current traffic**.

### At real traffic: the bill is the account minimum

A realistic journey (home + 3 work pages, ~116 MB) at 450 sessions is ~52 GB/month ≈ **$0.52**
of delivery. The whole library — 14 case films, 6 dial clips in two renditions, the generic
clip, ~228 MB of source, and perhaps 3× that once Bunny's renditions are generated — stores
for well under **$0.01/month**.

> ### Total: **$1/month** — the account minimum. Bandwidth and storage together do not reach it.
>
> Even the every-visitor-reads-everything worst case below only gets to ~$1.01.

The PAYG exposure that prompted this analysis is, at RHP's actual scale, not a real risk.

### Footnote: at this scale Cloudflare R2 would literally be $0

R2's permanent free tier covers 10 GB of storage with zero egress charges; RHP's whole
library is ~260 MB. The trade-off is no transcoding, no renditions and no upload dashboard —
we would hand-encode and upload every video. Bunny's ~$12/year buys the client self-serve
uploads and automatic 360p/720p renditions. That is the right trade at this price.

The saving grace is that **the 6 dial videos are the same URLs on every page** (the dial CMS
items live outside the Barba container). After the homepage they are browser cache hits and
cost nothing again — so the `perf-fg-video-preload-on-transition` warming is already free.

All figures are an upper bound: `Content-Length` is the whole file, while progressive
download means a visitor who scrolls past a film part-way fetches only part of it.

### Flagged: the case films have no mobile rendition

The dial loops ship 360p and 540p variants, but `1166421249` and `1166421401` exist **only at
540p**. Phones download the full 24.4 MB and 17.1 MB files. That is simultaneously a cost
item and a mobile-performance problem, and it is the single biggest lever available — Bunny
generates a 360p rendition for free, which would roughly halve mobile traffic on the pages
that dominate the bill.

### Hard protections (both worth configuring on day one)

1. **Bunny is prepaid credit, not post-paid invoice** — confirmed against bunny.net's own
   billing docs. You *"add credit to your account, and charges are deducted as you use
   services"*, via Billing → Recharge Account (presets $10–$2000, card/PayPal/Apple Pay/BTC,
   no fees). Credits never expire; the only floor is the $1/month minimum. You cannot receive
   an invoice for money you have not already deposited.

   **Two caveats to configure deliberately:**
   - **Auto-recharge exists and defeats the cap.** If it is switched on, the account tops
     itself up to avoid interruption — which is convenient but removes the hard ceiling.
     Leave it off if the prepaid balance is the intended safety limit, or leave it on and
     rely on the per-zone bandwidth limit below instead. Pick one deliberately.
   - **Do not let the balance lapse.** Bunny's docs warn that failure to recharge leads to
     suspension, disabled zones, and *deletion of stored data within days*. Keep a buffer and
     keep masters archived elsewhere; never treat Bunny as the only copy of the videos.
2. **Per-pull-zone monthly bandwidth limit.** Set a ceiling; the zone disables itself when
   reached and stops accruing charges. Setting this at e.g. 3 TB caps exposure at ~$30/mo
   by arithmetic, not by trust.

Cloudflare Stream, by contrast, bills **post-paid** on minutes delivered — that is the model
with genuine runaway-invoice risk, though its cached-loop exemption offsets some of it.

### Levers on our side if volume climbs

- Serve **360p to mobile** instead of 720p — roughly 4× cheaper, and phones are where the
  concurrent-video load is worst anyway.
- Shorten or more aggressively compress the loops; these are silent background clips where
  bitrate can go a long way down before anyone notices.
- Long cache TTLs on the pull zone: repeat visitors and `loop` playback re-serve from browser
  cache and cost nothing.
- The pool is already the minimum useful size (active ±1); shrinking it further would undo
  the instant-switch behaviour from `.claude/specs/video-sync-homepage.md`.

**Open question for the client:** current monthly traffic. Every figure above is a rate card
until we put their real numbers through it.

---

## Recommendation

**Bunny Stream.** It is the only option that hits all five of: permanent unsigned MP4 URLs,
**per-resolution direct MP4s (240p/360p/720p/1080p)**, per-GB pricing that suits looping
background video, free standard encoding with automatic poster thumbnails, and a self-serve
upload dashboard the client can use without us. Expected cost is low single-digit dollars
per month.

Cloudflare Stream is *not* a like-for-like fallback. Its single-rendition MP4 download would
force the dial onto HLS to keep per-breakpoint resolutions, turning a URL swap into a player
rewrite. Only revisit it if we decide to move to HLS for other reasons.

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
