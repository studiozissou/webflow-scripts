// Tests for scripts/site-report-monthly.sh with a fake claude and a fake notion CLI, so no real run, no network and no client folder is touched.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, tempDir } from './helpers.js';

const SCRIPT = join(ROOT, 'scripts', 'site-report-monthly.sh');
const PLIST = join(ROOT, 'scripts', 'site-report-monthly.plist');
const MONTH = '2026-10';

const FAKE_CLAUDE = `#!/bin/bash
client=$(printf '%s' "$2" | awk '{print $2}')
printf '%s\\n' "$@" > "$FAKE_LOG/$client.args"
echo "\${ANTHROPIC_API_KEY:-unset}" > "$FAKE_LOG/$client.key"
case " $FAKE_FAIL " in *" $client "*) echo "boom" >&2; exit 3;; esac
case " $FAKE_SLOW " in *" $client "*) exec sleep 20;; esac
touch "$FAKE_PROJECTS/$client/.claude/reports/report-$FAKE_MONTH.done"
`;

const FAKE_NOTION = `
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.FAKE_LOG + '/notion.calls', process.argv.slice(2).join(' ') + '\\n');
`;

function sandbox({ clients = {}, allowlist = true } = {}) {
  const root = tempDir('site-report-run-');
  const projects = join(root, 'projects');
  const dir = join(root, 'private');
  const log = join(root, 'calls');
  for (const d of [projects, dir, log]) mkdirSync(d, { recursive: true });
  for (const [name, files] of Object.entries(clients)) {
    const reports = join(projects, name, '.claude', 'reports');
    mkdirSync(reports, { recursive: true });
    for (const file of files) writeFileSync(join(reports, file), '{}');
  }
  const claude = join(root, 'claude');
  writeFileSync(claude, FAKE_CLAUDE);
  chmodSync(claude, 0o755);
  const notion = join(root, 'notion-cli.mjs');
  writeFileSync(notion, FAKE_NOTION);
  const allowed = join(dir, 'allowed-tools.txt');
  if (allowlist) writeFileSync(allowed, '# tools\nmcp__fake__read\nBash(node tools/site-report/*)\n');
  return { root, projects, dir, log, claude, notion, allowed };
}

function run(box, extra = {}) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  Object.assign(env, {
    ANTHROPIC_API_KEY: 'sk-test-should-not-reach-claude',
    NOTION_TOKEN: 'test-token',
    CLAUDE_BIN: box.claude,
    SITE_REPORT_DIR: box.dir,
    SITE_REPORT_PROJECTS: box.projects,
    SITE_REPORT_ALLOWLIST: box.allowed,
    SITE_REPORT_NOTION_CLI: box.notion,
    SITE_REPORT_MONTH: MONTH,
    FAKE_LOG: box.log,
    FAKE_PROJECTS: box.projects,
    FAKE_MONTH: MONTH,
    FAKE_FAIL: '',
    FAKE_SLOW: '',
    ...extra,
  });
  const result = spawnSync('bash', [SCRIPT], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
  return { ...result, out: `${result.stdout}${result.stderr}` };
}

const called = (box) =>
  readdirSync(box.log)
    .filter((f) => f.endsWith('.args'))
    .map((f) => f.replace('.args', ''))
    .sort();
const notionCalls = (box) =>
  existsSync(join(box.log, 'notion.calls')) ? readFileSync(join(box.log, 'notion.calls'), 'utf8').trim().split('\n') : [];
const done = (box, client) => existsSync(join(box.projects, client, '.claude', 'reports', `report-${MONTH}.done`));

describe('dry run', () => {
  it('lists clients with goals.json, skips off and done, and touches nothing', () => {
    const box = sandbox({
      clients: {
        alder: ['goals.json'],
        birch: ['goals.json', 'site-report.off'],
        cedar: ['goals.json', `report-${MONTH}.done`],
        elm: ['goals.json'],
        fir: ['notes.md'],
      },
    });
    const before = readdirSync(box.dir);
    const result = run(box, { SITE_REPORT_DRY_RUN: '1' });
    assert.equal(result.status, 0, result.out);
    assert.match(result.stdout, /would run: alder, elm/);
    assert.match(result.stdout, /skipped: birch \(off\)/);
    assert.match(result.stdout, /skipped: cedar \(done\)/);
    assert.doesNotMatch(result.out, /fir/);
    assert.deepEqual(called(box), []);
    assert.deepEqual(notionCalls(box), []);
    assert.deepEqual(readdirSync(box.dir), before);
  });

  it('uses the previous month when no month is set', () => {
    const box = sandbox({ clients: { alder: ['goals.json'] } });
    const now = new Date();
    const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    writeFileSync(join(box.projects, 'alder', '.claude', 'reports', `report-${previous}.done`), '');
    const result = run(box, { SITE_REPORT_DRY_RUN: '1', SITE_REPORT_MONTH: '' });
    assert.match(result.stdout, /skipped: alder \(done\)/);
  });
});

