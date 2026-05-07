# Coconut SEO & Schema Audit — Stream B

**Audit date:** 2026-05-06
**Site:** https://www.getcoconut.com
**Note:** Chrome DevTools was unavailable during this session (browser contention). Meta tag data gathered via WebFetch content analysis + schema extraction. OG tags, canonical URLs, and exact title lengths need a DevTools follow-up pass.

---

## 1. Meta & OG Audit Table

| Page | Title | Title Len | Meta Description | Desc Len | OG Tags | Canonical | Schema Types Present |
|------|-------|-----------|-----------------|----------|---------|-----------|---------------------|
| `/` (homepage) | Self employed accounting software \| !Coconut | ~48 | Present (from schema) | ~140 est. | NEEDS VERIFY | NEEDS VERIFY | SoftwareApplication |
| `/pricing` | Sole trader accounting app \| Pricing \| !Coconut | ~49 | Present | ~100 est. | NEEDS VERIFY | NEEDS VERIFY | WebPage, BreadcrumbList, Product (6 Offers), SoftwareApplication |
| `/features` | Feature overview | ~16 | Present (typo: "simple our intuitive") | ~90 est. | NEEDS VERIFY | NEEDS VERIFY | WebPage, BreadcrumbList, SoftwareApplication, Organization, FAQPage |
| `/about` | About | ~5 | **MISSING** | -- | NEEDS VERIFY | NEEDS VERIFY | **NONE** |
| `/mtd-software` | MTD for Income tax software \| !Coconut | ~41 | Present | ~100 est. | NEEDS VERIFY | NEEDS VERIFY | WebPage, BreadcrumbList, SoftwareApplication, FAQPage |
| `/accountant-software` | Best self employed accounting software \| Coconut | ~50 | Present | ~100 est. | NEEDS VERIFY | NEEDS VERIFY | WebPage, SoftwareApplication, Review (x2), FAQPage |
| `/jobs` | Careers at Coconut | ~20 | Not confirmed | -- | NEEDS VERIFY | NEEDS VERIFY | **NONE** |
| `/sign-up` | Sign up | ~7 | Not confirmed | -- | NEEDS VERIFY | NEEDS VERIFY | **NONE** |
| Knowledge hub articles | Varies | Varies | Not confirmed | -- | NEEDS VERIFY | NEEDS VERIFY | BlogPosting |

---

## 2. Schema Audit — Detailed Per Page

### 2.1 Homepage (`/`)

**Existing schemas:**
- **SoftwareApplication** — name: "!Coconut", applicationCategory: "BusinessApplication", operatingSystem: "iOS, Android, Web", offers: 4 pricing tiers (Essentials, +MTD, +Self Assessment, Full), featureList: 14 features

**Missing schemas:**
- **Organization** — CRITICAL. Homepage is the canonical place for Organization schema.
- **WebSite** with SearchAction — fundamental site-level schema
- **WebPage** — basic page-level schema
- **FAQPage** — homepage has a "Common questions" section with expandable Q&As that are not marked up

---

### 2.2 Pricing (`/pricing`)

**Existing schemas:**
- **WebPage** — name, description, url
- **BreadcrumbList** — Home > Pricing
- **Product** — name: "!Coconut Accounting App", brand: Organization, 6 Offer objects (annual + monthly variants)
- **SoftwareApplication** — with AggregateOffer (GBP 99.99-159.99)

**Missing:** FAQPage (page has 4 visible Q&As)

---

### 2.3 Features (`/features`)

**Existing schemas:**
- **WebPage**, **BreadcrumbList**, **SoftwareApplication** (free trial offer, 8 features)
- **Organization** — name: "Coconut", description referencing FCA authorisation
- **FAQPage** — 5 Q&A pairs

**Assessment:** Best-instrumented page on the site. Organization schema here is minimal — should be expanded and moved site-wide.

---

### 2.4 About (`/about`)

**Existing schemas:** **NONE**

**Missing:** Organization (essential), AboutPage, BreadcrumbList

**Assessment:** CRITICAL gap. Zero structured data on the page where Google expects Organization information.

---

### 2.5 MTD Software (`/mtd-software`)

**Existing schemas:**
- **WebPage**, **BreadcrumbList**, **SoftwareApplication** (4 pricing tiers)
- **FAQPage** — 21 Q&A pairs

**Assessment:** Strong. 21-question FAQPage is valuable for rich results and AEO.

---

### 2.6 Accountant Software (`/accountant-software`)

**Existing schemas:**
- **WebPage**, **SoftwareApplication** (free trial, 10 features, aggregateRating 4.5/5)
- **Review** — 2 individual reviews (Ele Stevens, Nancy Brown)
- **FAQPage** — 13 Q&A pairs

**Missing:** BreadcrumbList (present on similar pages but missing here)

---

### 2.7 Jobs (`/jobs`)

**Existing schemas:** **NONE**

**Missing:** WebPage, BreadcrumbList, JobPosting (when vacancies exist)

