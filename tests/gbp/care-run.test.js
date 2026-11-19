// Tests that the weekly care runner can only read: the guard, the import graph, the fixture dry-run, kill switches and the Slack counts.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAllowedRequest, readOnlyFetch } from '../../tools/gbp/care/guard.js';
import { main } from '../../tools/gbp/care/run.js';
import { createFixtureFetch } from '../../tools/gbp/care/fixture.js';
import { careDir, fixtureCareDir, readPack } from '../../tools/gbp/care/pack.js';
import { FAKE_CLIENT_ID, FAKE_REFRESH, FAKE_SECRET } from './helpers.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const CARE = join(ROOT, 'tools/gbp/care');
const FIXTURES = join(HERE, 'fixtures/care');
const readFixture = (name) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
const NOW = Date.parse('2026-11-17T09:00:00Z');
const CREDS = { GBP_CLIENT_ID: FAKE_CLIENT_ID, GBP_CLIENT_SECRET: FAKE_SECRET, GBP_REFRESH_TOKEN: FAKE_REFRESH };
const INFO = 'https://mybusinessbusinessinformation.googleapis.com/v1/locations/222';
const REPLY = 'https://mybusiness.googleapis.com/v4/accounts/111/locations/222/reviews/r1/reply';

describe('read-only guard', () => {
  it('allows GETs, the Google token POST and parsed validateOnly=true', () => {
    assert.equal(isAllowedRequest(INFO, 'GET'), true);
    assert.equal(isAllowedRequest('https://oauth2.googleapis.com/token', 'POST'), true);
    assert.equal(isAllowedRequest(`${INFO}?updateMask=specialHours&validateOnly=true`, 'PATCH'), true);
  });
  it('refuses look-alikes and writes', () => {
    for (const [url, method] of [
      [`${INFO}?x=validateOnly=true`, 'PATCH'],
      [`${INFO}?validateOnly=TRUE`, 'PATCH'],
      [`${INFO}?validateOnly=false`, 'PATCH'],
      [`${INFO}#validateOnly=true`, 'PATCH'],
      [`${INFO}?updateMask=specialHours`, 'PATCH'],
      ['https://evil.example/token', 'POST'],
      ['https://oauth2.googleapis.com.evil.example/token', 'POST'],
      ['https://oauth2.googleapis.com/token/extra', 'POST'],
      [REPLY, 'PUT'],
      [INFO, 'DELETE'],
      ['not a url', 'GET'],
    ]) {
      assert.equal(isAllowedRequest(url, method), false, `${method} ${url}`);
    }
  });
  it('throws and records before calling fetch', async () => {
    const recorded = [];
    let called = 0;
    const guarded = readOnlyFetch(
      async () => {
        called += 1;
        return 'ok';
      },
      { record: (entry) => recorded.push(entry) },
    );
    assert.equal(await guarded(INFO), 'ok');
    await assert.rejects(
      guarded(REPLY, { method: 'PUT' }),
      /^Error: read-only guard: PUT mybusiness\.googleapis\.com\/v4\/accounts\/111\/locations\/222\/reviews\/r1\/reply refused$/,
    );
    await assert.rejects(guarded(`${INFO}?updateMask=x`, { method: 'PATCH' }), /read-only guard: PATCH/);
    assert.equal(called, 1);
    assert.deepEqual(recorded.map((entry) => entry.method), ['PUT', 'PATCH']);
  });
});

const IMPORT = /(?:^|[\s;])(?:import|export)\s[^'"]*?\bfrom\s+['"]([^'"]+)['"]|(?:^|[\s;])import\s+['"]([^'"]+)['"]/g;

function staticImports(file) {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(IMPORT)].map((match) => match[1] ?? match[2]);
}

function importGraph(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of staticImports(file)) {
      if (spec.startsWith('.')) stack.push(resolve(dirname(file), spec));
    }
  }
  return [...seen].map((file) => relative(ROOT, file));
}

const careFiles = () => readdirSync(CARE).filter((name) => name.endsWith('.js'));

