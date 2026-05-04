# Site Audit Report — Carsa

**Date:** 2026-05-04
**Live URL:** https://www.carsa.co.uk
**Staging URL:** https://carsa-v2.webflow.io
**Previous audit:** 2026-03-04

---

## Summary

Carsa is a UK used car retailer with 10+ stores, ~4,600 vehicles, and a Webflow site serving as a lead generation platform. The site has grown significantly since the March audit (74 pages, 17 CMS collections, 4,639 vehicle items, 1,975 features).

**What's improved since March:**
- /car-finance H1 inflation fixed (21 → 1)
- Homepage H1 inflation fixed (14+ → 1, confirmed via live HTML)
- /about/carsa H1 inflation fixed (7 → 1, confirmed via live HTML)
- Meta descriptions, canonical tags, and OG tags now rendering correctly sitewide
- Cookie consent mechanism now live
- JSON-LD schema in progress (Product schema live on vehicle pages)
- Reserve page and Reviews page added
- llms.txt was present in March but appears removed/broken now

**Key stats:**
- 74 pages (53 published, 21 drafts, 17 CMS templates)
- 17 CMS collections (4,639 vehicles, 1,975 features, 440 models, 181 FAQs, 103 blogs)
- AEO maturity: L2 Emerging (12/20)
- Designer comments: 45 total, all resolved
- No ecommerce, no localization

---

## Passing

- **robots.txt** — Present, permissive, references sitemap
- **sitemap.xml** — ~1,268 URLs, single file, well-structured
- **SSL** — HTTPS enforced site-wide
- **Custom 404** — Configured
- **GA4 + GTM** — Active (G-6WQDNZH59K, GTM-MM5N6CP8)
- **Cookie consent** — Functional UI with categories (Essentials, Marketing, Personalization, Analytics)
- **Consent alignment** — VWO and GA4 appear consent-gated
- **Viewport meta** — Present (Webflow default)
- **Internal linking** — Key pages well-linked from nav + homepage
- **Meta descriptions** — Rendering correctly in live HTML (homepage, about, confirmed)
- **Canonical tags** — Present and correct on all pages checked
- **OG tags** — og:title, og:description, og:image present sitewide
- **H1 tags** — 1 per page on homepage and about (plus sitewide "Chat with Caroline AI" chatbot H1)
- **Heading hierarchy** — No H2→H4 jumps; structure flows correctly
- **Hreflang** — No conflicting tags (single-locale site)
- **Forms** — Success/error messages confirmed on contact, finance, valuation
- **Blog content quality** — Strong AEO: answer-first leads, original data, question H2s
- **Vehicle schema** — Product JSON-LD live on VDPs (price, condition, VIN, specs)

---

## P0 — Critical (fix immediately)

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 1 | Fix "Chat with Caroline AI" chatbot H1 → span/div sitewide (appears as second H1 on every page) | TBD | SEO | — | AUTO |
| 2 | Add alt text to 50+ images missing it entirely | TBD | A11y, SEO | — | SEMI |

---

## P1 — High (within first sprint)

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 3 | Migrate custom code to client-owned GitHub repo | TBD | De-risk | — | SEMI |
| 4 | Shorten /car-finance title (65 chars → ≤60) | TBD | SEO | — | AUTO |
| 5 | Depublish dev/test pages: /development/impel-test, /development/eligibility-hero-mcp-test | TBD | SEO, Ops | — | AUTO |
| 6 | Depublish unnecessary CMS template pages: /testimonials, /facilities, /car-badges | TBD | SEO, Ops | — | SEMI |
| 7 | Pin CDN script versions (GSAP, n8n Chat, JetBoost) — remove @latest | TBD | De-risk | — | AUTO |
| 8 | Remove expired promotion "Ends 31st Dec 25" from homepage | TBD | Trust, AEO | — | SEMI |
| 9 | Replace "Jane Doe" placeholder author with real byline + bio | TBD | Trust, AEO | — | MANUAL |
| 10 | Fix HTTP links in /terms/data-privacy, /terms-conditions, /vehicle-purchase | TBD | SEO, Trust | SEMRush | SEMI |
| 11 | Add H1 to /reserve page | TBD | SEO | SEMRush | SEMI |
| 12 | Write unique meta description for /value-car (duplicates /part-exchange) | TBD | SEO | SEMRush | AUTO |

---

## P2 — Medium (within first month)

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 13 | Add skip-to-content link sitewide | TBD | A11y | — | AUTO |
| 14 | Add visually-hidden labels to all form inputs | TBD | A11y | — | SEMI |
| 15 | Add aria-label to all nav elements and icon-only links (overlaps SEMRush S5: 109 links with no anchor text) | TBD | A11y, SEO | SEMRush | SEMI |
| 16 | Add main landmark to content wrapper | TBD | A11y | — | SEMI |
| 17 | Add visible "last updated" component to key pages | TBD | AEO | — | SEMI |
| 18 | Rewrite homepage hero to include answer-first lead sentence | TBD | AEO | — | MANUAL |
| 19 | Rewrite /car-finance opening to answer "How does car finance work?" | TBD | AEO | — | MANUAL |
| 20 | Add outbound links to authoritative sources (FCA, DVLA, Thatcham) | TBD | AEO, Trust | — | MANUAL |
| 21 | Add explicit favicon references in head | TBD | Perf | — | AUTO |
| 22 | Restore/create llms.txt at root | TBD | AEO | — | AUTO |
| 23 | Verify www redirect from naked domain (carsa.co.uk → www) | TBD | SEO | — | MANUAL |
| 24 | Remove time-sensitive hedge words from blog posts | TBD | AEO | — | SEMI |
| 25 | Investigate slow load on store pages (Mapbox + script bundle — 15 pages flagged) | TBD | Perf | SEMRush | SEMI |

