# Page Audit: /sell-car/store/halesowen

**URL:** https://www.carsa.co.uk/sell-car/store/halesowen
**Date:** 2026-05-14
**Template:** sell-car/store (CMS)
**Site ID:** 68348ea61096b37caacd2f95

---

## 1. Performance Budget Summary

| Resource | Count | Estimated Size | TTI Impact |
|----------|-------|---------------|------------|
| **External scripts** | 6+ (GTM, GA4, VWO, JetBoost, n8n Chat, Webflow) | ~200-300 KB total | High |
| **Inline scripts** | 8+ blocks (GSAP anims, attribution, forms, chat, SVG draw) | ~15 KB | Medium |
| **GSAP + ScrollTrigger + DrawSVG** | CDN-loaded | ~90 KB (core + plugins) | Medium |
| **jQuery** | Required by inline scripts | ~87 KB min | High |
| **Images** | 15-20 (hero, car cards, blog thumbs, logo) | Variable | Medium |
| **Fonts** | System/Webflow-embedded | Minimal | Low |
| **CSS** | Inline `<style>` blocks only (Webflow-generated) | ~50-80 KB | Low |

**Estimated script payload: ~400-500 KB** (before gzip). For a CMS template page, this is heavy.

---

## 2. Issues by Category

### CRITICAL

#### C1. Sell-car store pages are missing from the XML sitemap
- **Location:** https://www.carsa.co.uk/sitemap.xml
- **Detail:** The sitemap contains `/sell-car/part-exchange` and `/sell-car/value-car` but zero `/sell-car/store/*` URLs. The Halesowen page (and presumably all other sell-car location pages) are invisible to search engines via sitemap discovery.
- **Impact:** Google may never crawl or index these CMS template pages. They rely entirely on internal links for discovery.
- **Fix:** Add all `/sell-car/store/*` pages to the Webflow CMS sitemap. In Webflow, ensure the "Sell Car Stores" collection has sitemap generation enabled under Collection Settings > SEO. Alternatively, submit the URLs manually via Google Search Console.

#### C2. Missing `<lastmod>` dates in sitemap
- **Location:** https://www.carsa.co.uk/sitemap.xml
- **Detail:** No `<lastmod>` elements on any URL in the sitemap. Google uses lastmod to prioritise crawl frequency.
- **Fix:** Webflow should auto-generate lastmod. Check the CMS collection settings; if they are being stripped, this may be a Webflow limitation requiring a third-party sitemap tool.

---

### HIGH

#### H1. Missing Open Graph and Twitter Card meta tags (unconfirmed)
- **Location:** `<head>` of `/sell-car/store/halesowen`
- **Detail:** The previous sitewide SEO audit (2026-05-04) confirmed OG tags are present sitewide. However, the WebFetch extraction could not confirm OG tags on this specific CMS template page. This needs manual verification in Chrome DevTools (`document.querySelectorAll('meta[property^="og:"]')`).
- **Potential impact:** If OG tags are truly absent on this template, all sell-car store pages will show generic previews when shared on social media.
- **Fix:** If missing, add OG tags to the CMS template page settings in Webflow Designer, or inject them via custom code in the page `<head>`.

#### H2. Missing `lang` attribute on `<html>` element (unconfirmed)
- **Location:** `<html>` tag
- **Detail:** WebFetch could not detect a `lang` attribute. Webflow typically adds `lang="en"` but this needs manual verification.
- **Impact:** Screen readers and search engines may not correctly identify the page language.
- **Fix:** In Webflow Project Settings > General > Localization, ensure English (GB) is set. Or add `<html lang="en-GB">` via custom code.

