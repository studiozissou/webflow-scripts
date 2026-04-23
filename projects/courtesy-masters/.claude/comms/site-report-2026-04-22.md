# CourtesyMasters — Website Audit & Action Plan

**Prepared for:** Menno-Paul Dekker
**Date:** 22 April 2026
**By:** Will Morley

---

## The big picture

CourtesyMasters has been in hospitality recruitment for over 25 years. The website is in better shape than a first look suggested. I audited 100 pages, 9,018 meta tags, 1,337 images, and the full organic search profile. The foundation is solid, but there's a ceiling on the site's visibility that doesn't need to be there.

This isn't a rebuild. It's a set of specific fixes that would let the site show up the way the brand deserves.

---

## Where the site stands today

### You're already on page one

In the Dutch market, CourtesyMasters ranks on page one for the keywords that actually matter:

| Where you rank | Keyword |
|----------------|---------|
| #2 | werving en selectie horeca |
| #3 | courtesy |
| #4 | recruitment horeca |
| #4 | horeca recruitment |
| #5 | hospitality headhunter |

However, direct competitors (mjpeople.nl, independenthospitality.nl, thehospitalityrecruiters.com) rank for a similar number of search terms but get roughly double the traffic due to better technical SEO foundations.

### What's already working

A lot has been set up well:

