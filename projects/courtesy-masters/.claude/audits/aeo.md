# AEO Audit -- CourtesyMasters

**Date:** 2026-04-15
**Auditor:** Claude (automated)
**Baseline:** intake.json homepage score 3/20 (L1)

**Audited pages:**
- Homepage: https://www.courtesymasters.com/
- For Employers: https://www.courtesymasters.com/for-employers
- For Candidates: https://www.courtesymasters.com/for-candidates
- Jobs: https://www.courtesymasters.com/jobs

---

## Scorecard

| Check | ID | Homepage | For Employers | For Candidates | Jobs |
|---|---|---|---|---|---|
| **A. Schema** | | | | | |
| JSON-LD present | A1 | WARN | WARN | WARN | WARN |
| FAQPage schema on Q&A | A2 | FAIL | FAIL | FAIL | FAIL |
| HowTo schema on tutorials | A3 | N/A | FAIL | N/A | N/A |
| Organization/LocalBusiness | A4 | WARN | FAIL | FAIL | FAIL |
| **B. Answer Structure** | | | | | |
| Answer-first lead paragraph | B5 | WARN | PASS | PASS | WARN |
| Question-format H2s | B6 | FAIL | WARN | FAIL | FAIL |
| Paragraph length <= 150 words | B7 | PASS | PASS | PASS | PASS |
| Section length <= 300 words | B8 | PASS | PASS | PASS | PASS |
| Lists have intro sentences | B9 | FAIL | PASS | PASS | FAIL |
| Active voice in service descs | B10 | PASS | PASS | PASS | PASS |
| **C. Freshness** | | | | | |
| Visible "last updated" date | C11 | FAIL | FAIL | FAIL | FAIL |
| Content updated within 6 months | C12 | WARN | WARN | WARN | WARN |
| No undated hedge words | C13 | PASS | PASS | PASS | WARN |
| **D. Authority** | | | | | |
| Original data/stats/methodology | D14 | WARN | WARN | WARN | WARN |
| Author/entity byline | D15 | FAIL | FAIL | FAIL | FAIL |
| External citations | D16 | FAIL | FAIL | FAIL | FAIL |
| Cite-magnet content | D17 | FAIL | FAIL | FAIL | FAIL |
| **E. Technical** | | | | | |
| Descriptive image alt text | E18 | FAIL | FAIL | FAIL | FAIL |
| 2+ internal links per page | E19 | PASS | PASS | PASS | PASS |
| AI bot rules in robots.txt | E20 | FAIL | FAIL | FAIL | FAIL |

### Score Totals

| Category | Homepage | For Employers | For Candidates | Jobs |
|---|---|---|---|---|
| A. Schema (0-4) | 1 | 0.5 | 0.5 | 0.5 |
| B. Answer Structure (0-6) | 3 | 5 | 4 | 3 |
| C. Freshness (0-3) | 0.5 | 0.5 | 0.5 | 0.5 |
| D. Authority (0-4) | 0.5 | 0.5 | 0.5 | 0.5 |
| E. Technical (0-3) | 1 | 1 | 1 | 1 |
| **Total (/20)** | **6** | **7.5** | **6.5** | **5.5** |

(WARN = 0.5 points; PASS = 1 point; FAIL = 0 points; N/A = excluded from denominator)

---

## Per-Page Findings

### Homepage

**A. Schema**

- **A1 -- JSON-LD present: WARN.** Organization schema is present with name, founder, founding date, address, contact points, and social profiles. BreadcrumbList schema is dynamically generated via JS -- crawlers that do not execute JavaScript will miss it. The Organization schema itself appears to be static JSON-LD, which is good. However, no page-specific schema (WebPage, WebSite) is present.
- **A2 -- FAQPage schema: FAIL.** The homepage has a "How can we assist you?" section with tabbed content for Candidates/Employers, but it is not structured as FAQ and has no FAQPage schema.
- **A3 -- HowTo schema: N/A.** No tutorial or how-to content exists on the homepage. Not applicable.
- **A4 -- Organization/LocalBusiness schema: WARN.** Organization schema is present with address (Zuid Hollandlaan 7, The Hague), phone numbers, and social links. However, it uses `Organization` type rather than `LocalBusiness` or `EmploymentAgency`, which would be more specific and beneficial for local search and answer engines. Missing: `sameAs` for all social profiles (only some included), `areaServed`, `hasOfferCatalog`, `knowsAbout`.

