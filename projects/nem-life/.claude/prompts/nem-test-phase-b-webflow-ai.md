# NEM TEST Phase B -- Webflow AI Prompt

You are modifying a copy of the Multi-Step Quiz component. Here's what changes.

---

## 1. Phase model

Replace the existing phase model:

```
// OLD: "intro" | "quiz" | "results"
// NEW: "quiz" | "profile" | "conclusion" | "optin" | "confirmation"
```

There is no intro screen. Screen 1 IS the quiz start. The `quiz` phase covers Screens 1 and 2 (Q1-Q20). `profile` is Screen 3 (gender, age category, relationship status). `conclusion` is Screen 4. `optin` is Screen 5. `confirmation` is Screen 6.

The `profile` phase is inserted between the last question and the conclusion because the gender captured there selects the correct gender-differentiated conclusion text on Screen 4, and moving those fields off the opt-in form lightens it at the highest drop-off point.

---

## 2. Props

Remove all existing props. Replace with:

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
  question1: props.Text({ name: "Question 1", defaultValue: "Na een gesprek dat niet lekker liep, blijf ik uren of dagen malen over wat ik fout deed." }),
  question2: props.Text({ name: "Question 2", defaultValue: "Als iets in een relatie of op werk misgaat, ben ik de eerste die denkt dat het aan mij ligt." }),
  question3: props.Text({ name: "Question 3", defaultValue: "Ik stel beslissingen of dingen die ik eigenlijk wil doen langer uit dan logisch is." }),
  question4: props.Text({ name: "Question 4", defaultValue: "Ik betrap mezelf erop dat ik streng oordeel over hoe anderen dingen doen." }),
  question5: props.Text({ name: "Question 5", defaultValue: "Ik vermijd situaties die spanning oproepen, ook als ik eigenlijk wel zou willen." }),
  question6: props.Text({ name: "Question 6", defaultValue: "Ik blijf mijn best doen om iets of iemand naar mijn hand te zetten, ook als ik weet dat het niet gaat lukken." }),
  question7: props.Text({ name: "Question 7", defaultValue: "Als ik moe of overweldigd ben, zegt iets in mij: \"Ik kan dit niet aan.\"" }),
  question8: props.Text({ name: "Question 8", defaultValue: "Mijn standaardreactie als er iets gebeurt is: \"Maakt niet uit, het komt wel goed.\"" }),
  question9: props.Text({ name: "Question 9", defaultValue: "Als iemand iets doet wat me raakt, ervaar ik dat al snel als een persoonlijke aanval en ga ik er fel tegenin." }),
  question10: props.Text({ name: "Question 10", defaultValue: "Bij iets nieuws of onbekends ga ik in mijn hoofd direct naar wat er mis zou kunnen gaan." }),
  question11: props.Text({ name: "Question 11", defaultValue: "Ik voel een drive in mijn lichaam - gejaagd, hoog, ik kan niet stil zitten als er nog iets opgelost moet worden." }),
  question12: props.Text({ name: "Question 12", defaultValue: "Ik denk vaak: \"Als ik dit nou maar goed doe, dan komt het wel goed.\"" }),
  question13: props.Text({ name: "Question 13", defaultValue: "In situaties die me eigenlijk zouden moeten raken, merk ik nauwelijks iets op in mijn lichaam - alsof ik op afstand sta van mijn eigen leven." }),
  question14: props.Text({ name: "Question 14", defaultValue: "Op het moment dat ik me aangevallen voel, voel ik mijn lichaam aanspannen - mijn kaken, mijn schouders, mijn vuisten, alsof ik me acuut wil verdedigen." }),
  question15: props.Text({ name: "Question 15", defaultValue: "In spannende situaties voel ik mijn lichaam terugdeinzen - een verkramping, het gevoel dat ik ergens van weg wil." }),
  question16: props.Text({ name: "Question 16", defaultValue: "Als de sfeer dreigt om te slaan, doe ik extra mijn best en pas ik me aan om het goed te houden." }),
  question17: props.Text({ name: "Question 17", defaultValue: "Als iets misgaat voel ik mezelf wegzakken - mijn energie verdwijnt en alles wordt zwaar." }),
  question18: props.Text({ name: "Question 18", defaultValue: "Als anderen om mij heen sterk reageren op een emotionele gebeurtenis, blijf ik vanbinnen vaak vlak." }),
  question19: props.Text({ name: "Question 19", defaultValue: "Als iemand dichtbij iets niet doet zoals ik wil, voel ik irritatie of boosheid die maar niet weggaat." }),
  question20: props.Text({ name: "Question 20", defaultValue: "Als ik iets moet doen wat goed voor me is maar me angst geeft, kies ik vaak voor wat veilig voelt." }),
}
```

---

## 3. State

```tsx
const [phase, setPhase] = useState("quiz");           // "quiz" | "profile" | "conclusion" | "optin" | "confirmation"
const [currentStep, setCurrentStep] = useState(0);     // 0-19 (Q1-Q20)
const [answers, setAnswers] = useState(Array(20).fill(null)); // null or 0-4
const [firstName, setFirstName] = useState("");
const [email, setEmail] = useState("");
const [relationshipStatus, setRelationshipStatus] = useState("");
const [gender, setGender] = useState("");
const [ageCategory, setAgeCategory] = useState("");
const [nemMattersConsent, setNemMattersConsent] = useState(false);
const [honeypot, setHoneypot] = useState("");
const [submitting, setSubmitting] = useState(false);
const [token, setToken] = useState(() => crypto.randomUUID());
const [fieldErrors, setFieldErrors] = useState({});
const [conclusionKey, setConclusionKey] = useState("");
```

---

## 4. Locale detection and translations

### Locale detection

```tsx
function getLocale() {
  if (window.location.pathname.startsWith('/en/')) return 'en';
  if (document.documentElement.lang?.startsWith('en')) return 'en';
  return 'nl';
}

