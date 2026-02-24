Generate JSON-LD structured data schema for a Webflow page or site.

## Usage
Provide: client name, page type (home / about / case-study / blog-post / team / faq / product), and any known data (business name, URL, logo, social links, etc.)

## Steps
1. Use the `schema` agent to generate the appropriate JSON-LD.
2. For unknown values, use `"FILL_IN"` as a placeholder.
3. Output the complete `<script type="application/ld+json">` block.
4. Specify where to place it in Webflow: Site Settings > Head Code (site-wide) or Page Settings > Head Code (page-specific).
5. Save the schema JSON to `.claude/schema/<client>-<type>-<YYYY-MM-DD>.json`.
6. Provide a Google Rich Results Test link for the user to validate.

## Common schema combos
- Home page: `Organization` + `WebSite`
- About page: `Organization` + `Person` (team members)
- Case study / portfolio: `CreativeWork`
- Blog post: `Article`
- FAQ section: `FAQPage`
- Contact / location: `LocalBusiness`
