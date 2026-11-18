// Builds the Studio Zissou weekly growth report from Search Console (or fixture JSON), derives findings and writes <week>.json and <week>.md; runnable as a CLI.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { KEYCHAIN_ACCOUNTS, KEYCHAIN_SERVICE } from './google-auth-setup.js';

const DEBUG = false;

const DEFAULT_OUT_DIR = fileURLToPath(
  new URL('../../projects/studio-zissou/.claude/reports/', import.meta.url),
);
const ENV_FILE = fileURLToPath(new URL('../../.env.test', import.meta.url));
const REQUIRED_ENV = [
  'SZ_GOOGLE_CLIENT_ID',
  'SZ_GOOGLE_CLIENT_SECRET',
  'SZ_GOOGLE_REFRESH_TOKEN',
  'SZ_GSC_SITE_URL',
];
const LAG_DAYS = 3;
const QUARTER_DAYS = 91;
const DAY_MS = 86400000;
const SEARCH_TYPES = ['web', 'image', 'video'];
const ROW_LIMIT = 5000;
const INSPECT_LIMIT = 7;
const BRAND = /\b(studio\s*zissou|zissou)\b/i;
const QUESTION =
  /^(how|what|why|when|where|which|who|can|could|does|do|is|are|should|will|hoe|wat|waarom|wanneer|waar|welke|welk|wie|kan|kun|kunnen|moet|zijn|hoeveel|hoelang|heeft|mag)\b|\?$/i;
const MIN_IMPRESSIONS = 50;
const MIN_QUESTION_IMPRESSIONS = 10;
const MIN_PAGE_IMPRESSIONS = 10;
const BRAND_SHARE_LIMIT = 0.6;
const DECAY_DROP = 0.3;
const MIN_DECAY_CLICKS = 30;
const MIN_MISSED_CLICKS = 3;
const AUTH_ERROR = /invalid_grant|invalid_client|unauthorized|unauthenticated|\b401\b|\b403\b/i;

export const EXPECTED_CTR = {
  1: 0.28,
  2: 0.16,
  3: 0.11,
  4: 0.08,
  5: 0.065,
  6: 0.05,
  7: 0.04,
  8: 0.032,
  9: 0.027,
  10: 0.024,
  11: 0.018,
  12: 0.016,
  13: 0.014,
  14: 0.012,
  15: 0.011,
  16: 0.01,
  17: 0.01,
  18: 0.01,
  19: 0.01,
  20: 0.01,
};

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function dateMs(iso) {
  return Date.parse(`${iso}T00:00:00Z`);
}

function week1Monday(year) {
  const jan4 = Date.UTC(year, 0, 4);
  const day = new Date(jan4).getUTCDay() || 7;
  return jan4 - (day - 1) * DAY_MS;
}

