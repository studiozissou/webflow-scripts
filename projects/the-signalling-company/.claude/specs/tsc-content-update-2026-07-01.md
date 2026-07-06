# TSC Content Update — Full Page-by-Page Spec

> Date: 2026-07-01
> Source: "Text Content For Website" PDF (49 pages), `cargo-template-layout-plan.md`, call notes 30 Jun
> Updated: 2026-07-02 — Content doc v2 received with 94 comments (Will, Romain, Jarlath)
> Method: Live site snapshots via Chrome DevTools vs content doc + layout plan
> CEO preview: Thursday 3 Jul | Go-live: Monday 7 Jul

---

## Content Doc v2 — Changes Tracker (2 Jul 2026)

Source: `Text Content For Website (2).docx` — 94 inline comments from Will Morley, Romain Hourtiguet, and Jarlath Lally (18 Jun – 2 Jul 2026).

### Key Decisions from Comments

| Decision | Who | Date | Impact |
|---|---|---|---|
| Hero tag: "Safety-Critical" → **"Automatic Train Protection"** | Romain | 01 Jul | "Safety Critical is implicit in train protection" — use ATP as the general industry term |
| Hero H1 option: "Low-cost ETCS" → **"Zero-risk ETCS"** | Romain | 01 Jul | "We need to hammer the low risk message" — risk-driven decision making dominates the industry |
| Keep **"100% software defined"** language | Romain | 01 Jul | "Has worked well for us so far" |
| RailOS H1: **"One Platform - All ATP Systems"** (dash, not period) | Jarlath | 02 Jul | Alternative to "One platform. Every ATP system." — JL preferred |
| Consolidate product name: **"Telecom Box"** (not TOBA Box) | Jarlath | 02 Jul | Simplifies naming across all pages |
| Homepage card 2: **delete "others'"** entirely | Jarlath | 02 Jul | "Delete 'others'" — simpler sentence |
| RailOS proven-in-service stats: **mix all projects** to increase numbers | Romain | 01 Jul | Combine Lineas + Skoda + Akiem numbers for bigger impact |
| RailOS page: **request customer quote from Lineas** | Jarlath | 02 Jul | Specific quote requested about safety-first mindset |
| Leadership bios: **use Raphaël's bio as placeholder for all** | Romain | 01 Jul | "Still chasing people" — one real bio available now |
| CTA on RailOS page: **"briefing" vs "demo" vs "INDO"** — undecided | Romain | 01 Jul | Awaiting decision from Jarlath |
| Need **clickable icons for each train type** | Romain | 23 Jun | Freight, passenger, OTM — reuse across pages |
| Need **icons for each app** | Romain + Jarlath | 16-18 Jun | Will to handle — AI icon generation discussed |

### New Content Available (was missing, now provided)

| Content | Status | Action |
|---|---|---|
| **Raphaël Kleinplac bio** | WRITTEN | Update Leadership CMS + use as placeholder for others |
| **Akiem quote** — Patrice Bildstein, Deputy MD | WRITTEN | Add to Akiem case study page |
| **ADK pricing table** | PROVIDED | Add to Open RailOS page (General ADK €42k/yr, Safe ADK €95k/yr) |
| **Lineas Bruno Vanlede quote** — validated version | CONFIRMED | Minor wording change: "a few months maximum" (not "less than a month"), "about ten days" (not "less than ten days") |
| **Skoda Ignačák quote** — full text | CONFIRMED | Add full attribution with diacritics |
| **Customer segment copy** — differentiated per ICP | DONE (JL) | Fleet Operators=downtime, Leasing=asset value, Infra=standards, OEMs=integration |
| **RailOS page copy** — full 9-section layout | DONE (JL+WM) | Full rebuild from scratch needed |
| **Products page** — expanded product descriptions | DONE (JL) | ETCS (with ATO, Class B, JRU, Remote Access), wSTM new product |
| **RailOS Apps** — TCMS + wSTM apps added, DRU→TRU rename | DONE (JL) | Update CMS: 10 apps total (7 ATP + 3 Data) |
| **Devices** — all 17 with full descriptions | DONE (JL) | Update CMS items |
| **Device Partners** — 7 named | DONE (JL) | Duagon, Mios, Deuta, Scle, Hassler Rail, Lantech, Triorail |
| **Privacy policy** — full GDPR text | DONE (Legal) | Populate page |
| **404 copy** | DONE | "You reached the end of the tracks." |

### Content Doc v2 — Structural Changes

1. **New page: Customers** (`/customers` or `/projects`) — 4 ICPs with differentiated Why/How/What copy. Embeds case studies. Currently lives at `/projects` — rename decision needed.
2. **RailOS Apps expanded** — now 10 apps (was 9): added TCMS App and wSTM App. DRU renamed to **TRU** (configurable for DRU+JRU dual function).
3. **Products expanded** — now 6 products: ETCS, **Telecom Box** (was TOBA Box), PZB, KVB, TBL1, wSTM. Each has full copy with sub-features (ATO, Class B integration, Remote Access, JRU).
4. **RailOS page** — 9 sections with full copy. New "Disrupting the Cost and Risk Paradigm" section. "Zero supply chain risk for iEVC" card added.
5. **Services** — each service now has paired CTAs: CTA 1 → relevant case study, CTA 2 → contact.
6. **Menu entry points** — JL proposes 6 main nav items: Customers, Projects, RailOS, Products, Services, About/Insights.

### Still Blocked (updated from comments)

| Item | Owner | Comment Date | Blocks |
|---|---|---|---|
| Finalised hero copy — pick between options | Romain + JL | 01 Jul | Homepage build |
| RailOS section 5 ("Open ecosystem") body | Jarlath | 01 Jul | "needs work but I am out of time until later today" |
| RailOS FAQ content | Jarlath | 01 Jul | "needs work" |
| CTA wording ("briefing" vs "demo" vs "INDO") | Romain + JL | 01 Jul | RailOS page CTA |
| PZB country list (add remaining countries) | Jarlath | 25 Jun | PZB product + app description |
| wSTM country list ("UK, PL, CZ, <add complete>") | Jarlath | — | wSTM product description |
| Akiem project phase count ("[X] project phases") | Romain | — | Akiem case study body |
| Leadership bios ×7 (all except Raphaël) | Romain → team | 01 Jul | Leadership page depth |
| Leadership headshots ×8 | Romain | — | Leadership page photos |
| Partner logos in SVG | Romain | — | Logo ticker, service partners |
| 27Ev train photo | Romain | — | Homepage carousel, Skoda page, Projects OEM |
| BR189 photo | Romain | — | Homepage carousel, Akiem page |
| Architecture diagram | Jarlath | — | Homepage, RailOS, Devices |
| Bruno Vanlede headshot | Romain | — | Trust bar quote |
| Clickable train type icons | Romain → designer | — | Projects segments, case studies |
| App icons | Will → designer/AI | 18 Jun | RailOS Apps, Products, nav |
| Stats update (are 109 vehicles current?) | Romain | 01 Jul | Trust bar, RailOS proven section |

---

## Retest — 2 Jul 2026

Fresh snapshots taken of all pages. **41/41 tests pass** (`tests/acceptance/tsc-cms-population.spec.js`).

### What's been fixed since 1 Jul

| Page | Fix | Status |
|---|---|---|
| **Products** | H1 changed from services heading → "Equip your fleet with ETCS onboard products built to last" | DONE |
| **Products** | Services section removed from page | DONE |
| **Products** | Intro text with "RailOS Apps" and "Devices" crosslinks added | DONE (links go to `#` — need real targets `/railos/apps` and `/railos/devices`) |
| **Products** | Template form removed, CTA section added | DONE |
| **Products** | Template "Clients" heading removed | DONE |
| **Products** | 6 product cards with correct content | DONE |
| **Services** | 5 service cards with correct summaries | DONE |
| **Services** | Template "Clients" and "Designed to move..." removed | DONE |
| **About** | Founder crosslinks (Stanislas Pinte, Alexandre Betis) → `/leadership` | DONE |
| **About** | RailOS crosslink present | DONE |
| **About** | "Our philiosophy" typo fixed → "Our philosophy" | DONE |
| **About** | "[hyperlink to Open RailOS page]" placeholder removed | DONE |
| **News** | H1 changed to "News & Insights" | DONE |
| **News** | Subtitle added | DONE |
| **News** | 7 articles with correct dates (2021–2026) | DONE |
| **Projects** | ETCS crosslink added in Fleet Operators + Infrastructure Managers | DONE |
| **Projects** | Per-segment case study links added | DONE |
| **Lineas** | Crosslinks in body (ETCS, RailOS, installation, TBL1+, iEVC, maintenance) | DONE |
| **Lineas** | 7 stats including "Under 1" and "Under 3" | DONE |
| **Lineas** | "More projects" section populated | DONE |
| **RailOS Apps** | CMS collection created, 9 apps populated | DONE |
| **RailOS Apps** | Section 2 heading fixed to "Data acquisition & analytics" | DONE |
| **RailOS Apps** | All 9 apps link to `/railos-apps/{slug}` | DONE |

### What's still outstanding

| Page | Issue | Severity | Blocker? |
|---|---|---|---|
| **Homepage** | Still 100% Cargo+ template — no content swapped | CRITICAL | No — needs layout changes first |
| **Contact** | `hq@cargo.plus` template email still present | HIGH | No — Designer fix |
| **Contact** | Germany flag icon next to Brussels address | HIGH | No — Designer fix |
| **Contact** | Norway flag icon next to media contact | HIGH | No — Designer fix |
| **Contact** | Address links to German phone number `tel:+49201328443` | HIGH | No — Designer fix |
| **Contact** | Duplicate form CTAs ("Send message" + "Send request") | MEDIUM | No — Designer fix |
| **Leadership** | Heading is H2 not H1 | MEDIUM | No — Designer fix |
| **Leadership** | "Raphael Kleinplac" missing accent (Raphaël) | LOW | No — CMS fix |
| **Leadership** | "Head of Quality & System Assurance" title mismatch | LOW | No — CMS fix |
| **Leadership** | No photos, no bios | HIGH | BLOCKED — Romain |
| **Careers** | Tag says "Testimonial" (template) | MEDIUM | No — Designer fix |
| **Careers** | Heading is H2 not H1 | MEDIUM | No — Designer fix |
| **Careers** | Template stock photo | LOW | BLOCKED — Romain |
| **Open RailOS** | "Button Text" placeholder CTA | HIGH | No — Designer fix |
| **Open RailOS** | Heading is H2 not H1 | MEDIUM | No — Designer fix |
| **Open RailOS** | Template stock photo | LOW | No — Designer fix |
| **App Store** | Still pulling from Devices collection, not Apps | CRITICAL | Needs Designer rewire to RailOS Apps CMS |
| **Site-wide** | Footer FAQ link → `/template/faq` | MEDIUM | No — Designer fix |
| **Site-wide** | Footer RailOS Overview link → `#` | MEDIUM | No — Designer fix |
| **Site-wide** | Homepage "Get template" button → `app.byq.supply` | HIGH | No — Designer fix |
| **Site-wide** | Homepage "About us" link → `/template/about/about-a` | MEDIUM | No — Designer fix |
| **Site-wide** | "Work with us" CTAs → `#` on most pages | MEDIUM | Pending popup form build |
| **Products** | "RailOS Apps" and "Devices" intro links go to `#` not real targets | MEDIUM | No — Designer fix |
| **Projects** | ~~Customer segments near-identical copy~~ | ~~CRITICAL~~ | **RESOLVED in v2** — differentiated copy provided by JL |
| **Projects** | ~~"Locomotive & Train Manufacturers" says "infrastructure managers"~~ | ~~HIGH~~ | **RESOLVED in v2** — copy corrected |
| **Services** | Partner logos section empty | MEDIUM | BLOCKED — Romain |
| **All partner logos** | Not yet received | MEDIUM | BLOCKED — Romain |

### CMS collections created (all items in draft)

| Collection | ID | Items | Status |
|---|---|---|---|
| FAQ Categories | `6a4589b5fa26ad6fca2f2890` | 3 (Products, RailOS, Services) | Draft |
| FAQs | `6a45898e00485325224db7af` | 5 dummy items | Draft |
| RailOS Apps | `6a458cb63020a42432407cdc` | 9 → **10 needed** (7 ATP + 3 Data per v2: add wSTM + TCMS, rename DRU→TRU) | Draft — needs Designer wiring |

---

## Layout Changes Summary (Designer work required)

Quick-scan of all sections that need structural changes in the Webflow Designer, not just content swaps:

| Page | Section | Layout Change | Effort |
|---|---|---|---|
| **Site-wide** | Nav | Build Products + Services dropdown panels | Medium |
| **Site-wide** | Popup form | Build reusable modal contact form component (doesn't exist in template) | Medium |
| **Homepage** | Section 2: Solution cards | Carousel → 4-card static grid | Small |
| **Homepage** | Section 3: Projects | Single feature → 3-slide carousel with nav | Medium |
| **Homepage** | Section 4: Trust bar | Simple quote → logo ticker + quote + 4-stat row (3 visual elements) | Medium |
| **Homepage** | Section 5: Countries | Remove/add country items, adjust grid | Small |
| **Homepage** | Section 9: RailOS story | NEW section — heading + body + bullet list + CTA (use `section_features-about` or custom) | Medium |
| **RailOS** | Entire page | Full rebuild — 9 sections from scratch using template section mix | Large |
| **Products** | Remove services block | Delete services, partners, form sections from page | Small |
| **Products** | CTA | Replace inline form with CTA banner | Small |
| **About** | Projects carousel | Populate or remove empty section | Small |
| **About** | CTA section | 1 CTA → 6 destination links/cards | Small |
| **Case studies ×3** | "What's next" | Add related project cards row | Small |
| **RailOS Devices** | Device grouping | Add sub-headings to group 17 items by category | Small |
| **Open RailOS** | Application form | Custom 8-field form (not standard contact form) | Medium |
| **App Store** | Tile grid | App tiles with click-to-email-capture behaviour | Medium |

**Estimated Designer time for layout changes: ~4-6 hours**
**Estimated content population time: ~3-4 hours** (can be partially automated via MCP)

---

## Site-Wide Issues (fix first — affects every page)

### Broken links (template remnants)

| Element | Current Target | Correct Target |
|---|---|---|
| "Work with us" CTA (all pages) | `/template/contact/contact-a` | `/contact` or popup contact form |
| "Get template" button (homepage) | `app.byq.supply/templates/cargo_plus` | **Remove entirely** |
| "About us" link (homepage) | `/template/about/about-a` | `/about` |
| Footer "RailOS Overview" link | `#` (broken) | `/railos` |
| Footer "FAQ" link | `/template/faq` | `/faq` |

### CTA strategy (from call 30 Jun)

All CTA buttons across the site should trigger a **popup contact form** with a hidden field recording the originating page. Keep the dedicated `/contact` page in the nav. Every "Work with us" / "Get in touch" button → popup form, not a page redirect.

### Footer

Footer structure is correct. One fix needed:
- **"Built on Webflow by Studio ZIssou"** → update to "Built on Webflow by Studio Zissou" (capitalisation of "Zissou")

### Nav structure (JL notes 17 Jun + call 25 Jun) — LAYOUT CHANGE

**JL's proposed 6 menu entry points (from content doc v2):**
1. **M2: Our Customers** — embed case studies, aligned with customer ICPs
2. **M3: Projects** — links to case studies (shared with M2)
3. **M4: RailOS** — merged with "Our Tech". Becomes its own hub with sub-pages: Apps, Open RailOS, ADK, App Store, Devices, Device Partners, Device Certification
4. **M5: Products** — 6 products (ETCS, Telecom Box, PZB, KVB, TBL1, wSTM)
5. **M6: Services** — 5 services
6. **M7: Insights & News**
7. (Plus About, Careers, Contact, Leadership under Company)

> **Note:** "iEVC & ETCS" page is PAUSED. "RailOS Systems" is TODO for JL. Consider whether these become sub-pages later.

### Nav dropdowns (from call 25 Jun) — LAYOUT CHANGE

Nav items are present but dropdowns need content. **This is a Designer layout change** — need to build dropdown panels for Products and Services matching the existing RailOS/Projects/Company dropdown pattern:
- **Products** dropdown: show all 6 product cards (ETCS, TOBA Box, PZB, KVB, TBL1, wSTM). Category card visually distinct (larger, different colour).
- **Services** dropdown: show all 5 services. Category card visually distinct.
- Pattern must be **consistent across all 5 dropdowns** (RailOS, Products, Services, Projects, Company).
- Projects dropdown: consider icons or company logos next to project names (Romain's idea for when the list grows).

### Popup contact forms — LAYOUT CHANGE

Need to build a reusable popup/modal contact form component. This doesn't exist in the Cargo+ template. Requirements:
- Triggers from any CTA button across the site
- Hidden field auto-populated with the originating page URL
- Same fields as the Contact page form
- Privacy policy consent checkbox
- Accessible: focus trap, Escape to close, scroll lock on body

---

## Page 1: HOMEPAGE (`/`)

### Current state: 100% Cargo+ template — every section needs replacing

---

#### Section 1: Hero (`section_hero-home`) — CONTENT SWAP (no layout change)

Template section structure works as-is: H1 + sub + 2 CTAs + background. Just swap content.

**Live now:**
- H1: "We move the world forward"
- Sub: "Built to connect fleets, warehouses, and clients through data-driven transport systems and clear communication."
- CTA 1: "Get template" → `app.byq.supply/templates/cargo_plus`
- CTA 2: "Work with us" → `/template/contact/contact-a`

**Change to (from content doc v2 — with Romain/JL feedback):**

- Tag: **"Automatic Train Protection"** (Romain: "Safety-Critical is implicit") or "Next-Generation Automatic Train Protection" or "100% Software Defined Automatic Train Protection"
- H1: "Your fleet stays compliant. Your costs stay down. Your system never goes obsolete."
- H1 sub-options from Romain/JL:
  - ~~"Low-cost ETCS with Evergreen Software, Devices, and Compliance"~~ → **"Zero-risk ETCS with Evergreen Software, Devices, and Compliance"** (Romain: "go for Zero risk")
- Sub (option A): "The Signalling Company builds the ETCS onboard systems that freight and passenger operators rely on across Europe. Software-defined, lighter to install, and designed to evolve with your fleet — not against it."
- Sub (option B from Romain): "Driven by a cost-sustainable safety paradigm our Open ATP Platform is 100% software-defined, eliminating device obsolescence and regulatory change risks that have plagued the industry for decades. Join us today on the path to cost-sustainable safety."
- CTA 1: "See how it works" → `#platform` (scroll to RailOS section on-page)
- CTA 2: "Talk to our team" → popup contact form
- Background: Corporate/workshop video or dark static with motion

> **TODO:** Client must pick between hero copy options. Romain and JL both provided alternatives — need final sign-off before build.

**Image:** `cliff-119` (workshop wide shot, atmospheric). Alt: `rosendaal-124` (workshop + 2 freight trains).

---

#### Section 2: What TSC Delivers (`section_about-home`) — LAYOUT CHANGE NEEDED

Template has a carousel with 1 card visible at a time. Content doc needs **4 static cards visible simultaneously** (grid layout). Change from carousel → 2×2 or 4-column card grid. Each card needs: heading, body paragraph, and a CTA link.

**Live now:**
- Tag: "Your partner in move"
- H2: "From highways to harbors, Cargo+ powers global logistics networks..."
- Link: "About us" → `/template/about/about-a`
- Carousel: "Road Freight" card with Cargo+ content

**Change to:**
- Section heading: "A different approach to train protection"
- Body: "TSC's systems are built on RailOS — a software-defined platform that runs ETCS and national Class B applications on a single set of hardware. Update the software, not the box. Add new country systems without new equipment. Choose your applications, not your vendor."
- **4 solution cards:**

| Card | Heading | Body | Link |
|---|---|---|---|
| Card | Heading | Body | Link |
|---|---|---|---|
| 1 | Make one safety investment — serve many markets | ETCS and national Class B applications such as TBL1+, PZB, and KVB can all run on the same SIL4-certified computer, the iEVC. | See our products → `/products` |
| 2 | Software updates, not system replacement | When regulations change or ~~others'~~ devices become obsolete, only the software changes. It's a risk-free investment, ensuring your fleet stays safety-compliant with almost no downtime. *(JL: delete "others'" — keep it simple)* | Explore RailOS → `/railos` |
| 3 | Lighter, faster, smaller | Maximize space for freight and passengers. Unlike conventional rack-based systems, our small modular Ethernet-connected device architecture means systems can be mounted in any dead-space with minimal cabling. | See certified devices → `/railos/devices` |
| 4 | Open RailOS Developer Program | Interested in using RailOS to develop your own App? Our RailOS SDKs allow qualified developers to build, test, and certify their own digital rail applications. Apply today! | Open RailOS → `/railos/open` |

> **Crosslink:** Card 3 should link to Lineas installation timelapse video when available.

**Image:** `cliff-148` (3 boxes piled, no caps — shows product consolidation) as section background or accent. Card icons from brand book (waiting on designer).

---

#### Section 3: Featured Project → Projects Carousel (`section_home-clients`) — LAYOUT CHANGE NEEDED

Template has a single featured case study with video background. Content doc needs a **3-slide carousel** (one per project) with tag, heading, body, CTA, and image per slide. Repurpose the existing `section_home-clients` structure but add carousel navigation (dots/arrows) and 2 additional slides. Auto-advance with 8-10 second interval.

**Live now:**
- Tag: "Clients"
- H2: "We helped a European carrier cut downtime by 18% and expand its fleet without adding a single truck."
- Link: "Read case study" → `#` (broken)

**Change to:**
- Section heading: "Proven in the field"
- Sub: "TSC systems are in service on real fleets, in real countries, running real traffic."
- **3-slide carousel (one per project):**

**Slide 1 — Lineas HLD77:**
- Tag: **Freight Fleet Operator — Retrofit** *(updated from content doc v2)*
- Heading: "109 freight locomotives. 3 countries. ETCS and Class B."
- Body: "Lineas, Europe's largest private freight operator contracted TSC to deliver a fully managed retrofit, authorization, and 10-year maintenance program."
- CTA: "Read the case study" → `/projects/lineas-hld77`
- Visual: Lineas locomotive photo or installation timelapse still

**Slide 2 — Skoda / RegioJet 27Ev:**
- Tag: **Train Manufacturer — New ATP Fitment** *(updated from content doc v2)*
- Heading: "Supporting ETCS and Czech Class B for 34 new hybrid trains."
- Body: "TSC's ATP platform is designed into Škoda Transport's innovative 27Ev hybrid-power Multiple Unit fleet currently being built for RegioJet passenger services."
- CTA: "Read the case study" → `/projects/skoda-regiojet`
- Visual: 27Ev train photo (ask Romain for Skoda imagery)

> **Note:** Slug changed to `skoda-regiojet` in content doc v2 (was `skoda-27ev`). Check which slug is live.

**Slide 3 — Akiem BR189:**
- Tag: **Fleet Lessor** *(updated from content doc v2)*
- Heading: "Extending the useful life of fleet assets."
- Body: "Assessing the viability of retrofitting fleet assets for a new mission and area of use can be challenging. Today, our professional services team is busy applying our 200+ years of signalling, safety and authorization expertise to helping Akiem find new and commercially viable use cases for older fleet assets."
- CTA: "Read the case study" → `/projects/akiem-br189`
- Visual: BR189 photo (ask Romain)

> **Crosslink — Romain:** Add clickable icons for train types — freight (Lineas), passenger (Skoda), OTM (Akiem). Reuse these icons on Projects page customer segments.

**Images:** Slide 1 Lineas: `rosendaal-088` (2 freight locos in workshop). Slide 2 Skoda: MISSING — need 27Ev from Romain. Slide 3 Akiem: MISSING — need BR189 from Romain.

---

#### Section 4: Trust Bar + Proof Points (`section_testimonial`) — LAYOUT CHANGE NEEDED

Template has a simple quote + 2 stats. Content doc needs a **3-part trust stack**: logo ticker strip (above) + quote with photo (middle) + 4-stat row (below). This is 3 visual elements combined in one section. May need to use `section_logo-home` for the ticker and `section_testimonial` for the quote+stats, or restructure the testimonial section to include all three.

**Live now:**
- H2: "Retrofit Viability Assessment for Akiem"
- Stats: "10 countries", "87.0 ton locomotive weight"
- Template author photo (generic)

**Change to:**
- **Logo ticker (no heading):** Lineas, Skoda Transportation, Akiem, Skoda Group, certification/notified body marks
- **Quote (validated by client — minor wording changes from v1):** "It's a completely different experience. Downtime for the fleet is a fraction of what it was with previous retrofit projects. The software updates take **a few months maximum**, the installation takes **about ten days**, the automated commissioning takes less than three hours. As fleet managers know, these numbers are amazing and make **a** world of difference. TSC are risk killers for retrofit projects." — Bruno Vanlede, Head of Rail Fleet Management at Lineas
- **Stats row:**

| Stat | Label |
|---|---|
| 109+ | Vehicles equipped |
| 3 | Countries in service |
| 10 yr | Maintenance commitment |
| 2025 | ETCS certified |

> **TODO — Romain:** Double-check these numbers are current (comment 01 Jul). Mix all project stats (Lineas + Skoda + Akiem) for bigger impact numbers.

**Image:** `cliff-080` (euroantenna under train — shows scale). Bruno Vanlede headshot still needed from Romain.

> **BLOCKED — Romain:** Partner logos in SVG or transparent PNG single colour. Need these from Romain before logo ticker can be populated.

---

#### Section 5: Country Network (`section_network`) — CONTENT SWAP + MINOR LAYOUT TWEAK

Template structure works (flag grid). Need to **remove 5-6 countries** and **add 3-4** to match TSC's actual coverage. May need to adjust grid columns if total country count changes significantly (template has 14, TSC has ~10-11).

**Live now:**
- Tag: "Our network"
- H2: "Operating across fourteen countries"
- Subtext: "CARGO+ CONNECTS FLEETS AND BORDERS INTO NETWORK"
- Countries shown: Poland, Germany, UK, Belgium, US, South Korea, Netherlands, Denmark, Brazil, Norway, France, Sweden, Spain (Cargo+ template countries)

**Change to:**
- Remove "CARGO+ CONNECTS FLEETS AND BORDERS INTO NETWORK"
- H2: "Operating across [X] countries" (confirm number with Romain)
- Replace country grid with TSC's actual operating countries:
  - Belgium
  - Netherlands
  - Germany
  - Czech Republic
  - Austria
  - France
  - Romania
  - Serbia
  - Croatia
  - Poland (if applicable)
  - UK (if applicable via wSTM)
- Replace country flag images with correct flags
- CTA: "Work with us" → popup contact form

---

#### Section 6: Newsroom (`section_newsroom`) — CONTENT SWAP (no layout change)

Template carousel structure works. Just needs content and date fix.

**Live now:**
- Tag: "Newsroom"
- H2: "Updates that move the world forward"
- 1 news card: "TSC to build new mobile app for Belgian Class B system (TBL1+)" — date: "June 29, 2021"

**Change to:**
- H2: "Insights & News" or "Updates from The Signalling Company"
- Fix news article date from 2021 to correct date
- Show 3 news cards (CMS-powered) — currently only 1 visible
- Link: heading or "View all" → `/news`

---

#### Section 7: FAQ (`section_home-faq`) — CONTENT SWAP (no layout change)

Template accordion structure works perfectly. Just swap all 6 questions and answers.

**Live now (all Cargo+ template content):**
- Q1: "What services does Cargo+ provide?" → Cargo+ answer
- Q2: "Can Cargo+ handle international shipments?" → Cargo+ answer
- Q3-Q6: All Cargo+ template content

**Change to (from `homepage-railos-copy-layout.md`):**

**Q1: Is TSC certified for safety-critical railway systems?**
A: Yes. RailOS and our ETCS application are SIL4-certified — the highest safety integrity level for railway signalling. Our systems have been assessed by independent notified bodies and approved by national safety authorities in Belgium, the Netherlands, and Germany.

**Q2: How does a software-defined system handle safety certification?**
A: The same way any SIL4 system does — through rigorous verification, validation, and independent assessment. The difference is that our safety case is designed for software evolution. When an application is updated, only the changed software component needs re-certification, not the entire system.

**Q3: What happens when I need to operate in a new country?**
A: You deploy the relevant national ATP application (PZB for Germany, KVB for France, TBL1+ for Belgium) as a software package on your existing RailOS hardware. No new boxes, no new wiring, no new depot integration. The hardware stays the same.

**Q4: How is TSC different from Alstom, Siemens, or Thales?**
A: Those vendors build closed, proprietary systems where the hardware, software, and roadmap are controlled by the vendor. TSC's platform is open — software-defined, hardware-agnostic, and available to third-party developers. We also offer full lifecycle services from assessment through homologation to 10-year maintenance, so you're supported from day one to decade two.

**Q5: TSC is a younger company. Why should I trust you with safety-critical systems?**
A: Our founding team built ATP systems at Alstom, Bombardier, and other major OEMs before starting TSC. The collective experience is measured in decades, not years. TSC is part of the Skoda Group, providing corporate stability and manufacturing scale. And our systems are independently certified to the same SIL4 standard as every incumbent — the maths doesn't care who built it.

**Q6: What does a typical ETCS retrofit project look like?**
A: We start with a fleet assessment to determine scope and compatibility. Then we manage the homologation process with the relevant national safety authority — the most complex part of any retrofit. Once approved, our team handles installation and commissioning. Typical timelines depend on fleet size and country requirements. → [Talk to us about your fleet → `/contact`]

---

#### Section 8: CTA (`section_cta`) — CONTENT SWAP (no layout change)

Template CTA banner works. Swap text and link target.

**Live now:**
- H2: "Let's move your business forward"
- CTA: "Work with us" → `/template/contact/contact-a`

**Change to:**
- H2: "Ready to talk about your fleet?"
- Sub: "Whether you're retrofitting an existing fleet, specifying systems for a new build, or assessing your options — our team has done this before."
- CTA: "Get in touch" → popup contact form (hidden field: source=homepage-cta)
- Background: Video or dark overlay

---

#### Section 9: RailOS story (NEW — `#platform` anchor) — LAYOUT CHANGE: NEW SECTION

**This section does not exist on the live site.** Need to add a new section between the Projects carousel and the FAQ (or between FAQ and CTA). Use `section_features-about` from the About C template page as the base — it has feature cards with icons that can hold the 4 bullet points. Add an anchor ID `platform` so CTA 1 can scroll to it. Or build a custom section with heading + body paragraph + bullet list + CTA link.

- Section heading: "Built on RailOS — the operating system for train protection"
- Body: "RailOS is the technology that makes all of this possible. A portable, real-time operating system built from a blank sheet — no legacy code, no inherited limitations. It runs any certified ATP application on standard, off-the-shelf hardware. And it's open: OEMs and third-party developers can build their own applications using the RailOS developer kit."
- Bullet list — "This is what software-defined actually means:"
  - Your ETCS system is a software application, not a hardware box
  - Adding a new country system (PZB, KVB, TBL1+) is a software deployment, not a hardware installation
  - When regulations change, the application updates — the hardware stays
  - When your fleet moves to a new market, the system adapts
- CTA: "Explore the full RailOS story" → `/railos`

**Image:** `cliff-155` (full system installed, vertical) or `cliff-156` (horizontal). Architecture diagram still needed from Jarlath as complement.

---

## Page 2: RAILOS (`/railos`)

### Current state: 100% Cargo+ template — identical to homepage. Full rebuild needed.

**LAYOUT NOTE:** The entire page is currently a copy of the homepage template. Need to either:
- (a) Build from scratch using template sections from other pages (About C hero, About C features, Services system grid, About B quote, Services list, FAQ, CTA), or
- (b) Duplicate a suitable template page (About C is closest structurally) and modify

The RailOS page has **9 sections** (most pages have 3-5). This is the deepest page on the site. Recommended approach: duplicate About C as base, then add sections from Services and FAQ templates.

---

#### Section 1: Hero — USE `section_hero-about-c` (short punchy H1)

**Live now:** "We move the world forward" (Cargo+ template — identical to homepage)

**Change to:**
- Tag: "Our Core Technology"
- H1: **"One Platform - All ATP Systems"** *(JL 02 Jul — preferred over "One platform. Every ATP system.")*
- Sub: "RailOS is the software-defined operating system for safety-critical train protection. It runs ETCS and national Class B systems on a single set of hardware — upgradable by software, not hardware replacement."

**Above the hero, add preamble text (from content doc v2):**
> RailOS is a uniquely portable and scalable real-time operating system with its own application development environment and language. Supporting both non-safety and safety-critical digital rail applications, it eliminates the need for proprietary devices and reduces the impact of regulatory changes to simple software-only upgrades.
>
> When clients invest in RailOS, they are not investing in a product that will be obsolete in a few years' time. Instead RailOS provides fleet operators and owners with an evergreen asset, incrementally and affordably extendable with the addition of new or improved applications and plug-in devices.
>
> Over the lifetime of a rail vehicle, which can exceed 50 years, this amounts to massive savings on maintenance and upgrades.

**RailOS Case Study blurb (add below preamble or as sidebar):**
> "The ultimate stress test for a safe operating system is a Safety Integrity Level 4 application. Near the top of the list of SIL4 applications, in terms of complexity, sits Europe's on-board ETCS. Exhaustively developed and tested under real world on-track conditions since 2020, RailOS ensured that our flagship ETCS was certified in September 2025 (an industry record)."

---

#### Section 2: The Problem (NEW) — LAYOUT CHANGE: NEW SECTION

**Not on live site.** Use `section_features-about` (3-card grid from About C template) — each card gets an icon, heading, and body paragraph. Or use `section_system` (feature grid from Services template) which also supports icon + heading + body cards.

Section heading: **"Disrupting the Cost and Risk Paradigm"** *(updated from content doc v2)*

| Card | Heading | Body |
|---|---|---|
| 1 — Lowest risk technology | Say goodbye to proprietary technology | A RailOS investment insulates you from proprietary technology risk and the regular obsolescence-driven system upgrades that it triggers. Using standard off-the-shelf Ethernet connected devices, RailOS is aligned with the most mature open-standard device interface and high-volume (lowest cost) electronics market. |
| 2 — No more device obsolescence risk | Swap the device, not the system | When a RailOS device becomes obsolete it will never trigger a system replacement. Based on an off-the-shelf Ethernet connected and modular device architecture, RailOS assures cost-effective plug-and-play device replacement over the operational lifetime of your fleet. |
| 3 — Zero supply chain risk for iEVC | The heart of your safety system is assured | Portable to any safe or non-safe computer platform, RailOS and your RailOS Applications remain evergreen, ensuring both supply chain continuity and competition over the lifetime of your fleet for this most vital device. |

**Image:** Icons needed (not photos). Waiting on brand book icons from designer.

---

#### Section 3: What RailOS Changes — LAYOUT CHANGE: NEW SECTION

Use `section_system` (4-card grid from Services template). Each card needs: icon, heading, body, and a CTA link. Template `section_system` supports this pattern. 4 cards in a 2×2 grid.

Section heading: **"100% software-defined, open standard ATP platform"** *(updated from content doc v2)*

| Card | Heading | Body | Link |
|---|---|---|---|
| 1 | Run multiple ATP applications on a single safe computer (the iEVC) | RailOS is a portable, SIL4 certified real-time operating system. Running on our off-the-shelf SIL 4 computer, the iEVC, RailOS supports native RailOS Apps for the ETCS, TBL1+, PZB, and KVB safety standards. In addition, 3rd party ATP systems can be integrated seamlessly with our unique wSTM App. | See our products → `/products` |
| 2 | Upgrade by software. Eliminate obsolescence. | When standards evolve or regulations change, RailOS applications are updated remotely. The hardware stays. Your fleet stays compliant without depot downtime or capital replacement cycles. | See our services → `/services` |
| 3 | Build your own safety-critical applications | RailOS includes an Application Developer Kit for OEMs and third-party developers. Write, test, and certify new applications on a proven, SIL4-compliant platform. No other ATP vendor offers this. | Explore Open RailOS → `/railos/open` |
| 4 | Half the boxes, half the installation time | The software-defined approach consolidates what was previously 4-6 separate hardware units into a single compact system. Lighter on the vehicle, faster in the depot, and simpler to maintain. | See certified devices → `/railos/devices` |

> **Crosslink:** Card 1 — "wSTM App" → `/railos/apps` (new app from v2). "iEVC" → `/railos/devices`.

**Image:** `cliff-148` (3 boxes piled — consolidation story) as section accent. Card icons from brand book (waiting on designer).

---

#### Section 4: Credibility Quote — USE `section_quote` (no layout change)

Template `section_quote` (from About B/C) supports blockquote with attribution. Works as-is.

**Quote option A (internal — current placeholder):**
"We entrust our lives to the safety systems that we build. RailOS was conceived, designed, and built without compromise — no legacy code, no hacks, no shortcuts."
— Alex Betis, CEO, The Signalling Company

**Quote option B (customer — being requested):**
JL asked Romain (02 Jul) to request from Lineas: "While RailOS liberates us from the burden of the old ETCS cost paradigm, our number one priority is safety. TSC share our safety-first mind-set and have been uncompromising in this regard."

> **TODO:** If Lineas provides a real customer quote, use it. The customer quote carries far more weight.

---

#### Section 5: Applications Overview — LAYOUT CHANGE NEEDED

This needs a **table or expandable list** showing 6 ATP apps + 3 data apps. Options:
- Use `section_services` (expandable accordion items from Services template) — each app as an expandable item with heading + body
- Use `section_system` (card grid) — but 9 items is a lot for a grid
- **Recommended:** Use expandable list for ATP apps (most detail), simple card row for Data apps (less detail). Two sub-groups with sub-headings.

Section heading: "Applications built on RailOS"
Sub: "Every application is certified, field-proven, and runs on the same SIL4 hardware."

**ATP Applications:**

| Application | One-liner | Status | Link |
|---|---|---|---|
| ETCS | European Train Control System — Levels 1 & 2 | Certified 2025, in service | → `/products/etcs` |
| TBL1+ | Belgian national ATP (standard, ++, NG) | In service since 2025 | → `/products/tbl1` |
| PZB | German/Austrian national ATP | In certification | → `/products/pzb` |
| KVB | French national ATP | In development | → `/products/kvb` |
| iSTM | Software-defined STM for ETCS + Class B integration | Available | → `/railos/apps` |
| TOBA | Telecom onboard architecture — GSM-R, 4G/5G, FRMCS | Available | → `/products/toba-box` |

**Data Applications:**

| Application | One-liner |
|---|---|
| DJR | Digital Journey Replay — troubleshooting and analytics |
| DRU | Digital Recording Unit — train + juridical data capture |
| LRU | Local/remote data extraction tool |

→ Full application details `/railos/apps`

---

#### Section 6: Proven in Service — USE `section_testimonial` or `section_stats-a` (minor layout tweak)

Template `section_testimonial` supports stats + body text. May need to add case study links below the body text (2 text links, not buttons). Or use `section_stats-a` which has a stats row format.

**Timeline stats (from content doc v2 — replaces simple stat row):**

| Year | Milestone |
|---|---|
| 2019 | On track testing since |
| 2023 | RailOS Certified |
| 2024 | TBL1+ Certified |
| 2025 | ETCS Certified / HLD77 Authorized |
| 2026 | 40+ Operating HLD77s (and rising) / 2-week Installation and Commissioning |

> **Crosslink:** "2-week installation" → link to Lineas timelapse video when available.

Body: "Today RailOS powers the ETCS and Class B retrofit of 109 Lineas freight locomotives operating in Belgium, the Netherlands, and Germany. Next up, Skoda Transport's 27Ev Hybrid Multiple Unit passenger train for Regiojet."

→ Lineas HLD77 project `/projects/lineas-hld77`
→ Skoda 27Ev project `/projects/skoda-regiojet`

> **TODO — Romain:** Mix all projects in these stats to increase numbers of trains and countries.

**Image:** `rosendaal-124` (workshop with 2 freight trains and people) or `rosendaal-088` (2 locos, tighter angle).

---

#### Section 7: FAQ — USE `section_home-faq` or `section_faq-list` (no layout change)

Copy the FAQ accordion from the homepage template or the dedicated FAQ page template. Structure works as-is.

Section heading: "Technical questions about RailOS"

**Q1: How does RailOS help manage ETCS Baseline updates?** *(updated from content doc v2)*
A: RailOS separates the safety-critical ETCS application layer from the hardware device layer. When a Baseline is updated we simply update our software, the underlying hardware remains untouched. RailOS was designed for low-cost and software-only adaptation to the ever evolving ETCS standard.

**Q2: Can RailOS run third-party applications alongside TSC's own apps?**
A: Yes. The Application Developer Kit allows qualified third-party developers to build, test, and certify their own RailOS applications.
→ Learn about Open RailOS `/railos/open`

**Q3: What hardware does RailOS run on?**
A: The core computing platform for our safety applications is the iEVC, a SIL4-certified safe computer designed for rail environments. RailOS also supports a certified ecosystem of peripheral devices required for each application.
→ See all certified devices `/railos/devices`

**Q4: How does RailOS handle interoperability between ETCS and national Class B systems?** *(updated from content doc v2)*
A: We have two STM (Specific Transmission Module) Apps. Our iSTM App manages interoperability between our native RailOS ETCS and Class B Apps. Our wSTM App manages interoperability between our native RailOS ETCS and 3rd Party Class B systems. Both STMs are configurable for simple no-code Class B integration.

> **Crosslink:** "iSTM App" → `/railos/apps`, "wSTM App" → `/railos/apps`, "iEVC" → `/railos/devices`.

---

#### Section 8: Explore the RailOS Ecosystem — LAYOUT CHANGE: NEW SECTION

Need a **4-card hub navigation** section. Use `section_setup` (audience segment cards from About B) or `section_features-about` (feature cards from About C). Each card: heading, 1-line description, and link. 4 cards in a row.

| Card | Link | Description |
|---|---|---|
| RailOS Applications | `/railos/apps` | All ATP and data applications available on the platform. |
| Certified Devices | `/railos/devices` | The hardware ecosystem — from the iEVC computer to radios, sensors, and recording units. |
| Open RailOS | `/railos/open` | The developer program and Application Developer Kit for OEMs and third parties. |
| RailOS App Store | `/railos/app-store` | Browse and select ATP applications for your fleet. *(Coming soon)* |

---

#### Section 9: CTA — USE `section_cta` (no layout change)

Standard CTA banner from template. Content swap only.

- H2: "See RailOS in action"
- Sub: "Request a technical briefing or discuss how RailOS fits your fleet."
- CTA: "Request a briefing" → popup contact form (hidden field: source=railos-cta)

---

## Page 3: PRODUCTS (`/products`)

### Current state: Partially populated — product cards have TSC content but major structural issues

**LAYOUT NOTE:** This page currently combines Products AND Services on the same page (the Services page was duplicated as the base for Products). Need to **remove the services section, service partners section, and inline form**. What should remain: hero + product card grid + CTA. The product card grid layout works — it's using the template's expandable service list which works for products too.

---

#### Issues to fix:

1. **Wrong H1.** Currently: "Our Services cover railway signalling, ETCS projects and beyond" — this is the Services page heading, not Products.
2. **Services section incorrectly included.** The 5 services are listed on this page below the products. They should only be on `/services`. **LAYOUT CHANGE: Remove entire services block.**
3. **Product intro text missing.** No page intro paragraph.
4. **Form at bottom has template dropdown options** ("First choice", "Second choice", "Third choice"). **LAYOUT CHANGE: Remove inline form, replace with CTA section.**
5. **"Clients" section heading** and "Designed to move your operations forward" are template text. **Remove.**
6. **Service partners section** — should only be on Services page. **LAYOUT CHANGE: Remove.**

#### Section 1: Hero (`section_hero-about-a`)

**Live now:** Tag "Services", H1 "Our Services cover railway signalling, ETCS projects and beyond"

**Change to:**
- Tag: "Products"
- H1: "Equip your fleet with ETCS onboard products built to last"
- Intro paragraph: "Powered by RailOS Apps and Devices, the TSC portfolio of digital rail solutions is constantly expanding. Capable of addressing both on-board and trackside applications, safety and non-safety critical, today our portfolio includes:"
- Add crosslinks in intro: "RailOS Apps" → `/railos/apps`, "Devices" → `/railos/devices`

---

#### Section 2: Product Cards (6 products — CMS)

**Currently populated.** Summaries are short. Full descriptions from content doc v2 now available for all product pages.

**ETCS** — Full page at `/products/etcs` needs (from content doc v2):
- Full intro: "Our certified award-winning onboard ETCS system is based on our iEVC-RailOS safe computing platform. Compared to conventional rack based systems, our uniquely scalable and modular ETCS delivers 5x to 10x TCO gains over the operational life of the train."
- Sub-features (each needs own section or expandable):
  - **ATO** — "A key part of the ETCS Baseline 4 standard, ATO over ETCS is available now as part of an integrated Baseline 4 software package or can be ordered as part of a future upgrade."
  - **Multiple National Class B Systems** — "The platform seamlessly integrates National Class B systems" + country table/carousel with flags and acronyms
  - **JRU** — "The RailOS JRU App combined with Crash Protected Memory eliminates the need for a stand-alone juridical data system, reducing hardware, installation and lifetime maintenance costs."
  - **Remote Access** — "Choose from any remote access technology: 4G/5G/6G/WiFi/Tetra/FRMCS."
- Crosslinks: Lineas, Skoda, Akiem case studies. "See our Telecom Box" → `/products/telecom-box`

**Telecom Box** *(renamed from TOBA Box — JL 02 Jul: "consolidate on Telecom Box")*:
- Full copy: "A true FRMCS onboard gateway, 5G railway onboard. A value-add option with our ETCS platform, our Telecom Box eliminates the need for multiple stand-alone telecom and GPS devices, reducing hardware, installation and lifetime maintenance costs. FRMCS and TOBA ready, our Telecom Box offers a simple and cost effective upgrade path supporting these emerging standards."
- Crosslinks: ETCS product → `/products/etcs`, Telecom Box device → `/railos/devices`

> **TODO:** Rename from "TOBA Box" to "Telecom Box" across all pages (CMS item name + nav + any references).

**PZB** — Full page at `/products/pzb`:
- National Network Coverage: **Germany, Austria, Romania, Serbia, and Croatia** *(countries confirmed in v2)*
- "Based on our common safe-computing platform, iEVC, our PZB solution is available in two configurations, stand-alone and ETCS-integrated."
- Crosslinks: iEVC → `/railos/devices`, ETCS → `/products/etcs`
- **TODO — JL:** "JL to add number and list the countries" (comment 25 Jun)

**KVB** — Full page at `/products/kvb`:
- National Network Coverage: **France**
- Same structure and copy pattern as PZB
- Crosslinks: iEVC → `/railos/devices`, ETCS → `/products/etcs`

**TBL1** — Full page at `/products/tbl1`:
- National Network Coverage: **Belgium**
- Includes +, ++, and NG variations
- Crosslinks: iEVC → `/railos/devices`, ETCS → `/products/etcs`

**wSTM** *(Product 6 — from content doc v2)*:
- Application Category: Automatic Train Protection
- National Network Coverage: **UK, PL, CZ, [add complete country list — BLOCKED JL]**
- "Our universal wSTM solution seamlessly integrates 3rd party National Class B systems in xx countries."
- Crosslinks: iEVC → `/railos/devices`, RailOS → `/railos`

> **Crosslink opportunity:** Each product page should link to the relevant case study where that product is deployed. ETCS → Lineas + Skoda. PZB → Lineas (international cohort). TBL1 → Lineas (Belgian fleet).

**All CMS template pages** (`/products/{slug}`, `/services/{slug}`, `/railos/apps/{slug}`) should include a "View more" link row at the bottom of the page body, before the CTA section. E.g.:
- Product pages → "View all products" → `/products`
- Service pages → "View all services" → `/services`
- App pages → "View all apps" → `/railos/apps`

---

#### Section 3: Remove services from this page

**Remove:** The 5 service cards (Retrofit Assessment, Homologation, Installation, Training, Maintenance) and the "Today we deliver a full suite..." heading. These belong only on `/services`.

#### Section 4: Remove form from this page

**Remove:** The "Send us a message" form. Products page should end with a CTA section → popup contact form, not an inline form.

#### Section 5: CTA (replace current content)

- H2: "Find the right product for your fleet"
- CTA: "Talk to our team" → popup contact form (hidden field: source=products-cta)

**Image:** `cliff-143` (all 3 boxes laid out — product family overview). CTA section: `cliff-157` (full system close-up).

---

## Page 4: SERVICES (`/services`)

### Current state: Populated — content matches doc, some structural issues

---

#### Issues to fix:

1. **H1 is correct** ("Our Services cover railway signalling, ETCS projects and beyond") but tag says "Services" (fine).
2. **Same H1 also appears on Products page** — remove from Products.
3. **Form at bottom has template dropdown options.**
4. **"Clients" heading** and "Designed to move your operations forward" are template text.
5. **Service partner logos missing** — heading says "Service partners" but no logos shown. **BLOCKED — Romain:** Need partner logo assets from Romain before this can be populated.

#### Section 1: Hero

- Tag: "Services"
- H1: "Our Services cover railway signalling, ETCS projects and beyond" ← keep as-is (matches content doc)
- Intro: "Today we deliver a full suite of tried and tested services for ETCS & Class B projects that include:" ← keep as-is

#### Section 2: Service list (5 services)

**Currently populated correctly.** Each links to its own page. Content matches the content doc summaries. Individual service pages (`/services/{slug}`) need:

**ETCS Retrofit Viability Assessment:**
- Full content: "Many operators need to assess the viability of retrofitting their fleets with ETCS. At TSC we offer an ETCS Retrofit Viability Assessment. The assessment accurately determines the technical, regulatory, and authorization risk and cost associated with upgrading their fleets using our uniquely scalable and award-winning ETCS."
- CTA 1 → `/projects/akiem-br189` (case study — Akiem is the reference for viability assessment)
- CTA 2 → `/contact` (popup form)

**First in Class Homologation:**
- Full content: "We deliver a complete range of First-In-Class homologation services for new-build and retrofit projects. Covering the complete V-Cycle, from Concept Design to Authorization to Put In Service (APIS), our FiC Homologation Service Packs are fine-tuned to optimize cost and align with the specific needs of each project."
- CTA 1 → `/projects/skoda-regiojet` (case study — Skoda is the FIC reference)
- CTA 2 → `/contact`
- Crosslinks: "V-Cycle" and "APIS" are industry terms — don't link, but consider a tooltip or brief explanation.

**Series Installation & Commissioning:**
- Full content: "We deliver multiple service pack options for Installation & Commissioning ranging from a complete turn-key service to Supervision and Audit to Training."
- Crosslink: "Training" → Training service section
- CTA 1 → `/projects/lineas-hld77` (Lineas is the installation reference)
- CTA 2 → `/contact`
- **Crosslink — Romain (19 Jun):** Link to stats from Projects page. "Troubleshoot in hours not months — How? Digital Journey Playback" (JL). "Bug fixes in days not years — How? Automated Test & Verification" (JL).

**Training:**
- Full content: "We deliver training courses for Drivers, Maintenance Technicians, and Operational Managers. Other bespoke training options are available on request."
- CTA 1 → `/projects/lineas-hld77`
- CTA 2 → `/contact`

**Maintenance:**
- Full content: "We deliver post-warranty maintenance service packs for up to 10 years or longer. Each pack is configured and optimized for the unique operational needs of each client. Clients can build their own bespoke pack from an extensive list of corrective, preventative and predictive maintenance options."
- Crosslinks: "predictive maintenance" → `/railos/apps` (DJR and TRU apps — note: DRU renamed to TRU in v2)
- CTA 1 → `/projects/lineas-hld77`
- CTA 2 → `/contact`

> **Crosslink — Romain (19 Jun):** "Leverage the facts and figures 'claims' from the Projects page. Either purely recycle them, or select or split half there and half here."
> **Crosslink — Romain (23 Jun):** "Do you suggest a claim around safety for this page?" — Consider adding the "We entrust the lives of our children to our systems" claim.

#### Section 3: Service Partners

- Heading: "Service partners" ← keep
- **Add logos:** Prose, Brouwer, SNCB/NMBS Technics
- **Waiting on Romain** for logo files

#### Section 4: Remove or fix remaining template content

- Remove "Clients" tag
- Remove "Designed to move your operations forward" heading
- Fix form dropdown options or replace with CTA → popup form

**Images by service:** Retrofit: `cliff-009` (worker on train). Homologation: `cliff-046` (cupboard open). Installation: `cliff-040` (cabling + iPad). Training: `rosendaal-041` (3 workers). Maintenance: `cliff-006` (tools on wall).

---

## Page 5: PROJECTS / CUSTOMERS (`/projects`)

### Current state: Partially populated — 3 case study cards + 4 customer segments present

---

#### Section 1: Hero

**Live now:** Tag "Customers", H1 "Our Projects" — fine, matches content doc.

#### Section 2: Case Study Cards

**Live now:** 3 cards linking to Akiem, Skoda, Lineas — correct and working.

#### Section 3: Customer Segments

**Live now:** 4 segments (Fleet Operators, Fleet Leasing Companies, Infrastructure Managers, Locomotive & Train Manufacturers) — all populated.

**STATUS: RESOLVED** *(content doc v2 — JL marked "Done" 25 Jun)*

Copy is now differentiated per ICP. Key "What you get" differentiators:

| Segment | What you get (unique value proposition) | Sub-types |
|---|---|---|
| Fleet Operators | "A solution that **minimizes downtime and optimizes revenue**. You invest in an eco-system of evergreen software applications and off-the-shelf plug-and-play devices that can be rapidly repaired, replaced or upgraded without needing to be returned to the workshop." | Freight, Passenger, Track Maintenance |
| Fleet Leasing Companies | "A solution that **maximizes asset utility and value**." (Same evergreen ecosystem pitch but framed around asset lifecycle) | Freight, Passenger, Track Maintenance |
| Infrastructure Managers | Shorter, more focused: "you invest in an eco-system of evergreen software applications and off-the-shelf plug-and-play devices." | — |
| Locomotive & Train Manufacturers | Same structure — "you invest in an eco-system..." | Freight, Passenger, **On Track Machines**, Multiple Unit Trains |

> **TODO:** Update CMS with the differentiated copy from content doc v2.
> **Crosslink — Romain (23 Jun):** "clickable icons for each type of train" — freight, passenger, OTM. Also "new-build and retrofit" icons. Reuse these across the site.

#### Section 4: Crosslinks needed

- Fleet Operators → `/projects/lineas-hld77` (Lineas is a fleet operator)
- Fleet Leasing Companies → `/projects/akiem-br189` (Akiem is fleet leasing)
- Locomotive & Train Manufacturers → `/projects/skoda-27ev` (Skoda is an OEM)
- All segments: "ETCS" text → `/products`
- CTA at bottom → popup contact form

**Images by segment:** Fleet Operators: `cliff-121` (side of train, freight). Fleet Leasing: `cliff-080` (underneath train). Infra Managers: `rosendaal-144` (speed sensor on wheel). OEMs: MISSING — need 27Ev from Romain.

---

## Page 6: LINEAS HLD77 (`/projects/lineas-hld77`)

### Current state: Well populated — Challenge/Approach/Solution/Results + quote

**LAYOUT NOTE:** Template case study structure works well. Two layout additions needed:
1. **"What's next" section** currently shows as an empty heading. Need to add a **related projects card row** (2 cards for the other 2 projects). Use the `section_clients` card pattern.
2. **Stats section** could be expanded — content doc has additional stats ("only supplier to install in 10 days", "Under 1 month for software updates", "Under 3 hours for automated commissioning") that would benefit from a more prominent stat display. Consider converting these into a stat callout row above the Results grid.

---

#### What's working:
- H1: "The HLD77 Retrofit Project for Lineas" ✓
- Client name tag: "Lineas" ✓
- Challenge paragraph ✓
- Approach paragraph ✓
- Bruno Vanlede quote ✓
- Solution paragraph ✓
- Results: 109 / 87 / 22 / 10 Year Maintenance ✓
- Location: "Belgium" ✓

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Launch Date | Empty ("Launch Date" label only) | Add date or remove field |
| Timeline | Empty (shows 0-5 placeholder) | Add timeline or remove field |
| "What's next" section | Empty heading | Add related project cards: Skoda 27Ev, Akiem BR189 |
| CTA | "Work with us" → `/template/contact/contact-a` | → popup form or `/contact` |
| CTA heading | "Let's move your business forward" | "Discuss your fleet retrofit" |
| In-body crosslinks | None — plain text | Add: "ETCS" → `/products`, "installation" → `/services`, "software updates" → `/railos`, "TBL1+" → `/products/tbl1` |
| Content doc extras | Missing from live site | Add subheadline: "A textbook ETCS case study for retrofit". Add stat: "The only supplier to install an ETCS system onboard in 10 days only". Add: "Under 1 month is the time software updates take". Add: "Under 3 hours is the time automated commissioning takes". |
| Lineas company intro | Not on live site | V2: "Lineas is one of the largest private rail freight operators in Europe. They employ approximately 2,100 passionate colleagues with an annual turnover of almost 500 million euros." |
| Stats from v2 | Partial | Full list: 109 freight locomotives, 87 with ETCS + Belgian ATP, 22 with ETCS + Belgian/German/Dutch ATP, 10 Year Maintenance, 0 Additional Floorspace Used |
| Quote validated | Minor wording | V2 wording: "a few months maximum" (was "less than a month"), "about ten days" (was "less than ten days") |
| Video embed | Not present | V2: "[Visual content: display the video 'Installation Timelapse']" |

**Image:** Hero: `rosendaal-124` (workshop with 2 freight trains). Body: `cliff-040` (cabling + iPad) or `cliff-137` (cabling detail).

---

## Page 7: SKODA 27Ev (`/projects/skoda-27ev`)

### Current state: Well populated — same structure as Lineas

**LAYOUT NOTE:** Same as Lineas — add related projects card row in "What's next" section. No other layout changes needed.

---

#### What's working:
- H1: "The 27Ev Project for Skoda Transport" ✓
- Client name tag: "Skoda Transport / RegioJet" ✓
- Challenge/Approach/Solution paragraphs ✓
- Tomáš Ignačák quote ✓ (truncated — verify full text)
- Results: 34 / -19,000 / 160 / 120 ✓
- Location: "Czech Republic" ✓

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Launch Date | Empty | Add date or remove |
| Timeline | Empty (0-5 placeholder) | Add or remove |
| Quote attribution | "Tomas Ignacak, Vice Chairman, Skoda Group" | Correct to: "Tomáš Ignačák, Vice Chairman of the Board of Directors of Škoda Group" (diacritics) |
| Quote text | Truncated ("...") | Add full quote: "Since The Signalling Company became part of Škoda Group in 2023, its team has consistently demonstrated the ability to deliver on the ambitious goals that we set for them. The installation of their ETCS on our new hybrid trains for RegioJet represents the achievement of another important goal, confirming the readiness of their signalling platform for deployment on new rolling stock fleets." |
| "What's next" section | Empty | Add related project cards: Lineas HLD77, Akiem BR189 |
| CTA | → `/template/contact/contact-a` | → popup form |
| Subheadline | Missing | "An ETCS case study in new-built passenger train" |
| In-body crosslinks | None | "ETCS" → `/products`, "homologation" → `/services/first-in-class-homologation`, "Škoda Group" → `/about` |
| Content doc extras | Missing | Add specs: "Speed under overhead supply: 160 km/h. Speed in autonomous mode: 120 km/h. Seating capacity: 120 to 197." Add BEDMU footnote: "*Bi-mode Electro-Diesel Multiple Unit" |
| Additional content from v2 | Not on live site | "RegioJet has ordered a total of 34 new-generation hybrid BEDMU trains from Škoda Group—18 two-car units and 16 three-car units—under a contract exceeding CZK 9 billion." |
| Stat callouts from v2 | Not on live site | "34 Our ETCS onboard unit will be installed in 34 new-built trains" and "-19,000 tons of CO₂ annually — the CO2 emissions reduction expected" |
| Full Ignačák quote | Truncated on live | "Since The Signalling Company became part of Škoda Group in 2023, its team has consistently demonstrated the ability to deliver on the ambitious goals that we set for them. The installation of their ETCS on our new hybrid trains for RegioJet represents the achievement of another important goal, confirming the readiness of their signalling platform for deployment on new rolling stock fleets." |
| Slug from v2 | `/projects/skoda-27ev` | V2 uses `/projects/skoda-regiojet` — check which slug is live and update crosslinks |

> **Crosslink — Romain (22 Jun):** "We should also use icons for the type of trains: Lineas is freight, Skoda is passenger, and Akiem is OTM (on track machines)"

**Image:** MISSING — need 27Ev train photo from Romain. No suitable substitute in available assets.

---

## Page 8: AKIEM BR189 (`/projects/akiem-br189`)

### Current state: Populated but thinner than other case studies

**LAYOUT NOTE:** Same as other case studies — add related projects card row. Only 2 stats vs 4 on other pages — the Results grid may look sparse. Consider adding the specs from the content doc ("Entry in service: 2009-2011, Energy: electric, Weight: 87.0 ton") as additional stat items to fill the grid.

---

#### What's working:
- H1: "Retrofit Viability Assessment for Akiem" ✓
- Client name tag: "Akiem" ✓
- Challenge/Approach/Solution paragraphs ✓
- Results: 10 countries / 87.0 ton ✓
- Location: "Pan-European (10 countries)" ✓

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Launch Date | Empty | Add or remove |
| Timeline | Empty (0-5 placeholder) | Add or remove |
| "What's next" section | Empty | Add related project cards: Lineas HLD77, Skoda 27Ev |
| CTA | → `/template/contact/contact-a` | → popup form |
| Customer quote | Missing | **NOW AVAILABLE (v2):** "With over 200 years of collective signalling expertise we had no hesitation engaging TSC to help us assess our fleet assets for ETCS retrofit." — Patrice Bildstein, Deputy Managing Director at Akiem |
| Missing stats | Only 2 stats (10 countries, 87.0 ton) | Content doc only has these. Consider adding: number of project phases, timeline. |
| Subheadline | Missing | "An ETCS case study for pan-European retrofit feasibility" |
| In-body crosslinks | None | "ETCS" → `/products`, "feasibility of retrofitting" → `/services/etcs-retrofit-viability-assessment`, "ten countries" → `/products/wstm` |
| Content doc placeholder | "[X] project phases have been defined" in source doc | **Ask Romain** for the number of project phases |
| Specs from content doc | Not on live site | Add: "Entry in service: 2009-2011. Energy: electric. Weight: 87.0 ton." |
| Countries detail | Not listed | Add from v2: "Austria, Czech Republic, Germany, Hungary, Italy, the Netherlands, Poland, Slovakia, Slovenia, and Switzerland" |

**Image:** MISSING — need BR189 locomotive photo from Romain. No substitute in available assets.

---

## Page 9: ABOUT (`/about`)

### Current state: Well populated with TSC content — some issues

**LAYOUT NOTE:** Page structure is mostly correct (hero → image → mission → values → quote → CTA). Two layout issues:
1. **Projects carousel at bottom** appears empty (heading only, no cards). Either populate with 3 case study cards or **remove section entirely** to avoid empty space.
2. **CTA section** — content doc specifies 6 CTAs (Customers, Products, Services, Contact, Leadership, Insights). Current template has 1 CTA button. **LAYOUT CHANGE:** Either add a multi-CTA row (6 link buttons) or use a card grid linking to the 6 destinations.
3. **Template stock images** (tiger, generic About images) need swapping — not a layout change, just asset replacement.

---

#### What's working:
- Tag: "About" ✓
- H1: "About The Signalling Company" ✓
- Company story paragraphs: all 5 paragraphs from content doc are present ✓
- Values section: 4 values (Think strategically, Care, Collaborate, Act rationally) ✓
- Safety quote: "We care about safety – We entrust the lives of our children to our systems" ✓

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Placeholder text visible | Paragraph 3 contains "[hyperlink to Open RailOS page]" as visible text | Replace with actual hyperlink: "open to third party development" → `/railos/open` |
| Typo | "Our philiosophy" | "Our philosophy" |
| Template images | Generic stock photos (tiger image, generic "About A" image) | Replace with TSC team photo, workshop photo, or branded imagery |
| Crosslinks missing | "ETCS" mentioned but not linked | Add: "ETCS" → `/products`, "RailOS" → `/railos`, "Škoda Group" → context (or `/projects/skoda-27ev`), "RailOS Applications" → `/railos/apps`, "Devices" → `/railos/devices` |
| Projects carousel | Shows heading "Projects" but appears empty | Populate with 3 case study cards or remove section |
| CTA | "Work with us" → `/template/contact/contact-a` | → popup form |
| CTAs from content doc | Only 1 CTA on live site | Content doc specifies 6 CTAs: Customers, Products, Services, Contact, Leadership, Insights |
| Missing content | About page doesn't mention founding team's prior roles | Content doc v2 full text: "Founder Stanislas Pinte (ex ERTMS Solution), and employee number one and CTO Alexandre Betis (ex Ansaldo and Hitachi)..." Crosslink names → `/leadership` |
| Skoda acquisition | Not prominently noted | From v2: "In 2023, the company was acquired by Škoda Group and began accelerating its ambition to bring its vision for digital rail to the world." |
| Values copy | Present but could be tighter | V2: "What drives our growth is also what holds us together." — good intro line |
| CTA row from v2 | 1 CTA | V2 specifies: `[CTA 1 Our projects] [CTA 2 Our products] [CTA 3 Our Services] [CTA 4 Contact] [CTA 5 Leadership] [CTA 6 Insights]` — layout change needed for 6 CTAs |
| Video embed | Not present | V2: "[Visual content: display the video 'visit at the workshop']" — needs video from Cliff |

**Images:** Hero: `cliff-119` (workshop beauty shot — replace tiger). Values: `rosendaal-041` (3 workers — collaboration). Philosophy: `cliff-052` (cabin interior — passion, atmosphere).

---

## Page 10: LEADERSHIP (`/leadership`)

### Current state: Populated — 8 team members with names and titles, no bios or photos

**Snapshot:** `live-snapshot-leadership-2026-07-01.txt`

**LAYOUT NOTE:** Page is built and showing all 8 team members in a grid. Structure works.

**LAYOUT CHANGE:** Design a modal popup for longer bios. Each leadership card should open a modal on click showing full bio, photo, and role details. Bios not yet available (placeholder only) — but the modal component needs building now so content can be dropped in later.

---

#### What's working:
- Tag: "Our team" ✓
- H2: "Leadership" (should be H1)
- All 8 team members present with correct names and titles ✓

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Heading level | H2 "Leadership" | H1 |
| Diacritics | "Raphael Kleinplac" | "Raphaël Kleinplac" |
| Title mismatch | "Head of Quality & System Assurance" | "Head of Quality & Head of System Assurance" (per content doc) |
| CTA | "Work with us" → `#` (broken) | → popup form or `/contact` |
| CTA heading | "Ready to talk about your fleet?" | More appropriate heading for a team page |
| No photos | — | **BLOCKED — Romain:** Headshot photos not yet available |
| No bios | — | **BLOCKED — Romain:** Bios not yet provided |

**Content from doc (8 team members — names and titles only, no bios):**

| Name | Title |
|---|---|
| Alexandre Betis | CEO |
| Benoit Blin | Head of Product Development |
| Fabienne Goutaudier | Head of Quality & Head of System Assurance |
| Raphaël Kleinplac | Head of HR & Facilities |
| Martin Kriz | Chief Admin and Finance |
| Jarlath Lally | Head of Sales & Marketing |
| Stanislas Pinte | RailOS Expert & Special Projects |
| Benjamin Pischetola | Chief Delivery Officer |

**Action:** Fix diacritics and heading level.

**UPDATE from content doc v2:** Raphaël Kleinplac bio is now written:
> "Raphaël brings 30 years of professional experience to The Signalling Company, shaped by one consistent drive: doing work that matters. Throughout his career, he has sought out roles where he could contribute to a better society, embrace new challenges, and build collaborative teams that make organisations thrive. At TSC, he applies that same mindset to a company where people sit at the core of everything we build. Outside of work, Raphaël channels the same team spirit into sport and theatre, and recharges with family and friends."

**Romain (01 Jul):** "Still chasing people, use Raphaël's bit for all as placeholders for now."

**TODO:** Add Raphaël's bio to CMS immediately. Use it as the template/placeholder for others until individual bios arrive. Remaining 7 bios still have placeholder instructions: "[The intent is to show a robust industrial company that has innovation at its core and value people above all. Tone: Professional. Dynamic, determined, and passionate.]"

**CTAs from content doc:** Leadership → Contact, Insights, About ("Our Story"), Careers ("Join the Team")

**Image:** Page background: `cliff-119` (workshop atmosphere). Headshots BLOCKED — waiting on Romain. Use initials-on-brand-colour as placeholder.

---

## Page 11: RAILOS APPS (`/railos/apps`)

### Current state: Populated — static page with all 9 apps, content has placeholders

**Snapshot:** `live-snapshot-railos-apps-2026-07-01.txt`

**LAYOUT NOTE:** Page is built with two sections using accordion/expandable items. Structure works but content has issues.

**CMS RECOMMENDATION:** Yes — RailOS Apps should have its own CMS collection. Reasons:
1. 9 apps with structured data (name, category, description, related devices)
2. The App Store page needs to list them dynamically (currently broken — see Page 19)
3. Apps ≠ Products — apps are the software layer, products are the commercial offering. Some apps aren't products (iSTM, TCMS, DJR, DRU, LRU) and wSTM is a product but not listed here as an app
4. CMS makes it easy to add new apps as portfolio grows
5. Fields needed: name, slug, category (ATP/Data), short description, body (RichText), related devices (MultiReference → Devices), order

---

#### What's working:
- Tag: "RailOS" ✓
- H1: "RailOS Applications for railway safety" ✓
- All 9 apps present with descriptions ✓
- Two sections with sub-headings ✓

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Section 2 heading | "Onboard ATP (Signalling) applications" (duplicated from section 1) | "Data Acquisition & Analytics applications" |
| ETCS App | Contains "[hyperlink to PRs]" placeholder text | Add crosslinks to `/projects/lineas-hld77` and `/projects/skoda-27ev` |
| ETCS App | Contains "[no-code]" in brackets | Remove brackets or clarify |
| PZB App | "Romanian...[add others]" placeholder | **BLOCKED — Jarlath:** Need full country list |
| LRU App | "…more to be added" | **BLOCKED — Jarlath:** Need full LRU description |
| No crosslinks | Plain text throughout | Add: iEVC → `/railos/devices`, ETCS → `/products/etcs`, project refs → `/projects/{slug}` |
| CTA | "Work with us" → `#` (broken) | → popup form or `/contact` |

**Content doc has full descriptions for:**

**ATP Applications (7 — was 6, added wSTM and TCMS from content doc v2):**
1. ETCS App — certified 2025, in service on Lineas HLD77 and Skoda 27Ev. "Can be combined with iSTM and wSTM apps for seamless no-code integration and dynamic interoperability with multiple National Class-B Safety Applications."
2. TBL1+ App — in service since 2025 on Lineas HLD77 fleet. "Available with ++ and NG variations."
3. PZB App — in development/certification. "Destined to enter operation initially on the international cohort of the Lineas HLD77 fleet." Countries: German, Austrian, Romanian, **[add others — BLOCKED JL]**
4. KVB App — in development/certification. French national network.
5. iSTM App — "A completely software defined Specific Transmission Module (STM) for RailOS-native ETCS and Class-B App integrations."
6. **wSTM App** *(NEW from v2)* — "A unique Specific Transmission Module (STM) for RailOS-native and 3rd Party Class-B system integration."
7. **TCMS App** *(NEW from v2)* — "Available on request, our RailOS TCMS Apps are customized according to the vehicle sub-system integration plan and range in sophistication from single to multi-function support."

**Data Applications (3 — DRU renamed to TRU in v2):**
1. DJR App — Digital Journey Replay. "Generates exceptionally valuable insights that can be used to rapidly troubleshoot and fix signalling issues that originate both on-board and trackside."
2. **TRU App** *(renamed from DRU)* — "Can be configured for both the DRU (Diagnostic Recording Unit) and JRU (Juridical Recording Unit) function. When configured for JRU, uses a Crash Protected Memory (CPM)." Eliminates need for standalone JRU device like a Teloc.
3. LRU App — "A secure and easy to use Windows-based application that supports local or remote data extraction and pre-processing for use by any analytics platform."

> **TODO:** Update CMS — add wSTM and TCMS items, rename DRU → TRU, update descriptions. Total: 10 apps (7 ATP + 3 Data).

**Image:** `cliff-100` (2 DMIs installed in cab — 8" screens showing app interface).

---

## Page 12: RAILOS DEVICES (`/railos/devices`)

### Current state: Populated — CMS-powered, 16 devices with structured cards

**Snapshot:** `live-snapshot-railos-devices-2026-07-01.txt`

**LAYOUT NOTE:** Page is CMS-powered via the RailOS Devices collection. Each device is a clickable card linking to `/railos-devices/{slug}` with Applications, Device Type, and Countries fields. 16 devices listed (content doc has 17 — verify if one is missing or consolidated).

Currently all 16 devices are in a **single undifferentiated list** under one heading "Onboard ATP (Signalling) applications" (wrong heading — copied from Apps page). Consider **grouping by device category** with sub-headings:
1. Computing (iEVC, Computer Box)
2. Networking (Ethernet Switch)
3. Display (DMI)
4. Telecom (GSM-R, GPS, WiFi, TOBA Box)
5. Sensors (Sensor Box, Euroantenna, PZB Magnet, Crocodile, Doppler, CoRRail, OPG)
6. Data (DSU, JRU)

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Section heading | "Onboard ATP (Signalling) applications" | "RailOS Certified Devices" or category sub-headings |
| Section intro | "All RailOS ATP Applications run on the iEVC..." (copied from Apps page) | Device-specific intro text |
| "RailOS Device Partners" | Heading present but no logos | **BLOCKED — Romain:** Need partner logos |
| CTA | "Work with us" → `#` (broken) | → popup form or `/contact` |

---

**Content doc v2 has 17 devices with full descriptions. Key update: page intro should read:**
> "Our tested and RailOS qualified Ethernet plug-and-play devices are listed below. Device suppliers wishing to participate in the RailOS Device Ecosystem may apply using the application form [hyperlink to Open RailOS]. To eliminate the need for additional power units, all RailOS Certified Devices can be powered using on-board DC supplies that range from 24VDC to 110VDC or PoE."

**JL note for intro context:** "At the heart of the RailOS device eco-system is the iEVC, a certified SIL4 computing platform. A selection of RailOS Apps and Devices are added to build a complete solution, be it for an ATP application such as ETCS-PZB, or a non-safety application such as TCMS."

**Core devices:**
1. iEVC (Safe Computer) — "scales to any digital rail application. Interfaces: Ethernet, Ethernet-TRDP, Digital IO Relays, CANOpen. Available in standard 19in or ruggedized Computer Box format."
2. Ethernet Switch — "high-reliability industrial. PoE and non-PoE variants."
3. Data Storage Unit (DSU) — "multiple options by size and crash protection rating. CPM mandatory for JRU use."
4. DMI (Driver Machine Interface) — "8in and 12in formats, driven by RailOS DMI App. With or without speakers."
5. Computer Box (ruggedised iEVC) — "can be mounted anywhere, simplifies cabling and maintenance."

**Telecom devices:**
6. GSM-R & FRMCS Radio — "standalone or integrated in Telecom Box with GPS, 4/5G, Tetra, WiFi."
7. GPS — "standalone or integrated in Telecom Box."
8. WiFi/4/5/6G Radio — "standalone remote access gateway or integrated in Telecom Box."
9. Telecom Box — "supports integrated TOBA for multi-technology telecom and satcom. Extendable to FRMCS and 6G." **[CTA: download data sheet]**

**Sensors:**
10. Sensor Box — "integrates Odometry and Signalling modules. For ETCS, KVB, TBL1." **[CTA: download data sheet]**
11. Euroantenna — "designed without active electronics for unmatched reliability."
12. PZB Magnet & Magnet Reader — "Germany only. Integrates with iEVC and ETCS architecture."
13. Crocodile & Encoder — "Belgium + France. For TBL1 and KVB Apps."
14. Doppler Radar — "Speed Sensor connected to Sensor Box."
15. CoRRail — "Advanced optical Speed Sensor."
16. Optical Pulse Generator — "Common optical Speed Sensor."

**Data recording:**
17. JRU — "Combines DRU App + Crash Protected Memory. Cost and space efficient alternative to standalone JRU."

**Device Partners:** Duagon, Mios, Deuta, Scle, Hassler Rail, Lantech, Triorail

> **Crosslink:** Each device's "Applications" field links to relevant product pages. Device partner names → partner websites (if approved). "Application form" hyperlink → `/railos/open`.

**Critical need:** 17 items of dense text. Without visual hierarchy it's unbearable. Group by category with sub-headings (Computing, Networking, Display, Telecom, Sensors, Data).

**Images by device:** iEVC/system: `cliff-143` (laid out) + `cliff-155`/`cliff-156`/`cliff-157` (installed). Sensorbox: `cliff-056` (product, no cap) + `cliff-152` (installed). Computerbox: `cliff-066` (product, no cap) + `rosendaal-100` (installed). Telecombox: `cliff-071` (product, no cap) + `rosendaal-101` (installed). Euroantenna: `cliff-082` (product) + `cliff-080` (installed under train). Ethernet Switch: `rosendaal-096` (product) + `rosendaal-003` (installing). JRU: `rosendaal-073`. Speed Sensor: `rosendaal-144` (on wheel). DMI: `cliff-100` (2× in cab). Architecture diagram still needed from Jarlath.

---

## Page 13: CONTACT (`/contact`)

### Current state: Populated — form + address + media contact, several template remnants

**Snapshot:** `live-snapshot-contact-2026-07-01.txt`

---

#### What's working:
- H1: "Let's keep things moving" ✓
- Address: "Rue des Deux Gares 82/Building B, 1070 Brussels" ✓
- Media contact: Romain Hourtiguet, Marketing Manager ✓
- Contact form with privacy policy checkbox ✓
- Map image present ✓

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Wrong flag icon | Germany flag next to Brussels address | Belgium flag |
| Wrong flag icon | Norway flag next to media contact | Belgium flag or remove |
| Template email | `hq@cargo.plus` | `info@thesignallingcompany.com` *(confirmed in v2 privacy policy)* |
| Phone link on address | `tel:+49201328443` (German number) | `+32 (0)2 882 59 00` *(confirmed in v2 privacy policy)* |
| Map image | Static webp — may show wrong location | Verify it shows Brussels HQ |
| Form submit | "Send message" button + "Send request" link (duplicate CTAs) | Keep one, remove the other |

**Action:** Fix flag icons, email, and phone link. Verify form submission works. Add hidden field for source page tracking.

---

## Page 14: CAREERS (`/careers`)

### Current state: Populated — minimal content, template remnants

**Snapshot:** `live-snapshot-careers-2026-07-01.txt`

#### What's working:
- Body text matches content doc ✓
- Email link: info@thesignallingcompany.com ✓

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Tag | "Testimonial" (template tag) | "Careers" or "Join us" |
| Heading level | H2 "Careers" | H1 |
| Template image | Generic stock photo (testimonial author) | TSC team/office photo |
| CTA | "Work with us" → `#` (broken) | → `/contact` or popup form |
| CTA heading | "Ready to talk about your fleet?" | Not relevant for careers — change to "Ready to join us?" or similar |
| Missing crosslink | Content doc says "Learn more about our story and values" | Add link → `/about` |

**Status:** Awaiting final approval from HR department (from call notes).

---

## Page 15: INSIGHTS & NEWS (`/news`)

### Current state: CMS populated with at least 1 article

**Content doc:**
- Subtitle: "The latest from The Signalling Company — product milestones, certifications, customer wins, and our perspective on the future of onboard rail signalling."
- CMS multi-reference fields needed for related Projects, Products, Services per article

**Action:** Fix article dates (showing 2021). Verify all 7 migrated articles are present.

---

## Page 16: FAQ (`/faq`)

### Current state: Template page at `/template/faq`

**Content doc:** "Content TBD (Romain)" — post-launch item.

**Action:** Build the template/structure. Don't populate. Fix footer link from `/template/faq` → `/faq`.

---

## Page 17: PRIVACY POLICY (`/privacy-policy`)

### Current state: Likely template

**Content doc v2:** Complete GDPR policy text (15 sections). Last updated June 2026. Effective date: 2026.

Key details from the policy:
- Data controller: The Signalling Company SRL, company number 0724.925.936
- Address: Rue des Deux Gares 82, Building B, B-1070 Anderlecht, Brussels, Belgium
- Phone: +32 (0)2 882 59 00
- Email: info@thesignallingcompany.com
- CRM: Odoo | Email marketing: Mailchimp | Analytics: GA4
- Complaint authority: Belgian Data Protection Authority, Rue de la Presse 35, 1000 Brussels

**Action:** Populate with full text from content doc v2 (sections 1-15). This is long-form legal text — use the richtext CMS field or static page layout with proper heading hierarchy.

---

## Page 18: OPEN RAILOS (`/railos/open`)

### Current state: Populated — body text present, form present, template remnants

**Snapshot:** `live-snapshot-railos-open-2026-07-01.txt`

#### What's working:
- Tag: "RailOS" ✓
- H2: "Open RailOS" (should be H1 for consistency)
- Body text about Open RailOS developer program matches content doc ✓
- Contact form present with name/email/company/message fields ✓

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Heading level | H2 "Open RailOS" | H1 |
| CTA button | "Button Text" (placeholder!) | "Apply for the ADK Program" or similar |
| Template image | Generic stock photo (testimonial author) | Developer/engineering workspace photo |
| Form | Generic contact form | Content doc specifies 8-field application form (ADK type dropdown, co-development radio, app description textarea). **Simplify for launch** — current form works as interim |
| CTA | "Work with us" → `#` (broken) | → `/contact` or remove (form is on-page) |
| ADK comparison table | Not present | **NOW AVAILABLE (v2)** — see table below |

**Content doc v2 — ADK Pricing Table (from JL's presentation):**

| Commercial item | Safety Developer SDK | Rail Application SDK | Notes |
|---|---|---|---|
| Annual subscription | €95k | €42k | One legal entity, one programme, up to 12 developer seats, up to 2 active hardware targets |
| Onboarding | €35k | €12k | Installation, environment setup, enablement workshops and initial architecture support |
| App compatibility certification | €9k + €6k safety review | €9k | Per app/version; minor update €2.5k, major update €6k |
| Store hosting | €3k/app/year | €3k/app/year | Includes listing, hosting, delivery, entitlement handling and analytics |
| Store commission | 18% net sales | 18% net sales | Reduced to 12% above €250k annual app sales or under framework agreement |
| Optional expert services | €18k / 10 days | €14k / 10 days | Architecture, BSP porting, certification support, integration troubleshooting |

> **TODO:** Decide whether to show pricing publicly on the website or keep it behind the application form. Publishing builds transparency but competitors will see it.

**Application form fields (from content doc v2):**
1. Briefly describe the application you wish to develop?
2. Which ADK are you interested in purchasing? (General ADK / Safe ADK)
3. What budget do you have for purchase of the ADK?
4. What budget do you have for the development?
5. Are you open to co-development of the App with TSC?
6. Do you want to sell your RailOS App via the RailOS App Store?
7. What other applications have you developed?
8. When do you want to start development of your RailOS App?

**Image:** `cliff-040` (cabling + data entry on iPad — engineering / developer feel).

---

## Page 19: RAILOS APP STORE (`/railos/app-store`)

### Current state: BROKEN — showing Devices collection instead of Apps

**Snapshot:** `live-snapshot-railos-app-store-2026-07-01.txt`

**CRITICAL:** This page is pulling from the **RailOS Devices** CMS collection instead of showing Apps. It lists all 16 devices (iEVC, Ethernet Switch, DSU, etc.) with links to `/railos-devices/{slug}`. The heading says "Select your RailOS Application" but the content below is devices.

#### What needs fixing:

| Issue | Current | Change to |
|---|---|---|
| Wrong CMS source | Showing Devices collection | Should show Apps (needs RailOS Apps CMS collection — see Page 11 recommendation) |
| "RailOS Device Partners" | Heading present from Devices page | Remove |
| CTA | "Work with us" → `#` (broken) | → `/contact` or popup form |
| No email capture | Missing | Content doc specifies "Store under construction" CTA with email capture |

**Content doc:**
- H1: "RailOS App Store" ✓ (correct on live)
- Body: "Select your RailOS Application" ✓ (correct on live)
- UX: Tile per app. Phase 1: clicking any tile launches CTA "Store under construction, enter your email to receive details"
- Email capture form

**Crosslinks:** "Become a RailOS developer" → `/railos/open`, "Learn more about RailOS" → `/railos`, each tile → `/railos/apps`

**Depends on:** RailOS Apps CMS collection being created (see Page 11 recommendation)

---

## Page 20: 404

**Content doc v2:**
- H1: "You reached the end of the tracks."
- Body: "The page you're looking for has moved — or never existed. Let's get you back on the right line."
- CTAs: `[CTA 1 Our projects] [CTA 2 Our products] [CTA 3 Our Services]`

**Image:** `cliff-028` (train cranes in workshop — atmospheric).

---

## Cross-Link Implementation Checklist

### Priority 1: In-body contextual links (SEO weight)

Every `[crosslink →]` noted above should become a real internal link with descriptive anchor text. Key patterns:

- "ETCS" text → `/products` or `/products/etcs`
- "RailOS" text → `/railos`
- "iEVC" text → `/railos/devices`
- Service names → `/services/{slug}`
- Project names → `/projects/{slug}`
- "software-defined" → `/railos`
- "Application Developer Kit" / "ADK" → `/railos/open`

### Priority 2: Related sections at page bottoms

- Each case study → 2 related project cards (the other two projects)
- Product pages → "See in action" links to case studies
- Service pages → related case study link

### Priority 3: Back-links

- Product pages → "Built on RailOS" badge → `/railos`
- Service pages → "Powered by RailOS" → `/railos`
- Project pages → "About The Signalling Company" → `/`

### Orphan risk

- `/railos/app-store` — only linked from RailOS dropdown. Add body links from `/railos` and `/railos/open`.
- `/railos/open` — only linked from RailOS dropdown. Add body links from `/railos`, `/products`, and `/about`.

---

## Image Placement Summary — With Filenames

> Updated: 2026-07-02
> Source: `TSC Video Selects — Page Assignments(Pictures).csv` + content spec cross-reference
> Files in: `/Downloads/TSC Images/website-selects/web-optimised/` (desktop) and `mobile/` subfolder
> Naming: `cliff-NNN` = Brouwer visit (Cliff Lucas), `rosendaal-NNN` = Rosendaal depot, `stopmotion-NN` = installation timelapse

### Homepage (`/`)

| Section | Suggested file(s) | Description | Alt option |
|---|---|---|---|
| Hero background | `cliff-119` | Workshop wide shot — atmospheric, moody lighting | `rosendaal-124` (workshop + 2 freight trains + people) |
| Section 2: Solution cards | `cliff-148` | 3 boxes piled up, no caps — shows product consolidation | `cliff-147` (same with caps) |
| Section 3: Carousel — Lineas | `rosendaal-088` | 2 freight locos in workshop with people | `cliff-121` (side of train with worker) |
| Section 3: Carousel — Skoda | MISSING | Need 27Ev train photo from Romain | — |
| Section 3: Carousel — Akiem | MISSING | Need BR189 locomotive photo from Romain | — |
| Section 4: Trust bar/quote | `cliff-080` | Euroantenna installed underneath train — shows scale | — |
| Section 9: RailOS story | `cliff-155` | Full system installed (vertical orientation) | `cliff-156` (horizontal) or `cliff-157` (close-up) |

### RailOS (`/railos`)

| Section | Suggested file(s) | Description | Alt option |
|---|---|---|---|
| Hero | `cliff-156` | Full system installed, horizontal — clean hero composition | `cliff-155` (vertical) |
| Section 2: Problem cards | Icons needed (not photos) | — | — |
| Section 3: What RailOS Changes | `cliff-148` | 3 boxes piled — shows consolidation story | `rosendaal-144` (speed sensor — hardware versatility) |
| Section 4: Quote | `cliff-052` | Inside cabin — atmosphere, passion | — |
| Section 5: Applications | `cliff-100` | 2 DMIs installed (8" screens) — shows app interface | — |
| Section 6: Proven in service | `rosendaal-124` | Workshop atmosphere with 2 freight trains and people | `rosendaal-088` (2 locos, different angle) |

### Products (`/products`)

| Section | Suggested file(s) | Description | Alt option |
|---|---|---|---|
| Hero / intro | `cliff-143` | All 3 boxes laid out — product family overview | `cliff-144` (same, different angle) |
| CTA section | `cliff-157` | Full system installed close-up — shows product in situ | — |
| ETCS product page | `cliff-155` | Full system installed vertical | `cliff-156` (horizontal) |
| Sensorbox product | `cliff-056` | Sensorbox no cap (preferred) | `cliff-055` (with caps) |
| Computerbox product | `cliff-066` | Computerbox no cap (preferred) | `cliff-065` (with caps) |
| Telecombox product | `cliff-071` | Telecombox no cap (preferred) | `cliff-072` (with caps) |

### Services (`/services`)

| Section | Suggested file(s) | Description | Alt option |
|---|---|---|---|
| Retrofit Assessment | `cliff-009` | Worker on side of 2nd train — retrofit in action | `cliff-011` (same scene, different angle) |
| FIC Homologation | `cliff-046` | Side cupboard open — system inspection | `cliff-052` (cabin interior) |
| Installation & Commissioning | `cliff-040` | Cabling + data entry on iPad — modern install process | `rosendaal-042` (cabling in the dark — atmospheric) |
| Training | `rosendaal-041` | 3 workers striking a pose — team/people | — |
| Maintenance | `cliff-006` | Tools hung on workers wall — maintenance readiness | `cliff-010` (same subject, different angle) |

### Projects / Customers (`/projects`)

| Section | Suggested file(s) | Description | Alt option |
|---|---|---|---|
| Hero | `rosendaal-088` | 2 freight locos in workshop with people | `rosendaal-124` (wider workshop shot) |
| Fleet Operators segment | `cliff-121` | Side of train with worker — freight retrofit | — |
| Fleet Leasing segment | `cliff-080` | Underneath train, euroantenna — shows cross-border equipment | — |
| Infrastructure Managers | `rosendaal-144` | Speed sensor on wheel — trackside technology | — |
| OEMs segment | MISSING | Need 27Ev / modern passenger train photo from Romain | — |

### Case Studies

| Page | Section | Suggested file(s) | Description | Alt option |
|---|---|---|---|---|
| Lineas HLD77 | Hero | `rosendaal-124` | Workshop with 2 freight trains and people | `rosendaal-088` (2 locos, tighter) |
| Lineas HLD77 | Body | `cliff-040` | Cabling + iPad — installation process | `cliff-137` (cabling detail) |
| Skoda 27Ev | Hero | MISSING | Need 27Ev photo from Romain | — |
| Akiem BR189 | Hero | MISSING | Need BR189 photo from Romain | — |

### About (`/about`)

| Section | Suggested file(s) | Description | Alt option |
|---|---|---|---|
| Hero (replace stock) | `cliff-119` | Workshop wide shot — beauty, atmosphere | — |
| Values section | `rosendaal-041` | 3 workers striking a pose — collaboration | — |
| Philosophy section | `cliff-052` | View inside cabin — passion, atmosphere | `cliff-040` (engineering + iPad) |

### Leadership (`/leadership`)

| Section | Suggested file(s) | Description |
|---|---|---|
| Page background | `cliff-119` | Workshop atmosphere — behind team grid |
| Headshots (×8) | BLOCKED | Waiting on Romain |

### RailOS Apps (`/railos/apps`)

| Section | Suggested file(s) | Description |
|---|---|---|
| Between ATP and Data sections | `cliff-100` | 2 DMIs installed in cab — shows app interface |

### RailOS Devices (`/railos/devices`)

| Device | Product shot | Installed shot |
|---|---|---|
| iEVC / full system | `cliff-143` or `cliff-144` (laid out) | `cliff-155` / `cliff-156` / `cliff-157` (installed) |
| Sensorbox | `cliff-056` (no cap, preferred) | `cliff-152` (installed vertical) |
| Computerbox | `cliff-066` (no cap, preferred) | `rosendaal-100` (installed horizontal) |
| Telecombox | `cliff-071` (no cap, preferred) | `rosendaal-101` (installed horizontal) |
| Euroantenna | `cliff-082` (product shot) | `cliff-080` (installed under train) |
| Ethernet Switch | `rosendaal-096` (product) | `rosendaal-003` (installing in small space) |
| JRU | `rosendaal-073` | — |
| Speed Sensor / OPG | — | `rosendaal-144` (installed on wheel) |
| DMI | — | `cliff-100` (2× 8" screens in cab) |
| System overview | `cliff-148` (3 boxes piled) | `cliff-155` (full system vertical) |

### Open RailOS (`/railos/open`)

| Section | Suggested file(s) | Description |
|---|---|---|
| ADK section | `cliff-040` | Cabling + iPad — engineering / developer feel |

### Careers (`/careers`)

| Section | Suggested file(s) | Description | Alt option |
|---|---|---|---|
| Hero (replace stock) | `rosendaal-041` | 3 workers posing — team culture | `cliff-119` (workshop atmosphere) |

### Contact (`/contact`)

| Section | Suggested file(s) | Description |
|---|---|---|
| Background / atmosphere | `cliff-006` | Tools hung on workers wall |

### News (`/news`)

| Section | Suggested file(s) | Description |
|---|---|---|
| Fallback featured image | `cliff-143` | All 3 boxes laid out — generic product shot |

### 404

| Section | Suggested file(s) | Description |
|---|---|---|
| Background | `cliff-028` | Train cranes in workshop — atmospheric |

### Still missing (need from Romain)

| What | Pages affected |
|---|---|
| 27Ev train photo (Skoda/RegioJet) | Homepage carousel, Skoda case study, Projects OEM segment |
| BR189 locomotive photo (Akiem) | Homepage carousel, Akiem case study |
| Partner logos in SVG | Homepage trust bar, Services partners |
| Leadership headshots (×8) | Leadership page |
| RailOS architecture diagram | Homepage section 9, RailOS page, Devices page |
| Bruno Vanlede headshot | Homepage trust bar quote |

---

## Items Waiting on Romain / Jarlath (updated 2 Jul)

### Resolved in content doc v2

| Item | Status |
|---|---|
| ~~Homepage copy~~ | OPTIONS PROVIDED — multiple alternatives from Romain + JL. Need final pick. |
| ~~Expanded RailOS copy~~ | DONE (JL) — full 9-section layout with copy |
| ~~TOBA Box product text~~ | DONE — renamed to "Telecom Box" with full copy |
| ~~Customer segment differentiation~~ | DONE (JL) — differentiated Why/How/What per ICP |
| ~~ADK comparison table~~ | PROVIDED — full pricing table from JL's presentation |
| ~~Akiem quote~~ | PROVIDED — Patrice Bildstein, Deputy MD |
| ~~Bruno Vanlede quote~~ | VALIDATED — minor wording changes from v1 |
| ~~Raphaël Kleinplac bio~~ | WRITTEN — use as placeholder for others |
| ~~Privacy policy text~~ | DONE (Legal) — full GDPR text provided |
| ~~404 page copy~~ | DONE |

### Still Outstanding

| Item | Owner | Status | Blocks |
|---|---|---|---|
| **Hero copy — final pick** between options | Romain + JL | Options provided, need decision | Homepage build |
| **RailOS section 5 + FAQ** — "needs work" | Jarlath | 01 Jul — "out of time until later today" | RailOS page depth |
| **CTA wording** — "briefing" vs "demo" vs "INDO" | Romain + JL | 01 Jul — undecided | RailOS page CTA |
| **PZB country list** — "[add others]" | Jarlath | 25 Jun | PZB product + app |
| **wSTM country list** — "UK, PL, CZ, [complete]" | Jarlath | — | wSTM product |
| **Akiem project phase count** — "[X] phases" | Romain | — | Akiem body text |
| **Lineas customer quote for RailOS page** | Romain → Bruno | 02 Jul (JL requested) | RailOS quote section |
| **Leadership bios ×7** (all except Raphaël) | Romain → team | 01 Jul "still chasing" | Leadership depth |
| **Leadership headshots ×8** | Romain | — | Leadership photos |
| **Partner logos in SVG** | Romain | **BLOCKED** | Logo ticker, partners |
| **27Ev train photo** | Romain | — | Homepage, Skoda page, Projects OEM |
| **BR189 photo** | Romain | — | Homepage, Akiem page |
| **Architecture diagram** | Jarlath | — | Homepage, RailOS, Devices |
| **Bruno Vanlede headshot** | Romain | — | Trust bar quote |
| **Train type icons** (freight/passenger/OTM) | Romain → designer | — | Projects, case studies, homepage |
| **App icons** | Will → AI generation | 18 Jun — JL: "play around with options" | RailOS Apps, Products |
| **Stats update** — are 109 vehicles current? | Romain | 01 Jul | Trust bar, RailOS proven |
| **Video clips from Cliff** | Romain → Cliff | Promised "end of day" | Hero backgrounds |
| **Skoda imagery** | Romain | Discussed on call | Skoda hero |
| **Careers page approval** | HR | Pending | Careers page |
| **FAQ content** | Romain | Post-launch | FAQ page |

---

## Launch Readiness Audit — 2 Jul 2026

> Fresh snapshots of all 16 pages via Chrome DevTools. Cross-referenced against content spec + content doc v2.
> CEO preview: **Thu 3 Jul** | Go-live: **Mon 7 Jul**

### CMS Updates Completed This Session

| Collection | Change | Status |
|---|---|---|
| Leadership | Raphaël name diacritics + bio added, Fabienne title fixed | Published |
| Products | TOBA Box → Telecom Box (name, slug, body, short-desc) | Published |
| RailOS Apps | DRU → TRU rename, wSTM + TOBA created, "App" removed from all names, Status field added, wSTM moved to ATP | Published (11 items) |
| Projects | Akiem quote (Patrice Bildstein), Lineas quote wording, homepage fields (tag/heading/body) for all 3 | Published |
| Devices | Telecom Box name/slug/desc, JRU → TRU App reference | Published |
| FAQs | 26 total: 6 homepage, 4 RailOS, 5 general, 5 Products, 3 Services, 3 Company. Toggles: Show on Homepage, Show on RailOS Page | Published |
| FAQ Categories | Added "Company" category | Published |

---

### CRITICAL — Fix Before CEO Preview (Thu 3 Jul)

| # | Issue | Page(s) | Type | Est. |
|---|---|---|---|---|
| 1 | **Page title "Cargo+ - Webflow HTML website template"** | Homepage | Designer | 1 min |
| 2 | **"NOT YET VERIFIED:" prefix visible in customer quote** — editorial note shown to visitors | /railos | Designer | 1 min |
| 3 | **All CTA buttons link to `#`** — "Get in touch" / "Request a briefing" go nowhere | All 16 pages | Designer | 15 min — wire all to `/contact` or popup form |
| 4 | **"See how it works" CTA → `app.byq.supply`** — links to template marketplace | Homepage | Designer | 1 min |
| 5 | **"Talk to our team" + "Contact us" CTAs → `/template/contact/contact-a`** | Homepage (×3) | Designer | 2 min |
| 6 | **Footer FAQ link → `/template/faq`** — template path exposed | All pages | Designer | 1 min — change to `/faq` |
| 7 | **"Cargo+ connects fleets and borders into network"** — template text in countries section | Homepage | Designer | 1 min |
| 8 | **Wrong copy in "Locomotive & Train Manufacturers"** — shows Infrastructure Managers text | /projects | Designer | 5 min |
| 9 | **Footer "Products" heading duplicated** — Services column labelled "Products" | All pages | Designer | 1 min |

**Estimated time: ~30 min**

---

### HIGH — Fix Before Launch (Mon 7 Jul)

| # | Issue | Page(s) | Type | Est. |
|---|---|---|---|---|
| 10 | **Contact page: wrong flags** — Germany flag next to Brussels, Norway flag next to media | /contact | Designer | 2 min |
| 11 | **Contact page: template email `hq@cargo.plus`** | /contact | Designer | 1 min |
| 12 | **Contact page: phone link → German number `+49201328443`** | /contact | Designer | 1 min |
| 13 | **Contact form: dual submit** — disabled button + broken "Send request" link | /contact | Designer | 2 min |
| 14 | **"Lineas customer quote" editorial label visible** as static text | /railos | Designer | 1 min |
| 15 | **Launch Date field empty** on all 3 case studies — shows "Launch Date" label with no value | /projects/* | Designer — hide field or populate | 3 min |
| 16 | **Timeline counter shows raw "0 1 2 3 4 5"** on all 3 case studies | /projects/* | Designer — hide or fix animation | 5 min |
| 17 | **"More projects" carousel only shows Lineas** — not cycling through all 3 | /projects/* | Designer — fix CMS filter | 5 min |
| 18 | **Open RailOS: promises ADK details "below" but none shown** | /railos/open | Designer — add ADK table or remove promise | 15 min |
| 19 | **App Store: still pulling Devices collection** — shows 17 devices as "apps" | /railos/app-store | Designer — rewire to Apps collection | 10 min |
| 20 | **App Store: "RailOS Device Partners" section misplaced** | /railos/app-store | Designer — remove | 1 min |
| 21 | **Devices page: heading "Onboard ATP (Signalling) applications"** — wrong heading, copied from Apps | /railos/devices | Designer | 1 min |
| 22 | **Devices page: intro text copied from Apps page** | /railos/devices | Designer | 2 min |
| 23 | **Apps page: Data section reuses ATP intro text** — factually wrong for non-safety apps | /railos/apps | Designer | 2 min |
| 24 | **Missing H1 — heading is H2** | /leadership, /railos/open | Designer | 2 min |
| 25 | **Open RailOS: "Button Text" placeholder CTA** | /railos/open | Designer | 1 min |
| 26 | **Service partners section empty** — heading with no logos | /services | Blocked — Romain |
| 27 | **Device partners section empty** — heading with no logos | /railos/devices | Blocked — Romain |
| 28 | **Contact page: alt text "Country 1"** on flag icons | /contact | Designer | 1 min |
| 29 | **Homepage news carousel shows only 1 article** — should show 3 | Homepage | Designer — fix CMS limit | 2 min |

**Estimated time: ~55 min (excl. blocked items)**

---

### MEDIUM — Nice to Have for Launch

| # | Issue | Page(s) | Type | Est. |
|---|---|---|---|---|
| 30 | **byq.studio URL** vs "Studio Zissou" text mismatch in footer | All pages | Designer | 1 min |
| 31 | **Generic alt texts** — "testimonial author" on hero images | /careers, /railos/open | Designer | 2 min |
| 32 | **Heading hierarchy** — 5+ consecutive H2s | /about | Designer | 5 min |
| 33 | **Careers page thin** — only has heading + email link | /careers | Content — HR approval needed |
| 34 | **Template stock photos** on About, Careers, Open RailOS | Multiple | Designer — swap with TSC photos | 10 min |
| 35 | **Privacy policy page** — needs full GDPR text from v2 | /privacy-policy | Designer | 15 min |
| 36 | **404 page** — needs v2 copy ("You reached the end of the tracks.") | /404 | Designer | 5 min |
| 37 | **Crosslinks missing** — plain text where links should be | Multiple | Designer | 20 min |
| 38 | **"Infrastructure manager" singular** in copy | /projects | Designer | 1 min |
| 39 | **Skoda slug** — v2 says `skoda-regiojet`, live is `skoda-27ev` | /projects/skoda-27ev | CMS — slug change breaks links | 2 min |

**Estimated time: ~60 min**

---

### BLOCKED — Waiting on Client

| # | Item | Owner | Blocks |
|---|---|---|---|
| B1 | Hero copy — final pick between options | Romain + JL | Homepage hero |
| B2 | Leadership headshots ×8 | Romain | Leadership photos |
| B3 | Leadership bios ×7 (only Raphaël done) | Romain → team | Leadership depth |
| B4 | Partner logos in SVG | Romain | Services partners, homepage trust bar |
| B5 | 27Ev train photo | Romain | Homepage carousel, Skoda page |
| B6 | BR189 locomotive photo | Romain | Homepage carousel, Akiem page |
| B7 | Architecture diagram | Jarlath | Homepage, RailOS, Devices |
| B8 | Bruno Vanlede headshot | Romain | Trust bar quote |
| B9 | PZB country list | Jarlath | PZB product + app |
| B10 | wSTM country list | Jarlath | wSTM product |
| B11 | Akiem project phase count | Romain | Akiem body text |
| B12 | Lineas customer quote for RailOS page | Romain → Bruno | RailOS quote section |
| B13 | CTA wording decision ("briefing"/"demo"/"INDO") | Romain + JL | RailOS page CTA |
| B14 | Train type icons | Romain → designer | Projects, case studies |
| B15 | App icons | Will → AI | RailOS Apps, Products |
| B16 | Stats update (are 109 vehicles current?) | Romain | Trust bar |
| B17 | Video clips from Cliff | Romain → Cliff | Hero backgrounds |
| B18 | Careers page approval | HR | Careers |

---

### Automatable via MCP — Executed 2 Jul 2026

| # | Task | Collection | Status |
|---|---|---|---|
| A1 | Fix "Locomotive & Train Manufacturers" copy | Projects | **SKIPPED** — Designer-only, not CMS-driven |
| A2 | Hide/remove Launch Date + Timeline fields | Projects | **BLOCKED** — fields have Designer bindings; unbind first |
| A3 | Update Skoda slug to `skoda-regiojet` | Projects | **DONE** — slug updated + published |
| A4 | Privacy Policy SEO metadata | Static page | **DONE** — SEO title/desc updated; body content needs Designer |
| A5 | 404 page SEO metadata | Static page | **DONE** — SEO title/desc updated; body content needs Designer |

> **Note:** Skoda case study URL changed from `/projects/skoda-27ev` → `/projects/skoda-regiojet`. Update any hardcoded links in Designer.

---

### Launch Estimate Summary

| Category | Items | Est. Time |
|---|---|---|
| Critical (CEO preview Thu 3 Jul) | 9 items | ~30 min |
| High (launch Mon 7 Jul) | 20 items | ~55 min |
| Medium (nice to have) | 10 items | ~60 min |
| Blocked (waiting on client) | 18 items | — |
| Automatable (MCP) | 5 items | ~30 min |
| **Total actionable (excl. blocked)** | **44 items** | **~3 hours** |

> **Bottom line (pre-call estimate):** ~30 min of critical Designer fixes needed before CEO preview Thursday. ~2.5 hours of Designer + MCP work gets the site launch-ready. 18 items remain blocked on Romain/Jarlath — mostly photos, bios, and copy decisions. None of the blocked items prevent launch, but the site will have placeholder images and thin content in Leadership, Open RailOS, and Careers pages.

---

## Call Notes — 3 Jul 2026 (Will + Romain)

> Source: [Notion meeting notes](https://www.notion.so/studiozissou/Website-chat-392e1848bb5181b181d7de80825f28e7)

### Key Decisions

| Decision | Detail |
|---|---|
| **Go-live pushed** | Week of 13 Jul. Hard deadline: **Wed 15 Jul morning** (was Mon 7 Jul) |
| **Review schedule** | Jarlath: Mon 7 / Tue 8 Jul. Alex (CEO): Wed 9 Jul |
| **wSTM removed as product** | Not a standalone product — part of ETCS system. Remove from Products collection + all nav/footer references |
| **Nav order changed** | Services → Projects → Products → RailOS → Company + **"News" as top-level link** |
| **Footer order changed** | Match nav: Services → Projects → Products → RailOS → Company |
| **Nav dropdowns: no icons** | Existing brand icon library doesn't cover products/services. Redesign dropdowns without icons |
| **Projects dropdown** | Show client logos (B&W) instead of project titles. Order: Lineas → Skoda → Akiem |
| **Products dropdown** | Max 5 items + "All products" link at end |
| **Footer headers** | Link directly to category overview pages. Remove "Overview" label |
| **Footer tagline** | Add "100% software defined safety" (or similar) in place of plain company name |
| **Product sort order** | ETCS → PZB → KVB → TBL1 → Telecom Box |
| **Services sort order** | First-in-class homologation → Series I&C → Maintenance → Training |
| **Homepage stats** | Must reflect total company-wide figures, not single client (Lineas) |
| **Client logos section** | Clients only (not partners) to avoid misleading visitors |
| **Marketing opt-in** | Required checkbox on contact form. Friendly wording, not legal. Privacy policy link opens in new tab. Pre-ticked ruled out |
| **Project carousel** | Static (no autoplay) so users can read titles |
| **News position** | Keep near bottom of homepage — appropriate for new-visitor-first layout |
| **Webflow = source of truth** | Word documents deprecated for content. Jarlath comfortable with Webflow comments |
| **CSV workflow** | Will exports CMS content as CSV → Romain edits → Will re-imports |
| **TBL1 vs TBL1+** | Romain to confirm with Jarlath. If TBL1+, Will updates globally via CMS |
| **Country landing pages** | Post-launch roadmap. Globe/map feature stays non-clickable until then |
| **Will holiday** | 16 Jul evening → ~30 Jul |
| **Romain holiday** | ~1 Aug |

### Photo Decisions (from call)

| Photo | Decision |
|---|---|
| **27Ev (Skoda)** | Romain sending 2 train photos: 3/4 angle + front-facing. Only modern passenger train image available |
| **HLD77 (Lineas)** | Need external shot clearly showing freight train. Current candidate rejected (shows manual workers, not locomotive) |
| **Akiem (BR189)** | Use interior/inspection-style shot (pre-installation, no finished product — viability assessment context) |
| **Product photos** | Romain to take lab photos (natural light, clean background). Will to review and remove any that break site aesthetics |
| **Partner logos** | Will to source service + device partner logos independently. Flag any that can't be found in good quality |

---

## Staging Verification — 6 Jul 2026

> Source: Webflow MCP (Data API) — site `6a32b717a48adbce92029295`

### Verified DONE

| Task | Evidence |
|---|---|
| **W1** (CMS) | wSTM item `isArchived: true, isDraft: true` — not live. Footer/nav removal still needs Designer. |
| **W3** | Products sort: ETCS(1) → PZB(3) → KVB(4) → TBL1(5) → Telecom Box(6). Correct order. |
| **W6** | All 19 live pages have TSC SEO titles + meta descriptions. Zero Cargo+ template text on live pages. |
| **D25** (CMS) | Products collection already uses "Škoda" with diacritics (ETCS body, Škoda project link). Designer text TBC. |

### Verified NOT DONE

| Task | Finding |
|---|---|
| **W4** | Services order: Assessment(1) → Homologation(2) → I&C(3) → Training(4) → Maintenance(5). Target has Maintenance before Training — need to swap orders 4↔5. |
| **W7** | No JSON-LD on any page. Site-wide custom code has placeholder `"name": "Site Name"` only. |
| **W8** | No GA4 tag in site head or footer code. Need tag ID from Romain. |

### Claude Can Do via MCP (no Designer needed)

| Task | Method |
|---|---|
| **W4** — Swap Training/Maintenance order | `data_cms_tool` → `update_collection_items` (set Training order=5, Maintenance order=4) |
| **W5** — Export FAQ CSV | `data_cms_tool` → `list_collection_items` (collection `6a45898e00485325224db7af`) → format as CSV |
| **W7** — Push JSON-LD schemas | `data_pages_tool` → `bulk_update_pages_schema_markup` (Organization, WebSite, FAQPage, Product, Service) |

---

## Updated Action Items — Post-Call (triaged 6 Jul)

> **Priority order:** smallest effort → biggest impact. Work top to bottom.

### Tier 1 — Quick kills (1–5 min each, high visibility)

| # | Task | Est. | Why first | Status |
|---|---|---|---|---|
| D15 | Remove "NOT YET VERIFIED:" prefix on RailOS quote | 1 min | Embarrassing placeholder visible to reviewers | TODO |
| D16 | Fix footer "Products" label duplication (Services column) | 1 min | Visible bug on every page | TODO |
| D14 | Fix "Cargo+" template text (homepage title, hero copy) | 5 min | Still says competitor template name | TODO |
| W1+W2 | Remove wSTM from Products collection + footer + nav | 4 min | Wrong product listed, confuses reviewers | CMS DONE (archived+draft) — footer/nav need Designer |
| D20 | Fix missing H1s on Leadership + Open RailOS | 2 min | SEO + accessibility on 2 pages | TODO |
| D7 | Add footer tagline ("100% software defined safety") | 2 min | Brand presence on every page | TODO |
| D27 | Reply to Romain on logo formats (SVG preferred, PNG fallback, B&W for nav) | 2 min | Unblocks R14 — Romain waiting for answer | TODO |
| D11 | Update homepage stats to company-wide figures | 5 min | UNBLOCKED — misleading single-client stats on homepage | TODO |
| D25 | Fix "Skoda" → "Škoda" diacritics site-wide | 5 min | Incorrect client name everywhere | CMS DONE — check Designer text |
| W3 | Update product sort order: ETCS → PZB → KVB → TBL1 → Telecom Box | 5 min | Agreed order not reflected | DONE (verified: 1,3,4,5,6) |
| W4 | Update services sort order: Homologation → Series I&C → Maintenance → Training | 5 min | Agreed order not reflected | TODO — Claude can fix via CMS API (swap Training↔Maintenance) |
| D13 | Remove broken number counter on projects/case studies | 5 min | Visual bug, broken animation | TODO |
| D17 | Fix "Locomotive & Train Manufacturers" wrong copy | 5 min | Incorrect body text | TODO |

### Tier 2 — Launch blockers (5–15 min each, must-fix before go-live)

| # | Task | Est. | Why essential | Status |
|---|---|---|---|---|
| D9 | Add marketing opt-in checkbox to contact form | 10 min | **GDPR compliance** — blocks launch | TODO |
| D21 | Populate Privacy Policy page with GDPR text from v2 | 15 min | **GDPR compliance** — blocks launch | TODO |
| D8 | Fix all CTA buttons (currently `#` or template paths) | 15 min | Broken links on every page — worst UX issue | TODO |
| D10 | Fix contact page: flags, email, phone, dual submit | 10 min | Key conversion page has wrong info | TODO |
| D18 | App Store: rewire from Devices to Apps collection | 10 min | **Page completely broken** — wrong CMS source | TODO |
| D12 | Fix hero animation text cutoff | 10 min | Homepage first impression broken | TODO |
| W8 | Carry over existing GA4 tag from current WordPress site | 5 min | No analytics = flying blind post-launch | TODO — need tag ID from Romain. No GA4 in site code (verified 6 Jul) |
| D1 | Update nav order: Services → Projects → Products → RailOS → Company | 5 min | Agreed order, affects every page | TODO |
| D2 | Add "News" as top-level nav item | 3 min | Agreed nav structure | TODO |
| D6 | Update footer column order + headers link to category pages | 10 min | Footer nav broken on every page | TODO |
| W6 | Update SEO metadata on all ~15 pages (replace Cargo+ template text) | 20 min | Every page says "Cargo+ Webflow template" in search | DONE (verified: all 19 live pages have TSC titles + descriptions) |
| D19 | Devices page: fix heading + intro text (copied from Apps) | 5 min | Wrong content on page | TODO |
| W5 | Export FAQ content as CSV for Romain to edit | 10 min | Unblocks R12 — Romain ready to review | DONE |

### Tier 3 — Important polish (5–15 min each, pre-launch nice-to-have)

| # | Task | Est. | Notes | Status |
|---|---|---|---|---|
| D26 | Reword homepage hero title/description to be benefits-led | 10 min | Webflow comment feedback — needs client input | TODO |
| D22 | Update 404 page copy ("You reached the end of the tracks.") | 5 min | Low traffic page but easy win | TODO |
| W7 | Generate + push JSON-LD schemas (Organization, WebSite, FAQPage, Product, Service) | 30 min | SEO value but not visible to users | TODO — Claude can push via MCP pages tool |
| D5 | Products dropdown: max 5 + "All products" link | 5 min | UX improvement | TODO |
| W9 | Source partner logos independently (service + device partners) | 30 min | Visual gap on services page | TODO |
| W10 | TBL1 → TBL1+ rename if confirmed by Jarlath | 2 min | Waiting on confirmation | WAITING |

### Tier 4 — Larger nav/dropdown redesign (30+ min total, do as a batch)

| # | Task | Est. | Notes | Status |
|---|---|---|---|---|
| D24 | Take screenshot of current projects menu before changes | 1 min | Do first — before any dropdown changes | TODO |
| D3 | Redesign nav dropdowns without icons | 30 min | Biggest single task — visual overhaul | TODO |
| D4 | Projects dropdown: client logos (B&W) instead of titles | 15 min | Depends on R14 logos | TODO |
| D23 | Fix RailOS dropdown design (no images available for software) | 15 min | Alternative layout needed | TODO |

### Romain — Action Items

| # | Task | Status |
|---|---|---|
| R1 | Send 2× 27Ev train photos (3/4 angle + front-facing) | DONE — shared in common folder (Webflow comment 3 Jul 15:14) |
| R2 | Send HLD77 external freight train photo (not workers) | DONE — shared in common folder (Webflow comment 3 Jul 15:14) |
| R3 | Send Akiem interior/inspection shot | DONE — shared in common folder (Webflow comment 3 Jul 15:14) |
| R4 | Take product photos in lab (natural light, clean background) | TODO |
| R5 | Export news articles from old WordPress as CSV | TODO |
| R6 | Confirm TBL1 vs TBL1+ naming with Jarlath | TODO |
| R7 | Think through revised homepage stats with Charlotte | DONE — stats shared in common folder (Webflow comment 3 Jul 15:15). Romain says copy may be too long — Will to shorten |
| R8 | Share projects customer-segment sections with Charlotte for tailored copy | TODO |
| R9 | Communicate review schedule to Jarlath (Mon/Tue) + Alex (Wed) | TODO |
| R10 | Sort out DNS access with IT / current digital agency | TODO |
| R11 | Confirm Monday availability + notify by email | TODO |
| R12 | Review + edit FAQ CSV when Will sends it | IN PROGRESS — Romain replied "Will do" (Webflow comment 3 Jul 15:21) |
| R13 | Leadership headshots ×8 + bios ×7 | ONGOING |
| R14 | Send client logos (B&W) for projects dropdown + homepage | IN PROGRESS — Romain asking for format specs (Webflow comment 3 Jul 12:50). Will needs to reply with SVG/PNG requirements |

---

## Webflow Designer Comments — 14 unresolved (as of 6 Jul 2026)

> Source: Webflow MCP `data_comments_tool` — site `6a32b717a48adbce92029295`

### Homepage (`6a32b71aa48adbce92029386`)

| Comment | Author | @Mention | Reply | Maps to |
|---|---|---|---|---|
| "Could we get specific project photos?" | Will | Romain | **Romain: "Shared in the common folder"** | R1/R2/R3 — DONE |
| "picture of the freight train" | Will | — | — | R2 |
| "pic of train interior" | Will | — | — | R3 |
| "could you send me the client logos you have?" | Will | Romain | **Romain: "Can you share the formats you need?"** | R14 — needs reply (D27) |
| "let's use the total company stats in this section" | Will | Romain | **Romain: "Shared in common folder. Let me know if copy too long"** | D11 — UNBLOCKED |
| "need to reword the title and description to be benefits led" | Will | Romain | — | D26 — NEW |

### Homepage (footer/nav) (`6a3c4e881cefcb295a3415d4`)

| Comment | Author | @Mention | Reply | Maps to |
|---|---|---|---|---|
| "add friendly checkbox wording to form to agree to privacy policy and marketing" | Will | — | Will: "& privacy policy open in new tab" | D9 |
| "can you review these FAQ for accuracy?" | Will | Romain | **Romain: "Will do"** | R12 — IN PROGRESS |
| "100% software defined safety..." | Will | — | — | D7 |
| "link these to their hub pages" (footer headers) | Will | — | — | D6 |
| "correct the S in Skoda site wide" | Will | — | — | D25 — NEW |
| "add all products and all services links in dropdowns" | Will | — | — | D5 |
| "remove icons from all menu dropdowns and redesign" | Will | — | — | D3 |

### Projects (`6a3c2ed888e0859a0fad01f1`)

| Comment | Author | @Mention | Reply | Maps to |
|---|---|---|---|---|
| "content in the following 4 sections need to be tailored to customer types" | Will | Romain | — | R8 |

---

## Launch Checklist — Go-live Week of 13 Jul

### Pre-Launch: SEO Metadata

**STATUS: DONE** — Verified 6 Jul via MCP. All 19 live pages have proper TSC SEO titles + descriptions. Only draft/template pages retain Cargo+ text (not visible to users or search engines). Original targets vs verified:

| Page | Current SEO Title | Target SEO Title |
|---|---|---|
| Homepage | ~~"Cargo+ - Webflow HTML website template"~~ | "The Signalling Company — Software-Defined ATP for Rail" ✅ |
| RailOS | ~~"RailOS"~~ | "RailOS — The Open Platform for Railway Signalling \| TSC" ✅ |
| Products | ~~"Products"~~ | "Railway Signalling Products — ETCS, Class B ATP & Telecom \| TSC" ✅ |
| Services | ~~"Services"~~ | "Rail Signalling Services — Retrofit, Homologation & Maintenance \| TSC" ✅ |
| Projects | ~~"Projects"~~ | "Customer Projects — ETCS Retrofit & New-Build \| TSC" ✅ |
| About | ~~"About"~~ | "About The Signalling Company — Railway Signalling Innovator" ✅ |
| Leadership | ~~"Leadership"~~ | "Leadership Team — The Signalling Company" ✅ |
| Careers | ~~"Careers"~~ | "Careers at The Signalling Company" ✅ |
| Contact | ~~"Contact"~~ | "Contact Us — The Signalling Company" ✅ |
| News | ~~"News"~~ | "News & Insights — The Signalling Company" ✅ |
| FAQ | ~~"FAQ"~~ | "Frequently Asked Questions — The Signalling Company" ✅ |
| RailOS sub-pages | ~~Bare titles~~ | Apps, Devices, App Store, Open — all have TSC suffixes ✅ |
| Cookie Policy | ~~Template text~~ | "Cookie Policy — The Signalling Company" ✅ |
| Disclaimer | ~~Template text~~ | "Disclaimer — The Signalling Company" ✅ |

> **Status: COMPLETE** — All live pages verified 6 Jul via Webflow MCP.

### Pre-Launch: JSON-LD Schema

No JSON-LD exists yet. Required before launch:

| Schema | Page(s) | Priority |
|---|---|---|
| **Organization** | Site-wide (homepage) | Must — company name, logo, address, social |
| **WebSite** + SearchAction | Homepage | Must — site name, URL |
| **FAQPage** | /faq | Must — 26 FAQs in CMS |
| **Product** | /products/* (5 products after wSTM removal) | Should |
| **Service** | /services/* (4 services) | Should |
| **Article** | /news/* (7 articles) | Should |
| **BreadcrumbList** | All pages | Nice to have |

> **Status:** Can generate and push via MCP pages tool.

### Pre-Launch: Redirects

Old WordPress site (`thesignallingcompany.com`) → new Webflow URLs. **Critical for SEO.**

| Task | Owner | Status |
|---|---|---|
| Crawl current WordPress site for all indexed URLs | Will | TODO |
| Get URL list from Google Search Console (if access available) | Romain | TODO |
| Map old URLs → new Webflow URLs | Will | TODO |
| Set up 301 redirects in Webflow (Project Settings > Hosting) | Will | TODO |
| Romain to export news article URLs from old site as CSV | Romain | TODO (R5) |

### Pre-Launch: Analytics & Tracking

| Item | Owner | Status |
|---|---|---|
| GA4 property ID — carry over from current WordPress site | Will | TODO (W8) — need tag ID from Romain |
| GA4 tag placement (Webflow custom code head) | Will | TODO |
| Cookie consent (Finsweet ConsentPro) — verify GA4 fires only after consent | Will | TODO |
| Form tracking — verify UTM + Conversion Page hidden fields populate | Will | TODO |
| Google Search Console — add + verify ownership after DNS | Will | Post-launch |
| LinkedIn Insight Tag — confirm with Romain if needed | Romain | TODO |

### Pre-Launch: OG Images

All pages currently use the Cargo+ template OG image. Need TSC-branded OG image uploaded and set across all pages.

| Task | Owner | Status |
|---|---|---|
| Create/upload TSC branded OG image (1200×630) | Will | TODO |
| Set OG image on all pages via MCP | Will | TODO |

### DNS Cutover Plan (Go-Live Day)

**Before cutover:**
- [ ] Note current DNS records (A, CNAME, MX, TXT) for `thesignallingcompany.com`
- [ ] Confirm email hosting is separate (won't break MX records)
- [ ] Set TTL low (300s) 24h before cutover if possible
- [ ] Publish site on Webflow with custom domain configured
- [ ] Romain confirms DNS access sorted with IT / agency (R10)

**Day of go-live:**
- [ ] Update A/CNAME records to point to Webflow
- [ ] Enable SSL (Webflow auto-provisions Let's Encrypt)
- [ ] Verify `https://thesignallingcompany.com` loads
- [ ] Verify www redirect (non-www ↔ www)
- [ ] Test all forms submit correctly on production domain
- [ ] Verify cookie consent banner fires
- [ ] Verify GA4 tracking fires after consent

**Post-cutover (same day):**
- [ ] Submit sitemap to Google Search Console (`/sitemap.xml`)
- [ ] Request indexing on homepage
- [ ] Verify 301 redirects work for old WordPress URLs
- [ ] Check no mixed content warnings

### Post-Launch QA (first week)

| Check | When |
|---|---|
| Monitor Search Console for crawl errors | Day 1-3 |
| Check 404s in Webflow analytics | Day 1-7 |
| Verify GA4 data flowing | Day 1 |
| Add remaining redirects for missed WordPress URLs | Day 1-3 |
| Set up uptime monitoring | Day 1 |
| Test all forms received (check Webflow submissions panel) | Day 1 |
| Performance baseline (Lighthouse on key pages) | Day 2 |

### Post-Launch Roadmap

| Item | Priority | Notes |
|---|---|---|
| Country-specific landing pages | Medium | SEO play — "rail safety in France" etc. Globe/map becomes clickable |
| CRM integration (Odoo) | Low | Q4 2026 as discussed |
| Gated content PDFs (brochures/datasheets) | Medium | Add as ready |
| News article SEO optimisation | Medium | Old WordPress articles migrated |
| Leadership bios (full set) | High | Romain chasing team |
| Professional product photography | Medium | Lab photos for launch, professional later |

---

## Updated Launch Estimate (triaged 6 Jul)

| Tier | Items | Est. Time | When |
|---|---|---|---|
| **Tier 1 — Quick kills** | 13 tasks | ~45 min | Today (Sun 6 Jul) |
| **Tier 2 — Launch blockers** | 13 tasks | ~2.5 hours | Mon 7 – Tue 8 Jul |
| **Tier 3 — Polish** | 6 tasks | ~1.5 hours | Wed 9 – Thu 10 Jul |
| **Tier 4 — Nav redesign** | 4 tasks | ~1 hour | Thu 10 – Fri 11 Jul |
| Redirects | TBD | 30 min | Pre-launch |
| OG images | All pages | 10 min | Pre-launch |
| DNS cutover | — | 15 min | Go-live day |
| **Total Will work** | **36 tasks** | **~6.5 hours** | |
| Waiting on Romain | 6 open items (R4–R6, R8–R10) | — | |

> **Timeline:** Tier 1 today. Tiers 2–3 Mon–Thu alongside Jarlath review (Mon/Tue) and Alex review (Wed). Tier 4 nav redesign Thu–Fri. Go-live Mon 14 or Tue 15 Jul (hard deadline Wed 15 AM). Will on holiday from Wed 16 Jul evening.
