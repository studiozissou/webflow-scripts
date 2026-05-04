# Site Intake Report — Coconut

**Date:** 2 April 2026
**Live URL:** https://www.getcoconut.com
**Staging URL:** https://getcoconut.webflow.io
**Platform:** Webflow (since April 2021)
**Engagement:** Retainer — updates & maintenance

---

## Summary

Coconut is a well-established Webflow site (151 pages, 19 CMS collections) serving as a lead generation platform for their accounting software. The site is content-rich with a blog, knowledge hub, FAQs, and multiple MTD-focused landing pages.

Overall the site is in good shape technically, with analytics, schema markup, and a sitemap all properly configured. The key areas for improvement are accessibility (alt text), SEO housekeeping (duplicate pages, missing meta), and consent compliance.

---

## Passing

| Check | Detail |
|-------|--------|
| SSL/HTTPS | Site fully served over HTTPS |
| Sitemap | 382 URLs, valid XML, referenced in robots.txt |
| Custom 404 | Custom error page configured |
| Analytics | GTM (GTM-WLRSZ9N), GA4, Facebook Pixel (664589987931207), OptinMonster |
| Meta titles | Present and unique across all key pages |
| Schema.org | SoftwareApplication JSON-LD on homepage with pricing tiers |
| Forms | Email signup on /sign-up and /mtd-software with inline confirmation + Zapier integration |
| Viewport | Mobile viewport meta tag present |
| H1 tags | Single H1 on homepage, pricing, features, and MTD pages |

---

## Needs Attention

### SEO

| Issue | Page(s) | Recommendation |
|-------|---------|----------------|
| 2 H1 tags | /about | Demote one heading to H2. "About Coconut." should remain H1. |
| Missing meta description | /about | Add a meta description in Webflow page settings |
| Duplicate sole trader pages | /sole-traders, /mtd-for-sole-traders, /mtd-software/sole-traders | Consolidate to one canonical page; redirect or noindex the others |
| OG tags not confirmed | All pages | Verify OG image is set in Webflow page settings (may be injected server-side) |
| No llms.txt | Site root | Create an llms.txt file for LLM discoverability |
| robots.txt duplicate line | robots.txt | Remove the duplicate `Sitemap:` reference |

### Accessibility

| Issue | Page(s) | Recommendation |
|-------|---------|----------------|
| Images missing alt text | /about (6+), /sign-up (multiple) | Add descriptive alt text to all images — particularly QR codes, app store badges, and stock photos |

### Compliance

| Issue | Detail | Recommendation |
|-------|--------|----------------|
| Custom cookie consent | Hand-built banner (#cw-cookie_banner), not a recognised CMP | Audit against GDPR/PECR requirements; consider migrating to a certified CMP (Cookiebot, OneTrust) |
| Facebook Pixel consent timing | Pixel appears to initialise before consent is granted | Wrap FB Pixel init in consent gate, or move to server-side GTM |

### Infrastructure

| Issue | Detail | Recommendation |
|-------|--------|----------------|
| 4 custom domains | www.getcoconut.com, getcoconut.com, www.getcoconut.co.uk, getcoconut.co.uk | Verify all redirect to www.getcoconut.com with 301s |
| Favicon | Not detected in HTML source | Check Webflow project settings; may need to be re-uploaded |

---

## Missing or Broken

| Check | Status |
|-------|--------|
| llms.txt | Not present at site root |
| Meta description on /about | Not set |

---

## Recommended Next Steps

1. **Quick wins (this week)**
   - Fix /about page: remove second H1, add meta description
   - Add alt text to images on /about and /sign-up
   - Remove duplicate sitemap line from robots.txt
   - Verify favicon is set in Webflow project settings

2. **SEO housekeeping (next sprint)**
   - Audit and consolidate the 3 duplicate sole trader pages
   - Verify OG images are configured on all key pages
   - Create llms.txt for LLM discoverability
   - Verify 301 redirects across all 4 custom domains

3. **Compliance review (priority)**
   - Audit custom cookie consent banner against GDPR/PECR
   - Ensure Facebook Pixel does not fire before consent
   - Consider migrating to a certified CMP

4. **Content maintenance**
   - Review and clean up archive/draft pages (35 drafts, 18 archive pages)
   - Verify all disallowed pages in robots.txt are intentionally blocked

---

## Custom Code Inventory

### Site-wide scripts
| Script | Location | ID/Details |
|--------|----------|------------|
| Google Tag Manager | Head | GTM-WLRSZ9N |
| GA4 (via GTM/gtag) | Head | Consent mode configured |
| Facebook Pixel | Head | 664589987931207 |
| OptinMonster (Omni API) | Body | Account 165435 |
| Google Fonts | Head | Inconsolata 400,700 / Work Sans 300-700 |
| Custom cookie consent | Body | #cw-cookie_banner |
| UTM/AppsFlyer mapper | Body | Maps UTM params to attribution |
| Conversion cookie handler | Body | 730-day expiry |

### Page-specific scripts
| Page | Scripts |
|------|---------|
| /mtd-software | Email form handler, Zapier webhook, attribution encoding (base64) |
| /sign-up | Email form handler, Zapier webhook |
| /features | Slick carousel initialisation |

---

## CMS Collections (19)

| Collection | Purpose |
|-----------|---------|
| Blog Posts | Main blog content |
| Blog Categories | Blog taxonomy |
| Knowledge Hub Articles | Educational content |
| FAQs | Frequently asked questions |
| 25 New Features | Current feature showcase |
| Feature Highlights | Feature callouts |
| Reviews | Customer testimonials |
| Landing Pages | CMS-driven landing pages |
| Integrations | Third-party integrations |
| Tools | Accounting tools |
| Jobs | Career listings |
| Authors | Blog/content authors |
| Tags | Content tagging |
| Categories | Content categorisation |
| Chapters | Guide chapters |
| Webinars and events | Events listing |
| Speaker for Webinars and events | Event speakers |
| Blog Banner Ads | In-blog advertising |
| 2025 Archive Features | Archived feature list |
