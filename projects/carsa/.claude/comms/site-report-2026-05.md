# Carsa monthly site report

**Prepared for:** Carsa | **Month:** May 2026 | **Site:** www.carsa.co.uk

---

## In summary

This is the first monthly scan. We crawled all 5,398 pages on the site.

The good news: accessibility, SEO, and best practices are strong across the board. Lighthouse scores average 95+ for accessibility and 99 for SEO. Structured data is complete on every page. Google can read each car listing, store, blog post, and the company itself as structured data.

The weak spots:

**Speed.** /used-cars and /car-finance score 34 and 30 on mobile because of heavy script bundles (VWO, n8n Chat, JetBoost, Finsweet) and unoptimised images. These are the pages where someone is actively looking at cars or checking finance, so slow loading hurts the most here.

**Accessibility.** Top-level pages score 95-100, but listing pages drop: /used-cars (87), model pages (84), blog posts (87). Missing form labels on filter dropdowns, links with no name, contrast failures, ARIA mismatches.

**Links.** 5,291 external links are broken. Dealer network URLs and third-party services that have moved or gone. Visitors hit dead ends, and Google sees a site that links to things that don't exist.

**Titles.** 1,862 vehicle pages have near-identical titles. Google can't tell them apart, so it picks one and skips the rest.

**Freshness.** No "last updated" dates on service pages, time-sensitive language in blog posts, and the Dec 2025 promotion is still on the homepage. ChatGPT and Perplexity both check for freshness before citing a page.

**Authority.** No links to the FCA or DVLA. The blog author is "Jane Doe". No credentials in the page code. Google uses these signals to decide how much to trust the content.

**Compliance.** /car-finance scored 73 on best practices, the lowest on the site. Third-party cookies, console errors, and missing source maps.

The large issue counts (5,000+) look alarming but they're structural. Most come from a shared vehicle page template that repeats the same problems across thousands of listings. Fixing the template fixes all of them at once.

Three things to focus on this month: get alt text on images (2-minute batch fix in Webflow), remove the expired homepage promotion, and decide on the code migration to a Carsa-owned GitHub repo.

---

## Monthly health dashboard

| Metric | April | May | Change |
|--------|-------|-----|--------|
| Site health score | — | 69% | First scan |
| AI search health score | — | 74% | First scan |
| Pages crawled | — | 5,398 | First scan |
| Errors | — | 5,398+ | First scan |
| Warnings | — | 12,000+ | First scan |
| AEO score | — | 14/20 | First scan |
| Lighthouse (mobile avg) | — | Perf 64 / A11y 95 / BP 94 / SEO 99 | First scan |

### Lighthouse scores by page (mobile)

| Page | Performance | Accessibility | Best Practices | SEO |
|------|------------|---------------|----------------|-----|
| / | 60 | 99 | 96 | 92 |
| /used-cars | 34 | 87 | 96 | 100 |
| /car-finance | 30 | 100 | 73 | 100 |
| /stores | 62 | 95 | 96 | 100 |
| /blog | 53 | 94 | 96 | 100 |
| /faq | 63 | 100 | 96 | 100 |
| /about/carsa | 88 | 100 | 96 | 100 |
| /contact | 88 | 98 | 96 | 100 |
| /used-cars/models/audi-a3 | 62 | 84 | 96 | 100 |
| /sell-car/value-car | 86 | 100 | 96 | 100 |
| /blog (post) | 81 | 87 | 96 | 100 |
| VDP (gv69lcm) | 57 | 100 | 96 | 92 |

*Scores from PageSpeed Insights, 14 May 2026. Emulated Moto G Power, slow 4G throttling.*

---

## What changed this month

**Fixed:**
- First monthly scan completed. We now have visibility across all 5,398 pages.
- Full structured data added to every page.

**In progress:**
- Sell car locations pages (10 store pages live, /sell-car hub and /sell-car/store index still needed)

---

## Top issues

These are the highest-count issues from the scan. Most are structural. They repeat across thousands of vehicle pages because they come from a shared template.

