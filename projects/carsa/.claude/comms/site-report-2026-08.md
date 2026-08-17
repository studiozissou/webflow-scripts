**Month:** August 2026 | **Site:** www.carsa.co.uk | **Pages crawled:** 5,536

---

## Summary

The best month since we started tracking. Site health is up from 72% to 75%, SEMRush's AI Search score moved for the first time since May, 74 to 78, and three long-standing problems are genuinely gone: broken internal links 56 to zero (the carousel filtering issue traced on the 9 July call), server errors 3 to zero, and links with no anchor text 5,640 to 11. Slow-loading pages fell from 3,928 to 1,090. The new vehicle page titles and descriptions went live on 10 August, a few hours after this crawl ran, and I've confirmed on the live site that duplicate titles, duplicate descriptions and over-length titles are all fixed at source — the table below still shows the morning's figures, so those three will catch up next month.

What needs attention is the commercial pages. Duplicate content rose to 1,286 and duplicate titles to 2,151 as stock turned over, and the store pages read similarly enough that Google can't reliably tell them apart — the same underlying problem in two places, and the main thing holding back the unbranded rankings covered at the end. One correction to July's report while I'm here: the 460 remaining structured-data errors are sold cars, not cars awaiting photography, and they're long-standing rather than new — ten of the 25 I checked have carried the error since 12 May. Withdrawing sold cars from search is the right intention, so that one is a tidy-up rather than a priority.

---

## Key metrics

**SEO health** (SEMRush, 7 July → 10 August)

| Metric | July | August | Change |
|--------|------|--------|--------|
| Pages crawled | 5,678 | 5,536 | −142 (stock turnover) |
| Site health score | 72% | 75% | +3% |
| SEMRush AI Search score | 74 | 78 | +4 |
| Structured-data errors | 1,207 | 460 | −747 |
| Broken internal links | 56 | 0 | −56 (fixed) |
| 5xx server errors | 3 | 0 | −3 (fixed) |
| 4xx errors | 21 | 1 | −20 |
| Links with no anchor text | 5,640 | 11 | −5,629 (fixed) |
| Slow page load | 3,928 | 1,090 | −2,838 |
| Pages with one internal link | 87 | 47 | −40 |
| Duplicate meta descriptions | 52 | 28 | −24 (fixed 10 Aug, verified live) |
| Incorrect pages in sitemap | 29 | 10 | −19 |
| Broken external links | 5,631 | 5,489 | −142 (not a real fault — see note) |
| Duplicate title tags | 2,128 | 2,151 | +23 (fixed 10 Aug, verified live) |
| Duplicate content pages | 1,106 | 1,286 | +180 (stock growth) |
| Pages not crawled | 17 | 40 | +23 (new stock, crawl timing) |
| Over-length page titles | 430 | 430 | — (fixed 10 Aug, verified live) |
| Multiple H1 tags | 0 | 0 | — (holding) |
| Nofollow internal links | 0 | 0 | — (holding) |

**AI search readiness (AEO)**

SEMRush's own AI Search score rose to 78/100. The 20-point framework below tracks the finer detail. One correction: last month's table showed Answer structure out of 4 when the scale is out of 6. The score itself was right, so the totals are unchanged.

| Category | July | August | Change | To improve |
|----------|------|--------|--------|------------|
| Structured data | 3/4 | 3/4 | — | Clear the 460 sold-car listing errors → 4/4 |
| Answer structure | 4/6 | 4/6 | — | Lead key pages with a factual sentence a machine can quote |
| Freshness | 2/3 | 2/3 | — | Add visible "last updated" dates to /car-finance, /faq and service pages |
| Authority | 2/4 | 3/4 | +1 | Add a named blog author with a real bio |
| Technical | 3/3 | 3/3 | — | — |
| **Overall** | **14/20** | **15/20** | **+1** | |

Authority moves up because /car-finance carries the FCA firm reference (935130) in both its visible text and its structured data, and links out to the Financial Ombudsman. I checked and that's genuinely in place. It may have been there in July and gone unscored rather than being new this month.

---

## What changed and why

