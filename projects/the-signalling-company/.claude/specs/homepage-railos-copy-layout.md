# Homepage & RailOS — Copy & Layout Recommendations (v2)

> Date: 2026-06-25
> Context: These two pages do the heavy lifting. Client left them until last.
> Template: Cargo+ (BYQ Studio) — but sections are suggestions, not constraints. Build what the page needs.
> Approach: Both pages sell. The homepage sells TSC. The RailOS page sells the platform.

---

## Customer Transformation Map

| ICP | They arrive thinking... | They leave thinking... | What moves them |
|---|---|---|---|
| **Fleet Operator** | "I need ETCS to stay compliant. The big vendors are expensive and slow. Can a smaller company actually deliver?" | "They've done this 109 times. The software approach means less downtime, less cost. I want to talk to someone." | Proof (case study numbers), cost framing (TCO not unit price), low-friction CTA |
| **Infrastructure Manager** | "Another vendor. Are they certified? Will this system still be supported in 15 years?" | "SIL4 certified, Skoda-backed, team came from Alstom and Bombardier. They know the standards." | Credentials, safety record, standards compliance, corporate stability |
| **Rolling Stock OEM** | "I'm spec'ing ATP for a new platform. I need something that works across markets without re-engineering per country." | "An open platform with a developer kit? Nobody else offers this. I want a technical conversation." | Architecture story, ADK, the Skoda 27Ev reference, partnership framing |
| **Fleet Leasing Company** | "My locos need to stay leasable for 25 years. Will this system age well or will I be paying for hardware swaps?" | "Software-defined means the system evolves. My asset stays compliant without replacement cycles." | Obsolescence language, multi-market flexibility, asset value protection |

---

## 1. HOMEPAGE (`/`)

### Design principle

The homepage is a sales page. It makes the full case for TSC — problem, answer, proof, credibility, close — so that a visitor who reads nothing else still understands why TSC exists and what to do next. Deeper pages add detail; the homepage stands alone.

### Narrative arc

1. **Promise** — what you get (hero)
2. **How** — what TSC delivers differently (solution cards)
3. **Proof** — who's already using it (project carousel)
4. **Trust** — logos, numbers, quote
5. **Platform** — the RailOS story (sell it here, link deeper)
6. **FAQ** — defeat remaining objections
7. **Close** — CTA

No problem section. The solution cards imply the problems — "software updates, not hardware replacement" only makes sense if the old way is hardware replacement. The visitor connects the dots themselves, which lands harder than being told.

---

#### 1. Hero

**Tag:** Safety-Critical Train Protection

**H1:** Your fleet stays compliant. Your costs stay down. Your system never goes obsolete.

**Sub:** TSC builds the ETCS onboard systems that freight and passenger operators rely on across Europe. Software-defined, lighter to install, and designed to evolve with your fleet — not against it.

**CTA 1:** See how it works → `#platform` (scroll to RailOS section below)
**CTA 2:** Talk to our team → popup contact form

**Background:** Corporate/workshop video or dark static with motion.

**Why this works:**
- The H1 is three benefits in the reader's voice — compliant, affordable, future-proof. Each maps to a different ICP's primary concern.
- "ETCS onboard systems" (SEO keyword) is in the sub, not forced into the benefit headline.
- CTA 1 keeps them on the page (selling, not routing). CTA 2 catches anyone already convinced.
- "Software-defined" and "evolve with your fleet" do the selling work — the features are implied, not listed.

---

#### 2. What TSC delivers

**Section heading:** A different approach to train protection

**Body (left column or above cards):**
TSC's systems are built on RailOS — a software-defined platform that runs ETCS and national Class B applications on a single set of hardware. Update the software, not the box. Add new country systems without new equipment. Choose your applications, not your vendor.

**Four solution cards:**

**Card 1 — One platform, every ATP system**
ETCS, TBL1+, PZB, KVB — all run as software on the same SIL4-certified computer. One investment covers every market your fleet operates in.
→ See our products `/products`

