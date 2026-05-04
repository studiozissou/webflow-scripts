# Carsa Sitewide JSON-LD Schema

**Client:** Carsa
**Slug:** carsa-sitewide-schema
**Status:** Ready to Build
**Created:** 2026-05-04
**Priority:** High

---

## Summary

Generate JSON-LD structured data for every page type on carsa.co.uk, optimised for SEO (Google Rich Results) and AEO (AI answer extraction). Deliver as paste-ready HTML snippets using Webflow CMS binding syntax where applicable.

---

## Current State

| Page Type | Current Schema | Status |
|-----------|---------------|--------|
| Homepage `/` | None | Needs creation |
| Vehicle Models `/used-cars/models/{slug}` | CollectionPage + BreadcrumbList + Org + WebSite + FAQPage | Exists — review |
| Makes `/used-cars/make/{slug}` | CollectionPage + BreadcrumbList + Org + WebSite + FAQPage | Exists — review |
| Individual Vehicles `/vehicles/used/{reg}` | Product (basic) | Needs improvement |
| Blog `/blog/{slug}` | BlogPosting (basic) | Needs improvement |
| FAQ `/faq` | FAQPage (JS-injected) | Needs static + BreadcrumbList |
| Stores `/stores/{location}` | None | Needs creation |
| Car Care `/car-care/{slug}` | None | Needs creation |
| About pages `/about/{slug}` | None | Needs creation |
| Used Cars listing `/used-cars` | None | Needs creation |
| Car Finance `/car-finance` | None | Needs creation |
| Finance Calculator `/car-finance-calculator` | None | Needs creation |
| Contact `/contact` | None | Needs creation |
| Reserve `/reserve` | None | Needs creation |
| Part Exchange `/part-exchange` | None | Needs creation |
| Value Car `/value-car` | None | Needs creation |
| Terms `/terms/{slug}` | None | Needs creation |

---

## Schema Architecture

### Shared Entities (site-wide head code)

These go in **Site Settings → Custom Code → Head**:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.carsa.co.uk/#organization",
      "name": "Carsa",
      "legalName": "Carsa Ltd",
      "url": "https://www.carsa.co.uk",
      "telephone": "+44 330 012 4026",
      "logo": {
        "@type": "ImageObject",
        "url": "https://cdn.prod.website-files.com/68348ea61096b37caacd2f95/689affbcc73d8d39c5e8569c_Carsa%20logo.png"
      },
      "sameAs": [
        "https://www.facebook.com/carsauk",
        "https://www.instagram.com/carsa_uk",
        "https://www.tiktok.com/@carsa_uk"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://www.carsa.co.uk/#website",
      "url": "https://www.carsa.co.uk",
      "name": "Carsa",
      "publisher": { "@id": "https://www.carsa.co.uk/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://www.carsa.co.uk/used-cars?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
  ]
}
```

### Per-Page Schema Types

#### 1. Homepage `/`

**Location:** Page Settings → Custom Code → Head

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://www.carsa.co.uk/#webpage",
  "url": "https://www.carsa.co.uk/",
  "name": "Carsa — Used Cars for Sale UK",
  "description": "Find quality used cars from trusted UK dealerships. Browse thousands of vehicles with finance options, free delivery, and 90-day warranty.",
  "isPartOf": { "@id": "https://www.carsa.co.uk/#website" },
  "about": { "@id": "https://www.carsa.co.uk/#organization" },
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".hero_heading", ".hero_subheading"]
  }
}
```

#### 2. Individual Vehicles `/vehicles/used/{reg}` (CMS Template)

