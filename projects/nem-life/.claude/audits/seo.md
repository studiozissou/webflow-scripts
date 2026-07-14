# SEO + Schema Audit — NEM Life

**Date:** 2026-05-07
**Site:** nem-life-1.webflow.io (production: nemlife.com)

---

## Meta Titles

| Page | Title | Length | Status |
|------|-------|--------|--------|
| Home (/) | "Webflow - NEMLife.com NEW" (auto-generated) | 25 | CRITICAL — no SEO title set |
| NEM Methode (/nem-methode) | "NEM Methode \| Patronen doorbreken met een aanpak die werkt - NEM Life" | 71 | OK |
| Missie (/missie-nem-life) | "Onze missie \| Waarom NEM Life bestaat - NEM Life" | 50 | OK |
| Inzichten (/inzichten) | "Blog Insights" | 14 | CRITICAL — English on Dutch site, generic |
| Ervaringen (/ervaringen) | "Testimonials" | 13 | CRITICAL — English on Dutch site, generic |
| Christel (/link-in-bio/christel) | "Christel Reus \| Therapeut, ondernemer & ontwikkelaar van de NEM Methode" | 73 | OK (slightly over 60 chars) |
| Voorwaarden (/voorwaarden) | "Voorwaarden" | 12 | WARNING — too short, no brand suffix |
| Blog article template | Not set in CMS SEO fields | — | CRITICAL — falls back to item name only |
| Testimonial template | Not set in CMS SEO fields | — | CRITICAL — falls back to item name only |

**Recommended titles:**

| Page | Recommended Title |
|------|-------------------|
| Home | "NEM Life \| Doorbreek het patroon dat je steeds weer tegenhoudt" |
| Inzichten | "Inzichten \| Artikelen over patronen, emoties en groei - NEM Life" |
| Ervaringen | "Ervaringen \| Wat anderen zeggen over de NEM Methode - NEM Life" |
| Voorwaarden | "Voorwaarden - NEM Life" |
| Blog template | "{Item Name} - NEM Life" (bind via CMS SEO title field) |
| Testimonial template | "{Item Name} \| Ervaring met NEM Life" |

---

## Meta Descriptions

| Page | Description | Length | Status |
|------|-------------|--------|--------|
| Home (/) | EMPTY | 0 | CRITICAL |
| NEM Methode (/nem-methode) | "De NEM Methode - Neuro Emotional Mastery - helpt je hardnekkige patronen doorbreken..." | ~90 | OK |
| Missie (/missie-nem-life) | "Je bent niet het probleem - je mist alleen een heldere aanpak..." | ~65 | OK |
| Inzichten (/inzichten) | EMPTY | 0 | CRITICAL |
| Ervaringen (/ervaringen) | EMPTY | 0 | CRITICAL |
| Christel (/link-in-bio/christel) | "Alles op een plek..." | ~20 | OK |
| Voorwaarden (/voorwaarden) | EMPTY | 0 | WARNING |
| Blog article template | Not set in CMS | — | CRITICAL |
| Testimonial template | Not set in CMS | — | WARNING |

**Recommended descriptions:**

| Page | Recommended Description |
|------|-------------------------|
| Home | "NEM Life helpt je hardnekkige patronen doorbreken met de NEM Methode. Concreet, stapsgewijs en direct toepasbaar. Geen eindeloos praten, maar doen." |
| Inzichten | "Lees artikelen over emotionele patronen, relaties en persoonlijke groei. Praktische inzichten van NEM Life om je verder te helpen." |
| Ervaringen | "Lees hoe anderen hun patronen doorbraken met de NEM Methode. Echte ervaringen van mensen die met NEM Life hebben gewerkt." |
| Voorwaarden | "Algemene voorwaarden van NEM Life. Lees onze voorwaarden voor therapie, sessies en gebruik van de website." |
| Blog template | Populate CMS "SEO Meta Description" field per article |

---

## Open Graph

| Page | OG Title | OG Description | OG Image | Status |
|------|----------|----------------|----------|--------|
| Home (/) | Not set | Not set | Not set | CRITICAL |
| NEM Methode | Copied from SEO | Copied from SEO | Not set | WARNING — no image |
| Missie | Copied from SEO | Copied from SEO | Not set | WARNING — no image |
| Inzichten | "Blog Insights" (English) | Not set | Not set | CRITICAL |
| Ervaringen | "Testimonials" (English) | Not set | Not set | CRITICAL |
| Christel | Copied from SEO | Copied from SEO | Not set | WARNING — no image |
| Voorwaarden | "Voorwaarden" | Not set | Not set | WARNING |

