// Runs the site-review pipeline in stage order (discover, crawl, check, confirm, reverify, sanity, score, snapshot, collapse) with every I/O dependency injectable.

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SCHEMA_VERSION, RENDERED_FIELDS } from '../config.js';
import { urlKey } from './url-key.js';
import { findingsFromRows } from './finding.js';
import { fetchPage as defaultFetchPage } from './fetch-page.js';
import { discoverSite } from './discovery.js';
import { crawlSite } from './crawl.js';
import { confirmFindings } from './render-confirm.js';
import { reverifyFindings } from './reverify.js';
import { runSanity } from './sanity.js';
import { computeHealth } from './health.js';
import { buildSnapshot, diffSnapshots } from './snapshot.js';
import { collapseFindings } from './collapse.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECKS_DIR = join(ROOT, 'checks');
const TAXONOMY_PATH = join(ROOT, 'taxonomy.json');

export async function loadCheckModules(dir = CHECKS_DIR) {
  const files = (await readdir(dir)).filter((file) => file.endsWith('.js')).sort();
  const modules = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(dir, file)).href);
    if (mod.meta && typeof mod.check === 'function') modules.push(mod);
  }
  return modules;
}

export async function loadTaxonomy(path = TAXONOMY_PATH) {
  const raw = JSON.parse(await readFile(path, 'utf8'));
  return Array.isArray(raw) ? raw : raw.entries;
}

export function taxonomyIndex(taxonomy) {
  return new Map(taxonomy.map((entry) => [entry.id, entry]));
}

function evidenceFor(fact, reason) {
  return {
    value: reason,
    source: 'raw',
    status: fact.status ?? 0,
    finalUrl: fact.finalUrl ?? fact.url,
    selector: 'response',
    snippet: '',
    fetchedAt: fact.fetchedAt ?? null,
  };
}

export function pageFetchRows(facts) {
  return facts
    .filter((fact) => fact.fetchState !== 'ok')
    .map((fact) => ({
      taxonomyId: 'page-fetch',
      url: fact.url,
      urlKey: fact.urlKey,
      state: 'unknown',
      reason: fact.fetchState,
      evidence: evidenceFor(fact, fact.fetchState),
    }));
}

export function notRunRows(module, root, now) {
  return module.meta.taxonomyIds.map((taxonomyId) => ({
    taxonomyId,
    url: root.url,
    urlKey: root.urlKey,
    state: 'unknown',
    reason: 'not_run',
    evidence: {
      value: 'not_run',
      source: 'raw',
      status: 0,
      finalUrl: root.url,
      selector: `check:${module.meta.name}`,
      snippet: '',
      fetchedAt: now.toISOString(),
    },
  }));
}

export function selectChecks(modules, { mode, tier = 1, skip = [] }) {
  const run = [];
  const skipped = [];
  for (const mod of modules) {
    const excluded = skip.includes(mod.meta.name) || mod.meta.tier > tier || (mode === 'audit' && mod.meta.audit === false);
    (excluded ? skipped : run).push(mod);
  }
  return { run, skipped };
}

export async function runChecks({ facts, linkTargets, site, rendered = new Map(), modules, taxonomy, config, mode = 'audit', tier = 1, skip = [], log, fetchPage, now = new Date() }) {
  const byId = taxonomyIndex(taxonomy);
  const { run, skipped } = selectChecks(modules, { mode, tier, skip });
  const rows = [];
  const timing = {};
  const failedChecks = [];

  const append = (list) => {
    for (const row of list) rows.push(row);
  };
  for (const mod of skipped) append(notRunRows(mod, site.root, now));

  for (const mod of run) {
    const start = performance.now();
    try {
      const out = await mod.check({ facts, linkTargets, site, rendered, taxonomy, config, log, fetchPage: mode === 'audit' ? undefined : fetchPage });
      append(out);
    } catch (err) {
      log.error(`Check "${mod.meta.name}" threw: ${err.message}`);
      failedChecks.push({ name: mod.meta.name, message: err.message });
      append(notRunRows(mod, site.root, now));
    }
    timing[mod.meta.name] = Math.round((performance.now() - start) * 100) / 100;
  }

  append(pageFetchRows(facts));
  const { findings, rejected } = findingsFromRows(rows, byId);
  return { findings, rejected, timing, ran: run.map((mod) => mod.meta.name), skipped: skipped.map((mod) => mod.meta.name), failedChecks };
}

export function renderRelevantModules(modules, run, taxonomy) {
  const relevant = new Set(
    taxonomy.filter((entry) => (entry.facts ?? []).some((field) => RENDERED_FIELDS.includes(field))).map((entry) => entry.id),
  );
  return modules.filter(
    (mod) => run.includes(mod.meta.name) && mod.meta.audit !== false && mod.meta.taxonomyIds.some((id) => relevant.has(id)),
  );
}

