# coconut — Project Guide

## What this is
Schema markup and snippets for https://www.getcoconut.com/ (Webflow site `6069af2a39978132d0155fd7`, use the `webflow-2` MCP slot). No hosted scripts yet.

## Schema files
- `schema/knowledge-hub-template.html`: article template, Page Settings > Schema markup. The head custom code holds no JSON-LD.
- `schema/author-profile-template.html`: Authors template (`/author/{slug}`), Page Settings > Schema markup.
- `schema/authors-index.json`: static `/authors` page. Plain JSON, so the MCP can write it.
- The Webflow API rejects schema containing `{{wf ...}}` binding tokens ("must be valid JSON"), so the two template files are pasted in the Designer.
- The BreadcrumbList blocks in the two template files are near-copies. Change both together.
- Bindings can't be conditional: an empty CMS field renders `""`. Author `schema-type` is `Person` or `Organization` (The Coconut Team).

## Known selectors
- Article byline: `[data-author-byline]` (element `…23a7` on template `65afe5d79038933a4ba8d27a`), classes `avatar-wrapper horizontal s-m-y-24 is-byline`, between `h1.blog-heading` and `.link-icon` in `header.blog-hero-block`.
- Byline name link: `[data-author-byline] a` (bound to Author › Name, links to the Author page).
- Profile: `section.section_author-header`, `.author-header_component`, `section.section_author-articles .author-articles_list`.
- Index: `section.section_authors .authors_list .authors_card`.
