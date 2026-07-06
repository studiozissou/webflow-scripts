# Spec: nem-test-phase-b

**Project:** nem-life
**Created:** 2026-06-16
**Updated:** 2026-06-23
**Status:** Approved (€1,560 fixed price)
**Slug:** `nem-test-phase-b`

## Summary

Phase B of NEM TEST "Waarom reageer ik zo?" — full production build. Rebuild the Webflow React code component via Webflow AI prompt into a 6-screen conversion-focused self-test (start → questions → profile → conclusion → opt-in → confirmation) with per-mechanism scoring, gender-differentiated client-side conclusion text (30 variants), lightweight opt-in form, email verification flow, and PDF report delivery. Will writes the Webflow AI prompt; Alex owns Anthropic prompt engineering.

## Background

### Phase A (current state)

The existing React code component (`Multi-Step Quiz`) is a generic, reusable quiz with:
- **3 phases:** `intro` → `quiz` → `results`
- **Data sources:** `window.__quizData` (CMS bridge via `quiz-data.js`), JSON props, or hardcoded defaults
- **Answer UX:** Likert-scale circles (5 radio-style circles with labels)
- **Scoring:** Simple sum → matched to score bands (min/max ranges)
- **Form:** Name + email + GDPR checkbox → simple POST to `formActionUrl`
- **Styling:** Inline styles using Webflow CSS variables (`--_token---*`), Montserrat headings, Lato body
- **Animations:** CSS keyframe animations (fade-in, slide-up, scale-in)

### What Phase B changes

| Aspect | Phase A | Phase B |
|--------|---------|---------|
| Screens | 3 (intro, quiz, results) | 6 (start, questions, profile, conclusion, opt-in, confirmation) |
| Answer UX | Likert circles | Pill buttons (horizontal desktop, vertical mobile) |
| Answer labels | Helemaal oneens → Helemaal eens | nooit → heel vaak |
| Questions | CMS-driven or JSON prop | 20 questions via component props (mechanism mapping fixed in code) |
| Scoring | Simple sum → band match | Per-mechanism (5 × 4 questions) — details TBD |
| Profile | N/A | Gender + age category + relationship status collected before conclusion |
| Results | Static band text | Gender-differentiated client-side conclusion (30 texts, no API call) |
| Form | Name + email | Name + email + consent only (profile fields captured earlier) |
| Validation | Browser native (`required`) | Custom inline validation with Dutch error messages on blur |
| Backend | Simple POST | Two-trigger: submit → verify → report |
| Width | max-w-[640px] | Wider (Alex: "too narrow") |

## Architecture Overview

```
[Landing Page (Webflow)]
  ├── Minimal navbar (logo + trust anchor, no nav links)
  ├── Hero (H1 + H2 + promise line)
  ├── React Quiz Component (6 screens) — built via Webflow AI prompt
  │     Screen 1: Start (Q1 + reassurance line)
  │     Screen 2: Questions (Q2-Q20, progress bar, back button)
  │     Screen 3: Profile ("Nog even over jou" — gender, age category, relationship status)
  │     Screen 4: Conclusion (gender-differentiated client-side scoring result → CTA)
  │     Screen 5: Opt-in form (name, email, consent only — profile fields captured on Screen 3)
  │     Screen 6: Confirmation (check inbox + correction link)
  ├── Disclaimer (static, below component)
  └── Minimal footer (logo only)

[Backend Flow — all built by Will]
  Screen 5 → POST form + profile + scores + token + locale to n8n "submit" webhook
           → n8n stores profile + sends verification email via MailerLite
           → React shows Screen 6

  Verification click → n8n "verify" webhook
           → retrieves stored profile
           → calls Anthropic API (prompt by Alex)
           → generates PDF → sends via MailerSend (PDF attachment)
           → if consent → adds to MailerLite newsletter
```

## Questions & Scoring

### Questions (component props — editable in Designer)

20 fixed questions. All share the same 5 answer options. Question texts are exposed as component props with Dutch defaults, so Alex can edit wording in the Webflow Designer without touching code. The mechanism mapping (which questions belong to which mechanism) stays fixed in code — Q1-Q4 always = Zelfafwijzing, etc. This prevents accidental scoring breakage from editorial changes.

**Option:** Props can be linked to CMS fields if Alex later wants to manage multiple test variants with different question texts while keeping the same scoring structure. Not in Phase B scope but the prop-based architecture supports it.

**Answer options (replaces current Likert labels):**

| Label | Score |
|-------|-------|
| nooit | 0 |
| zelden | 1 |
| soms | 2 |
| regelmatig | 3 |
| heel vaak | 4 |

### Questions (final, in test order)

All 20 questions with mechanism + dimension annotations (invisible to user):

