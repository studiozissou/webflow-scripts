# Narrative — Ready Hit Play remediation programme

**Date:** 2026-05-04
**Purpose:** The story that frames the plan for the client.

---

## One-line

> **Ready Hit Play is a creative studio whose site is its best showreel — cinematic, precise, and emotionally immediate — but the infrastructure underneath is running on borrowed time, and search engines can't see any of it yet.** Fixing both unlocks a site that performs as hard as it presents.

---

## The three-beat story

### 1. Where the site is today

**The craft is already exceptional.** Zero console errors across all pages. Lighthouse accessibility at 89-91. Full JSON-LD structured data on the homepage (Organization with founders, services, socials) and case studies (CreativeWork with reviews and breadcrumbs). The Barba.js transitions, GSAP animation choreography, and video system are production-grade.

**The brand competes on feel.** The site itself is the proof of work — visitors experience the agency's capability within seconds. The copy ("Goosebumps don't lie", "Most creative work is made for reach. Ours is made for impact.") is distinctive, commanding, and memorable. This isn't a brochure site; it's a piece of the portfolio.

**The gap is narrower than it looks.** The issues are almost entirely metadata and infrastructure — not design, not content, not functionality. Most of the critical fixes are under 30 minutes each.

### 2. What's holding it back

1. **Search engines can't find it.** No sitemap, robots.txt blocks all crawlers, and the About page title is just "About". Once the production domain goes live, Google needs a clear signal that this site exists and what it's about. (6 pages invisible.)

2. **Social sharing is blank.** No OG images on any page. When someone shares a case study on LinkedIn or Slack, there's no visual preview. For a visual agency, that's a missed shot.

3. **All code lives on someone else's server.** 20+ production scripts hosted on a third-party GitHub account via jsDelivr. If that account goes down, the entire site goes dark. Barba.js is loaded without a version pin — one upstream release can break all transitions.

4. **GSAP loads twice.** Webflow's IX2 system loads GSAP 3.15.0; the custom code loads 3.14.2 on top. ~60KB of duplicate payload and a version conflict waiting to surface.

5. **AI engines can't extract answers.** AEO score: 4.5/20 (L1 Invisible). The copy is emotionally powerful but structurally invisible — no definition paragraphs, no question headings, no FAQ blocks. AI search platforms have nothing to cite.

6. **Images have no alt text.** 6/6 homepage images (all case study thumbnails) have empty alt attributes. A straightforward accessibility and SEO gap.

### 3. What the work unlocks

**Pillar 1 — De-risk.** Pin Barba.js, migrate code to a client-owned repo, resolve the GSAP conflict, add cookie consent. Insurance against a silent break.

**Pillar 2 — Unlock visibility.** Sitemap, robots.txt, OG images, alt text, H1 hierarchy, meta descriptions. Google indexes the site properly; social shares look as good as the site does; Lighthouse SEO jumps from 63 to 90+.

**Pillar 3 — Grow.** AEO remediation, FAQ content, cite-magnet pages, Person schemas, LocalBusiness markup, performance optimization. The site starts appearing in AI search results and Google rich panels.

---

## Why this framing matters

1. **Gives the client credit** — the site's interaction quality is genuinely exceptional. This isn't a rescue job.
2. **Makes the gap concrete** — "6 pages invisible", "4.5/20 AEO score", "20+ scripts on one account" are numbers, not opinions.
3. **Makes the ROI vivid** — going from invisible to indexed, from blank social cards to branded previews, from borrowed infrastructure to owned.

---

## Key phrases to reuse

- "The site is the showreel. Now we make it findable."
- "Not a rescue. Not a rebuild. A release."
- "The craft is there. The plumbing needs to catch up."
- "Borrowed infrastructure on a site this good is a liability."
- "From invisible to indexed in a week."
- "The brand competes on feel — now make search engines feel it too."

---

## How this flows into the plan's priorities

| Theme | Maps to | Pillar |
|-------|---------|--------|
| Launch-day essentials (sitemap, robots, OG) | P0 | Pillar 2 |
| Analytics, alt text, heading structure | P1 | Pillar 2 |
| Code migration to owned repo | P2 | Pillar 1 |
| AEO content, schemas, llms.txt | P3 | Pillar 3 |
| FAQ, cite-magnets, performance | P4 | Pillar 3 |

**Recommendation on narrative sequencing:** Lead with Pillar 2 (the unlock) in the client story — "here's what opens up the moment we flip these switches." Position Pillar 1 (de-risk) as the insurance that protects the investment. De-risk first in execution order, but not first in the story.

---

*Use this as the opening 1-2 pages of the proposal and the anchor for every client conversation.*
