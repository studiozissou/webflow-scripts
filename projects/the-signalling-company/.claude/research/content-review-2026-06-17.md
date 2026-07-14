# The Signalling Company — Content Review & Call Prep
## 18 June 2026

Prepared by Will Morley for internal reference and potential sharing with Romain Hourtiguet (Marketing Manager, TSC).

---

## How to use this document

This is structured as both a call-prep reference and a shareable deliverable. Sections 1-3 are the call conversation talking points. Section 4 (page-by-page feedback) can be sent to Romain afterward as a working brief for content revisions.

---

## 1. ICP Analysis — Who is visiting this website?

TSC's content needs to serve four distinct buyer profiles. Each has different questions, different timelines, and different trust signals they look for. The current content treats them all the same — it talks about what TSC built, not what each audience needs to hear.

### ICP 1: Fleet Operators (Freight & Passenger)

**Who they are:** Operations directors, fleet managers, and procurement leads at companies like Lineas, DB Cargo, or national rail operators. They run fleets of 50-500+ locomotives and need to equip or upgrade them with ATP systems to comply with ETCS mandates.

**What they care about most:**
- Minimising fleet downtime during retrofit (every locomotive out of service costs money)
- Total cost of ownership over 15-25 year asset lifecycles
- Regulatory compliance — meeting ETCS deployment deadlines without betting on unproven technology
- Maintenance simplicity — their depots service the vehicles, so the system needs to be field-serviceable

**What problem TSC solves:** TSC's software-based approach means lighter, more compact hardware (fewer boxes in the cab), faster installation (less downtime per vehicle), and lower obsolescence risk (software updates vs hardware replacement). For a fleet operator retrofitting 100+ locomotives, this translates to millions in saved downtime and future-proofing.

**Language that resonates:** Fleet operators think in vehicles, not platforms. They want to hear "109 locomotives retrofitted" not "portable real-time OS." They respond to proof: project numbers, timelines delivered, uptime percentages. They distrust vendor marketing — case studies and reference customers carry ten times more weight than feature lists.

**What they look for on the website:**
1. Case studies with real numbers (fleet size, timeline, countries/systems covered)
2. Product pages that explain what goes in the cab, how long installation takes, and what maintenance looks like
3. A clear path to "talk to someone" — not a generic contact form, but a specific CTA like "Discuss your fleet retrofit"
4. Evidence of regulatory approval (SIL levels, notified body certifications, country authorisations)

### ICP 2: Infrastructure Managers

**Who they are:** Technical directors and signalling engineers at national infrastructure bodies (Infrabel, ProRail, Network Rail, DB Netz). They define the rules and approve the systems that run on their tracks.

**What they care about most:**
- Standards compliance — does this system meet ERA/ERTMS specifications exactly?
- Interoperability — will it work with their existing trackside equipment and across borders?
- Safety case evidence — SIL4 certification, proven safety record, notified body assessments
- Long-term vendor viability — will this company exist in 15 years to support the system?

**What problem TSC solves:** TSC's modular software architecture supports multiple national ATP systems (TBL1+, PZB, KVB, STM) on a single hardware platform, simplifying cross-border interoperability. For infrastructure managers dealing with fragmented legacy systems, this reduces the certification matrix.

**Language that resonates:** Highly technical, standards-driven. These buyers read ERA Technical Specifications for Interoperability (TSIs). They want to see baseline versions, SIL levels, and compliance references. Marketing fluff actively damages credibility with this audience.

**What they look for on the website:**
1. Detailed technical specifications and compliance documentation
2. Downloadable datasheets (gated is fine — they expect it)
3. Clear statement of which national systems are supported and at what certification level
4. Company credentials: ISO 9001, safety assessments, notified body partnerships

### ICP 3: Rolling Stock OEMs (Locomotive & Train Manufacturers)

**Who they are:** System integration engineers and product managers at companies like Skoda Transportation, Alstom, Stadler, or CRRC. They design new vehicles and need to integrate ATP systems during manufacturing.

**What they care about most:**
- Integration simplicity — SWaP (Size, Weight, and Power) constraints are tight in modern cab designs
- A single platform that covers multiple country requirements (they sell trains across Europe)
- API/interface documentation — their engineers need to integrate, not just install
- Partnership model — they want a technology partner, not just a component supplier