function isoWeekOf(ms) {
  const day = new Date(ms).getUTCDay() || 7;
  const thursday = ms + (4 - day) * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  const week = Math.floor((thursday - week1Monday(year)) / (7 * DAY_MS)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function isoWeekRange(week) {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(week ?? ''));
  if (!match) throw new Error(`week must look like 2026-W43, got "${week}"`);
  const year = Number(match[1]);
  const n = Number(match[2]);
  const start = week1Monday(year) + (n - 1) * 7 * DAY_MS;
  if (n < 1 || isoWeekOf(start) !== week) throw new Error(`${week} is not a week of ${year}`);
  return { week, start: isoDate(start), end: isoDate(start + 6 * DAY_MS) };
}

function defaultWeek(now) {
  const lagged = now.getTime() - LAG_DAYS * DAY_MS;
  const day = Date.UTC(
    new Date(lagged).getUTCFullYear(),
    new Date(lagged).getUTCMonth(),
    new Date(lagged).getUTCDate(),
  );
  const sunday = day - new Date(day).getUTCDay() * DAY_MS;
  return isoWeekOf(sunday);
}

function quarterRanges(range) {
  const end = dateMs(range.end);
  const start = end - (QUARTER_DAYS - 1) * DAY_MS;
  const priorEnd = start - DAY_MS;
  return {
    quarter: { start: isoDate(start), end: range.end },
    priorQuarter: { start: isoDate(priorEnd - (QUARTER_DAYS - 1) * DAY_MS), end: isoDate(priorEnd) },
  };
}

function pageKey(page) {
  let path;
  try {
    path = new URL(page).pathname;
  } catch {
    path = String(page);
  }
  return path.length > 1 ? path.replace(/\/+$/, '') : '/';
}

export function indexIssueOf(coverageState = '') {
  if (/noindex/i.test(coverageState)) return 'noindex';
  if (/soft 404|crawled.*not indexed/i.test(coverageState)) return 'thin';
  if (/duplicate/i.test(coverageState)) return 'duplicate';
  if (/alternate page with proper canonical/i.test(coverageState)) return null;
  if (/canonical/i.test(coverageState)) return 'canonical';
  if (/discovered.*not indexed|submitted.*not indexed|sitemap/i.test(coverageState)) return 'sitemap-not-indexed';
  return 'other';
}

function localeOf(page) {
  try {
    return /^\/nl(\/|$)/.test(new URL(page).pathname) ? 'nl' : 'en';
  } catch {
    return /^\/nl(\/|$)/.test(page) ? 'nl' : 'en';
  }
}

function normalise(rows, searchType) {
  return (rows ?? []).map((row) => {
    const [page, query] = row.keys;
    return {
      page,
      ...(query === undefined ? {} : { query, brand: BRAND.test(query) }),
      locale: localeOf(page),
      searchType,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    };
  });
}

function totals(rows) {
  const clicks = rows.reduce((sum, r) => sum + r.clicks, 0);
  const impressions = rows.reduce((sum, r) => sum + r.impressions, 0);
  const weighted = rows.reduce((sum, r) => sum + r.position * r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions ? round(clicks / impressions, 4) : 0,
    position: impressions ? round(weighted / impressions, 1) : 0,
  };
}

function round(value, places) {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(row);
  }
  return groups;
}

function aggregate(rows, key) {
  return [...groupBy(rows, key)]
    .map(([value, group]) => ({ [key]: value, ...totals(group) }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
}

async function query(client, siteUrl, { start, end }, dimensions, type) {
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: { startDate: start, endDate: end, dimensions, type, rowLimit: ROW_LIMIT },
  });
  return res.data?.rows ?? [];
}

async function inspect(client, siteUrl, url) {
  try {
    const res = await client.urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl },
    });
    const status = res.data?.inspectionResult?.indexStatusResult ?? {};
    return {
      url,
      verdict: status.verdict ?? 'VERDICT_UNSPECIFIED',
      coverageState: status.coverageState ?? '',
      lastCrawlTime: status.lastCrawlTime ?? null,
    };
  } catch (err) {
    return { url, verdict: null, error: err.message };
  }
}

export async function fetchSearchConsole({ client, siteUrl, range, inspectLimit = INSPECT_LIMIT }) {
  const { quarter, priorQuarter } = quarterRanges(range);
  const [web, image, video, q, pq] = await Promise.all([
    ...SEARCH_TYPES.map((type) => query(client, siteUrl, range, ['page', 'query'], type)),
    query(client, siteUrl, quarter, ['page'], 'web'),
    query(client, siteUrl, priorQuarter, ['page'], 'web'),
  ]);
  const rows = {
    web: normalise(web, 'web'),
    image: normalise(image, 'image'),
    video: normalise(video, 'video'),
  };
  const pages = aggregate(rows.web, 'page');
  const topPages = [...pages]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, inspectLimit)
    .map((p) => p.page);
  const index = await Promise.all(topPages.map((url) => inspect(client, siteUrl, url)));
  const brandRows = rows.web.filter((r) => r.brand);
  const nonBrandRows = rows.web.filter((r) => !r.brand);
  const all = totals(rows.web);
  const brand = totals(brandRows);
  DEBUG && console.log('search console rows', rows.web.length, rows.image.length, rows.video.length);
  return {
    siteUrl,
    range,
    rows,
    totals: Object.fromEntries(SEARCH_TYPES.map((t) => [t, totals(rows[t])])),
    byLocale: {
      en: totals(rows.web.filter((r) => r.locale === 'en')),
      nl: totals(rows.web.filter((r) => r.locale === 'nl')),
    },
    brand: {
      brand,
      nonBrand: totals(nonBrandRows),
      brandShare: all.clicks ? round(brand.clicks / all.clicks, 4) : 0,
    },
    pages,
    queries: aggregate(rows.web, 'query'),
    quarter: { ...quarter, pages: normalise(q, 'web') },
    priorQuarter: { ...priorQuarter, pages: normalise(pq, 'web') },
    index,
    cwv: null,
  };
}

