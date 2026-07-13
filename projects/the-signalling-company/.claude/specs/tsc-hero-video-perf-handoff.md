# Handoff: TSC Hero Video / Lighthouse — Non-Code Actions

**Spec:** `tsc-hero-video-perf-2026-07-13.md` (T5 + T7)
**Date:** 2026-07-13
**Status:** Ready to action
**Staging:** https://tsc-v2.webflow.io/

This document covers everything that must happen **outside init.js** — in Webflow Designer, the site-wide head code, the Adobe Fonts project, and by the client. The code-side work (source-stripping video loader, progressive hero swap, shortened reveal failsafe) is being built separately in init.js and is referenced here only as context.

---

## 1. Webflow site-wide head code (`<head>`)

### 1z. ⚠️ REQUIRED — background-video source-strip snippet (delivers the bandwidth win)

**This is the single most important head-code action, and it is not optional.** Without it, the ~14 MB of wasted mobile video bandwidth is **not** saved — verified live on 2026-07-13.

**Finding (measured on staging, Slow-4G + 4× CPU):** Webflow renders each hero/CTA background video as a `<video autoplay preload>` with `<source src>` children, one wrapper per breakpoint. The browser fetches **every** variant's source at parse time (~19 MB total). `init.js` loads in the **footer**, so its source-strip runs *after* the browser has already started all four downloads — too late. Measured: footer strip → **all 4 fetched**; the head snippet below → **0 fetched** until `init.js` opts a variant in. The head snippet must run *during* parsing, which only a synchronous inline `<head>` script can do.

**Action:** paste the contents of `projects/the-signalling-company/head-video-strip.html` into **Project Settings → Custom Code → Head Code**, as high as the editor allows (above the preconnect/preload tags is fine — it has no external dependency). It is an inline `<script>` — do **not** add `defer`/`async` and do **not** move it to the footer.

**How it works with `init.js`:** the head snippet installs a `MutationObserver` at document-start that moves every managed video's `<source src>` into `data-src` and blanks the live `src` before the preload scanner sees it, then disconnects at `DOMContentLoaded`. `init.js` (footer) then reads `data-src` and hydrates only the active breakpoint's video — hero eagerly, CTA on scroll, with the progressive low→high swap. They share the `data-video-processed` guard and the `data-src` contract, so `init.js` never double-strips. If the snippet is ever removed, playback still works (videos are cached from the parse-time fetch) but the bandwidth win is lost.

**Verify after publish:** on mobile (390×844, Slow-4G), hard-load the homepage and filter Network by **Media** — you should see only `02-mobile-640x360` on load (hero), then `08-mobile-640x360` appear only when you scroll to the CTA. Zero `*-desktop-1280x720*` requests. On desktop, only `02-desktop-1280x720`.

### 1a. Preconnect render-critical origins

Paste these as high in the Webflow site-wide custom code (`<head>`) as the editor allows — above any other custom `<link>` or `<script>` tags. Order matters: preconnect first, then preload, then everything else.

```html
<!-- Typekit font CSS -->
<link rel="preconnect" href="https://use.typekit.net">

<!-- Typekit font files (served from p.typekit.net, requires crossorigin for font CORS) -->
<link rel="preconnect" href="https://p.typekit.net" crossorigin>

<!-- Consentpro (Finsweet cookie consent) -->
<link rel="preconnect" href="https://cdn.consentpro.io">
```

**Why / expected impact:** Without preconnect, the browser discovers these origins only when it parses the CSS or script tag that references them, then has to do DNS + TCP + TLS before fetching. Preconnect moves that handshake to the earliest possible moment. On a throttled mobile connection each handshake costs 200-400 ms; three origins = up to ~1 s of cumulative savings on the critical chain. Low risk — preconnect hints are ignored if the origin is never used.

### 1b. Preload above-fold Typekit font files

After the preconnect tags, add preload hints for the 1-2 font files used in the hero heading. The URLs contain hashed filenames that change per Typekit project build, so they must be captured live.

**How to grab the URLs:**

1. Open https://tsc-v2.webflow.io/ in Chrome.
2. Open DevTools > Network tab. Filter by **Font**.
3. Hard-reload (Cmd+Shift+R / Ctrl+Shift+R).
4. Look for `.woff2` files served from `p.typekit.net`. There will be several — identify the one(s) used in the hero H1 by checking the **Initiator** column (should trace back to the Typekit CSS that styles `.gsap_split_line` or the H1). Typically the bold/black weight of the brand typeface.
5. Right-click the request > Copy > Copy link address.

