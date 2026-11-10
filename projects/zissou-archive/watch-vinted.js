// CLI that runs the Vinted deal searches in a real Chrome session and opens a page of new flags to mark.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { execFile } from 'node:child_process';
import { VINTED_DOMAIN, VINTED_MAX_FETCHES, VINTED_STATE_DIR } from './config.js';
import { parseCatalogHtml } from './lib/vinted-parse.js';
import { buildSearchUrl, planRun } from './lib/vinted-urls.js';
import { matchTarget } from './lib/deal-filter.js';
import { loadSeen, saveSeen, markSeen, filterNew, appendCsv } from './lib/seen-store.js';
import { renderReport } from './lib/vinted-report.js';
import { startVerdictServer } from './lib/verdict-server.js';
import { openSession as realOpenSession, fetchHtml as realFetchHtml, waitForClose, ChallengeError } from './lib/vinted-browser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SEARCHES = join(__dirname, '.claude', 'files', 'data', 'vinted-searches.json');
const SUPPLY_HEADER = ['firstSeen', 'queryId', 'id', 'brand', 'price', 'size', 'condition', 'favourites'];
const FLAG_RULES = new Set(['brand', 'cap', 'none']);
const EXIT_CONFIG = 2;
const EXIT_CHALLENGE = 3;

const USAGE = `Usage: node projects/zissou-archive/watch-vinted.js [options]

  --login      Open the Chrome profile on-screen at vinted.nl; log in, then close the window
  --dry-run    Fetch, parse, filter and print; no state writes, no report server
  --limit N    Cap fetches this run (default and max ${VINTED_MAX_FETCHES})
  --no-open    Write the report but don't serve or open it
  --help       Show this help

Env: VINTED_SEARCHES (searches JSON), VINTED_STATE_DIR (state folder), DEBUG=1
`;

class ConfigError extends Error {}

export function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      login: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      limit: { type: 'string' },
      'no-open': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  let limit = VINTED_MAX_FETCHES;
  if (values.limit !== undefined) {
    if (!/^\d+$/.test(values.limit) || Number(values.limit) < 1) {
      throw new ConfigError(`--limit must be a whole number from 1 to ${VINTED_MAX_FETCHES}`);
    }
    limit = Math.min(Number(values.limit), VINTED_MAX_FETCHES);
  }
  return { login: values.login, dryRun: values['dry-run'], noOpen: values['no-open'], help: values.help, limit };
}

async function loadConfig(path) {
  let config;
  try {
    config = JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    throw new ConfigError(`Cannot read searches config ${path}: ${err.message}`, { cause: err });
  }
  if (!config || !Array.isArray(config.searches) || config.searches.length === 0) {
    throw new ConfigError(`${path} has no "searches" list`);
  }
  config.brands = config.brands ?? {};
  const ids = new Set();
  const urls = new Map();
  for (const search of config.searches) {
    if (!search || typeof search.id !== 'string' || !search.id) throw new ConfigError('Every search needs a string "id"');
    if (ids.has(search.id)) throw new ConfigError(`Duplicate search id "${search.id}"`);
    ids.add(search.id);
    if (!FLAG_RULES.has(search.flagRule)) throw new ConfigError(`Search "${search.id}" has unknown flagRule "${search.flagRule}"`);
    if (search.kind === 'brand-band' && !(search.brands?.length || search.brand_ids?.length)) {
      throw new ConfigError(`Brand band "${search.id}" lists no brands`);
    }
    try {
      urls.set(search.id, buildSearchUrl(search, config));
    } catch (err) {
      throw new ConfigError(err.message, { cause: err });
    }
  }
  return { config, urls };
}

async function readCursor(path) {
  try {
    const { cursor } = JSON.parse(await readFile(path, 'utf8'));
    return Number.isInteger(cursor) && cursor >= 0 ? cursor : 0;
  } catch {
    return 0;
  }
}

function defaultOpenUrl(url) {
  return new Promise((resolve, reject) => {
    execFile('open', [url], (err) => (err ? reject(err) : resolve()));
  });
}

