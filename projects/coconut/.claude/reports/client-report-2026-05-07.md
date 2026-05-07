# Coconut website audit

**Prepared for:** Coconut | **Date:** 7 May 2026 | **Site:** www.getcoconut.com

---

## The short version

Your site is in better shape than most we audit. 155 pages, 92/100 on Google's SEO audit, consistent brand voice, and genuinely useful content (the MTD guides and expense explainers especially). The technical foundations are clean.

The problem is that search engines, AI assistants like ChatGPT and Perplexity, and accessibility tools all rely on structured information behind the scenes of your pages. Most of that information is either missing or half-done. The content itself is good. It's just not labelled in the way these systems expect.

Six things are holding the site back:

1. **Google doesn't know who Coconut is.** There's no company identity data ("Organization schema") on the homepage or anywhere site-wide. This is what powers the branded info box in Google search results and tells AI tools that Coconut is a company. It's the thing you specifically asked about, and it doesn't exist yet.

2. **60-70% of images have no text descriptions.** About 105 images, 81 on the homepage alone, are missing alt text. Screen readers can't describe them to visually impaired users, and Google Image search can't index them properly.

3. **17 Q&As sit on the site with no markup.** 13 on the homepage, 4 on pricing. Google can't show them as expandable results in search because they're not tagged. The MTD page already does this, so the pattern exists. It just hasn't been copied across.

4. **Analytics fires before cookie consent.** Tracking tools start collecting data before visitors choose their cookie preferences. That's a GDPR problem.

5. **No links to official sources anywhere.** The site explains MTD, tax allowances, and self-assessment rules without ever linking to HMRC.gov.uk. AI answer tools treat outbound links to government sources as a trust signal. Without them, the site looks less credible to the systems picking what to quote.

6. **A competitor's tracking script may be on your site.** A behavioural tracking tool loads from a GoSimpleTax web address. Worth investigating.

None of these is urgent on its own. Together, they put a ceiling on what the content can achieve.

The work breaks into three themes: protecting what you have (compliance fixes, cleanup), unlocking what's already there (structured data, accessibility), and growing from that base (authority signals, content positioning). The plan below follows that sequence.

---

## What's working well

| Area | What we found |
|------|---------------|
| Security | Entire site runs on HTTPS. No mixed content. |
| Sitemap | 392 pages listed and correctly linked. Search engines use this to discover your pages. |
| Error page | Branded 404 page in place, so broken links still show your brand. |
| Browser icons | Tab icon and mobile home screen icon both set. |
| Domain setup | www.getcoconut.com is the primary address, all four domain variants configured. |
| Analytics | Google Analytics, Google Ads, TikTok, Facebook, Hotjar, and Intercom all connected. |
| Cookie consent | Consent banner with granular controls across seven categories. |
| Page titles | Present on all key pages. |
| Mobile | Correctly configured for mobile on all pages. |
| Google audit scores | SEO: 92/100, Accessibility: 86/100 on homepage. |
| AI bot access | No AI search bots are blocked (ChatGPT, Claude, Perplexity, Google AI). They can read and cite your content. |

---

## What needs attention

Grouped by priority. Each task has an estimated time.

---

### Priority 0 -- Quick wins (Week 1)

No design decisions needed. All under an hour total.

