Generate JSON-LD structured data schema for a Webflow page or site.

## Usage
Provide: client name, page type (home / about / case-study / blog-post / team / faq / product), and any known data (business name, URL, logo, social links, etc.)

## Steps
1. **Scan live site** — fetch the live URL and extract all verifiable data: company name, logo URLs, social links, contact info, legal text (footer), meta descriptions, existing JSON-LD, and page content. The live site is the **source of truth**.
2. **Scan secondary sources** — search the web for Companies House, Crunchbase, social profiles, Wikipedia, etc. to supplement. Flag anything from secondary sources that contradicts or isn't present on the live site.
3. **Generate schema** — use the `schema` agent to produce the JSON-LD. Every field must be backed by the live site or a clearly cited secondary source. Do NOT include unverifiable claims (employee counts, office addresses, support hours, founders) unless they appear on the live site.
4. **Validate against live site** — compare every field in the generated schema against live site content. Fix any mismatches (e.g. wrong social URLs, description that doesn't match site copy, legalName that doesn't match footer). Run a structural JSON + Schema.org spec validation.
5. Output the complete `<script type="application/ld+json">` block ready to paste.
6. Specify where to place it in Webflow: Site Settings > Head Code (site-wide) or Page Settings > Head Code (page-specific).
7. Save the schema to `projects/<client>/.claude/schema/<type>.json`.
8. Provide a Google Rich Results Test link for the user to validate after deploying.
9. **Rich Results feedback loop** — when the user confirms the schema is live:
   a. URL-encode the page URL and open `https://search.google.com/test/rich-results?url=<encoded-page-URL>` using Chrome DevTools MCP (`navigate_page`).
   b. Wait 30 seconds for the test to run, then poll with `evaluate_script` every 3 seconds checking for the results container (`.result-card` or test-complete indicator), up to 60 seconds after the initial wait.
   c. Take a screenshot of the results page.
   d. Extract the results using `evaluate_script` — read detected schema types, errors, warnings, and valid items from the DOM.
   e. Analyse the results: map each error/warning back to the generated schema, identify missing required fields, invalid values, or structural issues.
   f. If errors or warnings exist, update the schema JSON to fix them, save the updated file, and output the corrected `<script>` block.
   g. Ask the user to upload the new version and repeat from step 9a when they confirm it's live. Continue until the test passes clean.

## Common schema combos
- Home page: `Organization` + `WebSite`
- About page: `Organization` + `Person` (team members)
- Case study / portfolio: `CreativeWork`
- Blog post: `Article`
- FAQ section: `FAQPage`
- Contact / location: `LocalBusiness`
