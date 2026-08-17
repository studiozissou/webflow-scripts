# Carsa Service Migration — Build State (resume here)

**Last updated:** 2026-07-14
**Spec:** `carsa-service-migration.md` · **Copy:** `carsa-service-copy-deck.md`

## Key Webflow IDs
- **Site:** `68348ea61096b37caacd2f95` (Carsa, workspace `67caba0c5c72084908790f0b`) · staging `carsa-v2.webflow.io`
- **Service Locations collection:** `6a568b68696eee98efe09c8a` (slug `mot-and-car-servicing`)
  - fields: `linked-store` (Ref→Stores), `acuity-calendar-id`, `seo-title`, `seo-metadescription`, `hero-title`, `hero-description`, `services-offered` (RichText), `hiq-enabled` (Switch), `name`, `slug`
- **Stores collection:** `68429a3b6fa9a12bf88fb7d1` — added `linked-service-page` (Ref→Service Locations)
- **Service Locations template page (auto-created, bound):** `6a568b69696eee98efe09cb1` (slug `detail_mot-and-car-servicing`)
- **Hub page** `6a569126abdef374eb6fa840` (⚠️ now `draft=false` — confirm noindex before any publish). Rebuilt by user with reusable components (my earlier native hero/callout/badges were replaced). Current order in `main-wrapper`:
  1. `C – Page Header Blue` (def `c7a2daa1-8de5-8b40-8842-405dbb92bde6`) — H1 "MOT & Car Servicing from £39" + intro. Book Now (Link 1) **has no destination yet**.
  2. `C – Pricing Servicing` (def `86eadd8f-430c-62e4-18f0-7cca0639af38`) — user's pricing. Links 1–4 all `#`.
  3. `section_store` `#locations` (`d3b21174-…-f6b5`) — heading now "Service your car at a Carsa store near you" (⚠️ verify bound/filtered to the 5 Service Locations, not generic Stores).
  4. `C – HiQ` (def `2f2123cd-40d7-6d52-a40d-d82c3db886f2`) — partnership callout; Image = HiQ logo asset `6a5699b60028a53bc5fad417`.
  5. `C – Service Features` (def `2b2563b5-3bb4-67c8-cb3d-116fca2d6789`) — "Why drivers choose Carsa" + 6 features (⚠️ see defects).
  6. `C - Testimonials Trustpilot` · 7. `section_faq` "FAQs" · 8. `C - CTA` (generic car-search leftover) · 9. `C - Get In Touch` (leftover).
- **Location template** `6a568b69696eee98efe09cb1` (slug `detail_servicing-locations`, renamed "Service Locations Template"). Built by user. Sections: `C – Page Header Blue` (CMS hero) → `section_acuity` `#book` (`5c2c29c7-…-16b1`, Acuity embed) → `section_product-header7` → `section_store-contact` (Email / Phone / Opening times / Visit us + map) → `section_store` `#locations` "Service your car at other Carsa stores" (cross-sell) → `section_faq` → `C – Service Features` (Book now → `#book`) → `C – HiQ` → `C - Testimonials Trustpilot` → `C - CTA` (generic leftover) → `C - Get In Touch`.

### 5 Service Location draft items → Store IDs (linked both ways)
| Location | SL item | Store | Acuity | Region |
|---|---|---|---|---|
| Halesowen | `6a568bf78511400b7a45844c` | `684ff41b5818abf9f345fdb4` | 11436415 | West Midlands |
| Cannock | `6a568bf78511400b7a45844e` | `684ff2ea4cb99a864fa50b4a` | 11436354 | West Midlands |
| Bolton | `6a568bf78511400b7a458450` | `684ff2eabd2353f3f9fc93e2` | 11436404 | North West |
| Towcester | `6a568bf78511400b7a458452` | `684ff2a15818abf9f345bbd7` | 11718661 | East England & East Midlands |
| Mountsorrel | `6a568bf78511400b7a458454` | `684ff218239ffc04b02d982e` | 13865154 | East England & East Midlands |

- **`region` ref field** (`b4c6cb730fd1d58f3b1d9fae31f854a7` → Regions `68b1b7480122cf5e891a07bb`): populated on all 5, mirroring the linked Stores' region. Region item IDs: West Midlands `68b84fb8953d239d6fe96e29`, North West `68b84fb8e6083e503d2a7a24`, East England & East Midlands `68b84fb8bd744810df94acc9`.
- **`hero-title` + `hero-description`:** populated on all 5 from the copy deck (2026-07-14). Still null: `seo-title`, `seo-metadescription`, `services-offered`.

