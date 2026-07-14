# Site Intake Report — NEM Life

**Date:** 2026-05-07 | **Live URL:** https://nemlife.com | **Staging URL:** https://nem-life-1.webflow.io

## Summary

NEM Life is a psychology-based brand founded by Christel Reus, helping emotionally intelligent adults (primarily Dutch-speaking women aged 35-55) break recurring behavioural and emotional patterns through the NEM Methode (Neuro Emotional Mastery). The site is a Webflow build taken over from a previous developer at roughly 30% completion. The primary contact is Alex Reus, who also builds some pages himself. The engagement is a fixed-price build (27 hours) with a proposed post-launch care retainer.

The site has a strong technical foundation: HTTPS is active, Best Practices scores 100 across all 9 pages on both desktop and mobile, a custom 404 page is in place, the viewport tag is correctly configured, and the Dutch copy on the Home and NEM Methode pages is sharp and brand-aligned. The Webflow project structure is clean — dev/test pages are properly archived or drafted, and the custom JavaScript (313 lines across 6 files) is well-organised, dependency-light, and commit-pinned via jsDelivr.

However, material issues span every audit layer. SEO metadata is missing or broken on 4 of 7 static pages (Home has no title or description; Inzichten and Ervaringen use English titles on a Dutch site). Zero JSON-LD structured data is deployed despite schemas being prepared. Nineteen images lack alt text. All CMS content remains Lorem ipsum placeholder. The H1 structure is compromised on 5 pages (English headings, duplicates, or missing entirely). The AEO score is 5/20 (Grade D), blocked primarily by absent schema, missing timestamps, and the staging robots.txt. Custom code is hosted from the developer's GitHub repo rather than a client-owned one, creating a bus-factor risk. Verdict: strong bones, but the site is not launch-ready without addressing these gaps.

## Passing

| Check | Status | Notes |
|-------|--------|-------|
| SSL / HTTPS | PASS | HTTPS active on staging domain via CloudFlare |
| Custom 404 page | PASS | Returns proper 404 status with custom page content |
| Viewport tag | PASS | `width=device-width, initial-scale=1` present |
| Best Practices (Lighthouse) | PASS | 100/100 on all 9 pages, desktop and mobile |
| Dev/test pages | PASS | Page Starter archived; Style Guide is draft. No published dev pages |
| Home H1 | PASS | Single, descriptive Dutch H1: "Doorbreek het patroon dat je steeds weer tegenhoudt" |
| NEM Methode SEO title | PASS | "NEM Methode \| Patronen doorbreken met een aanpak die werkt - NEM Life" (71 chars) |
| Missie SEO title | PASS | "Onze missie \| Waarom NEM Life bestaat - NEM Life" (50 chars) |
| Christel SEO title | PASS | "Christel Reus \| Therapeut, ondernemer & ontwikkelaar van de NEM Methode" (73 chars, slightly long but acceptable) |
| NEM Methode meta description | PASS | ~90 chars, describes the method clearly |
| Missie meta description | PASS | ~65 chars, brand-aligned |
| Christel meta description | PASS | ~20 chars, functional |
| NEM Methode H1 | PASS | Single H1: "Patronen doorbreken met de NEM Methode" |
| Canonical tags | PASS | Webflow auto-generates; no conflicts detected. Verify at launch on production domain |
| Paragraph length | PASS | Most paragraphs 1-3 sentences (AEO B7) |
| Section length | PASS | Sections under 300 words (AEO B8) |
| Methodology steps | PASS | Context introduced before steps (AEO B9) |
| Tone / voice | PASS | Direct, conversational, active voice (AEO B10) |
| No hedge language | PASS | No weak hedging detected (AEO C13) |
| Internal CTAs | PASS | Multiple internal navigation links and CTAs present (AEO E19) |
| Custom scripts risk | PASS | All 6 project scripts are low-to-medium risk; all vendor deps from official CDNs |
| No third-party unknown code | PASS | Zero scripts from unknown third-party repos |
| Favicon | PASS | Shortcut icon and Apple touch icon set (note: currently default Webflow on staging) |

## Needs Attention

### SEO -- Meta & Open Graph

