# The Signalling Company (TSC) — Overview

> Source of truth for company facts: `research/text-content-for-website-v4.docx`
> (client-supplied, received 2026-07-09). Where this overview and the live site
> disagree, the doc wins — see **Known discrepancies** at the bottom.

Belgian digital rail company founded in 2019. Builds safety-critical Automatic Train Protection (ATP) systems for European freight and passenger railways. Acquired by Škoda Group in 2023.

Founded by **Stanislas Pinte** (ex ERTMS Solution). **Alexandre Betis** (ex Ansaldo, Hitachi) joined as employee number one and CTO, and is now CEO. Pinte is now RailOS Expert & Special Projects.

Their core product is **RailOS** — a portable, SIL4-certified real-time operating system with its own application development environment. It runs ETCS and national Class B applications (TBL1+, PZB, KVB) on a single safe computer, the **iEVC**, using standard off-the-shelf Ethernet-connected devices. Unlike incumbent vendors (Alstom, Siemens, Thales) who sell proprietary, locked-in systems, TSC's platform is open and upgradable by software rather than hardware replacement.

The founding premise is **Safety-as-Software**: signalling implemented in software, independent of hardware, decoupled from device obsolescence and regulatory change.

## What they do

Design, certify, install, and maintain onboard ATP systems for locomotives and trains.

Their flagship project retrofits 109 Lineas freight locomotives — 87 with ETCS plus Belgian ATP, 22 with ETCS plus Belgian, German, and Dutch ATP — with a 10-year maintenance programme and no additional floorspace used. Installation takes about ten days per locomotive; automated commissioning under three hours.

They are also designed into Škoda Transportation's **27Ev**: 34 new-build hybrid bi-mode electro-diesel multiple units (18 two-car, 16 three-car) for RegioJet in the Czech Republic, entering service from December 2029.

## Key differentiators

- Open platform with a developer ecosystem (App Developer Kit) — no other ATP vendor offers this
- Software-defined: lighter hardware, faster installation, lower obsolescence risk
- Full lifecycle services: fleet assessment, national safety authority homologation, installation, 10-year maintenance
- One safety investment serves many markets — ETCS and Class B on the same SIL4 computer

## Timeline

| Year | Milestone |
|------|-----------|
| 2019 | Founded; on-track testing begins |
| 2023 | Acquired by Škoda Group; RailOS certified |
| 2024 | RailOS launched; TBL1+ certified |
| 2025 | ETCS certified (September — an industry record); HLD77 authorised; TBL1+ in service on Lineas |
| 2026 | 40+ HLD77 locomotives operating and rising |

## Product structure

- **RailOS** — the operating system. Everything flows from here.
- **RailOS Apps** — ETCS, TBL1+, PZB, KVB, iSTM, wSTM, TCMS, DJR, TRU, LRU, TOBA
- **RailOS Devices** — iEVC (SIL4 safe computer), Computer Box, Sensor Box, Telecom Box, DMI, JRU, DSU, Euroantenna, GPS, Doppler Radar, CoRRail, Optical Pulse Generator, Crocodile & Encoder, PZB Magnet, GSM-R/FRMCS radio, Wi-Fi/4/5/6G radio, Ethernet Switch
- **Products** — ETCS (Baseline 3 and 4), TBL1+, PZB, KVB, Telecom Box, wSTM
- **Open RailOS** — developer program; General ADK (non-safety-critical) and Safe ADK (safety-critical)
- **RailOS App Store** — under construction

Acronyms that are easy to get wrong (page H1s show only the bare acronym):

- **DJR** = Digital Journey Replay (analytics), *not* Digital Juridical Recorder
- **TRU** = recording app, configurable for Diagnostic (DRU) or Juridical (JRU) function
- **LRU** = Windows-based data extraction and pre-processing
- **TOBA** = Telecom On-Board Architecture

## Partners

- **Service partners:** Prose, Brouwer, SNCB/NMBS Technics
- **Device partners:** Duagon, Mios, Deuta, Scle, Hasler Rail, Lantech, Triorail

## Brand identity (from CEO's moodboard)

- Oak tree — ancient but robust, "we manipulate things invented 2 centuries ago"
- Theodore Roosevelt's "Man in the Arena" — core philosophy
- Challenger positioning: young company, deep roots
- "We entrust the lives of our children to our systems" — safety-first culture
- Multicolour/diversity — team from across Europe, United Colours of Benetton metaphor

## Company values

Think Strategically, Care, Collaborate, Act Rationally.

## Audience

Fleet operators (freight, passenger, track maintenance), fleet leasing companies, infrastructure managers, locomotive and train manufacturers.

## Key facts

- Part of Škoda Group (acquired 2023)
- 50+ employees ("train-blazers")
- The Signalling Company SRL, company number 0724.925.936
- Operations HQ: Rue des Deux Gares 82, Building B, B-1070 Anderlecht, Brussels, Belgium
- Telephone: +32 (0)2 882 59 00
- General enquiries: info@thesignallingcompany.com
- Website: https://www.thesignallingcompany.com/ — new Webflow site on `tsc-v2.webflow.io`, DNS switchover scheduled Tue 14 July 2026, 10:00 CEST

## Known discrepancies

Unresolved conflicts between sources. Do not assert these without checking with Romain.

| Fact | Conflict | Status |
|------|----------|--------|
| Betis's role at founding | Doc v4: Pinte is founder, Betis is "employee number one and CTO". Live About page: "**Founders** Stanislas Pinte and Alexandre Betis". | Following doc v4. **Live site copy needs correcting, or Romain needs to confirm.** |
| Headcount | Doc says "50+ train-blazers". This overview previously said ~100. | Following doc. Origin of the ~100 figure unknown. |
| Collective expertise | About section claims ">250 years". Akiem quote on the same page says "200+ years". | Contradictory within one doc. Avoid the claim until resolved. |
| RailOS launch vs certification | About says RailOS "launched in 2024"; the RailOS page stats say "2023: RailOS Certified". | Certified before launch is plausible but unconfirmed. |
| Founding team's prior employers | About names ERTMS Solution, Ansaldo, Hitachi. Homepage FAQ says "Alstom, Bombardier, and other major OEMs". | Both may be true of different people. FAQ is vaguer; About is specific. |
| `/products/wstm` | Doc lists wSTM as Product 6. The page 404s on staging. | CMS item missing. Create before launch. |

## Known site issues (as of 2026-07-09)

- `/products/wstm` returns 404 — linked from the Products page
- All RailOS app and device CMS pages return the same `<title>` ("The Signalling Company") — the template's title tag is not bound to the item name. 28 pages affected.