### Fixed {toggle="true"}

	- Broken internal links: 56 → 0. The carousel filtering issue identified on the 9 July call.
	- Server errors: 3 → 0. The two problem vehicle pages from July are gone.
	- 404s: 21 → 1. The one left is a sold car, /vehicles/used/sa70oul. Worth remembering these aren't faults — sold vehicles are removed after their retention period, which we agreed in June is the right use of a 404. The count mostly reflects how many happen to have just come down when the crawl runs.
	- Links with no anchor text: 5,640 → 11. The icon, social and card link components now carry proper labels. I checked the homepage directly — 199 links, none unlabelled. The 11 remaining are on the vehicle purchase and cookie policy pages.
	- Slow page load: 3,928 → 1,090. Same crawl size, so this is a real improvement rather than a measurement quirk.
	- Near-orphaned pages: 87 → 47. Internal linking has improved.
	- Sitemap: 29 wrong pages → 10.
	- Structured-data errors: 1,207 → 460, as sold stock cycles through.

### Regressed {toggle="true"}

	- Duplicate content: 1,106 → 1,286, and duplicate titles 2,128 → 2,151. Stock turnover plus templates that produce near-identical pages.
	- Pages not crawled: 17 → 40. All 40 are vehicle pages first seen on the day of the crawl — new stock added while SEMRush was running. The same thing happened in June and settled by itself.

### Added {toggle="true"}

	- Several new blog posts including best used EVs under £20,000, part-exchanging a car with outstanding finance, and a used-car budgeting guide. The part-exchange one was on July's recommended list.

### Deployed after the crawl — not yet in the numbers above {toggle="true"}

	- **New vehicle page titles and descriptions, live 10 August.** The title is now "Used {year} {colour} {make and model} ({registration}) | Carsa" — for example "Used 2023 Black Kia Sportage (RF23YWH) | Carsa", 45 characters. Fuel type, door count and trim have come out of the title and moved into the description, and the registration has gone in.

		**Confirmed working.** I checked it live rather than waiting for the next crawl. The ten Tesla Model Ys that previously all shared "Used 2022 White Tesla Model Y Long Range 5dr | Electric | Carsa" now have ten distinct titles, one per registration. Across a sample of fourteen cars, including the longest names on the site, all fourteen titles and all fourteen descriptions are unique.

		Lengths are right too. Titles now average 47 characters against the old 70, and only the two longest Land Rover names still tip just past the limit at 61 and 62. Descriptions average 142 characters, with one Range Rover Sport at 172 — the shortened wording you used keeps almost all of them inside the limit.

		So duplicate titles, duplicate descriptions and over-length titles are all resolved at source. The counts in the table above are from the morning crawl and still show the old figures; next month's crawl will catch up with what's already live.

### Dropped from the list {toggle="true"}

	- July's issue #7, image alt text. Done, and confirmed — the crawl reports zero missing alt attributes and the vehicle images carry alt text.
	- Sold-car listing data. The 460 structured-data errors are all sold cars, whose price and photo are stripped while the listing is still published. Withdrawing sold cars from search is what you want and "sold out" already achieves it, so this is a tidy-up rather than a fix — worth doing eventually to clear the error count, but it isn't holding anything back. Tracked in the AI readiness table above.
	- July's issue #9, broken external links. Not a real fault. All 5,489 are the same WhatsApp link in the site header returning "too many requests" when the crawler hits it thousands of times in a row. Real visitors clicking it are fine. It will show in the numbers every month, and it can be ignored every month.

---

## Top issues to fix

### 1. Store pages are too alike for Google to separate them — 1 hour {toggle="true"}

*Issue:* The store pages are similar enough that Google can't reliably tell which is which.
*Explanation:* When ten pages read the same, searches for one store surface the wrong branch, and none of them rank as well as they should.
*Fix:* Give each store page genuinely local content instead of the same text with the town name swapped.
*Benefit:* Better local rankings per branch, and a dent in the duplicate-content count.

	---

	**Detail**

	**Root cause:** The store template produces near-identical pages. The effect is measurable: a search for one branch returns up to ten different Carsa store pages, with the correct one first and nine others scattered far below it. That's Google trying to work out which page is which and hedging.

	**What to change:** Each store page needs content only true of that branch — opening hours, directions and parking, the people there, what stock that site typically holds, nearby landmarks. Two or three genuinely local paragraphs per page is enough to break the pattern.

	**Worth knowing:** Portsmouth, Cannock, Gloucester and Mountsorrel already rank first or second for their own town's searches. The template works when the content differs. The branches that don't rank are the ones reading like every other page.

	**How to verify:** Re-crawl and watch the duplicate-content count. Search a branch town and check only that branch's page comes back.

