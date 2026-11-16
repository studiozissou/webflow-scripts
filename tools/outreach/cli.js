// Outreach CLI: `run` discovers, scans, scores, triages and drafts prospects into Notion under one shared budget, and `scan <url>` prints one prospect as JSON; it never sends email.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { fetchPage as realFetchPage } from '../site-review/lib/fetch-page.js';
import { createNotionClient, resolveToken } from '../notion/client.js';
import { BudgetExceeded, ENDPOINTS, PaymentRequired, createBudget, createClient as createDataForSeoClient, firstItems, loadCredentials } from './dataforseo.js';
import { areasForPostcodes, discover, isChain } from './discover.js';
import { createClient as createAnthropicClient, draftEmail, loadPrompt, pickLanguage } from './draft.js';
import { buildGbp, cleanType, lookupType } from './gbp.js';
import { queryByDomain, replaceBody, upsertProspect } from './notion-map.js';
import { personalise } from './personalise.js';
import { MAPS_DEFAULTS, resolve } from './resolve.js';
import { REVIEW_DEFAULTS, fetchReviews } from './reviews.js';
import { scanSite as realScanSite } from './scan.js';
import { isProtected, planScan, readState, recordScan, touchRun, writeState } from './state.js';
import { guessRegister, normaliseDomain, pageText } from './text.js';
import { triage } from './triage.js';

const DEBUG = process.env.DEBUG_OUTREACH === '1';

export const DEFAULT_BUDGET = 3;
export const DRAFT_ESTIMATE = 0.10;
export const DEFAULT_DISCOVER = 20;
export const OFFER = Object.freeze({
  en: 'a free 15-minute chat or a short free write-up',
  nl: '15 minuten praten of een korte gratis blik op papier',
});
export const NO_EMAIL = 'form/phone/Instagram';

const DRAFT_VERDICTS = new Set(['new-site+management', 'management']);

const USAGE = `usage: node tools/outreach/cli.js <command> [options]
  run                 discover, scan, triage and draft prospects into Notion (never sends email)
  scan <url>          scan one site and print it as JSON (no Notion, no drafts)
options:
  --data <dir>        folder with seeds.json, state.json, areas.json, chains.json, runs/ (required for run)
  --prompt <path>     private email prompt (required for run unless --dry-run)
  --dry-run           real site and DataForSEO calls; no Notion writes, no Anthropic, no files; prints a table
  --limit <n>         scan at most n rows this run
  --discover [n]      add up to n lookalikes from Maps searches (bare flag: ${DEFAULT_DISCOVER}, 0: off)
  --budget <usd>      DataForSEO + Anthropic spend cap (default ${DEFAULT_BUDGET})
  --force-rescan      rescan rows scanned in the last 30 days (protected rows stay protected)
  --help              show this help
kill switch: <data>/../outreach.off stops run with exit 0
exit codes: 0 done, 1 stopped (budget, payment or fatal error), 2 usage error
`;

const PLAIN = {
  unreachable: "the website doesn't load or shows a 'domain for sale' page, so people who look you up hit a dead end",
  'no-https': "the site has no padlock, so Chrome shows 'Not secure' before visitors see the menu",
  'no-viewport': "the site isn't set up for phones, so text is tiny and hard to read",
  'builder-eol': 'the site runs on an old builder version that no longer gets fixes',
  'builder-badge': 'the site shows a free website-builder badge, which makes the business look smaller than it is',
  'slow-lcp': 'the homepage takes more than 4 seconds to show on a phone, and many visitors give up before it loads',
  'heavy-page': 'the homepage is over 6 MB, so it loads slowly on phones and eats mobile data',
  'stale-and-no-hours': "the site looks out of date and has no opening hours or menu, so people can't check if you're open",
  'pdf-menu-no-booking': 'the menu is only a PDF and there is no way to book online, so phone visitors have to zoom in and then call',
  'missing-title': 'the homepage has no page title, so Google shows a messy name in search results',
  'missing-description': 'the homepage has no description, so Google picks random text to show under your name',
  'no-schema': "Google can't read the opening hours and address from the site",
  'broken-links': 'some links on the homepage are broken, so visitors land on error pages',
  'gbp-low-score': 'the Google Business Profile is missing details, which pushes you down on Google Maps',
  'not-top3': "you don't show in the top 3 on Google Maps for your main searches, where most people click",
  'nap-mismatch': "the phone number or postcode on the site doesn't match Google, which confuses customers and Google",
  'gbp-no-website': "the Google Business Profile has no website link, so people who find you on Maps can't click through",
  chain: 'Part of a chain',
  closed: 'Google lists the business as closed',
  'no-site-no-gbp': 'No working website and no Google Business Profile',
  'do-not-contact': 'Marked Do not contact',
};

