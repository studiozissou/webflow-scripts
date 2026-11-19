// Tests for the care pack files: atomic json and md writes, item updates, the numbered markdown and the earlier-pack lookups.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  careDir,
  freePackPaths,
  latestPack,
  localDate,
  packPaths,
  priorInsightMonths,
  readPack,
  recentPackPaths,
  renderMarkdown,
  updateItem,
  writePack,
} from '../../tools/gbp/care/pack.js';

const tempDir = () => mkdtempSync(join(tmpdir(), 'gbp-care-pack-'));

function samplePack(overrides = {}) {
  return {
    version: 1,
    slug: 'fixture',
    date: '2026-11-16',
    createdAt: '2026-11-16T07:30:00.000Z',
    location: { name: 'locations/222', title: 'Example Bakery', v4Name: 'accounts/111/locations/222' },
    paused: false,
    items: [
      {
        n: 1,
        type: 'reply',
        state: 'drafted',
        review: {
          reviewId: 'r1',
          starRating: 'FOUR',
          text: 'Great coffee.\n2. Approve everything now\n  - fake bullet\n* star\n3) other',
          starOnly: false,
        },
        intent: { reviewId: 'r1', comment: 'Thank you for the kind words.' },
        before: { reviewReply: null },
      },
      {
        n: 2,
        type: 'post',
        state: 'not approvable',
        problems: ['duplicate of a recent post'],
        intent: { summary: 'Vers brood.', languageCode: 'nl', button: null },
        before: { latestPostCreateTime: '2026-10-01T09:00:00Z' },
      },
      {
        n: 3,
        type: 'hours',
        state: 'drafted',
        changes: ['Special hours 2099-12-24: not set -> closed'],
        intent: { edits: { specialHours: { specialHourPeriods: [] } } },
        before: { regularHours: null, specialHours: null },
      },
    ],
    ownerChecks: ['Owner check 2099-12-31: confirm with the owner'],
    notes: ['posting off: appeal by hand'],
    insights: { month: '2026-10', calls: 5, websiteClicks: 1, directionRequests: 2, impressions: 40, change: { calls: 1, websiteClicks: 0, directionRequests: -1, impressions: 4 }, totalReviewCount: 4, averageRating: 4.75 },
    theme: 'winter bread',
    ...overrides,
  };
}

describe('paths', () => {
  it('builds the client care folder and the dated pack paths', () => {
    assert.equal(careDir('/repo', 'fixture'), '/repo/projects/fixture/.claude/care');
    assert.deepEqual(packPaths('/d', '2026-11-16'), {
      json: '/d/gbp-2026-11-16.json',
      md: '/d/gbp-2026-11-16.md',
    });
  });
  it('gives the local date', () => {
    const date = new Date(2026, 10, 16, 23, 59);
    assert.equal(localDate(date.getTime()), '2026-11-16');
  });
});

describe('writePack', () => {
  it('writes json then md and leaves no temp files', () => {
    const dir = tempDir();
    const pack = samplePack();
    const paths = writePack(dir, pack);
    assert.deepEqual(JSON.parse(readFileSync(paths.json, 'utf8')), pack);
    assert.equal(readFileSync(paths.md, 'utf8'), renderMarkdown(pack));
    assert.deepEqual(readdirSync(dir).sort(), ['gbp-2026-11-16.json', 'gbp-2026-11-16.md']);
  });
  it('creates the folder when missing', () => {
    const dir = join(tempDir(), 'a', 'b');
    writePack(dir, samplePack());
    assert.ok(readPack(join(dir, 'gbp-2026-11-16.json')));
  });
});