### 2. Vehicle pages read identically to each other — 1 hour {toggle="true"}

*Issue:* 1,286 vehicle pages have body copy near-identical to at least one other vehicle page, up 180 this month.
*Explanation:* When two cars' pages read the same, Google tends to index one and largely ignore the other, so parts of the stock compete with themselves.
*Fix:* Work each car's own details into the page copy instead of relying on text generated from the model and trim.
*Benefit:* Makes each car's page distinct, and tackles the largest remaining count in this report.

	---

	**Detail**

	**Root cause:** The descriptive copy on a vehicle page is built from the model and trim, so every car of the same specification gets the same paragraphs. Checked across the flagged set: "Used 2023 Grey Ford Puma ST-Line" matches two other Puma ST-Lines, "Used 2024 White Audi A1 Sport" matches two other A1 Sports, "Used 2022 Grey BMW iX M Sport" matches two more. Each flagged page has one or two near-twins. The count rose this month because more near-identical stock arrived, not because anything got worse.

	**What to change:** The CMS already holds the fields that differ between two otherwise identical cars — mileage, registration, colour, previous owners, service history, MOT expiry, and which store it's at. Binding two or three of those into the opening paragraph makes the text itself differ. The title and description change that went live on 10 August does this for the search snippet; this does the same job for the page body.

	**Worth knowing:** This won't reach zero, and it shouldn't. Two genuinely identical cars will always read similarly. The goal is enough difference that Google indexes both rather than folding one into the other.

	**How to verify:** Re-crawl; the duplicate-content count should fall from 1,286.

### 3. Add "last updated" dates to service pages — 0.5 hours {toggle="true"}

*Issue:* /car-finance, /faq and the car-care pages show no date anywhere.
*Explanation:* An undated finance page gives a reader no way to tell whether the rates are current.
*Fix:* Add a visible "last updated" line to the main service pages.
*Benefit:* Moves the freshness score from 2/3 to 3/3.

	---

	**Detail**

	**Pages affected:** /car-finance and /car-finance-calculator first, then /faq, /car-care and its sub-pages, then /sell-car, /part-exchange, /value-car and /reserve.

	**What to change:** For blog and legal pages, drive the date from the CMS's built-in "updated on" field so it maintains itself. For static service pages, add a visible date and change it by hand when the content changes. Don't auto-stamp today's date — that isn't a real freshness signal.

	**Flagged since:** July 2026. Not actioned.

	**How to verify:** Open any updated page and look for a clear "Last updated" line.

### 4. Replace the "Learn more" links with real text — 0.5 hours {toggle="true"}

*Issue:* 125 internal links use "Learn more" as their wording, across the city pages and the promotion pages.
*Explanation:* Link text is how Google works out what sits on the other end. "Learn more" describes nothing, so those 125 links pass no useful signal.
*Fix:* Change the wording in the shared block so it names where the link goes.
*Benefit:* All 125 links start describing their destination, off the back of two small edits.

	---

	**Detail**

	**Root cause:** Two links sit in a shared block — one to /car-finance, one to /sell-car/part-exchange — and both read "Learn more". That block repeats across every /used-cars/near/ city page and the promotion pages, so a single component produces the entire count. Confirmed on /used-cars/near/wolverhampton, which carries three of them.

	**What to change:** Swap "Learn more" for wording that names the destination — something like "See our finance options" and "Value your part exchange". Two edits in the component, and every page carrying it updates at once.

	**Worth doing at the same time:** the last 11 unlabelled links, which sit on just two pages — /terms/vehicle-purchase has 3 pointing at go.carsa.co.uk/cc, and /terms/cookie-policy has 8 pointing at external privacy pages. Labelling those clears the unlabelled-link count to zero.

	**Pairs with:** move #3 in the ranking section, which is about strengthening those same city pages. Worth doing in one pass.

	**How to verify:** Re-crawl. Non-descriptive anchor text should fall from 125, and unlabelled links from 11 to zero.