| # | Question | Mechanism | Dimension |
|---|----------|-----------|-----------|
| 1 | Na een gesprek dat niet lekker liep, blijf ik uren of dagen malen over wat ik fout deed. | Zelfafwijzing | situationeel |
| 2 | Als iets in een relatie of op werk misgaat, ben ik de eerste die denkt dat het aan mij ligt. | Zelfafwijzing | gedrag |
| 3 | Ik stel beslissingen of dingen die ik eigenlijk wil doen langer uit dan logisch is. | Emotionele Verdoving | gedrag |
| 4 | Ik betrap mezelf erop dat ik streng oordeel over hoe anderen dingen doen. | Valse Macht | gedachte |
| 5 | Ik vermijd situaties die spanning oproepen, ook als ik eigenlijk wel zou willen. | Angst | gedrag |
| 6 | Ik blijf mijn best doen om iets of iemand naar mijn hand te zetten, ook als ik weet dat het niet gaat lukken. | Valse Hoop | gedrag |
| 7 | Als ik moe of overweldigd ben, zegt iets in mij: "Ik kan dit niet aan." | Zelfafwijzing | gedachte |
| 8 | Mijn standaardreactie als er iets gebeurt is: "Maakt niet uit, het komt wel goed." | Emotionele Verdoving | gedachte |
| 9 | Als iemand iets doet wat me raakt, ervaar ik dat al snel als een persoonlijke aanval en ga ik er fel tegenin. | Valse Macht | gedrag |
| 10 | Bij iets nieuws of onbekends ga ik in mijn hoofd direct naar wat er mis zou kunnen gaan. | Angst | gedachte |
| 11 | Ik voel een drive in mijn lichaam - gejaagd, hoog, ik kan niet stil zitten als er nog iets opgelost moet worden. | Valse Hoop | lichaam |
| 12 | Ik denk vaak: "Als ik dit nou maar goed doe, dan komt het wel goed." | Valse Hoop | gedachte |
| 13 | In situaties die me eigenlijk zouden moeten raken, merk ik nauwelijks iets op in mijn lichaam - alsof ik op afstand sta van mijn eigen leven. | Emotionele Verdoving | lichaam |
| 14 | Op het moment dat ik me aangevallen voel, voel ik mijn lichaam aanspannen - mijn kaken, mijn schouders, mijn vuisten, alsof ik me acuut wil verdedigen. | Valse Macht | lichaam |
| 15 | In spannende situaties voel ik mijn lichaam terugdeinzen - een verkramping, het gevoel dat ik ergens van weg wil. | Angst | lichaam |
| 16 | Als de sfeer dreigt om te slaan, doe ik extra mijn best en pas ik me aan om het goed te houden. | Valse Hoop | situationeel |
| 17 | Als iets misgaat voel ik mezelf wegzakken - mijn energie verdwijnt en alles wordt zwaar. | Zelfafwijzing | lichaam |
| 18 | Als anderen om mij heen sterk reageren op een emotionele gebeurtenis, blijf ik vanbinnen vaak vlak. | Emotionele Verdoving | situationeel |
| 19 | Als iemand dichtbij iets niet doet zoals ik wil, voel ik irritatie of boosheid die maar niet weggaat. | Valse Macht | situationeel |
| 20 | Als ik iets moet doen wat goed voor me is maar me angst geeft, kies ik vaak voor wat veilig voelt. | Angst | situationeel |

### Mechanism mapping

Each question maps to one of 5 mechanisms (invisible to user, used for scoring + report prompt).

| Mechanism | Questions | Body Q | Situational Q |
|-----------|-----------|--------|---------------|
| Zelfafwijzing | Q1, Q2, Q7, Q17 | Q17 | Q1 |
| Emotionele Verdoving | Q3, Q8, Q13, Q18 | Q13 | Q18 |
| Valse Macht | Q4, Q9, Q14, Q19 | Q14 | Q19 |
| Angst | Q5, Q10, Q15, Q20 | Q15 | Q20 |
| Valse Hoop | Q6, Q11, Q12, Q16 | Q11 | Q16 |

Each mechanism score: 0-16. Total score: 0-80.

### Scoring model (confirmed)

**Relative interpretation** — outcome is determined relatively, not absolutely. We look at which mechanism stands out within the user's own profile, not at absolute score height.

**Primary response:** The highest-scoring mechanism.

**Secondary response:** If the second-highest mechanism scores within **3 points** of the highest, it is included as a secondary contributing response. If the difference is **4 points or more**, the secondary is omitted entirely.

**Tiebreaker:** In the event of an equal highest score, the body and situational questions of the tied mechanisms serve as tiebreaker (these are least susceptible to socially desirable answering). Full tiebreaker rule is in Alex's system prompt document.

**Example — fictitious profile:**

| Mechanism | Questions | Answers | Total |
|-----------|-----------|---------|-------|
| Valse Hoop | Q6, Q11, Q12, Q16 | 3+4+3+4 | 14 |
| Valse Macht | Q4, Q9, Q14, Q19 | 3+2+3+3 | 11 |
| Zelfafwijzing | Q1, Q2, Q7, Q17 | 2+2+2+3 | 9 |
| Angst | Q5, Q10, Q15, Q20 | 2+2+1+2 | 7 |
| Emotionele Verdoving | Q3, Q8, Q13, Q18 | 1+0+1+1 | 3 |

Interpretation: Valse Hoop (14) is primary. Valse Macht (11) is 3 points behind — exactly at threshold, included as secondary. Report focuses on Valse Hoop with Valse Macht as contributing response.

### Conclusion texts (Screen 4)

**Status: To be written by Alex.** 30 texts total (15 mechanism combinations × 2 genders), using the following identifier convention (confirmed by Alex, extended for gender):

- **Single mechanism** (no secondary): mechanism name, e.g. `valse-hoop`
- **Dual mechanism** (secondary within 3 points): `dominant_secondary`, e.g. `valse-hoop_valse-macht`
- All lowercase, hyphenated within mechanism names, underscore between primary and secondary
- **Gender differentiation:** Texts are nested by gender (`man` / `vrouw`). The component uses the gender captured on Screen 3 (Profile) to select the correct set.

**All 15 mechanism identifiers (× 2 genders = 30 texts):**

| # | Key | Type |
|---|-----|------|
| 1 | `zelfafwijzing` | single |
| 2 | `emotionele-verdoving` | single |
| 3 | `valse-macht` | single |
| 4 | `angst` | single |
| 5 | `valse-hoop` | single |
| 6 | `zelfafwijzing_emotionele-verdoving` | dual |
| 7 | `zelfafwijzing_valse-macht` | dual |
| 8 | `zelfafwijzing_angst` | dual |
| 9 | `zelfafwijzing_valse-hoop` | dual |
| 10 | `emotionele-verdoving_valse-macht` | dual |
| 11 | `emotionele-verdoving_angst` | dual |
| 12 | `emotionele-verdoving_valse-hoop` | dual |
| 13 | `valse-macht_angst` | dual |
| 14 | `valse-macht_valse-hoop` | dual |
| 15 | `angst_valse-hoop` | dual |

Each of the 15 keys has a `man` and `vrouw` variant. The component builds the key from the scoring result and looks up `conclusions[gender][mechanismKey]`. Placeholders will be used until Alex provides the final copy.

### What the component needs to know