## Reusable brand components (Carsa library)
- Hero: `C - Landing Hero` `4db738e8-1bf5-53bc-3d4e-477f03469dff` (Heading, Subheading, Image, Button 1/2, USP 1–6)
- Cards: `C - Cards` `aeb927e3-abbf-7716-2daa-70d563fa334a` (grid: Tagline/Heading/Subheading + Card 1–4, each Tag/Heading/Copy/2 buttons)
- FAQ: `C - FAQ` `a5f91d5a-047d-3582-2cde-4437a2cbb4f8`
- Reviews: `C - Testimonials Trustpilot` `d123aaa2-30bc-de85-25b1-3d1e8f9a4efb` (B10 = use this)
- Car-care overview page (pattern ref): `687df779a0540d1fc2eae689` · Stores page `684295960de21f7c1c3bba1c`
- **No partnership-callout component exists** → build new (Task 7)

## Brand tokens
- Purple `#511e62`, Deep purple `#32044b`, Lime `#e4ff80`, Pink tints `#faf3ff`/`#f6e6ff`
- Font: **Plus Jakarta Sans only** (user: no DM Mono)
- Site radius var = 0, BUT user wants pricing **cards 1.5rem, buttons rounded** (reuse Carsa button class)

## DONE
- CMS foundation (Tasks 1–3) ✅ · SKILL.md embed carve-out (Task 20) ✅
- Repo artifacts: `projects/carsa/acuity-embed.js`, 3 schema templates in `projects/carsa/schema/`, copy deck ✅
- MOT+Service £30 resolved: MOT is £30 when a full service is booked (verbatim from live site)
- **5 Service Location CMS items:** `linked-store`, `acuity-calendar-id`, `region`, `hero-title`, `hero-description` all populated ✅
- **HiQ logo asset** uploaded (`6a5699b60028a53bc5fad417`, `hiq-logo.svg`) and wired into the `C – HiQ` component ✅
- **Hub page** rebuilt by user with reusable components (Page Header Blue, Pricing Servicing, locations, HiQ, Service Features, Testimonials, FAQ) ✅ — see structure above
- **Location template** built by user (Page Header hero, Acuity booking `#book`, product header, store contact details + map, other-stores cross-sell, FAQ, Service Features, HiQ, Testimonials) ✅ — see structure above

## PENDING / NEXT

### A. Defects & cleanup found in the 2026-07-14 scan
- ⚠️ **B2 violation — hardcoded review count.** `C – Service Features` Text 2 = *"Rated Excellent on Trustpilot based over 9700 reviews."* Remove the number (component default → fixes hub **and** template in one edit).
- ⚠️ **Placeholder content live.** `C – Service Features` has empty cards: Title 8/9/10 = `<heading>`, Text 7/8/9 = `<copy>`, Image 1/2/3 null. Hide or fill.
- **Generic `C - CTA`** ("Search for your next car / Search cars") still on hub AND template — remove or repurpose to a service CTA.
- **`C - Get In Touch`** leftover on hub AND template — decide keep/remove.
- **Dead CTAs.** Hub Page Header "Book Now" (Link 1) has no destination; `C – Pricing Servicing` Links 1–4 all `#`. Point to `#book` / `#locations` / booking.
- **Verify hub locations grid** (`section_store`) is bound/filtered to the 5 Service Locations and links to `/mot-and-car-servicing/{slug}` — heading reworded but binding unconfirmed.
- **Verify Acuity embed** in template `section_acuity` uses the CMS `acuity-calendar-id` binding (owner 33396621).
- **Heading hierarchy (minor).** Template location-detail labels (Email/Phone/Opening times/Visit us) are H2 w/ `heading-style-h6`; copy deck wants H3.

### B. Content still to add
- CMS: `seo-title`, `seo-metadescription`, `services-offered` (RichText) still null on all 5 — copy deck SEO is ready to paste.
- Reviews: add "What our customers say" heading + intro if the Testimonials component doesn't carry it.
- FAQ: reword "FAQs" → "MOT and servicing questions, answered"; populate FAQ collection with the service Q&A (filter list to service FAQs; Carsa/Tomek supply final).

### C. Still to build
- **Winter Health Check page** `/mot-and-car-servicing/winter-health-check` — NOT created yet. Copy in deck §3, schema template in repo.
- **Cross-sell block** on service-enabled Store pages (copy deck §4, "MOT & Servicing Available Here").
- **Schema writes** (hub / location template / winter) via `bulk_update_pages_schema_markup` — ⚠️ fix `openingHours` RichText binding first (bind plain `opening-times` or reformat).
- **Page SEO metadata + OG** for hub, template, winter.

### D. Publish guardrails
- ⚠️ Hub page is now `draft=false` — **confirm noindex** is set before it can publish. Keep all new pages **noindex until user approves**; publish to **staging only**. Sitemap auto-updates; 301s are manual.
