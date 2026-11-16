// Row builders and fact helpers shared by the check modules; it exports no check, so the runner does not load it as one.

import { AUDIT_THRESHOLDS } from '../config.js';
import { clip } from '../lib/finding.js';

export const UNUSABLE_STATES = Object.freeze(['fetch_failed', 'timeout', 'blocked']);

export function thresholds(config) {
  return { ...AUDIT_THRESHOLDS, ...(config?.audit?.thresholds ?? {}) };
}

export function isContentPage(fact) {
  return fact?.fetchState === 'ok' && fact.status === 200 && !(fact.redirectChain?.length > 0);
}

export function contentPages(facts) {
  return (facts ?? []).filter(isContentPage);
}

export function firstStatus(target) {
  return target?.redirectChain?.length > 0 ? target.redirectChain[0].status : (target?.status ?? 0);
}

export function absolute(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

export function unknownReason(target) {
  if (!target) return 'not_run';
  if (target.capExceeded) return 'cap_exceeded';
  return UNUSABLE_STATES.includes(target.fetchState) ? target.fetchState : null;
}

export function factsByKey(facts) {
  return new Map((facts ?? []).map((fact) => [fact.urlKey, fact]));
}

export function targetResolver(linkTargets, facts) {
  const byKey = factsByKey(facts);
  const targets = linkTargets instanceof Map ? linkTargets : new Map();
  return (key) => {
    if (targets.has(key)) return targets.get(key);
    const fact = byKey.get(key);
    if (!fact) return null;
    return {
      urlKey: fact.urlKey, url: fact.url, internal: true, inSitemap: fact.inSitemap === true, isFact: true,
      kinds: [], method: null, status: fact.status, finalUrl: fact.finalUrl, redirectChain: fact.redirectChain ?? [],
      redirectLoop: fact.redirectLoop === true, fetchState: fact.fetchState, errorCode: fact.errorCode ?? null,
      capExceeded: false, checkedAt: fact.fetchedAt,
    };
  };
}

function evidence(base, opts) {
  const out = {
    value: opts.value === undefined ? null : opts.value,
    source: 'raw',
    status: opts.status ?? base.status ?? 0,
    finalUrl: opts.finalUrl ?? base.finalUrl ?? base.url ?? null,
    selector: opts.selector ?? '',
    snippet: clip(opts.snippet ?? ''),
    fetchedAt: opts.fetchedAt ?? base.fetchedAt ?? null,
  };
  if (opts.related) out.related = [...opts.related];
  return out;
}

function finish(row, opts) {
  if (opts.state === 'unknown') {
    row.state = 'unknown';
    row.reason = opts.reason;
  }
  if (opts.siteLevel) row.siteLevel = true;
  return row;
}

export function pageRow(fact, taxonomyId, opts = {}) {
  return finish({ taxonomyId, url: fact.url, urlKey: fact.urlKey, state: 'fail', evidence: evidence(fact, opts) }, opts);
}

export function linkRow(fact, taxonomyId, target, opts = {}) {
  const targetUrl = target.url;
  const base = {
    status: target.status,
    finalUrl: target.finalUrl ?? targetUrl,
    fetchedAt: target.checkedAt ?? target.fetchedAt ?? fact.fetchedAt,
  };
  return finish({
    taxonomyId, url: fact.url, urlKey: fact.urlKey, target: targetUrl, targetKey: target.urlKey,
    state: 'fail', evidence: evidence(base, opts),
  }, opts);
}

export function rootOf(site, facts) {
  const key = site?.root?.urlKey ?? facts?.[0]?.urlKey;
  const fact = (facts ?? []).find((f) => f.urlKey === key) ?? null;
  return {
    url: site?.root?.url ?? fact?.url,
    urlKey: key,
    status: fact?.status ?? 0,
    finalUrl: fact?.finalUrl ?? site?.root?.url ?? null,
    fetchedAt: fact?.fetchedAt ?? null,
    fact,
  };
}

export function siteRow(site, facts, taxonomyId, opts = {}) {
  const root = rootOf(site, facts);
  return pageRow(root, taxonomyId, opts);
}

export function linkSnippet(link) {
  return link.snippet || `<a href="${link.href}">${link.accessibleName ?? ''}</a>`;
}

export function imageSnippet(image) {
  const alt = image.alt == null ? '' : ` alt="${image.alt}"`;
  return `<img src="${image.src}"${alt}>`;
}

export function onePerTarget() {
  const seen = new Set();
  return (taxonomyId, urlKey, targetKey) => {
    const key = `${taxonomyId}|${urlKey}|${targetKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
}

export function chainSnippet(target) {
  const hops = (target.redirectChain ?? []).map((hop) => `${hop.status} ${hop.url}`);
  return [...hops, `${target.status} ${target.finalUrl ?? ''}`.trim()].join(' -> ');
}

export function relatedKeys(group, fact) {
  return group.filter((other) => other !== fact).map((other) => other.urlKey).sort();
}

export function duplicateGroups(pages, field) {
  const groups = new Map();
  for (const fact of pages) {
    const value = fact[field];
    if (typeof value !== 'string' || value.trim() === '') continue;
    const key = value.trim();
    groups.set(key, [...(groups.get(key) ?? []), fact]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}
