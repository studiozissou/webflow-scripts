// Reports pages with no H1, more than one H1, or a first H1 that repeats the title.

import { contentPages, pageRow } from './_shared.js';

export const meta = {
  name: 'headings',
  taxonomyIds: ['h1-missing', 'h1-multiple', 'h1-duplicates-title'],
  tier: 1,
  crossPage: false,
  audit: true,
};

export function normaliseText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function tags(h1s) {
  return h1s.map((text) => `<h1>${text}</h1>`).join('');
}

export async function check({ facts = [] } = {}) {
  const rows = [];
  for (const fact of contentPages(facts)) {
    if (!Array.isArray(fact.h1)) continue;
    if (fact.h1.length === 0) {
      rows.push(pageRow(fact, 'h1-missing', { value: [], selector: 'h1', snippet: '' }));
      continue;
    }
    if (fact.h1.length > 1) {
      rows.push(pageRow(fact, 'h1-multiple', { value: [...fact.h1], selector: 'h1', snippet: tags(fact.h1) }));
    }
    const first = normaliseText(fact.h1[0]);
    if (first !== '' && first === normaliseText(fact.title)) {
      rows.push(pageRow(fact, 'h1-duplicates-title', {
        value: fact.h1[0], selector: 'h1', snippet: `${tags([fact.h1[0]])} <title>${fact.title}</title>`,
      }));
    }
  }
  return rows;
}
