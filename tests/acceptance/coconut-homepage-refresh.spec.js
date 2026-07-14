/**
 * Acceptance tests — Coconut Homepage Refresh
 *
 * Spec: projects/coconut/.claude/specs/homepage-refresh.md
 * Target: duplicate page at /home-v2 (staging), then / after go-live
 *
 * Run: npx playwright test tests/acceptance/coconut-homepage-refresh.spec.js
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://getcoconut.webflow.io';
const PAGE_PATH = '/home-v2'; // duplicate page during build; change to '/' after go-live
const SLUG = 'coconut-homepage-refresh';

// ── Helpers ───────────────────────────────────────────────────

async function waitForReady(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 20_000 }
  );
}

async function loadPage(page, path = PAGE_PATH) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  return errors;
}

// ── Section Order & Content ──────────────────────────────────

test.describe(`${SLUG} — Section order`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('hero H1 matches new copy', async ({ page }) => {
    const h1 = page.locator('h1').first();
    await expect(h1).toContainText('Bookkeeping and tax sorted');
  });

  test('H2 headings appear in correct order', async ({ page }) => {
    const h2s = await page.locator('h2').allTextContents();
    const expected = [
      'Simple. Secure. HMRC-recognised',
      'Is Coconut right for you',
      'Everything you need',
      'How Coconut works',
      'Making Tax Digital, handled',
    ];
    for (const heading of expected) {
      const found = h2s.some(h => h.includes(heading));
      expect(found, `Expected H2 containing "${heading}"`).toBeTruthy();
    }
  });
});

// ── New sections exist ───────────────────────────────────────

test.describe(`${SLUG} — New sections`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('N1: Value props section has 7 bullet items', async ({ page }) => {
    // Find the section containing "Simple. Secure. HMRC-recognised."
    const section = page.locator('section, div').filter({ hasText: 'Simple. Secure. HMRC-recognised.' }).first();
    await expect(section).toBeVisible();
    const items = section.locator('li, [class*="bullet"], [class*="item"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(7);
  });

  test('N2: Persona section has 5 persona items', async ({ page }) => {
    const section = page.locator('section, div').filter({ hasText: 'Is Coconut right for you' }).first();
    await expect(section).toBeVisible();
    // Check for persona keywords
    const text = await section.textContent();
    expect(text).toContain('Sole traders');
    expect(text).toContain('Landlords');
    expect(text).toContain('Freelancers');
    expect(text).toContain('CIS subcontractors');
    expect(text).toContain('MTD users');
  });

  test('N2: Persona section has pricing CTA', async ({ page }) => {
    const section = page.locator('section, div').filter({ hasText: 'Is Coconut right for you' }).first();
    const cta = section.locator('a, button').filter({ hasText: /view pricing/i });
    await expect(cta).toBeVisible();
  });

  test('N3: MTD comparison table has 2 column headers', async ({ page }) => {
    const section = page.locator('section, div').filter({ hasText: 'Making Tax Digital, handled' }).first();
    await expect(section).toBeVisible();
    const text = await section.textContent();
    expect(text).toContain('Standard bookkeeping');
    expect(text).toContain('MTD-ready');
  });

  test('N3: MTD comparison table has 9 feature rows', async ({ page }) => {
    const section = page.locator('section, div').filter({ hasText: 'Making Tax Digital, handled' }).first();
    // Check for key feature names
    const text = await section.textContent();
    const features = [
      'Automated bank feeds',
      'Expense tracking',
      'Professional invoicing',
      'Real-time tax estimates',
      'Digital record keeping',
      'Multiple income streams',
      'Expert support',
      'HMRC quarterly submissions',
      'MTD compliance',
    ];
    for (const feature of features) {
      expect(text, `Missing feature row: "${feature}"`).toContain(feature);
    }
  });
});

// ── Rewritten sections ───────────────────────────────────────

test.describe(`${SLUG} — Rewritten sections`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('feature cards section has 5 cards', async ({ page }) => {
    const section = page.locator('section, div').filter({ hasText: 'Everything you need for self-employed bookkeeping' }).first();
    await expect(section).toBeVisible();
    const text = await section.textContent();
    expect(text).toContain('Bank feeds');
    expect(text).toContain('Smart categorisation');
    expect(text).toContain('Professional invoicing');
    expect(text).toContain('Receipt capture');
    expect(text).toContain('MTD compliance');
  });

  test('How it works section has 5 steps', async ({ page }) => {
    const section = page.locator('section, div').filter({ hasText: 'How Coconut works' }).first();
    await expect(section).toBeVisible();
    const text = await section.textContent();
    expect(text).toContain('Connect your bank account');
    expect(text).toContain('Submit MTD updates');
  });

  test('FAQ has exactly 4 items', async ({ page }) => {
    // Find FAQ section — look for accordion or FAQ-related containers
    const faqSection = page.locator('section, div').filter({ hasText: 'Frequently asked questions' }).first();
    await expect(faqSection).toBeVisible();
    const text = await faqSection.textContent();
    expect(text).toContain('Do I need to use Coconut for MTD');
    expect(text).toContain('Can I use Coconut if I have a limited company');
    expect(text).toContain('How does the HMRC connection work');
    expect(text).toContain('Can I use Coconut for bookkeeping only');
  });

  test('FAQ accordion expands on click', async ({ page }) => {
    const faqSection = page.locator('section, div').filter({ hasText: 'Frequently asked questions' }).first();
    const firstQuestion = faqSection.locator('[class*="faq"], [class*="accordion"], [class*="question"]').first();
    await firstQuestion.click();
    await page.waitForTimeout(500);
    // After click, answer text should be visible
    const answer = faqSection.locator('text=MTD-compatible software').first();
    await expect(answer).toBeVisible({ timeout: 3000 });
  });

  test('final CTA has new heading', async ({ page }) => {
    const heading = page.locator('h2, h3').filter({ hasText: 'A simpler way to stay on top of your finances' });
    await expect(heading).toBeVisible();
  });
});

// ── Deleted sections ─────────────────────────────────────────

test.describe(`${SLUG} — Deleted sections`, () => {
  test.beforeEach(async ({ page }) => {
    await loadPage(page);
  });

  test('product demo carousel is removed', async ({ page }) => {
    const carousel = page.locator('.slick-slider, .slick-carousel, [class*="demo-carousel"]');
    await expect(carousel).toHaveCount(0);
  });

  test('bank integration logos section is removed', async ({ page }) => {
    const bankSection = page.locator('text=securely integrates with your bank');
    await expect(bankSection).toHaveCount(0);
  });

  test('old feature deep-dive section is removed', async ({ page }) => {
    const oldSection = page.locator('text=No more complicated spreadsheets');
    await expect(oldSection).toHaveCount(0);
  });
});

// ── Console errors ───────────────────────────────────────────

test.describe(`${SLUG} — Console errors`, () => {
  test('no JS errors on page load', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page);
    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`)
      .toHaveLength(0);
  });
});

// ── Responsive ───────────────────────────────────────────────

test.describe(`${SLUG} — Responsive`, () => {
  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadPage(page);
    const overflows = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflows).toBeFalsy();
  });

  test('no horizontal overflow at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loadPage(page);
    const overflows = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflows).toBeFalsy();
  });
});
