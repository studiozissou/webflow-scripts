// Checks every hosted file of the given tags on the CDN (200, MIME, CORS, immutable cache, bytes equal to the git blob, generated .min.js compiles) and prints one summary line; usage: node tools/release/cdn-verify.js --all | --tag <tag>.
import vm from 'node:vm';
import { clientFor, gitSource, hostedFiles, IMMUTABLE, isClassicScript, minPathFor, readConfig } from './cdn-build.js';
import { FETCH_TIMEOUT_MS, fetchProblem, pool, runCli } from './cdn-common.js';

const CONCURRENCY = 8;
const MIME = {
  '.js': ['application/javascript', 'text/javascript'],
  '.css': ['text/css'],
  '.woff2': ['font/woff2']
};

export function cdnUrl(host, tag, path) {
  return `https://${host}/${tag}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export function mimeFor(path) {
  const ext = Object.keys(MIME).find((e) => path.endsWith(e));
  return ext ? MIME[ext] : [];
}

export async function checkFile({ url, expected, fetch = globalThis.fetch }) {
  const problems = [];
  let res;
  let body;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    body = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    return [fetchProblem(err)];
  }
  if (res.status !== 200) return [`status ${res.status}`];
  const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const pathname = new URL(url).pathname;
  if (!mimeFor(pathname).includes(mime)) problems.push(`MIME ${mime || '(none)'}, want ${mimeFor(pathname).join(' or ')}`);
  if (res.headers.get('access-control-allow-origin') !== '*') problems.push('Access-Control-Allow-Origin is not *');
  if (res.headers.get('cache-control') !== IMMUTABLE) problems.push(`Cache-Control is "${res.headers.get('cache-control') ?? ''}", want "${IMMUTABLE}"`);
  if (expected == null) {
    try {
      new vm.Script(body.toString('utf8'), { filename: url });
    } catch (err) {
      problems.push(`does not compile: ${err.message}`);
    }
  } else if (!body.equals(expected)) {
    problems.push(`bytes differ from git (${body.length} B on CDN, ${expected.length} B in git)`);
  }
  return problems;
}

export async function verify({ host, tags, fetch = globalThis.fetch, readBlob, lsTree, config = readConfig() }) {
  const listed = tags.filter((tag) => clientFor(tag, config));
  const jobs = [];
  for (const tag of listed) {
    const files = hostedFiles({ tag, config, lsTree });
    const present = new Set(files);
    for (const path of files) {
      const blob = readBlob(tag, path);
      jobs.push({ url: cdnUrl(host, tag, path), expected: blob });
      const minPath = minPathFor(path, present);
      if (minPath && isClassicScript(blob.toString('utf8'))) jobs.push({ url: cdnUrl(host, tag, minPath), expected: null });
    }
  }
  const results = await pool(jobs, CONCURRENCY, async (job) => ({
    url: job.url,
    problems: await checkFile({ url: job.url, expected: job.expected, fetch })
  }));
  const failures = results.filter((r) => r.problems.length);
  return {
    failures,
    line: `Verified ${jobs.length} files across ${listed.length} tags: ${failures.length} failures`,
    exitCode: failures.length || !jobs.length ? 1 : 0
  };
}

async function main(args) {
  const config = readConfig();
  const tagAt = args.indexOf('--tag');
  let tags;
  if (tagAt !== -1) {
    const tag = args[tagAt + 1];
    if (!tag || !clientFor(tag, config)) throw new Error(`--tag needs a tag of a client in cdn-config.json clients, got "${tag ?? ''}"`);
    tags = [tag];
  } else if (!args.includes('--all')) {
    throw new Error('Usage: npm run cdn:verify -- --all | --tag <tag>');
  }
  const source = gitSource({ tags, config });
  if (tags && !source.tags.length) throw new Error(`Tag ${tags[0]} not found`);
  const result = await verify({ host: config.host, tags: source.tags, readBlob: source.readBlob, lsTree: source.lsTree, config });
  for (const f of result.failures) process.stderr.write(`FAIL ${f.url}\n${f.problems.map((p) => `  - ${p}`).join('\n')}\n`);
  process.stdout.write(`${result.line}\n`);
  process.exitCode = result.exitCode;
}

runCli(import.meta.url, main);
