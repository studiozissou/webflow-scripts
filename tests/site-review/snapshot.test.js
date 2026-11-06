import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildSnapshot,
  configHashOf,
  diffSnapshots,
  findPreviousSnapshot,
  readSnapshot,
  writeSnapshot,
} from '../../tools/site-review/lib/snapshot.js';
import { SCHEMA_VERSION } from '../../tools/site-review/config.js';

const ORIGIN = 'https://example.com';
const fail = (id, taxonomyId, path, extra = {}) => ({
  id,
  taxonomyId,
  state: 'fail',
  url: `${ORIGIN}${path}`,
  urlKey: `${ORIGIN}${path}`,
  transient: false,
  excludedFromParity: false,
  tags: [],
  ...extra,
});
const facts = [
  { urlKey: `${ORIGIN}/`, wfPage: 'home', fetchState: 'ok' },
  { urlKey: `${ORIGIN}/blog/a`, wfPage: 'tpl-blog', fetchState: 'ok' },
  { urlKey: `${ORIGIN}/blog/b`, wfPage: 'tpl-blog', fetchState: 'ok' },
  { urlKey: `${ORIGIN}/x`, wfPage: null, fetchState: 'ok' },
  { urlKey: `${ORIGIN}/links`, wfPage: 'links', fetchState: 'ok' },
];

function snapshotFor(findings, now) {
  return buildSnapshot({
    url: ORIGIN,
    client: 'golden',
    facts,
    findings,
    health: { score: 80, pages: 4, errorPages: 1, warningPages: 0 },
    sanity: { coverage: { sitemapUrls: 4, fetched: 4, ratio: 1 } },
    stats: {},
    crawlConfig: { url: ORIGIN, renderSample: 1, locales: ['en'] },
    toolVersion: '2.0.0',
    now,
  });
}

