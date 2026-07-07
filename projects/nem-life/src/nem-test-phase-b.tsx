import { declareComponent, useWebflowContext } from "@webflow/react";
import { props as propTypes } from "@webflow/data-types";
import { useState, useMemo, useCallback } from "react";

declare global {
  interface Window {
    __nemTestScores?: {
      zelfafwijzing: number;
      emotioneleVerdoving: number;
      valseMacht: number;
      angst: number;
      valseHoop: number;
    };
  }
}

/* ─── Mechanism mapping (fixed, never changes regardless of prop values) ─── */
const MECHANISM_MAP: Record<string, { questions: number[]; bodyQ: number; situationalQ: number }> = {
  zelfafwijzing:       { questions: [0, 1, 6, 16], bodyQ: 16, situationalQ: 0 },
  emotioneleVerdoving: { questions: [2, 7, 12, 17], bodyQ: 12, situationalQ: 17 },
  valseMacht:          { questions: [3, 8, 13, 18], bodyQ: 13, situationalQ: 18 },
  angst:               { questions: [4, 9, 14, 19], bodyQ: 14, situationalQ: 19 },
  valseHoop:           { questions: [5, 10, 11, 15], bodyQ: 10, situationalQ: 15 },
};

const MECHANISM_TO_KEY: Record<string, string> = {
  zelfafwijzing: "zelfafwijzing",
  emotioneleVerdoving: "emotionele-verdoving",
  valseMacht: "valse-macht",
  angst: "angst",
  valseHoop: "valse-hoop",
};

/* ─── Gender normalisation for conclusion lookup ─── */
const GENDER_TO_CONCLUSION_KEY: Record<string, string> = {
  man: "man",
  vrouw: "vrouw",
  male: "man",
  female: "vrouw",
};

/* ─── Analytics stubs ─── */
const EVENTS = {
  TEST_COMPLETED: "nem_test_completed",
  REPORT_REQUESTED: "nem_report_requested",
};
const DEBUG = false;

/* ─── Scoring engine ─── */
function calculateScores(answers: (number | null)[]) {
  const scores: Record<string, number> = {};
  for (const [mechanism, { questions }] of Object.entries(MECHANISM_MAP)) {
    scores[mechanism] = questions.reduce((sum, qi) => sum + (answers[qi] ?? 0), 0);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  let primary = sorted[0][0];
  let secondary: string | null = null;

  const topScore = sorted[0][1];
  const tied = sorted.filter(([, s]) => s === topScore);

  if (tied.length > 1) {
    const withTiebreak = tied.map(([mech]) => {
      const { bodyQ, situationalQ } = MECHANISM_MAP[mech];
      return { mech, tiebreak: (answers[bodyQ] ?? 0) + (answers[situationalQ] ?? 0) };
    });
    withTiebreak.sort((a, b) => b.tiebreak - a.tiebreak);
    primary = withTiebreak[0].mech;

    const remaining = sorted.filter(([m]) => m !== primary);
    if (remaining.length > 0 && topScore - remaining[0][1] <= 3) {
      secondary = remaining[0][0];
    }
  } else {
    if (sorted.length > 1 && sorted[0][1] - sorted[1][1] <= 3) {
      secondary = sorted[1][0];
    }
  }

  const primaryKey = MECHANISM_TO_KEY[primary];
  const conclusionKey = secondary
    ? `${primaryKey}_${MECHANISM_TO_KEY[secondary]}`
    : primaryKey;

  return {
    scores,
    primary,
    secondary,
    conclusionKey,
    totalScore: Object.values(scores).reduce((a, b) => a + b, 0),
  };
}

/* ─── Locale detection ─── */
function getLocale(): "nl" | "en" {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/en/")) return "en";
    if (document.documentElement.lang?.startsWith("en")) return "en";
  }
  return "nl";
}

/* ─── Translations ─── */
interface SelectOption {
  value: string;
  label: string;
}

interface GenderedConclusions {
  man: Record<string, string>;
  vrouw: Record<string, string>;
}

interface Translations {
  answers: string[];
  questions: string[];
  progress: (n: number, total: number) => string;
  back: string;
  reassurance: string;
  profileLabel: string;
  profileContinueButton: string;
  conclusionLabel: string;
  bridgeLine: string;
  optinLabel: string;
  optinIntro: string;
  firstNamePlaceholder: string;
  emailPlaceholder: string;
  relationshipLabel: string;
  relationshipOptions: SelectOption[];
  genderLabel: string;
  genderOptions: SelectOption[];
  ageCategoryLabel: string;
  ageCategoryOptions: SelectOption[];
  consentLabel: string;
  relieveLine: string;
  disclaimer: string;
  submitButtonText: string;
  submittingText: string;
  errors: {
    firstNameEmpty: string;
    emailEmpty: string;
    emailInvalid: string;
    relationshipEmpty: string;
    genderEmpty: string;
    ageCategoryEmpty: string;
    consentRequired: string;
    rateLimited: string;
    generic: string;
  };
  confirmationLabel: string;
  confirmationMain: string;
  confirmationSecondary: string;
  noEmailReceived: string;
  wrongEmail: string;
  wrongEmailLink: string;
  conclusions: GenderedConclusions;
}

