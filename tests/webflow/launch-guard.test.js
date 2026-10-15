// Unit tests for the generic Webflow launch guard, using inline HTML fixtures and stubbed fetches only.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  auditPage,
  checkAllowLocal,
  checkBareSocial,
  checkEmailDomain,
  checkJsonLdHost,
  checkLabels,
  checkLazyAboveFold,
  checkLocaleLinks,
  checkMetaLengths,
  checkPlaceholders,
  checkRunTogetherList,
  checkUngatedAnalytics,
  checkUntranslatedTitle,
  checkWhatsAppLink,
  configPathFor,
  loadConfig,
  normalizeConfig,
  parseArgs,
  run,
} from '../../tools/webflow/launch-guard.js';

const HOME = 'https://www.acme.test/';
const DE = 'https://www.acme.test/de/about';

const CONFIG = {
  domain: 'acme.test',
  locales: [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
  ],
  placeholders: ['5550100'],
  allowLocalAttr: 'data-allow-local',
};

const TITLE_EN = 'Acme Bakery | Fresh sourdough bread and pastries daily';
const TITLE_DE = 'Acme Bakery | Frisches Sauerteigbrot und Gebäck täglich';
const DESC_EN =
  'Acme Bakery bakes sourdough bread, croissants and seasonal pastries every morning in the old town. Order ahead or drop in today.';
const DESC_DE =
  'Acme Bakery backt jeden Morgen Sauerteigbrot, Croissants und saisonales Gebäck in der Altstadt. Jetzt vorbestellen oder vorbeikommen.';

const LOADER =
  '<script src="https://cdn.jsdelivr.net/gh/acme/scripts@acme-v1.0.0/init.js" defer></script>';
const JSON_LD =
  '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Bakery","url":"https://www.acme.test/"}</script>';
const GA_GATED =
  '<script type="fs-consent" fs-consent-categories="analytics">window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag(\'js\',new Date());gtag(\'config\',\'G-TEST1234\');</script>';

function page({ title = TITLE_EN, description = DESC_EN, head = '', body = '' } = {}) {
  return `<!DOCTYPE html><html><head><title>${title}</title><meta name="description" content="${description}"><meta property="og:image" content="https://cdn.acme.test/share.jpg">${head}</head><body>${body}</body></html>`;
}

function cleanBody(prefix = '') {
  return [
    `<nav class="nav_component"><a href="${prefix}/"><img src="/logo.svg" alt="Acme" width="120" height="40"></a></nav>`,
    '<section class="section_hero"><h1>Fresh bread</h1><img src="/hero.jpg" alt="" width="1600" height="900"></section>',
    `<section class="section_contact"><a href="mailto:hello@acme.test">hello@acme.test</a><a href="https://www.instagram.com/acmebakery/">Instagram</a>`,
    '<form><label for="email">Email</label><input id="email" type="email"><label><input type="checkbox"> Opt in</label></form>',
    `<a href="${prefix}/about">About</a></section>`,
    LOADER,
  ].join('');
}

function cleanSite() {
  return {
    '/': page({
      head: `${JSON_LD}${GA_GATED}<link rel="alternate" hreflang="de" href="https://www.acme.test/de">`,
      body: cleanBody(''),
    }),
    '/de': page({
      title: TITLE_DE,
      description: DESC_DE,
      head: `${JSON_LD}${GA_GATED}<link rel="alternate" hreflang="en" href="https://www.acme.test/">`,
      body: cleanBody('/de'),
    }),
  };
}

function site(pages) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const entry = pages[new URL(url).pathname];
    if (entry === undefined) return { html: 'not found', statusCode: 404 };
    if (entry instanceof Error) throw entry;
    return { html: entry, statusCode: 200 };
  };
  return { fetch, calls };
}

const checksOf = (findings) => findings.map((f) => f.check);

