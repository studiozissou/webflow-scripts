/* ─────────────────────────────────────────────────────────────────────────────
 * GENERATED FILE — do not edit here. Paste this whole file into the Webflow
 * custom code component.
 *
 * Regenerate with:  npm run build:nem   (regenerates, then typechecks)
 *
 * Built from, and edit instead:
 *   projects/nem-life/src/nem-test-phase-b.tsx
 *   projects/nem-life/src/nem-test-conclusion-ids.js
 *   projects/nem-life/src/nem-test-scoring.js
 *   projects/nem-life/src/nem-conclusion-texts.js
 *   projects/nem-life/src/nem-intro-lines.js
 *
 * The modules are inlined because everything in Webflow runs inside one component,
 * so relative imports cannot resolve. They stay separate in the repo because the
 * unit tests cannot import a .tsx.
 * ───────────────────────────────────────────────────────────────────────────── */

import { declareComponent, useWebflowContext } from "@webflow/react";
import { props as propTypes } from "@webflow/data-types";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

const SHEET_ORDER = [
  "fear",
  "selfRejection",
  "falseHope",
  "falsePower",
  "emotionalNumbing",
];

const MECHANISM_CODE = {
  selfRejection: "SR",
  emotionalNumbing: "EM",
  falsePower: "FP",
  fear: "FR",
  falseHope: "FH",
};

const MECHANISM_TO_KEY = {
  selfRejection: "self-rejection",
  emotionalNumbing: "emotional-numbing",
  falsePower: "false-power",
  fear: "fear",
  falseHope: "false-hope",
};

const GENDER_CODE = { female: "F", male: "M" };

const FLAT_OUTCOME_CODE = { "flat-low": "LOW", "flat-high": "HIGH" };

const TEXT_SET = "01";

function conclusionKeyFor({ outcome, primary, secondary }) {
  if (outcome === "flat-low" || outcome === "flat-high") return outcome;

  const leading = MECHANISM_TO_KEY[primary];
  if (!leading) throw new Error(`Unknown mechanism: ${primary}`);

  if (outcome === "single") return leading;

  const following = MECHANISM_TO_KEY[secondary];
  if (!following) throw new Error(`Unknown mechanism: ${secondary}`);

  return `${leading}_${following}`;
}

function conclusionIdFor(gender, { outcome, primary, secondary }, textSet = TEXT_SET) {
  const genderCode = GENDER_CODE[gender];
  if (!genderCode) throw new Error(`Unknown gender: ${gender}`);

  const prefix = `${textSet}${genderCode}`;

  const flatCode = FLAT_OUTCOME_CODE[outcome];
  if (flatCode) return `${prefix}-${flatCode}`;

  const leading = MECHANISM_CODE[primary];
  if (!leading) throw new Error(`Unknown mechanism: ${primary}`);

  if (outcome === "single") return `${prefix}-${leading}`;

  const following = MECHANISM_CODE[secondary];
  if (!following) throw new Error(`Unknown mechanism: ${secondary}`);

  return `${prefix}-${leading}-${following}`;
}

const CONCLUSION_KEYS = [
  "flat-low",
  "flat-high",
  ...SHEET_ORDER.map((mech) => MECHANISM_TO_KEY[mech]),
  ...SHEET_ORDER.flatMap((leading) =>
    SHEET_ORDER.filter((following) => following !== leading).map(
      (following) => `${MECHANISM_TO_KEY[leading]}_${MECHANISM_TO_KEY[following]}`,
    ),
  ),
];

const INTRO_LINE_KEYS = CONCLUSION_KEYS.filter((key) => !(key in FLAT_OUTCOME_CODE));

function introLineIdFor({ primary, secondary }, textSet = TEXT_SET) {
  const leading = MECHANISM_CODE[primary];
  if (!leading) throw new Error(`Unknown mechanism: ${primary}`);

  if (!secondary) return `${textSet}-${leading}`;

  const following = MECHANISM_CODE[secondary];
  if (!following) throw new Error(`Unknown mechanism: ${secondary}`);

  return `${textSet}-${leading}-${following}`;
}

function enumerateIntroLineRows(textSet = TEXT_SET) {
  const row = (type, primary, secondary) => ({
    type,
    leading: MECHANISM_TO_KEY[primary],
    following: secondary ? MECHANISM_TO_KEY[secondary] : "",
    key: conclusionKeyFor({
      outcome: secondary ? "dual" : "single",
      primary,
      secondary,
    }),
    id: introLineIdFor({ primary, secondary }, textSet),
  });

  return [
    ...SHEET_ORDER.map((mech) => row("single", mech, null)),
    ...SHEET_ORDER.flatMap((leading) =>
      SHEET_ORDER.filter((following) => following !== leading).map((following) =>
        row("dual", leading, following),
      ),
    ),
  ];
}

