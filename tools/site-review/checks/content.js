// Reports duplicate body text across pages and thin or markup-heavy pages.

import { contentPages, pageRow, thresholds, relatedKeys } from './_shared.js';

export const meta = {
  name: 'content',
  taxonomyIds: ['duplicate-content', 'low-text-to-html', 'low-word-count'],
  tier: 1,
  crossPage: true,
  audit: true,
};

const DUPLICATE_MIN_WORDS = 50;

export async function check({ facts = [], config } = {}) {
  const { textToHtmlMin, wordCountMin } = thresholds(config);
  const pages = contentPages(facts);
  const rows = [];
  const byHash = new Map();
  for (const fact of pages) {
    if (typeof fact.textToHtmlRatio === 'number' && fact.textToHtmlRatio < textToHtmlMin) {
      rows.push(pageRow(fact, 'low-text-to-html', {
        value: fact.textToHtmlRatio, selector: 'body', snippet: `text to HTML ratio ${fact.textToHtmlRatio} (${fact.bytes ?? '?'} bytes)`,
      }));
    }
    if (typeof fact.wordCount === 'number' && fact.wordCount < wordCountMin) {
      rows.push(pageRow(fact, 'low-word-count', { value: fact.wordCount, selector: 'body', snippet: `${fact.wordCount} words` }));
    }
    if (fact.textHash && fact.wordCount >= DUPLICATE_MIN_WORDS) {
      byHash.set(fact.textHash, [...(byHash.get(fact.textHash) ?? []), fact]);
    }
  }
  for (const group of byHash.values()) {
    if (group.length < 2) continue;
    for (const fact of group) {
      const related = relatedKeys(group, fact);
      rows.push(pageRow(fact, 'duplicate-content', {
        value: fact.textHash, selector: 'body', snippet: `textHash ${fact.textHash}, ${fact.wordCount} words`, related,
      }));
    }
  }
  return rows;
}