**Card 2 — Software updates, not hardware replacement**
When regulations change, the software changes. The hardware stays. Your fleet stays compliant without depot downtime or capital replacement cycles.
→ Explore RailOS `/railos`

**Card 3 — Lighter, faster, less intrusive**
Where conventional systems need 4-6 boxes in the cab, TSC's software-defined approach consolidates into one compact unit. Less weight on the vehicle, less time in the depot, less disruption to operations.
→ See certified devices `/railos/devices`

**Card 4 — Open to your engineers**
RailOS is the only ATP platform with a third-party developer kit. OEMs can build, test, and certify their own safety-critical applications. No other vendor offers this.
→ Open RailOS `/railos/open`

**Why sell here instead of routing to RailOS?** Most visitors don't click through. The homepage has to make the case on its own. Each card implies the industry problem it solves without naming it — the visitor connects the dots, which is more persuasive than a slide deck telling them what's broken.

---

#### 3. Projects carousel

**Section heading:** Proven in the field

**Sub:** TSC systems are in service on real fleets, in real countries, running real traffic.

**Carousel — 3 slides (one per project):**

**Slide 1 — Lineas HLD77**
Tag: Freight Retrofit
Heading: 109 freight locomotives. 3 countries. Full ETCS.
Body: Europe's largest private freight operator chose TSC to retrofit its HLD77 fleet with ETCS across Belgium, the Netherlands, and Germany. Full onboard systems, installed and maintained for 10 years.
CTA: Read the case study → `/projects/lineas-hld77`
Visual: Lineas locomotive photo or installation timelapse still

**Slide 2 — Skoda / RegioJet 27Ev**
Tag: New Build
Heading: Next-generation electric trains. ETCS from day one.
Body: Skoda Transportation selected TSC to supply the onboard ATP platform for its 27Ev BEDMU fleet — built for RegioJet passenger services with ETCS integrated from the factory floor.
CTA: Read the case study → `/projects/skoda-regiojet`
Visual: 27Ev train photo if available

**Slide 3 — Akiem BR189**
Tag: Fleet Leasing
Heading: Keeping leased assets compliant across borders.
Body: Akiem's BR189 locomotives operate across multiple European networks. TSC's multi-system platform keeps them leasable and compliant — without per-country hardware changes.
CTA: Read the case study → `/projects/akiem-br189`
Visual: BR189 photo if available

**Why a carousel:** Three projects, three ICPs. Fleet operators see Lineas and think scale. OEMs see Skoda and think integration. Leasing companies see Akiem and think asset protection. The carousel lets each visitor find their mirror without scrolling past irrelevant content.

**Auto-advance:** Yes, subtle, with manual navigation dots/arrows. Each slide should be readable in 8-10 seconds.

---

#### 4. Trust bar + proof points

**Logos (ticker strip, no heading):**
Lineas, Skoda Transportation, Akiem, Skoda Group, Infrabel (if permissible), certification/notified body marks

**Quote:**
"TSC offered us a real alternative — a system that's lighter, faster to install, and built to evolve with our fleet."
— Bruno Vanlede, Lineas *(verify with Romain — real or placeholder?)*

**Stats row (3-4 items):**

| Stat | Label |
|---|---|
| 109+ | Vehicles equipped |
| 3 | Countries in service |
| 10 yr | Maintenance commitment |
| 2025 | ETCS certified |

**Why combine logos + quote + stats in one section:** Trust stacks. Logos say "real companies use this." The quote says "a real person vouches for it." The numbers say "at real scale." Together they defeat the "young company" objection faster than any paragraph could.

---

#### 5. The RailOS story (sell it on the homepage)

**Section heading:** Built on RailOS — the operating system for train protection

**Body:**
RailOS is the technology that makes all of this possible. A portable, real-time operating system built from a blank sheet — no legacy code, no inherited limitations. It runs any certified ATP application on standard, off-the-shelf hardware. And it's open: OEMs and third-party developers can build their own applications using the RailOS developer kit.