**Action:** Upload a default OG image (1200x630px) to Webflow Assets. Set it in Site Settings as the fallback OG image. Set page-specific OG images for Home, NEM Methode, and Missie. For blog articles, bind OG image to the CMS "Main Image" field.

---

## H1 Tags

| Page | H1 Content | Count | Status |
|------|------------|-------|--------|
| Home (/) | "Doorbreek het patroon dat je steeds weer tegenhoudt" | 1 | OK |
| NEM Methode (/nem-methode) | "Patronen doorbreken met de NEM Methode" | 1 | OK |
| Missie (/missie-nem-life) | "In a world full of advice and insight - it's easy to lose your way" + "We break the code - so you can break through" | 2 | CRITICAL — two H1s, both English |
| Inzichten (/inzichten) | "From insight to direction" | 1 | CRITICAL — English on Dutch site |
| Ervaringen (/ervaringen) | "From insight to direction" | 1 | CRITICAL — English, duplicate of /inzichten |
| Christel (/link-in-bio/christel) | None (name is H3) | 0 | CRITICAL — no H1 |
| Voorwaarden (/voorwaarden) | None ("Terms & Conditions" is H2) | 0 | CRITICAL — no H1, English heading |
| Blog article template | "From insight to direction" | 1 | WARNING — generic English, not article-specific |

**Recommended H1 fixes:**

| Page | Recommended H1 |
|------|----------------|
| Missie | Single H1: "Onze missie: van verwarring naar helderheid" |
| Inzichten | "Inzichten — artikelen die je verder helpen" |
| Ervaringen | "Ervaringen met de NEM Methode" |
| Christel | Promote "Christel Reus" to H1 |
| Voorwaarden | Add H1: "Voorwaarden" |
| Blog template | Bind H1 to CMS article title field |

---

## Heading Hierarchy

| Page | Issue | Detail |
|------|-------|--------|
| Home (/) | Duplicate H2 | "Inzichten - artikelen die je verder helpen" appears twice |
| NEM Methode | Duplicate H2 | "Wat maakt de NEM Methode uniek?" appears twice |
| NEM Methode | Duplicate H2 | "Wat merk je ervan in je dagelijks leven?" appears twice |
| NEM Methode | H2 reads like body copy | "Geen grote omwenteling - maar een verschuiving die je merkt. In kleine momenten eerst." — shorten or demote |
| Missie | Two H1s | Both in English; fix to single Dutch H1 |
| Missie | Language mixing | Dutch and English headings on same page |
| Christel | No H1 | Heading hierarchy starts at H2; "Christel Reus" is H3 |
| Voorwaarden | No H1 | "Terms & Conditions" is H2 in English |
| Voorwaarden | Misplaced content | "Wat veel mensen denken (maar niet klopt)" and "Waarom deze aanpak anders werkt" may be pasted from another page — verify |
| Blog template | Generic H1 | All blog articles share "From insight to direction" |
| Ervaringen | Generic H1 | Same as Inzichten — duplicate across pages |

---

## Canonical Tags

Webflow auto-generates canonical tags on all pages. On staging, these point to `nem-life-1.webflow.io`. After connecting the custom domain, they will update to `nemlife.com` automatically.

No custom canonical overrides detected. No conflicts.

**Action at launch:** Verify canonicals point to `https://nemlife.com/` (not `www` or staging domain).

---

## JSON-LD Structured Data

| Page | JSON-LD Present | Status |
|------|-----------------|--------|
| Home (/) | No | CRITICAL |
| NEM Methode | No | CRITICAL |
| Missie | No | CRITICAL |
| Inzichten | No | CRITICAL |
| Ervaringen | No | WARNING |
| Christel | No | CRITICAL |
| Voorwaarden | No | Suggestion |
| Blog template | No | CRITICAL |
| Testimonial template | No | WARNING |

**Status:** Zero JSON-LD deployed. Schemas prepared at `projects/nem-life/.claude/schema/`.

### Prepared schemas (ready to paste into Webflow)

| File | Schema Types | Target | Placement |
|------|-------------|--------|-----------|
| `nem-life-sitewide-2026-05-07.json` | Organization, WebSite | All pages | Site Settings > Head Code |
| `nem-life-home-faq-2026-05-07.json` | WebPage, FAQPage | / | Page Settings > Head Code |
| `nem-life-nem-method-howto-2026-05-07.json` | HowTo, WebPage | /nem-methode | Page Settings > Head Code |
| `nem-life-nem-method-faq-2026-05-07.json` | FAQPage | /nem-methode | Page Settings > Head Code |
| `nem-life-mission-2026-05-07.json` | AboutPage | /missie-nem-life | Page Settings > Head Code |
| `nem-life-christel-person-2026-05-07.json` | Person | /link-in-bio/christel | Page Settings > Head Code |
| `nem-life-blog-article-2026-05-07.json` | Article | /inzichten/[slug] | CMS Embed element |
| `nem-life-testimonial-review-2026-05-07.json` | CreativeWork, Review | /ervaringen/[slug] | CMS Embed element |