### 5. Give blog posts a named author — 1 hour, needs your input {toggle="true"}

*Issue:* Blog posts have no author, in the page data or on the page itself.
*Explanation:* Advice about finance and car buying reads as more trustworthy with a real person's name behind it.
*Fix:* Add a byline and short bio to the blog template and connect it to the post data.
*Benefit:* Takes the authority score from 3/4 to 4/4.

	---

	**Detail**

	**Root cause:** The placeholder author was removed in June, correctly, but nothing replaced it. The post data now carries an explicitly empty author field.

	**How I confirmed it:** Google's Rich Results Test on the best-used-EVs post (10 August) returns the article as valid with one non-critical issue: missing author. Google treats it as optional, so this isn't blocking anything — it's a quality gap rather than a fault.

	**What we need from you:** A name, job title and two or three sentences of bio for whoever should be credited. Ideally a photo.

	**How to verify:** Open any post; a byline should be visible and the author name should appear in the page data.


**Total estimated time: ~4 hours**

---

## 5 strategic opportunities

### 1. Blog author profiles with real names and credentials — 2 hours {toggle="true"}

The blog is doing real work — it ranks second in the country for "cheapest cars to insure for new drivers" and second for "best used SUV UK". Content pulling that weight should carry a name.

	---

	**Detail**

	Beyond the byline in issue #5, a proper author page with credentials and a link from every post builds up over 100+ articles. Worth doing once the name is decided.

	**Depends on:** Author details from Carsa.

### 2. Build a /sell-car hub page and store index — already scoped {toggle="true"}

The sell-car store pages exist but nothing ties them together. A hub would create a proper cluster around "sell my car" searches.

	---

	**Detail**

	**Status:** Already scoped as part of the Sell Car project. No separate estimate.

### 3. Open key pages with a factual sentence — 0.5 hours {toggle="true"}

The homepage headline is now "A better rate. On every Carsa car." It's a good line for a person and a useless one for an AI assistant looking for a fact to quote.

	---

	**Detail**

	Note this replaces the wording quoted in July's report, which has since changed.

	A factual opening sentence elsewhere on the page gives an assistant something citable. Something like: "Carsa is a UK used-car retailer with 11 stores, over 2,000 checked cars and finance from 8.9% APR." The headline can stay as it is.

	Worth doing the same on /car-finance and /sell-car.

	**One to check while you're there:** the llms.txt file we put live last month, which exists so AI tools read the right facts about Carsa, doesn't match the stores page. It names Shrewsbury and omits Portsmouth and Wolverhampton, while /stores lists 11 branches: Bolton, Bradford, Cannock, Durham, Gloucester, Halesowen, Mountsorrel, Portsmouth, Southampton, Towcester and Wolverhampton.

	Shrewsbury is the odd one. Its page is live and sits in the sitemap, but nothing on /stores links to it — so either it's a branch missing from the list, or a closed one whose page is still up. Worth telling me which, and I'll make llms.txt, /stores and the sitemap agree.

### 4. Finish the outbound citations — 0.5 hours {toggle="true"}

The FCA reference is in place on /car-finance and the Financial Ombudsman is linked. Two gaps remain.

	---

	**Detail**

	The FCA register is mentioned in the text but not linked — worth making it a real link to Carsa's own register entry. Euro NCAP and Thatcham aren't referenced anywhere, so blog posts mentioning safety ratings and the car-care security pages have nothing authoritative to point at.

### 5. Create a quarterly original-data piece {toggle="true"}

Carsa holds data nobody else has: what sells fastest, average prices by region, how long stock sits. A short quarterly report earns links and gives AI tools something they can only get from you.

	---

	**Detail**

	A first piece could cover what sold fastest in Q3 2026 by model, colour and price bracket. The valuation content already ranks well, which suggests an appetite for Carsa's numbers.