**This is what "software-defined" actually means:**
- Your ETCS system is a software application, not a hardware box
- Adding a new country system (PZB, KVB, TBL1+) is a software deployment, not a hardware installation
- When regulations change, the application updates — the hardware stays
- When your fleet moves to a new market, the system adapts

**CTA:** Explore the full RailOS story → `/railos`

**Architecture diagram placeholder:** [Need graphic from Jarlath — simplified system view showing RailOS as the layer between hardware and applications]

**Why this belongs on the homepage:** RailOS is TSC's core differentiator. Burying it on a sub-page means most visitors never see it. This section sells the concept; the RailOS page sells the detail.

---

#### 6. FAQ

**Section heading:** Common questions

Questions that defeat the remaining objections. Each answer is 2-3 sentences — enough to satisfy, short enough to scan.

**Q: Is TSC certified for safety-critical railway systems?**
A: Yes. RailOS and our ETCS application are SIL4-certified — the highest safety integrity level for railway signalling. Our systems have been assessed by independent notified bodies and approved by national safety authorities in Belgium, the Netherlands, and Germany.

**Q: How does a software-defined system handle safety certification?**
A: The same way any SIL4 system does — through rigorous verification, validation, and independent assessment. The difference is that our safety case is designed for software evolution. When an application is updated, only the changed software component needs re-certification, not the entire system.

**Q: What happens when I need to operate in a new country?**
A: You deploy the relevant national ATP application (PZB for Germany, KVB for France, TBL1+ for Belgium) as a software package on your existing RailOS hardware. No new boxes, no new wiring, no new depot integration. The hardware stays the same.

**Q: How is TSC different from Alstom, Siemens, or Thales?**
A: Those vendors build closed, proprietary systems where the hardware, software, and roadmap are controlled by the vendor. TSC's platform is open — software-defined, hardware-agnostic, and available to third-party developers. We also offer full lifecycle services from assessment through homologation to 10-year maintenance, so you're supported from day one to decade two.

**Q: TSC is a younger company. Why should I trust you with safety-critical systems?**
A: Our founding team built ATP systems at Alstom, Bombardier, and other major OEMs before starting TSC. The collective experience is measured in decades, not years. TSC is part of the Skoda Group, providing corporate stability and manufacturing scale. And our systems are independently certified to the same SIL4 standard as every incumbent — the maths doesn't care who built it.

**Q: What does a typical ETCS retrofit project look like?**
A: We start with a fleet assessment to determine scope and compatibility. Then we manage the homologation process with the relevant national safety authority — the most complex part of any retrofit. Once approved, our team handles installation and commissioning. Typical timelines depend on fleet size and country requirements. → Talk to us about your fleet `/contact`

**Why FAQ on the homepage:** These questions are the objections that stop deals. Every ICP has at least one. Answering them here — before the visitor navigates away — keeps them moving toward the CTA instead of leaving with doubts. For SEO, each question is a potential AI Overview citation and a long-tail keyword match.

---

#### 7. CTA

**Heading:** Ready to talk about your fleet?
**Sub:** Whether you're retrofitting an existing fleet, specifying systems for a new build, or assessing your options — our team has done this before.
**CTA:** Get in touch → popup contact form (hidden field: source=homepage-cta)

**Background:** Video or dark overlay. Visually distinct from everything above.

---

### Homepage cross-link summary

| From section | Links to | Purpose |
|---|---|---|
| Hero CTA 1 | `#platform` (on-page) | Keeps visitor on the page — sell before routing |
| Hero CTA 2 | Popup form | Direct conversion |
| Answer cards | `/products`, `/railos`, `/railos/devices`, `/railos/open` | Deep links from benefit statements |
| Project carousel | `/projects/lineas-hld77`, `/projects/skoda-regiojet`, `/projects/akiem-br189` | Case study proof |
| RailOS section | `/railos` | Platform deep dive |
| FAQ answer 6 | `/contact` | Conversion from objection-handling |
| CTA | Popup form | Final conversion |

