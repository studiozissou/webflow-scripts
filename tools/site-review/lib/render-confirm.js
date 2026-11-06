// Confirms render-relevant findings against the rendered DOM of a deterministic per-template page sample, escalating templates whose rendered and raw answers disagree.

import { existsSync } from 'node:fs';
import {
  DEFAULT_CRAWL_CONFIG,
  DEFAULT_USER_AGENT,
  RENDERED_FIELDS,
} from '../config.js';
import { createFinding, sha256 } from './finding.js';
import { normaliseText as htmlNormaliseText } from './html.js';
import { urlKey as toUrlKey } from './url-key.js';

const DEBUG = false;
const RENDER_CONCURRENCY = 3;
const PAGES_PER_CONTEXT = 50;
const SETTLE_MS = 1500;
const FALLBACK_CHROMIUM = '/opt/pw-browsers/chromium';
const BLOCKED_RESOURCES = new Set(['image', 'media', 'font']);

export const normaliseText = (value) => (value == null ? null : htmlNormaliseText(value));

const robotsTokens = (value) =>
  value == null
    ? null
    : [...new Set(String(value).toLowerCase().split(',').map((token) => token.trim()).filter(Boolean))].sort().join(',');

const sortedUnique = (values) => [...new Set((values ?? []).map((value) => String(value)))].sort();

const sameArray = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

function runMonthOf(now) {
  const value = typeof now === 'function' ? now() : now;
  const date = value == null ? new Date() : new Date(value);
  return date.toISOString().slice(0, 7);
}

function crawlSettings(config) {
  return { ...DEFAULT_CRAWL_CONFIG, ...(config?.crawl ?? {}) };
}

function canonicalHostOf(crawl, site) {
  if (crawl.canonicalHost) return crawl.canonicalHost;
  const root = site?.root?.url ?? crawl.url;
  try {
    return root ? new URL(root).host : undefined;
  } catch {
    return undefined;
  }
}

export function renderRelevantIds(taxonomy) {
  const fields = new Set(RENDERED_FIELDS);
  return new Set(
    (taxonomy ?? []).filter((entry) => (entry.facts ?? []).some((fact) => fields.has(fact))).map((entry) => entry.id),
  );
}

export const templateOf = (fact) => fact?.wfPage ?? 'none';

const findingKey = (item) => `${item.taxonomyId}|${item.urlKey}|${item.targetKey ?? ''}`;

function resolveLinks(list, base, canonicalHost, withLang) {
  return (list ?? []).map((item) => {
    let url = item.url ?? null;
    if (!url && item.href) {
      try {
        url = new URL(item.href, base).href;
      } catch {
        url = null;
      }
    }
    const out = { href: item.href ?? null, url, key: url ? toUrlKey(url, { canonicalHost }) : null };
    return withLang ? { lang: item.lang ?? null, ...out } : out;
  });
}

const linkSignature = (list, withLang) =>
  (list ?? []).map((item) => `${withLang ? `${String(item.lang ?? '').toLowerCase()} ` : ''}${item.key ?? ''}`).sort();

