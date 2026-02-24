// @ts-check
const { test, expect } = require('@playwright/test');

// Wait for all RHP modules to finish loading
async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, { timeout: 20_000 });
}

test.describe('Homepage', () => {
  /** @type {Error[]} */
  let jsErrors;

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err));
    await page.goto('/');
    await waitForRHP(page);
  });

  test('loads without uncaught JS errors', async ({ page }) => {
    // Allow a brief settle for any deferred throws
    await page.waitForTimeout(500);
    expect(jsErrors, `JS errors: ${jsErrors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });

  test('RHP modules all loaded', async ({ page }) => {
    const check = await page.evaluate(() => window.RHP?.scriptsCheck);
    expect(check.failed).toHaveLength(0);
  });

  test('key elements present', async ({ page }) => {
    await expect(page.locator('[data-barba="wrapper"]')).toBeAttached();
    await expect(page.locator('[data-barba="container"]')).toBeAttached();
    await expect(page.locator('.dial_component')).toBeAttached();
    await expect(page.locator('#dial_ticks-canvas')).toBeAttached();
    await expect(page.locator('.nav')).toBeAttached();
    await expect(page.locator('.nav_logo-link')).toBeAttached();
    await expect(page.locator('.nav_about-link')).toBeAttached();
    await expect(page.locator('.nav_contact-link')).toBeAttached();
  });

  test('generic video element created by work-dial', async ({ page }) => {
    const el = page.locator('.dial_generic-video');
    await expect(el).toBeAttached();
    const src = await el.getAttribute('src');
    expect(src).toBeTruthy();
  });

  test('nav about-link has a valid href', async ({ page }) => {
    const href = await page.locator('.nav_about-link').getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toBe('#');
  });

  test('nav logo-link has a valid href', async ({ page }) => {
    const href = await page.locator('.nav_logo-link').getAttribute('href');
    expect(href).toBeTruthy();
  });
});

test.describe('Barba transitions', () => {
  test('home → about: no JS errors, about namespace mounts', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/');
    await waitForRHP(page);

    // Navigate to about via Barba (click the nav link)
    await Promise.all([
      page.waitForFunction(
        () => document.querySelector('[data-barba-namespace="about"]') !== null,
        { timeout: 15_000 }
      ),
      page.locator('.nav_about-link').click(),
    ]);

    await page.waitForTimeout(500);

    expect(errors, `JS errors during transition: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
    await expect(page.locator('[data-barba-namespace="about"]')).toBeAttached();
  });

  test('about → home: no JS errors, home namespace mounts', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/about');
    await waitForRHP(page);

    await Promise.all([
      page.waitForFunction(
        () => document.querySelector('[data-barba-namespace="home"]') !== null,
        { timeout: 15_000 }
      ),
      page.locator('.nav_logo-link').click(),
    ]);

    await page.waitForTimeout(500);

    expect(errors, `JS errors during transition: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
    await expect(page.locator('[data-barba-namespace="home"]')).toBeAttached();
  });
});

test.describe('About page', () => {
  test('loads without uncaught JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/about');
    await waitForRHP(page);
    await page.waitForTimeout(500);

    expect(errors, `JS errors: ${errors.map(e => e.message).join(', ')}`).toHaveLength(0);
  });

  test('about dial canvas present', async ({ page }) => {
    await page.goto('/about');
    await waitForRHP(page);
    await expect(page.locator('.about_dial-wrapper')).toBeAttached();
  });
});
