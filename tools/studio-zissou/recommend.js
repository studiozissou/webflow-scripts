// Turns Studio Zissou growth-review findings plus Semrush and PostHog signals into tiered, scored recommendations and picks the few to act on per run; runnable as a CLI.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MAX_AUTO, MIN_DAYS_BETWEEN } from './publish-guard.js';
import { parseLog } from './growth-log.js';

const DEBUG = false;

const DAY_MS = 86_400_000;
const RANK = Object.freeze({ report: 1, review: 2, auto: 3 });
const MIN_SESSIONS = 20;
const MIN_IMPRESSIONS = 50;
const REVERT_THRESHOLD = -0.2;

const AUTO_TYPES = ['meta-title', 'meta-description', 'alt', 'jsonld', 'faq', 'internal-link', 'revert', 'sitemap', 'noindex', 'freshness-date', 'review-count'];
const REVIEW_TYPES = ['canonical', 'copy', 'h1', 'hero-copy', 'first-paragraph', 'price', 'cta-label', 'new-page', 'guide', 'slug', 'redirect', 'nav', 'footer', 'story-rotation', 'delete', 'disavow', 'form-field', 'file-name', 'audience-headline', 'body-refresh', 'nl-nonlocale', 'competitor-match'];
const REPORT_TYPES = ['brand-share', 'cwv', 'backlinks', 'competitor', 'funnel', 'lead-quality', 'source-mix', 'time-to-convert', 'segment-gap', 'offline', 'seasonality', 'gbp', 'pricing-behaviour', 'form-leads', 'watch'];

export const TIERS = Object.freeze(Object.fromEntries([
  ...AUTO_TYPES.map((t) => [t, 'auto']),
  ...REVIEW_TYPES.map((t) => [t, 'review']),
  ...REPORT_TYPES.map((t) => [t, 'report']),
]));

const EFFORT = Object.freeze({
  canonical: 2, 'cta-label': 2, 'story-rotation': 2, 'form-field': 2, 'file-name': 2, redirect: 2,
  h1: 3, 'first-paragraph': 3, 'hero-copy': 3, copy: 3, 'audience-headline': 3, slug: 3, nav: 3, footer: 3, 'nl-nonlocale': 3,
  'body-refresh': 4, 'competitor-match': 4, delete: 4,
  'new-page': 5, guide: 5, price: 5, disavow: 5,
});

const LOCALE_FIELDS = new Set(['meta-title', 'meta-description', 'alt', 'faq', 'jsonld', 'revert', 'freshness-date', 'review-count']);
const CONVERSION_TYPES = new Set(['hero-copy', 'price', 'cta-label', 'form-field', 'story-rotation', 'audience-headline']);
const FORM_STEPS = new Set(['form-start', 'form_start', 'lead_submitted']);

const indexIssue = (s) => {
  if (s.issue === 'sitemap-not-indexed') return ['sitemap'];
  if (['thin', 'duplicate', 'noindex'].includes(s.issue)) return ['noindex', 'copy'];
  if (s.issue === 'canonical') return ['canonical'];
  return ['copy'];
};

export const SIGNALS = Object.freeze({
  'low-ctr': () => ['meta-title', 'meta-description'],
  cannibalisation: () => ['internal-link', 'canonical'],
  'question-query': () => ['faq'],
  'position-drop': () => ['h1', 'first-paragraph'],
  'entered-top20': () => ['internal-link'],
  'high-bounce': () => ['hero-copy'],
  'conversion-gap': () => ['price', 'cta-label'],
  'rotation-due': () => ['story-rotation'],
  'jsonld-missing': () => ['jsonld'],
  'alt-missing': () => ['alt'],
  'metric-fell': () => ['revert'],
  'index-issue': indexIssue,
  'striking-distance': () => ['meta-title', 'internal-link', 'h1', 'first-paragraph'],
  'intent-mismatch': () => ['guide'],
  'brand-share': () => ['brand-share'],
  'cwv-regression': () => ['cwv'],
  'content-decay': () => ['freshness-date', 'faq', 'meta-description', 'body-refresh'],
  'media-no-clicks': () => ['alt', 'file-name'],
  backlinks: (s) => (s.toxic ? ['backlinks', 'disavow'] : ['backlinks']),
  'competitor-move': () => ['competitor', 'competitor-match'],
  gbp: (s) => (s.reviewCount != null ? ['gbp', 'review-count'] : ['gbp']),
  'aeo-not-citable': () => ['freshness-date', 'faq', 'copy'],
  'funnel-leak': (s) => ['funnel', FORM_STEPS.has(s.step) ? 'form-field' : 'cta-label'],
  'form-leads': () => ['form-leads'],
  'lead-quality': () => ['lead-quality'],
  'source-mix': () => ['source-mix'],
  'time-to-convert': () => ['time-to-convert'],
  'segment-gap': () => ['segment-gap'],
  'field-abandonment': () => ['form-field'],
  'pricing-behaviour': () => ['pricing-behaviour', 'price'],
  'audience-gap': () => ['audience-headline'],
  offline: () => ['offline'],
  seasonality: () => ['seasonality'],
});

