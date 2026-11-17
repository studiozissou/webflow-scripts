// Checks drafted reply and post text for contact details, health outcome claims, client banned terms and wording that confirms a reviewer is a client.
import { hasContactDetails } from '../text-rules.js';

const word = (source) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'iu');

const POSSESSIVE = '(?:your|je|jouw|uw)\\s+(?:\\p{L}+\\s+)?';

export const HEALTH_TERMS = [
  word('cure[sd]?'),
  word('heal(?:s|ing|ed)?'),
  word('treat(?:ed|ing|ments?)'),
  word('treats?\\s+(?:you|your|them|pain|\\p{L}+ing)'),
  word('relie(?:f|ve[sd]?|ving)'),
  word('verlicht\\p{L}*'),
  word('helps?\\s+(?:with|against)'),
  word('helpt\\s+(?:bij|tegen)'),
  word('improv\\p{L}*'),
  word('verbeter\\p{L}*'),
  word('herstel\\p{L}*'),
  word('tension\\s+release'),
  word('diagnos(?:e|es|ed|is|ing)'),
  word('genezen|geneest|genezing|geneesd'),
  word('behandel(?:en|t|d|ing|ingen)?'),
  word('diagnosticeer\\p{L}*|diagnosticeren'),
  word('pain[\\s-]?free|pijnvrij'),
  word('(?:fix|fixes|repair|repairs)\\s+your'),
];

export const PRIVACY_TERMS = [
  word(
    `${POSSESSIVE}(?:sessions?|sessies?|treatments?|behandelingen|behandeling|therapy|therapie|appointments?|afspraak|recovery|herstel)`,
  ),
  word('cli[eë]nts?|cli[eë]nten'),
  word('pati[eë]nts?|pati[eë]nten'),
  word(
    `${POSSESSIVE}(?:back|shoulders?|neck|knees?|hips?|pain|posture|injury|rugpijn|rug|schouders?|nek|knie|heup|pijn|houding|blessure|klachten)`,
  ),
  word('(?:rug|nek|schouder|hoofd)pijn|back pain|neck pain'),
];

export const HEALTH_PRIVACY_TERMS = [
  word('your\\s+visit'),
  word('(?:je|jouw)\\s+bezoek'),
  word('thanks\\s+for\\s+coming'),
  word('bedankt\\s+voor\\s+(?:je|jouw)\\s+komst'),
  word('(?:je|jouw)\\s+klacht'),
  word('sessions?|sessies?'),
];

const normalise = (text) =>
  String(text ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function matches(text, patterns, label) {
  return patterns
    .map((pattern) => text.match(pattern))
    .filter(Boolean)
    .map((match) => `${label}: "${match[0]}"`);
}

const result = (problems) => ({ ok: problems.length === 0, problems });

export function claimLint(text, { sector, bannedTerms = [] } = {}) {
  const value = String(text ?? '');
  const problems =
    sector === 'health' ? matches(value, HEALTH_TERMS, 'health claim') : [];
  const plain = normalise(value);
  for (const term of bannedTerms) {
    const needle = normalise(term);
    if (needle && plain.includes(needle)) problems.push(`banned term: "${term}"`);
  }
  return result(problems);
}

export function privacyLint(text, { sector } = {}) {
  const terms = sector === 'health' ? [...PRIVACY_TERMS, ...HEALTH_PRIVACY_TERMS] : PRIVACY_TERMS;
  return result(matches(String(text ?? ''), terms, 'privacy'));
}

export function draftTextProblems(type, text, config) {
  if (typeof text !== 'string' || !text.trim()) return ['draft text is empty'];
  const { sector, bannedTerms } = config;
  const problems = [];
  if (hasContactDetails(text)) problems.push('has a phone number, email, social handle or link');
  if (type === 'reply') problems.push(...privacyLint(text, { sector }).problems);
  problems.push(...claimLint(text, { sector, bannedTerms }).problems);
  return problems;
}
