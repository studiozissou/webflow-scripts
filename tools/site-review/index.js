#!/usr/bin/env node
// Command-line entry point for site-review: parses flags, loads the client crawl config, runs the pipeline and writes facts.ndjson, findings.json, report.md and snapshot.json.

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { loadConfig } from './config.js';
import { createLogger } from './lib/logger.js';
import { runAudit } from './lib/runner.js';
import { createNdjsonWriter } from './lib/ndjson.js';
import { readSnapshot, writeSnapshot, findPreviousSnapshot } from './lib/snapshot.js';
import { buildParity } from './lib/report/parity.js';
import { generateJsonReport } from './lib/report/json-report.js';
import { generateMarkdownReport } from './lib/report/markdown-report.js';

const USAGE = `site-review: crawl a site and report only what it can prove

Usage:
  node tools/site-review/index.js --url <root> [--client <slug>] [flags]

Flags:
  --url <url>              Root URL (required unless the client config has one)
  --client <slug>          Load <internal>/projects/<slug>/.claude/crawl.config.json and write to its audits/crawl folder
  --config <path>          Crawl config file (overrides the client lookup)
  --mode <audit|quick>     audit renders and re-verifies; default audit with --client, quick without
  --render-sample <n>      Rendered pages per template (default 20)
  --render-max <n>         Cap on rendered pages per run
  --render-drift <n>       Extra drift pages per template, seeded by run month (default 5)
  --no-render              Skip the rendered-DOM confirmation
  --no-reverify            Skip the re-verify pass
  --user-agent <ua>        Override the user agent
  --concurrency <n>        Requests per host (default 4)
  --compare <dir|file>     Snapshot to diff against (default: latest earlier snapshot for the client)
  --semrush-counts <path>  semrush-counts-<date>.json for the parity table
  --pages <a,b>            Crawl these paths instead of the sitemap
  --skip <name,name>       Check modules to skip (reported as not_run)
  --tier <n>               Highest check tier to run (default 1)
  --out <dir>              Output directory (alias --output)
  --verbose                Log stage timings
  --help                   Show this help`;

