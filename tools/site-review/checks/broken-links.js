// Reports links and images whose checked target is broken, and records unknown rows for targets that could not be judged.

import {
  contentPages, targetResolver, linkRow, onePerTarget, linkSnippet, imageSnippet, absolute, thresholds, unknownReason,
} from './_shared.js';
import { hostOfKey } from '../lib/url-key.js';

export const meta = {
  name: 'broken-links',
  taxonomyIds: ['broken-internal-link', 'broken-external-link', 'broken-external-image', 'broken-internal-image'],
  tier: 1,
  crossPage: false,
  audit: true,
};

function judge(target, internal, blockedStatuses) {
  const reason = unknownReason(target);
  if (!internal && target?.fetchState === 'fetch_failed' && target.errorCode === 'ENOTFOUND') {
    return { state: 'fail', value: 'ENOTFOUND' };
  }
  if (reason) return { state: 'unknown', reason, value: target?.errorCode ?? null };
  if (!internal && blockedStatuses.includes(target.status)) return { state: 'unknown', reason: 'blocked', value: target.status };
  if (target.status >= 400) return { state: 'fail', value: target.status };
  return null;
}

export async function check({ facts = [], linkTargets, config } = {}) {
  const blockedStatuses = thresholds(config).externalBlockedStatuses ?? [];
  const resolve = targetResolver(linkTargets, facts);
  const fresh = onePerTarget();
  const rows = [];

  const emit = (fact, ids, key, url, internalHint, selector, snippet) => {
    if (!key) return;
    const target = resolve(key);
    const internal = target?.internal ?? internalHint;
    const id = internal ? ids[0] : ids[1];
    if (!fresh(id, fact.urlKey, key)) return;
    const verdict = judge(target, internal, blockedStatuses);
    if (!verdict) return;
    const subject = target ?? { url, urlKey: key, status: 0, finalUrl: null, checkedAt: null };
    rows.push(linkRow(fact, id, { ...subject, url: subject.url ?? url, urlKey: key }, {
      ...verdict, selector, snippet,
    }));
  };

  for (const fact of contentPages(facts)) {
    const base = fact.finalUrl ?? fact.url;
    for (const link of fact.links ?? []) {
      emit(fact, ['broken-internal-link', 'broken-external-link'], link.hrefKey, absolute(link.href, base),
        link.internal, 'a[href]', linkSnippet(link));
    }
    for (const image of fact.images ?? []) {
      emit(fact, ['broken-internal-image', 'broken-external-image'], image.srcKey, absolute(image.src, base),
        hostOfKey(image.srcKey ?? '') === hostOfKey(fact.urlKey), 'img[src]', imageSnippet(image));
    }
  }
  return rows;
}
