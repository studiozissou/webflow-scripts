# Carsa website audit

**Prepared for:** Tomek | **Date:** May 2026 | **Site:** www.carsa.co.uk

---

## The short version

Your site scored 89% on SEMRush's health check across 100 pages. No broken links, no server errors, decent blog content, good internal linking. The technical side is clean.

The problems we found aren't visible when you browse the site. They're in the code -- the layer that Google, AI tools, and screen readers read instead of looking at the page. They've gone unnoticed because you can't see them. But they affect how the site performs in search and how accessible it is to people using assistive technology.

Five things in particular:

1. **The chatbot widget confuses Google on every page.** "Chat with Caroline AI" uses a heading tag that tells Google "this page is about Chat with Caroline AI." It's on every page.

2. **50+ images have no text descriptions.** Car photos, store images, icons, blog thumbnails. Screen readers can't describe them and Google can't index them. That's a WCAG Level A failure (the minimum accessibility standard).

3. **109 links across 94 pages have no anchor text.** Social icons, logo links, image links. Invisible to screen readers, no SEO value.

4. **Vehicle page titles get cut off in Google results.** Some run to 98 characters. Google shows about 60. The useful details disappear.

5. **Trust signals have gaps.** An expired promotion ("Ends 31st Dec 25") is still on the homepage. A blog author is listed as "Jane Doe." Terms pages link to insecure HTTP addresses. No links to the FCA, DVLA, or any regulatory body.

Individually, none of these is urgent. Together, they cap what the content can do.

---

## What's working well

| Area | What we found |
|------|---------------|
| Site health | 89% SEMRush score. No broken links, no server errors, no redirect issues. |
| Structured data | Full JSON-LD schema suite live: Organization, WebSite, LocalBusiness, FAQPage, Article, BreadcrumbList, Product. Google can read each car listing, store, blog post, and the company itself as structured data. |
| Blog content | Answer-first writing, original data, question-based headings. The blog is doing more for SEO than most of the rest of the site. |
| AI bot access | ChatGPT, Perplexity, Google AI, and Claude can all read the site. llms.txt is in place. |
| Security | HTTPS everywhere. Cookie consent live with granular categories. |
| Analytics | GA4 and GTM on all pages. VWO (A/B testing) consent-gated. |
| Social sharing | Links shared on LinkedIn, WhatsApp, or Facebook show branded previews with the right title, description, and image. |
| Internal linking | Conversion pages are well-linked from navigation and homepage. |
| Heading structure | H1 > H2 > H3 flows correctly on most pages. |
| Mobile | Configured correctly on all pages. |
| Sitemap | ~1,268 URLs listed and linked. |

---

## What needs attention

Grouped by priority.

---

### Priority 0 -- Fix this week

These affect every page or block basic accessibility.

| # | What we'll do | Why it matters |
|---|---------------|----------------|
| 1 | Fix the chatbot heading. Change "Chat with Caroline AI" from a main heading to a regular text element. No visual change, takes minutes. | Google currently sees two main headings on every page. One fix clears that up across the entire site. |
| 2 | Add alt text to 50+ images: car gallery, store photos, feature icons, blog thumbnails. | Screen readers can't describe these to visually impaired users. Google Image search can't index them. About 20% of UK adults have some form of disability. |

---

### Priority 1 -- First sprint

Search visibility, risk reduction, trust repairs.

| # | What we'll do | Why it matters |
|---|---------------|----------------|
| 3 | Move custom code to a Carsa-owned GitHub repo. 6 scripts currently sit on a developer's personal account. If that account changes, parts of the site break. | Carsa owns its own code. Nothing updates unless someone at Carsa decides it should. |
| 4 | Shorten the /car-finance page title (67 characters; Google shows ~60). | The full title shows in search results instead of trailing off. |
| 5 | Unpublish 2 development pages (/development/impel-test, /development/eligibility-hero-mcp-test). Both are live and visible to Google. | They make the site look unfinished. Gone from Google within days. |
| 6 | Unpublish 3 empty CMS template pages: /testimonials, /facilities, /car-badges. Live but serving no purpose. | Removes thin pages from the index. |
| 7 | Pin CDN script versions. GSAP, n8n Chat, and JetBoost all load with "@latest", so they pull whatever the newest version is. A breaking change would hit the site without anyone at Carsa doing anything. | Libraries only update when someone deliberately chooses to update. |
| 8 | Remove the expired promotion. "Ends 31st Dec 25" is still on the homepage. | A visitor landing in May 2026 will wonder if the site is maintained. |
| 9 | Replace "Jane Doe" blog author with a real name and bio. Google and AI tools use author signals when deciding whether to trust content. | This one's on the Carsa team: give us a name and a short bio, we'll wire it up. |
| 10 | Fix HTTP links in 3 terms pages (/terms/data-privacy, /terms-conditions, /vehicle-purchase). They link to http:// instead of https://. | Browsers may show security warnings. Quick find and replace in CMS content. |
| ~~11~~ | ~~Add a heading to /reserve.~~ | Done. |
| 12 | Write a unique description for /value-car. Currently duplicates /part-exchange, even though they're different things (selling outright vs trading in). | Google may treat them as duplicate content or just pick one and ignore the other. |