function enumerateConclusionRows(textSet = TEXT_SET) {

  return ["female", "male"].flatMap((gender) => {
    const row = (type, outcome, primary, secondary) => ({
      gender,
      type,
      leading: primary ? MECHANISM_TO_KEY[primary] : "",
      following: secondary ? MECHANISM_TO_KEY[secondary] : "",
      leadingMechanism: primary ?? null,
      followingMechanism: secondary ?? null,
      key: conclusionKeyFor({ outcome, primary, secondary }),
      id: conclusionIdFor(gender, { outcome, primary, secondary }, textSet),
    });

    return [
      row("flat", "flat-low", null, null),
      row("flat", "flat-high", null, null),
      ...SHEET_ORDER.map((mech) => row("single", "single", mech, null)),
      ...SHEET_ORDER.flatMap((leading) =>
        SHEET_ORDER.filter((following) => following !== leading).map((following) =>
          row("dual", "dual", leading, following),
        ),
      ),
    ];
  });
}

const MECHANISM_MAP = {
  selfRejection:    { questions: [0, 1, 6, 16], bodyQ: 16, situationalQ: 0 },
  emotionalNumbing: { questions: [2, 7, 12, 17], bodyQ: 12, situationalQ: 17 },
  falsePower:       { questions: [3, 8, 13, 18], bodyQ: 13, situationalQ: 18 },
  fear:             { questions: [4, 9, 14, 19], bodyQ: 14, situationalQ: 19 },
  falseHope:        { questions: [5, 10, 11, 15], bodyQ: 10, situationalQ: 15 },
};

const TIEBREAK_ORDER = [
  "selfRejection",
  "emotionalNumbing",
  "falsePower",
  "fear",
  "falseHope",
];

const MIN_MECHANISM_SCORE = 8;

const SECONDARY_GAP = 3;

const FLAT_SPREAD = 3;

function calculateScores(answers, gender) {

  const scores = Object.fromEntries(
    Object.entries(MECHANISM_MAP).map(([mechanism, { questions }]) => [
      mechanism,
      questions.reduce((sum, qi) => sum + (answers?.[qi] ?? 0), 0),
    ]),
  );

  const sorted = Object.entries(scores).sort(
    (a, b) => b[1] - a[1] || TIEBREAK_ORDER.indexOf(a[0]) - TIEBREAK_ORDER.indexOf(b[0]),
  );

  const max = sorted[0][1];
  const min = sorted[sorted.length - 1][1];

  const isFlatLow = max < MIN_MECHANISM_SCORE;
  const isFlatHigh = !isFlatLow && min >= MIN_MECHANISM_SCORE && max - min <= FLAT_SPREAD;
  const isFlat = isFlatLow || isFlatHigh;

  const primary = isFlat ? null : sorted[0][0];

  const [candidate, candidateScore] = sorted[1];
  const secondary =
    !isFlat && candidateScore >= MIN_MECHANISM_SCORE && max - candidateScore <= SECONDARY_GAP
      ? candidate
      : null;

  const outcome = isFlatLow
    ? "flat-low"
    : isFlatHigh
      ? "flat-high"
      : secondary
        ? "dual"
        : "single";

  return {
    scores,
    primary,
    secondary,
    outcome,
    conclusionKey: conclusionKeyFor({ outcome, primary, secondary }),
    conclusionId: conclusionIdFor(gender, { outcome, primary, secondary }),

    skipsReport: outcome === "flat-low" || outcome === "flat-high",
    totalScore: Object.values(scores).reduce((a, b) => a + b, 0),
  };
}

