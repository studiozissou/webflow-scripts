# Narrative — NEM Life remediation programme

**Date:** 2026-05-07
**Purpose:** The story that frames the plan for NEM Life. Used as proposal intro, kickoff
deck anchor, and shared language in every client conversation from here forward.

## Source files

- `audits/structure.md` — Lighthouse scores + technical infrastructure
- `audits/seo.md` — Meta titles, descriptions, headings, schema, content language
- `audits/content.md` — CMS hygiene, alt text, code inventory, migration assessment
- `audits/aeo.md` — AI search readiness (answer engine optimisation)
- `client.md` — Client context, scope, contacts
- `brand/voice.md` — Tone ladder, vocabulary, content principles
- `brand/icp.md` — Ideal customer profiles ("Anna" primary segment)

---

## One-line

> **NEM Life is a psychology-based brand with strong copy, a clear method, and a
> site that scores 100/100 on technical best practices — but four configuration
> gaps keep it invisible to search engines and AI platforms alike.** Closing those
> gaps turns a well-built site into a findable one.

---

## The three-beat story

### 1. Where the site is today

The foundation is stronger than most sites at this stage.

Every page — desktop and mobile — scores **100/100 on Lighthouse Best Practices**.
That is rare. It means the technical layer is clean: HTTPS is active, there are no
console errors, no deprecated APIs, no insecure requests. The custom code is
disciplined: 313 lines across 6 files, each with a clear purpose, no dead code,
no jQuery spaghetti.