---

### Priority 2 -- First month

Accessibility, content structure, freshness signals.

| # | What we'll do | Why it matters |
|---|---------------|----------------|
| 13 | Add a skip-to-content link. Keyboard users currently have to tab through the full navigation on every page before reaching content. | An invisible "Skip to main content" link appears on first tab press. Common need for users with motor disabilities. |
| 14 | Add proper labels to all form inputs. Fields currently use placeholder text (the grey text inside the box), which disappears when someone starts typing. Screen readers may not announce what the field is for. | Labels stay visible to screen readers even when visually hidden. |
| 15 | Add labels to 109 links with no anchor text across 94 pages. Social icons, logo links, image links. | A screen reader currently says "link" with no context. After this: "Facebook", "Home", "View this car". Google can pass SEO value through them too. |
| 16 | Add a main content landmark. Screen readers use landmarks to jump between page sections (navigation, content, footer). The main content area isn't marked. | One tag. Screen reader users can jump straight to the content. |
| 17 | Add "last updated" dates to key pages. /car-finance, /faq, and service pages show no date. Google and AI tools prefer content with visible freshness signals. | A small "Last updated: [date]" line. |
| 18 | Rewrite the homepage hero. Opens with "Find your next car. Finance ready." -- good tagline, but doesn't say what Carsa is. AI tools looking for something to quote will skip past it. | Add a factual opening sentence. ChatGPT and Perplexity can then say "Carsa is a UK used car retailer with 2,000+ vehicles and nationwide delivery." |
| 19 | Rewrite the /car-finance intro. Someone landing here is probably asking "How does car finance work?" The opening doesn't answer that. | Answer the question up front, then expand. Helps the page rank for question-based searches too. |
| 20 | Add links to authoritative sources. The site explains finance, warranties, and car care without linking to the FCA, DVLA, or Thatcham. | Google and AI tools treat outbound links to trusted sources as a quality signal. |
| 21 | Add favicon references. The site doesn't declare its icon in the page code. Some browsers won't show Carsa's icon in tabs, bookmarks, or search results. | A few lines in the page head. |
| 22 | Verify the www redirect. Check that carsa.co.uk (without www) redirects to www.carsa.co.uk. If it doesn't, Google may split ranking power between two versions of the site. | Quick check. One-line config change if needed. |
| 23 | Remove time-sensitive language from blog posts. Phrases like "currently", "at the time of writing", "as of 2024" tell AI tools the content might be outdated, even when the information is still accurate. | Rewrite so AI tools treat the content as current. |
| 24 | Investigate 15 slow-loading pages flagged by SEMRush. Store pages with maps, vehicle listings with heavy script bundles. These are pages where someone has already decided to visit a showroom or look at a car. | Slow loading at that point costs conversions. We'll investigate the causes and fix what we can. |

---

### Priority 3 -- Backlog

Longer term improvements that build on the work above.

| # | What we'll do | Why it matters |
|---|---------------|----------------|
| 25 | Add HowTo markup to the /car-finance "How it works" section. It's currently plain content. Structured markup tells Google "this is a process with defined steps." | Could appear as a rich result in Google, or get cited step by step by AI tools. |
| 26 | Promote FAQ questions to proper headings on the /faq page. | AI tools scan headings to find answers. Questions buried in body text get missed. |
| 27 | Add question-format headings to the homepage. "Why buy from Carsa?" is already there, but most sections use statement headings. | AI tools match user queries to question-answer pairs. |
| 28 | Add lastmod/changefreq to the sitemap. Currently just URLs with no freshness signals. | Tells search engines which pages changed recently so they re-crawl those first. |
| 29 | Investigate sitemap vehicle coverage. ~250 vehicles in the sitemap vs 4,600+ in the CMS. | Google may not know most of your car listings exist. Likely a sync or publishing issue. |
| 30 | Add a chatbot fallback. If the webhook that powers the chat goes down, visitors see an error or nothing. | A fallback message with phone, email, and WhatsApp so nobody hits a dead end. |
| 31 | Set up a CMS alt text pattern for vehicle images, so every car photo automatically gets text like "2022 Blue BMW 3 Series, front view." | Covers all 4,600+ vehicles without manual work. |
| 32 | Add author bios with credentials. Blog posts don't include qualifications, role, or the structured data Google uses to evaluate expertise. | Named, qualified people behind the content is a trust signal for Google and AI tools. |
| 33 | Shorten the /car-care/carsacover title (81 characters, gets truncated). | Full title displays in search results. |
| 34 | Shorten the vehicle page title template (98 characters on sample pages). Restructure so the important info comes first, within ~60 characters. | Make, model, year, price show up instead of getting cut off. |

---

### Priority 4 -- Future consideration