The React component calculates scores client-side and determines:
1. Primary mechanism (highest score)
2. Whether a secondary exists (within 3 points of primary)
3. Gender (captured on Screen 3 Profile, before conclusion is shown)
4. Conclusion text key (e.g. `valse-hoop` or `valse-hoop_valse-macht`) → looked up from `conclusions[gender][mechanismKey]` (30-text table)
5. The full score profile + profile fields to send to the submit webhook

## Internationalisation (NL + EN)

Both Dutch and English versions launch together. Hybrid i18n approach:

### Strategy

| String type | Where it lives | How locale switches |
|-------------|---------------|---------------------|
| **Marketing copy** (H1, H2, promise line, CTA labels, reassurance) | Component props (~10 props) | Webflow locale system — different prop values per locale in Designer |
| **Structural strings** (answer labels, progress format, error messages, form labels, confirmation copy) | Translations object in component code | Auto-detected from URL path or `document.documentElement.lang` |
| **Questions** (20 fixed) | Component props with defaults in translations object | Props editable per locale in Designer; fallback to translations object |
| **Landing page copy** (hero, disclaimer, footer) | Webflow native content | Webflow locale system handles this |
| **Email templates** (verification) | MailerLite automation | Locale passed in webhook payload, n8n selects correct template |
| **Email templates** (report delivery) | MailerSend templates | Locale passed in webhook payload, n8n selects correct template |
| **Anthropic prompts** (conclusion + report) | n8n prompt templates | Locale passed in webhook payload, prompt instructs Claude to write in correct language |
| **PDF report** | Generated by Claude | Prompt specifies language |

### Locale detection in React component

```tsx
function getLocale(): 'nl' | 'en' {
  // 1. Check URL path
  if (window.location.pathname.startsWith('/en/')) return 'en';
  // 2. Check html lang attribute
  if (document.documentElement.lang?.startsWith('en')) return 'en';
  // 3. Default to Dutch
  return 'nl';
}
```

### Translations object (in component)

```tsx
const t = {
  nl: {
    // Answer labels
    answers: ['nooit', 'zelden', 'soms', 'regelmatig', 'heel vaak'],
    // Progress
    progress: (n: number, total: number) => `Vraag ${n} van ${total}`,
    // Screen 3 (Profile)
    profileLabel: 'Nog even over jou',
    genderLabel: 'Geslacht',
    genderOptions: ['Man', 'Vrouw'],
    ageCategoryLabel: 'Leeftijdscategorie',
    ageCategoryOptions: ['18-30', '31-40', '41-50', '51-60', '60+'],
    relationshipLabel: 'Je relatiestatus',
    relationshipOptions: ['Alleenstaand', 'In een relatie', 'Gescheiden', 'Anders'],
    profileContinueButton: 'Ga verder',
    // Screen 4 (Conclusion)
    conclusionLabel: 'Jouw uitkomst',
    bridgeLine: 'Wil je begrijpen waar dit vandaan komt en wat het jou kost? Je persoonlijke rapport gaat daar dieper op in.',
    // Screen 5 (Opt-in — simplified, profile fields captured on Screen 3)
    optinLabel: 'Waar sturen we jouw rapport naartoe?',
    optinIntro: 'Vul hieronder je gegevens in. Je ontvangt het binnen enkele minuten in je inbox.',
    firstNamePlaceholder: 'Voornaam',
    emailPlaceholder: 'E-mailadres',
    consentLabel: 'Je wordt toegevoegd aan NEM Matters - de nieuwsbrief van NEM Life. Je kunt je altijd afmelden.',
    relieveLine: 'Geen spam & je gegevens blijven veilig. Natuurlijk.',
    disclaimer: 'Dit rapport is geen psychologische diagnose. Het is een spiegel op basis van jouw antwoorden - bedoeld als beginpunt voor reflectie, niet als eindoordeel.',
    // Errors
    errors: {
      // Profile screen (Screen 3)
      genderEmpty: 'Selecteer je geslacht',
      ageCategoryEmpty: 'Selecteer je leeftijdscategorie',
      relationshipEmpty: 'Selecteer je relatiestatus',
      // Opt-in screen (Screen 5)
      firstNameEmpty: 'Vul je voornaam in',
      emailEmpty: 'Vul je e-mailadres in',
      emailInvalid: 'Voer een geldig e-mailadres in',
      consentRequired: 'Bevestig je aanmelding voor NEM Matters',
      rateLimited: 'Probeer het later opnieuw',
    },
    // Screen 6
    confirmationLabel: 'Nog één stap',
    confirmationMain: 'Je antwoorden zijn opgeslagen. Zodra je je e-mailadres bevestigt, stellen we jouw persoonlijke rapport samen en sturen we het naar je inbox.',
    confirmationSecondary: 'Controleer je inbox - je ontvangt direct een mail van NEM Life. Klik op de bevestigingslink daarin en je rapport is onderweg.',
    noEmailReceived: 'Geen mail ontvangen? Controleer je spamfolder.',
    wrongEmail: 'Verkeerd e-mailadres opgegeven?',
    wrongEmailLink: 'Vul het opnieuw in.',
    // Questions — defaults only; overridden by component props per locale
    questions: [
      'Na een gesprek dat niet lekker liep, blijf ik uren of dagen malen over wat ik fout deed.',
      'Als iets in een relatie of op werk misgaat, ben ik de eerste die denkt dat het aan mij ligt.',
      // ... all 20 (see Questions table above for full list)
    ],
    // Conclusion texts — gender-nested (see Conclusion texts section)
    conclusions: {
      man: {
        'valse-hoop': '...', // placeholder until Alex provides
        'valse-hoop_valse-macht': '...', // placeholder
        // ... all 15 keys
      },
      vrouw: {
        'valse-hoop': '...', // placeholder until Alex provides
        'valse-hoop_valse-macht': '...', // placeholder
        // ... all 15 keys
      },
    },
  },
  en: {
    answers: ['never', 'rarely', 'sometimes', 'regularly', 'very often'],
    progress: (n: number, total: number) => `Question ${n} of ${total}`,
    // Screen 3 (Profile)
    profileLabel: 'A little about you',
    genderLabel: 'Gender',
    genderOptions: ['Male', 'Female'],
    ageCategoryLabel: 'Age category',
    ageCategoryOptions: ['18-30', '31-40', '41-50', '51-60', '60+'],
    relationshipLabel: 'Your relationship status',
    relationshipOptions: ['Single', 'In a relationship', 'Divorced', 'Other'],
    profileContinueButton: 'Continue',
    // Screen 4 (Conclusion)
    conclusionLabel: 'Your result',
    bridgeLine: 'Want to understand where this comes from and what it costs you? Your personal report goes deeper.',
    // Screen 5 (Opt-in)
    optinLabel: 'Where should we send your report?',
    optinIntro: 'Fill in your details below. You\'ll receive it in your inbox within a few minutes.',
    firstNamePlaceholder: 'First name',
    emailPlaceholder: 'Email address',
    consentLabel: 'You\'ll be added to NEM Matters - NEM Life\'s newsletter. You can unsubscribe at any time.',
    relieveLine: 'No spam & your data stays safe. Of course.',
    disclaimer: 'This test is not a psychological diagnosis. It is a mirror based on your answers - intended as a starting point for reflection, not a final verdict.',
    errors: {
      // Profile screen (Screen 3)
      genderEmpty: 'Select your gender',
      ageCategoryEmpty: 'Select your age category',
      relationshipEmpty: 'Select your relationship status',
      // Opt-in screen (Screen 5)
      firstNameEmpty: 'Enter your first name',
      emailEmpty: 'Enter your email address',
      emailInvalid: 'Enter a valid email address',
      consentRequired: 'Confirm your subscription to NEM Matters',
      rateLimited: 'Try again later',
    },
    confirmationLabel: 'One more step',
    confirmationMain: 'Your answers have been saved. As soon as you confirm your email address, we\'ll put together your personal report and send it to your inbox.',
    confirmationSecondary: 'Check your inbox - you\'ll receive an email from NEM Life shortly. Click the confirmation link and your report is on its way.',
    noEmailReceived: 'Didn\'t receive an email? Check your spam folder.',
    wrongEmail: 'Entered the wrong email address?',
    wrongEmailLink: 'Fill it in again.',
    questions: [
      'After a conversation that didn\'t go well, I keep going over what I did wrong for hours or days.',
      'When something goes wrong in a relationship or at work, I\'m the first to think it\'s my fault.',
      // ... all 20 (EN translations of the Dutch questions)
    ],
    conclusions: {
      man: {
        'valse-hoop': '...', // placeholder — EN versions of conclusion texts
        'valse-hoop_valse-macht': '...',
        // ... all 15 keys
      },
      vrouw: {
        'valse-hoop': '...', // placeholder — EN versions of conclusion texts
        'valse-hoop_valse-macht': '...',
        // ... all 15 keys
      },
    },
  },
};
```

