// Collects each goal's monthly figures from the Google profile, Search Console and an MCP staging file, and writes metrics-YYYY-MM.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createTokenProvider, redact } from '../gbp/auth.js';
import { getPerformance, listReviews, resolveLocation } from '../gbp/client.js';
import { runIfMain, say, warn } from './cli.js';
import { metricKeys } from './report-data.js';
import { readGoalsFile, reportsDir } from './schema.js';

const SEARCH_CONSOLE_API = 'https://www.googleapis.com/webmasters/v3/sites';
const GBP_ENV = ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN'];
const GBP_SOURCE = 'Google Business Profile API';
const SEARCH_CONSOLE_SOURCE = 'Search Console API';
const FORMS_SOURCE = 'Webflow form submissions (Webflow MCP)';
const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const DAILY = {
  CALL_CLICKS: 'calls',
  WEBSITE_CLICKS: 'websiteClicks',
  BUSINESS_DIRECTION_REQUESTS: 'directions',
};
const DEFAULT_READS = { getPerformance, resolveLocation, listReviews };

export function monthRange(month) {
  const [year, number] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { startDate: `${month}-01`, endDate: `${month}-${String(last).padStart(2, '0')}` };
}

export function sumPerformance(series) {
  const totals = { calls: 0, websiteClicks: 0, directions: 0 };
  for (const item of series ?? []) {
    for (const metric of item.dailyMetricTimeSeries ?? [item]) {
      const key = DAILY[metric.dailyMetric];
      if (!key) continue;
      for (const day of metric.timeSeries?.datedValues ?? []) totals[key] += Number(day.value ?? 0);
    }
  }
  return { ...totals, actions: totals.calls + totals.websiteClicks + totals.directions };
}

export function summariseReviews(reviews, month) {
  const total = reviews.length;
  if (total === 0) return { total: 0, average: null, new: 0, answeredShare: null };
  const stars = reviews.reduce((sum, review) => sum + (STARS[review.starRating] ?? 0), 0);
  return {
    total,
    average: Math.round((stars / total) * 10) / 10,
    new: reviews.filter((review) => String(review.createTime ?? '').startsWith(month)).length,
    answeredShare: Math.round((reviews.filter((review) => review.reviewReply).length / total) * 100),
  };
}

export function countFormSubmissions(submissions, month) {
  return submissions.filter((item) => {
    const when = item.submittedOn ?? item.dateSubmitted ?? item.createdOn ?? '';
    return String(when).startsWith(month) && !item.isSpam && !item.spam;
  }).length;
}

export async function collectGbp({ ctx, locations, month, reads = DEFAULT_READS }) {
  const range = monthRange(month);
  const totals = { calls: 0, websiteClicks: 0, directions: 0, actions: 0 };
  const reviews = [];
  for (const location of locations) {
    const sums = sumPerformance(await reads.getPerformance(ctx, location, range));
    for (const key of Object.keys(totals)) totals[key] += sums[key];
    const { v4Name } = await reads.resolveLocation(ctx, location);
    reviews.push(...(await reads.listReviews(ctx, v4Name)));
  }
  const summary = summariseReviews(reviews, month);
  return {
    'gbp.calls': totals.calls,
    'gbp.websiteClicks': totals.websiteClicks,
    'gbp.directions': totals.directions,
    'gbp.actions': totals.actions,
    'gbp.reviews.total': summary.total,
    'gbp.reviews.average': summary.average,
    'gbp.reviews.new': summary.new,
    'gbp.reviews.answeredShare': summary.answeredShare,
  };
}

