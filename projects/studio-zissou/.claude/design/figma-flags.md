# Figma Flags — Studio Zissou
**Generated:** 2026-03-05
**Source:** Figma SZ-Web-Dev-v1.2 (node 1:17)

---

## nav-compass
- **Frame:** Group (1:24)
- **Flag:** No prototype interactions annotated on Dive/Surface/Contact links. Unclear if these are anchor scrolls, page nav, or Barba transitions.
- **Type:** interaction
- **Resolved:** yes
- **Resolution:** Three-way rotary switch. Links are anchors: Surface=home, Dive=below home, Contact=contact. Hover primes switch (~10deg rotation toward link). Click rotates to point at link then smooth-scrolls. Build as reusable pattern for 2/3/4 links.

## nav-compass-animation
- **Frame:** Group (1:24)
- **Flag:** Compass/dial element appears to be an interactive navigation piece but no hover, click, or animation behaviour is specified. Does the dial rotate? Do labels animate?
- **Type:** interaction
- **Resolved:** yes
- **Resolution:** Only the dial rotates — labels stay static. Dial is aria-hidden, links are standard anchors. Rotation skipped under prefers-reduced-motion.

## hero-title-animation
- **Frame:** Page root (1:17)
- **Flag:** "Studio Zissou" and tagline "Designed for warmth. Engineered for depth." have no entrance animation annotated. Given the brand's emphasis on quality and craft, a text entrance animation is likely intended.
- **Type:** interaction
- **Resolved:** yes
- **Resolution:** Character-by-character entrance via GSAP SplitText. Title may become SVG for fluid viewport-width scaling — if so, animate SVG paths instead. Tagline follows after title completes. Format (text vs SVG) TBD. prefers-reduced-motion: show immediately.

## work-clients-hover
- **Frame:** Section (1:38)
- **Flag:** Screenshot shows a preview image appearing next to "Carsa" — implies hover interaction. No prototype annotation specifying: trigger, transition, timing, or whether other clients also have previews.
- **Type:** interaction
- **Resolved:** yes
- **Resolution:** All clients have preview images. Fade in at fixed position (right of centre as shown). No cursor-follow. Carsa screenshot is the hover state example.

## work-clients-link
- **Frame:** Section (1:38)
- **Flag:** Carsa has an ↗ arrow suggesting an external link. Other client names (Skye High, Temper, Ready Hit Play, Compare Ethics) have no arrow. Unclear which clients link out and which are display-only.
- **Type:** variant
- **Resolved:** yes
- **Resolution:** All clients have external URLs. ↗ arrow always present on every row. URL from CMS field.

## work-clients-cms
- **Frame:** Section (1:38)
- **Flag:** Client names look CMS-bound (list of projects). No CMS collection named. Unclear if this is a static list or dynamically populated.
- **Type:** cms
- **Resolved:** yes
- **Resolution:** CMS-bound. Create a Projects/Clients collection with fields: name, preview image, external link URL (optional), display order.

## work-clients-bracket-chars
- **Frame:** Section (1:38)
- **Flag:** Client names wrapped in 〔 〕 characters with specific font feature settings (ss05, ss07, ss10, ss12, case). These may be OpenType alternates specific to PP Rader — need to verify the font supports these features in the web version.
- **Type:** variant
- **Resolved:** yes
- **Resolution:** PP Rader web font confirmed to support all required stylistic sets. No fallback needed.

## decorative-ovals-purpose
- **Frame:** Section (1:125)
- **Flag:** Five oval/pill decorative elements. Purpose unclear — are these interactive, animated (scroll-triggered), or purely decorative spacers?
- **Type:** interaction
- **Resolved:** yes
- **Resolution:** Decorative + animated. Inner SVG flips horizontally (scaleX), cascading right-to-left with stagger. 4s pause then repeat. Ghibli airship "breathing gills" aesthetic. GSAP timeline. Static under prefers-reduced-motion.

