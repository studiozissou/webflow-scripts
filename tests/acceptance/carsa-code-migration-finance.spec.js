// Phase 0 baseline for the finance calculators on the VDP template and /car-finance-calculator: config-driven defaults, quote payloads, output painting, APR painting, error fallbacks and input handling, with the consumer-finance API mocked for determinism plus one live smoke test each.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
import {
  FINANCE_CONFIG,
  FINANCE_QUOTE,
  VIEWPORT_MOBILE,
  loadPage,
  collectErrors,
  unexpectedErrors,
  firstPath,
  mockFinance,
  waitForQuotes,
  idOrData,
  gbp,
  parseGBP,
} from './helpers/carsa.js';

const MONEY = (n) => gbp(n, 2);

async function textIfPresent(page, selector) {
  const el = page.locator(selector.startsWith('#') && !selector.includes(',') ? idOrData(selector.slice(1)) : selector).first();
  return (await el.count()) ? (await el.textContent()).trim() : null;
}

async function contributionOf(page) {
  const el = page.locator('#deposit-contribution').first();
  return (await el.count()) ? parseGBP((await el.inputValue()) || '0') : 0;
}

async function expectTextIfPresent(page, selector, expected) {
  const actual = await textIfPresent(page, selector);
  if (actual !== null) expect(actual, selector).toBe(expected);
}

async function checkedValue(page, group) {
  return page.evaluate((g) => document.querySelector(`input[type="radio"][data-name="${g}"]:checked`)?.value ?? null, group);
}

