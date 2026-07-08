**Month:** July 2026 | **Site:** www.carsa.co.uk | **Pages crawled:** 5,678

---

## Summary

A strong month. Several long-standing fixes are now live and verified in the data: the 25 nofollow links on the fuel and sell-car pages are gone (25 → 0), the duplicate main headings are resolved (2 → 0), the missing store titles are filled (3 → 0), and the insecure links on the legal pages are nearly all cleared (3 → 1). The make/model FAQ rebuild also landed cleanly — no FAQ markup errors remain, where June still had them. Site health rose from 69% to 72%.

Several worries from last month turned out smaller than feared. The uncrawled-pages count that spiked mid-crawl is back down to 17 (not the 100 we flagged), 4xx errors fell from 38 to 21, and slow-loading pages dropped from 4,032 to 3,928.

The one area still needing real work is structured data. The FAQ half is done, but there are **1,207 structured-data errors, and essentially every one is a vehicle page missing an image** in its listing data. These are cars still in preparation — they went live before being photographed, and Google treats a vehicle listing with no image as an error. Available and reserved cars are unaffected. This is the single biggest lever left: fixing it clears almost the entire structured-data error count in one change.

The other movers are inventory-growth side effects: duplicate titles, duplicate content and broken internal links all rose as stock turned over. None are quality problems with the site — they're the normal churn of a 5,600-page inventory site. The broken links in particular are sold cars coming offline, best addressed at the source rather than hand-fixed one by one (issue #2).

---

## Key metrics

**SEO health** (SEMRush, 9 June → 7 July)

| Metric | June | July | Change |
|--------|------|------|--------|
| Pages crawled | 5,484 | 5,678 | +194 (inventory growth) |
| Site health score | 69% | 72% | +3% |
| SEMRush AI Search score | 74 | 74 | — |
| Structured-data errors | 1,235 | 1,207 | −28 (FAQ cleared; vehicle-image now the whole count) |
| 5xx server errors | 0 | 3 | +3 (transient) |
| 4xx errors | 38 | 21 | −17 (sold-vehicle cleanup) |
| Broken internal links | 10 | 56 | +46 (links to sold cars) |
| Broken external links | 5,391 | 5,632 | +241 |
| Duplicate title tags | 1,950 | 2,128 | +178 (inventory growth) |
| Duplicate content pages | 759 | 1,106 | +347 (inventory growth) |
| Duplicate meta descriptions | 50 | 52 | +2 |
| Over-length page titles | 392 | 430 | +38 |
| Links with no anchor text | 5,427 | 5,640 | +213 |
| Multiple H1 tags | 2 | 0 | −2 (fixed) |
| Missing page titles | 3 | 0 | −3 (fixed) |
| Nofollow internal links | 25 | 0 | −25 (fixed) |
| Links to HTTP pages | 3 | 1 | −2 (legal-page fix landed) |
| Slow page load | 4,032 | 3,928 | −104 (improved) |
| Pages not crawled | 36 | 17 | −19 (improved) |
| Pages with one internal link | 93 | 87 | −6 (improved) |

**AI search readiness (AEO)**

SEMRush's own AI Search score holds steady at 74/100. The 20-point AEO framework below tracks the finer-grained signals:

| Category | June | July | Change | To improve |
|----------|------|------|--------|------------|
| Structured data | 3/4 | 3/4 | — | Apply the vehicle-image fix so the 1,207 remaining errors clear → 4/4 |
| Answer structure | 4/4 | 4/4 | — | Keep blog paragraphs tight (max ~3 sentences) |
| Freshness | 1/3 | 2/3 | +1 | Add visible "last updated" dates to /car-finance, /faq and service pages |
| Authority | 2/4 | 2/4 | — | Add a real named blog author and link out to the FCA register |
| Technical | 2/3 | 3/3 | +1 | Add alt text to hero, promo and vehicle images |
| **Overall** | **13/20** | **14/20** | **+1** | |

---

## What changed and why

