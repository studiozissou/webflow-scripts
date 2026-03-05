# Interaction and Layout Specs — Studio Zissou
**Extracted:** 2026-03-05
**Source:** Figma SZ-Web-Dev-v1.2 (node 1:17)

---

## hero-background (1:19, 1:20)

### Interactions
- **Trigger:** None annotated
- **Action:** —
- **Animation:** —

### Layout
- **Type:** Absolute — two overlapping SVG vector shapes
- **Notes:** Two organic blob/arch shapes layered. 1:19 appears to be a darker silhouette, 1:20 a lighter outline. Both are full-width vectors sitting behind the hero text. Likely decorative background elements.

---

## hero-title (within page-level composition)

### Interactions
- **Trigger:** None annotated
- **Action:** —
- **Animation:** —

### Layout
- **Type:** Absolute positioning
- **Notes:** "Studio Zissou" rendered as large display text. "Designed for warmth. Engineered for depth." tagline below. Text appears to be PP Rader Thin at display size.

---

## nav-compass (1:24)

### Interactions
- **Trigger:** None annotated — likely click/tap on Dive, Surface, Contact labels
- **Action:** Unknown — possibly anchor scroll or page navigation
- **Animation:** Compass/dial element (gold/yellow) rotates between nav items (inferred from visual)

### Layout
- **Type:** Absolute — three text labels + central compass image
- **Gap:** ~68px between labels (reference only)
- **Padding:** —
- **Notes:** Nav items: "Dive" (top), "Surface" (bottom-left), "Contact" (bottom-right). Central element is a rotated compass/dial graphic (Group 135). The compass is rotated -90deg. Labels are PP Rader Regular 20px.

---

## intro-text (1:31)

### Interactions
- **Trigger:** None annotated
- **Action:** —
- **Animation:** —

### Layout
- **Type:** Single text block, right-aligned
- **Notes:** PP Rader Regular 14px, black (#000000). Two paragraphs: "Studio Zissou is a specialist digital partner..." and "We work with teams who need clarity..."

---

## work-clients (1:38)

### Interactions
- **Trigger:** Hover on client name row (inferred from screenshot showing Carsa with preview image)
- **Action:** Shows project screenshot preview card (rounded corners, 14px radius)
- **Animation:** Not annotated — preview card appearance behaviour unclear

### Layout
- **Type:** Absolute — stacked client name rows
- **Gap:** ~80px between client rows (reference only)
- **Padding:** Left margin ~6.25% from edge
- **Notes:** Each client name rendered in PP Rader Thin 90px uppercase with bracket characters 〔 〕. Carsa has an ↗ arrow link icon. Client names: Carsa, Skye High, Temper, Ready Hit Play, Compare Ethics. Preview image card is 696x508px with 14px border-radius, positioned right of centre. Font feature settings include stylistic sets for bracket rendering.

---

## decorative-ovals (1:125)

### Interactions
- **Trigger:** None annotated
- **Action:** —
- **Animation:** —

### Layout
- **Type:** Absolute — 5 rotated oval/pill group elements in a horizontal row
- **Gap:** ~89px between ovals (reference only)
- **Notes:** Each oval is a Group element (~236x144px), all rotated -90deg. These appear to be decorative separator/spacer elements between the work section and the quality section. Background #EBEDE6.

---

## respect-for-quality (1:219)

### Interactions
- **Trigger:** None annotated
- **Action:** —
- **Animation:** —

### Layout
- **Type:** Absolute positioning within section
- **Notes:** Section heading "Respect for Quality" in PP Rader Thin 90px uppercase. Body text at PP Rader Regular 40px. Three card-like elements stacked vertically:
  1. **Interfaces** — "that are carefully tuned"
  2. **Code** — "that is readable, maintainable, and intentional"
  3. **Decisions** — "informed by data but shaped by emotional context"

  Each card is a rounded rectangle (~814x202px) with corner pin elements (small circles at 4 corners) and a dashed line connecting the label to the description. Cards use PP Rader Regular 28px uppercase for labels, 20px for descriptions. Measurement ruler on left edge (50% opacity) shows 2000px section height.

---

## contact-cta (1:327)

### Interactions
- **Trigger:** "Get in touch →" link (inferred as click target)
- **Action:** Unknown — likely scrolls to or activates the form
- **Animation:** Not annotated

### Layout
- **Type:** Absolute — two-column layout
- **Left column:** Heading "Let's Talk It Through" (PP Rader Thin 90px, 389px wide) + body paragraph + "Get in touch →" CTA
- **Right column:** Postcard-style contact form
- **Padding:** Left column starts at 81px from left edge
- **Form card:** 817x607px, 1px solid #2A2A2A border, 5px radius, 90% opacity background
- **Form structure:**
  - Header: Three cells with rounded top corners (Destinazione: STUDIO ZISSOU, Provienza: INTERNET, Date: 12/08/2025)
  - Large "SZ" monogram (PP Rader Bold ~88px, colour #EBEDE6 — inverse)
  - Fields: Name, Email, Message (PP Rader Italic 24px labels)
  - Message area has 4 dashed underlines for multi-line input
  - Vertical rotated text along left side of form body
  - Cell dividers between header sections
- **Notes:** The form is designed as a vintage postcard/telegram aesthetic. Italian labels (Destinazione, Provienza, Data della presentazione) reinforce the "Zissou" brand identity.

---

## footer (within page-level composition)

### Interactions
- **Trigger:** None visible
- **Action:** —
- **Animation:** —

### Layout
- **Type:** Not extracted as separate node
- **Notes:** Footer visible in full-page screenshot at bottom. Contains "© SZ" left, "Privacy · Terms" right. Large SZ logo/graphic in centre with trumpet/horn shape. Minimal — likely a simple flex row.
