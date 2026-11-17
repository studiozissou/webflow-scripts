// Reports missing and duplicate meta descriptions on 200 HTML pages.

import { contentPages, pageRow, duplicateGroups, relatedKeys } from './_shared.js';

export const meta = {
  name: 'descriptions',
  taxonomyIds: ['description-missing', 'description-duplicate'],
  tier: 1,
  crossPage: true,
  audit: true,
};

const SELECTOR = 'head > meta[name=description]';

function tag(content) {
  return `<meta name="description" content="${content}">`;
}

export async function check({ facts = [] } = {}) {
  const pages = contentPages(facts);
  const rows = [];
  for (const fact of pages) {
    const value = fact.metaDescription;
    if (value == null || value === '') {
      rows.push(pageRow(fact, 'description-missing', { value: value ?? null, selector: SELECTOR, snippet: value === '' ? tag('') : '' }));
    }
  }
  for (const group of duplicateGroups(pages, 'metaDescription')) {
    for (const fact of group) {
      const related = relatedKeys(group, fact);
      rows.push(pageRow(fact, 'description-duplicate', {
        value: fact.metaDescription, selector: SELECTOR, snippet: tag(fact.metaDescription), related,
      }));
    }
  }
  return rows;
}
