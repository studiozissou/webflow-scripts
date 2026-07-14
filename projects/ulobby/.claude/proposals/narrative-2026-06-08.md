# Narrative — Ulobby remediation programme

**Date:** 2026-06-08
**Prepared for:** Mariann Malchau Olsen, Head of Public Affairs Solutions
**Scope:** Full site health, SEO, schema, content, AEO, and multi-locale readiness
**Site:** www.ulobby.eu (273 pages across 4 locales)

---

## One-line

> **Ulobby is a well-built Public Affairs platform with an 85/100 site health score, clean infrastructure, and a consistent brand voice — but without canonical tags on any of its 273 pages, with 22 schema errors across its solutions pages, and an AEO score of 8/20, the site is structured for humans who already know where to find it rather than for the search engines and AI platforms that should be sending new ones.** Closing that gap turns a strong product site into a visible, citable authority in Public Affairs software.

---

## The three-beat story

### 1. Where the site is today

The foundation is genuinely solid. This is not a site that needs rescuing. It needs releasing.

Here is what is already working:

- **85/100 overall health score** from SEMRush across 273 crawled pages. That places Ulobby well above the average B2B SaaS site.
- **100% HTTPS.** No mixed content, valid certificate, no security warnings.
- **Clean sitemap** with 285 URLs across four locales (EN, DA, NO, SV), properly referenced in robots.txt.
- **270 of 273 pages return 200 status codes.** Only 2 redirects and 1 client error. The infrastructure is clean.
- **204 valid structured data items** already deployed — 115 Organization instances and 89 BlogPosting articles with proper author markup. Google already understands what Ulobby is and who writes its content.
- **Heading hierarchy is correct** on spot-checked pages. H1 flows to H2 flows to H3. No skipped levels.
- **OG tags on 171 pages, Twitter Cards on 167.** Social sharing works for published content.
- **Hreflang tags on 268 of 273 pages** with x-default configured on 259. The multi-locale architecture is largely intact.
- **All AI crawlers are allowed.** robots.txt has no blocks for GPTBot, ClaudeBot, PerplexityBot, or Google-Extended. The door is open.
- **Brand voice is remarkably consistent.** Measured, structured, authoritative — the same register holds from homepage through blog through pricing. That kind of tonal discipline is rare and valuable.
- **Blog content uses answer-first leads** and active voice. The stakeholder mapping article provides a specific framework (the four-quadrant matrix, the "20-25 true key stakeholders" heuristic) that demonstrates genuine domain authority.
- **No custom code dependencies to worry about.** Three standard third-party scripts (GTM, Cookiebot, reCAPTCHA), all industry-standard. The code base is clean.
- **Lighthouse scores are strong.** Accessibility ranges from 91-99 across all tested pages. LCP (Largest Contentful Paint) is 163-277ms — well under the 2,500ms threshold. Zero cumulative layout shift on every page. The site is fast and stable.
- **Denmark has no strong software competitor.** No PA software competitor in the Danish market has more than 150 organic keywords. PublicAffairsGroup.dk — the closest direct competitor — has 17 keywords and zero organic traffic. The category is there for the taking.

The product is credible. The content is thoughtful. The technical foundation is in place. The site serves its current visitors well. The work ahead is about making the site visible to the people who have not found it yet — and to the AI platforms that are increasingly deciding who gets recommended.

### 2. What is holding it back

None of the issues below are visible to someone browsing the site. They live in the code layer — the part that search engines, AI assistants, and structured data validators read. Because they are invisible to the eye, they have gone unnoticed. But together, they cap how far the site can reach.

**No canonical tags on any of the 273 crawled pages.**

This is the single most consequential technical issue. Every page on the site — across all four locales, every blog article, every solution page — is missing `<link rel="canonical">`. Without canonicals, search engines cannot reliably resolve which version of a page is the primary one. For a multi-locale site serving EN, DA, NO, and SV, this is especially damaging: Google may index the wrong language variant, dilute link equity across duplicates, and waste crawl budget on paginated blog pages that compete with their own base URLs. Webflow generates canonical tags by default. Something in the site configuration has overridden or disabled them. This is a single settings-level fix that improves every page at once.

