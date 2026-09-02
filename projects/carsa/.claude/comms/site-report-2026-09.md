**Month:** September 2026 | **Site:** www.carsa.co.uk | **Pages crawled:** 5,618

---

## Summary

The vehicle page titles and descriptions that went live on 10 August are now in the crawl, and they did what they were meant to. Duplicate titles fell from 2,151 to 6, duplicate content from 1,286 to 4, and over-length titles from 430 to 2. The six duplicate titles left are two cars that are published twice under two web addresses and one blog post that exists at two addresses, so that is a ten-minute tidy rather than a template problem. Site health moved from 75% to 77%. The WhatsApp link that inflated the broken-link count every month did not trip the crawler this time, so that figure has gone from 5,489 to 3, and the three left are real dead links I can fix.

Two things turned up this month that the crawl does not report and that matter more than anything in the table. First, the two sell pages that moved under /sell-car/ in May still tell Google their old addresses are the real ones, and the old addresses redirect straight back. Google has kept ranking the old URLs and has never picked up the new ones. That is a fifteen-minute fix on the page behind "value my car", 60,500 searches a month, and it is this month's number one. Second, Webflow now stamps a "last changed" date on every page in the sitemap. Vehicle pages update daily and the service pages are current, but 273 of the 456 model pages have not changed since 2025, including several that rank in the top ten. The model pages that were edited on 24 August are also the ones that moved up this month. I would not call that proof, but it points the same way.

Two crawl counts went the other way, and both have a plain explanation. The crawl found 112 vehicle pages returning "not found" and 120 wrong entries in the sitemap. They are the same cars: sold, removed from the site, but still listed in the sitemap when SEMRush ran. I requested every one of the 5,462 sitemap addresses on 2 September and found three missing, all cars that sold while the check was running, so the sitemap catches up on its own. The fix is to make sure the site publishes after the stock sync removes cars, which is a question for Grant. Slow-loading pages rose from 1,090 to 1,471, all vehicle pages, and the cause is the inline script weight on that template that the code migration is already addressing. Rankings were mixed: "nissan qashqai" 17th to 11th, "volkswagen golf" 18th to 8th, "car sales" 14th to 10th, but two generic local searches dropped out and the store pages and city pages are now swapping places on the same town searches. One correction to August's report: the stores page does have a meta description. I said it had none.

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

No movement this month. Each row has a matching recommendation in the AI search section further down.

| Category | August | September | Change | To improve |
|----------|--------|-----------|--------|------------|
| Structured data | 3/4 | 3/4 | — | Clear the 444 sold-car listing errors → 4/4 |
| Answer structure | 4/6 | 4/6 | — | Lead key pages with a factual sentence a machine can quote |
| Freshness | 2/3 | 2/3 | — | Visible "last updated" dates on service pages, and real updates to the stale model pages |
| Authority | 3/4 | 3/4 | — | Add a named blog author with a real bio |
| Technical | 3/3 | 3/3 | — | — |
| **Overall** | **15/20** | **15/20** | — | |

---

## What changed and why

### Fixed {toggle="true"}

	- Duplicate titles: 2,151 → 6. The new vehicle title format, one title per registration. The six left are three pairs: two cars published under two addresses each, and one blog post at two addresses. Covered in issue #6.
	- Duplicate content: 1,286 → 4. I did not predict this one. Giving each car a unique title and description was enough for SEMRush to stop matching same-spec cars against each other. The body copy on identical-spec cars has not changed, so this is the crawler's view rather than a rewrite, but the count is gone and I will not raise it again on crawl evidence. The four left are the two double-published cars.
	- Over-length titles: 430 → 2. The two are the carsaCover page and one blog post, both a few characters over.
	- Broken external links: 5,489 → 3. The WhatsApp link in the header did not rate-limit the crawler this time. It may again, and it can be ignored when it does. The three real ones are a dead leasing.carsa.co.uk link on two blog posts and a dead Microsoft support link on the cookie policy. Issue #6.
	- Pages not crawled: 40 → 4. New stock arriving mid-crawl, same as June and August.
	- Duplicate descriptions: 28 → 22. What is left is eight identical 2025 silver Qashqais and a handful of identical-spec pairs. Same car, same words. That is the floor.
	- Structured-data errors: 460 → 444. Still all sold cars in their retention window, as established in August.

