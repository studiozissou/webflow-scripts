import { test, expect } from '@playwright/test';

const BASE = 'https://nem-life-1.webflow.io';

/* ------------------------------------------------------------------ */
/*  Fix 1 — Page titles (P0)                                          */
/* ------------------------------------------------------------------ */

test.describe('nem-mobile-qa: page titles', () => {
  const pages = [
    { path: '/', expected: 'NEM Life | Doorbreek het patroon dat je steeds weer terugtrekt' },
    { path: '/blog-insights', expected: 'Inzichten | Artikelen over patronen, relaties en emoties - NEM Life' },
    { path: '/ervaringen', expected: 'Ervaringen | Echte verhalen van NEM Life deelnemers' },
  ];

  for (const { path, expected } of pages) {
    test(`title on ${path}`, async ({ page }) => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await expect(page).toHaveTitle(expected);
    });
  }

  // CMS template pages — fallback titles (dynamic binding may override)
  const templatePages = [
    { path: '/inzichten/de-belangrijkheid-van-zelfreflectie', fallback: 'Inzicht - NEM Life' },
    { path: '/themas/patronen-emoties', fallback: 'Thema - NEM Life Inzichten' },
    { path: '/testimonials/new', fallback: 'Ervaring - NEM Life' },
  ];

  for (const { path, fallback } of templatePages) {
    test(`title on CMS template ${path} contains project name`, async ({ page }) => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      const title = await page.title();
      // CMS dynamic binding may override the fallback, so check either the
      // fallback is set OR a dynamic title containing "NEM Life" is present
      const hasFallback = title === fallback;
      const hasDynamic = title.includes('NEM Life');
      expect(
        hasFallback || hasDynamic,
        `Title "${title}" should be "${fallback}" or contain "NEM Life"`
      ).toBe(true);
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Fix 2 — Ervaringen section heading (P1)                           */
/* ------------------------------------------------------------------ */

test.describe('nem-mobile-qa: ervaringen heading', () => {
  test('H2 reads "Herken jij jezelf hierin?"', async ({ page }) => {
    await page.goto(`${BASE}/ervaringen`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(1500);

    const h2 = page.locator('h2:has-text("Herken jij jezelf hierin?")');
    await expect(h2.first()).toBeVisible();
  });

  test('subtitle text is updated', async ({ page }) => {
    await page.goto(`${BASE}/ervaringen`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(1500);

    const subtitle = page.locator(
      'text=Echte verhalen van mensen die vastliepen - en weer in beweging kwamen'
    );
    await expect(subtitle.first()).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  Fix 3 — Christel cards stacked on mobile (P1)                     */
/* ------------------------------------------------------------------ */

test.describe('nem-mobile-qa: christel card layout', () => {
  test('cards stack single-column at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/link-in-bio/christel`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(2000);

    // Find grid containers — they should be single-column on mobile
    const grids = page.locator('[class*="grid"]');
    const count = await grids.count();

    for (let i = 0; i < count; i++) {
      const cols = await grids.nth(i).evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.gridTemplateColumns;
      });
      // Single column means either "1fr", a single px value, or "none"
      const colCount = cols.split(/\s+/).filter((v) => v && v !== 'none').length;
      if (colCount > 1) {
        // Only fail if the grid is visible and in the main content area
        const visible = await grids.nth(i).isVisible();
        const inMain = await grids.nth(i).evaluate(
          (el) => !el.closest('nav') && !el.closest('footer')
        );
        if (visible && inMain) {
          expect(
            colCount,
            `Grid ${i} has ${colCount} columns at 390px — expected 1`
          ).toBe(1);
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Fix 4 — NEM Methode card section spacing (P2)                     */
/* ------------------------------------------------------------------ */

test.describe('nem-mobile-qa: nem-methode card spacing', () => {
  test('card sections have adequate spacing at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/nem-methode`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(2000);

    // Measure gap between card section containers
    // Look for sections/wrappers that contain cards
    const gap = await page.evaluate(() => {
      const sections = document.querySelectorAll('section, [class*="section"]');
      let minGap = Infinity;

      for (let i = 0; i < sections.length - 1; i++) {
        const rect1 = sections[i].getBoundingClientRect();
        const rect2 = sections[i + 1].getBoundingClientRect();
        const gap = rect2.top - rect1.bottom;
        if (gap > 0 && gap < minGap) {
          minGap = gap;
        }
      }

      return minGap === Infinity ? 0 : minGap;
    });

    // Spec target: 48-64px. Allow some tolerance (>= 40px)
    expect(gap, `Section gap is ${gap}px — expected >= 40px`).toBeGreaterThanOrEqual(40);
  });
});

/* ------------------------------------------------------------------ */
/*  Fix 5 — Footer placeholder links (P2)                             */
/* ------------------------------------------------------------------ */

test.describe('nem-mobile-qa: footer links', () => {
  const footerLinks = [
    { label: /nem methode/i, expectedPath: '/nem-methode' },
    { label: /christel/i, expectedPath: '/link-in-bio/christel' },
    { label: /voorwaarden/i, expectedPath: '/voorwaarden' },
  ];

  for (const { label, expectedPath } of footerLinks) {
    test(`footer link "${label.source}" navigates to ${expectedPath}`, async ({ page }) => {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForTimeout(1500);

      const footer = page.locator('footer');
      const link = footer.getByRole('link', { name: label }).first();
      await expect(link).toBeVisible();

      const href = await link.getAttribute('href');
      expect(
        href?.includes(expectedPath),
        `Footer link href "${href}" should contain "${expectedPath}"`
      ).toBe(true);
    });
  }

  test('footer links navigate without 404', async ({ page, request }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(1500);

    const paths = ['/nem-methode', '/link-in-bio/christel', '/voorwaarden'];
    for (const path of paths) {
      const response = await request.get(`${BASE}${path}`, { timeout: 10_000 });
      expect(response.status(), `${path} returned ${response.status()}`).toBeLessThan(400);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Smoke — no console errors on key pages                            */
/* ------------------------------------------------------------------ */

test.describe('nem-mobile-qa: smoke', () => {
  const keyPages = ['/', '/ervaringen', '/nem-methode', '/link-in-bio/christel'];

  for (const path of keyPages) {
    test(`no critical console errors on ${path}`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForTimeout(3000);

      const critical = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('Failed to load resource') &&
          !e.includes('third-party') &&
          !e.includes('analytics') &&
          !e.includes('gtag') &&
          !e.includes('webflow')
      );
      expect(critical).toEqual([]);
    });
  }
});