const NL_CONCLUSIONS_SINGLE: Record<string, string> = {
  zelfafwijzing: "[DUMMY man] Zelfafwijzing — Alex schrijft deze tekst nog.",
  "emotionele-verdoving": "[DUMMY man] Emotionele Verdoving — Alex schrijft deze tekst nog.",
  "valse-macht": "[DUMMY man] Valse Macht — Alex schrijft deze tekst nog.",
  angst: "[DUMMY man] Angst — Alex schrijft deze tekst nog.",
  "valse-hoop": "[DUMMY man] Valse Hoop — Alex schrijft deze tekst nog.",
  "zelfafwijzing_emotionele-verdoving": "[DUMMY man] Zelfafwijzing + Emotionele Verdoving — Alex schrijft deze tekst nog.",
  "zelfafwijzing_valse-macht": "[DUMMY man] Zelfafwijzing + Valse Macht — Alex schrijft deze tekst nog.",
  "zelfafwijzing_angst": "[DUMMY man] Zelfafwijzing + Angst — Alex schrijft deze tekst nog.",
  "zelfafwijzing_valse-hoop": "[DUMMY man] Zelfafwijzing + Valse Hoop — Alex schrijft deze tekst nog.",
  "emotionele-verdoving_valse-macht": "[DUMMY man] Emotionele Verdoving + Valse Macht — Alex schrijft deze tekst nog.",
  "emotionele-verdoving_angst": "[DUMMY man] Emotionele Verdoving + Angst — Alex schrijft deze tekst nog.",
  "emotionele-verdoving_valse-hoop": "[DUMMY man] Emotionele Verdoving + Valse Hoop — Alex schrijft deze tekst nog.",
  "valse-macht_angst": "[DUMMY man] Valse Macht + Angst — Alex schrijft deze tekst nog.",
  "valse-macht_valse-hoop": "[DUMMY man] Valse Macht + Valse Hoop — Alex schrijft deze tekst nog.",
  "angst_valse-hoop": "[DUMMY man] Angst + Valse Hoop — Alex schrijft deze tekst nog.",
};

const NL_CONCLUSIONS_VROUW: Record<string, string> = Object.fromEntries(
  Object.entries(NL_CONCLUSIONS_SINGLE).map(([k, v]) => [k, v.replace("[DUMMY man]", "[DUMMY vrouw]")])
);

const EN_CONCLUSIONS_MAN: Record<string, string> = {
  zelfafwijzing: "[DUMMY man] Self-rejection — Alex will write this.",
  "emotionele-verdoving": "[DUMMY man] Emotional Numbing — Alex will write this.",
  "valse-macht": "[DUMMY man] False Power — Alex will write this.",
  angst: "[DUMMY man] Fear — Alex will write this.",
  "valse-hoop": "[DUMMY man] False Hope — Alex will write this.",
  "zelfafwijzing_emotionele-verdoving": "[DUMMY man] Self-rejection + Emotional Numbing — Alex will write this.",
  "zelfafwijzing_valse-macht": "[DUMMY man] Self-rejection + False Power — Alex will write this.",
  "zelfafwijzing_angst": "[DUMMY man] Self-rejection + Fear — Alex will write this.",
  "zelfafwijzing_valse-hoop": "[DUMMY man] Self-rejection + False Hope — Alex will write this.",
  "emotionele-verdoving_valse-macht": "[DUMMY man] Emotional Numbing + False Power — Alex will write this.",
  "emotionele-verdoving_angst": "[DUMMY man] Emotional Numbing + Fear — Alex will write this.",
  "emotionele-verdoving_valse-hoop": "[DUMMY man] Emotional Numbing + False Hope — Alex will write this.",
  "valse-macht_angst": "[DUMMY man] False Power + Fear — Alex will write this.",
  "valse-macht_valse-hoop": "[DUMMY man] False Power + False Hope — Alex will write this.",
  "angst_valse-hoop": "[DUMMY man] Fear + False Hope — Alex will write this.",
};

const EN_CONCLUSIONS_VROUW: Record<string, string> = Object.fromEntries(
  Object.entries(EN_CONCLUSIONS_MAN).map(([k, v]) => [k, v.replace("[DUMMY man]", "[DUMMY vrouw]")])
);

