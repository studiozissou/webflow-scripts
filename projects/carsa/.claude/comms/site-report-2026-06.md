# Carsa monthly site report

**Prepared for:** Carsa | **Month:** June 2026 | **Site:** www.carsa.co.uk

---

## In summary

This is the second monthly scan. We crawled 5,484 pages, up from 5,398 last month as new inventory came online.

Most of the site is holding steady. The chatbot H1 fix landed across almost every page (down from 42 duplicate headings to just 2). Zero server errors, clean SSL, valid sitemap, no redirect chains.

One thing needs immediate attention: structured data errors have come back. In May we had zero schema errors across the entire site. This scan shows 1,235 pages with markup errors, almost all on make, model, and fuel filter template pages. This likely means a required field is missing from the CMS template schema. It needs investigating before Google stops showing rich results for those pages.

The other numbers have crept up slightly as inventory grows — more vehicle pages means more instances of the same template-level issues (broken external links, duplicate titles, slow loading). These aren't getting worse per page, there are just more pages.

Three things to focus on this month: investigate the structured data regression, add titles and descriptions to the 3 new store pages, and continue working through the priority list from May.

---

## Monthly health dashboard

| Metric | May | June | Change |
|--------|-----|------|--------|
| Pages crawled | 5,398 | 5,484 | +86 |
| Structured data errors | 0 | 1,235 | Regression |
| Broken external links | 5,291 | 5,391 | +100 |
| Duplicate titles | 1,862 | 1,950 | +88 |
| Slow page load | 3,540 | 4,032 | +492 |
| Duplicate content | 701 | 759 | +58 |
| 4xx errors | 35 | 38 | +3 |
| Multiple H1 tags | 42 | 2 | Fixed |
| Duplicate meta descriptions | 44 | 50 | +6 |
| AEO score | 14/20 | 13/20 | -1 (schema regression) |
| Lighthouse (mobile avg) | Perf 63 / A11y 95 / BP 94 / SEO 98 | Perf 52 / A11y 96 / BP 93 / SEO 98 | Perf -11, A11y +1 |

### Lighthouse scores by page (mobile)

| Page | Perf (May) | Perf (Jun) | A11y | BP | SEO |
|------|-----------|-----------|------|-----|-----|
| / | 60 | 44 (-16) | 100 | 96 | 92 |
| /used-cars | 34 | 26 (-8) | 87 | 96 | 100 |
| /car-finance | 30 | 55 (+25) | 100 | 73 | 100 |
| /stores | 62 | 57 (-5) | 95 | 96 | 100 |
| /blog | 53 | 56 (+3) | 94 | 96 | 100 |
| /faq | 63 | 79 (+16) | 100 | 96 | 100 |
| /about/carsa | 88 | 60 (-28) | 100 | 96 | 100 |
| /contact | 88 | 56 (-32) | 98 | 96 | 100 |
| /used-cars/models/audi-a3 | 62 | 33 (-29) | 84 | 96 | 100 |
| /sell-car/value-car | 86 | 57 (-29) | 100 | 96 | 100 |
| /blog (post) | 81 | 56 (-25) | 96 | 96 | 100 |
| VDP (gv69lcm) | 57 | 56 (-1) | 100 | 92 | 92 |

*June scores from Lighthouse CLI, 18 June 2026. May scores from PageSpeed Insights, 14 May 2026. Both use simulated mobile throttling.*

