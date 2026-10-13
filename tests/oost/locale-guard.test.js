// Unit tests for the Oost locale guard, using inline HTML fixtures and stubbed fetches only.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkEnglishLinks,
  checkWhatsAppLink,
  checkBareSocial,
  checkUntranslatedTitle,
  checkRunTogetherList,
  checkShareImage,
  findAlternateHref,
  rebase,
  run,
  FALLBACK_PATHS,
} from '../../tools/oost/locale-guard.js';

const EN = 'https://oost.example/en/catering';
const NL = 'https://oost.example/catering';

function page({ title = 'Catering', head = '', body = '' } = {}) {
  return `<!DOCTYPE html><html><head><title>${title}</title>${head}</head><body>${body}</body></html>`;
}

const SWITCHER = `<div class="nav_locales w-locales-list"><div role="list" class="w-locales-items"><div role="listitem" class="w-locales-item"><a hreflang="nl" href="/catering" class="nav_link">nl</a></div><div role="listitem" class="w-locales-item"><a hreflang="en" href="/en/catering">en</a></div></div></div>`;

describe('checkEnglishLinks', () => {
  test('flags an internal link to /afhalen on an /en page', () => {
    const findings = checkEnglishLinks(
      page({ body: '<a href="/afhalen">Takeaway</a>' }),
      EN,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'english-link-leak');
    assert.equal(findings[0].severity, 'error');
    assert.equal(findings[0].url, EN);
    assert.match(findings[0].detail, /\/afhalen/);
  });

  test('allows /en/afhalen, #offerte, mailto:, tel: and external links', () => {
    const body = [
      '<a href="/en/afhalen">a</a>',
      '<a href="#offerte">b</a>',
      '<a href="#">c</a>',
      '<a href="mailto:info@example.com">d</a>',
      '<a href="tel:+31600000000">e</a>',
      '<a href="https://maps.example.com/x">f</a>',
      '<a href="/en">g</a>',
      '<a href="https://oost.example/en/privacybeleid">h</a>',
    ].join('');
    assert.deepEqual(checkEnglishLinks(page({ body }), EN), []);
  });

  test('ignores the language switcher link to the Dutch page, even with nested elements', () => {
    const body = `${SWITCHER}<div><a href="/en/afhalen">x</a></div>`;
    assert.deepEqual(checkEnglishLinks(page({ body }), EN), []);
  });

  test('still flags a Dutch link placed after the switcher closes', () => {
    const body = `${SWITCHER}<a href="/catering">leak</a>`;
    assert.equal(checkEnglishLinks(page({ body }), EN).length, 1);
  });

  test('resolves relative hrefs against the page URL', () => {
    const findings = checkEnglishLinks(
      page({ body: "<a href='../afhalen'>x</a><a href=afhalen>y</a>" }),
      EN,
    );
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /\/afhalen/);
  });

  test('flags a root-relative hash link like /#menukaart', () => {
    assert.equal(
      checkEnglishLinks(page({ body: '<a href="/#menukaart">m</a>' }), EN).length,
      1,
    );
  });

  test('flags a path that merely starts with /en like /enquete', () => {
    assert.equal(
      checkEnglishLinks(page({ body: '<a href="/enquete">q</a>' }), EN).length,
      1,
    );
  });

  test('does not run on Dutch pages', () => {
    assert.deepEqual(
      checkEnglishLinks(page({ body: '<a href="/afhalen">x</a>' }), NL),
      [],
    );
  });

  test('treats a trailing-slash /en/ page as English', () => {
    assert.equal(
      checkEnglishLinks(
        page({ body: '<a href="/afhalen">x</a>' }),
        'https://oost.example/en/',
      ).length,
      1,
    );
  });
});

