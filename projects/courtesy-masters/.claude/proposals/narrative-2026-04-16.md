# Narrative — CourtesyMasters remediation programme

**Date:** 2026-04-16
**Purpose:** The story that frames the plan for the client. Used as proposal intro, kickoff deck anchor, and shared language in every client conversation from here forward.

---

## One-line

> **CourtesyMasters is a quietly strong website with a loud ceiling.** The foundation is in better shape than a first glance suggested — what's holding it back is a small set of structural gaps that, once closed, unlock the authority and search visibility the brand has already earned in the market.

---

## The three-beat story

### 1. Where the site is today

The intake verification (SEMRush, 100 pages, 9,018 meta checks, 1,337 images, JS-rendered crawl) changed the picture materially:

- **Foundation is solid.** 95/100 pages have complete SEO heads post-JS, 0/1,337 images missing alt text, full hreflang across 665 declarations, sitemap in place, llms.txt published, SSL + GTM + 6 locales configured, 57/57 resolved Designer comments.
- **The brand already competes.** In the Dutch market, CM ranks **#2–5** for the exact keywords that matter: *werving en selectie horeca* (#2), *horeca recruitment* (#4), *recruitment horeca* (#4), *hospitality headhunter* (#5). These are the money keywords — and CM is already on page one.
- **The competitor gap is narrower than the raw numbers suggest.** `hospitality-group.nl` looks 20× bigger on traffic, but 73% of their traffic is a single head term from a different business model (consultancy). Against the real peer set — `mjpeople.nl`, `independenthospitality.nl`, `thehospitalityrecruiters.com` — CM is within striking distance on keyword count (118 vs 115–190) and ~50% on traffic.

### 2. What's holding it back

The ceiling isn't caused by one big problem. It's caused by a small set of structural gaps, each of which is individually cheap to fix but collectively depresses the site's authority signals to search and AI engines:

- **19 of 22 job listings are invisible to Google for Jobs** — they're missing JobPosting schema. The 3 that have it rank.
- **30 FAQs with no FAQPage schema** and no answer-first copy structure — which means they don't get picked up by ChatGPT, Perplexity, or Google's SGE.
- **16 insights posts and 3 case studies with inconsistent Article schema** — the content exists, but search engines can't tell what it is.
- **27 page titles are truncated in SERPs** (>60 chars). Every page affected loses ~20–30% of its potential click-through.
- **No role-specific landing pages.** CM goes straight from homepage to job listings. The #1 competitor on "hospitality recruitment" (`mjpeople.nl`) wins because they built "General Manager Hotel" and "Hotel Professionals" landing pages that rank independently.
- **A single business-critical dependency** lives on a third party's GitHub repo. If they delete it, the site breaks.

None of these is a crisis. All of them, together, are why the site's authority hasn't compounded despite 25+ years of brand equity, a 6-language footprint, and good existing content.

### 3. What the work unlocks

The remediation isn't a rebuild or a rescue. It's a **surgical release of latent authority** — doing the work the current site has already earned the right to benefit from. The programme has three pillars:

**Pillar 1 — De-risk.** Remove the Egenix GitHub dependency, fix duplicate Lenis and GSAP version mismatch, clean up dead code. Insurance against a silent break.

**Pillar 2 — Unlock search + AI visibility.** Add the missing schema (JobPosting on 19 jobs, FAQPage on 30 FAQs, Article on 16+ posts), shorten the 27 truncated titles, fix the 3 duplicate H1s, build 3–5 role-specific landing pages. Google for Jobs eligibility, Google rich results, AI search citations — all become possible.

**Pillar 3 — Grow.** Competitive gap analysis, international SEO review of the 5 non-NL locales, content programme anchored on the Dutch keywords CM already almost-owns, and a retainer to keep compounding.

---

## Why this framing matters

This is **not** a "your site is broken, here's a big invoice" conversation. The audit accidentally started there — then verified its way out of it. The real picture is:

- **Foundation: better than expected.** (OG / alt text / hreflang / meta coverage all pass.)
- **Ceiling: lower than it should be.** (Schema gaps, title lengths, H1 duplicates, no landing pages.)
- **Gap: smaller and cheaper to close than we first thought.** (Option 1 scope shrank materially after verification.)

Framing the programme this way does three things:
1. **Gives the client credit** for the quality that's already there (foundation, brand positions, content depth).
2. **Makes the gap concrete and countable** (19 jobs, 30 FAQs, 27 titles, 3 H1s) rather than abstract ("SEO is broken").
3. **Makes the ROI vivid** — move #5 → #3 on 8 Dutch keywords, make 19 more jobs eligible for Google for Jobs, land 3 role-specific landing pages in top 10 = realistic 2.5–3.5× organic traffic in 12 months.

---

## Key phrases to reuse

- "Quietly strong with a loud ceiling."
- "The brand already competes — the site just isn't letting it show."
- "Surgical release of latent authority."
- "Three pillars: de-risk, unlock, grow."
- "Not a rescue. Not a rebuild. A release."
- "You've already earned the right to this traffic. We just need the site to claim it."
- "You rank where it matters. We want you to dominate where it matters."

---

## How this flows into the plan's priorities

| Client asks / change list | Maps to | Pillar |
|---------------------------|---------|--------|
| Typography / URL structure / footer / CMS docs | Polish + clarity | **Pillar 1 (de-risk)** where they overlap with dependency / hygiene; **Pillar 3** otherwise |
| Zapier stability / CRM / AI agent | Operational reliability | **Pillar 1** (risk reduction) |
| Insights sub-categorisation / forms simplification | Editorial + conversion | **Pillar 2 / 3** |
| Cookiekot decision | Compliance hygiene | **Pillar 1** |

The current plan's P0 (Egenix migration, dev page cleanup, GSAP alignment) is Pillar 1. But **Pillar 1 by itself doesn't move search or revenue** — it only protects what's there. Client value is unlocked in **Pillar 2 (schema + titles + H1s + landing pages)**, and that's what the proposal should lead with.

**Recommendation:** Re-sequence the proposal so **Pillar 2 sits first** in the client narrative (because that's the unlock), and **Pillar 1 is positioned as the insurance policy that protects the Pillar 2 investment**. De-risk first in execution order, but not first in the story.

---

*Use this as the opening 1–2 pages of the proposal and the anchor for every client conversation. Share with the internal team so we all tell the same story.*
