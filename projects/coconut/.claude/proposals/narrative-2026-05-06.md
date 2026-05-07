# Narrative — Coconut remediation programme

**Date:** 2026-05-06
**Purpose:** The story that frames the plan for the client. Used as proposal intro, kickoff
deck anchor, and shared language in every client conversation from here forward.

## Source files

- `reports/intake-report-2026-05-06.md`
- `audits/*.md`
- `.claude/brand-voice.md`
- `.claude/ideal-customer-profiles.md`

---

## One-line

> **Coconut is a well-built Webflow site with strong organic foundations and a ceiling
> that hides it from the search and AI platforms its audience already uses.** Lifting
> that ceiling turns 155 pages of genuinely useful content into a visible, citable,
> rich-result-eligible presence — without touching the product or the brand.

---

## The three-beat story

### 1. Where the site is today

The foundation is solid and the brand has earned real ground.

155 pages and 19 CMS collections run over HTTPS with zero mixed content. The sitemap
covers 392 URLs and is cleanly referenced in robots.txt. A branded 404 page, proper
canonical domain, and mobile viewport tag are all in place. Lighthouse SEO scores
92/100 on the homepage. Accessibility sits at 86/100. Meta titles cover every key
page. Favicon and apple-touch-icon are set. Cookie consent offers granular control
across seven categories. The analytics stack — GTM, GA4, Google Ads, TikTok, Facebook,
Hotjar, Intercom — is comprehensive.

Schema markup already exists in meaningful places. The /features page carries
SoftwareApplication and FAQPage JSON-LD. The /mtd-software page has strong FAQ
schema with 21 Q&A pairs. BreadcrumbList appears on /pricing, /features, and
/mtd-software. The robots.txt does not block GPTBot, ClaudeBot, PerplexityBot, or
Google-Extended — the front door to AI search is open.

Coconut already competes on organic search. The content is genuinely useful: detailed
MTD explainers, allowable-expense guides, knowledge hub articles. The brand voice is
consistent, friendly, and clear. Three distinct customer profiles — the overwhelmed
sole trader, the MTD-anxious earner, and the accountant managing sole-trader clients
— are each addressed somewhere on the site. The raw material is strong.

### 2. What's holding it back

Six concrete problems sit between the current site and the visibility it should have.
None is a crisis. Together, they cap what the content can do.

**1. The site doesn't tell search engines or AI platforms who Coconut is.**
Organization and WebSite schema are absent from the homepage and site-wide. This is
the single piece of structured data that powers Knowledge Panels, brand SERPs, and
AI-search identity — and it does not exist. The /about page, the most natural home
for company information, carries zero structured data.

**2. 60-70% of images have no alt text.**
Roughly 105 images across the site — 81 on the homepage alone — have empty alt
attributes. This is a WCAG Level A violation, an accessibility barrier for screen
reader users, and a missed signal for image search and AI content extraction.

**3. /jobs has a broken heading hierarchy.**
The /jobs page has 2 H1 tags where there should be 1. Search engines and AI crawlers
use heading structure to understand page topics. Multiple H1s dilute that signal and
confuse content extraction.

**4. 17 Q&As exist on the site with no FAQ schema.**
The homepage has 13 question-and-answer pairs. /pricing has 4 more. Both sit as plain
HTML. The /mtd-software page already proves Coconut can do FAQ schema well — the
pattern just hasn't been applied to the pages with the highest traffic.

**5. Analytics fires before consent, and a competitor's tracking script runs on the site.**
GTM and analytics tags load before the user makes a consent choice — a GDPR/PECR
risk. Separately, a Zoho PageSense script loads from a GoSimpleTax CDN path, meaning
a competitor may be collecting behavioural data from Coconut's visitors.

**6. Zero external links to authoritative sources despite extensive compliance content.**
Coconut publishes detailed MTD and tax-allowance content but links to neither
HMRC.gov.uk nor GOV.UK anywhere. AI answer engines weight authority signals heavily.
Without outbound links to the official sources Coconut's content explains, the site
looks less trustworthy to the systems deciding what to cite.

### 3. What the work unlocks

The remediation programme is built around three pillars.

**Pillar 1 — De-risk.**
Remove the compliance exposure and clean the operational clutter. Fix analytics consent
timing to close the GDPR gap. Investigate and remove the GoSimpleTax tracking script.
Audit the dual Facebook Pixels. Unpublish or noindex 7 archive pages and delete 8
dev/test drafts. Review session-recording tools against the privacy policy. This is
insurance — it protects everything that follows.

