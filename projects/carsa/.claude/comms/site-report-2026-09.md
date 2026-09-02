**Month:** September 2026 | **Site:** www.carsa.co.uk | **Pages crawled:** 5,618

---

## Summary

The vehicle page titles and descriptions that went live on 10 August are now in the crawl, and they did what they were meant to. Duplicate titles fell from 2,151 to 6, duplicate content from 1,286 to 4, and over-length titles from 430 to 2. The six duplicate titles left are two cars that are published twice under two web addresses and one blog post that exists at two addresses, so that is a ten-minute tidy rather than a template problem. Site health moved from 75% to 77%. The WhatsApp link that inflated the broken-link count every month did not trip the crawler this time, so that figure has gone from 5,489 to 3, and the three left are real dead links I can fix.

Two counts went the other way, and both have a plain explanation. The crawl found 112 vehicle pages returning "not found" and 120 wrong entries in the sitemap. They are the same cars: sold, removed from the site, but still listed in the sitemap when SEMRush ran. I requested every one of the 5,462 sitemap addresses on 2 September and none of them is missing now, so the sitemap catches up on its own. The fix is to make sure the site publishes after the stock sync removes cars, which is a question for Grant. Slow-loading pages rose from 1,090 to 1,471, all vehicle pages, and the cause is the inline script weight on that template that the code migration is already addressing.

Rankings were mixed. Big model searches moved up ("nissan qashqai" 17th to 11th at 110,000 searches a month, "volkswagen golf" 18th to 8th), "car sales" went from 14th to 10th, and the warranty page started ranking with no work done on it. Two generic local searches dropped out, and the store pages and the city pages are now swapping places on the same town searches, Bradford and Southampton in particular. That is the first thing to fix this month. Three of August's five fixes were not actioned, so dates, the "Learn more" links and the blog author carry over. One correction to August's report while I am here: the stores page does have a meta description. I said it had none.

---

## Key metrics

**SEO health** (SEMRush, 10 August → 31 August)

| Metric | August | September | Change |
|--------|--------|-----------|--------|
| Pages crawled | 5,536 | 5,618 | +82 (stock) |
| Site health score | 75% | 77% | +2% |
| SEMRush AI Search score | 78 | 78 | — |
| Duplicate title tags | 2,151 | 6 | −2,145 (fixed) |
| Duplicate content pages | 1,286 | 4 | −1,282 (fixed) |
| Over-length page titles | 430 | 2 | −428 (fixed) |
| Duplicate meta descriptions | 28 | 22 | −6 |
| Broken external links | 5,489 | 3 | −5,486 (WhatsApp artefact gone; 3 real) |
| Pages not crawled | 40 | 4 | −36 |
| Structured-data errors | 460 | 444 | −16 (sold cars, see note) |
| 4xx errors | 1 | 112 | +111 (sold cars in sitemap at crawl time) |
| Incorrect pages in sitemap | 10 | 120 | +110 (same cars) |
| Slow page load | 1,090 | 1,471 | +381 (vehicle pages) |
| Non-descriptive link text | 125 | 125 | — (not actioned) |
| Links with no anchor text | 11 | 12 | +1 |
| Broken internal links | 0 | 0 | — (holding) |
| 5xx server errors | 0 | 0 | — (holding) |
| Multiple H1 tags | 0 | 0 | — (holding) |

**AI search readiness (AEO)**

No movement this month. The three open items (dates, author, sold-car listing data) are the same three that would move the score.

| Category | August | September | Change | To improve |
|----------|--------|-----------|--------|------------|
| Structured data | 3/4 | 3/4 | — | Clear the 444 sold-car listing errors → 4/4 |
| Answer structure | 4/6 | 4/6 | — | Lead key pages with a factual sentence a machine can quote |
| Freshness | 2/3 | 2/3 | — | Add visible "last updated" dates to /car-finance, /faq and service pages |
| Authority | 3/4 | 3/4 | — | Add a named blog author with a real bio |
| Technical | 3/3 | 3/3 | — | — |
| **Overall** | **15/20** | **15/20** | — | |

---

## What changed and why