**22 invalid SoftwareApplication schema errors across solutions pages.**

The site has 204 valid structured data items — but all 22 invalid ones are SoftwareApplication instances on solution pages and homepage variants across all four locales. They are missing required fields (`aggregateRating` or `review`, `offers`) and use `contactPoint` in a context Google does not recognise for that schema type. Invalid schema is worse than no schema: it signals to validators that the site's structured data cannot be trusted, which undermines the 204 valid items alongside it.

**171 malformed Cookiebot links inflating the error count.**

Cookiebot injects `<a href="javascript:Cookiebot.renew()">` on every page. Crawlers interpret this as a malformed URL. It is the single largest error source in the entire audit — 171 of 221 total errors. The fix is straightforward (replace the anchor with a button element), but until it is done, it makes the site look significantly less healthy than it actually is.

**19 broken external links pointing to a dead domain.**

All 19 point to `thepublicaffairsengine.com`, a domain that no longer resolves. They appear in four blog articles across all four locale variants. Broken outbound links erode trust signals for both search engines and AI citation systems that evaluate source quality.

**63 untranslated pages declaring the wrong language.**

The site serves four locales, but 63 pages have content that does not match their declared hreflang tag — likely English content sitting on DA, NO, or SV URLs that was never translated. For PA professionals in Copenhagen, Oslo, or Stockholm searching in their own language, these pages create a poor experience and confuse search engines about which locale to serve.

**AEO score of 8/20 — the largest growth opportunity.**

The site's AI search readiness is at Level 1 (Keyword Foundation). Zero question-shaped H2s across the entire site. No FAQ blocks anywhere. No original data, benchmarks, or case study metrics on commercial pages. No visible "last updated" timestamps. No llms.txt file. The Flesch reading ease score is approximately 55 — well below the 80+ target for AI extractability (though a realistic target for this audience is 65-70, given that PA professionals expect domain terminology). The blog content is thoughtful but structurally invisible to AI engines that extract answers from headings and short paragraphs.

This matters because the door is open — all AI crawlers are allowed — but nothing behind the door is structured for them to cite. Lighthouse confirms it: blog articles score 19-50 on Agentic Browsing (out of 100), while solutions pages and utility pages score 100. The content is there — the structure for AI extraction is not.

**72% of Danish organic traffic comes from one word: "ulobby."**

SEMRush organic data reveals a branded dependency problem. Only 28% of traffic comes from non-branded terms. The site ranks for high-value industry terms — "public affairs" at #11 in Denmark, "stakeholder mapping" at #14 — but not yet in the top-5 positions where click-through rates spike. The blog's stakeholder mapping article is the strongest non-branded asset, but it is one of only two blog posts generating measurable organic traffic out of 20+ published.

The Norwegian and Swedish locales are effectively dormant: 2-3 keywords each, near-zero traffic. The 63 untranslated pages explain why — search engines cannot rank content that does not match the declared language.

**Meanwhile, a competitor is moving fast.**

CiviClick, a US-based advocacy software vendor, has grown from 340 to 905 organic keywords in 12 months — a 2.7x increase. They now own the entire "advocacy software" product category: #1 for "grassroots advocacy software", #2 for "advocacy software", #2 for "digital advocacy software". Ulobby has zero presence on any of these terms. CiviClick is not yet in the Danish market, but the gap in English-language product-category content is widening every month.

The good news: Ulobby's US keyword count is also growing (31 to 72 in 12 months), driven entirely by existing blog content being discovered by Google. The remediation work — canonical tags, schema fixes, heading restructure — should accelerate that organic momentum.

### 3. What the work unlocks

The remediation programme is structured around three pillars. Each builds on the one before it.

**Pillar 1 — De-risk.**

Remove the issues that silently erode trust and inflate error counts. This is the insurance that protects everything built on top of it.

