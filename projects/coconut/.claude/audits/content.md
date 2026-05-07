# Coconut Content & Code Inventory — Stream C

**Date:** 2026-05-06
**Site:** https://www.getcoconut.com

---

## 1. Alt Text Audit

| Page | Total Images | Missing Alt | % Missing | Status |
|------|-------------|-------------|-----------|--------|
| `/` (homepage) | 122 | 81 | 66.4% | CRITICAL |
| `/features` | 22 | 17 | 77.3% | CRITICAL |
| `/about` | 29 | 7 | 24.1% | MODERATE |
| `/sign-up` | 19 | 2 | 10.5% | GOOD |

**Site-wide estimate:** ~60-70% of images missing alt text. Primarily product screenshots, feature icons, hero images, and decorative graphics. Logos and badges tend to have alt text.

---

## 2. Forms

| Page | Forms Found | Details |
|------|------------|---------|
| `/sign-up` | 3 | Two `email-form` (GET) + cookie consent form. No external platform detected. No confirmation/success page configured. |
| `/mtd-software` | 1 | Cookie consent form only — no signup/contact form on this page. |

**Note:** Forms redirect to /sign-up with no visible success state. Zapier webhook integration mentioned in previous intake but not detected in DOM — may be injected via GTM.

---

## 3. Viewport

**Status:** PASS — `width=device-width, initial-scale=1` present on all pages.

---

## 4. CMS Hygiene

### Taxonomy collections with unnecessary template pages

| Collection | Template Page | Recommendation |
|-----------|---------------|----------------|
| Blog Banner Ads | `/blog-banner-ads` | Template page unnecessary — content only used as referenced embeds in blog posts |
| Speaker for Webinars and events | `/speaker-for-webinars-and-events` | Taxonomy collection — template page generates individual speaker pages that add no value |

### Dev/test pages (all drafts)

| Page | Title | Recommendation |
|------|-------|----------------|
| `/gosimpletax-mp-test` | GoSimpleTax MP test | Delete — test page |
| `/mtd-software-copy-1` | Copy of Are you ready for MTD? 1 | Delete — iteration copy |
| `/mtd-software-copy-2` | Copy of Are you ready for MTD? 2 | Delete — iteration copy |
| `/mtd-software-copy-3` | Copy of Are you ready for MTD? 3 | Delete — iteration copy |
| `/mtd-software-old` | HMRC-Old | Delete — superseded |
| `/static-template-slug-1746543101443` | Coconut - Gov.uk | Delete — auto-generated slug |
| `/home---embrace` | Home - Embrace | Delete — design iteration |
| `/mtd-software/mtd-lp-template` | MTD LP TEMPLATE | Delete or archive — template |

### Published archive pages

| Page | Status | Recommendation |
|------|--------|----------------|
| `/archive-2025/accountant-software` | Published | Verify noindex or unpublish — superseded by `/accountant-software` |
| `/archive-2025/features` | Published | Verify noindex or unpublish — superseded by `/features` |
| `/archive-2025/knowledge-hub` | Published | Verify noindex or unpublish |
| `/archive-2025/pricing` | Published | Verify noindex or unpublish — superseded by `/pricing` |
| `/archive-2025/2025-archive-features` | Published | CMS template — unpublish |
| `/archive-2025/get-your-practice-ready-for-mtd-itsa` | Published | Review — may have inbound links |
| `/archive/for-accountants-v1` | Published | Unpublish — superseded |

**Style guide pages:** 44 draft pages under `/style-guide/`. All correctly set to draft. No action needed.

---

## 5. Custom Code Inventory

### Analytics & Tracking

| Script | Source | Version | Risk | Notes |
|--------|--------|---------|------|-------|
| Google Tag Manager | googletagmanager.com | GTM-WLRSZ9N | Low | Tag management container |
| GA4 | googletagmanager.com/gtag | G-YBH18GJQZH | Low | Via GTM |
| Google Ads | googletagmanager.com/gtag | AW-856751664 | Low | Conversion tracking |
| TikTok Pixel | analytics.tiktok.com | Hash-versioned | Medium | Multiple files loaded |
| Facebook Pixel | connect.facebook.net | fbevents.js | Medium | Two pixel IDs: 233127443764795, 664589987931207 |
| Hotjar | static.hotjar.com | ID 429202, sv=7 | Medium | Session recording |
| Zoho PageSense | static.zohocdn.com/pagesense | Hash-versioned | Medium | Heatmaps + session recording |
| Zoho PageSense (GoSimpleTax) | cdn.pagesense.io/js/gosimpletax | Hash-versioned | Medium | Visitor counting — appears to be from GoSimpleTax domain |

