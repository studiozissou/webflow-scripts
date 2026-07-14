# TSC Website — Cargo+ Template Layout Plan (with Content)

> Template: Cargo+ by BYQ Studio
> Site: https://tsc-v2.webflow.io/
> Date: 2026-06-24 (content mapped from "Text Content For Website v3")
> Content source: /Users/willmorley/Downloads/Text Content For Website (3).docx

---

## Template Section Inventory

### Available sections (by template page)

| Section Class | Found on Page | What it does |
|---|---|---|
| `section_hero-home` | Home | Full hero with H1, two CTAs, subtitle, scroll indicator |
| `section_about-home` | Home | Split intro: tagline left, 2-col service cards right |
| `section_home-clients` | Home | Featured case study with video bg + "Read case study" CTA |
| `section_logo-home` | Home | Logo ticker strip |
| `section_testimonial` | Home | Quote + stats row (e.g. 18%, 12%) |
| `section_network` | Home | Map/country grid with "Operating across X countries" |
| `section_newsroom` | Home | Latest news cards (CMS-powered) |
| `section_home-faq` | Home | Accordion FAQ (light-mode variant) |
| `section_cta` | Home (+ most pages) | Full-width CTA banner with video bg |
| `section_hero-services` | Services | Simple tag + H1 hero |
| `section_system` | Services | Feature grid: icon cards with heading + body |
| `section_services` | Services | Service list with quote + expandable items |
| `section_logos` | Services | Logo strip with heading |
| `section_clients` | Services | Client cards with read-more links |
| `section_form` | Services | Inline contact form with project type selector |
| `section_hero-about-a` | About A | Tag + H1 hero (text only) |
| `section_about-image` | About A | Full-width image |
| `section_mission-a` | About A | Mission statement block |
| `section_stats-a` | About A | Team intro + stats |
| `section_values-a` | About A | Values cards grid |
| `section_team-a` | About A | Team member grid with photo + title |
| `section_hero-about-b` | About B | Tag + H1 hero with video bg |
| `section_mission-b` | About B | Mission text block |
| `section_stats-b` | About B | Numbered process steps (01, 02, 03...) |
| `section_quote` | About B/C | Blockquote with company attribution |
| `section_setup` | About B | "Who we work with" — audience segment cards |
| `section_hero-about-c` | About C | Short punchy H1 hero |
| `section_features-about` | About C | Feature cards with icons (2-3 col) |
| `section_timeline` | About C | Vertical timeline with year milestones |
| `section_hero-clients` | Case Studies | Tag + H1 hero |
| `section_clients-listing` | Case Studies | CMS list of case study cards |
| `section_hero-client` | Case Study (single) | Client name + H1 result statement |
| `section_client-thumbnail` | Case Study (single) | Hero image for the case |
| `section_body-client` | Case Study (single) | Rich text body: Challenge / Approach / Solution |
| `section_hero-contact-a` | Contact A | Contact details grid + inline form |
| `section_hero-contact-b` | Contact B | Contact details (no form) |
| `section_form-contact-b` | Contact B | Standalone form + sidebar content |
| `section_news-a-hero` | Newsroom A | Tag + H1 hero with subtitle |
| `section_news-a-listing` | Newsroom A | CMS news cards grid |
| `section_hero-faq` | FAQ | Simple tag + H1 |
| `section_faq-list` | FAQ | Categorised accordion FAQ |
| `section_hero-legal` | Privacy | Legal page hero |
| `section_body-legal` | Privacy | Rich text legal body |

---

## Navigation Structure

> Updated 2026-06-24. See full rationale in `tsc-nav-ia.md`.
> Consolidates JL's 6 MEPs to 5 top-level items + CTA button.

### Header Nav

```
[Logo]  RailOS ▾  |  Products  |  Services  |  Projects ▾  |  Company ▾    [Contact Us]
```

- **RailOS** (dropdown)
  - RailOS Overview `/railos`
  - RailOS Apps `/railos/apps`
  - RailOS Devices `/railos/devices`
  - Open RailOS `/railos/open`
  - RailOS App Store `/railos/app-store`
- **Products** `/products` — plain link to hub page
- **Services** `/services` — plain link to hub page
- **Projects** (dropdown)
  - All Projects `/projects`
  - Lineas HLD77 `/projects/lineas-hld77`
  - Skoda / RegioJet `/projects/skoda-regiojet`
  - Akiem BR189 `/projects/akiem-br189`
- **Company** (dropdown)
  - About Us `/about`
  - Leadership `/leadership`
  - Careers `/careers`
  - Insights & News `/insights`
- **[Contact Us]** `/contact` — CTA button, visually distinct

### Footer

Four link columns mirroring the nav, plus a Projects row and legal strip.

**Column 1 — RailOS**
- Overview `/railos`
- Apps `/railos/apps`
- Devices `/railos/devices`
- Open RailOS `/railos/open`
- App Store `/railos/app-store`

**Column 2 — Products**
- ETCS `/products/etcs`
- TOBA Box `/products/toba-box`
- PZB `/products/pzb`
- KVB `/products/kvb`
- TBL1 `/products/tbl1`
- wSTM `/products/wstm`

**Column 3 — Services**
- Retrofit Assessment `/services/etcs-retrofit-viability-assessment`
- Homologation `/services/first-in-class-homologation`
- Installation & Commissioning `/services/series-installation-commissioning`
- Training `/services/training`
- Maintenance `/services/maintenance`

**Column 4 — Company**
- About Us `/about`
- Leadership `/leadership`
- Careers `/careers`
- Insights & News `/insights`
- FAQ `/faq`
- Contact `/contact`

**Projects row** (below columns or as 5th column)
- Lineas HLD77 `/projects/lineas-hld77`
- Skoda / RegioJet `/projects/skoda-regiojet`
- Akiem BR189 `/projects/akiem-br189`

**Legal strip**
- &copy; 2026 The Signalling Company SRL
- Rue des Deux Gares 82/B, 1070 Brussels
- BCE BE0724925936
- Privacy Policy `/privacy-policy`

---

## Page-by-Page Layout Mapping (with Content)

---

### 1. HOME (`/`)

> Content doc: "leave to the end"

| Order | Template Section | TSC Content |
|---|---|---|
| 1 | `section_hero-home` | H1 TBD, CTAs: "Our Products" [crosslink → `/products`] + "Work With Us" [crosslink → `/contact`] |
| 2 | `section_about-home` | Brief intro to TSC + 2 feature cards: RailOS [crosslink → `/railos`], ETCS [crosslink → `/products`] |
| 3 | `section_home-clients` | Featured project (Lineas HLD77) with video [crosslink → `/projects/lineas-hld77`] |
| 4 | `section_logo-home` | Client/partner logos (Lineas, Skoda, Akiem, etc.) |
| 5 | `section_testimonial` | Bruno Vanlede quote + key stats [crosslink → `/projects/lineas-hld77`] |
| 6 | `section_network` | "Operating across X countries" — map of ETCS coverage [crosslink → `/products`] |
| 7 | `section_newsroom` | Latest news/insights (CMS) [crosslink → `/insights`] |
| 8 | `section_cta` | CTA |

