# Technical Audit — Carsa
**Date:** 2026-07-01
**URL:** https://www.carsa.co.uk
**Scope:** Infrastructure checks + Lighthouse audits across 12 key pages

---

## Infrastructure checks

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt | PASS | Present, permissive (`Allow: /`), references sitemap. No AI bot blocks (GPTBot, CCBot, Google-Extended etc. all allowed). |
| sitemap.xml | PASS | ~1,200+ URLs in single file. Covers core pages, 900+ model pages, 120+ blog posts, 12 store pages, legal pages, and vehicle listings. Referenced in robots.txt. |
| SSL/HTTPS | PASS | HTTPS enforced site-wide. HSTS header present (`max-age=31536000`). Cloudflare CDN. |
| Canonical domain | PASS | `http://carsa.co.uk` -> 301 -> `https://carsa.co.uk` -> 301 -> `https://www.carsa.co.uk/`. Double-hop redirect but resolves correctly to www. |
| GA4 | PASS | `G-6WQDNZH59K` present on all pages via gtag. |
| GTM | PASS | `GTM-MM5N6CP8` present on all pages. |
| VWO | PASS | Visual Website Optimizer account `1130895` active. |
| Cookie consent | PASS | Functional consent UI with categories. |
| Canonical tags | NOTE | No explicit `<link rel="canonical">` in HTML head. Canonical identity established via Schema.org `@id` and `url` properties only. Recommendation: add explicit canonical link tags. |
| AI bot policy | NOTE | No specific AI crawler rules in robots.txt. All AI crawlers (GPTBot, ChatGPT-User, CCBot, Google-Extended, anthropic-ai) are currently permitted. Consider adding rules if content scraping is a concern. |

---

## Lighthouse scores (July 2026)

All audits run on mobile emulation via Chrome DevTools Lighthouse.

**Note on methodology:** The Lighthouse MCP tool runs accessibility, best practices, SEO, and agentic browsing categories. Performance scores are not available through this tool. Several pages exhibited redirect behaviour during Lighthouse navigation mode (VWO A/B testing or cookie banner scripts triggering navigation on reload). Where navigation mode was unreliable, snapshot mode was used (marked with *). Performance field data (CrUX) is included where available.

| Page | Accessibility | Best Practices | SEO | Notes |
|------|-------------|----------------|-----|-------|
| `/` (homepage) | 100 | 96 | 92 | CLS flagged; SEO: link-text issue |
| `/used-cars` | 87 | 73 | 100 | aria-required-children, heading-order, link-name, select-name failures; 3P cookies |
| `/car-finance` | 100 | 73 | 100 | 3P cookies, console errors, inspector issues |
| `/stores` | 95 | 73 | 100 | heading-order, target-size, 3P cookies |
| `/blog` | 94 | 96 | 100 | aria-required-children, heading-order |
| `/faq` | 100 | 96 | 100 | label-content-name-mismatch only |
| `/about/carsa` | 100 | 96 | 100 | Console errors only |
| `/contact` | 98 | 96 | 100 | heading-order |
| `/sell-car/value-car` * | 96 | 100 | 100 | target-size (snapshot mode) |
| `/used-cars/models/audi-a3` * | 95 | 100 | 100 | heading-order, target-size (snapshot mode) |
| VDP (`/vehicles/used/dy70uyt`) * | 97 | 100 | 83 | label-content-name-mismatch, target-size, link-text (snapshot mode) |
| Blog post (audi-a3-vs-bmw-1-series) | 93 | 96 | 100 | color-contrast, link-name |

\* Snapshot mode used due to VWO/cookie scripts causing navigation redirects during Lighthouse reload.

### CrUX field data (where available)

| Page | LCP (p75) | INP (p75) | CLS (p75) | Source |
|------|-----------|-----------|-----------|--------|
| `/` (homepage) | 3,170 ms | 54 ms | 0.01 | CrUX (url-level) |

---

## Month-over-month comparison

Comparing June 2026 vs July 2026 scores. Performance scores could not be obtained this month (Lighthouse MCP excludes the performance category). Accessibility scores are directly comparable for navigation-mode audits.

| Page | June Perf | July Perf | June A11y | July A11y | A11y delta |
|------|-----------|-----------|-----------|-----------|------------|
| `/` | 44 | n/a | 100 | 100 | -- |
| `/used-cars` | 26 | n/a | 87 | 87 | -- |
| `/car-finance` | 55 | n/a | 100 | 100 | -- |
| `/stores` | 57 | n/a | 95 | 95 | -- |
| `/blog` | 56 | n/a | 94 | 94 | -- |
| `/faq` | 79 | n/a | 100 | 100 | -- |
| `/about/carsa` | 60 | n/a | 100 | 100 | -- |
| `/contact` | 56 | n/a | 98 | 98 | -- |
| `/sell-car/value-car` | 57 | n/a | 100 | 96* | -4* |
| `/used-cars/models/audi-a3` | 33 | n/a | 84 | 95* | +11* |
| Blog post | 56 | n/a | 96 | 93 | -3 |
| VDP | 56 | n/a | 100 | 97* | -3* |

\* Snapshot mode scores are not perfectly comparable to navigation mode. Differences may reflect methodology rather than real regressions.