describe('checkPlaceholders', () => {
  const cases = [
    ['TODO-', '<p>Call us on TODO-phone</p>'],
    ['[..]', '<p>Opening hours [..]</p>'],
    ['[...]', '<p>Opening hours [...]</p>'],
    ['Example text', '<p>Example text for the hero</p>'],
    ['example.com in an href', '<a href="https://www.example.com/menu">Menu</a>'],
    ['0000000 in an href', '<a href="tel:+31600000000">Call</a>'],
    ['0000000 in text', '<p>Phone 0600000000</p>'],
    ['TODO- in an href', '<a href="https://www.instagram.com/TODO-handle">ig</a>'],
    ['a configured placeholder', '<p>Call 555-0100 or 5550100</p>'],
  ];
  for (const [label, body] of cases) {
    test(`flags ${label}`, () => {
      const findings = checkPlaceholders(page({ body }), HOME, CONFIG.placeholders);
      assert.ok(findings.length >= 1, label);
      assert.ok(findings.every((f) => f.check === 'placeholder'));
      assert.ok(findings.every((f) => f.severity === 'error'));
      assert.equal(findings[0].url, HOME);
    });
  }

  test('ignores placeholders inside scripts, styles and comments', () => {
    const body =
      '<script>var x = "TODO-later 0000000";</script><style>.a{content:"[...]"}</style><!-- Example text -->';
    assert.deepEqual(checkPlaceholders(page({ body }), HOME, []), []);
  });

  test('passes real copy and links', () => {
    assert.deepEqual(checkPlaceholders(page({ body: cleanBody() }), HOME, ['5550100']), []);
  });

  test('reports a repeated placeholder once', () => {
    const body = '<p>TODO-hours</p><p>TODO-hours</p>';
    assert.equal(checkPlaceholders(page({ body }), HOME, []).length, 1);
  });
});

describe('checkEmailDomain', () => {
  test('flags a mailto on another domain', () => {
    const findings = checkEmailDomain(
      page({ body: '<a href="mailto:acmebakery@gmail.com?subject=Hi">Mail</a>' }),
      HOME,
      'acme.test',
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'email-domain');
    assert.equal(findings[0].severity, 'error');
    assert.match(findings[0].detail, /acmebakery@gmail\.com/);
  });

  test('flags an address in visible text', () => {
    const findings = checkEmailDomain(
      page({ body: '<p>Write to info@otherbakery.test</p>' }),
      HOME,
      'acme.test',
    );
    assert.equal(findings.length, 1);
  });

  test('allows the configured domain, case-insensitively, and ignores a www. prefix in config', () => {
    const body = '<a href="mailto:Hello@ACME.test">Hello@ACME.test</a><p>orders@acme.test</p>';
    assert.deepEqual(checkEmailDomain(page({ body }), HOME, 'www.acme.test'), []);
  });

  test('accepts a list of domains', () => {
    const body = '<a href="mailto:jobs@acme-group.test">jobs</a>';
    assert.deepEqual(checkEmailDomain(page({ body }), HOME, ['acme.test', 'acme-group.test']), []);
  });

  test('reports each address once', () => {
    const body = '<a href="mailto:x@gmail.com">x@gmail.com</a>';
    assert.equal(checkEmailDomain(page({ body }), HOME, 'acme.test').length, 1);
  });

  test('does nothing without a configured domain', () => {
    const body = '<a href="mailto:x@gmail.com">x</a>';
    assert.deepEqual(checkEmailDomain(page({ body }), HOME, undefined), []);
  });
});

describe('checkLabels', () => {
  test('flags an empty for attribute', () => {
    for (const label of ['<label for="">Name</label>', '<label for>Name</label>', '<label for="  ">Name</label>']) {
      const findings = checkLabels(page({ body: `<form>${label}<input id="name"></form>` }), HOME);
      assert.equal(findings.length, 1, label);
      assert.equal(findings[0].check, 'label-for');
      assert.equal(findings[0].severity, 'error');
    }
  });

  test('flags a for that matches no id', () => {
    const findings = checkLabels(
      page({ body: '<form><label for="field-2">Name</label><input id="field-1"></form>' }),
      HOME,
    );
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /field-2/);
  });

  test('passes a resolving for and a wrapping label without for', () => {
    const body =
      '<form><label for="email">Email</label><input id="email"><label><input type="checkbox"> Yes</label></form>';
    assert.deepEqual(checkLabels(page({ body }), HOME), []);
  });
});