**Status:** Content TBD — build last from completed sub-pages.

---

### 2. CUSTOMERS / OUR PROJECTS (`/customers`)

> Content doc: Section 2 (case studies) + Section 15 (customer segments)
> Renamed to "Our Projects" (agreed 16/06/26 JL)

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-clients` | Page heading |
| 2 | `section_setup` | Customer segment cards (4 segments) |
| 3 | `section_clients-listing` | Case study cards (3 projects — CMS) |
| 4 | `section_cta` | CTA to contact |

#### Section 15 — Customer Segments

> Key message: "TSC = signalling and much much more"

**Page heading:**
Our Customers

---

**Segment 1: Fleet Operators**
[crosslink → `/projects/lineas-hld77` — Lineas is a fleet operator case study]

Sub-segments: Freight / Passenger / Track Maintenance

Signalling and much much more

**Why TSC?**
We reduce the total lifetime cost of Digital Rail Applications to sustainable levels, making even the most complex, safety critical applications such as ETCS [crosslink → `/products`] affordable for all fleet operators.

**How we do it?**
We deliver care-inspired innovation that eliminates the risk of device and regulatory driven obsolescence that has, until now, generated massive and regular replacement and upgrade bills. Instead, we invite fleet operators to make one future-proof single-platform investment, one that scales to support multiple current and future applications, one that drives lifetime maintenance costs down, not up.

**What you get?**
With TSC fleet operators don't invest in specific technology that will need replacement in a few years' time. Instead, you invest in an eco-system of evergreen software applications and off-the-shelf plug-and-play devices.

---

**Segment 2: Fleet Leasing Companies**
[crosslink → `/projects/akiem-br189` — Akiem is a fleet leasing case study]

Sub-segments: Freight / Passenger / Track Maintenance

**Why TSC?**
We reduce the total lifetime cost of Digital Rail Applications to sustainable levels, making even the most complex, safety critical applications such as ETCS [crosslink → `/products`] affordable for all fleet leasing companies.

**How we do it?**
We deliver care-inspired innovation that eliminates the risk of device and regulatory driven obsolescence that has, until now, generated massive and regular replacement and upgrade bills. Instead, we invite fleet leasing companies to make one future-proof single-platform investment, one that scales to support multiple current and future applications, one that drives lifetime maintenance costs down, not up.

**What you get?**
With TSC, fleet leasing companies don't invest in specific technology that will need replacement in a few years' time. Instead, you invest in an eco-system of evergreen software applications and off-the-shelf plug-and-play devices.

---

**Segment 3: Infrastructure Managers**

**Why TSC?**
We reduce the total lifetime cost of Digital Rail Applications to sustainable levels, making even the most complex, safety critical applications such as ETCS affordable for infrastructure managers.

**How we do it?**
We deliver care-inspired innovation that eliminates the risk of device and regulatory driven obsolescence that has, until now, generated massive and regular replacement and upgrade bills. Instead, we invite infrastructure manager to make one future-proof single-platform investment, one that scales to support multiple current and future applications, one that drives lifetime maintenance costs down, not up.

**What you get?**
With TSC, infrastructure managers don't invest in specific technology that will need replacement in a few years' time. Instead, you invest in an eco-system of evergreen software applications and off-the-shelf plug-and-play devices.

---

**Segment 4: Locomotive & Train Manufacturers**
[crosslink → `/projects/skoda-27ev` — Skoda is a manufacturer case study]

Sub-segments: Freight / Passenger / On Track Machines / Multiple Unit Trains

**Why TSC?**
We reduce the total lifetime cost of Digital Rail Applications to sustainable levels, making even the most complex, safety critical applications such as ETCS [crosslink → `/products`] affordable for locomotive and train manufacturers.

**How we do it?**
We deliver care-inspired innovation that eliminates the risk of device and regulatory driven obsolescence that has, until now, generated massive and regular replacement and upgrade bills. Instead, we invite locomotive and train manufacturers to make one future-proof single-platform investment, one that scales to support multiple current and future applications, one that drives lifetime maintenance costs down, not up.

**What you get?**
With TSC, locomotive and train manufacturers don't invest in specific technology that will need replacement in a few years' time. Instead, you invest in an eco-system of evergreen software applications and off-the-shelf plug-and-play devices.

---

### 3. PROJECTS — CASE STUDY SINGLES (`/projects/{slug}`)

> Content doc: Section 2

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-client` | Client name + headline result |
| 2 | `section_client-thumbnail` | Project hero image |
| 3 | `section_body-client` | Rich text body + stats + quote |
| 4 | `section_cta` | CTA |

---

#### Case Study 1: The HLD 77 Retrofit Project for Lineas (`/projects/lineas-hld77`)

**Headline:**
The HLD 77 Retrofit Project for Lineas

**Subheadline:**
A textbook ETCS case study for retrofit

**Intro:**
Lineas is one of the largest private rail freight operators in Europe.
They employ approximately 2,100 passionate colleagues with an annual turnover of almost 500 million euros.

**Project title:**
Lineas HLD77 ATP Retrofit Project

**The numbers:**
- 109 freight locomotives
- 87 with ETCS [crosslink → `/products`] + Belgian ATP
- 22 with ETCS + Belgian, German, & Dutch ATP [crosslink → `/railos/apps` for TBL1, PZB]
- 10 Year Maintenance [crosslink → `/services` — Maintenance service]
- 0 Additional Floorspace Used

**Stats:**
The only supplier to install an ETCS system onboard in 10 days only

Under 1 month
Is the time software updates take

Under 3 hours is the time automated commissioning takes

**Quote:**
"It's a completely different experience. Downtime for the fleet is a fraction of what it was with previous retrofit projects. The software updates take less than a month, the installation takes less than ten days, the automated commissioning takes less than three hours. As fleet managers know, these numbers are amazing and make the world of difference. TSC are risk killers for retrofit projects."
— Bruno Vanlede, Head of Rail Fleet Management at Lineas.

**Visual content:** display the video "Installation Timelapse"

**CTAs:** [CTA contact? / download the full case study (future)]

**Crosslinks for this page:**
- "ETCS system" → `/products` (ETCS product)
- "installation takes less than ten days" → `/services` (Series Installation & Commissioning)
- "software updates" → `/railos` (RailOS platform)
- Related projects footer: Skoda 27Ev, Akiem BR189