const locale = getLocale();
```

### Full translations object

```tsx
const t = {
  nl: {
    answers: ['nooit', 'zelden', 'soms', 'regelmatig', 'heel vaak'],
    progress: (n, total) => `Vraag ${n} van ${total}`,
    // Screen 3 (Profile)
    profileLabel: 'Nog even over jou',
    profileContinueButton: 'Ga verder',
    genderLabel: 'Geslacht',
    genderOptions: [
      { value: '', label: 'Selecteer...' },
      { value: 'man', label: 'Man' },
      { value: 'vrouw', label: 'Vrouw' },
    ],
    ageCategoryLabel: 'Leeftijdscategorie',
    ageCategoryOptions: [
      { value: '', label: 'Selecteer...' },
      { value: '18-30', label: '18-30' },
      { value: '31-40', label: '31-40' },
      { value: '41-50', label: '41-50' },
      { value: '51-60', label: '51-60' },
      { value: '60+', label: '60+' },
    ],
    relationshipLabel: 'Je relatiestatus',
    relationshipOptions: [
      { value: '', label: 'Selecteer...' },
      { value: 'alleenstaand', label: 'Alleenstaand' },
      { value: 'in-een-relatie', label: 'In een relatie' },
      { value: 'gescheiden', label: 'Gescheiden' },
      { value: 'anders', label: 'Anders' },
    ],
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
    submitButtonText: 'Ontvang mijn rapport',
    errors: {
      firstNameEmpty: 'Vul je voornaam in',
      emailEmpty: 'Vul je e-mailadres in',
      emailInvalid: 'Voer een geldig e-mailadres in',
      relationshipEmpty: 'Selecteer je relatiestatus',
      genderEmpty: 'Selecteer je geslacht',
      ageCategoryEmpty: 'Selecteer je leeftijdscategorie',
      consentRequired: 'Bevestig je aanmelding voor NEM Matters',
      rateLimited: 'Probeer het later opnieuw',
      generic: 'Er ging iets mis. Probeer het opnieuw.',
    },
    confirmationLabel: 'Nog één stap',
    confirmationMain: 'Je antwoorden zijn opgeslagen. Zodra je je e-mailadres bevestigt, stellen we jouw persoonlijke rapport samen en sturen we het naar je inbox.',
    confirmationSecondary: 'Controleer je inbox - je ontvangt direct een mail van NEM Life. Klik op de bevestigingslink daarin en je rapport is onderweg.',
    noEmailReceived: 'Geen mail ontvangen? Controleer je spamfolder.',
    wrongEmail: 'Verkeerd e-mailadres opgegeven?',
    wrongEmailLink: 'Vul het opnieuw in.',
    questions: [
      'Na een gesprek dat niet lekker liep, blijf ik uren of dagen malen over wat ik fout deed.',
      'Als iets in een relatie of op werk misgaat, ben ik de eerste die denkt dat het aan mij ligt.',
      'Ik stel beslissingen of dingen die ik eigenlijk wil doen langer uit dan logisch is.',
      'Ik betrap mezelf erop dat ik streng oordeel over hoe anderen dingen doen.',
      'Ik vermijd situaties die spanning oproepen, ook als ik eigenlijk wel zou willen.',
      'Ik blijf mijn best doen om iets of iemand naar mijn hand te zetten, ook als ik weet dat het niet gaat lukken.',
      'Als ik moe of overweldigd ben, zegt iets in mij: "Ik kan dit niet aan."',
      'Mijn standaardreactie als er iets gebeurt is: "Maakt niet uit, het komt wel goed."',
      'Als iemand iets doet wat me raakt, ervaar ik dat al snel als een persoonlijke aanval en ga ik er fel tegenin.',
      'Bij iets nieuws of onbekends ga ik in mijn hoofd direct naar wat er mis zou kunnen gaan.',
      'Ik voel een drive in mijn lichaam - gejaagd, hoog, ik kan niet stil zitten als er nog iets opgelost moet worden.',
      'Ik denk vaak: "Als ik dit nou maar goed doe, dan komt het wel goed."',
      'In situaties die me eigenlijk zouden moeten raken, merk ik nauwelijks iets op in mijn lichaam - alsof ik op afstand sta van mijn eigen leven.',
      'Op het moment dat ik me aangevallen voel, voel ik mijn lichaam aanspannen - mijn kaken, mijn schouders, mijn vuisten, alsof ik me acuut wil verdedigen.',
      'In spannende situaties voel ik mijn lichaam terugdeinzen - een verkramping, het gevoel dat ik ergens van weg wil.',
      'Als de sfeer dreigt om te slaan, doe ik extra mijn best en pas ik me aan om het goed te houden.',
      'Als iets misgaat voel ik mezelf wegzakken - mijn energie verdwijnt en alles wordt zwaar.',
      'Als anderen om mij heen sterk reageren op een emotionele gebeurtenis, blijf ik vanbinnen vaak vlak.',
      'Als iemand dichtbij iets niet doet zoals ik wil, voel ik irritatie of boosheid die maar niet weggaat.',
      'Als ik iets moet doen wat goed voor me is maar me angst geeft, kies ik vaak voor wat veilig voelt.',
    ],
    // Gender-nested: t.nl.conclusions[gender][conclusionKey]. 15 keys \u00d7 2 genders = 30 texts.
    conclusions: {
      man: {
        'zelfafwijzing': '[DUMMY man] Zelfafwijzing \u2014 Alex schrijft deze tekst nog.',
        'emotionele-verdoving': '[DUMMY man] Emotionele Verdoving \u2014 Alex schrijft deze tekst nog.',
        'valse-macht': '[DUMMY man] Valse Macht \u2014 Alex schrijft deze tekst nog.',
        'angst': '[DUMMY man] Angst \u2014 Alex schrijft deze tekst nog.',
        'valse-hoop': '[DUMMY man] Valse Hoop \u2014 Alex schrijft deze tekst nog.',
        'zelfafwijzing_emotionele-verdoving': '[DUMMY man] Zelfafwijzing + Emotionele Verdoving \u2014 Alex schrijft deze tekst nog.',
        'zelfafwijzing_valse-macht': '[DUMMY man] Zelfafwijzing + Valse Macht \u2014 Alex schrijft deze tekst nog.',
        'zelfafwijzing_angst': '[DUMMY man] Zelfafwijzing + Angst \u2014 Alex schrijft deze tekst nog.',
        'zelfafwijzing_valse-hoop': '[DUMMY man] Zelfafwijzing + Valse Hoop \u2014 Alex schrijft deze tekst nog.',
        'emotionele-verdoving_valse-macht': '[DUMMY man] Emotionele Verdoving + Valse Macht \u2014 Alex schrijft deze tekst nog.',
        'emotionele-verdoving_angst': '[DUMMY man] Emotionele Verdoving + Angst \u2014 Alex schrijft deze tekst nog.',
        'emotionele-verdoving_valse-hoop': '[DUMMY man] Emotionele Verdoving + Valse Hoop \u2014 Alex schrijft deze tekst nog.',
        'valse-macht_angst': '[DUMMY man] Valse Macht + Angst \u2014 Alex schrijft deze tekst nog.',
        'valse-macht_valse-hoop': '[DUMMY man] Valse Macht + Valse Hoop \u2014 Alex schrijft deze tekst nog.',
        'angst_valse-hoop': '[DUMMY man] Angst + Valse Hoop \u2014 Alex schrijft deze tekst nog.',
      },
      vrouw: {
        'zelfafwijzing': '[DUMMY vrouw] Zelfafwijzing \u2014 Alex schrijft deze tekst nog.',
        'emotionele-verdoving': '[DUMMY vrouw] Emotionele Verdoving \u2014 Alex schrijft deze tekst nog.',
        'valse-macht': '[DUMMY vrouw] Valse Macht \u2014 Alex schrijft deze tekst nog.',
        'angst': '[DUMMY vrouw] Angst \u2014 Alex schrijft deze tekst nog.',
        'valse-hoop': '[DUMMY vrouw] Valse Hoop \u2014 Alex schrijft deze tekst nog.',
        'zelfafwijzing_emotionele-verdoving': '[DUMMY vrouw] Zelfafwijzing + Emotionele Verdoving \u2014 Alex schrijft deze tekst nog.',
        'zelfafwijzing_valse-macht': '[DUMMY vrouw] Zelfafwijzing + Valse Macht \u2014 Alex schrijft deze tekst nog.',
        'zelfafwijzing_angst': '[DUMMY vrouw] Zelfafwijzing + Angst \u2014 Alex schrijft deze tekst nog.',
        'zelfafwijzing_valse-hoop': '[DUMMY vrouw] Zelfafwijzing + Valse Hoop \u2014 Alex schrijft deze tekst nog.',
        'emotionele-verdoving_valse-macht': '[DUMMY vrouw] Emotionele Verdoving + Valse Macht \u2014 Alex schrijft deze tekst nog.',
        'emotionele-verdoving_angst': '[DUMMY vrouw] Emotionele Verdoving + Angst \u2014 Alex schrijft deze tekst nog.',
        'emotionele-verdoving_valse-hoop': '[DUMMY vrouw] Emotionele Verdoving + Valse Hoop \u2014 Alex schrijft deze tekst nog.',
        'valse-macht_angst': '[DUMMY vrouw] Valse Macht + Angst \u2014 Alex schrijft deze tekst nog.',
        'valse-macht_valse-hoop': '[DUMMY vrouw] Valse Macht + Valse Hoop \u2014 Alex schrijft deze tekst nog.',
        'angst_valse-hoop': '[DUMMY vrouw] Angst + Valse Hoop \u2014 Alex schrijft deze tekst nog.',
      },
    },
  },
  en: {
    answers: ['never', 'rarely', 'sometimes', 'regularly', 'very often'],
    progress: (n, total) => `Question ${n} of ${total}`,
    // Screen 3 (Profile)
    profileLabel: 'A little about you',
    profileContinueButton: 'Continue',
    genderLabel: 'Gender',
    genderOptions: [
      { value: '', label: 'Select...' },
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
    ],
    ageCategoryLabel: 'Age category',
    ageCategoryOptions: [
      { value: '', label: 'Select...' },
      { value: '18-30', label: '18-30' },
      { value: '31-40', label: '31-40' },
      { value: '41-50', label: '41-50' },
      { value: '51-60', label: '51-60' },
      { value: '60+', label: '60+' },
    ],
    relationshipLabel: 'Your relationship status',
    relationshipOptions: [
      { value: '', label: 'Select...' },
      { value: 'single', label: 'Single' },
      { value: 'in-a-relationship', label: 'In a relationship' },
      { value: 'divorced', label: 'Divorced' },
      { value: 'other', label: 'Other' },
    ],
    // Screen 4 (Conclusion)
    conclusionLabel: 'Your result',
    bridgeLine: 'Want to understand where this comes from and what it costs you? Your personal report goes deeper.',
    // Screen 5 (Opt-in — simplified, profile fields captured on Screen 3)
    optinLabel: 'Where should we send your report?',
    optinIntro: "Fill in your details below. You'll receive it in your inbox within a few minutes.",
    firstNamePlaceholder: 'First name',
    emailPlaceholder: 'Email address',
    consentLabel: "You'll be added to NEM Matters - NEM Life's newsletter. You can unsubscribe at any time.",
    relieveLine: 'No spam & your data stays safe. Of course.',
    disclaimer: 'This test is not a psychological diagnosis. It is a mirror based on your answers - intended as a starting point for reflection, not a final verdict.',
    submitButtonText: 'Receive my report',
    errors: {
      firstNameEmpty: 'Enter your first name',
      emailEmpty: 'Enter your email address',
      emailInvalid: 'Enter a valid email address',
      relationshipEmpty: 'Select your relationship status',
      genderEmpty: 'Select your gender',
      ageCategoryEmpty: 'Select your age category',
      consentRequired: 'Confirm your subscription to NEM Matters',
      rateLimited: 'Try again later',
      generic: 'Something went wrong. Please try again.',
    },
    confirmationLabel: 'One more step',
    confirmationMain: "Your answers have been saved. As soon as you confirm your email address, we'll put together your personal report and send it to your inbox.",
    confirmationSecondary: "Check your inbox - you'll receive an email from NEM Life shortly. Click the confirmation link and your report is on its way.",
    noEmailReceived: "Didn't receive an email? Check your spam folder.",
    wrongEmail: 'Entered the wrong email address?',
    wrongEmailLink: 'Fill it in again.',
    questions: [
      "After a conversation that didn't go well, I keep going over what I did wrong for hours or days.",
      "When something goes wrong in a relationship or at work, I'm the first to think it's my fault.",
      'I put off decisions or things I actually want to do longer than is logical.',
      'I catch myself judging how others do things harshly.',
      'I avoid situations that create tension, even if I actually would want to.',
      "I keep trying to control something or someone, even when I know it won't work.",
      'When I\'m tired or overwhelmed, something inside me says: "I can\'t handle this."',
      'My default reaction when something happens is: "Doesn\'t matter, it\'ll be fine."',
      'When someone does something that affects me, I quickly experience it as a personal attack and push back hard.',
      'With something new or unknown, my mind immediately goes to what could go wrong.',
      "I feel a drive in my body - rushed, wired, I can't sit still when there's still something to be resolved.",
      'I often think: "If I just do this right, everything will be fine."',
      'In situations that should really affect me, I barely notice anything in my body - as if I\'m standing at a distance from my own life.',
      'The moment I feel attacked, I feel my body tense up - my jaw, my shoulders, my fists, as if I need to defend myself immediately.',
      'In tense situations I feel my body recoil - a cramping, the feeling that I want to get away.',
      'When the atmosphere threatens to change, I try extra hard and adjust to keep things good.',
      'When something goes wrong I feel myself sinking - my energy disappears and everything becomes heavy.',
      'When others around me react strongly to an emotional event, I often stay flat inside.',
      "When someone close doesn't do what I want, I feel irritation or anger that just won't go away.",
      'When I have to do something that is good for me but scares me, I often choose what feels safe.',
    ],
    // Gender-nested: t.en.conclusions[genderKey][conclusionKey]. genderKey is normalised to 'man'/'vrouw'.
    conclusions: {
      man: {
        'zelfafwijzing': '[DUMMY man] Self-rejection \u2014 Alex will write this text.',
        'emotionele-verdoving': '[DUMMY man] Emotional Numbing \u2014 Alex will write this text.',
        'valse-macht': '[DUMMY man] False Power \u2014 Alex will write this text.',
        'angst': '[DUMMY man] Fear \u2014 Alex will write this text.',
        'valse-hoop': '[DUMMY man] False Hope \u2014 Alex will write this text.',
        'zelfafwijzing_emotionele-verdoving': '[DUMMY man] Self-rejection + Emotional Numbing \u2014 Alex will write this text.',
        'zelfafwijzing_valse-macht': '[DUMMY man] Self-rejection + False Power \u2014 Alex will write this text.',
        'zelfafwijzing_angst': '[DUMMY man] Self-rejection + Fear \u2014 Alex will write this text.',
        'zelfafwijzing_valse-hoop': '[DUMMY man] Self-rejection + False Hope \u2014 Alex will write this text.',
        'emotionele-verdoving_valse-macht': '[DUMMY man] Emotional Numbing + False Power \u2014 Alex will write this text.',
        'emotionele-verdoving_angst': '[DUMMY man] Emotional Numbing + Fear \u2014 Alex will write this text.',
        'emotionele-verdoving_valse-hoop': '[DUMMY man] Emotional Numbing + False Hope \u2014 Alex will write this text.',
        'valse-macht_angst': '[DUMMY man] False Power + Fear \u2014 Alex will write this text.',
        'valse-macht_valse-hoop': '[DUMMY man] False Power + False Hope \u2014 Alex will write this text.',
        'angst_valse-hoop': '[DUMMY man] Fear + False Hope \u2014 Alex will write this text.',
      },
      vrouw: {
        'zelfafwijzing': '[DUMMY vrouw] Self-rejection \u2014 Alex will write this text.',
        'emotionele-verdoving': '[DUMMY vrouw] Emotional Numbing \u2014 Alex will write this text.',
        'valse-macht': '[DUMMY vrouw] False Power \u2014 Alex will write this text.',
        'angst': '[DUMMY vrouw] Fear \u2014 Alex will write this text.',
        'valse-hoop': '[DUMMY vrouw] False Hope \u2014 Alex will write this text.',
        'zelfafwijzing_emotionele-verdoving': '[DUMMY vrouw] Self-rejection + Emotional Numbing \u2014 Alex will write this text.',
        'zelfafwijzing_valse-macht': '[DUMMY vrouw] Self-rejection + False Power \u2014 Alex will write this text.',
        'zelfafwijzing_angst': '[DUMMY vrouw] Self-rejection + Fear \u2014 Alex will write this text.',
        'zelfafwijzing_valse-hoop': '[DUMMY vrouw] Self-rejection + False Hope \u2014 Alex will write this text.',
        'emotionele-verdoving_valse-macht': '[DUMMY vrouw] Emotional Numbing + False Power \u2014 Alex will write this text.',
        'emotionele-verdoving_angst': '[DUMMY vrouw] Emotional Numbing + Fear \u2014 Alex will write this text.',
        'emotionele-verdoving_valse-hoop': '[DUMMY vrouw] Emotional Numbing + False Hope \u2014 Alex will write this text.',
        'valse-macht_angst': '[DUMMY vrouw] False Power + Fear \u2014 Alex will write this text.',
        'valse-macht_valse-hoop': '[DUMMY vrouw] False Power + False Hope \u2014 Alex will write this text.',
        'angst_valse-hoop': '[DUMMY vrouw] Fear + False Hope \u2014 Alex will write this text.',
      },
    },
  },
};
```

The component uses `t[locale]` for all structural strings. Question text comes from props first, falling back to `t[locale].questions[index]`.

---

## 5. Questions and mechanism mapping

### All 20 questions (in test order)

The question text for each question comes from its prop (`question1` through `question20`). The props have Dutch defaults (listed above). The mechanism mapping below is fixed in code and never changes regardless of prop values.

| # | Mechanism | Dimension |
|---|-----------|-----------|
| 1 | Zelfafwijzing | situationeel |
| 2 | Zelfafwijzing | gedrag |
| 3 | Emotionele Verdoving | gedrag |
| 4 | Valse Macht | gedachte |
| 5 | Angst | gedrag |
| 6 | Valse Hoop | gedrag |
| 7 | Zelfafwijzing | gedachte |
| 8 | Emotionele Verdoving | gedachte |
| 9 | Valse Macht | gedrag |
| 10 | Angst | gedachte |
| 11 | Valse Hoop | lichaam |
| 12 | Valse Hoop | gedachte |
| 13 | Emotionele Verdoving | lichaam |
| 14 | Valse Macht | lichaam |
| 15 | Angst | lichaam |
| 16 | Valse Hoop | situationeel |
| 17 | Zelfafwijzing | lichaam |
| 18 | Emotionele Verdoving | situationeel |
| 19 | Valse Macht | situationeel |
| 20 | Angst | situationeel |

### Mechanism mapping constant (fixed in code)

```tsx
const MECHANISM_MAP = {
  zelfafwijzing:       { questions: [0, 1, 6, 16], bodyQ: 16, situationalQ: 0 },
  emotioneleVerdoving: { questions: [2, 7, 12, 17], bodyQ: 12, situationalQ: 17 },
  valseMacht:          { questions: [3, 8, 13, 18], bodyQ: 13, situationalQ: 18 },
  angst:               { questions: [4, 9, 14, 19], bodyQ: 14, situationalQ: 19 },
  valseHoop:           { questions: [5, 10, 11, 15], bodyQ: 10, situationalQ: 15 },
};
```

Note: question indices are 0-based in the array (Q1 = index 0, Q17 = index 16, etc.).

### Mechanism key to conclusion text key mapping

The conclusion text keys use hyphenated lowercase names, while the `MECHANISM_MAP` keys use camelCase. Use this mapping when building the conclusion text key:

```tsx
const MECHANISM_TO_KEY = {
  zelfafwijzing: 'zelfafwijzing',
  emotioneleVerdoving: 'emotionele-verdoving',
  valseMacht: 'valse-macht',
  angst: 'angst',
  valseHoop: 'valse-hoop',
};
```

### Gender to conclusion-key mapping (fixed in code)

The conclusion texts are nested under `man` / `vrouw` in BOTH locales. The `gender` state holds the raw select value, which is `man`/`vrouw` in NL but `male`/`female` in EN. Normalise it before looking up the conclusion:

```tsx
const GENDER_TO_CONCLUSION_KEY = {
  man: 'man',
  vrouw: 'vrouw',
  male: 'man',
  female: 'vrouw',
};
```

Always resolve the conclusion text via `t[locale].conclusions[GENDER_TO_CONCLUSION_KEY[gender]][conclusionKey]`.

---

## 6. Scoring engine

### Answer scoring

5 answer options per question. The answer index IS the score:
- nooit = 0
- zelden = 1
- soms = 2
- regelmatig = 3
- heel vaak = 4

### Per-mechanism calculation

Each mechanism has exactly 4 questions. The mechanism score is the sum of those 4 answer values. Range per mechanism: 0-16. Total score range: 0-80.

### Primary and secondary determination

```tsx
function calculateScores(answers) {
  const scores = {};
  for (const [mechanism, { questions }] of Object.entries(MECHANISM_MAP)) {
    scores[mechanism] = questions.reduce((sum, qi) => sum + (answers[qi] ?? 0), 0);
  }

  // Sort mechanisms by score descending
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  let primary = sorted[0][0];
  let secondary = null;

  // Tiebreaker: if top mechanisms are tied, use body + situational question scores
  const topScore = sorted[0][1];
  const tied = sorted.filter(([, s]) => s === topScore);

  if (tied.length > 1) {
    // Tiebreaker: sum of body question score + situational question score
    const withTiebreak = tied.map(([mech]) => {
      const { bodyQ, situationalQ } = MECHANISM_MAP[mech];
      return { mech, tiebreak: (answers[bodyQ] ?? 0) + (answers[situationalQ] ?? 0) };
    });
    withTiebreak.sort((a, b) => b.tiebreak - a.tiebreak);
    primary = withTiebreak[0].mech;

    // Re-sort: primary first, then remaining by score desc
    const remaining = sorted.filter(([m]) => m !== primary);
    if (remaining.length > 0 && topScore - remaining[0][1] <= 3) {
      secondary = remaining[0][0];
    }
  } else {
    // No tie: check if second-highest is within 3 points
    if (sorted.length > 1 && sorted[0][1] - sorted[1][1] <= 3) {
      secondary = sorted[1][0];
    }
  }

  // Build conclusion text key
  const primaryKey = MECHANISM_TO_KEY[primary];
  const conclusionKey = secondary
    ? `${primaryKey}_${MECHANISM_TO_KEY[secondary]}`
    : primaryKey;

  return { scores, primary, secondary, conclusionKey, totalScore: Object.values(scores).reduce((a, b) => a + b, 0) };
}
```

### Expose scores on window for testing

After calculating scores (when transitioning from quiz to conclusion phase), set:

```tsx
window.__nemTestScores = {
  zelfafwijzing: scores.zelfafwijzing,
  emotioneleVerdoving: scores.emotioneleVerdoving,
  valseMacht: scores.valseMacht,
  angst: scores.angst,
  valseHoop: scores.valseHoop,
};
```

---

## 7. Screen-by-screen implementation

### Screen 1 -- Start (Q1)

This is the `quiz` phase with `currentStep === 0`.

- Add `data-element="quiz-module"` on the outermost quiz container div.
- Show progress text: `t[locale].progress(1, 20)` -- renders "Vraag 1 van 20". Put an `aria-live="polite"` attribute on the progress element.
- Show the question text from `question1` prop (or fallback to `t[locale].questions[0]`).
- Show the reassurance line from the `reassuranceText` prop. Only visible when `currentStep === 0`.
- Show 5 pill buttons with the answer labels from `t[locale].answers`.
- Do NOT show a back button on Q1.

### Screen 2 -- Questions (Q2-Q20)

This is the `quiz` phase with `currentStep > 0`.

- Show progress text: `t[locale].progress(currentStep + 1, 20)`.
- Show a back button with text content of a left arrow character. Add `data-element="back-button"` on this button. Clicking it decrements `currentStep` by 1. The previous question's answer should appear pre-selected (the pill button matching `answers[currentStep - 1]` should have `aria-selected="true"` and the selected visual style).
- Show the question text from the corresponding prop (`question2` through `question20`), falling back to `t[locale].questions[currentStep]`.
- Show 5 pill buttons. If `answers[currentStep]` is not null, the button at that index should show the selected state.
- Do NOT show the reassurance line on Q2+.

### Answer UX -- pill buttons (Screens 1 and 2)

Replace the existing Likert circle buttons with pill-shaped buttons:

```tsx
// Container
<div style={{
  display: 'flex',
  gap: '12px',
  flexWrap: 'nowrap',
  ...(isMobile ? { flexDirection: 'column' } : {}),
}}>
  {t[locale].answers.map((label, i) => (
    <button
      key={i}
      aria-selected={answers[currentStep] === i}
      onClick={() => handleAnswer(i)}
      style={{
        borderRadius: '999px',
        padding: '12px 24px',
        border: `1.5px solid ${answers[currentStep] === i ? 'var(--_token---accent-main, #fafa7d)' : 'var(--_token---accent-light-grey, #ecebe8)'}`,
        backgroundColor: answers[currentStep] === i ? 'var(--_token---accent-main, #fafa7d)' : 'white',
        color: 'var(--_token---text-main, #292828)',
        cursor: 'pointer',
        fontFamily: 'Lato, sans-serif',
        fontSize: 'var(--_typography---paragraph--standard, 1rem)',
        transition: prefersReducedMotion ? 'none' : 'all 0.15s ease',
        ...(isMobile ? { width: '100%' } : {}),
      }}
      onMouseEnter={(e) => {
        if (answers[currentStep] !== i) {
          e.currentTarget.style.borderColor = 'var(--_token---accent-main, #fafa7d)';
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--_token---accent-main, #fafa7d) 20%, white)';
        }
      }}
      onMouseLeave={(e) => {
        if (answers[currentStep] !== i) {
          e.currentTarget.style.borderColor = 'var(--_token---accent-light-grey, #ecebe8)';
          e.currentTarget.style.backgroundColor = 'white';
        }
      }}
    >
      {label}
    </button>
  ))}
