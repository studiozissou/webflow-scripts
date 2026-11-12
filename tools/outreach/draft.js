// Writes one approach email per qualifying row with the Anthropic Messages API, checks it against the inputs, retries once, and reports the cost.
import { readFile } from 'node:fs/promises';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { guessLanguage } from './text.js';

const DEBUG = process.env.DEBUG_OUTREACH === '1';

export const MODEL = 'claude-sonnet-5-5';
export const PRICE_PER_MTOK = { input: 2, output: 10 };
export const MAX_WORDS = 150;

const KNOWN_NAMES = ['I', 'Will', 'Studio', 'Zissou', 'Google', 'Maps', 'Den', 'Haag', 'The', 'Hague', 'Instagram', 'Facebook', 'Hi', 'Hoi', 'Hallo', 'Beste', 'Dear'];
const OPT_OUT = /(unsubscribe|opt[ -]?out|not interested|rather not hear|reply ['"]?stop|geen interesse|afmelden|liever niet|niet meer (?:mailen|benaderen|horen)|mail ik niet meer|antwoord ['"]?stop|no thanks|nee,? bedankt|follow(?:ing)? up|opvolgen|niets meer(?: van mij)?)/i;
const VISIT_CLAIM = /love coming|ik kom (?:graag|vaak)|\be[ae]t(?:en)? (?:at|bij)\b|\bI (?:ate|visited)\b|(?:I've|I have) (?:visited|been (?:to|in))|stopped by|\bI(?:'m| am) a regular\b|ik heb (?:er|bij jullie|hier) gegeten|ik heb (?:jullie|de zaak) bezocht|\bgeweest\b|ik at\b|loop vaak langs|my favou?rite|vaste klant|regular customer/i;
const DEMONYM = /^(?:Haag\p{L}*|Hagenaar\p{L}*|Hagenees\p{L}*|\p{Lu}\p{L}*se)$/u;

export async function loadPrompt(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    throw new Error(`Outreach prompt not found at ${path}`);
  }
}

export async function getApiKey({ env = process.env, execFile = promisify(execFileCb) } = {}) {
  if (env.ANTHROPIC_API_KEY) return env.ANTHROPIC_API_KEY;
  try {
    const { stdout } = await execFile('security', ['find-generic-password', '-s', 'mcp', '-a', 'anthropic-api-key', '-w']);
    const key = String(stdout).trim();
    if (key) return key;
  } catch {
    DEBUG && console.log('draft: Keychain lookup failed');
  }
  throw new Error('No Anthropic API key: set ANTHROPIC_API_KEY or add Keychain item mcp/anthropic-api-key');
}

export async function createClient({ Anthropic, ...options } = {}) {
  const Client = Anthropic ?? (await import('@anthropic-ai/sdk')).default;
  return new Client({ apiKey: await getApiKey(options), timeout: 60_000, maxRetries: 1 });
}

export function pickLanguage(language, text = '') {
  if (language) return String(language).toLowerCase().startsWith('en') ? 'en' : 'nl';
  return guessLanguage(text) ?? 'nl';
}

export function costUsd(usage = {}) {
  return ((usage.input_tokens ?? 0) * PRICE_PER_MTOK.input + (usage.output_tokens ?? 0) * PRICE_PER_MTOK.output) / 1_000_000;
}

export function buildUserMessage({ row, facts = [], issues = [], language, register = null, opener, ownerName = null, potential = null, offer = null }) {
  const lang = pickLanguage(language);
  const lines = [
    `business: ${row.name}`,
    `domain: ${row.domain ?? ''}`,
    `type: ${row.type ?? ''}`,
    `opener: ${opener}`,
    `language: ${lang}`,
  ];
  if (lang === 'nl') lines.push(`register: ${register === 'u' ? 'u' : 'je'}`);
  if (ownerName) lines.push(`owner: ${ownerName}`);
  lines.push(facts.length ? 'facts:' : 'facts: none (use the generic opener)');
  for (const f of facts) lines.push(`- ${f.kind}: ${f.value} (source: ${f.source})`);
  lines.push('issues:');
  for (const i of issues.slice(0, 2)) lines.push(`- ${i.plain ?? i.id}`);
  lines.push(`potential: ${potential ?? 'none'}`);
  lines.push(`offer: ${offer ?? 'none'}`);
  return lines.join('\n');
}

export function parseDraft(text = '') {
  const match = text.match(/^[ \t]*(?:subject|onderwerp)[ \t]*:[ \t]*(.*)$/im);
  if (!match) return { subject: '', body: text.trim() };
  return { subject: match[1].trim(), body: text.slice(match.index + match[0].length).trim() };
}

const numbersIn = (text) => new Set((text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(',', '.')));

function namesIn(text) {
  const names = new Set();
  for (const m of text.matchAll(/\p{Lu}[\p{L}'&-]*/gu)) {
    const before = text.slice(0, m.index);
    if (/(^|[.!?]["')]?\s+|\n\s*)$/u.test(before)) continue;
    for (const part of m[0].replace(/['’]s$/, '').split('-')) {
      const name = part.replace(/['&]+$/, '');
      if (name && /^\p{Lu}/u.test(name) && !DEMONYM.test(name)) names.add(name);
    }
  }
  return names;
}

export function checkDraft(draft, inputs) {
  const source = typeof inputs === 'string' ? inputs : `${JSON.stringify(inputs)}\n${buildUserMessage(inputs)}`;
  const sourceLower = source.toLowerCase();
  const subject = draft?.subject?.trim() ?? '';
  const body = draft?.body?.trim() ?? '';
  const text = `${subject}\n${body}`;
  const reasons = [];
  if (!subject) reasons.push('Missing subject line');
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > MAX_WORDS) reasons.push(`Body is ${words} words; keep it to ${MAX_WORDS} words or fewer`);
  if (text.includes('—')) reasons.push('Contains an em dash; use a comma or full stop instead');
  if (!OPT_OUT.test(body)) reasons.push('Missing a one-line opt-out');
  if (typeof inputs === 'object' && inputs.opener === 'lookalike' && VISIT_CLAIM.test(text)) reasons.push('lookalike-claims-visit');
  const want = typeof inputs === 'object' ? pickLanguage(inputs.language) : null;
  const got = guessLanguage(body);
  if (want && got && got !== want) reasons.push(`Body language looks like ${got}; write it in ${want}`);
  const allowedNumbers = numbersIn(source);
  for (const n of numbersIn(text)) {
    if (!allowedNumbers.has(n)) reasons.push(`Number ${n} is not in the inputs`);
  }
  const known = new Set(KNOWN_NAMES.map((n) => n.toLowerCase()));
  for (const name of namesIn(text)) {
    if (!known.has(name.toLowerCase()) && !sourceLower.includes(name.toLowerCase())) reasons.push(`Name "${name}" is not in the inputs`);
  }
  return { ok: reasons.length === 0, reasons };
}

const textOf = (response) => (response?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

export async function draftEmail({ prompt, client, model = MODEL, maxTokens = 4000, onCost = () => {}, ...inputs }) {
  const opener = inputs.opener;
  const user = buildUserMessage(inputs);
  let messages = [{ role: 'user', content: user }];
  let cost = 0;
  let parsed = { subject: '', body: '' };
  let check = { ok: false, reasons: [] };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await client.messages.create({ model, max_tokens: maxTokens, output_config: { effort: 'low' }, system: prompt, messages });
    const attemptCost = costUsd(response.usage);
    cost += attemptCost;
    onCost(attemptCost);
    const text = textOf(response);
    parsed = parseDraft(text);
    check = checkDraft(parsed, inputs);
    DEBUG && console.log(`draft: attempt ${attempt + 1} ${check.ok ? 'passed' : check.reasons.join('; ')}`);
    if (check.ok) break;
    messages = [
      ...messages,
      { role: 'assistant', content: text },
      { role: 'user', content: `The draft failed these checks:\n- ${check.reasons.join('\n- ')}\nRewrite it to fix them. Keep the same format: a "Subject:" line, a blank line, then the body.` },
    ];
  }
  const generic = !(inputs.facts?.length);
  const draft = !check.ok ? 'needs-edit' : generic ? 'generic' : 'ok';
  return { subject: parsed.subject, body: parsed.body, draft, opener, costUsd: cost, reasons: check.reasons };
}