### Props (editable per locale in Designer)

```tsx
props: {
  submitWebhookUrl: props.Text({ name: "Submit Webhook URL" }),
  reassuranceText: props.Text({
    name: "Reassurance Text",
    defaultValue: "Kies wat het meest op jou lijkt - er is geen goed of fout antwoord.",
  }),
  ctaButtonText: props.Text({
    name: "CTA Button Text",
    defaultValue: "Ontvang mijn rapport",
  }),
  // Questions — editable text, mechanism mapping stays in code
  question1: props.Text({ name: "Question 1", defaultValue: "Na een gesprek dat niet lekker liep, blijf ik uren of dagen malen over wat ik fout deed." }),
  question2: props.Text({ name: "Question 2", defaultValue: "Als iets in een relatie of op werk misgaat, ben ik de eerste die denkt dat het aan mij ligt." }),
  // ... question3 through question20 (all with Dutch defaults)
  // ~30 total props (10 marketing + 20 questions)
}
```

Alex edits these per locale in the Webflow Designer. The question props can also be linked to CMS fields if Alex later wants to manage variants. Structural strings (errors, labels, answer options) are handled by the translations object and don't need Designer configuration. The mechanism mapping (Q1-Q4 = Zelfafwijzing, etc.) is fixed in code regardless of prop values.

### Webhook payload includes locale

All webhooks include the locale so n8n can select the correct Anthropic prompt language and email template:

```json
{
  "locale": "nl",
  "scores": { ... }
}
```

## Screen-by-Screen Specification

### Screen 1 — Start

**Maps to:** current `phase === "quiz"` with `currentStep === 0`

- Progress: "Vraag 1 van 20"
- Question text: Q1 (from `question1` prop, default Dutch text in translations object)
- Reassurance line (Screen 1 only): "Kies wat het meest op jou lijkt - er is geen goed of fout antwoord."
- 5 pill buttons: nooit | zelden | soms | regelmatig | heel vaak
  - Desktop: horizontal row
  - Mobile: vertical stack, full width
  - Default: white fill, dark border
  - Hover: colour effect (use `--_token---accent-main`)
- No back button on Q1

### Screen 2 — Questions (Q2-Q20)

**Maps to:** current `phase === "quiz"` with `currentStep > 0`

- Progress: "Vraag X van 20" + back arrow (←)
- Back arrow: returns to previous question with previous answer pre-filled (already partially implemented in Phase A `goBack()`)
- Same pill button UX as Screen 1
- No reassurance line
- Auto-advance on answer selection (current 200ms select + 300ms fade pattern)

### Screen 3 — Profile ("Nog even over jou")

**New screen (no Phase A equivalent).** Inserted between Q20 and the conclusion.

- Label: "Nog even over jou" (NL) / "A little about you" (EN)
- **Why here:** Gender is needed client-side to select the correct gender-differentiated conclusion text on Screen 4. Capturing these fields before the conclusion — not on the opt-in — also lightens the opt-in form at the highest drop-off point.
- 3 dropdown fields (same component pattern as Phase A dropdowns):
  1. **Geslacht** — dropdown: Man / Vrouw
  2. **Leeftijdscategorie** — dropdown: 18-30 / 31-40 / 41-50 / 51-60 / 60+
  3. **Je relatiestatus** — dropdown: Alleenstaand / In een relatie / Gescheiden / Anders
