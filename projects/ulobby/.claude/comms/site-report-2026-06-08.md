# Ulobby: Website Audit & Action Plan

**Prepared for:** Mariann Malchau Olsen, Head of Public Affairs Solutions
**Date:** June 2026
**By:** Will Morley, Studio Zissou

---

## The big picture

The Ulobby site is in good shape. Across 273 pages and four languages, ulobby.eu scored 85 out of 100 on a technical health check. The security is perfect. The site loads fast. Google already understands the company structure, recognises your blog authors, and can read 204 pieces of structured information about who Ulobby is and what it publishes. The brand voice (measured, authoritative, structured) holds from the homepage through every blog article. That consistency is worth more than most people realise.

The problems we found aren't visible to someone browsing the site. They live in the code layer, the part that Google, ChatGPT, Perplexity, and other AI tools read instead of looking at the page. Because they're invisible, they've gone unnoticed. But together, they cap how far the site can reach.

The biggest issue: search engines can't tell which version of each page is the main one. With four language versions of every page and no signal pointing to the primary, Google has to guess. It often guesses wrong, and splits the ranking power between all four instead of concentrating it on one. This is a single configuration fix that improves all 273 pages at once. The rest of the plan builds from there: cleaning up error counts, making content easier for AI tools to quote, and positioning Ulobby to own the Public Affairs software category in search.

---

## Where the site stands today

### The foundation is strong

Here's what's already working well:

- **85/100 health score** across 273 pages and 4 languages (English, Danish, Norwegian, Swedish). That puts Ulobby well above the average B2B software site.
- **204 structured data items** already in place. Google can read who the company is, who writes the blog, and what each article covers. Most sites have none of this.
- **The site is fast and stable.** Every page loads its main content in under 300 milliseconds. Zero layout shift. Nothing jumps around while loading.
- **Accessibility scores range from 91 to 99** across all tested pages. Strong.
- **All AI tools can access the site.** ChatGPT, Perplexity, Google's AI features, and Claude are all allowed to read and reference your content. Many sites block them.
- **270 of 273 pages return correctly.** Only 2 redirects and 1 error. The infrastructure is clean.
- **The blog content is good.** The stakeholder mapping article provides a specific framework (the four-quadrant matrix, the "20-25 true key stakeholders" heuristic) that demonstrates real domain authority. Blog posts lead with answers and use active voice. That's better than most.
- **No risky code dependencies.** Three standard third-party tools (analytics, cookie consent, spam protection). Nothing custom that could break unexpectedly.

### Where you rank today

Most of your search traffic in Denmark comes from people searching for "Ulobby" directly, about 72%. The remaining 28% comes from industry terms like "public affairs" and "stakeholder mapping," where you're on the edge of page one. Here are the positions that matter:

| What people search for | Where you rank (Denmark) | Monthly searches |
|------------------------|--------------------------|------------------|
| ulobby | 1 | 70 |
| public affairs | 11 | 390 |
| public affairs manager | 7 | 140 |
| offentlige anliggender | 5 | 50 |
| stakeholder mapping | 14 | 90 |

Position 11 for "public affairs" means you're just off the first page. People click far more often on the top 10 than anything below it. You're one or two positions away.

Your English-language blog content is also being discovered internationally. Over the past 12 months, the number of English search terms Google associates with Ulobby has grown from 27 to 72 (nearly tripled) without any new content being published. The content is working. It just needs the technical support to convert those rankings into visits.

---

## What's holding the site back

**Search engines can't tell which language version of each page is the main one.** Every page on the site, all 273 of them, is missing a tag that tells Google "this is the primary version." For a site with four languages, that's especially damaging. Google has to guess whether to show the English, Danish, Norwegian, or Swedish version. It often guesses wrong, and splits the ranking power between all four instead of concentrating it on one. This is a single configuration fix. Webflow generates this tag automatically. Something in the settings has switched it off.