const NL_VROUW = {
  "flat-low": "Op basis van je antwoorden springt er niets duidelijk uit. De reacties die deze test meet liggen bij jou allemaal dicht bij elkaar, en geen ervan speelt een hoofdrol.\n\nDat kan verschillende dingen betekenen. Misschien herken je jezelf niet in de situaties die we je hebben voorgelegd. Misschien heb je al veel aan jezelf gewerkt en klopt deze uitkomst precies. En soms vangen twintig vragen nu eenmaal niet wat er bij jou speelt.\n\nEen persoonlijk rapport heeft hier weinig zin - dat wordt opgebouwd rond één duidelijke reactie, en die is er nu niet. Herken je je hier niet in, of wil je er toch over doorpraten? Laat het ons weten.",
  "flat-high": "Op basis van je antwoorden speelt er veel tegelijk. Waar bij de meeste mensen één reactie duidelijk bovenaan staat, scoor je op alle vijf hoog - ze zijn bij jou allemaal actief.\n\nDat is geen prettige uitkomst om te lezen, en waarschijnlijk voelt het ook niet zo. Het betekent meestal dat er op meerdere fronten tegelijk veel van je gevraagd wordt, en dat er weinig ruimte overblijft.\n\nJuist daarom sturen we je geen standaardrapport. Zo'n rapport gaat over één reactie, en dat doet geen recht aan wat er bij jou speelt. Wat hier wel past is een gesprek. Neem gerust contact met ons op.",
  "fear": "Heel regelmatig zijn er momenten of situatie waar je tegenop ziet.  Je merkt dat er iets in je blokkeert als je je wilt uitspreken of iets wilt doen en in plaats daarvan hou je je stil. Vaak weet je wel dat de gebeurtenis die gaat komen, niet gevaarlijk is maar het roept toch veel spanning op. Je houdt de dingen graag overzichtelijk en veilig voor jezelf.",
  "self-rejection": "Over het algemeen voel je je nogal futloos.  De energie die je hebt gaat vaak op aan piekeren. Als je met mensen in contact bent geweest, ga je het gesprek nog wel 10 x na om te kijken wat voor ‘gekke’ dingen je hebt gezegd. Je merkt dat je vaak twijfel over de keuzes die je maakt of vindt het per definitie lastig om een keuze te maken. Je vergelijkt jezelf vaak met anderen en voelt jezelf meestal de mindere.",
  "false-hope": "Je zegt vaak al ja voordat je goed beseft wat je precies hebt beloofd - aan je kinderen, je partner, je werk. Rust voelt pas verdiend als het rijtje is afgevinkt. Er zit een drive in je die je voortdurend een gevoel van urgentie geeft.  Het kan zijn dat je het gevoel van ‘urgentie’ niet eens echt voelt omdat je niet beter weet, het voelt als normaal, zo ben ik nou eenmaal. Als ik dit nu maar eerst doe, dan komt het wel goed’ is jouw levensmotto.",
  "false-power": "Als je eerlijk bent naar jezelf, heb je aardig wat temperament. Fysiek gezien kan je je vrij snel opwinden waardoor je stress ervaart. Deze energie richt zich meestal naar buiten toe en vertaalt zich voor een groot deel uit (ver)oordelen van de mensen om je heen. Daarnaast  ervaart regelmatig dat mensen je niet begrijpen en dat je er alleen voorstaat. Eigenlijk vind je ook dat je de meeste dingen beter kan dan anderen.",
  "emotional-numbing": "Eigenlijk ervaar je niet veel lijdenslast. Ik vraag me zelfs af, of jezelf deze test wilde gaan doen of dat iemand anders je op deze test heeft geattendeerd. In de basis wil je niet moeilijk doen. Stiekem vind je vaak dat andere mensen al snel moeilijk doen. Als je al ergens ‘last’ van heb is het dat je kan zien dat mensen om je heen intensere emoties ervaren, wat je wellicht zelf ook wel zou willen, als het over fijne emoties gaat. ‘Niet moeilijk doen, het komt wel goed’ is jouw motto. Daarnaast kan je je in allerlei omstandigheden ontzettend goed aanpassen, ook al gaat dit eigenlijk ten koste van jezelf.",
  "fear_self-rejection": "Regelmatig komt er een spanning bij je op. Deze spanning kan variëren van lichte tot zwaar. Doordat gevoel ga je snel situaties uit de weg. Ook al weet je dat je het eigenlijk best aan kan. Daardoor volgt er snel een verwijt aan jezelf, “waarom heb ik dit nu…wat ben ik toch een…!” Dit verwijt kan vervolgens weer een zwaar, onrustig gevoel in jezelf oproepen en zo zit je in een lus van gevoelens en gedachten die zichzelf in stand houdt.",
  "fear_false-hope": "Je merkt regelmatig op dat je je in veel situaties gespannen voelt en het liefste wil terugtrekken of er helemaal niet naar toe wilt. Aan de andere kant voelen de consequenties van het ‘niet gaan’ veel groter, wat gaan ze dan over me denken. Niet gaan, voelt dus als geen optie. Ik zet gewoon mijn beste beentje voor en doe mijn best.",
  "fear_false-power": "Je merkt regelmatig een voor jou bekende spanning op in je lichaam. Dit gebeurd met name op als het om situaties gaat waar je voor jouw gevoel geen grip op hebt. Die spanning zet zich dan al snel om in irritatie waarbij je verwijtend kan zijn.  Met name naar de mensen die dichtbij je staan. Als je je irritatie hebt geuit, ook al wil je dat eigenlijk niet, kan daarna een gevoel van angst opkomen omdat je je zo hebt gedragen.",
  "fear_emotional-numbing": "Soms is ervaar je heel even een zeer onbehagelijk gevoel in je lichaam waar je heel snel van weg wil. Het lijkt op gevoelens van paniek. “Gelukkig” heb je het vermogen om dat gevoel snel weer te bagatelliseren en te bedenken dat het allemaal wel meevalt en dat het wel weer goed komt. Alleen, als je eerlijk bent, blijft er lichtelijk wel een naar gevoel hangen. Het bagataliseren ‘werkt’ totdat het niet meer werkt. Deze momenten komen eigenlijk steeds vaker voor en moet ik steeds meer moeite doen om mijn gevoel ‘weg te maken’.",
  "self-rejection_fear": "Je herkend regelmatig dat je een nare gedachte over jezelf hebt- dat je iets niet goed hebt gedaan, dat je tekortschiet.  Die gedachte activeert al snel een golf van onrust en spanning in je lichaam. Een waakzame staat die niet zomaar wegzakt. Zo voedt het ene het andere: hoe harder je jezelf veroordeelt, hoe onrustiger je lichaam wordt. Het is een combinatie die je uitput: de overtuigende nare gedachte over jezelf die vervolgens een spanning opbouw in je lichaam teweeg brengt.",
  "self-rejection_false-hope": "Regelmatig als er iets misgaat, is steevast de eerste gedachte dat het aan jou ligt - dat je tekort bent geschoten of iets niet goed hebt gedaan. Vlak daarna ga je harder je best doen, extra zorgen, extra regelen, alsof je het zo weer goed kan maken. Zo verandert twijfel over jezelf steeds in nog meer inzet voor een ander, zonder dat de twijfel zelf verdwijnt. Soms geeft dit je dan even een goed gevoel maar eigenlijk blijft het gevoel dat je nooit helemaal voldoet, hoe goed je je best ook doet bestaan.",
  "self-rejection_false-power": "Jouw uitdaging zit hem in de gevoelens van je down voelen en vervolgens irritatie. Als je het idee hebt dat je iets niet goed hebt gedaan, kan dit je behoorlijk in de weg zitten. Je kan je dan klein en rot voelen over jezelf. Dit zijn geen fijne gedachten en gevoelens. Het lijkt er op dat je een ‘hulplijntje’ hebt ontwikkeld die dit nare gevoel omdraait. Ipv dat het nare gevoel:jezelf schuldig, onbenullig of iets dergelijks te vinden, richt je aandacht zich naar buiten toe. Er bouwt zich een irritatie op en je aandacht richt zich op de mensen om je heen. Zo treft jouw geen blaam meer maar ergens voelt het ook niet prettig.",
  "self-rejection_emotional-numbing": "Met enige regelmaat voel je je niet echt happy en kan je sombere gedachtes hebben over jezelf zoals jezelf niet goed genoeg voelen. Je hebt er niet echt een reden voor en probeert jezelf af te leiden door dingen te gaan doen. Bijvoorbeeld door te shoppen, te scrollen op je telefoon ect. Je zoekt afleiding. In de basis vind je dan dat je je eigenlijk niet zo moet aanstellen en denkt dan vaak ‘het gaat wel voorbij, het komt wel goed’. Doordat je jezelf afleidt gaat het nare gevoel ook wel weg, maar het is toch gek.",
  "false-hope_fear": "Je houdt liever alle ballen in de lucht dan dat je er eentje laat vallen. Dit kan betekenen dat je regelmatig over je eigen grens heen gaat om de controle te houden. Zonder dat je dit in eerste instantie door hebt. Stel dat je je rust gunt terwijl je de punten op je lijstje nog niet zijn afgevinkt voel je je onrustig worden. Onder die drive zit vaak een spanning die je liever niet toelaat: wellicht de angst dat het niet goed genoeg is, in de ogen van iemand anders.",
  "false-hope_self-rejection": "Je probeert zo goed als het gaat alle ballen in de lucht te houden- het huishouden, de kinderen, je werk, de mensen om je heen -. Ook al wordt het je teveel, dan ga je nog ’liever’ je eigen grens over dan dat je het gevoel van ‘falen en te kort schieten’ toelaat. Je eerste gedachte is zelden dat er te veel op je bordje lag: je ‘gedachten gaan eerder naar ‘ik heb het niet goed gedaan.",
  "false-hope_false-power": "Je bent een enorme bezige bij. En voelt je hier in eerste instantie heel goed bij. Je hebt oog en zorg voor iedereen om je heen. Je zou het best \"please gedrag\" kunnen noemen. Wat daarnaast bij je speelt, maar wellicht is dit niet zo zichtbaar voor je, dat je regelmatig verwachting hebt naar andere mensen toe. Als er niet aan die verwachtingen wordt voldaan, kan je vanuit een soort scherpte reageren op andere mensen. Herken je je in het patroon dat je eerst veel aan het geven bent? Maar als er niet iets voor terugkomt, dat je dan ook geïrriteerd kan raken.",
  "false-hope_emotional-numbing": "Je merkt op dat je vaak geneigd bent om maar door te gaan met allerlei bezigheden. Je hoofd zegt je; Er is altijd nog wel iets te regelen of op te lossen.  Pas als je ergens gaat voelen dat je vermoeid wordt,  stop je. Maar ergens kan je dan wel voelen dat je je over een grens bent gegaan. Op dat moment kan een ontevredenheid, maar misschien ook wel een gevoel van onverschilligheid naar boven komen. De gedachte dat het allemaal niet meer zoveel uitmaakt. Dit lijkt een regelmatig terugkerend patroon te zijn.",
  "false-power_fear": "Je merkt regelmatig opwind over de manier waarop de mensen om je heen iets zeggen. Je ervaart wat iemand anders zegt vrij snel als een ‘aanval’ waar tegen je je moet verdedigen. En dat doe je dan ook, reageren met een net ietwat te heftige reactie op de mensen om je heen. Het is een soort onbedwingbare impuls.  Het resultaat is dat je na z’n gebeurtenis je je vaak alleen en verdrietig voelt en dat je bang bent dat je dierbaren op een gegeven moment genoeg van je gaan krijgen. Met dat nare gevoel blijf je dan over. Helaas gebeurd dit met enige regelmaat.",
  "false-power_self-rejection": "Je merkt regelmatig op dat je je irriteert aan de mensen om je heen. Ergens weet je wel dat ze het vaak goed bedoelen, maar je kan het vaak niet laten om er toch iets over te zeggen. De manier waarop je je mening over de ander kenbaar maakt, is vaak feller dan nodig en je bereikt ook nog eens het tegenovergestelde als wat je eigenlijk wil. Daar baal je dan stevig van en irriteer je je aan je eigen gedrag…’waarom doe ik dit toch aldoor’. Uiteindelijk blijft dit nare gevoel over jezelf best lang hangen.",
  "false-power_false-hope": "Je merkt op dat je je stemming zich regelmatig afwisselend met gevoelens van ‘irritatie’ en ‘je best doen’. Een nare opmerking: heb je sneller geuit, dan dat je zou willen, ook als vind je vaak wel dat je gelijk hebt. Al snel na deze gebeurtenis probeer je je gedrag weer goed te maken. Je bied je excuses aan. Je merkt steeds vaker op dat degene waar je je excuses aan aanbiedt je dan niet echt meer serieus neemt. Dit irriteert je vervolgens weer. Het is een patroon dat zich maar blijft herhalen.",
  "false-power_emotional-numbing": "Je merkt regelmatig op dat je je vrij snel kan irriteren aan andere mensen. Je vind het maar lastig om te zien dat andere mensen je vaak niet begrijpen of dat ze dingen zeggen of doen die in jou ogen nergens op slaan. Je hebt de overtuiging dat er toch niets aan te veranderen is en je schikt je maar naar de situatie. Meestal slik je je gevoel in en leidt je jezelf af met iets anders, tv kijken, scrollen, sporten, shoppen of iets dergelijks.",
  "emotional-numbing_fear": "Over het algemeen voel je je best oke en ben je tevreden. Je leven gaat zijn gangetje, geen hoge toppen en geen diepe dalen. Als je eerlijk naar jezelf bent zijn er wel een paar dingen die je echt heel naar vindt, die je als het even kan probeert te vermijden. Een daarvan is dat je het lastig vind om over je gevoelens te praten. Als je in een situatie komt, bijvoorbeeld met je partner, wanneer dit wel echt belangrijk is, roept dit veel spanning bij je op.",
  "emotional-numbing_self-rejection": "Over het algemeen voel je je best oke en ben je tevreden. Je leven gaat zijn gangetje, geen hoge toppen en geen diepe dalen. Dat is rustig en prettig, maar als je eerlijk naar jezelf bent komen er zo af en toe wel wat nare gedachten over jezelf voorbij. Die kunnen soms best een poosje blijven hangen waardoor je je down voelt. Je snapt eigenlijk niet echt waarom je je dan zo voelt. Je zou hier heel graag vanaf willen.",
  "emotional-numbing_false-hope": "Over het algemeen voel je je best oké en ben je tevreden. Je leven gaat zijn gangetje, geen hoge toppen en geen diepe dalen. Als je eerlijk naar jezelf bent voel je je wel steeds vaker vermoeid. Je vindt het vrij lastig om je eigen grens te bepalen en bent meestal met name bezig voor de mensen om je heen. Aan het einde van de dag, als je eigenlijk (te) moe bent vul je je tijd het liefst met een serie of scrollen op je mobiel. Eindelijk even in je eigen bubbel. Eigenlijk is dit niet echt wat je wil, maar ja..",
  "emotional-numbing_false-power": "Over het algemeen voel je je best oké. Je leven gaat zijn gangetje, geen hoge toppen en geen diepe dalen. Maar als je eerlijk naar jezelf bent kan je je zo nu en dan flink irriteren naar de mensen om je heen. Zeker degene die het dichtst bij je staan. Je vind het maar lastig om te ervaren als mensen je niet begrijpen of dat ze dingen zeggen of doen die in jou ogen nergens op slaan. Je probeert je dan vaak nog rustig te houden en te denken ‘laat maar’, maar je kan het dan toch niet laten om je op een ‘te heftige’ manier te uiten waardoor er dan gedoe ontstaat.",
};