- Re-enable canonical tags across all 273 pages — a single configuration fix that resolves the most critical SEO issue
- Fix or remove the 22 invalid SoftwareApplication schema instances so the 204 valid items are no longer undermined
- Replace 171 malformed Cookiebot links with proper button elements, cutting the total error count by 77%
- Remove 19 broken links to the dead `thepublicaffairsengine.com` domain
- Verify GTM fires only after Cookiebot consent (GDPR compliance for EU/Scandi market)
- Audit the 97 blocked pages and 37 orphaned sitemap URLs to confirm nothing valuable is hidden
- Fix 4 hreflang conflicts and add hreflang to 12 missing pages
- Resolve 9 pages with duplicate H1 tags (Plans and Technology templates)

After Pillar 1, the site health score moves from 85 toward 95+. The error count drops from 221 to fewer than 30. The technical foundation matches the quality of the content sitting on top of it.

**Pillar 2 — Unlock visibility.**

Make the site findable by the search engines and AI platforms that should be sending new visitors.

- Add BreadcrumbList schema to blog articles and nested pages for richer SERP display
- Add FAQPage schema to solutions pages with 5-8 questions per page
- Create llms.txt with company description, capabilities, target audience, and key page links
- Rewrite key H2s as questions on blog articles and solutions pages
- Add descriptive alt text to all informative images site-wide
- Shorten 7 over-length title tags and deduplicate 12 blog listing titles across locales
- Add 4 missing meta descriptions on newsletter pages
- Improve anchor text on key CTAs — descriptive text instead of "Read more" across 437 links
- Add visible "Last updated" timestamps to all key pages and the blog template
- Add 2-3 outbound citations per blog article to authoritative sources

After Pillar 2, the site is structured for citation. AI engines can extract answers from question-shaped headings and short paragraphs. Google displays richer results with breadcrumbs and FAQ expansions. The AEO score moves from 8/20 toward 14-16/20 (Level 2: Answer-Ready).

**Pillar 3 — Grow.**

Build on the technical and structural foundation to compound visibility over time.