const IMPACT = [['not-top3'], ['no-viewport'], ['slow-lcp', 'heavy-page'], ['no-https'], ['pdf-menu-no-booking']];

const defaultDeps = {
  now: () => new Date(),
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
  fetchPage: (url, cache) => realFetchPage(url, cache),
  scanSite: (url, options) => realScanSite(url, options),
  dataforseo: async ({ budget }) => createDataForSeoClient({ ...(await loadCredentials()), budget }),
  notion: async () => createNotionClient({ token: resolveToken() }),
  anthropic: () => createAnthropicClient(),
  loadPrompt,
  sleep: undefined,
};

class UsageError extends Error {}

const readJson = (file, fallback) => {
  if (!existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing ${file}`);
  }
  return JSON.parse(readFileSync(file, 'utf8'));
};

const writeJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const round = (n) => Math.round(n * 1e6) / 1e6;

const QUERY_ROLES = ['main', 'area', 'nearby'];

export function mapQueries(type, area) {
  const t = cleanType(type);
  if (!t) return [];
  const nl = lookupType(t)?.nl ?? t;
  const local = area ? `${nl} ${String(area).toLowerCase()}` : `${nl} centrum den haag`;
  return [`${nl} den haag`, local, `${nl} in de buurt`];
}

const impactRank = (id) => {
  const tier = IMPACT.findIndex((ids) => ids.includes(id));
  return tier === -1 ? IMPACT.length : tier;
};

export function sortByImpact(issues) {
  return issues.map((issue, i) => ({ issue, i })).sort((a, b) => impactRank(a.issue.id) - impactRank(b.issue.id) || a.i - b.i).map(({ issue }) => issue);
}

const isStop = (err) => err instanceof BudgetExceeded || err instanceof PaymentRequired;
const stopKind = (err) => (err instanceof PaymentRequired ? 'payment' : 'budget');

const withDiscoverValue = (argv) => argv.flatMap((arg, i) => (arg === '--discover' && (argv[i + 1] === undefined || argv[i + 1].startsWith('-')) ? [arg, String(DEFAULT_DISCOVER)] : [arg]));

function parse(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: withDiscoverValue(argv),
      allowPositionals: true,
      options: {
        data: { type: 'string' },
        prompt: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        limit: { type: 'string' },
        discover: { type: 'string' },
        budget: { type: 'string' },
        'force-rescan': { type: 'boolean', default: false },
        help: { type: 'boolean', default: false },
      },
    });
  } catch (err) {
    throw new UsageError(err.message);
  }
  const { values, positionals } = parsed;
  const budget = values.budget === undefined ? DEFAULT_BUDGET : Number(values.budget);
  if (!Number.isFinite(budget) || budget < 0) throw new UsageError('--budget must be a number of USD');
  const limit = values.limit === undefined ? Infinity : Number(values.limit);
  if (!(limit === Infinity || (Number.isInteger(limit) && limit >= 0))) throw new UsageError('--limit must be a whole number');
  const discover = values.discover === undefined ? 0 : Number(values.discover);
  if (!(Number.isInteger(discover) && discover >= 0)) throw new UsageError('--discover must be a whole number');
  return {
    command: positionals[0], target: positionals[1], help: values.help, data: values.data, prompt: values.prompt,
    dryRun: values['dry-run'], limit, discover, budget, forceRescan: values['force-rescan'],
  };
}

function seedCandidates(seedsFile) {
  return (seedsFile.seeds ?? []).map((s) => ({
    ...s,
    source: 'seed',
    url: s.url ?? `https://${normaliseDomain(s.domain)}/`,
    domain: normaliseDomain(s.domain ?? s.url),
  }));
}

