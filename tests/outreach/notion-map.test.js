// Covers mapping a prospect row to the Prospects DB properties, queryByDomain, upsertProspect (create, update, touch, status protection) and replaceBody, against a recording fake Notion client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toProperties, queryByDomain, upsertProspect, replaceBody } from '../../tools/outreach/notion-map.js';
import { fakeNotion } from './helpers.js';

const DB = 'db-prospects-0001';

const issue = (n) => ({ id: `rule-${n}`, text: `Plain issue ${n}`, evidence: { url: 'https://trattoria-fittizia.test/', value: `value-${n}`, check: `check-${n}` } });

const row = (over = {}) => ({
  name: 'Trattoria Fittizia',
  domain: 'https://www.trattoria-fittizia.test/',
  source: 'seed',
  verdict: 'management',
  issues: [issue(1), issue(2)],
  gbpScore: '7/10 (2 unknown)',
  ranks: [{ query: 'italiaans restaurant den haag', position: 5 }, { query: 'pizza den haag', position: '>20' }],
  language: 'nl',
  contact: 'ciao@trattoria-fittizia.test',
  emailSubject: 'Een idee voor Trattoria Fittizia',
  factsUsed: [{ fact: 'the tiramisu', source: 'https://trattoria-fittizia.test/menu' }],
  lastScanned: '2026-11-12T07:00:00.000Z',
  run: '2026-11-16',
  draft: 'Hoi team,\n\nIk kom graag bij jullie.',
  draftStatus: 'ok',
  ...over,
});

const page = (id, status, type = 'select') => ({
  id,
  properties: {
    Name: { type: 'title', title: [{ plain_text: 'Trattoria Fittizia' }] },
    Domain: { type: 'url', url: 'trattoria-fittizia.test' },
    Status: type === 'status' ? { type: 'status', status: { name: status } } : { type: 'select', select: { name: status } },
  },
});

const text = (prop) => (prop.rich_text ?? prop.title).map((t) => t.text.content).join('');

const SPEC_PROPS = ['Name', 'Domain', 'Facts used', 'Source', 'Verdict', 'Issues', 'GBP score', 'Map-pack ranks', 'Language', 'Contact', 'Email subject', 'Draft', 'Last scanned', 'Run'];

test('toProperties maps every Prospects DB field except Status', () => {
  const p = toProperties(row());
  assert.deepEqual(Object.keys(p).sort(), [...SPEC_PROPS].sort());
  assert.equal(text(p.Name), 'Trattoria Fittizia');
  assert.equal(p.Domain.url, 'trattoria-fittizia.test');
  assert.equal(p.Draft.select.name, 'ok');
  assert.equal(p.Source.select.name, 'seed');
  assert.equal(p.Verdict.select.name, 'management');
  assert.equal(p.Language.select.name, 'nl');
  assert.equal(text(p['GBP score']), '7/10 (2 unknown)');
  assert.equal(text(p.Contact), 'ciao@trattoria-fittizia.test');
  assert.equal(text(p['Email subject']), 'Een idee voor Trattoria Fittizia');
  assert.deepEqual(p['Last scanned'], { date: { start: '2026-11-12T07:00:00.000Z' } });
  assert.equal(text(p.Run), '2026-11-16');
});

test('Issues keep at most 3, each with its text and check id', () => {
  const p = toProperties(row({ issues: [issue(1), issue(2), issue(3), issue(4)] }));
  const value = text(p.Issues);
  for (const n of [1, 2, 3]) {
    assert.ok(value.includes(`Plain issue ${n}`), `issue ${n}`);
    assert.ok(value.includes(`check-${n}`), `check ${n}`);
  }
  assert.equal(value.includes('Plain issue 4'), false);
});

