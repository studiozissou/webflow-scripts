# Test Page Report: Coconut Pricing

**URL:** https://getcoconut.webflow.io/pricing
**Date:** 2026-04-03
**Mode:** Full
**Viewport:** Desktop 1280x800, Mobile 375x812

---

## Scores

| Category | Value | Status |
|----------|-------|--------|
| CLS | 0.048 | PASS (< 0.1) |
| Desktop Overflow | No | PASS |
| Mobile Overflow | No | PASS |
| Console Errors | 1 (Intercom 403) | PASS (third-party) |
| Keyboard A11y | All `:focus-visible` | PASS |
| Heading Hierarchy | H1 > H2 > H3 | PASS |

---

## Change Verification (vs live site)

| # | Required Change | Status |
|---|----------------|--------|
| 1 | Remove yearly/monthly toggle | PASS |
| 2 | Show yearly primary, monthly secondary | PASS |
| 3 | Rename "Essentials" to "Bookkeeping" | PASS |
| 4 | Rename "+MTD" to "MTD filing" | PASS |
| 5 | Remove "+Self Assessment" plan | PASS |
| 6 | Remove "Full" plan | PASS |
| 7 | Bookkeeping CTA plan-specific | PASS — "Start Bookkeeping free trial" |
| 8 | MTD filing CTA plan-specific | PASS — "Start MTD filing free trial" |
| 9 | MTD filing monthly price | PASS — £21.99/month (fixed) |

---

## Issues

### Medium

1. **Empty H3 heading** — A visible `<h3>` with no text content inside the Bookkeeping card (below "Key features"). Likely a leftover from the original layout.

2. **35 images missing alt text** — Mostly small icons (checkmarks, decorative) but includes a larger image (~476x201). Decorative images should use `alt=""` explicitly, and content images need descriptive alt text.

3. **5 empty links (no text, no aria-label)** — Includes the home logo link and App Store / Google Play links (which have images inside but no alt on the wrapping `<a>`).

### Low

4. **Intercom 403 error** — `api-iam.intercom.io/messenger/web/ping` returns 403. Third-party, likely a staging domain restriction. No action needed.

5. **CLS 0.048 from SECTION shifts** — Within acceptable range but caused by three section-level layout shifts on load. Likely from banner/countdown timer rendering.

---

## Screenshots

- Desktop (1280): `.claude/research/test-page/coconut-test-desktop-1280.png`
- Desktop pricing: `.claude/research/test-page/coconut-test-pricing.png`
- Mobile (375): `.claude/research/test-page/coconut-test-mobile-375.png`
- Mobile pricing: `.claude/research/test-page/coconut-test-mobile-pricing.png`
- Live pricing (reference): `.claude/research/test-page/coconut-live-pricing.png`
