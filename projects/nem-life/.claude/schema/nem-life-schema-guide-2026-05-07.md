# NEM Life -- Schema Placement Guide

**Date:** 2026-05-07
**Site:** nemlife.com (staging: nem-life-1.webflow.io)

---

## Overview

This guide covers all JSON-LD structured data for the NEM Life website. Schemas are grouped by placement location in Webflow and ordered by AEO priority.

---

## 1. Site-wide (Site Settings > Custom Code > Head Code)

**File:** `nem-life-sitewide-2026-05-07.json`

| Schema Type  | Purpose |
|-------------|---------|
| Organization | Brand identity, logo, contact, founder, social links |
| WebSite      | Site name, publisher reference for sitelinks |

**Action:** Paste the entire `<script>` block into **Site Settings > Custom Code > Head Code**. This loads on every page.

**FILL_IN items to complete:**
- `logo.url`, `logo.width`, `logo.height` -- upload logo to Webflow Assets, copy URL
- `foundingDate` -- year NEM Life was founded (e.g. "2020")
- `sameAs` array -- Instagram, LinkedIn, Facebook profile URLs
- `contactPoint.email` -- main contact email

---

## 2. Page-specific (Page Settings > Custom Code > Head Code)

### 2a. Homepage (/)

**File:** `nem-life-home-faq-2026-05-07.json`

| Schema Type | Purpose |
|------------|---------|
| WebPage    | Page metadata, connects to WebSite |
| FAQPage    | FAQ section -- highest AEO citation rate |

**Action:** Paste into **Homepage > Page Settings > Custom Code > Before </head> tag**.

**FILL_IN items:**
- `WebPage.name` -- SEO title (currently missing, needs setting)
- `WebPage.description` -- SEO meta description
- All FAQ Q&A pairs -- copy exact text from the FAQ accordion on the homepage

**AEO note:** FAQPage schema is the single highest-impact AEO fix for this page. The AEO audit scored Schema at 0/4 -- this alone addresses checks A1 and A2.

---

### 2b. NEM Methode (/nem-methode)

**Files:**
- `nem-life-nem-method-howto-2026-05-07.json`
- `nem-life-nem-method-faq-2026-05-07.json`

| Schema Type     | Purpose |
|----------------|---------|
| HowTo          | 3-pillar methodology (Neuro, Emotional, Mastery) |
| WebPage        | Page metadata with breadcrumb |
| FAQPage        | FAQ section on method page |

**Action:** Paste BOTH `<script>` blocks into **NEM Methode > Page Settings > Custom Code > Before </head> tag**.