**B. Answer Structure**

- **B5 -- Answer-first lead paragraph: WARN.** The opening text reads: "Worldwide hospitality search, selection, staffing and interim management boutique agency beyond just international hospitality recruitment." This describes the company but does not directly answer a user query. A searcher asking "What is CourtesyMasters?" or "hospitality recruitment agency The Hague" gets a partial answer, but the sentence structure is awkward and buries the answer in qualifiers. The second sentence is stronger: "We are all about building long-term success for both our candidates and employers."
- **B6 -- Question-format H2s: FAIL.** H2s are: "Discover excellent services for you," "What others say," "How can we assist you?," "Find hospitality jobs that match your ambition," "Cases," "Insights." Only "How can we assist you?" is phrased as a question, but it is a navigational prompt, not a search query someone would type. None map to actual search queries like "How do I find hospitality jobs in Europe?" or "What does a hospitality headhunter do?"
- **B7 -- Paragraph length <= 150 words: PASS.** All paragraphs are short, typically 1-3 sentences. Body copy is concise and scannable.
- **B8 -- Section length <= 300 words: PASS.** No section exceeds 300 words. The homepage is structured as a series of brief modules.
- **B9 -- Lists have intro sentences: FAIL.** The job listings section jumps straight into cards with no introductory text explaining what the user is looking at. The "Trusted by" logo grid also lacks an intro sentence.
- **B10 -- Active voice in service descriptions: PASS.** "We see people, not profiles." "We are all about building long-term success." Consistently active.

**C. Freshness**

- **C11 -- Visible "last updated" date: FAIL.** No "last updated" date visible anywhere on the homepage. Blog post dates (April 3, 2026) appear in the Insights section but do not indicate when the homepage itself was updated.
- **C12 -- Content updated within 6 months: WARN.** The site was last published on 2026-04-09 per Webflow metadata. Blog posts show dates as recent as April 2026. However, there is no visible signal to answer engines that the homepage content is current. Partial credit for recent blog dates being visible.
- **C13 -- No undated hedge words: PASS.** Clean. Uses "since 1999" (dated), no "recently," "currently," or "new" without context.

**D. Authority**

- **D14 -- Original data/stats: WARN.** "Rated at a 9.7" is referenced but no source, sample size, or methodology is given. This is a proprietary claim without substantiation. Partial credit for having any number at all, but answer engines cannot verify or cite it.
- **D15 -- Author/entity byline: FAIL.** No page-level attribution. Blog posts in the Insights section show author names (Larissa Zwart, Anniek Fleur Swanenberg), but the homepage itself has no author or editorial attribution.
- **D16 -- External citations: FAIL.** No external sources, studies, or industry data cited anywhere on the homepage.
- **D17 -- Cite-magnet content: FAIL.** No unique frameworks, proprietary definitions, original research, or data that others would reference. The "9.7 rating" could be cite-worthy if properly sourced and contextualized.

**E. Technical**

- **E18 -- Descriptive image alt text: FAIL.** All images across the homepage lack alt text. This includes the hero image, job listing images, case study images, client logos (20+), and blog post images. This is a WCAG 2.1 Level A failure and also means answer engines cannot understand image content.
- **E19 -- 2+ internal links per page: PASS.** The homepage has extensive internal linking: navigation, footer, service links, job links, case study links, blog links, and multiple contact form links. Well above the minimum threshold.
- **E20 -- AI bot rules in robots.txt: FAIL.** robots.txt contains no rules for GPTBot, ClaudeBot, CCBot, Google-Extended, or any other AI crawler. There is a reference to an `llms.txt` file, which exists and is well-structured (content map of the site), but this is not a substitute for explicit robots.txt directives. AI crawlers may freely crawl and index all content without guidance on what to prioritize or exclude.

---

### For Employers

**A. Schema**

