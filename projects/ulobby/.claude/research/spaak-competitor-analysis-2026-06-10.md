# Spaak Technologies — Competitor Analysis

**Date:** 2026-06-10 (updated 2026-06-15 with SEMRush site audit data)
**Domain:** spaak.ai
**Source:** Web research, startup databases, site review, SEMRush site audit (2026-06-15)
**Triggered by:** Mariann flagged Spaak as a competitor investing heavily in marketing

---

## Company Overview

| Field | Detail |
|-------|--------|
| Name | Spaak Technologies ApS |
| Founded | January 2024 |
| HQ | Copenhagen (Nørrebro) |
| Employees | ~23 |
| Founders | Lucas Damsgaard, Karl-Emil Plum, Marcus Nerløe, Arthur Teglbjærg |
| Funding | €1.5M pre-seed (Nov 2024) |
| Investors | node.vc (lead), J12 Ventures, angels |
| Domain | spaak.ai |

## Product

**Hamilton** — AI-powered public affairs assistant.

Core modules:
1. **Monitoring & Alerts** — real-time tracking across thousands of political sources
2. **Policy Analysis** — impact assessment and scenario modelling
3. **Briefings & Drafting** — converts policy alerts into finished briefs, position papers, talking points, consultation responses
4. **Reports & Newsletters** — automated policy communications
5. **Organisational Knowledge** — learns tone, framing, argumentation

Positioning: "The Agentic Operating System for Public Affairs"

## Markets

- **Denmark (current):** Partners with Danish Parliament, Ministry of Foreign Affairs, Ministry of Justice, Dansk Industri, Landbrug og Fødevarer, EjendomDanmark as data sources
- **EU (expanding):** Hired Cyrille Mai Thanh (ex-DGA Group Associate Partner, Brussels) as Managing Director Europe. EU product launch planned for Sep 2025 (may have shipped)
- **Nordics:** No specific Norway/Sweden presence found

## Clients

LEGO, Danfoss, TotalEnergies, TEKNIQ, Børns Vilkår, Djøf, Dansk Industri, Forsikring & Pension

## SEO Presence

**Key finding: Spaak has minimal organic search presence.**

- Not appearing in SEMRush's organic competitor data for ulobby.eu
- Domain is ~2 years old (spaak.ai registered 2024)
- Site structure is demo-request focused, not content-driven
- No visible blog or educational content section
- No Danish-language SEO content found
- Growth strategy appears to be PR, startup press, events, and likely paid acquisition

This explains why they didn't appear in the original competitor benchmark — SEMRush's competitor analysis is keyword-overlap based, and Spaak has negligible organic keyword overlap with uLobby.

## SEMRush Site Audit (2026-06-15)

