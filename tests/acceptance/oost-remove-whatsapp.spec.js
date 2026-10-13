// Acceptance tests for oost-remove-whatsapp: no WhatsApp link, wording, schema line or processor mention on oosteten (NL + EN, legal pages, 404), WhatsApp buttons became call links, /afhalen tells people to walk in if nobody answers, and llms.txt matches.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.OOST_URL || 'https://oosteten.webflow.io').replace(/\/$/, '');
const TEL = 'tel:+31237851562';
const LLMS = fileURLToPath(new URL('../../projects/oost/llms.txt', import.meta.url));
const IGNORED_CONSOLE = /consentpro|gtag|googletagmanager|zenchef|turnstile|cloudflare|jsdelivr/i;
const WHATSAPP_WORDING = /whats\s?app|\bapp ons\b|\bapp je\b|\bapp of bel\b|\bbel of app\b|text your order|message us|text or call/i;

const PAGES = [
  '/',
  '/afhalen',
  '/catering',
  '/privacybeleid',
  '/algemene-voorwaarden',
  '/pagina-bestaat-niet',
  '/en',
  '/en/afhalen',
  '/en/catering',
  '/en/privacybeleid',
  '/en/algemene-voorwaarden',
  '/en/pagina-bestaat-niet',
];

const LOCALES = [
  { label: 'NL', prefix: '', call: 'Bel ons', callOrder: 'Bel je bestelling door', walkIn: /kom gewoon langs/i, route: 'Route' },
  { label: 'EN', prefix: '/en', call: 'Call us', callOrder: 'Call in your order', walkIn: /drop by/i, route: 'Directions' },
];

async function visibleTextAndSchema(page) {
  return page.evaluate(() => {
    const schema = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent);
    return [document.body.innerText, ...schema].join('\n');
  });
}

test.describe('oost-remove-whatsapp', () => {
  test.skip(process.env.OOST_NO_WHATSAPP !== '1', 'Set OOST_NO_WHATSAPP=1 once the Webflow edits are on the target site.');

  for (const path of PAGES) {
    test.describe(path, () => {
      let errors;

      test.beforeEach(async ({ page }) => {
        errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        page.on('console', (msg) => {
          const notFoundSelf = path.includes('pagina-bestaat-niet') && /status of 404/.test(msg.text());
          if (msg.type() === 'error' && !IGNORED_CONSOLE.test(msg.text()) && !notFoundSelf) errors.push(msg.text());
        });
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      });

      test('no WhatsApp link', async ({ page }) => {
        const hrefs = await page.$$eval('a[href]', (els) => els.map((a) => a.getAttribute('href')));
        expect(hrefs.filter((h) => /wa\.me|whatsapp/i.test(h))).toEqual([]);
      });

      test('no WhatsApp wording in visible text or JSON-LD', async ({ page }) => {
        const text = await visibleTextAndSchema(page);
        expect(text.match(WHATSAPP_WORDING)).toBeNull();
      });

      test('every tel: link dials the restaurant line', async ({ page }) => {
        const tels = await page.$$eval('a[href^="tel:"]', (els) => els.map((a) => a.getAttribute('href')));
        expect(tels.length).toBeGreaterThan(0);
        for (const t of tels) expect(t).toBe(TEL);
      });

      test('no console errors', async ({ page }) => {
        await page.waitForLoadState('load');
        await page.waitForTimeout(1000);
        expect(errors).toEqual([]);
      });
    });
  }

  for (const { label, prefix, call, callOrder, walkIn, route } of LOCALES) {
    test(`${label} /afhalen hero offers one call button and the walk-in line`, async ({ page }) => {
      await page.goto(`${BASE}${prefix}/afhalen`, { waitUntil: 'domcontentloaded' });
      const hero = page.locator('.section_afhalen-hero');
      const buttons = hero.locator('.button-group a');
      await expect(buttons).toHaveCount(1);
      await expect(buttons.first()).toHaveAttribute('href', TEL);
      await expect(buttons.first()).not.toHaveClass(/is-secondary/);
      await expect(hero).toContainText(walkIn);
    });

    test(`${label} /afhalen pickup-times section has a call-in-your-order button`, async ({ page }) => {
      await page.goto(`${BASE}${prefix}/afhalen`, { waitUntil: 'domcontentloaded' });
      const button = page.locator('.section_afhalen-tijden .button-group a', { hasText: callOrder });
      await expect(button).toHaveCount(1);
      await expect(button).toHaveAttribute('href', TEL);
    });

    test(`${label} home, catering and 404 secondary buttons call instead of WhatsApp`, async ({ page }) => {
      const checks = [
        { path: prefix || '/', section: '.section_home-hero' },
        { path: `${prefix}/catering`, section: '.section_catering-hero' },
        { path: `${prefix}/catering`, section: '.section_catering-regio' },
        { path: `${prefix}/pagina-bestaat-niet`, section: '.section_notfound-hero' },
      ];
      for (const { path, section } of checks) {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
        const button = page.locator(`${section} .button.is-secondary`, { hasText: call });
        await expect(button, `${path} ${section}`).toHaveCount(1);
        await expect(button, `${path} ${section}`).toHaveAttribute('href', TEL);
      }
    });

    test(`${label} footer has no WhatsApp link but keeps ${route}`, async ({ page }) => {
      await page.goto(`${BASE}${prefix || '/'}`, { waitUntil: 'domcontentloaded' });
      const links = page.locator('.footer_links a');
      await expect(links.filter({ hasText: route })).toHaveCount(1);
      const hrefs = await links.evaluateAll((els) => els.map((a) => a.getAttribute('href')));
      expect(hrefs.filter((h) => h.includes('wa.me'))).toEqual([]);
    });

    test(`${label} privacy policy no longer names Meta or WhatsApp`, async ({ page }) => {
      await page.goto(`${BASE}${prefix}/privacybeleid`, { waitUntil: 'domcontentloaded' });
      const text = await page.locator('.text-rich-text').first().innerText();
      expect(text).not.toMatch(/whats\s?app/i);
      expect(text).not.toMatch(/\bMeta\b/);
      expect(text).toContain('Zenchef');
    });
  }

  test('llms.txt carries no WhatsApp and mentions walking in', () => {
    const txt = readFileSync(LLMS, 'utf8');
    expect(txt).not.toMatch(/whats\s?app/i);
    expect(txt).toContain('023-785 1562');
    expect(txt).toMatch(/walk in/i);
  });
});
