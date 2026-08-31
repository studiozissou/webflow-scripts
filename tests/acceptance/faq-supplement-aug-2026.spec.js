// Verifies the August 2026 supplementary FAQ content is live on all seven Coconut landing pages.

import { test, expect } from '@playwright/test';

const BASE = process.env.STAGING_URL || 'https://www.getcoconut.com';

const norm = (s) =>
  s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const STATIC_SEL = '._25-collapse-item';
// Questions are a div._25-collapse-title on most pages, but an h3 inside the
// trigger on /features/mtd-compliant-software. Scope to the item either way.
const TITLE_SEL = '._25-collapse-item ._25-collapse-title, ._25-collapse-item h3.heading-style-h6';

// Third-party noise present on the webflow.io staging domain regardless of this
// change: OptinMonster is registered against getcoconut.com, so it 404s and
// complains about the referrer on staging only. Not a regression.
const IGNORED_CONSOLE = [/OptinMonster/i, /Failed to load resource/i];

const PAGES = [
  {
    path: '/features/tax-help-support',
    kind: 'cms',
    titleSel: '._25-collapse-title, .w-dyn-item ._25-collapse-title',
    added: [
      'Is support included in my plan and during the free trial?',
      'Can Coconut support help me switch from spreadsheets or another provider?',
    ],
    existing: [
      'What support does !Coconut offer for MTD and bookkeeping?',
      'Is the support team UK-based?',
    ],
  },
  {
    // NOT CMS: this page's FAQ is the static "25 HMRC FAQ Section" on the
    // features template, shown only for the new-layout item. Its
    // common-questions reference renders nowhere.
    path: '/features/mtd-compliant-software',
    kind: 'static',
    expectedCount: 12,
    added: [
      'Does Coconut show my tax bill in real time as I go?',
      'How does Coconut keep my financial data secure?',
    ],
    merged: {
      question: 'How does Coconut handle multiple income streams?',
      mustContain: 'may need to be reported separately',
      foldedIn:
        'Can I manage multiple income streams, such as self-employment and property, in one account?',
    },
    existing: [
      'What makes software officially MTD compliant?',
      'Do I still need an accountant if I use MTD software?',
    ],
  },
  {
    path: '/free-making-tax-digital-software',
    kind: 'static',
    expectedCount: 9,
    added: ["What happens to my records if I don't continue paying?"],
    merged: {
      question: "What's included free vs paid?",
      mustContain: 'two-year Zempler offer',
      foldedIn: 'On the free options, can I actually submit MTD updates or just do bookkeeping?',
    },
    existing: ['What is the Zempler + Coconut offer?', 'Who is eligible for the Zempler offer?'],
  },
  {
    path: '/mtd-software',
    kind: 'static',
    expectedCount: 8,
    added: [
      'How does Coconut connect to my bank, and is Open Banking safe?',
      'Will Coconut tell me how much tax and National Insurance I owe during the year?',
    ],
    existing: ['Is there a free trial?', 'Can I switch from another MTD provider?'],
  },
  {
    path: '/mtd-software/bridging-software',
    kind: 'static',
    expectedCount: 14,
    added: [
      "Do I have to use Coconut's spreadsheet template, or can I use my own?",
      'Does the bridging plan cover both quarterly updates and the year-end declaration?',
      'Is bridging software suitable for landlords?',
    ],
    existing: ['What is MTD bridging software?', 'How much does MTD bridging software cost?'],
  },
  {
    path: '/mtd-software/sole-traders',
    kind: 'static',
    expectedCount: 12,
    added: [
      'Can Coconut import my income and expenses automatically?',
      'How does Coconut estimate my Income Tax and National Insurance as I go?',
      'I run more than one business. Can Coconut handle multiple sole-trader businesses?',
    ],
    existing: ['When does MTD start for me?', 'Who is exempt from Making Tax Digital?'],
  },
  {
    path: '/mtd-software/landlords',
    kind: 'static',
    expectedCount: 13,
    added: ['Which landlord/property expenses can I claim, and does Coconut categorise them?'],
    merged: {
      question: 'Can I track multiple properties in Coconut?',
      mustContain: 'automatic totals across your portfolio',
      foldedIn: 'Can Coconut track income and expenses separately for each property?',
    },
    existing: ['Do landlords have to use MTD software?', 'What records do landlords need to keep for MTD?'],
  },
];