const translations: Record<"nl" | "en", Translations> = {
  nl: {
    answers: ["nooit", "zelden", "soms", "regelmatig", "heel vaak"],
    questions: [
      "Na een gesprek dat niet lekker liep, blijf ik uren of dagen malen over wat ik fout deed.",
      "Als iets in een relatie of op werk misgaat, ben ik de eerste die denkt dat het aan mij ligt.",
      "Ik stel beslissingen of dingen die ik eigenlijk wil doen langer uit dan logisch is.",
      "Ik betrap mezelf erop dat ik streng oordeel over hoe anderen dingen doen.",
      "Ik vermijd situaties die spanning oproepen, ook als ik eigenlijk wel zou willen.",
      "Ik blijf mijn best doen om iets of iemand naar mijn hand te zetten, ook als ik weet dat het niet gaat lukken.",
      "Als ik moe of overweldigd ben, zegt iets in mij: \"Ik kan dit niet aan.\"",
      "Mijn standaardreactie als er iets gebeurt is: \"Maakt niet uit, het komt wel goed.\"",
      "Als iemand iets doet wat me raakt, ervaar ik dat al snel als een persoonlijke aanval en ga ik er fel tegenin.",
      "Bij iets nieuws of onbekends ga ik in mijn hoofd direct naar wat er mis zou kunnen gaan.",
      "Ik voel een drive in mijn lichaam - gejaagd, hoog, ik kan niet stil zitten als er nog iets opgelost moet worden.",
      "Ik denk vaak: \"Als ik dit nou maar goed doe, dan komt het wel goed.\"",
      "In situaties die me eigenlijk zouden moeten raken, merk ik nauwelijks iets op in mijn lichaam - alsof ik op afstand sta van mijn eigen leven.",
      "Op het moment dat ik me aangevallen voel, voel ik mijn lichaam aanspannen - mijn kaken, mijn schouders, mijn vuisten, alsof ik me acuut wil verdedigen.",
      "In spannende situaties voel ik mijn lichaam terugdeinzen - een verkramping, het gevoel dat ik ergens van weg wil.",
      "Als de sfeer dreigt om te slaan, doe ik extra mijn best en pas ik me aan om het goed te houden.",
      "Als iets misgaat voel ik mezelf wegzakken - mijn energie verdwijnt en alles wordt zwaar.",
      "Als anderen om mij heen sterk reageren op een emotionele gebeurtenis, blijf ik vanbinnen vaak vlak.",
      "Als iemand dichtbij iets niet doet zoals ik wil, voel ik irritatie of boosheid die maar niet weggaat.",
      "Als ik iets moet doen wat goed voor me is maar me angst geeft, kies ik vaak voor wat veilig voelt.",
    ],
    progress: (n, total) => `Vraag ${n} van ${total}`,
    back: "← Terug",
    reassurance: "Kies wat het meest op jou lijkt - er is geen goed of fout antwoord.",
    profileLabel: "Nog even over jou",
    profileContinueButton: "Ga verder",
    conclusionLabel: "Jouw uitkomst",
    bridgeLine:
      "Wil je begrijpen waar dit vandaan komt en wat het jou kost? Je persoonlijke rapport gaat daar dieper op in.",
    optinLabel: "Waar sturen we jouw rapport naartoe?",
    optinIntro:
      "Vul hieronder je gegevens in. Je ontvangt het binnen enkele minuten in je inbox.",
    firstNamePlaceholder: "Voornaam",
    emailPlaceholder: "E-mailadres",
    relationshipLabel: "Je relatiestatus",
    relationshipOptions: [
      { value: "", label: "Selecteer..." },
      { value: "alleenstaand", label: "Alleenstaand" },
      { value: "in-een-relatie", label: "In een relatie" },
      { value: "gescheiden", label: "Gescheiden" },
      { value: "anders", label: "Anders" },
    ],
    genderLabel: "Geslacht",
    genderOptions: [
      { value: "", label: "Selecteer..." },
      { value: "man", label: "Man" },
      { value: "vrouw", label: "Vrouw" },
    ],
    ageCategoryLabel: "Leeftijdscategorie",
    ageCategoryOptions: [
      { value: "", label: "Selecteer..." },
      { value: "18-30", label: "18-30" },
      { value: "31-40", label: "31-40" },
      { value: "41-50", label: "41-50" },
      { value: "51-60", label: "51-60" },
      { value: "60+", label: "60+" },
    ],
    consentLabel:
      "Je wordt toegevoegd aan NEM Matters - de nieuwsbrief van NEM Life. Je kunt je altijd afmelden.",
    relieveLine: "Geen spam & je gegevens blijven veilig. Natuurlijk.",
    disclaimer:
      "Dit rapport is geen psychologische diagnose. Het is een spiegel op basis van jouw antwoorden - bedoeld als beginpunt voor reflectie, niet als eindoordeel.",
    submitButtonText: "Ontvang mijn rapport",
    submittingText: "Verzenden...",
    errors: {
      firstNameEmpty: "Vul je voornaam in",
      emailEmpty: "Vul je e-mailadres in",
      emailInvalid: "Voer een geldig e-mailadres in",
      relationshipEmpty: "Selecteer je relatiestatus",
      genderEmpty: "Selecteer je geslacht",
      ageCategoryEmpty: "Selecteer je leeftijdscategorie",
      consentRequired: "Bevestig je aanmelding voor NEM Matters",
      rateLimited: "Probeer het later opnieuw",
      generic: "Er ging iets mis. Probeer het opnieuw.",
    },
    confirmationLabel: "Nog één stap",
    confirmationMain:
      "Je antwoorden zijn opgeslagen. Zodra je je e-mailadres bevestigt, stellen we jouw persoonlijke rapport samen en sturen we het naar je inbox.",
    confirmationSecondary:
      "Controleer je inbox - je ontvangt direct een mail van NEM Life. Klik op de bevestigingslink daarin en je rapport is onderweg.",
    noEmailReceived: "Geen mail ontvangen? Controleer je spamfolder.",
    wrongEmail: "Verkeerd e-mailadres opgegeven?",
    wrongEmailLink: "Vul het opnieuw in.",
    conclusions: {
      man: NL_CONCLUSIONS_SINGLE,
      vrouw: NL_CONCLUSIONS_VROUW,
    },
  },
  en: {
    answers: ["never", "rarely", "sometimes", "regularly", "very often"],
    questions: [
      "After a conversation that didn't go well, I keep replaying what I did wrong for hours or days.",
      "When something goes wrong in a relationship or at work, I'm the first to think it's my fault.",
      "I postpone decisions or things I actually want to do longer than makes sense.",
      "I catch myself judging how others do things harshly.",
      "I avoid situations that create tension, even when I actually want to participate.",
      "I keep trying to control something or someone, even when I know it won't work.",
      "When I'm tired or overwhelmed, something inside me says: \"I can't handle this.\"",
      "My default reaction when something happens is: \"Doesn't matter, it'll be fine.\"",
      "When someone does something that affects me, I quickly experience it as a personal attack and react strongly.",
      "With something new or unknown, my mind immediately goes to what could go wrong.",
      "I feel a drive in my body — rushed, high, I can't sit still when something still needs to be resolved.",
      "I often think: \"If I just do this right, everything will be fine.\"",
      "In situations that should affect me, I barely notice anything in my body — as if I'm watching my own life from a distance.",
      "The moment I feel attacked, I feel my body tense up — my jaw, my shoulders, my fists, as if I need to defend myself immediately.",
      "In tense situations, I feel my body recoil — a cramping, the feeling that I want to get away.",
      "When the atmosphere threatens to shift, I try extra hard and adjust to keep things good.",
      "When something goes wrong, I feel myself sinking — my energy disappears and everything becomes heavy.",
      "When others around me react strongly to an emotional event, I often remain flat inside.",
      "When someone close doesn't do what I want, I feel irritation or anger that won't go away.",
      "When I need to do something that's good for me but scares me, I often choose what feels safe.",
    ],
    progress: (n, total) => `Question ${n} of ${total}`,
    back: "← Back",
    reassurance: "Choose what feels most like you — there's no right or wrong answer.",
    profileLabel: "A little about you",
    profileContinueButton: "Continue",
    conclusionLabel: "Your outcome",
    bridgeLine:
      "Want to understand where this comes from and what it costs you? Your personal report goes deeper.",
    optinLabel: "Where should we send your report?",
    optinIntro:
      "Fill in your details below. You'll receive it in your inbox within minutes.",
    firstNamePlaceholder: "First name",
    emailPlaceholder: "Email address",
    relationshipLabel: "Relationship status",
    relationshipOptions: [
      { value: "", label: "Select..." },
      { value: "alleenstaand", label: "Single" },
      { value: "in-een-relatie", label: "In a relationship" },
      { value: "gescheiden", label: "Divorced" },
      { value: "anders", label: "Other" },
    ],
    genderLabel: "Gender",
    genderOptions: [
      { value: "", label: "Select..." },
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
    ageCategoryLabel: "Age category",
    ageCategoryOptions: [
      { value: "", label: "Select..." },
      { value: "18-30", label: "18-30" },
      { value: "31-40", label: "31-40" },
      { value: "41-50", label: "41-50" },
      { value: "51-60", label: "51-60" },
      { value: "60+", label: "60+" },
    ],
    consentLabel:
      "You'll be added to NEM Matters — the NEM Life newsletter. You can unsubscribe at any time.",
    relieveLine: "No spam & your data stays safe. Of course.",
    disclaimer:
      "This report is not a psychological diagnosis. It's a mirror based on your answers — meant as a starting point for reflection, not a final verdict.",
    submitButtonText: "Get my report",
    submittingText: "Submitting...",
    errors: {
      firstNameEmpty: "Enter your first name",
      emailEmpty: "Enter your email address",
      emailInvalid: "Enter a valid email address",
      relationshipEmpty: "Select your relationship status",
      genderEmpty: "Select your gender",
      ageCategoryEmpty: "Select your age category",
      consentRequired: "Confirm your NEM Matters subscription",
      rateLimited: "Please try again later",
      generic: "Something went wrong. Please try again.",
    },
    confirmationLabel: "One more step",
    confirmationMain:
      "Your answers have been saved. Once you confirm your email address, we'll compile your personal report and send it to your inbox.",
    confirmationSecondary:
      "Check your inbox — you'll receive an email from NEM Life right away. Click the confirmation link and your report is on its way.",
    noEmailReceived: "No email received? Check your spam folder.",
    wrongEmail: "Entered the wrong email?",
    wrongEmailLink: "Fill it in again.",
    conclusions: {
      man: EN_CONCLUSIONS_MAN,
      vrouw: EN_CONCLUSIONS_VROUW,
    },
  },
};

/* ─── Fonts ─── */
const fontLink = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Lato:wght@400;700&display=swap');`;

/* ─── Shared styles ─── */
const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 8,
  borderWidth: "1.5px",
  borderStyle: "solid",
  borderColor: "var(--_token---accent-light-grey, #ecebe8)",
  backgroundColor: "white",
  fontFamily: "'Lato', sans-serif",
  fontSize: "var(--_typography---paragraph--standard, 1rem)",
  color: "var(--_token---text-main, #292828)",
  outline: "none",
  boxSizing: "border-box" as const,
};

