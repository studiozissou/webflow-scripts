// Acceptance tests for the Cloudflare Pages CDN that replaces jsDelivr; skipped until CDN_HOST is set.
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const CDN_HOST = process.env.CDN_HOST;
const RHP_STAGING_URL = process.env.RHP_STAGING_URL;
const SZ_STAGING_URL = process.env.SZ_STAGING_URL;
const LIVE_URLS = (process.env.CDN_LIVE_URLS || '').split(',').filter(Boolean);
const SAMPLE_TAG = process.env.CDN_SAMPLE_TAG || 'oost-v0.4.2';
const SAMPLE_CLIENT = process.env.CDN_SAMPLE_CLIENT || 'oost';
const OLD_CDN = /cdn\.jsdelivr\.net\/gh\/studiozissou\//;

test.describe('private-monorepo-migration', () => {
  test.skip(!CDN_HOST, 'CDN_HOST not set: the CDN is not live yet');

  test('CDN serves a tagged init.js with CORS and immutable cache headers', async ({ request }) => {
    const res = await request.get(`https://${CDN_HOST}/${SAMPLE_TAG}/projects/${SAMPLE_CLIENT}/init.js`);
    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers['content-type']).toMatch(/(application|text)\/javascript/);
    expect(headers['access-control-allow-origin']).toBe('*');
    expect(headers['cache-control']).toContain('immutable');
  });

  test('CDN returns 404 for a path that no tag publishes', async ({ request }) => {
    const res = await request.get(`https://${CDN_HOST}/no-such-tag/projects/none/init.js`);
    expect(res.status()).toBe(404);
  });

  test('RHP staging loads every module from the CDN host and tag of its init script', async ({ page }) => {
    test.skip(!RHP_STAGING_URL, 'RHP_STAGING_URL not set');
    const requests = [];
    page.on('request', (req) => requests.push(req.url()));
    await page.goto(RHP_STAGING_URL, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForFunction(() => window.RHP && window.RHP.scriptsOk === true, null, { timeout: 30_000 });
    const rhpFiles = requests.filter((url) => url.includes('/projects/ready-hit-play-prod/'));
    expect(rhpFiles.length).toBeGreaterThan(0);
    const tags = new Set(rhpFiles.map((url) => new URL(url).pathname.split('/')[1]));
    expect(rhpFiles.every((url) => new URL(url).host === CDN_HOST)).toBe(true);
    expect(tags.size).toBe(1);
    expect(requests.some((url) => OLD_CDN.test(url))).toBe(false);
  });

  test('Studio Zissou loads shared/experiments.js from the CDN', async ({ page }) => {
    test.skip(!SZ_STAGING_URL, 'SZ_STAGING_URL not set');
    const hit = page.waitForResponse(
      (res) => res.url().includes('/shared/experiments.js') && new URL(res.url()).host === CDN_HOST,
      { timeout: 30_000 },
    );
    await page.goto(SZ_STAGING_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    expect((await hit).status()).toBe(200);
  });

  test('no page of a live site requests cdn.jsdelivr.net/gh/studiozissou', async ({ page }) => {
    test.skip(LIVE_URLS.length === 0, 'CDN_LIVE_URLS not set');
    for (const url of LIVE_URLS) {
      const requests = [];
      const onRequest = (req) => requests.push(req.url());
      page.on('request', onRequest);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
      page.off('request', onRequest);
      expect(requests.filter((r) => OLD_CDN.test(r)), url).toEqual([]);
    }
  });
});