Then add (substituting the real URLs):

```html
<!-- Preload the hero heading font (bold/black weight) -->
<link rel="preload" as="font" type="font/woff2"
      href="https://p.typekit.net/p/af/XXXXXX.woff2" crossorigin>

<!-- If a second above-fold weight is needed (e.g. body regular visible in the hero): -->
<link rel="preload" as="font" type="font/woff2"
      href="https://p.typekit.net/p/af/YYYYYY.woff2" crossorigin>
```

**Why / expected impact:** Preloading the hero font file lets the browser start fetching it immediately rather than waiting until CSSOM construction discovers the `@font-face`. On throttled mobile this can shave 200-500 ms off the first font paint. Risk: if Typekit republishes the project the hashed URL changes and the preload becomes a wasted fetch (harmless but noisy). Re-capture the URL after any Typekit project change.

**Important:** Only preload 1-2 files. Preloading all 8-9 Typekit fonts would contend for bandwidth and make things worse.

### 1c. Tag ordering in `<head>`

The final order in Webflow's site-wide head code should be:

1. Preconnect tags (1a above)
2. Preload tags (1b above)
3. Any existing custom head code (analytics, meta, etc.)

Webflow injects its own tags (charset, viewport, Webflow CSS, the Typekit `<link>`) before custom head code, so our preconnect/preload will fire after those but before any custom scripts — which is the best we can achieve within Webflow's constraints.

---

## 2. Adobe Fonts (Typekit) project

### 2a. Enable `font-display: swap`

This is the **single biggest LCP win** in Phase 2 and carries very low risk.

**Steps:**

1. Log in to https://fonts.adobe.com/ with the account that owns the TSC web project.
2. Go to **Web Projects** (top nav > My Adobe Fonts > Web Projects).
3. Find the TSC project (the one whose kit ID matches the `<link>` in the live site head).
4. Click **Edit Project**.
5. Look for a **"Font Display"** or **"font-display"** setting. Set it to **swap**.
   - If the UI does not expose this setting, append `&display=swap` to the Typekit embed URL in Webflow's site-wide head code. For example, change:
     ```
     https://use.typekit.net/XXXXXXX.css
     ```
     to:
     ```
     https://use.typekit.net/XXXXXXX.css?display=swap
     ```
     (Note: Adobe Fonts has historically supported the `&display=swap` query parameter. If it stops working, the project-level setting is the fallback.)
6. Save / republish the web project.

**Why / expected impact:** Currently the browser blocks text rendering until every Typekit font file finishes downloading — the hero H1 is invisible until all fonts arrive (~1.7-2.2 s each under Slow-4G throttling). With `font-display: swap`, the browser immediately paints the H1 in a system fallback font, then swaps to the brand font once it loads. This directly reduces LCP because the hero heading IS the LCP element. The trade-off is a brief FOUT (flash of unstyled text) — the heading appears in a system font for a fraction of a second before the brand font loads. This is standard practice and visually acceptable for most sites.

### 2b. Trim unused font weights

1. In the same **Edit Project** screen, review which weights and styles are included.
2. Check which weights are actually used above the fold on the homepage. Typically only 1-2 weights appear in the hero area (e.g. Bold/Black for the H1, Regular for body text).
3. Remove any weights not used on the site at all (check the full site, not just the homepage — some weights may be used on inner pages).
4. Every weight removed is one fewer font file to download. At ~40-80 KB per woff2 file, removing 3-4 unused weights saves 120-320 KB and reduces network contention during the critical window.

**Why / expected impact:** The diagnostic trace showed 8-9 font files loading. If the site only uses 4-5 weights in practice, the unused ones are pure waste. Each removed file frees bandwidth for the fonts that matter. Lower risk than `font-display: swap` — just ensure no page on the live site uses the weight before removing it.

---

## 3. Webflow Designer

### 3a. Remove dead `<source>` webm entries

On both the hero and CTA background-video elements (`.video_about-b-video` and `.video_cta`), the Webflow-generated markup includes `<source>` tags for `.webm` variants alongside the `.mp4` variants. Chrome (and all Chromium browsers) always picks the MP4 — the webm sources are parsed but never used.

