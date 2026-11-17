// Unit tests for the Studio Zissou weekly growth report: ISO weeks, Search Console parsing, findings, markdown and the run() file output, with fixture JSON and no network.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isoWeekRange,
  fetchSearchConsole,
  mergePosthog,
  buildFindings,
  renderMarkdown,
  run,
  main,
} from '../../tools/studio-zissou/report.js';

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));

async function fixture(name) {
  return JSON.parse(await readFile(join(FIXTURES, name), 'utf8'));
}

function fakeClient(files) {
  const calls = [];
  return {
    calls,
    searchanalytics: {
      async query(params) {
        calls.push(params);
        const body = params.requestBody;
        if (body.dimensions.length === 1) {
          return { data: body.startDate === files.quarterStart ? files.quarter : files.priorQuarter };
        }
        return { data: files[body.type] ?? { rows: [] } };
      },
    },
    urlInspection: {
      index: {
        async inspect(params) {
          calls.push(params);
          const url = params.requestBody.inspectionUrl;
          return {
            data: {
              inspectionResult: files.inspection[url] ?? {
                indexStatusResult: { verdict: 'PASS', coverageState: 'Submitted and indexed' },
              },
            },
          };
        },
      },
    },
  };
}

async function loadGsc() {
  const range = isoWeekRange('2026-W43');
  const client = fakeClient({
    web: await fixture('searchanalytics-web.json'),
    image: await fixture('searchanalytics-image.json'),
    video: await fixture('searchanalytics-video.json'),
    quarter: await fixture('searchanalytics-quarter.json'),
    priorQuarter: await fixture('searchanalytics-prior-quarter.json'),
    inspection: await fixture('url-inspection.json'),
    quarterStart: '2026-07-27',
  });
  const gsc = await fetchSearchConsole({ client, siteUrl: 'sc-domain:studiozissou.io', range });
  gsc.cwv = await fixture('cwv.json');
  return { gsc, client, range };
}

function captureStream() {
  const chunks = [];
  return { write: (s) => chunks.push(String(s)), text: () => chunks.join('') };
}

describe('isoWeekRange', () => {
  test('2026-W43 runs Monday 19 Oct to Sunday 25 Oct', () => {
    assert.deepEqual(isoWeekRange('2026-W43'), {
      week: '2026-W43',
      start: '2026-10-19',
      end: '2026-10-25',
    });
  });

  test('2026-W01 starts in December 2025', () => {
    const r = isoWeekRange('2026-W01');
    assert.equal(r.start, '2025-12-29');
    assert.equal(r.end, '2026-01-04');
  });

  test('2026-W53 ends in January 2027', () => {
    const r = isoWeekRange('2026-W53');
    assert.equal(r.start, '2026-12-28');
    assert.equal(r.end, '2027-01-03');
  });

  test('rejects a week the year does not have and a malformed value', () => {
    assert.throws(() => isoWeekRange('2025-W53'));
    assert.throws(() => isoWeekRange('2026-43'));
  });
});

describe('fetchSearchConsole', () => {
  test('stays near 12 requests and asks for web, image and video', async () => {
    const { client } = await loadGsc();
    assert.ok(client.calls.length <= 12, `made ${client.calls.length} requests`);
    const types = client.calls
      .filter((c) => c.requestBody.dimensions?.length === 2)
      .map((c) => c.requestBody.type)
      .sort();
    assert.deepEqual(types, ['image', 'video', 'web']);
    const weekly = client.calls.find((c) => c.requestBody.type === 'web');
    assert.equal(weekly.siteUrl, 'sc-domain:studiozissou.io');
    assert.equal(weekly.requestBody.startDate, '2026-10-19');
    assert.equal(weekly.requestBody.endDate, '2026-10-25');
  });

  test('normalises rows with locale and brand flags', async () => {
    const { gsc } = await loadGsc();
    const nl = gsc.rows.web.find((r) => r.page.endsWith('/nl/'));
    assert.equal(nl.locale, 'nl');
    assert.equal(nl.brand, true);
    const service = gsc.rows.web.find((r) => r.query === 'webflow developer amsterdam');
    assert.equal(service.locale, 'en');
    assert.equal(service.brand, false);
    assert.ok(gsc.byLocale.en.clicks > 0 && gsc.byLocale.nl.clicks > 0);
    assert.equal(gsc.totals.web.clicks, 72);
  });

  test('records index status per inspected page', async () => {
    const { gsc } = await loadGsc();
    const pricing = gsc.index.find((i) => i.url === 'https://studiozissou.io/pricing');
    assert.equal(pricing.verdict, 'NEUTRAL');
    assert.match(pricing.coverageState, /not indexed/);
  });
});

