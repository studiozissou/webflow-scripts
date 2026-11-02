// Unit tests for the generic Webflow launch guard, using inline HTML fixtures and stubbed fetches only.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditPage,
  auditSite,
  checkAllowLocal,
  checkBareSocial,
  checkBlockingScript,
  checkCanonical,
  checkDuplicateIds,
  checkEmailDomain,
  checkEmptyLink,
  checkFontFormat,
  checkH1Count,
  checkHtmlLang,
  checkIcons,
  checkJsonLdHost,
  checkLabels,
  checkLazyAboveFold,
  checkLinkName,
  checkLocaleLinks,
  checkMetaLengths,
  checkMinify,
  checkPlaceholders,
  checkRunTogetherList,
  checkUngatedAnalytics,
  checkUntranslatedTitle,
  checkWhatsAppLink,
  configPathFor,
  loadConfig,
  main,
  normalizeConfig,
  parseArgs,
  run,
} from '../../tools/webflow/launch-guard.js';
import { fetchPage } from '../../tools/site-review/lib/fetch-page.js';

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
  'Acme Bakery bakes sourdough bread, croissants and seasonal pastries every morning in the old town. Order ahead online or drop in at the shop today, friends.';
const DESC_DE =
  'Acme Bakery backt jeden Morgen Sauerteigbrot, Croissants und saisonales Gebäck in der Altstadt. Jetzt online vorbestellen oder im Laden vorbeikommen, Freunde.';

const LOADER =
  '<script src="https://cdn.jsdelivr.net/gh/acme/scripts@acme-v1.0.0/init.js" defer></script>';
const JSON_LD =
  '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Bakery","url":"https://www.acme.test/"}</script>';
const GA_GATED =
  '<script type="fs-consent" fs-consent-categories="analytics">window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag(\'js\',new Date());gtag(\'config\',\'G-TEST1234\');</script>';

const SHARED_HEAD =
  '<link href="https://cdn.prod.website-files.com/abc/css/acme.webflow.shared.abc.opt.min.css" rel="stylesheet" type="text/css"><link href="https://cdn.prod.website-files.com/abc/favicon.png" rel="shortcut icon" type="image/x-icon"><link href="https://cdn.prod.website-files.com/abc/webclip.png" rel="apple-touch-icon">';

function page({
  title = TITLE_EN,
  description = DESC_EN,
  head = '',
  body = '',
  lang = 'en',
  canonical = HOME,
} = {}) {
  return `<!DOCTYPE html><html lang="${lang}"><head><title>${title}</title><meta name="description" content="${description}"><meta property="og:image" content="https://cdn.acme.test/share.jpg"><link rel="canonical" href="${canonical}">${SHARED_HEAD}${head}</head><body>${body}</body></html>`;
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
      lang: 'de',
      canonical: 'https://www.acme.test/de',
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

  test('allows gtag config inside a Finsweet Cookie Consent v1 fs-cc script', () => {
    const head =
      '<script type="fs-cc" fs-cc-categories="analytics">window.dataLayer=window.dataLayer||[];gtag(\'js\',new Date());gtag(\'config\',\'G-TEST1234\');</script>';
    assert.deepEqual(checkUngatedAnalytics(page({ head }), HOME), []);
  });

  test('matches the gated script type case-insensitively and ignoring whitespace', () => {
    const head = '<script type=" FS-CC " fs-cc-categories="analytics">gtag(\'config\',\'G-TEST1234\');</script>';
    assert.deepEqual(checkUngatedAnalytics(page({ head }), HOME), []);
  });

  test('flags an fs-cc script with no category or only the essential category', () => {
    for (const head of [
      '<script type="fs-cc">gtag(\'config\',\'G-TEST1234\');</script>',
      '<script type="fs-cc" fs-cc-categories="">gtag(\'config\',\'G-TEST1234\');</script>',
      '<script type="fs-cc" fs-cc-categories="essential">gtag(\'config\',\'G-TEST1234\');</script>',
    ]) {
      assert.equal(checkUngatedAnalytics(page({ head }), HOME).length, 1, head);
    }
  });

  test('names both gated types in the finding message', () => {
    const [found] = checkUngatedAnalytics(page({ head: "<script>gtag('config','G-X');</script>" }), HOME);
    assert.match(found.detail, /consent-gated script \(fs-consent or fs-cc\)/);
  });

  test('allows the Consent Mode default call', () => {
    const head = "<script>gtag('consent','default',{analytics_storage:'denied'});</script>";
    assert.deepEqual(checkUngatedAnalytics(page({ head }), HOME), []);
  });
});

