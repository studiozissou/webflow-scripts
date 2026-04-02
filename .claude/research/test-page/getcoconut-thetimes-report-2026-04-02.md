# Test Results: https://www.getcoconut.com/thetimes

Date: 2026-04-02 | Mode: Light | Figma: No

## Scores

| Category | Score | Status |
|----------|-------|--------|
| Accessibility | 92 | PASS |
| Best Practices | 58 | FAIL |
| SEO | 92 | PASS |
| CLS | 0.002 | PASS |
| Console Errors | 0 | PASS |
| Mobile Overflow | No | PASS |

## Issues (8 total)

### Critical (must fix)

None.

### High

1. **Best Practices: 58/100** — well below 70 threshold
   - Source: Lighthouse
   - Auto-fixable: No

2. **Third-party cookies (3 instances)** — TikTok pixel (`analytics.tiktok.com`) and Zoho PageSense (`pagesense-collect.zoho.com`) set third-party cookies that will be blocked as browsers phase them out.
   - Source: Lighthouse (best-practices)
   - Auto-fixable: No (third-party scripts)

3. **No `<main>` landmark** — Document lacks a `<main>` element, hurting screen reader navigation.
   - Source: Lighthouse (accessibility)
   - Auto-fixable: No (structural HTML change needed in Webflow)

### Medium

4. **Colour contrast failures (5 instances)** — "Terms and Conditions apply" text and "Read more" links have insufficient contrast ratios against their backgrounds.
   - Source: Lighthouse (accessibility)
   - Auto-fixable: Partially (if using Webflow MCP + CSS variables)

5. **Non-descriptive link text (4 instances)** — Four "Read more" links with no context. Screen readers hear "Read more" without knowing what they'll read more about.
   - Source: Lighthouse (accessibility / SEO)
   - Auto-fixable: No (CMS content change)

6. **Touch target too small (1 instance)** — "Read more" link below minimum 48×48px tap target.
   - Source: Lighthouse (accessibility)
   - Auto-fixable: No (CSS/layout change)

7. **Label/accessible name mismatch** — Visible text label doesn't match the accessible name on at least one element.
   - Source: Lighthouse (accessibility)
   - Auto-fixable: No (HTML attribute change)

### Low

8. **Deprecated API usage** — AttributionReporting API deprecation warning (from third-party ad/analytics scripts).
   - Source: Lighthouse (best-practices)
   - Auto-fixable: No (third-party script issue)

## Screenshots

- Desktop (1280×800): `.claude/research/test-page/getcoconut-thetimes-desktop.png`
- Mobile (375×812): `.claude/research/test-page/getcoconut-thetimes-mobile.png`

## Notes

- Cookie consent banner covers significant viewport area on mobile — consider if this impacts conversion
- No console errors detected — clean runtime
- CLS is excellent (0.002)
- The Best Practices score is dragged down primarily by third-party cookie usage (TikTok, Zoho) which is outside direct control but worth flagging to the client
- Accessibility score (92) is good but the `<main>` landmark and colour contrast issues are straightforward wins