---

## P3 — Low (backlog)

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 26 | Add HowTo schema to /car-finance "How it works" section | TBD | AEO | — | AUTO |
| 27 | Promote FAQ questions to H2 level on /faq page | TBD | AEO | — | SEMI |
| 28 | Add question-format H2s to homepage sections | TBD | AEO, Conv | — | MANUAL |
| 29 | Add sitemap lastmod/changefreq metadata | TBD | SEO | — | SEMI |
| 30 | Investigate sitemap vehicle coverage (~250 vs 4,639 CMS items) | TBD | SEO | — | MANUAL |
| 31 | Set up N8N chat fallback UX for webhook unavailability | TBD | Conv | — | SEMI |
| 32 | Add descriptive alt text pattern to vehicle images via CMS binding | TBD | A11y, SEO | — | SEMI |
| 33 | Strengthen author signals with Person schema + credentials | TBD | AEO, Trust | — | SEMI |
| 34 | Shorten /car-care/carsacover title (81 chars → ≤60) | TBD | SEO | SEMRush | AUTO |
| 35 | Shorten VDP title template (98 chars on sample — ≤60 target) | TBD | SEO | SEMRush | SEMI |

---

## P4 — Aspirational (future consideration)

| # | Task | Effort | Justification | Client item | Automation |
|---|------|--------|---------------|-------------|------------|
| 36 | Split sitemap into sub-sitemaps (vehicles, blog, stores) | TBD | SEO | — | SEMI |
| 37 | Build quarterly original data content (Iran war template) | TBD | AEO | — | MANUAL |
| 38 | Implement anchor + cluster content architecture | TBD | AEO | — | MANUAL |
| 39 | Set up consent mode v2 in GTM for full compliance verification | TBD | Ops | — | MANUAL |

---

## Automation Summary

| Category | Count | % |
|----------|-------|---|
| AUTO | 9 | 23.1% |
| SEMI | 21 | 53.8% |
| MANUAL | 9 | 23.1% |
| **Total** | **39** | 100% |

---

## In Progress (do not double-count)

| Item | Owner | Status |
|------|-------|--------|
| JSON-LD schema for all pages (Organization, WebSite, LocalBusiness, FAQPage, Article, BreadcrumbList) | Will | Active development |
| Product schema on vehicle detail pages | Will | Live |

---

## AEO Scorecard

**Overall: 12/20 — L2 Emerging**

| Category | Score | Notes |
|----------|-------|-------|
| A. Schema | 2/4 | FAQPage live; Organization in progress |
| B. Answer Structure | 5/6 | Blog strong; homepage/service leads weak |
| C. Freshness | 1/3 | Blog has dates; no sitewide "last updated"; hedge words |
| D. Authority | 2/4 | Original data on blog; no external citations; weak entity signals |
| E. Technical | 2/3 | robots.txt fine; internal links strong; alt text poor |

---

## Brand Voice Summary

**Tone:** Straightforward, reassuring, modern, friendly, confident
**Vocab:** Casual-professional (plain English with explained finance terms)
**Style:** Short punchy sentences, lists over paragraphs, specific numbers always

---

## Custom Code Migration Plan

**Trigger:** 6+ scripts on studiozissou (Will's) GitHub via jsDelivr CDN.

Recommended structure:
```
carsa-business/carsa-webflow-scripts/
├── src/ (homepage.js, make-model.js, make-model-redirect.js, check-finance.js)
├── dist/ (minified)
└── package.json
```

Pattern: `cdn.jsdelivr.net/gh/carsa-business/carsa-webflow-scripts@1.0.0/dist/homepage.min.js`
Rules: Always pin to semver, never @latest in production, purge via jsdelivr.net/purge.

---

## SEMRush Site Audit (Layer A)

**Site Health Score:** 89%
**AI Search Health:** 85%
**Pages scanned:** 100
**Errors:** 17 | **Warnings:** 98

AI bot access: All major AI crawlers allowed (ChatGPT, Perplexity, Google AI, Claude).

Top issues by volume: 109 links with no anchor text (94 pages), 90 low text-to-HTML ratio (expected for car listings), 15 slow-loading pages, 3 HTTP links on HTTPS site.

7 new tasks merged into P-band tables above (tagged `SEMRush` in Client item column). The anchor text issue (S5) merges with existing a11y task #22.

Full findings: `audits/semrush-2026-05-04.md`

---

## Sub-audits

Full detailed findings in:
- `audits/structure.md` — Technical + analytics
- `audits/seo.md` — SEO + schema
- `audits/content.md` — Content + code inventory
- `audits/aeo.md` — AEO / AI-search (12/20, L2)
- `audits/semrush-2026-05-04.md` — SEMRush site audit (89% health)
- `brand-voice.md` — Brand voice analysis
- `ideal-customer-profiles.md` — 3 ICP segments