| Issue | Count | What it means |
|-------|-------|---------------|
| Links with no anchor text | 5,329 | Icon links, image links, logo links that screen readers and Google can't interpret. Sitewide template issue. |
| Broken external links | 5,291 | Outbound links pointing to URLs that no longer work. Dealer network links, third-party services. |
| Low text-to-HTML ratio | 5,273 | Vehicle pages have little text relative to their code. Expected for listing pages, but worth improving where possible. |
| Content not optimised | 5,054 | SEMRush's generic flag for pages without strong keyword signals. Mostly vehicle listings. |
| Slow page load | 3,540 | Heavy script bundles, map rendering on store pages, unoptimised images. These are high-intent pages. Speed matters here. |
| Duplicate titles | 1,862 | Vehicle page titles are too similar. The template needs restructuring so each car gets a distinct title. |
| Duplicate content | 701 | Similar vehicle pages with near-identical text. CMS template variation needed. |
| Title too long | 357 | Vehicle titles exceed Google's ~60-character display limit. Important details get cut off in search results. |
| Incorrect pages in sitemap | 87 | Sitemap includes URLs that don't return a proper page. Confuses search engines. |
| Pages not crawled | 53 | Pages that couldn't be reached during the scan. May be blocked or broken. |
| Duplicate meta descriptions | 44 | CMS template pages sharing the same description. Each page needs its own. |
| Multiple H1 tags | 42 | Chatbot widget still injecting a second H1 on some pages. Fix in progress. |
| 4xx errors | 35 | Internal links pointing to pages that don't exist. |

---

## What Claude can fix automatically each month

These are recurring issues that we can detect and resolve without manual intervention. Each monthly report will include a status update on these checks.

| Check | What it does | Status |
|-------|-------------|--------|
| Expired promotions | Scan CMS content for dates in the past, flag stale offers | Ready |
| HTTP link detection | Find http:// links on an HTTPS site, replace with https:// | Ready |
| Structured data validation | Audit all JSON-LD against schema.org spec, flag errors | Active — zero errors this month |
| Missing alt text | Detect images without alt text, generate from CMS fields (year, colour, make, model). Can be done in batch via Webflow. | Ready |
| Duplicate meta descriptions | Flag pages sharing the same description | Ready |
| Missing H1 detection | Flag pages with no H1 or multiple H1s | Ready |
| Time-sensitive language | Scan blog posts for hedge words ("currently", "at the time of writing", "as of 2024") that signal staleness | Ready |
| Schema validation | Test deployed schema against Google Rich Results Test | Active |
| CDN version check | Compare loaded script versions against latest releases, flag outdated or unpinned (@latest) dependencies | Ready |

---

## Priority task list

Grouped by urgency.

### P0 — Fix this week

**1. Fix chatbot H1 sitewide** — Blocked (chatbot vendor limitation)
The "Chat with Caroline AI" widget uses a main heading tag on every page, so Google sees two main headings per page. This dilutes the signal about what each page is actually about. Requires the chatbot provider to make the change.

**2. Add alt text to 50+ images** — Ready (batch fix in Webflow)
Car photos, store images, icons, and blog thumbnails have no text descriptions. Screen readers can't describe them and Google can't index them. About 20% of UK adults have some form of disability that affects how they use the web. Can be fixed in 2 mins with Webflow's new AI alt text tool.

### P1 — First sprint

**3. Move custom code to Carsa-owned GitHub repo** — Proposed
All scripts currently live as inline code inside Webflow. We've proposed moving them to a Carsa-owned GitHub repo and serving them via CDN. This improves page load speed through CDN caching and makes updates version-controlled. It also means Carsa owns its code in one place rather than scattered across Webflow page settings.

**4. Shorten /car-finance page title** — Open
At 67 characters, the title gets cut off in Google search results. Google shows about 60 characters. The useful details disappear.

**5. Unpublish 2 development pages** — Open
/development/impel-test and /development/eligibility-hero-mcp-test are live and visible to Google. They make the site look unfinished.

**6. Pin CDN script versions** — Open
GSAP, n8n Chat, and JetBoost all load with "@latest", pulling whatever the newest version is. A breaking change from any of these libraries would hit the site without anyone at Carsa doing anything.

**7. Remove expired promotion** — Open
"Ends 31st Dec 25" is still on the homepage. A visitor landing in May 2026 will wonder if the site is maintained.

**8. Replace "Jane Doe" blog author with real name and bio** — Needs client input
The author byline is hidden from visitors but "Jane Doe" is still visible to search engines in the page source. Google and AI tools use author signals when deciding whether to trust content. We need a real name and short bio from the Carsa team.

**9. Fix HTTP links in 3 terms pages** — Open
/terms/data-privacy, /terms-conditions, and /vehicle-purchase link to http:// instead of https://. Browsers may show security warnings. Quick find-and-replace in CMS content.

**10. Write unique description for /value-car** — Open
Currently duplicates /part-exchange, even though they're different things (selling outright vs trading in). Google may treat them as duplicate content or just pick one and ignore the other.

