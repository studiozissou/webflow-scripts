// Read-only release preflight for a client loader (on main, clean tree, main not ahead of origin/main by local refs only so the caller must fetch first, listed modules on disk, VERSION an X.Y.Z semver above the last <client>-vX.Y.Z tag, new tag free); usage: node tools/release/preflight.js <client>.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLIENT_RE = /^[a-z0-9][a-z0-9-]*$/;
const VERSION_RE = /\bVERSION\s*=\s*['"]v?(\d+(?:\.\d+)*)['"]/;
const MODULE_LIST_RE = /\b[A-Za-z_$]*modules\s*[:=]\s*\[([^\]]*)\]/gi;
const STRING_RE = /['"]([^'"]+)['"]/g;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

export function tagFor(client, version) {
  return `${client}-v${version}`;
}

export function parseInit(source) {
  const version = source.match(VERSION_RE)?.[1] ?? null;
  const modules = [];
  for (const list of source.matchAll(MODULE_LIST_RE)) {
    for (const [, name] of list[1].matchAll(STRING_RE)) {
      if (!name.includes('://') && !modules.includes(name)) modules.push(name);
    }
  }
  return { version, modules };
}

export function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function clientTags(tags, client) {
  const re = new RegExp(`^${client}-v(\\d+(?:\\.\\d+)*)$`);
  return tags
    .map((t) => t.trim().match(re))
    .filter(Boolean)
    .map((m) => ({ tag: m[0], version: m[1] }))
    .sort((x, y) => compareVersions(x.version, y.version));
}

function gitIn(repoRoot) {
  return (...args) =>
    execFileSync('git', ['--no-optional-locks', ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
}

export function preflight({ repoRoot = REPO_ROOT, client }) {
  const failures = [];
  if (!CLIENT_RE.test(client || '')) {
    return { ok: false, tag: null, version: null, failures: [`Invalid client name "${client}"`] };
  }
  const git = gitIn(repoRoot);

  try {
    const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    if (branch !== 'main') failures.push(`On branch "${branch}"; releases are cut from main`);
  } catch (err) {
    failures.push(`Could not read the current branch: ${err.message}`);
  }

  try {
    const status = git('status', '--porcelain');
    if (status) failures.push(`Working tree is not clean:\n${status}`);
  } catch (err) {
    failures.push(`Could not read git status: ${err.message}`);
  }

  try {
    git('rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main');
    const ahead = Number(git('rev-list', '--count', 'refs/remotes/origin/main..refs/heads/main'));
    if (ahead > 0) failures.push(`main is ${ahead} commit(s) ahead of origin/main; push first`);
  } catch {
    failures.push('No origin/main ref to compare against; fetch or push main first');
  }

  const dir = join(repoRoot, 'projects', client);
  const initPath = join(dir, 'init.js');
  let version = null;
  if (!existsSync(initPath)) {
    failures.push(`projects/${client}/init.js not found`);
  } else {
    const parsed = parseInit(readFileSync(initPath, 'utf8'));
    version = parsed.version;
    if (!parsed.modules.length) failures.push(`No module list found in projects/${client}/init.js`);
    for (const m of parsed.modules) {
      if (!existsSync(join(dir, m))) failures.push(`Module listed in init.js is missing: projects/${client}/${m}`);
    }
    if (!version) failures.push(`No VERSION found in projects/${client}/init.js`);
  }

  const semver = Boolean(version) && SEMVER_RE.test(version);
  if (version && !semver) failures.push(`VERSION must be X.Y.Z to cut a ${client}-vX.Y.Z tag`);

  const tag = semver ? tagFor(client, version) : null;
  if (semver) {
    let tags = [];
    try {
      tags = clientTags(git('tag', '--list', `${client}-v*`).split('\n'), client);
    } catch (err) {
      failures.push(`Could not list tags: ${err.message}`);
    }
    const latest = tags.at(-1);
    if (latest && compareVersions(version, latest.version) <= 0) {
      failures.push(`VERSION ${version} is not above the latest tag ${latest.tag}; bump VERSION in init.js`);
    }
    if (tags.some((t) => t.tag === tag)) failures.push(`Tag ${tag} already exists`);
  }

  return { ok: failures.length === 0, tag, version, failures };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [client] = process.argv.slice(2);
  const { ok, tag, failures } = preflight({ client });
  if (ok) {
    process.stdout.write(`Preflight OK: would cut ${tag}\n`);
  } else {
    process.stderr.write(`Preflight failed for ${client}:\n${failures.map((f) => `- ${f}`).join('\n')}\n`);
    process.exit(1);
  }
}