describe('buildFindings', () => {
  test('flags low CTR at position 4 to 15', async () => {
    const { gsc } = await loadGsc();
    const lowCtr = buildFindings(gsc).filter((f) => f.type === 'low-ctr');
    assert.ok(lowCtr.length >= 1);
    const hit = lowCtr.find((f) => f.query === 'webflow developer amsterdam');
    assert.ok(hit);
    assert.ok(hit.ctr < hit.expectedCtr / 2);
    assert.ok(lowCtr.every((f) => f.position >= 4 && f.position <= 15));
  });

  test('flags question queries in English and Dutch', async () => {
    const { gsc } = await loadGsc();
    const qs = buildFindings(gsc).filter((f) => f.type === 'question-query');
    const queries = qs.map((f) => f.query);
    assert.ok(queries.includes('how much does a webflow website cost'));
    assert.ok(queries.includes('wat kost een webflow website'));
    assert.equal(qs.find((f) => f.query.startsWith('wat')).locale, 'nl');
  });

  test('splits brand and non-brand and flags brand share over 60%', async () => {
    const { gsc } = await loadGsc();
    assert.equal(gsc.brand.brand.clicks, 65);
    assert.equal(gsc.brand.nonBrand.clicks, 7);
    const share = buildFindings(gsc).find((f) => f.type === 'brand-share');
    assert.ok(share);
    assert.ok(share.brandShare > 0.6);
  });

  test('flags cannibalisation, striking distance, index, CWV, decay and media findings', async () => {
    const { gsc } = await loadGsc();
    const findings = buildFindings(gsc);
    const types = new Set(findings.map((f) => f.type));
    for (const t of [
      'cannibalisation',
      'striking-distance',
      'index-issue',
      'cwv-regression',
      'content-decay',
      'media-no-clicks',
    ]) {
      assert.ok(types.has(t), `missing ${t}`);
    }
    const cannibal = findings.find((f) => f.type === 'cannibalisation');
    assert.equal(cannibal.query, 'webflow developer amsterdam');
    assert.equal(cannibal.pages.length, 2);
    const decay = findings.find((f) => f.type === 'content-decay');
    assert.equal(decay.page, 'https://studiozissou.io/services/webflow-development');
    const media = findings.find((f) => f.type === 'media-no-clicks');
    assert.equal(media.searchType, 'image');
  });

  const row = (over) => ({ page: 'https://studiozissou.io/pricing', query: 'webflow care', locale: 'en', brand: false, clicks: 0, impressions: 100, ctr: 0, position: 6, ...over });

  test('low-ctr needs at least 3 expected missed clicks, so thin rows are not rewritten', () => {
    const thin = buildFindings({ rows: { web: [row({ impressions: 50, position: 14 })] } });
    assert.ok(!thin.some((f) => f.type === 'low-ctr'));
    const busy = buildFindings({ rows: { web: [row({ impressions: 400, position: 6 })] } });
    assert.ok(busy.some((f) => f.type === 'low-ctr'));
  });

  test('Dutch question words include hoeveel and hoelang; kosten and prijs alone are not questions', () => {
    const qs = (query) => buildFindings({ rows: { web: [row({ query, locale: 'nl', page: 'https://studiozissou.io/nl/tarieven', impressions: 20, position: 30 })] } }).some((f) => f.type === 'question-query');
    assert.ok(qs('hoeveel kost een website'));
    assert.ok(qs('hoelang duurt een website bouwen'));
    assert.ok(!qs('kosten website laten maken'));
    assert.ok(!qs('prijs webflow website'));
  });

  test('cannibalisation is per locale, collapses URL variants and carries impressions', () => {
    const findings = buildFindings({
      rows: {
        web: [
          row({ query: 'webflow', page: 'https://studiozissou.io/services/webflow-development', position: 5, impressions: 300 }),
          row({ query: 'webflow', page: 'https://studiozissou.io/services/webflow-development/', position: 9, impressions: 40 }),
          row({ query: 'webflow', page: 'https://studiozissou.io/nl/diensten/webflow-ontwikkeling', locale: 'nl', position: 7, impressions: 80 }),
        ],
      },
    });
    assert.ok(!findings.some((f) => f.type === 'cannibalisation'));
    const twoEn = buildFindings({
      rows: {
        web: [
          row({ query: 'webflow', page: 'https://studiozissou.io/services/webflow-development', position: 5, impressions: 300 }),
          row({ query: 'webflow', page: 'https://studiozissou.io/for-agencies', position: 12, impressions: 60 }),
        ],
      },
    }).find((f) => f.type === 'cannibalisation');
    assert.equal(twoEn.locale, 'en');
    assert.equal(twoEn.impressions, 360);
  });

  test('index findings carry an issue the recommender understands', () => {
    const issueOf = (coverageState) => buildFindings({ index: [{ url: 'https://studiozissou.io/work', verdict: 'NEUTRAL', coverageState }] }).find((f) => f.type === 'index-issue').issue;
    assert.equal(issueOf("Excluded by 'noindex' tag"), 'noindex');
    assert.equal(issueOf('Crawled - currently not indexed'), 'thin');
    assert.equal(issueOf('Soft 404'), 'thin');
    assert.equal(issueOf('Duplicate without user-selected canonical'), 'duplicate');
    assert.equal(issueOf('Alternate page with proper canonical tag'), 'canonical');
    assert.equal(issueOf('Discovered - currently not indexed'), 'sitemap-not-indexed');
    assert.equal(issueOf('Something new'), 'other');
  });

  test('content decay needs 30 prior clicks', () => {
    const decay = (priorClicks) => buildFindings({
      quarter: { pages: [{ page: 'https://studiozissou.io/work', locale: 'en', clicks: 1 }] },
      priorQuarter: { pages: [{ page: 'https://studiozissou.io/work', clicks: priorClicks }] },
    }).some((f) => f.type === 'content-decay');
    assert.ok(!decay(20));
    assert.ok(decay(30));
  });

  test('brand queries never count as low CTR or cannibalisation', async () => {
    const { gsc } = await loadGsc();
    const findings = buildFindings(gsc);
    assert.ok(!findings.some((f) => f.query && /zissou/.test(f.query)));
  });
});

