# TSC — Hero Video Loading & Lighthouse Score Optimisation

**Slug:** `tsc-hero-video-perf`
**Date:** 2026-07-13
**Author:** Will (via /plan)
**Project:** The Signalling Company (`projects/the-signalling-company/`)
**Staging:** https://tsc-v2.webflow.io/
**Status:** Ready to Build
**Supersedes/extends:** `tsc-homepage-perf-quickwins-2026-07-09.md` (QW1–QW4). This spec completes the unfinished parts (hero video was never deferred; CTA defer is not actually working; mobile poster-swap never shipped) and adds the font/render-blocking chain identified as the real LCP lever.

---

## 1. Problem

The brief was "optimise hero background video loading." A live throttled diagnostic reframed it. Two findings:

**A. The Lighthouse *score* is gated by the font/render chain, not the video.** Under mobile throttling (Slow-4G + 4× CPU):

| Metric | Value |
|---|---|
| FCP | 1,780 ms |
| **LCP** | **4,313 ms** — 98.9% is render delay, 1.1% fetch |
| CLS | 0.0002 (good) |
| TBT | ~0 ms |
| LCP element | Hero **heading text** (`.gsap_split_line` span), not the video |

LCP's 4.3 s is spent waiting on ~9 Typekit font files (1.7–2.2 s each, seeded behind `consentpro.js`) and on GSAP SplitText running before the H1 can paint. The H1 is held `opacity:0` until the SplitText reveal fires; `revealHeroFailsafe()` (init.js:344) only forces it visible after **1000 ms**. So the LCP text literally cannot paint before ~1 s even in the best case.

**B. ~19 MB of video downloads per load — mostly wasted.** Native Webflow background-video elements, both on the homepage:

| File | Size | Section | Visible on mobile? | Problem |
|---|---|---|---|---|
| `02-desktop-1280x720.mp4` | 5.15 MB | Hero | No (`display:none`) | Off-breakpoint variant still fetched |
| `02-mobile-640x360.mp4` | 4.57 MB | Hero | Yes (autoplay) | Legit, but oversized for 360p |
| `08-desktop-1280x720.mp4` | 4.51 MB | CTA (85% down) | No | Off-breakpoint + below-fold |
| `08-mobile-640x360.mp4` | 4.21 MB | CTA (85% down) | Yes | Below-fold, downloads on load despite `preload="none"` |

`.webm` sources are declared but Chrome always picks MP4 → dead markup. `setupDeferredVideos()` (init.js:304) correctly strips `autoplay`/sets `preload="none"` on `.video_cta`, yet the file **still downloads** — Webflow's native background-video runtime re-triggers the fetch, and `preload="none"` doesn't stop the off-breakpoint variant. **`preload="none"` on a Webflow bg-video is not sufficient; we must take the `<source src>` out of the element.**

## 2. Goal

Chosen scope: **Full score push** (both tiers), sequenced so the risky font work is isolated and reversible.

- **Primary:** raise the mobile Lighthouse Performance score, driven by LCP.
- **Secondary (original ask + real-world):** eliminate wasted video bandwidth (~14 MB on mobile: off-breakpoint + below-fold), and make the hero start faster via a progressive low→high quality swap.

**Non-goals:** CLS (0.0002, perfect), TBT (~0), repeat-visit cache tuning (low first-load value). No Barba (TSC is plain multi-page Webflow — confirmed).

## 3. Constraints & context (from research)

- **Code vehicle:** single `init.js` shipped via jsDelivr pinned by commit hash. No build step. Vanilla JS, `DEBUG && console.log` pattern, IIFE.
- **Reusable helpers already in `init.js`:** `observeOnce()` (241), `setupDeferredVideos()` (304), `mountSpline()`/`setupDeferredSpline()` (259/280), `revealHeroFailsafe()` (344), `prefersReducedMotion()` (232). Extend these — do not reinvent.
- **Head-code vehicle:** Webflow site-wide custom code (`<head>`) for preconnect/preload. Not in this repo — documented as handoff, verified live.
- **Asset-agnostic:** new hero videos from the client (Cliff) are still pending per `tsc-content-update-2026-07-01.md`. Drive all logic off class hooks (`.video_about-b-video`, `.video_cta`) + `data-` attributes, never hardcoded filenames.
- **Native Webflow bg-video:** two `<video>` variants (`.is-desktop` / `.is-mobile`) toggled by CSS `display`. Poster is a CSS `background-image` on the wrapper from `data-poster-url`, native `poster` attr is empty.
- **Test infra:** Playwright at repo root (`tests/acceptance/`, `playwright.config.js`). No `.env.test` committed — tests default `STAGING_URL` to `https://tsc-v2.webflow.io`.

