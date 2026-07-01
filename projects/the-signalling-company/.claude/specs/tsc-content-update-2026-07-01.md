# TSC Content Update — Full Page-by-Page Spec

> Date: 2026-07-01
> Source: "Text Content For Website" PDF (49 pages), `cargo-template-layout-plan.md`, call notes 30 Jun
> Method: Live site snapshots via Chrome DevTools vs content doc + layout plan
> CEO preview: Thursday 3 Jul | Go-live: Monday 7 Jul

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
| **Projects** | Customer segments still have near-identical copy | CRITICAL | BLOCKED — Romain/Jarlath |
| **Projects** | "Locomotive & Train Manufacturers" copy says "infrastructure managers" (wrong ICP) | HIGH | BLOCKED — Romain/Jarlath |
| **Services** | Partner logos section empty | MEDIUM | BLOCKED — Romain |
| **All partner logos** | Not yet received | MEDIUM | BLOCKED — Romain |

### CMS collections created (all items in draft)

| Collection | ID | Items | Status |
|---|---|---|---|
| FAQ Categories | `6a4589b5fa26ad6fca2f2890` | 3 (Products, RailOS, Services) | Draft |
| FAQs | `6a45898e00485325224db7af` | 5 dummy items | Draft |
| RailOS Apps | `6a458cb63020a42432407cdc` | 9 (6 ATP + 3 Data) | Draft — needs Designer wiring |

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

**Change to (from `homepage-railos-copy-layout.md`):**
- Tag: "Safety-Critical Train Protection"
- H1: "Your fleet stays compliant. Your costs stay down. Your system never goes obsolete."
- Sub: "TSC builds the ETCS onboard systems that freight and passenger operators rely on across Europe. Software-defined, lighter to install, and designed to evolve with your fleet — not against it."
- CTA 1: "See how it works" → `#platform` (scroll to RailOS section on-page)
- CTA 2: "Talk to our team" → popup contact form
- Background: Corporate/workshop video or dark static with motion

**Image opportunity:** Hero background — use workshop/corporate video clip from Cliff (expected today/tomorrow). Fallback: dark static image of TSC electronics or depot.

> **Note:** Romain sending refined homepage copy "by tomorrow evening" (per call 30 Jun). Structure from above, drop in final copy when received.

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
| 1 | One platform, every ATP system | ETCS, TBL1+, PZB, KVB — all run as software on the same SIL4-certified computer. One investment covers every market your fleet operates in. | See our products → `/products` |
| 2 | Software updates, not hardware replacement | When regulations change, the software changes. The hardware stays. Your fleet stays compliant without depot downtime or capital replacement cycles. | Explore RailOS → `/railos` |
| 3 | Lighter, faster, less intrusive | Where conventional systems need 4-6 boxes in the cab, TSC's software-defined approach consolidates into one compact unit. Less weight on the vehicle, less time in the depot, less disruption to operations. | See certified devices → `/railos/devices` |
| 4 | Open to your engineers | RailOS is the only ATP platform with a third-party developer kit. OEMs can build, test, and certify their own safety-critical applications. No other vendor offers this. | Open RailOS → `/railos/open` |

**Image opportunity:** Each card could have a small icon. Use product icons from the brand book once received from Romain's designer.

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
- Tag: Freight Retrofit
- Heading: "109 freight locomotives. 3 countries. Full ETCS."
- Body: "Europe's largest private freight operator chose TSC to retrofit its HLD77 fleet with ETCS across Belgium, the Netherlands, and Germany. Full onboard systems, installed and maintained for 10 years."
- CTA: "Read the case study" → `/projects/lineas-hld77`
- Visual: Lineas locomotive photo or installation timelapse still

**Slide 2 — Skoda / RegioJet 27Ev:**
- Tag: New Build
- Heading: "Next-generation electric trains. ETCS from day one."
- Body: "Skoda Transportation selected TSC to supply the onboard ATP platform for its 27Ev BEDMU fleet — built for RegioJet passenger services with ETCS integrated from the factory floor."
- CTA: "Read the case study" → `/projects/skoda-27ev`
- Visual: 27Ev train photo (ask Romain for Skoda imagery)