describe('mergePosthog', () => {
  test('adds a posthog block marked as lower bounds without changing the input', () => {
    const report = { week: '2026-W43', findings: [] };
    const merged = mergePosthog(report, {
      sessions: 140,
      sources: [{ source: 'organic', sessions: 80 }],
      devices: [{ device: 'mobile', sessions: 90 }],
      locales: [{ locale: 'nl', sessions: 60 }],
      landingPages: [
        { page: '/pricing', sessions: 40, lead_submitted: 2 },
        { page: '/', sessions: 0, lead_submitted: 0 },
      ],
    });
    assert.equal(report.posthog, undefined);
    assert.equal(merged.posthog.lowerBound, true);
    assert.match(merged.posthog.note, /lower bound/i);
    assert.equal(merged.posthog.sessions, 140);
    assert.deepEqual(merged.posthog.sources, [{ source: 'organic', sessions: 80 }]);
    assert.deepEqual(merged.posthog.device, [{ device: 'mobile', sessions: 90 }]);
    assert.deepEqual(merged.posthog.locale, [{ locale: 'nl', sessions: 60 }]);
    const pricing = merged.posthog.landingPages.find((p) => p.page === '/pricing');
    assert.equal(pricing.lead_submitted, 2);
    assert.equal(pricing.leadRate, 0.05);
    assert.equal(merged.posthog.landingPages.find((p) => p.page === '/').leadRate, 0);
  });
});