**Total estimated time: ~3 hours**, excluding the sell-car hub and the data piece.

---

## 5 highest-value moves to climb the unbranded rankings

### 1. Target "[model] for sale" on the model pages — 0.5 hours {toggle="true"}

This is the single best opportunity on the site. The pages already exist, they already rank, and the competition is unusually weak.

	---

	**Detail**

	Searches like "bmw x3 for sale" have a difficulty score of 16 out of 100 — genuinely easy — and 8,100 searches a month. Carsa sits at position 18. The same pattern repeats across the range:

	| Search | Monthly | Difficulty | Carsa now |
	|--------|---------|-----------|-----------|
	| bmw x3 for sale | 8,100 | 16 | 18 |
	| jaguar f pace for sale | 6,600 | 22 | 26 |
	| seat leon for sale | 5,400 | 19 | 22 |
	| mercedes glc for sale | 4,400 | 22 | 29 |
	| mercedes gla for sale | 4,400 | 22 | 27 |
	| mazda cx-5 for sale | 3,600 | 18 | 24 |
	| mercedes gle for sale | 3,600 | 18 | 29 |
	| mazda 6 for sale | 3,600 | 19 | 30 |

	We know the pattern works because Carsa is already top 10 on the same phrasing elsewhere: "vw t roc for sale" is 4th, "seat arona for sale" 5th, "hyundai santa fe for sale" 6th, "nissan micra for sale" 7th.

	**What to change:** Work the "for sale" phrasing into the model page title, heading and opening sentence, rather than the bare model name. The pages currently optimise for "BMW X3", which is a fight against BMW.

	**Why it converts:** Someone searching "for sale" is shopping, not researching.

	**How to verify:** Track those eight searches monthly. Movement should show within two crawls.

### 2. Repoint the existing /stores page at "near me" searches — 1.5 hours {toggle="true"}

High-value local searches currently land on whichever branch page Google picks, usually Gloucester. The /stores page should be taking them and isn't, because it's written to answer a different question.

	---

	**Detail**

	"Used car dealerships near me" gets 6,600 searches a month and Carsa ranks 9th — with /stores/gloucester, which is an odd answer for someone in Bradford. "Car showroom near me" (2,900) ranks 5th, also Gloucester. "Used car dealerships" (2,900) ranks 6th, Gloucester again. "Car sales" gets 27,100 searches a month and Carsa ranks 14th with the Portsmouth page.

	**Root cause:** /stores ranks for branded terms only — "carsa gloucester", "carsa bolton", "carsa towcester" and so on, at positions 6 to 16, plus "carsa locations" at number one. Not a single unbranded term. Google has read the page exactly as written, because the title and the H1 both lead with the brand: "Find your nearest Carsa store". The search you want to win never mentions Carsa.

	The page is otherwise in good shape. It runs to 2,811 words, lists all eleven branches in the page source, and carries a proper AutoDealer entry per branch with address, postcode, phone, opening hours, price range and payment methods. This is a repositioning job, not a rebuild — and updating it beats building something new, which would only compete with it.

	**What to change, in order of leverage:**

	1. Move the brand out of the lead. Title to something like "Used Car Dealerships Near You — 11 UK Showrooms \| Carsa", H1 to "Used car dealerships near you".
	2. Write a meta description. There isn't one at all at the moment, so Google is inventing the snippet.
	3. Add an answer-first opening paragraph. The page currently drops straight into the store grid; two sentences naming the eleven towns and the stock count give Google and AI assistants something to quote.
	4. Add geo coordinates and areaServed to each branch's listing data. Everything else is already there, and the coordinates are what support proximity.
	5. Swap the FAQ for location questions and add FAQ markup. The current questions cover Reserve & Collect, warranties and provenance checks — good content, wrong page — and carry no markup at all.
	6. Link to the hub from the footer and from each branch page. /stores currently sits at 13 for "carsa gloucester" while /stores/gloucester takes first place, so the hub has less internal weight than its own children. That's also why Google reaches past it for the generic searches.

	**Sequencing:** do this alongside issue #1 in the fix list, not before it. If the hub starts winning generic searches while the branch pages still read identically to each other, it may start taking town searches the branches currently own outright.

	**One caveat:** "near me" phrasing specifically is served largely by the map results, which are driven by Google Business Profile rather than by this page. I haven't reviewed Carsa's business profiles, so I'd treat the winnable ground here as "used car dealerships" and "car showroom near me" style queries and look at the profiles separately.

	**How to verify:** Track the four searches above and check which URL Google returns. Success is /stores replacing /stores/gloucester.

