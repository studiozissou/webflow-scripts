// Acceptance tests for oost-site-test-remediation: the English pages link, read and share in English, the WhatsApp links use the real number, /en/catering fits a phone, the catering form labels are bound, menu text meets contrast, the Instagram link goes to the restaurant profile, and the booking iframe is named.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.OOST_URL || 'https://oosteten.webflow.io').replace(/\/$/, '');
const NL_PAGES = ['/', '/afhalen', '/catering', '/privacybeleid', '/algemene-voorwaarden'];
const EN_PAGES = ['/en', '/en/afhalen', '/en/catering', '/en/privacybeleid', '/en/algemene-voorwaarden'];
const ALL_PAGES = [...NL_PAGES, ...EN_PAGES];
const PLACEHOLDER_NUMBER = '31600000000';
const INSTAGRAM = /^https:\/\/www\.instagram\.com\/restaurantoost\/?$/;
const PHONE = { width: 375, height: 812 };
const IGNORED_CONSOLE = /consentpro|gtag|googletagmanager|zenchef|turnstile|cloudflare|jsdelivr/i;
const DUTCH_MARKERS = ['Indonesisch', 'Afhalen bij', 'Bestel ', 'voor je feest', 'gekookt zoals'];
const EN_SEO = [
  { path: '/en', twin: '/', title: 'Restaurant Oost | Indonesian food in Haarlem' },
  { path: '/en/afhalen', twin: '/afhalen', title: 'Takeaway from Oost, Indonesian food in Haarlem' },
  { path: '/en/catering', twin: '/catering', title: 'Indonesian catering in Haarlem | Restaurant Oost' },
];

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

async function whatsappLinks(page) {
  return page.locator('a[href*="wa.me/"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
}

async function seoFields(page) {
  return page.evaluate(() => {
    const meta = (selector) => document.querySelector(selector)?.getAttribute('content') || '';
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
    };
  });
}