async function chooseRadio(page, group, value) {
  const input = page.locator(`input[type="radio"][data-name="${group}"][value="${value}"]`).first();
  await input.dispatchEvent('click');
  await input.evaluate((el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
}

async function otherTerm(page, current) {
  return page.evaluate((cur) => {
    const opts = [...document.querySelectorAll('input[type="radio"][data-name="finance-term"]')].map((i) => i.value);
    return opts.find((v) => v !== cur) || null;
  }, current);
}

// ── VDP finance calculator ────────────────────────────────────

test.describe('carsa-code-migration — Finance: VDP calculator', () => {
  let vdp;

  test.beforeEach(async ({ request }) => {
    vdp = vdp || (await firstPath(request, '/vehicles/used/'));
    test.skip(!vdp, 'no VDP in sitemap');
  });

  test('vdp-fin-config-fetched-once: finance-config is requested exactly once per page load', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    expect(calls.config).toBe(1);
    expect(calls.quotes.length).toBe(1);
  });

  test('vdp-fin-defaults-from-config: deposit, term, mileage and credit band follow the live config', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    const contribution = await contributionOf(page);
    const expectedCash = Math.max(0, FINANCE_CONFIG.defaultDepositAmount - contribution);
    expect(await page.locator('#finance-deposit').inputValue()).toBe(gbp(expectedCash));
    const term = await checkedValue(page, 'finance-term');
    expect(['48', '60']).toContain(term);
    expect(await checkedValue(page, 'apr')).toBe('very-good');
    const mileage = page.locator('#finance-mileage');
    if (await mileage.count()) {
      const hasOption = await mileage.locator(`option[value="${FINANCE_CONFIG.defaultAnnualMileage}"]`).count();
      if (hasOption) expect(await mileage.inputValue()).toBe(String(FINANCE_CONFIG.defaultAnnualMileage));
    }
    const apr = await textIfPresent(page, '[data-number="apr"]');
    expect(apr).toMatch(/^11\.9%?$/);
  });

  test('vdp-fin-quote-payload: the first /quote body is built from CMS values and the checked inputs', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    const [payload] = calls.quotes;
    const cash = parseGBP(await page.locator('#finance-deposit').inputValue());
    const contribution = await contributionOf(page);
    expect(payload.criteria.cashDeposit).toBe(cash + contribution);
    expect(payload.criteria.term).toBe(Number(await checkedValue(page, 'finance-term')));
    expect(payload.criteria.apr).toBe(FINANCE_CONFIG.aprByTier.VeryGood);
    expect(payload.criteria.outstandingFinance).toBe(0);
    expect(payload.criteria.pxEquity).toBe(0);
    const mileageSel = page.locator('#finance-mileage');
    if (await mileageSel.count()) expect(payload.criteria.annualMileage).toBe(Number(await mileageSel.inputValue()));
    expect(payload.vehicle.price).toBeGreaterThan(0);
    expect(payload.vehicle.mileage).toBeGreaterThanOrEqual(0);
    expect(payload.vehicle.registrationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.vehicle.type).toBe('Car');
    expect(payload.vehicle.vrm.toLowerCase()).toBe(vdp.split('/').pop().toLowerCase());
    expect(payload.requestedBy).toBe('manual');
    expect(typeof payload.requestUuid).toBe('string');
  });

  test('vdp-fin-outputs-painted: HP and PCP figures from the quote land in every mapped element', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    await page.waitForTimeout(500);
    const q = FINANCE_QUOTE;
    await expectTextIfPresent(page, '#hp-price', MONEY(q.hp.payments.regular));
    await expectTextIfPresent(page, '#hp-price-short', gbp(Math.floor(q.hp.payments.regular)));
    await expectTextIfPresent(page, '#hp-total-amount-payable', MONEY(q.hp.totalAmountPayable));
    await expectTextIfPresent(page, '#hp-total-charges', MONEY(q.hp.totalCharges));
    await expectTextIfPresent(page, '#hp-interest-amount', MONEY(q.hp.totalCharges));
    await expectTextIfPresent(page, '#hp-fixed-rate', '5.5%');
    await expectTextIfPresent(page, '#hp-term', `${q.hp.term} monthly payments of`);
    await expectTextIfPresent(page, '#pcp-price', MONEY(q.pcp.payments.regular));
    await expectTextIfPresent(page, '#pcp-price-short', gbp(Math.floor(q.pcp.payments.regular)));
    await expectTextIfPresent(page, '#pcp-term', `${q.pcp.term} monthly payments of`);
    await expectTextIfPresent(page, '#pcp-optional', MONEY(q.pcp.residualValue));
    await expectTextIfPresent(page, '#pcp-total-amount-payable', MONEY(q.pcp.totalAmountPayable));
    await expectTextIfPresent(page, '#pcp-interest-amount', MONEY(q.pcp.totalCharges));
    await expectTextIfPresent(page, '#pcp-fixed-rate', '5.1%');
    await expectTextIfPresent(page, '#pcp-excess-mileage', '6');
    expect(await textIfPresent(page, '#hp-price')).not.toBeNull();
    expect(await textIfPresent(page, '#pcp-price')).not.toBeNull();
  });

  test('vdp-fin-static-outputs: credit, deposit and contract length are derived from price and deposit', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    const [payload] = calls.quotes;
    const cash = parseGBP(await page.locator('#finance-deposit').inputValue());
    const total = payload.criteria.cashDeposit;
    await expectTextIfPresent(page, '[data-number="total-credit"]', gbp(payload.vehicle.price - total));
    await expectTextIfPresent(page, '[data-number="deposit"]', gbp(total));
    await expectTextIfPresent(page, '[data-number="customer-deposit"]', gbp(cash));
    await expectTextIfPresent(page, '[data-number="deposit-contribution"]', gbp(total - cash));
    await expectTextIfPresent(page, '[data-number="term"]', String(payload.criteria.term));
    await expectTextIfPresent(page, '[data-number="contract-length"]', String(payload.criteria.term + 1));
  });

  test('vdp-fin-pcp-available: a clean quote shows the PCP tab and hides the PCP error', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    await page.waitForTimeout(500);
    const err = page.locator('[data-element="pcp-error"]').first();
    const ok = page.locator('[data-element="pcp-available"]').first();
    if (await err.count()) expect(await err.evaluate((e) => e.style.display)).toBe('none');
    if (await ok.count()) expect(await ok.evaluate((e) => e.style.display)).toBe('block');
    await expect(page.locator('#pcp-tab-link')).toHaveClass(/w--current/);
  });

  test('vdp-fin-pcp-error-falls-back-to-hp: a PCP error in the quote switches to the HP tab and shows the message', async ({ page }) => {
    const quote = { ...FINANCE_QUOTE, pcp: { error: { code: 'PCP_UNAVAILABLE' } } };
    const calls = await mockFinance(page, { quote });
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    await page.waitForTimeout(500);
    const err = page.locator('[data-element="pcp-error"]').first();
    const ok = page.locator('[data-element="pcp-available"]').first();
    if (await err.count()) expect(await err.evaluate((e) => e.style.display)).toBe('block');
    if (await ok.count()) expect(await ok.evaluate((e) => e.style.display)).toBe('none');
    await expect(page.locator('#hp-tab-link')).toHaveClass(/w--current/);
    await expectTextIfPresent(page, '#hp-price', MONEY(FINANCE_QUOTE.hp.payments.regular));
  });

  test('vdp-fin-deposit-change: typing a new deposit repaints instantly and re-quotes after the 1s debounce', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    const contribution = await contributionOf(page);
    const deposit = page.locator('#finance-deposit');
    await deposit.evaluate((el) => { el.dispatchEvent(new Event('focus')); });
    expect(await deposit.inputValue()).toMatch(/^\d*$/);
    await deposit.evaluate((el) => { el.value = '1500'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(200);
    await expectTextIfPresent(page, '[data-number="customer-deposit"]', gbp(1500));
    await expectTextIfPresent(page, '[data-number="deposit"]', gbp(1500 + contribution));
    expect(calls.quotes.length).toBe(1);
    await waitForQuotes(page, calls, 2, 4000);
    expect(calls.quotes.length).toBe(2);
    expect(calls.quotes[1].criteria.cashDeposit).toBe(1500 + contribution);
    await deposit.evaluate((el) => { el.dispatchEvent(new Event('blur')); });
    expect(await deposit.inputValue()).toBe(gbp(1500));
  });

  test('vdp-fin-term-change: choosing another term re-quotes with that term', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    const current = await checkedValue(page, 'finance-term');
    const next = await otherTerm(page, current);
    test.skip(!next, 'only one term option');
    await chooseRadio(page, 'finance-term', next);
    await waitForQuotes(page, calls, 2, 4000);
    expect(calls.quotes.at(-1).criteria.term).toBe(Number(next));
    await expectTextIfPresent(page, '[data-number="term"]', next);
  });

  test('vdp-fin-apr-change: choosing another credit band re-quotes with that APR and repaints the label', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    await chooseRadio(page, 'apr', 'excellent');
    await waitForQuotes(page, calls, 2, 4000);
    expect(calls.quotes.at(-1).criteria.apr).toBe(FINANCE_CONFIG.aprByTier.Excellent);
    expect(await textIfPresent(page, '[data-number="apr"]')).toMatch(/^7\.9%?$/);
    await chooseRadio(page, 'apr', 'fair');
    await waitForQuotes(page, calls, 3, 4000);
    expect(calls.quotes.at(-1).criteria.apr).toBe(FINANCE_CONFIG.aprByTier.Fair);
  });

  test('vdp-fin-apr-labels: plain-text "Representative APR" labels are rewritten with the config rate', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    const labels = await page.$$eval('.is-apr', (els) => els.filter((e) => !e.children.length && /representative\s+apr/i.test(e.textContent)).map((e) => e.textContent));
    test.skip(labels.length === 0, 'no plain-text APR labels on this build');
    for (const t of labels) expect(t).toMatch(/11\.9%/);
  });

  test('vdp-fin-enter-does-not-submit: Enter in the deposit field never submits the Webflow form', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    const before = page.url();
    await page.locator('#finance-deposit').press('Enter');
    await page.waitForTimeout(500);
    expect(page.url()).toBe(before);
    await expect(page.locator('#wf-form-Finance-Calculator').locator('..').locator('.w-form-done')).toBeHidden();
  });

  test('vdp-fin-config-failure-uses-fallback: a failed config fetch still quotes with the built-in rates', async ({ page }) => {
    const calls = { quotes: [] };
    await page.route('**/consumer-finance.carsanet.co.uk/**', (route) => {
      if (route.request().url().endsWith('/finance-config')) return route.fulfill({ status: 500, body: 'nope' });
      calls.quotes.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FINANCE_QUOTE) });
    });
    const logged = [];
    page.on('console', (m) => m.type() === 'error' && logged.push(m.text()));
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    expect(calls.quotes[0].criteria.apr).toBe(10.9);
    expect(logged.some((t) => t.includes('finance-config fetch failed'))).toBe(true);
  });

  test('vdp-fin-contribution-field-locked: the deposit-contribution input is read-only and outside the tab order', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    const el = page.locator('#deposit-contribution').first();
    test.skip((await el.count()) === 0, 'no contribution field on this build');
    expect(await el.evaluate((e) => ({ ro: e.readOnly, req: e.required, tab: e.getAttribute('tabindex') }))).toEqual({ ro: true, req: false, tab: '-1' });
  });

  test('vdp-fin-live-api-smoke: the real consumer-finance API returns a monthly HP figure', async ({ page }) => {
    await loadPage(page, vdp);
    await expect(page.locator(idOrData('hp-price')).first()).toHaveText(/^£[\d,]+\.\d{2}$/, { timeout: 15_000 });
  });

  test('vdp-fin-no-errors: zero unexpected JS errors with the API mocked', async ({ page }) => {
    const errors = collectErrors(page);
    const calls = await mockFinance(page);
    await loadPage(page, vdp);
    await waitForQuotes(page, calls, 1);
    expect(unexpectedErrors(errors)).toEqual([]);
  });
});