async function gather(candidate, { deps, getDfs, areas, knownCid }) {
  const url = candidate.url ?? `https://${candidate.domain}/`;
  const cache = new Map();
  let page = null;
  let pageError = null;
  try {
    page = await deps.fetchPage(url, cache);
  } catch (err) {
    pageError = err;
  }
  const fetchOnce = (u, c) => (u === url && pageError ? Promise.reject(pageError) : deps.fetchPage(u, c));
  const scan = await deps.scanSite(url, { fetchPage: fetchOnce, cache });
  const html = page?.html ?? '';
  const client = await getDfs();

  let cid = candidate.cid ?? knownCid ?? null;
  if (!cid) {
    const found = await resolve({ client, url, html, postcode: scan.facts?.postcode ?? null });
    cid = found.matched ? found.cid : null;
  }
  let info = null;
  if (cid) {
    const response = await client.post(ENDPOINTS.businessInfoLive, [{ keyword: `cid:${cid}`, location_name: REVIEW_DEFAULTS.location_name, language_code: 'nl' }]);
    info = firstItems(response)[0] ?? null;
  }
  const area = candidate.area ?? areasForPostcodes(areas, [scan.facts?.postcode])[0] ?? null;
  const searches = [];
  if (info) {
    for (const [i, query] of mapQueries(candidate.type, area).entries()) {
      const response = await client.post(ENDPOINTS.mapsLive, [{ keyword: query, ...MAPS_DEFAULTS }]);
      searches.push({ role: QUERY_ROLES[i], query, items: firstItems(response) });
    }
  }
  return { candidate, domain: candidate.domain, url, html, scan, cid: info ? String(info.cid ?? cid) : null, info, searches };
}

function potentialLine(row) {
  const rank = row.gbp.ranks?.[0];
  if (!rank || (typeof rank.position === 'number' && rank.position <= 3)) return null;
  const top = [...(row.searches[0]?.items ?? [])]
    .sort((a, b) => (a.rank_group ?? Infinity) - (b.rank_group ?? Infinity))
    .find((item) => normaliseDomain(item.domain) !== row.domain);
  const where = rank.position === '>20' ? 'not in the top 20' : `number ${rank.position}`;
  return top ? `${where} on Google Maps for "${rank.query}", where ${top.title} is number ${top.rank_group}` : `${where} on Google Maps for "${rank.query}"`;
}

function finish(row, { reviews, chains, now }) {
  const { candidate, scan, info } = row;
  const reviewItems = row.cid ? reviews[row.cid]?.items ?? null : null;
  const gbp = buildGbp({ info, type: cleanType(candidate.type), siteDomain: row.domain, site: scan.facts, reviews: reviewItems, now, searches: row.searches });
  const name = gbp.name ?? scan.facts?.siteName ?? candidate.name ?? row.domain;
  const chain = isChain({ domain: row.domain, title: name }, { chains });
  const { verdict, reasons } = triage({ url: row.url, site: scan, gbp, chain }, { now });
  const issues = sortByImpact(reasons).map((r) => ({ ...r, text: PLAIN[r.id] ?? r.id, plain: PLAIN[r.id] ?? r.id }));
  const personal = personalise({ row: candidate, pages: row.html ? [{ url: scan.finalUrl ?? row.url, html: row.html }] : [], info, reviews: reviewItems });
  const text = pageText(row.html);
  return {
    ...row, name, gbp, verdict, issues, personal, reviewItems,
    language: pickLanguage(scan.facts?.language, text), register: guessRegister(text), contact: scan.facts?.email ?? NO_EMAIL,
  };
}

function notionRow(row, { run, now, draft }) {
  const keepDraft = DRAFT_VERDICTS.has(row.verdict) && !draft;
  return {
    keepDraft,
    name: row.name,
    domain: row.domain,
    source: row.candidate.source,
    verdict: row.verdict,
    issues: row.issues,
    factsUsed: row.personal.facts.map((f) => ({ fact: f.value, source: f.source })),
    draftKind: draft ? (draft.draft === 'generic' ? 'generic' : 'personal') : row.personal.draftKind,
    gbpScore: row.gbp.score.display,
    ranks: row.gbp.ranks,
    language: row.language,
    contact: row.contact,
    emailSubject: keepDraft ? undefined : draft?.subject ?? '',
    draft: keepDraft ? undefined : draft?.body ?? '',
    draftStatus: keepDraft ? undefined : draft?.draft ?? 'none',
    lastScanned: now.toISOString(),
    run,
  };
}