---

### 2.8 Sign-up (`/sign-up`)

**Existing schemas:** **NONE**
**Missing:** WebPage (low priority)

---

### 2.9 Knowledge Hub Articles

**Existing:** BlogPosting — headline, author ("The Coconut Team"), datePublished, dateModified, keywords

**Missing:**
- `publisher` field (should reference Organization)
- `author` should be Person or Organization object, not a plain string
- BreadcrumbList

---

## 3. Schema Gap Summary — Prioritised

### CRITICAL

| # | Gap | Pages Affected | Impact |
|---|-----|---------------|--------|
| 1 | **No Organization schema on homepage** | `/` | Google cannot confirm entity identity; affects Knowledge Panel, brand SERP, AI citations |
| 2 | **No Organization schema site-wide** | Only `/features` has a minimal one | Should be on every page via Webflow Head Code |
| 3 | **/about has zero structured data** | `/about` | Most natural page for Organization + AboutPage has nothing |
| 4 | **No WebSite schema anywhere** | All pages | Missing SearchAction potential; affects sitelinks |
| 5 | ~~/about has 2 H1 tags~~ | `/about` | CORRECTED: DevTools verified 1 H1. WebFetch false positive. |
| 6 | ~~/about missing meta description~~ | `/about` | CORRECTED: DevTools verified present (127 chars). WebFetch false negative. |

### WARNING

| # | Gap | Pages Affected | Impact |
|---|-----|---------------|--------|
| 7 | **Homepage FAQ not marked up** | `/` | Visible FAQ section has no FAQPage schema |
| 8 | **Pricing FAQ not marked up** | `/pricing` | Visible FAQ section has no FAQPage schema |
| 9 | **BlogPosting missing publisher** | Knowledge hub articles | Required for valid Article rich results |
| 10 | **BlogPosting author is a string** | Knowledge hub articles | Should be Person or Organization object |
| 11 | **BreadcrumbList inconsistent** | `/accountant-software`, articles | Some pages have it, some don't |
| 12 | **3 duplicate sole trader pages** | `/sole-traders`, `/mtd-for-sole-traders`, `/mtd-software/sole-traders` | Cannibalisation risk |
| 13 | **Duplicate sitemap line in robots.txt** | robots.txt | `Sitemap:` appears twice |

### SUGGESTION

| # | Gap | Pages Affected | Impact |
|---|-----|---------------|--------|
| 14 | No AggregateRating on homepage SoftwareApplication | `/` | `/accountant-software` has 4.5/5 but homepage doesn't |
| 15 | Sitemap includes internal tool pages | `/tools/upgrade-plan`, `/tools/your-plan`, `/tools/hold-your-horses` | Should be noindex or excluded |
| 16 | Sitemap includes `-old` page | `/knowledge-hub/sign-up-for-making-tax-digital-old` | Stale content |
| 17 | `/search` in sitemap | `/search` | Should be noindexed |
| 18 | No `llms.txt` file | Root | 404; missing AI-search opportunity |
| 19 | ~~/pricing has 6 H1 tags~~ | `/pricing` | CORRECTED: DevTools verified 1 H1. WebFetch false positive. Note: H1 has typo "Digial". |
| 20 | /jobs has 2 H1 tags (not 4) | `/jobs` | DevTools verified 2 H1s. "Current vacancies" should be H2. |
| 21 | ~~/sign-up has 2 H1 tags~~ | `/sign-up` | CORRECTED: DevTools verified 1 H1. WebFetch false positive. |
| 22 | Meta description typo on /features | `/features` | "...with simple our intuitive..." should be "our simple, intuitive" |

---

## 4. Organization Schema Recommendation

### Site-wide Organization + WebSite (Webflow Project Settings > Custom Code > Head Code)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.getcoconut.com/#organization",
  "name": "Coconut",
  "alternateName": "!Coconut",
  "legalName": "Coconut Platform Ltd",
  "url": "https://www.getcoconut.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.getcoconut.com/images/coconut-logo.png",
    "width": 512,
    "height": 512
  },
  "description": "Coconut is a bookkeeping and tax app for self-employed people, sole traders, and landlords. FCA authorised, HMRC recognised, and MTD ready.",
  "foundingDate": "2017",
  "numberOfEmployees": {
    "@type": "QuantitativeValue",
    "value": "20-50"
  },
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "GB"
  },
  "sameAs": [
    "https://www.facebook.com/getcoconut",
    "https://twitter.com/getcoconut",
    "https://www.linkedin.com/company/getcoconut",
    "https://www.instagram.com/getcoconut",
    "https://www.youtube.com/@getcoconut"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "availableLanguage": "English",
    "url": "https://www.getcoconut.com/contact"
  },
  "areaServed": {
    "@type": "Country",
    "name": "United Kingdom"
  },
  "knowsAbout": [
    "Self-employed accounting",
    "Making Tax Digital",
    "Self Assessment tax returns",
    "Bookkeeping for sole traders",
    "Landlord accounting",
    "HMRC compliance",
    "Expense tracking",
    "Digital invoicing"
  ],
  "slogan": "Tax is changing. Stay ahead with Coconut.",
  "brand": {
    "@type": "Brand",
    "name": "Coconut",
    "logo": "https://www.getcoconut.com/images/coconut-logo.png"
  },
  "taxID": "09904418",
  "isicV4": "6201",
  "naics": "511210"
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.getcoconut.com/#website",
  "name": "Coconut",
  "alternateName": "!Coconut",
  "url": "https://www.getcoconut.com",
  "publisher": {
    "@id": "https://www.getcoconut.com/#organization"
  },
  "inLanguage": "en-GB",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.getcoconut.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