// ── /car-finance-calculator ───────────────────────────────────

test.describe('carsa-code-migration — Finance: calculator page', () => {
  const PATH = '/car-finance-calculator';

  test('calc-defaults-from-config: deposit, term, band and APR label follow the live config', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    expect(await page.locator('#finance-deposit').inputValue()).toBe(gbp(FINANCE_CONFIG.defaultDepositAmount));
    expect(await checkedValue(page, 'finance-term')).toBe(String(FINANCE_CONFIG.defaultTerm));
    expect(await checkedValue(page, 'apr')).toBe('very-good');
    expect(await textIfPresent(page, '[data-number="apr"]')).toMatch(/^11\.9%?$/);
    expect(await page.locator('#finance-car-price').inputValue()).toMatch(/^£[\d,]+$/);
  });

  test('calc-quote-payload: the first /quote body uses the page price, config deposit and demo vehicle', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    const [payload] = calls.quotes;
    expect(payload.vehicle.price).toBe(parseGBP(await page.locator('#finance-car-price').inputValue()));
    expect(payload.criteria.cashDeposit).toBe(FINANCE_CONFIG.defaultDepositAmount);
    expect(payload.criteria.term).toBe(FINANCE_CONFIG.defaultTerm);
    expect(payload.criteria.apr).toBe(FINANCE_CONFIG.aprByTier.VeryGood);
    expect(payload.criteria.annualMileage).toBe(FINANCE_CONFIG.defaultAnnualMileage);
    expect(payload.vehicle).toMatchObject({ type: 'Car', vrm: 'MD74ZHJ', mileage: 7617, registrationDate: '2025-01-22' });
    expect(payload.requestUuid).toMatch(/^[0-9a-f-]{36}$|^\d+$/);
  });

  test('calc-outputs-painted: HP figures from the quote land in every mapped element', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    await page.waitForTimeout(500);
    const q = FINANCE_QUOTE;
    await expectTextIfPresent(page, '#hp-price', MONEY(q.hp.payments.regular));
    await expectTextIfPresent(page, '#hp-price-short', gbp(Math.floor(q.hp.payments.regular)));
    await expectTextIfPresent(page, '#hp-total-amount-payable', MONEY(q.hp.totalAmountPayable));
    await expectTextIfPresent(page, '#hp-total-charges', MONEY(q.hp.totalCharges));
    await expectTextIfPresent(page, '#hp-fixed-rate', '5.5%');
    await expectTextIfPresent(page, '#hp-term', `${FINANCE_CONFIG.defaultTerm} monthly payments of`);
    expect(await textIfPresent(page, '#hp-price-short')).not.toBeNull();
  });

  test('calc-static-outputs: total credit and disclosed deposit follow price minus deposit', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    const price = calls.quotes[0].vehicle.price;
    await expectTextIfPresent(page, '[data-number="total-credit"]', gbp(price - FINANCE_CONFIG.defaultDepositAmount));
    await expectTextIfPresent(page, '[data-number="deposit"]', gbp(FINANCE_CONFIG.defaultDepositAmount));
    await expectTextIfPresent(page, '#total-price', gbp(price));
  });

  test('calc-price-change: editing the car price updates the total and re-quotes with the new price', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    const price = page.locator('#finance-car-price');
    await price.focus();
    expect(await price.inputValue()).toMatch(/^\d*$/);
    await price.fill('15000');
    await waitForQuotes(page, calls, 2, 4000);
    expect(calls.quotes.at(-1).vehicle.price).toBe(15000);
    await expectTextIfPresent(page, '#total-price', gbp(15000));
    await expectTextIfPresent(page, '[data-number="total-credit"]', gbp(15000 - FINANCE_CONFIG.defaultDepositAmount));
    await price.blur();
    expect(await price.inputValue()).toBe(gbp(15000));
  });

  test('calc-deposit-change: a new deposit repaints instantly and re-quotes after the 800ms debounce', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    const deposit = page.locator('#finance-deposit');
    await deposit.focus();
    await deposit.fill('1250');
    await page.waitForTimeout(200);
    await expectTextIfPresent(page, '[data-number="deposit"]', gbp(1250));
    expect(calls.quotes.length).toBe(1);
    await waitForQuotes(page, calls, 2, 4000);
    expect(calls.quotes.at(-1).criteria.cashDeposit).toBe(1250);
    await deposit.blur();
    expect(await deposit.inputValue()).toBe(gbp(1250));
  });

  test('calc-term-change: choosing another term re-quotes and rewrites the HP term line', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    const next = await otherTerm(page, String(FINANCE_CONFIG.defaultTerm));
    test.skip(!next, 'only one term option');
    await chooseRadio(page, 'finance-term', next);
    await waitForQuotes(page, calls, 2, 4000);
    expect(calls.quotes.at(-1).criteria.term).toBe(Number(next));
    await expectTextIfPresent(page, '#hp-term', `${next} monthly payments of`);
  });

  test('calc-apr-change: choosing another credit band re-quotes with that APR', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    await chooseRadio(page, 'apr', 'excellent');
    await waitForQuotes(page, calls, 2, 4000);
    expect(calls.quotes.at(-1).criteria.apr).toBe(FINANCE_CONFIG.aprByTier.Excellent);
    expect(await textIfPresent(page, '[data-number="apr"]')).toMatch(/^7\.9%?$/);
  });

  test('calc-enter-does-not-submit: Enter in either input never submits the Webflow form', async ({ page }) => {
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    const before = page.url();
    await page.locator('#finance-deposit').press('Enter');
    await page.locator('#finance-car-price').press('Enter');
    await page.waitForTimeout(500);
    expect(page.url()).toBe(before);
  });

  test('calc-mobile-cta-scrolls: the mobile "view results" CTA scrolls the results into view', async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE);
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    const cta = page.locator('[data-analytics-event="finance-calculator-cta-view-results-mobile"]').first();
    test.skip((await cta.count()) === 0, 'no mobile CTA on this build');
    const before = page.url();
    await cta.click();
    await page.waitForTimeout(1200);
    expect(page.url()).toBe(before);
    const box = await page.locator('#finance-calculator-results').boundingBox();
    expect(box.y).toBeLessThan(VIEWPORT_MOBILE.height);
    expect(box.y + box.height).toBeGreaterThan(0);
  });

  test('calc-config-failure-uses-fallback: a failed config fetch still quotes with the built-in rates', async ({ page }) => {
    const calls = { quotes: [] };
    await page.route('**/consumer-finance.carsanet.co.uk/**', (route) => {
      if (route.request().url().endsWith('/finance-config')) return route.fulfill({ status: 500, body: 'nope' });
      calls.quotes.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FINANCE_QUOTE) });
    });
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    expect(calls.quotes[0].criteria.apr).toBe(10.9);
    expect(calls.quotes[0].criteria.cashDeposit).toBe(2500);
  });

  test('calc-live-api-smoke: the real consumer-finance API returns a monthly HP figure', async ({ page }) => {
    await loadPage(page, PATH);
    await expect(page.locator(idOrData('hp-price-short')).first()).toHaveText(/^£[\d,]+$/, { timeout: 15_000 });
  });

  test('calc-no-errors: zero unexpected JS errors with the API mocked', async ({ page }) => {
    const errors = collectErrors(page);
    const calls = await mockFinance(page);
    await loadPage(page, PATH);
    await waitForQuotes(page, calls, 1);
    expect(unexpectedErrors(errors)).toEqual([]);
  });
});