function parseArgs(argv) {
  const args = { skip: [], tier: 1, render: undefined, reverify: undefined };
  const take = (i) => argv[i + 1];
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const numeric = (name) => {
      args[name] = Number(take(i));
      i++;
    };
    switch (flag) {
      case '--url': args.url = take(i); i++; break;
      case '--client': args.client = take(i); i++; break;
      case '--config': args.config = take(i); i++; break;
      case '--mode': args.mode = take(i); i++; break;
      case '--render-sample': numeric('renderSample'); break;
      case '--render-max': numeric('renderMax'); break;
      case '--render-drift': numeric('renderDrift'); break;
      case '--concurrency': numeric('concurrency'); break;
      case '--tier': numeric('tier'); break;
      case '--no-render': args.render = false; break;
      case '--no-reverify': args.reverify = false; break;
      case '--user-agent': args.userAgent = take(i); i++; break;
      case '--compare': args.compare = take(i); i++; break;
      case '--semrush-counts': args.semrushCounts = take(i); i++; break;
      case '--pages': args.pages = take(i).split(',').map((p) => p.trim()).filter(Boolean); i++; break;
      case '--skip': args.skip = take(i).split(',').map((s) => s.trim()).filter(Boolean); i++; break;
      case '--out':
      case '--output': args.out = take(i); i++; break;
      case '--verbose': args.verbose = true; break;
      case '--help':
      case '-h': args.help = true; break;
      default: throw new Error(`Unknown flag ${flag}`);
    }
  }
  return args;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function resolveInternalDir(env = process.env) {
  const candidates = [env.WEBFLOW_INTERNAL, join(homedir(), 'webflow-internal')].filter(Boolean);
  for (const dir of candidates) if (await exists(dir)) return dir;
  return null;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function loadClientConfig({ client, configPath, internalDir }) {
  if (configPath) return readJson(resolve(configPath));
  if (!client) return {};
  const path = join(internalDir, 'projects', client, '.claude', 'crawl.config.json');
  return (await exists(path)) ? readJson(path) : {};
}

function overrides(args) {
  const out = {};
  for (const key of ['renderSample', 'renderMax', 'renderDrift', 'concurrency', 'userAgent']) {
    if (args[key] !== undefined && !Number.isNaN(args[key])) out[key] = args[key];
  }
  return out;
}

async function previousFor(args, outDir, date) {
  if (args.compare) {
    const path = args.compare.endsWith('.json') ? args.compare : join(args.compare, 'snapshot.json');
    return readSnapshot(resolve(path));
  }
  if (!args.client) return null;
  const path = await findPreviousSnapshot(dirname(outDir), date);
  return path ? readSnapshot(path) : null;
}

export async function main(argv = process.argv, env = process.env) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stderr.write(`${USAGE}\n`);
    return 0;
  }

  const internalDir = args.client || !args.out ? await resolveInternalDir(env) : null;
  if (args.client && !internalDir && !args.out) {
    throw new Error('No webflow-internal checkout found: set WEBFLOW_INTERNAL or clone it to ~/webflow-internal');
  }
  const clientConfig = await loadClientConfig({ client: args.client, configPath: args.config, internalDir });
  const url = args.url ?? clientConfig.url;
  if (!url) {
    process.stderr.write(`${USAGE}\n`);
    return 1;
  }

  const config = loadConfig();
  config.crawl = { ...config.crawl, ...clientConfig, ...overrides(args), url };
  const mode = args.mode ?? (args.client ? 'audit' : 'quick');
  if (!['audit', 'quick'].includes(mode)) throw new Error('--mode must be audit or quick');
  const log = createLogger(args.verbose);
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const host = new URL(url).hostname;
  const outDir = resolve(
    args.out ??
      (args.client
        ? join(internalDir, 'projects', args.client, '.claude', 'audits', 'crawl', date)
        : join(import.meta.dirname, 'reports', `${host}-${date}`)),
  );
  await mkdir(outDir, { recursive: true });

  const previousSnapshot = await previousFor(args, outDir, date);
  const semrushCounts = args.semrushCounts ? await readJson(resolve(args.semrushCounts)) : null;
  const writer = createNdjsonWriter(join(outDir, 'facts.ndjson'));

  process.stderr.write(`site-review ${mode} on ${url}\n`);
  let result;
  try {
    result = await runAudit({
      url,
      client: args.client ?? null,
      mode,
      tier: args.tier,
      skip: args.skip,
      pages: args.pages,
      config,
      log,
      render: args.render ?? mode === 'audit',
      reverify: args.reverify ?? mode === 'audit',
      previousSnapshot,
      onFact: (record) => writer.write(record),
      now,
    });
  } finally {
    await writer.close();
  }

  const parity = buildParity({ findings: result.findings, taxonomy: result.taxonomy, semrushCounts });
  await writeFile(join(outDir, 'findings.json'), generateJsonReport(result, { parity, generatedAt: now }), 'utf8');
  await writeFile(join(outDir, 'report.md'), generateMarkdownReport(result, { parity, generatedAt: now }), 'utf8');
  if (result.snapshot) await writeSnapshot(outDir, result.snapshot);

  const { summary, health, sanity } = result;
  process.stderr.write(
    [
      '',
      sanity.abort ? `ABORTED (${sanity.abort.code}): ${sanity.abort.message}` : `Health ${health.score ?? 'n/a'} / 100`,
      `  Errors ${summary.error}, warnings ${summary.warning}, notices ${summary.notice}, unknown ${summary.unknown}, transient ${summary.transient}`,
      `  Written to ${outDir}`,
      '',
    ].join('\n'),
  );
  return sanity.abort ? 2 : 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('site-review/index.js')) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`Fatal error: ${err.message}\n`);
      process.exit(1);
    },
  );
}