### Regressed {toggle="true"}

	- "Not found" pages: 1 → 112, and wrong sitemap entries 10 → 120. All sold vehicles. They were removed from the site but still listed in the sitemap when the crawl started, so SEMRush requested them and got "not found". None was linked from any page, which is why broken internal links stayed at zero. I checked all 5,462 sitemap addresses on 2 September and all but three return a page, and those three sold while the check was running. So the sitemap had caught up within two days. Issue #3 covers the small change that stops it recurring.
	- Slow page load: 1,090 → 1,471. Every flagged page is a vehicle page, measured at 3 to 5 seconds by the crawler. I timed the same template myself and got anywhere from a quarter of a second to nearly six for the same kind of page, with the HTML at around 650 KB against 380 KB for the homepage. That is the inline script weight the code migration is designed to remove, so there is no separate action here. In a browser the page still scores 100 for accessibility and 92 for SEO on mobile.

### Found outside the crawl {toggle="true"}

	- The moved sell pages point Google back at their old addresses. /value-car redirects to /sell-car/value-car, and /sell-car/value-car says its official address is /value-car. Same for part exchange. Live since the May restructure. Issue #1.
	- Webflow now writes a "last changed" date for every page into the sitemap. For vehicle and blog pages it comes from the CMS item's last edit; for static pages it changes when the page itself is edited in the Designer. Google uses this date to decide what to re-crawl, provided it stays accurate. What it shows for Carsa: vehicle pages are current (4,700 changed in the last five weeks), the homepage changed on 1 September, /car-finance on 10 August, the store and city pages in July. Blog posts almost all read 30 June, which looks like a bulk edit rather than 71 real updates, and 34 read 7 August. The oldest blog post is the best used SUVs guide (24 March), which ranks 2nd nationally. Model pages are the outlier: 273 of 456 have not changed since 2025. Issue #4 and the AI search section pick this up.

### Added {toggle="true"}

	- The extended warranty page (/car-care/extended-mechanical-warranty) started ranking on its own: 17th for "extended warranty car" and 24th for "extended car warranty uk". Nothing was done to it. See strategic #4.
	- Blog posts now ranking that were not in August's data: what is hire purchase (6th for "what is hire purchase car"), can I sell a financed car (15th), joint car finance (4th for "car finance joint application"), best used hatchbacks, best used plug-in hybrids, best used convertibles. Two of August's three recommended topics are therefore covered.
	- /stores/shrewsbury now redirects to /stores. Good. It is still in the sitemap and llms.txt still names Shrewsbury, so issue #6 finishes the job.

### Dropped or moved {toggle="true"}

	- August's issue #2, vehicle pages reading identically. The crawl no longer flags it, for the reason given under Fixed.
	- August's issue #1, store pages too alike, in its old form. Duplicate content is at 4, so the crawl evidence for it is gone. What the ranking data now shows is more specific and more useful, and it is this month's #2.
	- "Last updated" dates and the blog author have moved from the fix list to the AI search section, where they belong. Neither has been actioned since July.

---

## Top issues to fix

### 1. Fix the canonical address on the two moved sell pages — 15 minutes {toggle="true"}

