# Content Audit — CourtesyMasters

**Date:** 2026-04-15
**Scope:** CMS hygiene, content depth, accessibility of copy, brand voice consistency
**Related:** `reports/intake-report-2026-04-15.md`, `.claude/brand-voice.md`, `.claude/ideal-customer-profiles.md`

---

## Summary

CourtesyMasters has rich source material — 19 insights posts, 30 FAQs, 22 active jobs, 16 team bios, 6 case studies, multiple industry segments — but the content layer has several hygiene issues suppressing its value: CMS collection typos, 7 live dev/test pages, 7 thin template pages from taxonomy collections, and no structured answer-first content for AI search engines.

Brand voice is well-defined in `brand-voice.md` (premium, discreet, internationally fluent, authority-without-boasting) but consistency across CMS-entered copy hasn't been verified.

---

## 1. CMS Hygiene

### 1.1 Collection typos (low severity, fix during CMS cleanup)

| Collection | Issue |
|------------|-------|
| "Work at CourtesMasters" | Missing "y" — should be "CourtesyMasters" |
| "Candidates Industries in Hospitaility sectors" | Extra "i" — should be "Hospitality" |

### 1.2 Unpublished / dev pages (medium — indexable and diluting site quality)

7 pages currently published and crawlable that should be draft/unpublished:

1. `/dev/components`
2. Test CMS item #1
3. Test CMS item #2
4. Test CMS item #3
5. BUILD MODE DEMO
6. Style guide page #1
7. Style guide page #2

These pages generate thin, duplicative content that Google may flag as low-quality. Pushing them to draft is a 15-minute task.

### 1.3 Thin template pages (medium — auto-generated from taxonomy collections)

7 Webflow collections have **template pages enabled** that produce thin auto-generated detail pages with no unique content:

1. Quotes
2. Testimonials
3. Employer Departments
4. Employer Industry Segments
5. Industries
6. Services (overlap with main service pages)
7. Case Study Tags
8. FAQ Tags
9. Hotelschool Countries

**Fix:** Disable template pages on all collections where the detail page has no unique purpose. These are taxonomy-only collections — they exist to filter/categorise other collections, not to have their own landing pages.

---

## 2. Content Depth & Opportunity

### 2.1 Content inventory

| Content type | Count | Structured data? | Alt text | Answer-first? |
|--------------|-------|------------------|----------|---------------|
| Insights posts | 19 | 3/19 have Article | PASS (0 missing) | No |
| FAQs | 30 | None have FAQPage | N/A | Partial |
| Job listings | 22 | 3/22 have JobPosting | PASS (0 missing) | N/A |
| Team members | 16 | None have Person | PASS (0 missing) | N/A |
| Case studies | 6 | 3/6 have Article | PASS (0 missing) | No |
| Industry pages | ~8 | None | PASS (0 missing) | No |

### 2.2 High-leverage opportunities

1. **19/22 job listings missing JobPosting schema** — only 3 have it, directly invisible to Google for Jobs on the rest. Adding schema could 2-5× job page impressions.
2. **30 FAQs with no FAQPage schema** — rich result opportunity; also prime AEO content if structured answer-first (one-sentence answer, then detail).
3. **16+ insights posts + 3+ case studies missing Article schema** — inconsistent application of existing schema. Author bylines + published/updated dates + Organization publisher markup unlock rich results.
4. **6 case studies underexposed** — These are high-authority trust signals. Surface from homepage, link from job listings and industry pages.
5. **3 insights posts with duplicate H1s** (also flagged in `audits/seo.md`) — single Insights Collection Template fix.

### 2.3 Content gaps vs competitors

Reference `audits/seo.md` §2.4 — `hospitality-group.nl` outranks CM 20× on keyword count. Before launching a content programme, run a competitive gap analysis using SEMRush to identify:
- Keywords they rank for that CM doesn't
- Their top-performing content formats (landing pages vs blog vs service pages)
- Their internal linking density
- Their content update frequency (freshness signal)

---

## 3. Accessibility of Copy

### 3.1 Image alt text

0/1,337 images missing ALT attributes — coverage is complete.

**Remaining opportunity — alt text quality:** Alt attribute presence ≠ useful alt text. Auto-generated or filename-derived alt ("IMG_0234.jpg" or "Screenshot-2025-06-12") passes a presence check but isn't descriptive. Spot-check recommended:
- Sample 20 images across homepage, `/services`, team photos, and a CMS item in each collection
- Verify alt is descriptive, context-appropriate, and meaningful for screen readers + image search
- If quality is poor, prioritise a rewrite pass on hero imagery and team photos (most visible, highest SEO/AEO value)

If quality is fine, this work item is fully closed.

### 3.2 Accessible names on links

Per Lighthouse (all pages):
- Navbar logo
- Search icon
- Confidentiality icon
- Footer logo
- Breadcrumb home link

All lack `aria-label` or visible text. Fix is single-line per element in Webflow.

### 3.3 Form labels

Multiple contact forms site-wide — labels not audited for accessibility. Needs a dedicated form a11y pass.

---

## 4. Brand Voice Consistency

### 4.1 Documented voice (from `brand-voice.md`)

- Premium, discreet, internationally fluent
- Authority without boasting
- Client-obsessed, not candidate-obsessed
- Crisp, formal, slightly old-world European tone
- Never aggressive / salesy / gimmicky

### 4.2 Consistency check — not yet performed

A copy review pass across all 88 pages has not been done. The main risk areas are:
- **CMS-entered copy** — clients often drift from brand voice when filling CMS items
- **Multilingual copy** — translations may not preserve the premium tone (especially machine translations)
- **Job listings** — often written by different team members; voice drift likely
- **FAQs** — often written quickly, can become overly casual

Recommend running `/copy-review` with brand context as a separate workstream in Month 1.

---

## 5. AEO (Answer Engine Optimization)

Covered in depth in `audits/aeo.md`. Summary: **AEO score 3/20 (L1 — Invisible).**

Key content-layer fixes to move from L1 → L3:
1. Restructure FAQ copy as answer-first (one-sentence direct answer, then detail)
2. Add author bylines + dates + updated timestamps to insights
3. Publish at least 3 original data-backed pieces (e.g. "State of UK hospitality hiring 2026")
4. Internal linking: every insight post should link to 2-3 related service/industry pages

---

## 6. Priority Remediation

### P0 — Hygiene (Week 1)

1. Unpublish 7 dev/test pages
2. Fix two CMS collection typos
3. Disable template pages on 7-9 taxonomy-only collections
4. Spot-check alt-text quality on ~20 key images (presence is complete; descriptiveness not yet verified)

### P1 — Accessibility & structure (Week 2-3)

5. If alt-text spot-check reveals poor quality, rewrite hero + team + key CMS images
6. Add accessible names to icon-only links (Lighthouse findings)
7. Form accessibility pass (labels, aria, error messaging)
8. Add author bylines + dates to all insights posts

### P2 — Content depth (Month 2+)

9. Run `/copy-review` across all 88 pages for brand voice consistency
10. Restructure FAQs as answer-first (AEO)
11. Multilingual QA pass — verify 5 non-NL locales have depth
12. Publish 3 original data pieces for authority + AEO citations
13. Competitive content gap analysis vs `hospitality-group.nl`

---

*See main report `reports/intake-report-2026-04-15.md` for context on this audit within the wider remediation programme.*