export function overlayFact(fact, rendered, { canonicalHost } = {}) {
  const base = fact.finalUrl ?? fact.url;
  const out = { ...fact };

  const title = normaliseText(rendered.title);
  if (normaliseText(fact.title) !== title) out.title = title;

  const description = normaliseText(rendered.metaDescription);
  if (normaliseText(fact.metaDescription) !== description) out.metaDescription = description;

  const headerRobots = fact.headers?.xRobotsTag ?? null;
  const renderedRobotsRaw =
    rendered.robotsMeta == null && headerRobots == null
      ? null
      : [rendered.robotsMeta, headerRobots].filter((value) => value != null && value !== '').join(', ').toLowerCase();
  if (robotsTokens(fact.robotsMeta) !== robotsTokens(renderedRobotsRaw)) out.robotsMeta = renderedRobotsRaw;

  const h1 = (rendered.h1 ?? []).map((text) => normaliseText(text) ?? '');
  const rawH1 = (fact.h1 ?? []).map((text) => normaliseText(text) ?? '');
  if (!sameArray(rawH1, h1)) out.h1 = h1;

  const canonicals = resolveLinks(rendered.canonicals, base, canonicalHost, false);
  if (!sameArray(linkSignature(fact.canonicals, false), linkSignature(canonicals, false))) out.canonicals = canonicals;

  const hreflang = resolveLinks(rendered.hreflang, base, canonicalHost, true);
  if (!sameArray(linkSignature(fact.hreflang, true), linkSignature(hreflang, true))) out.hreflang = hreflang;

  const rawJsonLd = fact.jsonLd ?? { types: [], hashes: [], parseErrors: [] };
  const renderedJsonLd = rendered.jsonLd ?? {};
  const types = sortedUnique(renderedJsonLd.types);
  const errorsKnown = Array.isArray(renderedJsonLd.parseErrors);
  const errorsDiffer = errorsKnown && renderedJsonLd.parseErrors.length !== (rawJsonLd.parseErrors ?? []).length;
  if (!sameArray(sortedUnique(rawJsonLd.types), types) || errorsDiffer) {
    out.jsonLd = {
      types,
      hashes: Array.isArray(renderedJsonLd.hashes) ? renderedJsonLd.hashes : (rawJsonLd.hashes ?? []),
      parseErrors: errorsKnown ? renderedJsonLd.parseErrors : (rawJsonLd.parseErrors ?? []),
    };
  }
  return out;
}

function buildFinding(row, entry) {
  return {
    ...createFinding(row, entry),
    evidence: { ...row.evidence, source: 'rendered' },
    renderChecked: true,
  };
}

function pickLowest(keys, hashOf, count, exclude = new Set()) {
  return keys
    .filter((key) => !exclude.has(key))
    .map((key) => [hashOf(key), key])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, Math.max(0, count))
    .map(([, key]) => key);
}

function interleave(lists) {
  const out = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let rank = 0; rank < longest; rank += 1) {
    for (const list of lists) if (rank < list.length) out.push(list[rank]);
  }
  return out;
}

async function pool(items, limit, worker) {
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}

export function jsonLdFromTexts(texts) {
  const types = [];
  const hashes = [];
  const parseErrors = [];
  const collect = (node) => {
    if (Array.isArray(node)) return node.forEach(collect);
    if (!node || typeof node !== 'object') return undefined;
    const type = node['@type'];
    if (typeof type === 'string') types.push(type);
    if (Array.isArray(type)) type.forEach((value) => typeof value === 'string' && types.push(value));
    Object.values(node).forEach((value) => typeof value === 'object' && collect(value));
    return undefined;
  };
  for (const text of texts ?? []) {
    const trimmed = String(text).trim();
    hashes.push(sha256(trimmed).slice(0, 16));
    try {
      collect(JSON.parse(trimmed));
    } catch (error) {
      parseErrors.push({ message: error.message, snippet: trimmed.slice(0, 200) });
    }
  }
  return { types, hashes, parseErrors };
}

function extractRenderedFields() {
  const collapse = (text) => (text ?? '').replace(/\s+/g, ' ').trim();
  const head = document.head;
  const inHead = (selector) => (head ? [...head.querySelectorAll(selector)] : []);
  const titleEl = document.querySelector('head > title');
  const description = inHead('meta[name="description" i]')[0];
  const robots = inHead('meta[name="robots" i]')[0];
  return {
    title: titleEl ? collapse(titleEl.textContent) : null,
    metaDescription: description ? collapse(description.getAttribute('content')) : null,
    robotsMeta: robots ? (robots.getAttribute('content') ?? '').toLowerCase().trim() : null,
    canonicals: inHead('link[rel~="canonical" i]').map((el) => ({ href: el.getAttribute('href'), url: el.href || null })),
    hreflang: inHead('link[rel~="alternate" i][hreflang]').map((el) => ({
      lang: el.getAttribute('hreflang'),
      href: el.getAttribute('href'),
      url: el.href || null,
    })),
    h1: [...document.querySelectorAll('h1')]
      .filter((el) => !el.closest('script, style, template, noscript'))
      .map((el) => collapse(el.textContent)),
    jsonLdTexts: [...document.querySelectorAll('script[type="application/ld+json" i]')].map((el) => el.textContent ?? ''),
  };
}