*Issue:* /sell-car/value-car and /sell-car/part-exchange each tell Google their real address is the old URL, and the old URL redirects straight back to them.
*Explanation:* Google gets two contradictory instructions for the page behind "value my car" (60,500 searches a month), so it has stuck with the old address and never moved.
*Fix:* Set each page's canonical to its own address in Webflow page settings.
*Benefit:* One clear address per page, and the valuation and part exchange pages can start earning credit at the URLs that are in the sitemap.

	---

	**Detail**

	**What is happening:** In May the sell pages moved under /sell-car/ with redirects from the old addresses. The redirects work. But the canonical tag on /sell-car/value-car still reads https://www.carsa.co.uk/value-car, and on /sell-car/part-exchange it reads https://www.carsa.co.uk/part-exchange. Google follows the redirect to the new page, reads "the real page is the old address", follows that, and lands back where it started.

	**Evidence it matters:** Every ranking SEMRush reports for these pages is still at the old URL: /value-car 17th for "value my car", 14th for "car value of my car"; /part-exchange 19th for "part exchange car", 23rd for "part exchange". The new URLs do not appear in the ranking data at all after three and a half months, which is not what a clean move looks like. "trade in value of my car" slipped from 22nd to 25th this month and "value my vehicle" from 19th to 20th. I cannot say the canonical is the cause, but it is the first thing to rule out. These two pages are also the likeliest reason the sitemap check flags a handful of non-vehicle entries every month.

	**What to change:** Open each page in Webflow, page settings, and set the canonical to the page's own URL (or clear the override so the site default applies). Republish. Then check /sell-car/value-car in a browser: the canonical in the page source should match the address bar.

	**How to verify:** Within a crawl or two, SEMRush should start reporting /sell-car/value-car and /sell-car/part-exchange instead of the old URLs. Strategic #3 depends on this being done first.

### 2. Store pages and city pages are competing for the same town searches — 1 hour {toggle="true"}

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

### 3. Publish the site after the stock sync removes sold cars — 0.5 hours, needs Grant {toggle="true"}

*Issue:* 112 sold cars were still listed in the sitemap after they had been removed from the site.
*Explanation:* Google and SEMRush read the sitemap first, so a stale sitemap sends them to pages that no longer exist, and now that the sitemap carries a "last changed" date for every page, its accuracy matters more than it did.
*Fix:* Trigger a site publish after each sync that removes vehicles, so Webflow regenerates the sitemap.
*Benefit:* The "not found" and sitemap counts stop tracking how many cars happened to sell since the last publish, and the dates Google reads stay trustworthy.

	---

	**Detail**

	**Root cause:** Webflow generates the sitemap itself and only rebuilds it when the site is published. The stock sync removes sold cars from the CMS. If nothing publishes between the removal and the crawl, the sitemap still lists the cars. By 2 September all but three of the 5,462 sitemap addresses returned a page, so a publish had happened in the meantime, and the three that did not had sold in the 45 minutes my check took to run.

	**What we need from you:** Confirm with Grant whether the sync already triggers a publish, and if not, whether one can be added after removals (or on a schedule, once or twice a day). I do not know how their sync is set up, so I am asking rather than asserting.

	**Worth knowing:** Sold-car 404s themselves are correct behaviour, as agreed in June. This is only about not advertising them in the sitemap. Google has said it uses the sitemap's "last changed" dates when they prove accurate and ignores them when they do not, so keeping the file current protects a signal that is now working in Carsa's favour on the vehicle pages.

	**How to verify:** Next crawl, the 4xx count should sit in single or low double figures rather than three.

### 4. Refresh the model pages that rank but have not changed since 2025 — 1.5 hours {toggle="true"}

