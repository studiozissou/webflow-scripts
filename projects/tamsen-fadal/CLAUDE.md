# tamsen-fadal — Project Guide

## What this is
Custom scripts for https://www.tamsenfadal.com/ — Tamsen Fadal's brand, lead generation, and education site. Built on Webflow, vanilla ES2022+, no build step.

## Testing

Playwright acceptance tests run against the live production site.

### Running tests
```bash
npm run test:sz                # runs all Playwright acceptance tests (shared config)
```

### Test suites
- `tests/acceptance/tf-newsletter.spec.js` — newsletter page: H1, signup forms, input fields, submit button
- `tests/acceptance/tf-contact.spec.js` — contact page functional checks
