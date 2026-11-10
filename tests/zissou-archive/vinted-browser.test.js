import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  fetchHtml,
  openSession,
  ChallengeError,
} from '../../projects/zissou-archive/lib/vinted-browser.js';

function stubPage(response) {
  const calls = [];
  return {
    calls,
    async evaluate(fn, arg) {
      calls.push({ fn, arg });
      return typeof response === 'function' ? response(arg) : response;
    },
  };
}

describe('fetchHtml', () => {
  it('waits a 1–3 s jitter then returns the body', async () => {
    const sleeps = [];
    const page = stubPage({ status: 200, headers: { 'cf-mitigated': null }, body: '<html>ok</html>' });
    const html = await fetchHtml(page, 'https://www.vinted.nl/catalog?x=1', {
      sleep: async (ms) => sleeps.push(ms),
      random: () => 0.5,
    });
    assert.equal(html, '<html>ok</html>');
    assert.deepEqual(sleeps, [2000]);
    assert.equal(page.calls[0].arg, 'https://www.vinted.nl/catalog?x=1');
    assert.equal(typeof page.calls[0].fn, 'function');
  });

  it('keeps the jitter between 1 and 3 seconds', async () => {
    for (const r of [0, 0.999]) {
      const sleeps = [];
      await fetchHtml(stubPage({ status: 200, headers: {}, body: '' }), 'u', {
        sleep: async (ms) => sleeps.push(ms),
        random: () => r,
      });
      assert.ok(sleeps[0] >= 1000 && sleeps[0] <= 3000);
    }
  });

  it('throws a ChallengeError on a Cloudflare challenge', async () => {
    const page = stubPage({ status: 403, headers: { 'cf-mitigated': 'challenge' }, body: '' });
    await assert.rejects(
      () => fetchHtml(page, 'u', { sleep: async () => {}, random: () => 0 }),
      (err) => err instanceof ChallengeError && err.status === 403,
    );
  });

  it('throws a plain error on another non-2xx status', async () => {
    const page = stubPage({ status: 429, headers: {}, body: 'slow down' });
    await assert.rejects(
      () => fetchHtml(page, 'u', { sleep: async () => {}, random: () => 0 }),
      (err) => !(err instanceof ChallengeError) && /429/.test(err.message),
    );
  });

  it('runs a same-origin credentialed fetch inside the page', async () => {
    const page = stubPage({ status: 200, headers: {}, body: '' });
    await fetchHtml(page, 'u', { sleep: async () => {}, random: () => 0 });
    const source = page.calls[0].fn.toString();
    assert.match(source, /credentials:\s*['"]include['"]/);
    assert.match(source, /cf-mitigated/);
  });
});

describe('openSession', () => {
  it('launches a persistent Chrome context off-screen and loads the domain once', async () => {
    const launches = [];
    const gotos = [];
    const page = { goto: async (url) => gotos.push(url) };
    let closed = false;
    const chromium = {
      async launchPersistentContext(dir, options) {
        launches.push({ dir, options });
        return { pages: () => [page], newPage: async () => page, close: async () => { closed = true; } };
      },
    };
    const session = await openSession({ profileDir: '/tmp/profile', domain: 'www.vinted.nl', chromium });
    assert.equal(launches[0].dir, '/tmp/profile');
    assert.equal(launches[0].options.channel, 'chrome');
    assert.equal(launches[0].options.headless, false);
    assert.deepEqual(launches[0].options.args, ['--window-position=-2400,0']);
    assert.deepEqual(gotos, ['https://www.vinted.nl/']);
    assert.equal(session.page, page);
    await session.close();
    assert.equal(closed, true);
  });

  it('opens on-screen for login', async () => {
    let options;
    const page = { goto: async () => {} };
    const chromium = {
      async launchPersistentContext(_dir, opts) {
        options = opts;
        return { pages: () => [], newPage: async () => page, close: async () => {} };
      },
    };
    await openSession({ profileDir: '/tmp/p', domain: 'www.vinted.nl', onScreen: true, chromium });
    assert.deepEqual(options.args, []);
  });
});
