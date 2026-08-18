# Test Results: getcoconut.com/mtd-software/sole-traders

**Date:** 2026-07-16 | **Mode:** Full | **Figma:** No | **Engine:** Chrome DevTools MCP (desktop 1280×800, mobile 375×812)

---

## Scores

| Category | Score | Status |
|----------|-------|--------|
| Performance (LCP) | 158 ms | ✅ PASS |
| Performance (TTFB) | 28 ms | ✅ PASS |
| CLS | 0.11 | ⚠️ WARN |
| Accessibility (Lighthouse) | 100 | ✅ PASS |
| Best Practices (Lighthouse) | 73 | ⚠️ WARN |
| SEO (Lighthouse) | 100 | ✅ PASS |
| Agentic Browsing (Lighthouse) | 96 | ✅ PASS |

*Note: Chrome DevTools MCP's Lighthouse module does not emit a combined "Performance" category score — Core Web Vitals lab metrics (LCP/CLS/TTFB) from the performance trace are used instead. No CrUX field data exists for this URL.*

### Health checks
- **Console:** 0 errors, 0 warnings ✅
- **Mobile horizontal overflow:** none (scrollWidth = clientWidth = 375) ✅
- **Network:** 101 requests, 0 failures (all 200/204/304) ✅
- **Memory:** 23.2 MB JS heap, 1,045 DOM nodes, no leak indicators ✅
- **Keyboard a11y (5-tab walk):** all interactive, all with visible focus rings ✅

---

## Issues (6 total)

### Critical (must fix)
_None._

### High
_None._

### Medium

**M1 — CLS 0.11 (just over the 0.10 "good" threshold)**
Source: CLS / Performance trace. Auto-fixable: No (design/dev change).
The worst shift cluster runs 164 ms → 2,455 ms. Two actionable roots:
- **Web-font swap (FOUT):** Work Sans (`fonts.gstatic.com/.../worksans...woff2`) reflows text as it loads. The page pulls Work Sans, Inconsolata, ArcoPerpetuo, Material Icons, plus Montserrat + Open Sans (the last two injected by the Trustpilot/OptinMonster widgets). Fix: `font-display: optional` or preload the primary woff2 + `size-adjust` metric overrides to eliminate the swap reflow.
- **Non-composited animation on `top`:** one flagged shift animates the CSS `top` property (`TARGET_HAS_INVALID_COMPOSITING_STATE, UNSUPPORTED_CSS_PROPERTY`), which forces layout each frame and triggers the ~1.1–1.5 s shift cascade. Fix: animate `transform: translateY()` instead of `top` — compositor-only, no layout shift, smoother.

**M2 — Heavy third-party / tracking stack (privacy + main-thread cost)**
Source: Network + ThirdParties insight + Best Practices cookies. Auto-fixable: No.
101 requests, the majority third-party: Google Tag Manager, GA4 + Universal Analytics, Google Ads/DoubleClick, Meta (Facebook) Pixel **with Advanced Matching** (sends hashed email/phone/city/postcode/country to Meta), TikTok Pixel, Zoho PageSense, Hotjar, OptinMonster (~18 separate JS chunks from `a.omappapi.com`), Trustpilot, pixelflow, ipinfo.io, Intercom.
- GTM is the single largest main-thread cost (92 ms); Intercom 76 ms.
- This is the source of the **third-party-cookies** and **inspector-issues** Best Practices failures (14 cookies from Zoho + Google flagged under Chrome's cookie deprecation).
- Transfer sizes are small and scripts are deferred, so LCP is unaffected — but the Meta Advanced Matching PII payload is worth a compliance/consent review.

### Low

**L1 — image-aspect-ratio: 2 "Right Arrow.webp" icons rendered at wrong aspect ratio**
Source: Lighthouse Best Practices. Auto-fixable: Yes (set width/height to natural ratio).
Both are the arrow icons inside CTA buttons in the hero section. Set explicit width/height (or CSS `aspect-ratio`) matching the asset's natural dimensions.

**L2 — Footer Coconut logo uses empty `alt=""`**
Source: DOM a11y audit. Auto-fixable: Yes.
`!Coconut_2025_logo_RGB_Full_Logo_White.png` in the footer has `alt=""`. A brand logo should name itself (`alt="Coconut"`). The header logo is correctly labelled ("Coconut home"), and trust badges (FCA Authorised, MTD Ready) already carry alt text — this is the one meaningful image treated as decorative. Hero Graphic and Footer Graphic empty-alt are fine (genuinely decorative).

**L3 — "Help" and "Products" nav toggles use `href="#"`**
Source: Keyboard a11y walk. Auto-fixable: No (markup change).
These are dropdown/menu toggles implemented as `<a href="#">`. They're keyboard-reachable with visible focus, so not an a11y failure — but a `<button>` (or `role="button"` + `aria-expanded`) is the semantically correct control for a menu toggle.

**L4 — Mobile checklist checkmark misalignment (cosmetic)**
Source: Mobile screenshot. Auto-fixable: No (CSS).
In the hero checklist at 375 px, the "Built for sole traders and self-employed people" item wraps to two lines and its orange tick sits flush to the far-left screen edge, out of alignment with the other centred ticks. Cosmetic only.

---

## What's working well
- **Load speed is excellent:** LCP 158 ms, TTFB 28 ms — well inside "good".
- **Accessibility 100, SEO 100:** single H1, clean heading hierarchy (no skips), `lang="en"`, title + meta description present and well-written, all buttons have accessible names, all images have alt attributes.
- **Images already optimised:** content images served as WebP/AVIF, fonts as woff2.
- **No console errors, no network failures, no memory leaks.**
- **Keyboard focus is fully visible** on every interactive element tested.

---

## Notes
- The full-page desktop screenshot appears to show the page content twice — this is a **capture artifact** of the very tall page (~32,000 px) with a sticky promo bar, **not** a real duplicate DOM. Confirmed by the 1,045-node DOM count.
- No prior baseline found — this is the first `/test-page` run for this URL.
- Webflow MCP auto-fix not applied: this is an external site (getcoconut.com), not a workspace-owned Webflow project.

## Artifacts
- Desktop screenshot: `.claude/research/test-page/sole-traders-desktop.png`
- Mobile screenshot: `.claude/research/test-page/sole-traders-mobile.png`
