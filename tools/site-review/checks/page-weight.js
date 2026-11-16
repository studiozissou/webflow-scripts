// Reports pages whose HTML is too large, that carry too many links, or that are served without compression.

import { contentPages, pageRow, thresholds } from './_shared.js';

export const meta = {
  name: 'page-weight',
  taxonomyIds: ['html-too-large', 'too-many-links', 'uncompressed-page'],
  tier: 1,
  crossPage: false,
  audit: true,
};

export async function check({ facts = [], config } = {}) {
  const { htmlBytesMax, linksMax } = thresholds(config);
  const rows = [];
  for (const fact of contentPages(facts)) {
    if (typeof fact.bytes === 'number' && fact.bytes > htmlBytesMax) {
      rows.push(pageRow(fact, 'html-too-large', { value: fact.bytes, selector: 'http:body', snippet: `${fact.bytes} bytes of HTML` }));
    }
    const links = fact.links?.length ?? 0;
    if (links > linksMax) {
      rows.push(pageRow(fact, 'too-many-links', { value: links, selector: 'a[href]', snippet: `${links} <a href> links` }));
    }
    if (fact.headers && fact.headers.contentEncoding == null) {
      rows.push(pageRow(fact, 'uncompressed-page', {
        value: null, selector: 'header:content-encoding', snippet: `content-type: ${fact.headers.contentType ?? ''}; no content-encoding`,
      }));
    }
  }
  return rows;
}
