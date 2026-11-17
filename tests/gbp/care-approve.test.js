// Tests for the care approve step: the lock, every refusal, the applying marker, preview-then-apply and the read-back written to the pack.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approveItems, takeLock } from '../../tools/gbp/care/approve.js';
import { main as approveCli } from '../../tools/gbp/care/approve-cli.js';
import { main as runMain } from '../../tools/gbp/care/run.js';
import { validateCareConfig } from '../../tools/gbp/care/config.js';
import { createFixtureFetch } from '../../tools/gbp/care/fixture.js';
import { careDir, readPack, writePack } from '../../tools/gbp/care/pack.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures/care');
const readFixture = (name) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
const NOW = Date.parse('2026-11-17T09:00:00Z');
const DAY = 86_400_000;

const isWrite = (request) =>
  request.method !== 'GET' &&
  new URL(request.url).searchParams.get('validateOnly') !== 'true' &&
  !request.url.includes('oauth2.googleapis.com');

function packFor(overrides = {}) {
  const google = readFixture('google.json');
  return {
    version: 1,
    slug: 'fixture',
    date: '2026-11-16',
    createdAt: new Date(NOW - DAY).toISOString(),
    location: { name: 'locations/222', title: 'Example Bakery', v4Name: 'accounts/111/locations/222' },
    paused: false,
    items: [
      {
        n: 1,
        type: 'reply',
        state: 'drafted',
        review: { reviewId: 'r1', starRating: 'FIVE', text: 'Heerlijk brood.', starOnly: false },
        intent: { reviewId: 'r1', comment: 'Dank je wel voor je mooie woorden!' },
        before: { reviewReply: null },
      },
      {
        n: 2,
        type: 'post',
        state: 'drafted',
        intent: {
          summary: 'Deze week bakken we winterbrood.',
          languageCode: 'nl',
          button: { actionType: 'LEARN_MORE', url: 'https://example.com/menu' },
        },
        before: { latestPostCreateTime: '2026-10-01T09:00:00Z' },
      },
      {
        n: 3,
        type: 'hours',
        state: 'drafted',
        changes: ['Special hours 2099-12-24: not set -> closed'],
        intent: {
          edits: {
            specialHours: {
              specialHourPeriods: [{ startDate: { year: 2099, month: 12, day: 24 }, closed: true }],
            },
          },
        },
        before: { regularHours: google.location.regularHours, specialHours: null },
      },
    ],
    ownerChecks: [],
    notes: [],
    insights: null,
    ...overrides,
  };
}

function setup({ pack = packFor(), config = {}, mutate } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gbp-care-approve-'));
  const dir = careDir(root, 'fixture');
  const { json, md } = writePack(dir, pack);
  const data = readFixture('google.json');
  mutate?.(data);
  const fetch = createFixtureFetch(data, { now: () => NOW });
  const sleeps = [];
  const out = [];
  const options = {
    slug: 'fixture',
    config: validateCareConfig({ ...readFixture('fixture.json'), ...config }),
    ctx: { fetch, getToken: async () => 'fixture-token', sleep: async () => {} },
    dir,
    globalOff: join(root, '.claude/care/gbp.off'),
    lockRoot: join(root, 'locks'),
    logPath: join(root, 'log/changes.jsonl'),
    now: () => NOW,
    sleep: async (ms) => sleeps.push(ms),
    writer: (text) => out.push(text),
  };
  return { root, dir, json, md, fetch, data, sleeps, out, options };
}

const writes = (fetch) => fetch.requests.filter(isWrite);

