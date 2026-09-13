# Oost — launch checklist
**Source:** `oost-digital-launch.md` (spec) and `reports/2026-09-12-exec-summary.md`. Every recommendation in those two documents appears here once. Tick as done; nothing ships with an open box in sections 1–8.

## 1. Decisions from the client
- [ ] Name is `Restaurant Oost` on the sign, receipts, KvK trade name and GBP — decided (matches the logo lockup)
  - [ ] "Indonesisch" appears as text somewhere on the shopfront (window, A-board, or a line under the logo on the gevelbord) — the mask says it visually, Google can't read that
  - [ ] BOIP trademark register searched (boip.int/nl/merkenregister) — no blocking mark
- [ ] Address confirmed
  - [ ] Is it in Haarlem-Oost? If yes, "Haarlem-Oost" becomes an on-page term (home, afhalen, GBP description)
- [ ] Opening hours per day, incl. Sunday
- [ ] Delivery — assumed no; confirm
- [ ] Formitable budget (~€69–119/mo) approved, or Eet.nu fallback chosen
- [ ] Instagram owner named in the family
- [ ] Family names, phone/WhatsApp number, opening date
- [ ] Family photos: kitchen, hands, the recipe book, the room
- [ ] Rijsttafel details: minimum persons, number of dishes, lead time
- [ ] Catering: minimum persons, radius, pickup vs delivered

## 2. Name, domain, NAP
- [ ] One canonical NAP string written down (name, street + number, postcode, city, phone) — used verbatim everywhere below
- [ ] Domain: `oosteeten.nl` (client owns it) — DNS pointed at Webflow, SSL on
  - [ ] `oosteten.nl` (single e) registered as a typo redirect
  - [ ] `oosthaarlem.nl` defensive redirect, if still free
  - [ ] `.com` of the primary
  - [ ] All redirects → primary with 301
- [ ] Business email on the domain (for GBP, Formitable, form notifications)
- [ ] KvK registration done; trade name matches the sign

## 3. Website — structure
- [ ] Webflow Premium site plan, billed annually
- [ ] Localization Essential, one `en` locale, billed annually
  - [ ] Whole site published in `en`; CMS fields and Instellingen localised, not duplicated
  - [ ] English translation is a later, separate task — machine-translate then hand-edit; dish names stay Indonesian, "saté" → "satay"
  - [ ] hreflang `nl` / `en` / `x-default` verified on every page
  - [ ] Language switch in nav (NL / EN), same position on every page
- [ ] Pages: `/`, `/afhalen`, `/catering`, `/over-ons` (+ `/en/…` for each)
  - [ ] Full menu on the homepage at `#menukaart` — no separate menu page (14 dishes)
  - [ ] No blog, news, gallery, contact or reviews page
- [ ] Nav: Menukaart (anchor → `/#menukaart`) · Afhalen · Catering · Over ons · Reserveren (button) · EN
  - [ ] Reserveren opens the Formitable overlay on every page — not a page