const NEW_LINKS = [
  { href: '/pricing', ok: [200] },
  { href: '/mtd-software/landlords', ok: [200] },
  // The Help Centre sits behind Cloudflare bot protection, which serves a
  // "Just a moment..." challenge (403 + __cf_chl_rt_tk) to any automated
  // request, including a real headless Chromium. The page loads normally for
  // users, and the site already links to it elsewhere, so 403 is expected here
  // and only a 404/410 would mean the link is actually broken.
  { href: 'https://help.getcoconut.com/en/', ok: [200, 403] },
];

// textContent, not innerText: accordion answers are collapsed by default and
// innerText omits hidden text, which would hide the merged answers from us.
async function pageText(page) {
  return norm(await page.locator('body').evaluate((el) => el.textContent || ''));
}

async function questionTitles(page, sel) {
  const raw = await page
    .locator(sel || TITLE_SEL)
    .evaluateAll((els) => els.map((e) => e.textContent || ''));
  return raw.map(norm).filter(Boolean);
}

for (const p of PAGES) {
  test.describe(`faq-supplement-aug-2026 :: ${p.path}`, () => {
    // Staging is slow enough under parallel load that a goto can return before
    // the FAQ section is in the DOM. Retry rather than report a false failure.
    test.describe.configure({ retries: 2 });

    test.beforeEach(async ({ page }) => {
      await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
      await page
        .locator(STATIC_SEL)
        .first()
        .waitFor({ state: 'attached', timeout: 30000 });
    });

    test('exposes its FAQ section', async ({ page }) => {
      const section = page.locator(
        'section._25-hmrc-faq-section, section._25-features-innerpage-faq-section'
      );
      await expect(section.first()).toBeAttached();
    });

    test('all new questions are present', async ({ page }) => {
      const text = await pageText(page);
      for (const q of p.added) {
        expect(text, `missing new question on ${p.path}: ${q}`).toContain(norm(q));
      }
    });

    test('no question appears twice', async ({ page }) => {
      const titles = await questionTitles(page, p.titleSel);
      const seen = new Map();
      for (const t of titles) seen.set(t, (seen.get(t) || 0) + 1);
      const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([t]) => t);
      expect(dupes, `duplicate FAQ entries on ${p.path}`).toEqual([]);
    });

    test('pre-existing questions still present', async ({ page }) => {
      const text = await pageText(page);
      for (const q of p.existing) {
        // brand mark may render with or without the leading "!"
        const variants = [norm(q), norm(q.replace(/!Coconut/g, 'Coconut'))];
        expect(
          variants.some((v) => text.includes(v)),
          `regression - existing question lost on ${p.path}: ${q}`
        ).toBe(true);
      }
    });

    if (p.kind === 'static') {
      test(`has ${p.expectedCount} FAQ items`, async ({ page }) => {
        await expect(page.locator(STATIC_SEL)).toHaveCount(p.expectedCount);
      });
    }

    if (p.kind === 'cms') {
      test('new questions render last', async ({ page }) => {
        const titles = await questionTitles(page, p.titleSel);
        const tail = titles.slice(-p.added.length);
        for (const q of p.added) {
          expect(tail, `new CMS question not appended last on ${p.path}: ${q}`).toContain(norm(q));
        }
      });
    }

    if (p.merged) {
      test('merged answer carries the new copy', async ({ page }) => {
        const text = await pageText(page);
        expect(text).toContain(norm(p.merged.question));
        expect(
          text,
          `merged copy missing on ${p.path}: ${p.merged.mustContain}`
        ).toContain(norm(p.merged.mustContain));
      });

      test('folded-in question is not a separate item', async ({ page }) => {
        const titles = await questionTitles(page, p.titleSel);
        expect(
          titles,
          `folded-in question should not appear as its own FAQ on ${p.path}`
        ).not.toContain(norm(p.merged.foldedIn));
      });
    }

    test('no console errors', async ({ page }) => {
      const errors = [];
      const keep = (t) => !IGNORED_CONSOLE.some((re) => re.test(t));
      page.on('pageerror', (e) => keep(String(e)) && errors.push(String(e)));
      page.on('console', (m) => m.type() === 'error' && keep(m.text()) && errors.push(m.text()));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      expect(errors, `console errors on ${p.path}`).toEqual([]);
    });
  });
}

test.describe('faq-supplement-aug-2026 :: new links resolve', () => {
  for (const { href, ok } of NEW_LINKS) {
    test(`link resolves: ${href}`, async ({ request }) => {
      const url = href.startsWith('http') ? href : BASE + href;
      const res = await request.get(url, { maxRedirects: 0 });
      expect(ok, `${url} returned ${res.status()}, expected one of ${ok.join('/')}`).toContain(
        res.status()
      );
    });
  }
});
