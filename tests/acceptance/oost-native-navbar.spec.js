// Acceptance tests for oost-native-navbar: the OOST nav is Webflow's native Navbar, collapses at tablet, and its menu button opens a panel with the four links and Reserveer.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = process.env.OOST_URL || 'https://www.oosteten.nl';
const PAGES = [
  '/',
  '/afhalen',
  '/catering',
  '/privacybeleid',
  '/algemene-voorwaarden',
  '/en',
  '/en/afhalen',
  '/en/catering',
  '/en/privacybeleid',
  '/en/algemene-voorwaarden',
  '/pagina-bestaat-niet',
];
const LABELS = {
  nl: ['Menukaart', 'Afhalen', 'Catering', 'Over ons'],
  en: ['Menu', 'Takeaway', 'Catering', 'About us'],
};
const PANEL_PAGES = [
  ['/', 'nl'],
  ['/en', 'en'],
  ['/afhalen', 'nl'],
];
const PHONE = { width: 375, height: 812 };
const TABLET = { width: 820, height: 1180 };
const DESKTOP = { width: 1280, height: 800 };

const nav = (page) => page.locator('.nav_component.w-nav');
const menuLinks = (page) => page.locator('.w-nav-menu .nav_link:visible');
const menuButton = (page) => page.locator('.w-nav-button');

async function open(page, path, size) {
  await page.setViewportSize(size);
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 });
}

test.describe('oost-native-navbar', () => {
  test('nav is a native Webflow Navbar collapsing at tablet', async ({ page }) => {
    await open(page, '/', DESKTOP);
    await expect(nav(page)).toHaveCount(1);
    await expect(nav(page)).toHaveAttribute('data-collapse', 'medium');
    await expect(page.locator('.w-nav-brand')).toHaveCount(1);
    await expect(page.locator('.w-nav-menu')).toHaveCount(1);
    await expect(menuButton(page)).toHaveCount(1);
  });

  test('desktop shows links, locale switch and Reserveer in the bar', async ({
    page,
  }) => {
    await open(page, '/', DESKTOP);
    await expect(menuLinks(page)).toHaveCount(4);
    await expect(menuButton(page)).toBeHidden();
    await expect(
      page.locator('.nav_component [data-formitable="open"]:visible'),
    ).toHaveCount(1);
    await expect(page.locator('.nav_component .nav_locales-list')).toBeVisible();
  });

  for (const [name, size] of [
    ['tablet', TABLET],
    ['phone', PHONE],
  ]) {
    test(`${name} hides links and shows the menu button`, async ({ page }) => {
      await open(page, '/', size);
      await expect(menuButton(page)).toBeVisible();
      await expect(menuLinks(page)).toHaveCount(0);
    });
  }

  test('menu button opens and closes the panel with aria-expanded', async ({ page }) => {
    await open(page, '/', PHONE);
    const button = menuButton(page);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(menuLinks(page)).toHaveCount(4);
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(menuLinks(page)).toHaveCount(0, { timeout: 2000 });
  });

  for (const [path, lang] of PANEL_PAGES) {
    test(`open panel lists four links and a Reserveer button on ${path}`, async ({
      page,
    }) => {
      await open(page, path, PHONE);
      await menuButton(page).click();
      await page.waitForTimeout(500);
      const labels = await menuLinks(page).allTextContents();
      expect(labels.map((t) => t.trim())).toEqual(LABELS[lang]);
      await expect(
        page.locator('.w-nav-menu [data-formitable="open"]:visible'),
      ).toHaveCount(1);
    });
  }

  test('EN nav labels are English and hrefs stay on /en', async ({ page }) => {
    await open(page, '/en', DESKTOP);
    const labels = await menuLinks(page).allTextContents();
    expect(labels.map((t) => t.trim())).toEqual(LABELS.en);
    const hrefs = await page
      .locator('.w-nav-menu .nav_link')
      .evaluateAll((els) => els.map((a) => a.getAttribute('href')));
    for (const href of hrefs) expect(href).toMatch(/^(\/en(\/|#|$)|#[\w-]+$)/);
    await expect(page.locator('.w-nav-menu')).toHaveAttribute('aria-label', 'Main menu');
    await expect(
      page.locator('.nav_component [data-formitable="open"]:visible'),
    ).toHaveText(/Book a table/);
  });

  test('desktop order is links, locale switch, Reserveer', async ({ page }) => {
    await open(page, '/', DESKTOP);
    const x = async (sel) => (await page.locator(sel).first().boundingBox()).x;
    const lastLink = (await menuLinks(page).last().boundingBox()).x;
    const locales = await x('.nav_component .nav_locales-list');
    const reserve = await x('.nav_component [data-formitable="open"]:visible');
    expect(lastLink).toBeLessThan(locales);
    expect(locales).toBeLessThan(reserve);
  });

  test('anchor link in the panel closes the panel', async ({ page }) => {
    await open(page, '/', PHONE);
    await menuButton(page).click();
    await page.waitForTimeout(500);
    await menuLinks(page).filter({ hasText: 'Menukaart' }).click();
    await page.waitForTimeout(1500);
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    const top = await page
      .locator('#menukaart')
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top)).toBeLessThan(200);
  });

  test('locale switch stays in the bar on phones', async ({ page }) => {
    await open(page, '/', PHONE);
    await expect(page.locator('.nav_component .nav_locales-list')).toBeVisible();
  });

  for (const path of PAGES) {
    test(`no Relume leftovers or dead hamburger link on ${path}`, async ({ page }) => {
      await open(page, path, DESKTOP);
      const html = await page.content();
      expect(html).not.toContain('navbar1_');
      expect(html).not.toContain('menu-icon1');
      await expect(page.locator('a.nav_menu-button[href="#"]')).toHaveCount(0);
      await expect(nav(page)).toHaveCount(1);
    });

    test(`no console errors on ${path}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await open(page, path, PHONE);
      await page.waitForTimeout(1500);
      expect(errors).toEqual([]);
    });
  }
});
