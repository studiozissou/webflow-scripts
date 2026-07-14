# TSC Website — Navigation & Information Architecture

> Date: 2026-06-24
> Author: Will Morley
> Status: Proposal — awaiting client sign-off
> Supersedes: Nav section in `cargo-template-layout-plan.md` (line 253-264)

---

## Problem

The content document maps ~18 pages across 7 menu entry points (JL's M1-M7). Several pages overlap ("Customers" and "Projects" cover the same case studies), some sections carry nav-level weight despite being Phase 1 placeholders (App Store, FAQ), and the current 6-item nav + CTA risks feeling cluttered for a B2B audience that needs to find Products or proof-of-delivery fast.

## Proposed Nav — 5 items + CTA

```
[Logo]  RailOS ▾  |  Products  |  Services  |  Projects  |  Company ▾     [Contact Us]
```

### Top-level items

| # | Nav Label | URL | What it contains |
|---|-----------|-----|------------------|
| 1 | **RailOS** ▾ | `/railos` | Dropdown — the platform differentiator story |
| 2 | **Products** | `/products` | ETCS, TOBA, PZB, KVB, TBL1+, wSTM |
| 3 | **Services** | `/services` | Retrofit Assessment, Homologation, I&C, Training, Maintenance |
| 4 | **Projects** | `/projects` | Case studies + customer segment context |
| 5 | **Company** ▾ | `/about` | Dropdown — trust and credibility pages |
| CTA | **Contact Us** | `/contact` | Persistent header button, visually distinct |

### Dropdown: RailOS

| Label | URL | Content source |
|-------|-----|----------------|
| RailOS Overview | `/railos` | Section 4 — platform intro, architecture graphic, key benefits |
| RailOS Apps | `/railos/apps` | Section 5 — ETCS App, TBL1+, PZB, KVB, iSTM, TCMS, DJR, DRU, LRU |
| RailOS Devices | `/railos/devices` | Section 5.1 — iEVC, DMI, radios, sensors, boxes, device partners |
| Open RailOS | `/railos/open` | Section 17 — developer program, ADKs, application form |
| RailOS App Store | `/railos/app-store` | Section 16 — Phase 1: tile grid + email capture ("Store under construction") |

### Dropdown: Company

| Label | URL | Content source |
|-------|-----|----------------|
| About Us | `/about` | Section 7 — founding story, Skoda acquisition, values, safety video |
| Leadership | `/leadership` | Section 10 — 8 COMEX members with bios |
| Careers | `/careers` | Section 8 — values + contact form |
| Insights & News | `/insights` | Section 11 — CMS blog listing |

### Footer-only (no top nav)

| Label | URL | Notes |
|-------|-----|-------|
| FAQ | `/faq` | Content TBD (Romain). Better as contextual FAQs on product/service pages for SEO. Footer link only. |
| Privacy Policy | `/privacy-policy` | GDPR legal page |
| Contact | `/contact` | Duplicated in footer for accessibility |

### Not in nav at all

| Page | Reason |
|------|--------|
| 404 | System page, no nav entry needed |
| News article template | CMS template, accessed via Insights listing |
| Case study template | CMS template, accessed via Projects listing |

---

## Key decisions

### 1. "Projects" replaces "Customers"

JL agreed in the content doc to rename "Customers" to "Our Projects." The page-15 customer segment content (Fleet Operators, Infrastructure Managers, OEMs, Fleet Leasing) uses near-identical copy with swapped nouns. Recommendation: present these as **tabs or an accordion on the Projects page** rather than as standalone content. The case studies themselves are the real proof — segment descriptions provide context, not a separate journey.

### 2. Insights & News moves under Company

The current layout plan gives Insights its own top-level nav slot. For Phase 1 with only 7 migrated WordPress posts, this doesn't justify prime nav real estate. Moving it into the Company dropdown keeps the top nav commercially focused (RailOS, Products, Services, Projects) while Insights remains one click away.

**Tradeoff acknowledged:** If TSC plans to invest heavily in content marketing post-launch, Insights could be promoted back to top-level. The IA supports this — it's a dropdown label change, not a restructure.

### 3. RailOS gets pole position

JL's instinct is correct: RailOS is the differentiator. Placing it first (left-most, highest visual priority in LTR reading) signals that TSC leads with platform innovation, not just products. The dropdown gives the RailOS ecosystem room to breathe without overwhelming the top bar.

### 4. Contact is a CTA button, not a nav item

Styled as a filled/contrasting button in the header. Always visible, never burns a nav slot. Standard B2B pattern — Alstom, Siemens Mobility, and Hitachi Rail all do this.

### 5. App Store stays nested under RailOS

Phase 1 is just a "coming soon" email capture. It doesn't need nav-level visibility. Users who care about it will find it through the RailOS dropdown. Post-launch, if the store becomes functional, it can be promoted.

---

## Comparison with previous nav

| Slot | Previous (layout plan) | Proposed | Change |
|------|----------------------|----------|--------|
| 1 | Our Customers | **RailOS** ▾ | Promoted — platform-first positioning |
| 2 | RailOS ▾ | **Products** | Moved — still prominent at #2 |
| 3 | Our Products | **Services** | — |
| 4 | Services | **Projects** | Renamed from "Our Customers" |
| 5 | About ▾ | **Company** ▾ | Absorbed Insights |
| 6 | Insights | _(removed)_ | Moved into Company dropdown |
| CTA | [Contact] | **[Contact Us]** | Same |

Net effect: **6 → 5 top-level items.** One fewer decision for the visitor.

---

## Header Nav — Bullet List

- **RailOS** ▾
  - RailOS Overview `/railos`
  - RailOS Apps `/railos/apps`
  - RailOS Devices `/railos/devices`
  - Open RailOS `/railos/open`
  - RailOS App Store `/railos/app-store`
- **Products** `/products`
- **Services** `/services`
- **Projects** `/projects`
- **Company** ▾
  - About Us `/about`
  - Leadership `/leadership`
  - Careers `/careers`
  - Insights & News `/insights`
- **[Contact Us]** `/contact` ← CTA button

---

## Footer

Four link columns that mirror the nav groupings, plus a brand column and a legal strip.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [Logo]                                                                 │
│  A digital rail innovator.                                              │
│  Part of Skoda Group.                                                   │
│                                                                         │
│  [LinkedIn]  [YouTube]                                                  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  RailOS            Products         Services           Company          │
│  ──────            ────────         ────────           ───────          │
│  Overview          ETCS             Retrofit           About Us         │
│  Apps              TOBA Box         Homologation       Leadership       │
│  Devices           PZB              Installation       Careers          │
│  Open RailOS       KVB              Training           Insights & News  │
│  App Store         TBL1+            Maintenance        FAQ              │
│                    wSTM                                 Contact          │
│                                                                         │
│  Projects                                                               │
│  ────────                                                               │
│  Lineas HLD77                                                           │
│  Skoda / RegioJet                                                       │
│  Akiem BR189                                                            │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  © 2026 The Signalling Company SRL         Privacy Policy  ·  FAQ       │
│  Rue des Deux Gares 82/B, 1070 Brussels    BCE BE0724925936             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Column breakdown

**Column 1 — RailOS**
- Overview `/railos`
- Apps `/railos/apps`
- Devices `/railos/devices`
- Open RailOS `/railos/open`
- App Store `/railos/app-store`

**Column 2 — Products**
- ETCS `/products#etcs`
- TOBA Box `/products#toba`
- PZB `/products#pzb`
- KVB `/products#kvb`
- TBL1+ `/products#tbl1`
- wSTM `/products#wstm`

**Column 3 — Services**
- Retrofit Assessment `/services#retrofit`
- Homologation `/services#homologation`
- Installation & Commissioning `/services#installation`
- Training `/services#training`
- Maintenance `/services#maintenance`

**Column 4 — Company**
- About Us `/about`
- Leadership `/leadership`
- Careers `/careers`
- Insights & News `/insights`
- FAQ `/faq`
- Contact `/contact`

**Column 5 (or below columns 1-4) — Projects**
- Lineas HLD77 `/projects/lineas-hld77`
- Skoda / RegioJet `/projects/skoda-regiojet`
- Akiem BR189 `/projects/akiem-br189`

**Legal strip (bottom bar)**
- &copy; 2026 The Signalling Company SRL
- Rue des Deux Gares 82/B, 1070 Brussels
- BCE BE0724925936
- Privacy Policy `/privacy-policy`

### Footer notes

- Products and Services link to anchor sections on single pages (not separate pages per item). This gives footer visitors deep links without inflating the page count.
- Projects lists the three current case studies by name — more compelling than a generic "View all projects" link, and gives each project direct SEO-friendly footer equity.
- Contact appears in both the Company column and as the header CTA — the footer is where visitors go when they've scrolled past the header button.
- FAQ lives in the legal strip rather than a column — it's utility, not a destination.

---

## Sitemap (tree)

```
Home (/)
├── RailOS (/railos)
│   ├── RailOS Apps (/railos/apps)
│   ├── RailOS Devices (/railos/devices)
│   ├── Open RailOS (/railos/open)
│   └── RailOS App Store (/railos/app-store)
├── Products (/products)
├── Services (/services)
├── Projects (/projects)
│   └── {case-study-slug} (/projects/{slug})  ← CMS template
├── About (/about)
│   ├── Leadership (/leadership)
│   ├── Careers (/careers)
│   └── Insights & News (/insights)
│       └── {article-slug} (/insights/{slug})  ← CMS template
├── Contact (/contact)
├── FAQ (/faq)  ← footer only
└── Privacy Policy (/privacy-policy)  ← footer only
```

**Total pages: 18** (same as layout plan — no pages added or removed, just reorganised in the nav)

---

## Impact on existing specs

- **`cargo-template-layout-plan.md`**: Nav section (lines 253-264) to be updated once approved. Page URLs and layout mappings unchanged.
- **`tsc-cms-population.md`**: No impact — CMS collections and items are URL-independent.
- **`build-timeline.md`**: Nav build is part of the Designer work phase (already scheduled).

---

## Open questions for Romain

1. **"Projects" vs "Our Projects" vs "Customers"** — which label does the team prefer? JL leaned toward "Our Projects" but the possessive "Our" adds a word. Plain "Projects" is tighter.
2. **Insights under Company** — is Romain comfortable with this, or does the marketing team want Insights at top level for content strategy reasons?
3. **RailOS dropdown order** — is Overview → Apps → Devices → Open → App Store the right priority, or should Devices come before Apps?