**Slide 3 — Akiem BR189:**
- Tag: Fleet Leasing
- Heading: "Keeping leased assets compliant across borders."
- Body: "Akiem's BR189 locomotives operate across multiple European networks. TSC's multi-system platform keeps them leasable and compliant — without per-country hardware changes."
- CTA: "Read the case study" → `/projects/akiem-br189`
- Visual: BR189 photo (ask Romain)

**Image opportunity:** CRITICAL — carousel needs one hero image per slide. Without images, this section fails visually.

---

#### Section 4: Trust Bar + Proof Points (`section_testimonial`) — LAYOUT CHANGE NEEDED

Template has a simple quote + 2 stats. Content doc needs a **3-part trust stack**: logo ticker strip (above) + quote with photo (middle) + 4-stat row (below). This is 3 visual elements combined in one section. May need to use `section_logo-home` for the ticker and `section_testimonial` for the quote+stats, or restructure the testimonial section to include all three.

**Live now:**
- H2: "Retrofit Viability Assessment for Akiem"
- Stats: "10 countries", "87.0 ton locomotive weight"
- Template author photo (generic)

**Change to:**
- **Logo ticker (no heading):** Lineas, Skoda Transportation, Akiem, Skoda Group, certification/notified body marks
- **Quote:** "It's a completely different experience. Downtime for the fleet is a fraction of what it was with previous retrofit projects. The software updates take less than a month, the installation takes less than ten days, the automated commissioning takes less than three hours. As fleet managers know, these numbers are amazing and make the world of difference. TSC are risk killers for retrofit projects." — Bruno Vanlede, Head of Rail Fleet Management at Lineas
- **Stats row:**

| Stat | Label |
|---|---|
| 109+ | Vehicles equipped |
| 3 | Countries in service |
| 10 yr | Maintenance commitment |
| 2025 | ETCS certified |

**Image opportunity:** Replace generic author photo with Bruno Vanlede headshot if available, or Lineas fleet photo.

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

**Image opportunity:** CRITICAL — architecture diagram showing RailOS as the layer between hardware and applications. Ask Jarlath. Placeholder: simplified block diagram.

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
- H1: "One platform. Every ATP system."
- Sub: "RailOS is the software-defined operating system for safety-critical train protection. It runs ETCS and national Class B systems on a single set of hardware — upgradable by software, not hardware replacement."

---

#### Section 2: The Problem (NEW) — LAYOUT CHANGE: NEW SECTION

**Not on live site.** Use `section_features-about` (3-card grid from About C template) — each card gets an icon, heading, and body paragraph. Or use `section_system` (feature grid from Services template) which also supports icon + heading + body cards.

Section heading: "Traditional ATP is holding the industry back"

| Card | Heading | Body |
|---|---|---|
| 1 — Proprietary lock-in | One vendor, one system, no way out | Conventional ATP platforms tie operators to a single vendor for hardware, software, and maintenance. Switching costs are prohibitive, and upgrades happen on the vendor's timeline. |
| 2 — Hardware obsolescence | Replace the box every 10 years | Legacy systems embed safety logic in hardware. When standards change or components reach end-of-life, the entire unit gets replaced — at millions per fleet. |
| 3 — Cross-border complexity | A different system for every border | Each national ATP standard (TBL1+, PZB, KVB) traditionally requires its own dedicated hardware. Cross-border fleets carry multiple boxes, multiplying weight, cost, and maintenance. |

**Image opportunity:** Abstract graphics or icons for each card — lock icon, obsolescence cycle, border/map graphic.

---

#### Section 3: What RailOS Changes — LAYOUT CHANGE: NEW SECTION

Use `section_system` (4-card grid from Services template). Each card needs: icon, heading, body, and a CTA link. Template `section_system` supports this pattern. 4 cards in a 2×2 grid.

Section heading: "Software-defined. Open. Built to last."

