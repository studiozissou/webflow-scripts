// Unit tests for Carsa models-template.js: runs the real file in a vm sandbox with a stub DOM and a minimal jQuery and checks the meta fallback, the __CARSA_MODELS config coercion, the FAQ JSON-LD scrub (moved from faq-scrub.test.js) and the page-marker gate.
import { describe, it } from 'node:test';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeEnv as baseEnv, makeEl, MARKER } from './_env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE = 'models-template.js';
const SOURCE = readFileSync(join(__dirname, '..', MODULE), 'utf8');
const makeEnv = (opts) => baseEnv(SOURCE, opts);

function sourceChecks(name) {
  const lines = SOURCE.trimEnd().split('\n');
  test(`${name} source: one header comment on line 1 and no other comments`, () => {
    assert.match(lines[0], /^\/\/ \S/);
    lines.slice(1).forEach((l, i) => {
      assert.doesNotMatch(l, /^\s*\/\//, `line ${i + 2}`);
      assert.doesNotMatch(l, /\s\/\/\s/, `line ${i + 2}`);
      assert.doesNotMatch(l, /\/\*/, `line ${i + 2}`);
    });
  });
  test(`${name} source: no {{wf tokens`, () => {
    assert.ok(!SOURCE.includes('{{wf'));
  });
  test(`${name} source: console.log only behind DEBUG &&`, () => {
    const all = SOURCE.match(/console\.log/g) || [];
    const gated = SOURCE.match(/DEBUG && console\.log/g) || [];
    assert.equal(all.length, gated.length);
    if (all.length) assert.match(SOURCE, /var DEBUG = false;/);
  });
  test(`${name} source: no DOMContentLoaded or load listeners of its own`, () => {
    assert.doesNotMatch(SOURCE, /DOMContentLoaded/);
    assert.doesNotMatch(SOURCE, /addEventListener\(['"]load['"]/);
    assert.doesNotMatch(SOURCE, /\$\(window\)\.on\(['"]load/);
  });
  test(`${name} source: classic script with the __CARSA guard, then the marker gate`, () => {
    assert.doesNotMatch(SOURCE, /^\s*(import|export)\s/m);
    assert.doesNotMatch(SOURCE, /^(const|let)\s/m);
    assert.equal(lines[1], '(function ($) {');
    assert.equal(lines[2].trim(), 'var H = window.__CARSA;');
    assert.equal(lines[3].trim(), 'if (!H) {');
    assert.equal(lines[4].trim(), `if (window.DD_LOGS) window.DD_LOGS.logger.warn('${name}: window.__CARSA missing');`);
    assert.equal(lines[5].trim(), 'return;');
    assert.equal(lines[6].trim(), '}');
    assert.equal(lines[7].trim(), 'if (!window.__CARSA_PAGE) return;');
    assert.equal(lines[8].trim(), `(window.__CARSA_RAN = window.__CARSA_RAN || []).push('${name}');`);
    assert.equal(lines[lines.length - 1], '})(window.jQuery);');
  });
  test(`${name} source: no local copies of the shared helpers`, () => {
    assert.doesNotMatch(SOURCE, /function\s+(block|onReady|onLoad|onPage|cms|getAttributionParams|addParams)\b/);
  });
}

function markerTests(name, opts = {}) {
  test(`${name}: without the marker nothing runs and __CARSA_RAN stays undefined`, () => {
    const env = makeEnv({ ...opts, marker: null });
    assert.equal(env.window.__CARSA_RAN, undefined);
    assert.equal(env.delegated.length, 0);
    assert.equal(Object.keys(env.docListeners).length, 0);
    assert.equal(env.location.replacedWith, undefined);
    assert.equal(env.document.title, opts.title || '');
  });
  test(`${name}: with the marker it pushes its name once`, () => {
    const env = makeEnv(opts);
    assert.deepEqual([...env.window.__CARSA_RAN], [name]);
  });
  test(`${name}: without window.__CARSA it warns once and stands down before the marker gate`, () => {
    const warns = [];
    const DD_LOGS = { logger: { warn: (m) => warns.push(m) } };
    const env = makeEnv({ ...opts, helpers: false, config: { ...(opts.config || {}), DD_LOGS } });
    assert.deepEqual(warns, [`${name}: window.__CARSA missing`]);
    assert.equal(env.window.__CARSA_RAN, undefined);
    assert.equal(env.delegated.length, 0);
    assert.equal(Object.keys(env.docListeners).length, 0);
    assert.equal(env.timers.length, 0);
    assert.doesNotThrow(() => makeEnv({ ...opts, helpers: false }));
  });
}

sourceChecks(MODULE);

const DESC_TAIL = ' craftsmanship. Expect responsive engines, refined comfort, advanced infotainment and safety tech packaged in a distinctive design that turns routine drives into rewarding journeys.';
const TITLE_TAIL = ' cars combining style, performance and modern tech. Discover our stock online, choose your favourite and book a test drive.';

function rerunWithHead(models, opts = {}) {
  const description = makeEl();
  const meta = makeEl();
  if (opts.metaContent != null) meta.setAttribute('content', opts.metaContent);
  const metas = opts.metaContent == null ? [] : [meta];
  const headEl = makeEl();
  const nodes = { '#description': [description], head: [headEl] };
  Object.defineProperty(nodes, 'meta[name="description"]', {
    enumerable: true,
    get: () => {
      const appended = headEl.children.map((el) => {
        const m = makeEl();
        m.setAttribute('content', el.content);
        return m;
      });
      return [...metas, ...appended];
    },
  });
  const config = models === undefined ? {} : { __CARSA_MODELS: models };
  const env = makeEnv({ pathname: '/used-cars/models/audi-a3', config, nodes, title: opts.title || '' });
  return { env, description, headEl, meta };
}

markerTests(MODULE, { config: { __CARSA_MODELS: { make: 'Audi', name: 'A3' } } });

test('models meta: appends a default description, sets #description and fills an empty title', () => {
  const { env, description, headEl } = rerunWithHead({ make: 'Audi', name: 'A3' });
  const desc = 'The Audi A3 blends everyday practicality with signature Audi' + DESC_TAIL;
  assert.equal(headEl.children.length, 1);
  assert.equal(headEl.children[0].tagName, 'META');
  assert.equal(headEl.children[0].name, 'description');
  assert.equal(headEl.children[0].content, desc);
  assert.equal(description.textContent, desc);
  assert.equal(env.document.title, 'Shop used Audi A3' + TITLE_TAIL);
});

test('models meta: keeps an existing description and title', () => {
  const { env, description, headEl } = rerunWithHead({ make: 'Audi', name: 'A3' }, { metaContent: 'Existing', title: 'Audi A3 | Carsa' });
  assert.deepEqual(headEl.children, []);
  assert.equal(description.textContent, 'Existing');
  assert.equal(env.document.title, 'Audi A3 | Carsa');
});

test('models meta: quotes and angle brackets in the name stay literal text in one tag', () => {
  const { description, headEl } = rerunWithHead({ make: 'Ford', name: '"Puma" <ST>' });
  const desc = 'The Ford "Puma" <ST> blends everyday practicality with signature Ford' + DESC_TAIL;
  assert.equal(headEl.children.length, 1);
  assert.equal(headEl.children[0].content, desc);
  assert.equal(description.textContent, desc);
});

test('models meta: an existing empty description tag is filled, not duplicated', () => {
  const { description, headEl, meta } = rerunWithHead({ make: 'Audi', name: 'A3' }, { metaContent: '' });
  const desc = 'The Audi A3 blends everyday practicality with signature Audi' + DESC_TAIL;
  assert.equal(headEl.children.length, 0);
  assert.equal(meta.attrs.content, desc);
  assert.equal(description.textContent, desc);
});

test('models meta: values with surrounding whitespace are trimmed', () => {
  const { env, description } = rerunWithHead({ make: ' Land Rover \n', name: '\tDefender  ' });
  assert.equal(description.textContent, 'The Land Rover Defender blends everyday practicality with signature Land Rover' + DESC_TAIL);
  assert.equal(env.document.title, 'Shop used Land Rover Defender' + TITLE_TAIL);
});

test('models meta: empty values build the text an empty CMS field built', () => {
  const { env, description } = rerunWithHead({ make: '', name: '' });
  assert.equal(description.textContent, 'The   blends everyday practicality with signature ' + DESC_TAIL);
  assert.equal(env.document.title, 'Shop used  ' + TITLE_TAIL);
});

test('models meta: a missing key behaves like an empty CMS field', () => {
  const { description } = rerunWithHead({ make: 'Audi' });
  assert.equal(description.textContent, 'The Audi  blends everyday practicality with signature Audi' + DESC_TAIL);
});

test('models meta: a missing window.__CARSA_MODELS skips the meta block without throwing; the FAQ scrub still runs', () => {
  const scripts = makeScripts([{ '@type': 'FAQPage', mainEntity: [{ name: '', acceptedAnswer: { text: '' } }] }]);
  const description = makeEl();
  const env = makeEnv({ config: {}, nodes: { '#description': [description], 'script[type="application/ld+json"]': scripts } });
  assert.equal(description.textContent, '');
  assert.equal(env.document.title, '');
  assert.equal(scripts[0]._removed, true);
  assert.deepEqual([...env.window.__CARSA_RAN], [MODULE]);
  assert.equal(env.timers.length, 0);
});

function makeScripts(blocks) {
  return blocks.map((json) => {
    const s = { textContent: JSON.stringify(json), _removed: false };
    s.parentNode = { removeChild: (node) => { node._removed = true; node.parentNode = null; } };
    return s;
  });
}

function scrub(blocks, marker = MARKER) {
  const scripts = makeScripts(blocks);
  makeEnv({ marker, config: { __CARSA_MODELS: { make: 'BMW', name: 'X1' } }, nodes: { 'script[type="application/ld+json"]': scripts }, title: 'x' });
  return scripts;
}

describe('FAQ scrub', () => {
  it('keeps all questions when all have name + answer', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.carsa.co.uk/used-cars/make/bmw#faq',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
        { '@type': 'Question', name: 'Q2?', acceptedAnswer: { '@type': 'Answer', text: 'A2' } },
      ],
    }]);
    assert.equal(JSON.parse(scripts[0].textContent).mainEntity.length, 2);
    assert.equal(scripts[0]._removed, false);
  });

  it('removes questions with empty name', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: 'A2' } },
        { '@type': 'Question', name: '  ', acceptedAnswer: { '@type': 'Answer', text: 'A3' } },
      ],
    }]);
    const result = JSON.parse(scripts[0].textContent);
    assert.equal(result.mainEntity.length, 1);
    assert.equal(result.mainEntity[0].name, 'Q1?');
  });

  it('removes questions with empty answer', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: '' } },
        { '@type': 'Question', name: 'Q2?', acceptedAnswer: { '@type': 'Answer', text: 'A2' } },
      ],
    }]);
    const result = JSON.parse(scripts[0].textContent);
    assert.equal(result.mainEntity.length, 1);
    assert.equal(result.mainEntity[0].name, 'Q2?');
  });

  it('removes questions with missing acceptedAnswer', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
        { '@type': 'Question', name: 'Q2?' },
      ],
    }]);
    assert.equal(JSON.parse(scripts[0].textContent).mainEntity.length, 1);
  });

  it('removes entire FAQPage block when all questions empty', () => {
    const scripts = scrub([{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.carsa.co.uk/used-cars/make/test#faq',
      mainEntity: [
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } },
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } },
      ],
    }]);
    assert.equal(scripts[0]._removed, true);
  });

  it('removes mainEntity #faq ref from CollectionPage when FAQPage removed', () => {
    const graphBlock = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': 'https://www.carsa.co.uk/used-cars/make/test#webpage',
          mainEntity: { '@id': 'https://www.carsa.co.uk/used-cars/make/test#faq' },
        },
        { '@type': 'BreadcrumbList' },
      ],
    };
    const faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.carsa.co.uk/used-cars/make/test#faq',
      mainEntity: [{ '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } }],
    };
    const scripts = scrub([faqBlock, graphBlock]);
    assert.equal(scripts[0]._removed, true);
    assert.equal(JSON.parse(scripts[1].textContent)['@graph'][0].mainEntity, undefined);
  });

  it('gives the same @graph result when the @graph block comes before the FAQPage block', () => {
    const graphBlock = () => ({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'CollectionPage', mainEntity: { '@id': 'https://www.carsa.co.uk/used-cars/models/test#faq' } },
        { '@type': 'BreadcrumbList' },
      ],
    });
    const emptyFaq = { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } }] };
    const liveFaq = { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } }] };
    [emptyFaq, liveFaq].forEach((faq) => {
      const after = scrub([faq, graphBlock()]);
      const before = scrub([graphBlock(), faq]);
      assert.equal(before[1]._removed, after[0]._removed);
      assert.equal(before[0].textContent, after[1].textContent);
    });
    const removed = scrub([graphBlock(), emptyFaq]);
    assert.equal(JSON.parse(removed[0].textContent)['@graph'][0].mainEntity, undefined);
  });

  it('preserves mainEntity ref when FAQPage has valid questions', () => {
    const graphBlock = {
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'CollectionPage', mainEntity: { '@id': 'https://www.carsa.co.uk/used-cars/make/bmw#faq' } }],
    };
    const faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } }],
    };
    const scripts = scrub([faqBlock, graphBlock]);
    const graph = JSON.parse(scripts[1].textContent);
    assert.notEqual(graph['@graph'][0].mainEntity, undefined);
    assert.ok(graph['@graph'][0].mainEntity['@id'].includes('#faq'));
  });

  it('runs synchronously, before DOMContentLoaded', () => {
    const scripts = makeScripts([{ '@type': 'FAQPage', mainEntity: [] }]);
    makeEnv({ readyState: 'loading', config: { __CARSA_MODELS: { make: 'BMW', name: 'X1' } }, nodes: { 'script[type="application/ld+json"]': scripts } });
    assert.equal(scripts[0]._removed, true);
  });

  it('does nothing without the marker', () => {
    const scripts = scrub([{ '@type': 'FAQPage', mainEntity: [] }], null);
    assert.equal(scripts[0]._removed, false);
  });
});
