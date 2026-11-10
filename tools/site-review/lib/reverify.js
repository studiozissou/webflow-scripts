// Refetches every URL behind a status-derived fail once, without keep-alive, and marks findings that do not reproduce as transient.

import { sleep as defaultSleep } from './finding.js';

const DEBUG = false;
const CONCURRENCY = 4;
const NON_200_IDS = new Set(['canonical-to-non-200', 'hreflang-non-200']);
const REDIRECT_IDS = new Set(['redirect-chain', 'temporary-redirect', 'permanent-redirect']);
const INCONCLUSIVE_STATES = new Set(['fetch_failed', 'timeout', 'blocked']);
export const REVERIFY_FETCH_OPTIONS = Object.freeze({ keepAlive: false, retries: 0, method: 'GET', readBody: false });

const isRedirect = (status) => Number.isInteger(status) && status >= 300 && status < 400;

export function reverifyUrlOf(finding, entry) {
  return entry?.unit === 'link' && finding.target ? finding.target : finding.url;
}

function recordedFirstHop(evidence) {
  if (isRedirect(evidence?.status)) return evidence.status;
  const value = evidence?.value;
  if (Array.isArray(value) && isRedirect(value[0]?.status)) return value[0].status;
  if (isRedirect(value)) return value;
  return null;
}

export function reproduces(finding, result) {
  if (!result) return null;
  const status = result.status ?? 0;
  const firstStatus = result.redirectChain?.[0]?.status ?? status;
  const notFound = result.errorCode === 'ENOTFOUND';
  if (INCONCLUSIVE_STATES.has(result.fetchState) && !notFound) return null;
  if (NON_200_IDS.has(finding.taxonomyId)) return firstStatus !== 200;
  const recorded = finding.evidence?.status;
  const firstHop = recordedFirstHop(finding.evidence);
  if (notFound && (firstHop != null || REDIRECT_IDS.has(finding.taxonomyId))) return null;
  if (firstHop != null) return result.redirectChain?.[0]?.status === firstHop;
  if (REDIRECT_IDS.has(finding.taxonomyId)) return (result.redirectChain?.length ?? 0) > 0 || Boolean(result.redirectLoop);
  if ((Number.isInteger(recorded) && recorded >= 400) || !recorded) return status >= 400 || notFound;
  return status === recorded;
}

export async function reverifyFindings({ findings, taxonomy, fetchPage, delayMs = 2000, sleep = defaultSleep, log }) {
  const entries = new Map((taxonomy ?? []).map((entry) => [entry.id, entry]));
  const stats = { urls: 0, checked: 0, reproduced: 0, transient: 0, inconclusive: 0 };
  const candidates = findings.filter(
    (finding) => finding.state === 'fail' && !finding.transient && entries.get(finding.taxonomyId)?.statusDerived,
  );
  if (candidates.length === 0) return { findings, stats };

  const urls = [...new Set(candidates.map((finding) => reverifyUrlOf(finding, entries.get(finding.taxonomyId))))];
  stats.urls = urls.length;
  await sleep(delayMs);

  const results = new Map();
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next];
      next += 1;
      try {
        results.set(url, await fetchPage(url, { ...REVERIFY_FETCH_OPTIONS }));
      } catch (error) {
        results.set(url, { url, status: 0, fetchState: 'fetch_failed', errorCode: error?.code ?? null, redirectChain: [] });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));

  const candidateSet = new Set(candidates);
  const out = findings.map((finding) => {
    if (!candidateSet.has(finding)) return finding;
    stats.checked += 1;
    const result = results.get(reverifyUrlOf(finding, entries.get(finding.taxonomyId)));
    const verdict = reproduces(finding, result);
    if (verdict === null) {
      stats.inconclusive += 1;
      return finding;
    }
    if (verdict) {
      stats.reproduced += 1;
      return finding;
    }
    stats.transient += 1;
    DEBUG && console.log('transient', finding.id, result?.status);
    return { ...finding, transient: true, tags: [...new Set([...(finding.tags ?? []), 'transient'])] };
  });
  log?.info?.(`reverify: ${stats.checked} findings, ${stats.transient} transient`);
  return { findings: out, stats };
}
