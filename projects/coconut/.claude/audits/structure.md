# Coconut Site Audit — Stream A: Technical + Analytics

**Date:** 2026-05-06
**Site:** https://www.getcoconut.com

---

## Passing

| Check | Status | Details |
|-------|--------|---------|
| robots.txt | PASS | Present, properly configured. Standard directives allowing crawlers with specific disallows for migration pages. References sitemap.xml correctly. |
| sitemap.xml | PASS | Present with valid XML. 392 URLs across all site sections. Properly formatted. |
| Custom 404 | PASS | Custom 404 page exists with branded coconut imagery and navigation back to site. |
| Favicon | PASS | Two favicon formats: shortcut icon (32px PNG) and apple-touch-icon (branded blue square). |
| SSL/HTTPS | PASS | Site served over HTTPS. No mixed content warnings. All resources loaded via HTTPS. |
| Canonical tag | PASS | Canonical URL present and correctly implemented. |
| Cookie consent | PASS | Cookie consent banner present with "Accept All" and "I want to choose" buttons. Granular controls for Functionality, Analytics Storage, Ad Storage, Ad User Data, Ad Personalisation, Personalization Storage, Security Storage. |
| Analytics | PASS | Comprehensive analytics: GTM (GTM-WLRSZ9N), GA4 (G-YBH18GJQZH), Google Ads (AW-856751664), TikTok Pixel, Facebook Pixel (dual config), Hotjar, Zoho PageSense, Intercom. |

---

## Needs Attention

| Check | Severity | Details | Recommendation |
|-------|----------|---------|----------------|
| Analytics consent alignment | HIGH | Analytics scripts load immediately without explicit consent verification. GTM and analytics tags fire before user consent selection. May violate GDPR/PECR. | Implement Google Consent Mode v2 to defer analytics firing until consent granted. |
| Dual Facebook Pixels | MEDIUM | Two Facebook Pixel IDs configured (233127443764795 and 664589987931207). May be redundant. | Confirm both serve distinct purposes; remove if redundant. |
| Best Practices score | MEDIUM | Lighthouse Best Practices: 54/100. Issues: older jQuery (3.5.1), deprecated APIs, third-party script issues. | Modernise JS — replace jQuery 3.5.1 or remove dependencies. |
| Console warnings | LOW | One deprecated feature warning in browser console. | Audit and fix deprecated API usage. |

---

## Missing or Broken

| Check | Status |
|-------|--------|
| None identified | All critical infrastructure present and functional. |

---

## Lighthouse Audit (Homepage)

| Metric | Score |
|--------|-------|
| SEO | 92/100 |
| Accessibility | 86/100 |
| Best Practices | 54/100 |
| Duration | 10.23s |
| Tests | 47 passed, 13 failed |

---

## Analytics Stack

| Service | Type | ID/Details |
|---------|------|------------|
| Google Tag Manager | Tag management | GTM-WLRSZ9N |
| GA4 | Analytics | G-YBH18GJQZH |
| Google Ads | Conversion tracking | AW-856751664 |
| TikTok Pixel | Ad tracking | Present |
| Facebook Pixel | Ad tracking | 233127443764795, 664589987931207 |
| Hotjar | Session recording | Present |
| Zoho PageSense | Analytics | Present |
| Intercom | Customer support | Present |

**Network requests:** 147 total (all HTTPS)

---

## Recommendations

1. Implement Consent Mode v2 — defer analytics until consent granted
2. Modernise JavaScript — replace jQuery 3.5.1
3. Resolve console warnings — deprecated API usage
4. Improve Best Practices score — review third-party scripts
5. Audit Facebook Pixels — confirm both IDs serve distinct purposes
6. Review Hotjar — ensure session recording aligns with privacy policy