### FILL_IN fields still needed

- **Sitewide Organization:** `logo.url`, `foundingDate`, `sameAs` (social URLs), `contactPoint.email`
- **Christel Person:** `image` (photo URL), `sameAs` (personal social links)

---

## Sitemap

Webflow auto-generates sitemaps. On staging, access may be restricted.

**Action at launch:**
1. Verify sitemap at `https://nemlife.com/sitemap.xml`
2. Submit to Google Search Console
3. Check `/page-starter` and `/style-guide` are excluded
4. Check CMS category pages resolve correctly

---

## llms.txt

**Result:** 404 Not Found

Prepared file at `projects/nem-life/.claude/schema/llms.txt` — not yet deployed.

**Deployment options:**
1. Cloudflare Workers edge function
2. Webflow page at `/llms-txt` with 301 redirect from `/llms.txt`

---

## robots.txt

**Current (staging):** `Disallow: /` (auto-generated by Webflow for `.webflow.io` domains — expected).

**Prepared production version** at `projects/nem-life/.claude/schema/robots.txt`:
- Allows all major crawlers + AI bots
- Blocks SEO scraper bots
- Disallows `/page-starter*` and `/style-guide`
- References production sitemap

---

## Hreflang

**Status:** Not present. Not needed currently.

Both locales (`nl`, `en`) are configured but disabled. Site is Dutch-only.

**If English locale is enabled later:**
```html
<link rel="alternate" hreflang="nl" href="https://nemlife.com/{path}" />
<link rel="alternate" hreflang="en" href="https://nemlife.com/en/{path}" />
<link rel="alternate" hreflang="x-default" href="https://nemlife.com/{path}" />
```

---

## Content Language Issues

Multiple pages contain English headings on a Dutch-language site:

| Page | English Content | Fix |
|------|-----------------|-----|
| Home | SEO title "Webflow - NEMLife.com NEW" | Set Dutch SEO title |
| Inzichten | Title "Blog Insights", H1 "From insight to direction" | Translate to Dutch |
| Ervaringen | Title "Testimonials", H1 "From insight to direction" | Translate to Dutch |
| Missie | Both H1s in English | Rewrite as single Dutch H1 |
| Voorwaarden | H2 "Terms & Conditions" | Change to "Voorwaarden" |
| Blog template | H1 "From insight to direction" | Bind to CMS article title |

Mixed Dutch/English signals weaken ranking in Dutch search results and confuse `inLanguage` structured data.

---

## JavaScript SEO — CLS Risk

| Script | CLS Risk | Detail |
|--------|----------|--------|
| `method-cars-fade.js` | Low | Opacity-only, no layout shift |
| `swiper-init.js` | Medium | Card height equalisation after render may cause minor shift |
| `card-links.js` | Low | DOM restructure on DOMContentLoaded, no visual changes |
| `blog-share.js` | None | Click handler only |
| `back-to-top.js` | Low | Fixed-position element |

**Suggestion:** Add CSS to prevent CLS from Swiper:
```css
.swiper:not(.swiper-initialized) .swiper-wrapper { overflow: hidden; }
.swiper:not(.swiper-initialized) .swiper-slide:not(:first-child) { display: none; }
```

---

## Summary

### Overall SEO Health: WEAK

Strong Dutch content on Home and NEM Methode, but pervasive configuration gaps across the rest of the site.

### By severity

**CRITICAL (9 items) — fix before launch:**
1. Homepage missing SEO title and description
2. /inzichten: English title "Blog Insights", no description
3. /ervaringen: English title "Testimonials", no description
4. /missie-nem-life: two H1s, both English
5. /inzichten and /ervaringen share duplicate English H1
6. /link-in-bio/christel has no H1
7. /voorwaarden has no H1, English heading
8. Zero JSON-LD deployed (schemas prepared but not placed in Webflow)
9. CMS templates have no SEO fields configured

**WARNING (6 items) — fix shortly after launch:**
10. No OG images on any page
11. /voorwaarden missing meta description
12. Duplicate H2 headings on Home and NEM Methode
13. Swiper card height equalisation may cause minor CLS
14. Blog article template uses generic H1
15. robots.txt and llms.txt prepared but not deployed

**SUGGESTION (4 items) — improve over time:**
16. Add BreadcrumbList schema
17. Add hreflang when English locale is enabled
18. Add alt text to all images (bulk task)
19. Shorten overly long H2 on NEM Methode
