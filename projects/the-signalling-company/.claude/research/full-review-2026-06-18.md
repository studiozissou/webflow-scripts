# TSC Full Review — 18 June 2026

## 1. ICP Comparison: SEO Doc vs Our Review

The SEO doc uses 5 named personas. Here's how they map to our 4 ICPs:

| SEO Doc Persona | Our ICP | Match? | Notes |
|-----------------|---------|--------|-------|
| Karen Frost (CFO, Leasing) | Fleet Leasing Companies | Yes | Good match. SEO doc adds the CFO/financial angle explicitly. |
| Thomas Leitner (Safety Engineer, OEM/Integrator) | Rolling Stock OEMs | Partial | Our ICP is broader — covers product managers and procurement too, not just engineers. SEO doc is right that Thomas is the deepest technical buyer. |
| Brecht de Leuw (Fleet Manager, OTM) | Fleet Operators | Yes | SEO doc narrows to on-track machines specifically. Our ICP covers freight + passenger + OTM. |
| John Foxhall (Executive, Transport Commission) | Infrastructure Managers | Partial | Our ICP is more operational (signalling engineers at Infrabel/ProRail). SEO doc's "executive director" persona is more policy-level. Both valid — different stages of the buying journey. |
| Sanne van Dijk (PM, Infrastructure) | Infrastructure Managers | Yes | Good match for the project delivery side. |

**Verdict:** The profiles align well. The SEO doc is more granular (5 vs 4) and more persona-driven (named characters with specific search behaviour), which is better for keyword targeting. Our review focuses more on what each ICP looks for on the website and what language resonates — better for copy feedback. Together they're complementary. No gaps.

**One addition from our review that the SEO doc misses:** The SEO doc doesn't address the emotional/trust dimension — why a buyer would choose a younger company over an incumbent. Our review flags this as the central objection TSC needs to defeat. The SEO doc's E-E-A-T section partially covers this but from a Google perspective, not a human buyer perspective.

---

## 2. SEO-Informed Copy Feedback

Cross-referencing the SEO doc's keyword-to-page map against the actual copy:

### What the copy gets right (per SEO doc)
- **TCO messaging is present** on the Customers page — "reduce the total lifetime cost" appears. SEO doc wants this front and centre.
- **Software-defined framing exists** in the RailOS page — but only implicitly. SEO doc identifies this as the #1 unclaimed keyword territory.
- **Class B system coverage** is thorough — TBL1+, PZB, KVB all have dedicated descriptions. SEO doc confirms these are low-competition keywords.

### What the copy is missing (per SEO doc)

| SEO recommendation | Current copy gap | Fix |
|---|---|---|
| "Software-defined railway signalling" as primary keyword for RailOS page | The phrase never appears in the copy. RailOS is described as "portable and scalable real-time operating system" — accurate but not SEO-optimised. | Add "software-defined" language to the RailOS hero and first paragraph. |
| ETCS Products page: lead with specs + certification + retrofit use case | Current ETCS description leads with "based on our iEVC-RailOS safe computing platform" — internal architecture language. | Restructure: lead with certification status, supported levels, then architecture as "how." |
| TOBA: define concept before naming product | Copy leads with "TOBA Box" without explaining what TOBA (Telecom On-Board Architecture) means. SEO doc flags this as Category 2 acronym — concept first. | First sentence should define what an FRMCS onboard gateway does, then introduce TSC's TOBA Box as the product. |
| Customers page: "ETCS case study" + measurable outcomes | Copy has narrative paragraphs but no structured challenge/solution/result format. No metrics beyond fleet size. | Add measurable outcomes. Structure as case studies, not project descriptions. |
| About page: surface ALL E-E-A-T signals | Copy mentions founding year and RailOS launch. Missing: RailTech Innovation Award, Skoda Group ownership, team credentials, certification references, media coverage. | Add all of these. The SEO doc's E-E-A-T table (Section 5.1) is a ready-made checklist. |
| FAQ content for AI Overview citation | No FAQ content exists yet. SEO doc identifies 8 priority questions to answer on the site. | Build FAQ CMS collection. Populate with the 8 questions from Section 6.2 of the SEO doc. |
| RailOS App Store: define concept in first 100 words | Current copy opens with "Select your RailOS Application" — no definition of what a Rail App Store is or why it matters. | Add a 2-sentence definition paragraph before the app tiles. |

### Keyword placement audit (quick pass)

| Page | Primary keyword (from SEO doc) | Present in current H1? | Present in first 100 words? |
|---|---|---|---|
| Home | ETCS onboard system | N/A (no copy) | N/A |
| RailOS | software-defined railway signalling | No — H1 is "RailOS Our Core Technology" | No |
| Products | ETCS onboard products | No — no unified H1 | Partially |
| ETCS | ETCS onboard unit | No — described as "ETCS App" and "iEVC" | No |
| TOBA | FRMCS onboard gateway | No — "TOBA Box" | No |
| Customers | ETCS case study | No — "Our Customers" | No |
| Services | ETCS integration services | No — "Our Services" | No |
| About | railway signalling company | No — "About The Signalling Company" | Partially |

