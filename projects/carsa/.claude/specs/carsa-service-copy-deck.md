# Carsa Service Site — Canonical Copy Deck

**Slug:** `carsa-service-copy-deck`
**Client:** Carsa
**Source of truth:** `carsa-service-migration.md` (v2, 2026-07-09)
**Created:** 2026-07-14
**Language:** British English throughout

> **How to use this deck.** Every heading is labelled with its level (H1/H2/H3) so the build can map it directly. Paste copy verbatim. Defects B1, B3, B6, B7 from the migration spec are already resolved here — do not reintroduce them.
>
> **Brand rule (load-bearing).** Carsa is primary. HiQ appears **only** inside the partnership callout — never in body copy, headings, badges, or metadata. This keeps HiQ removable in one place later. Trust badges reference Carsa.
>
> **Defect guards baked in:**
> - **B1** — every location has its own correct, location-specific meta description.
> - **B3** — Mountsorrel is present in all five-location lists (hub, winter, SEO table).
> - **B6** — exactly one H1 per page; all section titles are H2.
> - **B7** — winter checklist item labels are H3.
> - **B2** — no hardcoded review count anywhere (the live Trustpilot widget shows it).

---

## 1. Hub Page — `/mot-and-car-servicing`

### Hero

**[H1]** MOT & Car Servicing from £39

**Hero intro (paragraph):**
Book an MOT, a full service, or an air-con recharge at a Carsa centre near you. We fit you in fast, do only the work your car actually needs, and show you the price before we start. Five locations across England, booking online in minutes.

**Primary CTA label:** Book Now

---

### Service cards (section)

**[H2]** Our services and prices

**Intro (one line):** Fixed, upfront pricing on the work that keeps your car safe and legal.

#### Card 1 — MOT
- **Price:** £39
- **Benefit line:** A full MOT test to keep you safe and road-legal.
- **Bullets:**
  - Government-standard MOT inspection
  - Clear pass-or-fail result, explained in plain English
  - Book online at a time that suits you
- **CTA label:** Book your MOT

#### Card 2 — MOT + Service (Combo)
- **Price:** £30
- **Benefit line:** Book a full service and get your MOT for just £30.
- **Bullets:**
  - MOT for £30 when booked with a full service (£9 off the standalone price)
  - Class 4 MOT plus a full or major service
  - Only essential work, quoted before we start
- **CTA label:** Book MOT + Service

> **Source (verbatim, live site):** combo card reads *"MOT Only £30 With A Full Service"* — i.e. the £30 is the MOT price when a full service is booked, not a standalone package total.

#### Card 3 — Car Servicing
- **Price:** From £120
- **Benefit line:** Keep your car running smoothly with a full service.
- **Bullets:**
  - Interim and full service options
  - Genuine parts and manufacturer-standard checks
  - No surprise costs — you approve the work first
- **CTA label:** Book a service

#### Card 4 — Air Conditioning
- **Price:** From £120
- **Benefit line:** Restore cold air and clear a musty cabin.
- **Bullets:**
  - Full re-gas and system check
  - Leak diagnosis before we recharge
  - Fresher, cleaner air in your cabin
- **CTA label:** Book air-con service

---

### Partnership callout (removable component — `.is-hiq-partner`)

> This is the **only** place HiQ is named. Keep all HiQ references inside this block.

**[H2]** In partnership with HiQ

**Body:** Carsa runs its MOT and servicing centres in partnership with HiQ, giving you trusted garage expertise backed by Carsa service and pricing.

*(HiQ logo sits here in the design.)*

---

### Service locations (section)

**[H2]** Find your nearest centre

**Intro (paragraph):** Carsa MOT and servicing is available at five centres across England. Choose your location to see opening hours, directions, and live booking.

**Location list (all five — B3 guard: Mountsorrel included):**
- Halesowen
- Cannock
- Bolton
- Towcester
- Mountsorrel

*(Cards are CMS-driven from the service-enabled Stores; each card carries name, address, hours, and a "Book Now" link to `/mot-and-car-servicing/{slug}`.)*

**Card CTA label:** Book Now

---

### Trust badges (section) — Carsa-branded, no review count

> **B2 guard:** the "reviews" badge carries **no number**. The live Trustpilot widget renders the count. Do not hardcode 9500/9700.

**[H2]** Why drivers choose Carsa

| # | Icon (suggested) | Label |
|---|------------------|-------|
| 1 | Certificate / tick | Goodyear certified centres |
| 2 | Star cluster | Thousands of verified reviews |
| 3 | Tyre / spanner | Tyres and repairs on site |
| 4 | Wrench / shield | MOT and servicing under one roof |
| 5 | Receipt / tick | Only the essential work, always quoted first |
| 6 | Carsa logo mark | Backed by Carsa quality |

---

### Reviews (section)