**Pillar 2 — Unlock search and AI visibility.**
Add Organization and WebSite schema site-wide. Mark up 17 Q&As as FAQPage. Fix the
heading hierarchy on /jobs. Add alt text to ~105 images. Fix
BlogPosting publisher and author fields across the knowledge hub. Extend BreadcrumbList
to /accountant-software and articles. Add AggregateRating to the homepage. Create
llms.txt. Each of these turns existing content into structured, extractable, rich-result-
eligible content — without rewriting a word.

**Pillar 3 — Grow.**
Add external links to HMRC.gov.uk across MTD and expense content. Add freshness
timestamps to key pages. Rewrite homepage and /features openings to be answer-first.
Add question-shaped H2s for AI extraction. Introduce named authors to knowledge hub
articles. Consolidate three overlapping sole-trader pages. Build a landlord-specific
landing page. Strengthen generic CTAs. Launch a content freshness programme. This is
compound growth — each fix makes the next one more effective.

---

## Why this framing matters

1. **Gives Coconut credit** for the quality already there. The site scores 92/100 on
   Lighthouse SEO. The brand voice is consistent and clear. Schema already exists on
   key pages. This is not a rescue or a rebuild.
2. **Makes the gap concrete and countable.** 105 images, 17 unmarked Q&As,
   zero outbound authority links. Anna can see exactly what the work addresses.
3. **Makes the ROI vivid.** Rich results on FAQ content. Knowledge Panel eligibility.
   AI citation readiness. GDPR compliance. Each outcome is specific and measurable.

---

## Key phrases to reuse

- **"Quietly strong with a loud ceiling."**
- **"The content is there. The packaging isn't."**
- **"Not a rebuild. A release."**
- **"155 pages of useful content, invisible to the systems that cite it."**
- **"The front door to AI search is open — the nameplate is missing."**
- **"Structured data turns existing words into rich results."**

---

## How this flows into the plan's priorities

| Client ask / finding category | Maps to | Pillar |
|-------------------------------|---------|--------|
| Organization schema (client's primary request) | Organization + WebSite JSON-LD site-wide, AboutPage schema, AggregateRating | **Pillar 2 — Unlock** |
| FAQ schema expansion | FAQPage markup on homepage (13 Q&As) and /pricing (4 Q&As) | **Pillar 2 — Unlock** |
| Heading hierarchy fix | /jobs (2 H1s — demote "Current vacancies" to H2) | **Pillar 2 — Unlock** |
| Alt text remediation | ~105 images across homepage, /features, /about | **Pillar 2 — Unlock** |
| BlogPosting schema fixes | Publisher field, author typing across knowledge hub | **Pillar 2 — Unlock** |
| BreadcrumbList expansion | /accountant-software, knowledge hub articles | **Pillar 2 — Unlock** |
| llms.txt creation | New file at site root for AI-search discoverability | **Pillar 2 — Unlock** |
| GDPR consent timing | Consent Mode v2 — defer analytics until consent granted | **Pillar 1 — De-risk** |
| GoSimpleTax tracking script | Investigate and remove competitor's PageSense script | **Pillar 1 — De-risk** |
| Dual Facebook Pixels | Audit — confirm both serve distinct purposes or consolidate | **Pillar 1 — De-risk** |
| Session recording review | Hotjar + Zoho PageSense against privacy policy | **Pillar 1 — De-risk** |
| Archive and dev page cleanup | Unpublish 7 archive pages, delete 8 dev/test drafts | **Pillar 1 — De-risk** |
| Authority links to HMRC/GOV.UK | Outbound links on MTD and expense content | **Pillar 3 — Grow** |
| Freshness timestamps | "Last updated" on homepage, /mtd-software, /features | **Pillar 3 — Grow** |
| Answer-first content rewrites | Homepage and /features opening paragraphs | **Pillar 3 — Grow** |
| Sole trader page consolidation | 3 pages to 1 canonical + redirects | **Pillar 3 — Grow** |
| Landlord landing page | New page for underserved ICP segment | **Pillar 3 — Grow** |
| Named authors | Knowledge hub articles — move from "The Coconut Team" to real names | **Pillar 3 — Grow** |
| Content freshness programme | Update knowledge hub articles older than 6 months | **Pillar 3 — Grow** |
| CTA strengthening | Replace "Read more" / "More information" with action-oriented copy | **Pillar 3 — Grow** |

**Recommendation on narrative sequencing:** Lead with Pillar 2 (the unlock) in the
client story — it is what Anna asked for and what delivers visible results fastest.
Position Pillar 1 (de-risk) as the insurance that protects the Pillar 2 investment.
The GoSimpleTax finding and GDPR consent timing give Pillar 1 urgency without requiring
it to carry the narrative. Pillar 3 (grow) is the retainer story — compound returns
that build on the structured-data foundation.

---

*Use this as the opening 1-2 pages of the proposal and the anchor for every client
conversation. Share with the internal team so we all tell the same story.*