const NL_MAN = {};

const EN_VROUW = {};

const EN_MAN = {};

const NL_INTRO = {};

const EN_INTRO = {};

const REAL_NL_VROUW = NL_VROUW;
const REAL_NL_MAN = NL_MAN;
const REAL_EN_VROUW = EN_VROUW;
const REAL_EN_MAN = EN_MAN;
const REAL_NL_INTRO = NL_INTRO;
const REAL_EN_INTRO = EN_INTRO;

declare global {
  interface Window {
    __nemTestScores?: {
      selfRejection: number;
      emotionalNumbing: number;
      falsePower: number;
      fear: number;
      falseHope: number;
    };
  }
}

const GENDER_TO_TABLE: Record<string, "man" | "vrouw"> = {
  man: "man",
  vrouw: "vrouw",
  male: "man",
  female: "vrouw",
};

const GENDER_TO_ENGINE: Record<string, "male" | "female"> = {
  man: "male",
  vrouw: "female",
  male: "male",
  female: "female",
};

const EVENTS = {
  TEST_COMPLETED: "nem_test_completed",
  REPORT_REQUESTED: "nem_report_requested",
};

function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("nemdebug") === "1";
}

function getLocale(): "nl" | "en" {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/en/")) return "en";
    if (document.documentElement.lang?.startsWith("en")) return "en";
  }
  return "nl";
}

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
  flatBridgeLine: string;
  contactUrl: string;
  contactLinkLabel: string;
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
  introLines: ConclusionTable;
}

