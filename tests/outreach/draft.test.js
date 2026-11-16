// Covers the prompt loader, API key lookup, user message, output checker, retry-once flow, needs-edit fallback and per-draft cost, with the Anthropic client stubbed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadPrompt, getApiKey, buildUserMessage, checkDraft, parseDraft, pickLanguage, costUsd, draftEmail, createClient, MODEL } from '../../tools/outreach/draft.js';

const PROMPT_PATH = fileURLToPath(new URL('./fixtures/prompt.sample.md', import.meta.url));

const ROW = { name: 'Bakkerij Verzonnen', domain: 'bakkerij-verzonnen.test', source: 'seed' };
const FACTS = [
  { kind: 'love', value: 'the Saturday sourdough class', source: 'seeds.json' },
  { kind: 'founded', value: '1987', source: 'https://bakkerij-verzonnen.test/over-ons' },
];
const ISSUES = [
  { id: 'no-https', plain: 'your site has no padlock in the browser', evidence: { url: 'http://bakkerij-verzonnen.test/', value: 'http', check: 'https' } },
  { id: 'gbp-rank', plain: 'you are 9th on Google Maps for "bakkerij den haag"', evidence: { url: 'https://maps.test/', value: 9, check: 'rank' } },
  { id: 'third', plain: 'a third issue that is left out', evidence: { url: 'x', value: 'y', check: 'z' } },
];
const POTENTIAL = 'Bakker Denkbeeld is 2nd for "bakkerij den haag"';
const OFFER = 'a free 15-minute look';

const inputs = () => ({ row: ROW, facts: FACTS, issues: ISSUES, language: 'en', opener: 'seed', ownerName: null, potential: POTENTIAL, offer: OFFER });

const GOOD = {
  subject: 'Your bakery on Google Maps',
  body: `Hi Bakkerij Verzonnen team,

I love coming to Bakkerij Verzonnen for the Saturday sourdough class. I noticed your site has no padlock in the browser, and you are 9th on Google Maps for "bakkerij den haag" while Bakker Denkbeeld is 2nd. Happy to give you a free 15-minute look, no strings.

Will, Studio Zissou

Not interested? Reply "stop" and I won't email again.`,
};
const asText = (d) => `Subject: ${d.subject}\n\n${d.body}`;

function stubClient(texts, usage = { input_tokens: 1000, output_tokens: 200 }) {
  const calls = [];
  return {
    calls,
    messages: {
      create: async (args) => {
        calls.push(args);
        const text = texts[Math.min(calls.length - 1, texts.length - 1)];
        return { content: [{ type: 'text', text }], usage };
      },
    },
  };
}

test('loadPrompt reads the prompt file and fails clearly when it is missing', async () => {
  assert.match(await loadPrompt(PROMPT_PATH), /approach emails/);
  await assert.rejects(loadPrompt('/nonexistent/prompt.md'), /prompt not found/i);
});

test('getApiKey prefers the env var and does not call the Keychain', async () => {
  let called = false;
  const key = await getApiKey({ env: { ANTHROPIC_API_KEY: 'sk-env' }, execFile: async () => { called = true; } });
  assert.equal(key, 'sk-env');
  assert.equal(called, false);
});

test('getApiKey falls back to the Keychain item mcp/anthropic-api-key', async () => {
  let seen;
  const key = await getApiKey({ env: {}, execFile: async (cmd, args) => { seen = [cmd, ...args]; return { stdout: 'sk-chain\n' }; } });
  assert.equal(key, 'sk-chain');
  assert.deepEqual(seen, ['security', 'find-generic-password', '-s', 'mcp', '-a', 'anthropic-api-key', '-w']);
});

test('getApiKey error never contains the key', async () => {
  await assert.rejects(getApiKey({ env: {}, execFile: async () => { throw new Error('boom'); } }), (err) => /anthropic api key/i.test(err.message));
});

test('pickLanguage maps the site language to nl or en, defaulting to nl', () => {
  assert.equal(pickLanguage('en'), 'en');
  assert.equal(pickLanguage('en-GB'), 'en');
  assert.equal(pickLanguage('nl'), 'nl');
  assert.equal(pickLanguage(null), 'nl');
  assert.equal(pickLanguage('de'), 'nl');
});

