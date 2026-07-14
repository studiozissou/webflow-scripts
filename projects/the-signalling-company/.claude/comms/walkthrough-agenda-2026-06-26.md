# Website Walkthrough Call — Agenda

**Date:** Thu 26 June 2026 (morning)
**Attendees:** Will Morley, Romain Hourtiguet

---

## 1. Progress update (5 min)

Where we are against the timeline:
- Build started Mon 23 Jun
- Nav structure proposed (5 items + CTA) — confirm sign-off if not already done
- Template adapted with brand colours, fonts, and REM migration
- Background structural work done (REM migration, colour variables, layout groundwork)
- First build preview shared Wed 25 Jun (today/yesterday)

Set expectations:
- **No images added yet** — need more time to go through the image library and content doc to select images that fit each section. This is a next-step, not an oversight.
- **UI still being refined** — visual alignment with branding is in progress. Build time has been weighted toward structure and getting pages functional first; visual polish comes next.

Blockers to flag:
- Homepage copy status — was the critical blocker. Did it arrive?
- RailOS page copy — the platform story is the differentiator and needs final text
- Leadership bios, headshots and linkedin links — needed for the Leadership page
- Any outstanding assets (product photos, team headshots, partner logos for trust bar)

---

**Feedback framing:** Ask Romain to focus feedback on content and structure at this stage — not visual polish, spacing, or image choices, since those are still in progress. Pixel-level refinement comes after content is locked.

---

## 2. Page-by-page walkthrough (20 min)

Walk through each page in the preview, noting what is built, what is placeholder, and what needs client input.

**RailOS pages**
- RailOS Overview — **not built yet**. Don't have enough content to build this page. Need the platform narrative from Romain before this can progress. This is the most important page on the site — it tells the RailOS story and differentiates TSC from incumbents.
- RailOS Apps — ATP application grid
- RailOS Devices — hardware catalogue
- Open RailOS — developer program, ADK
- RailOS App Store — "coming soon" email capture
- Key question: Is the RailOS dropdown order correct (Overview > Apps > Devices > Open > App Store)?

**Products**
- Product sections: ETCS, TOBA Box, PZB, KVB, TBL1+, wSTM
- Key question: Are the product descriptions finalised, or do any need revision based on the earlier feedback (lead with benefit, not architecture)?
- Key question: Do we have product images/diagrams for each, or are we using placeholders?

**Services**
- Five service sections: Retrofit Assessment, Homologation, Installation & Commissioning, Training, Maintenance
- Key question: Are specific CTAs per service OK ("Request a retrofit assessment" etc.), or does Romain want a single generic CTA?

**Projects**
- Lineas HLD77, Skoda/RegioJet, Akiem BR189 case studies
- Key question: Do we have the challenge/solution/result structure and hard numbers for each? Any customer quotes available?
- Key question: "Projects" vs "Our Projects" — final decision needed

**Company pages**
- About Us — founding story, values, Skoda Group
- Leadership — 8 COMEX bios
- Careers — values + contact/LinkedIn link
- Key question: Is "Insights & News" OK under the Company dropdown, or does the marketing team want it at top level?

**Homepage**
- Hero, trust bar, value props, featured case study, RailOS teaser, CTA
- Key question: Is the hero copy confirmed? ("Safety-critical signalling, software-defined" was proposed)

**Contact**
- Form with segmented intent options
- Key question: Where should form submissions go — email, or hold for Odoo CRM integration later?

---

## 3. Cross-linking plan (5 min)

Explain the internal cross-linking strategy I'll be putting in:
- Product pages link to relevant RailOS Apps sections (and vice versa)
- Case studies reference the specific products and services used
- Services page links to relevant case studies as proof
- RailOS overview links down to Products for the "what you actually buy" journey
- Footer deep links to anchor sections on Products and Services pages
- Every page has a contextual CTA that routes to Contact

This improves both UX (visitors find related content) and SEO (internal link equity flows between related pages).

---

## 4. Feedback workflow — Webflow comments (5 min)

- Set up Romain as a collaborator on the Webflow project during the call
- Walk through how Webflow comments work: click any element, leave a comment, tag Will
- This replaces email/doc feedback — comments are pinned to the exact element
- Agree on a feedback deadline (e.g. end of day Friday 27 Jun, implementation Mon 29 Jun)

---

## 5. Final copy needs (10 min)

**Priority 1 — blocks go-live:**
- RailOS Overview page copy (the platform narrative)
- Homepage hero + subheading + value proposition bullets
- Any remaining product descriptions not yet finalised

**Priority 2 — important but can be refined post-launch:**
- Fleshing out thinner pages: Careers detail, FAQ content, individual case study results
- Leadership bios — even short versions are fine for launch
- Insights articles — existing WordPress posts can be migrated post-launch if needed

**Timeline reminder:**
- Mon 29 Jun — feedback implementation
- Tue 1 Jul — meta titles and descriptions written
- Wed 2 Jul — full site review call
- Thu 3 Jul — final fixes, QA, DNS call
- Mon 7 Jul — go live

---

## 6. Copy note — drop "Our" from page titles and nav (2 min)

The content doc uses "Our Tech", "Our Products", "Our Projects" throughout. Recommend dropping "Our" everywhere — it adds nothing, sounds self-referential, and clutters the nav. "Products" is cleaner than "Our Products". "Projects" is tighter than "Our Projects". Apply this as a general rule across all headings and nav labels.

This also settles the "Projects" vs "Our Projects" question from the nav proposal.

---

## 7. WordPress migration — URL redirects (3 min)

The 7 WordPress blog articles are already migrated into the Webflow CMS (content, images, and press release PDFs). What still needs doing is **301 redirects** from the old WordPress URLs to the new Webflow equivalents — otherwise Google drops the indexed rankings.

- Will map old WordPress URLs to new Webflow slugs and set up redirects before launch
- Need the full list of any other indexed WordPress pages beyond the 7 blog posts (e.g. old /about, /services, /contact pages) — ask Romain to share or confirm

---

## 8. CEO sign-off (2 min)

Alex owns the brand vision. Need to clarify:
- Is Romain the sole decision-maker, or does Alex need to review and approve before go-live?
- If Alex is in the loop, when should he see the site? Better to schedule one review now than discover a second approval round in week 3.

---

## 9. Open items / AOB (5 min)

- Adobe Fonts API key — has IT provided this?
- Brand book — has the final version been uploaded to Teams?
- Video assets — recommend video on flagship pages only: **Homepage** (hero background or featured case study), **RailOS** (platform overview or architecture explainer). Other pages work fine with stills. Does TSC have existing footage, or does Romain need to source/commission?
- Gated content PDFs (datasheets/brochures) — any ready for launch, or all post-launch?
- Privacy policy — does TSC have a GDPR-compliant text, or do they need one drafted?

---

**Total: ~55 min**