### Fixed {toggle="true"}

	- Duplicate titles: 2,151 → 6. The new vehicle title format, one title per registration. The six left are three pairs: two cars published under two addresses each, and one blog post at two addresses. Covered in issue #5.
	- Duplicate content: 1,286 → 4. I did not predict this one. Giving each car a unique title and description was enough for SEMRush to stop matching same-spec cars against each other. The body copy on identical-spec cars has not changed, so this is the crawler's view rather than a rewrite, but the count is gone and I will not raise it again on crawl evidence. The four left are the two double-published cars.
	- Over-length titles: 430 → 2. The two are the carsaCover page and one blog post, both a few characters over.
	- Broken external links: 5,489 → 3. The WhatsApp link in the header did not rate-limit the crawler this time. It may again, and it can be ignored when it does. The three real ones are a dead leasing.carsa.co.uk link on two blog posts and a dead Microsoft support link on the cookie policy. Issue #5.
	- Pages not crawled: 40 → 4. New stock arriving mid-crawl, same as June and August.
	- Duplicate descriptions: 28 → 22. What is left is eight identical 2025 silver Qashqais and a handful of identical-spec pairs. Same car, same words. That is the floor.
	- Structured-data errors: 460 → 444. Still all sold cars in their retention window, as established in August.

### Regressed {toggle="true"}

	- "Not found" pages: 1 → 112, and wrong sitemap entries 10 → 120. All sold vehicles. They were removed from the site but still listed in the sitemap when the crawl started, so SEMRush requested them and got "not found". None was linked from any page, which is why broken internal links stayed at zero. I checked all 5,462 sitemap addresses on 2 September and every one returns a page, so the sitemap had caught up within two days. Issue #2 covers the small change that stops it recurring.
	- Slow page load: 1,090 → 1,471. Every flagged page is a vehicle page, measured at 3 to 5 seconds by the crawler. I timed the same template myself and got anywhere from a quarter of a second to nearly six for the same kind of page, with the HTML at around 650 KB against 380 KB for the homepage. That is the inline script weight the code migration is designed to remove, so there is no separate action here. In a browser the page still scores 100 for accessibility and 92 for SEO on mobile.

### Added {toggle="true"}

	- The extended warranty page (/car-care/extended-mechanical-warranty) started ranking on its own: 17th for "extended warranty car" and 24th for "extended car warranty uk". Nothing was done to it. See strategic #4.
	- Blog posts now ranking that were not in August's data: what is hire purchase (6th for "what is hire purchase car"), can I sell a financed car (15th), joint car finance (4th for "car finance joint application"), best used hatchbacks, best used plug-in hybrids, best used convertibles. Two of August's three recommended topics are therefore covered.
	- /stores/shrewsbury now redirects to /stores. Good. It is still in the sitemap and llms.txt still names Shrewsbury, so issue #5 finishes the job.

### Dropped from the list {toggle="true"}

	- August's issue #2, vehicle pages reading identically. The crawl no longer flags it, for the reason given under Fixed.
	- August's issue #1, store pages too alike, in its old form. Duplicate content is at 4, so the crawl evidence for it is gone. What the ranking data now shows is more specific and more useful, and it is this month's #1.

---

## Top issues to fix

### 1. Store pages and city pages are competing for the same town searches — 1 hour {toggle="true"}