- **A1 -- JSON-LD present: WARN.** Only BreadcrumbList schema present (JS-generated). No page-specific schema. The Organization schema from the homepage does not appear to be included on interior pages.
- **A2 -- FAQPage schema: FAIL.** The page has a "Frequently Asked Questions" section with 5 Q&A pairs (e.g., "How do you ensure the right cultural fit?", "How fast can you deliver candidates?"), but no FAQPage schema markup wraps this content. This is one of the highest-impact misses -- the content exists and is perfectly structured for FAQPage schema.
- **A3 -- HowTo schema: FAIL.** A 6-step recruitment process is described ("Listen and uncover" through "Beyond partnership"). This could qualify for HowTo schema but is structured as a methodology explanation rather than user-facing instructions. Still, adding HowTo markup would help answer engines extract the process.
- **A4 -- Organization/LocalBusiness schema: FAIL.** No Organization schema on this page. Only the homepage carries it.

**B. Answer Structure**

- **B5 -- Answer-first lead paragraph: PASS.** "From urgent hires to future leaders, we help hospitality employers attract, assess, and appoint exceptional talent." This directly answers "What does CourtesyMasters do for employers?" in the first sentence. Strong answer-first structure.
- **B6 -- Question-format H2s: WARN.** Most H2s are statement-format ("Hire with confidence," "Smart recruitment services for ambitious hospitality employers"). The FAQ section uses question-format headings, but the main content H2s do not match search queries. Partial credit for having the FAQ section with question-format items, even though the FAQ items are rendered under a single H2.
- **B7 -- Paragraph length <= 150 words: PASS.** All paragraphs are concise. FAQ answers are 2-3 sentences. Service descriptions are 1-2 sentences.
- **B8 -- Section length <= 300 words: PASS.** No section exceeds the threshold. Process steps use single sentences.
- **B9 -- Lists have intro sentences: PASS.** Service list introduced with: "Every service is designed to help you hire with confidence, save time, and raise the calibre of talent across your organisation." Department list introduced with: "From front of house to finance, we understand every department has its role and its standards."
- **B10 -- Active voice: PASS.** "We go beyond resumes." "We present only candidates who match your brand." Consistently active.

**C. Freshness**

- **C11 -- Visible "last updated" date: FAIL.** No update date anywhere on the page.
- **C12 -- Content updated within 6 months: WARN.** Blog post dates visible in Insights section show recent activity. Page published date not visible to users.
- **C13 -- No undated hedge words: PASS.** Clean temporal language throughout. "Since 1999" is properly dated.

**D. Authority**

- **D14 -- Original data/stats: WARN.** "Rated at a 9.7" appears again without source. Four office locations mentioned (Netherlands, Monaco, Spain, Italy). No industry data, placement statistics, or success rates shared.
- **D15 -- Author/entity byline: FAIL.** No page-level attribution. Blog authors appear in the Insights section only.
- **D16 -- External citations: FAIL.** No external sources cited.
- **D17 -- Cite-magnet content: FAIL.** The 6-step methodology could be cite-worthy if published as a named framework (e.g., "The CourtesyMasters Method") with supporting data. Currently unnamed and unsupported.

**E. Technical**

- **E18 -- Descriptive image alt text: FAIL.** No alt text on any images. Decorative images, client logos, and content images all lack descriptions.
- **E19 -- 2+ internal links: PASS.** Extensive internal linking across services, departments, industries, contact forms, and footer links. Well above threshold.
- **E20 -- AI bot rules in robots.txt: FAIL.** Same site-wide issue. No AI crawler directives.

---

### For Candidates

**A. Schema**

- **A1 -- JSON-LD present: WARN.** Only BreadcrumbList schema (JS-generated). No page-specific schema.
- **A2 -- FAQPage schema: FAIL.** FAQ section present with 5 questions (e.g., "What happens after I submit my CV?", "Do I have to pay for your services?"). No FAQPage schema. Same high-impact miss as the employer page.
- **A3 -- HowTo schema: N/A.** No step-by-step tutorial content on this page. The "Process for Candidates" is linked but hosted on a separate page.
- **A4 -- Organization/LocalBusiness schema: FAIL.** No Organization schema on this page.

**B. Answer Structure**