| Card | Heading | Body | Link |
|---|---|---|---|
| 1 | Run any ATP application on one computer | RailOS is a portable, real-time operating system. ETCS, TBL1+, PZB, KVB — all run as software applications on the same SIL4-certified hardware. Add new systems with a software update, not a hardware swap. | See our products → `/products` |
| 2 | Upgrade by software. Eliminate obsolescence. | When standards evolve or regulations change, RailOS applications are updated remotely. The hardware stays. Your fleet stays compliant without depot downtime or capital replacement cycles. | See our services → `/services` |
| 3 | Build your own safety-critical applications | RailOS includes an Application Developer Kit for OEMs and third-party developers. Write, test, and certify new applications on a proven, SIL4-compliant platform. No other ATP vendor offers this. | Explore Open RailOS → `/railos/open` |
| 4 | Half the boxes, half the installation time | The software-defined approach consolidates what was previously 4-6 separate hardware units into a single compact system. Lighter on the vehicle, faster in the depot, and simpler to maintain. | See certified devices → `/railos/devices` |

**Image opportunity:** Each card — icon from brand book (platform/open, upgrade/refresh, code/developer, weight/size).

---

#### Section 4: Credibility Quote — USE `section_quote` (no layout change)

Template `section_quote` (from About B/C) supports blockquote with attribution. Works as-is.

**Quote option A (customer — preferred):**
"[Actual customer quote about RailOS — request from Romain]"

**Quote option B (internal — use as placeholder):**
"We entrust children's lives to our systems. That's why RailOS was built from a blank sheet — no legacy code, no compromises, no shortcuts."
— Alex Betis, CEO, The Signalling Company

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

**Stats row:**

| Stat | Label |
|---|---|
| 109+ | Vehicles equipped |
| 3 | Countries in service |
| 2019 | Platform development started |
| 2025 | ETCS certified |

Body: "RailOS powers the ETCS retrofit of 109 Lineas freight locomotives across Belgium, the Netherlands, and Germany — and the next-generation 27Ev electric trains for Skoda Transportation's RegioJet service."

→ Lineas HLD77 project `/projects/lineas-hld77`
→ Skoda 27Ev project `/projects/skoda-27ev`

**Image opportunity:** Lineas fleet photo or map graphic showing operational coverage.

---

#### Section 7: FAQ — USE `section_home-faq` or `section_faq-list` (no layout change)

Copy the FAQ accordion from the homepage template or the dedicated FAQ page template. Structure works as-is.

Section heading: "Technical questions about RailOS"

**Q1: How does RailOS handle SIL4 certification for software updates?**
A: RailOS separates the safety-critical application layer from the platform layer. When an application is updated, only the changed component needs re-assessment — not the entire system. This is how "software-defined" translates to "certifiable" in practice. The safety case is designed for evolution, not frozen in hardware.

**Q2: Can RailOS run third-party applications alongside TSC's own apps?**
A: Yes. The Application Developer Kit allows OEMs and third-party developers to build, test, and certify their own safety-critical applications on the RailOS platform. Applications are sandboxed — a third-party app cannot affect the integrity of other certified applications running on the same hardware.
→ Learn about Open RailOS `/railos/open`

**Q3: What hardware does RailOS run on?**
A: The core computing platform is the iEVC — a SIL4-certified safe computer designed for rail environments. RailOS also supports a certified ecosystem of peripherals: driver machine interfaces, balise readers, Euroradio units, recording devices, and telecom gateways. The platform is hardware-agnostic by design — it runs on certified off-the-shelf components, not proprietary boxes.
→ See all certified devices `/railos/devices`

**Q4: How does RailOS handle interoperability between ETCS and national systems?**
A: Through the iSTM (integrated Specific Transmission Module) — a software-defined STM that manages the transition between ETCS and Class B systems like TBL1+, PZB, and KVB. The handover is handled in software, automatically, without driver intervention or separate hardware modules. This is what makes single-platform cross-border operation possible.

**Q5: What's the typical deployment timeline for RailOS on a new fleet?**
A: It depends on fleet size, country requirements, and whether the project is a retrofit or new build. The Lineas HLD77 program (109 locomotives, 3 countries, ETCS + TBL1+) is TSC's reference deployment. We handle the full lifecycle: fleet assessment, homologation with national safety authorities, installation, commissioning, and 10-year maintenance.
→ Discuss your project `/contact`

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

**Currently populated.** Content is correct but summaries are short. Full descriptions from content doc should go on individual product pages (`/products/{slug}`).

**ETCS** — Live content OK. Full page at `/products/etcs` needs:
- Full content doc text about upgradability (ATO, Class B, JRU)
- "See ETCS in action:" links to Lineas, Skoda, Akiem case studies
- Country flags table or carousel for Class B coverage