**Key observations:**
- Accessibility scores are stable or slightly improved across most pages
- The core pages (homepage, car-finance, FAQ, about) maintain perfect 100 accessibility
- `/used-cars` remains the weakest page for accessibility (87) -- unchanged from June
- Performance scores were not obtainable this month; recommend running a standalone Lighthouse CLI audit next month to restore performance tracking

---

## Recurring issues

Issues found across multiple pages, sorted by frequency:

| Issue | Frequency | Category | Impact | Details |
|-------|-----------|----------|--------|---------|
| Browser console errors | 9/12 pages | Best Practices | Medium | JavaScript errors logged on nearly every page. Likely from 3P scripts (VWO, N8N Chat, GTM). |
| Heading order not sequential | 5/12 pages | Accessibility | Medium | `<h>` tags skip levels (e.g. h2 -> h4). Found on: /used-cars, /stores, /blog, /contact, /models. |
| Touch target size insufficient | 4/12 pages | Accessibility | Medium | Interactive elements too small for mobile tap targets. Found on: /stores, /sell-car, /models, VDP. |
| Label-content name mismatch | 3/12 pages | Accessibility | Low | Visible text labels don't match accessible names. Found on: homepage, /faq, VDP. |
| Third-party cookies | 3/12 pages | Best Practices | Medium | 3P cookies detected (likely VWO, Trustpilot, YouTube embeds). Found on: /used-cars, /car-finance, /stores. |
| Chrome DevTools inspector issues | 3/12 pages | Best Practices | Low | Issues flagged in DevTools Issues panel. Found on: /used-cars, /car-finance, /stores. |
| Accessibility tree not well-formed | 3/12 pages | Agentic Browsing | Medium | Malformed a11y tree hurts screen readers and AI agents. Found on: /used-cars, /blog, blog post. |
| Non-descriptive link text | 2/12 pages | SEO/A11y | Medium | Generic link text like "Learn more" or "Click here". Found on: homepage, VDP. |
| Missing ARIA required children | 2/12 pages | Accessibility | High | ARIA roles missing required child roles. Found on: /used-cars, /blog. |
| Links without discernible name | 2/12 pages | Accessibility | High | Links with no text or aria-label. Found on: /used-cars, blog post. |
| Color contrast insufficient | 1/12 pages | Accessibility | Medium | Found on: blog post page. |
| Select without label | 1/12 pages | Accessibility | Medium | Found on: /used-cars (filter dropdowns). |
| CLS (Cumulative Layout Shift) | 1/12 pages | Performance | Low | Found on: homepage (61/100 score). |

---

## Recommendations

### Priority 1 — Fix across all pages
1. **Console errors:** Audit and resolve JS errors. Likely candidates: VWO snippet, N8N Chat initialisation, or GTM tag conflicts.
2. **Heading hierarchy:** Ensure all pages use sequential heading levels (h1 -> h2 -> h3). The /used-cars and /blog listing pages are the worst offenders.

### Priority 2 — Accessibility fixes
3. **Touch targets:** Increase tap target size to minimum 48x48px on mobile, especially for store listing links and filter controls.
4. **ARIA children:** Fix ARIA role hierarchies on /used-cars and /blog (likely related to CMS listing components).
5. **Link names:** Add descriptive text or aria-labels to icon-only links and generic "Learn more" links.

### Priority 3 — Best practices
6. **Third-party cookies:** Evaluate VWO, Trustpilot widget, and YouTube embed cookie behaviour. Consider facade/lazy-load patterns for YouTube embeds.
7. **Canonical link tags:** Add explicit `<link rel="canonical">` to all pages (currently relying on Schema.org only).

### Priority 4 — Performance tracking
8. **Restore performance monitoring:** Run Lighthouse CLI (`lighthouse --preset=perf`) or use PageSpeed Insights API for next month's audit to re-establish performance score baselines.
9. **CrUX LCP:** Homepage field LCP is 3,170 ms (p75). Target is under 2,500 ms. Investigate render delay (650 ms) and TTFB (2,247 ms) as primary optimisation areas.

---

## Third-party script inventory (unchanged from May 2026)

| Name | Source | Risk | Notes |
|------|--------|------|-------|
| Google Tag Manager | googletagmanager.com | Low | Core analytics container |
| GA4 (via GTM) | Via GTM | Low | G-6WQDNZH59K |
| VWO | dev.visualwebsiteoptimizer.com | Medium | Account 1130895. A/B testing; consent-gated. Causing Lighthouse navigation redirects. |
| N8N Chat | cdn.jsdelivr.net | Medium | AI chatbot. External webhook dependency. |
| JetBoost | cdn.jetboost.io | Low | Site search/filtering |
| Mapbox GL | Embedded | Low | Store locator maps |
| Google Maps | Embedded | Low | Store locations |
| GSAP | Via CDN | Low | Animation library (unpinned version) |
| Trustpilot widget | widget.trustpilot.com | Low | Review carousel; sets 3P cookies |

---

*Audit conducted via Chrome DevTools MCP Lighthouse (mobile emulation, navigation + snapshot modes). Performance category excluded by tool limitation.*