---

## 2. RAILOS (`/railos`)

### Design principle

The RailOS page converts the technically curious into engaged prospects. The homepage made the case; this page shows the engineering. It earns the right to go deep by leading with what the platform means for the visitor, then explaining how it works.

### Narrative arc

1. **Promise** — one platform, every system (hero)
2. **Problem** — what's wrong with traditional ATP
3. **Answer** — what RailOS changes (capability cards)
4. **Credibility** — quote / emotional beat
5. **What runs on it** — application overview
6. **Where it's proven** — deployment stats + case study links
7. **FAQ** — technical objections answered
8. **Go deeper** — ecosystem hub links
9. **Close** — CTA

---

#### 1. Hero

**Tag:** Our Core Technology

**H1:** One platform. Every ATP system.

**Sub:** RailOS is the software-defined operating system for safety-critical train protection. It runs ETCS and national Class B systems on a single set of hardware — upgradable by software, not hardware replacement.

**Why this works:**
- "One platform. Every ATP system." is a 6-word promise that every ICP reads differently but values equally
- Fleet operators hear: "I don't need separate systems per country"
- OEMs hear: "I can standardise across vehicle variants"
- Leasing companies hear: "One investment, multiple markets"
- Infrastructure managers hear: "Multi-system interoperability"

---

#### 2. The problem

**Section heading:** Traditional ATP is holding the industry back

**Card 1 — Proprietary lock-in**
Heading: One vendor, one system, no way out
Body: Conventional ATP platforms tie operators to a single vendor for hardware, software, and maintenance. Switching costs are prohibitive, and upgrades happen on the vendor's timeline.

**Card 2 — Hardware obsolescence**
Heading: Replace the box every 10 years
Body: Legacy systems embed safety logic in hardware. When standards change or components reach end-of-life, the entire unit gets replaced — at millions per fleet.

**Card 3 — Cross-border complexity**
Heading: A different system for every border
Body: Each national ATP standard (TBL1+, PZB, KVB) traditionally requires its own dedicated hardware. Cross-border fleets carry multiple boxes, multiplying weight, cost, and maintenance.

---

#### 3. What RailOS changes

**Section heading:** Software-defined. Open. Built to last.

**Card 1 — One platform, zero lock-in**
Icon: [platform/open icon from brand book]
Heading: Run any ATP application on one computer
Body: RailOS is a portable, real-time operating system. ETCS, TBL1+, PZB, KVB — all run as software applications on the same SIL4-certified hardware. Add new systems with a software update, not a hardware swap.
→ See our products `/products`

**Card 2 — Software updates, not hardware replacement**
Icon: [upgrade/refresh icon]
Heading: Upgrade by software. Eliminate obsolescence.
Body: When standards evolve or regulations change, RailOS applications are updated remotely. The hardware stays. Your fleet stays compliant without depot downtime or capital replacement cycles.
→ See our services `/services`

**Card 3 — Open to third-party development**
Icon: [code/developer icon]
Heading: Build your own safety-critical applications
Body: RailOS includes an Application Developer Kit for OEMs and third-party developers. Write, test, and certify new applications on a proven, SIL4-compliant platform. No other ATP vendor offers this.
→ Explore Open RailOS `/railos/open`

**Card 4 — Lighter, smaller, faster to install**
Icon: [weight/size icon]
Heading: Half the boxes, half the installation time
Body: The software-defined approach consolidates what was previously 4-6 separate hardware units into a single compact system. Lighter on the vehicle, faster in the depot, and simpler to maintain.
→ See certified devices `/railos/devices`

---

#### 4. Credibility quote

**Quote option A (customer — preferred):**
"[Actual customer quote about RailOS — request from Romain]"
— Name, Title, Company

