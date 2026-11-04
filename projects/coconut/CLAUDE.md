# coconut — Project Guide

## What this is
Schema markup and snippets for https://www.getcoconut.com/ (Webflow site `6069af2a39978132d0155fd7`, use the `webflow-2` MCP slot). No hosted scripts yet.

## Schema files
- `schema/knowledge-hub-template.html`: article template, Page Settings > Custom code > Head (after Finsweet and the table styles). Schema markup field empty.
- `schema/author-profile-template.html`: Authors template (`/author/{slug}`), Custom code > Head. Schema markup field empty.
- `schema/authors-index.json`: static `/authors` page, Page Settings > Schema markup. Plain JSON, so the MCP writes it.
- The Schema markup API rejects `{{wf ...}}` binding tokens ("must be valid JSON"), but `set_page_freeform_code` accepts them, so template schema lives in head code. Keep exactly one BlogPosting per article.
- The BreadcrumbList blocks in the two template files are near-copies. Change both together.
- Bindings can't be conditional: an empty CMS field renders `""`. Author `schema-type` is `Person` or `Organization` (The Coconut Team).

## Known selectors
- Article byline: `[data-author-byline]` (element `…23a7` on template `65afe5d79038933a4ba8d27a`), classes `avatar-wrapper horizontal s-m-y-24 is-byline`, between `h1.blog-heading` and `.link-icon` in `header.blog-hero-block`.
- Byline name link: `[data-author-byline] a` (bound to Author › Name, links to the Author page).
- Profile: `section.section_author-header`, `.author-header_component`, `section.section_author-articles .author-articles_list`.
- Index: `section.section_authors .authors_list .authors_card`.
