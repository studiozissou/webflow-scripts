# Changeset — nem-report-webflow-template

> ## ✅ APPLIED — do not apply again
>
> Applied 2026-09-02 via `n8n_update_partial_workflow` (`Build HTML` only; the workflow
> stayed active). `./verify.sh` exits 0: both workflows IN SYNC, every invariant green,
> including the two this changeset added. No re-baseline was needed — the committed
> snapshot already carried the template-filling node.
>
> Still open from this README: step 3, one live `/verify` with the PDF opened by eye
> (no `Lorem ipsum`, olive header with logo, Lato body). The drift checker cannot see the
> published template, so that check is manual. The three "Before go-live" items stand.

**Spec:** `../../specs/nem-verify-report-email-and-pdf-branding.md` (PDF template half)
**Prepared:** 2026-09-02
**Applies to:** `/verify` (`uKkMgMYoH5nOLoCR`), node `Build HTML` only
**Status:** APPLIED to live 2026-09-02 (verify.sh exit 0)

## What

`Build HTML` stops writing its own Georgia document. It fetches the published Webflow
report template — `https://nem-life-1.webflow.io/report-pdf-template`, the page Will and
Alex design in the Designer — fills every `data-slot`, makes the page PDF-safe, and hands
the result to `Render PDF` unchanged in shape (`html` + `reportText` + the profile fields).

The template is fetched **per report**, so a Designer edit plus publish changes the next
PDF with no n8n paste. The slots doc (`../../build/report-template-slots.md`) described a
copy-and-paste export instead; fetching won because the exported page carries 67 kB of
site CSS by hashed CDN URL that changes on every publish — a pasted copy would be stale
within a day.

What the node does to the fetched page:

| Step | Why |
|---|---|
| Fills `first-name`, `date` (Dutch long form, Europe/Amsterdam), `intro-line` | The cover block |
| Replaces each of the five section placeholders with one `<p>` per blank line, carrying the placeholder's class | The Designer's paragraph styling applies to generated paragraphs; the slot moves to a wrapper `<div data-slot>` so sibling paragraphs get spacing |
| Empty intro line → removes every element with `data-slot-wrap="intro-line"` (the spacer above and the styled wrapper) | No empty rule, no stray gap — the block can ship before Alex's copy exists |
| Strips every `<script>` | The WebFont loader, jQuery and `init.js` have no place in a PDF and can stall the renderer |
| Strips `loading="lazy"` | PDFShift never scrolls, so lazy images below the fold stay blank |
| Injects `report-fonts.css` (Lato 400/400i/700, Montserrat 600 as base64 woff2) by jsDelivr `<link>` | PDFShift loads external font files unreliably; a render-blocking stylesheet with the faces inline is present before first paint |
| Injects print CSS: `@page A4`, `break-inside: avoid` on sections, `break-after: avoid` on `h2`, `print-color-adjust: exact` | Sections do not split across pages, headings do not strand, the olive header keeps its background |
| Throws when any required slot (or the intro wrapper) is missing | Placeholder copy must never reach a reader; the execution fails visibly instead |

Every dynamic value goes through `esc()`.

## What changed on the Webflow page

Two attributes, already published to the staging domain on 2026-09-02:

- the `spacer-large` above the intro block: `data-slot-wrap="intro-line"`
- the `hero_subheading-wrap` around the intro paragraph: `data-slot-wrap="intro-line"`

Rules for whoever edits the page next: keep every `data-slot` from the slots doc; keep the
intro wrapper free of nested `<div>`s (the remover matches to the first closing tag); do
not add nav, footer or scripts the PDF should carry.

## Order to apply in

Before starting: `npm run check:nem-drift` — expect drift ONLY in `Build HTML`. Any other
drift means live has moved since this changeset was prepared: stop and re-snapshot first
(`--write`), then rebuild this changeset on top. n8n keeps no version history, so a stale
snapshot is a broken rollback point.

1. **`/verify` → `Build HTML`** — replace the node's code with `build-html.jsCode.js`.
2. **Verify** — `./verify.sh` from this directory: exits 0 when live matches the committed
   snapshot and every invariant holds.
3. **One live report** — trigger a `/verify` for a test profile and open the PDF: olive
   header with the logo, Lato body, the five labelled sections, "Wat nu" in its grey block,
   the contact line, the disclaimer footer. No `Lorem ipsum` anywhere.

## Before go-live

- **Template URL** is the staging domain. When the new site goes live on `nemlife.com`,
  change `TEMPLATE_URL` in `Build HTML` (and this file) to the live page, or the PDF keeps
  reading a staging page that may be unpublished.
- **Footer domain** reads `nemmatters.com` (the email sender domain). Every canonical and
  schema reference for the site is `nemlife.com`. Alex to confirm which the footer shows;
  it is fixed copy on the page, not a slot.
- **Contact address** in the "Heb je vragen" line is `hallo@nemmatters.com`. Alex to confirm.

## Files

| File | Role |
|---|---|
| `build-html.jsCode.js` | Full replacement for `/verify` → `Build HTML` |
| `verify.sh` | Asserts live matches the snapshot; exits 1 on drift |
| `../../../../src/report-fonts.css` | The embedded faces the node links to, by commit hash |
| `../../../../../../tests/nem/fixtures/report-pdf-template.html` | The published page as captured, the fixture the unit tests fill |

`build-html.jsCode.js` is generated from the committed snapshot, and
`tests/nem/nem-build-html.test.js` asserts it stays byte-identical — edit the snapshot,
regenerate, never edit this file by hand.
