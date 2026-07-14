# Test Results: www.getcoconut.com/zempler-customers-get-coconut-free-for-making-tax-digital

**Note:** URL redirects to `https://www.getcoconut.com/free-making-tax-digital-software`

Date: 2026-06-04 | Mode: Full | Figma: No

## Scores

| Category | Score | Status |
|----------|-------|--------|
| Accessibility | 97 | PASS |
| Best Practices | 58 | FAIL |
| SEO | 100 | PASS |
| CLS (lab) | 0.107 | WARN |
| CLS (field/CrUX) | n/a | — |
| LCP (lab) | 157 ms | PASS |
| LCP (field/CrUX) | n/a | — |
| Mobile overflow | No | PASS |
| Console errors | 0 | PASS |

## Performance Summary

- **LCP breakdown**: TTFB 43ms, Load delay 12ms, Load duration 3ms, Render delay 98ms
- **JS Heap**: 24.02 MB used / 34.37 MB total
- **Network requests**: 97 total
- **No CrUX data** available for this URL
- **All images**: WebP/AVIF — no unoptimised PNGs

## Issues (11 total)

### Critical (must fix)

1. **Best Practices score 58** — third-party cookie issues, deprecated APIs, inspector issues (cookies).
   - Source: Lighthouse
   - Auto-fixable: No (third-party scripts)

### High

2. **CLS 0.107 (needs improvement)** — 22 layout shifts in a single cluster (130ms–1,436ms). Root cause: non-composited `top` animation (same pattern as /mtd-software).
   - Source: CLS/Perf trace
   - Auto-fixable: No
   - Fix: Convert `top` animation to `transform: translateY()`.

3. **Heading order skip: h1 → h3** — After `<h1>`, the bullet points use `<h3>` (skipping h2). Selector: `div.zempler-top-hero-left > ul.bullets-horizontal > li.bullet-list > h3._25-pargraph-16`.
   - Source: Lighthouse (heading-order)
   - Auto-fixable: No (requires Webflow structure change)

4. **No `<main>` landmark** — Document lacks a main landmark for screen reader navigation.
   - Source: Lighthouse (landmark-one-main)
   - Auto-fixable: No (requires Webflow structure change)

### Medium

5. **Third-party cookies (3+ instances)** — Google (`_GRECAPTCHA`, `NID`), Zoho PageSense (`zfccn`).
   - Source: Lighthouse (third-party-cookies)
   - Auto-fixable: No

6. **Deprecated API** — Facebook `fbevents.js` uses deprecated Attribution Reporting API.
   - Source: Lighthouse (deprecations)
   - Auto-fixable: No (third-party)

7. **Heavy OptinMonster payload** — 12+ chunk files loaded from `a.omappapi.com`.
   - Source: Network analysis
   - Auto-fixable: No

8. **Logo link has empty text** — First focusable link (`/`) has no visible text or aria-label.
   - Source: Keyboard a11y test
   - Auto-fixable: Yes (add aria-label via Webflow element_tool)

### Low

9. **Facebook privacy sandbox ORB blocks** — 2 requests blocked by ORB policy. Standard browser behaviour.
   - Source: Network analysis
   - Auto-fixable: No

10. **Non-composited animation (`top`)** — UI element animates `top` property, causing layout shifts.
    - Source: Perf trace (CLSCulprits)
    - Auto-fixable: No (requires CSS change)

11. **Intercom API request pending** — `api-iam.intercom.io/messenger/web/metrics` stayed pending during test. Likely timing issue, not a real error.
    - Source: Network analysis
    - Auto-fixable: No

## Heading Hierarchy

- h1: "Free MTD Software for the Self-Employed" (1 instance — correct)
- **h3 immediately after h1** (FAIL — skips h2): "HMRC-recognised", "Built for sole traders...", "2 years free"
- h2: "Get Up to 2 Years Free with Zempler", "Try Coconut Free for 14 Days", "What You Get with Coconut's Free MTD Software", "HMRC-Recognised - What That Means", etc.
- h3: Nested correctly under h2s in remaining sections

## Memory

- Used JS Heap: 24.02 MB
- Total JS Heap: 34.37 MB
- Heap snapshot saved (raw file)
- No obvious leak indicators

## Screenshots

- Desktop: `zempler-customers-desktop-2026-06-04.png`
- Mobile: `zempler-customers-mobile-2026-06-04.png`
- Heap: `zempler-customers-heap-2026-06-04.heapsnapshot`
- A11y tree: `zempler-customers-a11y-snapshot-2026-06-04.txt`

## Baseline

- Regression baseline: `zempler-customers-baseline-2026-06-04.json`