**Summary:** None of the current H1s match the SEO doc's primary keywords. This is the single biggest technical SEO fix — rename H1s to include target keywords while keeping them readable.

---

## 3. Launch Testing Plan / Checklist

### Pre-Launch (before going live)

**Technical SEO**
- [ ] All pages have unique, keyword-driven URLs (per SEO doc Section 8)
- [ ] 301 redirects from all old WordPress URLs mapped and implemented
- [ ] robots.txt allows crawling; XML sitemap generated
- [ ] Canonical tags on all pages
- [ ] One H1 per page; logical heading hierarchy (H1 > H2 > H3)
- [ ] Unique title tag per page (primary keyword + brand, 50-60 chars)
- [ ] Unique meta description per page (150-160 chars, includes primary keyword)
- [ ] Images: WebP format, descriptive alt text, explicit width/height
- [ ] Schema markup: Organization (Home), Product (product pages), FAQPage (FAQ), Article (Insights), BreadcrumbList (sub-pages)
- [ ] GA4 installed and tracking
- [ ] Google Search Console verified
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

**Content**
- [ ] Every page has a benefit-led H1 + subheading
- [ ] Homepage: hero, trust bar, 3 value props, featured case study, CTA
- [ ] Case studies have structured format: challenge/solution/result + metrics
- [ ] About page: E-E-A-T signals visible (award, Skoda Group, certifications, team bios)
- [ ] Leadership page: professional bios with LinkedIn links
- [ ] Services: each service has description + process + specific CTA
- [ ] Contact form on every main sales page (Products, Services, Customers, RailOS)
- [ ] Gated content: at least one downloadable (brochure/datasheet) with email capture
- [ ] FAQ category page + 1 template page built (content to be added post-launch)
- [ ] News/Insights: at least 2-3 migrated articles live at launch

**Functional**
- [ ] All internal links work (no 404s)
- [ ] Contact form submissions reach correct inbox
- [ ] Gated content download flow works (email → file)
- [ ] Cookie consent banner functional and GDPR-compliant
- [ ] Legal/Privacy page complete with correct company registration
- [ ] Mobile responsive: test all pages on phone + tablet
- [ ] 404 page works and has navigation back to key pages
- [ ] Favicon and OG images set

**Performance**
- [ ] PageSpeed Insights: mobile score > 80
- [ ] No render-blocking resources in critical path
- [ ] Fonts loading correctly (Aptos via Adobe Fonts API or fallback)

### Post-Launch (first 2 weeks)

- [ ] Submit XML sitemap to Google Search Console
- [ ] Verify all pages indexed (site:thesignallingcompany.com)
- [ ] Run Screaming Frog crawl — check for broken links, missing meta tags, redirect chains
- [ ] Verify 301 redirects resolve correctly (especially RailTech, Railway Gazette backlinks)
- [ ] Check GA4 tracking on all pages
- [ ] Record baseline keyword rankings for top 20 target terms
- [ ] Monitor Core Web Vitals in GSC for 2 weeks
- [ ] Test contact form on mobile

### Post-Launch (month 1-3)

