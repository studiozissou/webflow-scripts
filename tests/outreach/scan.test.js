// Covers site facts extraction, entity decoding of the business name, parked detection, PSI lab metrics, and the scanSite adapter that runs the site-review checks with an injected fetchPage and no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFacts, isParked, labMetrics, scanSite } from '../../tools/outreach/scan.js';
import { decodeEntities } from '../../tools/outreach/text.js';
import { html, fakeFetchPage, silentLog } from './helpers.js';

const HEALTHY = 'https://trattoria-fittizia.test/';
const OLD = 'http://eetcafe-verzinsel.test/';

const psiJson = {
  lighthouseResult: {
    audits: {
      'largest-contentful-paint': { id: 'largest-contentful-paint', numericValue: 5200, displayValue: '5.2 s' },
      'total-byte-weight': { id: 'total-byte-weight', numericValue: 7500000, displayValue: 'Total size was 7,324 KiB' },
    },
  },
};

function recordingChecks(findingsByCheck = {}) {
  const calls = {};
  const make = (name) => async (args) => {
    calls[name] = (calls[name] ?? []).concat([args]);
    return findingsByCheck[name] ?? [];
  };
  return {
    calls,
    checks: { 'meta-tags': make('meta-tags'), 'broken-links': make('broken-links'), 'mixed-content': make('mixed-content'), psi: make('psi') },
  };
}

const cfg = (key = '') => ({ googlePsiApiKey: key, thresholds: { titleLength: { warning: { min: 30, max: 60 } }, descriptionLength: { warning: { min: 70, max: 160 } } } });

test('extractFacts reads a healthy site', () => {
  const f = extractFacts(html('healthy'), { url: HEALTHY });
  assert.equal(f.https, true);
  assert.equal(f.viewport, true);
  assert.equal(f.language, 'nl');
  assert.equal(f.title, 'Trattoria Fittizia | Italiaans restaurant in Den Haag');
  assert.equal(f.siteName, 'Trattoria Fittizia');
  assert.equal(f.email, 'ciao@trattoria-fittizia.test');
  assert.equal(f.phone, '+31705550123');
  assert.equal(f.postcode, '2599ZZ');
  assert.equal(f.copyrightYear, 2026);
  assert.equal(f.hasHours, true);
  assert.deepEqual(f.menu, { present: true, pdfOnly: false });
  assert.equal(f.hasBooking, true);
  assert.deepEqual(f.schemaTypes, ['Restaurant']);
  assert.equal(f.hasLocalBusinessSchema, true);
});

test('extractFacts reads a dated WordPress site', () => {
  const f = extractFacts(html('wordpress-old'), { url: OLD });
  assert.equal(f.https, false);
  assert.equal(f.viewport, false);
  assert.equal(f.language, 'nl');
  assert.equal(f.email, null);
  assert.equal(f.phone, '+31705550188');
  assert.equal(f.copyrightYear, 2019);
  assert.equal(f.hasHours, false);
  assert.deepEqual(f.menu, { present: true, pdfOnly: true });
  assert.equal(f.hasBooking, false);
  assert.equal(f.hasLocalBusinessSchema, false);
});

test('extractFacts maps en-GB and en-US to en, and a missing lang to null', () => {
  assert.equal(extractFacts(html('squarespace'), { url: 'https://bloemen-fictief.test/' }).language, 'en');
  assert.equal(extractFacts(html('wordpress-new'), { url: 'https://wijnbar-denkbeeld.test/' }).language, 'en');
  assert.equal(extractFacts('<html><head><title>X</title></head></html>', { url: 'https://x.test/' }).language, null);
});

test('siteName prefers og:site_name, else the title before the separator, entity-decoded', () => {
  const f = extractFacts('<html><head><title>Gelateria Inventata&#x27;s | IJs &amp; koffie</title></head></html>', { url: 'https://gelateria-inventata.test/' });
  assert.equal(f.siteName, "Gelateria Inventata's");
  const g = extractFacts('<html><head><meta property="og:site_name" content="Caf&eacute; Bedacht"><title>Home - Iets anders</title></head></html>', { url: 'https://cafe-bedacht.test/' });
  assert.equal(g.siteName, 'Café Bedacht');
});

test('decodeEntities handles hex, decimal and named entities', () => {
  assert.equal(decodeEntities('Gianni Verzonnen&#x27;s'), "Gianni Verzonnen's");
  assert.equal(decodeEntities('Bar &#39;t Hoekje'), "Bar 't Hoekje");
  assert.equal(decodeEntities('Brood &amp; Spelen'), 'Brood & Spelen');
  assert.equal(decodeEntities('&quot;Fictief&quot;'), '"Fictief"');
});

test('LocalBusiness schema is found inside @graph and in subtypes, not in WebSite only', () => {
  const graph = '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite"},{"@type":"LocalBusiness","name":"Fictief"}]}</script>';
  assert.equal(extractFacts(graph, { url: 'https://x.test/' }).hasLocalBusinessSchema, true);
  const vet = '<script type="application/ld+json">{"@type":["VeterinaryCare"],"name":"Fictief"}</script>';
  assert.equal(extractFacts(vet, { url: 'https://x.test/' }).hasLocalBusinessSchema, true);
  const site = '<script type="application/ld+json">{"@type":"WebSite","name":"Fictief"}</script>';
  assert.equal(extractFacts(site, { url: 'https://x.test/' }).hasLocalBusinessSchema, false);
  const broken = '<script type="application/ld+json">{not json</script>';
  assert.equal(extractFacts(broken, { url: 'https://x.test/' }).hasLocalBusinessSchema, false);
});