- **B5 -- Answer-first lead paragraph: PASS.** "Whether you're a rising star or seasoned professional, we help you take the next step in your hospitality career." Directly answers "How can CourtesyMasters help me find a hospitality job?" in the first sentence.
- **B6 -- Question-format H2s: FAIL.** H2s are all statement-format: "Global Hospitality Talent, Human First," "Services that move hospitality careers forward," "For every step in your journey." None match search queries. The FAQ section has questions but they sit under a single FAQ H2.
- **B7 -- Paragraph length <= 150 words: PASS.** Short paragraphs throughout. Service descriptions are 2-3 sentences maximum.
- **B8 -- Section length <= 300 words: PASS.** All sections are concise.
- **B9 -- Lists have intro sentences: PASS.** Department, industry, and level lists have introductory context ("Whether you thrive in the kitchen...").
- **B10 -- Active voice: PASS.** "We help you take the next step." "Share your CV, explore curated roles." Active throughout.

**C. Freshness**

- **C11 -- Visible "last updated" date: FAIL.** No update date on the page.
- **C12 -- Content updated within 6 months: WARN.** Blog dates show recent activity. No page-level freshness signal.
- **C13 -- No undated hedge words: PASS.** "Next step" used frequently but is directional, not temporal. No "recently" or "currently" detected.

**D. Authority**

- **D14 -- Original data/stats: WARN.** "9.7" rating referenced. "17 Industry Segments" mentioned as a title. No sourced data.
- **D15 -- Author/entity byline: FAIL.** No page-level attribution.
- **D16 -- External citations: FAIL.** Hotelschool partnerships listed but no external links or citations.
- **D17 -- Cite-magnet content: FAIL.** No unique data, frameworks, or definitions.

**E. Technical**

- **E18 -- Descriptive image alt text: FAIL.** No alt text on any images.
- **E19 -- 2+ internal links: PASS.** Rich internal linking across departments, industries, levels, services, and contact forms.
- **E20 -- AI bot rules in robots.txt: FAIL.** Same site-wide issue.

---

### Jobs

**A. Schema**

- **A1 -- JSON-LD present: WARN.** Only BreadcrumbList schema (JS-generated). No page-level schema.
- **A2 -- FAQPage schema: FAIL.** FAQ section present with 5 questions. No FAQPage schema markup.
- **A3 -- HowTo schema: N/A.** No tutorial content on this page.
- **A4 -- Organization/LocalBusiness schema: FAIL.** No Organization schema. Critically, no `JobPosting` schema on individual job listings despite this being a jobs page. The Webflow CMS job items should each carry structured `JobPosting` markup.

**B. Answer Structure**

- **B5 -- Answer-first lead paragraph: WARN.** "We're delighted to see you here, embarking on your journey towards new opportunities. Lovely!" The greeting is friendly but does not answer a user query. The second sentence is better: "As a boutique hospitality executive search & management recruitment firm with a focus on hospitality professionals, we prioritize confidentiality, leading to approximately 75% of our assignments being discreetly conducted." But this still buries the answer behind pleasantries. A user searching "hospitality jobs" or "hotel management careers" does not get a direct answer first.
- **B6 -- Question-format H2s: FAIL.** H2s: "Have questions? Want to go beyond what's listed?", "Open application?", "Frequently Asked Questions." Only one is close to a search query format but is navigational. Missing H2s like "What hospitality jobs are available?" or "How do I apply for hotel management positions?"
- **B7 -- Paragraph length <= 150 words: PASS.** Short paragraphs. Job descriptions are 1-3 sentences.
- **B8 -- Section length <= 300 words: PASS.** All sections are concise.
- **B9 -- Lists have intro sentences: FAIL.** Job listing sections ("Open assignments," "Jobs at CourtesyMasters," "Successfully closed jobs") present as tabs with no introductory text explaining the listing or how to use it.
- **B10 -- Active voice: PASS.** "We prioritize confidentiality." "We're delighted to see you here." Active throughout.

**C. Freshness**

- **C11 -- Visible "last updated" date: FAIL.** No page-level update date. Individual job postings may have dates but they are not prominently displayed on the listing page.
- **C12 -- Content updated within 6 months: WARN.** Job listings appear current (active positions listed). No explicit date signal.
- **C13 -- No undated hedge words: WARN.** "new opportunities" in the opening. "fresh vacancies" in the FAQ section. Both use "new/fresh" without specific dates, which can signal staleness if the content is not actually updated regularly.

**D. Authority**