**171 errors come from one line of code.** The cookie consent banner uses a code pattern that search engine crawlers interpret as 171 broken links, one on every page. It makes the site look significantly less healthy than it actually is. The fix is straightforward and cuts the total error count by 77%.

**22 pages have structured data errors.** The solutions pages and homepage variants tell Google "this is a software application" but don't include the details Google requires for that claim. Invalid structured data is worse than none at all. It undermines the trust built by the 204 valid items alongside it.

**The analytics may be collecting data before visitors consent.** The tracking code appears to fire before the cookie consent banner has a chance to record a visitor's choice. For an EU-focused business operating across Denmark, Norway, and Sweden, this is a compliance risk worth checking.

**16 links point to a website that no longer exists.** Four blog articles (across all language versions) link to thepublicaffairsengine.com, which has gone offline. Dead outbound links erode trust signals.

**AI tools can access the site, but there's nothing structured for them to quote.** This is the largest growth opportunity. ChatGPT, Perplexity, and Google's AI features all look for content organised around clear questions and concise answers. Right now, zero headings across the entire site are phrased as questions. There are no FAQ sections. No visible "last updated" dates. No original data points or benchmarks that AI tools could cite. The door is open, but nothing behind it is packaged for citation. Our testing confirms it: blog articles score 19-50 out of 100 on AI readiness, while your solutions pages score 100. The content exists, but it's not packaged in a way those tools can use.

---

## The competitive picture

No Public Affairs software company in Denmark has real search visibility. The closest competitor, PublicAffairsGroup.dk, has 17 search terms and zero organic traffic. Nobody owns this category yet.

Internationally, a US-based competitor called CiviClick is growing fast. They've tripled their search visibility in 12 months and now own product-category terms like "advocacy software" and "grassroots advocacy software." Ulobby doesn't appear for any of these terms yet. CiviClick isn't in the Danish market, but the gap in English-language product search is widening.

The good news: Ulobby's own English visibility is growing too. Your blog content is being discovered by Google without any new investment. The remediation work (fixing the configuration issue, cleaning up errors, restructuring content for AI) should accelerate that momentum. And in Denmark, there's a specific opportunity: "lobbyisme" gets 880 searches a month and nobody ranks for it. That keyword is sitting there unclaimed.

### Norway and Sweden are invisible, but the opportunity is real

Right now, Ulobby gets no search traffic in Norway and Sweden. The Norwegian and Swedish pages exist, but Google isn't surfacing them for local-language searches. The only terms Ulobby ranks for in either market are English phrases that happen to match, not deliberate targeting.

The numbers tell the story:

| Market | Current keywords | Current traffic | Addressable search volume |
|--------|-----------------|----------------|--------------------------|
| Norway | 2 | 0/month | ~4,965/month |
| Sweden | 2 | 0/month | ~7,500/month |

In Norway, people search for "lobbyvirksomhet" 720 times a month. "Interessentanalyse" gets 590 searches. "Lobbyregister" (a live political topic as the Stortinget debates mandatory lobby registration) gets 320. The entire first page of results for all of these terms is encyclopedias and government websites. No software company ranks for any of them.

In Sweden, "lobbying," "lobbyist," and "lobbyism" each get 1,300 searches a month. "Intressentanalys" gets 390. The main competition is a single Swedish PR agency (Influera.com) with relatively thin content. Asana (a project management tool) ranks #3 for "intressentanalys," which proves a SaaS company can break into these results.

Meanwhile, Google is actively deprioritising English content in Scandinavian search results. A major English-language Public Affairs site (PublicAffairsNetworking.com) collapsed from 24 Swedish keywords to 11, and from 18 Norwegian keywords to zero, all in the past 12 months. The window for English-only content in these markets is closing. Local-language content is what Google wants to show.