describe('checkAllowLocal', () => {
  test('flags the loader tag carrying data-allow-local', () => {
    const findings = checkAllowLocal(
      page({ body: '<script src="https://cdn.jsdelivr.net/gh/a/b@v1/init.js" defer data-allow-local></script>' }),
      HOME,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'allow-local');
    assert.equal(findings[0].severity, 'error');
    assert.match(findings[0].detail, /init\.js/);
  });

  test('uses the configured attribute name', () => {
    const body = '<script src="/init.js" data-dev-switch></script>';
    assert.equal(checkAllowLocal(page({ body }), HOME, 'data-dev-switch').length, 1);
    assert.deepEqual(checkAllowLocal(page({ body }), HOME, 'data-allow-local'), []);
  });

  test('passes a loader without the attribute', () => {
    assert.deepEqual(checkAllowLocal(page({ body: LOADER }), HOME), []);
  });
});

describe('checkJsonLdHost', () => {
  const stagingLd =
    '<script type="application/ld+json">{"@type":"Organization","logo":"https://acme.webflow.io/logo.png"}</script>';

  test('flags webflow.io URLs inside JSON-LD on the custom domain', () => {
    const findings = checkJsonLdHost(page({ head: stagingLd }), HOME);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'jsonld-staging-url');
    assert.equal(findings[0].severity, 'error');
    assert.match(findings[0].detail, /acme\.webflow\.io/);
  });

  test('skips the check on the webflow.io staging host', () => {
    assert.deepEqual(checkJsonLdHost(page({ head: stagingLd }), 'https://acme.webflow.io/'), []);
  });

  test('passes JSON-LD on the custom domain', () => {
    assert.deepEqual(checkJsonLdHost(page({ head: JSON_LD }), HOME), []);
  });
});

describe('checkUngatedAnalytics', () => {
  test("flags gtag('config' in a plain head script", () => {
    for (const script of [
      "<script>gtag('config', 'G-TEST1234');</script>",
      '<script type="text/javascript">gtag("config","G-TEST1234")</script>',
    ]) {
      const findings = checkUngatedAnalytics(page({ head: script }), HOME);
      assert.equal(findings.length, 1, script);
      assert.equal(findings[0].check, 'ungated-analytics');
      assert.equal(findings[0].severity, 'error');
    }
  });

  test('allows gtag config inside an fs-consent script', () => {
    assert.deepEqual(checkUngatedAnalytics(page({ head: GA_GATED }), HOME), []);
  });

  test('allows the Consent Mode default call', () => {
    const head = "<script>gtag('consent','default',{analytics_storage:'denied'});</script>";
    assert.deepEqual(checkUngatedAnalytics(page({ head }), HOME), []);
  });
});

describe('checkMetaLengths', () => {
  test('warns on a short title and a long description', () => {
    const findings = checkMetaLengths(
      page({ title: 'Acme', description: 'x'.repeat(160) }),
      HOME,
    );
    assert.deepEqual(checksOf(findings).sort(), ['description-length', 'title-length']);
    assert.ok(findings.every((f) => f.severity === 'warning'));
  });

  test('warns on a long title and a short description', () => {
    const findings = checkMetaLengths(
      page({ title: 'x'.repeat(63), description: 'x'.repeat(119) }),
      HOME,
    );
    assert.equal(findings.length, 2);
  });

  test('warns on a missing description', () => {
    const html = `<html><head><title>${TITLE_EN}</title></head><body></body></html>`;
    assert.deepEqual(checksOf(checkMetaLengths(html, HOME)), ['description-length']);
  });

  test('passes a title of 50 to 62 and a description of 120 to 155 characters', () => {
    assert.deepEqual(checkMetaLengths(page(), HOME), []);
    assert.deepEqual(
      checkMetaLengths(page({ title: 'x'.repeat(50), description: 'x'.repeat(155) }), HOME),
      [],
    );
    assert.deepEqual(
      checkMetaLengths(page({ title: 'x'.repeat(62), description: 'x'.repeat(120) }), HOME),
      [],
    );
  });
});

