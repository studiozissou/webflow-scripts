# RHP SEO Package — Page Titles, Meta Descriptions & Schema

Generated: 2026-03-19
Site: https://www.readyhitplay.com/

## Current State
- All pages have title "Ready Hit Play" (no differentiation)
- No meta descriptions on any page
- Only schema: `{"@type":"WebSite","name":"Ready Hit Play","url":"https://www.readyhitplay.com/"}`
- No OG tags detected

---

## Pages (10 total)

### 1. Home (`/`)
- **Title:** Ready Hit Play — Creative Studio, Amsterdam
- **Meta Description:** We tell stories that make great ideas feel inevitable. Brand films, strategic messaging, and digital experiences for ambitious brands.
- **Schema:** Organization + WebSite (`@graph`)

### 2. About (`/about`)
- **Title:** About Ready Hit Play — Who We Are
- **Meta Description:** A creative circle built per project. Messaging, brand identity, digital, and film for brands like Microsoft, Remote, and Overland AI. Based in Amsterdam.
- **Schema:** AboutPage + BreadcrumbList

### 3. Overland AI (`/work/overland-ai`)
- **Title:** Overland AI — Ready Hit Play
- **Meta Description:** We rebuilt Overland AI's narrative to prove true off-road autonomy was possible. Website, brand films, investor narrative, and strategic messaging.
- **Schema:** CreativeWork + Review + BreadcrumbList

### 4. Remote (`/work/remote`)
- **Title:** Remote — Ready Hit Play
- **Meta Description:** Six films across four continents brought Remote's CEO vision to life — making working anywhere not just possible, but aspirational.
- **Schema:** CreativeWork + Review + BreadcrumbList

### 5. Microsoft (`/work/microsoft`)
- **Title:** Microsoft — Ready Hit Play
- **Meta Description:** Most security brands sell fear. We told a different story. Global campaign films for Microsoft Security across multiple continents.
- **Schema:** CreativeWork + BreadcrumbList

### 6. Starfish Space (`/work/starfish-space`)
- **Title:** Starfish Space — Ready Hit Play
- **Meta Description:** Website, launch film, and strategic messaging for Starfish Space — making orbital servicing and autonomous docking at 7km/s impossible to ignore.
- **Schema:** CreativeWork + Review + BreadcrumbList

### 7. Stoke Space (`/work/stoke-space`)
- **Title:** Stoke Space — Ready Hit Play
- **Meta Description:** Brand films, visualization, and investor narrative for Stoke Space. The story behind their $100M Series B and fully reusable rocket.
- **Schema:** CreativeWork + Review + BreadcrumbList

### 8. Tommy Hilfiger (`/work/tommy-hilfiger`)
- **Title:** Tommy Hilfiger — Ready Hit Play
- **Meta Description:** Executive films and strategic narrative support for Tommy Hilfiger's C-suite — turning four decades of cultural gravity into momentum.
- **Schema:** CreativeWork + Review + BreadcrumbList

### 9. Menno Sports (`/work/menno-sports`)
- **Title:** Menno Sports — Ready Hit Play
- **Meta Description:** Elevating chess with every broadcast. We helped Menno Sports stream elite tournaments like a major-league sport — drama, emotion, stakes.
- **Schema:** CreativeWork + Review + BreadcrumbList

### 10. Between Here and Mars (`/work/between-here-and-mars`)
- **Title:** Between Here and Mars — Ready Hit Play
- **Meta Description:** Space needs a rebrand. We're making it tangible, accessible, and essential — showing how space fuels progress for everyone.
- **Schema:** CreativeWork + BreadcrumbList

---

## Implementation in Webflow

### Titles & Meta Descriptions
For each page: **Page Settings > SEO Settings** in the Webflow Designer.
- CMS work pages: set in the CMS item editor under SEO tab.

### Schema Placement

**Home page** — Page Settings > Custom Code > Head Code:
Replace the existing site-wide WebSite schema with this combined `@graph`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "Ready Hit Play",
      "url": "https://www.readyhitplay.com/",
      "logo": "FILL_IN_LOGO_URL",
      "description": "We tell stories that make great ideas feel inevitable.",
      "slogan": "Step in. Stand out.",
      "email": "hello@readyhitplay.com",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Amsterdam",
        "addressCountry": "NL"
      },
      "founder": [
        { "@type": "Person", "name": "Ryan Crisman", "jobTitle": "Founder & CEO" },
        { "@type": "Person", "name": "Guy Seese", "jobTitle": "Partner & Executive Creative Director" }
      ],
      "sameAs": [
        "https://www.instagram.com/readyhitplay/",
        "https://www.linkedin.com/company/readyhitplay/"
      ],
      "knowsAbout": ["Messaging", "Brand Identity", "Digital (Web & UX)", "Film & Visual"]
    },
    {
      "@type": "WebSite",
      "name": "Ready Hit Play",
      "url": "https://www.readyhitplay.com/",
      "publisher": { "@type": "Organization", "name": "Ready Hit Play" }
    }
  ]
}
</script>
```

**About page** — Page Settings > Custom Code > Head Code:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "About Ready Hit Play",
  "url": "https://www.readyhitplay.com/about",
  "description": "We tell stories that make great ideas feel inevitable. Meet the team behind Ready Hit Play.",
  "mainEntity": {
    "@type": "Organization",
    "name": "Ready Hit Play",
    "url": "https://www.readyhitplay.com/"
  },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.readyhitplay.com/" },
      { "@type": "ListItem", "position": 2, "name": "About", "item": "https://www.readyhitplay.com/about" }
    ]
  }
}
</script>
```

**Work pages (CMS template)** — Add an HTML Embed element in the CMS Collection Template `<head>` or page custom code. Dynamic version:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "CLIENT_NAME — Ready Hit Play",
  "url": "https://www.readyhitplay.com/work/SLUG",
  "description": "INTRO_PARAGRAPH_PLAINTEXT",
  "creator": {
    "@type": "Organization",
    "name": "Ready Hit Play",
    "url": "https://www.readyhitplay.com/"
  },
  "about": { "@type": "Organization", "name": "CLIENT_NAME" },
  "keywords": ["DELIVERABLE_1", "DELIVERABLE_2"],
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.readyhitplay.com/" },
      { "@type": "ListItem", "position": 2, "name": "Work", "item": "https://www.readyhitplay.com/work" },
      { "@type": "ListItem", "position": 3, "name": "CLIENT_NAME", "item": "https://www.readyhitplay.com/work/SLUG" }
    ]
  }
}
</script>
```

For pages with client quotes, add a `"review"` block:
```json
"review": {
  "@type": "Review",
  "author": { "@type": "Person", "name": "AUTHOR_NAME", "jobTitle": "TITLE" },
  "reviewBody": "QUOTE_TEXT"
}
```

---

## Action Items
1. Replace `FILL_IN_LOGO_URL` with actual Webflow asset URL for the RHP logo
2. Remove existing site-wide WebSite schema from Site Settings > Custom Code (moving to page-level)
3. Set titles + meta descriptions in Webflow Designer for all 10 pages
4. Add schema `<script>` blocks to each page's custom code
5. Validate at https://search.google.com/test/rich-results
6. Add OG image + OG title/description to each page (Webflow Page Settings > Open Graph)
