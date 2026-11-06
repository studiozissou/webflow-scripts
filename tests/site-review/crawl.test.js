// Tests for crawlSite scheduling, politeness, robots handling, slow abort, the link-target pass and the capped external pass.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { crawlSite } from '../../tools/site-review/lib/crawl.js';
import { discoverSite } from '../../tools/site-review/lib/discovery.js';
import { fetchPage } from '../../tools/site-review/lib/fetch-page.js';
import { urlKey } from '../../tools/site-review/lib/url-key.js';
import { startGoldenServer } from './fixtures/golden/server.js';

const ORIGIN = 'https://www.example.com';

function siteOf(paths, { robots = '', origin = ORIGIN, extraRows = [] } = {}) {
  const rows = [...paths.map((path) => `${origin}${path}`), ...extraRows].map((url) => ({
    url,
    urlKey: urlKey(url, { canonicalHost: new URL(origin).host }),
    lastmod: null,
    sitemap: `${origin}/sitemap.xml`,
  }));
  return { root: { url: `${origin}/`, urlKey: `${origin}/` }, rows, robots: { text: robots }, sitemaps: [], llms: {} };
}

function page(body = '', wfPage = 'tpl') {
  return `<!DOCTYPE html><html data-wf-page="${wfPage}"><head><title>T</title></head><body>${body}</body></html>`;
}

function stubFetch({ delayMs = 0, bodyFor = () => page(), onCall } = {}) {
  const calls = [];
  const inFlight = new Map();
  const maxInFlight = new Map();
  const fn = async (url, opts = {}) => {
    const host = new URL(url).host;
    const call = { url, host, opts, start: Date.now() };
    calls.push(call);
    inFlight.set(host, (inFlight.get(host) ?? 0) + 1);
    maxInFlight.set(host, Math.max(maxInFlight.get(host) ?? 0, inFlight.get(host)));
    call.inFlight = inFlight.get(host);
    const extra = (await onCall?.(call)) ?? {};
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    inFlight.set(host, inFlight.get(host) - 1);
    const body = opts.method === 'HEAD' || opts.readBody === false ? null : bodyFor(url);
    return {
      url,
      finalUrl: url,
      status: 200,
      redirectChain: [],
      redirectLoop: false,
      headers: { 'content-type': 'text/html' },
      body,
      bytes: body ? body.length : 0,
      contentType: 'text/html',
      contentEncoding: null,
      fetchState: 'ok',
      attempts: 1,
      errorCode: null,
      fetchedAt: new Date().toISOString(),
      ...extra,
    };
  };
  return { fn, calls, maxInFlight };
}