---

#### Case Study 2: The 27Ev Project for Skoda Transport (`/projects/skoda-27ev`)

**Headline:**
The 27Ev Project for Skoda Transport

**Subheadline:**
An ETCS case study in new-built passenger train

**Body:**
Today we are working with our colleagues at Skoda Transport to integrate our award-winning ETCS [crosslink → `/products`] on their innovative BEDMU*, the 27Ev destined for service with RegioJet in the Czech Republic. This project spotlights the suitability of our modular and space efficient ETCS for integration on modern multiple-unit trainsets.     RegioJet has ordered a total of 34 new-generation hybrid BEDMU trains from Škoda Group [crosslink → `/about` — acquisition story]—18 two-car units and 16 three-car units—under a contract exceeding CZK 9 billion. These are modern hybrid passenger trains equipped with a diesel-powered unit, enabling operation on non-electrified lines while retaining the advantages of electric traction. In the future, the units can be converted to fully battery-powered or purely electric operation. They are scheduled to enter service from December 2029

**Specs:**
- Speed under overhead supply: 160 km/h
- Speed in autonomous mode: 120 km/h
- Seating capacity: 120 to 197 (2-car units and 3-car units)

*Bi-mode Electro-Diesel Multiple Unit

**Stats:**
34 Our ETCS onboard unit will be installed in 34 new-built trains manufactured by Škoda Group

-19,000 tons of CO₂ annually  the CO2 emissions reduction expected from the operation of the new Regiojet trains.

**Quote:**
"Since The Signalling Company became part of Škoda Group in 2023, its team has consistently demonstrated the ability to deliver on the ambitious goals that we set for them. The installation of their ETCS on our new hybrid trains for RegioJet represents the achievement of another important goal, confirming the readiness of their signalling platform for deployment on new rolling stock fleets."
— Tomáš Ignačák, Vice Chairman of the Board of Directors of Škoda Group.

**CTAs:** [CTA contact? / download the full case study (future)]

**Crosslinks for this page:**
- "award-winning ETCS" → `/products` (ETCS product)
- "First in Class Homologation" context → `/services` (Homologation service)
- Škoda Group → `/about` (acquisition story)
- Related projects footer: Lineas HLD77, Akiem BR189

---

#### Case Study 3: Retrofit Viability Assessment for Akiem (`/projects/akiem-br189`)

**Headline:**
Retrofit Viability Assessment for Akiem

**Subheadline:**
An ETCS case study for pan-European retrofit feasibility

**Body:**
Akiem and TSC are collaborating to assess the feasibility of integrating ETCS [crosslink → `/products`] into the BR189 fleet, a Siemens electric freight locomotive. Once retrofitted [crosslink → `/services` — Retrofit Viability Assessment], the BR189 would be able to operate smoothly across ten countries in Europe: Austria, Czech Republic, Germany, Hungary, Italy, the Netherlands, Poland, Slovakia, Slovenia, and Switzerland.
[X] project phases have been defined to cover the full scope: from system engineering and mechanical/electrical integration, through to the authorization process. This structured approach allows Akiem to validate overall feasibility before committing to a full-fleet deployment — and to anticipate risks and mitigation strategies ahead of project start.

**Specs:**
- Entry in service: 2009-2011
- Energy: electric
- Weight: 87,0 ton

**Stats:**
10 The number of countries the BR189 fleet operates in

**Crosslinks for this page:**
- "integrating ETCS" → `/products` (ETCS product)
- "assess the feasibility" → `/services` (Retrofit Viability Assessment)
- "ten countries" → `/products` (wSTM for multi-country Class B)
- Related projects footer: Lineas HLD77, Skoda 27Ev

---

### 4. RAILOS (`/railos`)

> Content doc: Section 4

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-about-c` | Page heading |
| 2 | `section_features-about` | Feature cards |
| 3 | `section_system` | Technical capability grid |
| 4 | `section_quote` | Key quote |
| 5 | `section_cta` | CTA to Open RailOS / Contact |

**Page heading:**
RailOS
Our Core Technology

**Body:**
RailOS is a portable and scalable real-time operating system with its own application development environment and language. Designed to run any digital rail application [crosslink → `/railos/apps`], it eliminates the need for proprietary hardware devices [crosslink → `/railos/devices`] and restricts the impact of standard and regulatory changes to simple software-only upgrades.
Uniquely, RailOS is also available to 3rd-party application developers. [hyperlink → `/railos/open`]

**Visual note:** [need graphic]

**Preamble section:** [TBD]

**Hub links (feature cards or body CTAs):**
- "Explore RailOS Applications" → `/railos/apps`
- "See Certified Devices" → `/railos/devices`
- "Open RailOS Developer Program" → `/railos/open`
- "Browse the App Store" → `/railos/app-store`

---

### 5. RAILOS APPS (`/railos/apps`)

> Content doc: Section 5

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-services` | Page heading |
| 2 | `section_services` | App list as expandable items |
| 3 | `section_logos` | Device/partner logos |
| 4 | `section_cta` | CTA |

**Page heading:**
RailOS Applications for railway safety

**Section: Onboard ATP (Signalling) applications**

All RailOS ATP Applications run on the iEVC [crosslink → `/railos/devices` — iEVC entry], a certified SIL4 safe computer (see RailOS Certified Devices [crosslink → `/railos/devices`])

---

**ETCS App**
Our flagship ATP (signalling) app was certified in 2025. It is currently undergoing homologation [crosslink → `/services` — Homologation service] as part of the HLD77 freight fleet's ETCS retrofit program for Lineas [crosslink → `/projects/lineas-hld77`] and the Ev27 BEDMU fleet for Skoda Transport's Regiojet new-built project [crosslink → `/projects/skoda-27ev`]. It can be combined with the iSTM and wSTM apps to provide seamless [no-code] integration and dynamic interoperability with multiple National Class-B Safety Applications., the ETCS

**TBL1+ App**
Operating on the Lineas HLD77 fleet [crosslink → `/projects/lineas-hld77`] since 2025, this onboard Class-B ATP application for the National Belgian network is available with ++ and NG variations. It shares the same SIL4 computer (iEVC) [crosslink → `/railos/devices`] and device architecture as our ETCS App [crosslink → `/products`], optimizing hardware, operational, and lifetime maintenance costs.

**PZB App**
Currently in development and undergoing certification, the PZB App is destined to enter operation initially on the international cohort of the Lineas HLD77 fleet [crosslink → `/projects/lineas-hld77`]. This Class-B ATP app for the National German, Austrian, Romanian...[add others] networks shares the same SIL4 computer (iEVC) [crosslink → `/railos/devices`] and device architecture as our ETCS App [crosslink → `/products`], optimizing hardware, operational, and lifetime maintenance costs.

