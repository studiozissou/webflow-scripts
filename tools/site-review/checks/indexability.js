// Reports a robots.txt that is missing or that the parser finds errors in, as one site-level row each.

import { siteRow, UNUSABLE_STATES } from './_shared.js';

export const meta = {
  name: 'indexability',
  taxonomyIds: ['robots-txt-missing', 'robots-txt-invalid'],
  tier: 1,
  crossPage: false,
  audit: true,
};

export async function check({ facts = [], site, parseRobots } = {}) {
  const robots = site?.robots;
  if (!robots) return [];
  const base = { status: robots.status ?? 0, finalUrl: robots.url, selector: 'robots.txt' };
  if (robots.status !== 200) {
    const opts = { ...base, value: robots.status ?? 0, snippet: `GET ${robots.url} -> ${robots.status ?? 0}` };
    const unknown = UNUSABLE_STATES.includes(robots.fetchState) ? { state: 'unknown', reason: robots.fetchState } : {};
    return [siteRow(site, facts, 'robots-txt-missing', { ...opts, ...unknown })];
  }
  const parse = parseRobots ?? (await import('../lib/robots.js')).parseRobots;
  const { errors = [] } = parse(robots.text ?? '');
  if (errors.length === 0) return [];
  return [siteRow(site, facts, 'robots-txt-invalid', {
    ...base,
    value: errors.map((error) => `line ${error.line}: ${error.message}`),
    snippet: errors.map((error) => `line ${error.line}: ${error.message}`).join('; '),
  })];
}