describe('approve applies', () => {
  it('previews and applies a reply, then writes live to json and md', async () => {
    const t = setup();
    const result = await approveItems({ ...t.options, selection: [1] });
    assert.equal(result.refused, null);
    assert.deepEqual(result.results.map((r) => [r.n, r.state]), [[1, 'live']]);
    const pack = readPack(t.json);
    assert.equal(pack.items[0].state, 'live');
    assert.match(readFileSync(t.md, 'utf8'), /## 1\. Reply: live/);
    assert.equal(writes(t.fetch).length, 1);
    assert.equal(writes(t.fetch)[0].method, 'PUT');
    assert.equal(t.data.reviews[0].reviewReply.comment, 'Dank je wel voor je mooie woorden!');
    assert.ok(existsSync(t.options.logPath));
    assert.ok(!existsSync(join(t.options.lockRoot, 'fixture.approve.lock')));
  });

  it('applies all three types with 7 s between sends', async () => {
    const t = setup();
    const result = await approveItems({ ...t.options, selection: 'all' });
    assert.deepEqual(result.results.map((r) => r.state), ['live', 'live', 'live']);
    assert.deepEqual(t.sleeps, [7000, 7000]);
    assert.deepEqual(writes(t.fetch).map((r) => r.method), ['PUT', 'POST', 'PATCH']);
    assert.equal(t.data.posts.length, 2);
    assert.equal(t.data.location.specialHours.specialHourPeriods[0].closed, true);
  });

  it('writes applying before the send', async () => {
    const t = setup();
    let stateAtSend = null;
    const inner = t.options.ctx.fetch;
    const ctx = {
      ...t.options.ctx,
      fetch: async (url, init = {}) => {
        if (init.method === 'PUT') stateAtSend = readPack(t.json).items[0].state;
        return inner(url, init);
      },
    };
    await approveItems({ ...t.options, ctx, selection: [1] });
    assert.equal(stateAtSend, 'applying');
  });
});

describe('approve refuses', () => {
  async function refusedRun(t, selection = [1]) {
    const result = await approveItems({ ...t.options, selection });
    assert.equal(writes(t.fetch).length, 0, 'nothing sent');
    return result;
  }

  it('when another approve holds the lock', async () => {
    const t = setup();
    const lock = join(t.options.lockRoot, 'fixture.approve.lock');
    mkdirSync(lock, { recursive: true });
    writeFileSync(join(lock, 'pid'), String(process.pid));
    const result = await refusedRun(t);
    assert.match(result.refused, /another approve holds the lock/);
    assert.ok(existsSync(lock), 'the live holder keeps its lock');
  });

  it('clears a lock whose pid is dead and goes on', async () => {
    const t = setup();
    const lock = join(t.options.lockRoot, 'fixture.approve.lock');
    mkdirSync(lock, { recursive: true });
    writeFileSync(join(lock, 'pid'), '999999');
    const pidAlive = () => false;
    const result = await approveItems({ ...t.options, pidAlive, selection: [1] });
    assert.equal(result.refused, null);
    assert.equal(result.results[0].state, 'live');
    assert.ok(!existsSync(lock));
  });

  it('treats a young lock with no pid file as held and an old one as stale', () => {
    const lockRoot = mkdtempSync(join(tmpdir(), 'gbp-care-lock-'));
    const lock = join(lockRoot, 'fixture.approve.lock');
    mkdirSync(lock);
    const made = statSync(lock).mtimeMs;
    assert.equal(takeLock(lockRoot, 'fixture', { now: () => made + 9_000 }), null);
    assert.ok(existsSync(lock));
    writeFileSync(join(lock, 'pid'), '');
    assert.equal(takeLock(lockRoot, 'fixture', { now: () => made + 9_000 }), null);
    const release = takeLock(lockRoot, 'fixture', { now: () => made + 11_000, pid: 4242 });
    assert.equal(typeof release, 'function');
    assert.equal(readFileSync(join(lock, 'pid'), 'utf8'), '4242');
    release();
    assert.ok(!existsSync(lock));
  });

  it('when consent is missing', async () => {
    const t = setup({ config: { consent: null } });
    const result = await refusedRun(t);
    assert.equal(result.refused, 'client consent missing');
  });

  it('when the item type is outside the consent scope', async () => {
    const t = setup({ config: { consent: { by: 'Example Owner', date: '2026-11-16', scope: ['replies'] } } });
    const result = await refusedRun(t, [2, 3]);
    assert.deepEqual(result.results.map((r) => r.state), ['refused', 'refused']);
    assert.match(result.results[0].reason, /posts.*consent scope/);
    assert.match(result.results[1].reason, /hours.*consent scope/);
  });

  it('when the global or client kill switch is on', async () => {
    const global = setup();
    mkdirSync(dirname(global.options.globalOff), { recursive: true });
    writeFileSync(global.options.globalOff, '');
    assert.match((await refusedRun(global)).refused, /kill switch/);
    const client = setup();
    writeFileSync(join(client.dir, 'gbp.off'), '');
    assert.match((await refusedRun(client)).refused, /kill switch/);
  });

  it('when the pack is older than 7 days', async () => {
    const t = setup({ pack: packFor({ createdAt: new Date(NOW - 8 * DAY).toISOString() }) });
    assert.match((await refusedRun(t)).refused, /older than 7 days/);
  });

  it('when there is no pack or it is paused', async () => {
    const t = setup({ pack: packFor({ paused: { reason: 'kill switch on' }, items: [] }) });
    assert.match((await refusedRun(t)).refused, /paused/);
  });

  it('when the item is not drafted, and for an unknown item', async () => {
    const pack = packFor();
    pack.items[0].state = 'not approvable';
    const t = setup({ pack });
    const result = await refusedRun(t, [1, 9]);
    assert.match(result.results[0].reason, /not approvable/);
    assert.equal(result.results[1].state, 'refused');
    assert.match(result.results[1].reason, /no item 9/);
  });

  it('turns an item found in applying into unknown and never re-sends it', async () => {
    const pack = packFor();
    pack.items[0].state = 'applying';
    const t = setup({ pack });
    const result = await refusedRun(t);
    assert.equal(result.results[0].state, 'unknown — check by hand');
    assert.equal(readPack(t.json).items[0].state, 'unknown — check by hand');
  });

  it('when the text fails claim-lint, the contact check or the privacy check', async () => {
    for (const comment of ['Niet goedkoop, wel lekker.', 'Bel ons op 020 123 4567.', 'Fijn dat je sessie goed was.']) {
      const pack = packFor();
      pack.items[0].intent.comment = comment;
      const t = setup({ pack });
      const result = await refusedRun(t);
      assert.equal(result.results[0].state, 'refused', comment);
      assert.equal(readPack(t.json).items[0].state, 'refused');
    }
  });

  it('when the review already has a reply on Google', async () => {
    const t = setup({ mutate: (data) => (data.reviews[0].reviewReply = { comment: 'Done by hand.' }) });
    const result = await refusedRun(t);
    assert.match(result.results[0].reason, /already has a reply/);
  });

  it('when the hours on Google changed since the pack', async () => {
    const t = setup({
      mutate: (data) => (data.location.specialHours = { specialHourPeriods: [{ startDate: { year: 2099, month: 1, day: 1 }, closed: true }] }),
    });
    const result = await refusedRun(t, [3]);
    assert.match(result.results[0].reason, /hours on Google changed/);
  });

  it('a post when Google shows a newer post', async () => {
    const t = setup({
      mutate: (data) => data.posts.push({ name: 'accounts/111/locations/222/localPosts/p2', state: 'LIVE', summary: 'x', createTime: new Date(NOW - 3600_000).toISOString() }),
    });
    const result = await refusedRun(t, [2]);
    assert.match(result.results[0].reason, /newer post/);
  });

  it('skips the send when the applying write fails', async () => {
    const t = setup();
    chmodSync(t.dir, 0o500);
    let result;
    try {
      result = await approveItems({ ...t.options, selection: [1] });
    } finally {
      chmodSync(t.dir, 0o700);
    }
    assert.equal(writes(t.fetch).length, 0);
    assert.equal(result.results[0].state, 'refused');
    assert.match(result.results[0].reason, /could not mark/);
  });

  it('writes refused, not applying, when apply finds the field stale', async () => {
    const t = setup();
    const inner = t.options.ctx.fetch;
    const ctx = {
      ...t.options.ctx,
      fetch: async (url, init = {}) => {
        const response = await inner(url, init);
        if (init.method === 'PATCH' && new URL(url).searchParams.get('validateOnly') === 'true') {
          t.data.location.specialHours = { specialHourPeriods: [{ startDate: { year: 2099, month: 2, day: 2 }, closed: true }] };
        }
        return response;
      },
    };
    const result = await approveItems({ ...t.options, ctx, selection: [3] });
    assert.equal(writes(t.fetch).length, 0);
    assert.equal(result.results[0].state, 'refused');
    assert.match(result.results[0].reason, /stale/);
    assert.equal(readPack(t.json).items[2].state, 'refused');
  });
});

describe('approve-cli', () => {
  it('exits 2 on usage errors', async () => {
    const out = [];
    const writer = (text) => out.push(text);
    assert.equal(await approveCli([], { writer, env: {} }), 2);
    assert.equal(await approveCli(['fixture'], { writer, env: {} }), 2);
    assert.equal(await approveCli(['fixture', 'x'], { writer, env: {} }), 2);
    assert.equal(await approveCli(['Bad Slug', '1'], { writer, env: {} }), 2);
  });

  it('exits 1 with a clear message when credentials are missing', async () => {
    const out = [];
    const root = mkdtempSync(join(tmpdir(), 'gbp-care-cli-'));
    assert.equal(await approveCli(['fixture', '1'], { writer: (t) => out.push(t), env: {}, root }), 1);
    assert.match(out.join(''), /GBP_CLIENT_ID/);
  });

  for (const [slug, expected, code] of [
    ['fixture', /#1 reply: live/, 0],
    ['fixture-changed', /#1 reply: refused .*already has a reply/, 1],
    ['fixture-noconsent', /refused: client consent missing/, 1],
  ]) {
    it(`fixture mode ${slug}`, async () => {
      const root = mkdtempSync(join(tmpdir(), 'gbp-care-cli-'));
      const env = { GBP_CARE_FIXTURE: FIXTURES };
      const out = [];
      const writer = (text) => out.push(text);
      assert.equal(await runMain(['--client', slug], { env, root, writer }), 0, out.join(''));
      assert.equal(await approveCli([slug, '1'], { env, root, writer }), code, out.join(''));
      assert.match(out.join(''), expected);
    });
  }
});
