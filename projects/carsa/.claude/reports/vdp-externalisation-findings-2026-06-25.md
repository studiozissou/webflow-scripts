# Carsa VDP Script Externalisation — Findings & Recommendations

**Date:** 2026-06-25
**Project:** carsa-vdp-script-externalisation (Phase 1)
**Status:** Complete, deployed to staging, pending live publish

---

## What we did

Moved 19 inline `<script>` blocks (~45KB) from the Webflow VDP page body code into a single external file (`vdp.js`) hosted on jsDelivr CDN, pinned to a specific commit hash.

## Performance results

### Cold load (first visit) — no change

Tested across 6 VDP pages on staging (`carsa-v2.webflow.io`), unthrottled desktop.

| Metric | Inline (before) | External CDN (after) | Delta |
|--------|-----------------|---------------------|-------|
| LCP (avg) | 909ms | 925ms | +16ms (within variance) |
| CLS (avg) | 0.02 | 0.02 | no change |
| TTFB (avg) | 56ms | 58ms | no change |

**Conclusion:** No measurable regression or improvement on first-visit load speed. The ~14KB gzipped script file is too small to move LCP on broadband. LCP is driven by hero images and render delay, not script payload.

### Repeat visits — cached

On the second visit (or browsing between VDP pages), `vdp.js` is served from browser disk cache with 0 bytes transferred. Verified by automated test using CDP transfer size measurement.

- jsDelivr serves pinned commits with `cache-control: public, max-age=31536000, immutable`
- With inline scripts, the same 45KB was re-embedded in every HTML response with no caching possible

**Estimated per-visit saving:** ~15-30ms on broadband, ~50-100ms on slow mobile. Small individually, but compounds across thousands of daily VDP page views.

## SEO impact

**Slim.** The externalisation does not meaningfully affect Core Web Vitals:

- **LCP:** No change — driven by images, not script size
- **CLS:** No change — scripts don't affect layout
- **INP:** Not measured, but the same JS executes either way
- **TTFB:** Marginal improvement from lighter HTML payload (~45KB less per response), but Webflow's server response time dominates

Google's CWV thresholds are coarse (LCP good < 2.5s, poor > 4s). A 15-30ms change doesn't move the needle between bands.

## UX impact

**Slightly better for returning visitors and multi-page browsing sessions.** A typical user journey (home > SRP > VDP > back to SRP > different VDP) benefits from cached scripts across pages. After the first page load, all custom JS comes from disk cache.

## Primary value: operational stability

The strongest case for this work is not performance — it's **reliability and maintainability**:

1. **Version control** — scripts are in git with full history, diffs, and blame. Previously they were only in the Webflow page settings editor with no history.
2. **Instant rollback** — change the commit hash in one line to revert to any previous version. Previously, reverting meant manually re-pasting old code.
3. **Code review** — the review process is only possible with externalised code.
4. **Automated testing** — 19 acceptance tests run against live/staging, catching regressions before users see them. Not possible with inline scripts.
5. **Cross-developer collaboration** — any developer can read, review, and modify the scripts without Webflow Designer access.

## Remaining issues (Phase 3, low priority)

Documented in `vdp.js` header comment:

- Hardcoded `requestUuid` in finance API payload
- Unthrottled MutationObserver on equal-height cards
- Attribution/UTM logic duplicated 6 times with slight variations
- Two different `formatCurrency` functions in separate scopes

## Recommendations

### Do now
- **Publish to live** — staging tests pass (19/19), no regression detected
- **Monitor** — check finance calculator outputs on a few live VDPs after publish

### Consider for other pages
- **SRP and homepage** could follow the same pattern, but expect similar results: no meaningful speed gain, value is in maintainability
- **Site-wide `init.js` loader** would enable cross-page caching of all custom scripts, giving the best repeat-visit UX. Worth doing if more pages get externalised.

### Don't bother with
- **Phase 2 jQuery removal** — jQuery is bundled into Webflow's runtime and loads regardless. Rewriting to vanilla JS saves zero bytes and zero requests. Only worth doing for code clarity, not performance.
- **Chasing LCP improvements via script changes** — the bottleneck is images, fonts, and third-party scripts (GSAP, Finsweet, analytics), not 14KB of custom JS.

## Test coverage

19 automated acceptance tests covering:
- Console errors (2 tests, multiple pages)
- External script loading
- Finance calculator, gallery, equal-height cards
- UTM attribution on Build Deal / Book / Eligibility links
- Get Started link with VRM and location
- Search Similar link
- Form hidden UTM fields
- PX valuation form
- Check-finance hover link builder
- CMS config object
- Cold banner carousel (UTM-triggered Swiper)
- Cache behaviour (headers + transfer size verification)

## Files

| File | Description |
|------|-------------|
| `projects/carsa/vdp.js` | Externalised VDP scripts |
| `projects/carsa/.claude/specs/vdp-webflow-body-code.html` | Webflow body code (paste into Designer) |
| `tests/acceptance/carsa-vdp-script-externalisation.spec.js` | 19 acceptance tests |
| `projects/carsa/.claude/audits/lighthouse/staging/` | Performance traces and comparison report |
