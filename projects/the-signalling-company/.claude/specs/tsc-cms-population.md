# TSC CMS Population

> Slug: `tsc-cms-population`
> Client: The Signalling Company
> Date: 2026-06-23
> Status: Ready to Build

---

## Overview

Create, configure, and populate all CMS collections for the TSC Webflow site (Cargo+ template). Migrate 7 existing WordPress blog posts. Wire up cross-collection references (News → Team Members as author, News → Projects/Services/Products as related content).

## Approach

Use Webflow MCP `data_cms_tool` for all collection creation, field setup, and item population. No custom scripts needed — MCP handles everything via the Data API. Template demo items are deleted before real content goes in.

---

## Collections

### 1. Team Members (NEW)

**Collection name:** Team Members
**Singular:** Team Member
**Slug:** `team-members`

| Field | Type | Slug | Required | Notes |
|---|---|---|---|---|
| Name | PlainText | `name` | Yes | Built-in |
| Slug | PlainText | `slug` | Yes | Built-in |
| Role | PlainText | `role` | No | e.g. "CEO", "Head of Product Development" |
| Photo | Image | `photo` | No | Headshot |
| Bio | RichText | `bio` | No | Short professional bio |
| Email | Email | `email` | No | Public contact email (optional) |
| LinkedIn | Link | `linkedin` | No | Profile URL |
| Order | Number | `order` | No | Display order on Leadership page |

**Items to create (8):**

| Name | Role | Order |
|---|---|---|
| Alexandre Betis | CEO | 1 |
| Benoit Blin | Head of Product Development | 2 |
| Fabienne Goutaudier | Head of Quality & System Assurance | 3 |
| Raphael Kleinplac | Head of HR & Facilities | 4 |
| Martin Kriz | Chief Admin and Finance | 5 |
| Jarlath Lally | Head of Sales & Marketing | 6 |
| Stanislas Pinte | RailOS Expert & Special Projects | 7 |
| Benjamin Pischetola | Chief Delivery Officer | 8 |

> **Blocker:** Bios and photos not yet received from Romain. Create items as drafts with name + role only. Update later.

---

### 2. Products (NEW)

**Collection name:** Products
**Singular:** Product
**Slug:** `products`

| Field | Type | Slug | Required | Notes |
|---|---|---|---|---|
| Name | PlainText | `name` | Yes | Built-in |
| Slug | PlainText | `slug` | Yes | Built-in |
| Thumbnail | Image | `thumbnail` | No | Product image |
| Application Category | PlainText | `application-category` | No | e.g. "Automatic Train Protection" |
| Short Description | PlainText | `short-description` | No | One-liner for cards |
| Body | RichText | `body` | No | Full product description |
| National Coverage | PlainText | `national-coverage` | No | e.g. "Germany, Austria, Romania" |
| Key Features | RichText | `key-features` | No | Bullet list of features (ATO, JRU, etc.) |
| Order | Number | `order` | No | Display order |

**Items to create (6):**

| Name | Category | Coverage | Order |
|---|---|---|---|
| ETCS | Automatic Train Protection | All (pan-European) | 1 |
| TOBA Box | Telecom | All | 2 |
| PZB | Automatic Train Protection | Germany, Austria, Romania, Serbia, Croatia | 3 |
| KVB | Automatic Train Protection | France | 4 |
| TBL1 | Automatic Train Protection | Belgium | 5 |
| wSTM | Automatic Train Protection | UK, PL, CZ, etc. | 6 |

---

### 3. Services (NEW)

**Collection name:** Services
**Singular:** Service
**Slug:** `services`

| Field | Type | Slug | Required | Notes |
|---|---|---|---|---|
| Name | PlainText | `name` | Yes | Built-in |
| Slug | PlainText | `slug` | Yes | Built-in |
| Thumbnail | Image | `thumbnail` | No | Service image |
| Short Description | PlainText | `short-description` | No | One-liner for cards |
| Body | RichText | `body` | No | Full service description |
| Related Project | Reference → Clients | `related-project` | No | Link to case study |
| Order | Number | `order` | No | Display order |

**Items to create (5):**

| Name | Related Project | Order |
|---|---|---|
| ETCS Retrofit Viability Assessment | Akiem | 1 |
| First in Class Homologation | Skoda | 2 |
| Series Installation & Commissioning | Lineas | 3 |
| Training | Lineas | 4 |
| Maintenance | Lineas | 5 |

---

### 4. RailOS Devices (NEW)

**Collection name:** RailOS Devices
**Singular:** RailOS Device
**Slug:** `railos-devices`