| # | What we'll do | Hours | Why it matters |
|---|---------------|-------|----------------|
| 1 | **Tell Google who Coconut is** -- add company identity data ("Organization schema") across the whole site. This powers the info box that appears when someone Googles your brand name, and helps AI assistants identify your company. Your primary request. | -- | Right now Google has no structured way to know Coconut is a company, what it does, or how to display it. |
| 2 | **Add company data to the About page** -- currently has zero structured data, even though it's the page Google most expects to find it on. | -- | Connects your About page to your brand identity in Google's systems. |
| 3 | **Fix the Jobs page headings** -- two main headings ("Careers at Coconut" and "Current vacancies") where there should be one. We'll make "Current vacancies" a sub-heading. | -- | Search engines use heading structure to understand page topics. Two main headings muddy the signal. |
| 4 | **Fix typo on Features page** -- the Google search result description says "with simple our intuitive" instead of "our simple, intuitive". | -- | That's the text people see before they decide to click. |
| 5 | **Fix typo on Pricing page** -- "Making Tax Digial" is missing the 't'. | -- | Visible typo on a conversion page. |
| 6 | **Delete 8 test/draft pages** -- leftovers from development (/mtd-software-copy-1, /gosimpletax-mp-test, etc.). | -- | Clutter in the CMS. Risk of test pages accidentally going live. |
| 7 | **Create an llms.txt file** -- a small text file at the root of your site that tells AI assistants what the site is about. Works like robots.txt (the file that tells search engines how to crawl your site) but for AI tools. | 0.25 | Currently returns a "page not found" error. |

**P0 total: ~1 hour**

---

### Priority 1 -- Search visibility and risk reduction (Weeks 1-2)

Structured data that produces real results in Google, plus compliance fixes.