- **D14 -- Original data/stats: WARN.** "Approximately 75% of our assignments being discreetly conducted" is a proprietary statistic, though unverified. Partial credit.
- **D15 -- Author/entity byline: FAIL.** Larissa Zwart listed as a contact but not as a content author.
- **D16 -- External citations: FAIL.** No external citations.
- **D17 -- Cite-magnet content: FAIL.** The "75% confidential" statistic could be cite-worthy if properly published in a report or methodology page.

**E. Technical**

- **E18 -- Descriptive image alt text: FAIL.** Images use filenames as pseudo-alt text (e.g., "Junior-Suite-blw-Grand-Hotel-National-Luzern-CH-small.avif") rather than descriptive alt attributes. This is not accessible or useful for answer engines.
- **E19 -- 2+ internal links: PASS.** Links to individual job pages, candidate pages, contact forms, and methodology pages.
- **E20 -- AI bot rules in robots.txt: FAIL.** Same site-wide issue.

---

## Priority Fix List

Ordered by impact (schema + freshness first, then answer structure, authority, and technical).

### Tier 1 -- High Impact, Quick Wins

1. **Add FAQPage schema to For Employers, For Candidates, and Jobs pages.**
   FAQ content already exists in the correct Q&A format. Wrapping it in `FAQPage` + `Question` + `acceptedAnswer` schema is the single highest-ROI fix. Answer engines (Google SGE, Perplexity, ChatGPT Browse) will extract these directly.
   Pages: `/for-employers`, `/for-candidates`, `/jobs`

2. **Add JobPosting schema to job listings.**
   Each CMS job item should carry `JobPosting` structured data (title, description, datePosted, hiringOrganization, jobLocation, employmentType). This is critical for Google for Jobs and AI-powered job search tools.
   Page: `/jobs` and individual job CMS template pages

3. **Extend Organization schema to all pages (or use WebSite + WebPage schema).**
   Currently only the homepage carries Organization markup. Add at minimum a `WebSite` schema on the homepage and `WebPage` schema on all interior pages. Consider upgrading from `Organization` to `EmploymentAgency` (a more specific Schema.org type).
   Pages: all

4. **Add AI crawler rules to robots.txt.**
   Add explicit `User-agent` directives for GPTBot, ClaudeBot, CCBot, Google-Extended, and PerplexityBot. Decide on a policy (allow or disallow specific paths) and implement it. The current `llms.txt` file is good supplementary content but is not a substitute for robots.txt rules.
   File: `robots.txt`

### Tier 2 -- High Impact, Moderate Effort

5. **Add "last updated" dates to key pages.**
   Display a visible "Last updated: [date]" on the homepage, For Employers, For Candidates, and Jobs pages. Can be automated via Webflow's page publish date. This signals freshness to answer engines.
   Pages: all audited pages

6. **Fix image alt text site-wide.**
   Every image needs a descriptive alt attribute. Client logos should use the brand name (e.g., alt="Belmond logo"). Content images should describe the scene. Decorative images should use alt="" (empty) to be marked as decorative. This is both an accessibility requirement (WCAG 2.1 Level A) and an AEO factor.
   Pages: all

7. **Rewrite homepage lead paragraph to be answer-first.**
   Current: "Worldwide hospitality search, selection, staffing and interim management boutique agency beyond just international hospitality recruitment."
   Suggested: "CourtesyMasters is an international hospitality recruitment agency based in The Hague, specializing in executive search, selection, and interim management for the hotel and hospitality industry since 1999."
   Page: `/`

8. **Rewrite Jobs page lead paragraph to be answer-first.**
   Current: "We're delighted to see you here, embarking on your journey towards new opportunities. Lovely!"
   Suggested: "Browse open hospitality and hotel management positions across Europe, the Middle East, and beyond. CourtesyMasters places professionals at every level, from junior roles to C-suite executives."
   Page: `/jobs`

### Tier 3 -- Medium Impact, Content Work

9. **Convert key H2s to question format on all pages.**
   Map H2s to actual search queries. Examples:
   - Homepage: "How can we assist you?" -> "How does CourtesyMasters help hospitality professionals?"
   - Homepage: "What others say" -> "What do clients say about CourtesyMasters?"
   - Jobs: "Have questions?" -> "How do I apply for hospitality jobs?"
   - For Candidates: "Services that move hospitality careers forward" -> "What career services does CourtesyMasters offer?"