**KVB App**
Currently in development and undergoing certification, this Class-B ATP app for the National French network shares the same SIL4 computer (iEVC) [crosslink → `/railos/devices`] and device architecture as our ETCS app [crosslink → `/products`], optimizing hardware, operational, and lifetime maintenance costs.

**iSTM App**
A unique and completely software defined Synchronous Transmission Module (STM) for no-code ETCS and Class-B safety application integration and interoperability with our native RailOS based Class B Apps or those from a 3rd party supplier.

**TCMS App**
Available on request, our RailOS TCMS apps are customized according to the vehicle sub-system integration plan and range in sophistication from single to multi-use configurations.

---

**Section: Data Acquisition & Analytics applications**

RailOS [crosslink → `/railos`] includes a number of built-in system applications dedicated to real-time monitoring of the system and each connected device. Drivers can access the system and device health status via the DMI [crosslink → `/railos/devices` — DMI entry]. Operational and maintenance teams [crosslink → `/services` — Maintenance service] can access this same data locally or remotely (in real time) and extract mass data logs for juridical or general performance analytics and Digital Journey Replay (DRJ).

**DJR App**
Digital Journey Replay
Uniquely, the richness of the datasets produced by RailOS and our safety applications means that our clients can create a complete Digital Journey Replay (DJR) for their locomotive or multiple-unit train. An exceptionally powerful too, the DJR app generates exceptionally valuable insights that can be used to rapidly troubleshoot and fix signalling issues that originate both on-board and trackside. DRJ apps are built and customized based on our clients' preferred platform for operational data analytics.

**DRU App**
An alternative to traditional stand-alone TRU and JRU solutions, our RailOS DRU app can be configured to capture Train and/or Juridical Data in tandem with one of our industrial or crash-protected mass storage devices [crosslink → `/railos/devices` — DSU and JRU entries]

**LRU App**
A laptop-based application that securely supports local or remote data extraction and  …more to be added

---

### 6. RAILOS DEVICES (`/railos/devices`)

> Content doc: Section 5.1

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-services` | Page heading |
| 2 | `section_services` | Device list as expandable items |
| 3 | `section_logos` | Device Partners |
| 4 | `section_cta` | CTA |

**Page heading:**
RailOS Certified Devices

**Intro:**
Our tested and RailOS [crosslink → `/railos`] qualified Ethernet plug-and-play devices are listed below. Device suppliers wishing to participate in the RailOS Device Ecosystem may apply using the application form here [crosslink → `/railos/open` — Open RailOS developer program].
To eliminate the need for additional power units, all RailOS Certified Devices can be powered using on-board DC supplies that range from 24VDC to 110VDC or PoE.

---

**iEVC**
Applications: Any
Device Type: Safe Computer
Countries: All
The iEVC is a SIL4 safe computer that hosts RailOS [crosslink → `/railos`] and scales to any digital rail application [crosslink → `/railos/apps`]. It provides several interface options for simple integration with other on-board sub-systems. The interfaces and protocols supported include Ethernet, Ethernet-TRDP, Digital IO Relays, and CANOpen. The iEVC is available in standard 19in format our ruggedized Computer Box format which allows it to be mounted in any available space on the locomotive or train.

**Ethernet Switch**
Applications: Any
Device Type: Ethernet Switch
Countries: All
A high-reliability industrial Ethernet Switch provides a secure and scalable hub for our on-board solutions. Both PoE and non-PoE variants can be used depending on the solution requirements.

**Data Storage Unit (DSU)**
Applications: Any
Device Type: Mass Data Storage
Countries: All
Depending on the solution configuration and mix of general or juridical data requirements, clients can choose from multiple data storage devices that range in size and crash protection rating. Please note that Crash Protected Memory (CPM) is mandatory with the DRU App when it is configured for JRU (Juridical Recording Unit) use with ATP and other safety-critical applications.

**DMI (Driver Machine Interface)**
Applications: ATP, ATO, TCMS
Device Type: ERTMS Radio
Countries: All
Available in 8in and 12in formats our DMIs are driven by our RailOS [crosslink → `/railos`] DMI App [crosslink → `/railos/apps`]. Highly configurable, our DMIs deliver accurate and high-quality ergonomic performance under all operating conditions. Our DMIs can be supplied with our without speakers.

**GSM-R & FRMCS Radio**
Applications: ETCS
Device Type: ERTMS Radio
Countries: All
Supplied as an integral part of our ETCS solution [crosslink → `/products` — ETCS product], our GSM-R or FRMCS Radio is available standalone or integrated with a mix of other telecom options (GPS, 4/5G, Tetra, or WiFi) in our ruggedized Telecom Box [crosslink → `/products` — TOBA Box product] that supports an integrated Telcom On-Board Architecture (TOBA) for multi-technology on-board telecom and satcom access.

**GPS**
Applications: ETCS, ATO, TCMS
Device Type: GNSS Access Device
Countries: All
Supplied as an integral but optional part of our ETCS solution, our GPS is available   standalone or integrated with a mix of other telecom options (GSM-R, 4/5G, Tetra, FRMCS, or WiFi) in our ruggedized Telecom Box that supports an integrated Telcom On-Board Architecture (TOBA) for multi-technology on-board telecom and satcom access.

**WiFi/4/5/6G Radio**
Applications: Any
Device Type: Broadband Access
Countries: All
Available as a standalone remote access gateway or integrated with a mix of other telecom options (GSM-R, Tetra, FRMCS, GPS) in our ruggedized Telecom Box that supports an integrated Telcom On-Board Architecture (TOBA) for multi-technology on-board telecom and satcom access.

**Sensor Box**
Applications: ETCS, KVB, TBL1
Device Type: ATP Sensor Gateway
Countries: All
Supplied as an integral part of our on board ETCS [crosslink → `/products`] French (KVB [crosslink → `/railos/apps`]) and Belgian (TBL1 [crosslink → `/railos/apps`]) Class B ATP Solutions, our Sensor Box efficiently integrates our Odometry (Speed) and Signalling modules in a small, energy efficient, and ruggedized package that can be easily mounted in any available space on the locomotive or multiple-unit train.
[CTA download our data sheet]

**Telecom Box (or TOBA Box)**
Applications: Any
Device Type: Telecom Gateway
Countries: All
Our small and ruggedized Telecom Box (or TOBA Box) [crosslink → `/products` — TOBA Box product] can be mounted anywhere on the locomotive or train. It supports an integrated Telecom On-Board Architecture (TOBA) for multi-technology on-board telecom and satcom access that extends to FRMC, 6G, and beyond.
[CTA download our data sheet]

**Computer Box (ruggedized iEVC)**
Applications: Any
Device Type: Safe Computer
Countries: All
Our small, ruggedized Computer Box houses the iEVC. Ideal for ETCS retrofits [crosslink → `/services` — Retrofit Assessment + Installation services], the Computer Box can be mounted anywhere on the locomotive or train and simplifies cabling and maintenance [crosslink → `/services` — Maintenance service] for space-contained installations.
[CTA download our data sheet]

**JRU (Juridical Recording Unit)**
Applications: Any
Device type: Juridical Data Recorder
Countries: All
Providing Juridical Data Recording and Storage for any application, our JRU combines our DRU App [crosslink → `/railos/apps` — DRU App entry] and Crash Protected Memory to provide a very cost and space efficient alternative to stand-alone JRU systems. JRU data can also be accessed remotely and in real-time when combined with one of our 4/5G remote access options

**Euroantenna**
Applications: ETCS, KVB, TBL1
Device type: Signalling Sensor
Countries: All
Purposely designed without any active electronics, our Euroantenna supports multiple ATP (signalling) standards, delivering unmatched reliability for this most exposed sensor.

**PZB Magnet & Magnet Reader**
Application: PZB
Device Type: Signalling Sensor
Countries of Use: Germany
Used in tandem with the RailOS PZB App [crosslink → `/railos/apps`], the PZB Magnet and Magnet Reader integrate seamlessly with the iEVC and our ETCS [crosslink → `/products`] solution architecture.

**Crocodile & Encoder**
Application: TBL1, KVB
Device Type: Signalling Sensor
Countries of Use: Belgium, France
Used in tandem with the RailOS TBL1 and KVB Apps [crosslink → `/railos/apps`], the Crocodile and Encoder integrate seamlessly with the iEVC and our ETCS [crosslink → `/products`] solution architecture.

**Doppler Radar**
Applications: ETCS
Device Type: Speed Sensor
Countries of Use: All
A commonly used Speed Sensor, the Doppler Radar is connected to the Sensor Box for seamless integration with our ETCS solution architecture.

**CoRRail**
Applications: ETCS
Device Type: Speed Sensor
Countries of Use: All
An advanced optical Speed Sensor, the CoRRail is connected to the Sensor Box for seamless integration with our ETCS solution architecture.

**Optical Pulse Generator**
Applications: ETCS
Device Type: Speed Sensor
Countries of Use: All
The common optical Speed Sensor, the Optical Pulse Generator is connected to the Sensor Box for seamless integration with our ETCS solution architecture.

---

**RailOS Device Partners:**
- Duagon
- Mios
- Deuta
- Scle
- Hassler Rail
- Lantech
- Triorail

---

### 7. PRODUCTS (`/products`)

> Content doc: Section M5

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-about-a` | Page heading + intro |
| 2 | `section_system` | Product cards grid (6 products) |
| 3 | `section_testimonial` | Key stat or quote |
| 4 | `section_cta` | CTA |