**Performance note:** Average mobile performance dropped from 63 to 52. The biggest drops are on /about/carsa (-28), /contact (-32), /used-cars/models/audi-a3 (-29), and /sell-car/value-car (-29). /car-finance improved significantly (+25) and /faq improved (+16). Accessibility, Best Practices, and SEO scores are stable. The performance drops are likely due to increased script weight from third-party tools — this reinforces the case for script deferral and CDN migration (tasks #7 and #10).

---

## What changed this month

**Fixed:**
- Chatbot H1 resolved on nearly every page (42 → 2 remaining)

**Regressed:**
- 1,235 pages now have structured data markup errors (was 0 in May)

**In progress:**
- Sell car locations pages (10 store pages live, /sell-car hub and /sell-car/store index still needed)
- Priority task list from May report

---

## Top issues

Each issue below includes what it is, why it matters, what we do about it, and what changes after the fix.

### Critical — needs action now

**1. Structured data markup errors on 1,235 pages**
*Issue:* Make, model, and fuel filter pages are reporting schema markup errors.
*Explanation:* In May, structured data was clean across the entire site. Something changed in the CMS template schema — likely a required field that's missing or malformed. Google will stop showing rich results for affected pages if the errors persist, which means no star ratings, price, or availability in search results for those listings.
*Fix:* Test a sample make page and model page against Google's Rich Results Test to identify the specific error, then fix the CMS template.
*Benefit:* All 1,235 pages get valid structured data restored in one template fix. Rich results return to search listings.

**2. Three new store pages missing title and description**
*Issue:* /stores/bca-bedford, /stores/bca-leeds, and /stores/mansbridge have no page title or meta description.
*Explanation:* Without a title, Google either skips the page or generates its own (usually poorly). Without a description, the search result snippet is unpredictable. These pages also return 403 errors on external resources, suggesting they may not be fully configured.
*Fix:* Add a title and meta description to each page in Webflow. Check the external resource links.
*Benefit:* Three store pages become properly indexed and show the right information in Google results.

### High priority — this sprint

**3. Broken internal links on 10 pages**
*Issue:* The BMW i4 model page and 9 vehicle detail pages contain links that point to pages that no longer exist.
*Explanation:* When a car sells and its page is removed, any links pointing to it break. Visitors hit a dead end, and Google sees a site that links to things that don't exist. The BMW i4 model page is the most visible example.
*Fix:* Remove or redirect the broken links. For sold vehicles, set up automatic 301 redirects to the parent make/model page.
*Benefit:* Visitors always land on a working page. Google stops counting broken links against the site.

**4. 38 vehicle pages returning 404 errors**
*Issue:* 38 VDPs under /vehicles/used/ return 404 but are still linked from other pages on the site.
*Explanation:* These are sold cars. The pages are gone but the links remain, creating 38 dead ends that Google counts as errors. Each one is a small negative signal.
*Fix:* Remove the internal links pointing to these pages, or redirect them to the relevant make/model listing page.
*Benefit:* 38 fewer errors in the next crawl. Visitors who click these links land on a useful page instead of a dead end.

**5. Remaining 2 pages with multiple H1 tags**
*Issue:* /car-care/drive-away-car-insurance and /used-cars/promotions/free-1-year-warranty-2025 still have two H1 headings.
*Explanation:* The sitewide chatbot H1 fix landed on almost every page, but these two were missed. Google reads the H1 to understand what a page is about — two H1s dilute that signal.
*Fix:* Apply the same chatbot heading fix to these two pages.
*Benefit:* Every page on the site will have exactly one main heading, completing the fix that resolved 40 other pages last month.

### Medium priority — this month

**6. 93 pages with only one internal link**
*Issue:* 93 pages across blog posts, niche model pages, and VDPs have just a single internal link pointing to them.
*Explanation:* Pages with few internal links are harder for Google to find and rank. Blog posts like "benefits of part-exchanging" and model pages like "Chery Tiggo 8" are effectively orphaned — they exist but nothing really connects them to the rest of the site.
*Fix:* Add contextual internal links from related blog posts, category pages, and the blog index. For niche models, link from the parent make page.
*Benefit:* Google discovers and ranks these pages more effectively. Visitors find related content they wouldn't have seen otherwise.

**7. 25 nofollow attributes on internal links across 18 pages**
*Issue:* Fuel filter pages (/used-cars/fuel/*) and sell-car store pages have nofollow tags on their internal links.
*Explanation:* Nofollow tells Google "don't follow this link" — useful for external links you don't want to endorse, but counterproductive on your own pages. It means Google doesn't pass ranking power through these links, weakening the pages they point to.
*Fix:* Remove the nofollow attribute from all internal links on these 18 pages.
*Benefit:* Link equity flows properly through the site. Fuel filter pages and sell-car store pages get the ranking support they should already have.

**8. 50 pages with duplicate meta descriptions**
*Issue:* 50 pages share the same meta description as another page, up from 44 last month.
*Explanation:* When two pages have the same description, Google may treat them as near-duplicates or just pick one and ignore the other. The growing count suggests new CMS pages are inheriting a default description instead of getting their own.
*Fix:* Write unique descriptions for each page, or bind the description to CMS fields so each page auto-generates its own.
*Benefit:* Each page gets its own snippet in Google results, and Google stops confusing similar pages.

**9. Broken external images on 2 blog posts**
*Issue:* /blog/best-used-cars-under-15000-uk and /blog/best-used-estate-cars-uk have images that fail to load.
*Explanation:* Broken images make the page look poorly maintained to both visitors and search engines. If these are externally hosted images, the source may have moved or gone offline.
*Fix:* Replace the broken image URLs with working ones, or re-upload the images to Webflow.
*Benefit:* Two blog posts display correctly again. Minor fix, but these are high-traffic posts.

**10. HTTP links on 3 terms pages (unchanged since May)**
*Issue:* /terms/data-privacy, /terms/terms-conditions, and /terms/vehicle-purchase link to http:// instead of https://.
*Explanation:* Modern browsers may show security warnings when clicking an HTTP link from an HTTPS page. On legal/terms pages, this is especially bad optics — visitors might question whether the site handles their data securely.
*Fix:* Find and replace http:// with https:// in the CMS content for these three pages.
*Benefit:* No more mixed-content warnings. Terms pages look as secure as the rest of the site.

### Lower priority — backlog

**11. 5,391 broken external links**
*Issue:* Outbound links across the site point to external URLs that return errors.
*Explanation:* This is the highest raw count but it's a sitewide template issue — the same broken external links repeat on thousands of vehicle pages. The actual number of unique broken URLs is much smaller. Dead outbound links tell Google the site links to things that don't exist, which is a minor trust signal.
*Fix:* Export the unique broken external URLs, categorise by domain, and fix or remove in bulk.
*Benefit:* The single highest error count on the site drops dramatically. Each broken URL fixed removes the error from hundreds or thousands of pages at once.

**12. 5,427 links with no anchor text**
*Issue:* Icon links, image links, and logo links across the site have no text for screen readers or search engines to interpret.
*Explanation:* When a screen reader encounters a link with no text, it says "link" with no context — the user has no idea where it goes. Google faces the same problem: it can't understand what the link is about, so it can't use it as a ranking signal.
*Fix:* Add aria-label or visible text to icon links (e.g. "Facebook"), image links (e.g. "View this car"), and the logo link (e.g. "Carsa home").
*Benefit:* Screen reader users can navigate the site properly. Google understands what every link on the site is about.

**13. 4,032 slow-loading pages**
*Issue:* Pages across the site are flagged for slow load speed, up from 3,540 last month.
*Explanation:* The increase is proportional to new inventory pages. The root causes are the same: heavy script bundles (VWO, n8n Chat, JetBoost, GSAP), Mapbox on store pages, and unoptimised vehicle images. These are high-intent pages where someone is actively looking at a car or planning a visit — slow loading costs conversions.
*Fix:* Defer non-critical scripts, lazy-load below-fold images, and consider moving scripts to a CDN with version pinning (ties into the GitHub repo migration proposal from May).
*Benefit:* Faster pages convert better. Google also uses page speed as a ranking signal.

**14. 1,950 duplicate title tags**
*Issue:* Vehicle page titles are too similar to each other, up from 1,862 last month.
*Explanation:* The CMS template generates titles like "Used 2022 White BMW 3 Series" — when multiple cars share the same year, colour, and model, the titles are identical. Google can't tell them apart, so it picks one and may skip the rest.
*Fix:* Restructure the VDP title template to include differentiating fields (e.g. mileage, price, or registration) so each car gets a unique title.
*Benefit:* Google can distinguish between similar vehicles and index each one individually. More vehicle pages appear in search results.

---

## What's still clean

- Zero 5xx server errors
- Zero redirect chains or loops
- Valid robots.txt
- Valid sitemap.xml structure
- Valid SSL certificate
- No DNS issues
- No encoding or doctype problems
- All AI bots allowed (ChatGPT, Perplexity, Google, Claude)

---

## Automated monthly checks

| Check | What it does | Status |
|-------|-------------|--------|
| Expired promotions | Scan CMS content for dates in the past, flag stale offers | Ready |
| HTTP link detection | Find http:// links on an HTTPS site, replace with https:// | Ready |
| Structured data validation | Audit all JSON-LD against schema.org spec, flag errors | **Alert — 1,235 errors detected** |
| Missing alt text | Detect images without alt text, generate from CMS fields (year, colour, make, model). Can be done in batch via Webflow. | Ready |
| Duplicate meta descriptions | Flag pages sharing the same description | 50 flagged |
| Missing H1 detection | Flag pages with no H1 or multiple H1s | 2 remaining |
| Time-sensitive language | Scan blog posts for hedge words ("currently", "at the time of writing", "as of 2024") that signal staleness | Ready |
| Schema validation | Test deployed schema against Google Rich Results Test | **Needs re-run** |
| CDN version check | Compare loaded script versions against latest releases, flag outdated or unpinned (@latest) dependencies | Ready |

---

## Priority task list

Carried forward from May. Updated with June scan data. New items use the Issue/Explanation/Fix/Benefit format.

### P0 — Fix this week

**1. Investigate and fix structured data regression** — NEW
*Issue:* 1,235 pages now report schema markup errors. Was 0 in May.
*Explanation:* Make, model, and fuel filter template pages are affected. Google will stop showing rich results (price, availability, ratings) for these pages if the errors persist. This is the biggest regression since the first scan.
*Fix:* Run Google Rich Results Test on a sample make and model page. Identify the missing or malformed field. Fix the CMS template.
*Benefit:* One template fix restores valid structured data across 1,235 pages. Rich results return to search.

**2. Add title and description to 3 new store pages** — NEW
*Issue:* /stores/bca-bedford, /stores/bca-leeds, and /stores/mansbridge have no title or meta description.
*Explanation:* Google can't properly index or display these pages in search results without a title. The pages also have external 403 errors, suggesting incomplete configuration.
*Fix:* Add a title and meta description in Webflow. Check external resource links.
*Benefit:* Three store pages become properly indexed and searchable.

**3. Fix chatbot H1 on remaining 2 pages** — Updated (was Blocked, now nearly done)
*Issue:* /car-care/drive-away-car-insurance and /used-cars/promotions/free-1-year-warranty-2025 still have two H1 headings.
*Explanation:* The sitewide fix resolved 40 pages. These two were missed. Two H1s dilute the signal about what the page is about.
*Fix:* Apply the same heading fix to these two pages.
*Benefit:* Completes the H1 fix across 100% of the site.

**4. Add alt text to 50+ images** — Open
*Issue:* Car photos, store images, icons, and blog thumbnails have no text descriptions.
*Explanation:* Screen readers can't describe them and Google can't index them. About 20% of UK adults have some form of disability that affects how they use the web.
*Fix:* Batch fix in Webflow using the AI alt text tool (2 minutes).
*Benefit:* Images become accessible and indexable across the site.

### P1 — First sprint

**5. Fix 10 broken internal links** — NEW
*Issue:* The BMW i4 model page and 9 VDPs have broken internal links.
*Explanation:* These link to sold vehicles whose pages have been removed. Visitors hit dead ends and Google counts each one as an error.
*Fix:* Remove broken links or set up 301 redirects to the parent make/model page.
*Benefit:* 10 fewer broken link errors. Visitors always land on a working page.

**6. Remove 38 sold-vehicle 404s** — NEW
*Issue:* 38 VDPs return 404 but are still linked from other pages.
*Explanation:* Sold cars whose pages are gone but links remain, creating dead ends.
*Fix:* Remove internal links to these pages or redirect to the make/model listing.
*Benefit:* 38 fewer errors. Visitors land on useful pages instead of dead ends.

**7. Move custom code to Carsa-owned GitHub repo** — Proposed
*Issue:* All scripts live as inline code inside Webflow.
*Explanation:* Inline code can't be version-controlled, cached by CDN, or reviewed before deployment. A breaking change is invisible until a customer reports it.
*Fix:* Move to a Carsa-owned GitHub repo and serve via CDN.
*Benefit:* Faster page loads through CDN caching. Version-controlled, reviewable code. Carsa owns it in one place.

**8. Shorten /car-finance page title** — Open
*Issue:* At 67 characters, the title gets cut off in Google search results.
*Explanation:* Google shows about 60 characters. The useful details ("PCP & HP") disappear from the search listing.
*Fix:* Shorten to under 60 characters.
*Benefit:* The full title displays in Google. Visitors see everything before clicking.

**9. Unpublish 2 development pages** — Open
*Issue:* /development/impel-test and /development/eligibility-hero-mcp-test are live and visible to Google.
*Explanation:* Test pages in search results make the site look unfinished. They also dilute crawl budget.
*Fix:* Unpublish or noindex both pages in Webflow.
*Benefit:* Google only sees real pages. The site looks maintained and intentional.

**10. Pin CDN script versions** — Open
*Issue:* GSAP, n8n Chat, and JetBoost all load with "@latest".
*Explanation:* A breaking change from any of these libraries would hit the site without anyone at Carsa doing anything. There's no warning, no rollback.
*Fix:* Pin each script to a specific version number.
*Benefit:* The site is protected from upstream breaking changes. Updates happen deliberately.

**11. Remove expired promotion** — Open
*Issue:* "Ends 31st Dec 25" is still on the homepage.
*Explanation:* A visitor landing in June 2026 will wonder if the site is maintained. AI tools check for freshness before citing a page — an expired promotion is a negative signal.
*Fix:* Remove or update the promotion in Webflow.
*Benefit:* The homepage looks current. One less freshness red flag for AI tools.

**12. Replace "Jane Doe" blog author with real name and bio** — Needs client input
*Issue:* The author byline is "Jane Doe" in the page source.
*Explanation:* Google and AI tools use author signals when deciding whether to trust content. A placeholder name actively undermines credibility.
*Fix:* Replace with a real name and short bio from the Carsa team.
*Benefit:* Blog content gains author trust signals. Google treats it more seriously.

**13. Fix HTTP links in 3 terms pages** — Open (unchanged since May)
*Issue:* /terms/data-privacy, /terms-conditions, and /vehicle-purchase link to http:// instead of https://.
*Explanation:* Browsers may show security warnings. On legal pages, this undermines trust.
*Fix:* Find and replace http:// with https:// in the CMS content.
*Benefit:* No mixed-content warnings. Terms pages look secure.

**14. Write unique description for /value-car** — Open
*Issue:* /value-car and /part-exchange share the same meta description.
*Explanation:* They're different services (selling outright vs trading in). Google may treat them as duplicates and pick one to ignore.
*Fix:* Write a unique description for /value-car that distinguishes it from /part-exchange.
*Benefit:* Both pages rank independently for their respective searches.

**15. Create /sell-car hub page** — Open
*Issue:* /sell-car redirects straight to /sell-car/value-car. No parent page exists.
*Explanation:* Google treats the sell-car section as disconnected pages with no shared topic. There's no page that can rank for "sell my car".
*Fix:* Create a hub page linking to value-car, part-exchange, and the 10 store sell-car pages.
*Benefit:* A topic cluster forms around "sell my car". One page can rank for the head term. The redirect is removed.

**16. Create /sell-car/store index page** — Open
*Issue:* /sell-car/store returns a 404. Ten individual store pages exist with no listing page.
*Explanation:* Bolton, Cannock, Durham, Gloucester, and 6 others are live but disconnected. No page links them together.
*Fix:* Create an index page linking to all 10 store sell-car pages.
*Benefit:* Strengthens internal linking. Gives Carsa a page for "sell my car near me" searches.

### P2 — First month

**17. Audit 93 orphaned pages** — NEW
*Issue:* 93 pages have only one internal link pointing to them.
*Explanation:* Blog posts and niche model pages are effectively invisible. Google struggles to find and rank pages with weak internal linking.
*Fix:* Add contextual links from related content, category pages, and the blog index.
*Benefit:* Orphaned pages become discoverable. Google ranks them more effectively.

**18. Remove nofollow from 18 internal links** — NEW
*Issue:* Fuel filter pages and sell-car store pages have nofollow on internal links.
*Explanation:* Nofollow blocks ranking power from flowing to your own pages. These are pages you want Google to rank.
*Fix:* Remove the nofollow attribute from all internal links on these 18 pages.
*Benefit:* Link equity flows properly. These pages get the ranking support they should already have.

**19. Add skip-to-content link** — Open
*Issue:* No skip navigation link exists.
*Explanation:* Keyboard users tab through the full navigation on every page before reaching content. Motor-impaired users are most affected.
*Fix:* Add an invisible "Skip to main content" link that appears on first tab press.
*Benefit:* Keyboard users reach content immediately. Standard accessibility requirement.

**20. Add anchor text to 109+ links with no text** — Open
*Issue:* Social icons, logo links, and image links have no accessible text.
*Explanation:* Screen readers say "link" with no context. Google can't interpret the link purpose either.
*Fix:* Add aria-label or visible text (e.g. "Facebook", "Home", "View this car").
*Benefit:* Screen reader users understand every link. Google gets more context for ranking.

**21. Add "last updated" dates to key pages** — Open
*Issue:* /car-finance, /faq, and service pages show no date.
*Explanation:* Google and AI tools prefer content with visible freshness signals. Undated content looks potentially stale.
*Fix:* Add a visible "last updated" date to key pages.
*Benefit:* Freshness signals improve. AI tools are more likely to cite dated content.

**22. Rewrite homepage hero for AI extraction** — Open
*Issue:* The hero opens with "Find your next car. Finance ready."
*Explanation:* Good tagline, but AI tools looking for something to quote skip past it. It doesn't say what Carsa is.
*Fix:* Add a factual opening sentence: "Carsa is a UK used car retailer with 2,000+ vehicles and nationwide delivery."
*Benefit:* ChatGPT and Perplexity can quote Carsa when someone asks about UK used car dealers.

**23. Rewrite /car-finance intro** — Open
*Issue:* The opening doesn't answer the question visitors are asking.
*Explanation:* Someone landing here is probably asking "How does car finance work?" The page opens with marketing copy, not an answer.
*Fix:* Answer the question up front, then expand.
*Benefit:* The page ranks for question-based searches. AI tools can extract and cite the answer.

**24. Add links to authoritative sources** — Open
*Issue:* No outbound links to the FCA, DVLA, or Thatcham.
*Explanation:* The site explains finance, warranties, and car care without linking to the authorities that govern them. Google and AI tools treat outbound links to trusted sources as a quality signal.
*Fix:* Add contextual links to relevant authorities where the content references them.
*Benefit:* Trust signals improve. Content looks properly researched and sourced.

**25. Remove time-sensitive language from blog posts** — Open
*Issue:* Phrases like "currently", "at the time of writing", and "as of 2024" appear in blog posts.
*Explanation:* These tell AI tools the content might be outdated, even when the information is still accurate. They're freshness red flags.
*Fix:* Remove or rewrite time-sensitive phrases with evergreen language.
*Benefit:* Blog posts stop signalling staleness. AI tools treat them as current.

**26. Investigate 4,032 slow-loading pages** — Updated (was 3,540)
*Issue:* Pages are flagged for slow load speed, up 14% from May.
*Explanation:* Heavy script bundles (VWO, n8n Chat, JetBoost, GSAP), Mapbox on store pages, unoptimised vehicle images. These are high-intent pages — someone looking at a car or planning a visit.
*Fix:* Defer non-critical scripts, lazy-load below-fold images, CDN with version pinning.
*Benefit:* Faster pages convert better. Google uses page speed as a ranking signal.

### P3 — Backlog

**27. Add HowTo markup to /car-finance** — Open
*Issue:* The "How it works" section has clear steps but no structured markup.
*Explanation:* HowTo schema tells Google "this is a process with defined steps" and could appear as a rich result with numbered steps in search.
*Fix:* Add HowTo JSON-LD schema to the page.
*Benefit:* Potential rich result with step-by-step display in Google search.

**28. Promote FAQ questions to H2 headings** — Open
*Issue:* Questions are nested below a single "FAQs" heading.
*Explanation:* AI tools scan headings to find answers. Questions buried in body text get missed entirely.
*Fix:* Make each question an H2 heading with the answer directly below.
*Benefit:* AI tools find and cite individual answers. Better heading structure for SEO.

**29. Add question-format headings to homepage** — Open
*Issue:* Most sections use statement headings.
*Explanation:* "Why buy from Carsa?" is already there, but it's the only question heading. AI tools match user queries to question-answer pairs.
*Fix:* Rewrite key headings as questions where natural.
*Benefit:* Homepage content matches the questions people type into ChatGPT and Google.

**30. Set up CMS alt text pattern for vehicle images** — Open
*Issue:* Vehicle images have no alt text.
*Explanation:* Every car photo should automatically get text like "2022 Blue BMW 3 Series, front view." Manual work isn't feasible across 4,600+ vehicles.
*Fix:* Set up a CMS-bound alt text pattern using year, colour, make, and model fields.
*Benefit:* All vehicle images become accessible and indexable without manual work.

**31. Add author bios with credentials and Person schema** — Open
*Issue:* Blog posts have no author qualifications or structured data.
*Explanation:* Google uses author expertise signals when evaluating content quality. Named, qualified people behind the content is a trust signal.
*Fix:* Build the author bio template with Person schema. Client provides bio content.
*Benefit:* Blog content gains E-E-A-T signals. Google treats it more seriously.

**32. Shorten /car-care/carsacover title** — Open
*Issue:* At 81 characters, it gets truncated in search results.
*Explanation:* Google shows about 60 characters. The important details at the end are cut off.
*Fix:* Shorten to under 60 characters.
*Benefit:* The full title displays in Google search results.

**33. Shorten VDP title template** — Open
*Issue:* Vehicle page titles run to 98 characters on some pages.
*Explanation:* Google truncates at ~60 characters. Make, model, year, and price should come first but may be cut off.
*Fix:* Restructure the template so key details appear within 60 characters.
*Benefit:* Visitors see the most important vehicle details in search results.

### P4 — Future consideration

**34. Build quarterly original data content** — Open
*Issue:* No original data content exists beyond one fuel impact piece.
*Explanation:* Original data gives other sites and AI tools a reason to reference Carsa. The Iran/Ukraine fuel impact piece is the template.
*Fix:* Create a quarterly report with original Carsa data (e.g. most popular models, average prices by region).
*Benefit:* Earns links and citations. AI tools actively seek original data to cite.

**35. Set up anchor + cluster blog architecture** — Open
*Issue:* Blog posts aren't linked to parent topics.
*Explanation:* 103 posts is enough to build real topical authority, but they need to be connected. Each post should link to a parent topic (car finance, used cars, car care) with two-way linking.
*Fix:* Create topic hub pages and add two-way links between posts and hubs.
*Benefit:* Service pages become the authority hub for each topic. Google sees topical depth.

**36. Set up Consent Mode v2 in GTM** — Open
*Issue:* Current consent implementation may not meet the latest standard.
*Explanation:* Consent Mode v2 is becoming the standard for privacy compliance. It ensures analytics respects user consent choices.
*Fix:* Configure Consent Mode v2 in Google Tag Manager.
*Benefit:* Analytics data collection respects consent. Future-proofed for privacy regulation.

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
| Structured data | 3/4 | Was 4/4 in May. Dropped due to 1,235 schema errors on make/model pages. Core schemas (Organization, WebSite, LocalBusiness, FAQPage, Article, BreadcrumbList, Product) still live on unaffected pages. |
| Answer structure | 5/6 | Blog is strong. Homepage and service pages open with marketing copy, not answers. |
| Freshness | 1/3 | Blog has dates. No "last updated" signals elsewhere. Time-sensitive language in some posts. |
| Authority | 2/4 | Some original data on the blog. No external citations. Weak author signals. |
| Technical | 2/3 | robots.txt and internal links are fine. Alt text drags this down. |
| **Overall** | **13/20** | **Down from 14/20 due to structured data regression. Fix the schema errors and it returns to 14. Content positioning and trust signals remain the growth areas.** |

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

1. Structured data regression is the top priority — we need to identify and fix the template error before Google drops rich results from 1,235 pages.
2. The 3 new store pages need titles and descriptions before they start ranking.
3. The remaining tasks from May are unchanged and renumbered in this report. Let us know which to prioritise next.
4. We'll run a fresh Lighthouse audit in July and show the change from the May baseline.
5. We'll update this report monthly with new scan data and progress against the task list.

---

*Prepared by Will Morley. Based on SEMRush full-site export (5,484 pages), 18 June 2026.*