The 63 untranslated pages on the site are the root cause. Norwegian and Swedish URLs that contain English text confuse search engines about what language the page is in, so Google doesn't show them to Norwegian or Swedish searchers. Fixing the technical issues in Phases 0-1 creates the foundation, but unlocking these markets requires Norwegian and Swedish content, which is a decision and investment on your side.

---

## The plan

Four phases, working in priority order. Each builds on the one before it. I'd start with whatever gets the most done for the least effort. Phase 0 is almost entirely that.

### Phase 0: Critical fixes and compliance (Week 1)

**1. Canonical tags missing** (30 min)
*Issue:* Google can't tell which language version of each page is the main one, so it splits your ranking power across all four.
*Fix:* Re-enable a single setting in Webflow.
*Impact:* All 273 pages immediately stop competing against their own translations.

**2. Cookie consent banner errors** (30 min)
*Issue:* The banner code creates 171 fake "broken link" errors that make the site look unhealthy to search engines.
*Fix:* Change one line of code in the banner.
*Impact:* Site error count drops by 77%.

**3. Analytics firing before consent** (30 min)
*Issue:* Your tracking appears to collect visitor data before people have a chance to say yes or no.
*Fix:* Configure Google Tag Manager to wait for the consent signal.
*Impact:* One less GDPR headache for an EU-focused business.

**4. Invalid software claims** (30 min)
*Issue:* 22 pages tell Google "this is a software application" but leave out the details Google requires. That makes the claims look untrustworthy.
*Fix:* Remove or complete the claims on those pages.
*Impact:* The 204 valid items stop being dragged down by the 22 bad ones.

**5. Dead external links** (15 min)
*Issue:* 16 links across 4 blog articles point to thepublicaffairsengine.com, which has gone offline.
*Fix:* Remove the dead links.
*Impact:* Minor, but it's a 15-minute fix.

**Cost: €270 (2.25 hours)**

### Phase 1: Search structure and metadata (Week 1-2)

**6. Duplicate blog listing titles and descriptions** (30 min)
*Issue:* 12 blog listing pages all share the same title and description across languages. Google sees them as duplicates.
*Fix:* Write unique titles and descriptions per language, with page numbers on paginated pages.
*Impact:* The Danish blog page stops fighting with the Norwegian one for the same spot in Google.

**7. Missing newsletter descriptions** (15 min)
*Issue:* 4 newsletter pages have no description, so Google auto-generates one (usually poorly).
*Fix:* Add a short description to each.
*Impact:* Google shows your description instead of making one up.

**8. Confused heading structure** (15 min)
*Issue:* 9 pages have two main headings, which sends mixed signals about what the page is about.
*Fix:* Demote the secondary heading.
*Impact:* Google stops getting confused about what those pages are about.

**9. Truncated page titles** (15 min)
*Issue:* 7 page titles are too long and get cut off in Google results.
*Fix:* Shorten them to fit.
*Impact:* People can read the full title in Google instead of seeing "..."

**10. Conflicting and missing language tags** (45 min)
*Issue:* 4 pages send contradictory signals about which market they're for. 12 more pages have no language tag at all.
*Fix:* Correct the conflicts and add the missing tags.
*Impact:* Google shows the right language version to the right audience.

**11. Orphaned sitemap pages** (30 min)
*Issue:* 37 pages are in the sitemap but not linked from anywhere on the site. Google crawls them but visitors can't find them.
*Fix:* Link them internally if they're still relevant, or remove them from the sitemap.
*Impact:* Google focuses on the pages that actually matter.

**Cost: €300 (2.5 hours)**

### Phase 2: Enrichment and accessibility (Week 2-3)

**12. No breadcrumb navigation data** (30 min)
*Issue:* Blog articles and nested pages don't tell Google where they sit in the site hierarchy.
*Fix:* Add breadcrumb data to those pages.
*Impact:* Google can show a richer result with a clickable path (e.g. Ulobby > Blog > Stakeholder Mapping).