**What problem TSC solves:** RailOS as an open platform means OEMs can standardise on one onboard system across vehicle variants and target markets. The App Developer Program and ADK mean their own engineers can build and certify applications. This is TSC's most differentiated story — no competitor offers an open, portable ATP platform.

**Language that resonates:** OEMs think in platforms, interfaces, and system architecture. "Open platform," "write once, deploy anywhere," "application development kit" — this language works, but only if backed by concrete integration documentation. They want to see architecture diagrams, not metaphors.

**What they look for on the website:**
1. Platform architecture overview — how RailOS works at a system level
2. The Open RailOS / ADK story — this is a genuine differentiator, make it prominent
3. Integration case study (the Skoda 27Ev project is perfect for this)
4. A path to technical engagement: "Request ADK documentation" or "Schedule a technical workshop"

### ICP 4: Fleet Leasing Companies

**Who they are:** Asset managers at companies like Alpha Trains, Beacon Rail, or Akiem. They own locomotives and lease them to operators. They care about asset value and residual value over 20-30 year lifecycles.

**What they care about most:**
- Asset future-proofing — will this system keep the locomotive compliant and leasable for its full lifecycle?
- Obsolescence management — hardware replacement cycles destroy residual value
- Multi-operator flexibility — the locomotive might serve different operators in different countries
- Total cost of ownership documentation they can show to their own investors

**What problem TSC solves:** Software-defined ATP means the system can be updated to meet new requirements without hardware swap-outs. A locomotive equipped with RailOS can serve in Belgium under TBL1+, then move to Germany under PZB, with a software configuration change rather than a hardware refit.

**Language that resonates:** Financial and asset-lifecycle language. "Protect your asset value," "software-defined upgradability," "multi-market flexibility." They are less technical than the other three ICPs but more commercially sophisticated.

**What they look for on the website:**
1. A clear explanation of the software-update model vs traditional hardware replacement
2. Multi-country/multi-system support framed as asset flexibility
3. Total cost of ownership comparison (even qualitative)
4. The Lineas case study — Lineas is a known brand in the leasing/freight world

---

## 2. Overarching Feedback Themes

These are the recurring issues across the entire document. Use these as the main talking points on the call.

### 2.1 The content describes what TSC built, not what the customer gets

Almost every page leads with internal language: architecture descriptions, component lists, software layer explanations. The customer's question is simpler: "What does this do for me, and why should I choose it over the alternative?" The content needs to be reframed around customer outcomes.

**Example:** The RailOS Our Tech page opens with a technical description of the operating system architecture. A fleet operator reading this page wants to know: "Will this system reduce my retrofit downtime and keep my fleet compliant for the next 20 years?" Lead with that answer, then explain the technology as the reason it is possible.

### 2.2 No differentiation — why TSC and not the incumbents?

Nowhere in the document does TSC explicitly address why a customer should choose them over Alstom, Siemens, Hitachi Rail, or Thales. In a safety-critical market where buyers default to established vendors, TSC needs to name and defeat the objection: "Why would I trust a younger company with my fleet's safety system?"

The brand identity already contains the answer — "young company, deep roots" — but this message never appears in the website content. The founding team's experience at Alstom/Bombardier/etc. is the trust bridge. The open-platform approach is the innovation argument. Neither is articulated.

### 2.3 Massive information architecture overlap creates confusion

The current structure has separate pages for Products, Apps, Devices, and RailOS Our Tech — but the boundaries between them are unclear. A visitor looking at the Products page sees ETCS. They look at the Apps page and see ETCS again. They look at Devices and see the iEVC, which is the ETCS computer. Three pages, same product, no clear hierarchy.

**Recommendation for the call:** Propose consolidating into a cleaner structure:
- **RailOS** (one page): the platform story — what it is, why it matters, how it works
- **Products** (one page or CMS collection): each product as a defined offering (ETCS OBU, TOBA Box, PZB system, etc.) with its own section showing what is included (hardware + software + services)
- **Open RailOS / Developers** (one page): the ecosystem and ADK story — this is unique and deserves its own space
- Remove the separate Devices page — fold device details into the relevant product pages