- All fields required — inline validation on blur + on continue
- Continue button: "Ga verder" (NL) / "Continue" (EN) → transitions to Screen 4
- These values are stored in component state and included in the `/submit` webhook payload later

**Inline validation (on blur + on continue):**

| Field | Condition | Error message (NL) | Error message (EN) |
|-------|-----------|--------------------|--------------------|
| Geslacht | not selected | Selecteer je geslacht | Select your gender |
| Leeftijdscategorie | not selected | Selecteer je leeftijdscategorie | Select your age category |
| Relatiestatus | not selected | Selecteer je relatiestatus | Select your relationship status |

### Screen 4 — Conclusion

**Replaces:** current `phase === "results"` score display + band match

- Label: "Jouw uitkomst" (muted, same style as progress indicator)
- **No API call** — conclusion text is generated client-side from the scoring system
- **Gender-differentiated:** Conclusion text is looked up using `conclusions[gender][mechanismKey]`, where `gender` was captured on Screen 3. This doubles the conclusion texts from 15 to 30.
- Conclusion text: rendered from the scoring result (dominant mechanism + gender → mapped result text)
- Bridge line: "Wil je begrijpen waar dit vandaan komt en wat het jou kost? Je persoonlijke rapport gaat daar dieper op in." (conversion-weight styling — not visually downplayed)
- CTA button: "Ontvang mijn rapport" → transitions to Screen 5 (does NOT submit anything)
- Transition from Screen 3 → conclusion is instant (no loading state needed)

### Screen 5 — Opt-in Form

**Replaces:** current mailing list form in results phase. Simplified — profile fields (gender, age, relationship) already captured on Screen 3.

- Label: "Waar sturen we jouw rapport naartoe?"
- Intro: "Vul hieronder je gegevens in. Je ontvangt het binnen enkele minuten in je inbox."
- Form fields:
  1. **Voornaam** — text input
  2. **E-mailadres** — email input, format validation on blur
- **NEM Matters opt-in checkbox:** "Je wordt toegevoegd aan NEM Matters - de nieuwsbrief van NEM Life. Je kunt je altijd afmelden."
- Submit button "Ontvang mijn rapport" — **greyed out and disabled until checkbox is ticked**
- Relieve line below button: "Geen spam & je gegevens blijven veilig. Natuurlijk."
- Disclaimer: "Dit rapport is geen psychologische diagnose..."

**Inline validation (on blur + on submit):**

| Field | Condition | Error message |
|-------|-----------|---------------|
| Voornaam | empty | "Vul je voornaam in" |
| E-mailadres | empty | "Vul je e-mailadres in" |
| E-mailadres | invalid format | "Voer een geldig e-mailadres in" |
| Checkbox | unticked | "Bevestig je aanmelding voor NEM Matters" |

**Validation behaviour:**
- Red border on invalid field
- Error message in small red text below field
- Error clears immediately when field is corrected (on input/change, not on resubmit)
- Previously valid fields remain untouched

**Submit behaviour:**
- On errors: button doesn't fire, errors appear inline
- On valid: button shows loading state (spinner or opacity), prevents double-click
- On success: transition to Screen 6
- On failure: show generic error, keep form state

### Screen 6 — Confirmation

**New screen (no Phase A equivalent)**

- Label: "Nog één stap" (muted)
- Main text: "Je antwoorden zijn opgeslagen. Zodra je je e-mailadres bevestigt, stellen we jouw persoonlijke rapport samen en sturen we het naar je inbox."
- Secondary: "Controleer je inbox - je ontvangt direct een mail van NEM Life. Klik op de bevestigingslink daarin en je rapport is onderweg."
- Fallback (smaller, muted):
  - "Geen mail ontvangen? Controleer je spamfolder."
  - "Verkeerd e-mailadres opgegeven? Vul het opnieuw in." ← clickable link
- **Correction flow:** "Vul het opnieuw in" returns to Screen 5 (Opt-in) with:
  - Voornaam pre-filled
  - Email field cleared
  - Profile fields (gender, age category, relationship status) remain in state from Screen 3 — unchanged
  - On resubmit: new token generated, previous invalidated

## Component Refactor Plan

### Current phase model → new phase model

```
// Phase A
type Phase = "intro" | "quiz" | "results";

// Phase B
type Phase = "quiz" | "profile" | "conclusion" | "optin" | "confirmation";
// No "intro" phase — Screen 1 IS the quiz start
// "quiz" covers screens 1 + 2 (Q1-Q20)
// "profile" = screen 3 (gender, age category, relationship status)
// "conclusion" = screen 4 (gender-differentiated)
// "optin" = screen 5 (name + email + consent only)
// "confirmation" = screen 6
```

### Props changes

**Remove:**
- `questionsJson` — questions are now individual props (question1-question20)
- `scoreBandsJson` — no more score bands
- `introHeading`, `introBody`, `introButtonText`, `introIcon` — no intro screen
- `resultsHeading` — replaced by "Jouw uitkomst"
- `mailingListHeading` — replaced by fixed Dutch copy
- `submitButtonText` — fixed "Ontvang mijn rapport"
- `gdprLabel` — fixed Dutch copy
- `successTitle`, `successBody`, `successIcon` — replaced by fixed Dutch copy

**Add:**
- `submitWebhookUrl` — n8n webhook for form submission

**Keep:**
- `formActionUrl` → rename to `submitWebhookUrl`

### State changes

```tsx
// Phase A state
const [phase, setPhase] = useState<Phase>("intro");
const [answers, setAnswers] = useState<(number | null)[]>([]);
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [gdprChecked, setGdprChecked] = useState(false);

// Phase B additions
const [conclusionText, setConclusionText] = useState<string>(""); // from scoring system, not API
const [relationshipStatus, setRelationshipStatus] = useState("");
const [gender, setGender] = useState("");
const [ageCategory, setAgeCategory] = useState("");
const [nemMattersConsent, setNemMattersConsent] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [token, setToken] = useState<string>("");
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
```

### Answer UX change

Replace Likert circles with pill buttons:

