// Acceptance tests for moving fortitudoetluxpublishing.com and philipwoodcbe.com to the Webflow Basic plan.
// Spec: projects/philip-wood/.claude/specs/philip-wood-non-cms-hosting.md (webflow-internal).
// Parity tests pass before and after the migration. The own-asset test fails until T2 and the no-CMS tests until T3.
// Screenshot baselines: run once with --update-snapshots BEFORE any Designer change (spec T0).

import { test, expect } from '@playwright/test';

const FEL = 'https://www.fortitudoetluxpublishing.com';
const PW = 'https://www.philipwoodcbe.com';
const FEL_SITE_ID = '691c7c653d0cc6d47933543e';
const FOREIGN_ASSET_SITE_ID = '691de1218aca570444d4dbed';

const FEL_PAGES = ['/', '/about', '/author', '/survival-codes', '/other-works', '/contact', '/privacy-policy'];
const PW_PAGES = ['/', '/lawyer', '/contact', '/privacy-policy', '/author', '/universities', '/awards', '/personal'];
const ALL_PAGES = [...FEL_PAGES.map((p) => FEL + p), ...PW_PAGES.map((p) => PW + p)];

const WORKS = [
  {
    title: 'Do and Think',
    subtitle: null,
    images: ['Front cover of book', 'Landscape of the keyboard'],
    paragraphs: 3,
    start: 'This book, published privately for family and friends by Phi',
  },
  {
    title: 'Story of a Family',
    subtitle: null,
    images: ['Front cover'],
    paragraphs: 5,
    start: 'This book was written by Philip Wood and was published in 20',
  },
  {
    title: 'Marie-Elisabeth’s Garden:',
    subtitle: 'The garden born out of a disaster',
    images: ['A view of part of Knowle Grange gardens'],
    paragraphs: 1,
    start: 'This book is currently work in progress. It is an autobiogra',
  },
];

const HIDE_CONSENT = '[fs-cc="banner"], [fs-cc="preferences"], [fs-cc="manager"] { display: none !important; }';

test.describe('philip-wood-non-cms-hosting', () => {
  test.describe('regression: both sites', () => {
    for (const url of ALL_PAGES) {
      test(`${url} returns 200`, async ({ request }) => {
        const res = await request.get(url);
        expect(res.status()).toBe(200);
      });
    }

    test('fortitudoetlux.com still forwards to fortitudoetluxpublishing.com', async ({ request }) => {
      const res = await request.get('https://fortitudoetlux.com/', { maxRedirects: 0 });
      expect([301, 302, 307, 308]).toContain(res.status());
      expect(res.headers()['location']).toContain('fortitudoetluxpublishing.com');
    });
  });

  test.describe('other-works page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(FEL + '/other-works', { waitUntil: 'networkidle' });
    });

    test('shows the three works in the same order with the same copy', async ({ page }) => {
      const items = page.locator('.works_content');
      await expect(items).toHaveCount(WORKS.length);
      for (const [i, work] of WORKS.entries()) {
        const item = items.nth(i);
        await expect(item.locator('h2')).toHaveText(work.title);
        const subtitle = item.locator('p.heading-style-h4');
        if (work.subtitle) {
          await expect(subtitle.filter({ visible: true })).toHaveText(work.subtitle);
        } else {
          await expect(subtitle.filter({ visible: true })).toHaveCount(0);
        }
        const body = item.locator('.w-richtext');
        await expect(body.locator('p')).toHaveCount(work.paragraphs);
        expect((await body.innerText()).startsWith(work.start)).toBe(true);
      }
    });

    test('shows each visible image with its alt text, legend and a loaded file', async ({ page }) => {
      const items = page.locator('.works_content');
      for (const [i, work] of WORKS.entries()) {
        const imgs = items.nth(i).locator('.works_image-wrapper img').filter({ visible: true });
        await expect(imgs).toHaveCount(work.images.length);
        for (const [j, alt] of work.images.entries()) {
          const img = imgs.nth(j);
          await img.scrollIntoViewIfNeeded();
          await expect(img).toHaveAttribute('alt', alt);
          await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
          await expect(img.locator('xpath=..').locator('.is-legend')).toHaveText(alt);
        }
      }
    });

    test('keeps list semantics: one role=list with three listitems', async ({ page }) => {
      const list = page.locator('.works_list[role="list"]');
      await expect(list).toHaveCount(1);
      await expect(list.locator('> [role="listitem"]')).toHaveCount(WORKS.length);
    });

    test('loads images only from this site’s own asset library (fails until T2 ships)', async ({ page }) => {
      const html = await page.content();
      expect(html).not.toContain(FOREIGN_ASSET_SITE_ID);
      expect(html).toContain(FEL_SITE_ID);
    });

    test('has no console errors', async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
      page.on('pageerror', (err) => errors.push(err.message));
      await page.reload({ waitUntil: 'networkidle' });
      expect(errors).toEqual([]);
    });

    for (const vp of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      test(`matches the pre-migration screenshot at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.reload({ waitUntil: 'networkidle' });
        await page.addStyleTag({ content: HIDE_CONSENT });
        for (const img of await page.locator('img').all()) {
          await img.scrollIntoViewIfNeeded().catch(() => {});
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(page).toHaveScreenshot(`other-works-${vp.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  });

  test.describe('no CMS left (fails until T3 ships)', () => {
    for (const url of ALL_PAGES) {
      test(`${url} renders no collection list`, async ({ page }) => {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.w-dyn-list, .w-dyn-item, .w-dyn-bind-empty')).toHaveCount(0);
      });
    }
  });
});