This reduces cognitive load and matches how buyers actually think: "I need an ETCS system" not "I need to understand your OS architecture, then find the right app, then find the right device."

### 2.4 Case studies are undersold — they are TSC's strongest content

The Lineas HLD77 and Skoda 27Ev case studies contain genuinely compelling proof points: 109 locomotives, multi-country ETCS retrofit, real operator deployment. But they are buried in flat paragraphs with no visual hierarchy, no pull quotes, no outcome metrics called out.

Case studies are the single most important content type for B2B buyers in regulated industries. These need prominent placement, structured formatting (challenge / solution / result), and hard numbers displayed as headline statistics.

### 2.5 Services page is an afterthought but could drive revenue

The Services section (retrofit assessment, homologation, installation, maintenance) is listed in four bullet points. These are high-value, consultative services that represent ongoing revenue streams. Each deserves its own section with a clear process explanation and a specific CTA. "Homologation support" is particularly valuable — getting a new ATP system approved by a national safety authority is the hardest part of any deployment, and TSC offering to lead that process is a strong selling point.

### 2.6 No trust-building content outside of case studies

There are no testimonials, no partner logos, no certification badges, no team credentials, no safety record statistics. In a safety-critical industry, trust is the product. The website needs visible proof: ISO 9001 certification, SIL4 compliance, years of collective team experience, countries where systems are in operation, number of vehicles equipped.

### 2.7 The Open RailOS / App Store concept is visionary but unexplained

The idea of an open ATP platform with a developer ecosystem and an app store is genuinely novel in rail signalling. No competitor offers this. But the content assumes the reader already understands why this matters. It needs a clear narrative: what the problem is today (proprietary, locked-in vendor systems), what Open RailOS changes (open standards, third-party development, customer choice), and what the concrete next step is for someone interested.

---

## 3. Quick Wins — Highest Impact, Lowest Effort

These are changes TSC can make to the existing content document before handoff that would significantly improve the website.

### 3.1 Write one sentence per page that answers "Why should I care?"

Before any technical content, each page needs a single benefit-led sentence that a non-technical stakeholder could read and understand the value. This is the hero subheading on every page.

**Time to do:** 1 hour across all pages.

### 3.2 Add numbers to the case studies

Pull out the key metrics and list them as standalone statistics: "109 locomotives," "3 countries," "ETCS Level 1 & Level 2," "10-year maintenance program." These become the visual anchors of the case study pages and can be reused on the homepage.

**Time to do:** 30 minutes.

### 3.3 Write a "Why TSC" section for the About page

Three to four paragraphs covering: founding team experience (name the companies they came from), the open-platform philosophy (and why nobody else does this), the Skoda Group affiliation (stability and scale), and the safety-first culture (the "we entrust children's lives" line from the values deck is powerful — use it).

**Time to do:** 1 hour.

### 3.4 Add a trust bar to the homepage

A horizontal strip of logos and credentials: Skoda Group, Lineas, ISO 9001:2015, and any certification or notified body logos. This takes 10 minutes to mock up but immediately signals credibility.

**Time to do:** 10 minutes to list the logos needed, 5 minutes to implement in the template.

### 3.5 Give every page a specific CTA

Replace generic "Contact us" links with page-specific actions:
- Products page: "Discuss your ATP requirements"
- Services page: "Request a retrofit assessment"
- Customers page: "See how we can help your fleet"
- Open RailOS page: "Request ADK access"
- App Store page: "Get notified when the App Store launches"

**Time to do:** 30 minutes.

---

## 4. Page-by-Page Content Feedback

### 4.1 Home Page

**Current state:** TBD — no content provided.

**Problem:** The homepage is the most important page and it has no content yet. Every other page depends on the homepage setting the narrative frame.

**Recommended format:**
- **Hero:** Benefit-led headline (6-8 words) + 2-sentence description + primary CTA
- **Trust bar:** Skoda Group logo, Lineas logo, ISO 9001, key certification marks
- **Value propositions:** 3-column grid — lightest system / fastest installation / lowest obsolescence risk
- **Featured case study:** Lineas HLD77 with 3 key metrics pulled out
- **RailOS platform teaser:** 1 paragraph + link to the RailOS page
- **CTA section:** "Talk to us about your fleet" + contact form or booking link