### Customer Support

| Script | Source | Version | Risk | Notes |
|--------|--------|---------|------|-------|
| Intercom | widget.intercom.io | d37qo6ee | Medium | Customer messaging widget |
| OmappAPI | a.omappapi.com | api.min.js | Medium | OptinMonster — popup/lead capture |

### UI Libraries

| Script | Source | Version | Risk | Notes |
|--------|--------|---------|------|-------|
| jQuery | d3e54v103j8qbb.cloudfront.net | 3.5.1 | Low | Webflow default — outdated |
| Slick Carousel | cdn.jsdelivr.net/npm/slick-carousel | 1.8.1 | Low | Pinned version |
| Webfont Loader | ajax.googleapis.com | 1.6.26 | Low | Pinned version |
| Google Fonts | fonts.googleapis.com | Inconsolata, Work Sans | Low | |
| Trustpilot Widget | widget.trustpilot.com | v5 | Low | Review widget |

### Platform

| Script | Source | Version | Risk | Notes |
|--------|--------|---------|------|-------|
| Webflow core | cdn.prod.website-files.com | Multiple bundles | Low | Platform scripts |

### Custom/First-party

| Script | Location | Risk | Notes |
|--------|----------|------|-------|
| Cookie consent handler | Inline | Low | Custom agency code for granular consent |
| thetimes-utm.js | /thetimes page, before `</body>` | Low | UTM tagging for Times referral campaign |
| times-cookie-overwrite.js | /thetimes page, before `</body>` | Low | _X_ attribution cookie, 730-day expiry |
| Hamburger menu | Inline | Low | Menu interaction |
| Price table expansion | Inline | Low | Pricing page accordion |
| Dynamic year footer | Inline | Low | Auto-updates copyright year |
| Query parameter handler | Inline | Low | UTM/attribution mapping |

### Script totals

- **External scripts:** 23
- **Low risk:** 10 (Google suite, jQuery, Webfont, Webflow, CDNs)
- **Medium risk:** 12 (TikTok, Facebook, Hotjar, Intercom, PageSense, Zoho, OmappAPI)
- **High risk:** 1 (Zoho Session Recording — can capture user input)
- **Critical risk:** 0 (no GitHub-hosted third-party code)

---

## 6. Code Migration Assessment

**Code migration to client-owned GitHub: NOT REQUIRED**

No critical GitHub-hosted scripts detected. All third-party code loads from vendor CDNs with pinned versions. However:

- **Privacy review recommended:** Hotjar + Zoho PageSense both do session recording — review against privacy policy and consent implementation
- **GoSimpleTax PageSense:** A Zoho PageSense script loads from `cdn.pagesense.io/js/gosimpletax/` — this appears to be GoSimpleTax's tracking ID, not Coconut's. May be a leftover from a partnership or test. Investigate and remove if not needed.
- **Dual Facebook Pixels:** Confirm both pixel IDs serve distinct purposes (one may be legacy)

---

## 7. Recommendations

### Critical
1. Fix alt text site-wide — 60-70% of images missing descriptive alt text (WCAG A violation)
2. Investigate GoSimpleTax PageSense script on Coconut's site

### High
1. Clean up 8 dev/test draft pages
2. Unpublish or noindex 7 archive pages
3. Review Hotjar + Zoho session recording against privacy policy

### Medium
1. Remove unnecessary CMS template pages (Blog Banner Ads, Speaker)
2. Confirm both Facebook Pixel IDs are needed
3. Verify form success states on /sign-up

### Low
1. jQuery 3.5.1 is outdated (Webflow default — low urgency)
2. Document OmappAPI (OptinMonster) integration purpose