**TOBA Box** — Live content OK but placeholder. Full page needs:
- **BLOCKED:** "[JL to add some text there]" — ask Jarlath for TOBA copy
- Interim: "A true FRMCS onboard gateway, 5G railway onboard. A value-add option with our ETCS platform, our TOBA Box eliminates the need for multiple stand-alone telecom and GPS devices, reducing hardware, installation and lifetime maintenance costs."
- Crosslinks: ETCS product, Telecom Box device entry

**PZB** — Live content OK. Full page needs:
- National Network Coverage: Germany, Austria, Romania, Serbia, and Croatia
- Two configurations: stand-alone and ETCS-integrated
- Crosslinks: iEVC → `/railos/devices`, ETCS → `/products/etcs`

**KVB** — Live content OK. Full page needs:
- National Network Coverage: France
- Same structure as PZB
- Crosslinks: iEVC → `/railos/devices`, ETCS → `/products/etcs`

**TBL1** — Live content OK. Full page needs:
- National Network Coverage: Belgium
- Includes +, ++, and NG variations
- Crosslinks: iEVC → `/railos/devices`, ETCS → `/products/etcs`

**wSTM** — Live content OK. Full page needs:
- National Network Coverage: UK, PL, CZ, etc.
- Crosslinks: iEVC → `/railos/devices`, RailOS → `/railos`

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

**Image opportunity:** Product family diagram or branded graphic showing all 6 products in their relationship to each other. Alternative: photo of iEVC hardware unit in a cab.

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
- CTA 1 → `/projects/akiem-br189` (case study)
- CTA 2 → `/contact` (popup form)

**First in Class Homologation:**
- Full content: "We deliver a complete range of First-In-Class homologation services for new-build and retrofit projects. Covering the complete V-Cycle, from Concept Design to Authorization to Put In Service (APIS), our FiC Homologation Service Packs are fine-tuned to optimize cost and align with the specific needs of each project."
- CTA 1 → `/projects/skoda-27ev` (case study)
- CTA 2 → `/contact`
- **Comment:** Expand with what the process involves — biggest differentiator, currently underexplained.

**Series Installation & Commissioning:**
- Full content: "We deliver multiple service pack options for Installation & Commissioning ranging from a complete turn-key service to Supervision and Audit to Training."
- Crosslink: "Training" → Training service
- CTA 1 → `/projects/lineas-hld77`
- CTA 2 → `/contact`

**Training:**
- Full content: "We deliver training courses for Drivers, Maintenance Technicians, and Operational Managers. Other bespoke training options are available on request."
- CTA 1 → `/projects/lineas-hld77`
- CTA 2 → `/contact`
- **Comment:** Expand — who gets trained? What does a training session look like? Shows commitment beyond the sale.

**Maintenance:**
- Full content: "We deliver post-warranty maintenance service packs for up to 10 years or longer. Each pack is configured and optimized for the unique operational needs of each client. Clients can build their own bespoke pack from an extensive list of corrective, preventative and predictive maintenance options."
- Crosslink: "predictive maintenance" → `/railos/apps` (DJR and DRU apps)
- CTA 1 → `/projects/lineas-hld77`
- CTA 2 → `/contact`

#### Section 3: Service Partners

- Heading: "Service partners" ← keep
- **Add logos:** Prose, Brouwer, SNCB/NMBS Technics
- **Waiting on Romain** for logo files

#### Section 4: Remove or fix remaining template content

- Remove "Clients" tag
- Remove "Designed to move your operations forward" heading
- Fix form dropdown options or replace with CTA → popup form

**Image opportunity:** Photo of installation work in progress, training session, or depot commissioning between service items.

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

**Critical issue:** All 4 segments have **near-identical copy** with only the company type swapped. The Why/How/What blocks say the same thing. Each ICP has fundamentally different concerns:
- Fleet operators care about **downtime and installation speed**
- Leasing companies care about **asset value and multi-market flexibility**
- Infrastructure managers care about **standards compliance and interoperability**
- OEMs care about **integration simplicity and the open platform**

