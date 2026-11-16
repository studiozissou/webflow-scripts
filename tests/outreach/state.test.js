// Covers domain normalisation, candidate dedupe (seeds win), the 30-day rescan window, --force-rescan, status protection for rows past New, and state file read and write.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  RESCAN_DAYS, dedupeCandidates, isProtected, planScan, recordScan, touchRun, readState, writeState,
} from '../../tools/outreach/state.js';
import { normaliseDomain } from '../../tools/outreach/text.js';
import { NOW, daysAgo, deepFreeze } from './helpers.js';

const entry = (domain, over = {}) => ({ domain, source: 'seed', cid: null, verdict: 'management', status: 'New', lastScanned: daysAgo(10), run: '2026-11-02', ...over });
const stateOf = (...entries) => deepFreeze({ prospects: Object.fromEntries(entries.map((e) => [e.domain, e])) });
const plan = (state, candidates, opts = {}) => planScan(state, candidates, { now: NOW, ...opts });
const byDomain = (rows) => Object.fromEntries(rows.map((r) => [r.domain, r]));

test('RESCAN_DAYS is 30', () => {
  assert.equal(RESCAN_DAYS, 30);
});

test('normaliseDomain strips protocol, www., port, path, query and trailing dot, lowercased', () => {
  assert.equal(normaliseDomain('https://www.Example.test/en/'), 'example.test');
  assert.equal(normaliseDomain('example.test'), 'example.test');
  assert.equal(normaliseDomain('http://shop.example.test:8080/x?y=1#z'), 'shop.example.test');
  assert.equal(normaliseDomain('WWW.example.test.'), 'example.test');
  assert.equal(normaliseDomain('www.example.test/tickets'), 'example.test');
  assert.equal(normaliseDomain(''), null);
  assert.equal(normaliseDomain(null), null);
});

test('dedupeCandidates collapses by normalised domain, seeds win, order kept', () => {
  const out = dedupeCandidates([
    { url: 'https://koffiebar-voorbeeld.test/', source: 'lookalike', type: 'Coffee shop' },
    { url: 'https://trattoria-fittizia.test/', source: 'seed', type: 'Italian restaurant' },
    { url: 'http://www.Koffiebar-Voorbeeld.test/menu', source: 'seed', type: 'Coffee shop', love: 'the flat whites' },
    { url: 'https://trattoria-fittizia.test/en', source: 'lookalike', type: 'Italian restaurant' },
  ]);
  assert.deepEqual(out.map((c) => c.domain), ['koffiebar-voorbeeld.test', 'trattoria-fittizia.test']);
  assert.equal(out[0].source, 'seed');
  assert.equal(out[0].love, 'the flat whites');
  assert.equal(out[1].source, 'seed');
});

test('isProtected: New or no status is open, every later status is protected', () => {
  assert.equal(isProtected('New'), false);
  assert.equal(isProtected(undefined), false);
  assert.equal(isProtected(null), false);
  for (const s of ['Contacted', 'Replied', 'Won', 'Lost', 'Do not contact']) assert.equal(isProtected(s), true, s);
});

test('planScan: unseen domain is scanned', () => {
  const [row] = plan(stateOf(), [{ url: 'https://nieuw-bedrijf.test/', source: 'lookalike' }]);
  assert.equal(row.domain, 'nieuw-bedrijf.test');
  assert.equal(row.action, 'scan');
  assert.equal(row.reason, 'new');
  assert.equal(row.candidate.source, 'lookalike');
});

test('planScan: inside 30 days only touches Run; at or after 30 days rescans', () => {
  const state = stateOf(
    entry('tien.test', { lastScanned: daysAgo(10) }),
    entry('negenentwintig.test', { lastScanned: daysAgo(29) }),
    entry('dertig.test', { lastScanned: daysAgo(30) }),
    entry('eenendertig.test', { lastScanned: daysAgo(31) }),
  );
  const rows = byDomain(plan(state, ['tien', 'negenentwintig', 'dertig', 'eenendertig'].map((d) => ({ url: `https://${d}.test/`, source: 'seed' }))));
  assert.deepEqual([rows['tien.test'].action, rows['tien.test'].reason], ['touch', 'recent']);
  assert.equal(rows['negenentwintig.test'].action, 'touch');
  assert.deepEqual([rows['dertig.test'].action, rows['dertig.test'].reason], ['scan', 'stale']);
  assert.equal(rows['eenendertig.test'].action, 'scan');
});