export async function fetchSearchConsole({ fetch: fetchFn, token, siteUrl, month, brandTerms = [] }) {
  if (!token || !siteUrl) return null;
  const { startDate, endDate } = monthRange(month);
  const url = `${SEARCH_CONSOLE_API}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const query = async (filters) => {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
        ...(filters ? { dimensionFilterGroups: [{ groupType: 'and', filters }] } : {}),
      }),
    });
    if (!response.ok) throw new Error(`Search Console returned HTTP ${response.status}`);
    const row = (await response.json()).rows?.[0];
    return { clicks: row?.clicks ?? 0, impressions: row?.impressions ?? 0 };
  };
  const total = await query(null);
  const out = { 'searchConsole.clicks': total.clicks, 'searchConsole.impressions': total.impressions };
  if (brandTerms.length > 0) {
    const nonBranded = await query(
      brandTerms.map((term) => ({ dimension: 'query', operator: 'notContains', expression: term })),
    );
    out['searchConsole.nonBrandedClicks'] = nonBranded.clicks;
    out['searchConsole.brandedImpressions'] = total.impressions - nonBranded.impressions;
  }
  return out;
}

export function readInputs(dir, month) {
  const name = `inputs-${month}.json`;
  const path = join(dir, name);
  if (!existsSync(path)) return { figures: null, log: [`inputs: no ${name}, so manual figures are null`] };
  try {
    const figures = JSON.parse(readFileSync(path, 'utf8'))?.figures;
    if (!figures || typeof figures !== 'object') throw new Error('no figures object');
    return { figures, log: [] };
  } catch (error) {
    return { figures: null, log: [`inputs: cannot read ${name} (${error.message}), so manual figures are null`] };
  }
}

export async function searchConsoleToken({ env = process.env, createProvider = createTokenProvider } = {}) {
  if (env.SEARCH_CONSOLE_TOKEN) return env.SEARCH_CONSOLE_TOKEN;
  if (GBP_ENV.some((name) => !env[name])) return null;
  return createProvider({
    clientId: env.GBP_CLIENT_ID,
    clientSecret: env.GBP_CLIENT_SECRET,
    refreshToken: env.GBP_REFRESH_TOKEN,
  })();
}

export const tag = (values, source) =>
  Object.fromEntries(
    Object.entries(values ?? {})
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, { value, source }]),
  );

function stagedFigures(mcp) {
  const staged = { ...(mcp?.figures ?? {}) };
  if (Array.isArray(mcp?.formSubmissions) && staged['forms.submissions'] === undefined) {
    staged['forms.submissions'] = { value: countFormSubmissions(mcp.formSubmissions, mcp.month ?? ''), source: FORMS_SOURCE };
  }
  return staged;
}

function toFigure(raw, pulledAt) {
  const figure = { value: raw.value, source: raw.source, pulledAt: raw.pulledAt ?? pulledAt };
  if (raw.items) figure.items = raw.items;
  if (raw.text) figure.text = raw.text;
  return figure;
}

export function buildMetrics({ month, goals, collected = {}, mcp = null, inputs = null, now = new Date() }) {
  const stamp = now.toISOString();
  const required = [...new Set(goals.goals.flatMap(metricKeys))];
  const staged = stagedFigures(mcp ? { ...mcp, month: mcp.month ?? month } : null);
  const manual = inputs ?? {};
  const keys = [...new Set([...required, ...Object.keys(collected), ...Object.keys(manual)])];
  const figures = {};
  const log = [];
  for (const key of keys) {
    const direct = collected[key];
    const fromManual = !direct && staged[key] === undefined && manual[key] !== undefined;
    const raw = direct ?? staged[key] ?? manual[key];
    const fromMcp = !direct && !fromManual;
    if (!raw || raw.value === null || raw.value === undefined) {
      figures[key] = null;
      if (required.includes(key)) log.push(`${key}: no source, so the figure is null`);
    } else if (!raw.source) {
      figures[key] = null;
      log.push(`${key}: arrived with no source, so the figure is null`);
    } else {
      figures[key] = toFigure(raw, fromMcp ? (mcp?.pulledAt ?? stamp) : stamp);
    }
  }
  return { metrics: { month, client: goals.client, figures }, log };
}

export function writeMetrics(path, metrics, { sample = false } = {}) {
  if (sample && /^metrics-.*\.json$/.test(basename(path))) {
    throw new Error('sample mode never writes a metrics file');
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(metrics, null, 2)}\n`);
}