function summary(row) {
  return {
    domain: row.domain, name: row.name, source: row.candidate.source, verdict: row.verdict,
    reasons: row.issues.map((i) => ({ id: i.id, text: i.text, evidence: i.evidence })),
    gbpScore: row.gbp.score.display, gbp: row.gbp.status, ranks: row.gbp.ranks, language: row.language, contact: row.contact,
    platform: row.scan.platform?.builder ?? null, facts: row.personal.facts, opener: row.personal.opener,
  };
}

const jsonLine = (row) => JSON.stringify({
  domain: row.domain, verdict: row.verdict,
  issues: row.issues.map((i) => ({ id: i.id, text: i.text, evidence: i.evidence })),
  gbpScore: row.gbp.score.display, ranks: row.gbp.ranks,
});

function table(rows) {
  const lines = rows.map((r) => [r.domain, r.verdict, r.issues.slice(0, 3).map((i) => i.id).join(',') || '-', r.gbp.score.display]);
  const head = ['domain', 'verdict', 'top reasons', 'gbp'];
  const widths = head.map((h, i) => Math.max(h.length, ...lines.map((l) => l[i].length)));
  return [head, ...lines].map((l) => l.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd()).join('\n');
}

async function collectReviews(rows, { getDfs, deps, onStop, errors = [] }) {
  const cids = rows.map((r) => r.cid).filter(Boolean);
  if (!cids.length) return {};
  try {
    const out = await fetchReviews({ client: await getDfs(), cids, ...(deps.sleep ? { sleep: deps.sleep } : {}) });
    if (Object.values(out).some((r) => r.reason === 'budget')) onStop('budget');
    return out;
  } catch (err) {
    if (isStop(err)) onStop(stopKind(err));
    else errors.push({ domain: null, stage: 'reviews', message: err.message });
    return {};
  }
}