**Location:** Collection Template → Custom Code → Head
**Improvements over current:** Add BreadcrumbList, Vehicle type, images, vehicleConfiguration, mileageFromOdometer, driveWheelConfiguration, seatingCapacity, speakable

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Product", "Vehicle"],
      "@id": "https://www.carsa.co.uk/vehicles/used/{{wf {"path":"slug","type":"PlainText"} }}#product",
      "name": "{{wf {"path":"name","type":"PlainText"} }}",
      "description": "{{wf {"path":"meta-description","type":"PlainText"} }}",
      "brand": {
        "@type": "Brand",
        "name": "{{wf {"path":"make:name","type":"PlainText"} }}"
      },
      "model": "{{wf {"path":"model","type":"PlainText"} }}",
      "vehicleModelDate": "{{wf {"path":"year","type":"PlainText"} }}",
      "bodyType": "{{wf {"path":"body-type","type":"PlainText"} }}",
      "fuelType": "{{wf {"path":"fuel-type","type":"PlainText"} }}",
      "vehicleTransmission": "{{wf {"path":"transmission","type":"PlainText"} }}",
      "driveWheelConfiguration": "{{wf {"path":"drive-type","type":"PlainText"} }}",
      "color": "{{wf {"path":"colour","type":"PlainText"} }}",
      "numberOfDoors": "{{wf {"path":"doors","type":"PlainText"} }}",
      "seatingCapacity": "{{wf {"path":"seats","type":"PlainText"} }}",
      "mileageFromOdometer": {
        "@type": "QuantitativeValue",
        "value": "{{wf {"path":"mileage","type":"PlainText"} }}",
        "unitCode": "SMI"
      },
      "vehicleIdentificationNumber": "{{wf {"path":"vrm","type":"PlainText"} }}",
      "image": "{{wf {"path":"hero-image","type":"ImageRef"} }}",
      "offers": {
        "@type": "Offer",
        "url": "https://www.carsa.co.uk/vehicles/used/{{wf {"path":"slug","type":"PlainText"} }}",
        "priceCurrency": "GBP",
        "price": "{{wf {"path":"price","type":"PlainText"} }}",
        "itemCondition": "https://schema.org/UsedCondition",
        "availability": "https://schema.org/InStock",
        "seller": { "@id": "https://www.carsa.co.uk/#organization" }
      },
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Registration Date",
          "value": "{{wf {"path":"registration-date","type":"PlainText"} }}"
        },
        {
          "@type": "PropertyValue",
          "name": "Warranty",
          "value": "90 days included free"
        }
      ],
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".vehicle_title", ".vehicle_price", ".vehicle_key-specs"]
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/vehicles/used/{{wf {"path":"slug","type":"PlainText"} }}#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Used Cars", "item": "https://www.carsa.co.uk/used-cars" },
        { "@type": "ListItem", "position": 3, "name": "{{wf {"path":"make:name","type":"PlainText"} }}", "item": "https://www.carsa.co.uk/used-cars/make/{{wf {"path":"make:slug","type":"PlainText"} }}" },
        { "@type": "ListItem", "position": 4, "name": "{{wf {"path":"name","type":"PlainText"} }}" }
      ]
    }
  ]
}
</script>
```

**CMS fields referenced:** `slug`, `name`, `meta-description`, `make:name`, `make:slug`, `model`, `year`, `body-type`, `fuel-type`, `transmission`, `drive-type`, `colour`, `doors`, `seats`, `mileage`, `vrm`, `hero-image`, `price`, `registration-date`

#### 3. Blog `/blog/{slug}` (CMS Template)

**Location:** Collection Template → Custom Code → Head
**Improvements:** Add author, BreadcrumbList, ISO dates, speakable, mainEntityOfPage

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://www.carsa.co.uk/blog/{{wf {"path":"slug","type":"PlainText"} }}#article",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://www.carsa.co.uk/blog/{{wf {"path":"slug","type":"PlainText"} }}"
      },
      "headline": "{{wf {"path":"name","type":"PlainText"} }}",
      "description": "{{wf {"path":"meta-description","type":"PlainText"} }}",
      "image": "{{wf {"path":"featured-image","type":"ImageRef"} }}",
      "author": {
        "@type": "Person",
        "name": "{{wf {"path":"author:name","type":"PlainText"} }}"
      },
      "publisher": { "@id": "https://www.carsa.co.uk/#organization" },
      "datePublished": "{{wf {"path":"published-date","type":"PlainText"} }}",
      "dateModified": "{{wf {"path":"updated-date","type":"PlainText"} }}",
      "articleSection": "{{wf {"path":"category:name","type":"PlainText"} }}",
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".blog_heading", ".blog_intro"]
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/blog/{{wf {"path":"slug","type":"PlainText"} }}#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.carsa.co.uk/blog" },
        { "@type": "ListItem", "position": 3, "name": "{{wf {"path":"name","type":"PlainText"} }}" }
      ]
    }
  ]
}
</script>
```