function expectedCtr(position) {
  return EXPECTED_CTR[Math.min(20, Math.max(1, Math.round(position)))];
}

export function buildFindings(gsc) {
  const findings = [];
  const web = gsc.rows?.web ?? [];
  const nonBrand = web.filter((r) => !r.brand);

  for (const r of nonBrand) {
    const base = { page: r.page, query: r.query, locale: r.locale };
    const stats = { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position };
    if (r.position >= 4 && r.position <= 15 && r.impressions >= MIN_IMPRESSIONS) {
      const expected = expectedCtr(r.position);
      if (r.ctr < expected / 2 && (r.impressions * expected) / 2 >= MIN_MISSED_CLICKS) {
        findings.push({ type: 'low-ctr', ...base, ...stats, expectedCtr: expected });
      }
    }
    if (r.position >= 11 && r.position <= 20 && r.impressions >= MIN_IMPRESSIONS) {
      findings.push({ type: 'striking-distance', ...base, ...stats });
    }
    if (QUESTION.test(r.query.trim()) && r.impressions >= MIN_QUESTION_IMPRESSIONS) {
      findings.push({ type: 'question-query', ...base, ...stats });
    }
  }

  for (const group of groupBy(nonBrand.map((r) => ({ ...r, key: `${r.query}|${r.locale}`, path: pageKey(r.page) })), 'key').values()) {
    const byPath = new Map();
    for (const r of group) {
      const seen = byPath.get(r.path);
      if (!seen || r.position < seen.position) byPath.set(r.path, { ...r, impressions: r.impressions + (seen?.impressions ?? 0), clicks: r.clicks + (seen?.clicks ?? 0) });
      else byPath.set(r.path, { ...seen, impressions: seen.impressions + r.impressions, clicks: seen.clicks + r.clicks });
    }
    const pages = [...byPath.values()].filter((r) => r.impressions >= MIN_PAGE_IMPRESSIONS);
    if (pages.length < 2) continue;
    const ranked = [...pages].sort((a, b) => a.position - b.position);
    findings.push({
      type: 'cannibalisation',
      query: ranked[0].query,
      locale: ranked[0].locale,
      winner: ranked[0].page,
      impressions: ranked.reduce((sum, r) => sum + r.impressions, 0),
      pages: ranked.map((r) => ({ page: r.page, clicks: r.clicks, impressions: r.impressions, position: r.position })),
    });
  }

  if (gsc.brand && gsc.brand.brandShare > BRAND_SHARE_LIMIT) {
    findings.push({
      type: 'brand-share',
      brandShare: gsc.brand.brandShare,
      brandClicks: gsc.brand.brand.clicks,
      nonBrandClicks: gsc.brand.nonBrand.clicks,
    });
  }

  for (const i of gsc.index ?? []) {
    if (i.verdict && i.verdict !== 'PASS' && indexIssueOf(i.coverageState) !== null) {
      findings.push({
        type: 'index-issue',
        page: i.url,
        locale: localeOf(i.url),
        verdict: i.verdict,
        coverageState: i.coverageState,
        issue: indexIssueOf(i.coverageState),
      });
    }
  }

  for (const group of gsc.cwv?.groups ?? []) {
    for (const [metric, value] of Object.entries(group.metrics ?? {})) {
      if (value.status && value.status !== 'GOOD') {
        findings.push({
          type: 'cwv-regression',
          page: group.url ?? group.origin,
          formFactor: group.formFactor,
          metric,
          p75: value.p75,
          status: value.status,
        });
      }
    }
  }

  const prior = new Map((gsc.priorQuarter?.pages ?? []).map((p) => [p.page, p]));
  const current = new Map((gsc.quarter?.pages ?? []).map((p) => [p.page, p]));
  for (const before of prior.values()) {
    if (before.clicks < MIN_DECAY_CLICKS) continue;
    const p = current.get(before.page) ?? { page: before.page, locale: before.locale ?? localeOf(before.page), clicks: 0 };
    const drop = (before.clicks - p.clicks) / before.clicks;
    if (drop >= DECAY_DROP) {
      findings.push({
        type: 'content-decay',
        page: p.page,
        locale: p.locale,
        clicks: p.clicks,
        priorClicks: before.clicks,
        drop: round(drop, 4),
      });
    }
  }

  for (const searchType of ['image', 'video']) {
    for (const page of aggregate(gsc.rows?.[searchType] ?? [], 'page')) {
      if (page.clicks === 0 && page.impressions >= MIN_PAGE_IMPRESSIONS) {
        findings.push({
          type: 'media-no-clicks',
          page: page.page,
          locale: localeOf(page.page),
          searchType,
          impressions: page.impressions,
        });
      }
    }
  }

  return findings;
}

