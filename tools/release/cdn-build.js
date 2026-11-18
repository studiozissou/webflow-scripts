// Builds dist/ for the Cloudflare Pages CDN from the git tags of the clients in cdn-config.json (hosted files, a .min.js beside each .js, _headers, 404.html, manifest.json) and, with --check-live, guards the deploy against the live manifest; usage: node tools/release/cdn-build.js [--check-live --bootstrap=<bool> --allow-changes=<bool>].
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { minify as terserMinify } from 'terser';
import { FETCH_TIMEOUT_MS, fetchProblem, runCli } from './cdn-common.js';
import { gitIn } from './preflight.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CONFIG_PATH = join(HERE, 'cdn-config.json');
const TAG_RE = /^[a-z0-9.-]+$/;
const CLIENT_OF_TAG_RE = /^(.+?)-v\d/;
const TEST_FILE_RE = /\.(?:test|spec)\.js$/;
const DENIED_NAMES = ['serve-cors.js'];
export const IMMUTABLE = 'public, max-age=31536000, immutable';
const SYMLINK_MODE = '120000';

export function readConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
}

export function clientFor(tag, config) {
  const client = String(tag).match(CLIENT_OF_TAG_RE)?.[1];
  if (!client || !config.clients.includes(client)) return null;
  if (!TAG_RE.test(tag)) throw new Error(`Invalid tag "${tag}": use only a-z, 0-9, "." and "-"`);
  return client;
}

function rootsFor(client, config) {
  return config.roots.map((root) => root.replaceAll('{client}', client));
}

export function isHosted(path, config) {
  const segments = String(path).split('/');
  if (segments.some((s) => !s || s.startsWith('.') || config.deniedSegments.includes(s))) return false;
  const name = segments.at(-1);
  if (!config.extensions.some((ext) => name.endsWith(ext))) return false;
  if (TEST_FILE_RE.test(name) || DENIED_NAMES.includes(name)) return false;
  return config.clients.some((client) => rootsFor(client, config).some((root) => path.startsWith(`${root}/`)));
}

export function hostedFiles({ tag, config, lsTree }) {
  const client = clientFor(tag, config);
  if (!client) return [];
  const roots = rootsFor(client, config);
  return lsTree(tag, roots)
    .filter((path) => roots.some((root) => path.startsWith(`${root}/`)) && isHosted(path, config))
    .sort();
}

export function isClassicScript(source) {
  try {
    new vm.Script(source);
    return true;
  } catch {
    return false;
  }
}

async function minifyJs(source, path) {
  try {
    const { code } = await terserMinify(source, { compress: true, mangle: true });
    return code;
  } catch (err) {
    throw new Error(`Could not minify ${path}: ${err.message}`, { cause: err });
  }
}

export function minPathFor(path, present) {
  if (!path.endsWith('.js') || path.endsWith('.min.js')) return null;
  const minPath = path.replace(/\.js$/, '.min.js');
  return present.has(minPath) ? null : minPath;
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

export function headersFile() {
  return [
    '/*',
    '  Access-Control-Allow-Origin: *',
    '  X-Content-Type-Options: nosniff',
    '  Cross-Origin-Resource-Policy: cross-origin',
    '/:tag/projects/*',
    `  Cache-Control: ${IMMUTABLE}`,
    '/:tag/shared/*',
    `  Cache-Control: ${IMMUTABLE}`,
    '/:tag/styles/*',
    `  Cache-Control: ${IMMUTABLE}`,
    '/manifest.json',
    '  Cache-Control: no-store',
    ''
  ].join('\n');
}

const NOT_FOUND_HTML = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>404 Not Found</title></head><body><h1>404 Not Found</h1></body></html>\n';

export async function buildDist({ outDir, tags, config, readBlob, lsTree, minify = minifyJs }) {
  const manifest = [];
  const write = (tag, rel, buf) => {
    const path = `${tag}/${rel}`;
    const file = join(outDir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, buf);
    manifest.push({ tag, path, sha256: sha256(buf) });
  };
  for (const tag of tags) {
    const files = hostedFiles({ tag, config, lsTree });
    const present = new Set(files);
    for (const rel of files) {
      const buf = readBlob(tag, rel);
      write(tag, rel, buf);
      const minRel = minPathFor(rel, present);
      if (minRel && isClassicScript(buf.toString('utf8'))) write(tag, minRel, Buffer.from(await minify(buf.toString('utf8'), rel)));
    }
  }
  manifest.sort(byPath);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, '_headers'), headersFile());
  writeFileSync(join(outDir, '404.html'), NOT_FOUND_HTML);
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function diffManifest(live, next) {
  const before = new Map(live.map((e) => [e.path, e.sha256]));
  const after = new Map(next.map((e) => [e.path, e.sha256]));
  return {
    added: [...after.keys()].filter((p) => !before.has(p)).sort(),
    changed: [...after.keys()].filter((p) => before.has(p) && before.get(p) !== after.get(p)).sort(),
    removed: [...before.keys()].filter((p) => !after.has(p)).sort()
  };
}

