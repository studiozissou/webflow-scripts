# studio-zissou — Project Guide

## What this is
Custom scripts for Studio Zissou's Webflow site. Vanilla ES2022+, no build step.

## Testing

Playwright acceptance tests run against the staging site (URL from `STAGING_URL` in `.env.test`).
Test scripts are in package.json (`test:sz*`).