---

## 4. Approach

### Phase 1 — Video bandwidth & progressive hero (init.js only; contained, safe)

The unifying technique: **source-stripping**. On boot, move every managed bg-video's `<source src>` (and the `<video src>` if present) into `data-src`, and blank the live `src`, so the browser cannot fetch until we opt in. Then hydrate only the correct variant at the right time. This defeats both the off-breakpoint download and Webflow's runtime re-trigger, because there is no URL for either to fetch.

**1a. Breakpoint-correct source hydration (hero + CTA).**
New `setupBackgroundVideos()` replacing/absorbing `setupDeferredVideos()`:
1. Select managed wrappers: `.video_about-b-video` (hero, eager) and `.video_cta` (CTA, deferred). Mark each with a `data-bgv-role="hero|cta"` hook or detect by class.
2. For every `<video>` inside (both breakpoint variants): move each `<source src>` → `data-src`, remove the live `src`, set `preload="none"`, `removeAttribute('autoplay')`, `muted=true`, `playsInline=true`. Guard with `data-bgv-processed`.
3. Resolve the **active variant** for the current viewport. Prefer reading which wrapper is actually rendered (`getComputedStyle(el).display !== 'none'`) so we honour Webflow's own breakpoint CSS rather than duplicating breakpoints in JS. Fallback: `matchMedia` on the site's tablet breakpoint (≤991px → mobile variant).
4. **Hero (eager, above fold):** hydrate the active variant immediately — restore `src` from `data-src` on its `<source>`s, `video.load()`, `preload="auto"`, `.play().catch(()=>{})`. Off-breakpoint variant: never hydrated. Respect `prefersReducedMotion()` / `navigator.connection.saveData` → stay on poster, no hydrate.
5. **CTA (deferred, below fold):** hydrate the active variant only via `observeOnce(..., {rootMargin:'200px 0px'})`. Off-breakpoint: never.
6. **Resize safety:** debounced `resize`/`orientationchange` handler — if the breakpoint crossed and the now-visible wrapper has an un-hydrated video, hydrate it (hero) or leave it for its observer (CTA). Prevents a blank video after a desktop↔mobile resize. Edge case, low frequency.

Result on mobile: desktop variants (~10 MB) never fetch; CTA (~4 MB) fetches only on scroll. ~14 MB removed from the critical window.

**1b. Progressive low→high hero quality swap.**
Client will produce a low-res hero clip (target ~400–800 KB, e.g. 480×270 low-bitrate) per breakpoint. Convention: `data-video-lowsrc` on the wrapper (or a `-low` filename sibling of `data-video-urls`).
1. On hero hydrate (step 4 above), if a low source exists, hydrate the **low** source first → fast to buffer/start under Slow-4G, less pipe contention during the FCP/LCP window. Poster (CSS bg) covers frame 0, so no black flash.
2. After `window` `load` (or `requestIdleCallback`, whichever first), preload the **high** source; on `canplaythrough`, swap: set high `src`, `load()`, restore `currentTime` (mod duration) for a seamless cut, `.play()`. Remove low source.
3. `saveData` / reduced motion → stay on low (or poster) permanently; never fetch high.
4. Tradeoff (documented): active breakpoint now downloads low + high. Low is small; net perceived-start and contention win under throttling. Skipped entirely on saveData.

### Phase 2 — Render-delay chain (the LCP lever; broader, sequenced last, reversible)