**11. Create /sell-car hub page** — Open
/sell-car currently redirects straight to /sell-car/value-car. There's no parent page linking to value-car, part-exchange, and the 10 store sell-car pages. Google treats the section as disconnected pages with no shared topic. A hub page creates a topic cluster, gives Carsa a page that can rank for "sell my car", and removes the redirect.

**12. Create /sell-car/store index page** — Open
/sell-car/store returns a 404. There are 10 individual store sell-car pages (Bolton, Cannock, Durham, etc.) with no listing page connecting them. An index page linking to all 10 strengthens internal linking and gives Carsa a page for "sell my car near me" searches.

### P2 — First month

**13. Add skip-to-content link** — Open
Keyboard users currently tab through the full navigation on every page before reaching content. An invisible "Skip to main content" link appears on first tab press. Common need for motor-impaired users.

**14. Add anchor text to 109+ links with no text** — Open
Social icons, logo links, and image links are invisible to screen readers. A screen reader currently says "link" with no context. After this fix: "Facebook", "Home", "View this car."

**15. Add "last updated" dates to key pages** — Open
/car-finance, /faq, and service pages show no date. Google and AI tools prefer content with visible freshness signals.

**16. Rewrite homepage hero for AI extraction** — Open
The hero opens with "Find your next car. Finance ready." -- good tagline, but doesn't say what Carsa is. AI tools looking for something to quote will skip past it. A factual opening sentence lets ChatGPT and Perplexity say "Carsa is a UK used car retailer with 2,000+ vehicles and nationwide delivery."

**17. Rewrite /car-finance intro** — Open
Someone landing here is probably asking "How does car finance work?" The opening doesn't answer that. Answer the question up front, then expand. Helps the page rank for question-based searches too.

**18. Add links to authoritative sources** — Open
The site explains finance, warranties, and car care without linking to the FCA, DVLA, or Thatcham. Google and AI tools treat outbound links to trusted sources as a quality signal.

**19. Remove time-sensitive language from blog posts** — Open
Phrases like "currently", "at the time of writing", and "as of 2024" tell AI tools the content might be outdated, even when the information is still accurate.

**20. Investigate 3,540 slow-loading pages** — Open
Store pages with maps, vehicle listings with heavy script bundles. These are pages where someone has already decided to visit a showroom or look at a car. Slow loading at that point costs conversions.

### P3 — Backlog

**21. Add HowTo markup to /car-finance** — Open
The "How it works" section has clear steps but no structured markup. Adding HowTo schema tells Google "this is a process with defined steps" and could appear as a rich result.

**22. Promote FAQ questions to H2 headings** — Open
Questions are currently nested below a single "FAQs" heading. AI tools scan headings to find answers. Questions buried in body text get missed.

**23. Add question-format headings to homepage** — Open
"Why buy from Carsa?" is already there, but most sections use statement headings. AI tools match user queries to question-answer pairs.

**24. Set up CMS alt text pattern for vehicle images** — Open
Every car photo automatically gets text like "2022 Blue BMW 3 Series, front view." Covers all 4,600+ vehicles without manual work.

**25. Add author bios with credentials and Person schema** — Open
Blog posts don't include qualifications, role, or the structured data Google uses to evaluate expertise. Named, qualified people behind the content is a trust signal.

**26. Shorten /car-care/carsacover title** — Open
At 81 characters, it gets truncated in search results. Full title should display within ~60 characters.

**27. Shorten VDP title template** — Open
Vehicle page titles run to 98 characters on some pages. Restructure so make, model, year, and price come first, within ~60 characters.

### P4 — Future consideration

**28. Build quarterly original data content** — Open
The Iran/Ukraine war fuel impact piece is a template for content that earns links and citations. Original data gives other sites and AI tools a reason to reference Carsa.

**29. Set up anchor + cluster blog architecture** — Open
Link each post to a parent topic (car finance, used cars, car care) with two-way linking. Service pages become the hub for each topic. 103 posts is enough to build real topical authority.

**30. Set up Consent Mode v2 in GTM** — Open
Becoming the standard for privacy compliance. Ensures analytics data collection respects user consent choices.

---

## Local SEO — Southampton listing scan

*This section covers a sample scan for one location. Ongoing local listing management is a separate paid add-on, not included in the standard monthly report.*

We ran a SEMRush listing scan for the Southampton store (258 Bridge Road). This checks whether the business appears correctly across directories, maps, and voice assistants.

**Google Business Profile:** Connected and live.

**7 directories have wrong information:**