describe('renderMarkdown', () => {
  test('has the section headings and the lag note', async () => {
    const { gsc, range } = await loadGsc();
    const report = mergePosthog(
      { week: range.week, range, siteUrl: 'sc-domain:studiozissou.io', searchConsole: gsc, findings: buildFindings(gsc) },
      { sessions: 10, sources: [], devices: [], locales: [], landingPages: [] },
    );
    const md = renderMarkdown(report);
    for (const heading of [
      '# Growth review 2026-W43',
      '## Search Console',
      '## Brand and non-brand',
      '## By locale',
      '## Search types',
      '## Index status',
      '## Core Web Vitals',
      '## Findings',
      '## PostHog',
    ]) {
      assert.ok(md.includes(heading), `missing ${heading}`);
    }
    assert.match(md, /lags about 3 days/);
    assert.match(md, /2026-10-19 to 2026-10-25/);
    assert.match(md, /lower bound/i);
    assert.match(md, /low-ctr/);
  });
});

describe('merge-posthog', () => {
  test('--merge-posthog adds PostHog to an existing week file and re-renders the md without Google', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'sz-merge-'));
    try {
      await run({ week: '2026-W43', env: {}, fixturesDir: FIXTURES, outDir });
      const posthogPath = join(outDir, 'posthog.json');
      await writeFile(posthogPath, JSON.stringify({ sessions: 210, sources: [{ source: 'organic', sessions: 120 }], landingPages: [{ page: '/pricing', sessions: 40, lead_submitted: 3 }] }));
      const code = await main(['--week', '2026-W43', '--out', outDir, '--merge-posthog', posthogPath]);
      assert.equal(code, 0);
      const json = JSON.parse(await readFile(join(outDir, '2026-W43.json'), 'utf8'));
      assert.equal(json.posthog.sessions, 210);
      assert.ok(json.findings.some((f) => f.type === 'low-ctr'));
      assert.match(await readFile(join(outDir, '2026-W43.md'), 'utf8'), /PostHog/);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test('--merge-posthog without the week file exits 2', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'sz-merge-'));
    try {
      const code = await main(['--week', '2026-W43', '--out', outDir, '--merge-posthog', join(outDir, 'none.json')]);
      assert.equal(code, 2);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

describe('run', () => {
  test('with fixtures writes the json and md files into outDir', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'sz-report-'));
    try {
      const result = await run({ week: '2026-W43', env: {}, fixturesDir: FIXTURES, outDir });
      assert.equal(result.exitCode, 0);
      const files = (await readdir(outDir)).sort();
      assert.deepEqual(files, ['2026-W43.json', '2026-W43.md']);
      const json = JSON.parse(await readFile(join(outDir, '2026-W43.json'), 'utf8'));
      assert.equal(json.week, '2026-W43');
      assert.ok(json.findings.some((f) => f.type === 'low-ctr'));
      assert.ok(json.findings.some((f) => f.type === 'question-query'));
      assert.ok(json.searchConsole.cwv.groups.length > 0);
      const md = await readFile(join(outDir, '2026-W43.md'), 'utf8');
      assert.match(md, /# Growth review 2026-W43/);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test('without a week picks the last full week at least 3 days old', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'sz-report-'));
    try {
      const result = await run({
        env: {},
        fixturesDir: FIXTURES,
        outDir,
        now: new Date('2026-10-28T08:00:00Z'),
      });
      assert.equal(result.report.week, '2026-W43');
      const early = await run({
        env: {},
        fixturesDir: FIXTURES,
        outDir,
        now: new Date('2026-10-27T08:00:00Z'),
      });
      assert.equal(early.report.week, '2026-W42');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test('without fixtures and a missing variable returns 2 and names it without secrets', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'sz-report-'));
    const stderr = captureStream();
    const secret = '1//0gSECRETrefreshTOKENvalue-abcdef';
    try {
      const result = await run({
        week: '2026-W43',
        env: {
          SZ_GOOGLE_CLIENT_ID: 'client-id-value.apps.googleusercontent.com',
          SZ_GOOGLE_CLIENT_SECRET: 'GOCSPX-supersecretvalue',
          SZ_GOOGLE_REFRESH_TOKEN: secret,
        },
        outDir,
        stderr,
      });
      assert.equal(result.exitCode, 2);
      const text = stderr.text() + result.message;
      assert.match(text, /SZ_GSC_SITE_URL/);
      assert.ok(!text.includes(secret));
      assert.ok(!text.includes('GOCSPX'));
      assert.ok(!text.includes('client-id-value'));
      assert.deepEqual(await readdir(outDir), []);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test('names every missing variable when none are set', async () => {
    const stderr = captureStream();
    const result = await run({ week: '2026-W43', env: {}, stderr });
    assert.equal(result.exitCode, 2);
    for (const name of [
      'SZ_GOOGLE_CLIENT_ID',
      'SZ_GOOGLE_CLIENT_SECRET',
      'SZ_GOOGLE_REFRESH_TOKEN',
      'SZ_GSC_SITE_URL',
    ]) {
      assert.match(stderr.text(), new RegExp(name));
    }
  });

  test('a bad week returns 2 with a plain message', async () => {
    const stderr = captureStream();
    const result = await run({ week: 'last-week', env: {}, fixturesDir: FIXTURES, stderr });
    assert.equal(result.exitCode, 2);
    assert.match(stderr.text(), /week/i);
  });
});

describe('google-auth-setup', () => {
  test('imports without side effects and asks for the client values', async () => {
    const { main: setup } = await import('../../tools/studio-zissou/google-auth-setup.js');
    const stderr = captureStream();
    const stdout = captureStream();
    assert.equal(await setup([], { stdout, stderr }), 2);
    assert.match(stderr.text(), /client_id/);
    assert.equal(stdout.text(), '');
  });

  test('saveTokens stores the three values in the Keychain and prints names only', async () => {
    const { saveTokens, KEYCHAIN_ACCOUNTS } = await import('../../tools/studio-zissou/google-auth-setup.js');
    const stored = {};
    const stdout = captureStream();
    const code = saveTokens(
      { clientId: 'cid-123', clientSecret: 'sec-456', tokens: { refresh_token: 'rt-789' } },
      { store: (account, value) => { stored[account] = value; }, stdout },
    );
    assert.equal(code, 0);
    assert.deepEqual(stored, {
      [KEYCHAIN_ACCOUNTS.SZ_GOOGLE_CLIENT_ID]: 'cid-123',
      [KEYCHAIN_ACCOUNTS.SZ_GOOGLE_CLIENT_SECRET]: 'sec-456',
      [KEYCHAIN_ACCOUNTS.SZ_GOOGLE_REFRESH_TOKEN]: 'rt-789',
    });
    assert.doesNotMatch(stdout.text(), /cid-123|sec-456|rt-789/);
    assert.match(stdout.text(), /SZ_GOOGLE_REFRESH_TOKEN/);
  });

  test('saveTokens exits 1 and stores nothing when Google returns no refresh token', async () => {
    const { saveTokens } = await import('../../tools/studio-zissou/google-auth-setup.js');
    const stored = [];
    const stderr = captureStream();
    const code = saveTokens({ clientId: 'c', clientSecret: 's', tokens: {} }, { store: (a) => stored.push(a), stdout: captureStream(), stderr });
    assert.equal(code, 1);
    assert.equal(stored.length, 0);
    assert.match(stderr.text(), /refresh token/);
  });
});

describe('keychainEnv', () => {
  test('fills only missing SZ_GOOGLE_* values from the Keychain', async () => {
    const { keychainEnv } = await import('../../tools/studio-zissou/report.js');
    const env = { SZ_GOOGLE_CLIENT_ID: 'from-env' };
    keychainEnv(env, { read: (account) => (account.includes('refresh') ? 'rt' : account.includes('secret') ? 'sec' : 'kc-id') });
    assert.equal(env.SZ_GOOGLE_CLIENT_ID, 'from-env');
    assert.equal(env.SZ_GOOGLE_CLIENT_SECRET, 'sec');
    assert.equal(env.SZ_GOOGLE_REFRESH_TOKEN, 'rt');
  });

  test('a Keychain miss leaves the value unset', async () => {
    const { keychainEnv } = await import('../../tools/studio-zissou/report.js');
    const env = {};
    keychainEnv(env, { read: () => { throw new Error('not found'); } });
    assert.equal(env.SZ_GOOGLE_CLIENT_SECRET, undefined);
  });
});

describe('main', () => {
  test('parses --week, --fixtures and --out', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'sz-report-'));
    try {
      const code = await main(['--week', '2026-W43', '--fixtures', FIXTURES, '--out', outDir]);
      assert.equal(code, 0);
      assert.deepEqual((await readdir(outDir)).sort(), ['2026-W43.json', '2026-W43.md']);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
