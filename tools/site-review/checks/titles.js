// Reports missing, duplicate, too long and too short page titles on 200 HTML pages.

import { contentPages, pageRow, thresholds, duplicateGroups, relatedKeys } from './_shared.js';

export const meta = {
  name: 'titles',
  taxonomyIds: ['title-missing', 'title-duplicate', 'title-too-long', 'title-too-short'],
  tier: 1,
  crossPage: true,
  audit: true,
};

const SELECTOR = 'head > title';

function tag(title) {
  return `<title>${title}</title>`;
}

export async function check({ facts = [], config } = {}) {
  const { titleMin, titleMax } = thresholds(config);
  const pages = contentPages(facts);
  const rows = [];
  for (const fact of pages) {
    const { title } = fact;
    if (title == null || title === '') {
      rows.push(pageRow(fact, 'title-missing', { value: title ?? null, selector: SELECTOR, snippet: title === '' ? tag('') : '' }));
      continue;
    }
    const length = [...title].length;
    if (length > titleMax) {
      rows.push(pageRow(fact, 'title-too-long', { value: length, selector: SELECTOR, snippet: tag(title) }));
    } else if (length < titleMin) {
      rows.push(pageRow(fact, 'title-too-short', { value: length, selector: SELECTOR, snippet: tag(title) }));
    }
  }
  for (const group of duplicateGroups(pages, 'title')) {
    for (const fact of group) {
      const related = relatedKeys(group, fact);
      rows.push(pageRow(fact, 'title-duplicate', { value: fact.title, selector: SELECTOR, snippet: tag(fact.title), related }));
    }
  }
  return rows;
}
