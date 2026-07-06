# Spec: nem-test-phase-b-prompt

**Project:** nem-life
**Created:** 2026-06-25
**Status:** Approved
**Slug:** `nem-test-phase-b-prompt`
**Parent spec:** `nem-test-phase-b` (task 2)

## Summary

Write the Webflow AI prompt document that generates the Phase B React code component. A/C hybrid approach: diff-focused primary prompt (referencing the copied Phase A component) structured so follow-up refinement prompts can be pasted if needed.

## Deliverable

`projects/nem-life/.claude/prompts/nem-test-phase-b-webflow-ai.md`

## Approach

**A/C Hybrid — Diff-focused with pre-written refinements**

- **Primary prompt:** One comprehensive diff-focused document. "You are modifying a copy of the Multi-Step Quiz component. Here's what changes." Concise, preserves existing patterns that work, aligned with Webflow AI's preference for focused requests.
- **Follow-up prompts:** 4 pre-written refinement prompts saved alongside, covering scoring, i18n, validation, and profile screen flow. Only used if the main prompt misses something.

## Prompt Structure

### 1. Context line
"You are modifying a copy of the Multi-Step Quiz component. Here's what changes."

### 2. Phase model change
`intro|quiz|results` → `quiz|profile|conclusion|optin|confirmation`. No intro screen — Screen 1 IS the quiz start.

- `"quiz"` = screens 1-2 (Q1-Q20)
- `"profile"` = screen 3 (gender, age category, relationship status)
- `"conclusion"` = screen 4 (scoring result)
- `"optin"` = screen 5 (name + email + consent)
- `"confirmation"` = screen 6 (success)

### 3. Screen-by-screen diffs

**Screen 1 (Start — Q1):**
- Progress: "Vraag 1 van 20"
- Reassurance line (Q1 only): from `reassuranceText` prop
- 5 pill buttons replacing Likert circles
- No back button on Q1
- `data-element="quiz-module"` on container

**Screen 2 (Questions — Q2-Q20):**
- Same pill button UX
- Back button with answer pre-fill (`data-element="back-button"`)
- No reassurance line
- Auto-advance on selection (200ms select + 300ms fade)

**Screen 3 (Profile — "Nog even over jou"):**
- Label: "Nog even over jou" (NL) / "A little about you" (EN)
- 3 dropdown fields:
  - Geslacht: Man / Vrouw
  - Leeftijdscategorie: 18-30 / 31-40 / 41-50 / 51-60 / 60+
  - Je relatiestatus: Alleenstaand / In een relatie / Gescheiden / Anders
- All required, inline validation on blur + on continue
- Continue button: "Ga verder" → Screen 4
- `data-element="profile-section"` on container
- `data-element="continue-button"` on continue button

**Screen 4 (Conclusion):**
- Label: "Jouw uitkomst"
- Client-side conclusion text from scoring (no API call, no loading)
- Gender-differentiated: `conclusions[gender][mechanismKey]` lookup using gender captured on Screen 3
- Bridge line
- CTA button: "Ontvang mijn rapport" → Screen 5
- Expose scores: `window.__nemTestScores = { zelfafwijzing, emotioneleVerdoving, valseMacht, angst, valseHoop }`

**Screen 5 (Opt-in form):**
- 3 fields + checkbox: voornaam, email, NEM Matters consent checkbox
- Inline validation on blur + on submit
- Submit button disabled until checkbox ticked
- Honeypot field (hidden, `data-field="website"`)
- Client-side honeypot check: if filled, show Screen 6 without POSTing
- On valid submit: POST to `submitWebhookUrl` prop, show Screen 6

**Screen 6 (Confirmation):**
- "Nog een stap" label
- Correction link: "Vul het opnieuw in" → Screen 5 with name pre-filled, email cleared, new token
- Profile fields (gender, age, relationship status) remain in state from Screen 3

### 4. Scoring engine

- 20 questions, 5 answer options (0-4 scoring)
- 5 mechanisms, 4 questions each (mapping fixed in code)
- Per-mechanism sum (0-16 each, 0-80 total)
- Primary: highest score
- Secondary: included if within 3 points of primary, omitted if 4+ gap
- Tiebreaker: body + situational question scores
- Conclusion text key: `primary` or `primary_secondary`
- Gender captured on Screen 3 is used for conclusion text lookup: `conclusions[gender][key]` instead of `conclusions[key]`

### 5. Conclusion texts — 30 placeholders (15 x 2 genders)