**Page intro:**
Powered by RailOS Apps [crosslink → `/railos/apps`] and Devices [crosslink → `/railos/devices`], the TSC portfolio of digital rail solutions is constantly expanding. Capable of addressing both on-board and trackside applications, safety and non-safety critical, today our portfolio includes

---

**PRODUCT 1: ETCS**
Application Category: Automatic Train Protection
Our certified award-winning onboard ETCS system is based on our iEVC [crosslink → `/railos/devices`]-RailOS [crosslink → `/railos`] safe computing platform. Our ETCS is uniquely scalable, delivering optimized CAPEX and lifetime OPEX for fleet operators [crosslink → `/customers` — Fleet Operators segment]. It can be easily upgraded to support
- ATO Automatic Train Operation
  A key part of the ETCS Baseline 4 standard, ATO over ETCS is available now as part of an integrated Baseline 4 software package or can be ordered as part of a future upgrade.
- Multiple National Class B Systems
  The platform seamlessly integrates National Class B systems from the countries listed in the table below – [add table or some sort of carousel with flags that we can add a tag to with the acronym for the national class b system]
- Juridical Data Recording
  A value-add option with our ETCS onboard unit, our RailOS JRU App [crosslink → `/railos/apps` — DRU App] combined with Crash Protected Memory [crosslink → `/railos/devices` — JRU entry] eliminates the need for a stand-alone juridical data system, reducing hardware, installation [crosslink → `/services` — Installation service] and lifetime maintenance costs [crosslink → `/services` — Maintenance service].

**See ETCS in action:** Lineas HLD77 [crosslink → `/projects/lineas-hld77`] | Skoda 27Ev [crosslink → `/projects/skoda-27ev`] | Akiem BR189 [crosslink → `/projects/akiem-br189`]

**PRODUCT 2: The TOBA Box**
Application Category: Telecom
Our TOBA Box…[JL to add some text there]
"a true FRMCS onboard gateway, 5G railway onboard"
A value-add option with our ETCS [crosslink → ETCS product above] platform, our TOBA Box (sometimes called Telecom Box) [crosslink → `/railos/devices` — Telecom Box entry] eliminates the need for multiple stand-alone telecom and GPS devices, reducing hardware, installation and lifetime maintenance costs.

**PRODUCT 3: PZB**
Application Category: Automatic Train Protection
National Network Coverage: Germany, Austria, Romania, Serbia, and Croatia
Based on our common safe-computing platform, iEVC [crosslink → `/railos/devices`], our RailOS PZB App [crosslink → `/railos/apps` — PZB App entry] is available in two configurations, stand-alone and ETCS-integrated. Facilitating an optimized CAPEX and OPEX strategy for fleet operators, it can be immediately deployed on national PZB-only fleets while providing a futureproof software-only upgrade path to ETCS [crosslink → ETCS product above] (Baseline 4).

**PRODUCT 4: KVB**
Application Category: Automatic Train Protection
National Network Coverage: France
Based on our common safe-computing platform, iEVC [crosslink → `/railos/devices`], our RailOS KVB App [crosslink → `/railos/apps` — KVB App entry] is available in two configurations, stand-alone and ETCS-integrated. Facilitating an optimized CAPEX and OPEX strategy for fleet operators, it can be immediately deployed on national KVB-only fleets while providing a futureproof software-only upgrade path to ETCS [crosslink → ETCS product above] (Baseline 4).

**PRODUCT 5: TBL1**
Application Category: Automatic Train Protection
National Network Coverage: Belgium
Based on our common safe-computing platform, iEVC [crosslink → `/railos/devices`], our RailOS TBL1 App [crosslink → `/railos/apps` — TBL1+ App entry] (including +, ++, and NG variations) is available in two configurations, stand-alone and ETCS-integrated. Facilitating an optimized CAPEX and OPEX strategy for fleet operators, it can be immediately deployed on national TBL1-only fleets while providing a futureproof software-only upgrade path to ETCS [crosslink → ETCS product above] (Baseline 4).

