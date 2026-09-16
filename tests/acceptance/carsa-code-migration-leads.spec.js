// Phase 0 baseline for every lead-capture and hand-off script: check-finance hover swap, instant-valuation and part-exchange link builders, VDP booking CTAs, get-started prefill and booking links, hidden UTM form fields, VDP link decoration and the contact form.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
import {
  BASE,
  loadPage,
  collectErrors,
  unexpectedErrors,
  firstPath,
  seedAttribution,
} from './helpers/carsa.js';

const SEED = { utms: { utm_source: 'seed', utm_medium: 'phase0', utm_extra: 'e1' }, referrer: 'https://www.google.com/', referrerDomain: 'google.com' };

function params(href) {
  return Object.fromEntries(new URL(href).searchParams.entries());
}

async function vdpPath(request) {
  const vdp = await firstPath(request, '/vehicles/used/');
  test.skip(!vdp, 'no VDP in sitemap');
  return vdp;
}

// ── Check-finance hover swap ──────────────────────────────────

test.describe('carsa-code-migration — Leads: check-finance hover', () => {
  for (const path of ['/car-finance-calculator', '/used-cars/fuel/petrol']) {
    test(`check-finance-hover-swap on ${path}: hover swaps the card link to the eligibility URL with VRM and attribution, mouse-out restores it`, async ({ page, context }) => {
      await seedAttribution(context, SEED);
      await loadPage(page, path);
      const el = page.locator('a [data-link="check-finance"][vrm], a[data-link="check-finance"][vrm]').first();
      test.skip((await el.count()) === 0, 'no check-finance element with a VRM on this page');
      await el.scrollIntoViewIfNeeded();
      const anchor = el.locator('xpath=ancestor-or-self::a[1]');
      const original = await anchor.evaluate((a) => a.href);
      const originalEvent = await anchor.getAttribute('data-analytics-event');
      const vrm = await el.getAttribute('vrm');
      await el.hover();
      await page.waitForTimeout(200);
      const swapped = await anchor.evaluate((a) => a.href);
      expect(swapped.startsWith('https://quote.carsa.co.uk/eligibility/questions?vrm=' + encodeURIComponent(vrm))).toBe(true);
      expect(params(swapped)).toMatchObject({ vrm, utm_source: 'seed', utm_medium: 'phase0', utm_extra: 'e1', referrer: 'google.com' });
      expect(await anchor.getAttribute('data-analytics-event')).toBe('check-finance-car-card-click');
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      expect(await anchor.evaluate((a) => a.href)).toBe(original);
      expect(await anchor.getAttribute('data-analytics-event')).toBe(originalEvent);
    });
  }

  test('check-finance-click-fallback: a click without a prior hover still swaps the href before navigation', async ({ page, context }) => {
    await seedAttribution(context, SEED);
    await loadPage(page, '/car-finance-calculator');
    const el = page.locator('a [data-link="check-finance"][vrm], a[data-link="check-finance"][vrm]').first();
    test.skip((await el.count()) === 0, 'no check-finance element with a VRM on this page');
    const result = await el.evaluate((node) => {
      const anchor = node.closest('a');
      anchor.addEventListener('click', (e) => e.preventDefault(), { once: true });
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return { href: anchor.href, event: anchor.getAttribute('data-analytics-event') };
    });
    expect(result.href).toContain('quote.carsa.co.uk/eligibility/questions?vrm=');
    expect(result.href).toContain('utm_source=seed');
    expect(result.event).toBe('check-finance-car-card-click');
  });

  test('check-finance-session-beats-local: last-touch session utms from this visit win over stored first-touch ones', async ({ page, context }) => {
    await seedAttribution(context, { utms: { utm_source: 'first' } });
    await loadPage(page, '/car-finance-calculator?utm_source=last');
    const el = page.locator('a [data-link="check-finance"][vrm], a[data-link="check-finance"][vrm]').first();
    test.skip((await el.count()) === 0, 'no check-finance element with a VRM on this page');
    await el.scrollIntoViewIfNeeded();
    await el.hover();
    await page.waitForTimeout(200);
    const href = await el.locator('xpath=ancestor-or-self::a[1]').evaluate((a) => a.href);
    expect(params(href).utm_source).toBe('last');
  });
});

// ── Instant valuation link builder ────────────────────────────

