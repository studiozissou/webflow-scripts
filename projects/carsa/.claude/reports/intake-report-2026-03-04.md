# Site Intake Report — Carsa

**Date:** 2026-03-04
**Live URL:** https://www.carsa.co.uk
**Staging URL:** https://carsa-v2.webflow.io

---

## Summary

Carsa is a used car sales company with 10+ UK stores, built on Webflow with no migration history. The site is large (64 pages, 17 CMS collections, ~1,900 sitemap URLs) and serves as a lead generation platform for enquiries, test drives, and finance applications.

The site has solid foundations — SSL, robots.txt, sitemap, GA4/GTM, and a custom 404 are all in place. However, there are significant SEO and accessibility gaps that represent quick wins for search visibility and compliance.

**Key stats:**
- 28 published pages + 17 CMS templates + 19 drafts
- 17 CMS collections (Vehicles, Makes, Models, Locations, Blogs, FAQs, etc.)
- No ecommerce or localization configured
- Third-party integrations: GA4, GTM, VWO, n8n chat

---

## Passing

- **robots.txt** — Present, allows all crawlers, references sitemap
- **sitemap.xml** — Valid, ~1,900+ URLs indexed
- **SSL** — Site served over HTTPS
- **Custom 404** — Configured in Webflow
- **Analytics** — GA4 (`G-6WQDNZH59K`) and GTM (`GTM-MM5N6CP8`) active
- **llms.txt** — Present at root with company info and regulatory details
- **Canonical domain** — Both `carsa.co.uk` and `www.carsa.co.uk` configured
- **Viewport meta** — Present (Webflow default)

---

## Needs Attention

### SEO — Meta descriptions not rendering
Meta descriptions are set in Webflow Page Settings but were **not found in the live HTML** on any of the 8 key pages audited. This means Google is auto-generating snippets from body copy. Needs investigation — possible Webflow rendering issue or override.

### SEO — H1 tag inflation (critical)
Most pages use multiple `<h1>` tags (homepage: 14+, finance: ~21, about: 8). This is almost certainly caused by Webflow Designer heading elements set to H1 for visual sizing rather than semantic hierarchy. Should be H2/H3 with CSS classes for visual treatment.

| Page | H1 Count | Should Be |
|------|----------|-----------|
| Home | 14+ | 1 |
| Used Cars | 9 | 1 |
| Car Finance | ~21 | 1 |
| About | 8 | 1 |
| Blog | 3 | 1 |
| FAQ | 3 | 1 |
| Stores | 1 | 1 |
| Contact | 1 | 1 |

### Analytics — Cookie consent unclear
VWO is present but no explicit cookie consent banner was detected. GA4/GTM may be firing before consent. Needs review for GDPR/PECR compliance, especially given UK consumer audience.

### Accessibility — Form inputs lack labels
All form inputs (VRM lookup, search filters, Make/Model dropdowns) rely on placeholder text only. No associated `<label>` elements. This is a WCAG 2.1 Level A failure.

### Accessibility — Multiple `<nav>` elements without `aria-label`
Screen reader users cannot distinguish between primary navigation and footer navigation.

### Accessibility — Social media icon links unlabelled
Footer social links (Facebook, Instagram, LinkedIn) are icon-only with no `aria-label`.

---

## Missing or Broken

### SEO — No Open Graph tags on any page
No `og:title`, `og:description`, `og:image`, or `og:url` on any page. Social shares on Facebook, LinkedIn, and X/Twitter will render as plain links with no controlled preview.

### SEO — No canonical tags on any page
No `<link rel="canonical">` found on any of the 8 pages checked. This is a duplicate content risk — particularly for `/used-cars` which uses query-string filters (`?fuel=electric`, `?bodyType=suv`, etc.) creating potentially infinite URL variants.

### SEO — No JSON-LD structured data
No static JSON-LD schema on any page. Two pages (`/car-finance`, `/faq`) have JS-injected `FAQPage` schema, but JS-rendered schema is not guaranteed to be crawled by Google.

**High-value schema opportunities:**
- Homepage: `Organization` + `WebSite` (with `SearchAction`)
- Stores: `AutoDealer` / `LocalBusiness` per location (10 stores — high local SEO value)
- FAQ: Static `FAQPage`
- Blog: `Article` on post pages

### SEO — Missing `<title>` on /blog and /contact
These two pages have no `<title>` tag at all. Google will display the raw URL as the clickable text in search results.

### Accessibility — 30+ images missing alt text
All images across the site have the `alt` **attribute absent entirely** (not empty `alt=""`). This includes the logo, all car images, category browse images, Autotrader badges, and blog thumbnails. WCAG 2.1 Level A failure (SC 1.1.1).

### Accessibility — No skip-to-content link
No skip navigation link on any page. Keyboard users must tab through the full nav on every page load. WCAG 2.1 Level A failure (SC 2.4.1).

### Accessibility — No `<main>` landmark
No `<main>` element or `role="main"` found. Screen reader users cannot jump to main content via landmark navigation.

### Accessibility — Logo link has no accessible name
The site logo `<img>` inside a link has no `alt` text, making the link unnamed for screen readers.

### Accessibility — Contact page has no heading hierarchy
The contact page has zero `<h1>`, `<h2>`, or `<h3>` elements. All text appears to be styled `<p>` or `<div>` elements.

---

## Recommended Next Steps

### Priority 1 — Quick wins (Webflow Designer, no code)
1. Add meta descriptions to all pages via Page Settings > SEO tab
2. Add `<title>` tags to `/blog` and `/contact`
3. Add OG title + image via Page Settings > Open Graph tab on all key pages
4. Add alt text to all images (Image element > Alt text field)
5. Fix H1 inflation — change section headings from H1 to H2 in the Designer

### Priority 2 — Custom code additions
6. Add skip-to-content link via Site Settings > Head Code
7. Add visually-hidden `<label>` elements to all form inputs
8. Add `aria-label` to all `<nav>` elements and icon-only links
9. Add `Organization` + `WebSite` JSON-LD to homepage head code
10. Add `AutoDealer` JSON-LD to `/stores` and individual store pages

### Priority 3 — Compliance review
11. Implement cookie consent mechanism (e.g., Cookiebot, Termly, or Finsweet Cookie Consent)
12. Configure GTM consent mode to hold analytics until consent is granted
13. Verify VWO is consent-gated
14. Convert JS-injected FAQPage schema to static head code on `/car-finance` and `/faq`

### Priority 4 — Architecture
15. Add `<main>` landmark to page content wrapper
16. Implement canonical tag strategy (verify Webflow auto-canonical is rendering; add manual if not)
17. Define canonical strategy for `/used-cars` filter URLs
18. Consider splitting sitemap into sub-sitemaps (vehicles, blog, stores) for better crawl management at ~1,900 URLs

---

## Custom Code Inventory

### Site-wide
| Type | Detail |
|------|--------|
| Analytics | GA4 (`G-6WQDNZH59K`), GTM (`GTM-MM5N6CP8`) |
| A/B Testing | VWO (account `1130895`) |
| Chat | n8n Chat widget (`carsa.app.n8n.cloud` webhook + `@n8n/chat` CDN bundle) |

### Inline scripts (site-wide head/body)
- UTM/attribution tracking (referrer, UTM params to sessionStorage)
- Form handling and valuation URL generation
- GSAP draw-line / draw-shape animations
- Chat initialization
- Dynamic Make/Model dropdown filtering
- Equal height card utility
- Event listeners for form submissions

### Per-page custom code
Not retrievable via API — added directly in Webflow Designer head/body embeds. Manual audit recommended.