**CMS fields referenced:** `slug`, `name`, `meta-description`, `featured-image`, `author:name`, `published-date`, `updated-date`, `category:name`

#### 4. Stores `/stores/{location}` (CMS Template)

**Location:** Collection Template → Custom Code → Head

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AutoDealer",
      "@id": "https://www.carsa.co.uk/stores/{{wf {"path":"slug","type":"PlainText"} }}#localbusiness",
      "name": "Carsa — {{wf {"path":"name","type":"PlainText"} }}",
      "url": "https://www.carsa.co.uk/stores/{{wf {"path":"slug","type":"PlainText"} }}",
      "telephone": "{{wf {"path":"phone","type":"PlainText"} }}",
      "email": "{{wf {"path":"email","type":"PlainText"} }}",
      "image": "{{wf {"path":"store-image","type":"ImageRef"} }}",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "{{wf {"path":"street-address","type":"PlainText"} }}",
        "addressLocality": "{{wf {"path":"city","type":"PlainText"} }}",
        "addressRegion": "{{wf {"path":"county","type":"PlainText"} }}",
        "postalCode": "{{wf {"path":"postcode","type":"PlainText"} }}",
        "addressCountry": "GB"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "{{wf {"path":"latitude","type":"PlainText"} }}",
        "longitude": "{{wf {"path":"longitude","type":"PlainText"} }}"
      },
      "openingHoursSpecification": [
        { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "09:00", "closes": "19:00" },
        { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "18:00" },
        { "@type": "OpeningHoursSpecification", "dayOfWeek": "Sunday", "opens": "10:00", "closes": "17:00" }
      ],
      "parentOrganization": { "@id": "https://www.carsa.co.uk/#organization" },
      "priceRange": "$$",
      "currenciesAccepted": "GBP",
      "paymentAccepted": "Cash, Credit Card, Finance",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "{{wf {"path":"rating","type":"PlainText"} }}",
        "reviewCount": "{{wf {"path":"review-count","type":"PlainText"} }}"
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/stores/{{wf {"path":"slug","type":"PlainText"} }}#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Stores", "item": "https://www.carsa.co.uk/stores" },
        { "@type": "ListItem", "position": 3, "name": "{{wf {"path":"name","type":"PlainText"} }}" }
      ]
    }
  ]
}
</script>
```

**CMS fields referenced:** `slug`, `name`, `phone`, `email`, `store-image`, `street-address`, `city`, `county`, `postcode`, `latitude`, `longitude`, `rating`, `review-count`

#### 5. FAQ `/faq` (Static Page)

**Location:** Page Settings → Custom Code → Head
**Note:** The dynamic JS injection already handles FAQPage. Add BreadcrumbList + WebPage wrapper.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.carsa.co.uk/faq#webpage",
      "url": "https://www.carsa.co.uk/faq",
      "name": "Frequently Asked Questions | Carsa",
      "description": "Find answers to common questions about buying a used car from Carsa, finance options, delivery, warranties, and part exchange.",
      "isPartOf": { "@id": "https://www.carsa.co.uk/#website" },
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".faq_heading", ".faq_item"]
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/faq#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "FAQ" }
      ]
    }
  ]
}
</script>
```

#### 6. Car Finance `/car-finance`

**Location:** Page Settings → Custom Code → Head

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.carsa.co.uk/car-finance#webpage",
      "url": "https://www.carsa.co.uk/car-finance",
      "name": "Car Finance — Used Car Finance Options | Carsa",
      "description": "Flexible car finance options including PCP and HP. Representative 8.9% APR. Apply online with no impact on your credit score.",
      "isPartOf": { "@id": "https://www.carsa.co.uk/#website" },
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".section_hero h1", ".finance_intro"]
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/car-finance#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Car Finance" }
      ]
    }
  ]
}
</script>
```

#### 7. Car Finance Calculator `/car-finance-calculator`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.carsa.co.uk/car-finance-calculator#webpage",
      "url": "https://www.carsa.co.uk/car-finance-calculator",
      "name": "Car Finance Calculator | Carsa",
      "description": "Calculate your monthly car finance payments. See PCP and HP options with no obligation.",
      "isPartOf": { "@id": "https://www.carsa.co.uk/#website" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/car-finance-calculator#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Car Finance", "item": "https://www.carsa.co.uk/car-finance" },
        { "@type": "ListItem", "position": 3, "name": "Calculator" }
      ]
    }
  ]
}
</script>
```

