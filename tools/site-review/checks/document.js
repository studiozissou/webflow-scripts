// Reports 200 HTML pages without a viewport meta, a doctype or a declared charset.

import { contentPages, pageRow } from './_shared.js';

export const meta = {
  name: 'document',
  taxonomyIds: ['viewport-missing', 'doctype-missing', 'charset-missing'],
  tier: 1,
  crossPage: false,
  audit: true,
};

const RULES = [
  ['viewport-missing', 'viewport', 'head > meta[name=viewport]'],
  ['doctype-missing', 'doctype', '!doctype'],
  ['charset-missing', 'charset', 'meta[charset], header:content-type'],
];

export async function check({ facts = [] } = {}) {
  const rows = [];
  for (const fact of contentPages(facts)) {
    for (const [taxonomyId, field, selector] of RULES) {
      if (fact[field] === null) rows.push(pageRow(fact, taxonomyId, { value: null, selector, snippet: '' }));
    }
  }
  return rows;
}