> **Empirical update 2026-07-13 (post font-deletion measurement).** After the client deleted unused template fonts, a re-run of the throttled mobile trace showed the homepage font count dropped only 9→8 and **LCP did not improve** — 96% of LCP is render delay, the network chain completes by ~2.8s, leaving ~3.9s of pure main-thread work before the hero text paints. **Conclusion: font *fetch* is not the bottleneck.** The render delay is dominated by (i) GSAP SplitText gating the hero text paint (ForcedReflow at 3.2–3.5s), (ii) the 4 hero/CTA MP4s contending for the Slow-4G pipe, and (iii) DOM size (2,348 elements) + Webflow JS init (~942ms). Trace is also very noisy (3.9s / 6.8s / 11.1s across identical runs) — treat single readings as directional only; use a multi-run median or PageSpeed Insights for the real number.
>
> **Reprioritised order:** 2b (un-gate SplitText) is now the **top** Phase 2 lever; **Phase 1 video deferral is the highest-confidence LCP win overall** (frees the pipe). 2a (fonts) is demoted to low-risk hygiene — `font-display:swap` still helps paint, but preconnect/preload/weight-trim will *not* move LCP. New item 2d (DOM/JS init) added as a lower-priority investigation.

Sequenced: the hero-text-paint change (2b) first behind its own verify gate, then the low-risk head-code hygiene (2a).

**2a. Head-code quick wins (Webflow site-wide `<head>` — handoff + verify).**
- **Preconnect** the render-critical third parties currently un-preconnected: `use.typekit.net`, `p.typekit.net` (crossorigin), and the consentpro origin. One-line each.
- **Preload** the 1–2 above-fold Typekit font files: `<link rel="preload" as="font" type="font/woff2" href="…" crossorigin>`. Requires the live hashed font URLs (capture from the network panel).
- **`font-display: swap`** — enable in the Adobe Fonts (Typekit) project settings, or via `&display=swap` on the web-project embed. Lets the H1 paint in a fallback face immediately instead of blocking on font fetch. **Biggest single LCP win** and low risk (brief FOUT).
- **Trim unused weights** in the Adobe Fonts project to only above-fold weights.

**2b. Un-gate hero text paint from SplitText (init.js + Designer; behind verify gate).**
The H1 is `opacity:0` until GSAP SplitText reveals it, with a 1000 ms failsafe. To let LCP text paint early without killing the reveal:
- Reduce `revealHeroFailsafe()` failsafe window from 1000 ms → ~150–250 ms so text is never held longer than the SplitText load budget.
- Load GSAP + SplitText with higher priority (preload the pinned CDN files in head, or move earlier in `init.js` boot) so the reveal runs sooner.
- If the reveal still can't run within budget, the shortened failsafe paints the plain H1 — acceptable and better for LCP than a 1 s hold.
- **Risk:** may cause a brief flash-then-animate on slow connections. Verify visually on throttled mobile; if the feel regresses, fall back to "paint immediately, no reveal on mobile only." Flag for art-director sign-off.

**2c. consentpro on the critical path.** consentpro.js roots the critical chain (676ms, render-blocking). Investigate loading it `async`/`defer` or after fonts. May be a third-party/consent-compliance constraint → document findings, change only if safe. Lower priority than 2b.

**2d. DOM size / JS init (investigation, lowest priority).** 2,348 DOM elements (24 deep) + ~942ms of Webflow JS main-thread time (webflow.js + 17 achunk bundles + GSAP/SplitText/ScrollTrigger init) contribute to the ~3.9s render-delay tail. Not directly fixable in `init.js`, but worth quantifying: can any GSAP/ScrollTrigger init be deferred past LCP? Is the DOM inflated by hidden template sections? Investigate and document; only act if a safe, contained win emerges.

### Rejected / deferred
- **Re-encode source videos** (esp. the oversized 360p clips): real bandwidth win but an asset task, not code. Documented as handoff, not built here.
- **webm cleanup:** remove dead `<source>` webm entries in Webflow — trivial Designer housekeeping, handoff.

---

## 5. Task breakdown (ordered)