export function mergePosthog(report, posthog) {
  const landingPages = (posthog.landingPages ?? []).map((p) => ({
    page: p.page,
    sessions: p.sessions ?? 0,
    lead_submitted: p.lead_submitted ?? 0,
    leadRate: p.sessions ? round((p.lead_submitted ?? 0) / p.sessions, 4) : 0,
  }));
  return {
    ...report,
    posthog: {
      lowerBound: true,
      note: 'Counts are lower bounds: ad blockers drop some events, and cookieless mode counts a visitor once per day.',
      sessions: posthog.sessions ?? 0,
      sources: posthog.sources ?? [],
      device: posthog.devices ?? posthog.device ?? [],
      locale: posthog.locales ?? posthog.locale ?? [],
      landingPages,
    },
  };
}

function pct(value) {
  return `${round(value * 100, 1)}%`;
}

function table(headers, rows) {
  if (!rows.length) return '_None._\n';
  const line = (cells) => `| ${cells.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n') + '\n';
}

function pathOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url ?? '';
  }
}

function describeFinding(f) {
  switch (f.type) {
    case 'low-ctr':
      return `"${f.query}" on ${pathOf(f.page)}: CTR ${pct(f.ctr)} at position ${f.position}, expected about ${pct(f.expectedCtr)}`;
    case 'striking-distance':
      return `"${f.query}" on ${pathOf(f.page)}: position ${f.position}, ${f.impressions} impressions`;
    case 'question-query':
      return `"${f.query}" on ${pathOf(f.page)}: ${f.impressions} impressions, position ${f.position}`;
    case 'cannibalisation':
      return `"${f.query}" ranks on ${f.pages.map((p) => pathOf(p.page)).join(' and ')}; best is ${pathOf(f.winner)}`;
    case 'brand-share':
      return `Brand queries bring ${pct(f.brandShare)} of web clicks (${f.brandClicks} brand, ${f.nonBrandClicks} non-brand)`;
    case 'index-issue':
      return `${pathOf(f.page)}: ${f.verdict}, ${f.coverageState || 'no coverage state'}`;
    case 'cwv-regression':
      return `${f.formFactor ?? 'all'} ${f.metric} is ${f.status} (p75 ${f.p75}) on ${f.page}`;
    case 'content-decay':
      return `${pathOf(f.page)}: clicks ${f.priorClicks} to ${f.clicks} quarter on quarter (down ${pct(f.drop)})`;
    case 'media-no-clicks':
      return `${pathOf(f.page)}: ${f.impressions} ${f.searchType} impressions, no clicks`;
    default:
      return JSON.stringify(f);
  }
}

export function renderMarkdown(report) {
  const gsc = report.searchConsole ?? {};
  const range = report.range ?? gsc.range ?? {};
  const out = [];
  out.push(`# Growth review ${report.week}\n`);
  out.push(`Site: ${report.siteUrl ?? gsc.siteUrl ?? 'unknown'}. Period: ${range.start} to ${range.end}.\n`);
  out.push(
    `Search Console data lags about 3 days, so the last days of this period can still be incomplete until ${report.dataCompleteAfter ?? 'three days after it ends'}.\n`,
  );

  out.push('## Search Console\n');
  const web = gsc.totals?.web ?? totals([]);
  out.push(
    table(
      ['Clicks', 'Impressions', 'CTR', 'Avg position'],
      [[web.clicks, web.impressions, pct(web.ctr), web.position]],
    ),
  );

  out.push('## Brand and non-brand\n');
  const brand = gsc.brand ?? { brand: totals([]), nonBrand: totals([]), brandShare: 0 };
  out.push(
    table(
      ['Segment', 'Clicks', 'Impressions', 'CTR', 'Avg position'],
      [
        ['Brand', brand.brand.clicks, brand.brand.impressions, pct(brand.brand.ctr), brand.brand.position],
        ['Non-brand', brand.nonBrand.clicks, brand.nonBrand.impressions, pct(brand.nonBrand.ctr), brand.nonBrand.position],
      ],
    ),
  );
  out.push(`Brand share of clicks: ${pct(brand.brandShare)}.\n`);

  out.push('## By locale\n');
  out.push(
    table(
      ['Locale', 'Clicks', 'Impressions', 'CTR', 'Avg position'],
      Object.entries(gsc.byLocale ?? {}).map(([locale, t]) => [locale.toUpperCase(), t.clicks, t.impressions, pct(t.ctr), t.position]),
    ),
  );

  out.push('## Search types\n');
  out.push(
    table(
      ['Type', 'Clicks', 'Impressions', 'CTR', 'Avg position'],
      Object.entries(gsc.totals ?? {}).map(([type, t]) => [type, t.clicks, t.impressions, pct(t.ctr), t.position]),
    ),
  );

  out.push('## Top pages\n');
  out.push(
    table(
      ['Page', 'Clicks', 'Impressions', 'CTR', 'Avg position'],
      (gsc.pages ?? []).slice(0, 10).map((p) => [pathOf(p.page), p.clicks, p.impressions, pct(p.ctr), p.position]),
    ),
  );

  out.push('## Top queries\n');
  out.push(
    table(
      ['Query', 'Clicks', 'Impressions', 'CTR', 'Avg position'],
      (gsc.queries ?? []).slice(0, 10).map((q) => [q.query, q.clicks, q.impressions, pct(q.ctr), q.position]),
    ),
  );

  out.push('## Index status\n');
  out.push(
    table(
      ['Page', 'Verdict', 'Coverage'],
      (gsc.index ?? []).map((i) => [pathOf(i.url), i.verdict ?? 'error', i.coverageState ?? i.error ?? '']),
    ),
  );

  out.push('## Core Web Vitals\n');
  if (gsc.cwv?.groups?.length) {
    out.push(
      table(
        ['Group', 'Form factor', 'LCP', 'INP', 'CLS'],
        gsc.cwv.groups.map((g) => [
          g.url ?? g.origin,
          g.formFactor ?? 'all',
          ...['LCP', 'INP', 'CLS'].map((m) => (g.metrics?.[m] ? `${g.metrics[m].status} (${g.metrics[m].p75})` : 'n/a')),
        ]),
      ),
    );
  } else {
    out.push(`${gsc.cwv?.note ?? 'No Core Web Vitals data this run.'}\n`);
  }

  out.push('## Findings\n');
  const findings = report.findings ?? [];
  if (!findings.length) out.push('_None._\n');
  else out.push(findings.map((f) => `- **${f.type}** ${describeFinding(f)}`).join('\n') + '\n');

  if (report.posthog) {
    const ph = report.posthog;
    out.push('## PostHog\n');
    out.push(`${ph.note} Sessions: ${ph.sessions}.\n`);
    out.push(table(['Source', 'Sessions'], ph.sources.map((s) => [s.source, s.sessions])));
    out.push(table(['Device', 'Sessions'], ph.device.map((d) => [d.device, d.sessions])));
    out.push(table(['Locale', 'Sessions'], ph.locale.map((l) => [l.locale, l.sessions])));
    out.push(
      table(
        ['Landing page', 'Sessions', 'lead_submitted', 'Rate'],
        ph.landingPages.map((p) => [p.page, p.sessions, p.lead_submitted, pct(p.leadRate)]),
      ),
    );
  }

  return out.join('\n');
}