**PRODUCT 6: wSTM**
Application Category: Automatic Train Protection
National Network Coverage: UK, PL, CZ, etc
Based on our common safe-computing platform, iEVC [crosslink → `/railos/devices`]-RailOS [crosslink → `/railos`], our universal wSTM App [crosslink → `/railos/apps` — iSTM/wSTM entry] seamlessly integrates 3rd party National Class B systems in xx countries.

---

### 8. SERVICES (`/services`)

> Content doc: Section 6

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-services` | Page heading |
| 2 | `section_services` | Service list (5 services) |
| 3 | `section_logos` | Service Partners |
| 4 | `section_clients` | Related case study cards |
| 5 | `section_cta` | CTA |

**Page heading:**
Our Services cover railway signalling, ETCS projects and beyond

**Intro:**
Today we deliver a full suite of tried and tested services for ETCS & Class B projects that include

---

**ETCS Retrofit Viability Assessment**
Many operators need to assess the viability of retrofitting their fleets with ETCS [crosslink → `/products` — ETCS product]. At TSC we offer an ETCS Retrofit Viability Assessment. The assessment accurately determines the technical, regulatory, and authorization risk and cost associated with upgrading their fleets using our uniquely scalable and award-winning ETCS.
[CTA 1 → `/projects/akiem-br189`]  [CTA 2 → `/contact`]

**First in Class Homologation**
We deliver a complete range of First-In-Class homologation services for new-build and retrofit projects. Covering the complete V-Cycle, from Concept Design to Authorization to Put In Service (APIS), our FiC Homologation Service Packs are fine-tuned to optimize cost and align with the specific needs of each project.
[CTA 1 → `/projects/skoda-27ev`]  [CTA 2 → `/contact`]

**Series Installation and Commissioning**
We deliver multiple service pack options for Installation & Commissioning ranging from a complete turn-key service to Supervision and Audit to Training [crosslink → Training service below].
[CTA 1 → `/projects/lineas-hld77`]  [CTA 2 → `/contact`]

**Training**
We deliver training courses for Drivers, Maintenance Technicians, and Operational Managers. Other bespoke training options are available on request.
[CTA 1 → `/projects/lineas-hld77`]  [CTA 2 → `/contact`]

**Maintenance**
We deliver post-warranty maintenance service packs for up to 10 years or longer. Each pack is configured and optimized for the unique operational needs of each client. Clients can build their own bespoke pack from an extensive list of corrective, preventative and predictive maintenance options. [crosslink → `/railos/apps` — DJR and DRU apps enable predictive maintenance analytics]
[CTA 1 → `/projects/lineas-hld77`]  [CTA 2 → `/contact`]

---

**Service Partners:**
[Logo with banners]
- Prose
- Brouwer
- SNCB/NMBS Technics

---

### 9. ABOUT US (`/about`)

> Content doc: Section 7

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-about-a` | Page heading |
| 2 | `section_about-image` | Workshop/team photo |
| 3 | `section_mission-a` | Company story |
| 4 | `section_values-a` | Values cards |
| 5 | `section_quote` | Safety quote |
| 6 | `section_cta` | Multiple CTAs |

**Page heading:**
About The Signalling Company

**Body:**
A digital rail innovator, The Signalling Company was founded in 2019 to develop a modular, secure, open platform, for international (ETCS [crosslink → `/products`]) and national (Class B) on-board safety applications. Founders Stanislas Pinte (ex ERTMS Solution), and Alexandre Betis (ex Ansaldo and Hitachi) [crosslink → `/leadership`] set out to prove that railway signalling no longer needs to be hardware-defined.
In 2023, the company was acquired by Škoda Group [crosslink → `/projects/skoda-27ev`] — accelerating its ambition to bring that vision to rail networks worldwide.
In pursuit of this goal, the Belgian railway signalling company first developed a unique and portable real time operating system, RailOS [crosslink → `/railos`]. Launched in 2024, RailOS is now open to third party development [crosslink → `/railos/open`] and can be used to develop any digital rail application, be it on-board or trackside, safety or non-safety critical.
Testimony to its scalability, RailOS has enabled rapid expansion of The Signalling Company's portfolio of products and solutions. At the core of an Ethernet-connected, plug-and-play device ecosystem, RailOS eliminates obsolescence and regulatory-change risk that has slowed digitalization and driven painful cost inflation for fleet and infrastructure operators.
Today, the company offers an extensive portfolio of RailOS Applications [crosslink → `/railos/apps`] and Devices [crosslink → `/railos/devices`] providing highly cost effective and scalable solutions for Automatic Train Protection (Signalling), Train Control and Management (TCMS), Automatic Train Operation (ATO), Train and Juridical Data Recording (TRU, JRU).
With many more RailOS solutions in the pipeline, please don't hesitate to share your digital rail challenge with us.

**Values intro:**
What drives our growth is also what holds us together.
At The Signalling Company, we
- Think strategically
- Care for what we do and everyone involved
- Collaborate
- Act rationally
We are driven by these beliefs to deliver exceptional value to our clients, as well as create an inspiring and wholesome workplace.

**Quote:**
We care about safety – We entrust the lives of our children to our systems

**Visual content:** display the video "visit at the workshop"

**CTAs:**
[CTA 1 → `/customers`]  [CTA 2 → `/products`] [CTA 3 → `/services`]
[CTA 4 → `/contact`] [CTA 5 → `/leadership`] [CTA 6 → `/insights`]

---

### 10. CAREERS (`/careers`)

> Content doc: Section 8

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-about-c` | Page heading |
| 2 | `section_values-a` | Values cards |
| 3 | `section_form` | Contact form |
| 4 | `section_cta` | CTAs |

**Body:**
At TSC we expect people to Think strategically, care, collaborate and act rationally. [crosslink → `/about` — "Learn more about our story and values"]

We are driven by these beliefs to deliver exceptional value to our clients, as well as create an inspiring and wholesome workplace.
If this looks like you, we want to hear from you!

**CTAs:**
[CTA info@thesignallingcompany.com]
[CTA 2 → `/customers`]  [CTA 3 → `/services`] [CTA 4 → `/insights`]

---

### 11. CONTACT (`/contact`)

> Content doc: Section 9

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-contact-a` | Address + form + media contact |
| 2 | `section_cta` | CTA |

**Address:**
Rue des Deux Gares 82/Building B, 1070 Brussels

**Form:** [Form see The Signaling Company - The Signalling Company]  I agree to the Privacy policy  (cf page 13)