</script>
```

**Implementation notes:**
1. Replace logo URL with actual Webflow-hosted asset URL (min 112x112px, ideally square)
2. Verify each `sameAs` URL resolves
3. Confirm `taxID` 09904418 is the Companies House number (from footer)
4. Remove `potentialAction` from WebSite if `/search?q=` doesn't work
5. Update `numberOfEmployees` and `foundingDate` with confirmed values
6. `@id` pattern allows other page schemas to reference Organization without duplication

### /about page — AboutPage schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://www.getcoconut.com/about/#webpage",
  "name": "About Coconut",
  "description": "Learn about Coconut's mission to make self-employment easier than being employed.",
  "url": "https://www.getcoconut.com/about",
  "isPartOf": { "@id": "https://www.getcoconut.com/#website" },
  "about": { "@id": "https://www.getcoconut.com/#organization" },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.getcoconut.com" },
      { "@type": "ListItem", "position": 2, "name": "About", "item": "https://www.getcoconut.com/about" }
    ]
  }
}
</script>
```

### BlogPosting fix — add publisher and proper author typing

```json
{
  "@type": "BlogPosting",
  "publisher": { "@id": "https://www.getcoconut.com/#organization" },
  "author": {
    "@type": "Organization",
    "@id": "https://www.getcoconut.com/#organization"
  }
}
```

---

## 5. Heading Hierarchy Issues

### DevTools-verified (2026-05-06)

Original WebFetch-based H1 counts were inflated. Chrome DevTools verification corrected them:

| Page | Original Claim | DevTools Actual | Verdict |
|------|---------------|----------------|---------|
| `/about` | 2 H1 tags | **1 H1** ("About Coconut.") | WebFetch false positive — NO FIX NEEDED |
| `/pricing` | 6 H1 tags | **1 H1** ("Stay on top of Making Tax Digial...") | WebFetch false positive, SEMRush confirmed — NO FIX NEEDED (typo in H1 noted) |
| `/jobs` | 4 H1 tags | **2 H1s** ("Careers at Coconut" + "Current vacancies") | Count inflated but genuine issue — "Current vacancies" should be H2 |
| `/sign-up` | 2 H1 tags | **1 H1** ("What's your email?") | WebFetch false positive — NO FIX NEEDED |

### WARNING

| Page | Issue | Details |
|------|-------|---------|
| `/mtd-software` | H2→H4 skip | Pricing tier names jump from H2 to H4, skipping H3 |

---

## 6. Other SEO Issues

### Duplicate sitemap in robots.txt
`Sitemap:` line appears twice. Remove duplicate.

### Duplicate sole trader pages
Three pages target overlapping keywords:
- `/sole-traders` — "Sole Trader & Self-Employed Accounting Software"
- `/mtd-for-sole-traders` — "MTD for sole traders"
- `/mtd-software/sole-traders` — "MTD for Sole Traders | Making Tax Digital Software..."

Recommendation: Canonical to `/mtd-software/sole-traders`, 301 redirect `/mtd-for-sole-traders`, differentiate or redirect `/sole-traders`.

### Hreflang
No hreflang tags detected. Site serves UK English only. No action needed.

### llms.txt
`https://www.getcoconut.com/llms.txt` returns 404.

### Sitemap hygiene
380 URLs includes pages that should not be indexed: `/tools/upgrade-plan`, `/tools/your-plan`, `/tools/hold-your-horses`, `/tools/crowdfund-2021-investor-pitch`, `/knowledge-hub/sign-up-for-making-tax-digital-old`, `/search`.

### Meta description typo
`/features`: "...with simple our intuitive bookkeeping software..." — should be "our simple, intuitive".

### /blog and /knowledge-hub listing pages
Both appear to redirect to homepage. If intentional, remove from sitemap. If not, restore — important for internal linking and topical authority.

---

## 7. DevTools Follow-up Needed

These items need a Chrome DevTools session to verify:
- Canonical tags on all pages (Webflow auto-generates; check for conflicts)
- OG tags (og:title, og:description, og:image) on all pages
- Twitter Card tags
- Exact meta description and title lengths
- Full property dump of existing Organization schema on `/features`
- Image alt text audit (covered in Stream C)
