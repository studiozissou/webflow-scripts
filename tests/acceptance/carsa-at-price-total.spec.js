/**
 * Acceptance tests for at-price-total (Carsa VDP)
 *
 * Verifies the AutoTrader market value span is filled with the
 * comma-formatted £ sum of the saving and the Carsa cash price.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const STAGING_URL = process.env.STAGING_URL_CARSA || 'https://carsa-v2.webflow.io';
const VDP_PATH = '/vehicles/used/ef72otu';
const BLOCK = '.autotrader_price-info';

async function loadPage(page) {
  await page.goto(`${STAGING_URL}${VDP_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
  await page.waitForTimeout(1500);
}

function toNumber(text) {
  return Number(String(text).replace(/[^0-9.-]+/g, ''));
}

test.describe('carsa-at-price-total', () => {
  test('fills at-value with the comma-formatted £ sum of saving and carsa price', async ({ page }) => {
    await loadPage(page);
    const value = await page.locator(`${BLOCK} [data-price="at-value"]`).textContent();
    expect(value).toMatch(/^£\d{1,3}(,\d{3})*$/);
  });

  test('at-value equals at-saving plus carsa-price numerically', async ({ page }) => {
    await loadPage(page);
    const saving = toNumber(await page.locator(`${BLOCK} [data-price="at-saving"]`).textContent());
    const price = toNumber(await page.locator(`${BLOCK} [data-price="carsa-price"]`).textContent());
    const value = toNumber(await page.locator(`${BLOCK} [data-price="at-value"]`).textContent());
    expect(value).toBe(Math.round(saving + price));
  });

  test('exposes CarsaAtPriceTotal global', async ({ page }) => {
    await loadPage(page);
    const loaded = await page.evaluate(() => typeof window.CarsaAtPriceTotal === 'object');
    expect(loaded).toBe(true);
  });

  test('no console or page errors on the VDP', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await loadPage(page);
    const own = errors.filter((e) => /at-price-total|CarsaAtPriceTotal/.test(e));
    expect(own).toEqual([]);
  });
});