describe('checkMetaLengths', () => {
  test('warns on a short title and a long description', () => {
    const findings = checkMetaLengths(
      page({ title: 'Acme', description: 'x'.repeat(161) }),
      HOME,
    );
    assert.deepEqual(checksOf(findings).sort(), ['description-length', 'title-length']);
    assert.ok(findings.every((f) => f.severity === 'warning'));
  });

  test('warns on a long title and a short description', () => {
    const findings = checkMetaLengths(
      page({ title: 'x'.repeat(61), description: 'x'.repeat(149) }),
      HOME,
    );
    assert.equal(findings.length, 2);
  });

  test('warns on a missing description', () => {
    const html = `<html><head><title>${TITLE_EN}</title></head><body></body></html>`;
    assert.deepEqual(checksOf(checkMetaLengths(html, HOME)), ['description-length']);
  });

  test('passes a title of 50 to 60 and a description of 150 to 160 characters', () => {
    assert.deepEqual(checkMetaLengths(page(), HOME), []);
    assert.deepEqual(
      checkMetaLengths(page({ title: 'x'.repeat(50), description: 'x'.repeat(160) }), HOME),
      [],
    );
    assert.deepEqual(
      checkMetaLengths(page({ title: 'x'.repeat(60), description: 'x'.repeat(150) }), HOME),
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

function doc({ htmlAttrs = '', head = '', body = '' } = {}) {
  return `<!DOCTYPE html><html${htmlAttrs}><head>${head}</head><body>${body}</body></html>`;
}

describe('checkHtmlLang', () => {
  const LOCALES = CONFIG.locales;

  test('flags a missing or empty lang as an error', () => {
    for (const htmlAttrs of ['', ' lang=""', ' lang="  "']) {
      const findings = checkHtmlLang(doc({ htmlAttrs }), HOME, LOCALES);
      assert.deepEqual(checksOf(findings), ['html-lang'], htmlAttrs);
      assert.equal(findings[0].severity, 'error');
    }
  });

  test("flags a lang that isn't the page's locale", () => {
    const findings = checkHtmlLang(doc({ htmlAttrs: ' lang="en"' }), DE, LOCALES);
    assert.deepEqual(checksOf(findings), ['html-lang']);
    assert.match(findings[0].detail, /en/);
    assert.match(findings[0].detail, /de/);
  });

  test('compares the primary subtag case-insensitively', () => {
    assert.deepEqual(checkHtmlLang(doc({ htmlAttrs: ' lang="EN-gb"' }), HOME, LOCALES), []);
    assert.deepEqual(checkHtmlLang(doc({ htmlAttrs: ' lang="de-DE"' }), DE, LOCALES), []);
    assert.deepEqual(checkHtmlLang(doc({ htmlAttrs: ' lang="nl-NL"' }), HOME, ['nl']), []);
  });

  test('with no locales configured only a missing lang is flagged', () => {
    assert.deepEqual(checkHtmlLang(doc({ htmlAttrs: ' lang="fr"' }), HOME, []), []);
    assert.deepEqual(checksOf(checkHtmlLang(doc(), HOME, [])), ['html-lang']);
  });

  test('ignores an html tag inside a comment', () => {
    const html = `<!-- <html lang="en"> -->${doc()}`;
    assert.deepEqual(checksOf(checkHtmlLang(html, HOME, LOCALES)), ['html-lang']);
  });
});

describe('checkIcons', () => {
  const FAVICON = '<link rel="shortcut icon" href="/f.png">';
  const WEBCLIP = '<link rel="apple-touch-icon" href="/w.png">';

  test('passes a favicon and a webclip', () => {
    assert.deepEqual(checkIcons(doc({ head: `${FAVICON}${WEBCLIP}` }), HOME), []);
    assert.deepEqual(checkIcons(doc({ head: `<link rel="ICON" href="/f.png">${WEBCLIP}` }), HOME), []);
  });

  test('reports favicon and webclip separately as warnings', () => {
    const findings = checkIcons(doc(), HOME);
    assert.deepEqual(checksOf(findings), ['icons', 'icons']);
    assert.ok(findings.every((f) => f.severity === 'warning'));
    assert.match(findings[0].detail, /favicon/);
    assert.match(findings[1].detail, /webclip/);
  });

  test('a webclip alone leaves only the favicon flagged, and the reverse', () => {
    assert.match(checkIcons(doc({ head: WEBCLIP }), HOME)[0].detail, /favicon/);
    assert.equal(checkIcons(doc({ head: WEBCLIP }), HOME).length, 1);
    assert.match(checkIcons(doc({ head: FAVICON }), HOME)[0].detail, /webclip/);
    assert.equal(checkIcons(doc({ head: FAVICON }), HOME).length, 1);
  });

  test('ignores icon links in comments', () => {
    assert.equal(checkIcons(doc({ head: `<!-- ${FAVICON}${WEBCLIP} -->` }), HOME).length, 2);
  });
});

describe('checkEmptyLink', () => {
  test('flags empty and # hrefs as warnings, trimming whitespace', () => {
    for (const a of ['<a href="">x</a>', '<a href="#">x</a>', '<a href="  # ">x</a>', '<a href>x</a>']) {
      const findings = checkEmptyLink(doc({ body: a }), HOME);
      assert.deepEqual(checksOf(findings), ['empty-link'], a);
      assert.equal(findings[0].severity, 'warning');
    }
  });

  test('allows links wired to script by attribute, as seen on real sites', () => {
    for (const a of [
      '<a fs-cc="allow" href="#" class="w-button">x</a>',
      '<a fs-consent-element="open-preferences" href="#">x</a>',
      '<a data-formitable="open" href="#" class="button">x</a>',
      '<a data-w-id="abc" href="#">x</a>',
      '<a type="button" aria-label="Menu" href="#" class="w-button">x</a>',
      '<a role="button" href="#">x</a>',
    ]) {
      assert.deepEqual(checkEmptyLink(doc({ body: a }), HOME), [], a);
    }
  });

  test('passes real hrefs, fragments and anchors without href', () => {
    const body = '<a href="/about">a</a><a href="#menu">b</a><a name="x">c</a>';
    assert.deepEqual(checkEmptyLink(doc({ body }), HOME), []);
  });

  test('allows lightbox, pagination and dropdown toggle classes only', () => {
    const allowed = [
      '<a href="#" class="gallery w-lightbox">x</a>',
      '<a href="#" class="w-pagination-next">x</a>',
      '<a href="#" class="w-pagination-previous foo">x</a>',
      '<a href="#" class="w-dropdown-toggle">x</a>',
    ].join('');
    assert.deepEqual(checkEmptyLink(doc({ body: allowed }), HOME), []);
    const other = '<a href="#" class="w-button">x</a>';
    assert.deepEqual(checksOf(checkEmptyLink(doc({ body: other }), HOME)), ['empty-link']);
  });

  test('ignores anchors in raw text', () => {
    const body = '<script>var a = \'<a href="#">x</a>\';</script><!-- <a href="">y</a> -->';
    assert.deepEqual(checkEmptyLink(doc({ body }), HOME), []);
  });
});

describe('checkDuplicateIds', () => {
  test('warns once per repeated id', () => {
    const body = '<div id="a"></div><p id="a"></p><span id="a"></span><i id="b"></i><b id="b"></b>';
    const findings = checkDuplicateIds(doc({ body }), HOME);
    assert.deepEqual(checksOf(findings), ['duplicate-ids', 'duplicate-ids']);
    assert.ok(findings.every((f) => f.severity === 'warning'));
    assert.match(findings[0].detail, /"a"/);
    assert.match(findings[1].detail, /"b"/);
  });

  test('passes unique ids', () => {
    assert.deepEqual(checkDuplicateIds(doc({ body: '<div id="a"></div><div id="b"></div>' }), HOME), []);
  });

  test('ignores ids in scripts, styles and comments', () => {
    const body =
      '<div id="a"></div><script>var t = \'<div id="a"></div>\';</script><style>/* <div id="a"> */</style><!-- <div id="a"></div> -->';
    assert.deepEqual(checkDuplicateIds(doc({ body }), HOME), []);
  });
});

describe('checkH1Count', () => {
  test('passes exactly one h1', () => {
    assert.deepEqual(checkH1Count(doc({ body: '<h1 class="x">Hi</h1><h2>Sub</h2>' }), HOME), []);
  });

  test('warns on none and on several', () => {
    for (const [body, count] of [['<h2>Sub</h2>', 0], ['<h1>A</h1><H1>B</H1>', 2]]) {
      const findings = checkH1Count(doc({ body }), HOME);
      assert.deepEqual(checksOf(findings), ['h1-count']);
      assert.equal(findings[0].severity, 'warning');
      assert.match(findings[0].detail, new RegExp(String(count)));
    }
  });

  test('ignores an h1 in a comment', () => {
    assert.deepEqual(checkH1Count(doc({ body: '<!-- <h1>Old</h1> --><h1>New</h1>' }), HOME), []);
  });
});

describe('checkCanonical', () => {
  const canonical = (href) => doc({ head: `<link rel="canonical" href="${href}">` });

  test('passes a canonical on the same host', () => {
    assert.deepEqual(checkCanonical(canonical('https://www.acme.test/about'), HOME, 'acme.test'), []);
    assert.deepEqual(checkCanonical(canonical('/about'), HOME, 'acme.test'), []);
  });

  test('warns when there is no canonical', () => {
    const findings = checkCanonical(doc(), HOME, 'acme.test');
    assert.deepEqual(checksOf(findings), ['canonical']);
    assert.equal(findings[0].severity, 'warning');
  });

  test('flags another host, including www against apex', () => {
    for (const href of ['https://other.test/', 'https://acme.test/']) {
      const findings = checkCanonical(canonical(href), HOME, 'acme.test');
      assert.deepEqual(checksOf(findings), ['canonical'], href);
      assert.equal(findings[0].severity, 'warning');
    }
  });

  test('on webflow.io accepts a canonical on the config domain, with or without www', () => {
    const staging = 'https://acme.webflow.io/';
    assert.deepEqual(checkCanonical(canonical('https://www.acme.test/'), staging, 'acme.test'), []);
    assert.deepEqual(checkCanonical(canonical('https://acme.test/'), staging, 'acme.test'), []);
  });

  test('on webflow.io still flags another host and a missing canonical', () => {
    const staging = 'https://acme.webflow.io/';
    assert.equal(checkCanonical(canonical('https://other.test/'), staging, 'acme.test').length, 1);
    assert.equal(checkCanonical(canonical('https://www.acme.test/'), staging, null).length, 1);
    assert.equal(checkCanonical(doc(), staging, 'acme.test').length, 1);
  });

  test('the domain exception does not apply on the custom domain', () => {
    assert.equal(checkCanonical(canonical('https://acme.test/'), 'https://shop.acme.test/', 'acme.test').length, 1);
  });
});

describe('checkBlockingScript', () => {
  test('warns on an external head script with no async, defer or module', () => {
    const findings = checkBlockingScript(doc({ head: '<script src="/a.js"></script>' }), HOME);
    assert.deepEqual(checksOf(findings), ['blocking-script']);
    assert.equal(findings[0].severity, 'warning');
    assert.match(findings[0].detail, /\/a\.js/);
  });

  test('passes async, defer, module and inline head scripts', () => {
    const head = [
      '<script src="/a.js" async></script>',
      '<script src="/b.js" defer></script>',
      '<script src="/c.js" type="module"></script>',
      '<script>var x = 1;</script>',
    ].join('');
    assert.deepEqual(checkBlockingScript(doc({ head }), HOME), []);
  });

  test('passes scripts whose type stops the browser running them', () => {
    const head = [
      '<script type="fs-consent" src="/gtag.js"></script>',
      '<script type="fs-cc" src="/gtag2.js"></script>',
    ].join('');
    assert.deepEqual(checkBlockingScript(doc({ head }), HOME), []);
  });

  test('still warns on explicit JavaScript types', () => {
    const head = [
      '<script type="text/javascript" src="/a.js"></script>',
      '<script type="application/javascript" src="/b.js"></script>',
    ].join('');
    assert.equal(checkBlockingScript(doc({ head }), HOME).length, 2);
  });

  test('ignores body scripts and commented head scripts', () => {
    const html = doc({
      head: '<!-- <script src="/old.js"></script> -->',
      body: '<script src="/a.js"></script>',
    });
    assert.deepEqual(checkBlockingScript(html, HOME), []);
  });

  test('a </head> string inside an inline script does not end the head early', () => {
    const head = '<script>var s = "</head>";</script><script src="/a.js"></script>';
    assert.equal(checkBlockingScript(doc({ head }), HOME).length, 1);
  });
});

describe('checkLinkName', () => {
  test('warns on a link with no accessible name', () => {
    for (const body of [
      '<a href="/a"></a>',
      '<a href="/a"><img src="/i.png" alt=""></a>',
      '<a href="/a"><img src="/i.png"></a>',
      '<a href="/a"><svg><path d="M0 0"></path></svg></a>',
      '<a href="/a" aria-label="  "> </a>',
    ]) {
      const findings = checkLinkName(doc({ body }), HOME);
      assert.deepEqual(checksOf(findings), ['link-name'], body);
      assert.equal(findings[0].severity, 'warning');
      assert.match(findings[0].detail, /\/a/);
    }
  });

  test('accepts text, the naming attributes, a descendant aria-label and an image alt', () => {
    for (const body of [
      '<a href="/a">About</a>',
      '<a href="/a"><span><b>About</b></span></a>',
      '<a href="/a" aria-label="About"></a>',
      '<a href="/a" aria-labelledby="t"></a>',
      '<a href="/a" title="About"></a>',
      '<a href="/a"><span aria-label="About"></span></a>',
      '<a href="/a"><img src="/i.png" alt="About"></a>',
    ]) {
      assert.deepEqual(checkLinkName(doc({ body }), HOME), [], body);
    }
  });

  test('ignores anchors without href', () => {
    assert.deepEqual(checkLinkName(doc({ body: '<a name="top"></a>' }), HOME), []);
  });

  test('reports an unnamed href once per page', () => {
    const body = '<a href="/a"></a><a href="/a"></a><a href="/b"></a>';
    assert.equal(checkLinkName(doc({ body }), HOME).length, 2);
  });

  test('an unnamed link is flagged even when the same href is named elsewhere', () => {
    const body = '<a href="/a">About</a><a href="/a"></a>';
    assert.equal(checkLinkName(doc({ body }), HOME).length, 1);
  });
});

describe('checkMinify', () => {
  const sheet = (href) => doc({ head: `<link href="${href}" rel="stylesheet" type="text/css">` });

  test('warns on an unminified Webflow stylesheet', () => {
    for (const href of [
      'https://cdn.prod.website-files.com/abc/css/acme.webflow.css',
      'https://assets.webflow.com/abc/css/acme.css',
      'https://d3e54v103j8qbb.cloudfront.net/css/acme.css',
    ]) {
      const findings = checkMinify(sheet(href), HOME);
      assert.deepEqual(checksOf(findings), ['minify'], href);
      assert.equal(findings[0].severity, 'warning');
    }
  });

  test('passes shared and per-page minified files', () => {
    for (const file of ['acme.webflow.shared.1.min.css', 'acme.webflow.1.opt.min.css']) {
      const html = sheet(`https://cdn.prod.website-files.com/abc/css/${file}`);
      assert.deepEqual(checkMinify(html, HOME), [], file);
    }
  });

  test('ignores stylesheets on other hosts and non-stylesheet links', () => {
    for (const html of [
      sheet('https://fonts.googleapis.com/css2.css'),
      sheet('/local.css'),
      sheet('https://notwebflow.com/a.css'),
      doc({ head: '<link rel="preload" href="https://cdn.prod.website-files.com/a.css">' }),
    ]) {
      assert.deepEqual(checkMinify(html, HOME), []);
    }
  });

  test('ignores a query string when reading the filename', () => {
    const html = sheet('https://cdn.prod.website-files.com/abc/acme.opt.min.css?v=1');
    assert.deepEqual(checkMinify(html, HOME), []);
  });
});

describe('checkFontFormat', () => {
  test('warns on an @font-face with a url source and no woff2', () => {
    const head = '<style>@font-face { font-family: "Acme"; src: url("/a.ttf") format("truetype"); }</style>';
    const findings = checkFontFormat(doc({ head }), HOME);
    assert.deepEqual(checksOf(findings), ['font-format']);
    assert.equal(findings[0].severity, 'warning');
    assert.match(findings[0].detail, /Acme/);
  });

  test('passes woff2 sources, local-only sources and CSS with no @font-face', () => {
    for (const head of [
      '<style>@font-face { font-family: A; src: url(/a.woff2) format("woff2"), url(/a.ttf); }</style>',
      '<style>@font-face { font-family: A; src: local("Arial"); }</style>',
      '<style>.a { background: url(/a.png); }</style>',
    ]) {
      assert.deepEqual(checkFontFormat(doc({ head }), HOME), [], head);
    }
  });

  test('checks each block on its own', () => {
    const head =
      '<style>@font-face { font-family: A; src: url(/a.woff2); } @font-face { font-family: B; src: url(/b.woff); }</style>';
    const findings = checkFontFormat(doc({ head }), HOME);
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /B/);
  });

  test('ignores blocks in HTML comments, CSS comments and text outside style', () => {
    for (const html of [
      doc({ head: '<!-- <style>@font-face { src: url(/a.ttf); }</style> -->' }),
      doc({ head: '<style>/* @font-face { src: url(/a.ttf); } */</style>' }),
      doc({ body: '<p>@font-face { src: url(/a.ttf); }</p>' }),
    ]) {
      assert.deepEqual(checkFontFormat(html, HOME), []);
    }
  });
});

describe('auditPage new checks', () => {
  test('runs every new page check', () => {
    const html = [
      '<html><head>',
      '<script src="/a.js"></script>',
      '<link rel="stylesheet" href="https://cdn.prod.website-files.com/a.css">',
      '<link rel="stylesheet" href="https://cdn.prod.website-files.com/a.min.css">',
      '<style>@font-face { src: url(/a.ttf); }</style>',
      '</head><body><a href="#">x</a><a href="/y"></a><i id="a"></i><i id="a"></i></body></html>',
    ].join('');
    const checks = checksOf(auditPage(html, HOME, CONFIG));
    for (const name of [
      'html-lang',
      'icons',
      'empty-link',
      'duplicate-ids',
      'h1-count',
      'canonical',
      'blocking-script',
      'link-name',
      'minify',
      'font-format',
    ]) {
      assert.ok(checks.includes(name), name);
    }
    assert.ok(!checks.includes('per-page-css'), 'per-page-css moved to Manual');
  });

  test('passes the config domain through to the canonical check', () => {
    const html = page({ body: cleanBody(), head: `${JSON_LD}${GA_GATED}` });
    assert.deepEqual(auditPage(html, 'https://acme.webflow.io/', CONFIG), []);
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

  test('does not run a site audit unless one is passed', async () => {
    const { fetch, calls } = site(cleanSite());
    await run({ baseUrl: 'https://www.acme.test', config: CONFIG, discover, fetch });
    assert.ok(calls.every((url) => ['/', '/de'].includes(new URL(url).pathname)));
  });

  test('merges site audit findings and counts their errors in the exit code', async () => {
    const { fetch } = site(cleanSite());
    const received = [];
    const result = await run({
      baseUrl: 'https://www.acme.test',
      config: { ...CONFIG, apexDefault: true },
      discover,
      fetch,
      siteAudit: async (args) => {
        received.push(args);
        return [{ check: 'robots', url: args.baseUrl, detail: 'blocked', severity: 'error' }];
      },
    });
    assert.equal(result.exitCode, 1);
    assert.deepEqual(checksOf(result.findings), ['robots']);
    assert.equal(received[0].baseUrl, 'https://www.acme.test');
    assert.equal(received[0].config.apexDefault, true);
    assert.equal(received[0].fetch, fetch);
  });

  test('a site audit warning keeps exit code 0', async () => {
    const { fetch } = site(cleanSite());
    const result = await run({
      baseUrl: 'https://www.acme.test',
      config: CONFIG,
      discover,
      fetch,
      siteAudit: async ({ baseUrl }) => [
        { check: 'llms', url: baseUrl, detail: 'missing', severity: 'warning' },
      ],
    });
    assert.equal(result.exitCode, 0);
    assert.deepEqual(checksOf(result.findings), ['llms']);
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

const BASE = 'https://www.acme.test';
const ROBOTS = `${BASE}/robots.txt`;
const SITEMAP_LINE = `Sitemap: ${BASE}/sitemap.xml`;
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot'];
const HEALTHY = {
  'http://www.acme.test/': { to: 'https://www.acme.test/' },
  'https://acme.test/': { to: 'https://www.acme.test/' },
  'https://www.acme.test/': { headers: { 'x-frame-options': 'SAMEORIGIN' } },
  [ROBOTS]: { html: `User-agent: *\nDisallow: /admin\n\n${SITEMAP_LINE}\n` },
  [`${BASE}/sitemap.xml`]: { html: '<urlset></urlset>' },
  [`${BASE}/llms.txt`]: { html: '# Acme' },
};

function stubSite(routes) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const entry = routes[url];
    if (entry instanceof Error) throw entry;
    if (!entry) return { html: 'not found', headers: {}, statusCode: 404, redirectChain: [], finalUrl: url };
    return {
      html: entry.html ?? '',
      headers: entry.headers ?? {},
      statusCode: entry.status ?? 200,
      redirectChain: [],
      finalUrl: entry.to ?? url,
    };
  };
  return { fetch, calls };
}

async function audit(overrides = {}, config = { domain: 'acme.test' }, baseUrl = BASE) {
  const { fetch, calls } = stubSite({ ...HEALTHY, ...overrides });
  const findings = await auditSite({ baseUrl, config, fetch });
  return { findings, calls };
}

const only = (findings, check) => findings.filter((f) => f.check === check);

describe('auditSite', () => {
  test('a healthy site has no findings', async () => {
    const { findings } = await audit();
    assert.deepEqual(findings, []);
  });

  describe('https-redirect', () => {
    test('errors when http does not end on https', async () => {
      const { findings } = await audit({ 'http://www.acme.test/': {} });
      assert.deepEqual(checksOf(findings), ['https-redirect']);
      assert.equal(findings[0].severity, 'error');
    });

    test('errors when the http fetch fails', async () => {
      const { findings } = await audit({ 'http://www.acme.test/': new Error('refused') });
      assert.deepEqual(checksOf(findings), ['https-redirect']);
      assert.equal(findings[0].severity, 'error');
      assert.match(findings[0].detail, /refused/);
    });
  });

  describe('default-domain', () => {
    test('errors when the hosts do not converge', async () => {
      const { findings } = await audit({ 'https://acme.test/': {} });
      assert.deepEqual(checksOf(findings), ['default-domain']);
      assert.equal(findings[0].severity, 'error');
    });

    test('errors when one host fails to fetch', async () => {
      for (const failing of ['https://acme.test/', 'https://www.acme.test/']) {
        const { findings } = await audit({ [failing]: new Error('no DNS') });
        const found = only(findings, 'default-domain');
        assert.equal(found.length, 1, failing);
        assert.equal(found[0].severity, 'error');
      }
    });

    test('warns when converging on apex without apexDefault', async () => {
      const { findings } = await audit({
        'https://acme.test/': { headers: { 'x-frame-options': 'DENY' } },
        'https://www.acme.test/': { to: 'https://acme.test/', headers: { 'x-frame-options': 'DENY' } },
      });
      assert.deepEqual(checksOf(findings), ['default-domain']);
      assert.equal(findings[0].severity, 'warning');
    });

    test('accepts apex with apexDefault', async () => {
      const { findings } = await audit(
        {
          'https://acme.test/': {},
          'https://www.acme.test/': { to: 'https://acme.test/', headers: { 'x-frame-options': 'DENY' } },
        },
        { domain: 'acme.test', apexDefault: true },
      );
      assert.deepEqual(findings, []);
    });

    test('uses the base host minus www when no domain is configured', async () => {
      const { findings, calls } = await audit({}, {});
      assert.deepEqual(findings, []);
      assert.ok(calls.includes('https://acme.test/'));
      assert.ok(calls.includes('https://www.acme.test/'));
    });

    test('prefers config.domain over the base host', async () => {
      const { calls } = await audit({}, { domain: 'www.acme-group.test' });
      assert.ok(calls.includes('https://acme-group.test/'));
      assert.ok(calls.includes('https://www.acme-group.test/'));
      assert.ok(!calls.includes('https://acme.test/'));
    });
  });

  describe('frame-headers', () => {
    test('warns with no x-frame-options or frame-ancestors', async () => {
      for (const headers of [{}, { 'content-security-policy': "default-src 'self'" }]) {
        const { findings } = await audit({ 'https://www.acme.test/': { headers } });
        assert.deepEqual(checksOf(findings), ['frame-headers']);
        assert.equal(findings[0].severity, 'warning');
      }
    });

    test('accepts a frame-ancestors policy', async () => {
      const { findings } = await audit({
        'https://www.acme.test/': { headers: { 'content-security-policy': "frame-ancestors 'self'" } },
      });
      assert.deepEqual(findings, []);
    });
  });

  describe('robots', () => {
    test('errors when robots.txt disallows / for all', async () => {
      const { findings } = await audit({ [ROBOTS]: { html: `User-agent: *\nDisallow: /\n${SITEMAP_LINE}` } });
      const found = only(findings, 'robots');
      assert.equal(found.length, 1);
      assert.equal(found[0].severity, 'error');
    });

    test('passes when Allow: / sits in the same group, or the block is for one other bot', async () => {
      for (const html of [
        `User-agent: *\nDisallow: /\nAllow: /\n${SITEMAP_LINE}`,
        `User-agent: Badbot\nDisallow: /\n\nUser-agent: *\nDisallow:\n${SITEMAP_LINE}`,
      ]) {
        const { findings } = await audit({ [ROBOTS]: { html } });
        assert.deepEqual(findings, [], html);
      }
    });

    test('only an exact Disallow: / counts as blocked', async () => {
      const { findings } = await audit({
        [ROBOTS]: { html: `User-agent: *\nDisallow: /private/\nDisallow: /*.pdf\n${SITEMAP_LINE}` },
      });
      assert.deepEqual(findings, []);
    });

    test('tolerates case, CRLF and trailing comments', async () => {
      const { findings } = await audit({
        [ROBOTS]: { html: `USER-AGENT: *\r\ndisallow: / # everything\r\n${SITEMAP_LINE}\r\n` },
      });
      assert.equal(only(findings, 'robots')[0].severity, 'error');
    });

    test('a failed fetch or a missing file is a warning', async () => {
      for (const entry of [new Error('timeout'), { status: 404 }, { status: 500 }]) {
        const { findings } = await audit({ [ROBOTS]: entry });
        const found = only(findings, 'robots');
        assert.equal(found.length, 1);
        assert.equal(found[0].severity, 'warning');
      }
    });
  });

  describe('robots-ai', () => {
    test('warns once per blocked bot', async () => {
      const { findings } = await audit({
        [ROBOTS]: { html: `User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:\n${SITEMAP_LINE}` },
      });
      assert.deepEqual(checksOf(findings), ['robots-ai']);
      assert.equal(findings[0].severity, 'warning');
      assert.match(findings[0].detail, /GPTBot/);
    });

    test('checks all six bots, case-insensitively, with shared User-agent lines', async () => {
      const agents = AI_BOTS.map((bot) => `User-agent: ${bot.toLowerCase()}`).join('\n');
      const { findings } = await audit({
        [ROBOTS]: { html: `${agents}\nDisallow: /\n\nUser-agent: *\nAllow: /\n${SITEMAP_LINE}` },
      });
      assert.equal(only(findings, 'robots-ai').length, AI_BOTS.length);
      for (const bot of AI_BOTS) {
        assert.ok(findings.some((f) => f.detail.includes(bot)), bot);
      }
    });

    test('falls back to the * group when a bot has none', async () => {
      const { findings } = await audit({ [ROBOTS]: { html: `User-agent: *\nDisallow: /\n${SITEMAP_LINE}` } });
      assert.equal(only(findings, 'robots-ai').length, AI_BOTS.length);
    });

    test("a bot's own group overrides a blocking * group", async () => {
      const allowed = AI_BOTS.map((bot) => `User-agent: ${bot}`).join('\n');
      const { findings } = await audit({
        [ROBOTS]: { html: `${allowed}\nAllow: /\n\nUser-agent: *\nDisallow: /\n${SITEMAP_LINE}` },
      });
      assert.deepEqual(only(findings, 'robots-ai'), []);
    });

    test('Disallow: / with Allow: / in the group is not blocked', async () => {
      const { findings } = await audit({
        [ROBOTS]: { html: `User-agent: ClaudeBot\nDisallow: /\nAllow: /\n\nUser-agent: *\nDisallow:\n${SITEMAP_LINE}` },
      });
      assert.deepEqual(findings, []);
    });

    test('no findings when robots.txt could not be read', async () => {
      const { findings } = await audit({ [ROBOTS]: new Error('timeout') });
      assert.deepEqual(only(findings, 'robots-ai'), []);
    });
  });

  describe('sitemap', () => {
    test('warns when sitemap.xml is not 200 or fails to fetch', async () => {
      for (const entry of [{ status: 404 }, new Error('timeout')]) {
        const { findings } = await audit({ [`${BASE}/sitemap.xml`]: entry });
        assert.deepEqual(checksOf(findings), ['sitemap']);
        assert.equal(findings[0].severity, 'warning');
      }
    });

    test('warns separately when robots.txt does not name it', async () => {
      for (const html of ['User-agent: *\nDisallow: /admin\n', `User-agent: *\nDisallow: /admin\nSitemap: ${BASE}/other.xml\n`]) {
        const { findings } = await audit({ [ROBOTS]: { html } });
        assert.deepEqual(checksOf(findings), ['sitemap']);
        assert.equal(findings[0].severity, 'warning');
        assert.match(findings[0].detail, /robots\.txt/);
      }
    });

    test('both problems give two findings', async () => {
      const { findings } = await audit({
        [`${BASE}/sitemap.xml`]: { status: 404 },
        [ROBOTS]: { html: 'User-agent: *\nDisallow: /admin\n' },
      });
      assert.deepEqual(checksOf(findings), ['sitemap', 'sitemap']);
    });

    test('accepts a Sitemap line in any case', async () => {
      const { findings } = await audit({
        [ROBOTS]: { html: `User-agent: *\nDisallow: /admin\nsitemap:   ${BASE}/sitemap.xml\r\n` },
      });
      assert.deepEqual(findings, []);
    });
  });

  describe('llms', () => {
    test('warns when llms.txt is not 200 or fails to fetch', async () => {
      for (const entry of [{ status: 404 }, new Error('timeout')]) {
        const { findings } = await audit({ [`${BASE}/llms.txt`]: entry });
        assert.deepEqual(checksOf(findings), ['llms']);
        assert.equal(findings[0].severity, 'warning');
      }
    });
  });

  describe('staging-index', () => {
    const STAGING = 'https://acme.webflow.io';
    const STAGING_ROBOTS = `${STAGING}/robots.txt`;
    const config = { domain: 'acme.test', stagingUrl: STAGING };

    test('errors when the staging robots.txt allows crawling', async () => {
      for (const html of ['User-agent: *\nDisallow:\n', 'User-agent: Badbot\nDisallow: /\n']) {
        const { findings } = await audit({ [STAGING_ROBOTS]: { html } }, config);
        assert.deepEqual(checksOf(findings), ['staging-index']);
        assert.equal(findings[0].severity, 'error');
      }
    });

    test('errors when the staging robots.txt is 404, since nothing blocks crawling', async () => {
      const { findings } = await audit({}, config);
      assert.deepEqual(checksOf(findings), ['staging-index']);
      assert.equal(findings[0].severity, 'error');
    });

    test('passes when staging blocks * from /', async () => {
      const { findings } = await audit({ [STAGING_ROBOTS]: { html: 'User-agent: *\nDisallow: /\n' } }, config);
      assert.deepEqual(findings, []);
    });

    test('a failed fetch, 5xx or unusable URL is a warning', async () => {
      for (const entry of [new Error('timeout'), { status: 503 }]) {
        const { findings } = await audit({ [STAGING_ROBOTS]: entry }, config);
        assert.deepEqual(checksOf(findings), ['staging-index']);
        assert.equal(findings[0].severity, 'warning');
      }
      const { findings } = await audit({}, { domain: 'acme.test', stagingUrl: 'acme.webflow.io' });
      assert.deepEqual(checksOf(findings), ['staging-index']);
      assert.equal(findings[0].severity, 'warning');
    });

    test('does nothing when stagingUrl is unset or empty', async () => {
      for (const extra of [{}, { stagingUrl: '' }]) {
        const { findings, calls } = await audit({}, { domain: 'acme.test', ...extra });
        assert.deepEqual(findings, []);
        assert.ok(!calls.some((url) => url.includes('webflow.io')));
      }
    });
  });

  describe('redirects', () => {
    const withRedirects = (...redirects) => ({ domain: 'acme.test', redirects });

    test('passes when each entry ends on its target, ignoring a trailing slash', async () => {
      const { findings } = await audit(
        {
          [`${BASE}/old`]: { to: `${BASE}/new/` },
          [`${BASE}/gone`]: { to: 'https://other.test/here' },
        },
        withRedirects({ from: '/old', to: '/new' }, { from: '/gone', to: 'https://other.test/here/' }),
      );
      assert.deepEqual(findings, []);
    });

    test('errors when an entry ends elsewhere', async () => {
      const { findings } = await audit(
        { [`${BASE}/old`]: { to: `${BASE}/wrong` } },
        withRedirects({ from: '/old', to: '/new' }),
      );
      assert.deepEqual(checksOf(findings), ['redirects']);
      assert.equal(findings[0].severity, 'error');
      assert.match(findings[0].detail, /\/old/);
    });

    test('errors when an entry has no redirect or fails to fetch', async () => {
      for (const entry of [{}, new Error('timeout')]) {
        const { findings } = await audit(
          { [`${BASE}/old`]: entry },
          withRedirects({ from: '/old', to: '/new' }),
        );
        assert.deepEqual(checksOf(findings), ['redirects']);
        assert.equal(findings[0].severity, 'error');
      }
    });

    test('an unusable target is an error, not a throw', async () => {
      const { findings } = await audit({}, withRedirects({ from: '/old', to: 'http://' }));
      assert.deepEqual(checksOf(findings), ['redirects']);
      assert.equal(findings[0].severity, 'error');
    });
  });

  describe('on webflow.io', () => {
    const STAGING = 'https://acme.webflow.io';
    const routes = {
      [`${STAGING}/`]: { headers: { 'x-frame-options': 'DENY' } },
      [`${STAGING}/robots.txt`]: { html: `User-agent: *\nDisallow: /\nSitemap: ${STAGING}/sitemap.xml\n` },
      [`${STAGING}/sitemap.xml`]: { html: '<urlset></urlset>' },
      [`${STAGING}/llms.txt`]: { html: '# Acme' },
    };

    test('skips https-redirect, default-domain, robots and robots-ai', async () => {
      const { fetch, calls } = stubSite(routes);
      const findings = await auditSite({ baseUrl: STAGING, config: { domain: 'acme.test' }, fetch });
      assert.deepEqual(findings, []);
      assert.ok(!calls.includes('http://acme.webflow.io/'));
      assert.ok(!calls.some((url) => url.includes('acme.test')));
    });

    test('still runs frame-headers, sitemap and llms', async () => {
      const { fetch } = stubSite({ [`${STAGING}/robots.txt`]: { html: 'User-agent: *\nDisallow: /\n' } });
      const findings = await auditSite({ baseUrl: STAGING, config: {}, fetch });
      assert.deepEqual(checksOf(findings).sort(), ['frame-headers', 'llms', 'sitemap', 'sitemap']);
    });
  });

  describe('never throws', () => {
    test('every fetch failing gives findings and no exception', async () => {
      const fetch = async () => {
        throw new Error('offline');
      };
      const findings = await auditSite({ baseUrl: BASE, config: { domain: 'acme.test' }, fetch });
      assert.ok(findings.length > 0);
      assert.deepEqual(
        [...new Set(findings.filter((f) => f.severity === 'error').map((f) => f.check))].sort(),
        ['default-domain', 'https-redirect'],
      );
    });

    test('a synchronous throw from fetch is handled', async () => {
      const fetch = () => {
        throw new Error('boom');
      };
      const findings = await auditSite({ baseUrl: BASE, config: {}, fetch });
      assert.ok(findings.length > 0);
    });

    test('an invalid base URL returns a finding', async () => {
      const { fetch, calls } = stubSite({});
      const findings = await auditSite({ baseUrl: 'not a url', config: {}, fetch });
      assert.equal(findings.length, 1);
      assert.equal(findings[0].severity, 'warning');
      assert.deepEqual(calls, []);
    });
  });
});

describe('fetchPage finalUrl and CLI wiring', () => {
  async function withGlobalFetch(handler, callback) {
    const original = globalThis.fetch;
    globalThis.fetch = handler;
    try {
      return await callback();
    } finally {
      globalThis.fetch = original;
    }
  }

  test('reports the last URL after redirects and the request URL without any', async () => {
    const handler = async (url) =>
      String(url).endsWith('/old')
        ? new Response(null, { status: 301, headers: { location: '/new' } })
        : new Response('ok', { status: 200 });
    await withGlobalFetch(handler, async () => {
      const moved = await fetchPage('https://www.acme.test/old', new Map());
      assert.equal(moved.finalUrl, 'https://www.acme.test/new');
      assert.deepEqual(moved.redirectChain, ['https://www.acme.test/old']);
      const direct = await fetchPage('https://www.acme.test/new', new Map());
      assert.equal(direct.finalUrl, 'https://www.acme.test/new');
    });
  });

  test('main runs the site audit through the real fetch path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'launch-guard-'));
    const path = join(dir, 'launch.config.json');
    writeFileSync(path, JSON.stringify({ domain: 'acme.test', fallbackPaths: ['/'] }));
    const calls = [];
    const handler = async (url) => {
      calls.push(String(url));
      return new Response(page({ body: cleanBody() }), { status: 200 });
    };
    const write = process.stdout.write;
    const writeErr = process.stderr.write;
    let output = '';
    process.stdout.write = (chunk) => {
      output += chunk;
      return true;
    };
    process.stderr.write = process.stdout.write;
    try {
      await withGlobalFetch(handler, () => main(['https://www.acme.test', '--config', path]));
    } finally {
      process.stdout.write = write;
      process.stderr.write = writeErr;
      rmSync(dir, { recursive: true, force: true });
    }
    assert.ok(calls.includes('https://www.acme.test/robots.txt'));
    assert.ok(calls.includes('https://www.acme.test/llms.txt'));
    assert.match(output, /\[https-redirect\]/);
  });
});

describe('config and CLI arguments', () => {
  test('normalizeConfig defaults the site check fields', () => {
    const config = normalizeConfig({});
    assert.equal(config.stagingUrl, null);
    assert.deepEqual(config.redirects, []);
    assert.equal(config.apexDefault, false);
  });

  test('normalizeConfig treats an empty stagingUrl as none and keeps set values', () => {
    assert.equal(normalizeConfig({ stagingUrl: '' }).stagingUrl, null);
    const redirects = [{ from: '/old', to: '/new' }];
    const config = normalizeConfig({
      stagingUrl: 'https://acme.webflow.io',
      redirects,
      apexDefault: true,
    });
    assert.equal(config.stagingUrl, 'https://acme.webflow.io');
    assert.deepEqual(config.redirects, redirects);
    assert.equal(config.apexDefault, true);
  });

  test('the template config carries the site check fields', () => {
    const path = fileURLToPath(new URL('../../projects/_template/launch.config.json', import.meta.url));
    const template = loadConfig(path);
    assert.equal(template.stagingUrl, '');
    assert.deepEqual(template.redirects, []);
    assert.equal(template.apexDefault, false);
  });

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