> Reviews render from the existing Carsa Testimonials Trustpilot component. Supply the heading and intro only.

**[H2]** What our customers say

**Intro (one line):** Real reviews from drivers who booked their MOT and servicing with Carsa.

---

### FAQ (section)

> Carsa / Tomek supply the final Q&A. The three below are **placeholders** that show the intended structure and voice. Each question is an H3.

**[H2]** MOT and servicing questions, answered

**Intro (one line):** Quick answers to the things drivers ask us most.

**[H3]** How much does an MOT cost at Carsa?
An MOT at Carsa costs £39. You can pair it with a service to save on both, and you will always see the price before any work begins.

**[H3]** How long does a car service take?
Most services are done the same day. Book online, drop your car off, and we will tell you if anything needs attention before we start any work.

**[H3]** Do I have to get the repairs you recommend?
No. We only ever flag essential work, we quote it upfront, and nothing gets done until you approve it. You are always in control of the cost.

---

## 2. Location Template — `/mot-and-car-servicing/{slug}`

Copy that varies per location is listed for all five. Shared section copy is written once and reused across all five pages.

### Per-location hero copy

Pattern: **[H1]** `Book Your MOT & Service in {Location}` (one H1 per page — B6 guard).

#### Halesowen
- **hero-title [H1]:** Book Your MOT & Service in Halesowen
- **hero-description:** MOT from £39 and full servicing from £120 at Carsa Halesowen. Book online, see the price upfront, and get only the work your car needs.

#### Cannock
- **hero-title [H1]:** Book Your MOT & Service in Cannock
- **hero-description:** MOT from £39 and full servicing from £120 at Carsa Cannock. Book online, see the price upfront, and get only the work your car needs.

#### Bolton
- **hero-title [H1]:** Book Your MOT & Service in Bolton
- **hero-description:** MOT from £39 and full servicing from £120 at Carsa Bolton. Book online, see the price upfront, and get only the work your car needs.

#### Towcester
- **hero-title [H1]:** Book Your MOT & Service in Towcester
- **hero-description:** MOT from £39 and full servicing from £120 at Carsa Towcester. Book online, see the price upfront, and get only the work your car needs.

#### Mountsorrel
- **hero-title [H1]:** Book Your MOT & Service in Mountsorrel
- **hero-description:** MOT from £39 and full servicing from £120 at Carsa Mountsorrel. Book online, see the price upfront, and get only the work your car needs.

---

### Booking section (shared — sits around the Acuity embed)

**[H2]** Book your appointment

**Intro (one line):** Pick a date and time that suits you. Confirmation lands in your inbox straight away.

---

### Services & pricing (shared across all five)

**[H2]** Services and pricing at this centre

**Intro (one line):** Fixed, upfront prices — no surprises when you collect your car.

| Service | Price | Line |
|---------|-------|------|
| MOT | £39 | Full MOT test to keep you safe and road-legal. |
| MOT + Service | £30 | MOT for £30 when booked with a full service. |
| Car Servicing | From £120 | Interim and full service options with genuine parts. |
| Air Conditioning | From £120 | Re-gas and system check for fresher, colder air. |

**Section CTA label:** Book Now

---

### Location details (shared — labels only; data from Stores CMS)

**[H2]** Opening hours and directions

Section labels:
- **[H3]** Opening hours
- **[H3]** Phone
- **[H3]** Address

*(Values pulled from the linked Store: `opening-hours`, `phone`, `address` / `address-2`, plus the embedded map from `google-maps-link`.)*

---

### Per-location SEO (fixes B1 — Towcester is about Towcester)

| Location | seo-title | seo-metadescription |
|----------|-----------|---------------------|
| Halesowen | MOT & Car Servicing in Halesowen \| Carsa | Book your MOT from £39 or a car service from £120 in Halesowen with Carsa. Honest, essential-only work and easy online booking. |
| Cannock | MOT & Car Servicing in Cannock \| Carsa | Book your MOT from £39 or a car service from £120 in Cannock with Carsa. Honest, essential-only work and easy online booking. |
| Bolton | MOT & Car Servicing in Bolton \| Carsa | Book your MOT from £39 or a car service from £120 in Bolton with Carsa. Honest, essential-only work and easy online booking. |
| Towcester | MOT & Car Servicing in Towcester \| Carsa | Book your MOT from £39 or a car service from £120 in Towcester with Carsa. Honest, essential-only work and easy online booking. |
| Mountsorrel | MOT & Car Servicing in Mountsorrel \| Carsa | Book your MOT from £39 or a car service from £120 in Mountsorrel with Carsa. Honest, essential-only work and easy online booking. |

---

## 3. Winter Health Check — `/mot-and-car-servicing/winter-health-check`

### Hero

**[H1]** Free Winter Car Health Check

