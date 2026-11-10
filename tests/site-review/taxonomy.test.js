import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SEVERITIES } from '../../tools/site-review/config.js';

const ROOT = new URL('../../tools/site-review/', import.meta.url);
const taxonomy = JSON.parse(readFileSync(new URL('taxonomy.json', ROOT), 'utf8'));
const byId = new Map(taxonomy.map((entry) => [entry.id, entry]));

const FACT_FIELDS = new Set([
  'schemaVersion', 'url', 'urlKey', 'finalUrl', 'status', 'redirectChain', 'redirectLoop', 'headers', 'bytes', 'fetchedAt',
  'fetchState', 'errorCode', 'htmlHash', 'textHash', 'doctype', 'wfPage', 'wfSite', 'lang', 'title', 'titleCount',
  'metaDescription', 'metaDescriptionCount', 'metaRefresh', 'robotsMeta', 'canonicals', 'hreflang', 'h1', 'headings',
  'wordCount', 'textToHtmlRatio', 'links', 'resources', 'images', 'jsonLd', 'scripts', 'viewport', 'charset',
  'inSitemap', 'lastmod', 'sitemap',
]);

const P1 = `
http-4xx|status|error|page|2|true
http-5xx|status|error|page|1|true
broken-internal-link|broken-links|error|link|8|true
broken-external-link|broken-links|warning|link|12|true
broken-external-image|broken-links|warning|link|14|true
redirect-chain|redirects|error|link|33|true
temporary-redirect|redirects|warning|link|109|true
permanent-redirect|redirects|notice|link|214|true
title-missing|titles|error|page|3|false
title-duplicate|titles|error|page|6|false
title-too-long|titles|warning|page|102|false
title-too-short|titles|warning|page|101|false
description-missing|descriptions|warning|page|106|false
description-duplicate|descriptions|error|page|15|false
h1-missing|headings|warning|page|103|false
h1-multiple|headings|warning|page|104|false
h1-duplicates-title|headings|warning|page|105|false
duplicate-content|content|error|page|7|false
jsonld-parse-error|structured-data|error|page|45|false
sitemap-incorrect-page|sitemap-hygiene|error|page|18|true
sitemap-noindex|sitemap-hygiene|error|page|null|false
sitemap-missing|sitemap-hygiene|error|page|125|false
sitemap-invalid|sitemap-hygiene|error|page|17|false
sitemap-orphan|internal-links|notice|page|207|false
canonical-missing|canonical|warning|page|null|false
canonical-not-absolute|canonical|warning|page|null|false
canonical-multiple|canonical|warning|page|39|false
canonical-to-non-200|canonical|error|link|38|true
hreflang-no-return|hreflang|error|link|null|false
hreflang-non-200|hreflang|error|link|null|true
links-to-http|internal-links|warning|link|31|false
nofollow-internal-link|internal-links|warning|link|123|false
link-no-accessible-name|internal-links|notice|link|216|false
image-missing-alt|image-alt|warning|link|110|false
low-text-to-html|content|warning|page|112|false
low-word-count|content|warning|page|117|false
llms-txt-missing|llms-txt|notice|page|137|false
robots-txt-missing|indexability|warning|page|203|false
robots-txt-invalid|indexability|warning|page|16|false
mixed-content|mixed-content|warning|page|30|false
viewport-missing|document|warning|page|20|false
doctype-missing|document|warning|page|116|false
charset-missing|document|warning|page|115|false
html-too-large|page-weight|warning|page|21|false
too-many-links|page-weight|warning|page|108|false
uncompressed-page|page-weight|warning|page|129|false
page-fetch|null|notice|page|null|false
`.trim().split('\n').map((line) => line.split('|'));

const WEIGHT_ZERO = ['low-text-to-html', 'low-word-count', 'page-fetch'];
const SITE_LEVEL = ['sitemap-missing', 'sitemap-invalid', 'llms-txt-missing', 'robots-txt-missing', 'robots-txt-invalid'];
const NOT_COVERED = ['unminified-assets', 'structured-data-required-fields', 'crawl-depth', 'too-many-url-parameters', 'page-speed',
  'blocked-resources', 'amp-issues', 'frames-used', 'hreflang-language-mismatch'];

async function loadModules() {
  const dir = new URL('checks/', ROOT);
  const modules = [];
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.js'))) {
    const mod = await import(pathToFileURL(new URL(file, dir).pathname).href);
    if (mod.meta && typeof mod.check === 'function') modules.push(mod);
  }
  return modules;
}

