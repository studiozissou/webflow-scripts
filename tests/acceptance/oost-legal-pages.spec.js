// Acceptance tests for oost-legal-pages: /privacybeleid and /algemene-voorwaarden exist in NL and EN, the footer carries the MultiSafepay company details and legal links, and the cookie-settings link opens ConsentPro.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.OOST_URL || 'https://www.oosteten.nl').replace(/\/$/, '');
const PRIVACY = '/privacybeleid';
const TERMS = '/algemene-voorwaarden';
const PAGES = ['/', '/afhalen', '/catering', PRIVACY, TERMS];
const PLACEHOLDER = /\b[A-Z][A-Z_]{5,}\b/;
const IGNORED_CONSOLE = /consentpro|gtag|googletagmanager|zenchef|jsdelivr/i;

async function loadPage(page, path) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
  await page.waitForTimeout(1500);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !IGNORED_CONSOLE.test(msg.text())) errors.push(msg.text());
  });
  return errors;
}

test.describe('oost-legal-pages', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('privacy page loads with the heading in the cream section', async ({ page }) => {
    const response = await page.goto(BASE + PRIVACY);
    expect(response.status()).toBe(200);
    const h1 = page.locator('section.section_privacy-content.scheme-cream > .padding-global > .container-small h1');
    await expect(h1).toHaveText('Privacybeleid');
  });

  test('privacy meta row shows last-updated, controller, contact and KvK', async ({ page }) => {
    await loadPage(page, PRIVACY);
    const meta = page.locator('.legal_meta');
    await expect(meta.locator(':scope > div')).toHaveCount(4);
    const text = await meta.innerText();
    expect(text).toContain('Laatst bijgewerkt');
    expect(text).toMatch(/\d{1,2} \w+ 20\d\d/);
    expect(text).toContain('42064913');
    await expect(meta.locator('a[href^="mailto:"]')).toHaveCount(1);
  });

  test('privacy rich text covers every processor and has no placeholders left', async ({ page }) => {
    await loadPage(page, PRIVACY);
    const rich = page.locator('.text-rich-text');
    await expect(rich).toBeVisible();
    expect(await rich.locator('h2').count()).toBeGreaterThanOrEqual(8);
    const text = await rich.innerText();
    for (const term of ['Google Analytics', 'Zenchef', 'Webflow', 'Autoriteit Persoonsgegevens', 'NL869546223B01']) {
      expect(text, `policy mentions ${term}`).toContain(term);
    }
    expect(text, 'policy no longer mentions WhatsApp').not.toMatch(/whats\s?app/i);
    expect(text).not.toMatch(PLACEHOLDER);
  });

  test('terms page loads and covers cancellation, no herroepingsrecht and Dutch law', async ({ page }) => {
    const response = await page.goto(BASE + TERMS);
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Algemene voorwaarden');
    const text = await page.locator('.text-rich-text').innerText();
    for (const term of ['herroepingsrecht', 'annuler', 'Nederlands recht', 'NL869546223B01']) {
      expect(text.toLowerCase(), `terms mention ${term}`).toContain(term.toLowerCase());
    }
    expect(text).not.toMatch(PLACEHOLDER);
  });

  test('prose column is at most 48rem wide on desktop', async ({ page }) => {
    for (const path of [PRIVACY, TERMS]) {
      await loadPage(page, path);
      const box = await page.locator('.text-rich-text').boundingBox();
      expect(box, `${path} rich text is rendered`).not.toBeNull();
      expect(box.width, `${path} column width`).toBeLessThanOrEqual(770);
    }
  });

  test('no horizontal scroll on a 390px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [PRIVACY, TERMS]) {
      await loadPage(page, path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(0);
      await expect(page.locator('.legal_meta')).toBeVisible();
    }
  });

  test('footer carries the MultiSafepay company details', async ({ page }) => {
    await loadPage(page, '/');
    const footer = page.locator('footer.footer_layout');
    const text = await footer.innerText();
    for (const term of ['Restaurant Oost', 'KvK 42064913', 'BTW NL869546223B01', 'Zijlweg 82']) {
      expect(text, `footer shows ${term}`).toContain(term);
    }
    await expect(footer.locator('a[href^="tel:"]')).toHaveCount(1);
    await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(1);
  });

  test('footer links to privacy, terms and cookie settings on every page', async ({ page }) => {
    for (const path of PAGES) {
      await loadPage(page, path);
      const nav = page.locator('nav.footer_nav');
      await expect(nav.locator(`a[href="${PRIVACY}"]`), `${path} privacy link`).toHaveText('Privacybeleid');
      await expect(nav.locator(`a[href="${TERMS}"]`), `${path} terms link`).toHaveText('Algemene voorwaarden');
      await expect(nav.locator('a[fs-consent-element="open-preferences"]'), `${path} cookie link`).toHaveText('Cookie-instellingen');
    }
  });

  test('cookie settings link opens the ConsentPro preferences panel', async ({ page }) => {
    await loadPage(page, PRIVACY);
    const banner = page.locator('[fs-consent-element="banner"]');
    if (await banner.isVisible()) await banner.locator('[fs-consent-element="deny"]').first().click();
    const link = page.locator('nav.footer_nav a[fs-consent-element="open-preferences"]');
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await page.waitForTimeout(500);
    await expect(page.locator('[fs-consent-element="preferences"]')).toBeVisible();
  });

  test('consent banner links to the privacy policy', async ({ page }) => {
    await loadPage(page, '/');
    const banner = page.locator('[fs-consent-element="banner"]');
    await expect(banner).toBeVisible();
    await expect(banner.locator(`a[href="${PRIVACY}"]`)).toHaveCount(1);
  });

  test('EN pages are fully translated', async ({ page }) => {
    const cases = [
      { path: `/en${PRIVACY}`, h1: 'Privacy policy' },
      { path: `/en${TERMS}`, h1: 'Terms and conditions' },
    ];
    for (const { path, h1 } of cases) {
      const response = await page.goto(BASE + path);
      expect(response.status(), `${path} status`).toBe(200);
      await expect(page.locator('h1'), `${path} heading`).toHaveText(h1);
      const body = await page.locator('main').innerText();
      for (const dutch of ['Laatst bijgewerkt', 'Wie zijn wij', 'Cookie-instellingen', 'Algemene voorwaarden']) {
        expect(body, `${path} still contains "${dutch}"`).not.toContain(dutch);
      }
      const nav = page.locator('nav.footer_nav');
      await expect(nav.locator(`a[href="/en${PRIVACY}"]`)).toHaveText('Privacy policy');
      await expect(nav.locator(`a[href="/en${TERMS}"]`)).toHaveText('Terms and conditions');
      await expect(nav.locator('a[fs-consent-element="open-preferences"]')).toHaveText('Cookie settings');
    }
  });

  test('SEO title, description, index status and sitemap entries', async ({ page, request }) => {
    const cases = [
      { path: PRIVACY, title: 'Privacybeleid | Restaurant Oost' },
      { path: TERMS, title: 'Algemene voorwaarden | Restaurant Oost' },
      { path: `/en${PRIVACY}`, title: 'Privacy policy | Restaurant Oost' },
      { path: `/en${TERMS}`, title: 'Terms and conditions | Restaurant Oost' },
    ];
    for (const { path, title } of cases) {
      await page.goto(BASE + path);
      await expect(page, `${path} title`).toHaveTitle(title);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description, `${path} description`).toBeTruthy();
      expect(description.length, `${path} description length`).toBeLessThanOrEqual(160);
      await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    }
    const sitemap = await (await request.get(`${BASE}/sitemap.xml`)).text();
    expect(sitemap).toContain(`${BASE}${PRIVACY}`);
    expect(sitemap).toContain(`${BASE}${TERMS}`);
  });

  test('no console errors on NL and EN pages', async ({ page }) => {
    const errors = collectErrors(page);
    for (const path of [PRIVACY, TERMS, `/en${PRIVACY}`, `/en${TERMS}`]) {
      await loadPage(page, path);
    }
    expect(errors).toEqual([]);
  });

  test('axe: no serious or critical violations', async ({ page }) => {
    for (const path of [PRIVACY, TERMS]) {
      await loadPage(page, path);
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      expect(blocking.map((v) => `${path} ${v.id}: ${v.help}`)).toEqual([]);
    }
  });
});