describe('checkWhatsAppLink', () => {
  test('flags a wa.me link to the restaurant number', () => {
    const findings = checkWhatsAppLink(
      page({ body: '<a href="https://wa.me/31237851562?text=Hoi">wa</a>' }),
      NL,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'whatsapp-link');
    assert.equal(findings[0].severity, 'error');
    assert.match(findings[0].detail, /wa\.me\/31237851562/);
  });

  test('flags the old placeholder number', () => {
    const findings = checkWhatsAppLink(
      page({ body: '<a href="https://wa.me/31600000000?text=Hoi">wa</a>' }),
      NL,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'whatsapp-link');
  });

  test('flags api.whatsapp.com and whatsapp.com/send links', () => {
    const findings = checkWhatsAppLink(
      page({
        body:
          '<a href="https://api.whatsapp.com/send?phone=31237851562">a</a>' +
          '<a href="https://www.whatsapp.com/send?phone=31237851562">b</a>',
      }),
      NL,
    );
    assert.equal(findings.length, 2);
  });

  test('reports each WhatsApp href once', () => {
    const href = 'https://wa.me/31237851562';
    const findings = checkWhatsAppLink(
      page({ body: `<a href="${href}">a</a><a href="${href}">b</a>` }),
      NL,
    );
    assert.equal(findings.length, 1);
  });

  test('passes a page without WhatsApp links', () => {
    assert.deepEqual(
      checkWhatsAppLink(
        page({ body: '<a href="tel:+31237851562">Bel ons</a><a href="https://www.instagram.com/oost">ig</a>' }),
        NL,
      ),
      [],
    );
  });
});

describe('checkBareSocial', () => {
  test('flags https://www.instagram.com/ and https://instagram.com', () => {
    for (const href of [
      'https://www.instagram.com/',
      'https://instagram.com',
      'https://www.instagram.com/?hl=nl',
    ]) {
      const findings = checkBareSocial(page({ body: `<a href="${href}">ig</a>` }), NL);
      assert.equal(findings.length, 1, href);
      assert.equal(findings[0].check, 'bare-social-link');
      assert.equal(findings[0].severity, 'error');
    }
  });

  test('allows a URL with a handle', () => {
    assert.deepEqual(
      checkBareSocial(
        page({ body: '<a href="https://www.instagram.com/examplehandle/">ig</a>' }),
        NL,
      ),
      [],
    );
  });
});

describe('findAlternateHref', () => {
  test('reads the hreflang="nl" alternate regardless of attribute case and order', () => {
    const head =
      '<link rel="alternate" hrefLang="en" href="https://x.example/en/catering"/><link href=\'https://x.example/catering\' hreflang=\'nl\' rel=\'alternate\'/>';
    assert.equal(findAlternateHref(page({ head }), 'nl'), 'https://x.example/catering');
  });

  test('returns null when there is no alternate', () => {
    assert.equal(findAlternateHref(page(), 'nl'), null);
  });
});

describe('checkUntranslatedTitle', () => {
  test('flags an /en title equal to its Dutch twin', () => {
    const findings = checkUntranslatedTitle(
      page({ title: 'Catering in Haarlem | Oost' }),
      page({ title: 'Catering in Haarlem | Oost' }),
      EN,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'untranslated-title');
    assert.equal(findings[0].severity, 'error');
  });

  test('compares decoded, whitespace-collapsed titles', () => {
    assert.equal(
      checkUntranslatedTitle(
        page({ title: ' Eten &amp; drinken\n | Oost ' }),
        page({ title: 'Eten & drinken | Oost' }),
        EN,
      ).length,
      1,
    );
  });

  test('allows a translated title', () => {
    assert.deepEqual(
      checkUntranslatedTitle(
        page({ title: 'Catering | Oost' }),
        page({ title: 'Cateraar | Oost' }),
        EN,
      ),
      [],
    );
  });
});