### 3. Build "[make] in [town]" pages — 3 hours {toggle="true"}

This is the pattern cars2.co.uk is beating you with, and Carsa has both halves of it already.

	---

	**Detail**

	Carsa has make pages at /used-cars/make/ and eleven store pages. Nothing crosses them. cars2 ranks first for "nissan wakefield", "hyundai bradford" and a dozen similar because they built exactly that crossing.

	Carsa's own data says the demand is there and unserved: "porsche wolverhampton" surfaces a Carsa store page at 35, "kia wolverhampton" at 48, "bolton kia bolton" at 56. Google is reaching for something Carsa hasn't built.

	**What to change:** Start with the highest-stock make at each of the eleven branches rather than building every combination. A page per pairing, listing that make's stock at that branch, with the branch's address, hours and a line about what they typically hold. Ten to fifteen pages would cover the realistic demand.

	**Related, and cheaper:** the existing /used-cars/near/ city pages already rank without much help — "cars for sale birmingham" (3,600/month) at 10, Stoke-on-Trent (2,900) at 19, Leicester (2,900) at 22, Nottingham (2,400) at 24. The Birmingham page also picks up "cars on finance" (12,100) at 12 and "finance cars" (9,900) at 10. Thickening those with genuinely local content is the same job and can be done in the same pass.

	**How to verify:** Track "[make] [town]" for the pairings built, plus the four city searches above.

### 4. Reclaim "value my car" for the commercial page — 1 hour {toggle="true"}

"Value my car" is 60,500 searches a month and Carsa ranks 17th. The valuation blog post is doing better than the page built for the job.

	---

	**Detail**

	The blog post at /blog/how-much-is-my-car-worth-uk-2026 ranks 5th for "value of auto", 8th for "value of automobiles", 9th for "car and value", and climbed from 16th to 6th for "vehicle values uk" this month. Meanwhile /value-car sits at 17 for the head term.

	Google has decided the blog post is the better answer. That's a strong signal, and the authority it's built should be pointed at the tool.

	**What to change:** Link prominently from the blog post to /value-car, and strengthen /value-car with the explanatory content that's making the blog post rank — how valuations are calculated, what affects them, how long a quote holds.

	**Honest note:** This is a difficulty-52 term with Auto Trader and We Buy Any Car above it. Expect movement into the low teens rather than the top three.

### 5. Extend the blog formats that already reach the top 3 {toggle="true"}

Carsa's blog wins on a specific pattern: "best/cheapest [category] for [audience]". That format is proven and the difficulty scores are low.

	---

	**Detail**

	Current top-3 rankings on that pattern: "cheapest cars to insure for new drivers" 2nd (2,900/month), "best used SUV UK" 2nd, "recommended automatic cars" 2nd, "best affordable family car UK" 2nd at difficulty 12, "self employed car finance" 2nd at difficulty 11.

	Difficulty scores in the teens with Carsa at position 2 means this format faces almost no serious competition.

	**What to change:** Keep making them. Untapped angles in the same shape: cheapest cars to insure for over-50s, best used cars for tall drivers, cheapest EVs to run, best first cars under £8,000, best used estates for dogs.

	**Why it works:** Each one is a listicle Carsa can populate from real stock, with internal links straight to the relevant model pages.

**Total estimated time: ~6 hours**, excluding the ongoing blog work.

**The honest position on "used cars" itself.** The page-one holders are AutoTrader, Carwow, Cinch, the AA, Parkers, Motors, Evans Halshaw and Listers. Those are national marketplaces with fifteen-year link profiles. Going head-on at "used cars" as a national term is a twelve-month project.