async function gather({ goals, month, log }) {
  const collected = {};
  const locations = goals.gbp?.locations ?? [];
  const missingEnv = GBP_ENV.filter((name) => !process.env[name]);
  if (locations.length === 0 || missingEnv.length > 0) {
    log.push(
      `gbp: not connected (${locations.length === 0 ? 'no locations in goals.json' : `set ${missingEnv.join(', ')}`})`,
    );
  } else {
    const secrets = GBP_ENV.map((name) => process.env[name]);
    const ctx = {
      fetch: globalThis.fetch,
      getToken: createTokenProvider({
        clientId: process.env.GBP_CLIENT_ID,
        clientSecret: process.env.GBP_CLIENT_SECRET,
        refreshToken: process.env.GBP_REFRESH_TOKEN,
      }),
    };
    try {
      Object.assign(collected, tag(await collectGbp({ ctx, locations, month }), GBP_SOURCE));
    } catch (error) {
      log.push(`gbp: failed (${redact(error.message, secrets)})`);
    }
  }
  const search = goals.searchConsole ?? {};
  try {
    const figures = await fetchSearchConsole({
      fetch: globalThis.fetch,
      token: search.siteUrl ? await searchConsoleToken() : null,
      siteUrl: search.siteUrl,
      month,
      brandTerms: search.brandTerms ?? [],
    });
    if (figures) Object.assign(collected, tag(figures, SEARCH_CONSOLE_SOURCE));
    else log.push('searchConsole: no access yet (no siteUrl, and no SEARCH_CONSOLE_TOKEN or GBP credentials), so its figures are null');
  } catch (error) {
    log.push(`searchConsole: failed (${error.message})`);
  }
  return collected;
}

async function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      client: { type: 'string' },
      month: { type: 'string' },
      projects: { type: 'string' },
      mcp: { type: 'string' },
      sample: { type: 'boolean', default: false },
    },
  });
  if (!values.client || !/^\d{4}-(0[1-9]|1[0-2])$/.test(values.month ?? '')) {
    warn('usage: collect.js --client <name> --month YYYY-MM [--projects <dir>] [--mcp <file>] [--sample]');
    return 2;
  }
  if (values.sample) {
    warn('refused: --sample never writes a metrics-*.json file. Sample figures live in sample-YYYY-MM.json.');
    return 1;
  }
  const projects = resolve(values.projects ?? fileURLToPath(new URL('../../projects', import.meta.url)));
  const dir = reportsDir(projects, values.client);
  const goals = readGoalsFile(join(dir, 'goals.json'));
  if (!goals.ok) {
    warn(goals.errors.join('\n'));
    return 2;
  }
  let mcp = null;
  if (values.mcp) {
    try {
      mcp = JSON.parse(readFileSync(resolve(values.mcp), 'utf8'));
    } catch (error) {
      warn(`cannot read the MCP file: ${error.message}`);
      return 2;
    }
  }
  const log = [];
  const collected = await gather({ goals: goals.data, month: values.month, log });
  const inputs = readInputs(dir, values.month);
  log.push(...inputs.log);
  const result = buildMetrics({ month: values.month, goals: goals.data, collected, mcp, inputs: inputs.figures });
  const path = join(dir, `metrics-${values.month}.json`);
  writeMetrics(path, result.metrics, { sample: false });
  for (const line of [...log, ...result.log]) warn(line);
  const gaps = Object.values(result.metrics.figures).filter((figure) => figure === null).length;
  say(JSON.stringify({ written: path, figures: Object.keys(result.metrics.figures).length, nulls: gaps }));
  return 0;
}

runIfMain(import.meta.url, main);