- [ ] Publish first Insights article: "ETCS retrofit cost"
- [ ] Publish second Insights article: "What is software-defined railway signalling?"
- [ ] Populate FAQ CMS with initial questions (from SEO doc Section 6.2)
- [ ] Request backlinks from Lineas and Skoda Group
- [ ] Subscribe to SEMrush or Ahrefs for keyword tracking
- [ ] Monthly SEO review (Will's reporting tool)
- [ ] Optimise migrated blog articles with keywords and tags

---

## 4. Recommended Navigation Structure

Based on the content, SEO keyword groups, and what we discussed on the call (minimal menu, 2-3 top-level items with sub-menus):

```
[Logo → Home]

RailOS & Products          Customers & Projects       Company
├── RailOS (platform)      ├── Customers (by type)    ├── About Us
├── Products               ├── Projects               ├── Leadership
│   ├── ETCS               └── Case Studies*          ├── Careers
│   ├── TOBA Box                                      ├── Insights & News
│   ├── PZB                Services                   └── Contact
│   ├── KVB                ├── Retrofit Assessment
│   └── TBL1+              ├── Homologation                    [Contact CTA button]
├── RailOS Apps             ├── Installation
├── RailOS Devices          ├── Training
├── Open RailOS             └── Maintenance
└── RailOS App Store
```

**Simplified alternative (3 items + CTA):**

```
[Logo → Home]

Solutions ▾               Customers ▾            About ▾              [Contact]
├── RailOS                 ├── By Segment         ├── Our Story
├── ETCS                   ├── Lineas Project     ├── Leadership
├── TOBA Box               └── Skoda Project      ├── Careers
├── PZB / KVB / TBL1+                            └── Insights & News
├── Open RailOS            Services ▾
├── App Store              ├── Assessment
└── RailOS Devices         ├── Homologation
                           ├── Installation
                           └── Maintenance
```

**My recommendation:** Go with the simplified version. "Solutions" groups everything technical under one umbrella. "Customers" combines social proof + services (they're the same buyer journey — "who uses this?" → "what do you do for them?"). "About" is standard. Contact as a persistent CTA button.

FAQ does NOT appear in nav (agreed on the call). Legal/Privacy goes in footer only.

---

## 5. Content Delivery Timeline for July 2 Live Date

Working backwards from July 2:

| Date | Milestone | Owner | What's needed |
|------|-----------|-------|---------------|
| **Thu 19 Jun** | Content feedback email sent | Will | ✅ This email |
| **Fri 20 Jun** | Final brand book uploaded to Teams folder | Romain | Correct version, not the draft |
| **Fri 20 Jun** | All remaining page copy finalised | Romain + Jalab | Products (PZB, KVB, TBL1+, wSTM), Homepage, Leadership bios, Careers, FAQ structure |
| **Fri 20 Jun** | Adobe Fonts API key requested | Romain → IT | For Aptos font in Webflow |
| **Mon 23 Jun** | Build starts | Will | Template setup, global styles, nav, footer |
| **Mon 23 Jun** | Homepage copy received (CRITICAL) | Romain | Hero headline/subheading, 3 value props, featured case study text |
| **Tue 24 Jun** | Product photos/images delivered | Romain | Product shots, team photos, any diagrams (RailOS architecture, device ecosystem) |
| **Wed 25 Jun** | First build preview shared | Will | Homepage + RailOS + Products + About (skeleton with real content) |
| **Thu 26 Jun** | Romain reviews first preview, sends corrections | Romain | Content edits, image swaps, layout feedback |
| **Fri 27 Jun** | Remaining pages built | Will | Services, Customers/Projects, Open RailOS, App Store, Careers, Contact, Legal, 404 |
| **Mon 30 Jun** | Full site review | Romain + Will | All pages complete, all content in place |
| **Mon 30 Jun** | Meta titles + descriptions written | Romain (using SEO keyword map) | One per page, following SEO doc Section 3.2 |
| **Tue 1 Jul** | Final fixes + QA | Will | Bug fixes, mobile check, performance check, schema markup, analytics |
| **Tue 1 Jul** | DNS + domain setup | Will + Romain/IT | Point domain to Webflow |
| **Wed 2 Jul** | GO LIVE | Both | Submit sitemap to GSC, verify redirects, monitor |

### Critical path items (if these slip, launch slips)

1. **Homepage copy** — must arrive by Mon 23 Jun at latest. This is the hardest page and blocks the entire build direction (layout, tone, visual hierarchy).
2. **Product page copy** — PZB, KVB, TBL1+, wSTM descriptions. Jalab needs to finish these by Fri 20 Jun.
3. **Photos** — without product/team imagery, the site looks empty. Even a handful of installation photos + team headshots is enough for launch.
4. **Brand book** — final version needed before build starts. Colour palette, typography, logo usage.

### What can wait until after launch

- FAQ content (template built, content added over summer)
- Insights article optimisation (12-15 old articles migrated and optimised post-launch)
- Gated content PDFs (brochures, datasheets — add as they become available)
- CRM integration (Q4 per Romain)
- Customer testimonial quotes (request from Lineas/Skoda in parallel)

---

## 6. Meeting Notes Review — Did I Miss Anything?

Comparing my Notion meeting notes against all the topics covered:

### Captured well
- File/folder access (External Collaboration folder on Teams)
- Branding assets (brand book not final, censored photos in folder 3, videos)
- SEO document overview and key sections for Will
- Monthly SEO reporting tool discussion
- Sitemap walkthrough
- Customers vs Projects page debate (deferred)
- Products structure (apps-only vs hardware+app)
- Content delays (Jalab pulled to sales)
- CTA strategy (contact form, gated content, CRM Q4)
- FAQ strategy (CMS collection, per-page + landing page)
- Leadership page + E-E-A-T signals
- Navigation menu (minimal, deferred until content review)
- Timeline (first version end of next week, go-live early July)
- Adobe Fonts / Aptos font API key

### Potentially missed or worth adding

1. **Censored photos detail** — The meeting notes mention photos censored by the installer partner. Worth flagging explicitly: do NOT use any images from folder 3 without checking the TXT file. This is a legal/contractual issue, not just a preference.

2. **Video placements** — Notes mention two videos but the specific placements discussed could be more explicit:
   - Self-installation timelapse video → Services page (Installation & Commissioning)
   - Corporate/workshop visit video → About page or Homepage

3. **Romain acknowledged SEO doc is AI-generated** — Worth noting for context when reviewing. Means keyword volumes are estimated, not from tools. Validate with SEMrush post-launch.

4. **Security warning from SEO doc** — The SEO doc mentions malicious PHP files in the current WordPress database (Section 8). This is flagged as URGENT. Make sure Romain/IT are aware: do NOT migrate any content from the old WordPress database without a security audit. The new Webflow site is clean by default, but any old credentials may be compromised.

5. **Post-launch SEO reporting meeting** — Romain agreed to schedule this. Add to your follow-up list — this is a potential ongoing revenue stream.

---

*Document prepared 18 June 2026.*