describe('crawlSite scheduling', () => {
  it('crawl: per-host concurrency holds, Crawl-delay is honoured, a host-level 429 halves concurrency', async () => {
    const paths = Array.from({ length: 16 }, (_, i) => `/p${i}`);
    const otherRows = Array.from({ length: 8 }, (_, i) => `https://cdn.example.org/q${i}`);
    const busy = stubFetch({ delayMs: 15 });
    const result = await crawlSite({ site: siteOf(paths, { extraRows: otherRows }), crawlConfig: { concurrency: 3 }, fetchPage: busy.fn });
    assert.equal(busy.maxInFlight.get('www.example.com'), 3);
    assert.equal(busy.maxInFlight.get('cdn.example.org'), 3);
    assert.equal(result.stats.hosts['www.example.com'].concurrency, 3);
    assert.equal(result.facts.length, 25);

    const polite = stubFetch();
    await crawlSite({ site: siteOf(['/a', '/b', '/c', '/d'], { robots: 'User-agent: *\nCrawl-delay: 0.06\n' }), crawlConfig: { concurrency: 4 }, fetchPage: polite.fn });
    const starts = polite.calls.filter((call) => call.opts.method === 'GET').map((call) => call.start);
    assert.equal(starts.length, 5);
    for (let i = 1; i < starts.length; i += 1) assert.ok(starts[i] - starts[i - 1] >= 55, `gap ${starts[i] - starts[i - 1]} ms`);

    let throttledOnce = false;
    const limited = stubFetch({
      delayMs: 10,
      onCall: (call) => {
        if (!throttledOnce) {
          throttledOnce = true;
          call.opts.onThrottle(call.host);
        }
      },
    });
    const throttled = await crawlSite({ site: siteOf(paths), crawlConfig: { concurrency: 4 }, fetchPage: limited.fn });
    assert.deepEqual(throttled.stats.hosts['www.example.com'], { requests: 17, throttled: 1, concurrency: 2 });
    const late = limited.calls.slice(8);
    assert.ok(late.every((call) => call.inFlight <= 2), 'after the 429 no more than two requests run at once');
  });

  it('passes the crawl user agent and Accept-Language and matches robots against that agent', async () => {
    const stub = stubFetch();
    const robots = 'User-agent: curl\nDisallow: /secret\n\nUser-agent: *\nDisallow:\n';
    const { facts } = await crawlSite({
      site: siteOf(['/open', '/secret'], { robots }),
      crawlConfig: { userAgent: 'curl/8', acceptLanguage: 'nl-NL' },
      fetchPage: stub.fn,
    });
    assert.ok(stub.calls.every((call) => call.opts.userAgent === 'curl/8' && call.opts.acceptLanguage === 'nl-NL'));
    assert.equal(facts.find((record) => record.url.endsWith('/secret')).fetchState, 'blocked');
    assert.ok(!stub.calls.some((call) => call.url.endsWith('/secret')));
  });

  it('skips excluded paths, streams facts through onFact and builds the template histogram', async () => {
    const stub = stubFetch({ bodyFor: (url) => page('', url.includes('/blog/') ? 'tpl-blog' : 'tpl-page') });
    const seen = [];
    const { facts, stats } = await crawlSite({
      site: siteOf(['/a', '/blog/1', '/blog/2', '/drafts/x']),
      crawlConfig: { excludePaths: ['/drafts'] },
      fetchPage: stub.fn,
      onFact: async (record) => seen.push(record.urlKey),
    });
    assert.ok(!stub.calls.some((call) => call.url.includes('/drafts')));
    assert.equal(facts.length, 4);
    assert.deepEqual(seen.sort(), facts.map((record) => record.urlKey).sort());
    assert.equal(facts[0].urlKey, `${ORIGIN}/`);
    assert.equal(facts[0].inSitemap, false);
    assert.deepEqual(stats.templates, { 'tpl-page': 2, 'tpl-blog': 2 });
  });

  it('stops early when the first sample of fetches is slow', async () => {
    let clock = 0;
    const now = () => {
      clock += 5000;
      return clock;
    };
    const stub = stubFetch();
    const { stats, facts, linkTargets } = await crawlSite({
      site: siteOf(Array.from({ length: 10 }, (_, i) => `/p${i}`)),
      crawlConfig: { slowAbortSample: 3, slowAbortMs: 4000, concurrency: 1 },
      fetchPage: stub.fn,
      now,
    });
    assert.equal(stats.aborted, 'slow');
    assert.ok(facts.length < 11);
    assert.equal(linkTargets.size, 0);
  });
});

describe('crawlSite link targets on the golden server', () => {
  let golden;
  let result;

  before(async () => {
    golden = await startGoldenServer();
    const crawlConfig = { retryDelayMs: 10 };
    const site = await discoverSite(golden.url, { crawlConfig, fetchPage });
    result = await crawlSite({ site, crawlConfig, fetchPage });
  });

  after(async () => {
    await golden.close();
  });

  it('links: every off-sitemap internal target is status-checked once and recorded', () => {
    const expected = {
      '/missing-page': 404,
      '/gone-then-back': 404,
      '/always-503': 503,
      '/redirect-a': 200,
      '/moved': 200,
      '/de': 404,
      '/images/photo.png': 200,
    };
    for (const [path, status] of Object.entries(expected)) {
      const target = result.linkTargets.get(`${golden.url}${path}`);
      assert.ok(target, `${path} recorded`);
      assert.equal(target.isFact, false);
      assert.equal(target.inSitemap, false);
      assert.equal(target.internal, true);
      assert.equal(target.method, 'HEAD');
      assert.equal(target.status, status, path);
      assert.ok(target.checkedAt);
      const heads = golden.requests.filter((request) => request.host === 'site' && request.path === path);
      assert.equal(heads.length, status >= 500 ? 2 : 1, `${path} requested once (plus one retry on 5xx)`);
      assert.ok(heads.every((request) => request.method === 'HEAD'));
    }
    assert.deepEqual(result.linkTargets.get(`${golden.url}/redirect-a`).kinds.sort(), ['canonical', 'link']);
    assert.deepEqual(result.linkTargets.get(`${golden.url}/de`).kinds, ['hreflang']);
    const about = result.linkTargets.get(`${golden.url}/about`);
    assert.equal(about.isFact, true);
    assert.equal(about.method, null);
    assert.equal(about.status, 200);
  });

  it('checks external targets once, falling back to GET on 403', () => {
    const ext = (path) => result.linkTargets.get(`${golden.externalOrigin}${path}`);
    assert.equal(ext('/ok').status, 200);
    assert.equal(ext('/gone').status, 404);
    assert.equal(ext('/forbidden').method, 'GET');
    assert.equal(ext('/forbidden').status, 403);
    assert.equal(ext('/rate').fetchState, 'blocked');
    assert.deepEqual(ext('/img-404.png').kinds, ['image']);
    const missing = result.linkTargets.get('http://golden-missing.invalid/');
    assert.equal(missing.errorCode, 'ENOTFOUND');
    assert.equal(missing.internal, false);
    assert.equal(result.stats.externalChecked, 6);
    assert.equal(result.stats.externalCapped, 0);
  });
});

