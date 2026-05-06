# Carsa Site Audit

**Date:** May 2026
**Prepared for:** Tomek

---

## Executive summary

The Carsa site scored 89% on SEMRush's health check. No broken links, no server errors, solid blog content. The issues we found aren't visible when you browse the site. They're in the code layer that Google, AI assistants, and screen readers read instead of looking at the page. Sorting that layer out is the difference between a site that works and one that works hard for you.

---

## What's already strong

- 89% site health across 100 pages scanned by SEMRush
- Zero broken links, zero server errors, zero redirect issues
- ChatGPT, Perplexity, Google AI, and Claude can all read the site. llms.txt is in place.
- Every car listing includes price, condition, mileage, and VIN in a format Google reads directly
- Blog content is strong: answer-first writing, original data, question-based headings
- Links shared on LinkedIn, WhatsApp, or Facebook show branded previews with the right title, description, and image
- Cookie consent, SSL, analytics, and internal linking are all set up correctly

---

## Search visibility

How Google understands and displays your pages in search results.

---

**Chatbot heading is competing with your page titles**

The chat widget "Chat with Caroline AI" uses a heading tag that tells Google "this page is about Chat with Caroline AI." It appears on every page. The /reserve page has no other heading at all, so Google thinks the entire reserve page is about the chatbot.

We change one tag in the chat widget code. No visual change, takes minutes. Every page sends a clearer signal to Google about what it's actually about.

---

**Vehicle page titles get cut off in Google results**

Some vehicle page titles run to 98 characters. Google shows roughly 60. Everything past that becomes "..." so the useful details (fuel type, body style, "Carsa") disappear.

We restructure the title template so the most important information comes first, within the 60 character window.

---

**Car finance and carsaCover page titles are slightly too long**

The /car-finance title is 65 characters and /car-care/carsacover is 81. Both get trimmed in search results.

We shorten the titles to fit within Google's display limit.

---

**Two test pages are visible to Google**

Development pages (/development/impel-test and /development/eligibility-hero-mcp-test) are published and can appear in search results. They make the site look unfinished.

Unpublish them and they're gone from Google within a few days.

---

**Three CMS template pages are published but empty**

Template pages for /testimonials, /facilities, and /car-badges are live but serve no purpose for visitors.

Same fix: unpublish or redirect.

---

**The reserve page has no page heading**

Every page needs one main heading that tells Google what the page is about. The /reserve page doesn't have one, only the chatbot widget heading.

We add a proper heading so Google understands the page is about reserving a car.

---

**/value-car and /part-exchange have identical descriptions**

Both pages share the same meta description. Google may treat them as duplicate content or just pick one and ignore the other.

We write a unique description for /value-car that reflects what it specifically offers (selling outright vs trading in).

---

**Three terms pages contain insecure links**

The data privacy, terms and conditions, and vehicle purchase pages link to http://www.carsa.co.uk instead of https://. Browsers may show security warnings.

We update the links from http to https.

---

**Sitemap may not include all vehicles**

The sitemap lists roughly 250 vehicles, but the CMS contains over 4,600. Google may not know about most of your car listings.

We investigate why the gap exists (likely unpublished items or a DealerNet sync issue) and make sure all live vehicles are in the sitemap.

---

**Domain redirect needs checking**

We need to confirm that carsa.co.uk (without www) correctly redirects to www.carsa.co.uk. If it doesn't, Google may treat them as two separate sites and split your ranking power between them.

Quick check. If needed, a one line config change.

---

## Accessibility

Making the site usable for everyone. Roughly 20% of UK adults have some form of disability, and many of these fixes also improve SEO.

---

**50+ images have no descriptions for screen readers**

When an image has no alt text, screen readers either skip it or read the file name, which is usually a long string of random characters. Google also uses image descriptions to understand page content.

The fix is adding descriptive text to every image.

---

**109 links have no text for screen readers or Google**

Links that are just icons (social media buttons, logo links, image links) have no text. A screen reader says "link" with no context, and Google can't pass SEO value through them.

We add invisible labels to every icon link so screen readers say "Facebook" or "Home" instead of just "link."

---

**No skip-to-content link for keyboard users**

People who navigate with a keyboard (common for motor disabilities) have to tab through the entire navigation menu on every page before reaching the main content.

We add an invisible "Skip to main content" link that appears on first tab press.

---

**Form fields rely on placeholder text instead of labels**

When a form field only has placeholder text (the grey text inside the box), screen readers may not announce what the field is for. The placeholder also disappears as soon as someone starts typing.

We add proper labels that are always visible to screen readers, even if visually hidden.

---

**Navigation and icon buttons lack screen reader labels**

The navigation menu and icon-only buttons (close, search, menu) don't announce their purpose to screen readers.

We add labels to every navigation element and icon button so screen readers say "Main navigation," "Close menu," "Search" instead of nothing.

---

**No main content landmark**

Screen readers use landmarks to jump between sections of a page (navigation, main content, footer). The site doesn't mark its main content area.

We add a single tag to the content wrapper so screen reader users can jump straight to the content.

---

**Vehicle images need descriptive alt text**

Car listing photos have generic or missing alt text. A screen reader user browsing a 2022 BMW 3 Series listing hears nothing about the images.