| Field | Type | Slug | Required | Notes |
|---|---|---|---|---|
| Name | PlainText | `name` | Yes | Built-in |
| Slug | PlainText | `slug` | Yes | Built-in |
| Thumbnail | Image | `thumbnail` | No | Device photo |
| Device Type | PlainText | `device-type` | No | e.g. "Safe Computer", "ERTMS Radio" |
| Applications | PlainText | `applications` | No | e.g. "ETCS, ATO, TCMS" |
| Countries | PlainText | `countries` | No | e.g. "All" or specific |
| Description | RichText | `description` | No | Full device description |
| Datasheet | File | `datasheet` | No | PDF download |
| Order | Number | `order` | No | Display order |
| Category | Option | `category` | No | Options: Computing, Networking, Storage, Display, Radio, Sensor, Telecom |

**Items to create (17):**

| Name | Device Type | Order |
|---|---|---|
| iEVC | Safe Computer | 1 |
| Ethernet Switch | Ethernet Switch | 2 |
| Data Storage Unit (DSU) | Mass Data Storage | 3 |
| DMI (Driver Machine Interface) | Display | 4 |
| GSM-R & FRMCS Radio | ERTMS Radio | 5 |
| GPS | GNSS Access Device | 6 |
| WiFi/4/5/6G Radio | Broadband Access | 7 |
| Sensor Box | ATP Sensor Gateway | 8 |
| Telecom Box (TOBA Box) | Telecom Gateway | 9 |
| Computer Box | Safe Computer (ruggedized) | 10 |
| JRU | Juridical Data Recorder | 11 |
| Euroantenna | Signalling Sensor | 12 |
| PZB Magnet & Magnet Reader | Signalling Sensor | 13 |
| Crocodile & Encoder | Signalling Sensor | 14 |
| Doppler Radar | Speed Sensor | 15 |
| CoRRail | Speed Sensor | 16 |
| Optical Pulse Generator | Speed Sensor | 17 |

---

### 5. Categories (NEW)

**Collection name:** Categories
**Singular:** Category
**Slug:** `categories`

| Field | Type | Slug | Required | Notes |
|---|---|---|---|---|
| Name | PlainText | `name` | Yes | Built-in |
| Slug | PlainText | `slug` | Yes | Built-in |
| Color | Color | `color` | No | Optional tag colour for cards |
| Order | Number | `order` | No | Display order |

**Items to create (5):**

| Name | Slug | Order |
|---|---|---|
| News | news | 1 |
| Insights | insights | 2 |
| Press Release | press-release | 3 |
| Award | award | 4 |
| Product Update | product-update | 5 |

---

### 6. Partners (NEW)


**Collection name:** Partners
**Singular:** Partner
**Slug:** `partners`

| Field | Type | Slug | Required | Notes |
|---|---|---|---|---|
| Name | PlainText | `name` | Yes | Built-in |
| Slug | PlainText | `slug` | Yes | Built-in |
| Logo | Image | `logo` | No | Partner logo |
| Website | Link | `website` | No | External URL |
| Type | Option | `type` | No | Options: Device Partner, Service Partner |

**Items to create (10):**

| Name | Type |
|---|---|
| Duagon | Device Partner |
| Mios | Device Partner |
| Deuta | Device Partner |
| Scle | Device Partner |
| Hassler Rail | Device Partner |
| Lantech | Device Partner |
| Triorail | Device Partner |
| Prose | Service Partner |
| Brouwer | Service Partner |
| SNCB/NMBS Technics | Service Partner |

---

### 7. News (EXISTING — modify + populate)

**Collection ID:** `6a32b71aa48adbce920293ba`

**Existing `category` Option field to DELETE** (slug: `category`, id: `19bc068ffbcec6a62c384352ed8ca4e7`) — replaced by a Reference field.

**Fields to ADD:**

| Field | Type | Slug | Notes |
|---|---|---|---|
| Category | Reference → Categories | `category-ref` | Single reference to Categories collection |
| Author Reference | Reference → Team Members | `author-ref` | Links to Team Members collection |
| Press Release | File | `press-release` | PDF attachment |
| Related Project | Reference → Clients | `related-project` | Cross-link to case study |
| Related Product | Reference → Products | `related-product` | Cross-link to product |
| Related Service | Reference → Services | `related-service` | Cross-link to service |

**Existing demo items:** DELETE before population.

**Items to create (7 — migrated from WordPress):**

| # | Title | Date | Author Ref | Category | Press Release PDF |
|---|---|---|---|---|---|
| 1 | The Signalling Company's ETCS wins Railtech Innovation Award! | 2026-03-06 | — | Award | — |
| 2 | Stan's diary — 11 days in Australia | 2025-12-02 | Stanislas Pinte | Insights | — |
| 3 | Introducing the world's 1st software-defined ETCS certified safety system | 2025-09-24 | — | Press Release | Yes |
| 4 | First locomotive authorised with TSC's software-defined safety system | 2025-09-08 | — | Press Release | Yes |
| 5 | Skoda Group acquires a majority stake in The Signalling Company | 2023-03-26 | Stanislas Pinte | News | — |
| 6 | Positive assessment from TUV Rheinland for iEVC product design | 2021-09-07 | Stanislas Pinte | News | — |
| 7 | TSC to build new mobile app for Belgian Class B system (TBL1+) | 2021-06-29 | Stanislas Pinte | News | — |

