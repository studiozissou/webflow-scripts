// @ts-check
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Known JS errors from Webflow or third-party scripts (not our code)
const KNOWN_ERRORS = [];

// WCAG 2.1 AA rules to enforce
const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa'];

// Webflow-generated elements outside our control — exclude from violations
const EXCLUDE_FROM_AUDIT = [
  // e.g. '[data-wf-domain]', '.w-webflow-badge'
];

test.describe('WCAG 2.1 AA — __CLIENT_NAME__ Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('no WCAG 2.1 AA violations', async ({ page }) => {
    const builder = new AxeBuilder({ page }).withTags(WCAG_AA_TAGS);
    if (EXCLUDE_FROM_AUDIT.length) builder.exclude(EXCLUDE_FROM_AUDIT);

    const results = await builder.analyze();

    if (results.violations.length > 0) {
      const summary = results.violations
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.html).join(' | ')}`
        )
        .join('\n\n');
      expect.soft(
        results.violations,
        `WCAG violations:\n${summary}`
      ).toHaveLength(0);
    }
  });

  test('nav links are keyboard focusable', async ({ page }) => {
    const navLinks = page.locator(
      'nav a, [role="navigation"] a, .w-nav a'
    );
    const count = await navLinks.count();
    for (let i = 0; i < count; i++) {
      const el = navLinks.nth(i);
      const isVisible = await el.isVisible();
      if (!isVisible) continue;
      const tabIndex = await el.evaluate((el) => el.tabIndex);
      expect(tabIndex).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('prefers-reduced-motion — __CLIENT_NAME__', () => {
  test.use({ reducedMotion: 'reduce' });

  test('homepage: page loads and is interactive', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const unexpected = errors.filter(
      (e) => !KNOWN_ERRORS.some((known) => e.message.includes(known))
    );
    expect(
      unexpected,
      `JS errors under reduced-motion: ${unexpected.map((e) => e.message).join(', ')}`
    ).toHaveLength(0);

    await expect(page.locator('body')).toBeVisible();
  });
});