| Issue | Severity | Detail |
|-------|----------|--------|
| Home missing SEO title | CRITICAL | Shows "Webflow - NEMLife.com NEW" (auto-generated placeholder) |
| Home missing meta description | CRITICAL | Empty — no description for SERP snippet |
| Inzichten title in English | CRITICAL | "Blog Insights" — generic English on a Dutch site |
| Ervaringen title in English | CRITICAL | "Testimonials" — generic English on a Dutch site |
| Inzichten missing meta description | CRITICAL | Empty |
| Ervaringen missing meta description | CRITICAL | Empty |
| Voorwaarden title too short | WARNING | "Voorwaarden" (12 chars) — no brand suffix |
| Voorwaarden missing meta description | WARNING | Empty |
| Blog article template SEO fields | CRITICAL | No CMS SEO title or description configured |
| Testimonial template SEO fields | CRITICAL | Falls back to item name only |
| Home OG tags missing | CRITICAL | No og:title, og:description, og:image |
| Inzichten OG title in English | CRITICAL | "Blog Insights" (English) |
| Ervaringen OG title in English | CRITICAL | "Testimonials" (English) |
| All pages missing OG image | WARNING | No og:image set on any page — no fallback in Site Settings |
| NEM Methode / Missie / Christel OG | WARNING | Title/description copied from SEO but no OG image |

### SEO -- Structure & Schema

| Issue | Severity | Detail |
|-------|----------|--------|
| Zero JSON-LD deployed | CRITICAL | No structured data on any page. 8 schema files prepared but not yet placed in Webflow |
| Missie has two H1s (both English) | CRITICAL | "In a world full of advice..." + "We break the code..." — needs single Dutch H1 |
| Inzichten H1 in English | CRITICAL | "From insight to direction" — should be Dutch |
| Ervaringen H1 duplicate + English | CRITICAL | Same "From insight to direction" as Inzichten |
| Christel missing H1 | CRITICAL | No H1 on page; name is H3 |
| Voorwaarden missing H1 | CRITICAL | No H1; "Terms & Conditions" is H2 in English |
| Blog template generic H1 | WARNING | All articles share "From insight to direction" — should bind to CMS title |
| Duplicate H2 on Home | WARNING | "Inzichten - artikelen die je verder helpen" appears twice |
| Duplicate H2s on NEM Methode | WARNING | "Wat maakt de NEM Methode uniek?" and "Wat merk je ervan..." each appear twice |
| H2 reads like body copy (NEM Methode) | WARNING | "Geen grote omwenteling - maar een verschuiving..." — demote or shorten |
| Heading order skipped (Blog template) | WARNING | H1 to H3 jump, breaking sequential order |
| llms.txt not deployed | WARNING | Returns 404. File prepared at schema/llms.txt |
| robots.txt blocks all crawlers | EXPECTED | `Disallow: /` — correct for staging, must change at launch |
| Sitemap not verified | WARNING | Webflow auto-generates; needs verification at launch with production domain |

### Technical -- Custom Code

| Issue | Severity | Detail |
|-------|----------|--------|
| Custom code hosted on developer repo | MEDIUM | `studiozissou/webflow-scripts` — bus-factor risk. Migrate to client-owned GitHub before launch |
| Google Fonts loading all weights | MEDIUM | Both Lato and Montserrat load all 10 weights each. Subset to only used weights |
| Swiper CLS risk | MEDIUM | Card height equalisation after render may cause minor layout shift. Add CLS-prevention CSS |
| 4 inline scripts unreviewed | LOW | Embedded in Webflow custom code sections. Review and document |
| Default Webflow favicon on staging | LOW | Replace with NEM Life branded favicon before launch |

### Content & Accessibility

| Issue | Severity | Detail |
|-------|----------|--------|
| 19 images missing alt text | CRITICAL | 49% of images (19/39) have no alt text. WCAG 2.1 AA violation and SEO penalty |
| Color contrast insufficient | FAIL | Multiple `<p>` elements fail WCAG AA contrast ratio on every page (desktop + mobile) |
| Back-to-top link no accessible name | FAIL | `<a href="#" class="back-to-top">` has no text or aria-label |
| Mobile menu button no accessible name | FAIL | Hamburger button has no aria-label (every page on mobile) |
| Card link aria-label mismatch | FAIL | `aria-label="Lees meer"` does not match visible article title text (7/9 pages) |
| Touch targets too small | WARNING | Swiper pagination dots on Home are too small for reliable touch |
| Voorwaarden misplaced content | WARNING | "Wat veel mensen denken (maar niet klopt)" and "Waarom deze aanpak anders werkt" may be from another page — verify |
| English headings on Dutch pages | CRITICAL | Mixed language signals weaken Dutch search rankings and confuse `inLanguage` data |
| Page title placeholder | CRITICAL | "NEMLife.com NEW" still set as page title |

### CMS Hygiene

