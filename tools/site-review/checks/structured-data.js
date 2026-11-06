// Reports every JSON-LD block that does not parse, with the parser message as the value.

import { contentPages, pageRow } from './_shared.js';

export const meta = { name: 'structured-data', taxonomyIds: ['jsonld-parse-error'], tier: 1, crossPage: false, audit: true };

export async function check({ facts = [] } = {}) {
  const rows = [];
  for (const fact of contentPages(facts)) {
    for (const error of fact.jsonLd?.parseErrors ?? []) {
      rows.push(pageRow(fact, 'jsonld-parse-error', {
        value: error.message ?? null, selector: 'script[type="application/ld+json"]', snippet: error.snippet ?? error.message ?? '',
      }));
    }
  }
  return rows;
}