- SEO head (title, description, social sharing tags) on 95 of 100 pages.
- Zero missing image descriptions across 1,337 images.
- Multilingual setup across 6 languages with proper cross-references.
- Sitemap, SSL, analytics, cookie consent all in place.
- 197 organic keywords indexed, 311 monthly organic visits, and 5,500 backlinks.
- Site health score of 87%, well above average for a site this size.
- Page-one rankings for Dutch terms like "werving en selectie horeca" (#2), "recruitment horeca" (#4), and "hospitality headhunter" (#5).

---

## What's holding the site back

None of these are a crisis on their own, but together they're quietly capping how visible the site is. The difference between CourtesyMasters and its competitors isn't brand strength or content quality. It's that their sites have the right technical setup — structured data, optimised page titles, landing pages for specific roles — so Google and AI platforms can actually use what's there. CourtesyMasters has the content, the site just isn't packaging it in a way search engines can work with.

**Search engines can't read the good stuff.** The site has 22 job listings, 30 FAQs, 16 blog posts, and 6 case studies, but most of it is missing the structured data that tells Google and AI platforms what the content actually is. Only 3 of 22 jobs have the markup needed for Google for Jobs. Those 3 rank. The other 19 are invisible. The 30 FAQs have no markup at all, so ChatGPT, Perplexity, and Google's AI overviews skip them entirely.

**AI platforms barely know the site exists.** The AI visibility score is 21 out of 100, with only 8 mentions across AI search platforms. When someone asks ChatGPT or Perplexity about hospitality recruitment in the Netherlands, CourtesyMasters almost never comes up. This isn't just a technical gap. The site needs answer-first content that AI platforms can actually extract and cite.

**The site is slower than it needs to be.** 80% of bandwidth goes to oversized images. The top 9 alone use 6.4 GB of data transfer unnecessarily. The employer page takes 2.2 seconds to load its main video, which Google penalises and could be optimised. On top of that, 27 page titles get cut off in search results, costing roughly 20-30% of potential clicks per affected page.

**There's clutter in the sitemap.** 7 test and development pages are live and being crawled. Another 7-9 taxonomy collections are generating thin template pages that don't need to exist. This bloats the sitemap and dilutes the site's search presence.

**The site's custom code lives on the previous developer's GitHub.** If they delete their repository, the site breaks. No rollback, no backup. This is the single biggest risk to the site.

**There's room to grow, and the gap isn't that wide.** Your closest competitors (mjpeople.nl, independenthospitality.nl) get roughly double your organic traffic with similar keyword counts. The fixes above would close most of that gap. Beyond that, the site has 25 years of brand equity, a 6-language footprint, and content that could be working harder. If the foundations are fixed there's a real path to more traffic without needing a complete restructure.

---

## The plan

Three stages: fix the foundations, build the structure, then grow. I'd work through it in priority order, starting with whatever gets the most done for the least effort.

### Phase 0 — Quickest, highest impact wins (Week 1)

- Shorten the 27 truncated page titles to improve search click-through.
- Fix 3 blog posts with duplicate headings that confuse search engines.
- Fix a spelling error in a URL that's causing cross-language referencing conflicts on /jobs.
- Add accessibility labels to 5 navigation icons (flagged by Google).
- Clean up 28 pages with broken outbound links.
- Remove 7 test/development pages that are live and being indexed.
- Optimise the biggest images and fonts, cutting bandwidth by more than half.
- Fix 2 CMS collection name typos.
- Disable template pages on 7-9 taxonomy collections to remove thin content from the index.

**Pricing: €720 (6 hours)**

### Phase 1 — De-risk & structured data (Week 1)

- Move the custom code to a repository you own, removing the dependency on the previous developer's GitHub.
- Remove duplicate smooth-scroll code (two conflicting versions running at once, one from an unknown third party).
- Align animation library versions (GSAP 3.12.5 and ScrollTrigger 3.11.4 are on different CDNs).
- Add job listing markup to all 22 positions so every job is eligible for Google for Jobs.
- Add proper company information markup across the site.
- File Webflow Support ticket to remove the previous agency's partner code from the account. Not sure Webflow can do this but we can try if it's important to you.

**Pricing: €720 (6 hours)**

### Phase 2 — Structured data & design improvements (Week 2)

- Footer redesign, with three directions to choose from.
- Restructure the Insights section into news, blog, and video categories with proper URLs and a redirect map so nothing breaks.
- Add FAQ markup to all 30 FAQs so they can appear as expandable results in Google and get cited by AI search.
- Add article markup to 16 blog posts and 3 case studies for richer search presentation.
- Add breadcrumb markup as static HTML (currently only rendered via JavaScript, which some crawlers miss).
- Padding and spacing consistency across the site, starting with the 5 most visited pages.
- Background element cleanup, running alongside the spacing update.

**Pricing: €1,440 - €1,920 (12-16 hours)**

### Phase 3 — Design refactor & operational stability (Week 2-3)

- Sitewide typography and layout standards: centre column under the mega header, 1.5 line-height minimum, left-aligned body text, proper hyphenation handling for Dutch, bullet and list styling.
- Body text colour adjustment. Some grey text doesn't meet accessibility contrast requirements.
- Simplify forms: let me know the requirements and we can improve this.
- Look into replacing Zapier (which you've described as "unstable from day 1") with direct integrations, or make it more resilient.
- CMS field explainers on every field across the 6 main collections so the team can update content confidently.
- CSS hierarchy documentation for any future developer.
- Architecture diagram of the full tech stack.

**Pricing: €1,440 - €2,880 (12-24 hours)**

### Phase 4 — Ongoing (retainer) — Growth

Once the foundation work is done, the focus shifts to growing organic traffic and making the site visible to AI platforms like ChatGPT and Perplexity.

- Improve SEO and AEO. The site currently scores 4 out of 20 for AI search visibility. This means restructuring content to be answer-first, adding author bylines, freshness signals, and internal linking.
- Candidate and employer funnel automation.
- Klaviyo setup for segmented marketing flows and transactional email.
- AI agents with human oversight for SEO monitoring, content creation, brand-voice checks across all 6 languages, and more.
- Content programme targeting the Dutch hospitality recruitment keywords you're already ranking #2-5 for, plus a review of the 5 non-Dutch language versions.
- Dedicated landing pages for high-value keyword clusters (e.g. "general manager hotel", "hotel vacatures", "hospitality management"). The competitor mjpeople.nl drives most of its traffic from role-specific landing pages rather than the homepage.
- Person markup on 16 team bios to build individual expertise signals.
- Competitive gap analysis on the direct competitor set.

**Pricing: €480 - €1,920 per month (4-16 hours)**

---

## Two ways to work together

### Option A — Fixed project

Work through Phases 0-3 over 3-4 weeks, paid per phase in advance.

| Phase | Payment |
|-------|---------|
| Phase 0 — Quick wins | €720 |
| Phase 1 — De-risk & structured data | €720 |
| Phase 2 — Structured data & design | €1,440 - €1,920 |
| Phase 3 — Design refactor & ops | €1,440 - €2,880 |
| **Total** | **€4,320 - €6,240** |

Growth work (Phase 4) moves to a monthly retainer after that.

### Option B — Monthly retainer

6 hours per month at a fixed fee. We work through the list in priority order, so you always know what's coming next and what it costs.

**Monthly: €720/month** (minimum 6 months, then month-to-month with 30 days' notice)

At this pace the Phase 0-3 work takes roughly 6-9 months. You spread the cost, and it transitions naturally into ongoing growth work. Unused hours roll over one month.

---

Please let me know if you have any questions or comments.

Happy to organise a short minute call or come to your offices to walk through the entire plan.

Will