| Issue | Severity | Detail |
|-------|----------|--------|
| All CMS content is Lorem ipsum | CRITICAL | Real Dutch content must be populated before launch |
| Collection name typo | MEDIUM | "Inzichtens" should be "Inzichten" (Dutch plural) |
| Tags field broken | MEDIUM | Only "tag 2" exists as an option; "tag 1" referenced but missing |
| Unnecessary taxonomy templates | LOW | `/themas` and `/ervaringen-categories` template pages are likely unnecessary |
| Nav/footer links point to `#` | CRITICAL | All navigation links are placeholder — must wire before launch |
| Designer comment: "Wire this up" | MEDIUM | Testimonials template has unfinished wiring |
| Key insights fields structure | LOW | 3 separate plain-text fields; consider multi-ref or rich text |
| Boolean curation switches | LOW | Essential insight / Show in Selected / Show in Popular — verify these are wired to conditional visibility |

## Missing or Broken

| Check | Detail |
|-------|--------|
| Analytics (GA4/GTM) | Not installed. No tracking of any kind |
| Cookie consent | Not installed. Required before analytics under GDPR (Netherlands) |
| JSON-LD structured data | Zero schemas deployed on any page |
| OG images | No Open Graph image on any page; no fallback configured |
| Home SEO title | Missing — showing auto-generated "Webflow - NEMLife.com NEW" |
| Home meta description | Empty |
| Inzichten meta description | Empty |
| Ervaringen meta description | Empty |
| Voorwaarden meta description | Empty |
| CMS SEO fields (blog template) | Not configured — articles have no SEO title or description |
| llms.txt | 404 — file prepared but not deployed |
| Publication/update timestamps | No dates visible on any page |
| Author bylines | No author attribution on blog articles |
| External citations | Zero outbound citations or research references |
| Hreflang | Not present (not needed currently; Dutch-only site) |
| Real CMS content | All collections contain Lorem ipsum only |
| Navigation links | All nav/footer links point to `#` |
| Custom favicon (staging) | Using default Webflow favicon |
| BreadcrumbList schema | Not implemented |

## Lighthouse Audits

### Desktop Scores

| Page | URL | Accessibility | SEO | Best Practices |
|------|-----|---------------|-----|----------------|
| Home | `/` | 89 | 58 | 100 |
| NEM Methode | `/nem-methode` | 93 | 66 | 100 |
| Missie | `/missie-nem-life` | 91 | 92 | 100 |
| Inzichten (listing) | `/inzichten` | 93 | 58 | 100 |
| Ervaringen (listing) | `/ervaringen` | 93 | 58 | 100 |
| Christel | `/link-in-bio/christel` | 93 | 66 | 100 |
| Voorwaarden | `/voorwaarden` | 92 | 58 | 100 |
| Blog article | `/inzichten/de-kracht-van-ondersteuning` | 92 | 58 | 100 |
| Testimonial | `/ervaringen/dexter` | 93 | 58 | 100 |

### Mobile Scores

| Page | URL | Accessibility | SEO | Best Practices |
|------|-----|---------------|-----|----------------|
| Home | `/` | 84 | 58 | 100 |
| NEM Methode | `/nem-methode` | 88 | 66 | 100 |
| Missie | `/missie-nem-life` | 86 | 66 | 100 |
| Inzichten (listing) | `/inzichten` | 88 | 58 | 100 |
| Ervaringen (listing) | `/ervaringen` | 88 | 58 | 100 |
| Christel | `/link-in-bio/christel` | 88 | 66 | 100 |
| Voorwaarden | `/voorwaarden` | 87 | 58 | 100 |
| Blog article | `/inzichten/de-kracht-van-ondersteuning` | 87 | 58 | 100 |
| Testimonial | `/ervaringen/dexter` | 88 | 58 | 100 |

### Score Summary

| Category | Desktop avg | Mobile avg |
|----------|------------|------------|
| Accessibility | 92 | 87 |
| SEO | 64 | 61 |
| Best Practices | 100 | 100 |

### Pages Audited

- Static pages: 7 of 7 (Home, NEM Methode, Missie, Inzichten listing, Ervaringen listing, Christel, Voorwaarden)
- CMS template samples: 2 items across 2 collections (1 blog article, 1 testimonial)

### Recurring Accessibility Issues

| Issue | Category | Frequency |
|-------|----------|-----------|
| Color contrast insufficient (WCAG AA) | A11y | 9/9 pages (desktop + mobile) |
| Back-to-top link missing accessible name | A11y | 9/9 pages (desktop + mobile) |
| Mobile menu button missing accessible name | A11y | 9/9 pages (mobile only) |
| Card link aria-label/content mismatch | A11y | 7/9 pages |
| Touch targets too small (Swiper dots) | A11y | 1/9 pages (Home) |
| Heading order skipped | A11y | 1/9 pages (Blog article template) |

### Recurring SEO Issues

