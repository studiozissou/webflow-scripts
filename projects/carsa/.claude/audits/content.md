# Carsa.co.uk Content & Code Inventory Audit
**Date:** 2026-07-01
**Previous:** 2026-06-01 (May baseline: 2026-05-04)

## Summary

| Category | July Status | June Status | Change |
|----------|------------|-------------|--------|
| Custom code inventory | 16 external scripts, 28 inline | N/A (first full inventory) | NEW |
| Dev/test pages | 2 protected, 2 removed/redirected | 4 published (2 protected, 2 x 404) | IMPROVED |
| Expired promotion | RESOLVED | "Ends 31st Dec 25" still live | FIXED |
| Blog author "Jane Doe" | RESOLVED | Still "Jane Doe" | FIXED |
| HTTP links on terms pages | 2 pages affected | 3 pages affected | IMPROVED |
| Broken blog images | RESOLVED | 2 posts with broken images | FIXED |
| Forms | PASS | PASS | No change |
| Unpinned scripts (@latest) | 2 scripts | 3 scripts (GSAP, n8n, JetBoost) | IMPROVED |

---

## 1. Custom Code Inventory (Full)

### External Scripts (loaded via `<script src>`)

| # | Script | Source | Version | Pinned? | Risk |
|---|--------|--------|---------|---------|------|
| 1 | Mixpanel SDK | cdn.mxpnl.com/libs/mixpanel-2-latest.min.js | `latest` | NO | MEDIUM |
| 2 | Mixpanel JS Wrapper | cdn.mxpnl.com/libs/mixpanel-js-wrapper.min.js | N/A | N/A | LOW |
| 3 | Google Tag Manager | googletagmanager.com/gtm.js | GTM-MM5N6CP8 | Yes (container ID) | LOW |
| 4 | Webflow Analytics | carsa.co.uk/g0lnomhfn3m... (1st party) | N/A | N/A | LOW |
| 5 | Finsweet Attributes | cdn.jsdelivr.net/npm/@finsweet/attributes@2 | @2 (major) | Partial | LOW |
| 6 | Finsweet Components Config | cdn.prod.website-files.com/.../finsweetcomponentsconfig-1.0.2.js | 1.0.2 | Yes | LOW |
| 7 | Finsweet fs-components | cdn.jsdelivr.net/npm/@finsweet/fs-components@2 | @2 (major) | Partial | LOW |
| 8 | Calltracks Loader | app3.calltracks.com/wnd/loader.js | N/A | N/A | LOW |
| 9 | Calltracks g3.js | app3.calltracks.com/wnd/g3.js | N/A | N/A | LOW |
| 10 | Trustpilot Widget | widget.trustpilot.com/bootstrap/v5 | v5 | Yes (major) | LOW |
| 11 | jQuery | d3e54v103j8qbb.cloudfront.net (Webflow CDN) | 3.5.1 | Yes | LOW |
| 12 | Webflow runtime | cdn.prod.website-files.com/.../webflow.*.js | Webflow-managed | Yes | LOW |
| 13 | GSAP | cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js | 3.15.0 | Yes | LOW |
| 14 | GSAP ScrollTrigger | cdn.prod.website-files.com/gsap/3.15.0/ScrollTrigger.min.js | 3.15.0 | Yes | LOW |
| 15 | GSAP DrawSVGPlugin | cdn.prod.website-files.com/gsap/3.15.0/DrawSVGPlugin.min.js | 3.15.0 | Yes | LOW |
| 16 | GSAP EasePack | cdn.prod.website-files.com/gsap/3.15.0/EasePack.min.js | 3.15.0 | Yes | LOW |

### Inline Scripts (28 total)

