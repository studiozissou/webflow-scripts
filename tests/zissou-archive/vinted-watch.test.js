import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtemp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runWatch, parseCliArgs } from '../../projects/zissou-archive/watch-vinted.js';
import { ChallengeError } from '../../projects/zissou-archive/lib/vinted-browser.js';
import { parseCatalogHtml } from '../../projects/zissou-archive/lib/vinted-parse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'vinted-catalog.html'), 'utf8');
const SCRIPT = join(__dirname, '..', '..', 'projects', 'zissou-archive', 'watch-vinted.js');

const CONFIG = {
  version: 1,
  domain: 'www.vinted.nl',
  defaultCatalog: [5],
  brands: {
    alderwick: { id: 11, cap: 25, aliases: ['alderwick'] },
    fenwyks: { id: 22, cap: 25, aliases: ['fenwyks'] },
    brackley: { id: 33, cap: 40, aliases: ['brackley'] },
  },
  searches: [
    { id: 'band-a', kind: 'brand-band', brands: ['alderwick', 'fenwyks'], price_to: 30, flagRule: 'brand' },
    { id: 'phrase-x', kind: 'phrase', lang: 'en', search_text: 'test phrase', price_to: 40, flagRule: 'cap' },
    { id: 'quiet', kind: 'phrase', search_text: 'nothing', price_to: 40, flagRule: 'none' },
  ],
};

function sink() {
  const chunks = [];
  return { write: (s) => chunks.push(s), text: () => chunks.join('') };
}

let dir;
let searchesPath;
let stateDir;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vinted-watch-'));
  searchesPath = join(dir, 'searches.json');
  stateDir = join(dir, 'state');
  await writeFile(searchesPath, JSON.stringify(CONFIG));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function deps(overrides = {}) {
  const fetched = [];
  const opened = [];
  const stdout = sink();
  const stderr = sink();
  let sessionClosed = false;
  const base = {
    searchesPath,
    stateDir,
    limit: 30,
    dryRun: false,
    noOpen: false,
    now: () => new Date('2026-11-05T10:00:00.000Z'),
    openSession: async () => ({ page: {}, close: async () => { sessionClosed = true; } }),
    fetchHtml: async (_page, url) => {
      fetched.push(url);
      return url.includes('search_text=nothing') ? '<html></html>' : FIXTURE;
    },
    openUrl: async (url) => opened.push(url),
    stdout,
    stderr,
    ...overrides,
  };
  return { base, fetched, opened, stdout, stderr, wasClosed: () => sessionClosed };
}

function expectedFlagIds() {
  const items = parseCatalogHtml(FIXTURE, { domain: 'www.vinted.nl' });
  const ok = items.filter((i) => !i.isPromoted && !i.isBusiness);
  const brand = ok.filter((i) => ['alderwick', "fenwyk's"].includes((i.brand ?? '').toLowerCase()) && i.price <= 25);
  const cap = ok.filter((i) => i.price <= 40);
  return new Set([...brand, ...cap].map((i) => i.id));
}

describe('runWatch dry run', () => {
  it('fetches, parses, filters and prints without writing state', async () => {
    const d = deps({ dryRun: true });
    const result = await runWatch(d.base);
    assert.equal(result.exitCode, 0);
    assert.equal(d.fetched.length, 3);
    assert.ok(d.fetched.every((u) => u.includes('catalog[]=5')));
    assert.equal(existsSync(stateDir), false);
    assert.deepEqual(d.opened, []);
    assert.equal(d.wasClosed(), true);
    const out = d.stdout.text();
    assert.match(out, /band-a\s.*96 items/);
    assert.match(out, /quiet\s.*0 items/);
    assert.match(out, /Total/);
    assert.deepEqual(new Set(result.flags.map((f) => f.id)), expectedFlagIds());
    assert.ok(result.flags.length > 0);
  });

  it('respects --limit', async () => {
    const d = deps({ dryRun: true, limit: 1 });
    await runWatch(d.base);
    assert.equal(d.fetched.length, 1);
  });
});