</div>
```

Detect mobile and reduced motion as reactive state. Define these once at the top of the component (not inline in JSX):

```tsx
const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

useEffect(() => {
  const mql = window.matchMedia('(max-width: 768px)');
  const handler = (e) => setIsMobile(e.matches);
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}, []);
```

Use `isMobile` and `prefersReducedMotion` throughout the component — do not redeclare them.

### Auto-advance on answer selection

When a pill button is clicked, auto-advance always fires regardless of whether the user arrived via the back button. The 200ms delay gives visual feedback before advancing.

1. Compute the updated answers array as a local variable: `const updatedAnswers = answers.map((a, i) => i === currentStep ? selectedIndex : a);`
2. Set the answer in state: `setAnswers(updatedAnswers);` (pill shows selected state).
3. Wait 200ms.
4. Fade out the current question (300ms fade, or instant if `prefers-reduced-motion`).
5. If `currentStep < 19`: increment `currentStep`.
6. If `currentStep === 19` (Q20 answered): call `calculateScores(updatedAnswers)` — pass the local variable, NOT the stale `answers` state. Set `conclusionKey` from the result, expose `window.__nemTestScores`, and set `phase` to `"profile"` (Screen 3). Scoring does not depend on gender — only the conclusion *text lookup* on Screen 4 does — so it is safe to compute scores here, before the profile fields are collected.

### Screen 3 -- Profile ("Nog even over jou")

Phase: `"profile"`. This is a NEW screen with no Phase A equivalent, inserted between Q20 and the conclusion. The gender captured here selects the correct gender-differentiated conclusion text on Screen 4.

- Show the label: `t[locale].profileLabel` -- renders "Nog even over jou" in NL. Style it like the conclusion/confirmation labels (Montserrat, prominent — this is the screen heading, not a muted sub-label).
- Show 3 dropdowns in this order, each with a visible label above it. Use the same field styling (`fieldStyle` / `fieldErrorStyle`) as the opt-in selects.

**1. Geslacht** (dropdown) -- `data-field="gender"`
```tsx
<label>{t[locale].genderLabel}</label>
<select
  data-field="gender"
  value={gender}
  onChange={(e) => {
    setGender(e.target.value);
    if (fieldErrors.gender) setFieldErrors(prev => ({ ...prev, gender: '' }));
  }}
  onBlur={() => {
    if (!gender) setFieldErrors(prev => ({ ...prev, gender: t[locale].errors.genderEmpty }));
  }}
  aria-invalid={!!fieldErrors.gender}
  aria-describedby={fieldErrors.gender ? 'error-gender' : undefined}
