const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const STAGING_URL = process.env.STAGING_URL || 'https://rhpcircle.webflow.io';

/**
 * Wait for RHP scripts to finish loading.
 * Polls window.RHP?.scriptsOk with a 20s timeout.
 */
async function waitForRHP(page) {
  await page.waitForFunction(() => window.RHP?.scriptsOk === true, {
    timeout: 20_000,
    polling: 500
  });
}

test.describe('feat-dev-cdn-source-switch', () => {

  test('sets localStorage when ?rhp=local is present', async ({ page }) => {
    await page.goto(`${STAGING_URL}?rhp=local`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000
    });
    const value = await page.evaluate(() => localStorage.getItem('rhp-source'));
    expect(value).toBe('local');
  });

  test('clears localStorage when ?rhp=cdn is present', async ({ page }) => {
    // Pre-set the key, then navigate with ?rhp=cdn
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.evaluate(() => localStorage.setItem('rhp-source', 'local'));
    await page.goto(`${STAGING_URL}?rhp=cdn`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000
    });
    const value = await page.evaluate(() => localStorage.getItem('rhp-source'));
    expect(value).toBeNull();
  });

  test('does not set localStorage when no rhp param', async ({ page }) => {
    // Ensure clean state
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.evaluate(() => localStorage.removeItem('rhp-source'));
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const value = await page.evaluate(() => localStorage.getItem('rhp-source'));
    expect(value).toBeNull();
  });

  test('logs source indicator to console', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'log') consoleLogs.push(msg.text());
    });
    await page.goto(`${STAGING_URL}?rhp=cdn`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000
    });
    await waitForRHP(page);
    const hasSourceLog = consoleLogs.some(log =>
      log.includes('[RHP] SOURCE:')
    );
    expect(hasSourceLog).toBe(true);
  });

  test('no console errors with ?rhp=local (graceful fail)', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${STAGING_URL}?rhp=local`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000
    });
    // Wait a bit for any load errors to surface
    await page.waitForTimeout(5000);
    // Filter out known benign errors and expected localhost connection failures
    const critical = errors.filter(e =>
      !e.includes('third-party') &&
      !e.includes('analytics') &&
      !e.includes('favicon') &&
      !e.includes('localhost') &&
      !e.includes('ERR_CONNECTION_REFUSED') &&
      !e.includes('Failed to load')
    );
    expect(critical).toEqual([]);
  });

  test('no console errors with ?rhp=cdn', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${STAGING_URL}?rhp=cdn`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000
    });
    await waitForRHP(page);
    const critical = errors.filter(e =>
      !e.includes('third-party') &&
      !e.includes('analytics') &&
      !e.includes('favicon')
    );
    expect(critical).toEqual([]);
  });

  test('RHP.scriptsOk true on CDN (default)', async ({ page }) => {
    // Clear any localStorage override first
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.evaluate(() => localStorage.removeItem('rhp-source'));
    await page.goto(STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await waitForRHP(page);
    const scriptsOk = await page.evaluate(() => window.RHP?.scriptsOk);
    expect(scriptsOk).toBe(true);
  });
});