describe('crawlSite external cap', () => {
  it('samples a stable set per template beyond externalCap and records the rest as capped', async () => {
    const links = (prefix) => Array.from({ length: 5 }, (_, i) => `<a href="https://ext${prefix}${i}.example.net/x">x</a>`).join('');
    const bodyFor = (url) => (url.includes('/blog') ? page(links('b'), 'tpl-blog') : page(links('p'), 'tpl-page'));
    const run = async () => {
      const stub = stubFetch({ bodyFor });
      const out = await crawlSite({ site: siteOf(['/page', '/blog']), crawlConfig: { externalCap: 4 }, fetchPage: stub.fn });
      return { ...out, calls: stub.calls };
    };
    const first = await run();
    const second = await run();
    const checked = (out) => [...out.linkTargets.values()].filter((target) => !target.internal && !target.capExceeded).map((target) => target.urlKey).sort();
    assert.equal(first.stats.externalChecked, 4);
    assert.equal(first.stats.externalCapped, 6);
    assert.deepEqual(checked(first), checked(second));
    assert.equal(checked(first).filter((key) => key.includes('extb')).length, 2);
    const capped = [...first.linkTargets.values()].filter((target) => target.capExceeded);
    assert.ok(capped.every((target) => target.fetchState === 'blocked' && target.method === null));
    assert.ok(!first.calls.some((call) => capped.some((target) => call.url === target.url)));
  });
});

describe('crawlSite politeness under failure', () => {
  it('crawl: an external host that blocks three times in a row trips the breaker and its other targets are never fetched', async () => {
    const links = Array.from({ length: 8 }, (_, i) => `<a href="https://wa.me/4470000000${i}">chat ${i}</a>`).join('') + '<a href="https://ok.example.net/x">ok</a>';
    const stub = stubFetch({
      bodyFor: () => page(links),
      onCall: (call) => (call.host === 'wa.me' ? { status: 429, fetchState: 'blocked' } : {}),
    });
    const { linkTargets } = await crawlSite({ site: siteOf(['/']), crawlConfig: { concurrency: 1 }, fetchPage: stub.fn });
    const waCalls = stub.calls.filter((c) => c.host === 'wa.me');
    assert.ok(waCalls.length <= 3 + 1, `wa.me fetched ${waCalls.length} times`);
    const tripped = [...linkTargets.values()].filter((t) => t.errorCode === 'HOST_BREAKER');
    assert.ok(tripped.length >= 4);
    assert.ok(tripped.every((t) => t.fetchState === 'blocked'));
    assert.equal(stub.calls.filter((c) => c.host === 'ok.example.net').length, 1);
    assert.ok(waCalls.every((c) => c.opts.maxRetryAfterMs === 5000));
  });

  it('crawl: retries on the site host wait at least the Crawl-delay', async () => {
    const stub = stubFetch();
    await crawlSite({ site: siteOf(['/a'], { robots: 'User-agent: *\nCrawl-delay: 2\n' }), crawlConfig: { concurrency: 1 }, fetchPage: stub.fn });
    const call = stub.calls.find((c) => c.url.endsWith('/a'));
    assert.equal(call.opts.minRetryDelayMs, 2000);
  });
});