**Fixed:**
- Nofollow internal links: 25 → 0. The fuel and sell-car pages now pass full ranking value.
- Multiple H1 tags: 2 → 0. Each affected page now has exactly one main heading.
- Missing page titles: 3 → 0. Store pages now have titles and descriptions.
- Links to HTTP pages: 3 → 1. The Terms and Cookie Policy fixes landed; one insecure link remains.
- FAQ structured data: no FAQ markup errors remain. The rebuild to match each page's real FAQ set (5 on make pages, 7 on model pages) is clean.
- "Jane Doe" placeholder author removed from every blog post's structured data.
- 4xx errors 38 → 21 and pages-not-crawled 36 → 17.
- llms.txt is now live.
- Earlier in the month: sitemap tidied (43 → 29), expired promotion replaced with the Summer Deals banner, broken blog images fixed, GSAP pinned to a stable version, JetBoost removed.

**Regressed (inventory churn):**
- Broken internal links: 10 → 56. Sold cars whose pages come down while other pages still link to them (issue #2).
- Duplicate content pages 759 → 1,106 and duplicate titles 1,950 → 2,128 — inventory growth (194 more pages crawled); the templates can also be made more unique (issues #3–#5).
- 5xx server errors: 0 → 3. Transient.

**Added:**
- Five new structured-data templates (fuel, near, sell-car, promotions, deals).
- New blog post published 30 June — "Best used cars under £15,000" — answer-first content with original data.
- Summer Deals homepage banner replacing the expired winter promotion.

---

## Top issues to fix

Ranked by impact and ease. Short summary at the top; open the toggle for the full detail.

### 1. Vehicle pages missing an image in their structured data — needs an approach decision {toggle="true"}

*Issue:* 1,207 structured-data errors — essentially every one a vehicle page whose listing data has no image (cars still in preparation, live before being photographed).
*Constraint:* Webflow can't conditionally render a single image line inside a schema block, so the fix has to work at the whole-block or the data level.
*Fix:* Choose one of — (a) a placeholder image for in-prep cars, (b) suppress the whole vehicle-schema block when there's no image, or (c) hold in-prep cars back from publishing until photographed.
*Benefit:* Clears almost the entire structured-data error count.

	---

	**Detail**

	**Root cause:** The vehicle schema pulls its image from the Main Image field, which is empty on in-prep cars. Available and Reserved cars always have an image, so they validate fine. Every flagged item is a `MERCHANT_LISTING` missing the required `image` field (verified across the sample — Jaguar F-PACE, BMW i4, Volvo XC90, Audi A4, all under /vehicles/used/).

	**Option A — Placeholder image (quickest, no-code):** Populate the Main Image field with a branded "Photo coming soon" image for cars that don't yet have one. The schema always carries a valid image and the page shows a proper placeholder; the real photo replaces it automatically once added. Trade-off: a placeholder is weaker than a real photo, but it clears the hard error immediately.

	**Option B — Suppress the whole schema block:** If the vehicle schema is a Webflow embed element, wrap it in conditional visibility set to "Main Image is set" so Webflow leaves the block out of the HTML for imageless cars — Google then sees no listing (no error) rather than an incomplete one. If the schema is built in `vdp.js` instead, we make the same "only emit the listing when an image exists" change in code. A quick check confirms which.

	**Option C — Don't publish until photographed (cleanest long-term):** Hold in-prep cars in Draft until they have a photo. Resolves this plus the related uncrawled-page and duplicate-content counts, but changes the current "go live early" flow.

	**Recommendation:** Option A now to clear the errors fast; Option C as the longer-term process fix.

	**How to verify:** Rich Results Test on an in-prep car — no image error, or no vehicle listing emitted at all.

### 2. Broken internal links (56) — sold cars, not fixable one-by-one {toggle="true"}

*Issue:* 56 internal links point to vehicle pages that now 404 — cars that have sold and been taken offline.
*Reality:* Not links we can hand-fix; they're a moving target as stock sells daily, so the raw count is churn, not a defect.
*Fix:* Address the source — keep sold pages live with a "Sold" state, or 301-redirect sold URLs.
*Benefit:* Removes the dead ends at the source instead of chasing individual links each month.

	---

	**Detail**

	**Root cause:** When a car sells, its CMS item is unpublished and the page comes down, but other pages still link to it until the next republish. With inventory turning over daily, any hand-fixed list is out of date immediately.

	**Option A (recommended):** Flip a "Sold" toggle on the CMS item and keep the page live. The template shows a "This car has sold" banner plus links to similar cars, and hides the buy CTA. No 404s, link equity preserved, visitor gets a next step — ends the churn for good.

	**Option B:** Ensure every sold-car URL 301-redirects (to the model or make page, or /used-cars). Carsa already has a /car-redirect page — worth confirming sold-car links route through it and 301 cleanly.

	**How to verify:** After Option A or B, re-crawl — the count should trend toward 0 and stay there.

### 3. Reduce duplicate title tags — 1 hour {toggle="true"}

*Issue:* 2,128 pages share a non-unique title tag.
*Explanation:* When many pages have the same title, Google can't tell them apart, which weakens rankings for all of them.
*Fix:* Make the vehicle and model title templates more distinctive.
*Benefit:* Better differentiation across the largest page groups; steadily brings the count down.

	---

	**Detail**

	**Root cause:** The bulk are vehicle and model pages generated from templates that produce near-identical titles (e.g. same make/model with no differentiator).

	**What to change:** Add distinguishing fields to the title template — for vehicles, include year, trim, mileage or location (e.g. "Used 2021 BMW 3 Series 320i M Sport — 34,000 miles | Carsa Southampton"). For model pages, vary by body style or a key spec.

	**How to verify:** Re-crawl; the duplicate-title count should fall as the new templates publish.

### 4. Reduce duplicate meta descriptions — 0.5 hours {toggle="true"}

*Issue:* 52 pages share the same meta description.
*Explanation:* Duplicate descriptions give Google no reason to prefer one page over another and often get rewritten in search results.
*Fix:* Make the meta-description templates unique per page.
*Benefit:* Cleaner search snippets and better click-through on the affected pages.

	---

	**Detail**

	**Root cause:** A small set of templates output the same description across multiple pages.

	**What to change:** Bind the meta description to page-specific fields (make/model/price/location for vehicles; topic for content pages). For static pages, write a unique description each.

	**How to verify:** Re-crawl; the duplicate-meta count should drop toward 0.

### 5. Shorten over-length page titles — 0.5 hours {toggle="true"}

*Issue:* 430 pages have titles too long for Google to show in full.
*Explanation:* Over-length titles get truncated in search results, so the important words can be cut off.
*Fix:* Trim the title templates so the key information sits within ~60 characters.
*Benefit:* Full, readable titles in search — better click-through.

	---

	**Detail**

	**Root cause:** Some templates append too many fields, pushing titles past the display limit.

	**What to change:** Reorder templates so the most important terms come first and cap the length. This pairs naturally with the duplicate-title work in issue #3.

	**How to verify:** Re-crawl; the over-length-title count should fall.

### 6. Add "last updated" dates to service pages — 0.5 hours {toggle="true"}

*Issue:* Pages like /car-finance and /faq show no date anywhere.
*Explanation:* Google and AI tools favour content that visibly shows it's current; an undated finance page could look years old.
*Fix:* Add a visible "last updated" line to the key service pages.
*Benefit:* Improves the freshness signal — moves the AEO Freshness score from 2/3 to 3/3.

	---

	**Detail**

	**Pages affected:** Priority: /car-finance, /car-finance-calculator, /faq, /car-care and its sub-pages. Then the process pages: /sell-car, /part-exchange, /value-car, /reserve. Legal pages can pick this up automatically.

	**What to change:** For legal and blog pages, drive the date from the CMS's built-in "updated on" field — it maintains itself. For static service pages, add a visible date updated by hand when content changes. Avoid an automatic "today's date" stamp — that isn't a genuine freshness signal and is discounted by search engines.

	**How to verify:** View any updated page — a clear "Last updated: [date]" should be visible near the top or bottom.

### 7. Add image alt text — 0.25 hours {toggle="true"}

*Issue:* Hero, promotion and vehicle images are missing descriptive alt text.
*Explanation:* Alt text helps screen readers and gives Google (and image search) context about each picture.
*Fix:* Add concise, descriptive alt text to the main image templates and key homepage images.
*Benefit:* Better accessibility and an extra ranking signal — completes the AEO Technical category.

	---

	**Detail**

	**What to change:** For CMS-driven vehicle images, bind the alt text to a sensible field (e.g. the car's name/make/model). For static homepage images, write short descriptive alt text directly.

	**How to verify:** Inspect a vehicle page and the homepage; the main images should have non-empty, descriptive alt text.

### 8. Add anchor text to unlabelled links — 1 hour {toggle="true"}

*Issue:* 5,640 links have no anchor text — typically icon and image links with nothing for a screen reader or search engine to read.
*Explanation:* A link with no text tells Google nothing about its destination and is invisible to screen-reader users.
*Fix:* Add descriptive text or an aria-label to the icon/image link components.
*Benefit:* Better accessibility and clearer link signals across the whole site at once.

	---

	**Detail**

	**Root cause:** The count is high because it's systemic — the same handful of components (card image links, social icons, arrow buttons) repeat across thousands of pages.

	**What to change:** Add an aria-label (or visually-hidden text) to those shared components once, and every page benefits. For CMS card links, bind the label to the item name.

	**How to verify:** Re-crawl; the no-anchor-text count should drop sharply as the shared components update.

### 9. Audit broken external links — 1 hour {toggle="true"}

*Issue:* 5,632 external links across the site return an error.
*Explanation:* Links to dead external pages are a poor experience and a small trust signal to Google.
*Fix:* Find the common source (a number this large is almost always one or a few dead domains referenced site-wide) and fix or remove it.
*Benefit:* Clears thousands of broken links in one or two changes.

	---

	**Detail**

	**Root cause:** A count this high isn't 5,632 unique bad links — it's a small number of dead external URLs referenced from a shared component or CMS field across many pages.

	**What to change:** Pull the list from SEMRush, group by destination domain, and fix the top offenders at the component/CMS level (update or remove the dead URL).

	**How to verify:** Re-crawl; the broken-external-link count should fall in large steps as each shared source is fixed.

### 10. Strengthen internal links to near-orphaned pages — 1 hour {toggle="true"}

*Issue:* 87 pages have only one internal link pointing to them.
*Explanation:* Pages with almost no internal links are harder for Google to find and rank, and pass little authority.
*Fix:* Add contextual internal links to these pages from related content.
*Benefit:* Better crawlability and ranking potential for otherwise-isolated pages.

	---

	**Detail**

	**What to change:** Pull the list of thin-linked pages and add links from logical parents — model pages linking to related makes, blog posts cross-linking to relevant service pages, store pages linking to nearby stores.

	**How to verify:** Re-crawl; the "pages with one internal link" count should fall.

**Total estimated time: ~5 hrs 45 min** (excludes issue #1's approach decision and issue #2's "Sold state" build, which warrant their own estimates)

---

## 5 strategic opportunities

Forward-looking moves beyond fixing errors — for you to decide whether to pursue.

### 1. Add blog author profiles with real names and credentials — 2 hours {toggle="true"}

The blog drives 400+ organic clicks a day. Giving posts a named author with a short bio and credentials would strengthen the trust signals Google weighs, across all 100+ posts.

	---

	**Detail**

	Now that the placeholder author is removed, the next step is a real one. This involves getting a name, job title and a sentence or two of bio from Carsa; adding a visible byline (and ideally a photo) to the blog template; and linking that author to each post in the structured data. Optionally, a simple author page adds further weight.

	**AEO impact:** Authority 2/4 → 3/4.
	**Depends on:** Author details from Carsa.

### 2. Build a /sell-car hub page and store index — already scoped {toggle="true"}

The 10 sell-car store pages exist but nothing ties them together. A hub page would create a proper topic cluster around "sell my car" searches and give Carsa a page that can rank for the head term.

	---

	**Detail**

	**Status:** Already scoped as part of the Sell Car project — no separate estimate needed here.

### 3. Rewrite homepage and service page intros for AI extraction — 0.5 hours {toggle="true"}

The homepage opens with "Find your next car. Finance ready." — AI tools looking for a fact to quote skip straight past it. A factual opening line on each key page gives ChatGPT and Perplexity something to cite directly.

	---

	**Detail**

	Suggested homepage lead: "Carsa is a UK used-car retailer with 10 stores, 2,000+ vehicles and nationwide delivery. Finance available from 8.9% APR." Similar factual openers on /car-finance and other key pages.

	**AEO impact:** Content quality improves on the homepage and /car-finance.

### 4. Add external citations to FCA, Euro NCAP and DVLA — 0.5 hours {toggle="true"}

The site explains finance, warranties and car care without linking to the bodies that govern them. A handful of outbound links to authoritative sources is a quick, credible trust signal.

	---

	**Detail**

	Specific links to add: /car-finance → Carsa's FCA register entry (FRN 935130); blog posts mentioning safety ratings → Euro NCAP; car-care pages → Thatcham Research for security ratings.

	**AEO impact:** Authority 2/4 → 3/4 (combined with a real author).

### 5. Create a quarterly original-data piece {toggle="true"}

Carsa holds data most competitors don't — fastest-selling models, average prices by region, time-on-forecourt trends. A short quarterly report built on that data earns links and gives AI tools something unique to cite.

	---

	**Detail**

	Suggested first piece: "What sold fastest at Carsa in Q2 2026: models, colours and price brackets," built from real sales data no competitor has. Creates a repeatable, link-worthy format.

	**AEO impact:** Authority and content quality both improve.

**Total estimated time: ~3 hours** (excludes the sell-car hub and the quarterly data piece)

---

## Blog topic suggestions

Pulled from fresh SEMRush keyword data (UK database). These are gaps — questions with real search demand where Carsa has a commercial page but no supporting content, or no page at all. Carsa already ranks for PCP, PCP-vs-HP-vs-leasing, car valuation, ISOFIX, 7-seaters and Audi reliability, so those are excluded. Volumes are UK monthly searches.

**Cluster 1 — Electric cars** (highest volume, lowest difficulty, and Carsa sells EVs + offers EV cover):

| Topic | UK searches/mo | Notes |
|-------|---------------|-------|
| How much does it cost to charge an electric car? | 8,100 | Highest-volume gap on the list; low competition |
| How long does it take to charge an electric car? | 3,600 | Pair with a home vs public charging breakdown |
| How long do electric car batteries last? | 2,400 | Addresses the #1 used-EV buyer objection |
| Do electric cars pay road tax? (2026 rules) | 1,900 | Rules changed in 2025 — a fresh, dateable post |
| Are electric cars cheaper to run? | 1,600 | Links naturally to finance and EV stock |
| Should I buy an electric car? / Are they worth it? | 1,300 + 1,300 | Decision-stage; strong internal-link hub potential |

**Cluster 2 — Car finance** (high commercial intent, supports /car-finance):

| Topic | UK searches/mo | Notes |
|-------|---------------|-------|
| Can you sell a car on finance? | 1,900 | Also feeds the Sell Car cluster — double value |
| What is HP car finance? | 1,300 | Complements the existing PCP post; completes the set |
| How does car finance work? / How to finance a car | 1,300 + 1,000 | Top-of-funnel explainer, links to the calculator |
| Can you get car finance with bad credit? | ~2,000 combined | High-intent; rank with a clear eligibility guide |
| Can you pay off car finance early? | 590 | Low competition; quick win |
| Can you get car finance on Universal Credit? | 590 | Underserved query, strong fit |

**Cluster 3 — Part exchange** (supports /part-exchange and /value-car):

| Topic | UK searches/mo | Notes |
|-------|---------------|-------|
| What is part exchange and how does it work? | 880 + 390 | Explainer to anchor the part-exchange tool |
| Can you part exchange a car on finance? | 1,000 + 480 | Common blocker question; high conversion intent |
| Is part exchange worth it? / Should I part exchange? | 110 + 140 | Decision-stage, easy to rank for |

**Recommended first three:** "How much does it cost to charge an electric car?" (biggest volume, easiest), "Can you sell a car on finance?" (commercial intent + Sell Car synergy), and "What is HP car finance?" (completes the finance cluster around the existing PCP post).

---

*Will*
