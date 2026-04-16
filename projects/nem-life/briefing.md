# NEM Life — Client Briefing (captured 2026-04-16)

**Source:** https://alexanderreus.notion.site/Briefing-Webflow-development-288c706b69c0804a8a02f898d45f8b23
**Last update (per brief):** 2026-04-15
**Status (per brief):** Design is final. Ready for development.

> Captured via Chrome DevTools because Notion public API was unavailable and the page is a JS SPA that doesn't respond to plain WebFetch. This is a verbatim-ish extract — images and Figma links are referenced but not embedded.

---

## 1 — Project context

### 1.1 About NEM Life
Psychology-based brand helping people move from emotional complexity to clarity.
Brand stands for **structure, orientation, practical guidance** — not hype, not therapy-heavy, not abstract theory.

Website must reflect:
- Clarity over clutter
- Structure over overload
- Direction over reflection-only

Tone: calm, grounded, confident. Avoid dramatic design, excessive animation, clinical presentation.

### 1.2 Target audience
**Primary:** emotionally intelligent women 35–55, reflective, seeking clarity in relationships and personal growth. Internal persona name: **"Anna"**.
Also appeals to men with similar needs.

### 1.3 Tone of voice
Warm, intelligent, grounded. Speaks to the heart with clarity and direction.

### 1.4 Logo & slogan
- "NEM" — Artford Regular
- "Life" — Goldney Alt Slanted
- Slogan: **Break through. Move forward.**

### 1.5 Copy
All web copy and stock photography overview live in a separate doc: "NEM web copy" (not accessed yet).

---

## 2 — Scope

Build a clean, scalable, CMS-driven Webflow foundation. Design system and visual structure are **finalised in Figma**. Anything not described here is out of scope unless agreed separately.

### Pages to develop
**Core pages**
- Home — PREPARED
- Content page template ("NEM Methode") — PREPARED
- Our Mission — PREPARED
- Link-in-bio (Christel) — PREPARED
- Blank page (Privacy, T&C, Cookie) — DONE

**CMS-driven**
- Blog Insights main — PREPARED
- Blog Insights category page — (status not explicitly labelled)
- Blog Insights item page — 📋 TO BUILD
- Experiences main — PREPARED
- Experiences item page — 📋 TO BUILD

---

## 3 — Technical & structural foundations

- **Webflow only**; Client-First class methodology; reusable components; no inline styling; no custom code unless strictly necessary; mobile-first
- **Grid:** max-width 1440px; 12-column; consistent spacing
- **Images:** WebP where possible; responsive sets; CSS gradients (not image gradients); preload above-the-fold hero
- **Multi-language:** Localization ACTIVATED. NL visible, EN hidden at launch. URLs `/nl/…` and `/en/…`
- **CMS:** Two live collections at launch — Insights (articles) and Experiences (testimonials). Both need categories + tags for filtering and clustering.

---

## 4 — Platform systems

### 4.1 SEO & GEO
- Follow index/no-index rules from the separate "Index website" doc
- Only main content pages + CMS items indexable
- Single H1 per page; logical H1–H4 hierarchy; no skipped levels
- Full metadata: meta title, meta description, OG title/description, social share image
- Metadata editable in CMS where applicable
- Schema.org: Article, Organization, FAQPage; validate before publishing
- **GEO requirement:** ALL essential text in DOM at page load. No dynamic text injection. Expandable sections use CSS-only collapsing.

### 4.2 Navigation & notification bar
**Nav** ⚠️ Prepared: sticky, subtle shrink-on-scroll, smooth, responsive, About/Over submenu still to be refined.
**Notification bar** ✅ Built: separate component above navbar; editable text+CTA; simple show/hide per page; no CLS; no navbar overlap on mobile.

### 4.3 Headers (4 variants)
- **Large "hero" header** ⚠️ styling + right images (home)
- **Medium header** ⚠️ styling + right images (NEM Method, Our Mission, About, Therapy, Couples therapy)
- **Small header** ✅ Built (overview/secondary pages)
- **No header** ✅ Built (text-only: Privacy/T&C/Cookie)

---

## 5 — Home page (⚠️ Prepared)

### 5.1 "Wat als je blijft wachten?" section ✅ Built
- Desktop: 3 images with muted/lightened default state; hover restores original colour; transition = smooth fade only (no scale/move)
- Mobile: no hover
- After hover sequence (or on page load with slight delay): "Maar het hoeft niet zover te komen…" fades in below images
- Trigger: page load + short delay OR after hover sequence completes. No slide-in.

### 5.2 "Doorbreek je patronen met een aanpak die werkt" (123) ⚠️
- 3 cards fade in sequentially on scroll-into-view
- No slide, no scale, no movement — just fade
- After last card: supporting line "Dit is de NEM Methode — onze aanpak gebouwd op drie pijlers: 123" fades in