describe('checkLazyAboveFold', () => {
  test('warns on a lazy image without dimensions in the nav or hero', () => {
    for (const body of [
      '<nav><img src="/logo.svg" loading="lazy"></nav>',
      '<div class="navbar w-nav"><img src="/logo.svg" loading="lazy" width="120"></div>',
      '<section class="section_hero"><img src="/hero.jpg" loading="lazy"></section>',
    ]) {
      const findings = checkLazyAboveFold(page({ body }), HOME);
      assert.equal(findings.length, 1, body);
      assert.equal(findings[0].check, 'lazy-above-fold');
      assert.equal(findings[0].severity, 'warning');
    }
  });

  test('passes lazy images with dimensions, eager images and lazy images further down', () => {
    const body = [
      '<nav><img src="/logo.svg" loading="lazy" width="120" height="40"></nav>',
      '<section class="section_hero"><img src="/hero.jpg"></section>',
      '<section class="section_gallery"><img src="/g.jpg" loading="lazy"></section>',
    ].join('');
    assert.deepEqual(checkLazyAboveFold(page({ body }), HOME), []);
  });
});

describe('checkLocaleLinks', () => {
  const SWITCHER =
    '<div class="nav_locales w-locales-list"><a hreflang="en" href="/about">en</a><a hreflang="de" href="/de/about">de</a></div>';

  test('flags a link from a secondary-locale page to the primary locale', () => {
    const findings = checkLocaleLinks(page({ body: '<a href="/contact">x</a>' }), DE, CONFIG.locales);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'locale-link-leak');
    assert.equal(findings[0].severity, 'error');
    assert.match(findings[0].detail, /English page \/contact/);
  });

  test('ignores the language switcher and same-locale, hash, mailto and external links', () => {
    const body = `${SWITCHER}<a href="/de/contact">a</a><a href="#top">b</a><a href="mailto:hello@acme.test">c</a><a href="https://maps.acme-maps.test/x">d</a><a href="/de">e</a>`;
    assert.deepEqual(checkLocaleLinks(page({ body }), DE, CONFIG.locales), []);
  });

  test('treats a path that only starts with the prefix as primary', () => {
    assert.equal(
      checkLocaleLinks(page({ body: '<a href="/delivery">x</a>' }), DE, CONFIG.locales).length,
      1,
    );
  });

  test('does not run on primary-locale pages or with a single locale', () => {
    const html = page({ body: '<a href="/contact">x</a>' });
    assert.deepEqual(checkLocaleLinks(html, HOME, CONFIG.locales), []);
    assert.deepEqual(checkLocaleLinks(html, DE, ['en']), []);
  });

  test('accepts locale codes as plain strings', () => {
    assert.equal(
      checkLocaleLinks(page({ body: '<a href="/contact">x</a>' }), DE, ['en', 'de']).length,
      1,
    );
  });
});

describe('existing checks stay generic', () => {
  test('bare social links are flagged for several networks by default', () => {
    const body =
      '<a href="https://www.facebook.com/">fb</a><a href="https://instagram.com">ig</a><a href="https://www.tiktok.com/@acme">tt</a>';
    const findings = checkBareSocial(page({ body }), HOME);
    assert.equal(findings.length, 2);
    assert.ok(findings.every((f) => f.check === 'bare-social-link'));
  });

  test('bare social hosts can be narrowed', () => {
    const body = '<a href="https://www.facebook.com/">fb</a>';
    assert.deepEqual(checkBareSocial(page({ body }), HOME, ['instagram.com']), []);
  });

  test('run-together list items honour configured classes', () => {
    const word = 'SourdoughRyeSpeltCiabattaFocaccia';
    const body = `<div class="area_item">${word}</div>`;
    assert.deepEqual(checkRunTogetherList(page({ body }), HOME), []);
    assert.equal(checkRunTogetherList(page({ body }), HOME, ['area_item']).length, 1);
  });

  test('untranslated title names the primary locale', () => {
    const findings = checkUntranslatedTitle(page(), page(), DE, 'English');
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /English page/);
  });

  test('WhatsApp links are flagged', () => {
    const findings = checkWhatsAppLink(page({ body: '<a href="https://wa.me/15550100">wa</a>' }), HOME);
    assert.equal(findings[0].check, 'whatsapp-link');
  });
});