**Pages crawled:** 24 (vs uLobby's 273)
**Source:** `audits/spaak.ai_mega_export_20260615.csv`

### Site Size Comparison

| Metric | spaak.ai | ulobby.eu |
|--------|----------|-----------|
| Pages crawled | 24 | 273 |
| Locales | 1 (English) | 4 (EN, DA, NO, SV) |
| Blog/content pages | 0 | ~89 articles |
| Case studies | 3 | 0 |
| Product pages | 5 | ~22 (solutions across locales) |

### Pages Discovered

| Page | Issues |
|------|--------|
| `/` (homepage) | Duplicate title, duplicate meta description, H1/title duplication |
| `/products/briefing-and-drafting` | Missing H1, low text-to-HTML |
| `/products/monitor-and-alerts` | Missing H1, low text-to-HTML |
| `/products/organization-knowledge` | Missing H1, low text-to-HTML |
| `/products/policy-analysis` | Missing H1, low text-to-HTML |
| `/products/reports-and-newsletters` | Missing H1, low text-to-HTML |
| `/solution/consultancy` | Missing H1, low text-to-HTML |
| `/solution/corporate` | Missing H1, low text-to-HTML |
| `/solution/ngos` | Missing H1, low text-to-HTML |
| `/solution/trade-associations` | Missing H1, low text-to-HTML |
| `/about/career` | Missing H1, low text-to-HTML |
| `/about/company` | Missing H1, low text-to-HTML |
| `/about/contact` | Missing H1, low text-to-HTML, low word count |
| `/cal.com` | Duplicate title, duplicate meta description, missing H1, low word count |
| `/resources/case-studies` | Multiple H1, low text-to-HTML |
| `/resources/case-studies/danfoss` | Duplicate title, duplicate meta desc, missing H1, too long URL |
| `/resources/case-studies/ari` | Duplicate title, duplicate meta desc, missing H1, too long URL |
| `/resources/case-studies/tekniq` | Duplicate title, duplicate meta desc, missing H1, too long URL |
| `/legal/privacy-policy` | Blocked from crawling |
| `/llms.txt` | Present (uLobby is missing theirs) |
| `/robots.txt` | Clean |
| `/sitemap.xml` | 21 orphaned pages in sitemap |

### Key Technical Findings

1. **Missing H1 tags on nearly every page** — product pages, solution pages, about pages all lack H1s
2. **Duplicate titles and meta descriptions** — homepage, cal.com page, and all 3 case studies share duplicate metadata
3. **Low text-to-HTML ratio sitewide** — design-heavy, copy-light pages throughout
4. **21 orphaned sitemap pages** — sitemap references pages not linked from the crawled site (possible old/removed pages, or pages behind JS routing)
5. **No blog, no educational content** — confirmed by crawl. Zero content marketing pages
6. **No llms.txt** — Spaak references llms.txt in their sitemap but it returns 404. Neither site has a working llms.txt
7. **Single language** — English only. No Danish content despite being a Copenhagen company targeting the Danish market
8. **3 case studies** — Danfoss, ARI (Danish waste industry association), TEKNIQ. All have SEO issues (duplicate meta, missing H1, overly long URLs)

### SEO Health Comparison

| Issue | spaak.ai | ulobby.eu |
|-------|----------|-----------|
| Pages | 24 | 273 |
| Missing H1 | ~15 pages (63%) | 0 |
| Duplicate titles | 5 pages | 12 pages |
| Duplicate meta desc | 5 pages | 12 pages |
| Structured data errors | 0 | 22 |
| Broken external links | 0 | 19 |
| Blog/content pages | 0 | ~89 |
| llms.txt | No (404) | No |
| Hreflang | N/A (single language) | 268 pages |
| Canonical tags | Unknown | Missing on all 273 |

**Bottom line:** Spaak's site is technically immature — missing basic on-page SEO (H1 tags, unique metadata) across most pages. Their site is tiny (24 pages vs 273) with no content strategy. However, they do have llms.txt, which uLobby lacks.

## Site Structure

- `/` — Homepage: "The Agentic Operating System for Public Affairs"
- `/products/*` — 5 feature modules (monitoring, analysis, briefings, reports, knowledge)
- `/solution/*` — 4 verticals (corporates, consultancies, trade associations, NGOs)
- `/about/*` — Company, careers, contact
- `/resources/case-studies` — 3 case studies (Danfoss, ARI, TEKNIQ)
- `/cal.com` — Booking/demo page
- `/llms.txt` — referenced in sitemap but returns 404 (not actually present)
- No `/blog` found
- No `/markets/dk` (returned 404)

## Marketing & Outreach

Spaak's growth appears to be driven by:
1. **Startup press** — coverage in ArcticStartup, Øresund Startups, BeBeez, Dealroom
2. **Investor networks** — node.vc, J12 Ventures amplification
3. **Enterprise sales** — direct outreach to large Danish organisations
4. **EU expansion** — hiring senior Brussels lobbyist for credibility + network
5. **Product-led** — demo request funnel, not content marketing

## Competitive Threat Assessment

| Dimension | Threat | Notes |
|-----------|--------|-------|
| Product | **High** | Direct SaaS competitor with AI-first positioning and VC backing |
| SEO/Organic | **Low** | Minimal organic presence, no content strategy visible |
| Paid/Outreach | **Medium-High** | Mariann confirms heavy marketing investment |
| Enterprise sales | **High** | Signed LEGO, Danfoss, TotalEnergies — credible enterprise clients |
| EU expansion | **Medium** | Brussels hire signals serious intent, but early stage |
| Content/Authority | **Low** | No educational content, no thought leadership visible |

## Implications for uLobby

1. **SEO window remains open.** Spaak is not competing on organic search. uLobby can own Danish public affairs search terms without opposition from Spaak.

2. **Different growth vectors.** Spaak is growing through VC-funded sales and marketing. uLobby's organic/content approach is complementary — they'll encounter different prospects through different channels.

3. **The "lobbyisme" opportunity is still unclaimed.** 880 searches/month in Denmark, no software company ranking. Spaak isn't targeting it.

4. **Content moat opportunity.** If uLobby invests in Danish-language educational content now, it creates a defensible position. Organic search authority takes years to build — Spaak would need to start from scratch.

5. **EU market overlap incoming.** When Spaak launches their EU product, both companies will compete for English-language public affairs terms. uLobby should build content authority before that happens.

---

*Research based on web search, startup databases (Crunchbase, Tracxn, PitchBook, TheHub), investor announcements, direct site review, and SEMRush site audit (2026-06-15). Raw data: `audits/spaak.ai_mega_export_20260615.csv`.*