**Example hero rewrite:**

> **Safety-critical train protection, software-defined.**
>
> TSC builds the ATP systems that keep freight and passenger fleets running safely across Europe. Our open platform delivers ETCS and national systems in the lightest, most upgradable package on the market.
>
> [Explore our platform] [Talk to our team]

### 4.2 iEVC & ETCS Page (paused)

**Current state:** Paused — was intended as a product page for the flagship ETCS onboard unit.

**Recommendation:** Fold this into the Products page as the lead product section. The iEVC is the hardware that runs ETCS — it does not need its own page separate from the product it enables.

### 4.3 Customers / Projects Page

**Current state:** Two case studies (Lineas HLD77 and Skoda 27Ev) presented as narrative paragraphs with project details mixed into the prose.

**Problem:** The most compelling proof points are buried in body text. A visitor scanning the page cannot quickly extract the key numbers or outcomes.

**Recommended format:**
- **Hero:** "Proven across European rail networks" + subheading about fleet sizes and countries
- **Case study card for each project:**
  - Headline metric strip: e.g., "109 locomotives | 3 countries | ETCS L1 & L2"
  - Challenge section (2-3 sentences): what the customer needed
  - Solution section (2-3 sentences): what TSC delivered
  - Result section (2-3 sentences): measurable outcomes
  - Customer quote (if available)
  - Photo of the actual locomotive/installation if available
- **CTA:** "Discuss your project with our team"

**Example hero rewrite:**

> **Proven in service across Europe**
>
> From 109 freight locomotives for Lineas to next-generation electric trains for Skoda, TSC's ATP systems are running in the field. See how we deliver.

**Example case study restructure (Lineas HLD77):**

> **Lineas — ETCS retrofit for Europe's largest private freight operator**
>
> 109 locomotives | Belgium, Netherlands, Germany | ETCS Level 1 & Level 2
>
> **Challenge:** Lineas needed to equip its Class 77 fleet with ETCS to continue operating across Belgian, Dutch, and German rail networks as legacy signalling systems are phased out.
>
> **Solution:** TSC delivered a full ETCS onboard system — iEVC computer, driver machine interface, balise reader, Euroradio — with a 10-year maintenance program.
>
> **Result:** [Ask TSC for specific outcome metrics — average installation time per vehicle, uptime during rollout, fleet availability numbers.]

### 4.4 RailOS — Our Tech Page

**Current state:** A detailed technical description of the RailOS operating system.

**Problem:** Reads like an internal architecture document. Explains how RailOS works at a software level but never tells the reader why they should care.

**Recommended format:**
- **Hero:** Benefit-led headline about what RailOS enables (not what it is)
- **The problem today:** 2-3 sentences on why traditional ATP systems are rigid and expensive
- **What RailOS changes:** 3-column feature grid — "One platform, every system" / "Update, don't replace" / "Open by design"
- **How it works:** A simplified architecture diagram with plain-language labels
- **CTA:** "See RailOS in action" or "Request a technical briefing"

**Example hero rewrite:**

> **One platform for every ATP system in Europe**
>
> RailOS is the operating system that runs safety-critical train protection applications. It supports ETCS, TBL1+, PZB, KVB, and more — on a single set of hardware, upgradable by software.

### 4.5 RailOS Apps Page

**Current state:** A detailed listing of every ATP and data application with technical descriptions.

**Problem:** Product catalogue disguised as a web page. Overlaps heavily with the Products page.

**Recommended format:**
- **Hero:** Frame apps as "the applications that run on RailOS"
- **ATP applications grid:** Visual cards with icon, app name, one-line description
- **Data applications section:** Separate grouping with explanation of why data recording matters
- **Each app card should answer:** What country/system? What problem? Available now or in development?

**Example hero rewrite:**

> **Train protection applications for every European network**
>
> RailOS runs the safety-critical applications that keep trains compliant across borders. From ETCS to national systems like PZB, KVB, and TBL1+, each application is certified, field-proven, and deployable on the same hardware.

### 4.6 RailOS Devices Page

**Current state:** A list of 15+ hardware devices with brief technical descriptions.

**Problem:** Component catalogue with no hierarchy or user guidance. A visitor cannot tell which devices are essential vs optional.