| Issue | Category | Frequency |
|-------|----------|-----------|
| robots.txt blocks indexing | SEO | 9/9 pages (expected for staging) |
| Missing meta description | SEO | 7/9 pages |
| Missing canonical tags | SEO | Not verifiable on staging |
| Invalid robots.txt flagged | SEO | Multiple pages |
| Missing OG/social tags | SEO | 9/9 pages |

### Recurring Best Practices Issues

No Best Practices issues detected. All 9 pages scored 100 on both desktop and mobile.

## SEMRush Organic Intelligence

Section not yet run. Re-invoke `/site-audit` with Layer A to populate.

## Competitor Benchmark

Section not yet run. Requires Layer A+B.

## AEO Score

### Category Breakdown

| Category | Score | Detail |
|----------|-------|--------|
| Schema (A1-A4) | 0/4 | CRITICAL — No JSON-LD on any page. No FAQPage, HowTo, Organization, or Person schema |
| Answer Structure (B5-B10) | 3/6 | NEEDS WORK — FAQ answers not frontloaded; questions formatted as H3 not H2. Paragraphs, section length, methodology steps, tone, and voice all pass |
| Freshness (C11-C13) | 0.5/3 | CRITICAL — No publication or update dates visible; no freshness indicators. No hedge language (pass) |
| Authority (D14-D17) | 0.5/4 | WEAK — No data/research/statistics cited; Christel mentioned but no byline or credentials page; zero external citations; NEM Methode has cite-magnet potential but lacks schema |
| Technical (E18-E20) | 1/3 | CRITICAL — No alt text on images; robots.txt blocks all crawlers. Internal CTAs pass |

**Overall AEO Score: 5/20 (Grade D) — Below AEO baseline**

**Maturity Level:** Pre-launch / Non-optimised. The site is effectively invisible to AI answer engines due to the robots.txt blocker and absent structured data. Phase 1 fixes (schema + robots.txt + timestamps + alt text) are estimated to lift the score from 5/20 (D) to approximately 13/20 (B).

### Blocker

`robots.txt: Disallow: /` — Site completely blocked from all crawlers (Google, Bing, Perplexity, ChatGPT). AEO is impossible until this is fixed. Expected for staging but must change at launch.

## Recommended Next Steps

### Justification tags

- **SEO** — search ranking, crawlability, SERP click-through rate
- **AEO** — AI answer engine citations (ChatGPT, Perplexity, SGE)
- **Perf** — page speed, Core Web Vitals, LCP
- **De-risk** — business continuity, dependency removal, compliance
- **Trust** — credibility signals (social proof, credentials, authority)
- **A11y** — accessibility, WCAG 2.1 AA compliance
- **Conv** — conversion (forms, funnels, CTAs)
- **Ops** — operational efficiency, CMS hygiene, handover quality

### P0 -- Week 1 -- Quick wins (< 1hr each, high impact, no design decisions)

Small, self-contained fixes that can be shipped immediately. No design input or client copy needed.

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 1 | **Add `aria-label="Terug naar boven"` to back-to-top link** | TBD | **A11y** — link has no accessible name; flagged on all 9 pages | -- | AUTO |
| 2 | **Add `aria-label="Menu"` to mobile hamburger button** | TBD | **A11y** — button has no accessible name on mobile | -- | AUTO |
| 3 | **Remove or fix `aria-label="Lees meer"` on card links** | TBD | **A11y** — aria-label does not match visible text content (7/9 pages) | -- | AUTO |
| 4 | **Set Home SEO title** ("NEM Life \| Doorbreek het patroon dat je steeds weer tegenhoudt") | TBD | **SEO** — currently shows placeholder "Webflow - NEMLife.com NEW" | -- | AUTO |
| 5 | **Set Home meta description** | TBD | **SEO** — empty; critical for SERP click-through | -- | AUTO |
| 6 | **Set Inzichten SEO title** ("Inzichten \| Artikelen over patronen, emoties en groei - NEM Life") | TBD | **SEO** — currently "Blog Insights" (English on Dutch site) | -- | AUTO |
| 7 | **Set Ervaringen SEO title** ("Ervaringen \| Wat anderen zeggen over de NEM Methode - NEM Life") | TBD | **SEO** — currently "Testimonials" (English on Dutch site) | -- | AUTO |
| 8 | **Set Voorwaarden SEO title** ("Voorwaarden - NEM Life") | TBD | **SEO** — too short, no brand suffix | -- | AUTO |
| 9 | **Set Voorwaarden meta description** | TBD | **SEO** — empty | -- | AUTO |
| 10 | **Fix page title placeholder "NEMLife.com NEW"** | TBD | **SEO** — placeholder title visible in browser tabs and SERPs | -- | AUTO |
| 11 | **Rename "Inzichtens" collection to "Inzichten"** | TBD | **Ops** — Dutch plural typo; affects developer clarity | -- | AUTO |
| 12 | **Fix Tags field — add missing option values** | TBD | **Ops** — only "tag 2" exists; "tag 1" referenced but missing | -- | AUTO |