Each mechanism key has `man` and `vrouw` variants nested under gender. Lookup: `conclusions[gender][key]`.

| # | Key | Gender | Placeholder (NL) | Placeholder (EN) |
|---|-----|--------|-------------------|-------------------|
| 1 | `zelfafwijzing` | `man` | `[DUMMY] Zelfafwijzing (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection (male) — Alex will write this text.` |
| 2 | `zelfafwijzing` | `vrouw` | `[DUMMY] Zelfafwijzing (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection (female) — Alex will write this text.` |
| 3 | `emotionele-verdoving` | `man` | `[DUMMY] Emotionele Verdoving (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Emotional Numbing (male) — Alex will write this text.` |
| 4 | `emotionele-verdoving` | `vrouw` | `[DUMMY] Emotionele Verdoving (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Emotional Numbing (female) — Alex will write this text.` |
| 5 | `valse-macht` | `man` | `[DUMMY] Valse Macht (man) — Alex schrijft deze tekst nog.` | `[DUMMY] False Power (male) — Alex will write this text.` |
| 6 | `valse-macht` | `vrouw` | `[DUMMY] Valse Macht (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] False Power (female) — Alex will write this text.` |
| 7 | `angst` | `man` | `[DUMMY] Angst (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Fear (male) — Alex will write this text.` |
| 8 | `angst` | `vrouw` | `[DUMMY] Angst (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Fear (female) — Alex will write this text.` |
| 9 | `valse-hoop` | `man` | `[DUMMY] Valse Hoop (man) — Alex schrijft deze tekst nog.` | `[DUMMY] False Hope (male) — Alex will write this text.` |
| 10 | `valse-hoop` | `vrouw` | `[DUMMY] Valse Hoop (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] False Hope (female) — Alex will write this text.` |
| 11 | `zelfafwijzing_emotionele-verdoving` | `man` | `[DUMMY] Zelfafwijzing + Emotionele Verdoving (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection + Emotional Numbing (male) — Alex will write this text.` |
| 12 | `zelfafwijzing_emotionele-verdoving` | `vrouw` | `[DUMMY] Zelfafwijzing + Emotionele Verdoving (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection + Emotional Numbing (female) — Alex will write this text.` |
| 13 | `zelfafwijzing_valse-macht` | `man` | `[DUMMY] Zelfafwijzing + Valse Macht (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection + False Power (male) — Alex will write this text.` |
| 14 | `zelfafwijzing_valse-macht` | `vrouw` | `[DUMMY] Zelfafwijzing + Valse Macht (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection + False Power (female) — Alex will write this text.` |
| 15 | `zelfafwijzing_angst` | `man` | `[DUMMY] Zelfafwijzing + Angst (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection + Fear (male) — Alex will write this text.` |
| 16 | `zelfafwijzing_angst` | `vrouw` | `[DUMMY] Zelfafwijzing + Angst (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection + Fear (female) — Alex will write this text.` |
| 17 | `zelfafwijzing_valse-hoop` | `man` | `[DUMMY] Zelfafwijzing + Valse Hoop (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection + False Hope (male) — Alex will write this text.` |
| 18 | `zelfafwijzing_valse-hoop` | `vrouw` | `[DUMMY] Zelfafwijzing + Valse Hoop (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Self-rejection + False Hope (female) — Alex will write this text.` |
| 19 | `emotionele-verdoving_valse-macht` | `man` | `[DUMMY] Emotionele Verdoving + Valse Macht (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Emotional Numbing + False Power (male) — Alex will write this text.` |
| 20 | `emotionele-verdoving_valse-macht` | `vrouw` | `[DUMMY] Emotionele Verdoving + Valse Macht (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Emotional Numbing + False Power (female) — Alex will write this text.` |
| 21 | `emotionele-verdoving_angst` | `man` | `[DUMMY] Emotionele Verdoving + Angst (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Emotional Numbing + Fear (male) — Alex will write this text.` |
| 22 | `emotionele-verdoving_angst` | `vrouw` | `[DUMMY] Emotionele Verdoving + Angst (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Emotional Numbing + Fear (female) — Alex will write this text.` |
| 23 | `emotionele-verdoving_valse-hoop` | `man` | `[DUMMY] Emotionele Verdoving + Valse Hoop (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Emotional Numbing + False Hope (male) — Alex will write this text.` |
| 24 | `emotionele-verdoving_valse-hoop` | `vrouw` | `[DUMMY] Emotionele Verdoving + Valse Hoop (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Emotional Numbing + False Hope (female) — Alex will write this text.` |
| 25 | `valse-macht_angst` | `man` | `[DUMMY] Valse Macht + Angst (man) — Alex schrijft deze tekst nog.` | `[DUMMY] False Power + Fear (male) — Alex will write this text.` |
| 26 | `valse-macht_angst` | `vrouw` | `[DUMMY] Valse Macht + Angst (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] False Power + Fear (female) — Alex will write this text.` |
| 27 | `valse-macht_valse-hoop` | `man` | `[DUMMY] Valse Macht + Valse Hoop (man) — Alex schrijft deze tekst nog.` | `[DUMMY] False Power + False Hope (male) — Alex will write this text.` |
| 28 | `valse-macht_valse-hoop` | `vrouw` | `[DUMMY] Valse Macht + Valse Hoop (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] False Power + False Hope (female) — Alex will write this text.` |
| 29 | `angst_valse-hoop` | `man` | `[DUMMY] Angst + Valse Hoop (man) — Alex schrijft deze tekst nog.` | `[DUMMY] Fear + False Hope (male) — Alex will write this text.` |
| 30 | `angst_valse-hoop` | `vrouw` | `[DUMMY] Angst + Valse Hoop (vrouw) — Alex schrijft deze tekst nog.` | `[DUMMY] Fear + False Hope (female) — Alex will write this text.` |