*Issue:* For towns with a branch, the store page (/stores/bradford) and the city page (/used-cars/near/bradford) both target "used cars in [town]", and Google is alternating between them.
*Explanation:* When two of your own pages fight over one search, neither settles, and the one that wins is often the one you would not choose.
*Fix:* Decide which page owns the town search for each of the eleven branch towns and point the other at it.
*Benefit:* One stable page per branch town, and the store page gets the local signal it has been missing.

	---

	**Detail**

	**What the data shows:** "bradford second hand cars" flipped this month: /stores/bradford went from 32nd to 9th while /used-cars/near/bradford went from 13th to 31st. "used cars in southampton" dropped from 8th to 32nd on the city page with nothing taking its place. "used car dealers birmingham" jumped from 57th to 22nd on the Halesowen store page while the Birmingham city page holds 8th for "cars for sale birmingham". Same pattern, three towns.

	**Root cause:** Both templates say the same thing to Google. Store page: "Used car dealer in Bradford | Carsa", heading "Carsa Store Bradford". City page: "Used cars for sale or on finance in Bradford | Carsa", heading "Used cars for sale in Bradford". Two pages, one intent.

	**What to change:** For the eleven branch towns (Bolton, Bradford, Cannock, Durham, Gloucester, Halesowen, Mountsorrel, Portsmouth, Southampton, Towcester, Wolverhampton) the store page should own "[town] used cars" and "[town] car dealer", because it has the address, hours and map that local searchers want. The city page for those eleven towns should either link prominently to the store page as the primary result, or be retitled around the stock-and-finance intent ("Used cars on finance near Bradford") so the two stop overlapping. The other 28 city pages have no branch and no conflict; leave them alone.

	**Sequencing:** This replaces August's "make the store pages more local" as the first step. The local content is still worth adding, but the overlap has to be resolved first or the extra content lands on whichever page Google happens to prefer that week.

	**How to verify:** Track "bradford second hand cars", "used cars in southampton", "used cars wolverhampton" and "cars for sale birmingham" monthly. Success is one URL per query holding steady for two crawls.

### 2. Publish the site after the stock sync removes sold cars — 0.5 hours, needs Grant {toggle="true"}

*Issue:* 112 sold cars were still listed in the sitemap after they had been removed from the site.
*Explanation:* Google and SEMRush read the sitemap first, so a stale sitemap sends them to pages that no longer exist.
*Fix:* Trigger a site publish after each sync that removes vehicles, so Webflow regenerates the sitemap.
*Benefit:* The "not found" and sitemap counts stop tracking how many cars happened to sell since the last publish.

	---

	**Detail**

	**Root cause:** Webflow generates the sitemap itself and only rebuilds it when the site is published. The stock sync removes sold cars from the CMS. If nothing publishes between the removal and the crawl, the sitemap still lists the cars. By 2 September every one of the 5,462 sitemap addresses returned a page, so a publish had happened in the meantime.

	**What we need from you:** Confirm with Grant whether the sync already triggers a publish, and if not, whether one can be added after removals (or on a schedule, once or twice a day). I do not know how their sync is set up, so I am asking rather than asserting.

	**Worth knowing:** Sold-car 404s themselves are correct behaviour, as agreed in June. This is only about not advertising them in the sitemap.

	**How to verify:** Next crawl, the 4xx count should sit in single or low double figures rather than three.

### 3. Replace the "Learn more" links with real text — 0.5 hours (was #4) {toggle="true"}

*Issue:* 125 internal links still read "Learn more". The count has not moved since July.
*Explanation:* Link text is how Google works out what is on the other end. "Learn more" says nothing.
*Fix:* Change the wording in the shared block so each link names its destination.
*Benefit:* 125 links start describing where they go, from two edits.

	---

	**Detail**

	**Where they are:** Three on every /used-cars/near/ city page and three on every /stores/ branch page (the same shared block), plus one each on the homepage and /car-finance. Confirmed on Wolverhampton, Bradford and Southampton this month.

	**What to change:** "Learn more" → "See our finance options", "Value your part exchange", and whatever the third link's destination is. Edit the component once.

	**Worth doing at the same time:** the 12 links with no text at all (up one from 11), which sit on the two legal pages.

	**Flagged since:** July 2026.

	**How to verify:** Re-crawl. Non-descriptive anchor text should fall from 125.

### 4. Add "last updated" dates to service pages — 0.5 hours (was #3) {toggle="true"}

*Issue:* /car-finance, /value-car, /stores and the car-care pages still show no date anywhere.
*Explanation:* A finance page with no date gives a reader no way to tell whether the rates are current.
*Fix:* Add a visible "last updated" line to the main service pages.
*Benefit:* Moves the freshness score from 2/3 to 3/3.

	---

	**Detail**

	**Pages affected:** /car-finance and /car-finance-calculator first, then /faq, /car-care and its sub-pages, then /sell-car, /part-exchange, /value-car and /reserve.

	**What to change:** Blog posts already carry an updated date in their page data (the EV post shows 7 August). Static service pages need a visible date changed by hand when the content changes. Do not auto-stamp today's date.

	**Flagged since:** July 2026. Not actioned in July or August.

	**How to verify:** Open any updated page and look for a clear "Last updated" line.

