# Tamsen Fadal — Branded Search SEO Fix

## Background
GreenBanana SEO (Kevin Roy) audited tamsenfadal.com and identified a branded search / entity-ownership problem. When searching "Tamsen Fadal", the website ranks ~6th behind Wikipedia, YouTube, LinkedIn, Instagram, IMDb, Amazon, etc. The site itself is technically healthy — the issue is weak on-site entity signals.

### Why the old site didn't have this problem
The previous site was written in a more factual, entity-descriptive style — "Tamsen Fadal is a..." language throughout. The new site was (correctly) rewritten for users with warmer, more conversational copy ("Hi! I'm Tamsen"), but in doing so lost the explicit factual entity signals that Google relies on for branded search. The fix isn't to revert the tone — it's to layer the entity signals back in via titles, H1s, schema, and strategic on-page copy without losing the user-friendly voice.

## Source
Email from Jenn Fadal (COO, Tamsen Fadal Media) → Yoni (Skye High) → Will, dated 2026-06-18. Full GreenBanana report forwarded.

## What We Can Do (Dev Scope)

### Phase 1: Old vs New Site Entity Audit + Surgical Edits
Priority: HIGHEST — 2h / $260

Compare the former site (https://tamsen.webflow.io/) against the current live site (tamsenfadal.com) page by page. Identify exactly which entity signals were lost in the redesign and suggest surgical edits to restore them without rewriting the new site's voice.

**Audit deliverable:** Side-by-side comparison doc covering:
1. **Title tags** — Old vs new, flag where "Tamsen Fadal" was dropped or diluted
2. **H1s** — Old vs new. Kevin flagged the About page H1 ("NYT bestselling author. Global keynote speaker. Podcast host." — no name). Compare all pages to see which others lost entity name.
3. **Meta descriptions** — Old vs new, flag where "Tamsen Fadal" is now missing
4. **On-page entity copy** — Where did the old site use factual "Tamsen Fadal is a..." language that the new site replaced with softer copy? Identify specific lines, not whole-page rewrites.
5. **Footer entity language** — What did the old footer say vs now?
6. **Internal linking** — Did the old site have more branded anchor text between pages?

**Content ownership:** Tamsen's team writes/approves all copy. We provide surgical recommendations based on the comparison, they approve, we implement.

### Phase 2: Schema / JSON-LD Implementation
Priority: HIGH — 2h / $260

**Blocker:** Needs approved bio language for Person `description`. Can't start until Phase 1 content is approved.

Build a full JSON-LD entity graph for all pages:
1. **Person schema** (site-wide) — Single `@id: https://www.tamsenfadal.com/#tamsen-fadal` with name, jobTitle, description, image, url, sameAs array (Wikipedia, YouTube, LinkedIn, Instagram, IMDb, Amazon, Spotify, Facebook, Substack, Apple Podcasts), knowsAbout (menopause, perimenopause, women's health, journalism)
2. **WebSite schema** (site-wide) — `@id: https://www.tamsenfadal.com/#website`
3. **Book schema** (book page) — How to Menopause with author → Person @id
4. **PodcastSeries schema** (podcast page) — The Tamsen Show with host → Person @id
5. **Article schema** (blog template) — author → Person @id
6. **Event schema** (events template) — performer → Person @id
7. **BreadcrumbList** (all pages)
8. **ProfilePage schema** (about page)
9. Validate all via Google Rich Results Test

### Phase 3: Wikidata Update
Priority: HIGH — 0.5h / $65

Update Tamsen Fadal's Wikidata entry with:
1. Official website URL (tamsenfadal.com)
2. Social profile identifiers (Instagram, YouTube, Facebook, LinkedIn, X/Twitter)
3. Podcast identifiers (Apple Podcasts ID, Spotify ID)
4. Book/author identifiers (Amazon, Goodreads, ISBN where applicable)
5. Verify existing properties (VIAF, ISNI, Library of Congress, IMDb) are correct

Same concept as JSON-LD schema but in Wikidata's format — structured key-value pairs, not editorial content.

### Phase 4: Technical Cleanup
Priority: LOW — 1h / $130

Placeholder text is mostly hidden in the DOM and unlikely to be a real ranking factor. Worth doing while we're in there but not the cause of the ranking drop.

1. **Remove placeholder text** — "This is some text inside of a div block." across About, Press, Events, Education Hub, Blog templates
2. **Fix empty states** — Education Hub "No items found." hidden when empty
3. **Hide form messages from crawlers** — Standard Webflow boilerplate on Homepage, Blog, Press, Contact
4. **Broken link/image audit** — Crawl and fix any 404s

### Phase 5: Knowledge Panel Claim
Priority: MEDIUM — 0.5h / $65

Requires Tamsen's Google account access. If we get logins:
1. Search "Tamsen Fadal", claim the Knowledge Panel via Google's verification flow
2. Verify through the official site
3. Submit any corrections (official website URL, description, etc.)

### Phase 6: Monthly Site Audit Report (ongoing retainer)
1h/month / $130/month

Same `/site-audit` process we run for Carsa, with branded keyword rankings as an additional focus area. Tracks what changed vs last month, SEMrush data, and progress on the entity ownership work. An additional 1-2h/month could be budgeted for fixes/updates depending on what comes up.

## Totals

**One-off:** 6h / $780
**Ongoing:** $130/month (+ optional 1-2h for fixes)

## What We CANNOT Do (Out of Scope for Us)

| Workstream | Detail | Suggested owner |
|---|---|---|
| **Social / profile alignment** | Updating bios to consistent language and ensuring each platform links back to tamsenfadal.com. Instagram, YouTube, Amazon Author Central, Apple Podcasts, Spotify, IMDb, Muck Rack, Goodreads, LinkedIn, etc. | Skye High (using our checklist) |
| **Google Ads bridge** | Branded search ad to hold top spot while organic catches up. Smart short-term play. | Needs a Google Ads manager |
| **Digital PR / link reclamation** | Finding mentions of Tamsen online that don't link back to the site and asking them to add one. | PR agency |
| **Bio language workshop** | Tamsen's team needs to workshop and approve the official bio text. We need it before we can implement on-page changes, schema, and profile checklists. | Tamsen's team |

## Deliverables for Out-of-Scope Items

1. **Profile alignment checklist** — Platform-by-platform list with exact bio text, link URLs, and what to change

## Execution Order

1. Old vs new site audit (no blocker — can start now)
2. Send content recommendations to Tamsen's team for approval
3. Technical cleanup (no blocker — can run in parallel)
4. Once bio approved: schema implementation + on-page edits + Wikidata
5. Knowledge Panel claim (once we have Google account access)
6. Monthly reporting begins

## Dependencies

| Blocker | Blocks |
|---|---|
| Approved bio language | Phase 2 (schema), Phase 1 implementation (on-page edits), profile checklist |
| Tamsen's Google account access | Phase 5 (Knowledge Panel) |
| GSC access | Search console data in monthly reports |
