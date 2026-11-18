// Acceptance tests for sz-consent-branding: the ConsentPro banner, preferences modal and floating button on Team Zissou staging use the 2026 brand tokens, read from inside the ConsentPro shadow root.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE = (process.env.SZ_STAGING_URL || 'https://teamzissou.webflow.io').replace(
  /\/$/,
  '',
);
const CREAM = 'rgb(242, 237, 228)';
const BRUNELLO_900 = 'rgb(69, 18, 45)';
const BRUNELLO_600 = 'rgb(154, 4, 59)';
const BRUNELLO_400 = 'rgb(150, 119, 136)';
const BRUNELLO_200 = 'rgb(186, 167, 177)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const DEFAULTS = [
  'rgb(0, 0, 0)',
  'rgb(255, 255, 255)',
  'rgb(51, 51, 51)',
  'rgb(204, 204, 204)',
  'rgb(245, 245, 245)',
  'rgb(217, 217, 217)',
  'rgb(192, 192, 192)',
  'rgb(24, 173, 58)',
  'rgb(65, 105, 225)',
];

async function open(page, path = '/') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const root = document.querySelector('[fs-consent-element="root"]');
    const banner = root?.shadowRoot?.querySelector('.consent_banner');
    return (
      banner &&
      banner.getBoundingClientRect().height > 0 &&
      getComputedStyle(root.shadowRoot.querySelector('.consent_opt-in_banner'))
        .opacity === '1'
    );
  });
  await page.waitForTimeout(100);
}

function styles(page, selector, props) {
  return page.evaluate(
    ({ selector, props }) => {
      const sr = document.querySelector('[fs-consent-element="root"]').shadowRoot;
      const el = sr.querySelector(selector);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    },
    { selector, props },
  );
}

function clickInShadow(page, selector) {
  return page.evaluate((selector) => {
    document
      .querySelector('[fs-consent-element="root"]')
      .shadowRoot.querySelector(selector)
      .click();
  }, selector);
}

async function openPrefs(page) {
  await clickInShadow(
    page,
    '.consent_opt-in_banner [fs-consent-element="open-preferences"]',
  );
  await page.waitForTimeout(800);
}