export function tierFor(type) {
  return typeof type === 'string' && Object.hasOwn(TIERS, type) ? TIERS[type] : 'review';
}

export function downgrade(item, reason) {
  if (item.tier !== 'auto') return { ...item };
  return { ...item, tier: 'review', downgraded: reason };
}

export function applySkillTier(item, requestedTier) {
  const ceiling = Math.min(RANK[tierFor(item.type)], RANK[item.tier] ?? RANK[tierFor(item.type)]);
  const current = Object.keys(RANK).find((t) => RANK[t] === ceiling);
  const wanted = RANK[requestedTier];
  return { ...item, tier: wanted && wanted <= ceiling ? requestedTier : current };
}

export function effortFor(type, { needsInput = false } = {}) {
  if (needsInput) return 5;
  if (Object.hasOwn(EFFORT, type)) return EFFORT[type];
  return Object.hasOwn(TIERS, type) ? 1 : 3;
}

function band(value, steps) {
  if (typeof value !== 'number') return 0;
  return steps.filter((s) => value >= s).length;
}

export function impactFor(signal, { hubs = [], leadPages = [] } = {}) {
  let points = Math.max(band(signal.impressions, [50, 200, 1000]), band(signal.sessions, [20, 100, 500]));
  points += band(signal.volume, [50, 500]);
  const pos = signal.position;
  if (typeof pos === 'number') {
    if (pos >= 11 && pos <= 15) points += 2;
    else if ((pos >= 4 && pos <= 10) || (pos > 15 && pos <= 20)) points += 1;
  }
  if (signal.page && (hubs.includes(signal.page) || leadPages.includes(signal.page))) points += 1;
  return Math.min(5, Math.max(1, 1 + points));
}

export function score(impact, effort) {
  return impact * (6 - effort);
}