**Why the weaker sites beat you — I checked.** I pulled cars2.co.uk's search data to see what's actually carrying them. It isn't content volume. Almost all their traffic comes from pages combining a manufacturer with a town: "nissan wakefield", "hyundai bradford", "nissan huddersfield", "renault wakefield", "mg wakefield", "hyundai barnsley", "omoda wakefield". They rank first for every one of those. They have a page per make, and a contact page per make per branch.

Then, having built that base, they pick up the generic terms almost as a byproduct — "car dealerships" at 12,100 searches a month, position 6.

Carsa has make pages and store pages, but nothing that combines the two. Where those searches do surface a Carsa page it's a store page landing at position 35 to 58: "porsche wolverhampton" 35th, "kia wolverhampton" 48th, "bolton kia bolton" 56th. So the demand exists, Carsa is in the index for it, and there's no page built to win it. That's the clearest content gap on the site.

Two things to hold in mind before the list. Carsa already ranks first or second for plenty of unbranded searches — store pages on their own towns, blog listicles, finance eligibility. The templates work when the content differs. And the biggest-looking prizes, the bare model names like "nissan qashqai" at 110,000 searches a month, aren't realistically winnable soon: Carsa sits at 17 against the manufacturers and AutoTrader.

**On "we've got no content".** Half right, and the half that's right matters. The blog is genuinely strong — second nationally on several terms — so the problem isn't how much content exists. It's that the pages meant to sell cars are thin and near-identical while the blog carries the site. That's why the valuation blog post outranks the valuation tool, and why cars2 beats you with pages that are, individually, quite basic. Moves 1 to 4 are all the same underlying fix: give the commercial pages enough distinct content to stand on their own.

**On hiring an SEO specialist.** Worth doing eventually. I'd do these five first — they're specific, they're costed, and they'll tell you how much headroom there actually is before you commit to a salary. If the model pages move on the "for sale" terms within two crawls, that's the strongest possible argument for investing further.

---

## Blog topic suggestions

Fresh SEMRush keyword data, UK. These exclude anything already published or already ranking — the part-exchange-with-finance post from July's list is live, so it's off.

**Electric cars — the biggest untapped cluster.** Carsa sells EVs and has a used-EV buying guide, but none of the questions people actually ask.

| Topic | UK searches/mo | Difficulty |
|-------|---------------|-----------|
| How much does it cost to charge an electric car? | 8,100 | 38 |
| How long does it take to charge an electric car? | 3,600 + 2,400 | 28 |
| How much does an electric car charger cost? | 2,900 | 28 |
| Are all electric cars automatic? | 2,400 | 19 |
| How long do electric car batteries last? | 2,400 | 44 |
| Do electric cars have gears? | 1,900 | 22 |
| Do electric cars pay road tax? | 1,900 | 25 |
| Are electric cars cheaper to run? | 1,600 | 24 |
| Should I buy an electric car? | 1,300 | 17 |
| Do electric cars need an MOT? | 1,000 | 16 |
| Can you tow an electric car? | 1,000 | 18 |

That last one pairs directly with the towing post already published.

**Car finance — low difficulty, high commercial value.** The cost-per-click figures here are £2 to £5, which tells you how much these searchers are worth.

| Topic | UK searches/mo | Difficulty |
|-------|---------------|-----------|
| Can you sell a car on finance? | 1,900 + 1,000 + 1,000 | 12–14 |
| What is HP car finance? | 1,300 | 26 |
| Can you get car finance on Universal Credit? | 590 | 15 |
| Can you pay off car finance early? | 590 | 16 |
| Can you swap finance from one car to another? | 590 | 9 |
| How much finance is left on my car? | 480 | 15 |
| Can you finance a car for someone else? | 480 | 10 |
| Can you get car finance with an IVA? | 480 | 9 |

**Recommended first three:**

1. **Can you sell a car on finance?** Roughly 3,900 monthly searches across close variants at difficulty 12–14, and it feeds the Sell Car work. This was on July's list and is still the strongest single gap.
2. **How much does it cost to charge an electric car?** The biggest volume on either list at 8,100, and it opens the EV cluster.
3. **What is HP car finance?** Completes the finance set around the PCP post, which already ranks 6th for "pcp" at 27,100 searches a month.

---

*Will*