type ConclusionTable = Record<string, string>;

function placeholderTable(marker: string, note: string): ConclusionTable {
  return Object.fromEntries(CONCLUSION_KEYS.map((key) => [key, `[${marker}] ${key} — ${note}`]));
}

const NL_CONCLUSIONS_MAN: ConclusionTable = {
  ...placeholderTable("DUMMY man", "tekst volgt."),
  ...REAL_NL_MAN,
};

const NL_CONCLUSIONS_VROUW: ConclusionTable = {
  ...placeholderTable("DUMMY vrouw", "tekst volgt."),
  ...REAL_NL_VROUW,
};

const EN_CONCLUSIONS_MAN: ConclusionTable = {
  ...placeholderTable("DUMMY man", "text to follow."),
  ...REAL_EN_MAN,
};

const EN_CONCLUSIONS_VROUW: ConclusionTable = {
  ...placeholderTable("DUMMY vrouw", "text to follow."),
  ...REAL_EN_VROUW,
};

function introPlaceholderTable(marker: string, note: string): ConclusionTable {
  return Object.fromEntries(INTRO_LINE_KEYS.map((key) => [key, `[${marker}] ${key} — ${note}`]));
}

const NL_INTRO_LINES: ConclusionTable = {
  ...introPlaceholderTable("DUMMY intro", "regel volgt."),
  ...REAL_NL_INTRO,
};

