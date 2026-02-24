// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 20_000 });
}

// WCAG 2.1 AA rules to enforce
const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa'];

// Webflow-generated elements that are outside our control — exclude from violations
// Add selectors here only if a violation is provably from Webflow's own HTML, not our code
const EXCLUDE_FROM_AUDIT = [
  // e.g. '[data-wf-domain]', '.w-webflow-badge'
];

test.describe('WCAG 2.1 AA — Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForRHP(page);
    // Wait for intro animation to settle so the audited DOM is in its final state
    await page.waitForTimeout(2000);
  });

  test('no WCAG 2.1 AA violations', async ({ page }) => {
    const builder = new AxeBuilder({ page }).withTags(WCAG_AA_TAGS);
    if (EXCLUDE_FROM_AUDIT.length) builder.exclude(EXCLUDE_FROM_AUDIT);

    const results = await builder.analyze();

    if (results.violations.length > 0) {
      const summary = results.violations.map(v =>
        `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map(n => n.html).join(' | ')}`
      ).join('\n\n');
      expect.soft(results.violations, `WCAG violations:\n${summary}`).toHaveLength(0);
    }
  });

  test('dial canvas has aria-hidden (decorative)', async ({ page }) => {
    const canvas = page.locator('#dial_ticks-canvas');
    const ariaHidden = await canvas.getAttribute('aria-hidden');
    // Canvas is decorative — must be hidden from screen readers
    expect(ariaHidden).toBe('true');
  });

  test('nav links are keyboard focusable', async ({ page }) => {
    for (const sel of ['.nav_logo-link', '.nav_about-link', '.nav_contact-link']) {
      const el = page.locator(sel);
      await expect(el).toBeVisible();
      // Check element is reachable via Tab (tabindex not -1)
      const tabIndex = await el.evaluate(el => el.tabIndex);
      expect(tabIndex).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('WCAG 2.1 AA — About page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
    await waitForRHP(page);
    await page.waitForTimeout(1000);
  });

  test('no WCAG 2.1 AA violations', async ({ page }) => {
    const builder = new AxeBuilder({ page }).withTags(WCAG_AA_TAGS);
    if (EXCLUDE_FROM_AUDIT.length) builder.exclude(EXCLUDE_FROM_AUDIT);

    const results = await builder.analyze();

    if (results.violations.length > 0) {
      const summary = results.violations.map(v =>
        `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map(n => n.html).join(' | ')}`
      ).join('\n\n');
      expect.soft(results.violations, `WCAG violations:\n${summary}`).toHaveLength(0);
    }
  });
});

test.describe('prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('homepage: key elements visible after intro (no stuck animations)', async ({ page }) => {
    await page.goto('/');
    await waitForRHP(page);

    // With reduced-motion the intro should complete near-instantly
    // Give a generous settle period
    await page.waitForTimeout(2000);

    // Nav should be visible — intro animation must have completed
    await expect(page.locator('.nav')).toBeVisible();

    // Dial ticks layer should be visible
    await expect(page.locator('.dial_layer-ticks')).toBeVisible();

    // Dial component itself should be present and not have opacity 0
    const dialOpacity = await page.locator('.dial_component').evaluate(
      el => parseFloat(window.getComputedStyle(el).opacity)
    );
    expect(dialOpacity).toBeGreaterThan(0);
  });

  test('homepage: RHP.workDial is initialised under reduced-motion', async ({ page }) => {
    await page.goto('/');
    await waitForRHP(page);
    await page.waitForTimeout(2000);

    const dialReady = await page.evaluate(
      () => typeof window.RHP?.workDial?.getActiveIndex === 'function'
    );
    expect(dialReady).toBe(true);
  });

  test('about page: text lines not stuck invisible', async ({ page }) => {
    await page.goto('/about');
    await waitForRHP(page);
    await page.waitForTimeout(1000);

    // At least one heading in the about sections should be visible
    const headings = page.locator('.section_about-stories h1, .section_about-stories h2, .section_about-circle h1, .section_about-circle h2');
    const count = await headings.count();
    if (count > 0) {
      await expect(headings.first()).toBeVisible();
    }
  });
});
