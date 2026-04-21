# NEM Life — Designs

Drop the designs here. Any of the formats below work — ranked best to worst for diffing accuracy.

## Preferred (in order)

### 1. Figma share link — **strongly preferred**
Just paste the URL into chat. With the Figma MCP I can pull:
- Exact pixel values, spacing, fonts, colour tokens
- Component variants and states
- Auto-layout rules (which tell me responsive intent)
- Design variables (I can map them straight to Client-First variables)
- Screenshots per frame

Share permissions needed: `can view` on the file, or view-only link access.

Link shape: `https://www.figma.com/design/<fileKey>/<fileName>?node-id=<nodeId>`

### 2. Figma → PDF export (one PDF per page)
Good fallback if Figma sharing is a blocker. I can read PDFs directly.
Export all frames at 1x.

### 3. PNG screenshots per page per breakpoint
Acceptable. Structure:
- `home-desktop.png`, `home-tablet.png`, `home-mobile.png`
- `nem-methode-desktop.png` … etc.
- Any component specs / annotations as separate PNGs

## Folder structure (if you drop files)

```
designs/
├── figma-link.txt         ← paste the Figma URL here, one per line
├── desktop/               ← PNG/PDF exports at 1440px
├── tablet/                ← PNG/PDF exports at 834px (iPad width)
├── mobile/                ← PNG/PDF exports at 390px
├── components/            ← individual component specs (optional)
└── brand/                 ← logo, colour tokens, type specimens (optional)
```

## Once you drop them

I'll run a design-vs-live diff producing:
1. **Per-page delta report** — what's built, what's missing, what's wrong (selector-level)
2. **Responsive delta** — which breakpoints match Figma, which don't
3. **Component reuse map** — which Figma components already exist in Webflow, which need building, which are duplicates
4. **Sharpened estimate** — my current plan is based on the audit only; with designs I can tighten the hour estimates by ±10–15% on individual phases
5. **Flag list** — anything in the designs that isn't in the brief (scope creep risk), and anything in the brief that isn't in the designs (gap risk)

The diff itself is part of Phase 2 (Foundation audit) in the plan so it's already accounted for — no extra charge for running it now.
