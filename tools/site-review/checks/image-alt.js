// Reports images with no alt attribute; an empty alt marks a decorative image and passes.

import { contentPages, linkRow, onePerTarget, imageSnippet, absolute } from './_shared.js';

export const meta = { name: 'image-alt', taxonomyIds: ['image-missing-alt'], tier: 1, crossPage: false, audit: true };

export async function check({ facts = [], linkTargets } = {}) {
  const fresh = onePerTarget();
  const rows = [];
  for (const fact of contentPages(facts)) {
    const base = fact.finalUrl ?? fact.url;
    for (const image of fact.images ?? []) {
      if (image.alt !== null) continue;
      const key = image.srcKey ?? image.src;
      if (!key || !fresh('image-missing-alt', fact.urlKey, key)) continue;
      const target = { ...(linkTargets?.get?.(key) ?? {}), url: absolute(image.src, base), urlKey: key };
      rows.push(linkRow(fact, 'image-missing-alt', target, { value: null, selector: 'img:not([alt])', snippet: imageSnippet(image) }));
    }
  }
  return rows;
}
