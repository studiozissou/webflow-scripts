# NEM TEST Phase B — Webflow AI Prompt: 6-Screen Addendum

**Use this only if you already generated the earlier 5-screen version of the component in Webflow AI.** If you're building from scratch, run the full `nem-test-phase-b-webflow-ai.md` prompt instead — it already includes everything below.

This addendum upgrades the existing component from the **5-screen** flow (`quiz → conclusion → optin → confirmation`) to the **6-screen** flow by inserting a **Profile** screen and making the conclusion **gender-differentiated**.

Paste the whole thing into Webflow AI in one go.

---

You are updating the existing NEM TEST quiz component. Apply these changes exactly. Everything not mentioned here stays as it is.

## 1. Phase model — add a `profile` phase

Change the phase model from:

```
// OLD: "quiz" | "conclusion" | "optin" | "confirmation"
// NEW: "quiz" | "profile" | "conclusion" | "optin" | "confirmation"
```

The new `profile` phase sits **between** the quiz and the conclusion. The screen order is now:

- Screen 1–2: `quiz` (Q1–Q20) — unchanged
- **Screen 3: `profile` (NEW)** — gender, age category, relationship status
- Screen 4: `conclusion` — now gender-differentiated
- Screen 5: `optin` — now name + email + consent only
- Screen 6: `confirmation` — unchanged

The initial phase stays `"quiz"`.

## 2. Q20 now advances to `profile`, not `conclusion`

In the auto-advance handler, when the last question (Q20, `currentStep === 19`) is answered: still call `calculateScores(updatedAnswers)`, set `conclusionKey` from the result, and expose `window.__nemTestScores` — but set `phase` to **`"profile"`** instead of `"conclusion"`. Scoring does not depend on gender, so computing it here (before the profile fields are collected) is correct — only the conclusion *text lookup* uses gender.

## 3. Add profile-screen strings to BOTH locales

In the translations object, add these keys to `t.nl` and `t.en` (the `genderOptions`, `ageCategoryOptions`, and `relationshipOptions` arrays already exist — keep them):

```tsx
// t.nl
profileLabel: 'Nog even over jou',
profileContinueButton: 'Ga verder',

// t.en
profileLabel: 'A little about you',
profileContinueButton: 'Continue',
```

The profile error keys (`genderEmpty`, `ageCategoryEmpty`, `relationshipEmpty`) already exist in `t[locale].errors` — keep them.

## 4. Make conclusion texts gender-nested (15 → 30)

Currently `t[locale].conclusions` is a flat map of 15 keys. Nest it under `man` and `vrouw`, so each of the 15 keys exists twice — once per gender. Do this in BOTH `t.nl` and `t.en`:

```tsx
// BEFORE
conclusions: {
  'zelfafwijzing': '...',
  'valse-hoop_valse-macht': '...',
  // ... 15 keys
}

// AFTER
conclusions: {
  man: {
    'zelfafwijzing': '...',
    'valse-hoop_valse-macht': '...',
    // ... same 15 keys
  },
  vrouw: {
    'zelfafwijzing': '...',
    'valse-hoop_valse-macht': '...',
    // ... same 15 keys
  },
}
```

Keep the existing placeholder/dummy copy — just duplicate it under `man` and `vrouw` (Alex replaces it later). The 15 keys are unchanged: 5 single-mechanism keys + 10 dual-mechanism keys (`dominant_secondary`).

## 5. Add a gender-normalisation map

The `gender` state holds the raw select value — `man`/`vrouw` in NL but `male`/`female` in EN. The conclusion tables nest under `man`/`vrouw` in both locales, so normalise before lookup. Add this constant near the other fixed maps:

```tsx
const GENDER_TO_CONCLUSION_KEY = {
  man: 'man',
  vrouw: 'vrouw',
  male: 'man',
  female: 'vrouw',
};
```

## 6. NEW Screen 3 — Profile ("Nog even over jou")

Render this when `phase === "profile"`. Show the label `t[locale].profileLabel` (styled as the screen heading — Montserrat, prominent), then three dropdowns in this order, each with a visible label above it, using the same field styling as the opt-in selects:

```tsx
{/* 1. Geslacht */}
<label>{t[locale].genderLabel}</label>
<select
  data-field="gender"
  value={gender}
  onChange={(e) => {
    setGender(e.target.value);
    if (fieldErrors.gender) setFieldErrors(prev => ({ ...prev, gender: '' }));
  }}
  onBlur={() => { if (!gender) setFieldErrors(prev => ({ ...prev, gender: t[locale].errors.genderEmpty })); }}
  aria-invalid={!!fieldErrors.gender}
  aria-describedby={fieldErrors.gender ? 'error-gender' : undefined}
>
  {t[locale].genderOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
</select>
{fieldErrors.gender && <div id="error-gender" style={{ color: '#e53e3e', fontSize: '0.875rem' }}>{fieldErrors.gender}</div>}

{/* 2. Leeftijdscategorie */}
<label>{t[locale].ageCategoryLabel}</label>
<select
  data-field="age-category"
  value={ageCategory}
  onChange={(e) => {
    setAgeCategory(e.target.value);
    if (fieldErrors.ageCategory) setFieldErrors(prev => ({ ...prev, ageCategory: '' }));
  }}
  onBlur={() => { if (!ageCategory) setFieldErrors(prev => ({ ...prev, ageCategory: t[locale].errors.ageCategoryEmpty })); }}
  aria-invalid={!!fieldErrors.ageCategory}
  aria-describedby={fieldErrors.ageCategory ? 'error-ageCategory' : undefined}
>
  {t[locale].ageCategoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
</select>
{fieldErrors.ageCategory && <div id="error-ageCategory" style={{ color: '#e53e3e', fontSize: '0.875rem' }}>{fieldErrors.ageCategory}</div>}

{/* 3. Je relatiestatus */}
<label>{t[locale].relationshipLabel}</label>
<select
  data-field="relationship-status"
  value={relationshipStatus}
  onChange={(e) => {
    setRelationshipStatus(e.target.value);
    if (fieldErrors.relationshipStatus) setFieldErrors(prev => ({ ...prev, relationshipStatus: '' }));
  }}
  onBlur={() => { if (!relationshipStatus) setFieldErrors(prev => ({ ...prev, relationshipStatus: t[locale].errors.relationshipEmpty })); }}
  aria-invalid={!!fieldErrors.relationshipStatus}
  aria-describedby={fieldErrors.relationshipStatus ? 'error-relationship' : undefined}
>
  {t[locale].relationshipOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
</select>
{fieldErrors.relationshipStatus && <div id="error-relationship" style={{ color: '#e53e3e', fontSize: '0.875rem' }}>{fieldErrors.relationshipStatus}</div>}
```

Below the dropdowns, a continue button with text `t[locale].profileContinueButton`, styled like the conclusion CTA pill button, wired to `handleProfileContinue`:

```tsx
function handleProfileContinue() {
  const errors = {};
  if (!gender) errors.gender = t[locale].errors.genderEmpty;
  if (!ageCategory) errors.ageCategory = t[locale].errors.ageCategoryEmpty;
  if (!relationshipStatus) errors.relationshipStatus = t[locale].errors.relationshipEmpty;

  if (Object.keys(errors).length > 0) {
    setFieldErrors(prev => ({ ...prev, ...errors }));
    return;
  }
  setFieldErrors(prev => ({ ...prev, gender: '', ageCategory: '', relationshipStatus: '' }));
  setPhase('conclusion');
}
```

## 7. Conclusion (Screen 4) — gender-differentiated lookup

Change the conclusion text lookup from the old flat form to the gender-nested, normalised form:

```tsx
// OLD
t[locale].conclusions[conclusionKey]

// NEW
t[locale].conclusions[GENDER_TO_CONCLUSION_KEY[gender]][conclusionKey]
```

Also add `data-element="conclusion-text"` to the paragraph that renders this text (test hook for gender differentiation). Everything else on the conclusion screen (label, bridge line, CTA → `setPhase('optin')`) is unchanged.

## 8. Opt-in form (Screen 5) — remove the three profile dropdowns

The gender, age-category, and relationship-status dropdowns now live on Screen 3. **Remove all three `<select>` blocks from the opt-in form.** The opt-in form now contains only:

1. Voornaam (text input) — unchanged
2. E-mailadres (email input) — unchanged
3. Honeypot (hidden) — unchanged
4. NEM Matters consent checkbox — unchanged
5. Submit button, relieve line, disclaimer — unchanged

In `handleSubmit`, **remove** the gender/ageCategory/relationshipStatus validation lines:

```tsx
// DELETE these three lines from handleSubmit's validation block:
if (!relationshipStatus) errors.relationshipStatus = t[locale].errors.relationshipEmpty;
if (!gender) errors.gender = t[locale].errors.genderEmpty;
if (!ageCategory) errors.ageCategory = t[locale].errors.ageCategoryEmpty;
```

Keep `gender`, `ageCategory`, and `relationshipStatus` in the webhook payload — they're read from state (captured on Screen 3). The payload shape is otherwise unchanged.

## 9. Confirmation (Screen 6) — no change

The correction flow ("Vul het opnieuw in" → back to opt-in) already keeps `firstName`, `gender`, `ageCategory`, and `relationshipStatus` in state and only clears the email + regenerates the token. No change needed.

---

## Quick verification after applying

- Answering Q20 lands on **"Nog even over jou"** (3 dropdowns), not straight on the conclusion.
- Clicking "Ga verder" with empty dropdowns shows the three Dutch errors; filling them advances to the conclusion.
- The conclusion text differs by gender (dummy copy is prefixed `[DUMMY man]` / `[DUMMY vrouw]` so you can see it switching).
- The opt-in form shows only name + email + consent — no dropdowns.
- On `/en/`, the profile label reads **"A little about you"** and gender select shows Male/Female, but the conclusion still resolves (EN `male`/`female` normalised to `man`/`vrouw`).
