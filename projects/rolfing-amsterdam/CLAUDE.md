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
| `.content_updated` | "Last updated" line above the content |
| `.section_usp`, `.section_testimonial-large`, `.section_about-janco` | Copies of the Home sections |
| `.testimonials-slider_wrapper` | Wraps the slider instance; hidden on landing pages |
| `.faq_list details.faq_item` > `summary.faq_summary` | Native FAQ with Question / Answer microdata; `faq-accordion.js` targets it |
| `.section_related .related_item a` | Related cards |

## Template gotchas

- Landing-only blocks are hidden by the style embed at the top of `section_hero-secondary` and shown with `:has(.hero-secondary_intro)`. MCP could bind visibility on the intro paragraph only; block-level CMS visibility bindings were rejected (`[Conflict] … component map`). Replace with native conditional visibility in the Designer when convenient.
- Visibility bound to a field removes the element from the published DOM (no `w-condition-invisible`).