*Issue:* 273 of the 456 model pages have not been edited since 2025 according to the sitemap, and several of them are in the top ten for "[model] for sale".
*Explanation:* The sitemap now tells Google when each page last changed. A page that ranks 7th for "nissan micra for sale" and has said "unchanged since June 2025" for fourteen months is giving Google a reason to visit less often, while the stock on it changes daily.
*Fix:* Make a real, visible update to the model pages that rank or nearly rank, starting with the twenty below, and repeat quarterly.
*Benefit:* The strongest pages on the site stop reading as abandoned, and the crawl date on each moves for a genuine reason.

	---

	**Detail**

	**What the data shows:** The model page dates split into two groups. One batch was edited on 24 August: Qashqai, Golf, Corsa, XC40, A Class, Corolla, I-PACE, T-Roc, Juke, X3, Niro, Leon, Ibiza, EQC and Discovery Sport. Another batch on 8 May: GLC, GLA, F-PACE, RAV4, Ateca, Kodiaq, C-HR, XC60 and others. The rest, 273 pages, carry dates from June to December 2025.

	The pages edited on 24 August are mostly the ones that moved up this month: "nissan qashqai" 17th to 11th, "volkswagen golf" 18th to 8th, "bmw x3 for sale" 18th to 15th, "kia niro for sale" 29th to 22nd. The pages untouched since 2025 mostly held or slipped: "seat arona for sale" 5th to 15th (page dated July 2025), "mercedes gle for sale" 29th to out of the top 100 (July 2025), "mazda 6 for sale" 30th to 33rd (September 2025), "mazda cx-5 for sale" 24th to 26th (August 2025), "hyundai santa fe for sale" 6th to 8th (June 2025). Not a clean split: the Leon page was edited on 24 August and still dropped out for "seat leon for sale", and the F-PACE page was edited in May and dropped out too. So this is a pattern worth acting on, not a proven cause. It would help to know what the 24 August edit was.

	**Start with these twenty.** They rank in the top 30 for a "for sale" or bare-model search and have not changed since 2025: Nissan Micra (7th, June 2025), Skoda Superb (8th, June 2025), Seat Tarraco (9th, June 2025), Hyundai Santa Fe (8th, June 2025), Kia Rio (8th, August 2025), Kia ProCeed (6th, August 2025), Fiat 500C (6th, September 2025), Tiguan Allspace (6th, July 2025), Cupra Leon (11th, August 2025), Seat Arona (15th, July 2025), Mazda CX-5 (26th, August 2025), Mazda 6 (33rd, September 2025), Mercedes GLE (July 2025), Defender 110 (32nd, September 2025), Kia Stonic (15th, June 2025), Skoda Kamiq (18th, January 2026), Honda CR-V (6th, January 2026), Renault Clio (17th, July 2025), Audi Q2 (38th, July 2025), Honda HR-V (15th, June 2025).

	**What counts as a refresh:** A real change a reader would notice. Update the opening paragraph with the current stock count and price range, add or replace one FAQ with a question people ask this year, and check the model facts (a facelift, a new trim, a discontinued engine) are current. Ten minutes a page. Do not change the date without changing the page; Google compares the two and stops trusting the file when they disagree.

	**How to verify:** The sitemap date on each page moves to the edit date. Track the "[model] for sale" positions in the table further down over two crawls.

### 5. Replace the "Learn more" links with real text — 0.5 hours {toggle="true"}

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

### 6. Five small tidy-ups in one pass — 0.5 hours {toggle="true"}

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

**Total estimated time: ~4 hours**

---

## 5 strategic opportunities

### 1. Repoint /stores at generic "cars for sale" and "dealership" searches — 1.5 hours {toggle="true"}

Still the biggest gap on the site, and this month's data makes the case more clearly than August's did.

	---

	**Detail**

	Google currently answers Carsa's generic searches with whichever child page it likes. "cars for sale" (135,000 searches a month) ranks 19th with the Sunderland city page. Carsa has no Sunderland branch. "used cars near me for sale" is 4th, "cheap cars for sale near me" 9th, "car sale near me" 10th, all Sunderland. "used car dealerships" is 6th with Gloucester. Meanwhile /stores ranks for branded searches only, at the same positions as August.

	Two generic local searches dropped out this month: "used car dealerships near me" (6,600, was 9th) and "car showroom near me" (2,900, 5th to 17th). The page-one results for the first are AutoTrader's dealer directory, national groups and the map pack, so a hub page alone will not win it, and I would not promise that it will. What a repositioned /stores can do is give Google a deliberate answer for "used car dealerships", "car showroom" and "cars for sale" style searches instead of an arbitrary one.

	**The plan from August stands,** with one correction: the page does have a meta description (168 characters, brand-led). Move the brand out of the title and heading, add an answer-first paragraph naming the eleven towns and the stock count, add coordinates to each branch's listing data (the individual store pages have them; the hub does not), swap the FAQ for location questions, and link to the hub from the footer and from each store page. The page was last edited on 14 July, so this would also be its first real update in two months.

	**Do it after issue #2,** not before, for the reason given there.

### 2. Build "[make] in [town]" pages — 3 hours {toggle="true"}

The cars2.co.uk pattern from August. Unchanged: Carsa has make pages and store pages and nothing that crosses them.

	---

	**Detail**

	Where "[make] [town]" searches surface a Carsa page it is still a store page far down ("porsche wolverhampton", "kia wolverhampton", "bolton kia dealership" 55th). Start with the highest-stock make at each of the eleven branches, ten to fifteen pages, each listing that make's stock at that branch with the branch's address and hours.

	**Status:** Not started. Depends on issue #2 being settled so the new pages have a clear parent.