The brand voice is already working. The Home and NEM Methode pages carry strong
Dutch copy that matches the tone ladder precisely — warm professional, concrete,
direction-oriented. The H1 on the homepage ("Doorbreek het patroon dat je steeds
weer tegenhoudt") is one of the best opening lines in the Dutch psychology space:
it names the problem, implies the solution, and speaks directly to "Anna."

The content principles — clarity over clutter, structure over overload, direction
over reflection-only — are visible in the writing that exists. The methodology
section on `/nem-methode` walks through three pillars in a way that is structured
and accessible without being clinical. This is the kind of content that earns
trust from the target audience.

The site is not broken. It is unfinished.

### 2. What's holding it back

Six concrete gaps sit between the current site and a site that works as hard as
the brand does. None is a crisis. Together, they cap visibility.

**1. Four of seven static pages have no SEO title or description.**
The homepage title is still "Webflow - NEMLife.com NEW." The Inzichten page is
titled "Blog Insights." Google uses these titles as the primary ranking signal
and the main text in search results. Without them, the site cannot rank — and
if it did appear, nobody would click.

**2. Five pages carry English headings on a Dutch-language site.**
The Missie page has two H1 tags, both in English. Inzichten and Ervaringen share
an identical English H1 ("From insight to direction"). The Voorwaarden page has
"Terms & Conditions" as its main heading. Mixed language signals weaken ranking
in Dutch search results and confuse structured data that declares `inLanguage: nl`.

**3. Zero structured data is deployed.**
JSON-LD schemas have been prepared for every page — Organization, FAQPage, HowTo,
Person, Article, Review — but none has been placed in Webflow yet. Without
structured data, the site cannot appear in rich results (FAQ dropdowns, how-to
panels, knowledge cards) and AI platforms have no machine-readable signal to cite.

**4. Nineteen of 39 images have no alt text.**
Nearly half the images on the site are invisible to screen readers and search
engines. This is both an accessibility violation (WCAG 2.1 AA) and a missed
ranking signal.

**5. All CMS content is placeholder text.**
Every blog article and testimonial contains Lorem ipsum. The collection name has
a typo ("Inzichtens" instead of "Inzichten"). Navigation links point to `#`. The
CMS layer — the part of the site designed to grow over time — is not yet
functional.

**6. The site is invisible to AI search engines.**
The AEO audit scores 5 out of 20 (D grade). No publication dates, no author
bylines, no external citations, no schema markup. FAQ sections exist but lack
answer-first formatting. When someone asks Perplexity or ChatGPT about breaking
emotional patterns in Dutch, NEM Life does not appear — and currently cannot.

Two infrastructure items compound this: there is no analytics installed (so
performance cannot be measured) and all custom code is hosted on the developer's
GitHub account (a bus-factor risk if that account is ever compromised or suspended).

### 3. What the work unlocks

The remediation programme is structured in three pillars. Each builds on the one
before it.

**Pillar 1 — De-risk.**
Migrate custom scripts to a client-owned GitHub repository. Fix CMS hygiene:
rename the misspelled collection, populate real content templates, wire
navigation links, resolve open designer comments. Install cookie consent. This
pillar removes dependencies and closes the gaps that could break the site
silently.

**Pillar 2 — Unlock visibility.**
Deploy the prepared JSON-LD schemas across all pages. Set Dutch SEO titles and
meta descriptions on every page. Fix the five English headings. Add alt text to
all 19 images. Restructure FAQ sections for answer-first formatting. Add author
bylines and publication dates. Install analytics. This pillar takes the site from
invisible to indexable — and from indexable to citable. The AEO audit estimates
that Phase 1 fixes alone move the score from 5/20 (D) to approximately 13/20 (B).

**Pillar 3 — Grow.**
Launch the content programme: real blog articles replacing Lorem ipsum,
structured with AEO formatting and schema markup. Build author credential
sections for Christel. Add external citations to research supporting the NEM
Methode. Prepare the English locale for activation. Establish a retainer rhythm
for ongoing content, performance monitoring, and iterative improvements. This
pillar compounds what Pillars 1 and 2 build.

---

## Why this framing matters

1. **Gives the client credit** for the quality that is already there — the copy,
   the methodology content, the technical discipline, the 100/100 Best Practices
   scores.
2. **Makes the gap concrete and countable** — 4 missing titles, 5 English
   headings, 19 images without alt text, 5/20 AEO score — rather than abstract
   ("the SEO needs work").
3. **Makes the return vivid** — from invisible to citable, from D-grade to
   B-grade AEO, from placeholder CMS to a working content engine.

---

## Key phrases to reuse

These are the shared language for every conversation, email, and proposal with
NEM Life. They are designed to resonate with the brand's own vocabulary.

1. **"De site is niet kapot. Hij is onaf."**
   *(The site is not broken. It is unfinished.)* — Frames the work as completion,
   not rescue. Matches the brand's non-dramatic, concrete tone.

2. **"Van onzichtbaar naar citeerbaar."**
   *(From invisible to citable.)* — Captures the Pillar 2 outcome in three words.
   Works in Dutch and English contexts.

3. **"De basis is sterker dan het lijkt."**
   *(The foundation is stronger than it looks.)* — Credits the existing quality.
   Prevents the client from feeling the site is a failure.

4. **"Zes gaten, geen crisis."**
   *(Six gaps, no crisis.)* — Keeps the framing calm and countable. Mirrors the
   brand principle of structure over overload.

5. **"Helderheid in plaats van hoop."**
   *(Clarity instead of hope.)* — Echoes the brand promise ("helderheid") and
   positions the remediation as the same kind of structured approach NEM Life
   offers its own clients.

6. **"Concreet, stapsgewijs, meetbaar."**
   *(Concrete, step-by-step, measurable.)* — Borrows directly from NEM Life's own
   copy. Frames the work in the brand's language.

7. **"Het patroon doorbreken — ook voor je site."**
   *(Breaking the pattern — for your site too.)* — Uses the brand's core concept
   to describe the remediation itself. Use sparingly; it lands well in a kickoff
   but would feel gimmicky in repeated use.

---

## How this flows into the plan's priorities

| Area | Maps to | Pillar |
|------|---------|--------|
| Code migration to client-owned GitHub | De-risk infrastructure | 1 |
| CMS hygiene (collection rename, wiring, placeholder cleanup) | De-risk content layer | 1 |
| Cookie consent installation | De-risk compliance | 1 |
| Navigation links wired | De-risk usability | 1 |
| JSON-LD schema deployment (8 prepared files) | Unlock visibility — structured data | 2 |
| SEO titles + meta descriptions (4 pages critical) | Unlock visibility — SERP presence | 2 |
| English heading fixes (5 pages) | Unlock visibility — language signals | 2 |
| Alt text for 19 images | Unlock visibility — accessibility + SEO | 2 |
| FAQ answer-first restructuring | Unlock visibility — AEO formatting | 2 |
| Author bylines + publication dates | Unlock visibility — AEO authority | 2 |
| Analytics installation | Unlock visibility — measurement | 2 |
| OG images + social tags | Unlock visibility — social sharing | 2 |
| Blog content programme (replace Lorem ipsum) | Grow — content engine | 3 |
| Author credential sections for Christel | Grow — authority building | 3 |
| External citations to supporting research | Grow — AEO authority signals | 3 |
| English locale preparation | Grow — internationalisation | 3 |
| Retainer (monitoring, iteration, new content) | Grow — compound returns | 3 |

**Recommendation on narrative sequencing:** Lead with Pillar 2 (the unlock) in the
client story. The visibility gains are the most tangible outcome and the most
motivating for Alex, who is semi-technical and can see the before/after in
Lighthouse scores and search results. Position Pillar 1 (de-risk) as the
insurance that protects the Pillar 2 investment — "we do this first so the
visibility gains stick." De-risk first in execution order, but second in the
story.

For NEM Life specifically, mirror the brand's own narrative structure: name the
pattern (the six gaps), show the approach (three pillars), point forward (from
invisible to citable). The remediation story should feel like the NEM Method
applied to their own site.

---

*Use this as the opening 1-2 pages of the proposal and the anchor for every client
conversation. Share with Alex so both sides use the same language.*