| # | Purpose | Size | Notes |
|---|---------|------|-------|
| 1 | Webflow modernizr/touch detect | 181 B | Webflow default |
| 2 | Schema.org (CollectionPage) | 1,030 B | Structured data |
| 3 | GA4 first-party tag push | 162 B | G-6WQDNZH59K |
| 4 | GA4 config | 223 B | gtag('config', 'G-6WQDNZH59K') |
| 5 | GTM loader | 431 B | GTM-MM5N6CP8 |
| 6 | Schema.org (Organization + WebSite) | 2,706 B | Structured data |
| 7 | VWO (Visual Website Optimizer) | 5,498 B | Account 1130895, version 2.1 |
| 8 | Filter form submit blocker | 845 B | Blocks wf-form-Filter-Vehicles submit |
| 9 | VWO error handler | 11,839 B | Account 1130895 |
| 10 | GSAP plugin registration | 58 B | ScrollTrigger, DrawSVGPlugin, EasePack |
| 11 | Menu scroll lock | 1,248 B | Prevents bg scroll on mobile nav |
| 12 | CMS model/make link builder | 668 B | Builds /used-cars?... links |
| 13 | Store list reorder (jQuery) | 78 B | Moves #find-store-link |
| 14 | UTM attribution saver | 3,251 B | sessionStorage + localStorage (30d) |
| 15 | UTM link appender | 2,187 B | Appends UTMs to outbound links |
| 16 | External link rel=noreferrer | 197 B | Adds noreferrer noopener to target=_blank |
| 17 | Year updater | 105 B | Sets #year to current year |
| 18 | n8n Chat widget | 2,815 B | Imports from jsdelivr (unpinned) |
| 19 | Finsweet list loading UX | 1,384 B | Show/hide loader on CMS list |
| 20 | make-model-redirect v2 | 13,564 B | Core vehicle search routing |
| 21 | 404 redirect message | 176 B | Shows #redirect-message from session |
| 22 | Finsweet list card enhancements | 1,683 B | CMS card rendering hooks |
| 23 | Check finance link builder | 3,838 B | Builds eligibility checker URLs |
| 24 | Results counter | 890 B | Formats #desktop-results count |
| 25 | Mobile filters toggle | 1,219 B | Filter panel for <= 991px |
| 26 | VRM input sanitiser | 178 B | A-Z0-9 only, uppercase |
| 27 | Valuation link builder | 2,822 B | UTM-aware valuation URLs |
| 28 | Calltracks loader (inline) | 206 B | Duplicate of external loader |

### Stylesheets (4)

| # | Source | Notes |
|---|--------|-------|
| 1 | Webflow shared CSS | carsa-v2.webflow.shared.*.min.css |
| 2 | Webflow page CSS | carsa-v2.webflow.*.opt.min.css |
| 3 | Google Fonts | Plus Jakarta Sans (400-800) |
| 4 | n8n Chat CSS | cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css (unpinned) |

### Scripts Using @latest / Unpinned Versions

| Script | URL Pattern | Risk | Recommendation |
|--------|-------------|------|----------------|
| Mixpanel SDK | `mixpanel-2-latest.min.js` | MEDIUM | Pin to specific version |
| n8n Chat (JS + CSS) | `@n8n/chat/dist/...` (no version) | MEDIUM | Pin e.g. `@n8n/chat@0.20.0` |

**Resolved since June:**
- GSAP: Now pinned to 3.15.0 via Webflow native GSAP integration (was unpinned)
- JetBoost: Removed entirely from the site

### New Since May/June

| Script | Status | Notes |
|--------|--------|-------|
| Mixpanel SDK + Wrapper | NEW | Not present in May/June audits. Analytics/tracking. Uses `@latest` pattern. |
| Calltracks (3 scripts) | NEW | Call tracking service. Not in previous inventory. |
| Finsweet Components | NEW | Was only Attributes before; now also fs-components with config file |
| Webflow 1st-party analytics | NEW | carsa.co.uk-hosted analytics script (Webflow Analyze) |

### Removed Since May/June

| Script | Status | Notes |
|--------|--------|-------|
| GitHub-hosted scripts (studiozissou) | REMOVED | All custom scripts now inlined in page `<head>` / `<body>`. Migration to inline complete. |
| JetBoost | REMOVED | cdn.jetboost.io no longer loaded |

---

## 2. Dev/Test Pages

| Page | URL | May Status | July Status | Change |
|------|-----|------------|-------------|--------|
| Impel Test | /development/impel-test | 401 Protected | 401 Protected | No change |
| Search Demo | /development/search-demo | 404 | 401 Protected | Now protected (was 404) |
| Our Team | /development/our-team | 404 | Redirects to /car-finance | Removed/redirected |
| Eligibility Hero MCP Test | /development/eligibility-hero-mcp-test | 401 Protected | Redirects to /stores | Removed/redirected |

**Status: IMPROVED** -- Down from 4 published pages to 2 (both password-protected). The two that were previously 404 have been cleaned up (one redirected, one now protected). Recommend depublishing the remaining 2 or adding `noindex` meta tags.

---

## 3. Expired Content

| Item | May/June Status | July Status |
|------|-----------------|-------------|
| "Ends 31st Dec 25" homepage promotion | Present (7 months expired by June) | REMOVED |
| Current promotion | N/A | "Summer Deals: £200-£1500 off + Free 1-year warranty" |

**Status: RESOLVED** -- The expired December 2025 promotion has been replaced with a current Summer Deals promotion. No date-specific expiry text found on the homepage.

---

## 4. Blog Author

| Check | May/June Status | July Status |
|-------|-----------------|-------------|
| Visible author name | "Jane Doe" on blog posts | No author name displayed |
| Schema.org author field | Not checked | Not present in BlogPosting schema |
| Jane Doe text anywhere | Present | Not found |

**Status: RESOLVED** -- "Jane Doe" placeholder has been removed. Blog posts now display date, read time, and category but no author name. The BlogPosting schema includes `publisher` (Organization) but no `author` field.

**Recommendation:** Consider adding a real author to blog posts for E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness). Google's Search Quality Rater Guidelines weigh authorship for YMYL content (car finance articles qualify).