describe('refusals', () => {
  it('refuses to run without the allowlist', () => {
    const box = sandbox({ clients: { alder: ['goals.json'] }, allowlist: false });
    const result = run(box);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /allowlist/);
    assert.deepEqual(called(box), []);
  });

  it('does nothing while the global off switch exists', () => {
    const box = sandbox({ clients: { alder: ['goals.json'] } });
    writeFileSync(join(box.dir, 'site-report.off'), '');
    const result = run(box);
    assert.equal(result.status, 0);
    assert.match(result.out, /site-report\.off/);
    assert.deepEqual(called(box), []);
  });

  it('a live lock blocks a second run, and a stale lock is taken over', () => {
    const box = sandbox({ clients: { alder: ['goals.json'] } });
    const lock = join(box.dir, 'monthly.lock');
    mkdirSync(lock);
    writeFileSync(join(lock, 'pid'), String(process.pid));
    const blocked = run(box);
    assert.equal(blocked.status, 0);
    assert.match(blocked.out, /already running/);
    assert.deepEqual(called(box), []);
    writeFileSync(join(lock, 'pid'), '999999');
    const taken = run(box);
    assert.equal(taken.status, 0, taken.out);
    assert.deepEqual(called(box), ['alder']);
    assert.equal(existsSync(lock), false);
  });
});

describe('a real run', () => {
  it('runs the headless call with the allowlist and never passes the API key', () => {
    const box = sandbox({ clients: { alder: ['goals.json'] } });
    const result = run(box);
    assert.equal(result.status, 0, result.out);
    const args = readFileSync(join(box.log, 'alder.args'), 'utf8').split('\n');
    assert.equal(args[0], '-p');
    assert.equal(args[1], '/site-audit alder --report-only --unattended');
    assert.ok(args.includes('--allowedTools'));
    assert.ok(args.includes('mcp__fake__read'));
    assert.ok(args.includes('Bash(node tools/site-report/*)'));
    assert.equal(readFileSync(join(box.log, 'alder.key'), 'utf8').trim(), 'unset');
    assert.ok(existsSync(join(box.dir, 'logs', `${MONTH}.log`)));
  });

  it('one failure and one timeout do not stop the next client', () => {
    const box = sandbox({ clients: { alder: ['goals.json'], birch: ['goals.json'], cedar: ['goals.json'] } });
    const result = run(box, { FAKE_FAIL: 'alder', FAKE_SLOW: 'birch', SITE_REPORT_MAX_SECONDS: '1' });
    assert.notEqual(result.status, 0);
    assert.deepEqual(called(box), ['alder', 'birch', 'cedar']);
    assert.equal(done(box, 'alder'), false);
    assert.equal(done(box, 'birch'), false);
    assert.equal(done(box, 'cedar'), true);
    assert.equal(notionCalls(box).length, 1);
    assert.match(notionCalls(box)[0], /^create-task --title Review cedar report/);
    const log = readFileSync(join(box.dir, 'logs', `${MONTH}.log`), 'utf8');
    assert.match(log, /failed: alder/);
    assert.match(log, /failed: birch.*timed out/);
    assert.match(log, /ok: cedar/);
  });

  it('a client with a .done file is skipped, so a re-run makes no second draft or task', () => {
    const box = sandbox({ clients: { alder: ['goals.json'], birch: ['goals.json'] } });
    assert.equal(run(box).status, 0);
    assert.equal(notionCalls(box).length, 2);
    const again = run(box);
    assert.equal(again.status, 0);
    assert.match(again.out, /skipped: alder \(done\)/);
    assert.equal(notionCalls(box).length, 2);
  });

  it('counts a run that exits 0 but wrote no .done file as a failure and makes no task', () => {
    const box = sandbox({ clients: { alder: ['goals.json'] } });
    const result = run(box, { FAKE_MONTH: '1999-01' });
    assert.notEqual(result.status, 0);
    assert.deepEqual(notionCalls(box), []);
  });
});

describe('script and plist', () => {
  const script = readFileSync(SCRIPT, 'utf8');
  const plist = readFileSync(PLIST, 'utf8');

  it('uses the shared helpers and the time guard, and never exports the API key', () => {
    assert.match(script, /lib\/triage-common\.sh/);
    for (const name of ['triage_env', 'triage_claude_bin', 'load_allowlist']) assert.match(script, new RegExp(name));
    assert.match(script, /perl -e 'alarm shift; exec @ARGV'/);
    assert.doesNotMatch(script, /export\s+ANTHROPIC_API_KEY/);
  });

  it('the plist runs on day 3 at 07:00', () => {
    assert.match(plist, /<key>Day<\/key>\s*<integer>3<\/integer>/);
    assert.match(plist, /<key>Hour<\/key>\s*<integer>7<\/integer>/);
    assert.match(plist, /<key>Minute<\/key>\s*<integer>0<\/integer>/);
    assert.match(plist, /site-report-monthly\.sh/);
  });

  it('names no client', () => {
    const names = new RegExp(
      [
        ['car', 'sa'],
        ['\\boo', 'st\\b'],
        ['rol', 'fing'],
      ]
        .map((p) => p.join(''))
        .join('|'),
      'i',
    );
    assert.equal(names.test(script), false);
    assert.equal(names.test(plist), false);
  });
});
