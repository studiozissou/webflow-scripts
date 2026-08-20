import { test, expect } from '@playwright/test';

const ORIGIN = 'https://www.tamsenfadal.com';
const MAX_TITLE = 70;
const ENTITY_SUFFIX = 'Tamsen Fadal';
const MOJIBAKE = /â€|‚Ä|Ã©|Â /;

const STATIC_PAGES = [
  '/advocacy',
  '/shop',
  '/press',
  '/menopause-support-provider-directory',
  '/menopause-support-provider-directory/physician-referral-form',
  '/menopause-education-hub',
];

const PODCAST_PAGES = [
  '/podcast/the-glp-1-doctor-what-works-what-doesnt-whats-next',
  '/podcast/why-you-always-feel-behind-and-the-simple-tools-that-will-free-you',
  '/podcast/emma-heming-willis-on-bruce-willis-caregiving-and-the-diagnosis-she-never-saw-coming',
];

const BLOG_PAGES = [
  '/blog/it-was-never-your-fault',
  '/blog/everything-you-need-to-know-about-gsm-and-vaginal-estrogen',
  '/blog/hidden-reason-behind-midlife-weight-gain',
  '/blog/fight-inflammation-lose-weight-with-dr-daryl-gioffre',
];

const DUPLICATE_PAIRS = [
  ['/podcast/from-sports-illustrated-to-sephora-how-molly-sims-reinvented-herself-in-midlife', '/podcast/choosing-a-child-free-life-5-things-i-wish-i-knew-earlier'],
  ['/podcast/relationship-q-and-a-red-flags-dating-after-divorce-commitment-issues', '/podcast/if-youre-going-through-a-friendship-breakup-you-need-to-hear-this'],
  ['/podcast/it-cant-rain-forever-kandi-burruss-on-reinvention-and-what-comes-next', '/podcast/the-hair-loss-doctor-what-works-and-whats-a-waste'],
  ['/podcast/therapist-reveals-why-adult-friendships-are-so-hard-and-how-to-fix-them', '/podcast/hair-loss-dry-skin-and-sagging-skin-the-1-dermatologist-explains'],
  ['/podcast/progesterone-101-the-hormone-behind-your-3am-wake-ups-your-anxiety-your-worst-pms', '/podcast/the-fertility-expert-egg-freezing-perimenopause-glp-1s-explained'],
  ['/podcast/the-glp-1-doctor-what-works-what-doesnt-whats-next', '/podcast/why-you-always-feel-behind-and-the-simple-tools-that-will-free-you'],
  ['/podcast/what-i-wish-i-knew-at-35-7-hard-truths-that-changed-my-life', '/podcast/the-hidden-reason-you-keep-choosing-emotionally-unavailable-people'],
  ['/blog/everything-you-need-to-know-about-gsm-and-vaginal-estrogen', '/blog/it-was-never-your-fault'],
  ['/blog/the-6-shoes-you-need-in-your-closet', '/blog/your-feet-are-trying-to-tell-you-something'],
  ['/blog/the-hair-conversation-women-are-still-too-afraid-to-have', '/blog/the-space-between-who-you-were-and-who-youre-becoming'],
];

const ALL_PAGES = [...STATIC_PAGES, ...PODCAST_PAGES, ...BLOG_PAGES];