- Establish a quarterly content refresh cadence — review and update top 5 pages every 90 days
- Address the 63 hreflang language mismatches by prioritising translation into DA, NO, and SV
- Create a flagship anchor asset: a "State of Public Affairs" report with original survey data
- Add non-commodity data points to commercial pages (anonymised usage metrics, benchmarks)
- Develop author bios with credentials on the blog template to strengthen E-E-A-T signals
- Simplify readability on key pages toward Flesch 65-70
- Set up AI referrer tracking for chatgpt.com, perplexity.ai, claude.ai, gemini.google.com
- Develop content addressing underserved ICP segments: solo PA consultants and enterprise policy directors
- Create a dedicated "Lobbying Software" / "Public Affairs Software" product category page to compete on the terms CiviClick is capturing (combined volume: ~2,150/mo)
- Publish a definitive Danish-language guide on "lobbyisme" (880 vol/mo, currently uncontested — no competitor ranks above #77)
- Build comparison and category content ("Best Public Affairs Software 2026") before CiviClick owns that narrative

After Pillar 3, the site is not just visible — it is authoritative. It produces original data that competitors cannot replicate. It serves all three customer segments in their own language. It owns its product category in search before a faster-moving competitor claims it. The brand voice — already Ulobby's strongest asset — now reaches the audiences it deserves.

---

## Why this framing matters

1. **Gives the client credit.** An 85/100 health score, 204 valid schema items, consistent brand voice, and clean infrastructure are genuine achievements. The narrative starts from strength, not deficit.
2. **Makes the gap concrete and countable.** 273 pages without canonical tags. 22 invalid schema items. 171 malformed links. 63 untranslated pages. 8/20 AEO score. These are not opinions — they are numbers with specific fixes.
3. **Makes the ROI vivid.** Pillar 1 cuts errors by 77%. Pillar 2 doubles the AEO score. Pillar 3 creates content assets no competitor can match.
4. **Creates competitive urgency without panic.** CiviClick's 2.7x growth is real, but Ulobby's own US keyword growth shows the content is working — it just needs the technical foundation and structural investment to convert rankings into traffic.

---

## Key phrases to reuse

1. **"The door is open, but nothing behind it is structured for citation."** — Frames the AEO gap: AI crawlers are allowed, the content is thoughtful, but the structure is invisible to extraction engines.
2. **"A single configuration fix improves every page at once."** — Canonical tags. Makes the highest-priority item feel achievable.
3. **"Not a rebuild. A release."** — Credits the existing quality and positions the work as removing friction, not starting over.
4. **"171 errors from one line of code."** — The Cookiebot issue. Makes the error count less intimidating by showing it is concentrated in one fix.
5. **"Structure over activity — for the site, not just the product."** — Borrows Ulobby's own brand philosophy and applies it to the site work.
6. **"The brand voice is the strongest asset. The technical layer needs to match it."** — Positions voice consistency as a competitive advantage while motivating the technical remediation.
7. **"Visible to the people who have not found it yet."** — Frames the entire programme as a growth opportunity rather than a repair job.
8. **"72% of traffic comes from one word."** — The branded dependency stat. Makes the case for non-branded content investment concrete and urgent.
9. **"The category is there for the taking."** — No Danish competitor has meaningful SEO. Positions the opportunity as time-sensitive before someone else moves.
10. **"A competitor grew 2.7x in 12 months."** — CiviClick. Creates urgency without panic. The gap is widening but Ulobby's own US keywords are growing too.

---

## How this flows into the plan's priorities

| Finding / gap | Maps to | Pillar |
|---|---|---|
| 273 pages missing canonical tags | Re-enable Webflow auto-canonicals | De-risk |
| 22 invalid SoftwareApplication schema | Remove from solution pages or add required fields | De-risk |
| 171 malformed Cookiebot links | Replace `<a>` with `<button>` | De-risk |
| 19 broken external links (dead domain) | Remove thepublicaffairsengine.com references | De-risk |
| GTM firing before Cookiebot consent | Configure GTM Consent Mode v2 | De-risk |
| 97 blocked pages, 37 orphaned URLs | Audit and resolve | De-risk |
| 4 hreflang conflicts + 12 missing | Fix tag conflicts, add declarations | De-risk |
| 9 pages with duplicate H1 tags | Change secondary H1 to H2 | De-risk |
| No BreadcrumbList schema | Add to blog and nested pages | Unlock visibility |
| No FAQPage schema | Add to solutions pages | Unlock visibility |
| No llms.txt | Create at site root | Unlock visibility |
| Zero question-shaped H2s | Rewrite key headings as questions | Unlock visibility |
| Missing alt text on images | Add descriptive alt text site-wide | Unlock visibility |
| 7 long titles, 12 duplicate titles | Shorten and deduplicate | Unlock visibility |
| 4 missing meta descriptions | Add to newsletter pages | Unlock visibility |
| 437 non-descriptive anchor text | Implement descriptive link text | Unlock visibility |
| No "last updated" timestamps | Add to blog template and key pages | Unlock visibility |
| No outbound citations | Add 2-3 per blog article | Unlock visibility |
| 63 untranslated pages | Prioritise translation into DA, NO, SV | Grow |
| No original data or anchor asset | Create "State of Public Affairs" report | Grow |
| No non-commodity content | Add usage metrics and benchmarks | Grow |
| No author bios | Add to blog template | Grow |
| Flesch ~55 | Simplify toward 65-70 | Grow |
| No AI referrer tracking | Set up analytics segments | Grow |
| ICP 2 and ICP 3 underserved | Develop targeted content | Grow |
| No product-category landing page | Create "Lobbying Software" / "PA Software" page | Grow |
| "Lobbyisme" (880 vol) unclaimed in DK | Publish definitive Danish guide | Grow |
| CiviClick owns "advocacy software" category | Build comparison and category content | Grow |
| 72% branded traffic dependency | Expand non-branded content footprint | Grow |
| Blog Agentic Browsing scores 19-50 | Restructure blog for AI extraction | Unlock visibility |

**Recommendation on narrative sequencing:** Lead with Pillar 2 (the unlock) in the client story — it is the most compelling. Position Pillar 1 (de-risk) as the insurance that protects the Pillar 2 investment. In execution order, de-risk comes first. Pillar 3 is the long game that turns a one-time remediation into sustained competitive advantage.

---

*Use this as the opening 1-2 pages of the proposal and the anchor for every client conversation. Share with the internal team so we all tell the same story.*