**Action:** Tailor 2-3 sentences per segment. This is the #1 content quality issue on the site. **BLOCKED — Romain/Jarlath:** Need differentiated copy per ICP from the client. The content doc doesn't provide tailored messaging per segment — all 4 use the same template text. Cannot fix this without client input. Flag on next call.

#### Section 4: Crosslinks needed

- Fleet Operators → `/projects/lineas-hld77` (Lineas is a fleet operator)
- Fleet Leasing Companies → `/projects/akiem-br189` (Akiem is fleet leasing)
- Locomotive & Train Manufacturers → `/projects/skoda-27ev` (Skoda is an OEM)
- All segments: "ETCS" text → `/products`
- CTA at bottom → popup contact form

**Image opportunity:** Each segment card could have a photo representing that customer type — freight locomotives for Fleet Operators, modern passenger trains for OEMs, etc.

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

**Image opportunity:** CRITICAL — hero image needed. Use locomotive photo or installation timelapse still. Content doc references "Installation Timelapse" video.

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

**Image opportunity:** CRITICAL — 27Ev train photo. Ask Romain for Skoda imagery access (discussed on call).

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
| No customer quote | — | No quote available in content doc. Leave blank or add a TSC internal perspective. |
| Missing stats | Only 2 stats (10 countries, 87.0 ton) | Content doc only has these. Consider adding: number of project phases, timeline. |
| Subheadline | Missing | "An ETCS case study for pan-European retrofit feasibility" |
| In-body crosslinks | None | "ETCS" → `/products`, "feasibility of retrofitting" → `/services/etcs-retrofit-viability-assessment`, "ten countries" → `/products/wstm` |
| Content doc placeholder | "[X] project phases have been defined" in source doc | **Ask Romain** for the number of project phases |
| Specs from content doc | Not on live site | Add: "Entry in service: 2009-2011. Energy: electric. Weight: 87.0 ton." |

**Image opportunity:** BR189 locomotive photo — ask Romain.

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
| Missing content | About page doesn't mention founding team's prior roles | Add per content doc: "Founders Stanislas Pinte (ex ERTMS Solution), and Alexandre Betis (ex Ansaldo and Hitachi)" — this IS present in the text but the crosslink to `/leadership` is missing |

**Image opportunity:** Replace generic stock photos with:
1. Hero: TSC team or workshop photo
2. Values section: workspace/collaboration photo
3. Philosophy section: use video reference "visit at the workshop" from content doc

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

**Action:** Fix diacritics and heading level. **BLOCKED — Romain:** Bios and photos not yet provided — content doc only has placeholder text. Need real bios from each team member before modal content can be populated.

**CTAs from content doc:** Leadership → Contact, Insights, About ("Our Story"), Careers ("Join the Team")

**Image opportunity:** Headshot photos for each team member. Until available, use a consistent placeholder (initials on brand colour, or silhouette).

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

**ATP Applications (6):**
1. ETCS App — certified 2025, in service on Lineas HLD77 and Skoda 27Ev
2. TBL1+ App — in service since 2025 on Lineas HLD77 fleet
3. PZB App — in development/certification, for Lineas international cohort
4. KVB App — in development/certification, for French network
5. iSTM App — software-defined STM for ETCS + Class B integration
6. TCMS App — customised per vehicle sub-system integration plan

**Data Applications (3):**
1. DJR App — Digital Journey Replay
2. DRU App — alternative to standalone TRU/JRU
3. LRU App — laptop-based local/remote data extraction ("…more to be added")

**Image opportunity:** Photo of DMI screen in cab between ATP and Data application sections.

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

**Content doc has 17 devices. Full descriptions ready for all.**

**Core devices:**
1. iEVC (Safe Computer)
2. Ethernet Switch
3. Data Storage Unit (DSU)
4. DMI (Driver Machine Interface) — 8in and 12in formats
5. Computer Box (ruggedised iEVC)

**Telecom devices:**
6. GSM-R & FRMCS Radio
7. GPS
8. WiFi/4/5/6G Radio
9. Telecom Box (TOBA Box)

**Sensors:**
10. Sensor Box
11. Euroantenna
12. PZB Magnet & Magnet Reader
13. Crocodile & Encoder
14. Doppler Radar
15. CoRRail
16. Optical Pulse Generator

**Data recording:**
17. JRU (Juridical Recording Unit)