---

## 5. HTTP Links on Terms Pages

| Page | May/June Status | July Status | Links Found |
|------|-----------------|-------------|-------------|
| /terms/data-privacy | HTTP links present | CLEAN | None |
| /terms/terms-conditions | HTTP links present | STILL HTTP | 3x `http://www.carsa.co.uk/` |
| /terms/cookie-policy | HTTP links present | STILL HTTP | 2x `http://www.youronlinechoices.com/` |
| /terms/terms-of-use | Not checked | CLEAN | None |

**Status: IMPROVED** -- Down from 3 affected pages to 2. Data-privacy is now clean.

**Remaining fixes needed:**
- `/terms/terms-conditions`: 3 instances of `http://www.carsa.co.uk/` should be `https://www.carsa.co.uk/`
- `/terms/cookie-policy`: 2 instances of `http://www.youronlinechoices.com/` should be `https://www.youronlinechoices.com/`

---

## 6. Broken Blog Images

| Page | June Status | July Status |
|------|-------------|-------------|
| /blog/best-used-cars-under-15000-uk | Broken images reported | All images loading (0 broken) |
| /blog/best-used-estate-cars-uk | Broken images reported | All images loading (0 broken) |

**Status: RESOLVED** -- Both blog posts now load all images successfully.

---

## 7. Forms

| Form | Page | Success Message | Error Handling | Redirect |
|------|------|-----------------|----------------|----------|
| Contact form | /contact | "Thank you! Your submission has been received!" | Yes | None (inline) |
| Part Exchange (small) | /sell-car/value-car | "Thank you! Your submission has been received!" | Yes | None (inline) |
| Valuation form | /sell-car/value-car | "Thank you! Your submission has been received!" | Yes | None (inline) |

**Status: PASS** -- All forms have success and error states configured. No redirect configured (all use Webflow native inline confirmation).

---

## Month-Over-Month Trend

| Issue | May | June | July | Trajectory |
|-------|-----|------|------|------------|
| Dev/test pages published | 4 (2 protected, 2 x 404) | 4 (unchanged) | 2 (both protected) | Improving |
| Expired promotion | 5 months expired | 7 months expired | Removed, current promo active | Resolved |
| Blog author "Jane Doe" | Present | Present | Removed | Resolved |
| Terms pages with HTTP links | 3 | 3 | 2 | Improving |
| Blog posts with broken images | Unknown | 2 | 0 | Resolved |
| Scripts using @latest | 3 (GSAP, n8n, JetBoost) | 3 | 2 (Mixpanel, n8n) | Improving |
| GitHub-hosted custom scripts | 6+ | 6+ | 0 (all inlined) | Resolved |
| Total external scripts | ~12 | ~12 | 16 (new: Mixpanel, Calltracks, Finsweet Components) | Increased |
| Total inline scripts | Unknown | Unknown | 28 | Baselined |

---

## New Observations (July)

1. **Mixpanel added** -- New analytics tool (2 scripts). Uses `@latest` filename pattern (`mixpanel-2-latest.min.js`). Confirm this is intentional and not a leftover from testing.

2. **Calltracks added** -- Call tracking service with 3 scripts (loader, g3.js, pingback.js). Dynamic phone number insertion for attribution.

3. **Script inlining complete** -- All 6+ custom scripts previously hosted on studiozissou GitHub via jsDelivr are now inlined directly in the Webflow page. This eliminates the external dependency risk but increases the importance of Webflow version control (publish history).

4. **Webflow native GSAP** -- GSAP is now loaded from `cdn.prod.website-files.com/gsap/3.15.0/` (Webflow's native GSAP integration) rather than an external CDN. This pins the version and removes the @latest risk.

5. **VWO code weight** -- VWO contributes ~17 KB across 2 inline scripts (5,498 B + 11,839 B). Consider whether A/B testing is actively used; if not, removing VWO saves significant render-blocking weight.

6. **Inline script payload** -- 28 inline scripts totalling approximately 55 KB of uncompressed JavaScript. The largest is make-model-redirect v2 at 13.5 KB.

---

## Action Items

| Priority | Action | Owner | Status |
|----------|--------|-------|--------|
| LOW | Fix 3x `http://` links on /terms/terms-conditions | Carsa (CMS) | Open |
| LOW | Fix 2x `http://` links on /terms/cookie-policy | Carsa (CMS) | Open |
| MEDIUM | Pin n8n Chat to specific version (JS + CSS) | Dev | Open |
| LOW | Pin Mixpanel SDK or confirm @latest is vendor-recommended | Dev | Open |
| LOW | Depublish or noindex remaining 2 dev pages | Carsa (Webflow) | Open |
| MEDIUM | Add author names to blog posts for E-E-A-T | Carsa (content) | Open |
| LOW | Audit VWO usage -- remove if not actively testing | Carsa | Open |
