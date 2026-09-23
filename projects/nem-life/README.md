# NEM Life — NEM Test component

`src/nem-test-phase-b.tsx` is a Webflow code component. `npm run build:nem` writes
`dist/nem-test-phase-b.webflow.tsx`, which is pasted into the Webflow code component by hand.

## Design notes

- The component renders in a shadow DOM, so site classes (`.button`, `.article-card_tag`)
  never reach it. `nemButtonStyle` / `NemButtonContent` and the pill styles are inline
  replicas of those classes, copied from the published CSS. When the site's `.button`
  changes, update the replica.
- Titles use `screenTitleStyle` (Montserrat 600 / 24px), matching the site's h2 pattern.
- The consent button uses `aria-disabled` rather than `disabled` so a click without consent
  still reaches the handler and shows the error (Chrome swallows clicks on `disabled`).
- Lato 500 is not loaded on the site; use 400 or 700 only.
- Relationship values are locale-independent slugs (`alleenstaand-zonder-kinderen`, …);
  n8n `Generate Report` maps them to English labels for the prompt.