describe('auditPage', () => {
  test('a clean page has no findings', () => {
    assert.deepEqual(
      auditPage(page({ head: `${JSON_LD}${GA_GATED}`, body: cleanBody() }), HOME, CONFIG),
      [],
    );
  });

  test('runs every new check from config', () => {
    const body = [
      '<p>TODO-hours</p>',
      '<a href="mailto:acme@gmail.com">mail</a>',
      '<form><label for="">Name</label><input id="name"></form>',
      '<script src="/init.js" data-allow-local></script>',
    ].join('');
    const head =
      "<script type=\"application/ld+json\">{\"url\":\"https://acme.webflow.io/\"}</script><script>gtag('config','G-TEST1234')</script>";
    const checks = checksOf(auditPage(page({ title: 'Acme', head, body }), HOME, CONFIG));
    for (const name of [
      'placeholder',
      'email-domain',
      'label-for',
      'allow-local',
      'jsonld-staging-url',
      'ungated-analytics',
      'title-length',
    ]) {
      assert.ok(checks.includes(name), name);
    }
  });

  test('only flags WhatsApp links when the config blocks them', () => {
    const html = page({ body: '<a href="https://wa.me/15550199">wa</a>' });
    assert.ok(!checksOf(auditPage(html, HOME, CONFIG)).includes('whatsapp-link'));
    assert.ok(
      checksOf(auditPage(html, HOME, { ...CONFIG, blockWhatsApp: true })).includes('whatsapp-link'),
    );
  });
});