**Quote option B (internal — from Alex's brand values):**
"We entrust children's lives to our systems. That's why RailOS was built from a blank sheet — no legacy code, no compromises, no shortcuts."
— Alex Betis, CEO, The Signalling Company

---

#### 5. Applications overview

**Section heading:** Applications built on RailOS

**Sub:** Every application is certified, field-proven, and runs on the same SIL4 hardware.

**ATP Applications (expandable list or card grid):**

| Application | One-liner | Status | Link |
|---|---|---|---|
| ETCS | European Train Control System — Levels 1 & 2 | Certified 2025, in service | → `/products/etcs` |
| TBL1+ | Belgian national ATP (standard, ++, NG) | In service since 2025 | → `/products/tbl1` |
| PZB | German/Austrian national ATP | In certification | → `/products/pzb` |
| KVB | French national ATP | In development | → `/products/kvb` |
| iSTM | Software-defined STM for ETCS + Class B integration | Available | → `/railos/apps` |
| TOBA | Telecom onboard architecture — GSM-R, 4G/5G, FRMCS | Available | → `/products/toba-box` |

**Data Applications (secondary grouping):**

| Application | One-liner |
|---|---|
| DJR | Digital Journey Replay — troubleshooting and analytics |
| DRU | Digital Recording Unit — train + juridical data capture |
| LRU | Local/remote data extraction tool |

→ Full application details `/railos/apps`

---

#### 6. Proven in service

**Stats row:**

| Stat | Label |
|---|---|
| 109+ | Vehicles equipped |
| 3 | Countries in service |
| 2019 | Platform development started |
| 2025 | ETCS certified |

**Body:** RailOS powers the ETCS retrofit of 109 Lineas freight locomotives across Belgium, the Netherlands, and Germany — and the next-generation 27Ev electric trains for Skoda Transportation's RegioJet service.

→ Lineas HLD77 project `/projects/lineas-hld77`
→ Skoda 27Ev project `/projects/skoda-regiojet`

---

#### 7. FAQ

**Section heading:** Technical questions about RailOS

**Q: How does RailOS handle SIL4 certification for software updates?**
A: RailOS separates the safety-critical application layer from the platform layer. When an application is updated, only the changed component needs re-assessment — not the entire system. This is how "software-defined" translates to "certifiable" in practice. The safety case is designed for evolution, not frozen in hardware.

**Q: Can RailOS run third-party applications alongside TSC's own apps?**
A: Yes. The Application Developer Kit allows OEMs and third-party developers to build, test, and certify their own safety-critical applications on the RailOS platform. Applications are sandboxed — a third-party app cannot affect the integrity of other certified applications running on the same hardware.
→ Learn about Open RailOS `/railos/open`

**Q: What hardware does RailOS run on?**
A: The core computing platform is the iEVC — a SIL4-certified safe computer designed for rail environments. RailOS also supports a certified ecosystem of peripherals: driver machine interfaces, balise readers, Euroradio units, recording devices, and telecom gateways. The platform is hardware-agnostic by design — it runs on certified off-the-shelf components, not proprietary boxes.
→ See all certified devices `/railos/devices`

**Q: How does RailOS handle interoperability between ETCS and national systems?**
A: Through the iSTM (integrated Specific Transmission Module) — a software-defined STM that manages the transition between ETCS and Class B systems like TBL1+, PZB, and KVB. The handover is handled in software, automatically, without driver intervention or separate hardware modules. This is what makes single-platform cross-border operation possible.

**Q: What's the typical deployment timeline for RailOS on a new fleet?**
A: It depends on fleet size, country requirements, and whether the project is a retrofit or new build. The Lineas HLD77 program (109 locomotives, 3 countries, ETCS + TBL1+) is TSC's reference deployment. We handle the full lifecycle: fleet assessment, homologation with national safety authorities, installation, commissioning, and 10-year maintenance.
→ Discuss your project `/contact`

**Why these questions:** They map to the objections each ICP carries but wouldn't ask on a first visit. Infrastructure managers want certification detail. OEMs want integration architecture. Fleet operators want timeline reality. Leasing companies want to know the hardware story. Answering here prevents the "I'll think about it" exit. For SEO, each question targets a long-tail search and is structured for AI citation.

---

#### 8. Explore the RailOS ecosystem (hub links)

**Card 1:** RailOS Applications → `/railos/apps`
All ATP and data applications available on the platform.

**Card 2:** Certified Devices → `/railos/devices`
The hardware ecosystem — from the iEVC computer to radios, sensors, and recording units.

**Card 3:** Open RailOS → `/railos/open`
The developer program and Application Developer Kit for OEMs and third parties.

**Card 4:** RailOS App Store → `/railos/app-store`
Browse and select ATP applications for your fleet. *(Coming soon)*

---

#### 9. CTA

**Heading:** See RailOS in action
**Sub:** Request a technical briefing or discuss how RailOS fits your fleet.
**CTA:** Request a briefing → popup contact form (hidden field: source=railos-cta)

---

### RailOS cross-link summary

| From section | Links to | Purpose |
|---|---|---|
| Capability cards | `/products`, `/services`, `/railos/open`, `/railos/devices` | Deep links from benefit statements |
| Applications table | `/products/*`, `/railos/apps` | Individual product pages |
| Proven in service | `/projects/lineas-hld77`, `/projects/skoda-regiojet` | Case study proof |
| FAQ answers | `/railos/open`, `/railos/devices`, `/contact` | Objection → action |
| Hub cards | `/railos/apps`, `/railos/devices`, `/railos/open`, `/railos/app-store` | Ecosystem navigation |
| CTA | Popup form | Conversion |

---

## Cross-linking strategy (both pages)

```
Homepage (sells TSC)                 RailOS (sells the platform)
   │                                    │
   ├── #platform (on-page sell)         ├── /products (what to buy)
   ├── /products (answer cards)         ├── /services (lifecycle)
   ├── /railos (platform deep dive)     ├── /railos/open (differentiator)
   ├── /railos/devices (answer cards)   ├── /railos/devices (specs)
   ├── /railos/open (answer cards)      ├── /railos/apps (full catalogue)
   ├── /projects/* (carousel)           ├── /projects/* (proof)
   ├── /contact (FAQ link)              ├── /contact (FAQ link)
   └── popup form (convert)             └── popup form (convert)
```

**Every section links to at least one proof page and one conversion point.** No dead ends.

**Pages that link BACK:**
- Product pages → "Built on RailOS" badge → `/railos`
- Service pages → "Powered by RailOS" → `/railos`
- Project pages → "About The Signalling Company" → `/`

---

## Notes for collaborative build with Romain

1. **Homepage hero:** Three-benefit H1 is a departure from typical B2B. If Romain prefers something more conventional, fall back to "The ETCS onboard system built for the long haul" — but push for the benefit-led version first.

2. **Problem section:** This is the most important homepage section after the hero. If Romain resists naming the industry's problems, frame it as "this is what your customers already think — we're just acknowledging their reality."

3. **Project carousel:** Needs photos for all three projects. If Akiem imagery isn't available, two slides work fine — but three is stronger because it shows breadth (freight retrofit + new build + leasing).

4. **FAQ content:** These are drafted from the SEO keyword gaps and ICP objection map. Romain and Jarlath should review for technical accuracy. The "How is TSC different from Alstom" question is the most important — it names the competition directly, which B2B buyers respect.

5. **Bruno Vanlede quote:** Real or placeholder? If placeholder, request a real one. A single sentence from a customer carries more weight than any copy we write.

6. **Stats:** Confirm 109 locos, 3 countries, 10-year maintenance are all still current.

7. **Video:** Corporate/workshop on homepage hero. Installation timelapse on Projects or Services.

8. **RailOS expanded content from Jarlath:** The capability cards (section 3) are benefit-led wrappers. Jarlath's technical detail should sit underneath each card as expandable or as body copy below the heading — but the benefit headline stays on top.
