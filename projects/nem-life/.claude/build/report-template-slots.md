# NEM Test — report template: what to build in Webflow

Companion to `report-template-example.html` (open it in a browser to see the intended
result). The Webflow page is a **design surface only** — once the design is signed off it
gets exported to HTML/CSS and pasted into the `Build HTML` node of the `/verify` n8n
workflow. The PDF generator never fetches the live page.

## Page setup

- New static page, e.g. `/rapport-template`, **excluded from sitemap + `noindex`**.
- No nav, no footer, no site-wide components — the export must be the report and nothing else.
- One wrapper div (`report_wrap`, max-width 640px, centred). 640px and line-height 1.6 are
  already proven for long-form reading in the current PDF; keep both.

## Slots

Every dynamic value is an element with a **custom attribute** `data-slot`. Name, don't
style, with it: the attribute is what the n8n code finds and replaces.

| `data-slot` | Webflow element | Filled with | Fixed / dynamic |
|---|---|---|---|
| `logo` | Image | NEM Life logo | fixed |
| `title` | Heading H1 | `Jouw NEM Test rapport` / `Your NEM Test report` | locale |
| `first-name` | Text Span inside a paragraph | reader's first name | dynamic |
| `date` | Text Span | generation date, Dutch long form (`1 september 2026`) | dynamic |
| `intro-line` | Div Block with one Paragraph inside | intro line for the conclusion key | dynamic, **can be empty** |
| `opening` | Div Block | report section 1 | dynamic, multi-paragraph |
| `reaction` | Div Block | report section 2 | dynamic, multi-paragraph |
| `origin` | Div Block | report section 3 | dynamic, multi-paragraph |
| `cost` | Div Block | report section 4 | dynamic, multi-paragraph |
| `closing` | Div Block | report section 5 | dynamic, multi-paragraph |
| `label-opening` … `label-closing` | Heading H2 | optional section labels | fixed, optional |
| `disclaimer` | Paragraph | fixed disclaimer | fixed |
| `site-url` | Paragraph | `nemmatters.com` | fixed |

Anything without a `data-slot` is treated as fixed template copy and ships as designed.

## Rules that matter

1. **The five sections are Div Blocks, not paragraphs.** The model returns plain text with
   blank lines between paragraphs; the workflow turns each blank line into its own `<p>`
   and drops the run into the div. Put two dummy paragraphs inside each div in Webflow so
   the paragraph styling (margin, measure) exists in the export.
2. **Style the paragraph, not the section.** Give the child paragraph its own class
   (`report_section-body` in the example) — the exported CSS must carry `p { … }` rules,
   because the real paragraphs are generated, not the ones you drew.
3. **No greeting line.** No `Beste {firstName},` — the first name appears once on the cover
   and once inside `opening`, where the model puts it. That was a defect in the old PDF.
4. **The intro line block can be empty** and must then render nothing at all — no gap, no
   empty rule. Design it so it can be removed cleanly (own div, margin on the div itself).
   That is what `data-slot-optional="true"` marks.
5. **Section labels are your call.** The current PDF has none — the five sections read as one
   continuous letter. Keep them if the design wants signposting; if not, delete the H2s.
   The model returns no headings either way, so nothing breaks.
6. **Fonts: only locally-installed families are safe.** PDFShift renders through headless
   Chrome with no webfont loading, so Lato/Montserrat will silently substitute. The current
   PDF uses Georgia for body and Montserrat-with-Arial-fallback for headings. Design in the
   real brand fonts if you want, but expect the export CSS to be swapped to a safe stack
   before it goes in the workflow — or confirm webfont loading with PDFShift first.
7. **Page breaks can't be set in the Designer.** Add one Embed at the bottom of the page
   with `@page { size: A4; margin: 0 }`, `break-inside: avoid` on sections and
   `break-after: avoid` on headings, so a heading can't strand at the foot of a page.
8. **Colours from Webflow variables**, not from the design PNGs. Values in the example come
   from `.claude/build/figma-tokens.json`: text `#292828`, olive `#706d56`, grey `#9f9c8b`,
   light grey `#ecebe8`, accent `#fafa7d`. One accent, used sparingly.

## Not this template

The covering email is a separate document in a different dialect (tables, inline styles,
~600px, no web fonts). Do not reuse the report HTML as the email body — that delivers the
whole report twice, once unstyled.