function addDays(iso, days) {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

export function toPath(page) {
  if (typeof page !== 'string' || page === '') return page ?? null;
  const path = /^https?:\/\//i.test(page) ? new URL(page).pathname : page;
  return path.length > 1 ? path.replace(/\/+$/, '') : '/';
}

function withPages(s) {
  if (s.type === 'cannibalisation' && !s.page && Array.isArray(s.pages) && s.pages.length > 1) {
    const winner = toPath(s.winner ?? s.pages[0].page);
    const loser = s.pages.map((p) => toPath(p.page)).filter((p) => p !== winner).at(-1);
    return { ...s, page: loser, target: winner };
  }
  return { ...s, page: toPath(s.page), ...(s.target ? { target: toPath(s.target) } : {}) };
}

function signalsFrom(input, source) {
  const list = Array.isArray(input) ? input : Array.isArray(input?.signals) ? input.signals : [];
  return list.map((s) => withPages({ source, ...s }));
}

function lowTraffic(s) {
  const hasNumbers = typeof s.sessions === 'number' || typeof s.impressions === 'number';
  return hasNumbers && !((s.sessions ?? 0) >= MIN_SESSIONS || (s.impressions ?? 0) >= MIN_IMPRESSIONS);
}

function isNl(s) {
  return s.locale === 'nl' || /^\/nl(\/|$)/.test(s.page ?? '');
}

function metricFor(type) {
  if (CONVERSION_TYPES.has(type)) return 'lead_submitted_rate';
  if (type === 'meta-title' || type === 'meta-description') return 'ctr';
  if (['alt', 'jsonld', 'sitemap', 'noindex', 'faq', 'freshness-date'].includes(type)) return 'impressions';
  return 'clicks';
}

export function fromFindings({ findings = [], semrush, posthog, today = new Date().toISOString().slice(0, 10), hubs = [], leadPages = [] } = {}) {
  const signals = [...signalsFrom(findings, 'gsc'), ...signalsFrom(semrush, 'semrush'), ...signalsFrom(posthog, 'posthog')];
  const seen = new Map();
  const out = [];

  for (const signal of signals) {
    const mapper = Object.hasOwn(SIGNALS, signal.type) ? SIGNALS[signal.type] : null;
    const types = !mapper || lowTraffic(signal) ? ['watch'] : mapper(signal);
    const impact = impactFor(signal, { hubs, leadPages });

    for (const type of types) {
      const key = [signal.source, signal.type, type, signal.page ?? '', signal.query ?? '', signal.issue ?? ''].join('|');
      const count = seen.get(key) ?? 0;
      seen.set(key, count + 1);
      const id = createHash('sha1').update(`${key}|${count}`).digest('hex').slice(0, 10);
      const tier = tierFor(type);
      const effort = effortFor(type, { needsInput: signal.needsInput });
      const acting = tier !== 'report';
      let item = {
        id,
        page: signal.page ?? null,
        tier,
        type,
        signal: signal.type,
        source: signal.source,
        query: signal.query ?? null,
        ...(signal.target ? { target: signal.target } : {}),
        impact,
        effort,
        score: acting ? score(impact, effort) : 0,
        selected: false,
        before: type === 'watch' ? null : signal.before ?? null,
        after: type === 'watch' ? null : signal.after ?? null,
        metric: acting ? metricFor(type) : null,
        threshold: acting ? REVERT_THRESHOLD : null,
        reviewAt: acting ? addDays(today, MIN_DAYS_BETWEEN) : null,
        signalDate: signal.date ?? today,
      };
      if (tier === 'auto' && isNl(signal) && !LOCALE_FIELDS.has(type)) item = downgrade(item, 'nl-nonlocale');
      if (type === 'faq' && !signal.query) item = downgrade(item, 'faq-needs-query');
      out.push(item);
    }
  }
  DEBUG && console.log(`recommend: ${signals.length} signals -> ${out.length} items`);
  return out;
}

export function selectForRun(recs, { autoTarget = 3, reviewTarget = 2, recentlyChanged = [], activeExperiments = [], parked = [] } = {}) {
  const changed = new Set(recentlyChanged.map((e) => (typeof e === 'string' ? e : e?.page)));
  const experiments = new Set(activeExperiments.map((e) => (typeof e === 'string' ? e : e?.page)));
  const parkedIds = new Set(parked.map((e) => (typeof e === 'string' ? e : e?.id)));
  const targets = { auto: Math.min(autoTarget, MAX_AUTO), review: reviewTarget };
  const taken = { auto: 0, review: 0 };
  const usedPages = new Set();

  const ranked = recs
    .map((r, index) => ({ r, index }))
    .sort((a, b) => (b.r.score ?? 0) - (a.r.score ?? 0)
      || String(a.r.signalDate ?? '').localeCompare(String(b.r.signalDate ?? ''))
      || a.index - b.index)
    .map(({ r }, i) => ({ ...r, selected: false, rank: i + 1 }));

  for (const item of ranked) {
    if (item.tier !== 'auto' && item.tier !== 'review') continue;
    if (changed.has(item.page)) { item.blocked = 'page-changed-recently'; continue; }
    if (experiments.has(item.page)) { item.blocked = 'active-experiment'; continue; }
    if (item.tier === 'review' && item.effort === 5 && parkedIds.has(item.id)) { item.parked = true; continue; }
    if (usedPages.has(item.page) || taken[item.tier] >= targets[item.tier]) continue;
    item.selected = true;
    taken[item.tier] += 1;
    usedPages.add(item.page);
  }
  return ranked;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function exclusionsFromLog(text, today = new Date().toISOString().slice(0, 10)) {
  const { changes } = parseLog(text);
  const cutoff = addDays(today, -MIN_DAYS_BETWEEN);
  return {
    recentlyChanged: [...new Set(changes.filter((c) => c.date > cutoff).map((c) => toPath(c.page)))],
    parked: changes.filter((c) => c.tier === 'review' && c.id).map((c) => c.id),
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--tiers') args.tiers = true;
    else if (flag.startsWith('--')) args[flag.slice(2)] = argv[(i += 1)];
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.tiers) {
    process.stdout.write(`${JSON.stringify(TIERS, null, 2)}\n`);
    return 0;
  }
  if (!args.report) {
    process.stderr.write('Usage: node tools/studio-zissou/recommend.js --report <week.json> [--semrush f.json] [--posthog f.json] [--log log.md] [--active /a,/b] [--out f.json] | --tiers\n');
    return 2;
  }
  const report = readJson(args.report);
  const recs = fromFindings({
    findings: report.findings ?? [],
    semrush: args.semrush ? readJson(args.semrush) : report.semrush,
    posthog: args.posthog ? readJson(args.posthog) : report.posthog,
    today: report.today,
    hubs: report.hubs,
    leadPages: report.leadPages,
  });
  const exclusions = args.log ? exclusionsFromLog(readFileSync(args.log, 'utf8'), report.today) : {};
  const activeExperiments = args.active ? args.active.split(',').map((p) => toPath(p.trim())).filter(Boolean) : [];
  const json = `${JSON.stringify({ week: report.week ?? null, recommendations: selectForRun(recs, { ...exclusions, activeExperiments }) }, null, 2)}\n`;
  if (args.out) writeFileSync(args.out, json);
  else process.stdout.write(json);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