#### H3. No `prefers-reduced-motion` handling for GSAP animations
- **Location:** `/Users/willmorley/webflow-scripts/projects/carsa/homepage.js` (lines 188-298 for SVG draw-line, lines 302-387 for draw-shape)
- **Detail:** The GSAP SVG animations (draw-line and draw-shape) run unconditionally. Users who have enabled "Reduce motion" in their OS settings still see full animations.
- **Impact:** Accessibility violation (WCAG 2.1 SC 2.3.3). Can cause discomfort or nausea for vestibular disorder users.
- **Fix:** Add a reduced-motion check at the top of each animation block:

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) return; // skip all SVG animations
```

#### H4. Duplicate H1 from chatbot widget (sitewide)
- **Location:** n8n chat widget injects "Chat with Caroline AI" as an H1
- **Detail:** Previously identified in sitewide SEO audit. Every page has 2 H1 tags. This affects the sell-car template too.
- **Impact:** Dilutes the primary H1 signal ("Sell your car in Halesowen") for search engines.
- **Fix:** Change the chatbot heading from `<h1>` to `<span>` or `<div>` in the n8n chat configuration.

#### H5. Car listing images missing alt text
- **Location:** Car card images in the "Browse cars at Carsa Halesowen" section
- **Detail:** Vehicle images from `r.carsa.co.uk` appear to lack descriptive alt text.
- **Impact:** Screen readers cannot describe the cars. Google Image Search misses indexing opportunities.
- **Fix:** Set CMS-bound alt text: `"{Year} {Colour} {Make} {Model}"` on vehicle card image fields.

#### H6. Form inputs missing associated `<label>` elements
- **Location:** VRM input and mileage input in the valuation form
- **Detail:** The car registration and mileage fields use placeholder text but lack explicit `<label>` elements or `aria-label` attributes.
- **Impact:** Screen readers announce these fields without context. WCAG 2.1 SC 1.3.1 failure.
- **Fix:** In Webflow Designer, add a visible or visually-hidden `<label>` for each input, or add `aria-label="Vehicle registration number"` and `aria-label="Current mileage"` via custom attributes.

---

### MEDIUM

#### M1. VWO (Visual Website Optimizer) is render-blocking
- **Location:** Inline VWO script in `<head>` (account 1130895)
- **Detail:** VWO loads synchronously in the head to prevent page flicker during A/B tests. This blocks rendering until VWO's script loads and executes.
- **Impact:** Adds 200-500ms to First Contentful Paint depending on network conditions.
- **Fix:** If not actively running A/B tests on this template, remove VWO from the sell-car pages. If VWO is needed, consider loading it asynchronously with a flicker-prevention CSS approach instead.

#### M2. jQuery dependency for lightweight functionality
- **Location:** Multiple inline scripts in `/Users/willmorley/webflow-scripts/projects/carsa/homepage.js` (lines 1-468)
- **Detail:** jQuery (~87 KB minified) is loaded as a dependency, but is used primarily for DOM queries (`$('.selector')`) and event binding that could be vanilla JS.
- **Impact:** 87 KB of unnecessary payload. On mobile 3G, this adds ~300ms to parse + execute.
- **Fix:** Long-term: migrate inline scripts from jQuery to vanilla JS. The `menu-scroll-lock.js` and `check-finance.js` files already use vanilla JS -- the pattern is established.

#### M3. Multiple scroll event listeners without throttling
- **Location:** `/Users/willmorley/webflow-scripts/projects/carsa/homepage.js` (lines 199, 258, 313, 350)
- **Detail:** The SVG draw-line and draw-shape scripts each register their own `scroll` event listener (with `{ passive: true }`, which is good). However, the `setEqualHeight` function on line 183 binds to `resize` without debouncing.
- **Impact:** On resize, `setEqualHeight` fires continuously, querying DOM heights for every card on every frame -- potential layout thrash.
- **Fix:**
```javascript
let resizeTimer;
$(window).on('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(setEqualHeight, 150);
});
```

#### M4. Hero/store image missing explicit width/height
- **Location:** `carsa-halesowen-4.avif` hero image
- **Detail:** The main store image appears to lack explicit `width` and `height` attributes.
- **Impact:** Browser cannot reserve layout space before the image loads, causing Cumulative Layout Shift (CLS).
- **Fix:** Add `width` and `height` attributes matching the image's intrinsic dimensions in the Webflow Designer image settings.

#### M5. No `loading="lazy"` on below-fold images
- **Location:** Car card images, blog thumbnails
- **Detail:** Images in the car listings carousel and blog section are below the fold but may not have `loading="lazy"`.
- **Impact:** All images download immediately on page load, competing with critical resources.
- **Fix:** In Webflow Designer, set `loading="lazy"` on all images that appear below the fold. Keep the hero image as `loading="eager"` (or omit the attribute).

#### M6. Structured data: `streetAddress` includes full address string
- **Location:** `/Users/willmorley/webflow-scripts/projects/carsa/schema/sell-car-template.html` (line 16)
- **Detail:** The `streetAddress` field contains `"Carsa - Halesowen, 124 Dudley Road, Halesowen, B63 3NS"` -- this includes the business name, locality, and postcode which should be in their own fields. Google's structured data guidelines expect `streetAddress` to contain only the street address portion.
- **Fix:** Update the CMS field binding so `streetAddress` maps to just `"124 Dudley Road"`. The "linked-store:address" field in the CMS may need splitting, or use a dedicated street-only field.

#### M7. AutoDealer schema missing `openingHoursSpecification`
- **Location:** `/Users/willmorley/webflow-scripts/projects/carsa/schema/sell-car-template.html`
- **Detail:** The AutoDealer schema has no opening hours. Google uses this for local business knowledge panels.
- **Fix:** Add `openingHoursSpecification` array:
```json
"openingHoursSpecification": [
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "09:00",
    "closes": "18:00"
  },
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": "Saturday",
    "opens": "09:00",
    "closes": "17:00"
  }
]
```

#### M8. Breadcrumb schema missing `item` URL on last element
- **Location:** `/Users/willmorley/webflow-scripts/projects/carsa/schema/sell-car-template.html` (line 59)
- **Detail:** The last BreadcrumbList item ("Halesowen") has no `item` URL. While Google allows omitting it for the current page, including it is best practice and avoids validation warnings.
- **Fix:**
```json
{
  "@type": "ListItem",
  "position": 3,
  "name": "Halesowen",
  "item": "https://www.carsa.co.uk/sell-car/store/halesowen"
}
```

---

### LOW

#### L1. No `<link rel="preconnect">` for third-party origins
- **Location:** `<head>`
- **Detail:** The page loads resources from `cdn.jetboost.io`, `cdn.jsdelivr.net`, `www.googletagmanager.com`, `r.carsa.co.uk` but has no preconnect hints.
- **Fix:** Add to `<head>`:
```html
<link rel="preconnect" href="https://cdn.prod.website-files.com" crossorigin>
<link rel="preconnect" href="https://r.carsa.co.uk" crossorigin>
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
```

#### L2. Font smoothing applied globally
- **Location:** Inline `<style>` block: `* { -webkit-font-smoothing: antialiased; }`
- **Detail:** Universal selector `*` applies font smoothing to every element including inputs and SVGs -- minor performance overhead on complex pages.
- **Fix:** Scope to `body` instead of `*`.

#### L3. AVIF logo image in schema may not be supported by all validators
- **Location:** `/Users/willmorley/webflow-scripts/projects/carsa/schema/site-wide.html` (line 31)
- **Detail:** The Organization logo is an AVIF file. Some schema validators and social media crawlers may not support AVIF.
- **Fix:** Use a PNG or JPEG fallback URL for the schema `logo.url` field.

#### L4. `paymentAccepted` mismatch between templates
- **Location:** `sell-car-template.html` says "Cash, Bank Transfer"; `stores-template.html` says "Cash, Credit Card, Finance"
- **Detail:** The sell-car template only lists Cash and Bank Transfer, while the stores template includes Credit Card and Finance. If the Halesowen store accepts finance payments for all services, this should be consistent.
- **Fix:** Align `paymentAccepted` values across templates based on actual payment methods available at each location.

---

## 3. Quick Wins (implement today)

1. **Enable sitemap for sell-car store collection** (C1) -- single toggle in Webflow CMS settings
2. **Add `prefers-reduced-motion` guard** (H3) -- 2 lines of code at top of each animation IIFE
3. **Debounce `setEqualHeight` on resize** (M3) -- 3 lines of code
4. **Add `item` URL to last breadcrumb** (M8) -- 1 field addition in template
5. **Add preconnect hints** (L1) -- 3 lines in site-wide custom code `<head>`

## 4. Longer-term Improvements

1. **Migrate inline jQuery scripts to vanilla JS** (M2) -- eliminates 87 KB dependency
2. **Split CMS `address` field** for clean structured data (M6) -- requires CMS schema change
3. **Add `openingHoursSpecification`** to sell-car schema (M7) -- needs CMS hours data or hardcoded values
4. **Audit and remove VWO** from non-test pages (M1) -- coordinate with marketing
5. **Set CMS-bound alt text** on all vehicle images (H5) -- requires CMS field setup
6. **Create llms.txt** at site root (from previous sitewide audit)

---

## 5. Console Errors

Without Chrome DevTools MCP access, console errors could not be captured programmatically. Manual check recommended:
1. Open Chrome DevTools > Console
2. Hard refresh (Cmd+Shift+R)
3. Look for: red errors, CORS issues, 404s for scripts/images, GSAP warnings, mixed content warnings
4. Check Network tab for failed requests (filter by status 4xx/5xx)

## 6. Mobile Responsiveness

The page uses Webflow's responsive framework with:
- Standard viewport meta tag: `width=device-width, initial-scale=1`
- Webflow responsive breakpoints (`.w-*` classes)
- Menu scroll lock script properly handles mobile nav (`/Users/willmorley/webflow-scripts/projects/carsa/menu-scroll-lock.js`)
- Chat widget viewport height calculation for mobile

**Potential issue:** The `setEqualHeight` function (`/Users/willmorley/webflow-scripts/projects/carsa/homepage.js` line 173) forces all car cards to the same height. On mobile single-column layouts, this may create unnecessary whitespace if cards have varying content lengths. Consider disabling equal heights below tablet breakpoint:
```javascript
function setEqualHeight() {
  let $cards = $('[data-card-height="equal"]');
  if (window.innerWidth < 768) {
    $cards.css('height', 'auto');
    return;
  }
  // ... existing logic
}
```