## quality-cards-interaction
- **Frame:** Section (1:219)
- **Flag:** Interfaces/Code/Decisions cards have corner pin elements and dashed connectors that suggest an interactive or animated reveal. No prototype interaction specified.
- **Type:** interaction
- **Resolved:** yes
- **Resolution:** Scroll-triggered reveal. Corner pins and dashed lines are decorative — they animate in as part of the reveal sequence. No hover/click interaction.

## quality-cards-scroll
- **Frame:** Section (1:219)
- **Flag:** Section height is 2000px — likely a scroll-driven reveal. No ScrollTrigger or animation timing annotated.
- **Type:** interaction
- **Resolved:** yes
- **Resolution:** Confirmed scroll-driven. 2000px section height accommodates ScrollTrigger timeline for the 3-card staggered reveal.

## contact-form-functionality
- **Frame:** Section (1:327)
- **Flag:** Form fields (Name, Email, Message) shown in postcard design. No form submission behaviour annotated — unclear if this is Webflow native form, custom handler, or third-party integration.
- **Type:** interaction
- **Resolved:** yes
- **Resolution:** Webflow native form. No custom handler.

## contact-form-placeholder
- **Frame:** Section (1:327)
- **Flag:** "awjdn lawj dnkawjbd kawbdkaw bdkawjbd lawj bdlawj bdajwbd .awjbd a" and "a wnka wdkljbd kjawb dklawb dklawd ajb b d" appear to be placeholder/lorem text. Confirm whether this is real content or needs replacing.
- **Type:** variant
- **Resolved:** yes
- **Resolution:** Placeholder lorem. Will be replaced with real copy — content TBD.

## section-width-2000px
- **Frame:** Multiple sections (1:38, 1:125, 1:219, 1:327)
- **Flag:** Sections are labelled "2000px" with measurement rulers, but the page frame appears to be 1440px wide. Unclear if 2000px refers to section height, overflow width for parallax, or design annotation only.
- **Type:** responsive
- **Resolved:** yes
- **Resolution:** Figma annotation only. Ignore — not a real dimension.

## no-mobile-frames
- **Frame:** Page (1:17)
- **Flag:** No mobile or tablet frames detected for this page. All components are desktop-only. Responsive behaviour is unspecified.
- **Type:** responsive
- **Resolved:** yes
- **Resolution:** Infer responsive during build. Desktop-first, sensible stacking/scaling/simplification at tablet and mobile breakpoints.

## color-inconsistency
- **Frame:** Multiple (1:31, 1:329)
- **Flag:** Some body text uses #000000 (pure black) while most text uses #2A2A2A. Unclear if intentional hierarchy or oversight.
- **Type:** variant
- **Resolved:** yes
- **Resolution:** Oversight. All text uses #2A2A2A. Drop the #000000 token.

## footer-not-extracted
- **Frame:** Page (1:17)
- **Flag:** Footer visible in full-page screenshot but not separated as its own frame. Contains copyright, privacy/terms links, and large SZ graphic. Needs manual extraction.
- **Type:** dependency
- **Resolved:** yes
- **Resolution:** Confirmed: © SZ left, Privacy · Terms right, SZ logo/trumpet centre. Simple flex row, no additional content.

## color-palette-corrected
- **Frame:** All (meta)
- **Flag:** Previous extraction (2026-03-05) had wrong colour palette — missing brand-primary (#DECEE9), brand-secondary (#FAE89E), background-darker (#E1E3DC), and border-dark (#737373). Also included #000000 which was an oversight.
- **Type:** variant
- **Resolved:** yes
- **Resolution:** User confirmed correct 6-colour palette. All colour tokens updated in figma-tokens.json. #000000 dropped entirely — all text uses #2A2A2A.

## get-in-touch-cta
- **Frame:** Section (1:327)
- **Flag:** "Get in touch →" text is within the CTA paragraph. Unclear if it's a separate link, a button, or a scroll anchor to the adjacent form.
- **Type:** interaction
- **Resolved:** yes
- **Resolution:** Scroll anchor to contact form, functional on mobile only (form stacks below CTA on mobile). On desktop the form is adjacent so link is not needed.