describe('taxonomy.json', () => {
  it('is a top-level array of unique, well-formed entries', () => {
    assert.ok(Array.isArray(taxonomy));
    assert.equal(byId.size, taxonomy.length);
    for (const entry of taxonomy) {
      assert.ok(['seo', 'accessibility', 'security', 'performance'].includes(entry.category), entry.id);
      assert.ok(SEVERITIES.includes(entry.severity), entry.id);
      assert.ok(['page', 'link'].includes(entry.unit), entry.id);
      assert.ok([1, 2].includes(entry.priority), entry.id);
      assert.equal(typeof entry.statusDerived, 'boolean', entry.id);
      assert.ok(entry.semrushId === null || Number.isInteger(entry.semrushId), entry.id);
      assert.ok(entry.semrushLabel === null || typeof entry.semrushLabel === 'string', entry.id);
      assert.ok(entry.check === null || typeof entry.check === 'string', entry.id);
      assert.ok(Array.isArray(entry.facts), entry.id);
      for (const field of entry.facts) assert.ok(FACT_FIELDS.has(field), `${entry.id}: ${field}`);
      assert.equal(typeof entry.label, 'string');
    }
  });

  it('has every priority 1 ID with the tabled fields', () => {
    for (const [id, check, severity, unit, semrush, statusDerived] of P1) {
      const entry = byId.get(id);
      assert.ok(entry, id);
      assert.equal(entry.check, check === 'null' ? null : check, id);
      assert.equal(entry.severity, severity, id);
      assert.equal(entry.unit, unit, id);
      assert.equal(entry.semrushId, semrush === 'null' ? null : Number(semrush), id);
      assert.equal(entry.statusDerived, statusDerived === 'true', id);
      assert.equal(entry.priority, 1, id);
    }
    assert.equal(taxonomy.filter((entry) => entry.priority === 1).length, P1.length);
  });

  it('overrides scoreWeight only where the table says so and marks site-level entries', () => {
    for (const entry of taxonomy.filter((e) => e.priority === 1)) {
      if (WEIGHT_ZERO.includes(entry.id)) assert.equal(entry.scoreWeight, 0, entry.id);
      else assert.equal(entry.scoreWeight, undefined, entry.id);
      assert.equal(entry.siteLevel === true, SITE_LEVEL.includes(entry.id), entry.id);
    }
    assert.deepEqual(byId.get('page-fetch').facts, ['fetchState']);
  });

  it('lists the not-covered v1 types with check null', () => {
    for (const id of NOT_COVERED) {
      assert.ok(byId.has(id), id);
      assert.equal(byId.get(id).check, null, id);
    }
    assert.equal(byId.get('page-speed').semrushId, 111);
    assert.equal(byId.get('unminified-assets').scoreWeight, 0);
  });

  it('sets semrushLabel exactly when semrushId is set', () => {
    for (const entry of taxonomy) assert.equal(entry.semrushLabel === null, entry.semrushId === null, entry.id);
  });

  it('never maps two entries to one SEMrush ID', () => {
    const ids = taxonomy.map((entry) => entry.semrushId).filter((id) => id !== null);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('every check names a module whose taxonomyIds include the ID, and every module ID exists', async () => {
    const modules = await loadModules();
    const byName = new Map(modules.map((mod) => [mod.meta.name, mod]));
    for (const entry of taxonomy.filter((e) => e.check !== null)) {
      const mod = byName.get(entry.check);
      assert.ok(mod, `${entry.id}: no module ${entry.check}`);
      assert.ok(mod.meta.taxonomyIds.includes(entry.id), `${entry.check} does not list ${entry.id}`);
    }
    for (const mod of modules) {
      const { meta } = mod;
      assert.equal(typeof meta.name, 'string');
      assert.ok([1, 2].includes(meta.tier));
      assert.equal(typeof meta.crossPage, 'boolean');
      assert.equal(typeof meta.audit, 'boolean');
      for (const id of meta.taxonomyIds) {
        assert.ok(byId.has(id), `${meta.name}: ${id} missing from taxonomy`);
        assert.equal(byId.get(id).check, meta.name, id);
      }
    }
    assert.equal(byName.get('code-review').meta.audit, false);
  });

  it('has priority 2 IDs for the security-headers, psi and code-review modules', () => {
    for (const id of ['hsts-missing', 'csp-missing', 'psi-lcp', 'psi-cls', 'psi-inp', 'code-review']) {
      assert.equal(byId.get(id)?.priority, 2, id);
      assert.equal(byId.get(id).severity, 'notice', id);
    }
  });
});