**13. Missing image descriptions** (15 min)
*Issue:* Multiple images have no text description. Screen readers skip them. Search engines can't interpret them.
*Fix:* Add descriptive text to informative images across the site.
*Impact:* Screen readers can describe the images to visitors, and Google can index them.

**14. Generic link text** (1 hr)
*Issue:* 437 links say "Read more" or "Learn more" instead of something specific. 109 image links say nothing at all.
*Fix:* Replace with descriptive text (e.g. "Read: Stakeholder Mapping Guide").
*Impact:* Screen readers can tell visitors where a link goes, and Google gets more context too.

**15. AI summary file missing** (15 min)
*Issue:* There's no machine-readable file telling AI tools what Ulobby is and where to find key content.
*Fix:* Create an llms.txt file at the site root.
*Impact:* AI tools like ChatGPT and Perplexity can understand the site's identity and scope at a glance.

**16. Oversized images** (15 min)
*Issue:* One portrait photo alone uses nearly a gigabyte of bandwidth per month. Several other images are uncompressed.
*Fix:* Compress and convert the top offenders.
*Impact:* Faster page loads, lower hosting costs.

**17. CMS cleanup** (15 min)
*Issue:* 6 unnecessary template pages exist in the content management system.
*Fix:* Remove them.
*Impact:* Tidier CMS, fewer stray pages for Google to crawl.

**Cost: €330 (2.75 hours)**

### Phase 3: AI search readiness and content structure (Week 3-4)

**18. No question-shaped headings** (2 hrs)
*Issue:* Zero headings across the entire site are phrased as questions. AI tools look for question-and-answer patterns to quote.
*Fix:* Rewrite key headings as questions (e.g. "What is stakeholder mapping?"). I draft, you approve.
*Impact:* Your headings match the questions people are already typing into ChatGPT and Google.

**19. No FAQ sections** (1 hr)
*Issue:* Solutions pages have no FAQ blocks. Google can't show expandable FAQ results, and AI tools have nothing structured to extract.
*Fix:* Build FAQ sections with the right markup. I handle the build, you write or approve the questions (5-8 per page).
*Impact:* Google can show expandable FAQ results, and AI tools get answers they can quote directly.

**20. No freshness signals** (30 min)
*Issue:* No page shows when it was last updated. Search engines and AI tools treat undated content as potentially stale.
*Fix:* Add a visible "last updated" date to key pages and blog articles.
*Impact:* Search engines and AI tools prefer content that looks recently reviewed.

**21. Weak page structure** (1 hr)
*Issue:* The site uses generic containers instead of meaningful page sections. AI tools struggle to identify where one topic ends and another begins.
*Fix:* Upgrade the underlying structure so content boundaries are clear.
*Impact:* When ChatGPT or Perplexity pulls a quote, it grabs the right section instead of a random chunk.

**22. Page titles duplicate headings** (1 hr)
*Issue:* 85 pages show the same text in Google results and at the top of the page. That's a wasted opportunity to say two different things.
*Fix:* Differentiate titles from headings on key commercial pages. I draft, you approve.
*Impact:* Better click-through from search results.

**23. No author bios** (30 min)
*Issue:* Blog bylines exist but have no credentials or background. Google values author expertise signals.
*Fix:* Build the author bio template. You provide the bio content.
*Impact:* Google takes blog content more seriously when it knows who wrote it and why they're qualified.

**You'd also need to decide on:**
- Whether to break up longer blog sections with subheadings (editorial choice about how the articles read)
- Which external sources to link to from blog articles (EU policy databases, academic frameworks, etc.). You decide which sources to endorse

**Cost: €720 (6 hours)**

### Phase 4: Ongoing growth (retainer)

**I handle:**
- Set up tracking for AI referral traffic so we can measure how often ChatGPT, Perplexity, and others send visitors to the site
- Audit which of the 63 untranslated pages need priority attention
- Build the technical infrastructure for new content (page templates, schema, internal linking)
- Create a product category page for "Public Affairs software" to compete on the terms CiviClick is capturing

