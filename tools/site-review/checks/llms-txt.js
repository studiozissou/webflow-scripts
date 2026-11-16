// Reports a site whose /llms.txt does not answer 200, as one site-level row.

import { siteRow, UNUSABLE_STATES } from './_shared.js';

export const meta = { name: 'llms-txt', taxonomyIds: ['llms-txt-missing'], tier: 1, crossPage: false, audit: true };

export async function check({ facts = [], site } = {}) {
  const llms = site?.llms;
  if (!llms || llms.status === 200) return [];
  const opts = {
    value: llms.status ?? 0, status: llms.status ?? 0, finalUrl: llms.url, selector: 'llms.txt',
    snippet: `GET ${llms.url} -> ${llms.status ?? 0}`,
  };
  const unknown = UNUSABLE_STATES.includes(llms.fetchState) ? { state: 'unknown', reason: llms.fetchState } : {};
  return [siteRow(site, facts, 'llms-txt-missing', { ...opts, ...unknown })];
}