test.describe('oost-site-test-remediation', () => {
  test.skip(
    process.env.OOST_REMEDIATION !== '1',
    'Set OOST_REMEDIATION=1 once the remediation is on the target site.'
  );
  test.use({ viewport: { width: 1440, height: 900 } });

  test('no page links to the placeholder WhatsApp number', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await loadPage(page, path);
      const links = await whatsappLinks(page);
      expect(links.length, `${path} has WhatsApp links`).toBeGreaterThan(0);
      expect(links.filter((href) => href.includes(PLACEHOLDER_NUMBER)), `${path} placeholder links`).toEqual([]);
    }
  });

  test('English WhatsApp links use the same number as the Dutch pages and prefill English text', async ({ page }) => {
    await loadPage(page, '/');
    const number = (await whatsappLinks(page))[0].match(/wa\.me\/(\d+)/)[1];
    for (const path of EN_PAGES) {
      await loadPage(page, path);
      for (const href of await whatsappLinks(page)) {
        expect(href, `${path} WhatsApp number`).toContain(`wa.me/${number}`);
        expect(decodeURIComponent(href), `${path} WhatsApp prefill`).not.toMatch(/\bHoi\b|\bik wil\b/i);
      }
    }
  });

  test('internal links on English pages stay on English URLs', async ({ page }) => {
    for (const path of EN_PAGES) {
      await loadPage(page, path);
      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll('a[href]')]
          .filter((a) => !a.closest('.w-locales-list'))
          .map((a) => new URL(a.getAttribute('href'), window.location.href))
          .filter((url) => url.origin === window.location.origin && !/^\/en(\/|$)/.test(url.pathname))
          .map((url) => url.pathname + url.hash)
      );
      expect(offenders, `${path} links to Dutch URLs`).toEqual([]);
    }
  });

  test('English menu and about links scroll to sections that exist on /en', async ({ page }) => {
    await loadPage(page, '/en/catering');
    const hashes = await page.locator('.nav_links a[href*="#"]').evaluateAll((links) =>
      links.map((a) => new URL(a.getAttribute('href'), window.location.href).hash)
    );
    expect(hashes.length, 'nav has anchor links').toBeGreaterThan(0);
    await loadPage(page, '/en');
    for (const hash of hashes) {
      await expect(page.locator(hash), `/en has ${hash}`).toHaveCount(1);
    }
  });

  test('English home, takeaway and catering have English titles, descriptions and share text', async ({ page }) => {
    for (const { path, twin, title } of EN_SEO) {
      await loadPage(page, twin);
      const dutch = await seoFields(page);
      await loadPage(page, path);
      const english = await seoFields(page);
      expect(english.title, `${path} title`).toBe(title);
      expect(english.ogTitle, `${path} og:title`).toBe(title);
      expect(english.description, `${path} description`).toBeTruthy();
      expect(english.description.length, `${path} description length`).toBeLessThanOrEqual(160);
      expect(english.description, `${path} description differs from Dutch`).not.toBe(dutch.description);
      expect(english.ogDescription, `${path} og:description differs from Dutch`).not.toBe(dutch.ogDescription);
      for (const marker of DUTCH_MARKERS) {
        expect(english.description, `${path} description contains "${marker}"`).not.toContain(marker);
        expect(english.ogDescription, `${path} og:description contains "${marker}"`).not.toContain(marker);
      }
    }
  });

  test('/en/catering lists the same delivery areas as /catering, one per item', async ({ page }) => {
    await loadPage(page, '/catering');
    const dutch = await page.locator('.region_list .region_item').allInnerTexts();
    await loadPage(page, '/en/catering');
    const english = await page.locator('.region_list .region_item').allInnerTexts();
    expect(dutch.length, 'Dutch region count').toBeGreaterThan(1);
    expect(english.length, 'English region count').toBe(dutch.length);
    for (const name of english) {
      expect(name.trim().length, `region "${name}" is a single place name`).toBeLessThanOrEqual(30);
    }
  });

  test('no page scrolls sideways on a 375px phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    for (const path of ALL_PAGES) {
      await loadPage(page, path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(0);
    }
  });

  test('menu text on the home pages meets 4.5:1 contrast', async ({ page }) => {
    for (const path of ['/', '/en']) {
      await loadPage(page, path);
      const results = await new AxeBuilder({ page }).withRules(['color-contrast']).exclude('iframe').analyze();
      const nodes = results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')));
      expect(nodes, `${path} contrast failures`).toEqual([]);
    }
  });

  test('catering form labels are bound to their fields and no default placeholder remains', async ({ page }) => {
    for (const path of ['/catering', '/en/catering']) {
      await loadPage(page, path);
      const problems = await page.evaluate(() => {
        const form = document.getElementById('offerte-naam')?.form;
        if (!form) return ['form not found'];
        const found = [];
        for (const label of form.querySelectorAll('label')) {
          const target = label.htmlFor && form.querySelector(`#${CSS.escape(label.htmlFor)}`);
          if (!target) found.push(`label "${label.textContent.trim()}" is not bound`);
        }
        for (const field of form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea, select')) {
          if (!field.id || !form.querySelector(`label[for="${field.id}"]`)) found.push(`field ${field.name} has no label`);
          if (/example text/i.test(field.getAttribute('placeholder') || '')) found.push(`field ${field.name} placeholder`);
        }
        return found;
      });
      expect(problems, `${path} form`).toEqual([]);
    }
  });

  test('nav logo loads eagerly and declares its size', async ({ page }) => {
    for (const path of ['/', '/en']) {
      await loadPage(page, path);
      const logo = page.locator('img.nav_logo');
      await expect(logo, `${path} logo is not lazy`).not.toHaveAttribute('loading', 'lazy');
      await expect(logo, `${path} logo width`).toHaveAttribute('width', /\d+/);
      await expect(logo, `${path} logo height`).toHaveAttribute('height', /\d+/);
    }
  });

  test('booking iframe has a title once the widget loads', async ({ page }) => {
    for (const path of ['/', '/en']) {
      await loadPage(page, path);
      await page.locator('[data-zc-action="open"], [data-formitable="open"]').first().hover();
      const iframe = page.locator('iframe[src*="bookings.zenchef.com"]');
      await expect(iframe, `${path} booking iframe`).toHaveCount(1, { timeout: 15_000 });
      await expect(iframe, `${path} booking iframe title`).toHaveAttribute('title', /\S+/);
    }
  });

  test('Instagram link goes to the restaurant profile on every page', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await loadPage(page, path);
      const links = await page.locator('a[href*="instagram.com"]').evaluateAll((all) => all.map((a) => a.getAttribute('href')));
      expect(links.length, `${path} has an Instagram link`).toBeGreaterThan(0);
      for (const href of links) {
        expect(href, `${path} Instagram link`).toMatch(INSTAGRAM);
      }
    }
  });

  test('every page has a share image', async ({ page }) => {
    test.skip(process.env.OOST_OWNER_INPUTS !== '1', 'Waits on photos from the owner.');
    for (const path of ALL_PAGES) {
      await loadPage(page, path);
      await expect(page.locator('meta[property="og:image"]'), `${path} og:image`).toHaveAttribute('content', /^https:\/\//);
    }
  });

  test('no console errors on any page', async ({ page }) => {
    const errors = collectErrors(page);
    for (const path of ALL_PAGES) {
      await loadPage(page, path);
    }
    expect(errors).toEqual([]);
  });
});