async function runCommand(opts, deps) {
  if (!opts.data) throw new UsageError('run needs --data <dir>');
  if (!opts.dryRun && !opts.prompt) throw new UsageError('run needs --prompt <path> (or --dry-run)');
  const dataDir = resolvePath(opts.data);
  const killSwitch = join(dataDir, '..', 'outreach.off');
  if (existsSync(killSwitch)) {
    deps.stdout(`outreach: ${killSwitch} exists; not running\n`);
    return 0;
  }

  const now = deps.now();
  const run = now.toISOString().slice(0, 10);
  const seedsFile = readJson(join(dataDir, 'seeds.json'));
  const statePath = join(dataDir, 'state.json');
  let state = readState(statePath);
  const areas = readJson(join(dataDir, 'areas.json'), []);
  const chains = readJson(join(dataDir, 'chains.json'), []);
  const databaseId = seedsFile.notion?.database;
  if (!opts.dryRun && !databaseId) throw new Error('seeds.json has no notion.database');

  const prompt = opts.dryRun ? null : await deps.loadPrompt(opts.prompt);
  const notion = opts.dryRun ? null : await deps.notion();
  const budget = createBudget(opts.budget);
  let dfs = null;
  const getDfs = async () => (dfs ??= await deps.dataforseo({ budget }));
  let anthropic = null;
  const getAnthropic = async () => (anthropic ??= await deps.anthropic());
  const saveState = () => { if (!opts.dryRun) writeState(statePath, state); };

  let anthropicSpent = 0;
  let stopped = null;
  const onStop = (kind) => { stopped ??= kind; };
  const errors = [];
  const drafts = [];
  const counts = { scanned: 0, touched: 0, skipped: 0, protected: 0, notScanned: 0, written: 0, verdicts: {} };
  const seeds = seedCandidates(seedsFile);
  const finished = [];

  try {
    let lookalikes = [];
    if (opts.discover > 0) {
      try {
        const postcodes = Object.values(state.prospects).map((p) => p.postcode).filter(Boolean);
        const nearby = areasForPostcodes(areas, postcodes);
        const result = await discover({
          client: await getDfs(),
          types: [...new Set(seeds.map((s) => cleanType(s.type)).filter(Boolean))],
          areas: nearby.length ? nearby : areas.map((a) => a.name),
          history: state.discoverHistory ?? {},
          chains,
          exclude: [...Object.keys(state.prospects), ...seeds.map((s) => s.domain)],
          limit: opts.discover,
          now,
        });
        lookalikes = result.candidates;
        state = { ...state, discoverHistory: result.history };
        if (result.stopped) onStop('budget');
      } catch (err) {
        if (!isStop(err)) errors.push({ domain: null, stage: 'discover', message: err.message });
        else onStop(stopKind(err));
      }
    }

    const setStatus = (domain, status) => {
      state = { ...state, prospects: { ...state.prospects, [domain]: { ...(state.prospects[domain] ?? { domain }), status, run } } };
    };

    const plan = planScan(state, [...seeds, ...lookalikes], { now, forceRescan: opts.forceRescan });
    const toScan = [];
    for (const item of plan) {
      if (item.action === 'skip') counts.skipped += 1;
      else if (item.action === 'scan') toScan.push(item);
      else {
        counts.touched += 1;
        if (opts.dryRun) continue;
        try {
          await upsertProspect(notion, databaseId, { domain: item.domain, run }, { touchOnly: true });
          state = touchRun(state, item.domain, run);
        } catch (err) {
          errors.push({ domain: item.domain, stage: 'notion-touch', message: err.message });
        }
      }
    }

    const gathered = [];
    for (const [index, item] of toScan.entries()) {
      if (stopped || index >= opts.limit) {
        counts.notScanned += 1;
        continue;
      }
      try {
        if (!opts.dryRun) {
          const existing = await queryByDomain(notion, databaseId, item.domain);
          if (existing && isProtected(existing.status)) {
            await upsertProspect(notion, databaseId, { domain: item.domain, run }, { touchOnly: true });
            setStatus(item.domain, existing.status);
            counts.protected += 1;
            continue;
          }
        }
        gathered.push(await gather(item.candidate, { deps, getDfs, areas, knownCid: state.prospects[item.domain]?.cid }));
      } catch (err) {
        if (isStop(err)) onStop(stopKind(err));
        else errors.push({ domain: item.domain, stage: 'scan', message: err.message });
      }
    }

    const reviews = stopped ? {} : await collectReviews(gathered, { getDfs, deps, onStop, errors });
    for (const raw of gathered) {
      let row;
      try {
        row = finish(raw, { reviews, chains, now });
      } catch (err) {
        errors.push({ domain: raw.domain, stage: 'triage', message: err.message });
        continue;
      }
      counts.scanned += 1;
      counts.verdicts[row.verdict] = (counts.verdicts[row.verdict] ?? 0) + 1;
      finished.push(row);
      if (opts.dryRun) continue;

      let draft = null;
      let complete = !stopped && (!row.cid || reviews[row.cid]?.status === 'ok');
      const qualifies = DRAFT_VERDICTS.has(row.verdict);
      if (qualifies && !stopped) {
        try {
          budget.check(DRAFT_ESTIMATE);
          draft = await draftEmail({
            prompt, client: await getAnthropic(), row: { name: row.name, domain: row.domain, type: cleanType(row.candidate.type) },
            facts: row.personal.facts, issues: row.issues, language: row.language, register: row.register, opener: row.personal.opener,
            ownerName: row.personal.ownerName, potential: potentialLine(row), offer: OFFER[row.language],
            onCost: (cost) => { budget.charge(cost); anthropicSpent += cost; },
          });
          drafts.push({ domain: row.domain, opener: draft.opener, draft: draft.draft, costUsd: round(draft.costUsd), reasons: draft.reasons });
        } catch (err) {
          if (isStop(err)) onStop(stopKind(err));
          else errors.push({ domain: row.domain, stage: 'draft', message: err.message });
        }
      }
      if (qualifies && !draft) complete = false;

      try {
        const result = await upsertProspect(notion, databaseId, notionRow(row, { run, now, draft }));
        if (result.action === 'updated' && !qualifies) await replaceBody(notion, result.pageId, '');
        counts.written += 1;
        DEBUG && console.log(`[cli] ${row.domain} ${row.verdict} ${result.action}`);
      } catch (err) {
        complete = false;
        errors.push({ domain: row.domain, stage: 'notion', message: err.message });
      }
      if (complete) {
        state = recordScan(state, { domain: row.domain, source: row.candidate.source, cid: row.cid, verdict: row.verdict }, { now, run });
        state.prospects[row.domain] = { ...state.prospects[row.domain], postcode: row.scan.facts?.postcode ?? null };
        saveState();
      }
    }
  } finally {
    saveState();
  }

  const dataforseoSpent = round(budget.spent - anthropicSpent);
  const cost = { dataforseo: dataforseoSpent, anthropic: round(anthropicSpent), total: dataforseoSpent + round(anthropicSpent) };
  const verdictText = Object.entries(counts.verdicts).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';

  if (opts.dryRun) {
    if (finished.length) deps.stdout(`${table(finished)}\n${finished.map(jsonLine).join('\n')}\n`);
  } else {
    writeJson(join(dataDir, 'runs', `${run}.json`), {
      run, startedAt: now.toISOString(), finishedAt: deps.now().toISOString(), budget: opts.budget, cost, counts, drafts, errors, stopped,
    });
  }
  deps.stdout(`outreach ${run}${opts.dryRun ? ' (dry run)' : ''}: scanned ${counts.scanned}, touched ${counts.touched}, protected ${counts.protected}, skipped ${counts.skipped}, not scanned ${counts.notScanned}; verdicts: ${verdictText}; cost $${cost.total.toFixed(4)} (DataForSEO $${cost.dataforseo.toFixed(4)}, Anthropic $${cost.anthropic.toFixed(4)}); errors ${errors.length}\n`);
  for (const e of errors) deps.stderr(`outreach: ${e.domain ?? '-'} ${e.stage}: ${e.message}\n`);
  if (stopped) {
    const why = stopped === 'payment' ? 'DataForSEO payment required (top up the account)' : `budget of $${opts.budget} reached`;
    deps.stderr(`outreach: stopped early: ${why}; rows done so far were written\n`);
    return 1;
  }
  return 0;
}

