# Spec: nem-zelftest-quiz-data

**Project:** nem-life
**Created:** 2026-06-03
**Status:** Planning
**Slug:** `nem-zelftest-quiz-data`

## Summary

Add a `quiz-data.js` module to the nem-life project that reads quiz questions and result bands from hidden CMS collection lists on the Zelftest template page and exposes them on `window.__quizData`. A React code component (built separately) will consume this data via the `quizDataReady` custom event.

## Background

The Zelftest (self-test) is Phase 2 of the nem-life project. Alex has a dedicated brief for the quiz UI (React code component). This module is the data bridge between the Webflow CMS and the React component. The CMS collection lists are already set up in the Webflow Designer with `data-quiz` and `data-field` attributes.

## Requirements

1. Read questions from `[data-quiz="questions"] .w-dyn-item` elements
2. Read results from `[data-quiz="results"] .w-dyn-item` elements, extracting:
   - `[data-field="title"]` → `heading` (string)
   - `[data-field="description"]` → `body` (string)
   - `[data-field="min"]` → `min` (integer)
   - `[data-field="max"]` → `max` (integer)
3. Expose data as `window.__quizData = { questions: [...], results: [...] }`
4. Dispatch `quizDataReady` event on `window` so the React component can listen
5. Early-return if no `[data-quiz="questions"]` element exists (module runs on all pages via init.js)

## Changes from user's original script

| Change | Reason |
|--------|--------|
| Wrap in IIFE `(() => { ... })();` | Project convention |
| `const`/`let` instead of `var` | Modern JS, project convention |
| Add `const DEBUG = false;` | Project convention — guarded logging |
| Add early-return guard | Module loads on all pages, only runs on zelftest |
| Remove `DOMContentLoaded` wrapper | `init.js` already handles DOM readiness |
| Add `DEBUG && console.log(...)` for data extraction | Debugging aid |

## Architecture

```
[Webflow CMS] → [hidden collection lists on page]
                        ↓
              quiz-data.js reads DOM
                        ↓
              window.__quizData = { questions, results }
                        ↓
              dispatches "quizDataReady" event
                        ↓
              React code component listens and renders quiz
```

## Files Affected

1. **`projects/nem-life/src/quiz-data.js`** — NEW (~30 LOC)
2. **`projects/nem-life/src/init.js`** — Add `'quiz-data.js'` to modules array (line 31)

## Implementation

### quiz-data.js

```js
/**
 * Quiz Data — reads questions and result bands from CMS collection lists
 * and exposes them on window.__quizData for the React quiz component.
 */
(() => {
  const DEBUG = false;

  const questionWrap = document.querySelector("[data-quiz='questions']");
  if (!questionWrap) return;

  const qItems = questionWrap.querySelectorAll('.w-dyn-item');
  const questions = [];
  qItems.forEach((el) => { questions.push(el.textContent.trim()); });

  const rItems = document.querySelectorAll("[data-quiz='results'] .w-dyn-item");
  const results = [];
  rItems.forEach((el) => {
    const name = el.querySelector("[data-field='title']");
    const desc = el.querySelector("[data-field='description']");
    const min = el.querySelector("[data-field='min']");
    const max = el.querySelector("[data-field='max']");
    results.push({
      min: parseInt(min?.textContent, 10) || 0,
      max: parseInt(max?.textContent, 10) || 0,
      heading: name?.textContent?.trim() || '',
      body: desc?.textContent?.trim() || '',
    });
  });

  window.__quizData = { questions, results };
  window.dispatchEvent(new Event('quizDataReady'));

  DEBUG && console.log('[quiz-data]', window.__quizData);
})();
```

### init.js change

Add `'quiz-data.js'` to the modules array (after `'read-more-expand.js'`).

## Barba Impact

N/A — no Barba transitions in nem-life.

## Verify Loop

### Pass/fail criteria
- `window.__quizData` exists and is an object with `questions` (array) and `results` (array)
- `questions.length > 0` (at least one question extracted)
- `results.length > 0` (at least one result band extracted)
- Each result has `min` (number), `max` (number), `heading` (string), `body` (string)
- `quizDataReady` event fires on `window`
- No console errors on the zelftest page

### Reproduction steps
1. Navigate to the Zelftest template page on staging
2. Open browser console
3. Check `window.__quizData` — should contain questions and results
4. Reload and listen for `quizDataReady` event

### Tier mapping
- **Tier 1 (Auto):** Playwright checks for `__quizData` presence, structure, and no console errors
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (Manual):** Verify React component actually receives and renders the data (not built yet)

### Regression scope
- Other modules must continue working on all pages (early-return guard prevents interference)
- No GSAP, ScrollTrigger, or Swiper dependencies — minimal risk

## Task Breakdown

| # | Task | Agent | Est. |
|---|------|-------|------|
| 1 | Create `quiz-data.js` | code-writer | 5 min |
| 2 | Register in `init.js` modules array | code-writer | 1 min |
| 3 | Run acceptance tests | qa | 5 min |

### Parallelisation Map
- **Sequential:** Tasks 1 → 2 → 3 (each depends on prior)
- **No parallel streams** — too small for parallelisation
- **Worktrees:** No
- **Agent teams:** No

## Acceptance Tests

See `tests/acceptance/nem-zelftest-quiz-data.spec.js`

1. `quiz data wrapper exists on zelftest page` — `[data-quiz="questions"]` present in DOM
2. `window.__quizData is populated` — object exists with questions and results arrays
3. `questions array has items` — length > 0
4. `results array has correct shape` — each item has min, max, heading, body
5. `no console errors on zelftest page` — standard error check
6. `quiz-data does not run on non-quiz pages` — `__quizData` is undefined on homepage