#### 8. Used Cars Listing `/used-cars`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://www.carsa.co.uk/used-cars#webpage",
      "url": "https://www.carsa.co.uk/used-cars",
      "name": "Used Cars for Sale | Carsa",
      "description": "Browse thousands of quality used cars. All with 90-day warranty, free delivery, and flexible finance.",
      "isPartOf": { "@id": "https://www.carsa.co.uk/#website" },
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".section_hero h1", ".section_hero p"]
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/used-cars#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Used Cars" }
      ]
    }
  ]
}
</script>
```

#### 9. Car Care Pages `/car-care/{slug}`

**Location:** These appear to be static pages (7 total), not CMS. Each gets individual schema.

Template pattern (adapt per page):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://www.carsa.co.uk/car-care/{slug}#service",
      "name": "{Service Name}",
      "description": "{Service description}",
      "provider": { "@id": "https://www.carsa.co.uk/#organization" },
      "serviceType": "Automotive Service",
      "areaServed": { "@type": "Country", "name": "United Kingdom" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/car-care/{slug}#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Car Care", "item": "https://www.carsa.co.uk/car-care/overview" },
        { "@type": "ListItem", "position": 3, "name": "{Service Name}" }
      ]
    }
  ]
}
</script>
```

#### 10. About Pages `/about/{slug}`

Template pattern:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://www.carsa.co.uk/about/{slug}#webpage",
      "url": "https://www.carsa.co.uk/about/{slug}",
      "name": "{Page Title} | Carsa",
      "description": "{Meta description}",
      "isPartOf": { "@id": "https://www.carsa.co.uk/#website" },
      "mainEntity": { "@id": "https://www.carsa.co.uk/#organization" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/about/{slug}#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "About", "item": "https://www.carsa.co.uk/about/carsa" },
        { "@type": "ListItem", "position": 3, "name": "{Page Name}" }
      ]
    }
  ]
}
</script>
```

#### 11. Contact `/contact`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ContactPage",
      "@id": "https://www.carsa.co.uk/contact#webpage",
      "url": "https://www.carsa.co.uk/contact",
      "name": "Contact Us | Carsa",
      "description": "Get in touch with Carsa. Call, email, or visit one of our UK showrooms.",
      "isPartOf": { "@id": "https://www.carsa.co.uk/#website" },
      "mainEntity": { "@id": "https://www.carsa.co.uk/#organization" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/contact#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Contact" }
      ]
    }
  ]
}
</script>
```

#### 12. Part Exchange `/part-exchange` & Value Car `/value-car`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.carsa.co.uk/part-exchange#webpage",
      "url": "https://www.carsa.co.uk/part-exchange",
      "name": "Part Exchange Your Car | Carsa",
      "description": "Get an instant online valuation for your car. Part exchange it against any vehicle in our stock.",
      "isPartOf": { "@id": "https://www.carsa.co.uk/#website" },
      "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".section_hero h1", ".section_hero p"]
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/part-exchange#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Part Exchange" }
      ]
    }
  ]
}
</script>
```

#### 13. Reserve `/reserve`

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.carsa.co.uk/reserve#webpage",
      "url": "https://www.carsa.co.uk/reserve",
      "name": "Reserve a Car Online | Carsa",
      "description": "Reserve any car for a fully refundable £99 deposit. Lock in today's price and collect from any Carsa store.",
      "isPartOf": { "@id": "https://www.carsa.co.uk/#website" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/reserve#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "Reserve" }
      ]
    }
  ]
}
</script>
```

