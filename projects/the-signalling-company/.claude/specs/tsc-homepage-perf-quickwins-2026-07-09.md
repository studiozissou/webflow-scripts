# TSC Homepage Performance — Quick Wins

> Date: 2026-07-09
> Trigger: Client reported the site loads slowly. Suspected background videos.
> Method: Chrome DevTools performance trace of `https://tsc-v2.webflow.io/` (desktop, no throttling)
> Baseline trace: `projects/the-signalling-company/.claude/audits/tsc-home-trace-2026-07-09.json.json.gz`
> Scope: **Quick wins only**, both devices. Keep the Spline scene (defer, don't remove).

---

## Diagnosis (measured, not guessed)

| Metric | Baseline | Target | Verdict |
|---|---|---|---|
| **LCP** | **8,982 ms** | < 2,500 ms | 🔴 |
| ├ TTFB | 100 ms | — | 🟢 server fine |
| └ Render delay | **8,882 ms (98.9%)** | — | 🔴 the whole problem |
| CLS | 0.00 | < 0.1 | 🟢 |
| 3rd-party main-thread (jsDelivr) | **7,510 ms** | — | 🔴 |

**Root cause:** the LCP element is the hero headline (`SPAN.gsap_split_line`, a GSAP SplitText line).
It is held at `opacity:0` until a GSAP reveal runs, and GSAP cannot run because the main thread
is blocked ~7.5s by the **Spline WebGL runtime** that Webflow auto-loads on page load. The client's
video hunch is a real but *secondary* factor — a video-only fix would still leave LCP ~6–7s.

### The heavy items (all fire on initial load)

| # | Item | Location on page | Cost |
|---|---|---|---|
| 1 | **Spline 3D scene** (`@splinetool/runtime`) | `section_network` ("Operating across 11 countries"), **8,334px** down a 13,646px page (~78%, 8 screens below fold) | ~7.5s main thread → gates hero LCP |
| 2 | **YouTube embed** `ScMzIvxBSi4` | iframe at **2,705px**, `loading="auto"` | YT player + Google JS + Cloudflare Turnstile, all on load |
| 3 | **Bottom bg video** `.video_cta` (1920×1080) | **11,947px** (page bottom) | 1080p MP4, `autoplay` + `preload=metadata` on load |
| 4 | **Top bg video** `.video_about-b` (1920×1080) | top of page | 1080p served to mobile too |
| 5 | Hero SplitText reveal | hero | text invisible until GSAP runs |

Spline scene URL: `https://prod.spline.design/NCVeoBTMVw2NbIUF/scene.splinecode`
DOM: `div.wrap_spline > div.spline-network[data-animation-type="spline"][data-spline-url=…]`

Note: repo `init.js` is lean and does **not** load Spline / GSAP / videos — all are configured in
Webflow (embeds + site custom code). Most fixes land in Webflow; QW1 + QW4 add code to `init.js`.

---

## Quick wins (sequenced by impact)

### QW1 — Defer the Spline scene (biggest lever) 🔴
**Goal:** stop `@splinetool/runtime` from loading/executing on initial page load; mount the scene only
when the user scrolls near `section_network`. Keep the animation.

**Why native "lazy" isn't enough:** Webflow's Spline element auto-boots the runtime purely because of
`data-animation-type="spline"`. We must neutralise that and mount Spline ourselves.

**Webflow Designer:**
1. In `section_network`, select the Spline element (`.spline-network`).
2. Remove the native Spline binding: delete the `data-animation-type="spline"` attribute (this stops
   Webflow's auto-loader). Move the scene URL to a custom attribute `data-spline-defer` =
   `https://prod.spline.design/NCVeoBTMVw2NbIUF/scene.splinecode`.
3. Give `.wrap_spline` an explicit height (match current rendered ~1283px / responsive equivalent) so
   deferred mounting causes **no layout shift**.

**Repo (`init.js`):** add `setupDeferredSpline()`:
- Query `[data-spline-defer]`.
- `IntersectionObserver` with `rootMargin: '600px 0px'` (start loading ~1 viewport early).
- On first intersect: dynamically inject `https://cdn.jsdelivr.net/npm/@splinetool/runtime`, create a
  `<canvas>` inside the element, `new Application(canvas).load(url)`, then `unobserve`.
- Respect `prefers-reduced-motion` and `navigator.connection.saveData`: skip the mount (leave the
  section's static fallback / poster) when either is set.
- Guard against double-mount (`dataset.splineMounted`).

**Projected:** removes ~7.5s from initial main thread → LCP render delay collapses → **LCP ~1.5–2.5s.**

### QW2 — Lazy-load the YouTube embed 🟠
The iframe at 2,705px is `loading="auto"`, so YT player + Google JS + **Cloudflare Turnstile** all load
on first paint despite being below the fold.
- **Preferred:** replace with a click-to-play **facade** (poster image + play button) that only injects
  the iframe on click. Can reuse the pattern in `init.js:mountYouTubeEmbed()` (gate mount behind a
  click / IntersectionObserver instead of firing in `setupProjectVideos()`).
- **Minimum:** in Webflow, set the embed to `loading="lazy"` and remove any autoplay.

### QW3 — Defer bg video + mobile handling 🟠
- **`.video_cta` (page bottom, 11,947px):** it autoplays + preloads on load though 12k px below fold.
  Set `preload="none"` and start playback only when near-viewport (IntersectionObserver, or Webflow
  interaction on scroll-into-view). Show its poster until then.
- **Mobile (both bg videos):** do not serve 1080p desktop video on small screens. Hide the `<video>`
  via CSS at mobile breakpoints and show the poster image instead (the wrappers already carry
  `data-poster-url`). Saves the largest bandwidth hit on the devices most likely to feel "slow".

### QW4 — Hero reveal failsafe 🟡
Keep the SplitText reveal (client's choice). Add a safety so the headline is never stuck invisible:
- In the GSAP hero init (site custom code), wrap the reveal so that if GSAP/SplitText hasn't run within
  ~1000ms, the hero element is forced to `opacity:1` (or add a CSS rule that reveals it on a
  `.js-ready`/timeout class). Also ensure `prefers-reduced-motion` shows text immediately.
- This protects LCP against any future regression that re-blocks the main thread.

---

## Barba Impact
N/A — TSC is a standard multi-page Webflow site, no Barba transitions.

## Verify Loop

**Pass/fail — re-run the same trace after changes:**
1. After **QW1 alone** (biggest lever): `performance_start_trace` on `https://tsc-v2.webflow.io/`.
   - PASS if `@splinetool/runtime` is **absent** from the initial network requests, and LCP < 3,000 ms.
2. After **full set**: LCP < 2,500 ms desktop; no `youtube-nocookie` / `challenges.cloudflare.com`
   requests before first scroll; `.video_cta` MP4 not requested on initial load; CLS remains < 0.1.
3. Scroll to `section_network` → Spline scene mounts and animates (functional check, no console errors).
4. Mobile emulation: neither 1080p bg video requested; posters visible.

**Reproduction:** open `https://tsc-v2.webflow.io/` in a fresh tab → run trace with reload → inspect
LCP breakdown + network requests (media/script) → scroll to bottom to confirm deferred mounts fire.

**Tiers:**
- Tier 1 (auto): re-trace + `list_network_requests` assertions above (Chrome DevTools MCP, no deploy).
- Tier 2 (regression): none registered — quick-wins pass, verified by trace not Playwright.
- Tier 3 (manual): Safari/Firefox autoplay behaviour; real-device mobile scroll; subjective feel of the
  deferred Spline mount (does it appear smoothly as you reach the section?).

**Regression scope:** Spline scene must still render + animate when scrolled into view; both bg videos
still autoplay on desktop; hero animation unchanged on capable devices; no new CLS from QW1's reserved
height or QW2's facade.

---

## Open items
- ~~QW1 requires the `@splinetool/runtime` API (`Application.load`) — confirm the runtime version Webflow
  currently pulls matches the manual mount (pin a version in the jsDelivr URL).~~ ✅ **Resolved 2026-07-09:**
  pinned `@splinetool/runtime@1.9.28`; verified via live-DOM injection that the ESM import succeeds and
  exposes `Application`, and that `new Application(canvas).load(scene)` mounts the scene with no console
  errors. (Live site currently auto-loads an *unversioned* `/runtime.js`; the pin makes the manual mount
  reproducible.)
- Confirm `.video_about-b` (top, `top:0`) is genuinely above the fold before deciding its preload policy.
- YT video `ScMzIvxBSi4` is a Google sample clip — confirm it's a real intended embed or a placeholder.