const fieldErrorStyle: React.CSSProperties = {
  ...fieldStyle,
  borderColor: "#e53e3e",
};

const selectFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239f9c8b' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 16px center",
  paddingRight: "40px",
};

const selectFieldErrorStyle: React.CSSProperties = {
  ...selectFieldStyle,
  borderColor: "#e53e3e",
};

const focusRing = "0 0 0 2px var(--_token---accent-main, #fafa7d)";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'Montserrat', sans-serif",
  fontSize: "var(--_typography---paragraph--small, 0.875rem)",
  fontWeight: 600,
  color: "var(--_token---text-olive, #706d56)",
  marginBottom: 6,
};

const pillButtonStyle: React.CSSProperties = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 600,
  fontSize: "1rem",
  padding: "16px 32px",
  background: "var(--_token---accent-main, #fafa7d)",
  color: "var(--_token---text-main, #292828)",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  transition: "all 0.15s ease",
  width: "100%",
};

/* ─── Component ─── */
function Quiz({
  submitWebhookUrl,
  reassuranceText,
  ctaButtonText,
  question1, question2, question3, question4, question5,
  question6, question7, question8, question9, question10,
  question11, question12, question13, question14, question15,
  question16, question17, question18, question19, question20,
}: {
  submitWebhookUrl: string;
  reassuranceText: string;
  ctaButtonText: string;
  question1: string; question2: string; question3: string; question4: string; question5: string;
  question6: string; question7: string; question8: string; question9: string; question10: string;
  question11: string; question12: string; question13: string; question14: string; question15: string;
  question16: string; question17: string; question18: string; question19: string; question20: string;
}) {
  const { interactive } = useWebflowContext();
  const locale = getLocale();
  const t = translations[locale];

  // Webflow code-component props are NOT localizable — a prop holds one value
  // across every locale (its Dutch default). So the Designer props are honoured
  // only on the primary NL locale; every other locale uses the code translations.
  const questions = useMemo(
    () => [
      question1, question2, question3, question4, question5,
      question6, question7, question8, question9, question10,
      question11, question12, question13, question14, question15,
      question16, question17, question18, question19, question20,
    ].map((propText, i) => (locale === "nl" ? propText || t.questions[i] : t.questions[i])),
    [locale, question1, question2, question3, question4, question5,
     question6, question7, question8, question9, question10,
     question11, question12, question13, question14, question15,
     question16, question17, question18, question19, question20, t.questions]
  );

  // Same rule for the two marketing-copy props (reassurance line + CTA label):
  // prop override on NL, code translation elsewhere.
  const reassurance = locale === "nl" ? (reassuranceText || t.reassurance) : t.reassurance;
  const ctaLabel = (locale === "nl" ? ctaButtonText : "") || t.submitButtonText;

  /* ─── Reduced-motion detection ───
     Note: the answer-pill responsive layout (row on desktop, column on mobile)
     is handled purely in CSS via the `.nem-answers` media query below — NOT a
     JS `isMobile` flag. Webflow server-renders the component with `window`
     undefined, so a JS breakpoint check is stale on a direct mobile load and
     the pills stayed in the desktop row. CSS media queries are immune to that. */
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  /* ─── State ─── */
  const [phase, setPhase] = useState<"quiz" | "profile" | "conclusion" | "optin" | "confirmation">(
    !interactive ? "conclusion" : "quiz"
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(20).fill(null));
  const [animating, setAnimating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [gender, setGender] = useState("");
  const [ageCategory, setAgeCategory] = useState("");
  const [nemMattersConsent, setNemMattersConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState(() => crypto.randomUUID());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conclusionKey, setConclusionKey] = useState("");

  /* ─── Answer selection ─── */
  const selectAnswer = useCallback(
    (answerIndex: number) => {
      const updatedAnswers = answers.map((a, i) => (i === currentStep ? answerIndex : a));
      setAnswers(updatedAnswers);

      const fadeDelay = prefersReducedMotion ? 0 : 200;
      const fadeDuration = prefersReducedMotion ? 0 : 300;

      setTimeout(() => {
        setAnimating(true);
        setTimeout(() => {
          if (currentStep < 19) {
            setCurrentStep((s) => s + 1);
          } else {
            // Scoring computed here (does not depend on gender)
            const result = calculateScores(updatedAnswers);
            setConclusionKey(result.conclusionKey);
            setPhase("profile"); // → profile screen, then conclusion

            window.__nemTestScores = {
              zelfafwijzing: result.scores.zelfafwijzing,
              emotioneleVerdoving: result.scores.emotioneleVerdoving,
              valseMacht: result.scores.valseMacht,
              angst: result.scores.angst,
              valseHoop: result.scores.valseHoop,
            };

            // window.dataLayer?.push({ event: EVENTS.TEST_COMPLETED, primaryMechanism: result.primary, secondaryMechanism: result.secondary, totalScore: result.totalScore });
          }
          setAnimating(false);
        }, fadeDuration);
      }, fadeDelay);
    },
    [answers, currentStep, prefersReducedMotion]
  );

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  /* ─── Profile continue handler ─── */
  const handleProfileContinue = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!gender) errors.gender = t.errors.genderEmpty;
    if (!ageCategory) errors.ageCategory = t.errors.ageCategoryEmpty;
    if (!relationshipStatus) errors.relationshipStatus = t.errors.relationshipEmpty;

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, gender: "", ageCategory: "", relationshipStatus: "" }));
    setPhase("conclusion");
  }, [gender, ageCategory, relationshipStatus, t.errors]);

  /* ─── Form submission (opt-in: name + email + consent only) ─── */
  const handleSubmit = useCallback(async () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = t.errors.firstNameEmpty;
    if (!email.trim()) {
      errors.email = t.errors.emailEmpty;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t.errors.emailInvalid;
    }
    if (!nemMattersConsent) errors.consent = t.errors.consentRequired;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Honeypot check
    if (honeypot) {
      setPhase("confirmation");
      return;
    }

    setSubmitting(true);

    const result = calculateScores(answers);

    const payload = {
      token,
      locale,
      firstName: firstName.trim(),
      email: email.trim(),
      relationshipStatus,
      gender,
      ageCategory,
      honeypot: "",
      scores: {
        valseHoop: result.scores.valseHoop,
        valseMacht: result.scores.valseMacht,
        zelfafwijzing: result.scores.zelfafwijzing,
        angst: result.scores.angst,
        emotioneleVerdoving: result.scores.emotioneleVerdoving,
      },
      primaryMechanism: result.primary,
      secondaryMechanism: result.secondary,
      totalScore: result.totalScore,
      nemMattersConsent,
      timestamp: new Date().toISOString(),
    };

    if (submitWebhookUrl) {
      try {
        const res = await fetch(submitWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.status === "rate_limited") {
          setFieldErrors({ generic: t.errors.rateLimited });
          setSubmitting(false);
          return;
        }
      } catch {
        setFieldErrors({ generic: t.errors.generic });
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    setPhase("confirmation");
    // window.dataLayer?.push({ event: EVENTS.REPORT_REQUESTED, locale });
  }, [firstName, email, nemMattersConsent, honeypot, answers, token, locale, submitWebhookUrl, t.errors, relationshipStatus, gender, ageCategory]);

  /* ─── Go back to optin (from confirmation, for wrong email) ─── */
  const goBackToOptin = useCallback(() => {
    setEmail("");
    setToken(crypto.randomUUID());
    setNemMattersConsent(false);
    setFieldErrors({});
    setSubmitting(false);
    setPhase("optin");
  }, []);

  /* ─── Derived: gender-differentiated conclusion text ─── */
  const genderKey = GENDER_TO_CONCLUSION_KEY[gender] || "man";
  const conclusionText = t.conclusions[genderKey as keyof GenderedConclusions]?.[conclusionKey] || "";

  return (
    <div
      data-element="quiz-module"
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "var(--_gaps---content-half, 1.5rem)",
        fontFamily: "'Lato', sans-serif",
        color: "var(--_token---text-main, #292828)",
        backgroundColor: "var(--_token---bg-main, white)",
        borderRadius: "0.625rem",
        boxShadow: "0 2px 12px rgba(41, 40, 40, 0.06), 0 1px 4px rgba(41, 40, 40, 0.03)",
      }}
      className="w-full"
    >
      <style>{fontLink}</style>
      <style>{`
        .quiz-fade-in { animation: quizFadeIn 0.4s ease-out forwards; }
        .quiz-fade-out { animation: quizFadeOut 0.3s ease-in forwards; }
        .quiz-slide-up { animation: quizSlideUp 0.5s ease-out forwards; }
        .quiz-scale-in { animation: quizScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes quizFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes quizFadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-12px); } }
        @keyframes quizSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes quizScaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .quiz-fade-in, .quiz-fade-out, .quiz-slide-up, .quiz-scale-in { animation: none; }
        }
        .nem-answers { display: flex; gap: 12px; flex-wrap: nowrap; }
        @media (max-width: 768px) {
          .nem-answers { flex-direction: column; }
          .nem-answers > button { width: 100%; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════
          QUIZ — Q1–Q20
      ═══════════════════════════════════════════ */}
      {phase === "quiz" && (
        <div
          key={currentStep}
          className={animating ? "quiz-fade-out" : "quiz-fade-in"}
        >
          {/* Step indicator */}
          <div
            className="flex items-center justify-between mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <span
              aria-live="polite"
              style={{
                fontSize: "var(--_typography---paragraph--small, 0.875rem)",
                fontWeight: 600,
                color: "var(--_token---accent-grey, #9f9c8b)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {t.progress(currentStep + 1, 20)}
            </span>
            {currentStep > 0 && (
              <button
                data-element="back-button"
                onClick={goBack}
                aria-label={t.back}
                style={{
                  fontSize: "var(--_typography---paragraph--small, 0.875rem)",
                  fontWeight: 500,
                  color: "var(--_token---text-olive, #706d56)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                ←
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: 8,
              background: "rgba(0,0,0,0.1)",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${((currentStep + 1) / 20) * 100}%`,
                background: "var(--_token---text-olive, #706d56)",
                borderRadius: 4,
                transition: prefersReducedMotion ? "none" : "width 0.4s ease",
              }}
            />
          </div>

          {/* Question */}
          <h3
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: "var(--_typography---paragraph--big, 1.25rem)",
              lineHeight: 1.3,
              color: "var(--_token---text-main, #292828)",
              margin: "0 0 12px 0",
              textAlign: "left",
            }}
          >
            {questions[currentStep]}
          </h3>

          {/* Reassurance text — only on Q1 */}
          {currentStep === 0 && reassurance && (
            <p
              style={{
                color: "var(--_token---text-olive)",
                fontSize: 14,
                lineHeight: 1.5,
                margin: "0 0 28px 0",
                fontStyle: "italic",
              }}
            >
              {reassurance}
            </p>
          )}
          {currentStep > 0 && <div style={{ marginBottom: 28 }} />}

          {/* Answer pill buttons — layout via .nem-answers CSS (row desktop / column mobile) */}
          <div className="nem-answers">
            {t.answers.map((label, i) => {
              const isSelected = answers[currentStep] === i;
              return (
                <button
                  key={i}
                  aria-selected={isSelected}
                  onClick={() => selectAnswer(i)}
                  style={{
                    borderRadius: 999,
                    padding: "12px 24px",
                    borderWidth: "1.5px",
                    borderStyle: "solid",
                    borderColor: isSelected
                      ? "var(--_token---accent-main, #fafa7d)"
                      : "var(--_token---accent-light-grey, #ecebe8)",
                    backgroundColor: isSelected
                      ? "var(--_token---accent-main, #fafa7d)"
                      : "white",
                    color: "var(--_token---text-main, #292828)",
                    cursor: "pointer",
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "var(--_typography---paragraph--standard, 1rem)",
                    transition: prefersReducedMotion ? "none" : "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "var(--_token---accent-main, #fafa7d)";
                      e.currentTarget.style.backgroundColor =
                        "color-mix(in srgb, var(--_token---accent-main, #fafa7d) 20%, white)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "var(--_token---accent-light-grey, #ecebe8)";
                      e.currentTarget.style.backgroundColor = "white";
                    }
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PROFILE — Gender, Age, Relationship
      ═══════════════════════════════════════════ */}
      {phase === "profile" && (
        <div className="quiz-fade-in flex flex-col gap-6">
          <h2
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 24,
              lineHeight: 1.2,
              color: "var(--_token---text-main, #292828)",
              margin: 0,
            }}
            className="max-[480px]:text-[20px]"
          >
            {t.profileLabel}
          </h2>

          <div className="flex flex-col gap-4">
            {/* Gender */}
            <div>
              <label htmlFor="nem-gender" style={labelStyle}>
                {t.genderLabel}
              </label>
              <select
                id="nem-gender"
                data-field="gender"
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  if (fieldErrors.gender) setFieldErrors((p) => ({ ...p, gender: "" }));
                }}
                onBlur={() => {
                  if (!gender) setFieldErrors((p) => ({ ...p, gender: t.errors.genderEmpty }));
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.gender}
                aria-describedby={fieldErrors.gender ? "error-gender" : undefined}
                style={{
                  ...(fieldErrors.gender ? selectFieldErrorStyle : selectFieldStyle),
                  color: gender ? "var(--_token---text-main, #292828)" : "#9f9c8b",
                }}
              >
                {t.genderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {fieldErrors.gender && (
                <div id="error-gender" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.gender}
                </div>
              )}
            </div>

            {/* Age category */}
            <div>
              <label htmlFor="nem-age" style={labelStyle}>
                {t.ageCategoryLabel}
              </label>
              <select
                id="nem-age"
                data-field="age-category"
                value={ageCategory}
                onChange={(e) => {
                  setAgeCategory(e.target.value);
                  if (fieldErrors.ageCategory) setFieldErrors((p) => ({ ...p, ageCategory: "" }));
                }}
                onBlur={() => {
                  if (!ageCategory) setFieldErrors((p) => ({ ...p, ageCategory: t.errors.ageCategoryEmpty }));
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.ageCategory}
                aria-describedby={fieldErrors.ageCategory ? "error-ageCategory" : undefined}
                style={{
                  ...(fieldErrors.ageCategory ? selectFieldErrorStyle : selectFieldStyle),
                  color: ageCategory ? "var(--_token---text-main, #292828)" : "#9f9c8b",
                }}
              >
                {t.ageCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {fieldErrors.ageCategory && (
                <div id="error-ageCategory" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.ageCategory}
                </div>
              )}
            </div>

            {/* Relationship status */}
            <div>
              <label htmlFor="nem-relationship" style={labelStyle}>
                {t.relationshipLabel}
              </label>
              <select
                id="nem-relationship"
                data-field="relationship-status"
                value={relationshipStatus}
                onChange={(e) => {
                  setRelationshipStatus(e.target.value);
                  if (fieldErrors.relationshipStatus) setFieldErrors((p) => ({ ...p, relationshipStatus: "" }));
                }}
                onBlur={() => {
                  if (!relationshipStatus) setFieldErrors((p) => ({ ...p, relationshipStatus: t.errors.relationshipEmpty }));
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.relationshipStatus}
                aria-describedby={fieldErrors.relationshipStatus ? "error-relationship" : undefined}
                style={{
                  ...(fieldErrors.relationshipStatus ? selectFieldErrorStyle : selectFieldStyle),
                  color: relationshipStatus ? "var(--_token---text-main, #292828)" : "#9f9c8b",
                }}
              >
                {t.relationshipOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {fieldErrors.relationshipStatus && (
                <div id="error-relationship" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.relationshipStatus}
                </div>
              )}
            </div>

            {/* Continue button */}
            <button
              onClick={handleProfileContinue}
              style={pillButtonStyle}
              onMouseEnter={(e) => {
                if (!prefersReducedMotion) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {t.profileContinueButton}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          CONCLUSION
      ═══════════════════════════════════════════ */}
      {phase === "conclusion" && (
        <div className="quiz-slide-up flex flex-col gap-6">
          {/* Label */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--_token---text-olive, #706d56)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {t.conclusionLabel}
          </span>

          {/* Conclusion text (gender-differentiated) */}
          <p
            data-element="conclusion-text"
            style={{
              fontSize: "var(--_typography---paragraph--standard, 1rem)",
              lineHeight: 1.6,
              color: "var(--_token---text-main, #292828)",
              margin: 0,
            }}
          >
            {conclusionText}
          </p>

          {/* Bridge line */}
          <p
            style={{
              fontSize: "var(--_typography---paragraph--standard, 1rem)",
              lineHeight: 1.6,
              color: "var(--_token---text-main, #292828)",
              fontWeight: 500,
              margin: 0,
            }}
          >
            {t.bridgeLine}
          </p>

          {/* CTA */}
          <button
            onClick={() => setPhase("optin")}
            style={pillButtonStyle}
            onMouseEnter={(e) => {
              if (!prefersReducedMotion) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {ctaLabel}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          OPT-IN FORM (name + email + consent only)
      ═══════════════════════════════════════════ */}
      {phase === "optin" && (
        <div className="quiz-fade-in flex flex-col gap-6">
          <div>
            <h2
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                fontSize: 24,
                lineHeight: 1.2,
                color: "var(--_token---text-main, #292828)",
                margin: "0 0 4px 0",
              }}
              className="max-[480px]:text-[20px]"
            >
              {t.optinLabel}
            </h2>
            <p
              style={{
                color: "var(--_token---text-olive, #706d56)",
                fontSize: 15,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {t.optinIntro}
            </p>
          </div>

          {/* Generic error */}
          {fieldErrors.generic && (
            <div aria-live="polite" style={{ color: "#e53e3e", fontSize: "0.875rem" }}>
              {fieldErrors.generic}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* First name */}
            <div>
              <input
                type="text"
                placeholder={t.firstNamePlaceholder}
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (fieldErrors.firstName) setFieldErrors((p) => ({ ...p, firstName: "" }));
                }}
                onBlur={() => {
                  if (!firstName.trim()) setFieldErrors((p) => ({ ...p, firstName: t.errors.firstNameEmpty }));
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.firstName}
                aria-describedby={fieldErrors.firstName ? "error-firstName" : undefined}
                style={fieldErrors.firstName ? fieldErrorStyle : fieldStyle}
              />
              {fieldErrors.firstName && (
                <div id="error-firstName" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.firstName}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
                }}
                onBlur={() => {
                  if (!email.trim()) {
                    setFieldErrors((p) => ({ ...p, email: t.errors.emailEmpty }));
                  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    setFieldErrors((p) => ({ ...p, email: t.errors.emailInvalid }));
                  }
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "error-email" : undefined}
                style={fieldErrors.email ? fieldErrorStyle : fieldStyle}
              />
              {fieldErrors.email && (
                <div id="error-email" style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.email}
                </div>
              )}
            </div>

            {/* Honeypot */}
            <div style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true">
              <input
                type="text"
                data-field="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Consent checkbox */}
            <div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={nemMattersConsent}
                  onChange={(e) => {
                    setNemMattersConsent(e.target.checked);
                    if (fieldErrors.consent) setFieldErrors((p) => ({ ...p, consent: "" }));
                  }}
                  style={{
                    marginTop: 3,
                    accentColor: "var(--_token---text-olive, #706d56)",
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--_token---text-olive, #706d56)" }}>
                  {t.consentLabel}
                </span>
              </label>
              {fieldErrors.consent && (
                <div style={{ color: "#e53e3e", fontSize: "0.875rem", marginTop: 4 }}>
                  {fieldErrors.consent}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              disabled={!nemMattersConsent || submitting}
              onClick={handleSubmit}
              style={{
                ...pillButtonStyle,
                backgroundColor: nemMattersConsent
                  ? "var(--_token---accent-main, #fafa7d)"
                  : "var(--_token---accent-light-grey, #ecebe8)",
                cursor: nemMattersConsent && !submitting ? "pointer" : "not-allowed",
                opacity: submitting ? 0.6 : 1,
                transition: prefersReducedMotion ? "none" : "all 0.15s ease",
                pointerEvents: submitting ? "none" : "auto",
              }}
            >
              {submitting ? "..." : ctaLabel}
            </button>

            {/* Relieve line */}
            <p style={{ fontSize: "0.875rem", color: "var(--_token---text-olive, #706d56)", textAlign: "center", margin: 0 }}>
              {t.relieveLine}
            </p>

            {/* Disclaimer intentionally omitted here — it already appears once on
                the landing page below the module; rendering it again produced a
                visible duplicate. `t.disclaimer` is kept for potential future use. */}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          CONFIRMATION
      ═══════════════════════════════════════════ */}
      {phase === "confirmation" && (
        <div className="quiz-scale-in flex flex-col gap-5" style={{ paddingTop: 16, paddingBottom: 16 }}>
          {/* Label */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--_token---text-olive, #706d56)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {t.confirmationLabel}
          </span>

          {/* Main text */}
          <p
            style={{
              fontSize: "var(--_typography---paragraph--standard, 1rem)",
              lineHeight: 1.6,
              color: "var(--_token---text-main, #292828)",
              margin: 0,
            }}
          >
            {t.confirmationMain}
          </p>

          {/* Secondary text */}
          <p
            style={{
              fontSize: "var(--_typography---paragraph--standard, 1rem)",
              lineHeight: 1.6,
              color: "var(--_token---text-main, #292828)",
              margin: 0,
            }}
          >
            {t.confirmationSecondary}
          </p>

          {/* No email received */}
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--_token---accent-grey, #9f9c8b)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {t.noEmailReceived}
          </p>

          {/* Wrong email correction */}
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--_token---accent-grey, #9f9c8b)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {t.wrongEmail}{" "}
            <button
              onClick={goBackToOptin}
              style={{
                background: "none",
                border: "none",
                color: "var(--_token---text-main, #292828)",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                fontSize: "0.875rem",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              {t.wrongEmailLink}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

export default declareComponent(Quiz, {
  name: "NEM Test Phase B",
  description:
    "NEM emotional pattern quiz: 20 questions → profile → gender-differentiated conclusion → opt-in → confirmation.",
  group: "Interactive",
  props: {
    submitWebhookUrl: propTypes.Text({ name: "Submit Webhook URL" }),
    reassuranceText: propTypes.Text({
      name: "Reassurance Text",
      defaultValue:
        "Kies wat het meest op jou lijkt - er is geen goed of fout antwoord.",
    }),
    ctaButtonText: propTypes.Text({
      name: "CTA Button Text",
      defaultValue: "Ontvang mijn rapport",
    }),
    question1: propTypes.Text({ name: "Question 1", defaultValue: "Na een gesprek dat niet lekker liep, blijf ik uren of dagen malen over wat ik fout deed." }),
    question2: propTypes.Text({ name: "Question 2", defaultValue: "Als iets in een relatie of op werk misgaat, ben ik de eerste die denkt dat het aan mij ligt." }),
    question3: propTypes.Text({ name: "Question 3", defaultValue: "Ik stel beslissingen of dingen die ik eigenlijk wil doen langer uit dan logisch is." }),
    question4: propTypes.Text({ name: "Question 4", defaultValue: "Ik betrap mezelf erop dat ik streng oordeel over hoe anderen dingen doen." }),
    question5: propTypes.Text({ name: "Question 5", defaultValue: "Ik vermijd situaties die spanning oproepen, ook als ik eigenlijk wel zou willen." }),
    question6: propTypes.Text({ name: "Question 6", defaultValue: "Ik blijf mijn best doen om iets of iemand naar mijn hand te zetten, ook als ik weet dat het niet gaat lukken." }),
    question7: propTypes.Text({ name: "Question 7", defaultValue: "Als ik moe of overweldigd ben, zegt iets in mij: \"Ik kan dit niet aan.\"" }),
    question8: propTypes.Text({ name: "Question 8", defaultValue: "Mijn standaardreactie als er iets gebeurt is: \"Maakt niet uit, het komt wel goed.\"" }),
    question9: propTypes.Text({ name: "Question 9", defaultValue: "Als iemand iets doet wat me raakt, ervaar ik dat al snel als een persoonlijke aanval en ga ik er fel tegenin." }),
    question10: propTypes.Text({ name: "Question 10", defaultValue: "Bij iets nieuws of onbekends ga ik in mijn hoofd direct naar wat er mis zou kunnen gaan." }),
    question11: propTypes.Text({ name: "Question 11", defaultValue: "Ik voel een drive in mijn lichaam - gejaagd, hoog, ik kan niet stil zitten als er nog iets opgelost moet worden." }),
    question12: propTypes.Text({ name: "Question 12", defaultValue: "Ik denk vaak: \"Als ik dit nou maar goed doe, dan komt het wel goed.\"" }),
    question13: propTypes.Text({ name: "Question 13", defaultValue: "In situaties die me eigenlijk zouden moeten raken, merk ik nauwelijks iets op in mijn lichaam - alsof ik op afstand sta van mijn eigen leven." }),
    question14: propTypes.Text({ name: "Question 14", defaultValue: "Op het moment dat ik me aangevallen voel, voel ik mijn lichaam aanspannen - mijn kaken, mijn schouders, mijn vuisten, alsof ik me acuut wil verdedigen." }),
    question15: propTypes.Text({ name: "Question 15", defaultValue: "In spannende situaties voel ik mijn lichaam terugdeinzen - een verkramping, het gevoel dat ik ergens van weg wil." }),
    question16: propTypes.Text({ name: "Question 16", defaultValue: "Als de sfeer dreigt om te slaan, doe ik extra mijn best en pas ik me aan om het goed te houden." }),
    question17: propTypes.Text({ name: "Question 17", defaultValue: "Als iets misgaat voel ik mezelf wegzakken - mijn energie verdwijnt en alles wordt zwaar." }),
    question18: propTypes.Text({ name: "Question 18", defaultValue: "Als anderen om mij heen sterk reageren op een emotionele gebeurtenis, blijf ik vanbinnen vaak vlak." }),
    question19: propTypes.Text({ name: "Question 19", defaultValue: "Als iemand dichtbij iets niet doet zoals ik wil, voel ik irritatie of boosheid die maar niet weggaat." }),
    question20: propTypes.Text({ name: "Question 20", defaultValue: "Als ik iets moet doen wat goed voor me is maar me angst geeft, kies ik vaak voor wat veilig voelt." }),
  },
});