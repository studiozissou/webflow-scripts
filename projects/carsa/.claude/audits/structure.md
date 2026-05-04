# Carsa.co.uk Technical Infrastructure & Analytics Audit
**Audit Date:** 2026-05-04
**Scope:** Homepage, /car-finance, /stores

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt | PASS | Present, permissive, references sitemap |
| sitemap.xml | PASS | 1,268 URLs, single file, well-structured |
| Custom 404 | PASS | Configured in Webflow |
| Favicon | FAIL | No explicit favicon reference in HTML |
| SSL/HTTPS | PASS | Enforced site-wide |
| Canonical Domain | PARTIAL | www.carsa.co.uk is canonical; redirect from naked domain unverified |
| GA4 | PASS | G-6WQDNZH59K present on all pages |
| GTM | PASS | GTM-MM5N6CP8 present on all pages |
| Cookie Consent | PASS | Functional consent UI with categories (Essentials, Marketing, Personalization, Analytics) |
| Consent Alignment | PASS | VWO and GA4 appear consent-gated |

---

## Detailed Findings

### robots.txt
- Location: `https://www.carsa.co.uk/robots.txt`
- Policy: Fully permissive (`Allow: /`)
- Sitemap reference: `https://www.carsa.co.uk/sitemap.xml`
- No crawlers blocked

### sitemap.xml
- 1,268 URLs in single file (not index)
- No `<lastmod>` or `<changefreq>` tags
- Content breakdown: ~13 main pages, 900+ model pages, 120+ blog articles, 15 store locations, 13 legal pages, 200+ individual vehicle listings
- Note: Vehicle count in sitemap (200+) is much lower than CMS items (4,639) — many vehicles may be unpublished or filtered

### Favicon
- No explicit `<link rel="icon">` found in HTML head
- Browsers will fall back to `/favicon.ico` request
- Recommendation: Add explicit favicon references

### Canonical Domain
- `www.carsa.co.uk` configured as primary
- `carsa.co.uk` also configured in Webflow
- Redirect from naked to www needs server-level verification

### Analytics & Consent
- GA4 and GTM load on all pages
- Consent UI offers: Reject All / Accept All with granular categories
- VWO (account 1130895) appears consent-gated
- Attribution tracking (UTM params, referrer) stored in localStorage/sessionStorage

---

## Third-Party Script Inventory

| Name | Source URL | Version | Risk | Notes |
|------|-----------|---------|------|-------|
| Google Tag Manager | googletagmanager.com/gtm.js | — | Low | Core analytics container |
| GA4 (via GTM) | Via GTM | — | Low | Industry standard |
| VWO | dev.visualwebsiteoptimizer.com | Account 1130895 | Medium | A/B testing; consent-gated |
| N8N Chat Bundle | cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js | Latest (unpinned) | Medium | AI chatbot "Caroline AI" |
| N8N Webhook | carsa.app.n8n.cloud/webhook/... | — | Medium | Chat backend; external dependency |
| JetBoost | cdn.jetboost.io/jetboost.js | Latest | Low | Site search/filtering |
| Mapbox GL | Embedded via styles | Latest | Low | Store locator maps |
| Google Maps API | Embedded | — | Low | Store locations |
| GSAP | Via CDN | Latest (unpinned) | Low | Animation library |
| GSAP Plugins | Via CDN | Latest (unpinned) | Low | ScrollTrigger, DrawSVG, EasePack |

---

## Risk Notes

- **N8N Chat:** External webhook dependency — should have fallback UX if unavailable
- **Unpinned CDN versions:** GSAP, N8N Chat, JetBoost all load `@latest` — risk of breaking changes
- **VWO:** Quarterly review of active experiments recommended