**Recommendation:** Remove as a standalone page. Fold core devices into the relevant Product pages as "what's included" sections. If TSC insists on keeping the page, it needs category groupings, a system diagram, and clear labels for what is included vs optional.

### 4.7 Open RailOS / App Developer Program Page

**Current state:** Describes the open ecosystem concept and ADK.

**Problem:** TSC's single most differentiated message — no other ATP vendor offers an open platform with third-party development. But the content explains the concept without selling the vision.

**Recommended format:**
- **Hero:** Bold statement about breaking vendor lock-in
- **The problem:** Why closed, proprietary ATP systems are bad for the industry
- **The vision:** What changes when ATP is an open platform
- **For OEMs:** How the ADK lets their engineers build custom applications
- **For operators:** How an open ecosystem means more choice
- **CTA:** "Request ADK access" or "Join the developer program"

**Example hero rewrite:**

> **Train protection should not mean vendor lock-in**
>
> Open RailOS lets operators choose their applications and OEMs build their own. It is the first open development platform for safety-critical rail systems.

### 4.8 RailOS App Store Page

**Current state:** Tile-based app selection. Phase 1 is email capture only.

**Problem:** Launching an "App Store" page that is actually an email signup form risks disappointing visitors.

**Recommendation:** Merge into the Open RailOS page as a "coming soon" section. Be transparent about phase 1 being email capture. Show a visual preview.

### 4.9 Products Page

**Current state:** Lists product offerings with technical descriptions.

**Problem:** Heavy overlap with the Apps page. Products are described by what they contain technically, not by what problem they solve.

**Recommended format:** Primary product catalogue. Each product presented as a complete offering with: name, one-line value statement, hero image/diagram, key specs, supported systems, and datasheet download.

**Example hero rewrite:**

> **ATP systems engineered for the long haul**
>
> Every TSC product is built on the RailOS platform — lighter, faster to install, and upgradable by software. From onboard ETCS to trackside equipment, our systems are designed to outlast the vehicles they protect.

### 4.10 Services Page

**Current state:** Four services in brief paragraphs.

**Problem:** High-value consultative services given less space than individual device descriptions. Homologation support is a major differentiator treated as an afterthought.

**Recommended format:**
- **Hero:** Frame services as a complete lifecycle
- **4-step process visual:** Assessment > Homologation > Installation > Maintenance
- **Each service:** What it involves, typical duration, deliverable, specific CTA
- **Highlight homologation** — this is where deals get stuck

**Example hero rewrite:**

> **We do not just supply the system — we get it approved, installed, and running**
>
> From initial fleet assessment to national safety authority approval, TSC supports every stage of ATP deployment. Our team has guided ETCS homologation across Belgium, the Netherlands, and Germany.

### 4.11 About Us Page

**Current state:** Company founding story, RailOS vision, Skoda Group mention.

**Problem:** Misses the emotional and trust-building opportunity. The brand identity materials (oak, Man in the Arena, "we entrust children's lives") are far more compelling than anything in the current About page.

