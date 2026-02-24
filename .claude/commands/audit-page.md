Run a comprehensive audit of a specific Webflow page.

## Usage
Provide: page URL and/or the Barba namespace for the page.

## Audit areas (run all agents)

### Performance audit (perf agent)
- Script load order and weight
- Animation frame budget
- Images: lazy loading, formats, sizes

### SEO audit (seo agent)
- Title, meta description, heading hierarchy
- Open Graph tags
- JSON-LD schema presence
- Canonical tag

### Accessibility audit (qa agent)
- Keyboard navigation
- Focus management
- ARIA labels
- Colour contrast

### UX review (ux-researcher agent)
- User flow clarity
- CTAs
- Mobile usability

### Content review (content agent)
- Heading copy
- CTA copy
- Alt text

## Output
A unified audit report saved to `.claude/research/audit-<page-slug>-<YYYY-MM-DD>.md` with:
- Overall score by category
- Critical issues (must fix)
- Recommendations (should fix)
- Nice-to-haves