test.describe('sz-consent-branding', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
  });

  test('banner uses brand colours', async ({ page }) => {
    const s = await styles(page, '.consent_banner', [
      'background-color',
      'color',
      'border-top-color',
    ]);
    expect(s['background-color']).toBe(CREAM);
    expect(s.color).toBe(BRUNELLO_900);
    expect(s['border-top-color']).toBe(BRUNELLO_200);
  });

  test('accept and reject buttons match sz-button primary and secondary', async ({
    page,
  }) => {
    const props = [
      'background-color',
      'color',
      'border-top-color',
      'min-height',
      'font-family',
    ];
    const accept = await styles(
      page,
      '.consent_opt-in_banner .consent_button_accept',
      props,
    );
    expect(accept['background-color']).toBe(BRUNELLO_600);
    expect(accept.color).toBe(CREAM);
    expect(accept['min-height']).toBe('48px');
    expect(accept['font-family']).toContain('PP Rader');
    const reject = await styles(
      page,
      '.consent_opt-in_banner .consent_button_reject',
      props,
    );
    expect(reject['background-color']).toBe(TRANSPARENT);
    expect(reject.color).toBe(BRUNELLO_900);
    expect(reject['border-top-color']).toBe(BRUNELLO_900);
  });

  test('privacy link and preferences button use brand text colour', async ({ page }) => {
    const link = await styles(page, '.consent_banner_privacy-link', [
      'color',
      'text-decoration-line',
    ]);
    expect(link.color).toBe(BRUNELLO_900);
    expect(link['text-decoration-line']).toBe('underline');
    const prefs = await styles(page, '.consent_button_prefs', [
      'color',
      'border-bottom-color',
    ]);
    expect(prefs.color).toBe(BRUNELLO_900);
    expect(prefs['border-bottom-color']).toBe(BRUNELLO_900);
  });

  test('preferences modal uses brand colours and Pangaia heading', async ({ page }) => {
    await openPrefs(page);
    const form = await styles(page, '.consent_prefs_form', [
      'background-color',
      'border-top-color',
    ]);
    expect(form['background-color']).toBe(CREAM);
    expect(form['border-top-color']).toBe(BRUNELLO_200);
    const heading = await styles(page, '.consent_prefs_heading', [
      'font-family',
      'font-weight',
    ]);
    expect(heading['font-family']).toContain('PP Pangaia');
    expect(heading['font-weight']).toBe('500');
    const submit = await styles(page, '.consent_button_prefs-submit', [
      'background-color',
      'color',
    ]);
    expect(submit['background-color']).toBe(BRUNELLO_600);
    expect(submit.color).toBe(CREAM);
  });

  test('toggle track is brunello-400 off and brunello-600 on', async ({ page }) => {
    await openPrefs(page);
    const field = '[fs-consent-category="analytics"] .consent_prefs_checkbox-field';
    expect((await styles(page, field, ['background-color']))['background-color']).toBe(
      BRUNELLO_400,
    );
    await clickInShadow(page, `${field} input`);
    await page.waitForTimeout(300);
    expect((await styles(page, field, ['background-color']))['background-color']).toBe(
      BRUNELLO_600,
    );
    const knob = await styles(page, `${field} .consent_prefs_checkbox-toggle`, [
      'background-color',
    ]);
    expect(knob['background-color']).toBe(CREAM);
  });

  test('floating preferences button appears after reject and uses brand colours', async ({
    page,
  }) => {
    await clickInShadow(page, '.consent_opt-in_banner [fs-consent-element="deny"]');
    await page.waitForTimeout(800);
    const wrapper = await styles(page, '.consent_opt-in_open-prefs', ['display']);
    expect(wrapper.display).not.toBe('none');
    const button = await styles(page, '.consent_prefs_open-button', [
      'background-color',
      'color',
    ]);
    expect(button['background-color']).toBe(BRUNELLO_600);
    expect(button.color).toBe(CREAM);
  });

  test('buttons change on hover without opacity', async ({ page }) => {
    const accept = page.locator('.consent_opt-in_banner .consent_button_accept');
    await accept.hover();
    const a = await accept.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, line: cs.textDecorationLine };
    });
    expect(a.opacity).toBe('1');
    expect(a.line).toBe('underline');
    const reject = page.locator('.consent_opt-in_banner .consent_button_reject');
    await reject.hover();
    const r = await reject.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, bg: cs.backgroundColor };
    });
    expect(r.opacity).toBe('1');
    expect(r.bg).toBe(BRUNELLO_900);
    await openPrefs(page);
    const close = page.locator('.consent_prefs_close');
    await close.hover();
    const c = await close.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, color: cs.color };
    });
    expect(c.opacity).toBe('1');
    expect(c.color).toBe(BRUNELLO_600);
  });

  test('no Finsweet default colours inside the consent shadow root', async ({ page }) => {
    await openPrefs(page);
    const hits = await page.evaluate((defaults) => {
      const sr = document.querySelector('[fs-consent-element="root"]').shadowRoot;
      const props = [
        'color',
        'background-color',
        'border-top-color',
        'border-bottom-color',
        'outline-color',
      ];
      const out = [];
      for (const el of sr.querySelectorAll('[class*="consent_"]')) {
        if (el.closest('.consent_banner_link') && el.tagName === 'IMG') continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none') continue;
        for (const p of props) {
          const width = p.startsWith('border')
            ? parseFloat(cs.getPropertyValue(p.replace('color', 'width')))
            : 1;
          if (width > 0 && defaults.includes(cs.getPropertyValue(p))) {
            out.push(`${el.className} ${p} ${cs.getPropertyValue(p)}`);
          }
        }
      }
      return out;
    }, DEFAULTS);
    expect(hits).toEqual([]);
  });

  test('no colour-contrast violations in the banner or modal', async ({ page }) => {
    const banner = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    await openPrefs(page);
    const modal = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    const consent = [...banner.violations, ...modal.violations]
      .flatMap((v) => v.nodes)
      .filter((n) => JSON.stringify(n.target).includes('consent_'));
    expect(consent).toEqual([]);
  });

  test('banner fits a 390px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    const box = await page.evaluate(() => {
      const sr = document.querySelector('[fs-consent-element="root"]').shadowRoot;
      const r = sr.querySelector('.consent_banner').getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(box.left).toBeGreaterThanOrEqual(15);
    expect(box.right).toBeLessThanOrEqual(375);
    expect(box.overflow).toBe(false);
  });

  test('banner and modal show the new copy and the privacy link', async ({ page }) => {
    const text = await page.evaluate(() => {
      const sr = document.querySelector('[fs-consent-element="root"]').shadowRoot;
      return sr
        .querySelector('.consent_banner_paragraph')
        .textContent.replace(/\s+/g, ' ')
        .trim();
    });
    expect(text).toBe(
      'We only set cookies if you say yes. They tell us which pages help. Read the privacy policy.',
    );
    const href = await page.evaluate(() =>
      document
        .querySelector('[fs-consent-element="root"]')
        .shadowRoot.querySelector('.consent_banner_privacy-link')
        .getAttribute('href'),
    );
    expect(href).toMatch(/\/privacy$/);
    await openPrefs(page);
    const heading = await page.evaluate(() =>
      document
        .querySelector('[fs-consent-element="root"]')
        .shadowRoot.querySelector('.consent_prefs_heading')
        .textContent.trim(),
    );
    expect(heading).toBe('Cookie preferences');
  });

  test('consent buttons still work', async ({ page }) => {
    await clickInShadow(page, '.consent_opt-in_banner [fs-consent-element="allow"]');
    await page.waitForTimeout(800);
    const banner = await styles(page, '.consent_opt-in_banner', ['display']);
    expect(banner.display).toBe('none');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const again = await styles(page, '.consent_opt-in_banner', ['display']);
    expect(again.display).toBe('none');
  });
});