**Steps:**

1. Open the TSC project in Webflow Designer.
2. Navigate to the homepage.
3. Select each background-video element (hero desktop, hero mobile, CTA desktop, CTA mobile).
4. In the video settings, check if there is a webm file uploaded alongside the MP4. If so, remove the webm file.
5. Repeat for any other pages that use background video.

**Why / expected impact:** Removing dead markup reduces DOM size (marginally) and eliminates the browser's need to parse and evaluate sources it will never use. The impact is small but it is zero-risk housekeeping.

### 3b. Wire `data-video-lowsrc` on the hero wrapper

This step depends on the client (Cliff) producing the low-res hero clips (see section 4 below). Once those clips are available and uploaded to Webflow:

1. Select the hero video wrapper element (`.video_about-b-video`).
2. Add a custom attribute:
   - **Name:** `data-video-lowsrc`
   - **Value:** the Webflow-hosted URL of the low-res clip for that breakpoint

   If there are separate desktop and mobile wrappers, set the attribute on each with the appropriate low-res clip URL.

**Context:** The init.js video loader reads `data-video-lowsrc` to perform the progressive low-to-high quality swap. On page load, if this attribute exists, the loader plays the small low-res clip first (fast to buffer, ~400-800 KB), then seamlessly swaps in the full-quality clip after the page has finished loading. If the attribute is absent, the loader skips the progressive swap and serves the normal full-quality clip directly — so this is safe to defer until the assets exist.

---

## 4. Client (Cliff) asset request

**Priority:** Needed for the progressive hero swap (T2 in the spec). The code will work without these assets but the low-to-high swap feature is inert until they exist.

### Brief for Cliff

> **Subject: Low-res hero video clips needed for website performance**
>
> Cliff — we need a set of low-resolution hero clips to improve load speed on the website. The site will load these small clips first (near-instant on mobile), then seamlessly swap in the full-quality versions once the page has finished loading. The user sees video playing almost immediately instead of waiting for a large file.
>
> **What we need:**
>
> For each hero background video currently on the site (homepage hero, and the CTA section video if applicable), produce a low-quality companion clip:
>
> - **Resolution:** 480 x 270 (or nearest 16:9 equivalent)
> - **File size target:** 400-800 KB per clip (aim for the lower end)
> - **Bitrate:** ~500-800 kbps
> - **Format:** MP4 (H.264)
> - **Duration:** Same as the existing clip (just lower quality)
> - **Audio:** None (strip audio track — these are muted background videos)
>
> If you are using FFmpeg, something like:
> ```
> ffmpeg -i hero-desktop-full.mp4 -vf scale=480:270 -b:v 600k -an hero-desktop-low.mp4
> ```
>
> **We need one low-res clip per breakpoint:**
> - Desktop hero (low)
> - Mobile hero (low)
> - Desktop CTA (low) — optional, lower priority
> - Mobile CTA (low) — optional, lower priority
>
> **Optional but recommended:** The current mobile 360p clips (`02-mobile-640x360.mp4` at 4.57 MB and `08-mobile-640x360.mp4` at 4.21 MB) are significantly oversized for 360p content. A re-encode at a sensible bitrate (~1-1.5 Mbps) should bring these down to ~1-1.5 MB without visible quality loss. This would halve mobile bandwidth even before the progressive swap kicks in.

**Why / expected impact:** The progressive swap eliminates the blank/poster wait on slow connections. Instead of waiting 3-5 seconds for a 5 MB clip to buffer, users see a low-quality video playing within ~1 second, which is then invisibly replaced by the full-quality version. On fast connections the swap happens so quickly it is imperceptible.

---

## 5. consentpro assessment

**Status: Investigation — do not change without confirming compliance.**

The diagnostic trace shows `consentpro.js` (Finsweet cookie consent) is render-blocking and sits at the root of the critical request chain, adding ~676 ms before anything else can proceed. It loads from `cdn.consentpro.io` as a synchronous `<script>` in the `<head>`.

### What to investigate

1. **Can consentpro be loaded `async` or `defer`?**
   - Check Finsweet's documentation for whether their consent script supports async loading. Some consent tools *must* be synchronous to block other scripts (analytics, tracking) from firing before consent is granted — this is a legal/GDPR requirement, not a performance choice.
   - If Finsweet explicitly supports `async`, test it: does the consent banner still appear before any tracking scripts fire? Does blocking behaviour still work correctly?

