// Unit tests for the head-scoped, entity-aware HTML extractors in lib/html.js.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  decodeEntities,
  parseAttrs,
  findTags,
  extractHead,
  extractH1s,
  countHeadings,
  extractLinks,
  extractImagesAndResources,
  extractScripts,
  extractDoctype,
  parseHtml,
  visibleText,
} from '../../tools/site-review/lib/html.js';

const base = 'https://www.example.com/page';
const opts = { baseUrl: base, canonicalHost: 'www.example.com' };

describe('html extractors', () => {
  it('html: head-scoped title ignores an SVG title in the body', () => {
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><svg><title>Icon</title></svg><p>x</p></body></html>';
    const head = extractHead(html, opts);
    assert.equal(head.title, null);
    assert.equal(head.titleCount, 0);
    const withTitle = html.replace('<head>', '<head><title> Real  title </title>');
    assert.equal(extractHead(withTitle, opts).title, 'Real title');
    assert.equal(extractHead('<html><head><title></title></head></html>', opts).title, '');
  });

  it('html: meta content with an apostrophe is read in full', () => {
    const html = `<head><meta name="description" content="Janco's practice in Amsterdam"><meta name='robots' content='NoIndex, "follow"'></head>`;
    const head = extractHead(html, opts);
    assert.equal(head.metaDescription, "Janco's practice in Amsterdam");
    assert.equal(head.robotsMeta, 'noindex, "follow"');
    assert.equal(parseAttrs('<meta content="a > b" name=x>').content, 'a > b');
    assert.equal(findTags('<meta content="a > b" name="x"><p>', 'meta')[0].attrs.name, 'x');
  });

  it('html: named and numeric entities decode to the rendered text', () => {
    assert.equal(decodeEntities('Rolfing &#8211; &amp; &apos;x&apos; &eacute;&ndash;&#x2014;&hellip;&nbsp;&copy;&euro;'), "Rolfing – & 'x' é–—… ©€");
    assert.equal(decodeEntities('&#150; &#0; &unknown; &AMP;'), '– � &unknown; &');
    assert.equal(decodeEntities('&Omega;&omega;&sigmaf;&Yuml;'), 'ΩωςŸ');
    const head = extractHead('<head><title>Rolfing &#8211; structural</title></head>', opts);
    assert.equal(head.title, 'Rolfing – structural');
  });

  it('html: an empty H1 counts as an H1; H1s inside script, template and comments do not', () => {
    const html =
      '<body><h1></h1><script>var t = "<h1>Not</h1>";</script><template><h1>T</h1></template><!-- <h1>C</h1> --><noscript><h1>N</h1></noscript><style>h1{}</style><h1 class="x">Real <span>one</span></h1><h2>a</h2><h2>b</h2><h3>c</h3></body>';
    assert.deepEqual(extractH1s(html), ['', 'Real one']);
    assert.deepEqual(countHeadings(html), { h2: 2, h3: 1, h4: 0, h5: 0, h6: 0 });
  });

  it('reads canonicals, hreflang, viewport and charset from the head only', () => {
    const html =
      '<html><head><meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1"><meta name="viewport" content="width=device-width"><link rel="canonical" href="/page/"><link rel="alternate" hreflang="NL" href="https://example.com/nl"></head><body><link rel="canonical" href="/body"></body></html>';
    const head = extractHead(html, opts);
    assert.deepEqual(head.canonicals, [{ href: '/page/', url: 'https://www.example.com/page/', key: 'https://www.example.com/page' }]);
    assert.deepEqual(head.hreflang, [{ lang: 'nl', href: 'https://example.com/nl', url: 'https://example.com/nl', key: 'https://www.example.com/nl' }]);
    assert.equal(head.viewport, 'width=device-width');
    assert.equal(head.charset, 'iso-8859-1');
    assert.equal(extractHead('<head></head>', { ...opts, contentType: 'text/html; charset=UTF-8' }).charset, 'utf-8');
  });

  it('ends an unclosed head at the first body element', () => {
    const html = '<html><head><title>T</title><div><svg><title>Icon</title></svg></div>';
    assert.equal(extractHead(html, opts).titleCount, 1);
  });

  it('builds accessible names in the documented order', () => {
    const html = [
      '<span id="lbl">Labelled <b>text</b></span>',
      '<a href="/a" aria-label=" Aria  label ">ignored</a>',
      '<a href="/b" aria-labelledby="lbl">ignored</a>',
      '<a href="/c">Visible <em>text</em></a>',
      '<a href="/d"><img src="x.png" alt="Image alt"></a>',
      '<a href="/e" title="Title attr"><span></span></a>',
      '<a href="/f"><span class="icon"></span></a>',
      '<a href="https://www.example.com/g">https://www.example.com/g</a>',
      '<a href="mailto:a@b.c">mail</a><a href="#top">top</a><a href="tel:1">t</a><a href="javascript:void(0)">j</a>',
      '<a href="HTTP://Example.com/H" rel="NoFollow">h</a>',
      '<a href="https://other.com/x">x</a>',
    ].join('');
    const links = extractLinks(html, opts);
    assert.deepEqual(
      links.map((link) => link.accessibleName),
      ['Aria label', 'Labelled text', 'Visible text', 'Image alt', 'Title attr', '', 'https://www.example.com/g', 'h', 'x'],
    );
    assert.equal(links[0].href, 'https://www.example.com/a');
    assert.equal(links[7].rel, 'nofollow');
    assert.equal(links[7].hrefKey, 'http://www.example.com/h');
    assert.equal(links[7].internal, true);
    assert.equal(links[8].internal, false);
    assert.ok(links[2].snippet.startsWith('<a href="/c">Visible text'));
    assert.ok(links.every((link) => link.snippet.length <= 200));
  });

  it('records images with null or empty alt and every resource kind', () => {
    const html =
      '<head><script src="http://cdn.example.com/a.js"></script><link rel="stylesheet" href="/s.css"><link rel="icon" href="/f.ico"></head><body><img src="/a.png" srcset="/a2.png 2x, /a3.png 3x"><img src="/b.png" alt=""><iframe src="https://yt.com/e"></iframe><video src="/v.mp4"></video><noscript><img src="https://px.example/p"></noscript></body>';
    const { images, resources } = extractImagesAndResources(html, opts);
    assert.deepEqual(images.map((image) => image.alt), [null, '']);
    assert.equal(images[0].src, 'https://www.example.com/a.png');
    assert.deepEqual(
      resources.map((resource) => resource.kind).sort(),
      ['iframe', 'img', 'img', 'link', 'media', 'script', 'srcset', 'srcset', 'stylesheet'],
    );
  });

  it('records JSON-LD types, hashes and parse errors without swallowing them', () => {
    const html =
      '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":["WebSite","Thing"]}]}</script><script type="application/ld+json">{"a":1,}</script><script src="/x.js"></script><script>var a=1;</script>';
    const { jsonLd, scripts } = extractScripts(html);
    assert.deepEqual(jsonLd.types, ['Organization', 'WebSite', 'Thing']);
    assert.equal(jsonLd.hashes.length, 2);
    assert.equal(jsonLd.parseErrors.length, 1);
    assert.match(jsonLd.parseErrors[0].message, /JSON/);
    assert.equal(jsonLd.parseErrors[0].snippet, '{"a":1,}');
    assert.deepEqual(scripts, { count: 4, inlineBytes: Buffer.byteLength(html.match(/>(\{"@context[^<]*)</)[1]) + 8 + 8, externalCount: 1 });
  });

  it('reads doctype, html attributes and visible text', () => {
    const html = '<!-- c --><!DOCTYPE HTML><html lang="nl" data-wf-page="abc" data-wf-site="s"><head><title>T</title></head><body><p>One two</p><script>x</script><p>three &amp; four</p></body></html>';
    const parsed = parseHtml(html, opts);
    assert.equal(extractDoctype(html), 'html');
    assert.equal(extractDoctype('<html></html>'), null);
    assert.equal(parsed.wfPage, 'abc');
    assert.equal(parsed.wfSite, 's');
    assert.equal(parsed.lang, 'nl');
    assert.equal(visibleText(html), 'One two three & four');
    assert.equal(parsed.wordCount, 4);
    assert.match(parsed.textHash, /^[0-9a-f]{16}$/);
    assert.ok(parsed.textToHtmlRatio > 0 && parsed.textToHtmlRatio < 1);
  });
});
