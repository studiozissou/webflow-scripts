# studio-zissou — Project Guide

## What this is
Custom scripts for Studio Zissou's Webflow site. Vanilla ES2022+, no build step.

## Files
- `global.js` — site-wide utilities (external link security, copyright year, form tracking)
- `quality-cards.js` — scroll-triggered reveal cards with corner pins, dashed SVG connectors, and ScrollTrigger animation
- `work-clients.js` — work/clients section interaction

## Testing

Playwright acceptance tests run against the staging site (URL from `STAGING_URL` in `.env.test`).

### Running tests
```bash
npm run test:sz                # all acceptance tests
npm run test:sz:smoke          # smoke suite only
npm run test:sz:a11y           # accessibility suite only
npm run test:sz:acceptance     # acceptance suite only
npm run test:report            # open last HTML report
```

### Test suites
- `tests/acceptance/sz-quality-cards.spec.js` — quality cards scroll reveal, corner pins, SVG connectors
- `tests/acceptance/sz-work-clients.spec.js` — work/clients section