We set up a CMS pattern so every image automatically gets text like "2022 Blue BMW 3 Series, front view." This covers all 4,600+ vehicles without manual work.

---

## Trust and authority

Signals that tell visitors and search engines Carsa is credible and current.

---

**Expired promotion still visible on the homepage**

"Ends 31st Dec 25" is still showing. A visitor landing on the site in May 2026 will wonder if the site is still maintained.

Quick content update to remove or replace it.

---

**Blog author is listed as "Jane Doe"**

A placeholder author name undermines otherwise strong blog content. Google and AI assistants use author signals when deciding whether to trust and cite content.

This one's on the Carsa team: provide a real name and a brief bio, and we'll wire it up.

---

**No links to authoritative external sources**

The site doesn't link to the FCA, DVLA, Thatcham, or other regulatory bodies. Google and AI assistants use outbound links to trusted sources as a quality signal.

We add relevant links where they naturally fit, like FCA registration on the finance page and DVLA on car care pages.

---

**No "last updated" dates on key pages**

Pages like /car-finance and /faq have no visible date showing when the content was last reviewed. Google and AI assistants prefer content that shows when it was last touched.

A small "Last updated: [date]" line on each page solves this.

---

**Author profiles lack credentials**

Blog posts don't include author qualifications, role, or the structured data Google uses to evaluate expertise.

We add author bios with credentials and structured data so Google sees named, qualified people behind the content.

---

**Homepage hero could lead with a clearer answer**

The homepage opens with "Find your next car. Finance ready." Good tagline, but it doesn't say what Carsa actually is. AI assistants looking for something to quote may skip past it.

We add a brief factual opening sentence. ChatGPT and Perplexity can then say "Carsa is a UK used car retailer with 2,000+ vehicles and nationwide delivery."

---

**/car-finance intro doesn't answer the obvious question**

Someone landing on /car-finance is probably asking "How does car finance work?" The opening paragraph doesn't answer that directly.

We rewrite the first paragraph to answer the question up front, then expand. This also helps the page rank for question-based searches.

---

## Performance and stability

Speed, reliability, and reducing the risk of things breaking unexpectedly.

---

**Custom code is hosted on a developer's personal account**

Six scripts that power parts of the site are hosted on a developer's GitHub account. If that account changes or goes away, sections of the site stop working.

We migrate the code to a Carsa-owned repository with version pinned delivery. Carsa owns its own code.

---

**Three libraries could update and break without warning**

GSAP (animations), n8n Chat (chatbot), and JetBoost (search) are loaded with "@latest," meaning they automatically pull whatever the newest version is. A breaking change in any of them could affect the site without anyone at Carsa doing anything.

We pin each library to a specific version. Updates only happen when someone deliberately chooses to update.

---

**15 pages load slowly**

Store pages with interactive maps and some vehicle listing pages are flagged as slow by SEMRush. These are the pages where someone has already decided to visit a showroom or look at a specific car, so slow loading at that point costs conversions.

We investigate the causes (map rendering, script weight) and optimise.

---

**No explicit favicon references**

The site doesn't declare its favicon in the page code. Some browsers and platforms may not show Carsa's icon in tabs, bookmarks, or search results.

A few lines of code in the page head. Tiny fix.

---

**Chatbot has no fallback when the service is down**

If the webhook that powers the chat is unavailable, visitors see an error or nothing.

A fallback message with phone, email, and WhatsApp links so nobody hits a dead end.

---

## AI search readiness

Positioning the site to be cited by AI assistants like ChatGPT, Perplexity, and Google AI Overviews.

---

**Blog posts contain time-sensitive language**

Phrases like "currently," "at the time of writing," and "as of 2024" tell AI assistants the content may be outdated, even when the information is still accurate.

We remove or rewrite these across blog posts so AI assistants treat the content as current.

---

**FAQ questions aren't structured for AI extraction**

The FAQ page has questions and answers, but the questions aren't formatted as proper headings. AI assistants scan headings to find answers they can cite.

Making each question a proper heading fixes this.

---

**/car-finance "How it works" section could have structured markup**

The step-by-step "How it works" section is plain content. Adding HowTo schema markup tells Google and AI assistants "this is a process with defined steps."

We add the markup. The section may appear as a rich result in Google or get cited step by step by AI assistants.

---

**Homepage sections could use question-format headings**

Sections like "Why buy from Carsa?" already answer questions, but the headings aren't phrased as questions. AI assistants match user queries to question-answer pairs.

We rephrase key section headings as questions so AI assistants can match them to what people are searching for.

---

**Blog content could be organised into topic clusters**

The 103 blog posts aren't linked in a structured way to the main service pages. An anchor + cluster model would link each post to a parent topic (car finance, used cars, car care) with two-way linking, so the service pages become the authoritative hub for each topic.

This is a longer term project. We classify all posts, add linking structure, and optionally rewrite intros and conclusions to strengthen the connections.

---

## What happens next

The work breaks into three phases:

**Quick wins (first sprint):** Chatbot heading fix, unpublish test pages, pin script versions, remove expired promo, fix HTTP links, title corrections. Small changes, immediate impact.

**Monthly work:** Accessibility improvements, alt text, form labels, author updates, page speed investigation, "last updated" components.

**Longer term:** AI readiness content rewrites, blog cluster architecture, schema expansion, content freshness programme.

Pricing and a detailed plan follow separately.