function oneLine(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function statePaths(stateDir) {
  return {
    seen: join(stateDir, 'vinted-seen.json'),
    cursor: join(stateDir, 'vinted-cursor.json'),
    supply: join(stateDir, 'vinted-supply.csv'),
    verdicts: join(stateDir, 'vinted-verdicts.csv'),
    report: join(stateDir, 'vinted-flags.html'),
    profile: join(stateDir, 'chrome-profile'),
  };
}

export async function runWatch({
  searchesPath = process.env.VINTED_SEARCHES || DEFAULT_SEARCHES,
  stateDir = process.env.VINTED_STATE_DIR || VINTED_STATE_DIR,
  limit = VINTED_MAX_FETCHES,
  dryRun = false,
  noOpen = false,
  openSession = realOpenSession,
  fetchHtml = realFetchHtml,
  startServer = startVerdictServer,
  openUrl = defaultOpenUrl,
  now = () => new Date(),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const out = (s) => stdout.write(s);
  const warn = (s) => stderr.write(s);
  const paths = statePaths(stateDir);

  let config;
  let urls;
  try {
    ({ config, urls } = await loadConfig(searchesPath));
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    warn(`Config error: ${err.message}\n`);
    return { exitCode: EXIT_CONFIG, flags: [], health: [], results: [], server: null };
  }

  const domain = config.domain ?? VINTED_DOMAIN;
  const runAt = now().toISOString();
  const cursor = await readCursor(paths.cursor);
  const maxFetches = Math.min(Math.max(1, Number(limit) || VINTED_MAX_FETCHES), VINTED_MAX_FETCHES);
  const plan = planRun(config.searches, cursor, maxFetches);
  const seen = await loadSeen(paths.seen);

  const health = [];
  const results = [];
  const candidates = [];
  const supplyRows = [];
  let challenged = false;
  const width = Math.max(...plan.searches.map((s) => s.id.length));

  const session = await openSession({ profileDir: paths.profile, domain });
  try {
    for (const search of plan.searches) {
      let items = [];
      try {
        items = parseCatalogHtml(await fetchHtml(session.page, urls.get(search.id)), { domain });
      } catch (err) {
        if (err instanceof ChallengeError) {
          challenged = true;
          health.push(`Cloudflare challenge on ${search.id}: run stopped after ${results.length} of ${plan.searches.length} fetches`);
          break;
        }
        health.push(`${search.id}: ${err.message}`);
      }
      for (const item of markSeen(items, seen, runAt)) {
        supplyRows.push({ ...item, firstSeen: runAt, queryId: search.id });
      }
      let count = 0;
      for (const item of items) {
        const match = matchTarget(item, search, config);
        if (!match) continue;
        count++;
        candidates.push({ ...item, ...match, queryId: search.id });
      }
      results.push({ id: search.id, items: items.length, candidates: count });
      out(`${search.id.padEnd(width)}  ${String(items.length).padStart(3)} items  ${String(count).padStart(3)} candidates\n`);
    }
  } finally {
    await session.close();
  }

  const zero = results.filter((r) => r.items === 0).length;
  if (results.length && zero / results.length >= 0.5) {
    health.push(`${zero} of ${results.length} searches returned 0 items (markup change or block?)`);
  }

  const flags = filterNew(candidates, seen, runAt);
  const totalItems = results.reduce((n, r) => n + r.items, 0);
  out(`Total: ${results.length}/${plan.searches.length} searches, ${totalItems} items, ${candidates.length} candidates, ${flags.length} new flags\n`);
  for (const h of health) warn(`Health: ${h}\n`);

  let server = null;
  if (dryRun) {
    for (const f of flags) {
      out(`  €${f.price.toFixed(2)}  ${oneLine(f.brand ?? '-')}  ${oneLine(f.title)}  [${f.reason}]  ${f.url}\n`);
    }
  } else {
    await mkdir(stateDir, { recursive: true });
    const serve = !noOpen && (flags.length > 0 || health.length > 0);
    const html = renderReport({ flags, health, runAt, verdictUrl: serve ? '/verdict' : null });
    await writeFile(paths.report, html);
    out(`Report: ${paths.report}\n`);
    if (serve) server = await startServer({ html, csvPath: paths.verdicts });
    await saveSeen(paths.seen, seen);
    await appendCsv(paths.supply, SUPPLY_HEADER, supplyRows);
    const nextCursor = challenged && config.searches.length > maxFetches
      ? (cursor + results.length) % config.searches.length
      : plan.nextCursor;
    await writeFile(paths.cursor, JSON.stringify({ cursor: nextCursor, updatedAt: runAt }));
    if (server) {
      await openUrl(server.url);
      out(`Marking at ${server.url} (closes after 30 min idle, Ctrl-C to stop)\n`);
    }
  }

  return { exitCode: challenged ? EXIT_CHALLENGE : 0, flags, health, results, server };
}

async function login(stateDir) {
  const session = await realOpenSession({ profileDir: statePaths(stateDir).profile, onScreen: true, domain: VINTED_DOMAIN });
  process.stdout.write('Log in to Vinted in the Chrome window, then close it.\n');
  await waitForClose(session);
}

async function main(argv) {
  let opts;
  try {
    opts = parseCliArgs(argv);
  } catch (err) {
    process.stderr.write(`${err.message}\n\n${USAGE}`);
    return EXIT_CONFIG;
  }
  if (opts.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  const stateDir = process.env.VINTED_STATE_DIR || VINTED_STATE_DIR;
  if (opts.login) {
    await login(stateDir);
    return 0;
  }
  const result = await runWatch({ stateDir, limit: opts.limit, dryRun: opts.dryRun, noOpen: opts.noOpen });
  if (result.server) {
    process.once('SIGINT', () => result.server.close());
  }
  return result.exitCode;
}

const invoked = process.argv[1] ? realpathSync(process.argv[1]) : '';
if (invoked === realpathSync(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      process.stderr.write(`${err.stack ?? err}\n`);
      process.exitCode = 1;
    },
  );
}
