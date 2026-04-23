# AEO Audit — NEM Life

**Date:** 2026-04-23
**Site:** nem-life-1.webflow.io
**Overall Score: 5/20 (D) — Below AEO baseline**

---

## Scores by Page

| Page | Score | Grade |
|------|-------|-------|
| Homepage | 6/20 | D |
| NEM Method | 5/20 | D |
| Blog Insights | 4/20 | F |
| Our Mission | 5/20 | D |

---

## Blocker

**robots.txt: `Disallow: /`** — Site completely blocked from all crawlers (Google, Bing, Perplexity, ChatGPT). AEO is impossible until this is fixed. Expected for staging but must change at launch.

---

## Category Breakdown

### Schema (A1-A4): 0/4 — CRITICAL
- A1 MISSING: No JSON-LD on any page
- A2 MISSING: FAQ sections on Home + NEM Method have no FAQPage schema
- A3 MISSING: NEM Method 3-pillar process has no HowTo schema
- A4 MISSING: No Organization or Person schema for Christel/Alex

### Answer Structure (B5-B10): 3/6 — NEEDS WORK
- B5 PARTIAL: Hero copy is punchy but FAQ answers not frontloaded
- B6 NEEDS ATTENTION: Questions exist but formatted as H3 not H2
- B7 PASS: Most paragraphs 1-3 sentences
- B8 PASS: Sections under 300 words
- B9 PASS: Methodology steps introduce context
- B10 PASS: Direct conversational tone, active voice

### Freshness (C11-C13): 0.5/3 — CRITICAL
- C11 MISSING: No publication or update dates visible
- C12 MISSING: No freshness indicators
- C13 PASS: No hedge language

### Authority (D14-D17): 0.5/4 — WEAK
- D14 MISSING: No data, research, or statistics cited
- D15 WEAK: Christel mentioned but no byline, credentials, or credentials page
- D16 MISSING: Zero external citations
- D17 PARTIAL: NEM Methode is a framework (cite-magnet potential) but lacks schema

### Technical (E18-E20): 1/3 — CRITICAL
- E18 MISSING: No alt text on any images across all pages
- E19 PASS: Multiple internal CTAs and navigation links
- E20 CRITICAL: robots.txt blocks all crawlers

---

## Priority Fixes

### Phase 1 — Blockers (launch prerequisites)
1. Fix robots.txt: `Allow: /` with specific Disallows for admin paths
2. Add JSON-LD: Organization + FAQPage (home), HowTo + FAQPage (NEM Method), Article (blog template)
3. Add publication/update timestamps to all pages
4. Add descriptive alt text to all images (26+ missing on homepage alone)

### Phase 2 — Content Structure
5. Restructure FAQ to answer-first format (bold 1-sentence answer, then explanation)
6. Promote FAQ headings from H3 to H2
7. Replace Lorem ipsum blog previews with real summaries
8. Add author bylines ("Door Christel Reus") to blog articles

### Phase 3 — Authority
9. Create author credential sections (PRI certification, 15+ years)
10. Add 3-5 external citations to research supporting NEM Methode
11. Add social proof signals (testimonial snippets, certification logos)

### Phase 4 — Nice-to-have
12. Convert statement headings to question format
13. Shorten long paragraphs on NEM Method page
14. Add breadcrumb schema
15. Use descriptive anchor text for internal links

**Estimated lift: Phase 1 alone moves score from 5/20 (D) to ~13/20 (B).**