export function createPlaywrightRenderer({
  userAgent = DEFAULT_USER_AGENT,
  acceptLanguage = DEFAULT_CRAWL_CONFIG.acceptLanguage,
  pagesPerContext = PAGES_PER_CONTEXT,
  settleMs = SETTLE_MS,
  timeoutMs = DEFAULT_CRAWL_CONFIG.timeoutMs,
  launchOptions = {},
  now = () => new Date(),
} = {}) {
  let browserPromise = null;
  let launchError = null;
  let slot = null;
  const slots = new Set();

  const launch = () => {
    const fallbackPath = process.env.SR_CHROMIUM_PATH ?? FALLBACK_CHROMIUM;
    const options = { ...(process.env.SR_CHROMIUM_PATH ? { executablePath: process.env.SR_CHROMIUM_PATH } : {}), ...launchOptions };
    browserPromise ??= import('playwright')
      .then(({ chromium }) =>
        chromium.launch(options).catch((error) => {
          if (options.executablePath || !existsSync(fallbackPath)) throw error;
          return chromium.launch({ ...options, executablePath: fallbackPath });
        }),
      )
      .catch((error) => {
        launchError = error;
        return null;
      });
    return browserPromise;
  };

  const newSlot = (browser) => {
    const contextPromise = browser
      .newContext({
        userAgent,
        extraHTTPHeaders: acceptLanguage ? { 'Accept-Language': acceptLanguage } : {},
      })
      .then(async (context) => {
        await context.route('**/*', (route) =>
          BLOCKED_RESOURCES.has(route.request().resourceType()) ? route.abort() : route.continue(),
        );
        return context;
      });
    const created = { contextPromise, served: 0, active: 0, retired: false };
    slots.add(created);
    return created;
  };

  const retire = async (old) => {
    old.retired = true;
    if (old.active === 0) {
      slots.delete(old);
      await old.contextPromise.then((context) => context.close()).catch(() => {});
    }
  };

  async function renderPage(url) {
    const browser = await launch();
    if (!browser) return { error: `playwright_unavailable: ${launchError?.message ?? 'launch failed'}`, notRun: true };
    if (!slot || slot.served >= pagesPerContext) {
      if (slot) retire(slot);
      slot = newSlot(browser);
    }
    const current = slot;
    current.served += 1;
    current.active += 1;
    let page = null;
    try {
      const context = await current.contextPromise;
      page = await context.newPage();
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      const status = response?.status() ?? 0;
      if (status !== 200) return { error: `render_status_${status}` };
      if (toUrlKey(page.url()) !== toUrlKey(url)) return { error: 'render_redirected' };
      await page.waitForTimeout(settleMs);
      const { jsonLdTexts, ...fields } = await page.evaluate(extractRenderedFields);
      return { ...fields, jsonLd: jsonLdFromTexts(jsonLdTexts), renderedAt: new Date(typeof now === 'function' ? now() : now).toISOString() };
    } catch (error) {
      return { error: error?.message ?? String(error) };
    } finally {
      await page?.close().catch(() => {});
      current.active -= 1;
      if (current.retired && current.active === 0) await retire(current);
    }
  }

  async function close() {
    for (const open of slots) await open.contextPromise.then((context) => context.close()).catch(() => {});
    slots.clear();
    slot = null;
    const browser = browserPromise ? await browserPromise : null;
    browserPromise = null;
    await browser?.close().catch(() => {});
  }

  return { renderPage, close };
}