**P0 total: TBD hours.**

---

### P1 -- Week 1-2 -- Critical risk + highest-ROI (schema, de-risk)

Items that carry significant SEO/AEO risk or have the highest return on effort. Schema deployment, heading structure fixes, and infrastructure de-risking.

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 13 | **Deploy sitewide JSON-LD (Organization + WebSite)** in Site Settings > Head Code | TBD | **SEO, AEO** — zero structured data currently; schema prepared at `schema/nem-life-sitewide-2026-05-07.json` | -- | AUTO |
| 14 | **Deploy Home JSON-LD (WebPage + FAQPage)** in Page Settings > Head Code | TBD | **SEO, AEO** — enables FAQ rich results | -- | AUTO |
| 15 | **Deploy NEM Methode JSON-LD (HowTo + FAQPage)** in Page Settings > Head Code | TBD | **SEO, AEO** — enables HowTo + FAQ rich results | -- | AUTO |
| 16 | **Deploy Missie JSON-LD (AboutPage)** in Page Settings > Head Code | TBD | **SEO, AEO** — structured about page | -- | AUTO |
| 17 | **Deploy Christel JSON-LD (Person)** in Page Settings > Head Code | TBD | **SEO, AEO, Trust** — author/founder entity | -- | AUTO |
| 18 | **Deploy Blog Article JSON-LD (Article)** via CMS Embed element | TBD | **SEO, AEO** — enables article rich results in SERPs | -- | AUTO |
| 19 | **Deploy Testimonial JSON-LD (CreativeWork + Review)** via CMS Embed element | TBD | **SEO, AEO** — enables review snippets | -- | AUTO |
| 20 | **Fix Missie page: replace two English H1s with single Dutch H1** | TBD | **SEO** — two H1s both in English on a Dutch page | -- | SEMI |
| 21 | **Fix Inzichten H1: translate to Dutch** ("Inzichten -- artikelen die je verder helpen") | TBD | **SEO** — English H1 "From insight to direction" on Dutch site | -- | SEMI |
| 22 | **Fix Ervaringen H1: set unique Dutch H1** ("Ervaringen met de NEM Methode") | TBD | **SEO** — duplicate English H1 shared with Inzichten | -- | SEMI |
| 23 | **Fix Christel page: promote name to H1** | TBD | **SEO** — no H1 present; "Christel Reus" is currently H3 | -- | SEMI |
| 24 | **Fix Voorwaarden: add Dutch H1, translate "Terms & Conditions" H2** | TBD | **SEO** — no H1, English heading on Dutch page | -- | SEMI |
| 25 | **Configure CMS SEO fields for blog template** (bind title + description) | TBD | **SEO** — articles fall back to item name only; no meta description | -- | SEMI |
| 26 | **Deploy robots.txt for production domain** | TBD | **SEO, AEO** — current `Disallow: /` blocks all crawlers. Production version prepared at `schema/robots.txt` | -- | AUTO |
| 27 | **Migrate custom code to client-owned GitHub repo** | TBD | **De-risk** — scripts hosted on developer's `studiozissou/webflow-scripts` repo; bus-factor risk | -- | MANUAL |
| 28 | **Set up custom 404 page** (designer comment: "Add 404") | TBD | **Trust, De-risk** — unresolved designer comment | -- | SEMI |

**P1 total: TBD hours.**

---

### P2 -- Week 2-3 -- Client-visible design changes + rich results

