# TSC Homepage Perf Quick-Wins — Deploy & Webflow Handoff

> Companion to `tsc-homepage-perf-quickwins-2026-07-09.md`.
> Repo code built + verified 2026-07-09. This file lists the **non-repo** steps
> (Webflow Designer) and the **post-deploy re-trace** that closes the spec's verify loop.

## What shipped in the repo (`projects/the-signalling-company/init.js`)

| QW | Function | Behaviour |
|----|----------|-----------|
| QW1 | `setupDeferredSpline()` + `mountSpline()` + `observeOnce()` | IO-gated mount of `[data-spline-defer]` hosts (`rootMargin 600px`); lazy dynamic-imports `@splinetool/runtime@1.9.28`; skips on reduced-motion / saveData; double-mount guard; removes orphan canvas on failure. |
| QW3 (JS) | `setupDeferredVideos()` | `.video_cta` → `preload="none"`, strips `autoplay`, forces muted + playsinline; plays only when near-viewport (`rootMargin 200px`); reduced-motion keeps the poster. |
| QW4 | `revealHeroFailsafe()` | After 1s (or immediately on reduced-motion), forces the hero `.gsap_split_line` lines — or the `<h1>` fallback — to `opacity:1` + `visibility:visible` if still hidden. Queries at fire-time (SplitText generates lines at runtime). |

**Deploy safety:** deploying `init.js` *before* the Webflow edits is safe. `setupDeferredSpline` finds
zero `[data-spline-defer]` hosts on the current site → silent no-op → the existing native Spline
auto-loader keeps working. QW3 + QW4 activate immediately on deploy (their targets already exist).

## Webflow Designer steps (must be done by hand — cannot be done from the repo)

### QW1 — activate the Spline defer (the biggest lever)
On the homepage `section_network`, element `.spline-network` (inside `.wrap_spline`):
1. **Delete** the `data-animation-type="spline"` attribute (this stops Webflow's auto-loader).
2. **Add** custom attribute `data-spline-defer` = `https://prod.spline.design/NCVeoBTMVw2NbIUF/scene.splinecode`
   (move the URL off the old `data-spline-url`).
3. Give `.wrap_spline` an **explicit height** matching its current rendered size (**~1283px desktop**,
   responsive equivalents at smaller breakpoints) so the deferred mount causes **no layout shift**.
4. Confirm a static poster/fallback is visible in the reserved box until the scene mounts.

### QW2 — YouTube embed (`ScMzIvxBSi4`, iframe at ~2,705px)
- **Preferred:** replace with a click-to-play facade (poster + play button) that injects the iframe on click.
- **Minimum:** set the embed to `loading="lazy"` and remove any autoplay so YT player + Google JS +
  Cloudflare Turnstile don't load on first paint.
- (Confirm whether `ScMzIvxBSi4` — a Google sample clip — is the intended video or a placeholder.)

### QW3 — mobile video (CSS half; JS half already shipped)
- At mobile breakpoints, **hide the `<video>`** for both bg videos (`.video_about-b` top, `.video_cta`
  bottom) and show the poster image instead — don't serve 1080p desktop MP4 to phones. The wrappers
  already carry `data-poster-url`.

### QW4 — (optional hardening)
- The repo failsafe covers the "GSAP blocked" case. For belt-and-suspenders, you may also add a CSS rule
  in site custom code that reveals `.gsap_split_line` after an animation-delay / on a timeout class.

## Post-deploy verify loop (closes the spec's pass/fail gate)

After the Webflow edits **and** `/deploy` (pushes `init.js` to jsDelivr), re-run the trace:

1. `performance_start_trace` (reload) on `https://tsc-v2.webflow.io/` — **desktop, no throttle**:
   - [ ] `@splinetool/runtime` **absent** from initial network requests (before any scroll)
   - [ ] LCP **< 3,000 ms** after QW1 alone; **< 2,500 ms** with the full set
   - [ ] No `youtube-nocookie` / `challenges.cloudflare.com` requests before first scroll (QW2)
   - [ ] `.video_cta` MP4 **not** requested on initial load (QW3)
   - [ ] CLS remains **< 0.1** (QW1 reserved height / QW2 facade add no shift)
2. Scroll to `section_network` → [ ] Spline scene mounts + animates, no console errors.
3. Mobile emulation (375×812) → [ ] neither 1080p bg video requested; posters visible.

### Baseline captured 2026-07-09 (current live site, old `init.js`, pre-Webflow-edit)
Reproduces the diagnosis — all of these fire on **initial load** and should disappear after the fixes:
- `@splinetool/runtime/build/runtime.js` (unversioned) — loaded on load
- Both 1080p MP4s (`_02-...` top, `_08-...` bottom `.video_cta` @ 11,949px) — fetched on load
- Cloudflare Turnstile ×2 + YouTube player JS + Google JS — all on load

## Tier 3 — manual checks (post-deploy, real devices)
- [ ] Safari + Firefox: CTA video autoplay-on-scroll behaves (muted/inline policy)
- [ ] Real mobile device: scroll feel; posters show instead of video
- [ ] Subjective: does the deferred Spline scene appear smoothly as you reach `section_network`?