export async function confirmFindings({
  findings,
  facts,
  linkTargets,
  site,
  checks,
  taxonomy,
  config,
  renderPage,
  log,
  now = () => new Date(),
}) {
  const crawl = crawlSettings(config);
  const canonicalHost = canonicalHostOf(crawl, site);
  const relevant = renderRelevantIds(taxonomy);
  const entries = new Map((taxonomy ?? []).map((entry) => [entry.id, entry]));
  const relevantChecks = (checks ?? []).filter((mod) =>
    (mod?.meta?.taxonomyIds ?? []).some((id) => relevant.has(id)),
  );
  const rendered = new Map();
  const stats = {
    sampled: 0,
    flagged: 0,
    drift: 0,
    rendered: 0,
    failed: 0,
    escalated: [],
    capExceeded: false,
    notRun: false,
    renderMax: crawl.renderMax,
  };

  if (relevant.size === 0 || relevantChecks.length === 0) return { findings, rendered, stats };

  const pages = (facts ?? []).filter((fact) => fact.fetchState === 'ok' && fact.urlKey);
  const factByKey = new Map(pages.map((fact) => [fact.urlKey, fact]));
  const byTemplate = new Map();
  for (const fact of pages) {
    const template = templateOf(fact);
    if (!byTemplate.has(template)) byTemplate.set(template, []);
    byTemplate.get(template).push(fact.urlKey);
  }
  const templates = [...byTemplate.keys()].sort();
  const hashes = new Map();
  const hashOf = (key) => {
    if (!hashes.has(key)) hashes.set(key, sha256(key));
    return hashes.get(key);
  };
  const runMonth = runMonthOf(now);

  const sampleLists = templates.map((template) => pickLowest(byTemplate.get(template), hashOf, crawl.renderSample));
  const sampleSet = new Set(sampleLists.flat());

  const flaggedGroups = new Map();
  for (const finding of findings) {
    if (finding.state !== 'fail' || !relevant.has(finding.taxonomyId) || !factByKey.has(finding.urlKey)) continue;
    const group = `${templateOf(factByKey.get(finding.urlKey))}|${finding.taxonomyId}`;
    if (!flaggedGroups.has(group)) flaggedGroups.set(group, new Set());
    flaggedGroups.get(group).add(finding.urlKey);
  }
  const flaggedLists = [...flaggedGroups.keys()]
    .sort()
    .map((group) => pickLowest([...flaggedGroups.get(group)], hashOf, crawl.renderFlagged));

  const driftHash = (key) => sha256(`${key}${runMonth}`);
  const driftLists = templates.map((template) =>
    pickLowest(byTemplate.get(template), driftHash, crawl.renderDrift, sampleSet),
  );

  const attempted = new Set();
  const failedRenders = new Set();
  let unavailable = false;

  const enqueue = (keys, counter) => {
    const chosen = [];
    for (const key of keys) {
      if (attempted.has(key)) continue;
      if (attempted.size >= crawl.renderMax) {
        stats.capExceeded = true;
        continue;
      }
      attempted.add(key);
      chosen.push(key);
      if (counter) stats[counter] += 1;
    }
    return chosen;
  };

  const queue = [
    ...enqueue(interleave(sampleLists), 'sampled'),
    ...enqueue(interleave(flaggedLists), 'flagged'),
    ...enqueue(interleave(driftLists), 'drift'),
  ];

  let ownRenderer = null;
  if (!renderPage) {
    ownRenderer = createPlaywrightRenderer({
      userAgent: crawl.userAgent ?? DEFAULT_USER_AGENT,
      acceptLanguage: crawl.acceptLanguage,
      timeoutMs: crawl.timeoutMs,
      settleMs: crawl.renderSettleMs ?? SETTLE_MS,
      now,
    });
  }
  const render = renderPage ?? ownRenderer.renderPage;

  const renderAll = async (keys) => {
    await pool(keys, RENDER_CONCURRENCY, async (key) => {
      if (unavailable) return;
      const fact = factByKey.get(key);
      let result;
      try {
        result = await render(fact.finalUrl ?? fact.url);
      } catch (error) {
        result = { error: error?.message ?? String(error) };
      }
      if (result?.notRun) {
        unavailable = true;
        log?.warn?.(`render-confirm: ${result.error}`);
        return;
      }
      if (!result || result.error) {
        failedRenders.add(key);
        stats.failed += 1;
        DEBUG && console.log('render failed', key, result?.error);
        return;
      }
      rendered.set(key, result);
    });
  };

  const rawByKey = new Map();
  for (const finding of findings) {
    if (!relevant.has(finding.taxonomyId)) continue;
    const key = findingKey(finding);
    if (!rawByKey.has(key)) rawByKey.set(key, []);
    rawByKey.get(key).push(finding);
  }

  const evaluate = async () => {
    const overlaid = (facts ?? []).map((fact) =>
      rendered.has(fact.urlKey) && fact.fetchState === 'ok'
        ? overlayFact(fact, rendered.get(fact.urlKey), { canonicalHost })
        : fact,
    );
    const rows = new Map();
    const skippedIds = new Set();
    for (const mod of relevantChecks) {
      try {
        const out = await mod.check({ facts: overlaid, linkTargets, site, rendered, taxonomy, config, log });
        for (const row of out ?? []) {
          if (!relevant.has(row.taxonomyId) || !rendered.has(row.urlKey)) continue;
          const key = findingKey(row);
          const existing = rows.get(key);
          if (!existing || (existing.state !== 'fail' && row.state === 'fail')) rows.set(key, row);
        }
      } catch (error) {
        log?.warn?.(`render-confirm: ${mod.meta?.name ?? 'check'} threw on rendered facts: ${error?.message}`);
        for (const id of mod.meta?.taxonomyIds ?? []) skippedIds.add(id);
      }
    }

    const disagreements = new Set();
    const consider = (taxonomyId, pageKey, key) => {
      if (skippedIds.has(taxonomyId)) return;
      const raw = rawByKey.get(key) ?? [];
      if (raw.some((finding) => finding.state === 'unknown')) return;
      const rawFail = raw.some((finding) => finding.state === 'fail');
      const row = rows.get(key);
      if (row?.state === 'unknown') return;
      if (rawFail !== (row?.state === 'fail')) disagreements.add(`${templateOf(factByKey.get(pageKey))}|${taxonomyId}`);
    };
    for (const [key, list] of rawByKey) if (rendered.has(list[0].urlKey)) consider(list[0].taxonomyId, list[0].urlKey, key);
    for (const [key, row] of rows) if (!rawByKey.has(key)) consider(row.taxonomyId, row.urlKey, key);
    return { rows, skippedIds, disagreements };
  };

  let result;
  try {
    await renderAll(queue);
    if (unavailable) {
      stats.notRun = true;
      rendered.clear();
      return { findings, rendered, stats };
    }
    const escalatedPairs = new Set();
    const escalatedTemplates = new Set();
    for (;;) {
      result = await evaluate();
      const fresh = [];
      for (const pair of [...result.disagreements].sort()) {
        if (escalatedPairs.has(pair)) continue;
        escalatedPairs.add(pair);
        const [template, taxonomyId] = [pair.slice(0, pair.lastIndexOf('|')), pair.slice(pair.lastIndexOf('|') + 1)];
        stats.escalated.push({ template, taxonomyId });
        if (!escalatedTemplates.has(template)) {
          escalatedTemplates.add(template);
          fresh.push(template);
        }
      }
      if (fresh.length === 0) break;
      const extra = enqueue(interleave(fresh.map((template) => pickLowest(byTemplate.get(template), hashOf, Infinity))));
      if (extra.length === 0) break;
      await renderAll(extra);
    }
  } finally {
    await ownRenderer?.close();
  }

  stats.rendered = rendered.size;
  const { rows, skippedIds } = result;
  const out = [];
  for (const finding of findings) {
    if (!rendered.has(finding.urlKey) || finding.state === 'unknown') {
      out.push(finding);
      continue;
    }
    if (!relevant.has(finding.taxonomyId) || skippedIds.has(finding.taxonomyId) || finding.state !== 'fail') {
      out.push({ ...finding, renderChecked: true });
      continue;
    }
    const row = rows.get(findingKey(finding));
    if (row?.state === 'fail') {
      out.push({ ...finding, renderChecked: true, evidence: { ...finding.evidence, source: 'both' } });
    } else if (row?.state === 'unknown') {
      out.push({ ...finding, renderChecked: true });
    } else {
      out.push({
        ...finding,
        severity: 'notice',
        scoreWeight: 0,
        tags: [...new Set([...(finding.tags ?? []), 'fixed-after-load'])],
        evidence: { ...finding.evidence, source: 'raw' },
        excludedFromParity: true,
        renderChecked: true,
      });
    }
  }
  for (const [key, row] of rows) {
    if (row.state !== 'fail' || rawByKey.has(key) || skippedIds.has(row.taxonomyId)) continue;
    out.push(buildFinding(row, entries.get(row.taxonomyId)));
  }
  return { findings: out, rendered, stats };
}