### 5. Five small tidy-ups in one pass — 0.5 hours {toggle="true"}

*Issue:* Two cars published twice, one blog post at two addresses, three dead outbound links, Shrewsbury still in the sitemap and llms.txt.
*Explanation:* None of these matters on its own. Together they are the whole of the duplicate-title, duplicate-content and broken-link counts.
*Fix:* Remove or redirect the duplicates, fix the three links, unpublish the Shrewsbury page, update llms.txt.
*Benefit:* Three metrics go to zero and the AI-facing facts file stops naming a closed branch.

	---

	**Detail**

	**The duplicates:** /vehicles/used/j16bnt and j16bnt-fa27e are the same 2019 Mercedes A Class; /vehicles/used/f14yeg and f14yeg-03cc0 are the same 2018 Mini. The suffixed versions are probably re-imports; whichever is not the live listing should go. /blog/what-is-adaptive-cruise-control and /blog/what-is-adaptive-cruise-control-guide are the same article; redirect one to the other.

	**The links:** leasing.carsa.co.uk no longer answers. It is linked from "Does car leasing include insurance?" and "5 reasons car leasing is beneficial". Either point those at a live page or remove the links. The cookie policy links to a Microsoft support article that has gone; swap for the current one or drop it.

	**Shrewsbury:** The branch page now redirects to /stores, which is right. It is still in the sitemap because the page is still published; unpublish it and the sitemap drops it on the next publish. llms.txt still lists Shrewsbury and omits Portsmouth and Wolverhampton. /stores lists eleven branches; llms.txt should match.

	**How to verify:** Re-crawl. Duplicate titles 6 → 0, duplicate content 4 → 0, broken external links 3 → 0 (WhatsApp aside).

### 6. Give blog posts a named author — 1 hour, needs your input (was #5) {toggle="true"}

*Issue:* Blog posts have no author, in the page data or on the page.
*Explanation:* Advice about finance and car buying reads as more trustworthy with a real person's name behind it.
*Fix:* Add a byline and short bio to the blog template and connect it to the post data.
*Benefit:* Takes the authority score from 3/4 to 4/4.

	---

	**Detail**

	**Current state:** The byline area on a post shows "7/8/26 • 5 min read" and no name. The page data has no author field at all now (in August it was present but empty).

	**What we need from you:** A name, job title and two or three sentences of bio for whoever should be credited. Ideally a photo.

	**How to verify:** Open any post; a byline should be visible and the author name should appear in the page data.

**Total estimated time: ~4 hours**

---

## 5 strategic opportunities

### 1. Repoint /stores at generic "cars for sale" and "dealership" searches — 1.5 hours {toggle="true"}

Still the biggest gap on the site, and this month's data makes the case more clearly than August's did.

	---

	**Detail**

	Google currently answers Carsa's generic searches with whichever child page it likes. "cars for sale" (135,000 searches a month) ranks 19th with the Sunderland city page. Carsa has no Sunderland branch. "used cars near me for sale" is 4th, "cheap cars for sale near me" 9th, "car sale near me" 10th, all Sunderland. "used car dealerships" is 6th with Gloucester. Meanwhile /stores ranks for branded searches only, at the same positions as August.

	Two generic local searches dropped out this month: "used car dealerships near me" (6,600, was 9th) and "car showroom near me" (2,900, 5th to 17th). The page-one results for the first are AutoTrader's dealer directory, national groups and the map pack, so a hub page alone will not win it, and I would not promise that it will. What a repositioned /stores can do is give Google a deliberate answer for "used car dealerships", "car showroom" and "cars for sale" style searches instead of an arbitrary one.

	**The plan from August stands,** with one correction: the page does have a meta description (168 characters, brand-led). Move the brand out of the title and heading, add an answer-first paragraph naming the eleven towns and the stock count, add coordinates to each branch's listing data (the individual store pages have them; the hub does not), swap the FAQ for location questions, and link to the hub from the footer and from each store page.

	**Do it after issue #1,** not before, for the reason given there.

### 2. Build "[make] in [town]" pages — 3 hours {toggle="true"}

