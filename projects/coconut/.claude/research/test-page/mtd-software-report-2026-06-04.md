# Test Results: www.getcoconut.com/mtd-software

Date: 2026-06-04 | Mode: Full | Figma: No

## Scores

| Category | Score | Status |
|----------|-------|--------|
| Accessibility | 95 | PASS |
| Best Practices | 50 | FAIL |
| SEO | 100 | PASS |
| CLS (lab) | 0.115 | WARN |
| CLS (field/CrUX p75) | 0.10 | WARN |
| LCP (lab) | 168 ms | PASS |
| LCP (field/CrUX p75) | 2732 ms | WARN |
| Mobile overflow | No | PASS |
| Console errors | 0 | PASS |

## Performance Summary

- **LCP breakdown**: TTFB 28ms, Load delay 46ms, Load duration 4ms, Render delay 90ms
- **JS Heap**: 24.18 MB used / 24.77 MB total
- **Network requests**: 111 total
- **Third-party transfer**: ~7.0 MB total (website-files.com 2.2MB, GTM 1.5MB, Intercom 1.2MB, Facebook 720KB, TikTok 636KB)
- **Main thread third-party time**: GTM 46ms, Intercom 42ms, PageSense 28ms, Facebook 28ms

## Issues (14 total)

### Critical (must fix)

1. **Best Practices score 50** — dragged down by third-party cookie issues, deprecated APIs, console errors from ad network, and image aspect ratio problems.
   - Source: Lighthouse
   - Auto-fixable: No (third-party scripts)

### High

2. **CLS 0.115 (needs improvement)** — 22 layout shifts in a single cluster (179ms–1,397ms). Root causes: font swap (`Work Sans` woff2) and a non-composited `top` animation.
   - Source: CLS/Perf trace
   - Auto-fixable: No
   - Fix: Add `font-display: swap` with size-adjusted fallback; convert `top` animation to `transform: translateY()`.

3. **Link without discernible name** — `.screenshot-container.w-inline-block` (slider link with `href="#"` and no text/aria-label).
   - Source: Lighthouse (link-name audit)
   - Auto-fixable: Yes (add aria-label via Webflow element_tool)

4. **No `<main>` landmark** — Document lacks a main landmark for screen reader navigation.
   - Source: Lighthouse (landmark-one-main)
   - Auto-fixable: No (requires Webflow structure change)

5. **LCP field score 2,732ms** — Lab LCP is fast (168ms) but real users see ~2.7s. Likely caused by slow networks + heavy third-party payload (~7MB transfer).
   - Source: CrUX/Perf trace
   - Auto-fixable: No

### Medium

6. **Image aspect ratio mismatch** — Slider arrow images (`Right Arrow.webp`) displayed at 29x58 but natural size is 70x126 (ratio 0.50 vs 0.56).
   - Source: Lighthouse (image-aspect-ratio)
   - Auto-fixable: No (needs image resize or CSS fix)

7. **4 PNG images not optimised** — `Coconut_2025_Graphics_RGB-05.png`, `-06.png`, `-08.png`, `-10.png` served as PNG instead of WebP/AVIF.
   - Source: Network analysis
   - Auto-fixable: No (requires re-upload in Webflow)

8. **Third-party cookies (6 instances)** — Zoho PageSense (`zfccn`), Google (`_GRECAPTCHA`, `NID`), TikTok (`_ttp`).
   - Source: Lighthouse (third-party-cookies)
   - Auto-fixable: No

9. **Deprecated API** — Facebook `fbevents.js` uses deprecated Attribution Reporting API.
   - Source: Lighthouse (deprecations)
   - Auto-fixable: No (third-party)

10. **Heavy OptinMonster payload** — 12+ chunk files loaded from `a.omappapi.com` (244.8 KB total).
    - Source: Network analysis
    - Auto-fixable: No (consider lazy-loading or removing if unused)

### Low

11. **Console error (Lighthouse only)** — `ad.doubleclick.net` 400 response. Benign ad network error, not visible in runtime console.
    - Source: Lighthouse (errors-in-console)
    - Auto-fixable: No

12. **Facebook privacy sandbox ORB blocks** — 2 requests blocked by ORB policy. Standard browser behaviour, no user impact.
    - Source: Network analysis
    - Auto-fixable: No

13. **Keyboard focus: logo link has empty text** — First focusable link (`/`) has no visible text or aria-label. Same as issue #3.
    - Source: Keyboard a11y test
    - Auto-fixable: Yes

14. **Non-composited animation (`top`)** — Slider or UI element animates `top` property, causing layout shifts and poor compositing.
    - Source: Perf trace (CLSCulprits)
    - Auto-fixable: No (requires CSS change)

## Third-Party Impact (by transfer size)

| Third Party | Transfer Size | Main Thread Time |
|-------------|--------------|-----------------|
| website-files.com (Webflow CDN) | 2.2 MB | 21 ms |
| Google Tag Manager | 1.5 MB | 46 ms |
| Intercom | 1.2 MB | 42 ms |
| Facebook | 719.8 KB | 28 ms |
| TikTok | 635.5 KB | 13 ms |
| Hotjar | 250.7 KB | 8 ms |
| OptinMonster | 244.8 KB | 19 ms |
| Google Fonts | 162.8 KB | — |
| Zoho (PageSense) | 120 KB + 4.8 KB | 28 ms |
| jQuery (Cloudfront) | 89.5 KB | 14 ms |

## Memory

- Used JS Heap: 24.18 MB
- Total JS Heap: 24.77 MB
- Heap snapshot saved (46 MB raw)
- No obvious leak indicators (single page load)

## Heading Hierarchy

- h1: "MTD Software for the Self-Employed" (1 instance — correct)
- h2: 10 instances (Trustpilot, Why choose, Pricing, Bookkeeping, MTD filing, Zempler, Making Tax Digital software for, MTD software for sole traders, etc.)
- h3: 6+ instances nested correctly under h2s

## Screenshots

- Desktop: `mtd-software-desktop-2026-06-04.png`
- Mobile: `mtd-software-mobile-2026-06-04.png`
- Heap: `mtd-software-heap-2026-06-04.heapsnapshot`
- A11y tree: `mtd-software-a11y-snapshot-2026-06-04.txt`

## Baseline

- Regression baseline: `mtd-software-baseline-2026-06-04.json`