describe('the weekly runner has no route to apply', () => {
  it('the import parser finds static imports and re-exports', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gbp-care-graph-'));
    writeFileSync(join(dir, 'a.js'), "import { x } from './b.js';\nexport { y } from './c.js';\nimport './d.js';\n");
    writeFileSync(join(dir, 'b.js'), "import {\n  z,\n} from './e.js';\n");
    for (const name of ['c.js', 'd.js', 'e.js']) writeFileSync(join(dir, name), '');
    const files = importGraph(join(dir, 'a.js')).map((file) => file.split('/').pop()).sort();
    assert.deepEqual(files, ['a.js', 'b.js', 'c.js', 'd.js', 'e.js']);
  });

  it('run.js never reaches approve.js or changes.js', () => {
    const graph = importGraph(join(CARE, 'run.js'));
    assert.ok(graph.includes('tools/gbp/care/collect.js'));
    assert.ok(graph.includes('tools/gbp/client.js'));
    const bad = graph.filter((file) => /(?:^|\/)(?:approve|approve-cli|changes)\.js$/.test(file));
    assert.deepEqual(bad, []);
  });

  it('no care file uses a dynamic import', () => {
    for (const name of careFiles()) {
      assert.doesNotMatch(readFileSync(join(CARE, name), 'utf8'), /\bimport\s*\(/, name);
    }
  });

  it('only approve-cli.js references approve.js or calls approve', () => {
    const pattern = /from\s+['"][^'"]*approve|\bapprove\s*\(|import\s*\([^)]*approve/;
    for (const name of careFiles()) {
      if (name === 'approve-cli.js') continue;
      assert.doesNotMatch(readFileSync(join(CARE, name), 'utf8'), pattern, name);
    }
    assert.match(readFileSync(join(CARE, 'approve-cli.js'), 'utf8'), pattern);
  });

  it('only approve.js imports createChanges', () => {
    for (const name of careFiles()) {
      if (name === 'approve.js') continue;
      assert.doesNotMatch(readFileSync(join(CARE, name), 'utf8'), /createChanges|changes\.js\b/, name);
    }
  });

  it('run.js takes child_process only as the default claude spawn', () => {
    const text = readFileSync(join(CARE, 'run.js'), 'utf8');
    const imports = [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"](?:node:)?child_process['"]/g)];
    assert.equal(imports.length, 1);
    assert.equal((text.match(/child_process/g) ?? []).length, 1);
    const names = imports[0][1].split(',').map((part) => part.trim()).filter(Boolean);
    assert.equal(names.length, 1);
    const local = names[0].split(/\s+as\s+/).pop();
    assert.equal((text.match(new RegExp(`\\b${local}\\b`, 'g')) ?? []).length, 2);
    assert.match(text, new RegExp(`\\bspawn\\s*:\\s*\\w+\\s*=\\s*${local}\\b`));
  });

  it('run.js always wraps fetch in the guard', () => {
    const text = readFileSync(join(CARE, 'run.js'), 'utf8');
    assert.match(text, /readOnlyFetch\(/);
    assert.doesNotMatch(text, /\bfetch:\s*(?:deps\.fetch|globalThis\.fetch|baseFetch)\b/);
  });
});

function tempRoot() {
  return mkdtempSync(join(tmpdir(), 'gbp-care-run-'));
}

function liveRoot(config = readFixture('fixture.json')) {
  const root = tempRoot();
  const dir = careDir(root, 'fixture');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'gbp.json'), JSON.stringify(config));
  return { root, dir };
}

function spySpawn(stdout = readFileSync(join(FIXTURES, 'drafts-run.json'), 'utf8')) {
  const calls = [];
  const spawn = (bin, args, options) => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = { write: () => true, end: () => {} };
    child.kill = () => true;
    calls.push({ bin, args, options });
    setImmediate(() => {
      child.stdout.emit('data', stdout);
      child.emit('close', 0, null);
    });
    return child;
  };
  spawn.calls = calls;
  return spawn;
}

function liveDeps(root, extra = {}) {
  const out = [];
  const slack = [];
  const fetch = createFixtureFetch(readFixture('google.json'), { now: () => NOW });
  const spawn = spySpawn();
  return {
    out,
    slack,
    fetch,
    spawn,
    deps: {
      env: { ...CREDS, CLAUDE_BIN: '/usr/local/bin/claude' },
      root,
      fetch,
      spawn,
      makeTempDir: async () => tmpdir(),
      now: () => NOW,
      writer: (text) => out.push(text),
      postSlack: async (text) => {
        slack.push(text);
        return 0;
      },
      ...extra,
    },
  };
}