#### 14. Terms `/terms/{slug}` (CMS Template)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.carsa.co.uk/terms/{{wf {"path":"slug","type":"PlainText"} }}#webpage",
      "url": "https://www.carsa.co.uk/terms/{{wf {"path":"slug","type":"PlainText"} }}",
      "name": "{{wf {"path":"name","type":"PlainText"} }} | Carsa",
      "isPartOf": { "@id": "https://www.carsa.co.uk/#website" }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.carsa.co.uk/terms/{{wf {"path":"slug","type":"PlainText"} }}#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.carsa.co.uk/" },
        { "@type": "ListItem", "position": 2, "name": "{{wf {"path":"name","type":"PlainText"} }}" }
      ]
    }
  ]
}
</script>
```

#### 15. Makes Template (UPDATED) `/used-cars/make/{slug}`

Keep existing template but add `speakable` to CollectionPage and `mainEntity` link:

```diff
+ "speakable": {
+   "@type": "SpeakableSpecification",
+   "cssSelector": [".section_hero h1", ".section_hero p"]
+ },
+ "mainEntity": { "@id": "https://www.carsa.co.uk/used-cars/make/{{slug}}#faq" }
```

#### 16. Models Template (UPDATED) `/used-cars/models/{slug}`

Keep existing template but add `speakable` and `mainEntity` link to FAQ:

```diff
+ "speakable": {
+   "@type": "SpeakableSpecification",
+   "cssSelector": [".section_hero h1", ".section_hero p"]
+ },
+ "mainEntity": { "@id": "https://www.carsa.co.uk/used-cars/models/{{slug}}#faq" }
```

---

## AEO Optimisation Notes

1. **`speakable`** — Added to all high-value pages (homepage, vehicles, blog, FAQ, finance). Points to CSS selectors containing the most extractable content.
2. **`mainEntity`** linking — FAQ pages link their FAQPage schema as mainEntity of the WebPage, creating a clear knowledge graph connection.
3. **Structured descriptions** — All descriptions are written as direct answers to likely user queries (e.g. "What is Carsa's car finance APR?" → description mentions 8.9% APR).
4. **`SearchAction`** — Site-wide WebSite schema includes SearchAction for sitelinks search box eligibility.

---

## Webflow CMS Binding Notes

### Binding Syntax
```
{{wf {"path":"field-slug","type":"PlainText"} }}
```

When escaped for HTML head code (using `&quot;`):
```
{{wf {&quot;path&quot;:&quot;field-slug&quot;,&quot;type&quot;:&quot;PlainText&quot;\} }}
```

### Reference Fields (multi-ref or single-ref)
```
{{wf {"path":"ref-field:sub-field","type":"PlainText"} }}
```

### Image Fields
```
{{wf {"path":"image-field","type":"ImageRef"} }}
```

---

## CMS Fields to Verify via Webflow MCP

Before deploying, connect Webflow MCP and verify these CMS fields exist:

**Vehicles collection:** `slug`, `name`, `meta-description`, `make` (ref → makes), `model`, `year`, `body-type`, `fuel-type`, `transmission`, `drive-type`, `colour`, `doors`, `seats`, `mileage`, `vrm`, `hero-image`, `price`, `registration-date`

**Blog collection:** `slug`, `name`, `meta-description`, `featured-image`, `author` (ref), `published-date`, `updated-date`, `category` (ref)

**Stores collection:** `slug`, `name`, `phone`, `email`, `store-image`, `street-address`, `city`, `county`, `postcode`, `latitude`, `longitude`, `rating`, `review-count`

**Terms collection:** `slug`, `name`

---

## Validation Strategy

### Phase 1: Structural Validation (pre-deploy)
- Validate each template's JSON-LD against schema.org vocabulary
- Check for required properties per type
- Ensure all `@id` references resolve within the graph
- Verify Webflow binding syntax is correct

### Phase 2: Live Validation (post-deploy)
- Run each page type through Google Rich Results Test
- Run through Schema Markup Validator (schema.org)
- Check Google Search Console for structured data errors
- Verify speakable selectors point to existing DOM elements

---

## Task Breakdown

| # | Task | Agent | Est. Tokens |
|---|------|-------|-------------|
| 1 | Generate site-wide schema (Organization + WebSite + SearchAction) | schema | 500 |
| 2 | Generate homepage schema | schema | 300 |
| 3 | Generate/improve vehicle template schema | schema | 800 |
| 4 | Generate blog template schema | schema | 500 |
| 5 | Generate stores template schema | schema | 600 |
| 6 | Generate FAQ page schema | schema | 300 |
| 7 | Generate car-finance + calculator schemas | schema | 400 |
| 8 | Generate used-cars listing schema | schema | 300 |
| 9 | Generate car-care service schemas (7 pages) | schema | 800 |
| 10 | Generate about page schemas (4 pages) | schema | 500 |
| 11 | Generate contact/reserve/part-exchange/value-car schemas | schema | 500 |
| 12 | Generate terms template schema | schema | 300 |
| 13 | Update makes + models templates (add speakable + mainEntity) | code-writer | 400 |
| 14 | Validate all schemas structurally (JSON-LD lint) | qa | 1000 |
| 15 | Connect Webflow MCP → verify CMS field slugs match bindings | qa | 800 |
| 16 | Deploy schemas to Webflow | manual | — |
| 17 | Post-deploy validation (Rich Results Test per page type) | qa | 1000 |

---

## Parallelisation Map

### Independent Streams (can run simultaneously)

| Stream | Tasks | Agent | Notes |
|--------|-------|-------|-------|
| A — CMS templates | 3, 4, 5, 12 | schema | All independent templates |
| B — Static pages (high value) | 1, 2, 6, 7, 8 | schema | Site-wide + key pages |
| C — Static pages (standard) | 9, 10, 11 | schema | Service + about + utility pages |
| D — Template updates | 13 | code-writer | Update existing files |

### Sequential Dependencies

- Task 14 (validate) → depends on ALL generation tasks (1–13)
- Task 15 (Webflow MCP verify) → depends on tasks 3, 4, 5 (CMS templates)
- Task 16 (deploy) → depends on 14, 15
- Task 17 (post-deploy validate) → depends on 16

### Recommendation
- **Parallel**: Yes — streams A, B, C, D can all run simultaneously
- **Worktrees**: No — these are content files, not code conflicts
- **Agent teams**: No — single schema agent can handle sequentially within each stream

---

## Verify Loop

### Pass/Fail Criteria
1. Every generated JSON-LD file passes `jsonlint` (valid JSON)
2. Every `@type` used exists in schema.org vocabulary
3. Every `@id` reference has a matching definition in the graph (same page or site-wide)
4. Webflow CMS bindings use correct `{{wf ...}}` syntax with proper escaping
5. No duplicate `@id` values across templates
6. Rich Results Test shows eligible results for: Product (vehicles), Article (blog), LocalBusiness (stores), FAQPage (FAQ), BreadcrumbList (all pages)

### Reproduction Steps
1. Open each HTML template file in `projects/carsa/schema/`
2. Copy the JSON content (without `<script>` tags)
3. Paste into https://validator.schema.org/ — must show 0 errors
4. After deployment: navigate to live URL → View Source → copy JSON-LD → paste into https://search.google.com/test/rich-results

### Tier Mapping
- **Tier 1 (Auto):** JSON lint validation, schema.org type checking (can script)
- **Tier 2 (CDN regression):** N/A — no JS code, just HTML templates
- **Tier 3 (Manual):** Rich Results Test per page type, Search Console monitoring, CMS binding output check in Webflow preview

### Regression Scope
- Existing makes-template.html and models-template.html must not break
- Existing vehicle Product schema (currently injected somehow) should be replaced, not duplicated
- FAQ page's JS-injected FAQPage schema should coexist with new static WebPage schema (no conflict)

---

## Barba Impact

N/A — no Barba transitions on Carsa.

---

## Deliverables

All templates saved to `projects/carsa/schema/`:
- `site-wide.html` — Organization + WebSite (for Site Settings head)
- `homepage.html` — WebPage
- `vehicles-template.html` — Product/Vehicle + BreadcrumbList
- `blog-template.html` — Article + BreadcrumbList
- `stores-template.html` — AutoDealer + BreadcrumbList
- `terms-template.html` — WebPage + BreadcrumbList
- `faq.html` — WebPage + BreadcrumbList
- `car-finance.html` — WebPage + BreadcrumbList
- `car-finance-calculator.html` — WebPage + BreadcrumbList
- `used-cars.html` — CollectionPage + BreadcrumbList
- `contact.html` — ContactPage + BreadcrumbList
- `reserve.html` — WebPage + BreadcrumbList
- `part-exchange.html` — WebPage + BreadcrumbList
- `value-car.html` — WebPage + BreadcrumbList
- `car-care-overview.html` + 6 individual car-care service pages
- `about-carsa.html` + about-careers, about-car-preparation, about-reviews
- Updated `makes-template.html` (add speakable + mainEntity)
- Updated `models-template.html` (add speakable + mainEntity)