describe('runWatch full run', () => {
  it('writes supply, seen, cursor and report, serves and opens it', async () => {
    const d = deps();
    const result = await runWatch(d.base);
    try {
      assert.equal(result.exitCode, 0);
      const files = (await readdir(stateDir)).sort();
      for (const f of ['vinted-cursor.json', 'vinted-flags.html', 'vinted-seen.json', 'vinted-supply.csv']) {
        assert.ok(files.includes(f), `missing ${f}`);
      }
      const supply = (await readFile(join(stateDir, 'vinted-supply.csv'), 'utf8')).trim().split('\n');
      assert.equal(supply[0], 'firstSeen,queryId,id,brand,price,size,condition,favourites');
      assert.equal(supply.length, 97);
      assert.ok(supply[1].startsWith('2026-11-05T10:00:00.000Z,band-a,900000000,alderwick,5,S,'));
      const report = await readFile(join(stateDir, 'vinted-flags.html'), 'utf8');
      assert.ok(report.includes('Synthetic Wool overcoat 0'));
      assert.equal(d.opened.length, 1);
      assert.equal(d.opened[0], result.server.url);
      const served = await (await fetch(result.server.url)).text();
      assert.equal(served, report);
    } finally {
      await result.server?.close();
    }
  });

  it('dedupes flags and supply rows on a second run', async () => {
    const first = await runWatch(deps({ noOpen: true }).base);
    assert.ok(first.flags.length > 0);
    assert.equal(first.server, null);
    const d = deps({ noOpen: true });
    const second = await runWatch(d.base);
    assert.equal(second.flags.length, 0);
    const supply = (await readFile(join(stateDir, 'vinted-supply.csv'), 'utf8')).trim().split('\n');
    assert.equal(supply.length, 97);
    assert.deepEqual(d.opened, []);
  });

  it('stops on a challenge, keeps what was gathered and exits non-zero', async () => {
    let calls = 0;
    const d = deps({
      noOpen: true,
      fetchHtml: async () => {
        calls += 1;
        if (calls === 2) throw new ChallengeError('challenge', 403);
        return FIXTURE;
      },
    });
    const result = await runWatch(d.base);
    assert.notEqual(result.exitCode, 0);
    assert.equal(calls, 2);
    assert.ok(result.health.some((h) => /challenge/i.test(h)));
    assert.ok(result.flags.length > 0);
    const seen = JSON.parse(await readFile(join(stateDir, 'vinted-seen.json'), 'utf8'));
    assert.equal(Object.keys(seen.items).length, 96);
    const report = await readFile(join(stateDir, 'vinted-flags.html'), 'utf8');
    assert.match(report, /challenge/i);
    assert.match(d.stderr.text(), /challenge/i);
  });

  it('warns when half or more of the searches return 0 items', async () => {
    const d = deps({ dryRun: true, fetchHtml: async (_p, url) => (url.includes('brand_ids') ? FIXTURE : '') });
    const result = await runWatch(d.base);
    assert.equal(result.exitCode, 0);
    assert.ok(result.health.some((h) => /0 items/.test(h)));
  });

  it('records a non-challenge fetch error as a zero-result search', async () => {
    const d = deps({
      dryRun: true,
      fetchHtml: async (_p, url) => {
        if (url.includes('test+phrase') || url.includes('test%20phrase')) throw new Error('HTTP 429');
        return FIXTURE;
      },
    });
    const result = await runWatch(d.base);
    assert.equal(result.exitCode, 0);
    assert.ok(result.health.some((h) => /phrase-x.*429/.test(h)));
  });
});

describe('runWatch config errors', () => {
  it('exits non-zero on a missing searches file', async () => {
    const d = deps({ searchesPath: join(dir, 'missing.json') });
    const result = await runWatch(d.base);
    assert.notEqual(result.exitCode, 0);
    assert.match(d.stderr.text(), /missing\.json/);
    assert.equal(d.fetched.length, 0);
  });

  it('exits non-zero on an unknown brand key', async () => {
    await writeFile(
      searchesPath,
      JSON.stringify({ ...CONFIG, searches: [{ id: 'bad', kind: 'brand-band', brands: ['nope'], flagRule: 'brand' }] }),
    );
    const d = deps();
    const result = await runWatch(d.base);
    assert.notEqual(result.exitCode, 0);
    assert.match(d.stderr.text(), /nope/);
  });
});

describe('parseCliArgs', () => {
  it('parses flags and caps the limit at 30', () => {
    assert.deepEqual(parseCliArgs(['--dry-run', '--limit', '3', '--no-open']), {
      login: false,
      dryRun: true,
      noOpen: true,
      help: false,
      limit: 3,
    });
    assert.equal(parseCliArgs([]).limit, 30);
    assert.equal(parseCliArgs(['--limit', '99']).limit, 30);
    assert.equal(parseCliArgs(['--login']).login, true);
  });

  it('rejects a bad limit or unknown flag', () => {
    assert.throws(() => parseCliArgs(['--limit', '0']));
    assert.throws(() => parseCliArgs(['--limit', 'abc']));
    assert.throws(() => parseCliArgs(['--bogus']));
  });

  it('prints help from the bin', async () => {
    const { stdout } = await promisify(execFile)(process.execPath, [SCRIPT, '--help']);
    assert.match(stdout, /--dry-run/);
    assert.match(stdout, /--login/);
  });
});