```tsx
// Phase A: circle buttons with inner fill
<button className="likert-circle" style={{ borderRadius: "50%", ... }}>
  <div style={{ borderRadius: "50%", ... }} />
</button>

// Phase B: pill buttons
<button className="answer-pill" style={{ borderRadius: 999, padding: "12px 24px", ... }}>
  {answer.text}
</button>
```

Desktop: `display: flex; gap: 12px;` (horizontal)
Mobile (≤768px): `flex-direction: column;` (vertical, full width)

### Width increase

Current: `max-w-[640px]`
Phase B: `max-w-[800px]` (or remove max-width constraint and let the Webflow container control it)

Alex flagged: "The current width of the question module feels too narrow. Please increase it."

## Backend Architecture

### Ownership split

**Will builds:**
- Webflow AI prompt for React component (all 5 screens)
- 2 n8n webhooks (submit, verify)
- MailerLite integration (verification email + NEM Matters subscription)
- MailerSend integration (report delivery email with PDF attachment — MailerLite cannot send attachments)
- PDF generation
- Token management + storage

**Alex owns:**
- Anthropic API prompt engineering (full report prompt) — source of truth: [Notion: NEM TEST 01 system prompt](https://app.notion.com/p/NEM-TEST-01-Waarom-reageer-ik-zo-system-prompt-382c706b69c081f2b7cec566c49d8647) (may change, always reference this page)

### Spam / bot protection

Three layers, zero user friction:

1. **Honeypot field** — hidden input (`data-field="website"`, visually hidden via `position: absolute; left: -9999px; opacity: 0; pointer-events: none`). Bots auto-fill it, humans never see it. Component silently drops submissions where the field has a value (no error shown — just a fake success to avoid tipping off the bot).

2. **Rate limit on `/submit`** — n8n checks IP address against recent submissions. Max **3 submissions per IP per hour**. Beyond that → return `{ "status": "rate_limited" }`, component shows a generic "Probeer het later opnieuw" / "Try again later" message.

3. **MailerLite subscription delayed until verification** — the `/submit` webhook does NOT add to MailerLite. Instead, `nemMattersConsent` is stored with the profile. The `/verify` webhook checks the flag and adds to MailerLite only after the email is confirmed. This keeps the list clean.

### Webhook 1: POST `/submit`

**Triggered by:** Screen 5 form submit (valid)

**Request:**
```json
{
  "token": "uuid-v4",
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

**n8n flow:**
1. Check `honeypot` field → if not empty, return `{ "status": "ok" }` silently (fake success)
2. Check IP rate limit → if exceeded, return `{ "status": "rate_limited" }`
3. Store profile + scores + token + nemMattersConsent in KV/Sheet
4. Send verification email via MailerLite (NL or EN based on locale)
5. Return `{ "status": "ok" }`

Note: MailerLite newsletter subscription is **not** triggered here — moved to `/verify`. The verification email is sent via MailerLite (no attachment needed). Profile fields (gender, ageCategory, relationshipStatus) are captured on Screen 3 and included in this payload alongside the opt-in fields from Screen 5.

**Response:**
```json
{ "status": "ok" }
```

### Webhook 2: GET `/verify?token=uuid`

**Triggered by:** Verification email link click (no frontend involved)

**n8n flow:**
1. Validate token (exists, not expired, not consumed)
2. Retrieve stored profile
3. Call Anthropic API with Alex's report prompt + score profile + locale
4. Generate PDF
5. Send report PDF via MailerSend (only email that requires MailerSend — PDF attachment)
6. If `nemMattersConsent === true` → add to MailerLite newsletter (email is now verified)
7. Mark token as consumed
8. Redirect to `/zelftest/bevestigd` (or `/en/zelftest/bevestigd`)

**Token rules:**
- UUID v4, generated client-side
- Expires after 48 hours
- Single-use (consumed after report generation)
- Resubmission (correction flow): new token replaces old

### Analytics event naming (Phase C prep)

Named placeholders in code — no tracking implementation yet:

```tsx
const EVENTS = {
  TEST_COMPLETED: 'nem_test_completed',      // Q20 answered, conclusion shown
  REPORT_REQUESTED: 'nem_report_requested',  // Screen 4 form submitted
  EMAIL_VERIFIED: 'nem_email_verified',       // Token verified (server-side)
  EMAIL_NOT_VERIFIED: 'nem_email_expired',    // Token expired (server-side)
};
```

## Hour Estimates

### Ownership: Will builds everything except Anthropic prompts (Alex)

| # | Task | Hours | Notes |
|---|------|-------|-------|
| **Frontend — Webflow** | | | |
| 1 | Landing page: navbar-minimal, hero, footer-minimal, disclaimer, `/zelftest/bevestigd` page, EN locale pages | 0.5 | Webflow Designer |
| **Frontend — React Component (via Webflow AI)** | | | |
| 2 | Write Webflow AI prompt for full component: all 5 screens, pill buttons, progress, back button, inline validation, responsive, i18n, analytics events, correction flow | 1.5 | Claude writes the prompt, Will runs it in Webflow AI |
| 3 | Scoring logic (per-mechanism calculation + conclusion text mapping) | 1 | TBC — depends on Alex's scoring system answers |
| **Backend — n8n** | | | |
| 4 | n8n webhook: `/submit` (store profile + token → MailerLite verification email) | 2 | Token management baked in |
| 5 | n8n webhook: `/verify` (validate token → Anthropic API → PDF → MailerSend delivery → redirect) | 2 | Token expiry + invalidation baked in |
| **Backend — Integrations** | | | |
| 6 | PDF generation (HTML-to-PDF in n8n) | 2 | PDFMunk or code node |
| 7 | MailerLite setup (verification email template + NEM Matters subscription, NL + EN) | 2 | Templates + API integration |
| 8 | MailerSend setup (report delivery with PDF attachment, NL + EN) | 1.5 | Only email that needs MailerSend |
| **QA** | | | |
| 9 | QA: Playwright component tests (all 5 screens, scoring, validation, responsive, i18n) | 2 | Claude writes tests, automated |
| 10 | QA: E2E signup flow (MailerSend API + Gmail API, plus-alias isolation) | 2 | Requires live webhooks + Gmail OAuth setup |
| | | | |
| | **Total** | **16.5h** | |

### Not in Will's scope

- **Anthropic prompt engineering** — Alex owns the report prompt
- **Conclusion webhook** — removed; Screen 3 uses client-side scoring result (no API call)

### Blockers

- **Conclusion texts** — Screen 3 conclusion display needs the copy from Alex (maps primary + optional secondary mechanism to user-facing text). Scoring model is confirmed.
- ~~Anthropic report prompt~~ — resolved: Will has access via Notion (may change, page is source of truth).

## Task Breakdown

| # | Task | Dependencies | Est. |
|---|------|-------------|------|
| 1 | Build landing page + verification page in Webflow (NL + EN) | None | 0.5h |
| 2 | Write Webflow AI prompt for React component (all 5 screens, i18n, analytics) | None (parallel with 1) | 1.5h |
| 3 | Scoring logic (confirmed) + conclusion text mapping | Report texts from Alex | 1h |
| 4 | n8n: submit webhook (storage + MailerLite verification email) | None (parallel with frontend) | 2h |
| 5 | n8n: verify webhook (Anthropic API + PDF + MailerSend delivery) | None (prompt available via Notion) | 2h |
| 6 | PDF generation setup | Task 5 | 2h |
| 7 | MailerLite setup (verification email + NEM Matters, NL + EN) | None (parallel) | 2h |
| 8 | MailerSend setup (report delivery + PDF attachment, NL + EN) | None (parallel) | 1.5h |
| 9 | QA: all screens + responsive + i18n | Tasks 1-3 | 2h |
| 10 | QA: end-to-end flow | Tasks 4-8 | 2h |

### Parallelisation Map

**Stream A (frontend):** Tasks 1, 2 (parallel) → 3 (blocked on Alex's report texts)
**Stream B (backend, parallel with A):** Tasks 4, 7, 8 (parallel) → 5 → 6
**Stream C (QA, after A+B):** Tasks 9 → 10

- **Parallel potential:** High — frontend and backend are fully independent
- **External dependency:** Alex must provide conclusion texts (unblocks task 3 Screen 3 display). Anthropic prompt is available via Notion.
- **Worktrees:** No — React component is a single file via Webflow AI
- **Agent teams:** No — single developer

## Barba Impact

N/A — no Barba transitions in nem-life.

## Webflow AI Prompt Deliverable

Task 2 produces a comprehensive prompt document that Will pastes into Webflow AI. The prompt must be self-contained — everything the AI needs to generate the working component:

**Contents:**
- Component name + prop definitions (submitWebhookUrl + ~10 marketing copy props with defaults)
- All 20 questions (NL + EN) with mechanism/dimension annotations
- Answer scale (nooit→heel vaak, 0-4 scoring)
- Mechanism mapping (which questions → which mechanism)
- Scoring logic: per-mechanism sum, primary/secondary determination (SECONDARY_THRESHOLD = 3), tiebreaker rule
- 6-screen flow with exact transition logic
- Pill button UX (horizontal desktop, vertical mobile ≤768px)
- Progress indicator format ("Vraag X van 20" / "Question X of 20")
- Back button with answer pre-fill
- Profile screen (Screen 3): gender, age category, relationship status dropdowns — captured before conclusion
- Gender-differentiated conclusion texts (30 variants: 15 mechanism keys × 2 genders)
- Simplified opt-in form (Screen 5): just name + email + consent
- Inline form validation (blur + submit, all error messages in both languages) — split between Profile and Opt-in screens
- Submit button disabled state (consent checkbox)
- Correction flow (Screen 6 → Screen 5, pre-fill name, clear email, new token)
- Webhook POST contract (exact JSON payload shape for `/submit`)
- Analytics event constants (window.dataLayer push or console stub)
- i18n: locale detection + translations object + prop-driven marketing copy
- Styling: Webflow CSS variable tokens, Montserrat/Lato fonts, responsive breakpoints
- Accessibility: focus states, aria attributes, reduced-motion support

The prompt will be saved to `projects/nem-life/.claude/prompts/nem-test-phase-b-webflow-ai.md`.

## Test Strategy

### Layered approach

| Layer | What it tests | When it runs | Tools |
|-------|--------------|-------------|-------|
| **Tier 1: Component tests** | Quiz flow, scoring, validation, responsive, i18n | During build + debug | Playwright against staging |
| **Tier 2: CDN regression** | All Tier 1 tests post-deploy | During deploy | Playwright via registry.json |
| **Tier 3: E2E signup flow** | Form submit → MailerSend API → Gmail inbox → verify link → PDF delivery | After backend deployed | Playwright + MailerSend API + Gmail API |
| **Tier 4: Manual** | iOS Safari, PDF visual quality, animation feel | After build | Checklist |

### E2E signup flow automation

Uses Gmail plus-aliases for isolated test runs: `will+nem-test-{timestamp}@teamzzissou.io`

**Fast layer (MailerSend API check):**
1. Submit form with test email via Playwright
2. Poll MailerSend Activity API for matching `to` address
3. Assert: email queued/sent, correct template, token in verification URL
4. Hit verification URL directly (GET request)
5. Poll MailerSend Activity API for report delivery email
6. Assert: PDF attachment present, correct recipient

**Slow layer (Gmail inbox check, tagged `@e2e-email`):**
1. Submit form with `will+nem-test-{ts}@teamzzissou.io`
2. Poll Gmail API (googleapis) for email to that plus-alias
3. Extract verification link from email body
4. Navigate to verification link in Playwright
5. Poll Gmail API for report delivery email
6. Assert: email received, PDF attachment present

**Environment variables needed (.env.test):**
```
MAILERSEND_API_KEY=ms_...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_TEST_ADDRESS=will@teamzzissou.io
NEM_SUBMIT_WEBHOOK_URL=https://...
NEM_VERIFY_WEBHOOK_URL=https://...
```

**npm dependencies to add:**
```
googleapis (for Gmail API)
```

## Verify Loop

### Pass/fail criteria

1. Landing page loads with minimal navbar (logo + trust anchor, no nav links)
2. First question visible above the fold on desktop and mobile
3. Question module is wider than Phase A (>640px on desktop)
4. Pill buttons display horizontally on desktop, vertically on mobile
5. All 20 questions answerable; progress updates correctly ("Vraag X van 20")
6. Back button returns to previous question with answer pre-filled
7. Back button NOT present on Q1
8. Reassurance line visible on Q1 only, hidden on Q2+
9. Screen 3 (Profile) shows "Nog even over jou" with gender, age category, relationship dropdowns
10. Screen 3 validates all profile dropdowns before proceeding
11. Screen 4 shows gender-differentiated conclusion text instantly (no loading, no API call)
12. Scoring is correct: per-mechanism sums, primary/secondary determination, gender-keyed lookup
13. CTA "Ontvang mijn rapport" transitions to Screen 5
14. Screen 5 has only name + email + consent (no dropdowns — those are on Screen 3)
15. Screen 5 validates name + email on blur with correct Dutch error messages
16. Email format validation fires on blur (not just empty check)
17. Error clears when field is corrected
18. Submit button greyed out and disabled until consent checkbox ticked
19. Successful submit transitions to Screen 6
20. Screen 6 "Vul het opnieuw in" returns to Screen 5 with name pre-filled, email cleared
21. MailerSend receives verification email request with correct payload (API check)
22. Gmail inbox receives verification email (e2e check)
23. Verification link triggers report generation + PDF delivery
24. No console errors on any screen
25. Minimal footer with logo only
26. prefers-reduced-motion respected
27. All strings display correctly in EN locale (/en/ path)

### Reproduction steps

1. Navigate to NEM TEST landing page on staging
2. Verify navbar (logo + trust anchor, no nav links)
3. Verify Q1 shows reassurance line
4. Answer Q1 with pill button, verify transition to Q2
5. Verify reassurance line is gone on Q2
6. Use back button, verify Q1 answer pre-filled
7. Answer all 20 questions (mix of answers for scoring diversity)
8. Verify Screen 3 (Profile) shows "Nog even over jou" with 3 dropdowns
9. Test profile validation: click continue without selecting, verify Dutch errors
10. Select gender, age category, relationship status → click continue
11. Verify Screen 4 shows gender-differentiated conclusion text immediately
12. Click "Ontvang mijn rapport"
13. Verify Screen 5 shows only name + email + consent (no dropdowns)
14. Test inline validation: tab through empty fields, verify Dutch errors
15. Test email validation: enter "bad-email", blur, verify format error
16. Fix email, verify error clears
17. Verify submit still disabled (checkbox unticked)
18. Tick checkbox, verify submit enabled
19. Submit form
20. Verify Screen 6 content
21. Click "Vul het opnieuw in", verify Screen 5 state (name filled, email cleared)
22. Resubmit with correct email
23. Check MailerSend API for verification email
24. Check Gmail for verification email
25. Click verification link
26. Check MailerSend API for report delivery
27. Check Gmail for report PDF

### Tier mapping

- **Tier 1 (Auto — Playwright):** Landing page structure, all 20 questions flow, pill buttons, progress indicator, back button + pre-fill, reassurance line visibility, profile screen (3 dropdowns + validation), gender-differentiated scoring, screen transitions, opt-in form validation (name + email + correction), button disabled state, correction flow, no console errors, reduced motion, EN locale
- **Tier 2 (CDN regression):** Registered in `tests/registry.json`
- **Tier 3 (E2E — Playwright + APIs, tagged `@e2e-email`):**
  - MailerSend API: verification email sent, report email sent
  - Gmail inbox: verification email received, report PDF received
  - Full flow: submit → verify → report delivery
- **Tier 4 (Manual):**
  - PDF quality/formatting — visual inspection
  - Mobile pill button stacking on iOS Safari — Playwright only runs Chromium
  - Animation timing feel — subjective

### Regression scope

- Other nem-life modules must continue working (init.js unchanged)
- No GSAP/ScrollTrigger involvement — minimal risk to other page animations
- `quiz-data.js` remains in init.js module list but Phase B component ignores it (questions via props)

## Open Questions

1. ~~Scoring system~~ — resolved: 0-4 scoring, 0-16 per mechanism, relative interpretation, 3-point secondary threshold, body+situational tiebreaker
2. **Conclusion texts for Screen 4** — Alex needs to write the 30 gender-differentiated conclusion texts (15 mechanism keys × 2 genders) using the confirmed identifier convention. Placeholders used until then.
3. ~~Anthropic report prompt~~ — resolved: Will has access. Source of truth: [Notion: NEM TEST 01 system prompt](https://app.notion.com/p/NEM-TEST-01-Waarom-reageer-ik-zo-system-prompt-382c706b69c081f2b7cec566c49d8647) (may change)
4. ~~n8n instance~~ — resolved, Will has access
5. ~~MailerSend account~~ — resolved, Will has access
6. ~~Verification redirect~~ — resolved: static Webflow page at `/zelftest/bevestigd`
7. ~~Component width~~ — resolved: Will sets in Webflow
8. ~~Conclusion webhook~~ — removed; Screen 3 uses client-side scoring (no API call)
9. ~~Prompt engineering~~ — resolved: Alex owns Anthropic prompts
10. ~~Questions hardcoded vs CMS~~ — resolved: component props with Dutch defaults; mechanism mapping fixed in code. Props can be linked to CMS later if needed.
11. ~~MailerSend vs MailerLite~~ — resolved: MailerLite for verification email + newsletter; MailerSend for report delivery only (PDF attachment). MailerSend free tier = 500 emails/month.
12. ~~Conclusion text identifiers~~ — resolved: Alex's convention confirmed. Single: `valse-hoop`. Dual: `valse-hoop_valse-macht`. All lowercase, hyphenated. 15 texts total.
13. ~~Internationalisation~~ — resolved: NL + EN built in from start. Locale auto-detected, passed through to backend for emails + report language.