| # | Task | Agent | Depends on |
|---|---|---|---|
| T1 | Extend `init.js`: `setupBackgroundVideos()` — source-stripping + breakpoint hydration for hero (eager) & CTA (deferred), absorbing `setupDeferredVideos()`. Resize safety. | code-writer | — |
| T2 | Add progressive low→high hero swap (`data-video-lowsrc` convention, `window.load`/idle swap, saveData/reduced-motion guards) into the hero hydrate path. | code-writer | T1 |
| T3 | Reduce `revealHeroFailsafe()` window to ~200 ms; raise GSAP/SplitText load priority. | code-writer | — |
| T4 | Acceptance tests `tests/acceptance/tsc-hero-video-perf.spec.js` (Tier 1). | qa (Sonnet) | T1–T3 |
| T5 | Head-code handoff doc: preconnect + font preload + font-display + weight trim + webm cleanup + re-encode note. Written to `.claude/specs/tsc-hero-video-perf-handoff.md`. | pm | — |
| T6 | Code review (pattern/Webflow/a11y) + QA verify loop on staging after deploy. | code-reviewer, qa | T1–T4 |
| T7 | Client low-res hero asset request (brief: target size/bitrate/dimensions + `data-video-lowsrc` wiring). | pm | T2 |

## 6. Parallelisation map

- **Stream A (init.js code):** T1 → T2 sequential (T2 edits hero hydrate path from T1). T3 is independent of T1/T2 (different function) → **parallel with T1**.
- **Stream B (docs):** T5 (handoff) and T7 (asset brief) independent → **parallel with all code**.
- **Barrier:** T4 (tests) needs T1–T3 merged. T6 needs T4 + deploy.
- **Recommendation:** run T3 + T5 + T7 in parallel with T1; T2 after T1; single worktree (one file, `init.js` — no worktree isolation needed; T3 touches a different function so low conflict risk, land T1 first then rebase T3 or just do both in one editing pass). Agent teams: not needed, small surface.

## 7. Barba impact

**N/A — no Barba transitions on TSC.** Confirmed across five TSC specs and the live DOM (no `data-barba`). Plain page-load boot in `init.js`. New observers/listeners are created once per load; no init/destroy lifecycle required. (Resize listener is the only persistent listener added — negligible, and page is not SPA-navigated.)

## 8. Architectural decisions / ADR

No ADR required. This extends an established in-repo pattern (`observeOnce`/deferred-media) rather than introducing new architecture. The one notable decision — *strip sources rather than rely on `preload="none"`* — is documented inline in §4 and in code comments (it's a Webflow-runtime workaround, worth a comment so a future dev doesn't "simplify" it back).

---

## 9. Test plan (3 tiers)

### Tier 1 — Auto: Playwright local (`tests/acceptance/tsc-hero-video-perf.spec.js`)
- **Off-breakpoint not fetched (desktop):** load at 1440×900, wait, assert no network request matched the `*mobile-640x360*` hero URL pattern.
- **Off-breakpoint not fetched (mobile):** load at 390×844, assert no request matched `*desktop-1280x720*` for hero or CTA.
- **CTA deferred:** at 390×844, immediately after load assert the CTA video URL (`08-*`) was NOT requested; then scroll to CTA, wait, assert it IS requested. (Directly covers the currently-broken defer.)
- **Hero hydrates & plays:** assert active hero `<video>` gains a real `src` (not empty/`data-src`), `readyState > 0`, and `paused === false` (unless reduced-motion).
- **Progressive swap:** assert low source requested first; after `load`+idle, assert high source requested and hero `<video> src` updated. (Skipped/guarded if low assets absent — test tolerates missing `data-video-lowsrc`.)
- **Reduced motion:** with `prefers-reduced-motion: reduce`, assert no hero video hydrated (poster only), no video URL requested.
- **saveData path:** (best-effort) assert high source not requested when saveData emulated.
- **No console errors** on homepage (all viewports touched).

### Tier 2 — Auto: CDN regression (`/deploy`)
- Register `tsc-hero-video-perf` in `tests/registry.json`. On deploy, run against the live jsDelivr hash. Adds cumulative coverage for video-loading regressions.