> Articles 1, 3, 4 were authored by agency accounts ("agencebigmama"/"Aurelia Big Mama"). Author-ref left blank; plain text `author` field set to "The Signalling Company". Articles 2, 5, 6, 7 attributed to Stanislas Pinte.

> Articles 5, 6, 7 are missing featured images. Flag to Romain for sourcing.

---

### 8. Clients / Case Studies (EXISTING — populate)

**Collection ID:** `6a32b71aa48adbce920293e0`

**No field changes needed** — the template schema is already comprehensive (challenge, approach, solution, quote, 4x result pairs, what's-next).

**Existing demo items:** DELETE before population.

**Items to create (3):**

#### Lineas HLD77

| Field | Value |
|---|---|
| Name | The HLD77 Retrofit Project for Lineas |
| Client Name | Lineas |
| Short Description | A textbook ETCS case study for retrofit |
| Location | Belgium |
| Result 1 | 109 / freight locomotives |
| Result 2 | 87 / with ETCS + Belgian ATP |
| Result 3 | 22 / with ETCS + Belgian, German, & Dutch ATP |
| Result 4 | 10 / Year Maintenance |
| Quote Text | It's a completely different experience. Downtime for the fleet is a fraction of what it was with previous retrofit projects... TSC are risk killers for retrofit projects. |
| Quote Author | Bruno Vanlede, Head of Rail Fleet Management at Lineas |
| Challenge | (from content doc — retrofit context) |
| Approach | (from content doc — modular platform approach) |
| Solution | (from content doc — iEVC-RailOS installation) |

#### Skoda 27Ev

| Field | Value |
|---|---|
| Name | The 27Ev Project for Skoda Transport |
| Client Name | Skoda Transport / RegioJet |
| Short Description | An ETCS case study in new-built passenger train |
| Location | Czech Republic |
| Result 1 | 34 / new-built trains |
| Result 2 | -19,000 / tons of CO2 annually |
| Result 3 | 160 / km/h under overhead supply |
| Result 4 | 120 / km/h in autonomous mode |
| Quote Text | Since The Signalling Company became part of Skoda Group in 2023, its team has consistently demonstrated the ability to deliver on the ambitious goals... |
| Quote Author | Tomas Ignacak, Vice Chairman, Skoda Group |

#### Akiem BR189

| Field | Value |
|---|---|
| Name | Retrofit Viability Assessment for Akiem |
| Client Name | Akiem |
| Short Description | An ETCS case study for pan-European retrofit feasibility |
| Location | Pan-European (10 countries) |
| Result 1 | 10 / countries the BR189 fleet operates in |
| Result 2 | 87.0 / ton locomotive weight |

---

## Execution Plan

### Phase 1: Create collections + fields (MCP)

Order matters due to references:

1. Create **Team Members** collection
2. Create **Products** collection
3. Create **Services** collection (needs Clients ref)
4. Create **RailOS Devices** collection
5. Create **Categories** collection
6. Create **Partners** collection
7. Delete existing `category` Option field from **News**
8. Add fields to **News**: category-ref → Categories, author-ref → Team Members, related-project → Clients, related-product → Products, related-service → Services, press-release (File)

### Phase 2: Delete template demo items (MCP)

1. List items in News collection → delete all
2. List items in Clients collection → delete all

### Phase 3: Populate base collections (MCP, parallelisable)

These have no cross-references and can run simultaneously:

- **Stream A:** Create 8 Team Member items (drafts — no photos/bios yet)
- **Stream B:** Create 6 Product items
- **Stream C:** Create 17 RailOS Device items
- **Stream D:** Create 10 Partner items
- **Stream E:** Create 5 Category items

### Phase 4: Populate referencing collections (MCP, sequential)

These reference items from Phase 3:

1. Create 3 **Client/Case Study** items
2. Create 5 **Service** items (reference Clients)
3. Create 7 **News** items (reference Team Members, upload press release PDFs where available)

### Phase 5: Publish all items (MCP)

Bulk publish all collections.

### Phase 6: Set page SEO metadata (MCP)

Use `data_pages_tool` to set title, description, and OG data for all pages.

---

## Content Migration: WordPress → Webflow

### Blog articles (7)

For each article:
1. Body text extracted by scraper agent (full text available)
2. Clean up formatting: strip WordPress shortcodes, fix heading hierarchy, remove inline styles
3. Insert into News `body-1` field as rich text
4. For articles 3 & 4: download press release PDFs from WordPress, upload to Webflow via `data_assets_tool`, attach to `press-release` field
5. For articles with images: download from WordPress URLs, upload to Webflow, set as `thumbnail`

### Image migration

| Article | Image Status | Source URL |
|---|---|---|
| 1 (Railtech Award) | Has image | wp-content/uploads/2026/03/jarlath-accepting-the-railtech-innovation-award-2026-scaled.jpg |
| 2 (Stan's Diary) | Has image | wp-content/uploads/2025/12/etcs-thesignallingcompany-shared.jpg |
| 3 (ETCS Certified) | Has image | wp-content/uploads/2025/09/etcs-certified-the-signalling-company-thumbnail.png |
| 4 (First Loco) | Has image | wp-content/uploads/2025/09/news-picture-2.jpg |
| 5 (Skoda Acquisition) | MISSING | Flag to Romain |
| 6 (TUV Assessment) | MISSING | Flag to Romain |
| 7 (TBL1+ App) | MISSING | Flag to Romain |

### PDF migration (2 files)

| Article | PDF | Source URL |
|---|---|---|
| 3 | pr-rail-safety-gets-an-upgrade... | wp-content/uploads/2025/09/pr-rail-safety-gets-an-upgrade-the-worlds-first-software-defined-etcs-hits-the-market.pdf |
| 4 | pr-1st-authorisation-with-tsc-platform | wp-content/uploads/2025/09/pr-1st-authorisation-with-tsc-platform.pdf |

---

## Parallelisation Map

| Stream | Task | Agent | Dependencies | Est. MCP calls |
|---|---|---|---|---|
| A | Create Team Members collection + 8 items | code-writer | None | ~10 |
| B | Create Products collection + 6 items | code-writer | None | ~8 |
| C | Create RailOS Devices collection + 17 items | code-writer | None | ~20 |
| D | Create Partners collection + 10 items | code-writer | None | ~12 |
| E | Create Categories collection + 5 items | code-writer | None | ~7 |
| F | Delete old News category field + add new fields | code-writer | A, B, E (for refs) | ~8 |
| G | Delete demo items (News + Clients) | code-writer | None | ~4 |
| H | Create 3 Case Study items | code-writer | G | ~4 |
| I | Create 5 Service items | code-writer | G, H (for refs) | ~6 |
| J | Create 7 News items + migrate content | code-writer | A, E, F, G, H | ~15 |
| K | Upload images + PDFs from WordPress | code-writer | None (pre-step) | ~10 |
| L | Set page SEO metadata (all pages) | seo | None | ~18 |

**Parallel streams:** A+B+C+D+E+G+K can run simultaneously.
**Sequential after:** F (needs A+B+E) → H (needs G) → I (needs H) → J (needs A+E+F+G+H)
**Independent:** L (anytime)

---

## Verify Loop

### Pass/fail criteria
- [ ] All 8 collections exist on the site (list via `get_collection_list`)
- [ ] Each collection has correct fields (verify via `get_collection_details`)
- [ ] Team Members: 8 items created
- [ ] Products: 6 items created
- [ ] RailOS Devices: 17 items created
- [ ] Partners: 10 items created
- [ ] Services: 5 items created
- [ ] Clients: 3 items (Lineas, Skoda, Akiem) — no demo items remain
- [ ] News: 7 items (migrated articles) — no demo items remain
- [ ] News items have correct dates, categories, and author references
- [ ] 2 press release PDFs attached to articles 3 and 4
- [ ] 4 featured images attached to articles 1-4
- [ ] All items published (not drafts, except Team Members pending bios)

### Reproduction steps
1. Call `get_collection_list` for site `6a32b717a48adbce92029295`
2. For each collection, call `get_collection_details` to verify fields
3. For each collection, call `list_collection_items` to verify item count and content
4. Visit https://tsc-v2.webflow.io/ after publish to verify CMS-driven sections render

### Regression scope
- Template section layouts must still render (no broken CMS bindings)
- News template page must display article content correctly
- Clients template page must display case study content correctly

---

## Barba Impact

N/A — no Barba transitions on this project.

---

## Test Plan

### Tier 1 — Auto: MCP verification
- Collection count = 8
- Field schemas match spec
- Item counts match spec (8 + 6 + 17 + 10 + 5 + 5 + 3 + 7 = 61 total items)

### Tier 2 — Auto: Post-publish page checks
- News listing page renders 7 articles
- Case Studies listing page renders 3 projects
- No console errors on key pages

### Tier 3 — Manual
- Verify rich text formatting of migrated blog posts renders correctly
- Verify press release PDF downloads work
- Verify featured images display at correct aspect ratio
- Check Team Member photos once Romain provides them
- **Why manual:** Rich text rendering quality and image cropping are visual checks
