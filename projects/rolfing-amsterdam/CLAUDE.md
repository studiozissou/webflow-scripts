# rolfing-amsterdam — Project Guide

Hosted scripts for rolfingamsterdam.nl (Webflow, EN primary, NL secondary). See `README.md` for loading, modules and checks.

## Known selectors

Rolfing Pages template (`/{en,nl}/what-is-rolfing/{slug}`), confirmed via Webflow MCP and staging DOM on 28 Oct 2026:

| Selector | What it is |
|---|---|
| `.hero-secondary_component` | Hero; becomes a 2-column grid on landing pages |
| `.hero-secondary_intro` | Intro paragraph, bound to `intro`; present only when `landing-page` is on, and used as the landing marker by the template style embed |
| `.hero-secondary_image-wrapper img` | Hero photo, bound to `photo` / `photo-alt` |
| `.section_symptoms`, `.symptoms_rich-text li` | Symptoms block |
| `.section_hero-secondary .content_updated` | "Last updated" line, in the hero under the intro since 5 Nov 2026 |
| `.section_experience`, `.section_discover`, `.section_rolfing-can-help-with`, `.section_note` | Landing blocks 1-3 and the note (5 Nov 2026), bound to `block-{1,2,3}-*` and `note-*`; between symptoms and `section_content` |
| `.section_content` | Rich text and sidebar; hidden when `content` is empty (landing pages) |
| `.section_usp`, `.section_testimonial-large`, `.section_about-janco` | Copies of the Home sections |
| `.testimonials-slider_wrapper` | Wraps the slider instance; hidden on landing pages |
| `.faq_list details.faq_item` > `summary.faq_summary` | Native FAQ with Question / Answer microdata; `faq-accordion.js` targets it |
| `.section_related .related_item a` | Related cards |

## Template gotchas

- Rolfing Pages is at Webflow's 30-custom-field cap (5 Nov 2026). New slots need an old field retired first; `block-3-photo` has no alt field, so its alt falls back to the block 3 heading.
- "Field is set" visibility can't be bound through MCP (only Switch fields), so the landing blocks, their photos and `section_content` hide through the style embed on `.w-dyn-bind-empty`, the class Webflow puts on an element bound to an empty field.

- Landing-only blocks are hidden by the style embed at the top of `section_hero-secondary` and shown with `:has(.hero-secondary_intro)`. MCP could bind visibility on the intro paragraph only; block-level CMS visibility bindings were rejected (`[Conflict] … component map`). Replace with native conditional visibility in the Designer when convenient.
- Visibility bound to a field removes the element from the published DOM (no `w-condition-invisible`).