2. **Can consentpro be loaded after fonts?**
   - If `async` is not supported, can the `<script>` tag be moved lower in the `<head>` (after the Typekit `<link>`) so that font discovery is not blocked by the consent script?
   - Webflow's custom code injection order may not allow this — the consent script may need to be in the site-wide head code, which Webflow injects after its own tags.

3. **Alternative: preconnect only (already covered in section 1a)**
   - If the script must remain synchronous, the preconnect hint for `cdn.consentpro.io` (section 1a above) at least eliminates the DNS/TCP/TLS latency from the critical chain. The script fetch itself still blocks, but the connection is pre-warmed.

### Decision criteria

- If Finsweet confirms `async` is safe and consent-compliant: change the script tag to `<script async ...>`.
- If `async` breaks consent gating: leave synchronous, rely on preconnect to reduce latency.
- Document findings for future reference — this is a known bottleneck that may resolve itself if Finsweet improves their loader or if the site moves to a lighter consent solution.

**Why / expected impact:** At ~676 ms of render-blocking time, consentpro is a meaningful chunk of the critical chain. If it can be made async, FCP could improve by 400-600 ms. But consent compliance is non-negotiable — the risk of getting this wrong (tracking scripts firing before consent) outweighs the performance gain. Hence: investigate, do not assume.

---

## 6. Verify-live checklist

After publishing the head-code changes (sections 1 and 2), run through this checklist on the live site to confirm everything is working.

### Network panel checks

1. **Open** https://tsc-v2.webflow.io/ in Chrome. DevTools > Network tab. Disable cache. Hard-reload.

2. **Preconnect firing:**
   - Filter by "Other" or look at the waterfall. You should see early DNS/TCP/TLS entries for `use.typekit.net`, `p.typekit.net`, and `cdn.consentpro.io` — these should appear before the Typekit CSS or consent script requests.
   - If they do not appear, confirm the `<link rel="preconnect">` tags are present in the page source (View Source, search for `preconnect`).

3. **Preloaded fonts:**
   - Filter by "Font". The preloaded woff2 file(s) should appear very early in the waterfall (high up, before other font files). The **Initiator** column should show `<link rel="preload">` rather than the Typekit CSS.
   - If the preloaded font shows a 404 or mismatched URL, the Typekit project was republished and the hashed URL changed — recapture per section 1b.

4. **`font-display: swap` behaviour:**
   - Throttle to **Slow 3G** (Network tab > throttle dropdown).
   - Hard-reload and watch the hero heading. It should:
     - Paint immediately in a system/fallback font (within 1-2 s).
     - Swap to the brand font once the Typekit file loads.
   - If the heading remains invisible until fonts load, `font-display: swap` is not active. Check the Typekit CSS file (open it in a new tab, search for `font-display`) — it should say `font-display:swap`.

5. **No regressions:**
   - All pages still load without console errors.
   - The cookie consent banner still appears and functions correctly.
   - Fonts render correctly on all pages (no missing weights, no fallback fonts persisting).

### Throttled Lighthouse LCP delta

1. DevTools > Lighthouse tab. Select **Mobile**, **Performance** only.
2. Run 3 times, take the median LCP value.
3. Compare against the baseline: **LCP 4,313 ms** (from the spec diagnostic).
4. Target: LCP < 3,000 ms. Stretch: < 2,500 ms.
5. Note: Lighthouse scores are noisy (the spec saw 3.9 s / 6.8 s / 11.1 s across identical runs). Use the median of 3+ runs, or use PageSpeed Insights (https://pagespeed.web.dev/) for a more stable remote measurement.

### Summary of expected changes vs baseline

| Metric | Baseline | Expected after head-code changes |
|---|---|---|
| FCP | 1,780 ms | ~1,400-1,600 ms (preconnect saves handshake time) |
| LCP | 4,313 ms | ~3,000-3,500 ms (font-display:swap lets H1 paint in fallback immediately) |
| CLS | 0.0002 | ~0.001-0.01 (FOUT may cause minor layout shift — monitor) |
| TBT | ~0 ms | ~0 ms (no change expected) |

The largest LCP improvement will come from `font-display: swap` (section 2a). Preconnect and preload are supporting wins. The init.js code changes (video deferral, failsafe shortening) will provide additional improvement measured separately.