### Tier 3 — Manual (can't automate + why)
- **Throttled Lighthouse re-run:** run Lighthouse mobile (Slow-4G) before/after; confirm LCP drop and Perf score delta. Manual because MCP Lighthouse excludes Performance; use Chrome DevTools UI or PSI. **Primary success measure.**
- **FOUT feel after `font-display:swap`:** subjective — is the fallback→brand-font swap acceptable? Cross-browser (Safari/Firefox — Playwright is Chromium only).
- **Hero reveal feel after failsafe shortening:** does the SplitText reveal still feel intentional on a real slow phone, or does it flash? Art-director sign-off.
- **iOS Safari autoplay:** muted+playsinline autoplay behaviour differs on iOS; verify hero plays and progressive swap doesn't stutter on a real device.
- **Head-code changes live:** preconnect/preload/font-display are Webflow-side — verify in the live network panel post-publish.

---

## 10. Verify Loop

### a. Pass/fail criteria (observable)
- **Bandwidth:** on mobile viewport, network log after load contains **zero** `*desktop-1280x720*` requests and **zero** hero-CTA `08-*` requests until the CTA is scrolled into view. On desktop, zero `*mobile-640x360*` hero requests.
- **Hero playback:** active hero `<video>.src` is a real URL, `readyState ≥ 2`, `paused === false` within 3 s of load (non-reduced-motion).
- **Progressive:** first hero video request is the low-res URL; a high-res request fires only after `window.load`; `<video>.src` ends on the high-res URL.
- **LCP:** throttled mobile LCP measurably lower than 4,313 ms baseline (target < 3,000 ms; stretch < 2,500 ms). Text still the LCP element, paints before video.
- **No regressions:** hero still visible and animated; CTA video still plays on scroll; no new console errors; CLS stays < 0.05.

### b. Reproduction steps
1. Chrome DevTools → mobile 390×844, Network throttling **Slow 4G**, CPU **4×**, disable cache.
2. Hard-load `https://tsc-v2.webflow.io/`. Record: FCP, LCP, LCP element, video requests + sizes.
3. Observe hero: poster → low video starts → high video swaps in.
4. Scroll to the CTA section; confirm CTA video only now requests + plays.
5. Repeat at desktop 1440×900; confirm no mobile hero variant fetched.
6. Toggle `prefers-reduced-motion: reduce`; confirm poster-only, no video fetch.

### c. Tier mapping
- Automated (Tier 1): off-breakpoint-not-fetched, CTA-deferred, hero-hydrates, progressive-swap, reduced-motion, no-console-errors.
- Regression (Tier 2): registry entry `tsc-hero-video-perf`.
- Manual (Tier 3): throttled Lighthouse LCP/score delta, FOUT feel, reveal feel, iOS autoplay, live head-code check.

### d. Regression scope (must NOT break)
- Hero headline reveal animation (SplitText) still runs and reads as intentional.
- CTA background video still autoplays when scrolled to.
- `setupDeferredSpline()`, YouTube facade/embed, and site utilities unaffected (shared `observeOnce`/`prefersReducedMotion` — don't change their signatures).
- No new persistent listeners beyond one debounced resize handler.
- Poster/first-frame still shows on reduced-motion and saveData.

**Self-check:** `/build` knows this feature works when the Tier-1 suite is green (breakpoint-correct + deferred + progressive + reduced-motion all asserted) AND a throttled Lighthouse re-run shows LCP below baseline with no console errors and the hero visibly playing.

---

## 11. Acceptance Tests (human-readable index)
File: `tests/acceptance/tsc-hero-video-perf.spec.js`
1. `desktop: mobile hero variant is not requested`
2. `mobile: desktop hero + CTA variants are not requested`
3. `mobile: CTA video deferred until scrolled into view`
4. `hero video hydrates and plays (active variant only)`
5. `hero progressive swap: low requested first, high after load` (tolerant if low assets absent)
6. `prefers-reduced-motion: no hero video hydrated (poster only)`
7. `homepage: no console errors (desktop + mobile)`

## 12. Handoff (non-code, documented separately in `-handoff.md`)
- Webflow head-code: preconnect (typekit ×2, consentpro), font preload (2 files), verify live.
- Adobe Fonts project: enable `font-display: swap`, trim unused weights.
- Webflow Designer: remove dead `<source>` webm entries; wire `data-video-lowsrc` on hero wrapper once low assets exist.
- Client (Cliff): produce low-res hero clips (~400–800 KB each, 480×270-ish, low bitrate); optionally re-encode oversized 360p mobile clips.
- consentpro: assess async/defer without breaking consent compliance.
