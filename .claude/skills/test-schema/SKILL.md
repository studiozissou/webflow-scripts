---
name: test-schema
description: Validate JSON-LD structured data via Google Rich Results Test using Chrome DevTools MCP. Use this skill whenever the user says "test schema", "validate schema", "check structured data", "run rich results test", or after deploying schema markup to a live site. Also triggers on /test-schema.
---

<objective>
Open the Google Rich Results Test in Chrome, run validation against a live URL, extract the results, and if errors exist — fix the schema file, ask the user to re-deploy, and loop until clean.
</objective>

## Prerequisites

- Chrome DevTools MCP must be connected (call `list_pages` to verify)
- The schema must already be deployed to a live/published URL
- Know the schema file path (e.g. `projects/<client>/schema/site-wide.html`)

## Workflow

### 1. Open the Rich Results Test

```
navigate_page → https://search.google.com/test/rich-results?url=<URL-encoded-page-URL>
```

URL-encode the full page URL (e.g. `https%3A%2F%2Fwww.carsa.co.uk%2F`).

### 2. Wait for results

The test takes time to fetch and parse the page.

1. Wait 30 seconds (use `evaluate_script` with a setTimeout Promise):
   ```js
   async () => { await new Promise(r => setTimeout(r, 30000)); return 'waited'; }
   ```
2. Then poll every 3 seconds for up to 60 seconds, checking if results have loaded:
   ```js
   () => {
     const cards = document.querySelectorAll('[class*="result"]');
     const body = document.body.innerText;
     return {
       hasResults: body.includes('items detected') || body.includes('No items detected') || body.includes('Couldn'),
       bodySnippet: body.substring(0, 2000)
     };
   }
   ```
3. Once results are detected (or max wait exceeded), proceed to extraction.

### 3. Screenshot the results

```
take_screenshot → capture the results page for visual reference
```

### 4. Extract results from the DOM

Use `evaluate_script` to pull structured results:

```js
() => {
  const body = document.body.innerText;
  const errors = [];
  const warnings = [];
  const valid = [];

  // Look for error/warning/valid items in the page text
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  let section = '';
  for (const line of lines) {
    if (line.match(/error/i) && line.match(/\d+ item/i)) section = 'errors';
    else if (line.match(/warning/i)) section = 'warnings';
    else if (line.match(/valid/i) && line.match(/item/i)) section = 'valid';

    if (section === 'errors' && !line.match(/error/i)) errors.push(line);
    if (section === 'warnings' && !line.match(/warning/i)) warnings.push(line);
    if (section === 'valid' && !line.match(/valid.*item/i)) valid.push(line);
  }

  return {
    fullText: body.substring(0, 5000),
    errors: errors.slice(0, 50),
    warnings: warnings.slice(0, 50),
    valid: valid.slice(0, 50),
    detectedTypes: (body.match(/(?:Organization|WebSite|WebPage|Product|Vehicle|Article|FAQPage|BreadcrumbList|LocalBusiness|Event|Person|CreativeWork|VideoObject|HowTo|QAPage)/g) || [])
  };
}
```

### 5. Analyse results

For each error or warning:
- Map it back to the specific property/node in the schema file
- Identify the fix (missing required field, invalid value, unrecognised property, wrong type)
- Check against Schema.org vocabulary for correctness

### 6. If errors or warnings exist — fix and loop

1. **Update the schema file** — edit the source file to fix each issue
2. **Output the corrected `<script>` block** — ready for the user to paste into Webflow
3. **Ask the user to re-deploy** — "Updated schema saved. Please paste the new version into Webflow and publish. Let me know when it's live."
4. **Wait for user confirmation** — do not proceed until they confirm
5. **Loop back to step 1** — re-run the Rich Results Test on the same URL
6. **Repeat** until the test passes clean (no errors, no warnings)

### 7. Pass — report clean results

When the test passes with no errors:
- Screenshot the clean results
- List all detected schema types and valid items
- Confirm: "Schema validation passed clean — no errors, no warnings."

## Gotchas

- `evaluate_script` must use function wrapper syntax: `() => { ... }` or `async () => { ... }`
- The Rich Results Test page is a Google SPA — DOM may change structure. If extraction fails, fall back to reading `document.body.innerText` and parsing the plain text.
- Some warnings are informational (e.g. "Speakable" is in beta). Flag but don't treat as blockers.
- If the page returns "Couldn't fetch the URL", the schema isn't live yet — tell the user and wait.

## Success criteria

- All errors and warnings from Rich Results Test are resolved
- Schema file in the repo matches what's deployed
- Final screenshot shows clean pass