export function summarise(findings) {
  const live = findings.filter((f) => f.state === 'fail' && !f.transient && !f.excludedFromParity && !f.tags?.includes('fixed-after-load'));
  const summary = { total: live.length, error: 0, warning: 0, notice: 0, unknown: 0, transient: 0, fixedAfterLoad: 0 };
  for (const f of findings) {
    if (f.state === 'unknown') summary.unknown++;
    else if (f.transient) summary.transient++;
    if (f.tags?.includes('fixed-after-load')) summary.fixedAfterLoad++;
  }
  for (const f of live) summary[f.severity]++;
  return summary;
}

export async function runAudit(options) {
  const {
    url,
    client = null,
    mode = 'audit',
    tier = 1,
    skip = [],
    pages = null,
    config,
    log,
    render = mode === 'audit',
    reverify = mode === 'audit',
    previousSnapshot = null,
    onFact,
    now = new Date(),
    toolVersion = '2.0.0',
  } = options;
  const fetchPage = options.fetchPage ?? defaultFetchPage;
  const crawlConfig = { ...config.crawl, url: config.crawl.url ?? url };
  crawlConfig.canonicalHost = crawlConfig.canonicalHost ?? new URL(url).host;
  const runConfig = { ...config, crawl: crawlConfig };
  const modules = options.checks ?? (await loadCheckModules());
  const taxonomy = options.taxonomy ?? (await loadTaxonomy());
  const timing = {};
  const stage = async (name, fn) => {
    const start = performance.now();
    const out = await fn();
    timing[name] = Math.round(performance.now() - start);
    log.log(`stage ${name}: ${timing[name]} ms`);
    return out;
  };

  const site = await stage('discover', () => discoverSite(url, { crawlConfig, fetchPage, log }));
  if (pages?.length) {
    site.rows = pages.map((page) => {
      const absolute = new URL(page, url).href;
      return { url: absolute, urlKey: urlKey(absolute, { canonicalHost: crawlConfig.canonicalHost }), lastmod: null, sitemap: null };
    });
  }

  const crawl = await stage('crawl', () => crawlSite({ site, crawlConfig, fetchPage, log, onFact }));
  const { facts, linkTargets, stats } = crawl;

  const checked = await stage('check', () =>
    runChecks({ facts, linkTargets, site, modules, taxonomy, config: runConfig, mode, tier, skip, log, fetchPage, now }),
  );
  let findings = checked.findings;
  let rendered = new Map();
  let renderStats = { rendered: 0, notRun: true, skipped: !render };

  if (render && !stats.aborted) {
    const confirmed = await stage('confirm', () =>
      confirmFindings({
        findings,
        facts,
        linkTargets,
        site,
        checks: renderRelevantModules(modules, checked.ran, taxonomy),
        taxonomy,
        config: runConfig,
        renderPage: options.renderPage,
        log,
        now,
      }),
    );
    findings = confirmed.findings;
    rendered = confirmed.rendered;
    renderStats = confirmed.stats;
  }

  let reverifyStats = { skipped: !reverify };
  if (reverify && !stats.aborted) {
    const reverified = await stage('reverify', () =>
      reverifyFindings({ findings, taxonomy, fetchPage, delayMs: crawlConfig.reverifyDelayMs, sleep: options.sleep, log }),
    );
    findings = reverified.findings;
    reverifyStats = reverified.stats;
  }

  const sanity = runSanity({ facts, findings, site, previousSnapshot });
  if (stats.aborted === 'slow' && !sanity.abort) {
    sanity.abort = { code: 'slow', message: `Aborted: the first ${crawlConfig.slowAbortSample} fetches averaged over ${crawlConfig.slowAbortMs} ms.` };
  }
  const health = computeHealth({ facts, findings });
  const collapsed = collapseFindings({ findings, facts });
  const snapshot = sanity.abort
    ? null
    : buildSnapshot({ url, client, facts, findings, health, sanity, stats, crawlConfig, toolVersion, now });
  const diff = snapshot && previousSnapshot ? diffSnapshots(previousSnapshot, snapshot) : null;

  return {
    schemaVersion: SCHEMA_VERSION,
    url,
    client,
    mode,
    site,
    facts,
    linkTargets,
    stats,
    findings,
    rejected: checked.rejected,
    failedChecks: checked.failedChecks,
    checksRun: checked.ran,
    checksSkipped: checked.skipped,
    rendered,
    renderStats,
    reverifyStats,
    sanity,
    health,
    collapsed,
    snapshot,
    diff,
    summary: summarise(findings),
    taxonomy,
    timing: { ...timing, checks: checked.timing },
  };
}