**You'd need to decide and act on:**
- **Translation.** The 63 pages where Norwegian or Swedish URLs have English content need translating. This is the key to unlocking those markets: nearly 12,500 monthly searches across NO and SE that Ulobby currently gets zero of. I can audit and prioritise which pages matter most, but the translation itself needs to come from your side.
- **Content refresh cadence.** Committing to review and update your top pages every 90 days. Even small copy changes signal freshness to search engines and AI tools.
- **Original data.** Adding real numbers to your commercial pages ("Ulobby users track an average of X stakeholders per issue") and eventually creating a flagship report like "State of Public Affairs 2027" with original survey data. This is the content competitors can't replicate, and the kind AI tools actively seek to cite.
- **Readability.** The site copy currently reads at a university level (Flesch score ~55). Simplifying toward a 65-70 target makes it easier for AI tools to extract and quote, but it's a brand voice trade-off that only you can make.
- **Norwegian and Swedish content strategy.** "Lobbyvirksomhet" (720 searches/month in Norway), "interessentanalyse" (590/month), and "intressentanalys" (390/month in Sweden) are all unclaimed by any software company. A definitive Norwegian guide on lobbying and a Swedish guide on stakeholder analysis could generate 200-330 visits per month from markets that currently deliver zero. I can build the pages and handle the SEO, but the content needs to be written in Norwegian and Swedish.

**Cost: €240/month (2 hours)**

---

## Three ways to work together

### Option A: Fixed project

Phases 0 through 3, delivered over 4 weeks. 50% upfront, 50% on completion.

| Phase | Cost |
|-------|------|
| Phase 0: Critical fixes and compliance | €270 |
| Phase 1: Search structure and metadata | €300 |
| Phase 2: Enrichment and accessibility | €330 |
| Phase 3: AI search readiness and content | €720 |
| **Total** | **€1,620** |

Growth work (Phase 4) moves to a monthly retainer after that.

### Option B: Monthly retainer

4 hours per month at €480/month. We work through the list in priority order, so you always know what's coming next and what it costs.

At that pace, the Phase 0-3 work takes roughly 3-4 months. You spread the cost, and it transitions naturally into ongoing growth work. Minimum 4-month commitment (€1,920 total), then month-to-month with 30 days' notice.

### Option C: Pick and choose

If you'd rather tackle specific items, here's the full task list with individual time and cost estimates. Pick the ones that matter most and we'll scope a custom project. No minimum.

#### If I had to pick five

These are the highest-impact tasks regardless of which phase they sit in. If you want the most improvement for the least spend, start here.

| # | Task | Time | Cost | Why it matters |
|---|------|------|------|----------------|
| 1 | Restore missing canonical tags on all 273 pages | 30 min | €60 | Single biggest issue. All 4 language versions of every page compete against each other instead of reinforcing one. One fix, 273 pages improved. |
| 2 | Fix GTM/Cookiebot consent firing order | 30 min | €60 | GDPR compliance risk. Analytics appears to fire before visitors consent. Legal exposure for an EU business. |
| 4 | Fix or remove 22 invalid SoftwareApplication schema | 30 min | €60 | Invalid structured data actively undermines the 204 valid items beside it. Worse than having none. |
| 11 | Fix 4 conflicting hreflang declarations | 30 min | €60 | These pages send contradictory signals about which market they're for. Google can't resolve the conflict, so it may show the wrong language version. |
| 24 | Build FAQ sections with schema on solutions pages | 1 hr | €120 | Enables FAQ rich results in Google and gives AI tools structured answers to extract. The biggest single step toward AI search visibility. Requires your input on the questions. |

**Top 5 total: 3 hours, €360**

#### The full menu

Everything else, grouped by category. All prices are fixed. No surprises.

**Fixes and compliance**