const readMeta = async (page, path) => {
  await page.goto(`${ORIGIN}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  return {
    title: await page.title(),
    description: await page.locator('meta[name="description"]').first().getAttribute('content'),
    html: await page.content(),
  };
};

test.describe('semrush-audit-fixes-aug-2026: llms.txt formatting', () => {
  test('llms.txt starts with a Markdown H1 and blockquote', async ({ request }) => {
    const res = await request.get(`${ORIGIN}/llms.txt`);
    expect(res.status()).toBe(200);

    const lines = (await res.text()).split('\n').filter((l) => l.trim());
    expect(lines[0]).toMatch(/^#\s+\S/);
    expect(lines.slice(0, 6).some((l) => l.startsWith('>'))).toBe(true);
  });

  test('llms.txt contains a Markdown section and link list', async ({ request }) => {
    const body = await (await request.get(`${ORIGIN}/llms.txt`)).text();
    expect(body).toMatch(/^##\s+\S/m);
    expect(body).toMatch(/^-\s+\[[^\]]+\]\(https?:\/\/[^)]+\)/m);
  });

  test('llms.txt is no longer YAML-style key blocks', async ({ request }) => {
    const body = await (await request.get(`${ORIGIN}/llms.txt`)).text();
    expect(body).not.toMatch(/^use_guidelines:/m);
    expect(body).not.toMatch(/^preferred_urls:/m);
  });
});

test.describe('semrush-audit-fixes-aug-2026: title tags', () => {
  for (const path of ALL_PAGES) {
    test(`title is at most ${MAX_TITLE} characters — ${path}`, async ({ page }) => {
      const { title } = await readMeta(page, path);
      expect(title.length, `"${title}" is ${title.length} chars`).toBeLessThanOrEqual(MAX_TITLE);
    });
  }

  for (const path of ALL_PAGES) {
    test(`title retains the entity suffix — ${path}`, async ({ page }) => {
      const { title } = await readMeta(page, path);
      expect(title).toContain(ENTITY_SUFFIX);
    });
  }

  for (const path of [...BLOG_PAGES, ...PODCAST_PAGES]) {
    test(`title has no double-encoded UTF-8 — ${path}`, async ({ page }) => {
      const { title } = await readMeta(page, path);
      expect(title).not.toMatch(MOJIBAKE);
    });
  }
});

test.describe('semrush-audit-fixes-aug-2026: meta descriptions', () => {
  for (const [a, b] of DUPLICATE_PAIRS) {
    test(`descriptions differ — ${a.split('/').pop()} vs ${b.split('/').pop()}`, async ({ page }) => {
      const first = (await readMeta(page, a)).description;
      const second = (await readMeta(page, b)).description;

      expect(first?.trim()).toBeTruthy();
      expect(second?.trim()).toBeTruthy();
      expect(first?.trim()).not.toBe(second?.trim());
    });
  }

  for (const path of BLOG_PAGES) {
    test(`description has no doubled period — ${path}`, async ({ page }) => {
      const { description } = await readMeta(page, path);
      expect(description).not.toMatch(/\.\.|\s\.\s/);
    });
  }

  test('thin description on the friendship-breakup episode is expanded', async ({ page }) => {
    const { description } = await readMeta(
      page,
      '/podcast/if-youre-going-through-a-friendship-breakup-you-need-to-hear-this'
    );
    expect(description.trim().length).toBeGreaterThan(70);
  });
});

test.describe('semrush-audit-fixes-aug-2026: broken links', () => {
  test('retired Apple Podcasts show id is absent from blog posts', async ({ page }) => {
    for (const path of BLOG_PAGES) {
      const { html } = await readMeta(page, path);
      expect(html, `id1560877893 still linked on ${path}`).not.toContain('id1560877893');
    }
  });

  test('smoothie redirect-chain target is no longer linked', async ({ page }) => {
    const { html } = await readMeta(page, '/blog/fight-inflammation-lose-weight-with-dr-daryl-gioffre');
    expect(html).not.toContain('hot-girl-menopause-smoothie');
  });

  test('no href contains a stray trailing space before the closing quote', async ({ page }) => {
    const { html } = await readMeta(page, '/podcast/the-heart-doctor-5-warning-signs-your-heart-is-in-trouble');
    expect(html).not.toMatch(/href="[^"]*\s"/);
  });
});

test.describe('semrush-audit-fixes-aug-2026: no regressions', () => {
  for (const path of [...STATIC_PAGES.slice(0, 3), PODCAST_PAGES[0], BLOG_PAGES[0]]) {
    test(`no console errors — ${path}`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(2000);

      expect(errors).toEqual([]);
    });
  }

  test('structured data still present on a blog post', async ({ page }) => {
    const { html } = await readMeta(page, BLOG_PAGES[0]);
    expect(html).toContain('application/ld+json');
  });
});