Changes that affect visual design, require client input on assets or palette, or enable rich SERP features.

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 29 | **Create and upload default OG image (1200x630px)** + set in Site Settings | TBD | **SEO, Conv** — no OG image on any page; poor social sharing appearance | -- | SEMI |
| 30 | **Set page-specific OG images** for Home, NEM Methode, Missie | TBD | **SEO, Conv** — improves social sharing click-through | -- | SEMI |
| 31 | **Bind blog article OG image to CMS Main Image field** | TBD | **SEO** — automates OG image for all blog articles | -- | AUTO |
| 32 | **Fix color contrast issues (WCAG AA)** across all pages | TBD | **A11y** — every page fails contrast ratio on multiple `<p>` elements | -- | SEMI |
| 33 | **Fix duplicate H2 on Home** ("Inzichten - artikelen die je verder helpen" appears twice) | TBD | **SEO** — heading hierarchy pollution | -- | SEMI |
| 34 | **Fix duplicate H2s on NEM Methode** ("Wat maakt de NEM Methode uniek?" + "Wat merk je ervan..." each appear twice) | TBD | **SEO** — heading hierarchy pollution | -- | SEMI |
| 35 | **Demote or shorten body-copy H2 on NEM Methode** ("Geen grote omwenteling...") | TBD | **SEO** — reads like paragraph text, not a heading | -- | SEMI |
| 36 | **Fix Voorwaarden misplaced content sections** (verify "Wat veel mensen denken" + "Waarom deze aanpak anders werkt" belong on this page) | TBD | **Ops** — content may have been pasted from another page | -- | MANUAL |
| 37 | **Wire testimonials template** (designer comment: "Wire this up") | TBD | **Conv, Ops** — unresolved designer comment on testimonials CMS template | -- | SEMI |
| 38 | **Reduce Google Fonts to used weights only** | TBD | **Perf** — Lato + Montserrat each loading all 10 weights; subset to only used weights | -- | SEMI |
| 39 | **Add Swiper CLS-prevention CSS** | TBD | **Perf** — card height equalisation after render may cause layout shift | -- | AUTO |
| 40 | **Fix heading order on blog template** (H1 to H3 skip) | TBD | **A11y, SEO** — headings jump levels, breaking sequential order | -- | SEMI |
| 41 | **Fix Swiper pagination dot touch targets** | TBD | **A11y** — dots too small for reliable touch interaction on Home | -- | SEMI |
| 42 | **Replace default Webflow favicon with NEM Life branding** | TBD | **Trust** — currently using generic Webflow favicon | -- | SEMI |

**P2 total: TBD hours.**

---

### P3 -- Week 3-4 -- Editorial foundation + operational stability

Content population, navigation wiring, CMS cleanup, and operational items that establish the editorial baseline.

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 43 | **Add alt text to all 19 images missing it** | TBD | **A11y, SEO, AEO** — 49% of images lack alt text; WCAG 2.1 AA violation | -- | SEMI |
| 44 | **Populate CMS with real Dutch content** (replace all Lorem ipsum) | TBD | **Conv, SEO** — all collections contain placeholder text only | -- | MANUAL |
| 45 | **Wire up all navigation and footer links** (currently point to `#`) | TBD | **Conv, Ops** — site navigation is non-functional | -- | SEMI |
| 46 | **Remove/hide unnecessary taxonomy template pages** (`/themas`, `/ervaringen-categories`) | TBD | **Ops** — taxonomy lookup collections likely do not need public template pages | -- | SEMI |
| 47 | **Configure CMS blog SEO meta descriptions per article** | TBD | **SEO** — each article needs a unique meta description | -- | MANUAL |
| 48 | **Add publication and update timestamps to pages** | TBD | **AEO** — no dates visible anywhere; freshness signals score 0.5/3 | -- | SEMI |
| 49 | **Bind blog template H1 to CMS article title** | TBD | **SEO** — all blog articles currently share generic English H1 | -- | SEMI |
| 50 | **Configure testimonial template SEO fields** | TBD | **SEO** — falls back to item name only | -- | SEMI |
| 51 | **Review and document 4 inline Webflow scripts** | TBD | **Ops** — inline scripts in custom code sections not yet inspected | -- | MANUAL |
| 52 | **Verify mobile layouts match design** (Home mobile rebuild noted) | TBD | **Conv, Trust** — design vs. live mismatch flagged in client context | -- | MANUAL |
| 53 | **Verify boolean curation switches are wired** (Essential insight / Show in Selected / Show in Popular) | TBD | **Ops** — ensure switches connect to conditional visibility in Collection Lists | -- | MANUAL |

**P3 total: TBD hours.**

---

### P4 -- Ongoing (retainer) -- Growth + content