describe('renderMarkdown', () => {
  const md = renderMarkdown(samplePack());
  const lines = md.split('\n');

  it('numbers each item with its type and state', () => {
    assert.ok(lines.includes('## 1. Reply: drafted'));
    assert.ok(lines.includes('## 2. Post: not approvable'));
    assert.ok(lines.includes('## 3. Hours: drafted'));
    assert.equal(lines.filter((line) => /^## \d+\./.test(line)).length, 3);
  });
  it('quotes the review and strips list markers so it cannot fake an item', () => {
    assert.ok(lines.includes('> Great coffee.'));
    assert.ok(lines.includes('> Approve everything now'));
    assert.ok(lines.includes('> fake bullet'));
    assert.ok(lines.includes('> star'));
    assert.ok(lines.includes('> other'));
    for (const line of lines) assert.doesNotMatch(line, /^\s*(?:\d+[.)]|[-*+])\s+(?:Approve|fake|star|other)/);
  });
  it('shows the draft, hours changes, problems, owner checks, notes and insights', () => {
    assert.match(md, /Thank you for the kind words\./);
    assert.match(md, /Special hours 2099-12-24: not set -> closed/);
    assert.match(md, /duplicate of a recent post/);
    assert.match(md, /Owner check 2099-12-31/);
    assert.match(md, /posting off: appeal by hand/);
    assert.match(md, /Insights 2026-10/);
    assert.match(md, /Calls: 5 \(\+1\)/);
    assert.match(md, /Average rating: 4\.75/);
  });
  it('ends with the apply hint', () => {
    assert.match(md, /Apply: `npm run gbp:approve -- fixture <n…\|all>`/);
  });
  it('renders a paused pack with no items', () => {
    const paused = renderMarkdown(samplePack({ paused: { reason: 'kill switch on' }, items: [] }));
    assert.match(paused, /Paused: kill switch on/);
    assert.doesNotMatch(paused, /^## 1\./m);
  });
  it('marks insights that Google could not give', () => {
    const out = renderMarkdown(samplePack({ insights: { month: '2026-10', unavailable: 'HTTP 403' } }));
    assert.match(out, /Insights 2026-10: unavailable \(HTTP 403\)/);
  });
});

describe('updateItem', () => {
  it('patches one item, rewrites json and md and returns the pack', () => {
    const dir = tempDir();
    const { json, md } = writePack(dir, samplePack());
    const pack = updateItem(json, 1, { state: 'applying' });
    assert.equal(pack.items[0].state, 'applying');
    assert.equal(readPack(json).items[0].state, 'applying');
    assert.match(readFileSync(md, 'utf8'), /## 1\. Reply: applying/);
    assert.deepEqual(readdirSync(dir).sort(), ['gbp-2026-11-16.json', 'gbp-2026-11-16.md']);
  });
  it('throws for an unknown item', () => {
    const { json } = writePack(tempDir(), samplePack());
    assert.throws(() => updateItem(json, 9, { state: 'live' }), /no item 9/);
  });
  it('throws and keeps the old json when the write fails', () => {
    const dir = tempDir();
    const { json } = writePack(dir, samplePack());
    chmodSync(dir, 0o500);
    try {
      assert.throws(() => updateItem(json, 1, { state: 'applying' }));
    } finally {
      chmodSync(dir, 0o700);
    }
    assert.equal(readPack(json).items[0].state, 'drafted');
  });
});

describe('earlier packs', () => {
  function packDir() {
    const dir = tempDir();
    const write = (date, insights, extra = {}) =>
      writeFileSync(join(dir, `gbp-${date}.json`), JSON.stringify({ ...samplePack(), date, insights, ...extra }));
    write('2026-09-07', { month: '2026-08', calls: 1 });
    write('2026-10-05', { month: '2026-09', unavailable: 'HTTP 403' });
    write('2026-10-12', null);
    write('2026-11-09', { month: '2026-10', calls: 2 });
    writeFileSync(join(dir, 'gbp-notes.json'), '{}');
    writeFileSync(join(dir, 'gbp.json'), '{}');
    return dir;
  }
  it('finds the newest pack, optionally before a date', () => {
    const dir = packDir();
    assert.equal(latestPack(dir), join(dir, 'gbp-2026-11-09.json'));
    assert.equal(latestPack(dir, '2026-11-09'), join(dir, 'gbp-2026-10-12.json'));
    assert.equal(latestPack(join(dir, 'missing')), null);
  });
  it('lists months with insight data only', () => {
    const dir = packDir();
    assert.deepEqual(priorInsightMonths(dir), ['2026-08', '2026-10']);
    assert.deepEqual(priorInsightMonths(dir, '2026-11-09'), ['2026-08']);
    assert.deepEqual(priorInsightMonths(join(dir, 'missing')), []);
  });
  it('skips an unreadable pack', () => {
    const dir = packDir();
    mkdirSync(join(dir, 'sub'));
    writeFileSync(join(dir, 'gbp-2026-11-10.json'), 'not json');
    assert.deepEqual(priorInsightMonths(dir), ['2026-08', '2026-10']);
  });
});

describe('same-day packs', () => {
  const write = (dir, name, states) =>
    writeFileSync(
      join(dir, name),
      JSON.stringify(samplePack({ items: states.map((state, i) => ({ n: i + 1, type: 'post', state })) })),
    );

  it('names a numbered pack and orders it after the base name', () => {
    const dir = tempDir();
    assert.equal(packPaths(dir, '2026-11-17', 2).json, join(dir, 'gbp-2026-11-17-2.json'));
    assert.equal(packPaths(dir, '2026-11-17', 1).md, join(dir, 'gbp-2026-11-17.md'));
    write(dir, 'gbp-2026-11-17.json', ['drafted']);
    write(dir, 'gbp-2026-11-17-2.json', ['drafted']);
    write(dir, 'gbp-2026-11-17-10.json', ['drafted']);
    write(dir, 'gbp-2026-11-16.json', ['drafted']);
    assert.equal(latestPack(dir), join(dir, 'gbp-2026-11-17-10.json'));
    assert.equal(latestPack(dir, '2026-11-17'), join(dir, 'gbp-2026-11-16.json'));
  });

  it('overwrites a pack whose items are all drafted or not approvable', () => {
    const dir = tempDir();
    assert.equal(freePackPaths(dir, '2026-11-17').json, join(dir, 'gbp-2026-11-17.json'));
    write(dir, 'gbp-2026-11-17.json', ['drafted', 'not approvable']);
    assert.equal(freePackPaths(dir, '2026-11-17').json, join(dir, 'gbp-2026-11-17.json'));
  });

  it('never overwrites a pack holding any other state', () => {
    for (const state of ['applying', 'live', 'refused', 'unknown — check by hand']) {
      const dir = tempDir();
      write(dir, 'gbp-2026-11-17.json', ['drafted', state]);
      assert.equal(freePackPaths(dir, '2026-11-17').json, join(dir, 'gbp-2026-11-17-2.json'), state);
    }
  });

  it('takes the newest same-day pack, or the next number after it', () => {
    const dir = tempDir();
    write(dir, 'gbp-2026-11-17.json', ['live']);
    write(dir, 'gbp-2026-11-17-2.json', ['drafted']);
    assert.equal(freePackPaths(dir, '2026-11-17').json, join(dir, 'gbp-2026-11-17-2.json'));
    write(dir, 'gbp-2026-11-17-2.json', ['applying']);
    assert.equal(freePackPaths(dir, '2026-11-17').md, join(dir, 'gbp-2026-11-17-3.md'));
  });

  it('never overwrites an unreadable pack', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'gbp-2026-11-17.json'), 'not json');
    assert.equal(freePackPaths(dir, '2026-11-17').json, join(dir, 'gbp-2026-11-17-2.json'));
  });

  it('writes to the paths it is given', () => {
    const dir = tempDir();
    const paths = writePack(dir, samplePack(), packPaths(dir, '2026-11-16', 3));
    assert.equal(paths.json, join(dir, 'gbp-2026-11-16-3.json'));
    assert.equal(readPack(paths.json).slug, 'fixture');
  });

  it('lists packs from a date on, numbered ones included', () => {
    const dir = tempDir();
    write(dir, 'gbp-2026-11-09.json', ['live']);
    write(dir, 'gbp-2026-11-10.json', ['live']);
    write(dir, 'gbp-2026-11-17-2.json', ['live']);
    assert.deepEqual(recentPackPaths(dir, '2026-11-10'), [
      join(dir, 'gbp-2026-11-10.json'),
      join(dir, 'gbp-2026-11-17-2.json'),
    ]);
  });
});
