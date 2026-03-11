# Spec: site-review-stage-5-code-review

**Status:** Ready to Build
**Project:** webflow-scripts
**Priority:** P1
**Complexity:** Complex
**Author:** Claude (Opus)
**Created:** 2026-03-11
**Depends on:** site-review-stage-2-fetch-discovery
**Blocks:** Stage 6 (runner + reports)

---

## Summary

Extract custom code from pages via Playwright, then send to Claude API for quality analysis and refactoring suggestions.

## Deliverables

| File | Purpose |
|------|---------|
| `tools/site-review/checks/code-review.js` | Playwright extraction + Claude API review |
| `tests/site-review/checks/code-review.test.js` | Unit test with mocked extraction + API |

## How It Works

1. **Extract** (Playwright): Visit each page in headless Chromium, extract:
   - Inline `<script>` content (not CDN/library sources)
   - Inline `<style>` content
   - Webflow embed blocks (`[data-wf-*]` custom code areas)
   - Custom `<div>` embeds containing code

2. **Filter**: Skip known CDN/library scripts (GSAP, jQuery, Finsweet, Lenis, etc.) by checking `src` URLs against a known-library list in config.

3. **Review** (Claude API): Send extracted code to `claude-sonnet-4-6` with a review prompt. The prompt asks for:
   - Code quality issues
   - Unused or dead code
   - Performance concerns (blocking scripts, layout thrash, etc.)
   - Security risks (inline eval, exposed keys, XSS vectors)
   - Refactoring suggestions (modernise syntax, reduce duplication)

4. **Parse response**: Claude returns structured findings, mapped to `createFinding()`.

## API Details

- Model: `claude-sonnet-4-6` (fast, ~$0.02/page)
- Max tokens: 4096
- Rate limit: 2s delay between calls
- Uses `@anthropic-ai/sdk` (already installed), follows pattern from `scripts/webflow/generate-json.js`

## Known Library Filter (config)

```js
const KNOWN_LIBRARIES = [
  'gsap', 'scrolltrigger', 'splittext', 'jquery', 'finsweet',
  'lenis', 'barba', 'swiper', 'webflow', 'google-analytics',
  'gtm', 'hotjar', 'crisp', 'intercom'
];
```

## Test Gate

```bash
node --test tests/site-review/checks/code-review.test.js
```

Unit test passes with mocked Playwright page + mocked Anthropic response. Then manual test: run against one real page, review the AI output quality.

## Barba Impact

N/A — standalone CLI tool.
