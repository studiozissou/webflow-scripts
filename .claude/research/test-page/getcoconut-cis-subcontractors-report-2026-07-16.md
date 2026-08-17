# Test Results: getcoconut.com/mtd-software/cis-subcontractors
Date: 2026-07-16 | Mode: Full | Figma: No | Engine: Chrome DevTools MCP

## Scores
| Category | Score | Status |
|----------|-------|--------|
| Performance (LCP, lab) | 5,912 ms | **FAIL** |
| Accessibility | 100 | PASS |
| Best Practices | 77 | WARN |
| SEO | 92 | WARN |
| Agentic Browsing | 97 | PASS |
| CLS (PerfObserver, 5s) | 0.109 | WARN |
| CLS (trace, fresh load) | 0.00 | PASS |

No CrUX field data for this URL (low traffic / new page) — all Core Web Vitals are lab-only.

## Sibling-template comparison
This page shares the `mtd-software/*` template with **sole-traders** (audited 2026-07-16):

| Metric | cis-subcontractors | sole-traders (baseline) |
|--------|-------------------|-------------------------|
| LCP (lab) | **5,912 ms** | 158 ms |
| Best Practices | 77 | 73 |
| SEO | 92 | 100 |
| CLS | 0.109 | 0.11 |
| A11y | 100 | 100 |

Same template, ~37× slower LCP and an SEO regression. The differences are page-specific, not template-wide — worth fixing on this page.

## Issues (7 total)

### Critical (must fix)
1. **LCP is 5,912 ms — 97% is render delay (5,736 ms).** Source: Perf trace.
   The LCP element is the hero image (`._26-custom-template-top-hero-right-image`,
   `For Accountant Hero Graphic-p-800.webp`). The resource itself is fast: queued 118 ms,
   downloaded in 4 ms, done by 199 ms. But it doesn't *paint* as LCP until 5.9 s because it
   sits inside a Webflow IX2 load animation (final state is `transform: matrix(1.1,0,0,1.1,-48,0)`
   with the parent translated) that holds the hero hidden/animating for ~5.7 s.
   The sibling sole-traders page paints its LCP at 158 ms, so this is not inherent to the template.
   Auto-fixable: No (Webflow Designer interaction + image setting).

### High
2. **Hero (LCP) image is `loading="lazy"`.** Source: DOM. All 53 images on the page are
   lazy-loaded, including above-the-fold ones. The LCP image must not be lazy — set the hero
   image to `loading="eager"` and add `fetchpriority="high"`. Combined with fixing the load
   animation (issue 1), this should bring LCP under 1 s. Auto-fixable: No (Webflow image setting).

### Medium
3. **Non-descriptive link text: "More information".** Source: Lighthouse SEO (this is the only
   deduction from 100→92). The link points to `/free-making-tax-digital-software`. Replace with
   descriptive anchor text (e.g. "Learn more about free Making Tax Digital software").
   Auto-fixable: No (not on the /test-page allowlist — content change).
4. **CLS 0.109 (WARN, just over the 0.1 threshold).** Source: PerfObserver over 5 s. 22 small
   shifts accumulate during load settling; largest is 0.013 at 3.7 s. Trace-measured CLS on a
   clean reload was 0.00, so this is settling of late-loading content (fonts / lazy images /
   embeds like Trustpilot). Fixing issue 2 (eager hero) and ensuring reserved space for the
   Trustpilot widget and lazy images will pull this under 0.1. Auto-fixable: No.

### Low
5. **Best Practices 77 — third-party cookies + cookie inspector issues.** Source: Lighthouse.
   Driven by the marketing/ads stack (Google Ads/DoubleClick, Facebook, TikTok pixel). Inherent
   to the tracking setup; consider consent-gating third-party cookies. Not a functional defect.
6. **Heavy third-party footprint.** Source: Network. GTM, GA (UA + GA4), Facebook Pixel, TikTok
   pixel, Hotjar, Trustpilot, Intercom, OptinMonster, Pixelflow, DoubleClick. Adds main-thread and
   privacy cost. Doesn't block LCP here (that's the animation), but worth periodic pruning.
7. **38 of 53 images use empty `alt=""`.** Source: DOM. Treated as decorative — acceptable, and
   Lighthouse A11y is 100. Spot-check that none of the 38 are actually meaningful content images.

## Passed / clean
- 0 console errors, 0 warnings.
- No mobile horizontal overflow at 375px (scrollWidth == clientWidth == 375).
- Keyboard: 5-tab walk clean — logo (aria-label "Coconut home") → Features → Pricing → Help,
  all with visible focus outlines, logical order, no focus trap/loss.
- Heading hierarchy: single H1, 44 headings, no skipped levels.
- All 53 images have `alt` attributes; images served as WebP, fonts as woff2.
- Memory: 21.7 MB JS heap, 447k heap nodes — normal for this third-party load; no
  single-snapshot leak signal (would need repeated snapshots to confirm a leak).
- First-party assets all 200/304, no 4xx/5xx, no oversized assets.
- Forced reflow minor (87 ms, unattributed).

## Notes / caveats
- During the perf-trace reload, many analytics/marketing beacons returned
  `net::ERR_INTERNET_DISCONNECTED` (Google ccm/collect, Facebook `tr`, TikTok, Intercom,
  ipinfo.io, Pixelflow, OptinMonster embed). All first-party assets and Trustpilot loaded 200.
  This pattern is a transient connectivity blip during the run, **not** a page defect. If it
  persists on re-run, revisit.
- Full-page desktop screenshot shows the hero region twice — a full-page-capture artifact with
  the sticky/animated hero, not a real duplicate on the live page.

## Artifacts
- Desktop screenshot: `.claude/research/test-page/getcoconut-cis-subcontractors-desktop.png`
- Mobile screenshot: `.claude/research/test-page/getcoconut-cis-subcontractors-mobile.png`
- Heap snapshot: `.claude/research/test-page/coconut-cis.heapsnapshot`
- Baseline: `.claude/research/test-page/getcoconut-cis-subcontractors-baseline-2026-07-16.json`