test('Map-pack ranks and Facts used are readable text with queries, positions and sources', () => {
  const p = toProperties(row());
  const ranks = text(p['Map-pack ranks']);
  assert.ok(ranks.includes('italiaans restaurant den haag') && ranks.includes('5'));
  assert.ok(ranks.includes('pizza den haag') && ranks.includes('>20'));
  const facts = text(p['Facts used']);
  assert.ok(facts.includes('the tiramisu') && facts.includes('https://trattoria-fittizia.test/menu'));
});

test('generic drafts are visible in Facts used', () => {
  const facts = text(toProperties(row({ factsUsed: [], draftKind: 'generic' }))['Facts used']);
  assert.ok(facts.includes('generic'));
});

test('rich text never exceeds the 2000-character Notion limit', () => {
  const p = toProperties(row({ issues: [{ ...issue(1), text: 'x'.repeat(5000) }] }));
  for (const t of p.Issues.rich_text) assert.ok(t.text.content.length <= 2000);
});

test('queryByDomain filters on the normalised Domain and returns id and status', async () => {
  const client = fakeNotion({ pages: [page('page-0001', 'Contacted')] });
  const found = await queryByDomain(client, DB, 'https://www.trattoria-fittizia.test/en');
  assert.deepEqual(found, { id: 'page-0001', status: 'Contacted' });
  const [call] = client.callsTo('databases.query');
  assert.equal(call.args.database_id, DB);
  assert.deepEqual(call.args.filter, { property: 'Domain', url: { equals: 'trattoria-fittizia.test' } });
});

test('queryByDomain reads a Notion status-type Status too, and returns null when absent', async () => {
  assert.deepEqual(await queryByDomain(fakeNotion({ pages: [page('page-0002', 'New', 'status')] }), DB, 'trattoria-fittizia.test'), { id: 'page-0002', status: 'New' });
  assert.equal(await queryByDomain(fakeNotion(), DB, 'trattoria-fittizia.test'), null);
});

test('upsertProspect creates a new row with Status New and the draft as body', async () => {
  const client = fakeNotion();
  const result = await upsertProspect(client, DB, row());
  assert.deepEqual(result, { action: 'created', pageId: 'page-new-0001' });
  const [call] = client.callsTo('pages.create');
  assert.deepEqual(call.args.parent, { database_id: DB });
  assert.deepEqual(call.args.properties.Status, { status: { name: 'New' } });
  assert.equal(call.args.properties.Domain.url, 'trattoria-fittizia.test');
  const body = call.args.children.map((b) => b.paragraph.rich_text.map((t) => t.text.content).join('')).join('\n\n');
  assert.equal(body, 'Hoi team,\n\nIk kom graag bij jullie.');
});

test('upsertProspect creates a row with no body when there is no draft', async () => {
  const client = fakeNotion();
  await upsertProspect(client, DB, row({ draft: null, verdict: 'neither' }));
  const [call] = client.callsTo('pages.create');
  assert.deepEqual(call.args.children ?? [], []);
});

test('upsertProspect updates a New row without touching Status, and replaces its body', async () => {
  const client = fakeNotion({ pages: [page('page-0001', 'New')], children: { 'page-0001': [[{ id: 'old-block-1' }]] } });
  const result = await upsertProspect(client, DB, row());
  assert.deepEqual(result, { action: 'updated', pageId: 'page-0001' });
  const [update] = client.callsTo('pages.update');
  assert.equal(update.args.page_id, 'page-0001');
  assert.equal('Status' in update.args.properties, false);
  assert.equal(update.args.properties.Verdict.select.name, 'management');
  assert.deepEqual(client.callsTo('blocks.delete').map((c) => c.args.block_id), ['old-block-1']);
  assert.equal(client.callsTo('blocks.children.append').length, 1);
  assert.equal(client.callsTo('pages.create').length, 0);
});