### 5.3 FAQ accordion ✅ Built
- Item 01 open by default
- One item open at a time (other closes when you open another)
- +/- icons
- **All answers present in DOM at load. CSS-based collapsing only.**

### 5.4 Insights preview (blog cards) ⚠️
Category-based logic, not latest-6.
Categories:
- Relaties & Verbinding
- Patronen & Emoties
- NEM Methode
- Leefstijl & Welzijn
- Over NEM Life

Per category:
- 1 Essential Insight (manual toggle in CMS)
- 2 latest articles (auto, sorted newest first, exclude Essential)

Total shown: 9 preview items (3 per category, per briefing — note: 5 categories listed so may mean 15 OR briefing expects only 3 categories active).

---

## 6 — NEM Methode (⚠️ Prepared)
- Card scroll-in animation (same treatment as home 5.2)
- FAQ identical to home 5.3

## 7 — Our Mission ✅ Built

## 8 — Blank page ✅ Built

## 9 — Link-in-bio (Christel) ⚠️
Activate NEM Methode + NEM Life CMS-driven blog card sections (2 manually selected articles each).

## 10 — Blog Insights main page ⚠️

### 10.1 Sticky categories bar
Horizontal nav below navbar. Navigation-based (not filter-based). Clicking a category takes you to that Category page.

### 10.2 Feature item
"Essentieel inzicht" — one manual toggle per article, only one allowed per main page.

### 10.3 Selected Insights
Exactly 3 manually curated, manually orderable, independent from other logic.

### 10.4 Insights per category
For each of the 4 main categories: show latest 3 articles + CTA button to that category page.

### 10.5 Populaire inzichten
Exactly 3 manually curated articles.

---

## 11 — Blog Insights Category page
Same structural logic as main. At launch: 5 categories (Relaties & Verbinding, Patronen & Emoties, NEM Methode, Leefstijl & Welzijn, Over NEM Life).

- **11.1 Header:** active category bold in sticky bar; H1 = category name; 1-line intro
- **11.2 Feature item** (Essentieel inzicht, 1 manual toggle)
- **11.3 Selected items** (3 manual)
- **11.4 All category items:** 6 visible default (2×3); lazy load; "Toon meer inzichten" reveals next 6; NO pagination; NO carousel
- **11.5 Popular insights** (3 manual toggle)
- **11.6 Theme items, tag-based:** up to 3 tag blocks per category; each block: title "Veel gelezen: [tag]", optional 1-line intro, 3 articles left/centre/right; empty blocks hidden
- **11.7 CTA section** (same as content page template)

---

## 12 — Blog Insights Item page (📋 TO BUILD)
Two-column: side panel + main content + bottom CTA.

### 12.1 Side panel
- Category badge
- Tags (clickable)
- Share this article ("Share & Care")
- Key insights (max 3 bullets)
- Highlighted quote "Kerninzichten" (optional, text-only)
- Self-test CTA (optional, specific copy)
- Related insights (title only, max 3 links)
- **Sticky on desktop; collapses below main on mobile**

### 12.2 Main content panel
- H1 title
- Intro paragraph
- Feature image (centered, not full-width)
- Modular body blocks: H2/H3, paragraph, optional images/quotes/mid-page CTAs
- Bottom summary "De essentie" (optional, max 3 bullets with checkmarks)
- No visible author or publish date

### 12.3 CTA section (reusable, same as content page template)

---

## 13 — Experiences main page ⚠️

### 13.1 Sticky filter bar
Single-select filter: "Journey type" = Therapy / Couples therapy. Default = none selected (all visible). Selected label bold; non-selected visually de-emphasised but clickable.

### 13.2 Experience list
- Desktop: 3 col × 2 rows = 6 cards
- Tablet: 2 col
- Mobile: 1 col
- "Lees meer verhalen" text-link reveals more (no pagination/reload/carousel)
- Hover: subtle olive-green tint on entire card (desktop only)

Card structure:
- Quote (line-clamp max 3 lines)
- Initial (1 char of first name)
- Age | Sex | Journey type (e.g. "36 jaar | Vrouw | Relatietherapie")
- CTA — dynamic by sex: "Lees haar verhaal" (F) / "Lees zijn verhaal" (M)

---

## 14 — Experiences Item page (📋 TO BUILD)

### 14.1 Header
- H1 = essence of testimonial, written by NEM Life team, max 2 lines
- Intro = same short quote as preview card

### 14.2 Content
- Pure text only (no images, no embeds)
- Single readable column
- Natural paragraph breaks preserved
- No quotation marks / decorative quote styling
- Fully in DOM at load (no lazy, no collapse)
- Author name (if shown) appears once at end, subtle styling

---

## Status legend (from brief)
- ✅ **Built** — implemented on **desktop**. **Mobile alignment still required** before the section can be considered complete.
- ⚠️ **Prepared** — implemented but contains open feedback/corrections to apply.
- 📋 **To build** — not yet implemented.