const writesOf = (fetch) =>
  fetch.requests.filter((r) => !isAllowedRequest(r.url, r.method));

describe('fixture dry-run', () => {
  it('drafts from fixtures, writes the pack and makes no write call', async () => {
    const root = tempRoot();
    const recorded = [];
    const out = [];
    const code = await main(['--client', 'fixture', '--dry-run'], {
      env: { GBP_CARE_FIXTURE: FIXTURES },
      root,
      record: (entry) => recorded.push(entry),
      writer: (text) => out.push(text),
    });
    assert.equal(code, 0, out.join(''));
    assert.deepEqual(recorded, []);
    const dir = fixtureCareDir(root, 'fixture');
    const files = readdirSync(dir).filter((name) => /^gbp-\d{4}-\d{2}-\d{2}\.(json|md)$/.test(name));
    assert.equal(files.length, 2);
    const pack = readPack(join(dir, files.find((name) => name.endsWith('.json'))));
    const drafted = (type) => pack.items.filter((item) => item.type === type && item.state === 'drafted');
    assert.equal(drafted('reply').length, 3);
    assert.equal(drafted('post').length, 1);
    assert.equal(drafted('hours').length, 1);
    assert.deepEqual(pack.items.map((item) => item.n), [1, 2, 3, 4, 5]);
    assert.equal(pack.ownerChecks.length, 1);
    assert.equal(pack.theme, 'winter bread');
    assert.ok(pack.items.find((item) => item.review?.starOnly));
    assert.equal(pack.insights.month, '2026-10');
    assert.equal(pack.insights.totalReviewCount, 4);
    assert.ok(!existsSync(join(root, 'projects')), 'nothing under the real projects folder');
  });
});

