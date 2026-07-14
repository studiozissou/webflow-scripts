# Automated Fixes — NEM Life

**Date:** 2026-05-07
**Source:** `reports/intake-report-2026-05-07.md`
**Total:** 22 tasks tagged AUTO — can be executed by Claude Code without manual intervention.

---

## P0 — Quick wins

| # | Task | Justification | How |
|---|------|---------------|-----|
| 1 | **Add `aria-label="Terug naar boven"` to back-to-top link** | A11y | Webflow Designer: select `.back-to-top` element, add custom attribute |
| 2 | **Add `aria-label="Menu"` to mobile hamburger button** | A11y | Webflow Designer: select navbar menu button, add custom attribute |
| 3 | **Remove or fix `aria-label="Lees meer"` on card links** | A11y | Webflow Designer: remove aria-label from card link wrappers (visible text should serve as name) |
| ~~4~~ | ~~**Set Home SEO title**~~ | ~~SEO~~ | ~~DONE — deployed + verified via Chrome DevTools~~ |
| ~~5~~ | ~~**Set Home meta description**~~ | ~~SEO~~ | ~~DONE — deployed + verified~~ |
| ~~6~~ | ~~**Set Inzichten SEO title**~~ | ~~SEO~~ | ~~DONE — deployed + verified~~ |
| ~~7~~ | ~~**Set Ervaringen SEO title**~~ | ~~SEO~~ | ~~DONE — deployed + verified~~ |
| ~~8~~ | ~~**Set Voorwaarden SEO title**~~ | ~~SEO~~ | ~~DONE — deployed + verified~~ |
| ~~9~~ | ~~**Set Voorwaarden meta description**~~ | ~~SEO~~ | ~~DONE — deployed + verified~~ |
| ~~10~~ | ~~**Fix page title placeholder "NEMLife.com NEW"**~~ | ~~SEO~~ | ~~DONE — deployed + verified~~ |
| 11 | **Rename "Inzichtens" collection to "Inzichten"** | Ops | Webflow Designer: CMS Settings > rename collection |
| 12 | **Fix Tags field — add missing option values** | Ops | Webflow Designer: CMS Settings > Inzichten > Tags field > add "tag 1" option |

---

## P1 — Schema deployment + infrastructure

| # | Task | Justification | How |
|---|------|---------------|-----|
| 13 | **Deploy sitewide JSON-LD** (Organization + WebSite) | SEO, AEO | **Site Settings > Custom Code > Head Code** — loads on every page. Paste `schema/nem-life-sitewide-2026-05-07.json` |
| 14 | **Deploy Home JSON-LD** (WebPage + FAQPage) | SEO, AEO | **Home > Page Settings > Schema markup** field. Paste `schema/nem-life-home-faq-2026-05-07.json` |
| 15 | **Deploy NEM Methode JSON-LD** (HowTo + FAQPage) | SEO, AEO | **NEM Methode > Page Settings > Schema markup** field. Paste both `nem-method-howto` + `nem-method-faq` files |
| 16 | **Deploy Missie JSON-LD** (AboutPage) | SEO, AEO | **Missie > Page Settings > Schema markup** field. Paste `schema/nem-life-mission-2026-05-07.json` |
| 17 | **Deploy Christel JSON-LD** (Person) | SEO, AEO, Trust | **Christel > Page Settings > Schema markup** field. Paste `schema/nem-life-christel-person-2026-05-07.json` |
| 18 | **Deploy Blog Article JSON-LD** (Article) | SEO, AEO | **Insights template > Page Settings > Schema markup** field. Uses `{{wf ...}}` escaped CMS bindings. Paste `schema/nem-life-blog-article-2026-05-07.json` |
| 19 | **Deploy Testimonial JSON-LD** (CreativeWork + Review) | SEO, AEO | **Testimonials template > Page Settings > Schema markup** field. Uses `{{wf ...}}` escaped CMS bindings. Paste `schema/nem-life-testimonial-review-2026-05-07.json` |
| ~~26~~ | ~~**Deploy robots.txt for production**~~ | ~~SEO, AEO~~ | ~~DONE — deployed to Webflow Site Settings~~ |

---

## P2 — Performance CSS

| # | Task | Justification | How |
|---|------|---------------|-----|
| 31 | **Bind blog article OG image to CMS Main Image** | SEO | Webflow Designer: Blog template Page Settings > OG Image > bind to CMS "Main Image" field |
| 39 | **Add Swiper CLS-prevention CSS** | Perf | Add to site-wide custom CSS: `.swiper:not(.swiper-initialized) .swiper-wrapper { overflow: hidden; } .swiper:not(.swiper-initialized) .swiper-slide:not(:first-child) { display: none; }` |

---

## P4 — Retainer

| # | Task | Justification | How |
|---|------|---------------|-----|
| ~~54~~ | ~~**Deploy llms.txt**~~ | ~~AEO~~ | ~~DONE — deployed~~ |
| 60 | **Add BreadcrumbList schema** | SEO, AEO | Generate and add to inner page templates |

---

## Execution notes

**Tasks 4-10 can be executed right now via Webflow MCP** — say "run the SEO fixes" and I'll push the titles and descriptions via `update_page_settings`.

**Tasks 13-19 require pasting into Webflow** — the schema files are ready at `projects/nem-life/.claude/schema/`. The sitewide schema still has FILL_IN placeholders for logo dimensions, founding date, social URLs, and contact email.

**Tasks 1-3 and 11-12 require Webflow Designer** — these are element-level attribute changes and CMS field config that the Data API doesn't support.

**Tasks 31, 39 can be done via Webflow MCP or Designer** — CSS embed and OG image binding.

### Quick-run groupings

| Group | Tasks | Method | Ready? |
|-------|-------|--------|--------|
| SEO metadata (MCP) | 4, 5, 6, 7, 8, 9, 10 | `update_page_settings` API calls | Yes — run now |
| Schema deployment | 13-19 | Paste into Webflow head code / embeds | Yes (except FILL_IN fields in sitewide) |
| A11y attributes | 1, 2, 3 | Webflow Designer element attributes | Ready — manual in Designer |
| CMS fixes | 11, 12 | Webflow Designer CMS settings | Ready — manual in Designer |
| CSS/perf | 39 | Custom code embed | Ready |
| Launch-day | 26, 54 | robots.txt + llms.txt deployment | Ready — deploy at domain connection |
| Future | 60 | BreadcrumbList schema generation | Generate when needed |