The cars2.co.uk pattern from August. Unchanged: Carsa has make pages and store pages and nothing that crosses them.

	---

	**Detail**

	Where "[make] [town]" searches surface a Carsa page it is still a store page far down ("porsche wolverhampton", "kia wolverhampton", "bolton kia dealership" 55th). Start with the highest-stock make at each of the eleven branches, ten to fifteen pages, each listing that make's stock at that branch with the branch's address and hours.

	**Status:** Not started. Depends on issue #1 being settled so the new pages have a clear parent.

### 3. Reclaim "value my car" for the commercial page — 1 hour {toggle="true"}

The gap between the blog post and the tool widened this month.

	---

	**Detail**

	/value-car holds 17th for "value my car" (60,500). The blog post at /blog/how-much-is-my-car-worth-uk-2026 added "car value" (14,800) at 9th and "used car value" at 6th this month, on top of its existing rankings. Google keeps choosing the article over the tool.

	**What to change:** Link prominently from the article to /value-car, and give /value-car the explanatory content that is making the article rank: how valuations are calculated, what moves them, how long a quote holds.

	**Honest note:** difficulty 49 with Auto Trader and We Buy Any Car above it. Expect movement into the low teens, not the top three.

### 4. Build out the warranty cluster — 1.5 hours {toggle="true"}

New this month. The extended warranty page started ranking on its own, which is a signal worth following.

	---

	**Detail**

	/car-care/extended-mechanical-warranty entered at 17th for "extended warranty car" and 24th for "extended car warranty uk" with no work done on it. carsaCover is 16th for "cars warranty". The heading on the warranty page is just "Extended Warranty" and it carries no product data for search engines.

	The question searches around it are small individually but cheap: "what does car warranty cover" (590 + 390), "are extended car warranties worth it" (260, difficulty 14, plus about 400 across close variants), "how does car warranty work" (320), "how much warranty on used cars" (170, difficulty 22). Carsa sells the product, so a straight answer to each with a link to the page is a natural fit.

	**What to change:** Retitle the page heading to say what it is ("Extended car warranty from £699, 12 to 48 months"), add product data, and publish two or three of the question articles from the blog list below with links to it.

### 5. Open key pages with a factual sentence — 0.5 hours {toggle="true"}

Carried from August. The homepage still opens with "A better rate. On every Carsa car."

	---

	**Detail**

	Good line for a person, nothing an AI assistant can quote. One factual sentence near the top ("Carsa is a UK used-car retailer with 11 stores, over 2,000 checked cars and finance from 8.9% APR") gives it something to cite. Same on /car-finance and /sell-car. Pairs with the llms.txt update in issue #5, since both are about giving AI tools the right facts.

**Total estimated time: ~7.5 hours**

---

## Unbranded rankings: what moved

August promised these would be tracked monthly. Positions are 10 August → 31 August.

**"[model] for sale"**

| Search | Monthly | Difficulty | August | September |
|--------|---------|-----------|--------|-----------|
| bmw x3 for sale | 8,100 | 20 | 18 | 15 |
| jaguar f pace for sale | 6,600 | 22 | 26 | out of top 100 |
| seat leon for sale | 5,400 | 19 | 22 | out of top 100 |
| mercedes glc for sale | 4,400 | 22 | 29 | 26 |
| mercedes gla for sale | 4,400 | 20 | 27 | 27 |
| mazda cx-5 for sale | 3,600 | 19 | 24 | 26 |
| mercedes gle for sale | 3,600 | 18 | 29 | out of top 100 |
| mazda 6 for sale | 3,600 | 24 | 30 | 33 |
| kia niro for sale | 2,900 | 29 | 29 | 22 |

Three up, three out, three flat. The drop-outs line up with thin stock: the BMW X3 page has three cars on it today, and the F-PACE, Leon and GLE pages will be similar. The model page titles already say "for sale" ("Used BMW X3 for sale or on finance | Carsa"), so August's suggestion to add the phrase was either already done or was not the constraint. What moves these pages now is stock depth and links into them, which is why the blog links in the topic list below point at model pages.

