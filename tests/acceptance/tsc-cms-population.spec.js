import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'https://tsc-v2.webflow.io';

test.describe('TSC Content Update — 2 Jul 2026 retest', () => {

  // ── Products page ──────────────────────────────────────────────
  test.describe('Products (/products)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STAGING_URL}/products`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('H1 is correct (not services heading)', async ({ page }) => {
      const h1 = page.locator('h1');
      await expect(h1).toHaveText('Equip your fleet with ETCS onboard products built to last');
    });

    test('renders 6 product cards', async ({ page }) => {
      const cards = page.locator('main a').filter({ hasText: 'View product' });
      await expect(cards).toHaveCount(6);
    });

    test('all 6 product names present', async ({ page }) => {
      for (const name of ['ETCS', 'TOBA Box', 'PZB', 'KVB', 'TBL1', 'wSTM']) {
        await expect(page.locator('main').getByText(name, { exact: false }).first()).toBeVisible();
      }
    });

    test('services section removed from products page', async ({ page }) => {
      const servicesHeading = page.locator('main').getByText('Today we deliver a full suite', { exact: false });
      await expect(servicesHeading).toHaveCount(0);
    });

    test('intro crosslinks present', async ({ page }) => {
      await expect(page.locator('main a').filter({ hasText: 'RailOS Apps' }).first()).toBeVisible();
      await expect(page.locator('main a').filter({ hasText: 'Devices' }).first()).toBeVisible();
    });
  });

  // ── Services page ──────────────────────────────────────────────
  test.describe('Services (/services)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STAGING_URL}/services`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('H1 matches content doc', async ({ page }) => {
      const h1 = page.locator('h1');
      await expect(h1).toHaveText('Our Services cover railway signalling, ETCS projects and beyond');
    });

    test('renders 5 service cards', async ({ page }) => {
      const cards = page.locator('main h3');
      await expect(cards).toHaveCount(5);
    });

    test('all 5 services present', async ({ page }) => {
      for (const name of [
        'ETCS Retrofit Viability Assessment',
        'First in Class Homologation',
        'Series Installation & Commissioning',
        'Training',
        'Maintenance',
      ]) {
        await expect(page.locator('main').getByText(name, { exact: false }).first()).toBeVisible();
      }
    });

    test('template "Clients" heading removed', async ({ page }) => {
      const clients = page.locator('main').getByText('Designed to move your operations forward', { exact: false });
      await expect(clients).toHaveCount(0);
    });
  });

  // ── About page ─────────────────────────────────────────────────
  test.describe('About (/about)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STAGING_URL}/about`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('H1 correct', async ({ page }) => {
      await expect(page.locator('h1')).toHaveText('About The Signalling Company');
    });

    test('founder crosslinks to leadership', async ({ page }) => {
      const stanislas = page.locator('main a').filter({ hasText: 'Stanislas Pinte' });
      await expect(stanislas).toHaveAttribute('href', /leadership/);
      const alex = page.locator('main a').filter({ hasText: 'Alexandre Betis' });
      await expect(alex).toHaveAttribute('href', /leadership/);
    });

    test('RailOS crosslink present', async ({ page }) => {
      const railos = page.locator('main a').filter({ hasText: 'RailOS' });
      await expect(railos.first()).toHaveAttribute('href', /\/railos/);
    });

    test('"Our philosophy" typo fixed', async ({ page }) => {
      const typo = page.locator('main').getByText('philiosophy', { exact: false });
      await expect(typo).toHaveCount(0);
    });

    test('placeholder hyperlink text removed', async ({ page }) => {
      const placeholder = page.locator('main').getByText('[hyperlink to Open RailOS page]', { exact: false });
      await expect(placeholder).toHaveCount(0);
    });

    test('4 values present', async ({ page }) => {
      for (const value of ['Think strategically', 'Care', 'Collaborate', 'Act rationally']) {
        await expect(page.locator('main').getByText(value, { exact: false }).first()).toBeVisible();
      }
    });
  });

  // ── News page ──────────────────────────────────────────────────
  test.describe('News (/news)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STAGING_URL}/news`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('H1 correct', async ({ page }) => {
      await expect(page.locator('h1')).toHaveText('News & Insights');
    });

    test('renders at least 7 news articles', async ({ page }) => {
      const articles = page.locator('main a[href*="/news/"]');
      const count = await articles.count();
      expect(count).toBeGreaterThanOrEqual(7);
    });

    test('article dates are correct (not all 2021)', async ({ page }) => {
      const dates2025plus = page.locator('main').getByText(/202[5-9]/, { exact: false });
      const count = await dates2025plus.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });

    test('subtitle present', async ({ page }) => {
      await expect(page.locator('main p').filter({ hasText: 'product milestones' })).toBeVisible();
    });
  });

  // ── Projects page ──────────────────────────────────────────────
  test.describe('Projects (/projects)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STAGING_URL}/projects`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('case study cards present (3 in hero + per-segment)', async ({ page }) => {
      const cards = page.locator('main a').filter({ hasText: 'Read Case Study' });
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('4 customer segments present', async ({ page }) => {
      for (const seg of ['Fleet Operators', 'Fleet Leasing Companies', 'Infrastructure Managers', 'Locomotive & Train Manufacturers']) {
        await expect(page.locator('main').getByText(seg, { exact: false }).first()).toBeVisible();
      }
    });

    test('Fleet Operators has ETCS crosslink', async ({ page }) => {
      // The first segment should have an ETCS link to /products
      const etcsLink = page.locator('main a').filter({ hasText: 'ETCS' }).first();
      await expect(etcsLink).toHaveAttribute('href', /\/products/);
    });
  });

  // ── Lineas case study ──────────────────────────────────────────
  test.describe('Lineas HLD77 (/projects/lineas-hld77)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STAGING_URL}/projects/lineas-hld77`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('H1 correct', async ({ page }) => {
      await expect(page.locator('h1')).toHaveText('The HLD77 Retrofit Project for Lineas');
    });

    test('crosslinks present in body', async ({ page }) => {
      const etcs = page.locator('main a').filter({ hasText: 'ETCS' });
      await expect(etcs.first()).toHaveAttribute('href', /\/products\/etcs/);
      const railos = page.locator('main a').filter({ hasText: 'RailOS' });
      await expect(railos.first()).toHaveAttribute('href', /\/railos/);
    });

    test('7 result stats visible', async ({ page }) => {
      for (const stat of ['109', '87', '22', '10', 'Under 1', 'Under 3']) {
        await expect(page.locator('main').getByText(stat, { exact: false }).first()).toBeVisible();
      }
    });

    test('Bruno Vanlede quote present', async ({ page }) => {
      await expect(page.locator('main').getByText('Bruno Vanlede', { exact: false })).toBeVisible();
    });

    test('"More projects" section present', async ({ page }) => {
      await expect(page.locator('main').getByText('More projects', { exact: false })).toBeVisible();
    });
  });

  // ── RailOS Apps ────────────────────────────────────────────────
  test.describe('RailOS Apps (/railos/apps)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STAGING_URL}/railos/apps`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('H1 correct', async ({ page }) => {
      await expect(page.locator('h1')).toHaveText('RailOS Applications for railway safety');
    });

    test('two section headings (ATP + Data)', async ({ page }) => {
      await expect(page.locator('main h2').filter({ hasText: 'Onboard ATP' })).toBeVisible();
      await expect(page.locator('main h2').filter({ hasText: /[Dd]ata/ })).toBeVisible();
    });

    test('9 app cards total', async ({ page }) => {
      const cards = page.locator('main h3');
      await expect(cards).toHaveCount(9);
    });

    test('all 9 apps present', async ({ page }) => {
      for (const name of ['ETCS App', 'TBL1+ App', 'PZB App', 'KVB App', 'iSTM App', 'TCMS App', 'DJR App', 'DRU App', 'LRU App']) {
        await expect(page.locator('main').getByText(name, { exact: false }).first()).toBeVisible();
      }
    });

    test('section 2 heading is not duplicated from section 1', async ({ page }) => {
      const h2s = page.locator('main h2');
      const texts = await h2s.allTextContents();
      const atpCount = texts.filter(t => t.includes('Onboard ATP')).length;
      expect(atpCount).toBe(1);
    });
  });

  // ── Leadership ─────────────────────────────────────────────────
  test.describe('Leadership (/leadership)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STAGING_URL}/leadership`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('8 team members present', async ({ page }) => {
      for (const name of [
        'Alexandre Betis',
        'Benoit Blin',
        'Fabienne Goutaudier',
        'Kleinplac',
        'Martin Kriz',
        'Jarlath Lally',
        'Stanislas Pinte',
        'Benjamin Pischetola',
      ]) {
        await expect(page.locator('main').getByText(name, { exact: false }).first()).toBeVisible();
      }
    });
  });

  // ── Contact page ───────────────────────────────────────────────
  test.describe('Contact (/contact)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STAGING_URL}/contact`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('H1 correct', async ({ page }) => {
      await expect(page.locator('h1')).toHaveText(/keep things moving/i);
    });

    test('contact form present', async ({ page }) => {
      await expect(page.locator('form').first()).toBeVisible();
    });

    test('Romain media contact present', async ({ page }) => {
      await expect(page.locator('main').getByText('Romain Hourtiguet', { exact: false })).toBeVisible();
    });

    test.fail('template email hq@cargo.plus still present', async ({ page }) => {
      const cargoEmail = page.locator('main a').filter({ hasText: 'hq@cargo.plus' });
      await expect(cargoEmail).toHaveCount(0);
    });

    test.fail('wrong flag icon (Germany) still on page', async ({ page }) => {
      const germanyFlag = page.locator('img[alt="germany"]');
      await expect(germanyFlag).toHaveCount(0);
    });
  });

  // ── Site-wide checks ──────────────────────────────────────────
  test.describe('Site-wide', () => {
    test('footer FAQ link still goes to /template/faq (needs fix)', async ({ page }) => {
      await page.goto(`${STAGING_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const faqLink = page.locator('a').filter({ hasText: 'FAQ' }).first();
      await expect(faqLink).toHaveAttribute('href', /\/template\/faq/);
    });

    test('homepage still shows Cargo+ template content', async ({ page }) => {
      await page.goto(`${STAGING_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await expect(page.locator('h1')).toHaveText('We move the world forward');
    });

    test('no console errors on products page', async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto(`${STAGING_URL}/products`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
    });
  });
});