**Hero intro (paragraph):** Cold weather is hard on your car. Book a free winter health check at Carsa and we will look over the eight things most likely to let you down in the cold — from your battery to your brakes — and tell you exactly where you stand.

---

### 8-point checklist (section)

**[H2]** What we check, free of charge

**Intro (one line):** Eight quick checks that catch the common winter problems before they strand you.

> **B7 guard:** each item label below is an **H3**, not plain text.

**[H3]** Oil level and condition
We check your oil is topped up and clean so your engine stays protected in the cold.

**[H3]** Tyre pressure
We set your tyres to the right pressure for safe grip and even wear on cold roads.

**[H3]** Tyre condition and tread
We inspect tread depth and look for damage that gets riskier in wet, icy weather.

**[H3]** Lights
We check every bulb so you stay visible through dark mornings and long nights.

**[H3]** Wipers
We check your wiper blades clear the screen cleanly in rain, sleet, and snow.

**[H3]** Exhaust
We look over your exhaust for leaks and damage that cold, damp conditions expose.

**[H3]** Battery
We test your battery, the part most likely to fail when the temperature drops.

**[H3]** Brakes
We check your brakes are responsive for shorter stopping distances on slick roads.

---

### Booking CTAs (section)

**[H2]** Book your free winter check

**Intro (paragraph):** Your winter health check is free at all five Carsa centres. Choose your nearest location and book online in minutes.

**Location list (all five — B3 guard: Mountsorrel included):**
- Halesowen
- Cannock
- Bolton
- Towcester
- Mountsorrel

*(Grid renders all five from the CMS collection; each card links to `/mot-and-car-servicing/{slug}`.)*

**Card CTA label:** Book Now

---

## 4. Cross-Sell Section (on service-enabled store pages)

> Reusable component. Shows only where the Store has a `linked-service-page` ref.

**[H2]** MOT & Servicing Available Here

**Summary (1–2 lines):** This Carsa centre offers MOTs from £39 and full servicing from £120, booked online in minutes. Only the essential work, with the price agreed before we start.

**CTA label:** Book MOT & Servicing

---

## 5. SEO Metadata Table

British English. Titles ≤60 chars; descriptions ≤155 chars. Mountsorrel included (B3); Towcester description is about Towcester (B1).

| Page | SEO title | Meta description |
|------|-----------|------------------|
| Hub — `/mot-and-car-servicing` | MOT & Car Servicing from £39 \| Carsa | Book an MOT from £39 or a full car service from £120 at Carsa. Five UK centres, upfront pricing, and only the essential work. Book online. |
| Winter — `/mot-and-car-servicing/winter-health-check` | Free Winter Car Health Check \| Carsa | Get a free 8-point winter car health check at Carsa. We check oil, tyres, lights, battery, brakes and more. Five UK centres — book online. |
| Halesowen — `/mot-and-car-servicing/halesowen` | MOT & Car Servicing in Halesowen \| Carsa | Book your MOT from £39 or a car service from £120 in Halesowen with Carsa. Honest, essential-only work and easy online booking. |
| Cannock — `/mot-and-car-servicing/cannock` | MOT & Car Servicing in Cannock \| Carsa | Book your MOT from £39 or a car service from £120 in Cannock with Carsa. Honest, essential-only work and easy online booking. |
| Bolton — `/mot-and-car-servicing/bolton` | MOT & Car Servicing in Bolton \| Carsa | Book your MOT from £39 or a car service from £120 in Bolton with Carsa. Honest, essential-only work and easy online booking. |
| Towcester — `/mot-and-car-servicing/towcester` | MOT & Car Servicing in Towcester \| Carsa | Book your MOT from £39 or a car service from £120 in Towcester with Carsa. Honest, essential-only work and easy online booking. |
| Mountsorrel — `/mot-and-car-servicing/mountsorrel` | MOT & Car Servicing in Mountsorrel \| Carsa | Book your MOT from £39 or a car service from £120 in Mountsorrel with Carsa. Honest, essential-only work and easy online booking. |

---

## Build notes for the copy

- **One H1 per page (B6):** hub = "MOT & Car Servicing from £39"; each location = its hero-title; winter = "Free Winter Car Health Check". Everything else is H2/H3.
- **HiQ containment:** the partnership callout is the sole home of the HiQ name. Nothing else references HiQ.
- **No review number (B2):** the "Thousands of verified reviews" badge stays number-free; the Trustpilot widget supplies the live count.
- **"MOT + Service £30" — RESOLVED (2026-07-14):** confirmed verbatim from the live source site (`service.carsa.co.uk`): the combo card reads *"MOT Only £30 With A Full Service"* (*Discount on MOT & Service Combo*). The £30 is the **MOT price when a full service is booked** — a £9 saving on the £39 standalone MOT — not a standalone package total. Copy and hub schema updated to match.