10. **Add intro sentences to all list sections.**
    Job listing tabs, logo grids, and card groups need a 1-2 sentence lead-in so answer engines understand the context.
    Pages: homepage (job cards, Trusted By), jobs (listing tabs)

11. **Source and publish the "9.7 rating" claim.**
    State the source (e.g., Google Reviews, internal survey), sample size, and date. Consider linking to the source. An unsubstantiated rating claim has zero authority value for answer engines.
    Pages: all pages where it appears

12. **Remove undated hedge words from Jobs page.**
    Replace "new opportunities" and "fresh vacancies" with specific language (e.g., "current open positions" or reference a date range).
    Page: `/jobs`

### Tier 4 -- Strategic, Longer-Term

13. **Create cite-magnet content.**
    Publish original data or named frameworks that others would reference. Candidates:
    - "The CourtesyMasters Methodology" -- name and document the 6-step process as a standalone piece
    - Annual hospitality salary benchmarks or placement statistics
    - "State of Hospitality Recruitment" report with proprietary data
    Pages: `/methodology`, new content pages

14. **Add author/entity bylines to service pages.**
    Attribute content to named authors or to "CourtesyMasters Editorial Team." Include author bios with credentials. This strengthens E-E-A-T signals.
    Pages: all service pages

15. **Add external citations to service descriptions.**
    Reference industry data, hospitality industry reports (STR, WTTC, Cornell), or government labor statistics to support claims. This signals depth and trustworthiness to answer engines.
    Pages: all service pages

16. **Add HowTo schema to the Methodology/Process pages.**
    The 6-step employer process and the candidate process are natural fits for HowTo schema. This helps answer engines extract step-by-step information.
    Pages: `/methodology`, `/process-for-candidates`

---

## Content Maturity Assessment

### Overall Rating: L1-L2 (Transitioning)

| Level | Description | Status |
|---|---|---|
| L1 | Invisible -- no structured content, no schema | Partially moved beyond |
| **L2** | **Discoverable -- basic schema, some structure** | **Current position** |
| L3 | Extractable -- answer-first content, question H2s, FAQ schema | Target (requires Tier 1-2 fixes) |
| L4 | Citable -- original data, cite-magnet content, author signals | Aspirational |
| L5 | Authoritative -- comprehensive coverage, freshness signals, full schema | Long-term goal |

### Assessment Detail

**What is working (L2 signals):**
- Organization schema exists on the homepage (partial, but present)
- Paragraph and section lengths are excellent -- concise, scannable, AI-friendly
- Active voice throughout all service descriptions
- Internal linking is strong (20+ internal links per page)
- FAQ content exists on 3 of 4 pages (just needs schema)
- `llms.txt` is present and well-structured
- Content tone is professional and clear

**What is holding the score back (L1 gaps):**
- No FAQPage schema despite having FAQ content (biggest single miss)
- No JobPosting schema on a recruitment site's job pages
- Zero image alt text across the entire site
- No AI crawler rules in robots.txt
- No freshness signals (no "last updated" dates)
- No external citations or sourced statistics
- No author attribution on any page
- No cite-magnet content (no named frameworks, no original data)
- Homepage and Jobs page lead paragraphs are not answer-first

**Intake baseline comparison:**
The intake.json scored the homepage at 3/20 (L1). This audit scores it at 6/20 after more detailed review, reflecting partial credit (WARN scores) that the initial binary assessment did not capture. The For Employers page scores highest at 7.5/20, primarily due to its stronger answer-first content and better list introductions. The site average is 6.4/20.

**Path to L3 (target: 12-14/20):**
Implementing Tier 1 and Tier 2 fixes (FAQPage schema, JobPosting schema, Organization schema on all pages, AI bot rules, alt text, freshness dates, and answer-first rewrites) would move the site to approximately 12-14/20 and solidly into L3 maturity. This is achievable with moderate effort, primarily technical (schema injection) and editorial (paragraph rewrites, alt text).

**Path to L4 (target: 16+/20):**
Requires original data publication, named methodology frameworks, author bylines with credentials, and external citations. This is a content strategy effort, not a technical fix.