for (const status of ['Contacted', 'Replied', 'Won', 'Lost', 'Do not contact']) {
  test(`upsertProspect never overwrites a ${status} row: only Run changes, no body change`, async () => {
    const client = fakeNotion({ pages: [page('page-0009', status)], children: { 'page-0009': [[{ id: 'kept-block' }]] } });
    const result = await upsertProspect(client, DB, row({ verdict: 'neither', draft: 'Nieuwe tekst' }));
    assert.deepEqual(result, { action: 'protected', pageId: 'page-0009' });
    const updates = client.callsTo('pages.update');
    assert.equal(updates.length, 1);
    assert.deepEqual(Object.keys(updates[0].args.properties), ['Run']);
    assert.equal(text(updates[0].args.properties.Run), '2026-11-16');
    assert.equal(client.callsTo('blocks.delete').length, 0);
    assert.equal(client.callsTo('blocks.children.append').length, 0);
  });
}

test('upsertProspect with touchOnly updates only Run on a New row', async () => {
  const client = fakeNotion({ pages: [page('page-0001', 'New')] });
  const result = await upsertProspect(client, DB, row(), { touchOnly: true });
  assert.deepEqual(result, { action: 'touched', pageId: 'page-0001' });
  const [update] = client.callsTo('pages.update');
  assert.deepEqual(Object.keys(update.args.properties), ['Run']);
  assert.equal(client.callsTo('blocks.children.append').length, 0);
});

test('replaceBody deletes every existing child across pages, then appends the new paragraphs', async () => {
  const client = fakeNotion({ children: { 'page-0001': [[{ id: 'b1' }, { id: 'b2' }], [{ id: 'b3' }]] } });
  await replaceBody(client, 'page-0001', 'Eerste alinea.\n\nTweede alinea.');
  assert.deepEqual(client.callsTo('blocks.delete').map((c) => c.args.block_id), ['b1', 'b2', 'b3']);
  const [append] = client.callsTo('blocks.children.append');
  assert.equal(append.args.block_id, 'page-0001');
  assert.deepEqual(append.args.children.map((b) => b.type), ['paragraph', 'paragraph']);
  assert.equal(append.args.children[1].paragraph.rich_text[0].text.content, 'Tweede alinea.');
  const order = client.calls.map((c) => c.name);
  assert.ok(order.lastIndexOf('blocks.delete') < order.indexOf('blocks.children.append'), 'delete before append');
});

test('replaceBody splits a long paragraph into 2000-character pieces without losing text', async () => {
  const client = fakeNotion();
  const long = 'abcdefghij'.repeat(450);
  await replaceBody(client, 'page-0001', long);
  const [append] = client.callsTo('blocks.children.append');
  const pieces = append.args.children.flatMap((b) => b.paragraph.rich_text.map((t) => t.text.content));
  assert.ok(pieces.every((p) => p.length <= 2000));
  assert.equal(pieces.join(''), long);
});

test('Draft falls back to none when the row has no draft status', () => {
  assert.equal(toProperties(row({ draftStatus: undefined, draft: null })).Draft.select.name, 'none');
});

test('upsertProspect with touchOnly and no existing page creates nothing', async () => {
  const client = fakeNotion();
  const result = await upsertProspect(client, DB, { domain: 'trattoria-fittizia.test', run: '2026-11-16' }, { touchOnly: true });
  assert.deepEqual(result, { action: 'missing' });
  assert.equal(client.callsTo('pages.create').length, 0);
  assert.equal(client.callsTo('pages.update').length, 0);
});

test('keepDraft omits Email subject and Draft and leaves the body alone', async () => {
  const p = toProperties(row({ keepDraft: true }));
  assert.equal('Email subject' in p, false);
  assert.equal('Draft' in p, false);
  const client = fakeNotion({ pages: [page('page-0001', 'New')], children: { 'page-0001': [[{ id: 'old-draft' }]] } });
  const result = await upsertProspect(client, DB, row({ keepDraft: true, draft: null, emailSubject: undefined, draftStatus: undefined }));
  assert.equal(result.action, 'updated');
  assert.equal('Draft' in client.callsTo('pages.update')[0].args.properties, false);
  assert.equal(client.callsTo('blocks.delete').length, 0);
  assert.equal(client.callsTo('blocks.children.append').length, 0);
});
