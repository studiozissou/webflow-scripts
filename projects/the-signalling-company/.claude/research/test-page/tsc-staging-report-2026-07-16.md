# Test Results: TSC Staging Site (tsc-v2.webflow.io)

Date: 2026-07-16 | Mode: Automated full-site sweep | Engine: Chrome DevTools MCP
Scope: 35 pages | Viewports: Desktop 1280px + Mobile 375px | Priority: mobile layout

## Method
- Mobile overflow sweep: every page rendered in a same-origin 375px iframe (applies mobile
  breakpoints by width), measured document overflow + non-clipped offenders + broken images.
  Marquee/animation strips clipped by `overflow:hidden` were filtered out as false positives.
- Desktop overflow sweep: all 32 live pages in 1280px iframes.
- Lighthouse (mobile, navigation): home + product + news template representatives.
- 404 verification: direct HTTP status via fetch (redirect:manual).

## Scores (mobile Lighthouse)
| Page | Accessibility | Best Practices | SEO | Agentic |
|------|--------------|----------------|-----|---------|
| / (home) | 96 | 100 | 69* | 67 |
| /products/etcs | 100 | 100 | 66* | 100 |
| /news/skoda-group-acquires-majority-stake | 100 | 100 | 66* | 100 |

*SEO fail is **100% the staging `noindex`** (`is-crawlable`). Expected on webflow.io. Not a real defect — see LAUNCH GATE.

## Summary
- **Desktop: clean.** Zero horizontal overflow across all 32 live pages at 1280px.
- **Mobile: 2 horizontal-overflow bugs** (`/services`, `/privacy-policy`).
- **3 pages 404** — 1 is a site-wide nav/footer link (high), 2 are unlinked orphan slugs (low).
- **1 accessibility defect** (prohibited ARIA) from the scroll-text animation utility.
- No broken images anywhere. No JS console errors (home clean).

---

## Issues (7 total)

### High

**1. `/railos/app-store` returns 404 but is linked site-wide**
- Source: 404 verification + link scan. Status: 404 (confirmed via fetch).
- Linked from the **main nav dropdown (×2, "RailOS App Store") and the footer (×1, "App Store")** —
  i.e. on **every page**. Any visitor using the nav hits a dead page.
- Fix: publish the page, or repoint/remove the nav + footer links. Auto-fixable: No (content/nav decision).

**2. `/services` — horizontal overflow +124px on mobile (375px)**
- Source: mobile overflow sweep. `.grid_features` uses `grid-template-columns: 480px` (a **fixed**
  480px track) that is not overridden at the mobile breakpoint, so `.card_setup` cards render at
  480px in a 375px viewport → page scrolls sideways.
- Fix: at mobile breakpoint set `.grid_features` to `grid-template-columns: minmax(0, 1fr)` (or `1fr`).
- Evidence: `mobile-services-overflow.png`. Auto-fixable: No (Webflow Designer grid setting).

### Medium

**3. `/privacy-policy` — horizontal overflow +74px on mobile (375px)**
- Source: mobile overflow sweep + min-content analysis. Root cause: **long raw URLs used as link
  text** in the cookie section (worst: a 94-char Microsoft support URL; also Mozilla 82, Chrome 76,
  Apple 66). These don't wrap, forcing `.master_legal` min-content to 431px and stretching the
  `.legal_halves` grid track past the viewport. Cookie-policy & disclaimer (same template, no long
  URLs) do **not** overflow — confirming the cause.
- Fix: add `overflow-wrap: anywhere` (or `word-break: break-word`) to the legal rich-text links
  (`.text-rich-text a`), and/or set `.legal_halves` column to `minmax(0, 1fr)`.
- Evidence: `mobile-privacy-policy-overflow.png`. Auto-fixable: No (CSS/Designer).

**4. Prohibited ARIA attribute on animated text (`aria-prohibited-attr`)**
- Source: Lighthouse a11y (home 96; drops Agentic Browsing to 67). The scroll-text animation utility
  (`text-fill-scroll` / `heading-scroll` / `text-scroll` attributes) puts `aria-label` on `<p>`,
  `<blockquote>` and `<div>` elements that have **no `role`** — ARIA forbids `aria-label` there, so the
  accessible name is dropped for screen readers. 5 instances on home; repeats on any page using these
  animations (likely /about, /railos, /leadership).
- Fix: in the animation utility, add `role="text"` alongside the `aria-label` (or hide split spans with
  `aria-hidden` and keep the real text node). Auto-fixable: No (JS utility).

### Low

**5. `/products/kvb` — 404 (orphan slug)**
- Confirmed 404. Not linked from `/products` or nav/footer. Old/unpublished CMS item. Only matters if
  an external/old URL points here. Fix: 301 redirect or ignore.

**6. `/products/pzb` — 404 (orphan slug)**
- Same as above. Not currently linked anywhere found.

### Info / Launch gate

**7. LAUNCH GATE — staging `noindex` must be removed on production**
- Every page scores SEO 66–69 solely because Webflow staging serves `robots: noindex`
  (`is-crawlable` = 0). This is correct for staging but **must be verified removed** when the site
  goes live on the production domain, or the site won't be indexed by Google.

**Info — slow load once:** `/news/worlds-first-software-defined-etcs-certified` timed out (>12s) on the
first iframe pass but loaded normally on retry. Possibly a heavy hero asset. Worth a perf trace if the
news template feels slow, otherwise not reproducible.

---

## What was verified clean
- Desktop layout (32 pages, 1280px): no overflow.
- Mobile layout (33 live pages, 375px): only `/services` and `/privacy-policy` overflow; the other 31 are clean.
- Broken images: none on any page.
- JS console errors: none (home). Only benign `<picture><source>` fallback `error` events (noise).
- Best Practices: 100 on all sampled templates. Product & news templates: 100 a11y.

## Screenshots
- `mobile-services-overflow.png`
- `mobile-privacy-policy-overflow.png`

## Re-verification (2026-07-16, after fixes)
| # | Issue | Result |
|---|-------|--------|
| 1 | `/railos/app-store` 404 site-wide link | **FIXED** — now 301→`/railos/apps` (200); nav + footer links removed |
| 2 | `/services` mobile overflow | **FIXED** — 0px overflow; `.grid_features` track now `322.5px` |
| 3 | `/privacy-policy` mobile overflow | **FIXED** — 0px overflow; `.legal_halves` track now `322.5px`, URLs wrap |
| 4 | `aria-prohibited-attr` (scroll-text) | **FIXED & LIVE** — root cause = GSAP SplitText default `aria:"auto"`; fix adds `role="text"` (keeps label) in init.js `fixProhibitedSplitAria()`, committed `5edb92b`, footer jsDelivr tag bumped `@2086b0a`→`@5edb92b`, published. Verified live: 0 prohibited nodes, 19 `role="text"`, **Accessibility 100 / Agentic 100**, no console errors |
| 5–6 | `/products/kvb`, `/products/pzb` 404 | Unchanged (still 404, still unlinked — low) |
| 7 | staging `noindex` | Unchanged (expected on staging) |

## Suggested fix order for launch
1. Fix/repoint `/railos/app-store` nav + footer link (site-wide 404). **[High]**
2. `.grid_features` → `minmax(0,1fr)` at mobile (`/services` overflow). **[High]**
3. `overflow-wrap: anywhere` on legal rich-text links (`/privacy-policy`). **[Medium]**
4. Add `role="text"` in the scroll-text animation utility (a11y). **[Medium]**
5. Verify `noindex` removed on production. **[Launch gate]**
6. Decide redirects for `/products/kvb`, `/products/pzb`. **[Low]**