| # | Task | Time | Cost |
|---|------|------|------|
| 3 | Fix 171 malformed Cookiebot links inflating error count | 30 min | €60 |
| 5 | Remove 16 broken links to thepublicaffairsengine.com | 15 min | €30 |

**Search structure and metadata**

| # | Task | Time | Cost |
|---|------|------|------|
| 6 | Fix 12 duplicate blog listing titles across locales | 15 min | €30 |
| 7 | Fix 12 duplicate blog listing descriptions across locales | 15 min | €30 |
| 8 | Add missing descriptions to 4 newsletter pages | 15 min | €30 |
| 9 | Fix 9 pages with multiple H1 tags | 15 min | €30 |
| 10 | Shorten 7 page titles that get cut off in Google results | 15 min | €30 |
| 12 | Add hreflang tags to 12 pages missing them | 15 min | €30 |
| 13 | Verify 97 pages blocked from crawling (intentional or not) | 15 min | €30 |
| 14 | Audit 37 orphaned sitemap pages: link or remove | 15 min | €30 |

**Enrichment and accessibility**

| # | Task | Time | Cost |
|---|------|------|------|
| 15 | Add breadcrumb navigation schema to blog and nested pages | 30 min | €60 |
| 16 | Create llms.txt file for AI tool discovery | 15 min | €30 |
| 17 | Add descriptive alt text to images site-wide | 15 min | €30 |
| 18 | Replace 437 generic "Read more" links with descriptive text | 30 min | €60 |
| 19 | Add accessible labels to 109 image/icon links | 30 min | €60 |
| 20 | Remove 6 unnecessary CMS template pages | 15 min | €30 |
| 21 | Fix Blog Categories slug inconsistency | 15 min | €30 |
| 22 | Compress top image files (portrait photo = 959 MB/month bandwidth) | 15 min | €30 |

**AI search readiness and content structure**

| # | Task | Time | Cost |
|---|------|------|------|
| 23 | Rewrite key headings as questions for AI search (I draft, you approve) | 2 hrs | €240 |
| 25 | Add visible "last updated" dates to all key pages and blog | 30 min | €60 |
| 27 | Improve page structure with semantic HTML for AI extraction | 1 hr | €120 |
| 29 | Differentiate page titles from H1s on commercial pages (I draft, you approve) | 1 hr | €120 |
| 30 | Add WebSite + SearchAction schema for sitelinks search box | 30 min | €60 |

*Tasks 26 and 28 are content decisions on your side. No cost from me.*

**How it works:** Pick the tasks you want, I'll total them up, and we start. You can always add more later.

---

## What changes after this work

The site already works well for people who know Ulobby exists. After this work, it also works for the people who don't.

Search engines stop splitting ranking power across four language versions of every page and start concentrating it. The error count drops from 221 to under 30. Blog articles that currently sit on the edge of page one get the structural support to break through.

AI tools like ChatGPT and Perplexity can quote Ulobby when someone asks "What is Public Affairs software?" or "How does stakeholder mapping work?" Right now they can read the content but there's nothing formatted for them to extract. After the heading and FAQ work, there is.

In Denmark, where no competitor has meaningful search visibility, Ulobby has a window to own the category. In Norway and Sweden, there's nearly 12,500 monthly searches for lobbying, stakeholder, and public affairs terms where no software company ranks at all. The technical fixes lay the groundwork. The content investment (translation, local-language guides, original data) is what turns it into traffic.

I handle the technical and structural work. The content and product decisions (what to translate first, what data to share, which sources to endorse) are yours. You need both: fixing the code without investing in content stops the bleeding but doesn't grow anything, and publishing new content on a broken foundation means it won't rank.

---

Happy to walk through any of this on a call. Let me know which option works best, or if you'd like to start with a specific phase.

Will

---

*Based on SEMRush crawl, Google Lighthouse, Chrome DevTools, and manual review. June 2026.*