test('planScan: --force-rescan rescans a recent New row', () => {
  const [row] = plan(stateOf(entry('tien.test')), [{ url: 'https://tien.test/', source: 'seed' }], { forceRescan: true });
  assert.deepEqual([row.action, row.reason], ['scan', 'forced']);
});

test('planScan: rows past New are only touched, even when stale or forced', () => {
  const state = stateOf(entry('gemaild.test', { status: 'Contacted', lastScanned: daysAgo(90) }), entry('gewonnen.test', { status: 'Won' }));
  const candidates = [{ url: 'https://gemaild.test/', source: 'seed' }, { url: 'https://gewonnen.test/', source: 'seed' }];
  for (const forceRescan of [false, true]) {
    for (const row of plan(state, candidates, { forceRescan })) {
      assert.deepEqual([row.action, row.reason], ['touch', 'protected'], `${row.domain} force=${forceRescan}`);
    }
  }
});

test('planScan: Do not contact is skipped, seed or lookalike', () => {
  const state = stateOf(entry('nee.test', { status: 'Do not contact', lastScanned: daysAgo(90) }));
  for (const source of ['seed', 'lookalike']) {
    const [row] = plan(state, [{ url: 'https://www.nee.test/', source }], { forceRescan: true });
    assert.deepEqual([row.action, row.reason], ['skip', 'do-not-contact']);
  }
});

test('planScan dedupes candidates so a domain is planned once', () => {
  const rows = plan(stateOf(), [{ url: 'https://dubbel.test/', source: 'lookalike' }, { url: 'https://www.dubbel.test/en', source: 'seed' }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].candidate.source, 'seed');
});

test('recordScan writes a new entry as New and does not mutate the old state', () => {
  const before = stateOf();
  const after = recordScan(before, { domain: 'nieuw-bedrijf.test', source: 'lookalike', cid: '42', verdict: 'neither' }, { now: NOW, run: '2026-11-16' });
  assert.deepEqual(before, { prospects: {} });
  assert.deepEqual(after.prospects['nieuw-bedrijf.test'], {
    domain: 'nieuw-bedrijf.test', source: 'lookalike', cid: '42', verdict: 'neither', status: 'New', lastScanned: NOW.toISOString(), run: '2026-11-16',
  });
});

test('recordScan updates a New entry but keeps its status', () => {
  const after = recordScan(stateOf(entry('tien.test')), { domain: 'tien.test', source: 'seed', cid: '7', verdict: 'new-site+management' }, { now: NOW, run: '2026-11-16' });
  const e = after.prospects['tien.test'];
  assert.equal(e.verdict, 'new-site+management');
  assert.equal(e.cid, '7');
  assert.equal(e.status, 'New');
  assert.equal(e.lastScanned, NOW.toISOString());
});

test('recordScan never overwrites a protected entry beyond its Run', () => {
  const old = entry('gemaild.test', { status: 'Contacted', verdict: 'management', lastScanned: daysAgo(40) });
  const after = recordScan(stateOf(old), { domain: 'gemaild.test', source: 'seed', cid: '9', verdict: 'neither', status: 'New' }, { now: NOW, run: '2026-11-16' });
  assert.deepEqual(after.prospects['gemaild.test'], { ...old, run: '2026-11-16' });
});

test('touchRun changes only Run', () => {
  const old = entry('tien.test');
  const after = touchRun(stateOf(old), 'https://www.tien.test/', '2026-11-16');
  assert.deepEqual(after.prospects['tien.test'], { ...old, run: '2026-11-16' });
});

test('readState gives an empty state for a missing file; writeState round-trips', () => {
  const dir = mkdtempSync(join(tmpdir(), 'outreach-state-'));
  try {
    const file = join(dir, 'state.json');
    assert.deepEqual(readState(file), { prospects: {} });
    const state = { prospects: { 'tien.test': entry('tien.test') } };
    writeState(file, state);
    assert.deepEqual(readState(file), state);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