**Device Partners:** Duagon, Mios, Deuta, Scle, Hassler Rail, Lantech, Triorail

**Critical need:** This is 17 items of dense text. Without visual hierarchy it's unbearable.

**Image opportunity:** CRITICAL —
1. System diagram showing iEVC at centre with all devices connected (most impactful single image on the whole site)
2. Photos of actual hardware units (iEVC, Computer Box, Sensor Box, TOBA Box)
3. Data sheet download CTAs for: Sensor Box, Telecom Box, Computer Box (content doc references "[CTA download our data sheet]")

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
| Template email | `hq@cargo.plus` | TSC email (e.g. `info@thesignallingcompany.com`) |
| Phone link on address | `tel:+49201328443` (German number) | Remove or replace with TSC phone |
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

**Content doc:** Complete GDPR policy text (9 sections). Last updated June 2026.

**Action:** Populate with full text from layout plan (sections 1-9).

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
| ADK comparison table | Not present | **BLOCKED — Romain:** "[Add table from ADK presentation]" |

**Content doc:**
- Two ADK options: General ADK (non-safety) and Safe ADK (safety-critical)
- Application form with 8 fields

**Image opportunity:** Developer/engineering workspace photo near the ADK section.

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

**Content doc:**
- H1: "You reached the end of the tracks."
- Body: "The page you're looking for has moved — or never existed. Let's get you back on the right line."
- CTAs: Our Products, Our Services, Our Projects

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

## Image Placement Summary

### Must-have for CEO preview (Thursday)

| Page | Location | What | Source |
|---|---|---|---|
| Homepage hero | Background | Workshop/corporate video or dark image | Cliff video clips (expected today/tomorrow) |
| Homepage carousel | Per slide | 1 photo per project (Lineas loco, 27Ev, BR189) | Ask Romain for Skoda/Akiem imagery |
| Lineas case study | Hero | Locomotive photo or installation timelapse | Available assets |
| Skoda case study | Hero | 27Ev train photo | Ask Romain |
| Akiem case study | Hero | BR189 locomotive photo | Ask Romain |
| About page | Hero + values | Replace stock photos (tiger, generic) with TSC photos | Available assets / workshop video stills |
| RailOS page | Section 5 | Architecture diagram: Hardware → RailOS → Applications | Ask Jarlath |

### Nice-to-have (improve before go-live)

| Page | Location | What |
|---|---|---|
| Products | After intro | Product family diagram |
| RailOS Devices | Between device groups | System diagram (iEVC at centre) |
| Services | Between items | Installation/training photos |
| Customers/Projects | Per segment card | Fleet photos matching each ICP |
| Open RailOS | Near ADK section | Developer workspace photo |
| Homepage RailOS section | Inline | Simplified architecture block diagram |
| RailOS problem cards | Per card | Icons: lock, obsolescence, borders |
| RailOS capability cards | Per card | Brand book icons |

---

## Items Waiting on Romain / Jarlath

| Item | Owner | Status | Blocks |
|---|---|---|---|
| Clean finalised content document (no tracked changes) | Romain | Promised | — |
| Homepage copy (page 7 of content doc) | Romain | "By tomorrow evening" | Homepage build |
| Expanded RailOS copy | Jarlath + Romain | Open | RailOS page depth |
| TOBA Box product text | Jarlath | "[JL to add some text there]" | TOBA product page |
| PZB country list completion | Jarlath | "[add others]" | PZB app description |
| Akiem project phase count | Romain | "[X] project phases" | Akiem case study body |
| ADK comparison table | Romain | "[Add table from ADK presentation]" | Open RailOS page |
| Partner logos (SVG) | Romain | **BLOCKED** — need from Romain | Logo ticker, partner sections |
| Industry icons (SVG) from brand designer | Romain → designer | Due Thu evening | Vehicle type + project type icons |
| Leadership bios | Romain → team | Placeholder cards first | Leadership page depth |
| Video clips from Cliff | Romain → Cliff | "End of day tomorrow" | Hero backgrounds, case studies |
| Skoda imagery access | Romain | Discussed on call | Skoda case study hero |
| Legal page approval | Legal department | Pending | Privacy policy |
| Careers page approval | HR department | Pending | Careers page |
| FAQ content | Romain | Post-launch | FAQ page population |