**Note:** [text needed? Let me know based on the template chosen]

**Media contact:**
Media contact: Romain Hourtiguet, Marketing Manager
[mailto:romain.hourtiguet@thesignallingcompany.com]

---

### 12. LEADERSHIP (`/leadership`)

> Content doc: Section 10

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-about-c` | H1: "Leadership" |
| 2 | `section_team-a` | Team grid (8 members) |
| 3 | `section_cta` | CTAs |

**CTAs:** [CTA 1 → `/contact`] [CTA 2 → `/insights`] [CTA 3 → `/about` — "Our Story"] [CTA 4 → `/careers` — "Join the Team"]

---

**Alexandre Betis**
CEO
Bio: [The intent is to show a robust industrial company that has innovation at its core and value people above all. Tone: Professional. Dynamic, determined, and passionate.]

**Benoit Blin**
Head of Product Development
[The intent is to show a robust industrial company that has innovation at its core and value people above all. Tone: Professional. Dynamic, determined, and passionate.]

**Fabienne Goutaudier**
Head of Quality & Head of System Assurance
[The intent is to show a robust industrial company that has innovation at its core and value people above all. Tone: Professional. Dynamic, determined, and passionate.]

**Raphaël Kleinplac**
Head of HR & Facilities
[The intent is to show a robust industrial company that has innovation at its core and value people above all. Tone: Professional. Dynamic, determined, and passionate.]

**Martin Kriz**
Chief Admin and Finance
[The intent is to show a robust industrial company that has innovation at its core and value people above all. Tone: Professional. Dynamic, determined, and passionate.]

**Jarlath Lally**
Head of Sales & Marketing
[The intent is to show a robust industrial company that has innovation at its core and value people above all. Tone: Professional. Dynamic, determined, and passionate.]

**Stanislas Pinte**
RailOS Expert & Special Projets
[The intent is to show a robust industrial company that has innovation at its core and value people above all. Tone: Professional. Dynamic, determined, and passionate.]

**Benjamin Pischetola**
Chief Delivery Officer
[The intent is to show a robust industrial company that has innovation at its core and value people above all. Tone: Professional. Dynamic, determined, and passionate.]

---

### 13. INSIGHTS & NEWS (`/insights`)

> Content doc: Section 11

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_news-a-hero` | Page heading + subtitle |
| 2 | `section_news-a-listing` | CMS news cards |
| 3 | `section_cta` | CTA |

**Subtitle:**
[If needed]
The latest from The Signalling Company — product milestones, certifications, customer wins, and our perspective on the future of onboard rail signalling.

**CMS note:**
Card system to link each news to either:
- a project [crosslink → `/projects/{slug}` via CMS reference field]
- a service [crosslink → `/services` via CMS reference field]
- a product [crosslink → `/products` via CMS reference field]

**Crosslink implementation:** Use CMS multi-reference fields so each Insight can tag related Projects, Products, and Services. Render as "Related" links in article footer — e.g. "Related Project: Lineas HLD77", "Related Product: ETCS".

---

### 14. FAQ (`/faq`)

> Content doc: Section 9/9.x — Content TBD (Romain)

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-faq` | H1: "Frequently Asked Questions" |
| 2 | `section_faq-list` | Categorised accordion (content TBD) |
| 3 | `section_cta` | CTA |

**Status:** To do — Romain

---

### 15. PRIVACY / LEGAL (`/privacy-policy`)

> Content doc: Section 13

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-legal` | H1: "Privacy Policy" |
| 2 | `section_body-legal` | Full GDPR policy text |

**Last updated:** June 2026

**1. Who we are**
The Signalling Company SRL ("TSC", "we", "us") is the data controller responsible for this website. We are registered in Belgium under company number BCE - TVA/ BE0724925936, with registered offices at Rue des Deux Gares 82, 1070 Brussels, Belgium.
For any privacy-related enquiry, contact us at: info@thesignallingcompany.com

**2. What data we collect**
We collect personal data only when you actively provide it — for example, by submitting a contact form, requesting information, or subscribing to our newsletter. This may include your name, email address, company name, and job title.
We also collect non-personal usage data automatically via analytics tools (see Section 5).

**3. How we use your data**
We use your data to respond to your enquiries, provide information about our products and services, and — where you have given consent — send you relevant updates. We do not use your data for automated decision-making or profiling.

**4. Legal basis (GDPR)**
We process your data under the following legal bases as defined by the EU General Data Protection Regulation (GDPR):
- Legitimate interest — to respond to professional enquiries
- Consent — for newsletter subscriptions and non-essential cookies
- Contract — where data processing is necessary to fulfil a service

**5. Third-party tools and cookies**
This website uses Google Analytics 4 (GA4) to understand how visitors interact with our content. GA4 collects anonymised usage data (pages visited, session duration, referral source). No personally identifiable information is shared with Google without your consent.
You can manage your cookie preferences at any time via our cookie banner or by adjusting your browser settings.

**6. Data retention**
We retain personal data only for as long as necessary to fulfil the purpose for which it was collected, or as required by law. Contact form enquiries are retained for a maximum of 24 months / your defined period.

**7. Your rights**
Under GDPR, you have the right to access, correct, or delete your personal data, restrict or object to its processing, and request data portability. To exercise any of these rights, contact us at info@thesignallingcompany.com. You also have the right to lodge a complaint with the Belgian Data Protection Authority (APD-GBA): www.dataprotectionauthority.be.

**8. Data transfers**
TSC does not transfer personal data outside the European Economic Area (EEA) unless adequate safeguards are in place as required by GDPR.

**9. Changes to this policy**
We may update this policy from time to time. The "last updated" date at the top of this page reflects the most recent revision. We encourage you to review it periodically.

---

### 16. 404

> Content doc: Section 14

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | Use existing 404 page | Custom 404 content |

**Heading:**
You reached the end of the tracks.

**Body:**
The page you're looking for has moved — or never existed. Let's get you back on the right line.

**CTAs:**
[Our Products] [Our Services] [Our Customers]
[CTA 1 Our projects]  [CTA 2 Our products] [CTA 3 Our Services]

---

### 17. RAILOS APP STORE (`/railos/app-store`)