**Recommended format:**
- **Hero:** Identity statement
- **Founding story:** Why TSC exists (the market gap), not chronological history
- **Team credentials:** Collective experience, companies founders came from, number of engineers
- **Values section:** The four values made concrete (lead with "Care" and the children's lives line)
- **Skoda Group affiliation:** Stability and manufacturing scale
- **Trust signals:** ISO 9001, safety certifications, memberships

**Example hero rewrite:**

> **Young company. Deep roots in rail safety.**
>
> The Signalling Company was founded in 2019 by a team with decades of experience building train protection systems at Europe's largest rail OEMs. We started TSC because we believed ATP could be done differently — lighter, more open, and built to last.

### 4.12 Careers Page

**Recommendation:** Minimal page with "why work here" section drawing on brand values, current positions (link to LinkedIn), the Man in the Arena quote, and location/remote policy.

### 4.13 Contact Page

**Recommendation:** Add contextual CTAs above the form segmented by intent: "Discuss a fleet retrofit" (operators), "Explore a technical partnership" (OEMs), "Request product documentation" (all). Include physical address, phone, and map.

### 4.14 Insights & News (CMS)

**Recommendation:** Categories: Product Updates, Customer Stories, Industry Insights, Company News. Each article needs featured image, author, date, category. The Railtech Innovation Award win should be the first published article.

### 4.15 Legal / Privacy & 404

**Recommendation:** Privacy policy must be GDPR-compliant (Belgian DPA). 404 page copy they wrote is fine — "You reached the end of the tracks" works well.

---

## 5. Information Architecture — Proposed Simplification

The current document describes 17 pages. For a template-based build at this budget, consolidate to 12:

| Current structure | Proposed structure | Rationale |
|---|---|---|
| Home | **Home** | Essential |
| iEVC & ETCS (paused) | *Merge into Products* | No need for separate page |
| Customers/Projects | **Customers** | Essential — expand with structured case studies |
| RailOS Our Tech | **RailOS** (combined) | Merge tech story + apps into one platform page |
| RailOS Apps | *Merge into RailOS* | Apps are part of the platform story |
| RailOS Devices | *Merge into Products* | Devices shown as part of product offerings |
| RailOS Systems (TBD) | *Drop or merge* | Undefined scope, likely overlaps |
| Open RailOS / ADK | **Open RailOS** | Keep — key differentiator |
| RailOS App Store | *Merge into Open RailOS* | Phase 1 is just email capture |
| Products | **Products** | Essential — becomes primary product hub |
| Services | **Services** | Essential — needs expansion |
| About Us | **About** | Essential — needs trust content |
| Careers (TBD) | **Careers** | Minimal page, links to LinkedIn |
| Contact | **Contact** | Essential — needs segmented CTAs |
| Leadership (TBD) | *Merge into About* | Team section on About page |
| Insights & News | **Insights & News** (CMS) | Essential |
| Legal/Privacy | **Legal** | Essential |

**Proposed sitemap: 12 pages**
1. Home
2. RailOS (platform + apps story)
3. Products (ETCS OBU, TOBA Box, PZB, KVB, TBL1+)
4. Open RailOS (developer program + app store preview)
5. Customers (case studies)
6. Services
7. About (including leadership team)
8. Careers
9. Insights & News (CMS listing)
10. News Article (CMS template)
11. Contact
12. Legal/Privacy

---

## 6. Competitor Context

### Alstom (signalling division)

**How they frame signalling:** As foundational infrastructure — authority-driven messaging backed by decades of market leadership. Product names assume reader familiarity. Organised by market segment (Urban / Mainline / Freight) rather than by technology.

**Where TSC can differentiate:**
- **Open vs closed:** Alstom's systems are proprietary. TSC's open platform is a direct counter-position
- **Agility vs bureaucracy:** TSC is a ~100-person company that can move fast. Frame as an advantage
- **Modern architecture vs legacy:** TSC built from scratch. "No legacy code" is a real differentiator

**What TSC should avoid:** Trying to sound like Alstom. The brand identity (Man in the Arena, the oak) supports a challenger positioning — lean into it.

**General market observation:** Most rail signalling companies have poor websites. The bar is low. A well-structured, clearly written TSC website would stand out simply by being usable.

---

## 7. Call Agenda Suggestion — 18 June 2026

| Time | Topic | Key message |
|---|---|---|
| 0:00 | Thank Romain for the content | Positive framing — acknowledge the work |
| 0:05 | Overarching feedback — the 3 big themes | Shift from "what we built" to "what you get." Differentiation is missing. Structure has overlaps |
| 0:15 | ICP walkthrough — who visits each page | Show you understand their buyers |
| 0:25 | Quick wins | 3-5 things they can fix in the content doc before handoff |
| 0:35 | IA discussion | Propose the 12-page consolidation. Frame as "clearer for visitors and realistic for budget" |
| 0:45 | Page-by-page (if time allows) | Cherry-pick 2-3 pages — RailOS, Products, and Customers |
| 0:55 | Next steps | Revised content deadline, confirm sitemap, align on hero copy approach |

### Tone for the call

Romain likely wrote most of this content, or compiled it from engineers. Be constructive, not critical. Frame feedback as "here is how to make this work harder for you on the web" rather than "this does not work." He is working within constraints: tight budget, engineering-driven company, complex product, regulated industry. Acknowledge those constraints and position your feedback as helping him get the best possible result within them.

---

*Document prepared 17 June 2026.*