>
  {t[locale].genderOptions.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
{fieldErrors.gender && <div id="error-gender" style={{ color: '#e53e3e', fontSize: '0.875rem' }}>{fieldErrors.gender}</div>}
```

**2. Leeftijdscategorie** (dropdown) -- `data-field="age-category"`
```tsx
<label>{t[locale].ageCategoryLabel}</label>
<select
  data-field="age-category"
  value={ageCategory}
  onChange={(e) => {
    setAgeCategory(e.target.value);
    if (fieldErrors.ageCategory) setFieldErrors(prev => ({ ...prev, ageCategory: '' }));
  }}
  onBlur={() => {
    if (!ageCategory) setFieldErrors(prev => ({ ...prev, ageCategory: t[locale].errors.ageCategoryEmpty }));
  }}
  aria-invalid={!!fieldErrors.ageCategory}
  aria-describedby={fieldErrors.ageCategory ? 'error-ageCategory' : undefined}
>
  {t[locale].ageCategoryOptions.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
{fieldErrors.ageCategory && <div id="error-ageCategory" style={{ color: '#e53e3e', fontSize: '0.875rem' }}>{fieldErrors.ageCategory}</div>}
```

**3. Je relatiestatus** (dropdown) -- `data-field="relationship-status"`
```tsx
<label>{t[locale].relationshipLabel}</label>
<select
  data-field="relationship-status"
  value={relationshipStatus}
  onChange={(e) => {
    setRelationshipStatus(e.target.value);
    if (fieldErrors.relationshipStatus) setFieldErrors(prev => ({ ...prev, relationshipStatus: '' }));
  }}
  onBlur={() => {
    if (!relationshipStatus) setFieldErrors(prev => ({ ...prev, relationshipStatus: t[locale].errors.relationshipEmpty }));
  }}
  aria-invalid={!!fieldErrors.relationshipStatus}
  aria-describedby={fieldErrors.relationshipStatus ? 'error-relationship' : undefined}
>
  {t[locale].relationshipOptions.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
{fieldErrors.relationshipStatus && <div id="error-relationship" style={{ color: '#e53e3e', fontSize: '0.875rem' }}>{fieldErrors.relationshipStatus}</div>}
```

**Continue button** -- text `t[locale].profileContinueButton` ("Ga verder" / "Continue"):

```tsx
<button onClick={handleProfileContinue} style={{ /* same pill CTA styling as the conclusion CTA */ }}>
  {t[locale].profileContinueButton}
</button>
```

**Profile continue handler** -- validates all 3 dropdowns on click; only advances when all are selected:

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

### Screen 4 -- Conclusion

Phase: `"conclusion"`.

- Show the label: `t[locale].conclusionLabel` -- renders "Jouw uitkomst" in NL. Style it in muted text color (`var(--_token---text-olive, #706d56)`), small font size, uppercase or similar to the progress indicator style.
- Show the **gender-differentiated** conclusion text: `t[locale].conclusions[GENDER_TO_CONCLUSION_KEY[gender]][conclusionKey]`. The `gender` was captured on Screen 3; normalise it via `GENDER_TO_CONCLUSION_KEY` (EN uses `male`/`female`, the conclusion tables nest under `man`/`vrouw`). Render it in a paragraph carrying `data-element="conclusion-text"` (test hook). No API call, no loading spinner -- it renders instantly from the client-side scoring result.
- Show the bridge line: `t[locale].bridgeLine`. Style it with normal text weight, visible and prominent (not muted -- this is conversion-weight copy).
- Show a CTA button with text `{ctaButtonText || t[locale].submitButtonText}` (falls back to the translations value if the prop is empty). Clicking it sets `phase` to `"optin"`.

### Screen 5 -- Opt-in form

Phase: `"optin"`. Simplified -- gender, age category, and relationship status were captured on Screen 3, so this form only collects name, email, and consent.

- Show the label: `t[locale].optinLabel` -- renders "Waar sturen we jouw rapport naartoe?"
- Show the intro text: `t[locale].optinIntro`.
- Show the form with these fields in order:

**1. Voornaam** (text input)
```tsx
<input
  type="text"
  placeholder={t[locale].firstNamePlaceholder}
  value={firstName}
  onChange={(e) => {
    setFirstName(e.target.value);
    if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: '' }));
  }}
  onBlur={() => {
    if (!firstName.trim()) setFieldErrors(prev => ({ ...prev, firstName: t[locale].errors.firstNameEmpty }));
  }}
  aria-invalid={!!fieldErrors.firstName}
  aria-describedby={fieldErrors.firstName ? 'error-firstName' : undefined}
/>
{fieldErrors.firstName && <div id="error-firstName" style={{ color: '#e53e3e', fontSize: '0.875rem' }}>{fieldErrors.firstName}</div>}
```

**2. E-mailadres** (email input)
```tsx
<input
  type="email"
  placeholder={t[locale].emailPlaceholder}
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
  }}
  onBlur={() => {
    if (!email.trim()) {
      setFieldErrors(prev => ({ ...prev, email: t[locale].errors.emailEmpty }));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors(prev => ({ ...prev, email: t[locale].errors.emailInvalid }));
    }
  }}
  aria-invalid={!!fieldErrors.email}
  aria-describedby={fieldErrors.email ? 'error-email' : undefined}
/>
{fieldErrors.email && <div id="error-email" style={{ color: '#e53e3e', fontSize: '0.875rem' }}>{fieldErrors.email}</div>}
```

> Gender, age category, and relationship status are NOT on this form. They were captured on Screen 3 (Profile) and already live in component state — the submit handler reads them from there.

**3. Honeypot** (hidden field -- invisible to users)
```tsx
<div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
  <input
    type="text"
    data-field="website"
    tabIndex={-1}
    autoComplete="off"
    value={honeypot}
    onChange={(e) => setHoneypot(e.target.value)}
  />
</div>
```

**4. NEM Matters consent checkbox**
```tsx
<label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
  <input
    type="checkbox"
    checked={nemMattersConsent}
    onChange={(e) => {
      setNemMattersConsent(e.target.checked);
      if (fieldErrors.consent) setFieldErrors(prev => ({ ...prev, consent: '' }));
    }}
  />
  <span style={{ fontSize: '0.875rem', color: 'var(--_token---text-olive, #706d56)' }}>
    {t[locale].consentLabel}
  </span>
</label>
{fieldErrors.consent && <div style={{ color: '#e53e3e', fontSize: '0.875rem' }}>{fieldErrors.consent}</div>}
```

**Submit button**

Disabled and visually greyed out until `nemMattersConsent` is true. Shows loading state (opacity 0.6, pointer-events none) while submitting.

```tsx
<button
  disabled={!nemMattersConsent || submitting}
  onClick={handleSubmit}
  style={{
    width: '100%',
    padding: '16px 32px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: nemMattersConsent ? 'var(--_token---accent-main, #fafa7d)' : 'var(--_token---accent-light-grey, #ecebe8)',
    color: 'var(--_token---text-main, #292828)',
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: nemMattersConsent ? 'pointer' : 'not-allowed',
    opacity: submitting ? 0.6 : 1,
    transition: prefersReducedMotion ? 'none' : 'all 0.15s ease',
  }}
>
  {submitting ? '...' : (ctaButtonText || t[locale].submitButtonText)}
</button>
```

**Relieve line** below the button:
```tsx
<p style={{ fontSize: '0.875rem', color: 'var(--_token---text-olive, #706d56)', textAlign: 'center' }}>
  {t[locale].relieveLine}
</p>
```

> **Do NOT render the disclaimer inside the component.** The disclaimer ("Dit rapport is geen psychologische diagnose…") already appears once on the landing page below the module — rendering it in the component too produces a visible duplicate on the opt-in screen. The `t[locale].disclaimer` string is kept in the translations object (unused) in case it is needed later, but no `<p data-element="disclaimer">` is rendered here.

**Form field styling** (shared across all text inputs and selects):
```tsx
const fieldStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '8px',
  border: '1.5px solid var(--_token---accent-light-grey, #ecebe8)',
  backgroundColor: 'white',
  fontFamily: 'Lato, sans-serif',
  fontSize: 'var(--_typography---paragraph--standard, 1rem)',
  color: 'var(--_token---text-main, #292828)',
  outline: 'none', // Replaced by focus-visible style below
};

// Add this focus-visible style to all inputs and selects:
// On :focus-visible → box-shadow: 0 0 0 2px var(--_token---accent-main, #fafa7d);
// This can be done via an onFocus/onBlur handler or a CSS class.

const fieldErrorStyle = {
  ...fieldStyle,
  borderColor: '#e53e3e',
};
```

Use `fieldErrorStyle` when `aria-invalid` is true.

### Submit handler

```tsx
async function handleSubmit() {
  // Validate all fields
  const errors = {};
  if (!firstName.trim()) errors.firstName = t[locale].errors.firstNameEmpty;
  if (!email.trim()) {
    errors.email = t[locale].errors.emailEmpty;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = t[locale].errors.emailInvalid;
  }
  // gender / ageCategory / relationshipStatus are validated on Screen 3 (Profile) and
  // are guaranteed present by the time we reach this form — do NOT re-validate them here.
  if (!nemMattersConsent) errors.consent = t[locale].errors.consentRequired;

  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    return;
  }

  // Honeypot check: if filled, fake success without POSTing
  if (honeypot) {
    setPhase('confirmation');
    return;
  }

  setSubmitting(true);

  const { scores, primary, secondary, totalScore } = calculateScores(answers);

  const payload = {
    token,
    locale,
    firstName: firstName.trim(),
    email: email.trim(),
    relationshipStatus,
    gender,
    ageCategory,
    honeypot: '', // Always send empty string — never echo the bot-filled value to the webhook
    scores: {
      valseHoop: scores.valseHoop,
      valseMacht: scores.valseMacht,
      zelfafwijzing: scores.zelfafwijzing,
      angst: scores.angst,
      emotioneleVerdoving: scores.emotioneleVerdoving,
    },
    primaryMechanism: primary,
    secondaryMechanism: secondary,
    totalScore,
    nemMattersConsent,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(submitWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.status === 'rate_limited') {
      setFieldErrors({ generic: t[locale].errors.rateLimited });
      setSubmitting(false);
      return;
    }

    setPhase('confirmation');
  } catch (err) {
    setFieldErrors({ generic: t[locale].errors.generic });
    setSubmitting(false);
  }
}
```

### Screen 6 -- Confirmation

Phase: `"confirmation"`.

- Show the label: `t[locale].confirmationLabel` -- renders "Nog één stap". Style like the conclusion label (muted, small).
- Show the main text: `t[locale].confirmationMain`.
- Show the secondary text: `t[locale].confirmationSecondary`.
- Show fallback text (smaller, muted):
  - `t[locale].noEmailReceived`
  - `t[locale].wrongEmail` followed by a clickable link with text `t[locale].wrongEmailLink`.
- **Correction flow:** Clicking "Vul het opnieuw in" (the wrongEmailLink):
  1. Keep `firstName`, `relationshipStatus`, `gender`, `ageCategory` as-is.
  2. Clear `email` to empty string.
  3. Generate a new token: `setToken(crypto.randomUUID())`.
  4. Clear `nemMattersConsent` to false (checkbox must be re-ticked).
  5. Clear `fieldErrors` to empty object.
  6. Set `submitting` to false.
  7. Set `phase` to `"optin"`.

---

## 8. Styling

### Container

```tsx
<div
  data-element="quiz-module"
  style={{
    maxWidth: '800px',
    margin: '0 auto',
    padding: 'var(--_gaps---content-half, 1.5rem)',
    fontFamily: 'Lato, sans-serif',
    color: 'var(--_token---text-main, #292828)',
  }}
>
```

### Design tokens reference

| Token | CSS variable | Fallback value | Usage |
|-------|-------------|----------------|-------|
| Accent main | `--_token---accent-main` | `#fafa7d` | Pill hover, pill selected, CTA button |
| Background main | `--_token---bg-main` | `white` | Page background |
| Text main | `--_token---text-main` | `#292828` | Body text, headings |
| Text olive | `--_token---text-olive` | `#706d56` | Muted labels, progress text |
| Accent light grey | `--_token---accent-light-grey` | `#ecebe8` | Borders, form field borders |
| Accent grey | `--_token---accent-grey` | `#9f9c8b` | Placeholder text, disclaimer text |
| Content half gap | `--_gaps---content-half` | `1.5rem` (desktop), `1.25rem` (mobile) | Spacing between elements |

### Typography

- Headings (question text, screen labels): `font-family: Montserrat, sans-serif`
- Body text (answers, form labels, descriptions): `font-family: Lato, sans-serif`
- Question text size: `var(--_typography---paragraph--big, 1.25rem)`
- Label size (progress, conclusion label, confirmation label): `var(--_typography---paragraph--small, 0.875rem)`

### Animations

All animations must be wrapped in the `prefersReducedMotion` constant (already defined once at the top of the component — do not redeclare it). If the user prefers reduced motion, skip all fade/transition animations and render changes instantly.

Transitions between screens: simple opacity fade (300ms ease-in-out), or instant if reduced motion is preferred.

---

## 9. Analytics stubs

Define constants but do not implement tracking. Leave as commented-out push calls:

```tsx
const EVENTS = {
  TEST_COMPLETED: 'nem_test_completed',
  REPORT_REQUESTED: 'nem_report_requested',
};

// When transitioning to conclusion phase:
// window.dataLayer?.push({ event: EVENTS.TEST_COMPLETED, primaryMechanism: primary, secondaryMechanism: secondary, totalScore });

// When form is successfully submitted:
// window.dataLayer?.push({ event: EVENTS.REPORT_REQUESTED, locale });
```

---

## 10. Accessibility

- All pill buttons must have visible focus styles (outline or ring on `:focus-visible`).
- Selected pill button: `aria-selected="true"`. Non-selected: `aria-selected="false"`.
- Progress indicator: `aria-live="polite"` so screen readers announce question changes.
- Form fields with errors: `aria-invalid="true"` and `aria-describedby` pointing to the error message element's `id`.
- Honeypot field: `aria-hidden="true"`, `tabIndex={-1}`.
- All interactive elements must be keyboard-accessible (buttons, inputs, selects, checkbox, links).

---

## 11. Data attributes summary

These attributes MUST be present for automated testing:

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `data-element="quiz-module"` | Outermost quiz container div | Test hook: locate the quiz |
| `data-element="back-button"` | Back arrow button (Screens 2-20) | Test hook: navigate back |
| `data-field="website"` | Honeypot hidden input | Test hook: bot detection |
| `data-field="gender"` | Gender select (Screen 3, profile) | Test hook: form field |
| `data-field="age-category"` | Age category select (Screen 3, profile) | Test hook: form field |
| `data-field="relationship-status"` | Relationship status select (Screen 3, profile) | Test hook: form field |
| `data-element="conclusion-text"` | Conclusion paragraph (Screen 4) | Test hook: verify gender-differentiated copy |
| `aria-selected="true"` | Currently selected pill button | Test hook: verify selection state |

---

## 12. Important implementation notes

1. **No console.log statements.** If you need debug logging, use: `const DEBUG = false; DEBUG && console.log(...);`
2. **No API call on Screen 4 (Conclusion).** The conclusion text comes from the client-side `t[locale].conclusions[GENDER_TO_CONCLUSION_KEY[gender]][conclusionKey]` lookup. There is no loading state between the profile screen and the conclusion.
3. **Token generation** uses `crypto.randomUUID()` (available in all modern browsers).
4. **Form field labels:** Use the `placeholder` attribute for text/email inputs. Use a visible label element above each select dropdown (showing `t[locale].relationshipLabel`, `t[locale].genderLabel`, `t[locale].ageCategoryLabel`).
5. **The `secondaryMechanism` field in the webhook payload** must be `null` (not omitted) when there is no secondary mechanism.
6. **The question text** should come from the corresponding prop first. If the prop is empty or undefined, fall back to `t[locale].questions[currentStep]`. Build the questions array like this:

```tsx
const questions = [
  question1, question2, question3, question4, question5,
  question6, question7, question8, question9, question10,
  question11, question12, question13, question14, question15,
  question16, question17, question18, question19, question20,
].map((propText, i) => propText || t[locale].questions[i]);
```

---

## 13. Page-level data attributes (Webflow Designer — not part of this component)

The following `data-element` attributes must be added manually in the Webflow Designer on the landing page elements. They are NOT part of the React component but ARE required by the acceptance tests:

| Attribute | Element | Where to add |
|-----------|---------|-------------|
| `data-element="logo"` | Navbar logo link/image | On the logo element in the minimal navbar |
| `data-element="trust-anchor"` | Navbar trust element (e.g. rating badge) | On the trust anchor in the minimal navbar |
| `data-element="footer-minimal"` | Minimal footer container | On the footer section below the quiz |

These are tested in `tests/acceptance/nem-test-phase-b.spec.js` (B1: Landing page section).

---

---

# Follow-up Refinement Prompts

Use these only if the main prompt above produces incorrect behaviour. Paste one at a time into Webflow AI.

---

## Refinement A -- Scoring fix

> The scoring logic is wrong. Here is the test case: when every question is answered with "soms" (answer index 2, score value 2), each of the 5 mechanisms should produce a score of exactly 8 (4 questions times 2 = 8), and the total score should be 40. Similarly, all "heel vaak" (index 4) should produce 16 per mechanism and 80 total, and all "nooit" (index 0) should produce 0 per mechanism and 0 total.
>
> Check these things:
> 1. The `MECHANISM_MAP` uses 0-based question indices: zelfafwijzing = [0, 1, 6, 16], emotioneleVerdoving = [2, 7, 12, 17], valseMacht = [3, 8, 13, 18], angst = [4, 9, 14, 19], valseHoop = [5, 10, 11, 15].
> 2. The answer value IS the answer index (0, 1, 2, 3, 4). There is no separate scoring lookup.
> 3. The per-mechanism sum adds the answer values for exactly those 4 question indices.
> 4. After scoring, `window.__nemTestScores` is set with all 5 mechanism scores as numbers.

---

## Refinement B -- i18n fix

> The English locale strings are not switching. Check all of these:
> 1. `getLocale()` returns `'en'` when the URL path starts with `/en/`.
> 2. The translations object `t` has both `nl` and `en` top-level keys with identical structure.
> 3. Every UI string in the component uses `t[locale].keyName` -- not hardcoded Dutch text.
> 4. The answer button labels use `t[locale].answers` (which gives `['never', 'rarely', 'sometimes', 'regularly', 'very often']` for EN).
> 5. The progress text uses `t[locale].progress(n, total)`.
> 6. All form labels, placeholders, error messages, and confirmation text use `t[locale]`.
> 7. The conclusion text uses `t[locale].conclusions[GENDER_TO_CONCLUSION_KEY[gender]][conclusionKey]` (gender-nested, normalised via `GENDER_TO_CONCLUSION_KEY`).

---

## Refinement C -- Validation fix

> Inline validation errors should clear immediately when the field is corrected, not when the user clicks submit again. Check each field's `onChange` or `onInput` handler:
>
> 1. The `firstName` input's `onChange` must include: `if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: '' }));`
> 2. The `email` input's `onChange` must include: `if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));`
> 3. Each select's `onChange` must clear its corresponding error key from `fieldErrors`.
> 4. The consent checkbox's `onChange` must clear `fieldErrors.consent`.
> 5. The error message div for each field should only render when `fieldErrors.fieldName` is truthy (non-empty string).
> 6. On blur, the error should be set if the field is still invalid. On input/change, the error should be cleared unconditionally (the blur handler will re-validate if needed).