### 6. Answer UX

Replace Likert circles with pill buttons:
- `border-radius: 999px`, `padding: 12px 24px`
- Default: white fill, dark border
- Hover: accent colour (`--_token---accent-main`)
- Selected: accent fill
- Desktop: `display: flex; gap: 12px;` (horizontal)
- Mobile (<=768px): `flex-direction: column; width: 100%` (vertical)

### 7. Form validation

All inline, Dutch error messages, errors on blur + on submit, clear on correction.

**Profile screen (Screen 3):**

| Field | Condition | NL error | EN error |
|-------|-----------|----------|----------|
| Geslacht | not selected | Selecteer je geslacht | Select your gender |
| Leeftijdscategorie | not selected | Selecteer je leeftijdscategorie | Select your age category |
| Relatiestatus | not selected | Selecteer je relatiestatus | Select your relationship status |

**Opt-in screen (Screen 5):**

| Field | Condition | NL error | EN error |
|-------|-----------|----------|----------|
| Voornaam | empty | Vul je voornaam in | Enter your first name |
| E-mailadres | empty | Vul je e-mailadres in | Enter your email address |
| E-mailadres | invalid format | Voer een geldig e-mailadres in | Enter a valid email address |
| Checkbox | unticked | Bevestig je aanmelding voor NEM Matters | Confirm your subscription to NEM Matters |

### 8. Webhook contract

```json
{
  "token": "uuid-v4",
  "locale": "nl",
  "firstName": "Anna",
  "email": "anna@example.com",
  "relationshipStatus": "in-een-relatie",
  "gender": "vrouw",
  "ageCategory": "31-40",
  "honeypot": "",
  "scores": {
    "valseHoop": 14,
    "valseMacht": 11,
    "zelfafwijzing": 9,
    "angst": 7,
    "emotioneleVerdoving": 3
  },
  "primaryMechanism": "valseHoop",
  "secondaryMechanism": "valseMacht",
  "totalScore": 44,
  "nemMattersConsent": true,
  "timestamp": "2026-06-18T14:30:00Z"
}
```

Honeypot check: if `honeypot` field is not empty, skip POST, show Screen 6 (fake success).

### 9. i18n

- Locale detection: URL path `/en/` → `'en'`, else `document.documentElement.lang` → fallback `'nl'`
- Translations object in component with all structural strings (NL + EN)
- Profile screen translations: `profileLabel` ("Nog even over jou" / "A little about you"), `profileContinueButton` ("Ga verder" / "Continue")
- Questions as component props with Dutch defaults, editable per locale in Designer
- Marketing copy (~10 props): `reassuranceText`, `ctaButtonText`, etc.
- Conclusion texts are gender-nested: `conclusions[gender][key]` with both `man` and `vrouw` variants per key
- Locale sent in webhook payload

### 10. Styling

- Design tokens: `--_token---accent-main`, `--_token---bg-main`, `--_token---text-main`, `--_token---text-olive`, `--_token---accent-light-grey`
- Fonts: Montserrat (headings), Lato (body)
- Width: `max-width: 800px` (up from 640px)
- Spacing: use `--_gaps---content-half` (24px desktop / 20px mobile)
- Motion: subtle fade-ins only, respect `prefers-reduced-motion`