| # | What we'll do | Why it matters |
|---|---------------|----------------|
| 36 | Build quarterly original data content. The Iran/Ukraine war fuel impact piece is a template for content that earns links and citations. | Original data is one of the strongest reasons for other sites and AI tools to reference you. |
| 37 | Set up anchor + cluster blog architecture. Link each post to a parent topic (car finance, used cars, car care) with two-way linking. | Service pages become the hub for each topic. 103 posts is enough to build real topical authority. |
| 38 | Set up Consent Mode v2 in GTM for full compliance verification. | Becoming the standard. |

---

## Local SEO -- Southampton listing scan

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

The GBP number is 2046399557. Most directories are showing 3003034797 instead, which may be an old or central number.

**10 directories have no listing at all:**

Bing, Foursquare, TripAdvisor, YP.com, 192.com, Acompio UK, InfoIsInfo, Opening Times, Snapchat, My Local Services UK.

Bing is the most important gap. Bing powers Copilot, DuckDuckGo, and Yahoo search. No listing there means Carsa Southampton doesn't exist for those users.

**Not available on:** Apple Maps, Instagram, Amazon Alexa, Navmii, Where To?, iBegin. These platforms either don't accept listings for this category or require a different submission process.

**What we'd recommend:**

1. Fix the phone number across the 7 directories with wrong data. Most of these can be claimed and corrected individually, or handled in bulk through SEMRush's Listing Management tool.
2. Create a Bing Places listing. Free, takes about 15 minutes, and covers Bing, Copilot, DuckDuckGo, and Yahoo in one go.
3. Consider Foursquare (powers Uber, Samsung Maps, and various in-car systems) and Apple Maps Connect (powers Siri and Apple Maps).

This scan covers Southampton only. If you want us to run the same check for other stores, let us know.

**Optional add-on: managed local listings**

There's a SEMRush tool that handles this ongoing for £30/month per location. For each store it would:

| Feature | Basic (£30/mo) | Pro (£60/mo) |
|---------|----------------|--------------|
| GBP audit and optimisation | Yes | Yes |
| GBP post and photo publishing | Yes | Yes |
| Review auto-replies | Yes | Yes |
| Business description optimisation | Yes | Yes |
| Auto-distribute info to directories | No | Yes |
| Keep info synced across directories | No | Yes |
| Suppress duplicate listings | No | Yes |
| Block user-suggested edits | No | Yes |
| Team collaboration | No | Yes |
| API access | No | Yes |

Basic handles GBP well but you'd still fix directory listings manually. Pro pushes updates to all directories at once and keeps them synced, which is where the real time saving is with 10+ locations.

With 10+ stores, that's £300/month on Basic or £600/month on Pro. Worth starting with the highest-traffic locations rather than all at once. We can run scans for each store to see which ones have the most issues before committing.

---

## What changes after this work

Once the P0-P2 work is done, the difference is mostly invisible to someone browsing the site. But to Google, AI tools, and screen readers:

Every page has one heading that says what the page is actually about. Titles display in full in search results. The structured data layer is already done, so Google already reads every listing, every store, every blog post.

AI tools like ChatGPT and Perplexity can quote Carsa when someone asks "Where can I buy a used car on finance in the UK?" Right now the homepage doesn't give them anything to quote. After the hero rewrite, it does.

Screen readers can navigate properly. Every link says where it goes. Every image has a description. That's about 20% of UK adults who currently can't use parts of the site.

Store pages and vehicle listings load faster. Those are the pages closest to a booking or a reservation, so speed matters most there.

The expired promo, placeholder author, and HTTP links are gone. Those are small things, but they're the kind of details that erode trust for the exact people Carsa is trying to reach: careful buyers who are looking for signs that a dealership is professional.

---

## AI search readiness score

How ready the site is for AI answer tools (ChatGPT, Perplexity, Google's AI Overviews) that pull answers directly from websites.

| Category | Score | What it means |
|----------|-------|---------------|
| Structured data | 4/4 | Done. Organization, WebSite, LocalBusiness, FAQPage, Article, BreadcrumbList, Product all live. |
| Answer structure | 5/6 | Blog is strong. Homepage and service pages open with marketing copy, not answers. |
| Freshness | 1/3 | Blog has dates. No "last updated" signals elsewhere. Time-sensitive language in some posts. |
| Authority | 2/4 | Some original data on the blog. No external citations. Weak author signals. |
| Technical | 2/3 | robots.txt and internal links are fine. Alt text drags this down. |
| **Overall** | **14/20** | **Emerging. The structured data is done. What's left is content positioning and trust signals.** |

---

## Next steps

1. Let us know which priorities you want to go ahead with.
2. P0 and P1 need no input from your side. We can start straight away.
3. P2 will need a quick sign-off on content changes (homepage copy, blog author, alt text approach).
4. We'll update you at each milestone.

---

*Prepared by Will Morley. Based on SEMRush crawl, Google Lighthouse, Chrome DevTools, and manual review.*
