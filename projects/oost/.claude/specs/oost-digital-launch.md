# Spec: Oost — Website & Digital Launch Strategy
**Client:** Oost (Indonesian family restaurant, Haarlem NL)
**Date:** 2026-09-12
**Status:** Draft

## Goal
Make Oost the easiest Indonesian restaurant in Haarlem to find, book, and review online from opening day — with a site the family can run themselves in under an hour a month.

## User story
As a Haarlemmer who wants Indonesian food tonight, I want to see the menu, book a table or order takeaway in one tap, and know the place is good, so that I choose Oost over the four tokos and two rijsttafel restaurants I already know.

## Success looks like
- Top-3 local pack for "indonesisch afhalen haarlem" within 6 months; page-1 for dish + Haarlem terms.
- 50+ Google reviews at 4.5★+ by month 3 (De Lachende Javaan has 420 — the gap closes on velocity, not volume).
- 40%+ of dinner covers booked online; every booked guest gets an automatic review invite.
- Family edits menu, prices and hours in Webflow Editor without calling us.

## Assumptions (confirm before build)
- Address, phone, opening hours, family names, opening date — all placeholders `[…]` in copy below.
- Sunday opening unknown — a genuine differentiator (only Toko Nur and SamaSama open Sundays).
- Delivery: assumed **no** (afhalen only). Thuisbezorgd/Uber Eats is a separate commercial decision.
- Budget tolerates ~€70–120/mo for a booking platform. If not, see fallback in §7.

---

## Research summary
Full briefings in `projects/oost/.claude/research/`. What matters:

- **No Haarlem Indonesian competitor has schema markup; most serve PDF menus.** An HTML menu + Restaurant/Menu JSON-LD makes Oost the only structured entity in the category. (seo briefing)
- **Local pack ranking is ~32% GBP signals, ~20% reviews, ~19% on-page.** Google now attributes prominence mainly to backlinks and reviews. The website's job is relevance for long-tail terms and being the citable source; GBP and reviews do the ranking. (Whitespark 2026 expert survey, n=47; Google docs)
- **Google killed GBP Q&A (late 2025) and messaging (2024).** Gemini's "Ask Maps" now answers customer questions from GBP data, reviews and the website — so GBP completeness and an HTML menu are doing more work than before.
- **Formitable (Zenchef's NL brand) has a confirmed automated post-visit review email** with a Google review link, next morning for dine-in, same evening for takeaway. This is the only zero-tech path to "guest ate → invited to review".
- **Incentivised reviews are banned** by Google's UGC policy ("Offer incentives – such as payment, discounts, free goods and/or services – in exchange for posting any review") and treated as advertising by the ACM (fines to €900k). Review gating (only asking happy guests) is also banned.
- **AI answers (ChatGPT/Perplexity/Gemini) pull local dining from Google Maps, Tripadvisor, Foursquare, Yelp** — for NL that means GBP + Tripadvisor completeness matter disproportionately.
- **Haarlem's local Instagram reach is concentrated in five accounts** — @haarlemcityblog (42K, reviews new openings), @visithaarlem (24K), @indebuurthaarlem (11K), @waarhaarlemeet (7.2K), @haarlemfood (3.2K) — plus Proef het Verre Oosten for the Indo-food audience. A soft-opening invite is the cheapest route to a "best of Haarlem" mention.
- SEMrush unavailable this session (plan lapsed, pinned for later) — **all keyword volumes are estimates**. Search Console gives real query data free once live.

---

## 1. The name problem: "Oost" collides three ways
SERP check confirms a bare "Oost" brand won't rank for its own name for a long time, if ever:
1. **Haarlem-Oost is a district.** "Oost Haarlem" and "restaurant Oost Haarlem" return Thuisbezorgd postcode pages (2031/2032/2034), "restaurants in Haarlem-Oost" listicles, council content.
2. **"Oost" is directory shorthand** for *Oost-Europees* (Eet.nu) and *Oosters* (TheFork) cuisine categories.
3. **Prior use in horeca:** Café Oost (Amsterdam), Op Oost (Texel). No BOIP trademark check done — search boip.int/nl/merkenregister before signing anything.

**Client decision: it's a restaurant, not a toko or warung, and the real-world name is `Restaurant Oost`.** That is the sign, the receipts, the KvK trade name, the GBP name and the NAP string on every directory. It's a weaker disambiguator than "Toko Oost" — the collision query is literally "restaurant Oost Haarlem" — so the rest of the plan compensates:
- **Body copy** says "Oost" — that's what guests will call it.
- **HTML title tags** (keywords allowed here): homepage `Oost – Indonesisch restaurant, rijsttafel & afhalen in Haarlem`; other pages end `| Restaurant Oost`. Never a bare "Oost".
- **GBP:** primary category `Indonesisch restaurant`; description opens "Indonesisch familierestaurant in Haarlem"; every photo captioned with a dish name. Reviews that say "Indonesisch", "rijsttafel", "rendang" are what will separate Restaurant Oost from the district in Google's eyes — which is why the review velocity plan in §4 matters more here than it would for a distinctively named place.
- **Domain:** `restaurantoost.nl` is taken and parked for resale (Dovendi) — it's the exact brand match, so make one enquiry and buy it if the price is sane. Otherwise **`eetbijoost.nl`** primary (brandable, showed no DNS record — confirm via sidn.nl) with `oosthaarlem.nl` as a defensive redirect. Take the `.com` of whichever wins.
- **Story upside:** "de Oost" is what an older generation of Indo-Dutch families called the Dutch East Indies (vs "de West"). Genuine About-page material and a clean AI-quotable fact (§3); zero search volume as a term.
- **If the address is physically in Haarlem-Oost**, the district collision flips into an asset: "Indonesisch restaurant in Haarlem-Oost" becomes an exact-match local term. Confirm the address.

---

## 2. Sitemap
Four pages, Dutch first, the whole site translated to English via Webflow Localization (translation written later, not in this spec). The full menu lives on the homepage — 14 dishes fit, and the reasoning is below. "Book" is a button, not a page — the Formitable widget opens as an overlay from the nav on every page, which is one tap fewer than a /reserveren page.

| URL | Purpose | Primary keyword (est. vol/mo) | Secondary |
|---|---|---|---|
| `/` | Convert: full menu, book, takeaway, hours | indonesisch restaurant haarlem (200–350, hard — long game) | rijsttafel haarlem (90–150); rendang/nasi goreng/bami/sate/gado-gado + haarlem (<20 each, unclaimed); indonesisch eten haarlem centrum |
| `/afhalen` | Takeaway intent; how to order | indonesisch afhalen haarlem (40–70, winnable) | rijsttafel afhalen haarlem, indonesisch afhalen haarlem zondag |
| `/catering` | Group/party orders (phase 2 OK) | indonesische catering haarlem (<20, one competitor) | rijsttafel bestellen feest haarlem |
| `/over-ons` | Trust; family story; E-E-A-T | familierestaurant haarlem (near-zero, brand) | — |
| `/en/…` | Every page above, localised via Webflow Localization | indonesian food haarlem (20–40 combined) | indonesian takeaway haarlem, indonesian restaurant haarlem |

Not built: blog, news, gallery page, contact page (contact lives in footer + `/afhalen`), reviews page (reviews live on Google; homepage quotes three by hand).

**Why dish + Haarlem terms get no pages of their own.** Each is <10–20 searches/month (est.); a "rendang Haarlem" page with a paragraph and a price is thin content Google folds into the parent anyway. Those searches resolve in the local pack, not on a URL — what gets Oost into the three Maps results is the GBP menu and reviews that mention the dish. `Menu → MenuSection → MenuItem` schema on the homepage already gives Google a structured entity per dish, which no competitor has. And six dish pages the family never updates is the rot this site is designed to avoid. So: one menu section on the homepage (`#menukaart`), every dish with a real two-line description in the CMS (that's where the dish name, the method and the city land), section intros that mention Haarlem once, dish names and captioned photos in the GBP menu, and a nudge on the thank-you card to name what you ate in the review. **Exception:** rijsttafel ("rijsttafel haarlem" 90–150/mo, "rijsttafel afhalen haarlem" a distinct intent) lives in `/afhalen` at launch and may earn `/rijsttafel` in phase 2 if Search Console shows those queries landing on the wrong page.

**Why no separate menu page either.** With ~14 dishes (6 meat, 6 vegetarian, rice and bami) the menu fits the homepage. The menu is the highest-converting content on a restaurant site, so one tap fewer beats a second URL; a four-page site keeps its thin authority concentrated; and the `Menu` schema inlines cleanly inside the homepage `Restaurant` object. What's lost is a second title tag aimed at menu terms — the homepage title carries "rijsttafel" instead. If Search Console shows menu queries stalling after a few months, `/menukaart` is a 20-minute addition.

Nav: Menukaart (anchor → `/#menukaart`) · Afhalen · Catering · Over ons · **Reserveren** (button) · EN
Footer: address, phone/WhatsApp, hours, Google Maps link, Instagram, KvK.

---

## 3. Copy
Full copy for every page, with a sample menu, lives in `oost-website-copy.md` — that file is the source of truth; the outlines below are the earlier drafts.
Voice: warm, direct, first person plural, no marketing adjectives. Every page says "familie" once, naturally. Dutch informal `je`. Dish names in Indonesian, never translated. Placeholders in `[…]`.

### `/` Home
- **Title:** `Oost – Indonesisch restaurant, rijsttafel & afhalen in Haarlem`
- **Meta:** `Oost is het Indonesische familierestaurant van Haarlem. Rijsttafel, saté, rendang en gado-gado zoals thuis — bekijk de menukaart, reserveer een tafel of haal af.`
- **H1:** `Indonesisch eten zoals bij ons thuis, midden in Haarlem`
- **Intro:**
  > Welkom bij Oost. Wij zijn de familie [achternaam] en we koken zoals [oma/mama] het ons leerde: met geduld, veel sambal en recepten die nooit zijn opgeschreven. Kom eten, haal af, of laat ons de rijsttafel voor je feest verzorgen.
- **CTA row:** `Reserveer een tafel` (widget) · `Afhalen` (→ /afhalen) · `App ons` (wa.me link)
- **H2:** `Menukaart` — section `id="menukaart"`, the full menu, CMS-fed. Intro:
  > Alles op deze kaart komt uit de keuken van de familie [achternaam]. De vijf gerechten die Indonesië in 2018 tot nationale gerechten uitriep — gado-gado, soto, saté, nasi goreng en rendang — staan er allemaal op. De rest is wat we thuis ook eten.
  > Vegetarisch en pittig staat bij elk gerecht aangegeven. Allergie? Zeg het, we denken mee.
  - **Sections (CMS, in order):** Rijsttafel · Vlees & vis · Vegetarisch · Rijst & bami · Zoet (if any)
  - **Section intros (one line each, CMS field):**
    > **Rijsttafel** — Kies voor twee, vier of de hele tafel. Wij kiezen de schalen uit wat hieronder staat, jij bepaalt hoe pittig.
    > **Vlees & vis** — Rendang die uren heeft gestoofd, saté van de houtskool, [ayam/ikan]. [Oma]'s recepten, onveranderd.
    > **Vegetarisch** — Gado-gado, sambal goreng boontjes, tempé: geen bijzaak, de helft van de kaart.
    > **Rijst & bami** — Witte rijst, nasi goreng of bami. De basis onder alles.
  - Every dish: name, two-line description (dish, method, one concrete detail), price, badges vegetarisch / pittig, sold-out badge from CMS.
  - Closing line: `Alles ook af te halen → Zo werkt afhalen`
- **H2:** `Vanavond eten?` — hours (CMS-bound), address, `Route` link to Google Maps, `Reserveer` button.
  > Reserveren is niet verplicht, maar op vrijdag en zaterdag wel verstandig.
- **H2:** `Wat gasten zeggen` — three Google reviews pasted as text with first name + "via Google". Updated quarterly by the family. No widget.
- **H2:** `De familie` — one paragraph, photo of the family in the kitchen, link to /over-ons.
  > Oost is een familiebedrijf. [Naam] staat in de keuken, [naam] in de zaal, en [naam] bepaalt of de sambal pittig genoeg is. Lees ons verhaal →

### `/afhalen`
- **Title:** `Indonesisch afhalen in Haarlem – rijsttafel, nasi & saté | Restaurant Oost`
- **Meta:** `Indonesisch eten afhalen in Haarlem? Bestel je rijsttafel, nasi goreng of saté bij Oost via WhatsApp of telefoon en haal het warm op[. Ook op zondag].`
- **H1:** `Indonesisch afhalen in Haarlem`
- **Intro:**
  > Geen zin om te koken? Bestel bij Oost en haal het warm op. App of bel ons, zeg hoe laat je komt, en het staat klaar.
- **H2:** `Zo werkt het` — three steps:
  > 1. Kies uit de menukaart.
  > 2. App of bel [nummer] met je bestelling en ophaaltijd.
  > 3. Haal op aan [straat + nummer]. Pinnen of contant, allebei goed.
  Buttons: `App je bestelling` (wa.me with prefilled "Hoi, ik wil graag afhalen:") · `Bel [nummer]`
- **H2:** `Rijsttafel afhalen`
  > Onze rijsttafel voor thuis: vanaf twee personen, [x] schalen, met witte rijst en kroepoek. Het liefst een dag van tevoren bestellen — dan staat de rendang al te sudderen.
- **H2:** `Afhaaltijden` — CMS-bound hours.
- **H2:** `Veelgestelde vragen` (FAQPage schema):
  > **Kan ik op zondag afhalen?** [Ja, op zondag van … tot … / Nee, zondag zijn we dicht.]
  > **Bezorgen jullie ook?** Nee, alleen afhalen. Zo blijft alles warm en de prijs eerlijk.
  > **Hoe ver van tevoren moet ik bestellen?** Nasi, bami en saté: een half uur. Rijsttafel: liefst een dag.
  > **Kan ik vegetarisch bestellen?** Ja — gado-gado, sambal goreng boontjes, tempé en meer. Zeg het bij je bestelling.

### `/catering`
- **Title:** `Indonesische catering in Haarlem – rijsttafel voor je feest | Restaurant Oost`
- **Meta:** `Rijsttafel of Indonesisch buffet voor je verjaardag, borrel, bruiloft of bedrijfslunch in Haarlem en omgeving. Familierecepten, vers gekookt, vanaf [x] personen.`
- **H1:** `Rijsttafel catering voor je feest`
- **Copy:**
  > Een rijsttafel is gemaakt om te delen — daarom is het ook ons favoriete feesteten. We koken voor verjaardagen, borrels, bruiloften en bedrijfslunches in Haarlem en omgeving, vanaf [x] personen. Je haalt het op, of wij komen het brengen en zetten het klaar.
  > Vertel ons de datum, het aantal gasten en of er vegetariërs bij zijn. Binnen een dag heb je een voorstel.
- **Form:** naam, e-mail, telefoon, datum, aantal gasten, bericht. Webflow native form → family email.
- **Below form:** `Liever eerst bellen? [nummer]`

### `/over-ons`
- **Title:** `Over ons – de familie achter Oost, Indonesisch restaurant in Haarlem`
- **Meta:** `Oost is een familiebedrijf. Lees hoe de familie [achternaam] hun Indonesische familierecepten van [plaats in Indonesië] naar Haarlem bracht.`
- **H1:** `De familie achter Oost`
- **Copy:**
  > Oost heet Oost omdat het daar begon. "De Oost" — zo bleef [opa/oma] Indonesië altijd noemen, ook na [x] jaar in Nederland. De recepten kwamen mee, in [haar/zijn] hoofd en in een schrift dat inmiddels uit elkaar valt.
  >
  > [Naam] staat in de keuken. [Naam] doet de zaal en de bestellingen. [Naam] proeft de sambal en zegt wanneer het pittig genoeg is — meestal is dat later dan je denkt.
  >
  > We zijn geen keten en geen foodhall. We zijn een familie met een keuken in Haarlem, en we koken wat we thuis ook koken. Als de rendang op is, is hij op.
  >
  > Kom langs. We schuiven graag een stoel bij.
- **Photos:** real family photos only — kitchen, hands, the schrift. No stock. Alt text names the people and the dish.
- **CTA:** `Reserveer een tafel` · `Bekijk de menukaart` (→ `/#menukaart`)

---

## 4. Reviews

### What you cannot do
"10% off if you leave a review" — banned by Google (incentives "in exchange for posting any review"), treated as advertising by the ACM, and unverifiable anyway: Google shows a display name only, so you can't match a reviewer to a bill. **Don't build the mechanism around verification — build it so verification isn't needed.**

### What works and is compliant
1. **Formitable automated review email** (primary, zero effort). Next morning after every booked visit; same evening for takeaway orders through Formitable. Points to the Google review link. Unincentivised, sent to everyone — compliant.
2. **The bedankt-kaartje** (walk-ins and takeaway). A card handed over with every bill:
   - Front: `Bedankt voor je bezoek. 10% korting op je volgende maaltijd — laat dit kaartje zien.` Given to **everyone, unconditionally**.
   - Back: QR → Google review link. `Vond je het lekker? Een Google-review helpt een klein familiebedrijf enorm.`
   The discount is a loyalty offer, not a review reward — compliant, and it drives a second visit anyway. The QR rides along.
3. **Table QR** (small stand or on the menu's last page) → Google review link. Zero cost.
4. **The ask.** Staff say it at the bill: "Als het lekker was, een Google-review helpt ons echt." Highest-converting channel in every study; costs nothing.

Never show the Google link only to happy guests (review gating — banned). Reply to every review within 48h from GBP; replies are ranking-neutral but conversion-positive and the family can do it from the phone.

### Where reviews matter, ranked
1. **Google Business Profile** — the only one that ranks you. All QR codes and emails point here.
2. **TheFork** — auto-emails diners for reviews; also a discovery marketplace. Worth listing (free) even without using its booking flow.
3. **Facebook** — claim; older local demographic reads it. Don't solicit.
4. **Tripadvisor** — claim once. Perplexity licenses it, so completeness feeds AI answers; tourists in Haarlem use it. Don't solicit.
5. **Eet.nu** — claim; ~1.5M visitors/mo; minor as a review destination.
Skip: Yelp (dead in NL), Iens (is TheFork), Happy Cow (unless vegan-forward).

---

## 5. Communication channels

| Channel | Verdict | Effort | Why |
|---|---|---|---|
| **Instagram** | Primary | 2–3 Reels/wk + Stories | Strongest local food discovery in NL; location-tag everything |
| **WhatsApp Business app** (free) | Primary | Near zero | Takeaway orders, questions, greeting/away messages, catalogue = menu. Link the number in GBP. |
| **Google Business Profile** | Primary | 30 min/wk | Now answers customer questions via Gemini from your data; weekly photo, monthly Post |
| **Formitable guest email** | Primary | Automated | Review email + optional quarterly "nieuws" campaign from the same tool |
| Facebook | Passive | Zero | Claim, auto cross-post Reels, never log in |
| Email newsletter | Later | Monthly | Only once ~200 emails collected; use Formitable's campaign tool, not a second platform |
| TikTok | Optional | High | Only if a family member wants to |
| WhatsApp Business API | Skip | — | ~€0.13/msg in NL, per-message billing; nothing here justifies it |
| SMS | Skip | — | Explicit opt-in required, costs money, WhatsApp does it better |

---

## 6. Automation: the whole flow
```
Dine-in, booked  → Formitable → visit → next morning: review email (Google link)
Takeaway, via Formitable takeaway module → same evening: review email
Walk-in / WhatsApp takeaway → bedankt-kaartje QR → Google review
Everyone → Formitable guest database → quarterly nieuws email (soft opt-in)
```
No Zapier, Make, n8n, POS integration or second CRM. One subscription, one QR code, one card.

**GDPR:** post-visit email is covered by the Dutch soft opt-in (Telecommunicatiewet 11.7) if disclosed at booking with a chance to object and an unsubscribe in every mail. Formitable's booking form must show:
> `Na je bezoek sturen we je één mail met de vraag hoe het was, en af en toe nieuws van Oost. Afmelden kan altijd.`
Plus an unticked box for WhatsApp updates. Never pre-tick. Soft opt-in does **not** cover SMS or (since 1 Jul 2026) phone calls.

---

## 7. Booking platform decision
**Recommendation: Formitable** (Zenchef's Dutch brand — same company, Dutch UI and support).

| | Formitable | Eet.nu | TheFork Manager | Form + email |
|---|---|---|---|---|
| Cost | ~€69–119/mo (get a quote; 50%-off-6-months promos common) | €0.25/booking from own site, €1.75/guest from their listing | Monthly fee + €2–5/cover from marketplace | €0 |
| Guest email captured | Yes | Yes | Yes | Yes, manually |
| Auto review email | **Yes, confirmed** | No | Yes (to TheFork, not Google) | No |
| Takeaway orders | Yes (module) | No | No | No |
| Guest database / campaigns | Yes | No | Limited | No |
| Dutch support | Yes | Yes | Yes | — |

Formitable is the only option that replaces three tools (booking, takeaway ordering, review automation) with one login the family already understands. It is the single line item that makes "automate the review ask" possible without tech.

**Fallback if the monthly fee is a non-starter:** Eet.nu widget (€0.25/booking) + bedankt-kaartje + table QR. You lose the automated email; the card does ~60% of the job.

**Also list on TheFork** (free listing, no booking flow) for discovery + its own review emails. Revisit paying for its marketplace after month 3 based on how full Fri/Sat are.

---

## 8. Day-one digital footprint
Do in this order. Everything is free unless marked. Use the identical NAP string everywhere.

**Week −4 (before opening)**
- [ ] Register domain (§1) + `.com`
- [ ] KvK registration (mandatory; directories scrape it)
- [ ] **Google Business Profile** — create, video-verify, fill every field: category `Indonesisch restaurant`, secondary `Afhaalrestaurant`, `Cateringservice`; hours; menu link → `/#menukaart`; reservation link → Formitable; WhatsApp number; 20+ photos (food, room, family); attributes (vegetarian/pin)
- [ ] Instagram + Facebook business profiles, same name, same bio, link to site
- [ ] WhatsApp Business app: greeting, away message, catalogue with 8 dishes, business hours
- [ ] Formitable account, widget ID, review email switched on with Google link, takeaway module configured
- [ ] Generate Google review short link (GBP → "Ask for reviews") → QR → order bedankt-kaartjes and one table stand

**Week −2**
- [ ] Apple Business Connect (Siri/CarPlay/Apple Maps)
- [ ] Bing Places (import from Google, re-check categories) — feeds Copilot
- [ ] Eet.nu listing · TheFork listing · Tripadvisor claim
- [ ] OpenStreetMap entry (feeds Foursquare, in-car nav) · Waze · Foursquare
- [ ] VisitHaarlem.com submission (website@haarlemmarketing.nl)
- [ ] Site live with schema, submitted to Search Console + Bing Webmaster

**Opening week**
- [ ] Soft-opening invites: @haarlemcityblog (42K, info@haarlemcityblog.nl), @indebuurthaarlem (11K), @waarhaarlemeet (7.2K), @haarlemfood (3.2K); tag @visithaarlem (24K). Free meal, no conditions on posting. Full list in `research/2026-09-12-haarlem-instagram-accounts.md`
- [ ] Tip Haarlems Dagblad + Indebuurt Haarlem "nieuwe horeca" (direct email to editorial — mechanics unverified, check each site's tip-ons page)
- [ ] First GBP Post: "We zijn open"
- [ ] Ask the first 30 guests in person for a Google review — velocity in week one matters most

**Monthly (family, ~1 hour)**
- [ ] Reply to every Google review · 4 new GBP photos · 1 GBP Post · update sold-out toggles · swap one homepage quote

**Later (pinned)**
- [ ] SEMrush pull on the "realistic wins" list once the plan is renewed
- [ ] Thuisbezorgd/Uber Eats decision after month 3
- [ ] Check Search Console queries at month 2; retitle pages to match real phrasing

---

## 9. Technical notes
- **Platform:** Webflow Premium site plan ($25/mo billed annually — includes CMS). Client First naming. No Barba, no GSAP, no jQuery. One Google font max. Images AVIF via `/optimise-images`. Target: mobile LCP < 2s, Lighthouse ≥ 95 all four.
- **CMS for handover** (the family touches only these):
  - `Gerechten`: naam, sectie (ref), beschrijving NL, beschrijving EN (optional), prijs, vegetarisch, pittig, uitverkocht (toggle → shows "op" badge), volgorde
  - `Secties`: naam, intro, volgorde
  - `Instellingen` (single item): adres, telefoon, WhatsApp, openingstijden ma–zo (open/dicht per day), Formitable ID, Google review URL, Instagram URL. Bound to footer, hours blocks **and** the JSON-LD embed — one edit updates the visible text and the schema together.
- **Schema (JSON-LD embed, CMS-bound):** `Restaurant` with `servesCuisine: Indonesian`, `address`, `geo`, `telephone`, `openingHoursSpecification` (from Instellingen), `acceptsReservations`, `hasMenu` as an inline `Menu` → `MenuSection` → `MenuItem` object built from the Gerechten collection list (`offers.price` per item), `sameAs` [GBP, IG, FB, Eet.nu, TheFork, Tripadvisor], `priceRange`. `/afhalen`: `FAQPage`. Generate with the `schema` agent; validate with `/test-schema`.
- **Booking widget:** Formitable button script in site `<head>`, one `[data-formitable]` button in nav + hero, present in both locales. No custom JS.
- **Forms:** Webflow native; catering form → family email + Formitable if it supports enquiries. Spam: Webflow reCAPTCHA off (hurts conversion); honeypot field instead.
- **Custom JS:** none, unless the FAQ accordion can't be done with `<details>` — it can.
- **hreflang:** handled by Webflow Localization; verify `nl`/`en`/`x-default` on every page.
- **Localisation:** Webflow Localization **Essential**, one `en` locale ($9/mo billed annually, on top of Premium $25/mo billed annually). The whole site is published in `en` at `/en/…`; hreflang is generated by Webflow. CMS fields (dish descriptions, section intros, Instellingen) are localised in the CMS, static text in the Designer. Machine-translate first, then hand-edit — **the English translation is a separate, later task**; dish names stay Indonesian in both locales, "saté" becomes "satay" in English.
- **Menu never as PDF or image.** If the family wants a printable menu, print from the page.
- **Editor training:** one 30-minute session + a one-page PDF: "how to mark a dish sold out, change a price, change hours".

## Barba Impact
N/A — no Barba transitions. Multi-page site, native navigation.

## ADR needed?
No. No shared-code or architectural decisions; project is self-contained. One decision worth recording in the project README: "Localization Essential, whole site in `en`, translation hand-edited" and why.

---

## Tasks

| # | Task | Agent | Depends on |
|---|---|---|---|
| 1 | Confirm assumptions with client (address, hours, names, Sunday, budget, sign name) | pm | — |
| 2 | Domain + email setup; Formitable account; GBP creation | client + pm | 1 |
| 3 | Final Dutch copy from §3 with placeholders filled; `/humanizer` pass | content | 1 |
| 4 | Webflow build: CMS structure (§9), 4 pages, Localization Essential configured, Client First, mobile-first | code-writer | 1 |
| 5 | JSON-LD schema (Restaurant, Menu, FAQPage) as CMS-bound embeds | schema | 4 |
| 6 | Formitable widget + wa.me links + catering form wiring | code-writer | 2, 4 |
| 7 | Photo shoot brief + image optimisation | art-director + `/optimise-images` | 1 |
| 8 | SEO audit: titles, meta, hreflang, OG, sitemap.xml, robots, Search Console | seo | 3, 4, 5 |
| 9 | Perf + a11y pass (Lighthouse ≥ 95, axe clean) | perf, qa | 4–8 |
| 10 | Schema validation (`/test-schema`) | qa | 5 |
| 11 | Day-one footprint checklist (§8) executed | pm + client | 2 |
| 12 | Bedankt-kaartje + QR stand design (print) | art-director | 2 |
| 13 | Editor handover session + one-page guide | pm | 4 |
| 14 | English translation of all pages and CMS fields (later, separate brief) | content | 3, 4 |

### Parallelisation map
- **Stream A (client-gated):** 1 → 2 → 11. Client does most of it; pm chases.
- **Stream B (content):** 3, 7, 12 — independent of the build once 1 is answered. content + art-director in parallel.
- **Stream C (build):** 4 → 5 → 6 → 8 → 9/10. Sequential; single code-writer.
- **Stream D:** 13 after 4.
- Recommendation: B and C in parallel, one worktree each (`oost-content`, `oost-build`); no agent teams needed. Est. build effort: 3–4 days total; content 1 day; footprint 1 day of client time spread over 4 weeks.

---

## Test plan
**No test infra exists for this project** (new project, no `package.json`, no `.env.test`). Playwright acceptance tests are **not generated**; add `tests/` to the project if the build phase wants Tier 1 coverage — for a static 6-page site, the manual + tool checks below are sufficient.

### Tier 1 — Auto (none until infra added)
Would cover: every page 200, no console errors, `[data-formitable]` present on all pages, `/` renders ≥ 1 `MenuItem` inside `#menukaart`, `/afhalen` FAQ `<details>` toggles, hours text matches Instellingen.

### Tier 2 — CDN regression
N/A — no CDN-hosted JS in this project.

### Tier 3 — Manual / tool-assisted
- Google Rich Results Test passes on `/` and `/afhalen` (Restaurant with Menu, FAQPage detected, zero errors) — `/test-schema`
- Lighthouse mobile ≥ 95 performance/a11y/best-practices/SEO on `/` — chrome-devtools `lighthouse_audit`
- Formitable widget opens and completes a test booking on iOS Safari + Android Chrome (real devices; widget is third-party iframe)
- wa.me link opens WhatsApp with prefilled text on a phone
- Mark a dish `uitverkocht` in Editor → badge appears in the homepage menu and the item drops from `MenuItem` schema (or gains `availability: SoldOut`)
- Change Thursday hours in Instellingen → footer, `/afhalen` hours block and JSON-LD all update
- Every page shows an `nl`/`en`/`x-default` hreflang set; `/en/` versions return 200
- NAP string on site === GBP === Eet.nu === TheFork (visual diff)
- Search Console: sitemap accepted, 5 URLs indexed within 14 days

## Verify Loop
**How `/build` knows this is working:**
- **Pass criteria:** all 4 pages and their `/en/` versions return 200 and render without console errors; Rich Results Test reports Restaurant and Menu on `/`, FAQPage on `/afhalen` with 0 errors; Lighthouse mobile ≥ 95 ×4 on `/`; `[data-formitable]` button present on every page; `/#menukaart` has ≥ 1 rendered `MenuItem` and no PDF/image menu anywhere; every page carries reciprocal `nl`/`en` hreflang.
- **Repro:** open each URL on a 390px viewport; open nav → Reserveren → widget overlay appears; on `/afhalen` tap first FAQ → answer expands; on `/` search DOM for `"@type":"MenuItem"`.
- **Tier mapping:** all checks Tier 3 (tool-assisted) until Playwright infra is added; schema via `/test-schema`; performance via `lighthouse_audit`.
- **Regression scope:** none — greenfield. Post-launch: any CMS edit must not break JSON-LD validity (re-run Rich Results after the handover session while the family makes a live edit).

## Open questions
1. Is the physical address in Haarlem-Oost? Changes §1 from liability to asset.
2. Domain: try to buy `restaurantoost.nl`, or go with `eetbijoost.nl`? Do the BOIP trademark search on "Oost" first.
3. Sunday hours?
4. Is ~€70–120/mo for Formitable acceptable? If not, fallback (§7) and the automation flow loses its email leg.
5. Who in the family owns Instagram? Everything else is passive; this one isn't.