test('isParked spots a for-sale page and not a real one', () => {
  assert.equal(isParked(html('parked')), true);
  assert.equal(isParked(html('healthy')), false);
});

test('labMetrics reads LCP and total byte weight from lighthouseResult.audits', () => {
  assert.deepEqual(labMetrics(psiJson), { lcpMs: 5200, totalBytes: 7500000 });
  assert.equal(labMetrics(null), null);
  assert.deepEqual(labMetrics({ lighthouseResult: { audits: {} } }), { lcpMs: null, totalBytes: null });
});

test('scanSite calls each reused check with {url, pages:[url], config, log, fetchPage}', async () => {
  const fetchPage = fakeFetchPage({ [HEALTHY]: { html: html('healthy') } });
  const { calls, checks } = recordingChecks({ 'meta-tags': [{ check: 'meta-tags', severity: 'warning', title: 'Missing canonical link', url: HEALTHY }] });
  const result = await scanSite(HEALTHY, { fetchPage, checks, config: cfg(), log: silentLog });

  for (const name of ['meta-tags', 'broken-links', 'mixed-content']) {
    assert.equal(calls[name]?.length, 1, `${name} called once`);
    const args = calls[name][0];
    assert.equal(args.url, HEALTHY);
    assert.deepEqual(args.pages, [HEALTHY]);
    assert.ok(args.config.thresholds, 'config has thresholds');
    assert.equal(typeof args.log.log, 'function');
    assert.equal((await args.fetchPage(HEALTHY)).html, html('healthy'));
  }
  assert.equal(calls.psi, undefined, 'psi skipped without GOOGLE_PSI_API_KEY');
  assert.equal(result.reachable, true);
  assert.equal(result.parked, false);
  assert.equal(result.url, HEALTHY);
  assert.equal(result.finalUrl, HEALTHY);
  assert.equal(result.facts.siteName, 'Trattoria Fittizia');
  assert.equal(result.platform.builder, 'unknown');
  assert.equal(result.lab, null);
  assert.deepEqual(result.findings.map((f) => f.title), ['Missing canonical link']);
});

test('scanSite runs psi and reads lab metrics only when a PSI key is configured', async () => {
  const fetchPage = fakeFetchPage({ [HEALTHY]: { html: html('healthy') } });
  const { calls, checks } = recordingChecks();
  const psiCalls = [];
  const psi = async (url) => { psiCalls.push(url); return psiJson; };
  const result = await scanSite(HEALTHY, { fetchPage, checks, config: cfg('fake-psi-key'), log: silentLog, psi });
  assert.equal(calls.psi.length, 1);
  assert.deepEqual(psiCalls, [HEALTHY]);
  assert.deepEqual(result.lab, { lcpMs: 5200, totalBytes: 7500000 });
});

test('scanSite judges HTTPS on the final URL after redirects', async () => {
  const fetchPage = fakeFetchPage({ 'http://koffiebar-voorbeeld.test/': { html: html('webflow'), finalUrl: 'https://www.koffiebar-voorbeeld.test/', redirectChain: ['http://koffiebar-voorbeeld.test/'] } });
  const { checks } = recordingChecks();
  const result = await scanSite('http://koffiebar-voorbeeld.test/', { fetchPage, checks, config: cfg(), log: silentLog });
  assert.equal(result.finalUrl, 'https://www.koffiebar-voorbeeld.test/');
  assert.equal(result.facts.https, true);
  assert.equal(result.platform.builder, 'webflow');
});

test('scanSite marks an unreachable site and runs no checks', async () => {
  const fetchPage = fakeFetchPage({});
  const { calls, checks } = recordingChecks();
  const result = await scanSite('https://weg-zaak.test/', { fetchPage, checks, config: cfg(), log: silentLog });
  assert.equal(result.reachable, false);
  assert.deepEqual(result.findings, []);
  assert.deepEqual(calls, {});
});

test('scanSite marks a parked domain and runs no checks', async () => {
  const fetchPage = fakeFetchPage({ 'https://verlaten-zaak.test/': { html: html('parked') } });
  const { calls, checks } = recordingChecks();
  const result = await scanSite('https://verlaten-zaak.test/', { fetchPage, checks, config: cfg(), log: silentLog });
  assert.equal(result.reachable, true);
  assert.equal(result.parked, true);
  assert.deepEqual(calls, {});
});

test('scanSite records a failing check as an error and keeps the other findings', async () => {
  const fetchPage = fakeFetchPage({ [HEALTHY]: { html: html('healthy') } });
  const { checks } = recordingChecks({ 'mixed-content': [{ check: 'mixed-content', severity: 'warning', title: 'Mixed content', url: HEALTHY }] });
  checks['broken-links'] = async () => { throw new Error('HEAD pool exploded'); };
  const result = await scanSite(HEALTHY, { fetchPage, checks, config: cfg(), log: silentLog });
  assert.deepEqual(result.errors, [{ check: 'broken-links', message: 'HEAD pool exploded' }]);
  assert.deepEqual(result.findings.map((f) => f.check), ['mixed-content']);
});

test('scanSite uses the real meta-tags and mixed-content checks when not overridden', async () => {
  const fetchPage = fakeFetchPage({ [OLD]: { html: html('wordpress-old') } });
  const result = await scanSite(OLD, { fetchPage, checks: { 'broken-links': async () => [] }, config: cfg(), log: silentLog });
  const titles = result.findings.filter((f) => f.check === 'meta-tags').map((f) => f.title);
  assert.ok(titles.includes('Missing meta description'), `got ${titles.join(', ')}`);
  assert.equal(result.findings.some((f) => f.check === 'mixed-content'), false, 'mixed-content skips http sites');
  assert.equal(result.platform.eol, true);
});