test('pickLanguage guesses from page text stop words when there is no lang attribute', () => {
  assert.equal(pickLanguage(null, 'Welcome to the shop and the cafe, open for lunch and dinner.'), 'en');
  assert.equal(pickLanguage(null, 'Welkom in de winkel en het café, open voor een lunch.'), 'nl');
  assert.equal(pickLanguage('nl', 'Welcome to the shop and the cafe.'), 'nl');
  assert.equal(pickLanguage(null, ''), 'nl');
});

test('buildUserMessage adds register for Dutch and owner only when known', () => {
  const nl = buildUserMessage({ ...inputs(), language: 'nl', register: 'u', ownerName: 'Marloes' });
  assert.match(nl, /^register: u$/m);
  assert.match(nl, /^owner: Marloes$/m);
  const noOwner = buildUserMessage({ ...inputs(), language: 'nl' });
  assert.match(noOwner, /^register: je$/m);
  assert.doesNotMatch(noOwner, /^owner/m);
  assert.doesNotMatch(buildUserMessage(inputs()), /^register/m);
});

test('buildUserMessage passes potential none when there is no potential line', () => {
  assert.match(buildUserMessage({ ...inputs(), potential: null }), /^potential: none$/m);
});

test('buildUserMessage carries name, opener, language, facts, top 2 issues, potential and offer', () => {
  const msg = buildUserMessage(inputs());
  for (const part of ['Bakkerij Verzonnen', 'opener: seed', 'language: en', 'the Saturday sourdough class', '1987', 'no padlock', '9th on Google Maps', POTENTIAL, OFFER]) {
    assert.ok(msg.includes(part), `missing ${part}`);
  }
  assert.equal(msg.includes('third issue'), false);
});

test('buildUserMessage marks a generic draft when there are no facts', () => {
  assert.match(buildUserMessage({ ...inputs(), facts: [] }), /facts: none/);
});

test('parseDraft splits subject and body, in English or Dutch', () => {
  assert.deepEqual(parseDraft(asText(GOOD)), GOOD);
  assert.equal(parseDraft('Onderwerp: Hallo\n\nTekst').subject, 'Hallo');
  assert.equal(parseDraft('No subject here').subject, '');
});

test('checkDraft passes a clean draft', () => {
  assert.deepEqual(checkDraft(GOOD, inputs()), { ok: true, reasons: [] });
});

test('checkDraft name check allows possessives, hyphen compounds and Den Haag demonyms', () => {
  const names = (text) => checkDraft({ subject: 'Hi', body: text }, inputs()).reasons.filter((r) => r.startsWith('Name'));
  assert.deepEqual(names("I had a look at Bakkerij Verzonnen's site. A quick no thanks is fine."), []);
  assert.deepEqual(names('Your Google-profiel and Instagram-pagina look good. A quick no thanks is fine.'), []);
  assert.deepEqual(names('Lots of Haagse and Scheveningse people, and Hagenaars and Nederlandse visitors. A quick no thanks is fine.'), []);
  assert.deepEqual(names('Your neighbour Bakkerij Echt is ahead. A quick no thanks is fine.'), ['Name "Echt" is not in the inputs']);
});

test('lookalike visit check catches more first-person visits but not quoted reviews', () => {
  const visit = (body) => checkDraft({ subject: 'Hi', body: `${body} A quick no thanks is fine.` }, { ...inputs(), opener: 'lookalike' }).reasons.includes('lookalike-claims-visit');
  assert.equal(visit('I stopped by last week.'), true);
  assert.equal(visit("I've been to Bakkerij Verzonnen."), true);
  assert.equal(visit('Ik ben bij jullie geweest.'), true);
  assert.equal(visit('A reviewer wrote: heerlijk gegeten.'), false);
  assert.equal(visit('Ik kwam jullie tegen op Google Maps.'), false);
});

test('checkDraft rejects a missing subject', () => {
  const r = checkDraft({ ...GOOD, subject: '' }, inputs());
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /subject/i.test(x)));
});