describe('run', () => {
  const discover = async () => ['https://www.acme.test/', 'https://www.acme.test/de'];

  test('a clean site exits 0 with no findings', async () => {
    const { fetch } = site(cleanSite());
    const result = await run({ baseUrl: 'https://www.acme.test', config: CONFIG, discover, fetch });
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.findings, []);
    assert.equal(result.exitCode, 0);
  });

  test('warnings alone keep exit code 0', async () => {
    const pages = cleanSite();
    pages['/'] = pages['/'].replace(TITLE_EN, 'Acme').replace(
      'width="1600" height="900"',
      'loading="lazy"',
    );
    const { fetch } = site(pages);
    const result = await run({ baseUrl: 'https://www.acme.test', config: CONFIG, discover, fetch });
    assert.equal(result.exitCode, 0);
    assert.deepEqual(checksOf(result.findings).sort(), ['lazy-above-fold', 'title-length']);
  });

  test('a blocking finding exits 1', async () => {
    const pages = cleanSite();
    pages['/de'] = pages['/de'].replace('</body>', '<a href="/contact">leak</a></body>');
    const { fetch } = site(pages);
    const result = await run({ baseUrl: 'https://www.acme.test', config: CONFIG, discover, fetch });
    assert.equal(result.exitCode, 1);
    assert.deepEqual(checksOf(result.findings), ['locale-link-leak']);
  });

  test('flags an untranslated title against the primary twin', async () => {
    const pages = cleanSite();
    pages['/de'] = pages['/de'].replace(TITLE_DE, TITLE_EN);
    const { fetch } = site(pages);
    const result = await run({ baseUrl: 'https://www.acme.test', config: CONFIG, discover, fetch });
    assert.equal(result.exitCode, 1);
    assert.deepEqual(checksOf(result.findings), ['untranslated-title']);
  });

  test('a fetch failure exits 2 after one retry', async () => {
    const pages = cleanSite();
    pages['/de'] = new Error('ECONNRESET');
    const { fetch, calls } = site(pages);
    const result = await run({ baseUrl: 'https://www.acme.test', config: CONFIG, discover, fetch });
    assert.equal(result.exitCode, 2);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].url, /\/de$/);
    assert.equal(calls.filter((url) => url.endsWith('/de')).length, 2);
  });

  test('a non-2xx status exits 2', async () => {
    const { fetch } = site({});
    const result = await run({ baseUrl: 'https://www.acme.test', config: CONFIG, discover, fetch });
    assert.equal(result.exitCode, 2);
    assert.match(result.errors[0].detail, /404/);
  });

  test('discovery failure exits 2', async () => {
    const { fetch } = site({});
    const result = await run({
      baseUrl: 'https://www.acme.test',
      config: CONFIG,
      discover: async () => {
        throw new Error('sitemap exploded');
      },
      fetch,
    });
    assert.equal(result.exitCode, 2);
    assert.match(result.errors[0].detail, /sitemap exploded/);
  });

  test('crawls pages on the base host', async () => {
    const { fetch, calls } = site(cleanSite());
    await run({ baseUrl: 'https://acme.webflow.io', config: CONFIG, discover, fetch });
    assert.ok(calls.length > 0);
    assert.ok(calls.every((url) => url.startsWith('https://acme.webflow.io/')));
  });

  test('falls back to the root and each locale root when discovery yields only the root', async () => {
    const { fetch, calls } = site(cleanSite());
    await run({
      baseUrl: 'https://www.acme.test/',
      config: CONFIG,
      discover: async (root) => [root],
      fetch,
    });
    const paths = [...new Set(calls.map((url) => new URL(url).pathname))].sort();
    assert.deepEqual(paths, ['/', '/de']);
  });

  test('uses configured fallback paths', async () => {
    const { fetch, calls } = site({});
    await run({
      baseUrl: 'https://www.acme.test/',
      config: { ...CONFIG, fallbackPaths: ['/', '/menu', '/de/menu'] },
      discover: async (root) => [root],
      fetch,
    });
    const paths = [...new Set(calls.map((url) => new URL(url).pathname))].sort();
    assert.deepEqual(paths, ['/', '/de/menu', '/menu']);
  });

  test('limits the crawl to one locale', async () => {
    const { fetch, calls } = site(cleanSite());
    const result = await run({
      baseUrl: 'https://www.acme.test',
      config: CONFIG,
      discover,
      fetch,
      locale: 'en',
    });
    assert.equal(result.exitCode, 0);
    assert.deepEqual(calls, ['https://www.acme.test/']);
  });

  test('an unknown locale exits 2', async () => {
    const { fetch } = site(cleanSite());
    const result = await run({
      baseUrl: 'https://www.acme.test',
      config: CONFIG,
      discover,
      fetch,
      locale: 'fr',
    });
    assert.equal(result.exitCode, 2);
    assert.match(result.errors[0].detail, /fr/);
  });
});

describe('config and CLI arguments', () => {
  test('normalizeConfig fills locale names and paths', () => {
    const config = normalizeConfig({ domain: 'www.acme.test', locales: ['en', { code: 'de', name: 'German' }] });
    assert.deepEqual(config.locales, [
      { code: 'en', name: 'en', path: '/' },
      { code: 'de', name: 'German', path: '/de' },
    ]);
    assert.deepEqual(config.emailDomains, ['acme.test']);
    assert.equal(config.allowLocalAttr, 'data-allow-local');
  });

  test('loadConfig reads a JSON file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'launch-guard-'));
    try {
      const path = join(dir, 'launch.config.json');
      writeFileSync(path, JSON.stringify(CONFIG));
      assert.deepEqual(loadConfig(path), CONFIG);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('configPathFor points at the client project folder', () => {
    assert.match(configPathFor('acme'), /projects[\\/]acme[\\/]launch\.config\.json$/);
  });

  test('parseArgs reads the URL and flags in any order', () => {
    assert.deepEqual(
      parseArgs(['--client', 'acme', 'https://www.acme.test', '--strict', '--locale', 'de']),
      { url: 'https://www.acme.test', client: 'acme', config: null, locale: 'de', strict: true },
    );
    assert.deepEqual(parseArgs(['https://x.test', '--config', 'a.json']), {
      url: 'https://x.test',
      client: null,
      config: 'a.json',
      locale: null,
      strict: false,
    });
  });
});