### 11. Data attributes for testing

| Attribute | Element |
|-----------|---------|
| `data-element="quiz-module"` | Outer quiz container |
| `data-element="back-button"` | Back arrow button |
| `data-element="profile-section"` | Profile screen container (Screen 3) |
| `data-element="continue-button"` | Profile continue button (Screen 3) |
| `data-element="footer-minimal"` | Minimal footer (landing page, not component) |
| `data-element="disclaimer"` | Disclaimer text (landing page, not component) |
| `data-element="logo"` | Navbar logo (landing page, not component) |
| `data-element="trust-anchor"` | Navbar trust element (landing page, not component) |
| `data-field="website"` | Honeypot hidden input |
| `data-field="relationship-status"` | Relationship dropdown (Screen 3) |
| `data-field="gender"` | Gender dropdown (Screen 3) |
| `data-field="age-category"` | Age category dropdown (Screen 3) |
| `aria-selected="true"` | Selected pill button |

### 12. Accessibility

- Focus states on all interactive elements
- `aria-selected` on active pill button
- `aria-live="polite"` on progress indicator
- `aria-invalid` + `aria-describedby` on error fields
- `prefers-reduced-motion`: disable fade animations

### 13. Analytics stubs

```tsx
const EVENTS = {
  TEST_COMPLETED: 'nem_test_completed',
  REPORT_REQUESTED: 'nem_report_requested',
};
// window.dataLayer?.push({ event: EVENTS.TEST_COMPLETED, ... });
```

No implementation — just named constants and commented push calls.

## Follow-up Refinement Prompts

Saved alongside the main prompt. Only used if the main prompt misses something.

**Refinement A — Scoring fix:**
"The scoring logic is wrong. Here's the test case: answering all 'soms' (index 2) should produce 8 for every mechanism (4 questions x 2). Check the mechanism mapping and the per-mechanism sum calculation."

**Refinement B — i18n fix:**
"The EN locale strings aren't switching. Check: (1) getLocale() detects /en/ path prefix, (2) translations object has both nl and en keys, (3) all UI strings use t[locale].keyName, (4) answer labels switch to English."

**Refinement C — Validation fix:**
"Inline validation errors should clear immediately when the field is corrected (on input/change event), not when the user re-submits. Check each field's onChange/onInput handler clears its specific error from fieldErrors state."

**Refinement D — Profile screen fix:**
"The profile screen isn't showing after Q20. Check: (1) phase transitions from 'quiz' to 'profile' after Q20, (2) profile screen renders 3 dropdowns, (3) 'Ga verder' button transitions to 'conclusion' phase."

## Task Breakdown

| # | Task | Est. |
|---|------|------|
| 1 | Write main prompt document | 30 min |
| 2 | Write 30 placeholder conclusion texts (inline in prompt) | 10 min |
| 3 | Write 4 follow-up refinement prompts (appended to same file) | 10 min |
| 4 | Self-review: cross-check prompt against spec + acceptance tests | 10 min |

Sequential. No parallelisation needed.

## Verify Loop

### Pass/fail criteria (for the prompt document)

1. Every screen (1-6) from the parent spec has a corresponding section
2. All 20 questions listed with correct mechanism mapping
3. All 30 conclusion text keys (15 x 2 genders) present with placeholder text
4. Webhook POST contract matches parent spec exactly
5. All `data-element` attributes from acceptance tests are referenced
6. NL + EN translations object covers all keys from parent spec
7. Honeypot client-side short-circuit is specified
8. `window.__nemTestScores` exposure is specified
9. Design tokens match `figma-tokens.json` values
10. 4 follow-up refinement prompts are present and focused

### Reproduction steps

1. Read the prompt document
2. Cross-reference each section against `nem-test-phase-b.md` spec
3. Cross-reference data-element attributes against `tests/acceptance/nem-test-phase-b.spec.js`
4. Verify webhook JSON shape matches spec
5. Verify all 30 conclusion keys (15 x 2 genders) match the identifier table in spec

### Tier mapping

- **Tier 1 (Auto):** N/A — this is a document, not code. Acceptance tests run after the prompt is used in Webflow AI.
- **Tier 2 (CDN regression):** N/A
- **Tier 3 (Manual):** Review prompt document for completeness against checklist above.

### Regression scope

- No code changes — this task produces a prompt document only
- Existing Phase A component stays untouched until the prompt is used

## Barba Impact

N/A — no Barba transitions in nem-life.