describe('checkRunTogetherList', () => {
  test('flags a 60-character list item with no spaces', () => {
    const word = 'Haarlem'.repeat(9).slice(0, 60);
    const findings = checkRunTogetherList(
      page({ body: `<ul><li class="region_item">${word}</li></ul>` }),
      EN,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'run-together-list');
    assert.equal(findings[0].severity, 'error');
  });

  test('flags a .region_item div as well as li', () => {
    const word = 'HaarlemHeemstedeBloemendaalOverveen';
    assert.equal(
      checkRunTogetherList(
        page({
          body: `<div class="region_list"><div class="region_item">${word}</div></div>`,
        }),
        EN,
      ).length,
      1,
    );
  });

  test('allows nine short items', () => {
    const items = [
      'Haarlem',
      'Heemstede',
      'Bloemendaal',
      'Overveen',
      'Aerdenhout',
      'Zandvoort',
      'Spaarndam',
      'Hoofddorp',
      'Velserbroek',
    ]
      .map((name) => `<li class="region_item">${name}</li>`)
      .join('');
    assert.deepEqual(checkRunTogetherList(page({ body: `<ul>${items}</ul>` }), EN), []);
  });

  test('allows a long item with spaces and a long item split by nested tags with whitespace', () => {
    const body =
      '<ul><li>This is a long list item with plenty of spaces in it</li><li><span>Haarlemmermeerstation</span> <span>Bloemendaalseweg</span></li></ul>';
    assert.deepEqual(checkRunTogetherList(page({ body }), EN), []);
  });

  test('does not flag a parent item whose nested items are each short', () => {
    const body =
      '<ul><li>Intro<ul><li>AmsterdamCentrumNoordZuid</li><li>UtrechtBinnenstadWest</li></ul></li></ul>';
    assert.deepEqual(checkRunTogetherList(page({ body }), EN), []);
  });

  test('does not flag short blocks that sit side by side with no whitespace between the tags', () => {
    const body =
      '<ul><li><div>Amsterdam-Centrum</div><div>Utrecht-Binnenstad</div></li></ul>';
    assert.deepEqual(checkRunTogetherList(page({ body }), EN), []);
  });

  test('reports a run-together text once when list items nest', () => {
    const word = 'HaarlemHeemstedeBloemendaalOverveen';
    const body = `<ul><li>Regio<ul><li><span>${word}</span></li></ul></li></ul>`;
    const findings = checkRunTogetherList(page({ body }), EN);
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, new RegExp(word));
  });
});

describe('checkShareImage', () => {
  test('reports a missing og:image as a warning', () => {
    const findings = checkShareImage(page(), NL, false);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].check, 'missing-share-image');
    assert.equal(findings[0].severity, 'warning');
  });

  test('reports a missing og:image as an error with --strict', () => {
    assert.equal(checkShareImage(page(), NL, true)[0].severity, 'error');
  });

  test('allows an og:image in either attribute order', () => {
    for (const head of [
      '<meta property="og:image" content="https://cdn.example/share.jpg">',
      '<meta content="https://cdn.example/share.jpg" property="og:image"/>',
    ]) {
      assert.deepEqual(checkShareImage(page({ head }), NL, true), []);
    }
  });

  test('treats an empty og:image content as missing', () => {
    assert.equal(
      checkShareImage(page({ head: '<meta property="og:image" content="">' }), NL, false)
        .length,
      1,
    );
  });
});

describe('rebase', () => {
  test('moves a sitemap URL onto the base host, keeping the path', () => {
    assert.equal(
      rebase('https://www.oost.example/en/afhalen', 'https://oost.webflow.io'),
      'https://oost.webflow.io/en/afhalen',
    );
    assert.equal(
      rebase('https://www.oost.example', 'https://oost.webflow.io/'),
      'https://oost.webflow.io/',
    );
  });
});

const GOOD_HEAD = '<meta property="og:image" content="https://cdn.example/s.jpg">';

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

