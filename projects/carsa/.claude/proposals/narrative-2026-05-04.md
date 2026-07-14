# Carsa Site Audit — Narrative Summary

**Date:** 2026-05-04
**Prepared for:** Tomek (PM, Carsa)
**Scope:** Full site health, SEO, accessibility, performance, and AI-search readiness

---

## Beat 1 — Where the site is now

The Carsa website is in good shape. The technical foundation is solid and the content quality — particularly the blog — is strong.

Here is what is already working well:

- **89% site health score** from SEMRush across 100 pages scanned
- **Zero broken links, zero server errors, zero redirect loops** — the infrastructure is clean
- **Strong internal linking** from navigation and homepage to key conversion pages
- **Full JSON-LD schema suite is live** — Organization, WebSite, LocalBusiness, FAQPage, Article, BreadcrumbList, and Product schemas all deployed sitewide. Google understands each car listing, each store, each blog post, and the company itself
- **Blog content is well-structured** — answer-first writing, original data, question-based headings
- **All major AI crawlers are allowed** — ChatGPT, Perplexity, Google AI, and Claude can all access the site
- **Cookie consent, SSL, GA4, and GTM** are all properly configured
- **Heading hierarchy flows correctly** throughout most pages — no skipped levels

The site has grown to 74 pages, 17 CMS collections, and over 4,600 vehicle listings. It functions well as a lead generation platform. The work ahead is not about fixing something broken — it is about removing invisible friction that prevents the site from performing at its full potential.

---

## Beat 2 — What is holding it back

The issues below are not visible to someone browsing the site. They live in the code layer — the part that search engines, AI assistants, screen readers, and social platforms read. Because they are invisible to the eye, they have gone unnoticed. But they have a measurable impact on how the site performs.

### A chatbot widget is confusing heading structure sitewide

Every page on the site has a second H1 tag — "Chat with Caroline AI" — injected by the chatbot widget. The H1 is how a search engine understands what a page is fundamentally about. Two H1s per page dilute that signal. The /reserve page H1 has been fixed.

This is a single fix (change the widget's heading to a `<span>`) that improves every page at once.

### Page titles are too long on key pages

The vehicle detail pages — the most important pages for search — have titles running to 98 characters. Google truncates at ~60. The /car-care/carsacover page is 81 characters. When titles get cut off, the messaging loses its punch in search results.

### Accessibility gaps affect real users and search rankings

109 links across 94 pages have no anchor text — they are invisible to screen readers and provide no SEO value. Over 50 images are missing alt text entirely. There are no skip-to-content links, no main landmark, and form inputs rely on placeholder text instead of proper labels.

**What this means for the business:** Accessibility is not optional — it affects roughly 20% of UK adults with some form of disability. It also directly affects search rankings, as Google uses anchor text and image descriptions to understand page content.

### Performance drag on high-intent pages

15 pages load slowly — primarily store pages (heavy map rendering) and vehicle listings with large script bundles. These are the pages where someone has already decided to visit a showroom or view a specific car. Slow load times at that point cost conversions.

### Trust signals have gaps

An expired promotion ("Ends 31st Dec 25") is still visible on the homepage. A blog author is listed as "Jane Doe" — a placeholder that undermines content credibility. Terms pages contain insecure HTTP links. There are no outbound citations to authoritative sources like the FCA or DVLA.

For the peace-of-mind buyer segment — people who are specifically looking for signs of professionalism and trustworthiness — these gaps matter.

---

## Beat 3 — What the work unlocks

After this work is complete, the site moves from "solid foundation" to "fully optimised platform." Here is what that looks like:

**Every page tells Google exactly what it is about.** One clean H1 per page, concise titles that display fully in search results. The structured data layer is already complete — Organization, WebSite, LocalBusiness, FAQPage, Article, BreadcrumbList, and Product schemas are all live. Google shows Carsa's own messaging, not a truncated guess.

**AI assistants can confidently cite Carsa.** With llms.txt in place, the full schema suite live, and answer-first content on key pages, tools like ChatGPT and Perplexity can recommend Carsa directly when someone asks "Where can I buy a used car on finance in the UK?"

**The site is accessible to all users.** Screen readers can navigate properly. Every link has a purpose. Every image has a description. This is not just compliance — it is a better experience for every visitor, and it signals professionalism.

**High-intent pages load fast.** Store pages and vehicle listings — the pages closest to a conversion — load without delay. Fewer people bounce before booking a test drive or reserving a car.

**Trust signals are consistent.** No expired promotions. Real author names. External citations to regulated bodies. Every detail reinforces Carsa's positioning as a modern, transparent retailer — not a backstreet garage.

---

## Key Phrases

Use these in proposals, emails, or conversations with the client:

1. "The foundation is strong — the details need tightening."
2. "The blog is already doing the hard work — the technical layer just needs to match it."
3. "A single chatbot fix improves every page's SEO at once."
4. "This is not a rebuild — it is turning up the volume on what is already there."

---

## Pillar Mapping

The 47 tasks map into five strategic pillars:

### 1. Search Visibility (11 tasks)

Chatbot H1 fix, title length corrections, duplicate meta description, /reserve missing H1, HTTP link fixes, sitemap improvements, and page-level SEO corrections.

These tasks ensure Google understands and correctly displays every page.

### 2. Accessibility (8 tasks)

Anchor text on links, alt text on images, skip-to-content links, form labels, main landmark, aria-labels on icon buttons.

These tasks make the site usable for everyone and remove SEO penalties for missing content signals.

### 3. Trust and Authority (7 tasks)

Remove expired promo, fix placeholder author, add outbound citations, strengthen author schema, add Person schema, add "last updated" signals.

These tasks build credibility with both human visitors and AI systems that evaluate source trustworthiness.

### 4. Performance and De-risk (7 tasks)

Slow page investigation, CDN version pinning, code migration to client-owned repo, favicon references, depublish test pages, chat fallback UX.

These tasks reduce load times, prevent accidental breakage, and give the client ownership of their code.

### 5. AI Search Readiness (9 tasks)

Answer-first rewrites, question-format H2s, HowTo schema, remove hedge words, FAQ schema promotion, anchor/cluster architecture.

These tasks position Carsa to be cited by AI assistants — a channel that is growing fast and where early movers have a lasting advantage.

---

*Total: 39 tasks across 5 pillars. 23% can be fully automated, 54% are semi-automated (template + manual review), and 23% require manual content work.*
