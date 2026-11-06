// Reports recommended security headers missing from the root page response.

import { rootOf, pageRow } from './_shared.js';

export const HEADER_RULES = Object.freeze([
  ['hsts-missing', 'strictTransportSecurity', 'strict-transport-security'],
  ['csp-missing', 'contentSecurityPolicy', 'content-security-policy'],
  ['x-content-type-options-missing', 'xContentTypeOptions', 'x-content-type-options'],
  ['x-frame-options-missing', 'xFrameOptions', 'x-frame-options'],
  ['referrer-policy-missing', 'referrerPolicy', 'referrer-policy'],
  ['permissions-policy-missing', 'permissionsPolicy', 'permissions-policy'],
]);

export const meta = {
  name: 'security-headers',
  taxonomyIds: HEADER_RULES.map(([id]) => id),
  tier: 1,
  crossPage: false,
  audit: true,
};

export async function check({ facts = [], site } = {}) {
  const { fact } = rootOf(site, facts);
  if (fact?.fetchState !== 'ok' || !fact.headers?.security) return [];
  const security = fact.headers.security;
  return HEADER_RULES.filter(([, field]) => security[field] == null).map(([taxonomyId, , header]) =>
    pageRow(fact, taxonomyId, { value: null, selector: `header:${header}`, snippet: '' }));
}