New arrivals worth knowing about: "nissan juke for sale" (12,100, difficulty 24) entered at 18th, "cupra leon for sale" at 11th. Still inside the top 10: Qashqai 9th, Golf 10th, XC40 9th, A Class 9th, CR-V 6th, Corolla 7th, Superb 8th, Rio 8th, I-PACE 8th, T-Roc 5th, Micra 7th, RAV4 8th, Santa Fe 8th. "seat arona for sale" fell from 5th to 15th.

**Bare model names.** "nissan qashqai" 17th → 11th (110,000), "volkswagen golf" 18th → 8th (33,100), "mercedes glc" 37th → 28th (33,100), "seat ateca" 32nd → 28th (22,200). Long game, moving the right way.

**Local.** "car sales" 14th → 10th (Portsmouth). "used car dealerships" 6th, unchanged. "used car dealerships near me" out of the top 100 from 9th. "car showroom near me" 5th → 17th. See strategic #1.

**Valuation.** "value my car" 17th, unchanged. Article gained "car value" 9th (14,800). See strategic #3.

**Blog.** "cheapest cars to insure for new drivers" 2nd → 3rd. "best used suv uk" 2nd. "pcp" 4th (27,100). "self employed car finance" 2nd. Holding.

**Google context.** No core update in August. Google ran a spam update from 18 to 21 August, and several SEO publications reported general volatility in early August without a confirmed cause. Carsa's gains and losses are spread across page types in a way that does not look like a targeted hit, so I would not read anything into it beyond normal movement.

---

## Blog topic suggestions

Fresh SEMRush keyword data, UK. Excludes anything already published or ranking. Two of August's three recommendations are live now (selling a car on finance, what is HP finance), so they are off the list.

**Used-car buying questions.** Carsa's first-time buyer checklist ranks 20th for "car buying checklist" (140 searches) and nothing else. The bigger phrasings are open.

| Topic | UK searches/mo | Difficulty |
|-------|---------------|-----------|
| What to look for when buying a used car | 1,300 | 33 |
| What to check when buying a used car | 1,300 | 43 |
| What mileage is good for a used car | 1,000 + 480 + 480 | 11–16 |
| Can you lease a used car | 1,000 | 22 |
| What documents should I get when buying a used car | 590 | 18 |
| How to haggle for a used car | 480 | 25 |
| Is gap insurance worth it on a used car | 390 | 26 |

**Part exchange.** /part-exchange sits 17th to 23rd for its main terms ("part exchange car" 4,400, "part exchange" 2,400). Explainer content pointing at it would help.

| Topic | UK searches/mo | Difficulty |
|-------|---------------|-----------|
| How does part exchange work | 1,300 + 390 | 14–16 |
| What is part exchange (car) | 880 | 16 |
| How much is my car worth in part exchange | 260 | 26 |
| Should I part exchange my car | 140 | 16 |

**Warranty.** Pairs with strategic #4.

| Topic | UK searches/mo | Difficulty |
|-------|---------------|-----------|
| What does a car warranty cover | 590 + 390 | 30 |
| Are extended car warranties worth it | 260 + ~400 variants | 14–21 |
| How does car warranty work | 320 | 28 |
| Is my car still under warranty | 210 + 140 | 28 |
| How much warranty do used cars come with | 170 | 22 |

**Electric cars.** August's list stands; none of it has been covered. "How much does it cost to charge an electric car" (8,100, difficulty 38) is still the biggest single gap on the site, and "Are all electric cars automatic" (2,400, difficulty 19), "Do electric cars pay road tax" (1,900, 25) and "Should I buy an electric car" (1,300, 17) are the easy ones.

**Recommended first three:**

1. **What mileage is good for a used car?** About 2,000 searches a month across three phrasings at difficulty 11 to 16, so about as easy as it gets. Links naturally to the high-mileage listicle that already ranks 2nd and to the used-car stock.
2. **How much does it cost to charge an electric car?** Carried from August. Biggest volume on the list, opens the EV cluster, and the used-EV guide gives it somewhere to link.
3. **How does part exchange work?** 1,700 searches across two phrasings at difficulty 14 to 16, feeds /part-exchange directly, and complements the two part-exchange-on-finance posts that already rank 4th and 9th.

---

*Will*