test('checkDraft rejects a body over 150 words', () => {
  const long = { ...GOOD, body: `${GOOD.body} ${'word '.repeat(120)}` };
  assert.ok(checkDraft(long, inputs()).reasons.some((x) => /150 words/.test(x)));
});

test('checkDraft rejects an em dash', () => {
  const r = checkDraft({ ...GOOD, body: GOOD.body.replace('no strings', 'no strings — really') }, inputs());
  assert.ok(r.reasons.some((x) => /em dash/i.test(x)));
});

test('checkDraft rejects a missing opt-out line, in English and Dutch', () => {
  const body = GOOD.body.replace(/Not interested\?.*$/, '');
  assert.ok(checkDraft({ ...GOOD, body }, inputs()).reasons.some((x) => /opt-out/i.test(x)));
  assert.equal(checkDraft({ ...GOOD, body: `${body}Geen interesse? Laat het weten, dan mail ik niet meer.` }, inputs()).ok, true);
});

test('checkDraft accepts the new opt-out phrasings', () => {
  const body = GOOD.body.replace(/Not interested\?.*$/, '');
  for (const line of ['No thanks? Just say so.', 'Nee, bedankt? Laat het weten.', 'Nee bedankt is ook prima.', 'If you would rather I did not follow up, say so.', 'Liever geen opvolgen? Zeg het gerust.', 'Dan hoor je niets meer van mij.']) {
    assert.equal(checkDraft({ ...GOOD, body: `${body}${line}` }, inputs()).reasons.some((x) => /opt-out/i.test(x)), false, line);
  }
});

test('checkDraft rejects a lookalike draft that claims a visit', () => {
  const look = { ...inputs(), opener: 'lookalike' };
  for (const claim of ['I love coming to Bakkerij Verzonnen.', 'I often eat at Bakkerij Verzonnen.', 'I have visited the shop.', 'It is my favourite bakery.', 'I am a regular there.']) {
    const r = checkDraft({ ...GOOD, body: GOOD.body.replace('I love coming to Bakkerij Verzonnen for the Saturday sourdough class.', claim) }, look);
    assert.ok(r.reasons.includes('lookalike-claims-visit'), claim);
  }
  const nl = { subject: 'Hoi', body: 'Hoi team, ik kom graag bij jullie langs. Ik heb er gegeten. Geen interesse? Laat het weten.' };
  assert.ok(checkDraft(nl, { ...look, language: 'nl' }).reasons.includes('lookalike-claims-visit'));
  assert.equal(checkDraft(GOOD, inputs()).reasons.includes('lookalike-claims-visit'), false);
});

test('checkDraft rejects a body in the wrong language', () => {
  const r = checkDraft(GOOD, { ...inputs(), language: 'nl' });
  assert.ok(r.reasons.some((x) => /language/i.test(x)));
  const dutch = { subject: 'Een idee', body: 'Hoi team, ik zag dat de site geen slotje heeft en dat het menu een PDF is. Geen interesse? Laat het weten.' };
  assert.equal(checkDraft(dutch, { ...inputs(), language: 'nl' }).reasons.some((x) => /language/i.test(x)), false);
  assert.ok(checkDraft(dutch, inputs()).reasons.some((x) => /language/i.test(x)));
});

test('checkDraft rejects a number, rank or year not in the inputs', () => {
  assert.ok(checkDraft({ ...GOOD, body: GOOD.body.replace('9th', '7th') }, inputs()).reasons.some((x) => /7/.test(x)));
  assert.ok(checkDraft({ ...GOOD, body: GOOD.body.replace('class.', 'class, a favourite since 1992.') }, inputs()).reasons.some((x) => /1992/.test(x)));
  assert.equal(checkDraft({ ...GOOD, body: GOOD.body.replace('class.', 'class, going since 1987.') }, inputs()).ok, true);
});

test('checkDraft rejects a competitor name not in the inputs', () => {
  const r = checkDraft({ ...GOOD, body: GOOD.body.replace('Bakker Denkbeeld', 'Broodhuis Fantasie') }, inputs());
  assert.ok(r.reasons.some((x) => /Broodhuis/.test(x)));
});