| Directory | Problem |
|-----------|---------|
| Facebook | Wrong phone number (shows 3003034797) |
| HotFrog | Wrong phone number |
| iGlobal | Wrong phone number |
| Cylex | Different phone number (3330441363) |
| Central Index GB | Wrong phone number |
| Brownbook.net | Wrong phone number |
| AroundMe | Wrong phone number |

The GBP number is 2046399557. Most directories show 3003034797 instead.

**10 directories have no listing at all:**

Bing, Foursquare, TripAdvisor, YP.com, 192.com, Acompio UK, InfoIsInfo, Opening Times, Snapchat, My Local Services UK.

Bing is the most important gap. It powers Copilot, DuckDuckGo, and Yahoo Search.

**Recommendations:**
1. Fix phone numbers across the 7 incorrect directories.
2. Create a Bing Places listing (free, covers Bing + Copilot + DuckDuckGo + Yahoo).
3. Consider Foursquare (powers Uber, Samsung Maps) and Apple Maps Connect (powers Siri).

This scan covers Southampton only. We can run the same check for other stores on request.

**Optional add-on: managed local listings**

SEMRush offers ongoing listing management at two tiers:

| Feature | Basic (£30/mo/location) | Pro (£60/mo/location) |
|---------|------------------------|----------------------|
| GBP audit and optimisation | Yes | Yes |
| GBP post and photo publishing | Yes | Yes |
| Review auto-replies | Yes | Yes |
| Business description optimisation | Yes | Yes |
| Auto-distribute to directories | No | Yes |
| Keep info synced across directories | No | Yes |
| Suppress duplicate listings | No | Yes |
| Block user-suggested edits | No | Yes |

With 10+ stores: £300/month on Basic, £600/month on Pro. Worth starting with the highest-traffic locations. We can run scans per store to prioritise.

---

## AI search readiness score

How ready the site is for AI answer tools (ChatGPT, Perplexity, Google AI Overviews) that pull answers directly from websites.

| Category | Score | What it means |
|----------|-------|---------------|
| Structured data | 4/4 | Done. Organization, WebSite, LocalBusiness, FAQPage, Article, BreadcrumbList, Product all live. |
| Answer structure | 5/6 | Blog is strong. Homepage and service pages open with marketing copy, not answers. |
| Freshness | 1/3 | Blog has dates. No "last updated" signals elsewhere. Time-sensitive language in some posts. |
| Authority | 2/4 | Some original data on the blog. No external citations. Weak author signals. |
| Technical | 2/3 | robots.txt and internal links are fine. Alt text drags this down. |
| **Overall** | **14/20** | **Emerging. The structured data is done. What's left is content positioning and trust signals.** |

---

## How we audit this site

Each monthly report is built from the following checks. This is what goes into the numbers above.

**Crawl and indexing** — SEMRush full-site crawl (all pages), robots.txt validation, sitemap validation, 4xx/5xx error detection, redirect chain analysis.

**Search visibility** — Meta title and description audit, OG tag verification, canonical tag check, H1 validation, heading hierarchy, duplicate content detection.

**Structured data** — JSON-LD schema validation against schema.org spec, Google Rich Results Test, schema coverage audit across page types.

**Accessibility** — Lighthouse accessibility audit, alt text check, anchor text audit, form label validation, landmark detection, skip link verification.

**Performance** — Lighthouse performance audit, page load speed analysis, script inventory, CDN version check, image weight assessment.

**Security and compliance** — SSL/HTTPS validation, cookie consent check, mixed content detection, consent-gating verification for analytics and A/B testing tools.

**AI search readiness** — 20-point AEO rubric covering schema, answer structure, freshness, authority, and technical signals. llms.txt check. AI bot access verification.

**Content quality** — Text-to-HTML ratio, word count per page, freshness signals, brand voice consistency.

**Local SEO** *(paid add-on)* — SEMRush listing scan per location. Directory accuracy, GBP status, duplicate suppression.

**Analytics** — GA4/GTM detection, consent mode verification.

**Tools used:** SEMRush, Google Lighthouse, Chrome DevTools, Playwright, Webflow MCP, Google Rich Results Test.

---

## Next steps

1. Let us know which priorities to move on first. P0 and P1 need no input from your side.
2. P2 content changes (homepage copy, blog author, alt text approach) need a quick sign-off.
3. We'll update this report monthly with new scan data and progress against the task list.
4. Lighthouse scores are baselined in this report. Next month we'll show the change.

---

*Prepared by Will Morley. Based on SEMRush full-site crawl (5,398 pages), Google Rich Results Test, Chrome DevTools, and manual review.*