- [ ] Footer: NAP, WhatsApp link, hours (CMS-bound), Google Maps route link, Instagram, KvK number
- [ ] Client First class naming; no jQuery, no GSAP, no Barba, no custom JS beyond embeds
- [ ] Brand assets from the client (`assets/oost_horizontal.png` is the reference)
  - [ ] Logo as SVG: horizontal lockup, stacked lockup, mask alone, wordmark alone; white and ink versions
  - [ ] Favicon and app icon = the Barong mask alone (reads at 32px; the wordmark doesn't)
  - [ ] OG / share image: mask + wordmark on ink, 1200×630
  - [ ] Logo referenced in the `Restaurant` schema `logo` field
- [ ] Type: the wordmark's light high-contrast serif matched with Cormorant Garamond (Google Fonts) for headings only; one clean sans for body and the menu (prices must be legible at 15px on a phone). Two families max, both with fallback stacks
- [ ] "RESTAURANT" small-caps descriptor style from the logo reused for eyebrows and section labels
- [ ] Palette: rice paper `#F3EDE0` / ink `#1E1B18` / indigo `#2E3A67` / pandan `#4F7A3A` (see mymind note "Oost colour palette")
  - [ ] Pages light (rice paper ground) for menu legibility; header and footer bands in ink so the white logo lockup sits as designed
  - [ ] Indigo for links and buttons only; pandan for badges and small highlights only
- [ ] Images AVIF via `/optimise-images`; alt text names the dish or the person
- [ ] Mobile LCP < 2s; Lighthouse ≥ 95 on all four categories for `/`
- [ ] FAQ accordion uses `<details>`, no JS
- [ ] Forms: Webflow native, honeypot field, reCAPTCHA off, notifications to family email

## 4. Website — CMS (what the family edits)
- [ ] Collection `Secties`: naam, intro, volgorde
- [ ] Collection `Gerechten`: naam, sectie (ref), beschrijving NL, beschrijving EN (optional), prijs, vegetarisch, pittig, uitverkocht, volgorde
  - [ ] `uitverkocht` toggle shows an "op" badge and sets `availability: SoldOut` in schema
  - [ ] Every dish has a real two-line description — dish name, method, one concrete detail (this is where dish + Haarlem terms live)
- [ ] Collection `Instellingen` (single item): adres, telefoon, WhatsApp, openingstijden ma–zo, Formitable ID, Google review URL, Instagram URL
  - [ ] Bound to footer, homepage hours block, `/afhalen` hours block **and** the JSON-LD embed — one edit updates all four
- [ ] Editor roles set so the family can edit collections and static text only
- [ ] 30-minute handover session booked
- [ ] One-page guide written: mark sold out, change a price, change hours

## 5. Website — schema (JSON-LD, CMS-bound embeds)
- [ ] `/`: `Restaurant` with `name`, `servesCuisine: Indonesian`, `address` (exact NAP), `geo`, `telephone`, `priceRange`, `openingHoursSpecification` from Instellingen, `acceptsReservations`, `hasMenu` → inline `Menu` → `MenuSection` → `MenuItem` from the Gerechten collection list, `offers.price` per item, `sameAs` [GBP, Instagram, Facebook, Eet.nu, TheFork, Tripadvisor]
- [ ] `/`: `FAQPage` from the homepage FAQ (restaurant-level questions)
- [ ] `/afhalen`: `FAQPage` from the takeaway FAQ — different questions from the homepage, no duplicates
- [ ] Generated with `/generate-schema`; validated with `/test-schema` (Rich Results Test, zero errors) on both pages
- [ ] Re-validated once after the family makes a live edit during handover

## 6. Website — copy (per page; spec §3 has the drafts)
Rules for all pages:
- [ ] Voice: warm, direct, first person plural, `je`, no marketing adjectives
- [ ] "familie" appears once per page, naturally
- [ ] Dish names in Indonesian, never translated; Dutch spellings: rijsttafel, saté, bami, gado-gado, afhalen (not bezorgen unless true)
- [ ] Every title tag contains "Oost", either "Indonesisch restaurant" or "| Restaurant Oost", and "Haarlem"; no bare "Oost" title anywhere
- [ ] Every page has a unique meta description ≤ 155 chars
- [ ] Placeholders `[…]` all filled; `/humanizer` pass done
- [ ] "Haarlem-Oost" added where relevant per decision 1

`/` Home
- [ ] Title `Oost – Indonesisch restaurant, rijsttafel & afhalen in Haarlem`
- [ ] H1 `Indonesisch eten zoals bij ons thuis, midden in Haarlem`
- [ ] Intro paragraph (family, how you cook, three ways to eat)
- [ ] CTA row: Reserveer een tafel (widget) · Afhalen · App ons (wa.me)
- [ ] "Menukaart" section, `id="menukaart"`, full menu CMS-fed
  - [ ] Intro incl. the five national dishes sentence (gado-gado, soto, saté, nasi goreng, rendang — 2018)
  - [ ] Allergy line
  - [ ] Sections in order: Rijsttafel · Vlees & vis · Vegetarisch · Rijst & bami · Zoet (if any)
  - [ ] Section intros; Haarlem mentioned once across the menu, not in every section
  - [ ] Every dish: name, two-line description, price, badges vegetarisch / pittig, sold-out badge
  - [ ] Closing line → afhalen
  - [ ] Never a PDF or image menu; print stylesheet for the section
- [ ] "Vanavond eten?" — hours, address, route link, reserveer button, "vrijdag en zaterdag wel verstandig" line
- [ ] "Wat gasten zeggen" — three Google reviews as text, first name + "via Google", no widget
- [ ] "Veelgestelde vragen" — nine restaurant-level FAQs (reserveren, rijsttafel, pittig, vegetarisch, kinderen, zondag, adres/parkeren, groepen, allergieën); `<details>`; FAQPage schema
- [ ] "De familie" — one paragraph, kitchen photo, link to over-ons

`/afhalen`
- [ ] Title `Indonesisch afhalen in Haarlem – rijsttafel, nasi & saté | Restaurant Oost`
- [ ] H1 `Indonesisch afhalen in Haarlem`
- [ ] "Zo werkt het" three steps; wa.me button with prefilled "Hoi, ik wil graag afhalen:"; bel button
- [ ] "Rijsttafel afhalen" block with persons, dishes, lead time
- [ ] "Afhaaltijden" CMS-bound
- [ ] FAQ: zondag · bezorgen · hoe ver van tevoren · vegetarisch — answers match decisions in §1

`/catering`
- [ ] Title `Indonesische catering in Haarlem – rijsttafel voor je feest | Restaurant Oost`
- [ ] Two paragraphs (share, occasions, radius, minimum, pickup or delivered; what to tell us, reply within a day)
- [ ] Form: naam, e-mail, telefoon, datum, aantal gasten, bericht
- [ ] "Liever eerst bellen?" line

`/over-ons`
- [ ] Title `Over ons – de familie achter Oost, Indonesisch restaurant in Haarlem`
- [ ] "De Oost" origin paragraph; who does what; "geen keten, geen foodhall"; "als de rendang op is, is hij op"
- [ ] Real family photos only, alt text with names
- [ ] CTAs: Reserveer een tafel · Bekijk de menukaart (→ `/#menukaart`)

## 7. Google Business Profile
- [ ] Created under the business email; video verification completed
- [ ] Name = `Restaurant Oost`, exactly as on the sign (no keywords added)
- [ ] Primary category `Indonesisch restaurant`; secondary `Afhaalrestaurant`, `Cateringservice`
- [ ] Address, service area (for catering), phone, website (primary domain), hours incl. Sunday, holiday hours
- [ ] Reservation link → Formitable; menu link → `/#menukaart`; order link → `/afhalen`
- [ ] WhatsApp number linked for chat
- [ ] Description (750 chars): family, Indonesian, Haarlem, rijsttafel, afhalen, catering, [Haarlem-Oost]
- [ ] Attributes: vegetarian options, pin/contactless, takeaway, reservations, [wheelchair]
- [ ] GBP menu populated with every section and dish name (mirrors the homepage menu)
- [ ] 20+ photos at launch: exterior, interior, 8 dishes, family, menu board; each dish photo captioned with the dish name
- [ ] Logo and cover image
- [ ] "Ask for reviews" short link generated → used for all QR codes
- [ ] First Post scheduled: "We zijn open"
- [ ] Search Console verified via the GBP-linked domain

## 8. Bookings, automation, privacy
- [ ] Formitable account (Zenchef NL), Dutch UI
  - [ ] Widget script in site `<head>`; `[data-formitable]` buttons in nav and hero, both locales
  - [ ] Takeaway module configured (so takeaway orders also trigger the review email)
  - [ ] Review verzoek e-mail switched on, Google review link inserted, timing default (next morning dine-in, same evening takeaway)
  - [ ] Booking form disclosure text set: "Na je bezoek sturen we je één mail met de vraag hoe het was, en af en toe nieuws van Oost. Afmelden kan altijd."
  - [ ] Optional unticked WhatsApp-updates checkbox; nothing pre-ticked
  - [ ] Unsubscribe link present in every outgoing email template
  - [ ] Test booking completed on iOS Safari and Android Chrome
- [ ] Fallback only if Formitable declined: Eet.nu widget (€0.25/booking)
- [ ] TheFork listing created (free, no marketplace booking flow yet); revisit at month 3
- [ ] wa.me links tested on a phone with prefilled text
- [ ] Catering form submissions arrive at the family email

## 9. Review mechanism
- [ ] Bedankt-kaartje designed and printed
  - [ ] Front: "Bedankt voor je bezoek. 10% korting op je volgende maaltijd — laat dit kaartje zien." — given to **everyone**, no condition
  - [ ] Back: QR to Google review link + "Vond je het lekker? Een Google-review helpt een klein familiebedrijf enorm." + "Vertel gerust wat je at."
  - [ ] Staff briefed: card goes with every bill and every takeaway bag
- [ ] Table QR stand (or QR on the last menu page) → Google review link
- [ ] Staff line agreed: "Als het lekker was, een Google-review helpt ons echt."
- [ ] Never: discount conditional on a review · asking only happy guests · showing the link only after positive feedback
- [ ] Reply to every Google review within 48h — family member assigned; done from the phone
- [ ] Homepage quote swapped quarterly

## 10. Listings and footprint (identical NAP everywhere)
- [ ] Apple Business Connect (Apple Maps, Siri, CarPlay)
- [ ] Bing Places — imported from Google, categories re-checked (feeds Copilot)
- [ ] Eet.nu
- [ ] TheFork
- [ ] Tripadvisor claimed (Perplexity pulls from it; tourists use it)
- [ ] Facebook page — claimed, hours and photos, Instagram cross-posting on, then left alone
- [ ] Instagram — bio with NAP + site link, location created/claimed so posts can be tagged
- [ ] OpenStreetMap entry (feeds Foursquare, in-car nav)
- [ ] Waze (Map Editor)
- [ ] Foursquare (business.foursquare.com)
- [ ] Yelp claimed (minutes, no further effort)
- [ ] VisitHaarlem.com listing submitted (website@haarlemmarketing.nl)
- [ ] Hapsalons / Restoranto entries checked for correct NAP once they index
- [ ] Skip: Happy Cow (unless vegan-forward), Iens (is TheFork)

## 11. Channels
- [ ] Instagram: owner named; 2–3 Reels/week + Stories; every post location-tagged; Meta Business Suite scheduling set up
- [ ] WhatsApp Business app: greeting message, away message with hours, quick replies (afhalen, reserveren, adres), catalogue with 8 dishes, business hours, profile with NAP
- [ ] GBP: weekly photo, monthly Post, review replies — on the monthly hour
- [ ] Formitable campaigns: quarterly "nieuws" email once ~200 addresses collected
- [ ] Not set up: TikTok (optional), SMS, WhatsApp Business API, separate newsletter tool, Instagram feed embed on the site

## 12. Opening week
- [ ] Soft-opening invites sent — free meal, no posting conditions (full list: `research/2026-09-12-haarlem-instagram-accounts.md`)
  - [ ] @haarlemcityblog (42K) — info@haarlemcityblog.nl
  - [ ] @indebuurthaarlem (11K) — tip de redactie
  - [ ] @waarhaarlemeet (7.2K) — DM
  - [ ] @haarlemfood (3.2K) — DM
  - [ ] @visithaarlem (24K) — listing first, then tag every post
  - [ ] Proef het Verre Oosten — pitch for the "Indonesische hotspots" list (Kokkie Londo Haarlem is already on it)
  - [ ] @anne_travel_foodie — pitch the vegetarian rijsttafel angle
- [ ] Haarlems Dagblad (@hdhaarlem, 9.3K) and LEVEN! Magazine Haarlem pitched with the family story, not a tag
- [ ] National Haarlem-hotspot lists pitched for their next update: Foodies Magazine, Uit Paulines Keuken, Girls Who, WijnSpijs, Your Little Black Book
- [ ] First 30 guests asked in person for a Google review — week one, at the bill, by a family member (why: an in-person ask converts several times better than card or email; Google weights review recency and rate; a new profile needs a first batch to enter the map results at all; later guests see the count)
  - [ ] Family member named who does the asking every service in week one
  - [ ] Line agreed: "We zijn net open — een Google-review helpt ons echt. Vanavond nog, als je wilt."
  - [ ] Ask every table, not just the happy ones; nothing attached to the ask
  - [ ] Target ~30 in week one; not more than ~50 (a spike from a new profile can trip Google's spam filter)
  - [ ] Guest shown the QR on the card or table stand so it's one tap
  - [ ] Every review replied to within 48h, from week one
  - [ ] Week two onwards: steady, via card, email and the table line — no more push
- [ ] GBP Post "We zijn open" published
- [ ] Sitemap submitted to Search Console and Bing Webmaster; five URLs indexed within 14 days

## 13. Monthly (family, ~1 hour)
- [ ] Reply to all new reviews
- [ ] 4 new GBP photos
- [ ] 1 GBP Post
- [ ] Update sold-out toggles and any price changes in Webflow
- [ ] Swap one homepage quote (quarterly)
- [ ] Check WhatsApp away message still matches hours

## 14. Later (pinned)
- [ ] SEMrush pull on the "realistic wins" keyword list once the plan is renewed
- [ ] Search Console query review at month 2 — retitle pages to match real phrasing
- [ ] `/rijsttafel` page if rijsttafel queries land on the wrong page
- [ ] TheFork marketplace bookings decision at month 3
- [ ] Thuisbezorgd / Uber Eats decision at month 3
- [ ] Add Playwright test infra if custom JS ever grows beyond the schema embed