test.describe('carsa-code-migration — Leads: instant valuation', () => {
  for (const path of ['/', '/sell-car/value-car', '/used-cars', '/used-cars/deals']) {
    test(`valuation-link on ${path}: VRM and mileage build the sellcar new-order URL with attribution`, async ({ page, context }) => {
      await seedAttribution(context, SEED);
      await loadPage(page, path);
      const trigger = page.locator('form [data-link="valuation"]').first();
      test.skip((await trigger.count()) === 0, 'no valuation trigger inside a form on this page');
      const form = trigger.locator('xpath=ancestor::form[1]');
      await form.locator('[name="vrm"]').first().fill('ab12 cde!');
      const mileage = form.locator('[name="mileage"]').first();
      if (await mileage.count()) await mileage.fill('12000');
      await page.waitForTimeout(200);
      const href = await trigger.getAttribute('href');
      expect(href.startsWith('https://sellcar.carsa.co.uk/new-order?vrm=AB12CDE&mileage=')).toBe(true);
      expect(params(href)).toMatchObject({ vrm: 'AB12CDE', utm_source: 'seed', utm_medium: 'phase0', referrer: 'google.com' });
      if (await mileage.count()) expect(params(href).mileage).toBe('12000');
      expect(await trigger.getAttribute('target')).toBe('_blank');
    });
  }

  test('valuation-enter-opens-new-tab: Enter in the VRM field opens the built URL in a new tab', async ({ page, context }) => {
    await seedAttribution(context, SEED);
    await loadPage(page, '/');
    const trigger = page.locator('form [data-link="valuation"]').first();
    test.skip((await trigger.count()) === 0, 'no valuation trigger on the homepage');
    const form = trigger.locator('xpath=ancestor::form[1]');
    const vrm = form.locator('[name="vrm"]').first();
    await vrm.fill('AB12CDE');
    const mileage = form.locator('[name="mileage"]').first();
    if (await mileage.count()) await mileage.fill('12000');
    const [popup] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }), vrm.press('Enter')]);
    const landed = new URL(popup.url());
    expect(landed.hostname).toBe('sellcar.carsa.co.uk');
    expect(landed.searchParams.get('vrm')).toBe('AB12CDE');
    await popup.close();
  });

  test('valuation-empty-vrm-noop: an empty VRM never builds a link', async ({ page }) => {
    await loadPage(page, '/');
    const trigger = page.locator('form [data-link="valuation"]').first();
    test.skip((await trigger.count()) === 0, 'no valuation trigger on the homepage');
    const form = trigger.locator('xpath=ancestor::form[1]');
    const before = await trigger.getAttribute('href');
    await form.locator('[name="vrm"]').first().fill('');
    await page.waitForTimeout(200);
    expect(await trigger.getAttribute('href')).toBe(before);
  });
});

// ── Part-exchange link builder ────────────────────────────────