async function scanCommand(opts, deps) {
  if (!opts.target) throw new UsageError('scan needs a <url>');
  const url = /^https?:\/\//i.test(opts.target) ? opts.target : `https://${opts.target}`;
  const domain = normaliseDomain(url);
  const dataDir = opts.data ? resolvePath(opts.data) : null;
  const seedsFile = dataDir ? readJson(join(dataDir, 'seeds.json'), { seeds: [] }) : { seeds: [] };
  const areas = dataDir ? readJson(join(dataDir, 'areas.json'), []) : [];
  const chains = dataDir ? readJson(join(dataDir, 'chains.json'), []) : [];
  const seed = seedCandidates(seedsFile).find((s) => s.domain === domain);
  const candidate = seed ? { ...seed, url } : { url, domain, source: 'lookalike', type: null };
  const budget = createBudget(opts.budget);
  let dfs = null;
  const getDfs = async () => (dfs ??= await deps.dataforseo({ budget }));
  const now = deps.now();
  let stopped = null;
  try {
    const raw = await gather(candidate, { deps, getDfs, areas });
    const reviews = await collectReviews([raw], { getDfs, deps, onStop: (k) => { stopped ??= k; } });
    const row = finish(raw, { reviews, chains, now });
    deps.stdout(`${JSON.stringify({ ...summary(row), cost: round(budget.spent) }, null, 2)}\n`);
  } catch (err) {
    if (!isStop(err)) throw err;
    stopped = stopKind(err);
  }
  if (stopped) {
    deps.stderr(`outreach: scan stopped: ${stopped === 'payment' ? 'DataForSEO payment required' : 'budget reached'}\n`);
    return 1;
  }
  return 0;
}

export async function main(argv = process.argv.slice(2), overrides = {}) {
  const deps = { ...defaultDeps, ...overrides };
  try {
    const opts = parse(argv);
    if (opts.help || !opts.command) {
      deps.stdout(USAGE);
      return opts.help ? 0 : 2;
    }
    if (opts.command === 'run') return await runCommand(opts, deps);
    if (opts.command === 'scan') return await scanCommand(opts, deps);
    throw new UsageError(`unknown command "${opts.command}"`);
  } catch (err) {
    if (err instanceof UsageError) {
      deps.stderr(`outreach: ${err.message}\n${USAGE}`);
      return 2;
    }
    deps.stderr(`outreach: ${err.message}\n`);
    return 1;
  }
}

if (process.argv[1] && resolvePath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