async function readJson(dir, name, fallback) {
  try {
    return JSON.parse(await readFile(join(dir, name), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw err;
  }
}

async function fixtureClient(dir, range) {
  const { quarter } = quarterRanges(range);
  const data = {
    web: await readJson(dir, 'searchanalytics-web.json', { rows: [] }),
    image: await readJson(dir, 'searchanalytics-image.json', { rows: [] }),
    video: await readJson(dir, 'searchanalytics-video.json', { rows: [] }),
    quarter: await readJson(dir, 'searchanalytics-quarter.json', { rows: [] }),
    priorQuarter: await readJson(dir, 'searchanalytics-prior-quarter.json', { rows: [] }),
    inspection: await readJson(dir, 'url-inspection.json', {}),
  };
  return {
    searchanalytics: {
      async query({ requestBody }) {
        if (requestBody.dimensions.length === 1) {
          return { data: requestBody.startDate === quarter.start ? data.quarter : data.priorQuarter };
        }
        return { data: data[requestBody.type] ?? { rows: [] } };
      },
    },
    urlInspection: {
      index: {
        async inspect({ requestBody }) {
          const result = data.inspection[requestBody.inspectionUrl] ?? {
            indexStatusResult: { verdict: 'PASS', coverageState: 'Submitted and indexed' },
          };
          return { data: { inspectionResult: result } };
        },
      },
    },
  };
}

async function googleClient(env) {
  const { google } = await import('googleapis');
  const auth = new google.auth.OAuth2(env.SZ_GOOGLE_CLIENT_ID, env.SZ_GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: env.SZ_GOOGLE_REFRESH_TOKEN });
  return google.searchconsole({ version: 'v1', auth });
}

function redact(text, env) {
  let out = String(text ?? '');
  for (const name of REQUIRED_ENV) {
    const value = env[name];
    if (value && value.length >= 6) out = out.split(value).join('[redacted]');
  }
  return out;
}

function fail(stderr, exitCode, message) {
  stderr.write(`${message}\n`);
  return { exitCode, message };
}

export async function run({
  week,
  env = process.env,
  clients = {},
  fixturesDir,
  outDir = DEFAULT_OUT_DIR,
  now = new Date(),
  stderr = process.stderr,
} = {}) {
  let range;
  try {
    range = isoWeekRange(week ?? defaultWeek(now));
  } catch (err) {
    return fail(stderr, 2, `Bad --week: ${err.message}`);
  }

  let client = clients.searchconsole;
  let cwv = null;
  let siteUrl = env.SZ_GSC_SITE_URL;
  if (fixturesDir) {
    client = await fixtureClient(fixturesDir, range);
    cwv = await readJson(fixturesDir, 'cwv.json', null);
    siteUrl = siteUrl ?? 'sc-domain:fixtures';
  } else {
    const missing = REQUIRED_ENV.filter((name) => !env[name]);
    if (missing.length) {
      return fail(
        stderr,
        2,
        `Missing ${missing.join(', ')}. Run tools/studio-zissou/google-auth-setup.js for the SZ_GOOGLE_* values (stored in the Keychain); put SZ_GSC_SITE_URL in .env.test.`,
      );
    }
  }

  let searchConsole;
  try {
    client = client ?? (await googleClient(env));
    searchConsole = await fetchSearchConsole({ client, siteUrl, range });
    if (!cwv && clients.cwv) cwv = await clients.cwv({ siteUrl, range });
  } catch (err) {
    const detail = redact(err.message, env);
    if (AUTH_ERROR.test(detail)) {
      return fail(stderr, 2, `Google auth failed (${detail}). Credentials needed: rerun tools/studio-zissou/google-auth-setup.js.`);
    }
    return fail(stderr, 1, `Search Console request failed: ${detail}`);
  }
  searchConsole.cwv = cwv ?? {
    groups: [],
    note: 'No Core Web Vitals data this run; the Search Console API does not expose the CWV report.',
  };

  const dataCompleteAfter = isoDate(dateMs(range.end) + LAG_DAYS * DAY_MS);
  const report = {
    week: range.week,
    range: { start: range.start, end: range.end },
    siteUrl,
    generatedAt: now.toISOString(),
    lagDays: LAG_DAYS,
    dataCompleteAfter,
    incomplete: now.getTime() < dateMs(dataCompleteAfter) + DAY_MS,
    source: fixturesDir ? 'fixtures' : 'search-console',
    searchConsole,
    findings: buildFindings(searchConsole),
  };

  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, `${range.week}.json`);
  const mdPath = join(outDir, `${range.week}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(mdPath, renderMarkdown(report));
  return { exitCode: 0, report, files: [jsonPath, mdPath] };
}

export async function mergePosthogFile({ week, posthogPath, outDir = DEFAULT_OUT_DIR, stderr = process.stderr }) {
  const jsonPath = join(outDir, `${week}.json`);
  const mdPath = join(outDir, `${week}.md`);
  let report;
  let posthog;
  try {
    report = JSON.parse(await readFile(jsonPath, 'utf8'));
    posthog = JSON.parse(await readFile(posthogPath, 'utf8'));
  } catch (err) {
    return fail(stderr, 2, `Cannot merge PostHog into ${jsonPath}: ${err.message}`);
  }
  const merged = mergePosthog(report, posthog);
  await writeFile(jsonPath, `${JSON.stringify(merged, null, 2)}\n`);
  await writeFile(mdPath, renderMarkdown(merged));
  return { exitCode: 0, report: merged, files: [jsonPath, mdPath] };
}

function parseArgs(argv) {
  const args = { week: undefined, fixtures: undefined, out: undefined, help: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--week':
        args.week = argv[++i];
        break;
      case '--fixtures':
        args.fixtures = argv[++i];
        break;
      case '--out':
        args.out = argv[++i];
        break;
      case '--merge-posthog':
        args.mergePosthog = argv[++i];
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        args.unknown = argv[i];
    }
  }
  return args;
}

export function keychainEnv(env, { read = keychainRead } = {}) {
  for (const [name, account] of Object.entries(KEYCHAIN_ACCOUNTS)) {
    if (env[name]) continue;
    try {
      const value = read(account);
      if (value) env[name] = value;
    } catch (err) {
      DEBUG && console.log('keychain miss', account, err.message);
    }
  }
  return env;
}

function keychainRead(account) {
  return execFileSync('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-a', account, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

async function loadEnvFile() {
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: ENV_FILE, quiet: true });
  } catch (err) {
    DEBUG && console.log('dotenv not loaded', err.message);
  }
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (args.help || args.unknown) {
    process.stderr.write(
      `${args.unknown ? `unknown argument ${args.unknown}\n` : ''}usage: report.js [--week 2026-W43] [--fixtures <dir>] [--out <dir>] [--merge-posthog <posthog.json>]\n`,
    );
    return args.help ? 0 : 2;
  }
  if (args.mergePosthog) {
    if (!args.week) return fail(process.stderr, 2, '--merge-posthog needs --week').exitCode;
    const merged = await mergePosthogFile({
      week: args.week,
      posthogPath: resolve(args.mergePosthog),
      outDir: args.out ? resolve(args.out) : DEFAULT_OUT_DIR,
    });
    return merged.exitCode;
  }
  if (!args.fixtures) {
    await loadEnvFile();
    keychainEnv(process.env);
  }
  const result = await run({
    week: args.week,
    env: process.env,
    fixturesDir: args.fixtures ? resolve(args.fixtures) : undefined,
    outDir: args.out ? resolve(args.out) : DEFAULT_OUT_DIR,
  });
  if (result.exitCode === 0) {
    process.stdout.write(`${result.files.join('\n')}\n${result.report.findings.length} findings\n`);
  }
  return result.exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