test.describe('carsa-code-migration — Leads: part-exchange', () => {
  for (const path of ['/', '/used-cars/fuel/petrol']) {
    test(`px-link on ${path}: a px-vrm input builds the value-my-car URL with attribution and opens in a new tab`, async ({ page, context }) => {
      await seedAttribution(context, SEED);
      await loadPage(page, path);
      const input = page.locator('#px-form-large [name="px-vrm"], #px-form-small [name="px-vrm"]').first();
      test.skip((await input.count()) === 0, `no px-vrm input on ${path}: the PX link block is dead here`);
      await input.evaluate((el) => { el.value = 'AB12CDE'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.waitForTimeout(200);
      const button = page.locator('#px-button-large, #px-button-small').first();
      const href = await button.getAttribute('href');
      expect(href.startsWith('https://quote.carsa.co.uk/value-my-car/enter-vrm?px_vrm=AB12CDE')).toBe(true);
      expect(params(href)).toMatchObject({ px_vrm: 'AB12CDE', utm_source: 'seed', referrer: 'google.com' });
      expect(await button.getAttribute('target')).toBe('_blank');
    });
  }

  test('px-home-block-dead: the homepage carries the PX link script but no px-vrm input for it to bind', async ({ page }) => {
    await loadPage(page, '/');
    expect(await page.evaluate(() => [...document.scripts].filter((s) => !s.src && /px-vrm/.test(s.textContent)).length)).toBe(1);
    expect(await page.locator('[name="px-vrm"]').count()).toBe(0);
  });

  test('px-link-vdp: the PX form on a VDP builds the get-px-valuation URL for that car', async ({ page, context, request }) => {
    const vdp = await vdpPath(request);
    await seedAttribution(context, SEED);
    await loadPage(page, vdp);
    const form = page.locator('#px-form-large, #px-form-small').first();
    test.skip((await form.count()) === 0, 'no PX form on this VDP');
    await form.locator('[name="px-vrm"]').fill('AB12CDE');
    await page.waitForTimeout(200);
    const href = await page.locator('#px-button-large, #px-button-small').first().getAttribute('href');
    const vrm = vdp.split('/').pop();
    expect(href.toLowerCase().startsWith(`https://quote.carsa.co.uk/get-px-valuation/${vrm}/?px_vrm=ab12cde`)).toBe(true);
    expect(params(href)).toMatchObject({ utm_source: 'seed', referrer: 'google.com' });
  });

  test('px-submit-opens-new-tab: Enter in a px-vrm input opens the built URL in a new tab', async ({ page, context }) => {
    await loadPage(page, '/used-cars/fuel/petrol');
    const input = page.locator('#px-form-large [name="px-vrm"], #px-form-small [name="px-vrm"]').first();
    test.skip((await input.count()) === 0, 'no px-vrm input on this page');
    await input.evaluate((el) => { el.value = 'AB12CDE'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const [popup] = await Promise.all([
      context.waitForEvent('page', { timeout: 5000 }),
      input.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))),
    ]);
    expect(popup.url()).toContain('quote.carsa.co.uk/value-my-car/enter-vrm?px_vrm=AB12CDE');
    await popup.close();
  });
});

// ── VDP booking CTAs and link decoration ──────────────────────

test.describe('carsa-code-migration — Leads: VDP hand-offs', () => {
  test('vdp-cta-default: reserve & test drive is preselected and the CTA points at quote book/VRM with attribution', async ({ page, context, request }) => {
    const vdp = await vdpPath(request);
    await seedAttribution(context, SEED);
    await loadPage(page, vdp);
    const vrm = vdp.split('/').pop().toUpperCase();
    expect(await page.locator('#reserve-test-drive').isChecked()).toBe(true);
    const cta = page.locator('[data-button="cta-option"]').first();
    expect((await cta.textContent()).trim()).toBe('Reserve & test drive');
    expect(await cta.getAttribute('data-analytics-event')).toBe('test-drive-cta');
    const href = await cta.getAttribute('href');
    expect(href.startsWith(`https://quote.carsa.co.uk/book/${vrm}`)).toBe(true);
    expect(params(href)).toMatchObject({ utm_source: 'seed', referrer: 'google.com' });
    expect(await page.locator('.form7_field-wrapper.is-postcode').first().evaluate((e) => e.style.display)).toBe('block');
  });

  test('vdp-cta-postcode: typing a postcode appends it sanitised to the book URL', async ({ page, request }) => {
    const vdp = await vdpPath(request);
    await loadPage(page, vdp);
    await page.locator('[data-field="postcode"]').first().evaluate((el) => { el.value = 'sw1a 1aa'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(200);
    const href = await page.locator('[data-button="cta-option"]').first().getAttribute('href');
    expect(params(href).postcode).toBe('SW1A1AA');
  });

  test('vdp-cta-reserve-collect: choosing reserve & collect switches the CTA to build-deal and hides the postcode field', async ({ page, request }) => {
    const vdp = await vdpPath(request);
    await loadPage(page, vdp);
    const vrm = vdp.split('/').pop().toUpperCase();
    await page.locator('#reserve-collect').evaluate((el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(1000);
    const cta = page.locator('[data-button="cta-option"]').first();
    expect((await cta.textContent()).trim()).toBe('Reserve & collect');
    expect(await cta.getAttribute('data-analytics-event')).toBe('build-deal-cta');
    expect((await cta.getAttribute('href')).startsWith(`https://quote.carsa.co.uk/build-deal/${vrm}?skip_intro=`)).toBe(true);
    expect(await page.locator('.form7_field-wrapper.is-postcode').first().evaluate((e) => e.style.display)).toBe('none');
    await expect(page.locator('#reserve-collect').locator('xpath=ancestor::*[contains(@class,"details_radio-field")][1]')).toHaveClass(/is-list-active/);
  });

  test('vdp-links-decorated: build-deal, book and eligibility links all carry stored utms and referrer', async ({ page, context, request }) => {
    const vdp = await vdpPath(request);
    await seedAttribution(context, SEED);
    await loadPage(page, vdp);
    const hrefs = await page.$$eval('a[href*="quote.carsa.co.uk/build-deal/"], a[href*="quote.carsa.co.uk/book/"], a[href*="quote.carsa.co.uk/eligibility/questions"]', (els) => els.map((a) => a.href));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(params(href), href).toMatchObject({ utm_source: 'seed', utm_medium: 'phase0', referrer: 'google.com' });
      expect(href.match(/utm_source=/g)).toHaveLength(1);
    }
  });

  test('vdp-get-started-link: the booking-options button carries the car VRM and store location', async ({ page, request }) => {
    const vdp = await vdpPath(request);
    await loadPage(page, vdp);
    const href = await page.locator('[data-button="booking-options"]').first().getAttribute('href');
    const u = new URL(href, BASE);
    expect(u.pathname).toBe('/get-started');
    expect(u.searchParams.get('vrm')).toBe(vdp.split('/').pop().toLowerCase());
    expect(u.searchParams.has('location')).toBe(true);
    if (!u.searchParams.get('location')) test.info().annotations.push({ type: 'cms-gap', description: `${vdp} has no Location display name` });
  });

  test('vdp-search-similar: the similar-cars link filters the search page by make and model', async ({ page, request }) => {
    const vdp = await vdpPath(request);
    await loadPage(page, vdp);
    const href = await page.locator('[data-link="search-similar"]').first().getAttribute('href');
    expect(href.startsWith('/used-cars?cars_make_equal=')).toBe(true);
  });

  test('vdp-make-model-count: the similar-cars count matches the number of carousel items', async ({ page, request }) => {
    const vdp = await vdpPath(request);
    await loadPage(page, vdp);
    const count = await page.locator('[data-count="make-model"]').count();
    const shown = page.locator('[data-number="make-model"]').first();
    test.skip((await shown.count()) === 0, 'no make-model counter on this build');
    expect((await shown.textContent()).trim()).toBe(String(count));
    if (count === 0) await expect(page.locator('[data-similar="model"]').first()).toBeHidden();
  });

  test('vdp-whatsapp-footer: the footer WhatsApp link names this car', async ({ page, request }) => {
    const vdp = await vdpPath(request);
    await loadPage(page, vdp);
    const href = await page.locator('#footer_open-whatsapp').first().getAttribute('href');
    test.skip(!href, 'no footer WhatsApp link');
    expect(decodeURIComponent(href)).toContain(`Hi, please tell me more about ${vdp.split('/').pop().toUpperCase()}`);
  });
});

// ── Hidden UTM fields on lead forms ───────────────────────────

test.describe('carsa-code-migration — Leads: hidden form fields', () => {
  test('vdp-form-hidden-fields: every data-form="add-utms" form gets conversion_page, the five standard utms, extras and referrer', async ({ page, context, request }) => {
    const vdp = await vdpPath(request);
    await seedAttribution(context, SEED);
    await loadPage(page, `${vdp}?foo=bar&utm_source=ignored`);
    const forms = await page.$$eval('form[data-form="add-utms"]', (els) =>
      els.map((f) => Object.fromEntries([...f.querySelectorAll('input[type="hidden"]')].map((i) => [i.name, i.value])))
    );
    expect(forms.length).toBeGreaterThan(0);
    for (const fields of forms) {
      expect(fields.conversion_page).toBe(`${BASE}${vdp}?foo=bar`);
      expect(fields).toMatchObject({ utm_source: 'seed', utm_medium: 'phase0', utm_campaign: '', utm_term: '', utm_content: '', utm_extra: 'e1', referrer: 'google.com' });
    }
    const dupes = await page.$$eval('form[data-form="add-utms"]', (els) =>
      els.map((f) => [...f.querySelectorAll('input[name="utm_source"]')].length)
    );
    expect(dupes.every((n) => n === 1)).toBe(true);
  });

  test('vdp-form-hidden-fields-url-fallback: with nothing stored, utms come from the current URL', async ({ page, request }) => {
    const vdp = await vdpPath(request);
    await loadPage(page, `${vdp}?utm_source=url&utm_campaign=camp`);
    const fields = await page.$eval('form[data-form="add-utms"]', (f) => Object.fromEntries([...f.querySelectorAll('input[type="hidden"]')].map((i) => [i.name, i.value])));
    expect(fields).toMatchObject({ utm_source: 'url', utm_campaign: 'camp', utm_medium: '' });
    expect(fields.conversion_page).toBe(`${BASE}${vdp}`);
  });

  test('vdp-contact-form-present: the VDP contact form is a Webflow form with Turnstile and an analytics event', async ({ page, request }) => {
    const vdp = await vdpPath(request);
    await loadPage(page, vdp);
    const form = page.locator('#wf-form-VDP-Contact-Form');
    await expect(form).toBeAttached();
    expect(await form.getAttribute('data-turnstile-sitekey')).toBeTruthy();
    expect(await form.getAttribute('data-analytics-event')).toBe('vdp-form-submit');
  });
});

// ── Get started ───────────────────────────────────────────────

test.describe('carsa-code-migration — Leads: get started', () => {
  const QS = '/get-started?vrm=ab12cde&location=Bolton&utm_source=gs&utm_medium=m';

  test('gs-prefill: vrm and location from the URL populate the hidden field, text slots and title', async ({ page }) => {
    await loadPage(page, QS);
    expect(await page.locator('form').first().locator('input[name="vrm"]').inputValue()).toBe('ab12cde');
    const loc = page.locator('[data-text="location"]').first();
    if (await loc.count()) expect((await loc.textContent()).trim()).toBe('Bolton');
    const vrmText = page.locator('[data-text="vrm"]').first();
    if (await vrmText.count()) expect((await vrmText.textContent()).trim()).toBe('ab12cde');
    expect(await page.title()).toBe('Get Started With AB12CDE | Carsa');
    expect(await page.locator('#back-button').getAttribute('href')).toBe('https://www.carsa.co.uk/vehicles/used/ab12cde');
  });

  test('gs-options: each booking option rewrites the book button href, label, analytics event and note', async ({ page }) => {
    await loadPage(page, QS);
    const button = page.locator('#book-button');
    const note = page.locator('#reservation-note');
    const cases = [
      ['test-drive-free', 'https://quote.carsa.co.uk/book/ab12cde', 'Book free test drive', 'test-drive-free-submit', '0'],
      ['reserve-test-drive', 'https://quote.carsa.co.uk/book/ab12cde', 'Reserve & book test drive', 'reserve-test-drive-submit', '1'],
      ['reserve-collect', 'https://quote.carsa.co.uk/build-deal/ab12cde?skip_intro=', 'Reserve & collect', 'reserve-collect-submit', '1'],
    ];
    for (const [id, base, label, event, opacity] of cases) {
      const radio = page.locator(`#${id}`);
      if (!(await radio.count())) continue;
      await radio.check({ force: true });
      await page.waitForTimeout(400);
      const href = await button.getAttribute('href');
      expect(href.startsWith(base), id).toBe(true);
      expect(params(href)).toMatchObject({ utm_source: 'gs', utm_medium: 'm' });
      expect((await button.textContent()).trim()).toBe(label);
      expect(await button.getAttribute('data-analytics-event')).toBe(event);
      expect(await button.getAttribute('target')).toBe('_blank');
      await expect(button).not.toHaveClass(/is-disabled/);
      if (await note.count()) expect(await note.evaluate((n) => n.style.opacity)).toBe(opacity);
    }
  });

  test('gs-storage-hides-test-drive: storage=true hides the free test-drive option', async ({ page }) => {
    await loadPage(page, `${QS}&storage=true`);
    expect(await page.locator('#free-test-drive').evaluate((e) => e.style.display)).toBe('none');
    await loadPage(page, QS);
    expect(await page.locator('#free-test-drive').evaluate((e) => e.style.display)).not.toBe('none');
  });

  test('gs-stored-attribution-beats-url: stored first-touch utms take precedence over URL utms on the book link', async ({ page, context }) => {
    await seedAttribution(context, { utms: { utm_source: 'stored' }, referrerDomain: 'bing.com' });
    await loadPage(page, QS);
    await page.locator('#reserve-collect').check({ force: true });
    await page.waitForTimeout(400);
    expect(params(await page.locator('#book-button').getAttribute('href'))).toMatchObject({ utm_source: 'stored', referrer: 'bing.com' });
  });

  test('gs-no-vrm: without a vrm the hidden field and back button are not populated', async ({ page }) => {
    await loadPage(page, '/get-started');
    expect(await page.locator('form').first().locator('input[name="vrm"]').count()).toBe(0);
    expect(await page.title()).not.toContain('Get Started With');
  });

  test('gs-no-errors: zero unexpected JS errors', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, QS);
    expect(unexpectedErrors(errors)).toEqual([]);
  });
});

// ── Contact ───────────────────────────────────────────────────

test.describe('carsa-code-migration — Leads: contact', () => {
  test('contact-form-present: a Webflow form with Turnstile exists and the page is error-free', async ({ page }) => {
    const errors = collectErrors(page);
    await loadPage(page, '/contact');
    const forms = await page.$$eval('form', (els) => els.map((f) => ({ id: f.id, turnstile: f.getAttribute('data-turnstile-sitekey') })));
    expect(forms.some((f) => f.turnstile)).toBe(true);
    expect(unexpectedErrors(errors)).toEqual([]);
  });

  test('contact-no-custom-scripts: the contact page carries only the shared animation block beyond global code', async ({ page }) => {
    await loadPage(page, '/contact');
    const drawLine = await page.evaluate(() => [...document.scripts].filter((s) => !s.src && /draw-line/.test(s.textContent)).length);
    expect(drawLine).toBe(1);
  });
});