| # | What we'll do | Hours | Why it matters |
|---|---------------|-------|----------------|
| 9 | **Mark up the homepage FAQ** -- 13 questions and answers already exist on the page. We'll add behind-the-scenes code ("FAQ schema") so Google can show them as expandable Q&As directly in search results, and AI assistants can quote them. | 0.5 | The /mtd-software page already does this well. We're applying the same thing to the page with more traffic. |
| 10 | **Mark up the Pricing page FAQ** -- same approach for the 4 Q&As there. | 0.5 | Gets your pricing FAQs into Google search results. |
| 11 | **Fix Knowledge Hub article data** -- articles are missing the "publisher" field and the author is stored as plain text instead of a proper reference. Google needs both for article-style search results with author name and publish date. | 0.25 | Without these fields, Google won't show rich article results for your Knowledge Hub. |
| 12 | **Add breadcrumb trail data** to the Accountant Software page and Knowledge Hub articles. Breadcrumbs are the "Home > Features > MTD Software" navigation path that appears in Google results. Some pages have this, others don't. | 0.5 | Makes your search listings clearer and more clickable. |
| 13 | **Fix analytics consent timing** -- tracking tools (Google Analytics, ad pixels) currently start collecting data before visitors make their cookie choice. We'll add Google's Consent Mode v2, which holds tracking until consent is given. | 2 | GDPR and PECR (the UK's electronic communications privacy rules) compliance issue. |
| 14 | **Audit the two Facebook pixels** -- your site has two separate Facebook Pixel IDs. We'll check if both are needed. | 0.25 | Redundant pixels slow page load and can double-count conversions. |
| 15 | **Remove or hide 7 old archive pages** -- published under /archive-2025/ and /archive/, possibly showing up in Google. | 0.25 | Keeps outdated content out of search results. |
| 16 | **Add your review score to the homepage** -- the Accountant Software page already shows 4.5/5 stars in its structured data. We'll do the same on the homepage. | 0.25 | Star ratings in Google results increase click-through rates. |

**P1 total: 4.5 hours**

One more thing: we found a tracking script on your site that appears to belong to GoSimpleTax, not Coconut. It loads from a GoSimpleTax web address and may be collecting behavioural data from your visitors. We'd recommend looking into this internally. Flagged for your team, not included in our hours.

---

### Priority 2 -- Content structure and quality (Weeks 2-3)

Changes that visitors and search engines will both notice.

| # | What we'll do | Hours | Why it matters |
|---|---------------|-------|----------------|
| 17 | **Add image descriptions (alt text) across the site** -- about 105 images have no text descriptions. Homepage: 81 of 122, Features: 17 of 22, About: 7 of 29. | 0.5 | Screen readers read alt text aloud for visually impaired users. It's a basic accessibility requirement (WCAG Level A, the minimum standard) and helps images appear in Google Image search. |
| 18 | **Consolidate 3 overlapping sole trader pages** -- /sole-traders, /mtd-for-sole-traders, and /mtd-software/sole-traders all target similar search terms. We'll keep the strongest and redirect the others. | 0.25 | When multiple pages compete for the same terms they can cancel each other out. One strong page beats three weak ones. |
| 19 | **Add links to HMRC.gov.uk** on MTD and Knowledge Hub pages. | 0.5 | The site explains MTD and tax allowances without linking to the official HMRC source. Search engines and AI tools treat outbound links to government sites as a trust signal. |
| 20 | **Add "last updated" dates** to the homepage, /mtd-software, and /features. | 0.5 | Google and AI assistants use dates to judge whether content is current. These pages show no date at all. |
| 21 | **Fix heading structure on /mtd-software** -- headings skip from level 2 to level 4 in the pricing section. | 0.25 | Consistent heading levels help search engines and screen readers parse the page. |
| 22 | **Clean up the sitemap** -- remove 6+ pages that shouldn't be listed (old content, search page, internal tools). | 0.25 | Your sitemap is the index search engines use to find pages. Including dead or irrelevant pages wastes their attention. |
| 23 | **Remove unnecessary template pages** for Blog Banner Ads and Speaker collections. These are category-type collections that don't need individual pages. | 0.25 | Prevents thin, low value pages from being indexed. |
| 24 | **Review session recording tools against your privacy policy** -- Hotjar and Zoho PageSense both record visitor sessions (mouse movements, clicks, scrolling). | 0 | Flagged for your review. Worth checking your privacy policy covers session recording and that sensitive form fields are excluded. |
| 25 | **Improve link text across the site** -- 60+ links say "Read more" or "Learn more" instead of describing where they lead. | 1 | "Read our MTD guide" tells both search engines and screen reader users more than "Read more". |
| 26 | **Fix 5 empty links** across 3 Knowledge Hub articles -- links with no clickable text. | 0.25 | Invisible to screen readers, confusing to search engines. |
| 27 | **Fix duplicate page descriptions** on 2 legal partnership pages. | 0.25 | The Times and Zempler partnership pages share the same search result description. Each should have its own. |
| 28 | **Fix structured data errors** -- 8 errors across 7 pages found in our SEMRush crawl (homepage, /accountant-software, /features, /pricing, /webinars-and-events, /work-from-home-calculator, /zempler). | 1 | Errors in structured data can cause Google to ignore it. Fixing these makes the markup you already have actually work. |

**P2 total: 5 hours**

---

### Priority 3 -- Authority and content positioning (Weeks 3-4)

These involve writing or editorial review. They build on the structured data work above.

| # | What we'll do | Hours | Why it matters |
|---|---------------|-------|----------------|
| 29 | **Rewrite the homepage opening paragraph** to lead with what Coconut does rather than a marketing line. | 0.25 | AI assistants grab the first paragraph when deciding what to quote. A brand hook gets skipped; a clear answer gets cited. |
| 30 | **Rewrite the Features page opening** -- same issue. | 0.25 | Same reason. |
| 31 | **Add question-format subheadings to the homepage** -- e.g. "What is Making Tax Digital?" or "How does Coconut help sole traders?" | 0.5 | Google's "People Also Ask" boxes and AI assistants look for question-and-answer patterns. The homepage has none. |
| 32 | **Add named authors to Knowledge Hub articles** -- everything is currently "The Coconut Team". | 2 | Named authors are a trust signal. Google and AI tools give more weight to content with identifiable people behind it. |
| 33 | **Add original data or statistics to key pages** -- the site has no original research, surveys, or proprietary numbers. | 2 | Original data is one of the strongest reasons for other sites and AI tools to cite you. |
| 34 | **Review the /blog and /knowledge-hub listing pages** -- both redirect to the homepage instead of showing articles. | 1 | Listing pages help search engines find all your articles and build topical authority. |
| 35 | **Fix 15 poorly connected Knowledge Hub articles** -- each has only one internal link pointing to it. | 1 | Pages with few internal links get less search engine attention. Cross-linking related articles strengthens the whole Knowledge Hub. |
| 36 | **Shorten 2 over-long page titles** -- the Christmas shutdown checklist and self-assessment articles get cut off in Google results. | 0.25 | Truncated titles look unfinished in search results. |

**P3 total: 7.25 hours**

---

### Priority 4 -- Ongoing (Retainer)

Longer term work that builds on the above.

| # | What we'll do | Hours | Why it matters |
|---|---------------|-------|----------------|
| 37 | **Create a landlord landing page** -- landlords are bundled with sole traders, no distinct messaging. | 1 | Landlords search for different terms. A dedicated page captures that traffic. |
| 38 | **Audit the Accountant Software page** -- accountants get nav links but no real pitch. | 1 | If accountants are a real audience, the site should talk to them properly. |
| 39 | **Start a content freshness programme** -- update Knowledge Hub articles older than 6 months. | 1 | Search engines and AI assistants prefer recently updated content. Several articles are 8+ months stale. |
| 40 | **Add job listing structured data** when vacancies are posted. | 1 | Gets your jobs into Google's Jobs search with salary, location, and apply buttons. |
| 41 | **Run a competitor keyword analysis** via SEMRush. | 1 | Shows which terms competitors rank for that you don't, and where your best opportunities are. |
| 42 | **Refresh the About page** -- thinner and more generic than the rest of the site. | 1 | The About page talks about "enabling this economy to boom", which doesn't match the friendly, practical tone everywhere else. |
| 43 | **Strengthen generic calls to action** -- swap "Read more" and "More information" for text that matches your brand voice. | 1 | Calls to action are the buttons and links that prompt visitors to do something. Specific ones ("Start your free trial") outperform generic ones ("Read more"). |

**P4 total: 7 hours**

---

## Summary

| Priority | Focus | Pillar | Hours | Timing |
|----------|-------|--------|-------|--------|
| P0 | Quick wins | Unlock + Protect | 1 | Week 1 |
| P1 | Search visibility, risk reduction | Unlock + Protect | 4.5 | Weeks 1-2 |
| P2 | Content structure, quality | Unlock + Protect | 5 | Weeks 2-3 |
| P3 | Authority, content positioning | Grow | 7.25 | Weeks 3-4 |
| P4 | Ongoing growth | Grow | 7 | Retainer |
| **Total** | | | **24.75 hours** | |

---

## AI search readiness score

We scored how ready the site is for AI answer tools (ChatGPT, Perplexity, Google's AI Overviews) that pull answers directly from websites.

| Category | Score | What it means |
|----------|-------|---------------|
| Structured data | 6/8 | Some pages have good markup. Company identity and homepage FAQ are missing. |
| Answer structure | 15/23 | MTD page is strong. Homepage and features open with marketing copy, not answers. |
| Freshness | 3/9 | No dates on key pages. Knowledge Hub articles are 8+ months old. |
| Authority | 2/16 | Weakest area. No links to HMRC, no named authors, no original data. |
| Technical | 7/11 | Mostly clean. Missing image descriptions bring this down. |
| **Overall** | **10/20** | **Emerging. The foundations are there, but the site isn't packaged for AI citation yet.** |

---

## Next steps

1. Confirm which priorities you'd like to go ahead with.
2. P0 and P1 can start straight away with no input from your side.
3. P2 onwards may need a quick sign-off on content changes (image descriptions, link text, page consolidation).
4. We'll update you at each priority milestone.

---

*Prepared by Will Morley. Based on Google Lighthouse, SEMRush crawl, Chrome DevTools inspection, and manual review.*
