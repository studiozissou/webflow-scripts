// Checks the Rolfing Pages template JSON-LD parses once Webflow bindings are filled, and that each locale block is self-consistent.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'projects',
  'rolfing-amsterdam',
  'schema',
  'rolfing-pages-template.html',
);
const HOST = 'https://www.rolfingamsterdam.nl';
const JANCO_ID = `${HOST}/en/about-janco#janco-volk`;
const SLUG = 'knee-hip-ankle-pain';
const SAMPLES = {
  slug: SLUG,
  name: 'Knee, hip and ankle pain',
  'seo-title': 'Knee, Hip and Ankle Pain | Rolfing Amsterdam',
  'seo-description': 'Rolfing for knee, hip and ankle pain in Amsterdam: how a session works and what to expect.',
  updated: '2026-10-22',
  photo: 'https://cdn.prod.website-files.com/sample/photo.jpg',
};
const BINDING = /\{\{wf \{&quot;path&quot;:&quot;([a-z-]+)&quot;,&quot;type&quot;:&quot;[A-Za-z]+&quot;\\\} \}\}/g;

const html = readFileSync(FILE, 'utf8');
const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);

function fill(raw) {
  return raw.replace(BINDING, (_, path) => {
    assert.ok(path in SAMPLES, `unexpected binding path: ${path}`);
    return SAMPLES[path];
  });
}

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

test('file holds exactly two JSON-LD blocks, EN then NL, each preceded by a locale comment', () => {
  assert.equal(blocks.length, 2);
  const preceding = [...html.matchAll(/<!--([^>]*)-->\s*<script type="application\/ld\+json">/g)].map((m) => m[1]);
  assert.equal(preceding.length, 2);
  assert.match(preceding[0], /\bEN\b/);
  assert.match(preceding[1], /\bNL\b/);
});

test('every binding is a known field and none is left unfilled', () => {
  for (const raw of blocks) assert.doesNotMatch(fill(raw), /\{\{wf/);
});

const LOCALES = [
  { code: 'en', index: 0, discover: 'Discover Rolfing' },
  { code: 'nl', index: 1, discover: 'Ontdek Rolfing' },
];

for (const { code, index, discover } of LOCALES) {
  describe(`${code.toUpperCase()} block`, () => {
    const data = () => JSON.parse(fill(blocks[index]));
    const graph = () => data()['@graph'];
    const byType = (type) => graph().find((node) => node['@type'] === type);
    const prefix = `${HOST}/${code}`;
    const url = `${prefix}/rolfing/${SLUG}`;

    test('parses with @context and a WebPage plus BreadcrumbList', () => {
      assert.equal(data()['@context'], 'https://schema.org');
      assert.ok(byType('WebPage'));
      assert.ok(byType('BreadcrumbList'));
    });

    test('has no Medical* types and no FAQPage', () => {
      for (const node of graph()) {
        for (const type of [node['@type']].flat()) {
          assert.doesNotMatch(type, /^Medical/);
          assert.notEqual(type, 'FAQPage');
        }
      }
    });

    test('WebPage carries the locale, url, bound fields and entity references', () => {
      const page = byType('WebPage');
      assert.equal(page.inLanguage, code);
      assert.equal(page.url, url);
      assert.equal(page['@id'], `${url}#webpage`);
      assert.equal(page.name, SAMPLES['seo-title']);
      assert.equal(page.description, SAMPLES['seo-description']);
      assert.equal(page.dateModified, SAMPLES.updated);
      assert.deepEqual(page.primaryImageOfPage, { '@type': 'ImageObject', url: SAMPLES.photo });
      assert.deepEqual(page.isPartOf, { '@id': `${HOST}/#website` });
      assert.deepEqual(page.publisher, { '@id': `${HOST}/#business` });
      assert.deepEqual(page.about, { '@id': `${HOST}/#business` });
    });

    test('author is the shared Janco Person id', () => {
      assert.equal(byType('WebPage').author['@id'], JANCO_ID);
    });

    test('defines the author inline so the page names Janco without the About page graph', () => {
      assert.deepEqual(byType('Person'), {
        '@type': 'Person',
        '@id': JANCO_ID,
        name: 'Janco Volk',
        url: `${prefix}/about-janco`,
        worksFor: { '@id': `${HOST}/#business` },
      });
    });

    test('every site URL stays on the locale prefix', () => {
      const urls = strings(data()).filter((s) => s.startsWith(HOST));
      assert.ok(urls.length > 0);
      for (const value of urls) {
        const shared = value === JANCO_ID || value === `${HOST}/#website` || value === `${HOST}/#business`;
        assert.ok(shared || value.startsWith(prefix), `${value} is outside ${prefix}`);
      }
    });

    test('breadcrumb has positions 1..3 in order and ends on the page url', () => {
      const crumbs = byType('BreadcrumbList');
      const items = crumbs.itemListElement;
      assert.deepEqual(items.map((i) => i.position), [1, 2, 3]);
      assert.ok(items.every((i) => i['@type'] === 'ListItem'));
      assert.deepEqual(items.map((i) => i.name), ['Home', discover, SAMPLES.name]);
      assert.deepEqual(items.map((i) => i.item), [prefix, `${prefix}/what-is-rolfing`, byType('WebPage').url]);
      assert.equal(crumbs['@id'], `${url}#breadcrumb`);
      assert.equal(byType('WebPage').breadcrumb['@id'], crumbs['@id']);
    });

    test('contains no webflow.io host', () => {
      assert.doesNotMatch(fill(blocks[index]), /webflow\.io/i);
    });
  });
}