> Content doc: Section 16

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-services` | Page heading |
| 2 | `section_system` | App tiles grid |
| 3 | `section_form` | Email capture form |

**Page heading:**
RailOS App Store

**Body:**
Select your RailOS Application

**UX note:** This should be a tile for each application listed above. We need a tile for each of the Apps listed above [crosslink → `/railos/apps` — each tile maps to an app entry]. The user journey – the user will click on a tile and for phase 1 launch a call to action – "Store under construction, enter you eMail to receive details of the RailOS Application and options".

**Crosslinks for this page:**
- "Become a RailOS developer" → `/railos/open`
- "Learn more about RailOS" → `/railos`
- Each app tile → `/railos/apps` (corresponding app entry)

---

### 18. OPEN RAILOS (`/railos/open`)

> Content doc: Section 17

| Order | Template Section | Content mapped below |
|---|---|---|
| 1 | `section_hero-about-a` | Page heading |
| 2 | `section_mission-a` | Vision statement |
| 3 | `section_stats-b` | ADK details |
| 4 | `section_form` | Application form (8 fields) |
| 5 | `section_cta` | CTA |

**Page heading:**
Open RailOS

**Body:**
The Signalling Company is driven by a passion to increase competition and reduce costs for the rail industry. Open RailOS is inspired by proven open development ecosystems that stimulate innovation, competition, and value creation.
Third party software developers are invited to apply for our Open RailOS App Developer Program. Qualifying applicants can choose from one of the two RailOS App Development Kits (ADKs) detailed below and access to the RailOS App Store [crosslink → `/railos/app-store`]. [Apply Here …call to action button that launches a simple application form]

**Crosslinks for this page:**
- "RailOS App Store" → `/railos/app-store`
- "Learn more about RailOS" → `/railos`
- "See existing RailOS Applications" → `/railos/apps`
- "Certified Devices" → `/railos/devices`

**Visual note:** [needs a graphic or photo]

---

**Application Form: Open RailOS App Developer Program**

Fields:
1. Briefly describe the application you wish to develop?
2. Which ADK are you interested in purchasing?  General ADK or Safe ADK
3. What budget do you have for purchase of the ADK?
4. What budget do you have for the development?
5. Are you open to co-development of the App with TSC?
6. Do you want to sell your RailOS App via the RailOS App Store?
7. What other applications have you developed?
8. When do you want to start development of your RailOS App?

---

**The RailOS App Development Kit (ADK)**

Two RailOS ADKs are available to qualifying program applicants
- The General ADK for non-safety-critical applications
- The Safe ADK for safety-critical applications
Both ADKs are detailed in the table below
[Add table from the ADK presentation]
[we need a mini value proposition for each of the target]

---

## Sections NOT used (template-only, safe to remove/hide)

- `section_hero-about-b` (video hero — could be used for Home if desired)
- `section_mission-b` (duplicate of mission-a)
- `section_hero-contact-b`, `section_form-contact-b` (using contact-a instead)
- `section_hero-home` marquee animations (cosmetic — keep or simplify)

---

## Content Status Summary

| Page | Content Status | Blocker |
|---|---|---|
| Home | TBD — build last | Homepage copy needed |
| Customers | Complete (segments + case studies) | — |
| Projects (×3) | Complete | — |
| RailOS | **Blocked** — only 1 paragraph of copy. Missing: feature cards, technical capabilities, software-defined positioning, graphic | Content needed from JL/Romain |
| RailOS Apps | Complete | — |
| RailOS Devices | Complete | — |
| Products | Near-complete | TOBA Box text TBD (JL) |
| Services | Complete | — |
| About Us | Complete | — |
| Careers | Complete | — |
| Contact | Complete | — |
| Leadership | Names + titles only | Bios TBD (RH) |
| Insights & News | Complete (CMS) | — |
| FAQ | Empty | Content TBD (Romain) |
| Privacy / Legal | Complete | — |
| 404 | Complete | — |
| App Store | Complete (phase 1) | — |
| Open RailOS | Near-complete | ADK table TBD |

---

## Webflow MCP Build Plan

### What MCP can do
1. **Pages**: Create new pages, set slugs, SEO titles, OG data via `data_pages_tool`
2. **CMS**: Create collections (News, Case Studies) and items via `data_cms_tool`
3. **Elements**: Build page structure with `element_builder` — sections, headings, text, images, forms
4. **Styles**: Apply existing template classes via `set_style`
5. **Text**: Set content via `set_text`
6. **Links**: Wire up navigation via `set_link`

### What MCP cannot do (must be done in Designer)
- **Copy/duplicate sections between pages** — MCP can't clone a section from one page to another. Each section must be rebuilt element-by-element
- **Complex layouts** — Rebuilding the exact nested structure of template sections (wrapper > container > grid > card > icon + heading + text) is tedious but possible
- **Interactions/animations** — IX2 triggers, hover states, scroll animations must be set in the Designer
- **Video backgrounds** — Can't set via MCP
- **Component instances** — Can create but bindings are complex

### Recommended MCP workflow
1. **Manual prep in Designer**: Duplicate template pages to create TSC pages. Copy sections between pages visually. This is 10x faster than rebuilding.
2. **MCP for content population**: Once sections are in place, use MCP to:
   - Set all text content (headings, paragraphs, button labels)
   - Set page SEO titles and descriptions
   - Create CMS collections (News, Case Studies) and populate items
   - Wire up internal links
   - Set JSON-LD schema
3. **MCP for bulk operations**: Where it really shines:
   - Creating all 8 leadership team CMS items
   - Populating all product/device descriptions
   - Setting SEO metadata across all pages at once

### Estimated effort
- **Designer work** (section layout, duplication, nav): ~4-6 hours
- **MCP content population**: ~2-3 hours (mostly automated)
- **Interactions + polish**: ~2 hours in Designer
- **Images + assets**: Manual upload, then MCP can assign

### Constraint: Claude plan level
The Webflow MCP Designer tools (element_builder, element_tool, style_tool) require the Designer to be open and connected. Heavy use may hit rate limits on the current plan. For bulk text/CMS/SEO operations, the Data API tools work independently.

---

## Cross-Linking Implementation Notes

> Added 2026-06-24. All cross-link suggestions are now inline in the content above, marked with `[crosslink → /path]`.

1. **In-body contextual links** (within paragraph text) carry more SEO weight than nav or footer links. Every `[crosslink →]` and `[hyperlink]` placeholder above should become a real internal link, not just a CTA button.
2. **"Related" sections at page bottom** — case study and services pages should each include 2-3 related cards. The `section_clients` template section can serve this purpose.
3. **Anchor text** — use descriptive text, not "click here." E.g. "our award-winning ETCS" linking to `/products` is better than "learn more."
4. **Avoid orphan pages** — App Store (`/railos/app-store`) and Open RailOS (`/railos/open`) are only in the RailOS dropdown. Link from body content on at least 2-3 other pages.
5. **CMS reference fields** — Insights articles should use multi-reference fields to tag related Projects, Products, and Services for auto-generated "Related" links in footers.
6. **FAQ cross-links** — when FAQ content is written (Romain), each answer should link to the relevant product, service, or RailOS page.