describe('run with injected Google', () => {
  it('a dry-run skips the claude spawn and the Slack ping', async () => {
    const { root, dir } = liveRoot();
    const t = liveDeps(root);
    assert.equal(await main(['--client', 'fixture', '--dry-run'], t.deps), 0, t.out.join(''));
    assert.equal(t.spawn.calls.length, 0);
    assert.deepEqual(t.slack, []);
    assert.deepEqual(writesOf(t.fetch), []);
    const pack = readPack(join(dir, 'gbp-2026-11-17.json'));
    const replies = pack.items.filter((item) => item.type === 'reply');
    assert.equal(replies.length, 3);
    for (const item of replies) {
      assert.equal(item.state, 'not approvable');
      assert.equal(item.reason, 'dry run: not drafted');
    }
    assert.equal(pack.items.find((item) => item.type === 'hours').state, 'drafted');
  });

  it('a real run drafts through the injected spawn and sends counts only to Slack', async () => {
    const { root, dir } = liveRoot();
    const t = liveDeps(root);
    assert.equal(await main(['--client', 'fixture'], t.deps), 0, t.out.join(''));
    assert.equal(t.spawn.calls.length, 1);
    assert.equal(t.spawn.calls[0].bin, '/usr/local/bin/claude');
    assert.deepEqual(writesOf(t.fetch), []);
    const pack = readPack(join(dir, 'gbp-2026-11-17.json'));
    assert.deepEqual(pack.items.map((item) => item.state), ['drafted', 'drafted', 'drafted', 'drafted', 'drafted']);
    assert.deepEqual(t.slack, ['GBP care 2026-11-17: fixture 3 replies, 1 post, 1 hours change, 1 owner check']);
    assert.doesNotMatch(t.slack[0], /Heerlijk|coffee|Dank/);
  });

  it('ignores standing approvals entirely', async () => {
    const { root, dir } = liveRoot({ ...readFixture('fixture.json'), standing: ['replies', 'posts', 'hours'] });
    const t = liveDeps(root);
    assert.equal(await main(['--client', 'fixture'], t.deps), 0, t.out.join(''));
    assert.deepEqual(writesOf(t.fetch), []);
    const pack = readPack(join(dir, 'gbp-2026-11-17.json'));
    assert.ok(pack.items.every((item) => item.state === 'drafted'));
    assert.doesNotMatch(readFileSync(join(CARE, 'run.js'), 'utf8'), /standing/);
  });

  it('a failing draft is not approvable with its problems', async () => {
    const { root, dir } = liveRoot({ ...readFixture('fixture.json'), bannedTerms: ['walnoot', 'mooie'] });
    const t = liveDeps(root);
    await main(['--client', 'fixture'], t.deps);
    const pack = readPack(join(dir, 'gbp-2026-11-17.json'));
    const [r1] = pack.items;
    assert.equal(r1.state, 'not approvable');
    assert.match(r1.problems.join(' '), /banned term/);
    assert.equal(pack.items.find((item) => item.type === 'post').state, 'not approvable');
  });

  it('drafts no post when posting is off or the last post was rejected', async () => {
    for (const [config, mutate] of [
      [{ ...readFixture('fixture.json'), posting: 'off' }, null],
      [readFixture('fixture.json'), (data) => (data.posts[0].state = 'REJECTED')],
    ]) {
      const { root, dir } = liveRoot(config);
      const data = readFixture('google.json');
      mutate?.(data);
      const t = liveDeps(root, { fetch: createFixtureFetch(data, { now: () => NOW }) });
      await main(['--client', 'fixture'], t.deps);
      const pack = readPack(join(dir, 'gbp-2026-11-17.json'));
      assert.ok(!pack.items.some((item) => item.type === 'post'));
      assert.ok(pack.notes.includes('posting off: appeal by hand'));
    }
  });

  it('drafts no post when the last post is under 7 days old', async () => {
    const { root, dir } = liveRoot();
    const data = readFixture('google.json');
    data.posts[0].createTime = new Date(NOW - 2 * 86_400_000).toISOString();
    const t = liveDeps(root, { fetch: createFixtureFetch(data, { now: () => NOW }) });
    await main(['--client', 'fixture'], t.deps);
    const pack = readPack(join(dir, 'gbp-2026-11-17.json'));
    assert.ok(!pack.items.some((item) => item.type === 'post'));
    assert.ok(!pack.notes.includes('posting off: appeal by hand'));
  });

  it('never overwrites a same-day pack that holds a sent item', async () => {
    const { root, dir } = liveRoot();
    const t = liveDeps(root);
    await main(['--client', 'fixture'], t.deps);
    const base = join(dir, 'gbp-2026-11-17.json');
    const first = readPack(base);
    first.items[0].state = 'live';
    writeFileSync(base, JSON.stringify(first));
    const again = liveDeps(root);
    assert.equal(await main(['--client', 'fixture'], again.deps), 0, again.out.join(''));
    assert.equal(readPack(base).items[0].state, 'live');
    assert.ok(existsSync(join(dir, 'gbp-2026-11-17-2.json')));
    assert.ok(existsSync(join(dir, 'gbp-2026-11-17-2.md')));
    assert.match(again.out.join(''), /gbp-2026-11-17-2\.md/);
  });

  it('overwrites a same-day pack that holds only drafts', async () => {
    const { root, dir } = liveRoot();
    await main(['--client', 'fixture'], liveDeps(root).deps);
    await main(['--client', 'fixture'], liveDeps(root).deps);
    assert.deepEqual(readdirSync(dir).filter((name) => name.startsWith('gbp-')).sort(), [
      'gbp-2026-11-17.json',
      'gbp-2026-11-17.md',
    ]);
  });

  it('drafts no post when a pack from the last 7 days has a post in flight', async () => {
    for (const [date, state, blocked] of [
      ['2026-11-12', 'applying', true],
      ['2026-11-10', 'unknown — check by hand', true],
      ['2026-11-14', 'live', true],
      ['2026-11-14', 'refused', false],
      ['2026-11-09', 'live', false],
    ]) {
      const { root, dir } = liveRoot();
      writeFileSync(
        join(dir, `gbp-${date}.json`),
        JSON.stringify({ slug: 'fixture', date, items: [{ n: 1, type: 'post', state }] }),
      );
      const t = liveDeps(root);
      await main(['--client', 'fixture'], t.deps);
      const pack = readPack(join(dir, 'gbp-2026-11-17.json'));
      const label = `${date} ${state}`;
      assert.equal(pack.items.some((item) => item.type === 'post'), !blocked, label);
      assert.equal(pack.notes.includes(`post sent ${date} (${state}): not drafting another`), blocked, label);
    }
  });

  it('lists hours Google rejects as not approvable', async () => {
    const { root, dir } = liveRoot();
    const google = createFixtureFetch(readFixture('google.json'), { now: () => NOW });
    const fetch = async (url, init = {}) =>
      init.method === 'PATCH'
        ? new Response(JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'bad hours' } }), { status: 400 })
        : google(url, init);
    const t = liveDeps(root, { fetch });
    await main(['--client', 'fixture'], t.deps);
    const hours = readPack(join(dir, 'gbp-2026-11-17.json')).items.find((item) => item.type === 'hours');
    assert.equal(hours.state, 'not approvable');
    assert.match(hours.reason, /^Google rejects: .*bad hours/);
  });

  it('a kill switch writes a paused pack and never calls Google or claude', async () => {
    for (const where of ['global', 'client']) {
      const { root, dir } = liveRoot();
      const off = where === 'global' ? join(root, '.claude/care/gbp.off') : join(dir, 'gbp.off');
      mkdirSync(dirname(off), { recursive: true });
      writeFileSync(off, '');
      const t = liveDeps(root);
      assert.equal(await main(['--client', 'fixture'], t.deps), 0);
      assert.equal(t.spawn.calls.length, 0);
      assert.equal(t.fetch.requests.length, 0);
      const pack = readPack(join(dir, 'gbp-2026-11-17.json'));
      assert.ok(pack.paused.reason);
      assert.deepEqual(pack.items, []);
    }
  });

  it('--all runs every configured client and one failure does not stop the others', async () => {
    const { root, dir } = liveRoot();
    const broken = careDir(root, 'broken');
    mkdirSync(broken, { recursive: true });
    writeFileSync(join(broken, 'gbp.json'), '{ not json');
    const t = liveDeps(root);
    assert.equal(await main(['--all'], t.deps), 1);
    assert.ok(existsSync(join(dir, 'gbp-2026-11-17.json')));
    assert.match(t.out.join(''), /broken: failed/);
    assert.match(t.slack[0], /broken failed: [^;]{1,80}(;|$)/);
  });

  it('pluralises the Slack counts and gives a short redacted reason for a failure or pause', async () => {
    const { root } = liveRoot({ ...readFixture('fixture.json'), posting: 'off' });
    const data = readFixture('google.json');
    data.reviews = data.reviews.slice(0, 1).map((review) => ({ ...review, reviewReply: null }));
    const t = liveDeps(root, { fetch: createFixtureFetch(data, { now: () => NOW }) });
    const one = readFileSync(join(FIXTURES, 'drafts-run.json'), 'utf8');
    t.deps.spawn = spySpawn(one);
    await main(['--client', 'fixture'], t.deps);
    assert.match(t.slack[0], /fixture 1 reply, 0 posts, 1 hours change, 1 owner check$/);

    const paused = liveRoot();
    writeFileSync(join(paused.dir, 'gbp.off'), '');
    const p = liveDeps(paused.root);
    await main(['--client', 'fixture'], p.deps);
    assert.match(p.slack[0], /fixture paused: kill switch on/);

    const failing = liveRoot();
    const f = liveDeps(failing.root, {
      fetch: async () => {
        throw new Error(`boom ${FAKE_SECRET} ${'x'.repeat(200)}`);
      },
    });
    await main(['--client', 'fixture'], f.deps);
    const reason = f.slack[0].split('fixture failed: ')[1];
    assert.ok(reason, f.slack[0]);
    assert.ok(reason.length <= 80, reason);
    assert.ok(!f.slack[0].includes(FAKE_SECRET));
  });

  it('exits 1 with no pack when credentials are missing', async () => {
    const { root, dir } = liveRoot();
    const t = liveDeps(root, { env: {} });
    assert.equal(await main(['--client', 'fixture'], t.deps), 1);
    assert.match(t.out.join(''), /GBP_CLIENT_ID, GBP_CLIENT_SECRET and GBP_REFRESH_TOKEN/);
    assert.ok(!existsSync(join(dir, 'gbp-2026-11-17.json')));
  });

  it('exits 2 on usage errors', async () => {
    const t = liveDeps(tempRoot());
    for (const argv of [[], ['--client', 'fixture', '--all'], ['--bogus'], ['--client', 'Bad Slug']]) {
      assert.equal(await main(argv, t.deps), 2, argv.join(' '));
    }
  });
});