export async function checkLive({ host, next, fetch = globalThis.fetch, bootstrap = false, allowChanges = false }) {
  const url = `https://${host}/manifest.json`;
  const fail = (message) => ({ ok: false, failures: [message], diff: null });
  let live;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.status === 404 && bootstrap) live = [];
    else if (res.status === 404) return fail(`${url} returned 404; run with bootstrap=true only for the first publish`);
    else if (res.status !== 200) return fail(`${url} returned status ${res.status}`);
    else live = await res.json();
  } catch (err) {
    return fail(`${url} ${fetchProblem(err)}`);
  }
  if (!Array.isArray(live)) return fail(`${url} is not a manifest array`);
  const diff = diffManifest(live, next);
  const failures = [];
  if (!allowChanges) {
    for (const p of diff.changed) failures.push(`Changed on the live CDN: ${p}`);
    for (const p of diff.removed) failures.push(`Removed from the live CDN: ${p}`);
  }
  return { ok: failures.length === 0, failures, diff };
}

function catFileBatch(repoRoot, input) {
  return execFileSync('git', ['--no-optional-locks', 'cat-file', '--batch'], {
    cwd: repoRoot,
    input,
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function parseBatch(out) {
  const blobs = new Map();
  let at = 0;
  while (at < out.length) {
    const end = out.indexOf(0x0a, at);
    const [oid, type, size] = out.subarray(at, end).toString('utf8').split(' ');
    if (type !== 'blob') throw new Error(`git cat-file: ${oid} is ${type ?? 'unreadable'}`);
    const start = end + 1;
    blobs.set(oid, out.subarray(start, start + Number(size)));
    at = start + Number(size) + 1;
  }
  return blobs;
}

export function gitSource({ repoRoot = REPO_ROOT, tags, config }) {
  const git = gitIn(repoRoot);
  const existing = git('tag', '--list').split('\n').map((t) => t.trim());
  const list = (tags ?? existing)
    .filter((t) => t && existing.includes(t) && clientFor(t, config))
    .sort();
  const trees = new Map();
  for (const tag of list) {
    const roots = rootsFor(clientFor(tag, config), config);
    const out = git('ls-tree', '-r', '-z', `refs/tags/${tag}`, '--', ...roots);
    const files = new Map();
    for (const entry of out.split('\0').filter(Boolean)) {
      const [meta, path] = entry.split('\t');
      const [mode, type, oid] = meta.split(' ');
      if (type === 'blob' && mode !== SYMLINK_MODE) files.set(path, oid);
    }
    trees.set(tag, files);
  }
  const oids = [...new Set([...trees.values()].flatMap((files) => [...files.values()]))];
  const blobs = oids.length ? parseBatch(catFileBatch(repoRoot, `${oids.join('\n')}\n`)) : new Map();
  return {
    tags: list,
    lsTree: (tag) => [...(trees.get(tag)?.keys() ?? [])],
    readBlob: (tag, path) => {
      const blob = blobs.get(trees.get(tag)?.get(path));
      if (!blob) throw new Error(`No blob for ${tag}:${path}`);
      return blob;
    }
  };
}

function flag(args, name) {
  return args.includes(`--${name}`) || args.includes(`--${name}=true`);
}

async function main(args) {
  const config = readConfig();
  const outDir = join(REPO_ROOT, 'dist');
  if (args.includes('--check-live')) {
    const next = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    const { ok, failures, diff } = await checkLive({
      host: config.host,
      next,
      bootstrap: flag(args, 'bootstrap'),
      allowChanges: flag(args, 'allow-changes')
    });
    if (diff) process.stdout.write(`Live manifest diff: ${diff.added.length} added, ${diff.changed.length} changed, ${diff.removed.length} removed\n`);
    if (!ok) {
      process.stderr.write(`${failures.map((f) => `- ${f}`).join('\n')}\n`);
      process.exitCode = 1;
    }
    return;
  }
  const { tags, lsTree, readBlob } = gitSource({ config });
  rmSync(outDir, { recursive: true, force: true });
  const manifest = await buildDist({ outDir, tags, config, readBlob, lsTree });
  process.stdout.write(`Built ${manifest.length} files for ${tags.length} tags in dist/\n`);
}

runCli(import.meta.url, main);