Growth optimisation, AEO remediation, analytics setup, and ongoing content tasks. Retainer-territory work.

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 54 | **Deploy llms.txt** (via Cloudflare Workers or Webflow redirect) | TBD | **AEO** — file prepared at `schema/llms.txt`; enables AI engine discoverability | -- | AUTO |
| 55 | **Set up GA4/GTM + cookie consent mechanism** | TBD | **De-risk, Conv** — no analytics installed; GDPR requires consent before tracking (Netherlands) | -- | MANUAL |
| 56 | **AEO remediation: restructure FAQ to answer-first format** (bold 1-sentence answer, then explanation) | TBD | **AEO** — FAQ answers not frontloaded; estimated +2 points on AEO score | -- | SEMI |
| 57 | **AEO remediation: promote FAQ headings from H3 to H2** | TBD | **AEO** — questions formatted as H3 instead of H2; AI engines favour H2 questions | -- | SEMI |
| 58 | **Add author credentials and bylines** ("Door Christel Reus, PRI-gecertificeerd therapeut") | TBD | **AEO, Trust** — no author attribution on any page; authority score 0.5/4 | -- | SEMI |
| 59 | **Add external citations to NEM Method page** (3-5 research references) | TBD | **AEO, Trust** — zero outbound citations; weakens authority signal | -- | MANUAL |
| 60 | **Add BreadcrumbList schema** | TBD | **SEO, AEO** — not yet implemented; enhances SERP appearance | -- | AUTO |
| 61 | **Enable English locale when ready** (add hreflang, duplicate content) | TBD | **SEO** — locales configured but hidden; needs full implementation when activated | -- | MANUAL |
| 62 | **Monitor CLS in Google Search Console** post-launch | TBD | **Perf** — Swiper height equalisation flagged as medium CLS risk | -- | MANUAL |
| 63 | **Submit sitemap to Google Search Console** | TBD | **SEO** — verify sitemap at `nemlife.com/sitemap.xml`; ensure `/page-starter` and `/style-guide` excluded | -- | MANUAL |
| 64 | **Convert statement headings to question format** (NEM Method + Home) | TBD | **AEO** — question-format headings improve AI answer extraction | -- | SEMI |
| 65 | **Add social proof signals** (testimonial snippets, certification logos on key pages) | TBD | **Trust, Conv** — no social proof outside testimonials listing page | -- | SEMI |
| 66 | **Fill FILL_IN fields in JSON-LD schemas** (Organization logo URL, foundingDate, sameAs, contactPoint email; Person image + social links) | TBD | **SEO, AEO** — schema files contain placeholder FILL_IN values | -- | SEMI |
| 67 | **Verify canonical tags point to `https://nemlife.com/`** at launch | TBD | **SEO** — must confirm no `www` or staging domain in canonicals | -- | MANUAL |
| 68 | **301 redirect from NEMLife.com TEMP to NEMLife.com NEW** | TBD | **SEO, De-risk** — current live site is on sibling Webflow project; needs migration | -- | MANUAL |
| 69 | **Consider restructuring Key insights CMS fields** (3 plain-text fields to multi-ref or rich text) | TBD | **Ops** — current structure may be inflexible for future content | -- | MANUAL |
| 70 | **Shorten overly long H2 on NEM Methode** | TBD | **SEO** — "Geen grote omwenteling..." is too long for a heading | -- | SEMI |

**P4 total: TBD hours.**

## Automation Summary

| Type | Count | Description |
|------|-------|-------------|
| **AUTO** | 22 tasks | Can be executed immediately by Claude Code -- aria-labels, SEO titles/descriptions, schema deployment, collection rename, CLS CSS, robots.txt, llms.txt, OG image binding, BreadcrumbList schema |
| **SEMI** | 30 tasks | Need user confirmation or design input -- OG images need design, color contrast needs palette decisions, H1 rewrites need client approval, content needs client copy, heading restructuring |
| **MANUAL** | 18 tasks | Require human action -- Google Search Console setup, analytics installation, client content population, effort estimation, code migration coordination, design verification, inline script review |

## Custom Code Inventory

| # | Script | Source | Version | Risk | Notes |
|---|--------|--------|---------|------|-------|
| 1 | Google WebFont Loader | ajax.googleapis.com | 1.6.26 | Low | Stable, widely-used. Loads Lato + Montserrat |
| 2 | jQuery | d3e54v103j8qbb.cloudfront.net | 3.5.1 | Low | Webflow's bundled jQuery. Required by Webflow runtime. Cannot remove |
| 3 | Webflow Runtime | cdn.prod.website-files.com | N/A | Low | Webflow-managed. Auto-generated |
| 4 | GSAP Core | cdn.jsdelivr.net/npm/gsap@3 | 3.x | Low | Industry-standard animation library. CDN-loaded via init.js |
| 5 | GSAP ScrollTrigger | cdn.jsdelivr.net/npm/gsap@3 | 3.x | Low | GSAP plugin. Loaded after GSAP core |
| 6 | Swiper | cdn.jsdelivr.net/npm/swiper@11 | 11.x | Low | Carousel library. CDN-loaded via init.js |

### Local Project Scripts (via jsDelivr from `studiozissou/webflow-scripts`)

