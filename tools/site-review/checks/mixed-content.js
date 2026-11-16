// Reports https pages that load any resource over http, one row per page with the count as the value.

import { contentPages, pageRow } from './_shared.js';

export const meta = { name: 'mixed-content', taxonomyIds: ['mixed-content'], tier: 1, crossPage: false, audit: true };

const TAGS = {
  script: ['script[src]', (url) => `<script src="${url}">`],
  stylesheet: ['link[rel=stylesheet]', (url) => `<link rel="stylesheet" href="${url}">`],
  iframe: ['iframe[src]', (url) => `<iframe src="${url}">`],
  img: ['img[src]', (url) => `<img src="${url}">`],
  srcset: ['[srcset]', (url) => `<img srcset="${url}">`],
  media: ['source[src]', (url) => `<source src="${url}">`],
  link: ['link[href]', (url) => `<link href="${url}">`],
};

export async function check({ facts = [] } = {}) {
  const rows = [];
  for (const fact of contentPages(facts)) {
    if (!String(fact.finalUrl ?? fact.url).startsWith('https:')) continue;
    const insecure = (fact.resources ?? []).filter((resource) => /^http:/i.test(resource.url ?? ''));
    if (insecure.length === 0) continue;
    const [selector, render] = TAGS[insecure[0].kind] ?? TAGS.link;
    rows.push(pageRow(fact, 'mixed-content', { value: insecure.length, selector, snippet: render(insecure[0].url) }));
  }
  return rows;
}