describe('run', () => {
  test('returns exit code 0 for a clean site and keeps warnings', async () => {
    const { fetch } = site({
      '/': page({
        title: 'Oost',
        head: '<link rel="alternate" hreflang="en" href="https://www.oost.example/en">',
      }),
      '/en': page({
        title: 'Oost EN',
        head: `${GOOD_HEAD}<link rel="alternate" hreflang="nl" href="https://www.oost.example/">`,
      }),
    });
    const result = await run({
      baseUrl: 'https://oost.webflow.io',
      strict: false,
      discover: async () => ['https://www.oost.example/', 'https://www.oost.example/en'],
      fetch,
    });
    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.errors, []);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].severity, 'warning');
  });

  test('returns exit code 1 for an error finding and fetches the Dutch twin on the base host', async () => {
    const { fetch, calls } = site({
      '/en': page({
        title: 'Same',
        head: `${GOOD_HEAD}<link rel="alternate" hreflang="nl" href="https://www.oost.example/catering">`,
      }),
      '/catering': page({ title: 'Same', head: GOOD_HEAD }),
    });
    const result = await run({
      baseUrl: 'https://oost.webflow.io',
      strict: false,
      discover: async () => [
        'https://www.oost.example/en',
        'https://www.oost.example/catering',
      ],
      fetch,
    });
    assert.equal(result.exitCode, 1);
    assert.ok(result.findings.some((f) => f.check === 'untranslated-title'));
    assert.ok(calls.every((url) => url.startsWith('https://oost.webflow.io/')));
    assert.equal(calls.filter((url) => url.endsWith('/catering')).length, 1);
  });

  test('returns exit code 2 when a page cannot be fetched, after one retry', async () => {
    const { fetch, calls } = site({
      '/': page({ head: GOOD_HEAD }),
      '/broken': new Error('ECONNRESET'),
    });
    const result = await run({
      baseUrl: 'https://oost.webflow.io',
      strict: false,
      discover: async () => [
        'https://oost.webflow.io/',
        'https://oost.webflow.io/broken',
      ],
      fetch,
    });
    assert.equal(result.exitCode, 2);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].url, /\/broken$/);
    assert.equal(calls.filter((url) => url.endsWith('/broken')).length, 2);
  });

  test('treats a non-2xx final status as a fetch error', async () => {
    const { fetch } = site({ '/': page({ head: GOOD_HEAD }) });
    const result = await run({
      baseUrl: 'https://oost.webflow.io',
      strict: false,
      discover: async () => ['https://oost.webflow.io/', 'https://oost.webflow.io/gone'],
      fetch,
    });
    assert.equal(result.exitCode, 2);
    assert.match(result.errors[0].detail, /404/);
  });

  test('succeeds when a failed fetch recovers on retry', async () => {
    const attempts = new Map();
    const fetch = async (url) => {
      attempts.set(url, (attempts.get(url) ?? 0) + 1);
      if (url.endsWith('/privacybeleid') && attempts.get(url) === 1)
        throw new Error('flaky');
      return { html: page({ head: GOOD_HEAD }), statusCode: 200 };
    };
    const result = await run({
      baseUrl: 'https://oost.webflow.io',
      strict: false,
      discover: async () => [
        'https://oost.webflow.io/',
        'https://oost.webflow.io/privacybeleid',
      ],
      fetch,
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.exitCode, 0);
    assert.equal(attempts.get('https://oost.webflow.io/privacybeleid'), 2);
  });

  test('falls back to the fixed page list when discovery yields only the root', async () => {
    const { fetch, calls } = site({});
    await run({
      baseUrl: 'https://oost.webflow.io/',
      strict: true,
      discover: async (root) => [root],
      fetch,
    });
    const fetched = new Set(calls.map((url) => new URL(url).pathname));
    assert.deepEqual([...fetched].sort(), [...FALLBACK_PATHS].sort());
    assert.equal(FALLBACK_PATHS.length, 10);
  });

  test('promotes the missing share image to an error with strict', async () => {
    const { fetch } = site({ '/': page(), '/afhalen': page() });
    const result = await run({
      baseUrl: 'https://oost.webflow.io',
      strict: true,
      discover: async () => [
        'https://oost.webflow.io/',
        'https://oost.webflow.io/afhalen',
      ],
      fetch,
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.findings.length, 2);
    assert.ok(result.findings.every((f) => f.severity === 'error'));
  });

  test('returns exit code 2 for a base URL that is not a URL', async () => {
    const { fetch, calls } = site({});
    const result = await run({
      baseUrl: 'not-a-url',
      discover: async (root) => [root],
      fetch,
    });
    assert.equal(result.exitCode, 2);
    assert.deepEqual(result.findings, []);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].url, 'not-a-url');
    assert.deepEqual(calls, []);
  });

  test('returns exit code 2 when discovery throws', async () => {
    const { fetch } = site({});
    const result = await run({
      baseUrl: 'https://oost.webflow.io',
      discover: async () => {
        throw new Error('sitemap exploded');
      },
      fetch,
    });
    assert.equal(result.exitCode, 2);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].detail, /sitemap exploded/);
  });
});