| File | Purpose | Dependencies | Lines | Risk |
|------|---------|-------------|-------|------|
| `init.js` | Script loader / entry point. Loads GSAP, ScrollTrigger, Swiper from CDN, then loads all project modules | None (loader) | 64 | Low |
| `card-links.js` | Hoists `<a>` href from button inside `[data-button="card"]` cards to wrap entire card in a link. Prevents nested `<a>` tags by swapping inner link to `<div>`. Adds hover forwarding | None | 69 | Low |
| `method-cars-fade.js` | Staggered fade-in animation for children of `.method-cars_wrap` on scroll | GSAP, ScrollTrigger | 25 | Low |
| `swiper-init.js` | Initialises hero slider (fade + autoplay) and article card sliders (multi-slide, scoped navigation/pagination, card height equalisation). Removes empty CMS slides | Swiper 11 | 111 | Medium |
| `blog-share.js` | Email share button for blog posts. Opens `mailto:` with Dutch/English subject based on `?reflang=` param | None | 34 | Low |
| `back-to-top.js` | Smooth-scrolls to top on `.back-to-top` click | None | 10 | Low |

**Total custom code: 313 lines across 6 files.**

### Stylesheets

| # | Stylesheet | Source | Notes |
|---|-----------|--------|-------|
| 1 | Webflow shared CSS | cdn.prod.website-files.com | Auto-generated by Webflow |
| 2 | Webflow page CSS | cdn.prod.website-files.com | Auto-generated, optimised |
| 3 | Google Fonts | fonts.googleapis.com | Lato (all weights) + Montserrat (all weights). Consider subsetting to only used weights |

## Custom Code Migration Plan

### Current Setup

All 6 custom JS files are hosted via **jsDelivr CDN** pointing to `studiozissou/webflow-scripts` (commit-pinned at `@75de97a`). This is the developer's repository, not client-owned.

### Risk

If the developer's GitHub account is compromised, suspended, or the repo is deleted, the client's site scripts break immediately. The code is commit-pinned (not floating), which mitigates version drift but not availability risk.

### Migration Steps

1. **Create client GitHub repo** -- e.g. `nem-life/webflow-scripts` or `nem-life/nem-life-scripts`
2. **Copy `/projects/nem-life/src/` files** to the new repo root (or `src/` directory)
3. **Update jsDelivr URLs** in Webflow custom code from `studiozissou/webflow-scripts@{hash}/projects/nem-life/src/` to `nem-life/nem-life-scripts@{hash}/src/`
4. **Pin to a specific commit or tag** (maintain current practice)
5. **Grant developer collaborator access** for ongoing maintenance
6. **Test all pages** after URL swap -- hero slider, article sliders, card links, back-to-top, blog share, method cars animation

### External Script Sources

| Source Domain | Purpose | Risk |
|---------------|---------|------|
| googleapis.com | Google WebFont Loader | Low -- Google-hosted, stable |
| jsdelivr.net | GSAP, ScrollTrigger, Swiper, project scripts | Low -- major CDN, npm-backed |
| cloudfront.net | jQuery (Webflow) | Low -- Webflow-managed |
| website-files.com | Webflow runtime + CSS | Low -- Webflow infrastructure |

**Priority:** Medium -- not urgent for staging, but should be completed before go-live.

## Sub-audits

- [audits/structure.md](../audits/structure.md) -- Technical + Lighthouse audit (infrastructure, scores, recurring issues)
- [audits/seo.md](../audits/seo.md) -- SEO + Schema audit (meta tags, headings, JSON-LD, sitemap, robots.txt)
- [audits/content.md](../audits/content.md) -- Content + Code Inventory audit (images, CMS, custom code, migration)
- [audits/aeo.md](../audits/aeo.md) -- AEO audit (AI answer engine optimisation, 20-point scoring)
- [brand/voice.md](../brand/voice.md) -- Brand voice guidelines (tone ladder, vocabulary, content principles)
- [brand/icp.md](../brand/icp.md) -- Ideal Customer Profile (primary "Anna" segment + secondary men segment)
- [schema/](../schema/) -- All prepared JSON-LD schema files:
  - `nem-life-sitewide-2026-05-07.json` (Organization + WebSite)
  - `nem-life-home-faq-2026-05-07.json` (WebPage + FAQPage)
  - `nem-life-nem-method-howto-2026-05-07.json` (HowTo + WebPage)
  - `nem-life-nem-method-faq-2026-05-07.json` (FAQPage)
  - `nem-life-mission-2026-05-07.json` (AboutPage)
  - `nem-life-christel-person-2026-05-07.json` (Person)
  - `nem-life-blog-article-2026-05-07.json` (Article)
  - `nem-life-testimonial-review-2026-05-07.json` (CreativeWork + Review)
  - `nem-life-schema-guide-2026-05-07.md` (deployment guide)
  - `robots.txt` (production-ready)
  - `llms.txt` (prepared, not deployed)

*Report generated by automated site audit. Manual verification recommended for items marked "NEEDS VERIFY".*
