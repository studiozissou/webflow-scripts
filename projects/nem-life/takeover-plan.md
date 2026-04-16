# NEM Life — Takeover Plan & Estimate

**Client contact:** Alex Reus (husband — primary point of contact)
**Brand principal:** Christel Reus (NEM Life — psychology brand, Dutch market)
**Staging site:** [nem-life-1.webflow.io](https://nem-life-1.webflow.io)
**Current live site:** nemlife.com (Webflow project `NEMLife.com TEMP` — to be migrated)
**Source briefing:** `briefing.md` (captured 2026-04-16 from Alex's Notion)
**Rate:** €120/hr (standard, per house rate card)
**Budget indicated:** €2,000 – €5,000
**Proposal date:** 2026-04-16
**Prepared by:** Will Morley

---

## TL;DR

Previous developer delivered ~30 % of the scope, substantially on **desktop only**, with placeholder content across all CMS collections and a partially wired component system. Mobile needs a full responsive pass across every page. Two CMS item templates (Insights Item, Experiences Item) are not yet built. Localization is configured but disabled. No SEO/schema work is in place yet.

**Recommended quote: €4,800 fixed (40 hours at €120/hr).** Sits inside the stated €5k ceiling and covers the full brief.

If we need to trim, there's a clearly-flagged **Flex Items list (~€720)** we can defer to an ongoing care package after launch — bringing the build quote to **€4,080**.

**Post-launch care package: €480/mo** (4 hours + monthly performance report) — handles the flex items in month 1, then picks up small iterations and SEO/AEO reports thereafter.

---

## What I'm seeing vs. what the brief says

### Built well enough to keep (✅)
- Home page layout & structure (desktop)
- NEM Methode layout
- Our Mission / Missie page
- Blank page (T&C / Privacy / Cookie)
- Nav & footer component scaffolding
- Notification bar component
- FAQ accordion markup
- CMS collections exist: **Insights**, **Insights categories**, **Testimonials**, **Testimonials Categories**
- 43 registered components — component library is non-trivial and mostly sensibly named
- No console errors on any audited page

### Prepared but incomplete (⚠️)
- **Home page:** 3-image hover sequence not wired; "123" card fade-in on scroll not wired; Insights category-based card logic (1 Essential + 2 latest per category) not implemented — currently just shows 5 Lorem items
- **NEM Methode:** card fade-in missing; FAQ same treatment as home
- **Blog Insights main:** sticky category bar not sticky; Essentieel/Selected/Popular/category-based logic not implemented
- **Ervaringen (Experiences):** journey-type filter not wired; load-more not wired; Story cards use Lorem
- **Link-in-bio /lp/christel:** placeholder, needs CMS-driven blog card sections
- **Nav:** About/Over submenu not refined
- **Large + Medium headers:** styling + right-side images incomplete

### Not yet built (📋)
- **Blog Insights Category page** (needs to be cloned/templated across 5 categories)
- **Blog Insights Item page** (two-column, sticky side panel, modular content blocks)
- **Experiences Item page** (single-column text-only)

### Real problems I found (not in brief, but matter)
1. **Mobile is broken across the board** — home mobile renders as stripped-down skeleton; other pages largely untested at 390×844. The scale of the rebuild is larger than the brief implies.
2. **CMS is populated entirely with Lorem Ipsum** — 5 Insights items, 7 Testimonials items, all placeholder. Only Insights Categories has real Dutch content.
3. **Localization is OFF** — brief says "Localization ACTIVATED" but Webflow API shows both NL and EN locales with `enabled: false`. NL needs to be switched on; EN needs to be hidden at launch per brief.
4. **Nav links are all `#`** — no page wiring.
5. **No tag taxonomy for Insights** — brief requires tag-based "Veel gelezen: [tag]" blocks on Category pages. Only categories exist. Needs a new reference collection.
6. **Two Webflow projects exist** — `NEMLife.com TEMP` (live on nemlife.com) and `NEMLife.com NEW` (the one we're finishing). Needs DNS cutover + 301 map at launch.
7. **Mobile nav + notification bar stacking rule** ("no navbar overlap on mobile") — needs CSS validation.
8. **No schema, no metadata strategy, no preload hints** — brief requires Article / Organization / FAQPage schema.
9. **GEO requirement (all essential text in DOM at load)** — needs explicit review of any JS-injected copy. FAQ must use CSS-only collapsing.

---

## Scope & pricing

**Rate: €120/hr.** All phases below are hourly line items — totals are fixed on sign-off.

Standard add-ons (SEO setup, analytics, accessibility pass, cookie consent, handoff documentation) are **included at no extra charge** per house rate card — the hours shown below are the realistic build time for each phase.

### Core scope (non-negotiable — required to launch)

| # | Phase | Hours | EUR |
|---|---|---:|---:|
| 1 | **Discovery & handover** — Figma/Webflow/Notion/Slack access, Loom walkthrough of audit findings back to you, kickoff call to resolve the 10 open questions (see below) | 2.0 | €240 |
| 2 | **Foundation audit & tech debt** — Client-First compliance sweep, component reuse audit, nav link wiring, locale config fix, responsive strategy lock | 4.0 | €480 |
| 3 | **Home page completion** — 3-image hover fade, 123 card scroll-in, FAQ single-open behaviour, Insights category-based cards, header right images | 4.0 | €480 |
| 5 | **Mobile responsive — ALL pages** — full mobile pass across every page; fix nav+notification stacking; typography scale; image sets | 6.0 | €720 |
| 6 | **Blog Insights system** — sticky bar, Essentieel/Selected/Popular logic, Category page template (5 live), tag-based "Veel gelezen" blocks, Item page build (sticky side panel, modular body, Related 3) | 6.0 | €720 |
| 7 | **Experiences system** — journey-type filter, responsive grid, dynamic CTA by sex, load-more, Item page build (single-column text-only) | 4.0 | €480 |
| 9 | **Webflow localization** — NL enabled as primary, EN hidden/ready for Phase B, `/nl/…` URL scheme, hreflang | 1.5 | €180 |
| 10 | **SEO, schema & performance** — meta editable in CMS, OG images, Article/Organization/FAQPage JSON-LD, robots.txt, sitemap, preload hero, WebP pass, Lighthouse baseline | 3.0 | €360 |
| 13 | **QA — cross-browser & a11y** — Chrome/Safari/Firefox/iOS/Android spot-checks, axe-core pass on every template, keyboard nav, reduced-motion respect | 2.0 | €240 |
| 14 | **Launch prep** — 301 map from `NEMLife.com TEMP`, DNS cutover plan, final publish, smoke test, Loom handover | 1.5 | €180 |
| | **Core total** | **34.0** | **€4,080** |

### Flex items (can be deferred to care package if budget is tight)

Each item below can be pulled from scope and picked up in the post-launch care package (at 4hr/€480/month, all four fit inside month 1).

| # | Phase | Hours | EUR | Risk if deferred |
|---|---|---:|---:|---|
| 4 | **NEM Methode card fade-in + FAQ parity** | 1.5 | €180 | Low — page still works, just less polished |
| 8 | **CMS cleanup & taxonomy** (add Insight Tags collection, wire multi-ref, replace Lorem once content arrives) | 1.5 | €180 | Medium — "Veel gelezen" blocks won't render until tags exist. Client can populate content manually |
| 11 | **Link-in-bio (Christel)** — activate Methode section + 2 manually-selected blog cards × 2 | 1.0 | €120 | Low — can go live post-launch |
| 12 | **Nav / footer polish** — shrink-on-scroll, About/Over submenu, footer form wiring | 1.5 | €180 | Medium — nav feels unfinished without submenu |
| | **Flex total** | **5.5** | **€660** | |

### Totals

| Scope | Hours | EUR |
|---|---:|---:|
| **Core only** (launches, no flex) | 34.0 | **€4,080** |
| **Core + all flex** (recommended — full brief delivered) | 39.5 | **€4,740** |
| **Recommended quote (rounded)** | 40.0 | **€4,800** |

> **€4,800 fixed** is the proposed number. Sits inside the €5k ceiling. Delivers the full brief.

---

## Payment terms

Per house rate card:

| Stage | Amount | When |
|---|---|---|
| Deposit | 50 % (€2,400) | On sign-off, before work starts |
| Milestone — design approval | 25 % (€1,200) | After Phase 3/4 desktop sign-off |
| Final | 25 % (€1,200) | On launch |

- Bank transfer, 7-day payment terms
- Estimate valid 30 days
- 2 design revision rounds + 1 development revision round included per page
- Additional revisions billed at €120/hr
- Change orders (work outside approved scope) require written sign-off with updated pricing before work begins

---

## Post-launch: ongoing care packages

Picking up the flex items plus keeping the site healthy, the site secure, and the SEO/AEO story working over time. All three tiers are on the house rate card's retainer structure.

### Insights — €120 / month
Report-only. No dev hours.
- Monthly automated report: Lighthouse, Core Web Vitals, GA4 summary, Search Console highlights
- Schema validation + broken-link check
- Email response within 48h (no priority queue)
- *Good for:* small business that just wants visibility, does its own content

### Care — €480 / month (recommended)
4 hours of dev/content time + everything in Insights.
- Small iterations (new sections, CMS updates, copy changes)
- Monthly automated report (as above)
- **Quarterly AEO audit** — how ChatGPT, Perplexity, Gemini, Google AI Overviews rank your content; specific fixes applied
- Priority response < 24h weekdays
- 6-month minimum, then month-to-month
- Unused hours do not roll over

### Grow — €960 / month
8 hours + everything in Care + content strategy.
- Monthly content strategy check-in (30 min call)
- Monthly AEO audit instead of quarterly
- Content cluster planning support
- A/B test recommendations on CTAs
- Priority response < 12h weekdays

**What the AEO audit actually does** — once a quarter (or monthly on Grow), I run your key pages through AI search engines to see how they rank, what's being cited, what's missed. Then I apply structural/copy fixes to the pages so they get quoted more often. This is the single best SEO investment for a psychology brand in 2026 — more searches now start in ChatGPT than Google Images.

---

## Risks

1. **Mobile rebuild is larger than brief suggests** — the brief calls it "alignment", but home mobile looks substantially stripped. Build-out risk concentrated in Phase 5. *Mitigation:* fix at component level so every page inherits the fix.
2. **Previous dev's Client-First compliance unknown** — deep audit may surface non-conforming class systems. *Mitigation:* budgeted in Phase 2; flag early if it balloons.
3. **Figma designs not yet verified for Item pages** — brief lists them as 📋 but I haven't confirmed designs exist. *Mitigation:* request Figma access Day 1; re-estimate Phase 6/7 if designs are missing.
4. **Real content timing** — CMS is 100 % Lorem. If copy isn't supplied before Phase 6/7, we either build against Lorem (carries layout risk) or slip. *Mitigation:* content deadline locked in Phase 1 kickoff.
5. **Localization contradiction** — brief says ACTIVATED, Webflow shows disabled. *Mitigation:* confirm in kickoff.
6. **Tag collection missing** — "Veel gelezen: [tag]" blocks can't function without it. Adding one is in Flex Phase 8.
7. **Two Webflow sites** — if the TEMP site has content to migrate (URLs, metadata), that's additional scope. *Mitigation:* Phase 14 covers 301s; deeper content migration is out of scope unless flagged.
8. **Previous dev reliability** — no handover doc, no changelog. Assume zero knowledge transfer; everything reverse-engineered. Already priced in Phase 1 + 2.
9. **Self-test CTA** — brief mentions it on Insights Item pages. No tool spec. Assuming link-out to an external form; bespoke in-page tool is separate scope.

---

## Opportunities (future / upsell)

- **Phase B: EN locale activation** — once NL is stable, unlock EN (~6–10 hrs for wiring, translation excluded)
- **Content population service** — place real copy + source stock photography per brief (separate quote, ~€600–€1,200 depending on volume)
- **Alex link-in-bio** — parallel to Christel's; trivial clone (~1–2 hrs) if wanted
- **Blog automation** — Notion → Webflow pipeline via Make.com (~6–8 hrs; strong fit for a psychology content brand that publishes regularly)
- **Email capture + Mailchimp/ActiveCampaign/Klaviyo integration** — not in current scope; brief doesn't name a provider
- **Subtle GSAP choreography** — brief explicitly says "no dramatic animation" so stays restrained, but a tasteful pass adds perceived quality (~3–5 hrs)
- **Person schema (Christel)** — beyond the required schema; strong AEO signal for a personal brand
- **NEM Methode as a self-paced intro module** — lead-magnet-shaped product, captures emails pre-therapy

---

## Gaps & clarifications needed before kickoff

1. **Figma access** — confirm link to final designs; verify Item page templates exist
2. **"Over ons" page** — nav lists it, page list doesn't. Out of scope, existing, or implied under "Our Mission"?
3. **Newsletter provider** — Mailchimp? ActiveCampaign? Klaviyo? Needed for footer form wiring
4. **Self-test CTA destination** — external form URL, or build a bespoke tool?
5. **NEM WISE waitlist** — mentioned in brief; destination/form unknown
6. **Legal copy** — Privacy / T&C / Cookie — finalised and Dutch-law reviewed?
7. **Browser support targets** — assuming latest 2 versions of Chrome/Safari/Firefox/Edge + iOS 16+ Safari
8. **Previous developer transition** — work-in-progress not in Webflow? Custom code deployed via CDN not in the project?
9. **Go-live date** — when does NL need to be public?
10. **Analytics** — GA4? Plausible? Needs installing before launch; 15-min task but needs the ID

---

## Engagement structure

- **Discovery call (30 min)** — align on scope, confirm Figma, resolve the 10 gaps above
- **Deposit: 50 %** — on sign-off of fixed scope
- **Week 1:** Phases 1–2 (discovery + foundation)
- **Week 2:** Phases 3–4 + start Phase 5 (desktop polish + start responsive)
- **Week 3:** Phase 5 + 6 (finish responsive, Blog Insights system)
- **Milestone invoice: 25%** at end of Week 3 (desktop sign-off)
- **Week 4:** Phases 7–10 (Experiences, CMS, localization, SEO)
- **Week 5:** Phases 11–14 (polish, QA, launch)
- **Final payment: 25 %** — on launch + Loom handover
- **Optional: start Care retainer month 1 = absorbs Flex items**

Daily Slack check-ins, Loom for any decision needing client input. No surprises.

---

## What I will NOT do under this quote

- Logo / brand identity work (done, per brief)
- Copywriting in Dutch (I'll place supplied copy — writing it is separate)
- Photography / illustration (stock sourcing available as upsell)
- Email marketing setup beyond embedding a form
- Webflow Ecommerce
- Bespoke in-page tools (Self-test, quizzes) unless separately scoped
- Post-launch content entry beyond first 5 articles + 7 testimonials to prove templates
- Hosting management (not offered)

---

## Decision points for Alex

1. **Scope:** Core + Flex (€4,800) or Core only (€4,080)?
2. **Care package:** Insights (€120/mo), Care (€480/mo, recommended), Grow (€960/mo), or none?
3. **Start date:** Monday after deposit clears — confirm target go-live window
4. **Kickoff call:** 30 min to walk through the 10 gaps + this plan — when works?

---

*End of plan. See `slack-message.md` for the short-form version for Alex.*
