import { test, expect } from '@playwright/test';

/**
 * official-bio-rollout
 *
 * Verifies that Tamsen's approved official bio is the single source of truth across
 * the site's entity graph and page metadata.
 *
 * Spec: projects/tamsen-fadal/.claude/specs/official-bio-rollout.md
 * Bio:  projects/tamsen-fadal/.claude/content/official-bio.md
 */

const BASE = 'https://www.tamsenfadal.com';

// The `bio-200` string from official-bio.md §3. Must match byte-for-byte.
const APPROVED_DESCRIPTION =
  'Tamsen Fadal is an Emmy Award-winning journalist, filmmaker, and instant New York ' +
  'Times bestselling author of How To Menopause, leading the national conversation ' +
  'around midlife and menopause.';

// Pages that must resolve the site-wide entity graph.
const SAMPLED_PAGES = [
  '/',
  '/about-tamsen',
  '/book-how-to-menopause',
  '/podcast',
  '/speaking',
  '/press',
  '/blog',
  '/advocacy',
  '/themfactor',
  '/themfactor2',
  '/contact',
  '/events',
  '/menopause-education-hub',
];

/** Collect and parse every JSON-LD block on the current page. */
async function readJsonLd(page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((raw, i) => {
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`JSON-LD block ${i} failed to parse: ${err.message}`);
    }
  });
}

/** Flatten every node out of a set of parsed JSON-LD documents. */
function flattenNodes(docs) {
  const nodes = [];
  for (const doc of docs) {
    if (Array.isArray(doc['@graph'])) nodes.push(...doc['@graph']);
    else if (Array.isArray(doc)) nodes.push(...doc);
    else nodes.push(doc);
  }
  return nodes;
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1500);
}

// ---------------------------------------------------------------------------
// Entity graph
// ---------------------------------------------------------------------------

test.describe('official-bio-rollout: entity graph', () => {
  test('Person.description matches the approved bio exactly', async ({ page }) => {
    await goto(page, '/');
    const nodes = flattenNodes(await readJsonLd(page));

    const person = nodes.find((n) => n['@id'] === `${BASE}/#person`);
    expect(person, 'Person node must be defined on the homepage').toBeTruthy();
    expect(person.description).toBe(APPROVED_DESCRIPTION);
  });

  test('Person node asserts the facts the approved bio adds', async ({ page }) => {
    await goto(page, '/');
    const nodes = flattenNodes(await readJsonLd(page));
    const person = nodes.find((n) => n['@id'] === `${BASE}/#person`);

    const awards = [].concat(person.award ?? []).join(' | ');
    expect(awards).toMatch(/NYWICI Matrix Award/i);

    const knows = [].concat(person.knowsAbout ?? []).map((k) => String(k).toLowerCase());
    expect(knows).toEqual(expect.arrayContaining(['midlife', 'reinvention']));

    const titles = [].concat(person.jobTitle ?? []).map((t) => String(t).toLowerCase());
    expect(titles).toContain('filmmaker');
  });

  for (const path of SAMPLED_PAGES) {
    test(`entity graph resolves on ${path}`, async ({ page }) => {
      await goto(page, path);
      const docs = await readJsonLd(page);
      expect(docs.length, 'page must emit at least one JSON-LD block').toBeGreaterThanOrEqual(1);

      const nodes = flattenNodes(docs);
      for (const id of ['#website', '#publisher', '#person']) {
        const defined = nodes.filter((n) => n['@id'] === `${BASE}/${id}`);
        expect(defined.length, `${id} must be defined exactly once on ${path}`).toBe(1);
      }
    });

    test(`no duplicate @id on ${path}`, async ({ page }) => {
      await goto(page, path);
      const nodes = flattenNodes(await readJsonLd(page));
      const ids = nodes.map((n) => n['@id']).filter(Boolean);
      expect(ids.length, 'no @id may appear twice').toBe(new Set(ids).size);
    });
  }

  test('documentaries emit Movie nodes credited to Tamsen', async ({ page }) => {
    for (const path of ['/themfactor', '/themfactor2']) {
      await goto(page, path);
      const nodes = flattenNodes(await readJsonLd(page));
      const movie = nodes.find((n) => n['@type'] === 'Movie' || (Array.isArray(n['@type']) && n['@type'].includes('Movie')));
      expect(movie, `${path} must emit a Movie node`).toBeTruthy();

      const creatorIds = [].concat(movie.creator ?? movie.producer ?? []).map((c) => c['@id']);
      expect(creatorIds).toContain(`${BASE}/#person`);
    }
  });
});

// ---------------------------------------------------------------------------
// Site head — read/append/write regression guard
// ---------------------------------------------------------------------------

test.describe('official-bio-rollout: pre-existing head code preserved', () => {
  test('site head still carries verification, GTM, Finsweet and styles', async ({ page }) => {
    await goto(page, '/');
    const head = await page.locator('head').innerHTML();

    expect(head, 'google-site-verification must survive').toContain('google-site-verification');
    expect(head, 'GTM container must survive').toContain('GTM-WFRDD6ZD');
    expect(head, 'Finsweet Attributes must survive').toContain('@finsweet/attributes');
    expect(head, 'font-smoothing style block must survive').toContain('-webkit-font-smoothing');
  });
});

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

test.describe('official-bio-rollout: metadata', () => {
  const metaPages = ['/', '/about-tamsen', '/speaking'];

  for (const path of metaPages) {
    test(`no "13x" wording in metadata on ${path}`, async ({ page }) => {
      await goto(page, path);
      const title = await page.title();
      const description =
        (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';

      expect(title, 'title must follow the approved bio wording').not.toMatch(/13x/i);
      expect(description, 'description must follow the approved bio wording').not.toMatch(/13x/i);
    });
  }

  test('podcast title has no leading or trailing whitespace', async ({ page }) => {
    await goto(page, '/podcast');
    const title = await page.title();
    expect(title).toBe(title.trim());
  });

  test('podcast meta description is a usable length and leads with her name', async ({ page }) => {
    await goto(page, '/podcast');
    const description =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';

    expect(description.length).toBeGreaterThan(50);
    expect(description.length, 'description must fit a search snippet').toBeLessThanOrEqual(200);
    expect(description).toMatch(/Tamsen Fadal/);
  });

  test('M Film v2 does not reuse the Advocacy meta description', async ({ page }) => {
    await goto(page, '/advocacy');
    const advocacy =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';

    await goto(page, '/m-film-v2');
    const mFilm =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';

    expect(mFilm.length).toBeGreaterThan(0);
    expect(mFilm, 'M Film v2 must have its own description').not.toBe(advocacy);
  });
});

// ---------------------------------------------------------------------------
// Console hygiene
// ---------------------------------------------------------------------------

test.describe('official-bio-rollout: no console errors', () => {
  for (const path of SAMPLED_PAGES) {
    test(`no console errors on ${path}`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await goto(page, path);
      expect(errors, `console errors on ${path}:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});