### 3. Reclaim "value my car" for the commercial page — 1 hour, after issue #1 {toggle="true"}

The gap between the blog post and the tool widened this month, and issue #1 explains part of why.

	---

	**Detail**

	/value-car holds 17th for "value my car" (60,500). The blog post at /blog/how-much-is-my-car-worth-uk-2026 added "car value" (14,800) at 9th and "used car value" at 6th this month, on top of its existing rankings. Google keeps choosing the article over the tool, and the tool has spent the last three and a half months telling Google its real address is somewhere else.

	**What to change:** Fix the canonical first (issue #1). Then link prominently from the article to /sell-car/value-car, and give the valuation page the explanatory content that is making the article rank: how valuations are calculated, what moves them, how long a quote holds.

	**Honest note:** difficulty 49 with Auto Trader and We Buy Any Car above it. Expect movement into the low teens, not the top three.

### 4. Build out the warranty cluster — 1.5 hours {toggle="true"}

New this month. The extended warranty page started ranking on its own, which is a signal worth following.

	---

	**Detail**

	/car-care/extended-mechanical-warranty entered at 17th for "extended warranty car" and 24th for "extended car warranty uk" with no work done on it. carsaCover is 16th for "cars warranty". The heading on the warranty page is just "Extended Warranty" and it carries no product data for search engines.

	The question searches around it are small individually but cheap: "what does car warranty cover" (590 + 390), "are extended car warranties worth it" (260, difficulty 14, plus about 400 across close variants), "how does car warranty work" (320), "how much warranty on used cars" (170, difficulty 22). Carsa sells the product, so a straight answer to each with a link to the page is a natural fit.

	**What to change:** Retitle the page heading to say what it is ("Extended car warranty from £699, 12 to 48 months"), add product data, and publish two or three of the question articles from the blog list below with links to it.

### 5. Refresh the blog posts that already rank in the top 3, then extend the format — 1 hour plus writing {toggle="true"}

The blog wins on "best/cheapest [category] for [audience]" listicles. The best of them is also the oldest page on the blog.

	---

	**Detail**

	/blog/best-used-suvs-under-20000-uk ranks 2nd for "best used suv uk" and "best used suv", and 2nd for "best 2nd hand suv uk" (up from 4th). Its sitemap date is 24 March, the oldest on the blog by three months. "cheapest cars to insure for new drivers" slipped from 2nd to 3rd this month. These are the pages competitors will target, and an annual refresh with current prices and stock is cheap insurance.

	**What to change:** Refresh the SUV guide and the insurance guide with 2026 stock, prices and one or two new entries, so the update is real. Then keep producing the format: cheapest cars to insure for over-50s, best used cars for tall drivers, cheapest EVs to run, best first cars under £8,000, best used estates for dogs. Difficulty scores in the teens with Carsa at position 2 means this shape faces little serious competition.

	**Why it works:** Each one is a listicle Carsa can populate from real stock, with internal links straight to the relevant model pages, which also helps issue #4.

**Total estimated time: ~8 hours**, excluding the blog writing.

---

## AI search readiness: recommendations

The five items below map one-to-one onto the score table at the top. Three of them have been open since July.

### 1. Freshness: visible dates on service pages, and no fake ones anywhere — 0.5 hours {toggle="true"}

*Issue:* /car-finance, /sell-car/value-car, /stores and the car-care pages show no date anywhere on the page.
*Explanation:* A finance page with no date gives a reader, or an AI assistant, no way to tell whether the rates are current.
*Fix:* Add a visible "last updated" line to the main service pages and change it by hand when the content changes.
*Benefit:* Moves the freshness score from 2/3 to 3/3.

	---

	**Detail**

	**Pages affected:** /car-finance and /car-finance-calculator first, then /faq, /car-care and its sub-pages, then /sell-car/value-car, /sell-car/part-exchange and /reserve.

	**What the sitemap now adds:** Webflow writes each page's last-changed date into the sitemap. For a static page that date moves when the page is edited in the Designer. So a visible "last updated" line and the sitemap date should agree, and they will if the visible date is only changed when the page is. Do not auto-stamp today's date, and do not bump a page to move its date; Google checks the date against the page and drops the signal when they disagree.

	**On the blog:** 71 of 107 posts carry the same date, 30 June, which reads as a bulk edit rather than 71 real updates. Not harmful, but not a freshness signal either. The posts that matter are covered under strategic #5.

	**Flagged since:** July 2026.

	**How to verify:** Open any updated page and look for a clear "Last updated" line that matches the sitemap date.

### 2. Authority: give blog posts a named author — 1 hour, needs your input {toggle="true"}

*Issue:* Blog posts have no author, in the page data or on the page.
*Explanation:* Advice about finance and car buying reads as more trustworthy with a real person's name behind it.
*Fix:* Add a byline and short bio to the blog template and connect it to the post data.
*Benefit:* Takes the authority score from 3/4 to 4/4.

	---

	**Detail**

	**Current state:** The byline area on a post shows "7/8/26 • 5 min read" and no name. The page data has no author field at all now (in August it was present but empty).

	**What we need from you:** A name, job title and two or three sentences of bio for whoever should be credited. Ideally a photo. Once decided, a proper author page with credentials, linked from every post, builds up across 100+ articles.

	**Flagged since:** July 2026.

	**How to verify:** Open any post; a byline should be visible and the author name should appear in the page data.

### 3. Answer structure: open key pages with a factual sentence — 0.5 hours {toggle="true"}

*Issue:* The homepage still opens with "A better rate. On every Carsa car." /car-finance opens with "Car finance. Made simple."
*Explanation:* Good lines for a person, nothing an AI assistant can quote.
*Fix:* Add one factual sentence near the top of the homepage, /car-finance and /sell-car/value-car.
*Benefit:* Gives assistants something citable, and moves answer structure towards 5/6.

	---

	**Detail**

	Something like: "Carsa is a UK used-car retailer with 11 stores, over 2,000 checked cars and finance from 8.9% APR." The headline can stay as it is. On /car-finance: what the eligibility check does, how long it takes, and that it does not affect the credit score. On the valuation page: how the valuation is produced and how long it holds.

	Pairs with the llms.txt update in issue #6, since both are about giving AI tools the right facts.

### 4. Structured data: decide what sold cars should say — 0.5 hours {toggle="true"}

*Issue:* 444 sold vehicles carry listing data with the image and price stripped out, which is what SEMRush counts as errors.
*Explanation:* Withdrawing sold cars from shopping results is the right intention; an empty image field is just an untidy way of doing it.
*Fix:* On sold cars, either drop the listing block entirely or keep the image and rely on "sold out" availability.
*Benefit:* Structured data goes to 4/4 and the error count to near zero.

	---

	**Detail**

	August established that every one of these is a sold car in its retention window. Nothing has changed. This is the one AI-readiness point that is purely a template decision rather than content, so it is the quickest of the four to close once you confirm the intent.

### 5. Authority: finish the outbound citations — 0.5 hours {toggle="true"}

*Issue:* The FCA register is named on /car-finance but not linked; Euro NCAP and Thatcham are not referenced anywhere.
*Explanation:* Linking to the bodies that certify what Carsa says is a trust signal both for readers and for AI assistants deciding whom to cite.
*Fix:* Link the FCA reference to Carsa's own register entry; reference Euro NCAP on the safety-related blog posts and Thatcham on the security pages.
*Benefit:* Supports the authority score alongside the author work.

	---

	**Detail**

	The FCA firm reference (935130) is already in the visible text and the page data on /car-finance, and the Financial Ombudsman is linked. Making the register reference a real link is a two-minute edit. Euro NCAP and Thatcham need a sentence and a link on the pages that talk about safety ratings and security.

**Total estimated time: ~3 hours**

---

## Unbranded rankings: what moved

August promised these would be tracked monthly. Positions are 10 August → 31 August. The last column is the page's last-changed date from the sitemap.

**"[model] for sale"**

| Search | Monthly | Difficulty | August | September | Page last changed |
|--------|---------|-----------|--------|-----------|-------------------|
| bmw x3 for sale | 8,100 | 20 | 18 | 15 | 24 Aug 2026 |
| jaguar f pace for sale | 6,600 | 22 | 26 | out of top 100 | 8 May 2026 |
| seat leon for sale | 5,400 | 19 | 22 | out of top 100 | 24 Aug 2026 |
| mercedes glc for sale | 4,400 | 22 | 29 | 26 | 8 May 2026 |
| mercedes gla for sale | 4,400 | 20 | 27 | 27 | 8 May 2026 |
| mazda cx-5 for sale | 3,600 | 19 | 24 | 26 | 3 Aug 2025 |
| mercedes gle for sale | 3,600 | 18 | 29 | out of top 100 | 30 Jul 2025 |
| mazda 6 for sale | 3,600 | 24 | 30 | 33 | 11 Sep 2025 |
| kia niro for sale | 2,900 | 29 | 29 | 22 | 24 Aug 2026 |

Three up, three out, three flat. Two things line up with the drop-outs: thin stock (the BMW X3 page has three cars on it today, and the F-PACE, Leon and GLE pages will be similar) and, for the GLE, a page untouched for thirteen months. The model page titles already say "for sale" ("Used BMW X3 for sale or on finance | Carsa"), so August's suggestion to add the phrase was either already done or was not the constraint. What moves these pages now is stock depth, links into them, and real updates, which is issue #4.

New arrivals worth knowing about: "nissan juke for sale" (12,100, difficulty 24) entered at 18th, "cupra leon for sale" at 11th. Still inside the top 10: Qashqai 9th, Golf 10th, XC40 9th, A Class 9th, CR-V 6th, Corolla 7th, Superb 8th, Rio 8th, I-PACE 8th, T-Roc 5th, Micra 7th, RAV4 8th, Santa Fe 8th. "seat arona for sale" fell from 5th to 15th on a page last changed in July 2025.

**Bare model names.** "nissan qashqai" 17th → 11th (110,000), "volkswagen golf" 18th → 8th (33,100), "mercedes glc" 37th → 28th (33,100), "seat ateca" 32nd → 28th (22,200). Long game, moving the right way, and the Qashqai and Golf pages were both edited on 24 August.

**Local.** "car sales" 14th → 10th (Portsmouth). "used car dealerships" 6th, unchanged. "used car dealerships near me" out of the top 100 from 9th. "car showroom near me" 5th → 17th. See strategic #1.

**Valuation.** "value my car" 17th, unchanged, at the old URL. Article gained "car value" 9th (14,800). See issue #1 and strategic #3.

**Blog.** "cheapest cars to insure for new drivers" 2nd → 3rd. "best used suv uk" 2nd. "pcp" 4th (27,100). "self employed car finance" 2nd. Holding.

**Google context.** No core update in August. Google ran a spam update from 18 to 21 August, and several SEO publications reported general volatility in early August without a confirmed cause. Carsa's gains and losses are spread across page types in a way that does not look like a targeted hit, so I would not read anything into it beyond normal movement.

**What to take from this.** Three things. The model pages are the ones responding to attention: the batch edited on 24 August moved up, the batch untouched since 2025 mostly slipped. The valuation and part exchange pages have been ranking at addresses that no longer exist, and cannot improve until the canonical is fixed. And the local picture is now a fight between Carsa's own pages rather than a fight with competitors.

**Next steps, in order.** Fix the canonical on the two sell pages (issue #1, fifteen minutes). Refresh the twenty stale model pages listed in issue #4, starting with the ones in the top ten. Settle which page owns each branch town (issue #2), then reposition /stores (strategic #1). Next month this table gains a "page last changed" comparison so we can see whether the refreshes moved anything.

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

**Part exchange.** /sell-car/part-exchange sits 17th to 23rd for its main terms ("part exchange car" 4,400, "part exchange" 2,400), at the old URL. Explainer content pointing at it would help once issue #1 is done.

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
3. **How does part exchange work?** 1,700 searches across two phrasings at difficulty 14 to 16, feeds the part exchange page directly, and complements the two part-exchange-on-finance posts that already rank 4th and 9th.

---

*Will*