**FILL_IN items:**
- HowTo step descriptions -- copy the description text for each of the 3 pillars
- `totalTime` -- if applicable (ISO 8601 duration, e.g. "P12W" for 12 weeks)
- All FAQ Q&A pairs from the method page
- Anchor links (#neuro, #emotional, #mastery) -- verify these exist or remove the `url` fields

**AEO note:** HowTo schema is the second-highest AEO priority. AI search engines quote step-by-step processes heavily. This addresses audit check A3.

---

### 2c. Our Mission (/missie-nem-life)

**File:** `nem-life-mission-2026-05-07.json`

| Schema Type | Purpose |
|------------|---------|
| AboutPage  | Signals this is the about/mission page, includes breadcrumb |

**Action:** Paste into **Missie NEM Life > Page Settings > Custom Code > Before </head> tag**.

**FILL_IN items:** None -- all data is complete.

---

### 2d. Christel Link-in-Bio (/link-in-bio/christel)

**File:** `nem-life-christel-person-2026-05-07.json`

| Schema Type | Purpose |
|------------|---------|
| Person     | Christel Reus identity, credentials, expertise |

**Action:** Paste into **Christel link-in-bio > Page Settings > Custom Code > Before </head> tag**.

**FILL_IN items:**
- `image` -- Christel's photo URL from Webflow Assets
- `sameAs` -- Christel's personal LinkedIn and Instagram

**AEO note:** Person schema addresses audit check A4 and strengthens author authority signals across the site via the `@id` reference.

---

### 2e. Terms & Conditions (/voorwaarden)

No special schema needed. The site-wide Organization + WebSite schema is sufficient.

---

### 2f. Blog Listing (/inzichten)

No special schema needed. The site-wide schema covers this. Consider adding a BreadcrumbList in future if the page grows.

---

### 2g. Testimonials Listing (/ervaringen)

No standard schema applies. If aggregate review data becomes available (average rating, count), consider adding `AggregateRating` to the Organization schema.

---

## 3. CMS Template Pages (Embed element in template)

### 3a. Blog Article Template (/inzichten/[slug])

**File:** `nem-life-blog-article-2026-05-07.json`

| Schema Type | Purpose |
|------------|---------|
| Article    | Blog post metadata, author, dates, category |

**Action:** Add an **Embed element** to the Blog Insights CMS template page. Paste the `<script>` block and replace `CMS_FIELD_*` placeholders with Webflow CMS field bindings.

**CMS field mapping:**

| Placeholder | Webflow CMS Field | Binding |
|------------|-------------------|---------|
| `CMS_FIELD_TITLE` | Name | Add dynamic field |
| `CMS_FIELD_SEO_META_DESCRIPTION` | SEO Meta Description | Add dynamic field |
| `CMS_FIELD_SLUG` | Slug | Add dynamic field |
| `CMS_FIELD_MAIN_IMAGE_URL` | Main Image | Add dynamic field (URL only) |
| `CMS_FIELD_DATE_PUBLISHED` | Date Published | Add dynamic field |
| `CMS_FIELD_DATE_MODIFIED` | Date Modified | Add dynamic field |
| `CMS_FIELD_CATEGORY` | Category | Add dynamic field (name) |

**Important Webflow notes:**
- In the Embed element, click the "+ Add Field" button to insert CMS fields
- Date fields will output in the format configured in the CMS -- ensure ISO 8601 (YYYY-MM-DD)
- If Date Modified is not set for an item, it will output empty -- consider defaulting to Date Published
- The Embed element must be placed inside the Collection Template wrapper

**AEO note:** Article schema with `author` and `datePublished` is critical for AI search citation. This is the primary fix for blog-level AEO.

---

### 3b. Testimonial Template (/ervaringen/[slug])

**File:** `nem-life-testimonial-review-2026-05-07.json`

| Schema Type  | Purpose |
|-------------|---------|
| CreativeWork | Wraps the testimonial as published content |
| Review       | Nested review with author attribution |

**Action:** Add an **Embed element** to the Ervaringen CMS template page. Replace `CMS_FIELD_*` placeholders with Webflow CMS field bindings.

**CMS field mapping:**

| Placeholder | Webflow CMS Field |
|------------|-------------------|
| `CMS_FIELD_ESSENCE_TITLE` | Essence Title |
| `CMS_FIELD_SHORT_DESCRIPTION` | Short Description |
| `CMS_FIELD_SLUG` | Slug |
| `CMS_FIELD_NAME` | Name |

---

## Validation Checklist

Before going live, validate each schema:

1. **Google Rich Results Test:** https://search.google.com/test/rich-results
   - Test each page URL after deploying schemas
   - All schemas should show "Valid" with no errors
   - Warnings are acceptable but errors must be fixed

2. **Schema.org Validator:** https://validator.schema.org/
   - Paste the JSON-LD directly to check syntax

3. **Required vs Recommended fields by type:**

| Type | Required | Recommended |
|------|----------|-------------|
| Organization | name, url | logo, description, sameAs, contactPoint |
| WebSite | name, url | publisher |
| FAQPage | mainEntity[].name, mainEntity[].acceptedAnswer.text | (none) |
| HowTo | name, step[].name, step[].text | description, totalTime, image |
| Article | headline, datePublished, author | image, dateModified, publisher, description |
| Person | name | jobTitle, description, image, sameAs |
| AboutPage | name, url | description, breadcrumb |
| CreativeWork | name | description, review |

---

## AEO Impact Summary

Based on the AEO audit (2026-04-23, score 5/20 D):

| Fix | Audit Checks | Estimated Score Impact |
|-----|-------------|----------------------|
| Site-wide Organization + WebSite | A1, A4 | +2 |
| Homepage FAQPage | A2 | +1 |
| NEM Method HowTo + FAQPage | A2, A3 | +2 |
| Blog Article schema | A1 | +1 |
| Person schema (Christel) | A4 | +1 |

**Total estimated schema impact: +7 points (from 5/20 to ~12/20)**

Combined with robots.txt fix and other Phase 1 items, the target is 13/20 (B grade).

---

## File Index

All files saved to:
`/Users/willmorley/webflow-scripts/projects/nem-life/.claude/schema/`

| File | Placement | Pages |
|------|-----------|-------|
| `nem-life-sitewide-2026-05-07.json` | Site Settings > Head Code | All |
| `nem-life-home-faq-2026-05-07.json` | Homepage > Page Settings > Head Code | / |
| `nem-life-nem-method-howto-2026-05-07.json` | NEM Methode > Page Settings > Head Code | /nem-methode |
| `nem-life-nem-method-faq-2026-05-07.json` | NEM Methode > Page Settings > Head Code | /nem-methode |
| `nem-life-mission-2026-05-07.json` | Missie > Page Settings > Head Code | /missie-nem-life |
| `nem-life-christel-person-2026-05-07.json` | Christel > Page Settings > Head Code | /link-in-bio/christel |
| `nem-life-blog-article-2026-05-07.json` | CMS Embed element | /inzichten/[slug] |
| `nem-life-testimonial-review-2026-05-07.json` | CMS Embed element | /ervaringen/[slug] |
| `nem-life-schema-guide-2026-05-07.md` | Reference doc | -- |
