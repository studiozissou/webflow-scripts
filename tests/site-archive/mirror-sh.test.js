// Tests mirror.sh end to end against a local sitemap server, with a fake wget on PATH that records its arguments.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, '..', '..', 'tools', 'site-archive', 'mirror.sh');
const CDN = 'cdn.prod.website-files.com,uploads-ssl.webflow.com,assets.website-files.com,daks2k3a4ib2z.cloudfront.net,d3e54v103j8qbb.cloudfront.net';

let server;
let base;
let sitemap = '';

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/sitemap.xml' && sitemap) {
      res.writeHead(200, { 'content-type': 'application/xml' });
      res.end(sitemap);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((r) => server.close(r)));

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'site-archive-'));
  const bin = join(dir, 'bin');
  const log = join(dir, 'wget.log');
  const wget = join(bin, 'wget');
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    wget,
    '#!/usr/bin/env bash\nfor a in "$@"; do printf "%s\\n" "$a" >> "$WGET_LOG"; done\nprintf -- "--END--\\n" >> "$WGET_LOG"\nexit "${FAKE_WGET_EXIT:-0}"\n',
  );
  chmodSync(wget, 0o755);
  return { dir, bin, log, out: join(dir, 'out') };
}

function calls(log) {
  return readFileSync(log, 'utf8')
    .split('--END--\n')
    .filter(Boolean)
    .map((c) => c.split('\n').filter(Boolean));
}

const env = (ctx, extra = {}) => ({ ...process.env, PATH: `${ctx.bin}:${process.env.PATH}`, WGET_LOG: ctx.log, ...extra });

test('mirrors the start URL with the archive flags, its host twin and the Webflow CDN hosts', async () => {
  sitemap = '';
  const ctx = setup();
  await run('bash', [SCRIPT, `${base}/`, ctx.out], { env: env(ctx) });
  const [first, ...rest] = calls(ctx.log);
  for (const flag of ['--mirror', '--page-requisites', '--convert-links', '--adjust-extension', '--span-hosts']) {
    assert.ok(first.includes(flag), flag);
  }
  assert.ok(first.includes('-e') && first[first.indexOf('-e') + 1] === 'robots=off');
  assert.ok(first.includes(`--domains=127.0.0.1,www.127.0.0.1,${CDN}`));
  assert.ok(first.includes(`--directory-prefix=${join(ctx.out, 'site')}`));
  assert.equal(first.at(-1), `${base}/`);
  assert.equal(rest.length, 0, 'no sitemap, so no second wget run');
});

test('then mirrors every other sitemap URL with the same flags', async () => {
  sitemap = `<urlset><url><loc>${base}/</loc></url><url><loc>${base}/about</loc></url><url><loc>${base}/work/a</loc></url></urlset>`;
  const ctx = setup();
  await run('bash', [SCRIPT, `${base}/`, ctx.out], { env: env(ctx) });
  const [first, second] = calls(ctx.log);
  assert.ok(second, 'second wget run');
  assert.deepEqual(second.slice(0, first.length - 1), first.slice(0, -1));
  const listFile = second.find((a) => a.startsWith('--input-file='))?.slice('--input-file='.length);
  assert.ok(listFile, 'second run reads the sitemap list with --input-file=');
  assert.deepEqual(readFileSync(listFile, 'utf8').trim().split('\n'), [`${base}/about`, `${base}/work/a`]);
});

test('writes an executable serve.sh that serves site/ on port 8080', async () => {
  sitemap = '';
  const ctx = setup();
  await run('bash', [SCRIPT, `${base}/`, ctx.out], { env: env(ctx) });
  const serve = join(ctx.out, 'serve.sh');
  const body = readFileSync(serve, 'utf8');
  assert.ok(statSync(serve).mode & 0o100, 'executable');
  assert.match(body, /python3 -m http\.server 8080/);
  assert.match(body, /cd "\$\(dirname "\$0"\)\/site"/);
  assert.match(body, /127\.0\.0\.1/, 'prints where the homepage is');
});

test('tolerates wget exit 8 (some files 404) but fails on other wget errors', async () => {
  sitemap = '';
  const ok = setup();
  await run('bash', [SCRIPT, `${base}/`, ok.out], { env: env(ok, { FAKE_WGET_EXIT: '8' }) });
  assert.ok(existsSync(join(ok.out, 'serve.sh')));
  const bad = setup();
  await assert.rejects(run('bash', [SCRIPT, `${base}/`, bad.out], { env: env(bad, { FAKE_WGET_EXIT: '4' }) }));
});

test('tolerates wget exit 6 (password-protected pages return 401)', async () => {
  sitemap = '';
  const ctx = setup();
  await run('bash', [SCRIPT, `${base}/`, ctx.out], { env: env(ctx, { FAKE_WGET_EXIT: '6' }) });
  assert.ok(existsSync(join(ctx.out, 'serve.sh')));
});

test('strips integrity and crossorigin from mirrored HTML so rewritten CSS and JS still load offline', async () => {
  sitemap = '';
  const ctx = setup();
  const page = join(ctx.out, 'site', '127.0.0.1', 'index.html');
  mkdirSync(dirname(page), { recursive: true });
  writeFileSync(
    page,
    '<link href="../cdn/a.css" rel="stylesheet" integrity="sha384-abc+/=" crossorigin="anonymous"/><script src="../cdn/b.js" type="text/javascript" integrity="sha384-def" crossorigin="anonymous"></script>',
  );
  await run('bash', [SCRIPT, `${base}/`, ctx.out], { env: env(ctx) });
  const html = readFileSync(page, 'utf8');
  assert.doesNotMatch(html, /integrity=|crossorigin=/);
  assert.match(html, /<link href="\.\.\/cdn\/a\.css" rel="stylesheet"\/>/);
  assert.match(html, /<script src="\.\.\/cdn\/b\.js" type="text\/javascript"><\/script>/);
});

test('prints usage and exits non-zero without both arguments', async () => {
  await assert.rejects(run('bash', [SCRIPT]), (err) => err.code === 64 && /usage/.test(err.stderr));
});
