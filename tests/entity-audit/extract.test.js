/**
 * extract.test.js — Entity signal extraction from raw HTML
 *
 * These are pure functions: HTML in, entity signals out. No network.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractTitle,
  extractMetaDescription,
  extractHeadings,
  extractH1s,
  extractJsonLd,
  extractFooterText,
  extractInternalAnchors,
  extractOutboundProfiles,
  extractVisibleText,
  countEntityMentions,
  findFactualStatements,
  scorePage,
} from '../../tools/entity-audit/lib/extract.js';

const ENTITY = 'Tamsen Fadal';

describe('extractTitle', () => {
  test('pulls the title text', () => {
    assert.equal(
      extractTitle('<html><head><title>About Tamsen Fadal | Host</title></head></html>'),
      'About Tamsen Fadal | Host',
    );
  });

  test('trims surrounding whitespace', () => {
    assert.equal(extractTitle('<title>  The Tamsen Show Podcast  </title>'), 'The Tamsen Show Podcast');
  });

  test('decodes HTML entities', () => {
    assert.equal(extractTitle('<title>Terms &amp; Conditions</title>'), 'Terms & Conditions');
  });

  test('returns null when absent', () => {
    assert.equal(extractTitle('<html><head></head></html>'), null);
  });
});

describe('extractMetaDescription', () => {
  test('reads the description content', () => {
    const html = '<meta name="description" content="Tamsen Fadal is a journalist."/>';
    assert.equal(extractMetaDescription(html), 'Tamsen Fadal is a journalist.');
  });

  test('is attribute-order independent', () => {
    const html = '<meta content="Reversed order" name="description">';
    assert.equal(extractMetaDescription(html), 'Reversed order');
  });

  test('returns null when absent', () => {
    assert.equal(extractMetaDescription('<meta name="robots" content="index">'), null);
  });
});

describe('extractH1s / extractHeadings', () => {
  test('extracts H1 text with inner tags stripped', () => {
    const html = '<h1 class="h-display">Hi! I\'m <span>Tamsen</span></h1>';
    assert.deepEqual(extractH1s(html), ["Hi! I'm Tamsen"]);
  });

  test('extracts multiple H1s in document order', () => {
    const html = '<h1>First</h1><p>x</p><h1>Second</h1>';
    assert.deepEqual(extractH1s(html), ['First', 'Second']);
  });

  test('returns an empty array when there is no H1', () => {
    assert.deepEqual(extractH1s('<h2>Only an H2</h2>'), []);
  });

  test('extractHeadings captures level and text', () => {
    const html = '<h1>Top</h1><h2>Sub</h2><h3>Deep</h3>';
    assert.deepEqual(extractHeadings(html), [
      { level: 1, text: 'Top' },
      { level: 2, text: 'Sub' },
      { level: 3, text: 'Deep' },
    ]);
  });

  test('ignores empty headings', () => {
    assert.deepEqual(extractH1s('<h1>   </h1>'), []);
  });
});

describe('extractJsonLd', () => {
  test('parses a single JSON-LD block', () => {
    const html = `<script type="application/ld+json">{"@type":"Person","name":"Tamsen Fadal"}</script>`;
    assert.deepEqual(extractJsonLd(html), [{ '@type': 'Person', name: 'Tamsen Fadal' }]);
  });

  test('parses multiple blocks', () => {
    const html = `
      <script type="application/ld+json">{"@type":"WebSite"}</script>
      <script type="application/ld+json">{"@type":"Person"}</script>`;
    assert.equal(extractJsonLd(html).length, 2);
  });

  test('skips malformed JSON without throwing', () => {
    const html = `<script type="application/ld+json">{ not json }</script>`;
    assert.deepEqual(extractJsonLd(html), []);
  });

  test('returns an empty array when no JSON-LD is present', () => {
    assert.deepEqual(extractJsonLd('<p>nothing</p>'), []);
  });
});

describe('extractFooterText', () => {
  test('reads visible text inside the footer element', () => {
    const html = '<body><main>Main copy</main><footer><p>Tamsen Fadal Media LLC</p></footer></body>';
    assert.match(extractFooterText(html), /Tamsen Fadal Media LLC/);
  });

  test('does not leak main content into the footer', () => {
    const html = '<body><main>Main copy</main><footer><p>Footer copy</p></footer></body>';
    assert.doesNotMatch(extractFooterText(html), /Main copy/);
  });

  test('returns an empty string when no footer exists', () => {
    assert.equal(extractFooterText('<body><main>x</main></body>'), '');
  });
});

describe('extractInternalAnchors', () => {
  test('collects internal hrefs with their anchor text', () => {
    const html = '<a href="/about-tamsen">About Tamsen Fadal</a><a href="/podcast">Podcast</a>';
    const anchors = extractInternalAnchors(html, 'https://www.tamsenfadal.com');
    assert.deepEqual(anchors, [
      { href: '/about-tamsen', text: 'About Tamsen Fadal' },
      { href: '/podcast', text: 'Podcast' },
    ]);
  });

  test('excludes external links', () => {
    const html = '<a href="https://instagram.com/tamsenfadal">IG</a><a href="/book">Book</a>';
    const anchors = extractInternalAnchors(html, 'https://www.tamsenfadal.com');
    assert.deepEqual(anchors, [{ href: '/book', text: 'Book' }]);
  });

  test('treats same-host absolute URLs as internal', () => {
    const html = '<a href="https://www.tamsenfadal.com/press">Press</a>';
    const anchors = extractInternalAnchors(html, 'https://www.tamsenfadal.com');
    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].text, 'Press');
  });

  test('ignores mailto, tel and hash links', () => {
    const html = '<a href="mailto:a@b.com">Mail</a><a href="tel:123">Call</a><a href="#main">Skip</a>';
    assert.deepEqual(extractInternalAnchors(html, 'https://www.tamsenfadal.com'), []);
  });
});

describe('extractOutboundProfiles', () => {
  test('finds known profile platforms', () => {
    const html = `
      <a href="https://www.instagram.com/tamsenfadal/">IG</a>
      <a href="https://www.youtube.com/@tamsenfadal">YT</a>
      <a href="https://en.wikipedia.org/wiki/Tamsen_Fadal">Wiki</a>`;
    const found = extractOutboundProfiles(html);
    assert.deepEqual(found.map((f) => f.platform).sort(), ['instagram', 'wikipedia', 'youtube']);
  });

  test('deduplicates repeated platform links', () => {
    const html = `
      <a href="https://www.instagram.com/tamsenfadal/">IG</a>
      <a href="https://instagram.com/tamsenfadal">IG again</a>`;
    assert.equal(extractOutboundProfiles(html).length, 1);
  });

  test('returns an empty array when there are no profiles', () => {
    assert.deepEqual(extractOutboundProfiles('<a href="/internal">x</a>'), []);
  });
});

describe('extractVisibleText', () => {
  test('strips script and style content', () => {
    const html = '<body><script>var a="Tamsen Fadal";</script><style>.a{}</style><p>Real copy</p></body>';
    const text = extractVisibleText(html);
    assert.match(text, /Real copy/);
    assert.doesNotMatch(text, /var a/);
  });

  test('collapses whitespace', () => {
    assert.equal(extractVisibleText('<p>a</p>\n\n   <p>b</p>'), 'a b');
  });
});

describe('countEntityMentions', () => {
  test('counts full-name occurrences case-insensitively', () => {
    assert.equal(countEntityMentions('Tamsen Fadal met tamsen fadal.', ENTITY), 2);
  });

  test('does not count the first name alone', () => {
    assert.equal(countEntityMentions('Hi! I am Tamsen.', ENTITY), 0);
  });

  test('returns 0 for empty text', () => {
    assert.equal(countEntityMentions('', ENTITY), 0);
  });
});

describe('findFactualStatements', () => {
  test('detects the "X is a ..." entity pattern', () => {
    const text = 'Tamsen Fadal is a 13x Emmy-winning journalist and author.';
    const hits = findFactualStatements(text, ENTITY);
    assert.equal(hits.length, 1);
    assert.match(hits[0], /Emmy-winning journalist/);
  });

  test('detects copular variants (was, has been)', () => {
    const text = 'Tamsen Fadal has been a broadcaster for 30 years.';
    assert.equal(findFactualStatements(text, ENTITY).length, 1);
  });

  test('ignores conversational first-person copy', () => {
    const text = "Hi! I'm Tamsen and I am so glad you are here.";
    assert.deepEqual(findFactualStatements(text, ENTITY), []);
  });

  test('returns an empty array when the entity is absent', () => {
    assert.deepEqual(findFactualStatements('A page about menopause.', ENTITY), []);
  });
});

describe('scorePage', () => {
  const strongHtml = `
    <html><head>
      <title>About Tamsen Fadal | Bestselling Author</title>
      <meta name="description" content="Tamsen Fadal is a 13x Emmy-winning journalist and author."/>
      <script type="application/ld+json">{"@type":"Person","name":"Tamsen Fadal"}</script>
    </head><body>
      <h1>Tamsen Fadal</h1>
      <p>Tamsen Fadal is a journalist, author and menopause advocate.</p>
      <a href="/book-how-to-menopause">Tamsen Fadal's book</a>
      <a href="https://www.instagram.com/tamsenfadal/">Instagram</a>
      <footer><p>Tamsen Fadal Media LLC</p></footer>
    </body></html>`;

  const weakHtml = `
    <html><head>
      <title>The Tamsen Show Podcast</title>
      <meta name="description" content="Real talk meets real solutions."/>
    </head><body>
      <h1>Hi! I'm Tamsen</h1>
      <p>Each week we dig into midlife.</p>
      <footer><p>&copy; 2026</p></footer>
    </body></html>`;

  test('flags name present in title, h1, description and footer', () => {
    const s = scorePage(strongHtml, { entity: ENTITY, origin: 'https://www.tamsenfadal.com' });
    assert.equal(s.titleHasEntity, true);
    assert.equal(s.h1HasEntity, true);
    assert.equal(s.descriptionHasEntity, true);
    assert.equal(s.footerHasEntity, true);
  });

  test('flags a weak page as missing entity signals', () => {
    const s = scorePage(weakHtml, { entity: ENTITY, origin: 'https://www.tamsenfadal.com' });
    assert.equal(s.h1HasEntity, false);
    assert.equal(s.descriptionHasEntity, false);
    assert.equal(s.footerHasEntity, false);
    assert.equal(s.factualStatements.length, 0);
  });

  test('counts factual statements and body mentions', () => {
    const s = scorePage(strongHtml, { entity: ENTITY, origin: 'https://www.tamsenfadal.com' });
    assert.ok(s.factualStatements.length >= 1);
    assert.ok(s.entityMentions >= 3);
  });

  test('records JSON-LD types present', () => {
    const s = scorePage(strongHtml, { entity: ENTITY, origin: 'https://www.tamsenfadal.com' });
    assert.deepEqual(s.jsonLdTypes, ['Person']);
    const weak = scorePage(weakHtml, { entity: ENTITY, origin: 'https://www.tamsenfadal.com' });
    assert.deepEqual(weak.jsonLdTypes, []);
  });

  test('records branded internal anchors and outbound profiles', () => {
    const s = scorePage(strongHtml, { entity: ENTITY, origin: 'https://www.tamsenfadal.com' });
    assert.equal(s.brandedInternalAnchors.length, 1);
    assert.deepEqual(s.outboundProfiles.map((p) => p.platform), ['instagram']);
  });

  test('produces a numeric signal score that ranks strong above weak', () => {
    const strong = scorePage(strongHtml, { entity: ENTITY, origin: 'https://www.tamsenfadal.com' });
    const weak = scorePage(weakHtml, { entity: ENTITY, origin: 'https://www.tamsenfadal.com' });
    assert.ok(strong.signalScore > weak.signalScore, 'strong page should outscore weak page');
    assert.ok(weak.signalScore >= 0);
  });
});