test('draftEmail returns ok, the opener and the cost on a first-time pass', async () => {
  const client = stubClient([asText(GOOD)]);
  const prompt = await loadPrompt(PROMPT_PATH);
  const r = await draftEmail({ ...inputs(), prompt, client });
  assert.equal(r.draft, 'ok');
  assert.equal(r.opener, 'seed');
  assert.equal(r.subject, GOOD.subject);
  assert.equal(r.body, GOOD.body);
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].model, MODEL);
  assert.equal(MODEL, 'claude-sonnet-5-5');
  assert.equal(client.calls[0].system, prompt);
  assert.equal(r.costUsd, costUsd({ input_tokens: 1000, output_tokens: 200 }));
  assert.ok(r.costUsd > 0);
});

test('draftEmail retries once with the checker reasons, then passes', async () => {
  const bad = asText({ ...GOOD, body: GOOD.body.replace('no strings', 'no strings — really') });
  const client = stubClient([bad, asText(GOOD)]);
  const r = await draftEmail({ ...inputs(), prompt: 'p', client });
  assert.equal(r.draft, 'ok');
  assert.equal(client.calls.length, 2);
  const retry = client.calls[1].messages;
  assert.equal(retry.at(-2).role, 'assistant');
  assert.match(retry.at(-1).content, /em dash/i);
  assert.equal(r.costUsd, 2 * costUsd({ input_tokens: 1000, output_tokens: 200 }));
});

test('draftEmail marks needs-edit after a second failure and keeps the last text', async () => {
  const bad = asText({ ...GOOD, subject: '' });
  const client = stubClient([bad, bad]);
  const r = await draftEmail({ ...inputs(), prompt: 'p', client });
  assert.equal(r.draft, 'needs-edit');
  assert.equal(client.calls.length, 2);
  assert.ok(r.reasons.length > 0);
  assert.equal(r.body, GOOD.body);
});

test('draftEmail marks a passing draft with no facts as generic, and keeps a lookalike opener', async () => {
  const generic = { ...GOOD, body: GOOD.body.replace('I love coming to Bakkerij Verzonnen for the Saturday sourdough class. ', '') };
  const client = stubClient([asText(generic)]);
  const r = await draftEmail({ ...inputs(), facts: [], opener: 'lookalike', prompt: 'p', client });
  assert.equal(r.draft, 'generic');
  assert.equal(r.opener, 'lookalike');
});

test('draftEmail reports the cost of each attempt, so attempt 1 is charged even if attempt 2 throws', async () => {
  const bad = asText({ ...GOOD, subject: '' });
  let n = 0;
  const client = { messages: { create: async () => { n += 1; if (n === 2) throw new Error('overloaded'); return { content: [{ type: 'text', text: bad }], usage: { input_tokens: 1000, output_tokens: 200 } }; } } };
  const costs = [];
  await assert.rejects(draftEmail({ ...inputs(), prompt: 'p', client, onCost: (c) => costs.push(c) }), /overloaded/);
  assert.deepEqual(costs, [costUsd({ input_tokens: 1000, output_tokens: 200 })]);
});

test('createClient sets a 60 s timeout and 1 retry', async () => {
  let opts;
  class Fake { constructor(o) { opts = o; } }
  await createClient({ Anthropic: Fake, env: { ANTHROPIC_API_KEY: 'sk-test' } });
  assert.equal(opts.apiKey, 'sk-test');
  assert.equal(opts.timeout, 60_000);
  assert.equal(opts.maxRetries, 1);
});

test('Sonnet 5.5 pricing and request shape: $2/$10 per MTok, low effort, room for thinking', async () => {
  assert.equal(costUsd({ input_tokens: 1_000_000, output_tokens: 1_000_000 }), 12);
  const calls = [];
  const client = { messages: { create: async (args) => { calls.push(args); return { usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: 'Subject: Hoi\n\nKort.' }] }; } } };
  await draftEmail({ ...inputs(), prompt: 'p', client }).catch(() => {});
  assert.ok(calls.length >= 1);
  assert.ok(calls[0].max_tokens >= 4000);
  assert.deepEqual(calls[0].output_config, { effort: 'low' });
  assert.equal('temperature' in calls[0], false);
});