const EN_INTRO_LINES: ConclusionTable = {
  ...introPlaceholderTable("DUMMY intro", "line to follow."),
  ...REAL_EN_INTRO,
};

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
    flatBridgeLine:
      "Een persoonlijk rapport past hier niet — dat wordt opgebouwd rond één duidelijke reactie. Een gesprek past wel.",
    contactUrl: "/contact",
    contactLinkLabel: "Neem contact met ons op",
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
      man: NL_CONCLUSIONS_MAN,
      vrouw: NL_CONCLUSIONS_VROUW,
    },
    introLines: NL_INTRO_LINES,
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
    flatBridgeLine:
      "A personal report does not fit here — it is built around one clear response. A conversation does.",
    contactUrl: "/en/contact",
    contactLinkLabel: "Get in touch",
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
    introLines: EN_INTRO_LINES,
  },
};

const fontLink = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Lato:wght@400;700&display=swap');`;

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

function Quiz({
  submitWebhookUrl,
  reassuranceText,
  ctaButtonText,
  contactUrl,
  contactLinkLabel,
  question1, question2, question3, question4, question5,
  question6, question7, question8, question9, question10,
  question11, question12, question13, question14, question15,
  question16, question17, question18, question19, question20,
}: {
  submitWebhookUrl: string;
  reassuranceText: string;
  ctaButtonText: string;
  contactUrl: string;
  contactLinkLabel: string;
  question1: string; question2: string; question3: string; question4: string; question5: string;
  question6: string; question7: string; question8: string; question9: string; question10: string;
  question11: string; question12: string; question13: string; question14: string; question15: string;
  question16: string; question17: string; question18: string; question19: string; question20: string;
}) {
  const { interactive } = useWebflowContext();
  const locale = getLocale();
  const t = translations[locale];

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

  const reassurance = locale === "nl" ? (reassuranceText || t.reassurance) : t.reassurance;
  const ctaLabel = (locale === "nl" ? ctaButtonText : "") || t.submitButtonText;

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const [phase, setPhase] = useState<"quiz" | "profile" | "conclusion" | "optin" | "confirmation">(
    !interactive ? "conclusion" : "quiz"
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(20).fill(null));
  const [animating, setAnimating] = useState(false);
  const transitionLock = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
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
  const [debugMode] = useState(isDebugMode);

  const sendCompletionBeacon = useCallback(
    (finalAnswers: (number | null)[]) => {
      if (!submitWebhookUrl) return;
      const scored = calculateScores(finalAnswers, "male");
      try {
        fetch(submitWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            token,
            locale,
            event: "completion",
            outcome: scored.outcome,
            conclusionKey: scored.conclusionKey,
            scores: scored.scores,
            totalScore: scored.totalScore,
          }),
        }).catch(() => {});
      } catch {
      }
    },
    [submitWebhookUrl, token, locale]
  );

  const selectAnswer = useCallback(
    (answerIndex: number) => {
      if (transitionLock.current) return;
      transitionLock.current = true;
      setIsTransitioning(true);

      const updatedAnswers = answers.map((a, i) => (i === currentStep ? answerIndex : a));
      setAnswers(updatedAnswers);

      const fadeDelay = prefersReducedMotion ? 0 : 200;
      const fadeDuration = prefersReducedMotion ? 0 : 300;

      timers.current.push(
        setTimeout(() => {
          setAnimating(true);
          timers.current.push(
            setTimeout(() => {
              if (currentStep < 19) {
                setCurrentStep((s) => s + 1);
              } else {
                sendCompletionBeacon(updatedAnswers);
                setPhase("profile");
              }
              setAnimating(false);
              transitionLock.current = false;
              setIsTransitioning(false);
            }, fadeDuration)
          );
        }, fadeDelay)
      );
    },
    [answers, currentStep, prefersReducedMotion, sendCompletionBeacon]
  );

  const goBack = useCallback(() => {
    if (transitionLock.current) return;
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);

  const result = useMemo(
    () => calculateScores(answers, GENDER_TO_ENGINE[gender] || "male"),
    [answers, gender]
  );

  const introLine = useMemo(
    () => (result.skipsReport ? "" : t.introLines[result.conclusionKey] || ""),
    [result.skipsReport, result.conclusionKey, t.introLines]
  );

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

    if (honeypot) {
      setPhase("confirmation");
      return;
    }

    setSubmitting(true);

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
        selfRejection: result.scores.selfRejection,
        emotionalNumbing: result.scores.emotionalNumbing,
        falsePower: result.scores.falsePower,
        fear: result.scores.fear,
        falseHope: result.scores.falseHope,
      },
      primaryMechanism: result.primary,
      secondaryMechanism: result.secondary,
      outcome: result.outcome,
      conclusionKey: result.conclusionKey,
      conclusionId: result.conclusionId,
      introLine,
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
  }, [firstName, email, nemMattersConsent, honeypot, result, introLine, token, locale, submitWebhookUrl, t.errors, relationshipStatus, gender, ageCategory]);

  const goBackToOptin = useCallback(() => {
    setEmail("");
    setToken(crypto.randomUUID());
    setNemMattersConsent(false);
    setFieldErrors({});
    setSubmitting(false);
    setPhase("optin");
  }, []);

  const genderKey = GENDER_TO_TABLE[gender] || "man";
  const conclusionText =
    t.conclusions[genderKey as keyof GenderedConclusions]?.[result.conclusionKey] || "";

  const isFlatOutcome = result.skipsReport;

  const contactHref = (locale === "nl" ? contactUrl : "") || t.contactUrl;
  const contactLabel = (locale === "nl" ? contactLinkLabel : "") || t.contactLinkLabel;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__nemTestScores = {
      selfRejection: result.scores.selfRejection,
      emotionalNumbing: result.scores.emotionalNumbing,
      falsePower: result.scores.falsePower,
      fear: result.scores.fear,
      falseHope: result.scores.falseHope,
    };
  }, [result]);

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

      {phase === "quiz" && (
        <div
          key={currentStep}
          className={animating ? "quiz-fade-out" : "quiz-fade-in"}
        >
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
                disabled={isTransitioning}
                aria-label={t.back}
                style={{
                  fontSize: "var(--_typography---paragraph--small, 0.875rem)",
                  fontWeight: 500,
                  color: "var(--_token---text-olive, #706d56)",
                  background: "none",
                  border: "none",
                  cursor: isTransitioning ? "default" : "pointer",
                  opacity: 1,
                  textDecoration: "none",
                }}
              >
                ←
              </button>
            )}
          </div>

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

          <div className="nem-answers">
            {t.answers.map((label, i) => {
              const isSelected = answers[currentStep] === i;
              return (
                <button
                  key={i}
                  aria-selected={isSelected}
                  onClick={() => selectAnswer(i)}
                  disabled={isTransitioning}
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
                    cursor: isTransitioning ? "default" : "pointer",
                    opacity: 1,
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "var(--_typography---paragraph--standard, 1rem)",
                    transition: prefersReducedMotion ? "none" : "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isTransitioning) {
                      e.currentTarget.style.borderColor = "var(--_token---accent-main, #fafa7d)";
                      e.currentTarget.style.backgroundColor =
                        "color-mix(in srgb, var(--_token---accent-main, #fafa7d) 20%, white)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isTransitioning) {
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

      {phase === "conclusion" && (
        <div className="quiz-slide-up flex flex-col gap-6">
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

          {debugMode && (
            <code
              data-element="conclusion-debug"
              aria-hidden="true"
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.5,
                padding: "0.5rem 0.75rem",
                background: "#f4f3ef",
                border: "1px solid #d8d5c8",
                borderRadius: 4,
                color: "#292828",
                wordBreak: "break-word",
              }}
            >
              {result.conclusionId} · {result.conclusionKey} ·{" "}
              {["selfRejection", "emotionalNumbing", "falsePower", "fear", "falseHope"]
                .map((m) => `${m} ${result.scores[m as keyof typeof result.scores]}`)
                .join(" ")}{" "}
              · {result.outcome}
              {introLine && (
                <>
                  <br />
                  intro: {introLine}
                </>
              )}
            </code>
          )}

          <div
            data-element="conclusion-text"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--_gaps---content-quarter, 0.75rem)",
            }}
          >
            {conclusionText.split(/\n{2,}/).map((paragraph, i) => (
              <p
                key={i}
                style={{
                  fontSize: "var(--_typography---paragraph--standard, 1rem)",
                  lineHeight: 1.6,
                  color: "var(--_token---text-main, #292828)",
                  margin: 0,
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>

          <p
            style={{
              fontSize: "var(--_typography---paragraph--standard, 1rem)",
              lineHeight: 1.6,
              color: "var(--_token---text-main, #292828)",
              fontWeight: 500,
              margin: 0,
            }}
          >
            {isFlatOutcome ? t.flatBridgeLine : t.bridgeLine}
          </p>

          {isFlatOutcome ? (
            <a
              data-element="conclusion-contact-link"
              href={contactHref}
              style={{
                ...pillButtonStyle,
                display: "inline-block",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              {contactLabel}
            </a>
          ) : (
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
          )}
        </div>
      )}

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

          {fieldErrors.generic && (
            <div aria-live="polite" style={{ color: "#e53e3e", fontSize: "0.875rem" }}>
              {fieldErrors.generic}
            </div>
          )}

          <div className="flex flex-col gap-4">
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

            <p style={{ fontSize: "0.875rem", color: "var(--_token---text-olive, #706d56)", textAlign: "center", margin: 0 }}>
              {t.relieveLine}
            </p>

          </div>
        </div>
      )}

      {phase === "confirmation" && (
        <div className="quiz-scale-in flex flex-col gap-5" style={{ paddingTop: 16, paddingBottom: 16 }}>
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
    submitWebhookUrl: propTypes.Text({
      name: "Submit Webhook URL",
      defaultValue: "https://reus.app.n8n.cloud/webhook/nem-submit",
    }),
    reassuranceText: propTypes.Text({
      name: "Reassurance Text",
      defaultValue:
        "Kies wat het meest op jou lijkt - er is geen goed of fout antwoord.",
    }),
    ctaButtonText: propTypes.Text({
      name: "CTA Button Text",
      defaultValue: "Ontvang mijn rapport",
    }),
    contactUrl: propTypes.Text({
      name: "Contact URL (flat outcomes)",
      defaultValue: "/contact",
    }),
    contactLinkLabel: propTypes.Text({
      name: "Contact Link Label (flat outcomes)",
      defaultValue: "Neem contact met ons op",
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