describe('snapshot', () => {
  let dir;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'sr-snapshot-'));
  });
  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('snapshot: second run reports fixed, still open and new by finding ID', async () => {
    const first = snapshotFor(
      [
        fail('broken-internal-link-aaa', 'broken-internal-link', '/links', { targetKey: `${ORIGIN}/missing-page`, target: `${ORIGIN}/missing-page` }),
        fail('title-too-long-bbb', 'title-too-long', '/x'),
        fail('http-4xx-ccc', 'http-4xx', '/gone-then-back', { transient: true, tags: ['transient'] }),
        fail('title-too-short-ddd', 'title-too-short', '/blog/a', { severity: 'notice', excludedFromParity: true, tags: ['fixed-after-load'] }),
        { ...fail('page-fetch-eee', 'page-fetch', '/reset'), state: 'unknown', reason: 'fetch_failed' },
      ],
      new Date('2026-10-06T09:00:00Z'),
    );
    assert.equal(first.schemaVersion, SCHEMA_VERSION);
    assert.equal(first.date, '2026-10-06');
    assert.deepEqual(first.counts, { 'broken-internal-link': 1, 'title-too-long': 1 });
    assert.deepEqual(first.countsFixedAfterLoad, { 'title-too-short': 1 });
    assert.deepEqual(first.templates, { home: 1, 'tpl-blog': 2, none: 1, links: 1 });
    assert.equal(first.findings.length, 2);

    const firstDir = join(dir, '2026-10-06');
    const written = await writeSnapshot(firstDir, first);
    assert.equal(written, join(firstDir, 'snapshot.json'));
    const currentDir = join(dir, '2026-11-06');
    await mkdir(currentDir, { recursive: true });
    const previousPath = await findPreviousSnapshot(currentDir, '2026-11-06');
    assert.equal(previousPath, written);
    const previous = await readSnapshot(previousPath);
    assert.deepEqual(previous, first);

    const second = snapshotFor(
      [
        fail('broken-internal-link-fff', 'broken-internal-link', '/links', { targetKey: `${ORIGIN}/new-missing`, target: `${ORIGIN}/new-missing` }),
        fail('title-too-long-bbb', 'title-too-long', '/x', { evidence: { status: 500 } }),
      ],
      new Date('2026-11-06T09:00:00Z'),
    );
    const diff = diffSnapshots(previous, second);
    assert.deepEqual(diff.fixed.map((e) => e.id), ['broken-internal-link-aaa']);
    assert.deepEqual(diff.stillOpen.map((e) => e.id), ['title-too-long-bbb']);
    assert.deepEqual(diff.new.map((e) => e.id), ['broken-internal-link-fff']);
    assert.deepEqual(diff.new[0], { id: 'broken-internal-link-fff', taxonomyId: 'broken-internal-link', urlKey: `${ORIGIN}/links`, targetKey: `${ORIGIN}/new-missing` });
    assert.deepEqual(diff.byType, {
      'broken-internal-link': { fixed: 1, stillOpen: 0, new: 1, unverified: 0 },
      'title-too-long': { fixed: 0, stillOpen: 1, new: 0, unverified: 0 },
    });
  });

  it('finds the latest earlier dated snapshot and ignores later or empty folders', async () => {
    const root = join(dir, 'find');
    for (const name of ['2026-08-01', '2026-09-15', '2026-12-01']) await writeSnapshot(join(root, name), { date: name });
    await mkdir(join(root, '2026-10-01'), { recursive: true });
    await writeFile(join(root, 'notes.txt'), 'x');
    assert.equal(await findPreviousSnapshot(root, '2026-11-06'), join(root, '2026-09-15', 'snapshot.json'));
    assert.equal(await findPreviousSnapshot(join(root, '2026-11-06'), new Date('2026-11-06')), join(root, '2026-09-15', 'snapshot.json'));
    assert.equal(await findPreviousSnapshot(root, '2026-08-01'), null);
    assert.equal(await findPreviousSnapshot(join(dir, 'missing'), '2026-11-06'), null);
  });

  it('hashes the crawl config independently of key order', () => {
    const a = configHashOf({ url: ORIGIN, renderSample: 20, templatesLabel: { b: 1, a: 2 } });
    const b = configHashOf({ templatesLabel: { a: 2, b: 1 }, renderSample: 20, url: ORIGIN });
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.notEqual(a, configHashOf({ url: ORIGIN, renderSample: 21, templatesLabel: { a: 2, b: 1 } }));
  });

  it('snapshot: a finding whose page or target could not be checked this month is unverified, not fixed', () => {
    const previous = snapshotFor([fail('a', 'title-missing', '/x'), fail('b', 'broken-internal-link', '/blog/a'), fail('c', 'title-missing', '/blog/b')], new Date('2026-10-01T00:00:00Z'));
    const current = buildSnapshot({
      url: ORIGIN,
      client: 'golden',
      facts: [
        { urlKey: `${ORIGIN}/`, wfPage: 'home', fetchState: 'ok' },
        { urlKey: `${ORIGIN}/blog/a`, wfPage: 'tpl-blog', fetchState: 'ok' },
        { urlKey: `${ORIGIN}/blog/b`, wfPage: 'tpl-blog', fetchState: 'ok' },
        { urlKey: `${ORIGIN}/x`, wfPage: null, fetchState: 'timeout' },
      ],
      findings: [{ ...fail('b', 'broken-internal-link', '/blog/a'), state: 'unknown', reason: 'timeout' }],
      health: null,
      sanity: null,
      stats: {},
      crawlConfig: { url: ORIGIN },
      toolVersion: '2.0.0',
      now: new Date('2026-11-01T00:00:00Z'),
    });
    const diff = diffSnapshots(previous, current);
    assert.deepEqual(diff.fixed.map((e) => e.id), ['c']);
    assert.deepEqual(diff.unverified.map((e) => e.id), ['a', 'b']);
    assert.equal(diff.byType['title-missing'].unverified, 1);
  });

  it('treats a missing previous snapshot as everything new', () => {
    const current = snapshotFor([fail('a-1', 'a', '/x')], '2026-11-06');
    const diff = diffSnapshots(null, current);
    assert.equal(diff.new.length, 1);
    assert.equal(diff.fixed.length, 0);
  });
});
